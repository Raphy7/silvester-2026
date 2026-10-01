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

function boot() {
  const api = window.__tripApi;
  if (!api) {
    console.warn("trip-boot: __tripApi noch nicht bereit");
    return;
  }
  TripSync.init({
    getState: () => api.getState(),
    getWho: () => api.getWho(),
    onRemote: data => api.setState(data),
    onStatus: st => {
      paintSyncUI(st);
      api.onSyncStatus?.(st);
    }
  });
  paintSyncUI(TripSync.getStatus());
}

if (window.__tripApi) boot();
else addEventListener("DOMContentLoaded", boot);
