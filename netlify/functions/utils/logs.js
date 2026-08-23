const { getConfiguredStore } = require("./blobs");

const LOG_KEY = "login-log";
const MAX_ENTRIES = 300; // simpan 300 login terakhir, biar blob-nya gak membengkak terus

function logsStore() {
  return getConfiguredStore("logs");
}

// Catat 1 kejadian login sukses. Dipanggil dari admin-login.js.
async function recordLogin(entry) {
  const store = logsStore();
  let list = (await store.get(LOG_KEY, { type: "json" })) || [];
  list.unshift(entry); // terbaru di paling atas
  if (list.length > MAX_ENTRIES) list = list.slice(0, MAX_ENTRIES);
  await store.setJSON(LOG_KEY, list);
}

async function getLoginLog() {
  const store = logsStore();
  return (await store.get(LOG_KEY, { type: "json" })) || [];
}

module.exports = { recordLogin, getLoginLog };
