const { getConfiguredStore } = require("./blobs");
const { hashPassword } = require("./auth");

function usersStore() {
  return getConfiguredStore("users");
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

async function listUsernames() {
  const store = usersStore();
  const { blobs } = await store.list();
  return blobs.map((b) => b.key);
}

async function getUser(username) {
  const key = normalizeUsername(username);
  if (!key) return null;
  const store = usersStore();
  return store.get(key, { type: "json" });
}

async function saveUser(user) {
  const store = usersStore();
  const key = normalizeUsername(user.username);
  await store.setJSON(key, Object.assign({}, user, { username: key }));
}

async function deleteUser(username) {
  const store = usersStore();
  await store.delete(normalizeUsername(username));
}

async function listUsers() {
  const usernames = await listUsernames();
  const store = usersStore();
  const users = await Promise.all(usernames.map((u) => store.get(u, { type: "json" })));
  return users.filter(Boolean);
}

// Migrasi otomatis: kalau belum ada akun sama sekali (baru pertama kali
// deploy fitur ini), buat 1 akun Super Admin dari ADMIN_PASSWORD (env var
// sistem password lama), username default "admin". Supaya tim yang sudah
// pakai password lama tidak kehilangan akses setelah update ini aktif.
async function ensureBootstrap() {
  const usernames = await listUsernames();
  if (usernames.length > 0) return;
  const legacyPassword = process.env.ADMIN_PASSWORD;
  if (!legacyPassword) return;
  await saveUser({
    username: "admin",
    role: "superadmin",
    passwordHash: hashPassword(legacyPassword),
    createdAt: new Date().toISOString(),
  });
}

module.exports = {
  normalizeUsername,
  getUser,
  saveUser,
  deleteUser,
  listUsers,
  ensureBootstrap,
};
