const { json, verifyPassword, createToken, hashPassword } = require("./utils/auth");
const { getUser, saveUser, ensureBootstrap } = require("./utils/users");
const { recordLogin } = require("./utils/logs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, message: "Request tidak valid." });
  }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) {
    return json(400, { ok: false, message: "Username dan password wajib diisi." });
  }

  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    null;

  try {
    await ensureBootstrap();

    let user = await getUser(username);

    // Jalur pemulihan darurat: username "admin" + password yang cocok dengan
    // ADMIN_PASSWORD di environment variable Netlify selalu bisa masuk (dan
    // otomatis reset hash tersimpannya). Berguna kalau semua akun Super
    // Admin lupa password — tinggal set/ubah ADMIN_PASSWORD di Netlify env,
    // trigger deploy ulang, lalu login pakai username "admin" + password itu.
    const legacyPassword = process.env.ADMIN_PASSWORD;
    if (username === "admin" && legacyPassword && password === legacyPassword) {
      user = {
        username: "admin",
        role: "superadmin",
        createdAt: (user && user.createdAt) || new Date().toISOString(),
        passwordHash: hashPassword(password),
      };
      await saveUser(user);
      const token = createToken(user);
      await recordLogin({ username: user.username, role: user.role, at: new Date().toISOString(), ip });
      return json(200, { ok: true, token, username: user.username, role: user.role });
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json(401, { ok: false, message: "Username atau password salah." });
    }

    const token = createToken(user);
    await recordLogin({ username: user.username, role: user.role, at: new Date().toISOString(), ip });
    return json(200, { ok: true, token, username: user.username, role: user.role });
  } catch (err) {
    return json(500, { ok: false, message: `Error server: ${err.message || String(err)}` });
  }
};

