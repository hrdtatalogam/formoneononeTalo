const { json, checkAuth, requireSuperadmin } = require("./utils/auth");
const { getLoginLog } = require("./utils/logs");

exports.handler = async (event) => {
  const user = checkAuth(event);
  if (!user) return json(401, { message: "Sesi tidak valid, silakan login lagi." });
  if (!requireSuperadmin(user)) {
    return json(403, { message: "Hanya Super Admin yang bisa melihat log login." });
  }
  if (event.httpMethod !== "GET") {
    return json(405, { message: "Method not allowed" });
  }

  try {
    const log = await getLoginLog();
    return json(200, log);
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
