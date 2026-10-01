/**
 * Firebase Firestore sync – encrypted single-document store.
 * Requires window.FIREBASE_CONFIG (see firebase-config.example.js).
 */
const FB_VER = "10.14.1";
const CFG_KEY = "trip-sync";
const PASS_KEY = "trip-sync-pass";
const LOCAL_AT_KEY = "trip-local-at";

let app, db, auth, docRef, unsub;
let callbacks = {};
let enabled = false;
let tripId = "";
let passphrase = "";
let pushTimer = null;
let pushing = false;
let applyingRemote = false;
let lastApplied = 0;
let status = { state: "off", detail: "" };

const b64enc = buf => {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const b64dec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pass, saltStr) {
  const enc = new TextEncoder();
  const salt = enc.encode(saltStr);
  const km = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plain, pass, id) {
  const key = await deriveKey(pass, `silvester-trip:${id}`);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return { cipher: b64enc(ct), iv: b64enc(iv) };
}

async function decrypt(cipher, iv, pass, id) {
  const key = await deriveKey(pass, `silvester-trip:${id}`);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64dec(iv) },
    key,
    b64dec(cipher)
  );
  return new TextDecoder().decode(pt);
}

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || "null") || {}; } catch { return {}; }
}
function saveCfg(c) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); }

export function isFirebaseConfigured() {
  const c = window.FIREBASE_CONFIG;
  return !!(c && c.projectId && c.projectId !== "YOUR_PROJECT_ID" && c.apiKey && c.apiKey !== "YOUR_API_KEY");
}

export function getStatus() { return { ...status, tripId, enabled, configured: isFirebaseConfigured() }; }

function setStatus(state, detail = "") {
  status = { state, detail };
  callbacks.onStatus?.(getStatus());
}

async function loadFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
  const [{ initializeApp }, { getAuth, signInAnonymously, onAuthStateChanged }, firestore] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const { getFirestore, doc, setDoc, getDoc, onSnapshot, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } = firestore;
  if (!app) {
    app = initializeApp(window.FIREBASE_CONFIG);
    db = getFirestore(app);
    auth = getAuth(app);
    try { await enableMultiTabIndexedDbPersistence(db); }
    catch { try { await enableIndexedDbPersistence(db); } catch {} }
    if (!auth.currentUser) await signInAnonymously(auth);
  }
  return { doc, setDoc, getDoc, onSnapshot };
}

async function ensureRef() {
  const { doc } = await loadFirebase();
  if (!tripId) throw new Error("Keine Trip-ID");
  docRef = doc(db, "trips", tripId);
  return docRef;
}

async function applyRemote(data) {
  if (!data?.cipher || !data?.iv) return;
  if (data.updatedAt && data.updatedAt <= lastApplied) return;
  try {
    const plain = await decrypt(data.cipher, data.iv, passphrase, tripId);
    const parsed = JSON.parse(plain);
    applyingRemote = true;
    lastApplied = data.updatedAt || Date.now();
    localStorage.setItem(LOCAL_AT_KEY, String(lastApplied));
    callbacks.onRemote?.(parsed);
    applyingRemote = false;
    setStatus("live", "Stand vom Server übernommen");
  } catch (e) {
    applyingRemote = false;
    setStatus("error", "Entschlüsseln fehlgeschlagen – Passphrase prüfen");
    console.warn(e);
  }
}

async function startListener() {
  if (unsub) unsub();
  const { onSnapshot } = await loadFirebase();
  const ref = await ensureRef();
  unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) {
      setStatus("live", "Noch kein Cloud-Stand – wird beim ersten Speichern angelegt");
      return;
    }
    applyRemote(snap.data());
  }, err => {
    setStatus("error", err.message || "Verbindungsfehler");
  });
}

export async function enableSync(pass, id) {
  if (!isFirebaseConfigured()) throw new Error("Firebase nicht konfiguriert – siehe README");
  if (!pass || pass.length < 6) throw new Error("Passphrase mindestens 6 Zeichen");
  tripId = id || loadCfg().tripId;
  if (!tripId) throw new Error("Trip-ID fehlt");
  passphrase = pass;
  sessionStorage.setItem(PASS_KEY, pass);
  enabled = true;
  saveCfg({ tripId, enabled: true });
  setStatus("connecting", "Verbinde …");
  await startListener();
  setStatus("live", "Sync aktiv");
  await pushNow();
}

export function disableSync() {
  enabled = false;
  saveCfg({ tripId: loadCfg().tripId, enabled: false });
  if (unsub) { unsub(); unsub = null; }
  sessionStorage.removeItem(PASS_KEY);
  passphrase = "";
  setStatus("off", "Sync aus");
}

export function createTripId() {
  const id = crypto.randomUUID();
  saveCfg({ tripId: id, enabled: false });
  return id;
}

export function getTripId() { return loadCfg().tripId || ""; }

export function schedulePush(state) {
  if (!enabled || applyingRemote || !passphrase || !tripId) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow(state), 700);
}

export async function pushNow(state) {
  if (!enabled || !passphrase || !tripId) return;
  const payload = state ?? callbacks.getState?.();
  if (!payload) return;
  try {
    const { setDoc } = await loadFirebase();
    const ref = await ensureRef();
    const updatedAt = Date.now();
    const { cipher, iv } = await encrypt(JSON.stringify(payload), passphrase, tripId);
    const who = callbacks.getWho?.() || "?";
    pushing = true;
    await setDoc(ref, { cipher, iv, updatedAt, updatedBy: who, v: 1 }, { merge: true });
    lastApplied = updatedAt;
    localStorage.setItem(LOCAL_AT_KEY, String(updatedAt));
    pushing = false;
    setStatus("live", `Hochgeladen · ${new Date(updatedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`);
  } catch (e) {
    pushing = false;
    setStatus(navigator.onLine ? "error" : "offline", navigator.onLine ? (e.message || "Upload fehlgeschlagen") : "Offline – wird später synchronisiert");
    throw e;
  }
}

export async function pullNow() {
  if (!enabled || !passphrase || !tripId) return false;
  const { getDoc, doc: docFn } = await loadFirebase();
  const snap = await getDoc(docFn(db, "trips", tripId));
  if (!snap.exists()) return false;
  await applyRemote(snap.data());
  return true;
}

export function init(cbs) {
  callbacks = cbs;
  const cfg = loadCfg();
  tripId = cfg.tripId || "";
  const pass = sessionStorage.getItem(PASS_KEY);
  if (cfg.enabled && pass && tripId && isFirebaseConfigured()) {
    enableSync(pass, tripId).catch(e => setStatus("error", e.message));
  } else if (cfg.enabled && !pass) {
    setStatus("locked", "Passphrase eingeben, um Sync fortzusetzen");
  } else if (!isFirebaseConfigured()) {
    setStatus("off", "Firebase-Konfiguration fehlt");
  } else {
    setStatus("off", "Sync nicht aktiv");
  }
  addEventListener("online", () => enabled && setStatus("live", "Wieder online"));
  addEventListener("offline", () => enabled && setStatus("offline", "Offline – Änderungen werden lokal gespeichert"));
}

export function isApplyingRemote() { return applyingRemote; }
