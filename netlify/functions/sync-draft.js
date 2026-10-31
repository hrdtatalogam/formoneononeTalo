const { getConfiguredStore } = require("./utils/blobs");
const { json, verifyPassword } = require("./utils/auth");

// Sinkronisasi "isi bareng" (near real-time) untuk draft.
// - Klien mengirim HANYA kolom yang berubah (changes), jadi dua orang yang
//   mengisi kolom berbeda tidak saling menimpa.
// - Server menggabungkan per-kolom ke draft, menaikkan `rev`, lalu
//   mengembalikan jawaban terbaru + siapa saja yang sedang aktif & kolom
//   yang sedang mereka isi (presence), supaya kolom itu bisa dikunci di layar lain.
// - Presence disimpan di store terpisah ("presence") agar tidak mengotori
//   daftar review di panel admin.

const ACTIVE_MS = 12000;   // dianggap "sedang aktif" kalau heartbeat < 12 dtk
const PRUNE_MS = 60000;    // entri presence lebih lama dari ini dibuang
const KEY_RE = /^[A-Za-z0-9_\-]{1,80}$/;
const MAX_VALUE_BYTES = 400 * 1024;

// Tulis dengan "compare-and-set" (etag) supaya dua penyimpanan di detik yang
// sama tidak saling menghapus. Kalau versi @netlify/blobs tidak mendukung
// opsi ini, opsinya diabaikan dan perilakunya jadi last-write-wins biasa
// (klien tetap mengirim ulang kolom yang hilang, lihat app.js).
async function updateJson(store, key, mutate, attempts) {
  for (let i = 0; i < attempts; i++) {
    const cur = await store.getWithMetadata(key, { type: "json" });
    const next = mutate(cur ? cur.data : null);
    if (next === undefined) return { aborted: true };
    const opts = cur && cur.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const res = await store.setJSON(key, next, opts);
    if (!res || res.modified !== false) return { value: next };
  }
  return { conflict: true };
}

function cleanValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) return v;
  return undefined;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

  let p;
  try { p = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { message: "Data tidak valid." }); }

  const id = p.id ? String(p.id) : "";
  const token = p.token ? String(p.token) : "";
  const clientId = String(p.clientId || "").slice(0, 40);
  if (!id || !token || !clientId) return json(400, { message: "Link tidak lengkap." });
  const name = String(p.name || "Tamu").slice(0, 40);
  const focus = p.focus && KEY_RE.test(String(p.focus)) ? String(p.focus) : null;
  const clientRev = Number(p.rev) || 0;

  const changes = {};
  if (p.changes && typeof p.changes === "object") {
    const keys = Object.keys(p.changes).slice(0, 80);
    for (const k of keys) {
      if (!KEY_RE.test(k)) continue;
      const v = cleanValue(p.changes[k]);
      if (v === undefined) continue;
      if (JSON.stringify(v).length > MAX_VALUE_BYTES) continue;
      changes[k] = v;
    }
  }
  const hasChanges = Object.keys(changes).length > 0;

  try {
    const store = getConfiguredStore("submissions");
    const first = await store.get(id, { type: "json" });
    if (!first || !verifyPassword(token, first.resumeTokenHash)) {
      return json(404, { message: "Draft tidak ditemukan, atau link sudah tidak berlaku." });
    }
    if (first.status === "final") return json(200, { ok: true, final: true });

    let record = first;
    if (hasChanges) {
      const r = await updateJson(store, id, (cur) => {
        if (!cur || cur.status === "final") return undefined;
        return {
          ...cur,
          answers: { ...(cur.answers || {}), ...changes },
          rev: (cur.rev || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      }, 5);
      if (r.aborted) return json(200, { ok: true, final: true });
      if (r.value) record = r.value;
      // r.conflict: biarkan klien mengirim ulang di putaran berikutnya.
      else record = (await store.get(id, { type: "json" })) || first;
    }

    // ---- Presence ----
    const pStore = getConfiguredStore("presence");
    const now = Date.now();
    let doc = null;
    try {
      const pr = await updateJson(pStore, id, (cur) => {
        const clients = {};
        const old = (cur && cur.clients) || {};
        Object.keys(old).forEach((cid) => { if (now - old[cid].ts < PRUNE_MS) clients[cid] = old[cid]; });
        clients[clientId] = { name, focus, ts: now };
        return { clients };
      }, 3);
      doc = pr.value || (await pStore.get(id, { type: "json" }));
    } catch (e) { doc = null; }

    const others = [];
    const all = (doc && doc.clients) || {};
    Object.keys(all).forEach((cid) => {
      if (cid === clientId) return;
      const c = all[cid];
      if (now - c.ts < ACTIVE_MS) others.push({ clientId: cid, name: c.name, focus: c.focus || null });
    });

    const rev = record.rev || 0;
    const body = { ok: true, rev, presence: others, updatedAt: record.updatedAt };
    // Kirim jawaban hanya kalau ada perubahan sejak yang klien lihat (hemat data).
    if (hasChanges || rev !== clientRev) body.answers = record.answers || {};
    return json(200, body);
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
