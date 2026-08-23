const { getConfiguredStore } = require("./utils/blobs");
const { json } = require("./utils/auth");
const { DEFAULT_SECTIONS, DEFAULT_QUESTIONS } = require("./default-config");

// Endpoint publik yang dipakai formulir review untuk mengambil struktur form
// (sections + questions) saat ini. Tidak butuh login admin.
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { message: "Method not allowed" });
  }

  try {
    const store = getConfiguredStore("config");
    const config = await store.get("form-config", { type: "json" });

    if (config && Array.isArray(config.questions) && config.questions.length) {
      return json(200, {
        sections: Array.isArray(config.sections) && config.sections.length ? config.sections : DEFAULT_SECTIONS,
        questions: config.questions,
      });
    }

    return json(200, { sections: DEFAULT_SECTIONS, questions: DEFAULT_QUESTIONS });
  } catch (err) {
    return json(500, { message: `Error server: ${err.message || String(err)}` });
  }
};
