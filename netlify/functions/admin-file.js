const { getConfiguredStore } = require("./utils/blobs");
const { checkAuth } = require("./utils/auth");

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key) return { statusCode: 400, body: "Parameter key wajib diisi." };

  const store = getConfiguredStore("files");
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) return { statusCode: 404, body: "File tidak ditemukan." };

  const { data, metadata } = result;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": (metadata && metadata.contentType) || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${(metadata && metadata.filename) || "file"}"`,
    },
    body: Buffer.from(data).toString("base64"),
    isBase64Encoded: true,
  };
};
