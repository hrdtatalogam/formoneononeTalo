const { json, checkAuth, requireSuperadmin, hashPassword } = require("./utils/auth");
const { getUser, saveUser, deleteUser, listUsers } = require("./utils/users");

const USERNAME_RE = /^[a-z0-9.@_+-]{3,60}$/;

exports.handler = async (event) => {
  const user = checkAuth(event);
  if (!user) return json(401, { message: "Sesi tidak valid, silakan login lagi." });

  try {
    // ---- GET: daftar semua user (khusus Super Admin) ----
    if (event.httpMethod === "GET") {
      if (!requireSuperadmin(user)) {
        return json(403, { message: "Hanya Super Admin yang bisa melihat daftar user." });
      }
      const users = await listUsers();
      users.sort((a, b) => (a.username > b.username ? 1 : -1));
      return json(
        200,
        users.map((u) => ({ username: u.username, role: u.role, createdAt: u.createdAt }))
      );
    }

    // ---- POST: tambah user baru (khusus Super Admin) ----
    if (event.httpMethod === "POST") {
      if (!requireSuperadmin(user)) {
        return json(403, { message: "Hanya Super Admin yang bisa menambah user." });
      }
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { message: "Request tidak valid." });
      }
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = body.role === "superadmin" ? "superadmin" : "admin";

      if (!USERNAME_RE.test(username)) {
        return json(400, {
          message: "Username 3-60 karakter (boleh pakai email), hanya huruf/angka kecil, titik, underscore, plus, strip, atau @.",
        });
      }
      if (password.length < 6) {
        return json(400, { message: "Password minimal 6 karakter." });
      }
      const existing = await getUser(username);
      if (existing) return json(409, { message: "Username sudah dipakai." });

      await saveUser({
        username,
        role,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      });
      return json(200, { ok: true });
    }

    // ---- PUT: reset/ganti password ----
    // Super Admin bisa reset password siapa saja. User biasa cuma bisa
    // ganti password akun sendiri.
    if (event.httpMethod === "PUT") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { message: "Request tidak valid." });
      }
      const targetUsername = String(body.username || "").trim().toLowerCase();
      const newPassword = String(body.newPassword || "");

      if (!targetUsername || newPassword.length < 6) {
        return json(400, { message: "Username dan password baru (minimal 6 karakter) wajib diisi." });
      }
      if (targetUsername !== user.username && !requireSuperadmin(user)) {
        return json(403, { message: "Tidak diizinkan mengubah password user lain." });
      }
      const target = await getUser(targetUsername);
      if (!target) return json(404, { message: "User tidak ditemukan." });

      target.passwordHash = hashPassword(newPassword);
      await saveUser(target);
      return json(200, { ok: true });
    }

    // ---- PATCH: ubah role user (khusus Super Admin) ----
    if (event.httpMethod === "PATCH") {
      if (!requireSuperadmin(user)) {
        return json(403, { message: "Hanya Super Admin yang bisa mengubah role user." });
      }
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { message: "Request tidak valid." });
      }
      const targetUsername = String(body.username || "").trim().toLowerCase();
      const role = body.role === "superadmin" ? "superadmin" : "admin";
      if (!targetUsername) return json(400, { message: "Username wajib diisi." });

      const target = await getUser(targetUsername);
      if (!target) return json(404, { message: "User tidak ditemukan." });

      if (target.role === "superadmin" && role !== "superadmin") {
        const all = await listUsers();
        const superadmins = all.filter((u) => u.role === "superadmin");
        if (superadmins.length <= 1) {
          return json(400, { message: "Tidak bisa menurunkan role Super Admin terakhir." });
        }
      }

      target.role = role;
      await saveUser(target);
      return json(200, { ok: true });
    }

    // ---- DELETE: hapus user (khusus Super Admin) ----
    if (event.httpMethod === "DELETE") {
      if (!requireSuperadmin(user)) {
        return json(403, { message: "Hanya Super Admin yang bisa menghapus user." });
      }
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { message: "Request tidak valid." });
      }
      const targetUsername = String(body.username || "").trim().toLowerCase();
      if (!targetUsername) return json(400, { message: "Username wajib diisi." });
      if (targetUsername === user.username) {
        return json(400, { message: "Tidak bisa menghapus akun yang sedang dipakai login." });
      }
      const target = await getUser(targetUsername);
      if (!target) return json(404, { message: "User tidak ditemukan." });

      if (target.role === "superadmin") {
        const all = await listUsers();
        const superadmins = all.filter((u) => u.role === "superadmin");
        if (superadmins.length <= 1) {
          return json(400, { message: "Tidak bisa menghapus Super Admin terakhir." });
        }
      }
      await deleteUser(targetUsername);
      return json(200, { ok: true });
    }

    return json(405, { message: "Method not allowed" });
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
