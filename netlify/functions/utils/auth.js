const crypto = require("crypto");

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

// ================= Password hashing =================
// Pakai crypto.scrypt bawaan Node (tidak perlu dependency tambahan seperti
// bcrypt, jadi tetap ringan buat Netlify Functions). Format tersimpan:
// "salt:hash" (keduanya hex).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  let check;
  try {
    check = crypto.scryptSync(String(password), salt, 64).toString("hex");
  } catch (e) {
    return false;
  }
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ================= Session token =================
// Token mini ala JWT: payload (base64url) + tanda tangan HMAC-SHA256, jadi
// tidak perlu simpan session di server (stateless, cocok buat serverless).
// Kunci tanda tangan pakai SESSION_SECRET (disarankan) atau fallback ke
// ADMIN_PASSWORD lama kalau SESSION_SECRET belum di-set.
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function b64url(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function createToken(user) {
  const secret = getSecret();
  const payload = { u: user.username, r: user.role, exp: Date.now() + TOKEN_TTL_MS };
  const payloadStr = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  return `${payloadStr}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || token.indexOf(".") === -1) return null;
  const secret = getSecret();
  if (!secret) return null;
  const [payloadStr, sig] = token.split(".");
  if (!payloadStr || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.exp || Date.now() > payload.exp) return null;
  return { username: payload.u, role: payload.r };
}

// Ambil & verifikasi token dari header "x-admin-token".
function checkAuth(event) {
  const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
  return verifyToken(token);
}

function requireSuperadmin(user) {
  return !!user && user.role === "superadmin";
}

module.exports = {
  json,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  checkAuth,
  requireSuperadmin,
};
