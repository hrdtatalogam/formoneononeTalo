const { getConfiguredStore } = require("./utils/blobs");
const { checkAuth, json } = require("./utils/auth");

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return json(401, { message: "Sesi tidak valid, silakan login lagi." });
  }

  const store = getConfiguredStore("submissions");

  if (event.httpMethod === "GET") {
    const { blobs } = await store.list();
    const records = await Promise.all(
      blobs.map((b) => store.get(b.key, { type: "json" }))
    );
    const cleaned = records
      .filter(Boolean)
      .map((r) => Object.assign({}, r, { resumeTokenHash: undefined }));
    cleaned.sort(
      (a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0)
    );
    return json(200, cleaned);
  }

  if (event.httpMethod === "DELETE") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { message: "Request tidak valid." });
    }
    if (!body.id) return json(400, { message: "id wajib diisi." });

    const record = await store.get(body.id, { type: "json" });
    await store.delete(body.id);

    if (record && Array.isArray(record.files) && record.files.length) {
      const filesStore = getConfiguredStore("files");
      await Promise.all(record.files.map((f) => filesStore.delete(f.key)));
    }
    return json(200, { ok: true });
  }

  return json(405, { message: "Method not allowed" });
};
