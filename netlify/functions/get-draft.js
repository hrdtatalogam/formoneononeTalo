const { getConfiguredStore } = require("./utils/blobs");
const { json, verifyPassword } = require("./utils/auth");

// Endpoint publik (tidak butuh login admin) untuk mengambil kembali draft yang
// sudah disimpan, dipakai saat karyawan/atasan membuka link "lanjutkan nanti".
// Keamanan bergantung pada token acak di link (bukan cuma id), diverifikasi
// terhadap hash yang tersimpan di server.
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { message: "Method not allowed" });
  }

  const params = event.queryStringParameters || {};
  const id = params.id;
  const token = params.token;
  if (!id || !token) {
    return json(400, { message: "Link tidak lengkap." });
  }

  try {
    const store = getConfiguredStore("submissions");
    const record = await store.get(id, { type: "json" });
    if (!record || !verifyPassword(token, record.resumeTokenHash)) {
      return json(404, { message: "Draft tidak ditemukan, atau link sudah tidak berlaku." });
    }

    return json(200, {
      ok: true,
      id: record.id,
      status: record.status,
      answers: record.answers || {},
      files: (record.files || []).map((f) => ({
        questionId: f.questionId,
        rowIndex: f.rowIndex,
        subFieldId: f.subFieldId,
        filename: f.filename,
      })),
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
