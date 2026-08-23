const { getConfiguredStore } = require("./utils/blobs");
const { checkAuth, json } = require("./utils/auth");
const { DEFAULT_SECTIONS, DEFAULT_QUESTIONS } = require("./default-config");

// Panel Admin > Kelola Formulir: baca/simpan { sections, questions } sekaligus,
// disimpan sebagai satu object di bawah key "form-config".
exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return json(401, { message: "Sesi tidak valid, silakan login lagi." });
  }

  try {
    const store = getConfiguredStore("config");

    if (event.httpMethod === "GET") {
      const config = await store.get("form-config", { type: "json" });
      if (config && Array.isArray(config.questions) && config.questions.length) {
        return json(200, {
          sections: Array.isArray(config.sections) && config.sections.length ? config.sections : DEFAULT_SECTIONS,
          questions: config.questions,
        });
      }
      return json(200, { sections: DEFAULT_SECTIONS, questions: DEFAULT_QUESTIONS });
    }

    if (event.httpMethod === "PUT") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch (e) {
        return json(400, { message: "Data konfigurasi tidak valid." });
      }
      const sections = Array.isArray(body.sections) ? body.sections : [];
      const questions = Array.isArray(body.questions) ? body.questions : [];
      if (!sections.length) {
        return json(400, { message: "Minimal harus ada 1 bagian (section)." });
      }
      if (!questions.length) {
        return json(400, { message: "Minimal harus ada 1 pertanyaan." });
      }
      await store.setJSON("form-config", { sections, questions });
      return json(200, { ok: true });
    }

    return json(405, { message: "Method not allowed" });
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
