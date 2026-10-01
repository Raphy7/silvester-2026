import * as TripSync from "./trip-sync.js";

window.TripSync = TripSync;

function syncStatusText(st) {
  const map = {
    off: "⚪ Sync aus",
    connecting: "🟡 Verbinde …",
    live: "🟢 Live",
    offline: "🟠 Offline",
    locked: "🔒 Passphrase nötig",
    error: "🔴 Fehler"
  };
  return `${map[st.state] || "⚪"}${st.detail ? " · " + st.detail : ""}`;
}

function paintSyncUI(st) {
  const line = document.getElementById("sync-status-line");
  if (line) line.textContent = syncStatusText(st);
  const idIn = document.getElementById("sync-trip-id");
  if (idIn && !idIn.dataset.touched) idIn.value = st.tripId || TripSync.getTripId() || "";
}

TripSync.init({
  getState: () => window.__tripApi.getState(),
  getWho: () => window.__tripApi.getWho(),
  onRemote: data => window.__tripApi.setState(data),
  onStatus: st => {
    paintSyncUI(st);
    window.__tripApi.onSyncStatus?.(st);
  }
});

paintSyncUI(TripSync.getStatus());
