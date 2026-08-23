(function () {
  const loadingState = document.getElementById("loadingState");
  const formLayout = document.getElementById("formLayout");
  const sidenav = document.getElementById("sidenav");
  const sectionsContainer = document.getElementById("sectionsContainer");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const alertBox = document.getElementById("alertBox");
  const successState = document.getElementById("successState");
  const candidateFormEl = document.getElementById("candidateForm");
  const fileBudget = document.getElementById("fileBudget");
  const fileBudgetText = document.getElementById("fileBudgetText");
  const fileBudgetFill = document.getElementById("fileBudgetFill");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const resumeBanner = document.getElementById("resumeBanner");
  const resumeBannerText = document.getElementById("resumeBannerText");
  const draftModal = document.getElementById("draftModal");
  const draftLinkInput = document.getElementById("draftLinkInput");
  const copyDraftLinkBtn = document.getElementById("copyDraftLinkBtn");
  const draftCopiedHint = document.getElementById("draftCopiedHint");
  const closeDraftModalBtn = document.getElementById("closeDraftModalBtn");

  // Cegah form ke-submit native (reload halaman) kalau kandidat pencet Enter
  // di keyboard saat mengisi field teks — semua pengiriman data harus lewat
  // tombol "Kirim Data" / submitForm() di JS, bukan submit bawaan browser.
  if (candidateFormEl) {
    candidateFormEl.addEventListener("submit", (e) => {
      e.preventDefault();
    });
  }

  let SECTIONS = [];
  let QUESTIONS = [];
  let current = 0;
  const signaturePads = {};
  const repeaterCounters = {};

  // Draft yang sedang dilanjutkan (kalau ada) — diisi dari URL ?resume=id:token
  // atau setelah "Simpan & Lanjutkan Nanti" pertama kali dipakai.
  let draftId = null;
  let draftToken = null;
  let pendingResumeAnswers = null;
  let pendingResumeFiles = [];

  function buildResumeLink(id, token) {
    return window.location.origin + window.location.pathname + "?resume=" + encodeURIComponent(id + ":" + token);
  }

  function setResumeUrlSilently(id, token) {
    const url = window.location.pathname + "?resume=" + encodeURIComponent(id + ":" + token);
    window.history.replaceState(null, "", url);
  }

  // Netlify function punya batas KERAS 6MB per request (tidak bisa dinaikkan,
  // termasuk di paket berbayar), dan base64 encoding menambah ~33% ukuran file.
  // Form ini punya banyak field upload (ijazah, transkrip, slip gaji, dst) yang
  // semuanya digabung jadi SATU kiriman — jadi batasnya bukan per file, tapi
  // TOTAL gabungan semua file dalam satu submit. Angka di bawah dikasih margin
  // aman supaya total request (setelah base64 + data jawaban) tetap di bawah 6MB.
  const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB per file
  const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB gabungan semua file

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + "MB";
    return Math.round(bytes / 1024) + "KB";
  }

  // Semua bagian form dirender sekaligus ke DOM (cuma disembunyikan lewat
  // display:none saat pindah bagian, bukan dihapus), jadi query ini otomatis
  // mencakup file yang sudah dipilih di bagian manapun, termasuk yang sudah
  // dilewati kandidat — bukan cuma bagian yang lagi aktif.
  function recomputeFileBudget() {
    if (!fileBudget) return;
    const inputs = sectionsContainer.querySelectorAll('input[type="file"]');
    let total = 0;
    let count = 0;
    inputs.forEach((inp) => {
      if (inp.files && inp.files[0]) { total += inp.files[0].size; count++; }
    });
    if (count === 0) { fileBudget.style.display = "none"; return; }
    fileBudget.style.display = "block";
    const pct = Math.min(100, (total / MAX_TOTAL_UPLOAD_BYTES) * 100);
    fileBudgetFill.style.width = pct + "%";
    fileBudgetFill.className = "file-budget-fill" + (total > MAX_TOTAL_UPLOAD_BYTES ? " over" : (pct > 70 ? " warn" : ""));
    fileBudgetText.textContent = formatBytes(total) + " / " + formatBytes(MAX_TOTAL_UPLOAD_BYTES);
  }

  init();

  function parseResumeParam() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("resume");
    if (!raw || raw.indexOf(":") === -1) return null;
    const idx = raw.indexOf(":");
    return { id: raw.slice(0, idx), token: raw.slice(idx + 1) };
  }

  async function init() {
    try {
      const res = await fetch("/.netlify/functions/get-questions");
      const data = await res.json();
      SECTIONS = data.sections || [];
      QUESTIONS = data.questions || [];
      render();
    } catch (e) {
      loadingState.textContent = "Gagal memuat formulir. Silakan refresh halaman.";
      return;
    }

    const resumeParams = parseResumeParam();
    if (resumeParams) {
      try {
        const r = await fetch(
          "/.netlify/functions/get-draft?id=" + encodeURIComponent(resumeParams.id) +
          "&token=" + encodeURIComponent(resumeParams.token)
        );
        const draft = await r.json();
        if (!r.ok || !draft.ok) {
          resumeBanner.style.display = "block";
          resumeBanner.classList.add("resume-banner-err");
          resumeBannerText.textContent = draft.message || "Draft tidak ditemukan atau link sudah tidak berlaku. Kamu tetap bisa mengisi formulir dari awal.";
        } else if (draft.status === "final") {
          resumeBanner.style.display = "block";
          resumeBanner.classList.add("resume-banner-err");
          resumeBannerText.textContent = "Review ini sudah pernah dikirim final lewat link ini dan tidak bisa diubah lagi.";
        } else {
          draftId = resumeParams.id;
          draftToken = resumeParams.token;
          pendingResumeAnswers = draft.answers || {};
          pendingResumeFiles = draft.files || [];
          populateForm(pendingResumeAnswers, pendingResumeFiles);
          resumeBanner.style.display = "block";
          resumeBannerText.textContent = "Melanjutkan draft yang tersimpan sebelumnya" + (draft.updatedAt ? (" (terakhir disimpan " + new Date(draft.updatedAt).toLocaleString("id-ID") + ")") : "") + ".";
        }
      } catch (e) {
        resumeBanner.style.display = "block";
        resumeBanner.classList.add("resume-banner-err");
        resumeBannerText.textContent = "Gagal memuat draft. Kamu tetap bisa mengisi formulir dari awal.";
      }
    }
  }

  function render() {
    loadingState.style.display = "none";
    formLayout.style.display = "grid";

    sidenav.innerHTML = '<div class="progress-label">BAGIAN <span id="stepLabel">1</span> DARI ' + SECTIONS.length + '</div>';
    SECTIONS.forEach((sec, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.section = idx;
      btn.innerHTML = '<span class="num">' + (idx + 1) + '</span> ' + escapeHtml(sec.title);
      btn.addEventListener("click", () => goTo(idx));
      sidenav.appendChild(btn);
    });

    sectionsContainer.innerHTML = "";
    SECTIONS.forEach((sec, idx) => {
      const secEl = document.createElement("section");
      secEl.className = "sec";
      secEl.dataset.sec = idx;
      secEl.style.display = idx === 0 ? "block" : "none";

      const head = document.createElement("div");
      head.className = "panel-head";
      head.innerHTML =
        '<div class="section-eyebrow">Bagian ' + (idx + 1) + '</div>' +
        '<h2>' + escapeHtml(sec.title) + '</h2>' +
        (sec.description ? '<p>' + escapeHtml(sec.description) + '</p>' : "");
      secEl.appendChild(head);

      let gridWrap = document.createElement("div");
      gridWrap.className = "grid2";

      const flush = () => {
        if (gridWrap.childNodes.length) secEl.appendChild(gridWrap);
        gridWrap = document.createElement("div");
        gridWrap.className = "grid2";
      };

      QUESTIONS.filter((q) => (q.section || SECTIONS[0].id) === sec.id).forEach((q) => {
        if (q.type === "repeater") {
          flush();
          secEl.appendChild(buildRepeater(q));
        } else if (q.type === "textarea" || q.type === "signature") {
          flush();
          secEl.appendChild(buildField(q, {}));
        } else {
          gridWrap.appendChild(buildField(q, {}));
        }
      });
      flush();

      sectionsContainer.appendChild(secEl);
    });

    Object.keys(signaturePads).forEach((qid) => setupSignaturePad(qid));
    goTo(0);
  }

  function buildField(q, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.textContent = q.label || q.id;
    if (q.required) {
      const req = document.createElement("span");
      req.className = "req";
      req.textContent = "*";
      label.appendChild(req);
    }
    wrap.appendChild(label);
    if (q.description) {
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.style.margin = "0 0 6px";
      hint.textContent = q.description;
      wrap.appendChild(hint);
    }

    function dataAttrs(el) {
      el.dataset.qid = opts.subFieldOf || q.id;
      if (opts.rowIndex !== undefined) el.dataset.row = opts.rowIndex;
      if (opts.subFieldOf) el.dataset.field = q.id;
      if (q.required) el.required = true;
    }

    let input;
    if (q.type === "textarea") {
      input = document.createElement("textarea");
      dataAttrs(input);
    } else if (q.type === "select") {
      input = document.createElement("select");
      dataAttrs(input);
      input.appendChild(new Option("Pilih salah satu", ""));
      (q.options || []).forEach((o) => input.appendChild(new Option(o, o)));
    } else if (q.type === "radio") {
      const ynWrap = document.createElement("div");
      ynWrap.className = "yn";
      const name = "radio_" + (opts.subFieldOf || q.id) + "_" + (opts.rowIndex !== undefined ? opts.rowIndex : "x") + "_" + Math.random().toString(36).slice(2, 7);
      (q.options && q.options.length ? q.options : ["Ya", "Tidak"]).forEach((o) => {
        const optLabel = document.createElement("label");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = name;
        radio.value = o;
        dataAttrs(radio);
        optLabel.appendChild(radio);
        optLabel.appendChild(document.createTextNode(" " + o));
        ynWrap.appendChild(optLabel);
      });
      wrap.appendChild(ynWrap);
      return wrap;
    } else if (q.type === "checkbox") {
      const ynWrap = document.createElement("div");
      ynWrap.className = "yn";
      const optLabel = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      dataAttrs(cb);
      optLabel.appendChild(cb);
      optLabel.appendChild(document.createTextNode(" Ya, saya setuju"));
      ynWrap.appendChild(optLabel);
      wrap.appendChild(ynWrap);
      return wrap;
    } else if (q.type === "file") {
      const drop = document.createElement("label");
      drop.className = "file-drop";
      const dropText = document.createElement("span");
      dropText.textContent = "Klik untuk pilih file";
      drop.appendChild(dropText);
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.style.display = "none";
      dataAttrs(fileInput);
      const sizeHint = document.createElement("p");
      sizeHint.className = "hint file-size-hint";
      sizeHint.style.cssText = "margin:5px 0 0; font-size:11.5px; color:var(--ink-soft, #5b6270);";
      sizeHint.textContent = "Maksimal " + formatBytes(MAX_UPLOAD_BYTES) + " per file.";
      const fileWarn = document.createElement("p");
      fileWarn.className = "hint file-size-warn";
      fileWarn.style.cssText = "margin:6px 0 0; display:none; color:var(--err);";
      fileInput.addEventListener("change", () => {
        // PENTING: jangan set drop.textContent di sini — drop adalah parent
        // dari fileInput, dan menimpa textContent akan menghapus fileInput
        // dari DOM (menyebabkan file yang sudah dipilih gagal terkirim saat submit).
        const f = fileInput.files[0];
        if (f && f.size > MAX_UPLOAD_BYTES) {
          fileWarn.textContent = "File terlalu besar (" + formatBytes(f.size) + "). Maksimal " + formatBytes(MAX_UPLOAD_BYTES) + " per file — coba kompres/perkecil dulu filenya.";
          fileWarn.style.display = "block";
          fileInput.value = "";
          dropText.textContent = "Klik untuk pilih file";
          drop.classList.remove("has-file");
          recomputeFileBudget();
          return;
        }
        fileWarn.style.display = "none";
        // Pilihan baru menggantikan file lama (kalau sedang lanjutkan draft).
        delete fileInput.dataset.existing;
        dropText.textContent = f ? ("\u2713 " + f.name + " (" + formatBytes(f.size) + ")") : "Klik untuk pilih file";
        drop.classList.toggle("has-file", !!f);
        recomputeFileBudget();
      });
      drop.appendChild(fileInput);
      wrap.appendChild(drop);
      wrap.appendChild(sizeHint);
      wrap.appendChild(fileWarn);
      wrap.dataset.dropText = "";
      return wrap;
    } else if (q.type === "signature") {
      const qid = opts.subFieldOf || q.id;
      const padWrap = document.createElement("div");
      padWrap.innerHTML =
        '<canvas class="sig-canvas" data-sig="' + qid + '" width="600" height="150"></canvas>' +
        '<button type="button" class="btn-add" data-sig-clear="' + qid + '" style="margin-top:8px;">Bersihkan Tanda Tangan</button>';
      wrap.appendChild(padWrap);
      signaturePads[qid] = { canvas: null, ctx: null, hasDrawing: false };
      return wrap;
    } else {
      input = document.createElement("input");
      input.type = q.type === "month" ? "month" : (q.type || "text");
      dataAttrs(input);
    }

    if (input) wrap.appendChild(input);
    return wrap;
  }

  function buildRepeater(q) {
    const holder = document.createElement("div");
    holder.className = "field";

    const label = document.createElement("label");
    label.textContent = q.label || q.id;
    if (q.required) {
      const req = document.createElement("span");
      req.className = "req";
      req.textContent = "*";
      label.appendChild(req);
    }
    holder.appendChild(label);

    const rowsHolder = document.createElement("div");
    rowsHolder.dataset.repeaterHolder = q.id;
    holder.appendChild(rowsHolder);

    repeaterCounters[q.id] = 0;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-add";
    addBtn.textContent = q.addLabel || ("+ Tambah " + (q.itemLabel || "Baris"));
    addBtn.addEventListener("click", () => addRepeaterRow(q, rowsHolder));
    holder.appendChild(addBtn);

    const minRows = q.minRows || 1;
    for (let i = 0; i < minRows; i++) addRepeaterRow(q, rowsHolder);

    return holder;
  }

  function addRepeaterRow(q, rowsHolder) {
    const rowIndex = repeaterCounters[q.id]++;
    const item = document.createElement("div");
    item.className = "repeater-item";
    item.dataset.qid = q.id;
    item.dataset.row = rowIndex;

    const tag = document.createElement("span");
    tag.className = "rep-tag";
    tag.textContent = (q.itemLabel || "BARIS").toUpperCase() + " " + (rowsHolder.children.length + 1);
    item.appendChild(tag);

    const removeBtn = document.createElement("span");
    removeBtn.className = "rep-remove";
    removeBtn.textContent = "Hapus";
    removeBtn.addEventListener("click", () => {
      const count = rowsHolder.querySelectorAll(".repeater-item").length;
      if (count <= (q.minRows || 1)) {
        showAlert("err", "Minimal harus ada " + (q.minRows || 1) + " " + (q.itemLabel || "baris").toLowerCase() + ".");
        return;
      }
      item.remove();
      renumberRepeater(rowsHolder, q.itemLabel);
      recomputeFileBudget();
    });
    item.appendChild(removeBtn);

    let grid = document.createElement("div");
    grid.className = "grid2";
    (q.fields || []).forEach((sub) => {
      if (sub.type === "textarea") {
        if (grid.childNodes.length) { item.appendChild(grid); grid = document.createElement("div"); grid.className = "grid2"; }
        item.appendChild(buildField(sub, { subFieldOf: q.id, rowIndex: rowIndex }));
      } else {
        grid.appendChild(buildField(sub, { subFieldOf: q.id, rowIndex: rowIndex }));
      }
    });
    if (grid.childNodes.length) item.appendChild(grid);

    rowsHolder.appendChild(item);
  }

  function renumberRepeater(rowsHolder, itemLabel) {
    rowsHolder.querySelectorAll(".repeater-item").forEach((el, i) => {
      const tag = el.querySelector(".rep-tag");
      if (tag) tag.textContent = (itemLabel || "BARIS").toUpperCase() + " " + (i + 1);
    });
  }

  function setupSignaturePad(qid) {
    const canvas = sectionsContainer.querySelector('canvas[data-sig="' + qid + '"]');
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0b1f3b";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    signaturePads[qid] = { canvas: canvas, ctx: ctx, hasDrawing: false };

    let drawing = false;
    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }
    function start(e) { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
    function move(e) {
      if (!drawing) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      signaturePads[qid].hasDrawing = true;
      e.preventDefault();
    }
    function end() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    const clearBtn = sectionsContainer.querySelector('[data-sig-clear="' + qid + '"]');
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        signaturePads[qid].hasDrawing = false;
      });
    }
  }

  function goTo(i) {
    current = Math.max(0, Math.min(SECTIONS.length - 1, i));
    document.querySelectorAll(".sec").forEach((s) => (s.style.display = "none"));
    const secEl = sectionsContainer.querySelector('.sec[data-sec="' + current + '"]');
    if (secEl) secEl.style.display = "block";
    sidenav.querySelectorAll("button").forEach((b, idx) => {
      b.classList.toggle("active", idx === current);
      b.classList.toggle("done", idx < current);
    });
    const stepLabelEl = document.getElementById("stepLabel");
    if (stepLabelEl) stepLabelEl.textContent = current + 1;
    prevBtn.style.visibility = current === 0 ? "hidden" : "visible";
    nextBtn.textContent = current === SECTIONS.length - 1 ? "Kirim Data \u2192" : "Selanjutnya \u2192";
    alertBox.innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => {
    if (!validateSection(current)) return;
    if (current === SECTIONS.length - 1) {
      submitForm();
    } else {
      goTo(current + 1);
    }
  });

  function validateSection(idx) {
    const secEl = sectionsContainer.querySelector('.sec[data-sec="' + idx + '"]');
    if (!secEl) return true;
    const requiredInputs = secEl.querySelectorAll("[required]");
    for (const el of requiredInputs) {
      if (el.type === "radio") {
        const name = el.name;
        const checked = secEl.querySelector('input[name="' + name + '"]:checked');
        if (!checked) {
          showAlert("err", "Mohon lengkapi semua pertanyaan wajib (bertanda *) sebelum lanjut.");
          el.closest(".field").scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      } else if (el.type === "checkbox") {
        if (!el.checked) {
          showAlert("err", "Mohon centang pernyataan yang wajib disetujui.");
          el.closest(".field").scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      } else if (el.type === "file") {
        if ((!el.files || !el.files.length) && !el.dataset.existing) {
          showAlert("err", "Mohon lengkapi semua unggahan file wajib.");
          el.closest(".field").scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      } else if (!el.value || !el.value.trim()) {
        showAlert("err", "Mohon lengkapi semua kolom wajib (bertanda *) sebelum lanjut.");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }
    const sigCanvases = secEl.querySelectorAll("canvas[data-sig]");
    for (const c of sigCanvases) {
      const q = QUESTIONS.find((qq) => qq.id === c.dataset.sig);
      if (q && q.required && (!signaturePads[q.id] || !signaturePads[q.id].hasDrawing)) {
        showAlert("err", "Mohon bubuhkan tanda tangan sebelum lanjut.");
        c.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }
    return true;
  }

  function showAlert(kind, msg) {
    alertBox.innerHTML = '<div class="msg msg-' + kind + '">' + escapeHtml(msg) + '</div>';
  }

  // Mengumpulkan seluruh jawaban & file yang dipilih dari DOM saat ini,
  // dipakai baik oleh "Simpan Draft" maupun "Kirim Data" (submit final).
  function collectFormData() {
    const answers = {};
    const filesToUpload = [];

    QUESTIONS.forEach((q) => {
      if (q.type === "repeater") {
        const rows = sectionsContainer.querySelectorAll('.repeater-item[data-qid="' + q.id + '"]');
        const rowsData = [];
        rows.forEach((rowEl) => {
          const rowIndex = Number(rowEl.dataset.row);
          const rowObj = {};
          (q.fields || []).forEach((sub) => {
            const el = rowEl.querySelector('[data-field="' + sub.id + '"]');
            if (!el) return;
            if (sub.type === "file") {
              if (el.files && el.files[0]) {
                filesToUpload.push({ questionId: q.id, rowIndex: rowIndex, subFieldId: sub.id, file: el.files[0] });
                rowObj[sub.id] = el.files[0].name;
              } else if (el.dataset.existing) {
                rowObj[sub.id] = el.dataset.existing;
              }
            } else if (sub.type === "radio") {
              const checked = rowEl.querySelector('[data-field="' + sub.id + '"]:checked');
              rowObj[sub.id] = checked ? checked.value : "";
            } else {
              rowObj[sub.id] = el.value;
            }
          });
          rowsData.push(rowObj);
        });
        answers[q.id] = rowsData;
        return;
      }

      if (q.type === "signature") {
        const pad = signaturePads[q.id];
        answers[q.id] = pad && pad.hasDrawing ? pad.canvas.toDataURL("image/png") : "";
        return;
      }

      const el = sectionsContainer.querySelector('[data-qid="' + q.id + '"]:not([data-row])');
      if (!el) return;

      if (q.type === "file") {
        if (el.files && el.files[0]) {
          filesToUpload.push({ questionId: q.id, file: el.files[0] });
          answers[q.id] = el.files[0].name;
        } else if (el.dataset.existing) {
          answers[q.id] = el.dataset.existing;
        }
      } else if (q.type === "radio") {
        const checked = sectionsContainer.querySelector('[data-qid="' + q.id + '"]:not([data-row]):checked');
        answers[q.id] = checked ? checked.value : "";
      } else if (q.type === "checkbox") {
        answers[q.id] = el.checked;
      } else {
        answers[q.id] = el.value;
      }
    });

    return { answers, filesToUpload };
  }

  function checkFileBudget(filesToUpload) {
    const totalBytes = filesToUpload.reduce((sum, f) => sum + f.file.size, 0);
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
      const biggest = filesToUpload.slice().sort((a, b) => b.file.size - a.file.size)[0];
      showAlert(
        "err",
        "Total ukuran semua file yang diunggah (" + formatBytes(totalBytes) + ") melebihi batas " +
        formatBytes(MAX_TOTAL_UPLOAD_BYTES) + " per pengiriman. File terbesar: \u201c" + biggest.file.name +
        "\u201d (" + formatBytes(biggest.file.size) + "). Coba kompres foto/PDF-nya dulu, lalu kirim ulang."
      );
      return false;
    }
    return true;
  }

  async function filesToPayload(filesToUpload) {
    return Promise.all(
      filesToUpload.map(async (f) => {
        const base64 = await fileToBase64(f.file);
        return {
          questionId: f.questionId,
          rowIndex: f.rowIndex !== undefined ? f.rowIndex : null,
          subFieldId: f.subFieldId || null,
          filename: f.file.name,
          contentType: f.file.type,
          base64: base64,
        };
      })
    );
  }

  async function submitForm() {
    nextBtn.disabled = true;
    nextBtn.textContent = "Mengirim\u2026";
    if (saveDraftBtn) saveDraftBtn.disabled = true;

    const { answers, filesToUpload } = collectFormData();

    try {
      if (!checkFileBudget(filesToUpload)) {
        nextBtn.disabled = false;
        nextBtn.textContent = "Kirim Data \u2192";
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        return;
      }

      const files = await filesToPayload(filesToUpload);

      const res = await fetch("/.netlify/functions/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "final", id: draftId, token: draftToken, answers: answers, files: files }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = err && err.message
          ? err.message
          : (res.status === 413
              ? "Ukuran data yang dikirim terlalu besar. Coba kompres file yang diunggah, lalu kirim ulang."
              : "Gagal mengirim data. Silakan coba lagi.");
        showAlert("err", msg);
        nextBtn.disabled = false;
        nextBtn.textContent = "Kirim Data \u2192";
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        return;
      }

      resumeBanner.style.display = "none";
      formLayout.style.display = "none";
      document.querySelector(".letterhead").style.display = "none";
      successState.style.display = "block";
    } catch (e) {
      showAlert("err", "Gagal terhubung ke server. Periksa koneksi internet kamu.");
      nextBtn.disabled = false;
      nextBtn.textContent = "Kirim Data \u2192";
      if (saveDraftBtn) saveDraftBtn.disabled = false;
    }
  }

  async function saveDraft() {
    if (!saveDraftBtn) return;
    saveDraftBtn.disabled = true;
    const originalText = saveDraftBtn.textContent;
    saveDraftBtn.textContent = "Menyimpan\u2026";

    const { answers, filesToUpload } = collectFormData();

    try {
      if (!checkFileBudget(filesToUpload)) {
        saveDraftBtn.disabled = false;
        saveDraftBtn.textContent = originalText;
        return;
      }
      const files = await filesToPayload(filesToUpload);

      const res = await fetch("/.netlify/functions/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "draft", id: draftId, token: draftToken, answers: answers, files: files }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) {
        showAlert("err", (data && data.message) || "Gagal menyimpan draft. Silakan coba lagi.");
        saveDraftBtn.disabled = false;
        saveDraftBtn.textContent = originalText;
        return;
      }

      draftId = data.id;
      if (data.token) draftToken = data.token;

      const link = window.location.origin + window.location.pathname + "?resume=" + draftId + ":" + draftToken;
      history.replaceState(null, "", "?resume=" + draftId + ":" + draftToken);
      draftLinkInput.value = link;
      draftCopiedHint.style.display = "none";
      draftModal.style.display = "flex";
    } catch (e) {
      showAlert("err", "Gagal terhubung ke server. Periksa koneksi internet kamu.");
    } finally {
      saveDraftBtn.disabled = false;
      saveDraftBtn.textContent = originalText;
    }
  }

  if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveDraft);
  if (closeDraftModalBtn) closeDraftModalBtn.addEventListener("click", () => { draftModal.style.display = "none"; });
  if (copyDraftLinkBtn) {
    copyDraftLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(draftLinkInput.value);
      } catch (e) {
        draftLinkInput.select();
        document.execCommand("copy");
      }
      draftCopiedHint.style.display = "block";
    });
  }

  // Mengisi ulang form dari data draft yang sudah tersimpan sebelumnya
  // (dipanggil setelah render() sehingga semua elemen DOM sudah ada).
  function populateForm(answers, filesInfo) {
    QUESTIONS.forEach((q) => {
      if (q.type === "repeater") {
        const rowsHolder = sectionsContainer.querySelector('[data-repeater-holder="' + q.id + '"]');
        const rowsData = answers[q.id];
        if (!rowsHolder || !Array.isArray(rowsData) || !rowsData.length) return;
        // Pastikan jumlah baris di DOM cukup untuk menampung data tersimpan.
        while (rowsHolder.querySelectorAll(".repeater-item").length < rowsData.length) {
          addRepeaterRow(q, rowsHolder);
        }
        const rowEls = rowsHolder.querySelectorAll(".repeater-item");
        rowsData.forEach((rowObj, i) => {
          const rowEl = rowEls[i];
          if (!rowEl) return;
          (q.fields || []).forEach((sub) => {
            const el = rowEl.querySelector('[data-field="' + sub.id + '"]');
            if (!el) return;
            const val = rowObj[sub.id];
            fillOneField(el, sub, val, q.id, i, filesInfo);
          });
        });
        return;
      }

      if (q.type === "signature") {
        const val = answers[q.id];
        if (!val) return;
        const canvas = sectionsContainer.querySelector('canvas[data-sig="' + q.id + '"]');
        if (!canvas) return;
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (signaturePads[q.id]) signaturePads[q.id].hasDrawing = true;
        };
        img.src = val;
        return;
      }

      const el = sectionsContainer.querySelector('[data-qid="' + q.id + '"]:not([data-row])');
      if (!el) return;
      fillOneField(el, q, answers[q.id], null, null, filesInfo);
    });
  }

  function fillOneField(el, q, val, repeaterId, rowIndex, filesInfo) {
    if (q.type === "file") {
      if (val) {
        el.dataset.existing = val;
        const drop = el.closest(".file-drop");
        if (drop) {
          drop.classList.add("has-file");
          const span = drop.querySelector("span");
          if (span) span.textContent = "\u2713 " + val + " (sudah diunggah sebelumnya)";
        }
      }
      return;
    }
    if (val === undefined || val === null) return;
    if (q.type === "radio") {
      const name = el.name;
      const scope = el.closest(repeaterId ? ".repeater-item" : "body") || document;
      const radio = scope.querySelector('input[name="' + name + '"][value="' + String(val).replace(/"/g, '\\"') + '"]');
      if (radio) radio.checked = true;
      return;
    }
    if (q.type === "checkbox") {
      el.checked = !!val;
      return;
    }
    el.value = val;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
})();
