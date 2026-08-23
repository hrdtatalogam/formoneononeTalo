const crypto = require("crypto");
const { getConfiguredStore } = require("./utils/blobs");
const { json, hashPassword, verifyPassword } = require("./utils/auth");

// Netlify functions punya batas KERAS 6MB per request (tidak bisa dinaikkan),
// dan base64 encoding menambah ~33% ukuran data. Nilai di bawah sudah dikasih
// margin aman (client-side app.js juga sudah membatasi sebelum sampai ke sini).
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB per file
const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024; // 4.5MB gabungan semua file per pengiriman

function fileKey(id, f) {
  const parts = [f.questionId];
  if (f.rowIndex !== undefined && f.rowIndex !== null) parts.push(`row${f.rowIndex}`);
  if (f.subFieldId) parts.push(f.subFieldId);
  return `${id}/${parts.join("_")}/${f.filename}`;
}

// Gabungkan file yang baru diunggah dengan file lama dari draft sebelumnya:
// kalau kandidat/karyawan tidak memilih file baru untuk field yang sama, file
// lama tetap dipakai (tidak perlu upload ulang saat melanjutkan draft).
function mergeFiles(oldFiles, newFiles) {
  const sameSlot = (a, b) =>
    a.questionId === b.questionId &&
    (a.rowIndex ?? null) === (b.rowIndex ?? null) &&
    (a.subFieldId || null) === (b.subFieldId || null);
  const merged = (oldFiles || []).filter((old) => !newFiles.some((n) => sameSlot(n, old)));
  return merged.concat(newFiles);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { message: "Data yang dikirim tidak valid." });
  }

  const mode = payload.mode === "draft" ? "draft" : "final";
  const answers = payload.answers || {};
  const files = Array.isArray(payload.files) ? payload.files : [];
  const existingId = payload.id ? String(payload.id) : null;
  const existingToken = payload.token ? String(payload.token) : null;

  if (mode === "final" && Object.keys(answers).length === 0) {
    return json(400, { message: "Form kosong, tidak ada data untuk dikirim." });
  }

  let totalBytes = 0;
  for (const f of files) {
    if (f && f.base64) totalBytes += Math.ceil((f.base64.length * 3) / 4);
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return json(413, {
      message: `Total ukuran semua file (\u2248${(totalBytes / (1024 * 1024)).toFixed(1)}MB) melebihi batas ${(MAX_TOTAL_BYTES / (1024 * 1024)).toFixed(1)}MB per pengiriman. Kompres file yang diunggah lalu kirim ulang.`,
    });
  }

  const submissionsStore = getConfiguredStore("submissions");
  const filesStore = getConfiguredStore("files");

  // ---- Kalau melanjutkan draft yang sudah ada, verifikasi kepemilikan lewat token ----
  let record = null;
  if (existingId) {
    record = await submissionsStore.get(existingId, { type: "json" });
    if (!record) {
      return json(404, { message: "Draft tidak ditemukan. Link mungkin sudah kedaluwarsa atau salah." });
    }
    if (!existingToken || !verifyPassword(existingToken, record.resumeTokenHash)) {
      return json(403, { message: "Link tidak valid untuk melanjutkan draft ini." });
    }
    if (record.status === "final") {
      return json(409, { message: "Review ini sudah pernah dikirim final dan tidak bisa diubah lagi." });
    }
  }

  const id = existingId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const savedFiles = [];

  for (const f of files) {
    if (!f || !f.base64 || !f.filename) continue;
    let buffer;
    try {
      buffer = Buffer.from(f.base64, "base64");
    } catch (e) {
      continue;
    }
    if (buffer.length > MAX_FILE_BYTES) {
      return json(413, {
        message: `File "${f.filename}" terlalu besar (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Maksimal ${(MAX_FILE_BYTES / (1024 * 1024)).toFixed(1)}MB per file.`,
      });
    }
    const key = fileKey(id, f);
    await filesStore.set(key, buffer, {
      metadata: {
        contentType: f.contentType || "application/octet-stream",
        filename: f.filename,
      },
    });
    savedFiles.push({
      questionId: f.questionId,
      rowIndex: f.rowIndex !== undefined ? f.rowIndex : null,
      subFieldId: f.subFieldId || null,
      filename: f.filename,
      key,
    });
  }

  const nowIso = new Date().toISOString();
  const finalFiles = mergeFiles(record && record.files, savedFiles);

  // Token dipakai supaya link "lanjutkan nanti" hanya bisa dipakai oleh orang
  // yang punya link itu (bukan ditebak dari id saja). Token mentah HANYA
  // dikembalikan ke pengirim saat itu juga — yang tersimpan di server cuma hash-nya.
  let rawToken = existingToken;
  let resumeTokenHash = record ? record.resumeTokenHash : null;
  if (mode === "draft" && !rawToken) {
    rawToken = crypto.randomBytes(20).toString("hex");
    resumeTokenHash = hashPassword(rawToken);
  }

  const newRecord = {
    id,
    status: mode === "final" ? "final" : "draft",
    answers,
    files: finalFiles,
    resumeTokenHash: resumeTokenHash || null,
    createdAt: (record && record.createdAt) || nowIso,
    updatedAt: nowIso,
    submittedAt: mode === "final" ? nowIso : (record ? record.submittedAt || null : null),
  };

  await submissionsStore.setJSON(id, newRecord);

  return json(200, {
    ok: true,
    id,
    status: newRecord.status,
    token: mode === "draft" ? rawToken : null,
  });
};
