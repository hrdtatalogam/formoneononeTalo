(function () {
  const loginScreen = document.getElementById("loginScreen");
  const adminScreen = document.getElementById("adminScreen");
  const userInput = document.getElementById("userInput");
  const pwInput = document.getElementById("pwInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginAlert = document.getElementById("loginAlert");
  const logoutBtn = document.getElementById("logoutBtn");
  const whoAmI = document.getElementById("whoAmI");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabSubmissions = document.getElementById("tab-submissions");
  const tabQuestions = document.getElementById("tab-questions");
  const tabUsers = document.getElementById("tab-users");
  const usersTabBtn = document.getElementById("usersTabBtn");

  // ---- Kelola User: elemen ----
  const usersAlert = document.getElementById("usersAlert");
  const ownNewPw = document.getElementById("ownNewPw");
  const changeOwnPwBtn = document.getElementById("changeOwnPwBtn");
  const newUsername = document.getElementById("newUsername");
  const newUserPw = document.getElementById("newUserPw");
  const newUserRole = document.getElementById("newUserRole");
  const addUserBtn = document.getElementById("addUserBtn");
  const usersListContainer = document.getElementById("usersListContainer");
  const loginLogContainer = document.getElementById("loginLogContainer");

  const submissionsContainer = document.getElementById("submissionsContainer");
  const subAlert = document.getElementById("subAlert");
  const subToolbar = document.getElementById("subToolbar");
  const subSearchInput = document.getElementById("subSearchInput");
  const subSearchClear = document.getElementById("subSearchClear");
  const subResultCount = document.getElementById("subResultCount");
  const subStatusFilter = document.getElementById("subStatusFilter");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const downloadAllOverlay = document.getElementById("downloadAllOverlay");
  const downloadAllDesc = document.getElementById("downloadAllDesc");
  const downloadChoiceView = document.getElementById("downloadChoiceView");
  const downloadProgressView = document.getElementById("downloadProgressView");
  const downloadAllCancelBtn = document.getElementById("downloadAllCancelBtn");
  const downloadAllConfirmBtn = document.getElementById("downloadAllConfirmBtn");
  const downloadProgressTitle = document.getElementById("downloadProgressTitle");
  const downloadProgressDesc = document.getElementById("downloadProgressDesc");
  const downloadProgressFill = document.getElementById("downloadProgressFill");
  const downloadProgressLabel = document.getElementById("downloadProgressLabel");
  const downloadProgressCloseBtn = document.getElementById("downloadProgressCloseBtn");

  const sectionsList = document.getElementById("sectionsList");
  const addSectionBtn = document.getElementById("addSectionBtn");
  const questionsList = document.getElementById("questionsList");
  const addQuestionBtn = document.getElementById("addQuestionBtn");
  const saveQuestionsBtn = document.getElementById("saveQuestionsBtn");
  const qAlert = document.getElementById("qAlert");

  const detailOverlay = document.getElementById("detailOverlay");
  const detailTitle = document.getElementById("detailTitle");
  const detailBody = document.getElementById("detailBody");
  const detailCloseBtn = document.getElementById("detailCloseBtn");
  const detailPdfBtn = document.getElementById("detailPdfBtn");

  const SESSION_KEY = "admin_session"; // { token, username, role }
  let sections = [];
  let questions = [];
  let lastSubmissions = [];
  let filteredSubmissions = [];
  let currentDetailRecord = null;

  const TYPE_LABELS = {
    text: "Teks Singkat",
    textarea: "Teks Panjang",
    email: "Email",
    tel: "No. Telepon",
    number: "Angka",
    date: "Tanggal",
    month: "Bulan & Tahun",
    select: "Pilihan (Dropdown)",
    radio: "Ya/Tidak atau Pilihan (Radio)",
    checkbox: "Centang (Pernyataan Setuju)",
    file: "Upload File",
    signature: "Tanda Tangan",
    repeater: "Grup Berulang (bisa tambah baris)",
  };
  // Status di sini bukan status lamaran (sudah dihapus sesuai kebutuhan),
  // melainkan status pengisian: draft (belum selesai) atau final (sudah dikirim).
  const STATUS_LABELS = {
    draft: "Draft (belum selesai)",
    final: "Sudah Final",
  };
  const STATUS_CLASSES = {
    draft: "status-diproses",
    final: "status-diterima",
  };

  const SUB_TYPE_LABELS = {
    text: "Teks Singkat",
    textarea: "Teks Panjang",
    email: "Email",
    tel: "No. Telepon",
    number: "Angka",
    date: "Tanggal",
    month: "Bulan & Tahun",
    select: "Pilihan (Dropdown)",
    radio: "Ya/Tidak atau Pilihan (Radio)",
    file: "Upload File",
  };

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function getToken() {
    const s = getSession();
    return s && s.token;
  }
  function isSuperadmin() {
    const s = getSession();
    return !!s && s.role === "superadmin";
  }

  async function authedFetch(url, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers, { "x-admin-token": getToken() || "" });
    const res = await fetch(url, Object.assign({}, opts, { headers: headers }));
    if (res.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      showLogin("Sesi berakhir, silakan login lagi.");
      throw new Error("Unauthorized");
    }
    return res;
  }

  function showLogin(message) {
    loginScreen.style.display = "block";
    adminScreen.style.display = "none";
    if (message) loginAlert.innerHTML = '<div class="msg msg-err">' + message + '</div>';
  }

  async function showAdmin() {
    loginScreen.style.display = "none";
    adminScreen.style.display = "block";
    const s = getSession();
    if (s) whoAmI.textContent = s.username + (s.role === "superadmin" ? " · Super Admin" : " · Admin");
    usersTabBtn.style.display = isSuperadmin() ? "" : "none";
    await loadConfig();
    loadSubmissions();
  }

  loginBtn.addEventListener("click", async () => {
    const username = (userInput.value || "").trim();
    const pw = pwInput.value.trim();
    if (!username || !pw) return;
    loginBtn.disabled = true;
    loginBtn.textContent = "Memeriksa\u2026";
    try {
      const res = await fetch("/.netlify/functions/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, username: data.username, role: data.role }));
        loginAlert.innerHTML = "";
        pwInput.value = "";
        showAdmin();
      } else {
        loginAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Username atau password salah.") + '</div>';
      }
    } catch (e) {
      loginAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
    }
    loginBtn.disabled = false;
    loginBtn.textContent = "Masuk";
  });

  pwInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });
  userInput.addEventListener("keydown", (e) => { if (e.key === "Enter") pwInput.focus(); });
  logoutBtn.addEventListener("click", () => { sessionStorage.removeItem(SESSION_KEY); showLogin(); });

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      tabSubmissions.style.display = tab === "submissions" ? "block" : "none";
      tabQuestions.style.display = tab === "questions" ? "block" : "none";
      tabUsers.style.display = tab === "users" ? "block" : "none";
      if (tab === "users" && isSuperadmin()) { loadUsers(); loadLoginLog(); }
    });
  });

  // ================= KELOLA USER =================
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  changeOwnPwBtn.addEventListener("click", async () => {
    const s = getSession();
    const newPw = (ownNewPw.value || "").trim();
    if (!s) return;
    if (newPw.length < 6) {
      usersAlert.innerHTML = '<div class="msg msg-err">Password baru minimal 6 karakter.</div>';
      return;
    }
    changeOwnPwBtn.disabled = true;
    try {
      const res = await authedFetch("/.netlify/functions/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: s.username, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        usersAlert.innerHTML = '<div class="msg msg-ok">Password berhasil diganti.</div>';
        ownNewPw.value = "";
      } else {
        usersAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Gagal mengganti password.") + '</div>';
      }
    } catch (e) {
      if (e.message !== "Unauthorized") usersAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
    }
    changeOwnPwBtn.disabled = false;
  });

  addUserBtn.addEventListener("click", async () => {
    const username = (newUsername.value || "").trim().toLowerCase();
    const password = (newUserPw.value || "").trim();
    const role = newUserRole.value;
    if (!username || password.length < 6) {
      usersAlert.innerHTML = '<div class="msg msg-err">Username wajib diisi & password minimal 6 karakter.</div>';
      return;
    }
    addUserBtn.disabled = true;
    try {
      const res = await authedFetch("/.netlify/functions/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        usersAlert.innerHTML = '<div class="msg msg-ok">User berhasil ditambahkan.</div>';
        newUsername.value = "";
        newUserPw.value = "";
        newUserRole.value = "admin";
        loadUsers();
      } else {
        usersAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Gagal menambah user.") + '</div>';
      }
    } catch (e) {
      if (e.message !== "Unauthorized") usersAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
    }
    addUserBtn.disabled = false;
  });

  async function loadUsers() {
    usersListContainer.innerHTML = '<p class="hint">Memuat\u2026</p>';
    try {
      const res = await authedFetch("/.netlify/functions/admin-users");
      const users = await res.json();
      renderUsers(users);
    } catch (e) {
      if (e.message !== "Unauthorized") usersListContainer.innerHTML = '<p class="hint">Gagal memuat daftar user.</p>';
    }
  }

  function renderUsers(users) {
    if (!users || !users.length) {
      usersListContainer.innerHTML = '<div class="empty-state">Belum ada user.</div>';
      return;
    }
    const s = getSession();
    const table = document.createElement("table");
    table.className = "sub-table";
    table.innerHTML = '<thead><tr><th>Username</th><th>Role</th><th>Dibuat</th><th></th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector("tbody");
    users.forEach((u) => {
      const tr = document.createElement("tr");
      const created = u.createdAt ? new Date(u.createdAt).toLocaleString("id-ID") : "-";
      tr.innerHTML =
        "<td>" + escapeHtml(u.username) + (u.username === s.username ? " (kamu)" : "") + "</td>" +
        "<td>" + (u.role === "superadmin" ? "Super Admin" : "Admin") + "</td>" +
        "<td>" + created + "</td>" +
        "<td></td>";
      const tdActions = tr.querySelector("td:last-child");

      const resetBtn = document.createElement("button");
      resetBtn.className = "btn btn-ghost";
      resetBtn.style.marginRight = "6px";
      resetBtn.textContent = "Reset Password";
      resetBtn.addEventListener("click", async () => {
        const newPw = window.prompt("Password baru untuk " + u.username + " (minimal 6 karakter):");
        if (newPw === null) return;
        if (newPw.trim().length < 6) {
          usersAlert.innerHTML = '<div class="msg msg-err">Password baru minimal 6 karakter.</div>';
          return;
        }
        try {
          const res = await authedFetch("/.netlify/functions/admin-users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: u.username, newPassword: newPw.trim() }),
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            usersAlert.innerHTML = '<div class="msg msg-ok">Password ' + escapeHtml(u.username) + ' berhasil direset.</div>';
          } else {
            usersAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Gagal reset password.") + '</div>';
          }
        } catch (e) {
          if (e.message !== "Unauthorized") usersAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
        }
      });
      tdActions.appendChild(resetBtn);

      if (u.username !== s.username) {
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger";
        delBtn.textContent = "Hapus";
        delBtn.addEventListener("click", async () => {
          if (!window.confirm("Hapus user " + u.username + "? Tindakan ini tidak bisa dibatalkan.")) return;
          try {
            const res = await authedFetch("/.netlify/functions/admin-users", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: u.username }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
              usersAlert.innerHTML = '<div class="msg msg-ok">User ' + escapeHtml(u.username) + ' dihapus.</div>';
              loadUsers();
            } else {
              usersAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Gagal menghapus user.") + '</div>';
            }
          } catch (e) {
            if (e.message !== "Unauthorized") usersAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
          }
        });
        tdActions.appendChild(delBtn);
      }

      // ---- Ubah role ----
      const roleSelect = document.createElement("select");
      roleSelect.style.marginLeft = "6px";
      roleSelect.style.padding = "6px 8px";
      roleSelect.style.fontSize = "13px";
      roleSelect.style.border = "1px solid #cfd3dc";
      roleSelect.style.borderRadius = "6px";
      roleSelect.innerHTML = '<option value="admin">Admin</option><option value="superadmin">Super Admin</option>';
      roleSelect.value = u.role === "superadmin" ? "superadmin" : "admin";
      const roleBtn = document.createElement("button");
      roleBtn.className = "btn btn-ghost";
      roleBtn.style.marginLeft = "6px";
      roleBtn.textContent = "Ubah Role";
      roleBtn.addEventListener("click", async () => {
        const newRole = roleSelect.value;
        if (newRole === u.role) return;
        const roleLabel = newRole === "superadmin" ? "Super Admin" : "Admin";
        if (!window.confirm("Ubah role " + u.username + " jadi " + roleLabel + "?")) return;
        try {
          const res = await authedFetch("/.netlify/functions/admin-users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: u.username, role: newRole }),
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            usersAlert.innerHTML = '<div class="msg msg-ok">Role ' + escapeHtml(u.username) + ' diubah jadi ' + roleLabel + '.</div>';
            loadUsers();
          } else {
            usersAlert.innerHTML = '<div class="msg msg-err">' + (data.message || "Gagal mengubah role.") + '</div>';
          }
        } catch (e) {
          if (e.message !== "Unauthorized") usersAlert.innerHTML = '<div class="msg msg-err">Gagal terhubung ke server.</div>';
        }
      });
      tdActions.appendChild(roleSelect);
      tdActions.appendChild(roleBtn);

      tbody.appendChild(tr);
    });
    usersListContainer.innerHTML = "";
    usersListContainer.appendChild(table);
  }

  // ================= LOG LOGIN =================
  async function loadLoginLog() {
    loginLogContainer.innerHTML = '<p class="hint">Memuat\u2026</p>';
    try {
      const res = await authedFetch("/.netlify/functions/admin-login-log");
      const logs = await res.json();
      renderLoginLog(logs);
    } catch (e) {
      if (e.message !== "Unauthorized") loginLogContainer.innerHTML = '<p class="hint">Gagal memuat log login.</p>';
    }
  }

  function renderLoginLog(logs) {
    if (!logs || !logs.length) {
      loginLogContainer.innerHTML = '<div class="empty-state">Belum ada riwayat login.</div>';
      return;
    }
    const table = document.createElement("table");
    table.className = "sub-table";
    table.innerHTML = '<thead><tr><th>Waktu</th><th>Username</th><th>Role</th><th>IP</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector("tbody");
    logs.forEach((entry) => {
      const tr = document.createElement("tr");
      const waktu = entry.at ? new Date(entry.at).toLocaleString("id-ID") : "-";
      tr.innerHTML =
        "<td>" + waktu + "</td>" +
        "<td>" + escapeHtml(entry.username) + "</td>" +
        "<td>" + (entry.role === "superadmin" ? "Super Admin" : "Admin") + "</td>" +
        "<td>" + escapeHtml(entry.ip || "-") + "</td>";
      tbody.appendChild(tr);
    });
    loginLogContainer.innerHTML = "";
    loginLogContainer.appendChild(table);
  }

  // ================= SUBMISSIONS =================
  async function loadSubmissions() {
    submissionsContainer.innerHTML = '<p class="hint">Memuat data\u2026</p>';
    try {
      const res = await authedFetch("/.netlify/functions/admin-submissions");
      const records = await res.json();
      renderSubmissions(records);
    } catch (e) {
      if (e.message !== "Unauthorized") submissionsContainer.innerHTML = '<p class="hint">Gagal memuat data.</p>';
    }
  }

  subSearchInput.addEventListener("input", applySubmissionFilter);
  subStatusFilter.addEventListener("change", () => { applySubmissionFilter(); });

  subSearchClear.addEventListener("click", () => {
    subSearchInput.value = "";
    applySubmissionFilter();
    subSearchInput.focus();
  });

  function csvEscape(val) {
    const s = val == null ? "" : String(val);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function todayStamp() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- Download Semua Data (CSV/Excel ringkasan / ZIP berisi PDF per review) ----------
  downloadAllBtn.addEventListener("click", () => {
    const n = filteredSubmissions.length;
    downloadAllDesc.textContent = "Pilih format unduhan untuk " + n + " review yang sedang tampil di daftar" + (subSearchInput.value.trim() ? " (sesuai hasil pencarian)" : "") + ".";
    downloadChoiceView.style.display = "block";
    downloadProgressView.style.display = "none";
    downloadAllOverlay.style.display = "flex";
  });
  downloadAllCancelBtn.addEventListener("click", () => (downloadAllOverlay.style.display = "none"));
  downloadProgressCloseBtn.addEventListener("click", () => (downloadAllOverlay.style.display = "none"));
  downloadAllOverlay.addEventListener("click", (e) => {
    if (e.target === downloadAllOverlay) downloadAllOverlay.style.display = "none";
  });

  downloadAllConfirmBtn.addEventListener("click", async () => {
    const mode = document.querySelector('input[name="dlAllMode"]:checked').value;
    const records = filteredSubmissions.slice();
    downloadChoiceView.style.display = "none";
    downloadProgressView.style.display = "block";
    downloadProgressFill.style.width = "0%";

    if (mode === "csv" || mode === "xlsx") {
      downloadProgressTitle.textContent = "Menyiapkan file\u2026";
      downloadProgressDesc.textContent = "Merangkum data " + records.length + " review jadi satu file " + (mode === "xlsx" ? "Excel" : "CSV") + ".";
      downloadProgressLabel.textContent = "";
      try {
        const { header, rows } = buildExportRows(records);
        downloadProgressFill.style.width = "100%";
        downloadProgressLabel.textContent = "Selesai";
        if (mode === "csv") {
          const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
          downloadBlob(blob, "Data-Review-Kinerja-" + todayStamp() + ".csv");
        } else {
          const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Data Review");
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const blob = new Blob([wbout], { type: "application/octet-stream" });
          downloadBlob(blob, "Data-Review-Kinerja-" + todayStamp() + ".xlsx");
        }
      } catch (err) {
        downloadProgressDesc.textContent = "Gagal membuat file " + (mode === "xlsx" ? "Excel" : "CSV") + ".";
      }
      return;
    }

    // mode === "zip": gabungkan laporan PDF + file lampiran asli tiap review
    // jadi satu file ZIP (satu folder per review).
    downloadProgressTitle.textContent = "Menyiapkan file\u2026";
    downloadProgressDesc.textContent = "Menggabungkan laporan & file lampiran tiap review jadi satu file ZIP.";
    try {
      const zip = new JSZip();
      const usedFolderNames = new Set();
      let failedFiles = 0;
      const totalUnits = records.reduce((sum, r) => sum + 1 + (r.files ? r.files.length : 0), 0); // 1 unit = laporan, +1 per lampiran
      let doneUnits = 0;

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const { doc, cleanName } = buildCandidatePdfDoc(r);

        let folderName = cleanName || ("review-" + (i + 1));
        let n = 2;
        while (usedFolderNames.has(folderName)) { folderName = cleanName + "-" + n; n++; }
        usedFolderNames.add(folderName);
        const folder = zip.folder(folderName);

        folder.file("Laporan-Review-" + cleanName + ".pdf", doc.output("blob"));
        doneUnits++;
        downloadProgressLabel.textContent = "Review " + (i + 1) + "/" + records.length + " \u2014 laporan dibuat";
        downloadProgressFill.style.width = Math.round((doneUnits / totalUnits) * 100) + "%";

        const usedFileNames = new Set(["Laporan-Review-" + cleanName + ".pdf"]);
        for (const f of (r.files || [])) {
          downloadProgressLabel.textContent = "Review " + (i + 1) + "/" + records.length + " \u2014 mengunduh " + f.filename;
          try {
            const res = await authedFetch("/.netlify/functions/admin-file?key=" + encodeURIComponent(f.key));
            const blob = await res.blob();
            let fname = f.filename || "lampiran.pdf";
            let n2 = 2;
            while (usedFileNames.has(fname)) {
              const dot = f.filename.lastIndexOf(".");
              fname = dot > -1 ? f.filename.slice(0, dot) + "-" + n2 + f.filename.slice(dot) : f.filename + "-" + n2;
              n2++;
            }
            usedFileNames.add(fname);
            folder.file(fname, blob);
          } catch (fileErr) {
            failedFiles++;
          }
          doneUnits++;
          downloadProgressFill.style.width = Math.round((doneUnits / totalUnits) * 100) + "%";
        }
      }

      downloadProgressLabel.textContent = "Membungkus ZIP\u2026";
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadProgressLabel.textContent = "Selesai \u2014 " + records.length + " review digabung"
        + (failedFiles ? " (" + failedFiles + " lampiran gagal diunduh, dilewati)" : "");
      downloadBlob(zipBlob, "Data-Review-Kinerja-" + todayStamp() + ".zip");
    } catch (err) {
      downloadProgressDesc.textContent = "Gagal membuat file ZIP. Coba lagi, atau unduh laporan satu-satu lewat tombol \u201cLihat Detail\u201d.";
    }
  });

  // Kolom ekspor: semua pertanyaan sederhana (bukan grup berulang/tanda
  // tangan) dijadikan kolom apa adanya, supaya CSV/Excel-nya lengkap dan
  // tetap mengikuti perubahan pertanyaan lewat Kelola Formulir.
  function buildExportRows(records) {
    const simpleQuestions = questions.filter((q) => q.type !== "repeater" && q.type !== "signature");
    const header = ["ID Review", "Terakhir Disimpan", "Status"].concat(simpleQuestions.map((q) => q.label));
    const rows = records.map((r) => {
      const a = r.answers || {};
      const base = [r.id, recordTimeLabel(r), STATUS_LABELS[recordStatus(r)]];
      const rest = simpleQuestions.map((q) => {
        const v = a[q.id];
        if (q.type === "checkbox") return v ? "Ya" : "Tidak";
        return v == null ? "" : String(v);
      });
      return base.concat(rest);
    });
    return { header, rows };
  }

  function labelForQuestionId(id) {
    const q = questions.find((qq) => qq.id === id);
    return q ? q.label : id;
  }

  // ---------- Pencarian jawaban "penting" (nama karyawan/atasan/departemen/nilai)
  // yang tahan terhadap perubahan ID pertanyaan lewat Kelola Formulir. ----------
  // Prioritas: (1) ID persis seperti default config, (2) cari pertanyaan
  // top-level (bukan dalam repeater) yang label-nya mengandung salah satu
  // kata kunci.
  const KEY_FIELD_KEYWORDS = {
    nama_karyawan: ["nama karyawan", "nama yang dinilai", "nama pegawai"],
    nama_atasan: ["nama atasan", "nama penilai"],
    departemen: ["department", "departemen", "bagian"],
    periode_review: ["periode"],
    nilai_bsc: ["nilai raport bsc", "nilai bsc", "skor"],
  };

  function guessKeyFieldId(defaultId) {
    const exact = questions.find((q) => q.id === defaultId && q.type !== "repeater");
    if (exact) return exact.id;
    const keywords = KEY_FIELD_KEYWORDS[defaultId] || [];
    for (const kw of keywords) {
      const found = questions.find((q) => q.type !== "repeater" && (q.label || "").toLowerCase().includes(kw));
      if (found) return found.id;
    }
    return null;
  }

  function keyFieldIds() {
    return {
      namaId: guessKeyFieldId("nama_karyawan"),
      atasanId: guessKeyFieldId("nama_atasan"),
      departemenId: guessKeyFieldId("departemen"),
      periodeId: guessKeyFieldId("periode_review"),
      nilaiId: guessKeyFieldId("nilai_bsc"),
    };
  }

  function candidateName(record, ids) {
    ids = ids || keyFieldIds();
    const a = record.answers || {};
    return (ids.namaId && a[ids.namaId]) || record.id;
  }

  function recordStatus(r) {
    return r.status === "final" ? "final" : "draft";
  }

  function recordTimeLabel(r) {
    const iso = r.submittedAt || r.updatedAt || r.createdAt;
    return iso ? new Date(iso).toLocaleString("id-ID") : "\u2014";
  }

  function renderSubmissions(records) {
    lastSubmissions = records || [];
    subToolbar.style.display = lastSubmissions.length ? "flex" : "none";
    applySubmissionFilter();
  }

  // Dipanggil ulang tiap kali kotak pencarian berubah, atau setelah data
  // dimuat/dihapus, supaya tabel & tombol Download Semua Data selalu
  // mengikuti hasil pencarian yang sedang aktif.
  function applySubmissionFilter() {
    const q = (subSearchInput.value || "").trim().toLowerCase();
    const statusFilter = subStatusFilter.value || "";
    const ids = keyFieldIds();
    filteredSubmissions = lastSubmissions.filter((r) => {
      if (statusFilter && recordStatus(r) !== statusFilter) return false;
      if (!q) return true;
      const name = String(candidateName(r, ids) || "");
      return name.toLowerCase().includes(q);
    });

    subSearchClear.classList.toggle("show", !!q);
    if (lastSubmissions.length) {
      subResultCount.style.display = "block";
      subResultCount.textContent = filteredSubmissions.length + " review" + (q ? ' ditemukan untuk "' + subSearchInput.value.trim() + '"' : "");
    } else {
      subResultCount.style.display = "none";
    }
    downloadAllBtn.disabled = filteredSubmissions.length === 0;

    renderSubmissionsTable(filteredSubmissions, ids, q);
  }

  function highlightMatch(text, q) {
    const str = escapeHtml(String(text));
    if (!q) return str;
    const idx = str.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return str;
    return str.slice(0, idx) + "<mark>" + str.slice(idx, idx + q.length) + "</mark>" + str.slice(idx + q.length);
  }

  function renderSubmissionsTable(records, ids, searchQuery) {
    if (!records.length) {
      submissionsContainer.innerHTML = lastSubmissions.length
        ? '<div class="empty-state">Nggak ada review yang cocok dengan pencarian ini.</div>'
        : '<div class="empty-state">Belum ada data review yang masuk.</div>';
      return;
    }
    const table = document.createElement("table");
    table.className = "sub-table";
    table.innerHTML = '<thead><tr><th>Terakhir Disimpan</th><th>Nama Karyawan</th><th>Atasan / Departemen</th><th>Nilai BSC</th><th>File</th><th>Status</th><th></th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector("tbody");

    records.forEach((r) => {
      const tr = document.createElement("tr");
      const a = r.answers || {};

      const tdTime = document.createElement("td");
      tdTime.dataset.label = "Terakhir Disimpan";
      tdTime.innerHTML = '<span class="badge">' + recordTimeLabel(r) + '</span>';
      tr.appendChild(tdTime);

      const tdName = document.createElement("td");
      tdName.dataset.label = "Nama Karyawan";
      tdName.innerHTML = highlightMatch((ids.namaId && a[ids.namaId]) || "\u2014", searchQuery);
      tr.appendChild(tdName);

      const tdAtasan = document.createElement("td");
      tdAtasan.dataset.label = "Atasan / Departemen";
      tdAtasan.innerHTML = [ids.atasanId && a[ids.atasanId], ids.departemenId && a[ids.departemenId]].filter(Boolean).map(escapeHtml).join("<br>") || "\u2014";
      tr.appendChild(tdAtasan);

      const tdNilai = document.createElement("td");
      tdNilai.dataset.label = "Nilai BSC";
      tdNilai.textContent = (ids.nilaiId && a[ids.nilaiId]) || "\u2014";
      tr.appendChild(tdNilai);

      const tdFiles = document.createElement("td");
      tdFiles.dataset.label = "File";
      tdFiles.textContent = (r.files && r.files.length) ? (r.files.length + " file") : "\u2014";
      tr.appendChild(tdFiles);

      const tdStatus = document.createElement("td");
      tdStatus.dataset.label = "Status";
      const st = recordStatus(r);
      const badge = document.createElement("span");
      badge.className = "status-select " + (STATUS_CLASSES[st] || "status-diproses");
      badge.style.cursor = "default";
      badge.style.display = "inline-block";
      badge.textContent = STATUS_LABELS[st];
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      const tdActions = document.createElement("td");
      tdActions.dataset.label = "";
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-ghost";
      viewBtn.textContent = "Lihat Detail";
      viewBtn.style.marginRight = "6px";
      viewBtn.addEventListener("click", () => openDetail(r));
      tdActions.appendChild(viewBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "Hapus";
      delBtn.addEventListener("click", () => deleteSubmission(r.id));
      tdActions.appendChild(delBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });

    submissionsContainer.innerHTML = "";
    submissionsContainer.appendChild(table);
  }

  async function downloadFile(key, filename) {
    try {
      const res = await authedFetch("/.netlify/functions/admin-file?key=" + encodeURIComponent(key));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      subAlert.innerHTML = '<div class="msg msg-err">Gagal mengunduh file.</div>';
    }
  }

  async function deleteSubmission(id) {
    if (!confirm("Hapus data review ini beserta file yang diupload? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      await authedFetch("/.netlify/functions/admin-submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      });
      loadSubmissions();
    } catch (e) {
      subAlert.innerHTML = '<div class="msg msg-err">Gagal menghapus data.</div>';
    }
  }

  // ---------- Detail overlay (laporan per-review) ----------
  function findFile(record, questionId, rowIndex, subFieldId) {
    return (record.files || []).find((f) =>
      f.questionId === questionId &&
      (f.rowIndex === undefined || f.rowIndex === null ? (rowIndex === undefined || rowIndex === null) : f.rowIndex === rowIndex) &&
      (f.subFieldId || null) === (subFieldId || null)
    );
  }

  function openDetail(record) {
    currentDetailRecord = record;
    const a = record.answers || {};
    detailTitle.textContent = "Detail Review \u2014 " + candidateName(record);

    let html = '<div class="report-meta">Terakhir disimpan: ' + recordTimeLabel(record) + '</div>';
    html += '<div class="report-meta">Status: <span class="status-select ' + (STATUS_CLASSES[recordStatus(record)] || "status-diproses") + '" style="cursor:default; display:inline-block;">' + escapeHtml(STATUS_LABELS[recordStatus(record)]) + '</span></div>';

    sections.forEach((sec) => {
      const secQuestions = questions.filter((q) => (q.section || sections[0].id) === sec.id);
      if (!secQuestions.length) return;
      html += '<div class="report-section"><h3>' + escapeHtml(sec.title) + '</h3><div class="report-rows">';

      secQuestions.forEach((q) => {
        if (q.type === "repeater") {
          const rows = Array.isArray(a[q.id]) ? a[q.id] : [];
          html += '<div class="report-row"><div class="report-label">' + escapeHtml(q.label) + '</div><div class="report-value">';
          if (!rows.length) {
            html += '\u2014';
          } else {
            rows.forEach((row, idx) => {
              html += '<div class="report-repeater-row"><div class="report-repeater-tag">' + escapeHtml((q.itemLabel || "Baris") + " " + (idx + 1)) + '</div>';
              (q.fields || []).forEach((sub) => {
                let val = row[sub.id];
                if (sub.type === "file") {
                  const f = findFile(record, q.id, idx, sub.id);
                  html += '<div><strong>' + escapeHtml(sub.label) + ':</strong> ';
                  if (f) html += '<a href="#" class="file-link" data-key="' + escapeHtml(f.key) + '" data-filename="' + escapeHtml(f.filename) + '">' + escapeHtml(f.filename) + '</a>';
                  else html += '\u2014';
                  html += '</div>';
                } else {
                  html += '<div><strong>' + escapeHtml(sub.label) + ':</strong> ' + escapeHtml(val || "\u2014") + '</div>';
                }
              });
              html += '</div>';
            });
          }
          html += '</div></div>';
        } else if (q.type === "file") {
          const f = findFile(record, q.id, null, null);
          html += '<div class="report-row"><div class="report-label">' + escapeHtml(q.label) + '</div><div class="report-value">';
          html += f ? '<a href="#" class="file-link" data-key="' + escapeHtml(f.key) + '" data-filename="' + escapeHtml(f.filename) + '">' + escapeHtml(f.filename) + '</a>' : '\u2014';
          html += '</div></div>';
        } else if (q.type === "signature") {
          const val = a[q.id];
          html += '<div class="report-row"><div class="report-label">' + escapeHtml(q.label) + '</div><div class="report-value">';
          html += val ? '<img src="' + val + '" alt="Tanda tangan" style="max-width:220px; border:1px solid var(--paper-line); border-radius:6px;">' : '\u2014';
          html += '</div></div>';
        } else if (q.type === "checkbox") {
          html += '<div class="report-row"><div class="report-label">' + escapeHtml(q.label) + '</div><div class="report-value">' + (a[q.id] ? "Ya (Setuju)" : "Tidak") + '</div></div>';
        } else {
          html += '<div class="report-row"><div class="report-label">' + escapeHtml(q.label) + '</div><div class="report-value">' + escapeHtml(a[q.id] || "\u2014") + '</div></div>';
        }
      });

      html += '</div></div>';
    });

    detailBody.innerHTML = html;
    detailBody.querySelectorAll(".file-link").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        downloadFile(el.dataset.key, el.dataset.filename);
      });
    });
    detailOverlay.style.display = "flex";
  }

  detailCloseBtn.addEventListener("click", () => { detailOverlay.style.display = "none"; });
  detailOverlay.addEventListener("click", (e) => { if (e.target === detailOverlay) detailOverlay.style.display = "none"; });

  detailPdfBtn.addEventListener("click", () => {
    if (currentDetailRecord) downloadCandidatePDF(currentDetailRecord);
  });

  // ---------- Export PDF (tabel label/jawaban rapi, gaya sama seperti laporan di Panel Admin) ----------
  // buildCandidatePdfDoc mengembalikan objek jsPDF (belum di-save), supaya bisa
  // dipakai ulang baik untuk download satu laporan maupun untuk digabung jadi ZIP
  // di fitur "Download Semua Data".
  function buildCandidatePdfDoc(record) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const usableWidth = pageWidth - marginX * 2;
      const labelW = usableWidth * 0.36;
      const gapW = 10;
      const lineH = 12.5;
      let y = 50;
      const a = record.answers || {};

      const NAVY = [11, 31, 59];
      const INK = [28, 31, 38];
      const SOFT = [91, 98, 112];
      const LINE = [224, 224, 224];
      const BOX_BG = [247, 245, 238];
      const BOX_BORDER = [222, 216, 201];

      function ensureSpace(next) {
        if (y + next > pageHeight - 40) { doc.addPage(); y = 50; }
      }

      function ensureBlock(estimatedHeight) {
  const maxPerPage = pageHeight - 50 - 40;
  const capped = Math.min(estimatedHeight, maxPerPage);
  ensureSpace(capped);
}

      // Font standar jsPDF (Helvetica) cuma support karakter Latin dasar (WinAnsi).
      // Kalau ada 1 karakter aneh (bullet dari paste Word, simbol PUA, emoji, dst)
      // nyempil di satu baris teks, jsPDF bisa salah hitung lebar & render tiap
      // huruf jadi renggang serta meluber keluar kolom/halaman ("offside").
      // Fungsi ini membersihkan teks sebelum dikirim ke jsPDF, tanpa mengubah makna isinya.
      function sanitizePdfText(input) {
        if (input == null) return input;
        let s = String(input);

        // Normalisasi karakter "smart" dari Word ke padanan ASCII yang aman
        s = s
          .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
          .replace(/[\u2010\u2011\u2012\u2013\u2015]/g, "-")
          .replace(/\u2014/g, "--")
          .replace(/\u2026/g, "...")
          .replace(/\u00A0/g, " ")
          // Berbagai varian bullet (termasuk simbol private-use area dari font Wingdings/Symbol)
          .replace(/[\u2022\u2023\u25CF\u25AA\u25E6\u25A0\u25CB\u2043\u204C\u204D\u2219\uF0B7\uF0A7\uF06C\uF0D8]/g, "-");

        // Buang karakter kontrol, surrogate pair (emoji, dsb), dan Private Use Area
        s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
        s = s.replace(/[\uD800-\uDFFF]/g, "");
        s = s.replace(/[\uE000-\uF8FF]/g, "");

        // Jaring pengaman terakhir: hanya loloskan karakter yang pasti didukung
        // font standar Helvetica (ASCII cetak + Latin-1 supplement), sisanya dibuang.
        s = s.replace(/[^\t\n\r\x20-\x7E\u00A1-\u00FF]/g, "");

        // Rapikan spasi ganda yang mungkin muncul akibat karakter yang dibuang
        s = s.replace(/[ \t]{2,}/g, " ").trim();

        // Pecah kata yang sangat panjang tanpa spasi (URL/nomor panjang) supaya
        // tetap bisa di-wrap dan tidak meluber keluar kolom
        s = s.replace(/\S{40,}/g, (word) => word.replace(/(.{40})/g, "$1\u200B "));

        return s;
      }

      function wrap(text, width, size, bold) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const clean = sanitizePdfText(text);
        return doc.splitTextToSize(String(clean == null || clean === "" ? "\u2014" : clean), width);
      }

      // Satu baris tabel: label (kiri, bold, navy) + jawaban (kanan), dengan garis pemisah tipis.
      function kvRow(label, value, opts) {
        opts = opts || {};
        const indent = opts.indent || 0;
        const lw = labelW - indent;
        const vw = usableWidth - labelW - gapW - indent;
        const labelLines = wrap(label, lw, 9.5, true);
        const valueLines = wrap(value, vw, 9.5, false);
        const rows = Math.max(labelLines.length, valueLines.length);
        const padY = 7;
        const rowH = rows * lineH + padY * 2;
        ensureSpace(rowH);
        const top = y + padY + 8;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        labelLines.forEach((ln, i) => doc.text(ln, marginX + indent, top + i * lineH));

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        valueLines.forEach((ln, i) => doc.text(ln, marginX + indent + labelW, top + i * lineH));

        y += rowH;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        doc.setLineWidth(0.6);
        doc.line(marginX + indent, y, marginX + usableWidth, y);
      }

      function sigRow(label, dataUrl) {
        const padY = 8;
        const boxH = 46;
        ensureSpace(boxH + padY * 2);
        const top = y + padY;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(sanitizePdfText(label), marginX, top + 10);
        if (dataUrl) {
          try { doc.addImage(dataUrl, "PNG", marginX + labelW, top - 4, 140, 40); } catch (e) {}
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
          doc.text("\u2014", marginX + labelW, top + 10);
        }
        y += boxH + padY;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        doc.setLineWidth(0.6);
        doc.line(marginX, y, marginX + usableWidth, y);
      }

     // Hitung tinggi kotak abu untuk satu baris repeater (dipakai buat pra-ukur & saat gambar).
      function measureBoxHeight(q, row, idx) {
        const indent = 12;
        const innerLabelW = labelW - indent - 14;
        const innerValueW = usableWidth - labelW - gapW - indent * 2 - 14;
        const fieldLines = (q.fields || []).map((sub) => {
          const val = sub.type === "file"
            ? (function () { const f = findFile(record, q.id, idx, sub.id); return f ? f.filename + " (unduh manual di Panel Admin)" : "\u2014"; })()
            : (row[sub.id] || "\u2014");
          const ll = wrap(sub.label, innerLabelW, 9, true);
          const vl = wrap(val, innerValueW, 9, false);
          return { sub: sub, val: val, rows: Math.max(ll.length, vl.length) };
        });
        const tagH = 18;
        const rowPad = 5;
        const contentH = fieldLines.reduce((sum, f) => sum + f.rows * 11.5 + rowPad * 2, 0);
        return { fieldLines: fieldLines, boxH: tagH + contentH + 10 };
      }

      // Kelompok berulang (Referensi, Riwayat Kerja, dst): dibungkus kotak abu, tiap baris jadi mini-tabel di dalamnya.
      function repeaterGroup(q, rows) {
        const firstBoxH = rows.length ? measureBoxHeight(q, rows[0], 0).boxH : 0;
        ensureBlock(20 + firstBoxH + 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(sanitizePdfText(q.label), marginX, y + 14);
        y += 20;

        if (!rows.length) {
          kvRow("\u2014", "", { indent: 12 });
          return;
        }

        rows.forEach((row, idx) => {
          const indent = 12;
          const innerLabelW = labelW - indent - 14;
          const innerValueW = usableWidth - labelW - gapW - indent * 2 - 14;

          const measured = measureBoxHeight(q, row, idx);
          const fieldLines = measured.fieldLines;
          const boxH = measured.boxH;

          ensureBlock(boxH + 8);
          const boxTop = y;
          doc.setFillColor(BOX_BG[0], BOX_BG[1], BOX_BG[2]);
          doc.setDrawColor(BOX_BORDER[0], BOX_BORDER[1], BOX_BORDER[2]);
          doc.setLineWidth(0.7);
          doc.roundedRect(marginX, boxTop, usableWidth, boxH, 4, 4, "FD");

          let iy = boxTop + 18;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(201, 162, 39);
          doc.text(sanitizePdfText(String(q.itemLabel || "Baris").toUpperCase() + " " + (idx + 1)), marginX + 12, boxTop + 12);

          fieldLines.forEach((f) => {
            const rh = f.rows * 11.5 + 5 * 2;
            const ll = wrap(f.sub.label, innerLabelW, 9, true);
            const vl = wrap(f.val, innerValueW, 9, false);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
            ll.forEach((ln, i) => doc.text(ln, marginX + indent, iy + 5 + 8 + i * 11.5));
            doc.setFont("helvetica", "normal");
            doc.setTextColor(INK[0], INK[1], INK[2]);
            vl.forEach((ln, i) => doc.text(ln, marginX + indent + innerLabelW + 14, iy + 5 + 8 + i * 11.5));
            iy += rh;
          });

          y = boxTop + boxH + 8;
        });
      }
      // ---- Header laporan ----
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text("Laporan Review Kinerja One-on-One", marginX, y);
      y += 8;
      doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.setLineWidth(1.4);
      doc.line(marginX, y, marginX + usableWidth, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.text("Dikirim: " + new Date(record.submittedAt).toLocaleString("id-ID"), marginX, y);
      y += 20;

      sections.forEach((sec) => {
        const secQuestions = questions.filter((q) => (q.section || sections[0].id) === sec.id);
        if (!secQuestions.length) return;

        ensureSpace(30 + 40);
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text(sanitizePdfText(sec.title.toUpperCase()), marginX, y);
        y += 7;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        doc.setLineWidth(0.8);
        doc.line(marginX, y, marginX + usableWidth, y);
        y += 14;

        secQuestions.forEach((q) => {
          if (q.type === "repeater") {
            repeaterGroup(q, Array.isArray(a[q.id]) ? a[q.id] : []);
          } else if (q.type === "file") {
            const f = findFile(record, q.id, null, null);
            kvRow(q.label, f ? f.filename + " (unduh manual di Panel Admin)" : "\u2014");
          } else if (q.type === "signature") {
            sigRow(q.label, a[q.id]);
          } else if (q.type === "checkbox") {
            kvRow(q.label, a[q.id] ? "Ya (Setuju)" : "Tidak");
          } else {
            kvRow(q.label, a[q.id]);
          }
        });
        y += 10;
      });

      if (record.files && record.files.length) {
       ensureBlock(30 + 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.text("LAMPIRAN FILE (unduh satu per satu dari Panel Admin, lalu satukan manual)", marginX, y);
        y += 8;
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        doc.line(marginX, y, marginX + usableWidth, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        record.files.forEach((f) => {
          ensureSpace(14);
          doc.text("\u2022 " + sanitizePdfText(f.filename), marginX + 4, y);
          y += 14;
        });
      }

      const cleanName = String(candidateName(record)).replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
      return { doc, cleanName };
  }

  async function downloadCandidatePDF(record) {
    try {
      const { doc, cleanName } = buildCandidatePdfDoc(record);
      doc.save("Laporan-Review-" + cleanName + ".pdf");
    } catch (err) {
      subAlert.innerHTML = '<div class="msg msg-err">Gagal membuat PDF laporan.</div>';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ================= CONFIG: SECTIONS + QUESTIONS =================
  async function loadConfig() {
    try {
      const res = await authedFetch("/.netlify/functions/admin-questions");
      const data = await res.json();
      sections = (data && data.sections && data.sections.length) ? data.sections : [{ id: "umum", title: "Umum" }];
      questions = (data && data.questions) || [];
      renderSections();
      renderQuestions();
    } catch (e) {
      if (e.message !== "Unauthorized") questionsList.innerHTML = '<p class="hint">Gagal memuat konfigurasi formulir.</p>';
    }
  }

  function slugify(text, existingIds) {
    let base = (text || "bagian").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "bagian";
    let id = base;
    let n = 1;
    while (existingIds.includes(id)) { id = base + "-" + (++n); }
    return id;
  }

  function renderSections() {
    sectionsList.innerHTML = "";
    sections.forEach((sec, idx) => {
      const row = document.createElement("div");
      row.className = "sec-row";

      const order = document.createElement("div");
      order.className = "q-order";
      const upBtn = document.createElement("button");
      upBtn.type = "button"; upBtn.textContent = "\u25B2"; upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => { moveSection(idx, -1); });
      const downBtn = document.createElement("button");
      downBtn.type = "button"; downBtn.textContent = "\u25BC"; downBtn.disabled = idx === sections.length - 1;
      downBtn.addEventListener("click", () => { moveSection(idx, 1); });
      order.appendChild(upBtn); order.appendChild(downBtn);
      row.appendChild(order);

      const main = document.createElement("div");
      main.className = "q-main";
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = "Judul bagian";
      titleInput.value = sec.title || "";
      titleInput.addEventListener("input", () => { sec.title = titleInput.value; renderQuestions(); });
      main.appendChild(titleInput);

      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.placeholder = "Deskripsi singkat bagian ini (opsional)";
      descInput.value = sec.description || "";
      descInput.style.cssText = "margin-top:6px; padding:8px 10px; font-size:13px; border:1px solid #cfd3dc; border-radius:6px; width:100%; font-family:var(--font-body);";
      descInput.addEventListener("input", () => { sec.description = descInput.value; });
      main.appendChild(descInput);

      row.appendChild(main);

      const actions = document.createElement("div");
      actions.className = "q-actions";
      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.className = "btn btn-danger"; delBtn.textContent = "Hapus";
      delBtn.addEventListener("click", () => removeSection(idx));
      actions.appendChild(delBtn);
      row.appendChild(actions);

      sectionsList.appendChild(row);
    });
  }

  function moveSection(idx, dir) {
    const t = idx + dir;
    if (t < 0 || t >= sections.length) return;
    const tmp = sections[idx]; sections[idx] = sections[t]; sections[t] = tmp;
    renderSections(); renderQuestions();
  }

  function removeSection(idx) {
    if (sections.length <= 1) { qAlert.innerHTML = '<div class="msg msg-err">Minimal harus ada 1 bagian.</div>'; return; }
    const sec = sections[idx];
    const usedBy = questions.filter((q) => q.section === sec.id).length;
    if (usedBy > 0 && !confirm('Bagian "' + sec.title + '" masih dipakai oleh ' + usedBy + ' pertanyaan. Pertanyaan itu akan dipindah ke bagian pertama. Lanjutkan?')) return;
    questions.forEach((q) => { if (q.section === sec.id) q.section = sections[0].id === sec.id ? (sections[1] && sections[1].id) : sections[0].id; });
    sections.splice(idx, 1);
    renderSections(); renderQuestions();
  }

  addSectionBtn.addEventListener("click", () => {
    const id = slugify("bagian-baru-" + Date.now().toString(36), sections.map((s) => s.id));
    sections.push({ id: id, title: "Bagian Baru", description: "" });
    renderSections(); renderQuestions();
  });

  function renderQuestions() {
    questionsList.innerHTML = "";
    questions.forEach((q, idx) => {
      questionsList.appendChild(buildQuestionRow(q, idx));
    });
  }

  function buildQuestionRow(q, idx) {
    const row = document.createElement("div");
    row.className = "q-row";

    const order = document.createElement("div");
    order.className = "q-order";
    const upBtn = document.createElement("button");
    upBtn.type = "button"; upBtn.textContent = "\u25B2"; upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => moveQuestion(idx, -1));
    const downBtn = document.createElement("button");
    downBtn.type = "button"; downBtn.textContent = "\u25BC"; downBtn.disabled = idx === questions.length - 1;
    downBtn.addEventListener("click", () => moveQuestion(idx, 1));
    order.appendChild(upBtn); order.appendChild(downBtn);
    row.appendChild(order);

    const main = document.createElement("div");
    main.className = "q-main";

    const topRow = document.createElement("div");
    topRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Teks pertanyaan";
    labelInput.value = q.label || "";
    labelInput.style.flex = "2";
    labelInput.style.minWidth = "220px";
    labelInput.addEventListener("input", () => (q.label = labelInput.value));
    topRow.appendChild(labelInput);

    const sectionSelect = document.createElement("select");
    sectionSelect.style.flex = "1";
    sectionSelect.style.minWidth = "150px";
    sections.forEach((sec) => {
      const o = document.createElement("option");
      o.value = sec.id; o.textContent = sec.title;
      if ((q.section || sections[0].id) === sec.id) o.selected = true;
      sectionSelect.appendChild(o);
    });
    sectionSelect.addEventListener("change", () => (q.section = sectionSelect.value));
    topRow.appendChild(sectionSelect);

    main.appendChild(topRow);

    const descInput = document.createElement("textarea");
    descInput.placeholder = "Deskripsi/keterangan (opsional)";
    descInput.value = q.description || "";
    descInput.rows = 1;
    descInput.style.cssText = "margin-top:6px; padding:8px 10px; font-size:13px; border:1px solid #cfd3dc; border-radius:6px; width:100%; font-family:var(--font-body); resize:vertical;";
    descInput.addEventListener("input", () => (q.description = descInput.value));
    main.appendChild(descInput);

    const optionsInput = document.createElement("input");
    optionsInput.type = "text";
    optionsInput.placeholder = "Pilihan, pisahkan dengan koma (khusus Dropdown/Radio)";
    optionsInput.value = (q.options || []).join(", ");
    optionsInput.style.cssText = "margin-top:6px; padding:8px 10px; font-size:13px; border:1px solid #cfd3dc; border-radius:6px; width:100%; font-family:var(--font-body); display:" + ((q.type === "select" || q.type === "radio") ? "block" : "none") + ";";
    optionsInput.addEventListener("input", () => {
      q.options = optionsInput.value.split(",").map((s) => s.trim()).filter(Boolean);
    });
    main.appendChild(optionsInput);

    const subFieldsWrap = document.createElement("div");
    subFieldsWrap.className = "subfields-wrap";
    subFieldsWrap.style.display = q.type === "repeater" ? "block" : "none";
    if (!Array.isArray(q.fields)) q.fields = [];
    renderSubFields(subFieldsWrap, q);
    main.appendChild(subFieldsWrap);

    const meta = document.createElement("div");
    meta.className = "q-meta";

    const typeSelect = document.createElement("select");
    Object.entries(TYPE_LABELS).forEach(([val, label]) => {
      const o = document.createElement("option");
      o.value = val; o.textContent = label;
      if (q.type === val) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeSelect.addEventListener("change", () => {
      q.type = typeSelect.value;
      optionsInput.style.display = (q.type === "select" || q.type === "radio") ? "block" : "none";
      subFieldsWrap.style.display = q.type === "repeater" ? "block" : "none";
      if (q.type === "repeater" && !Array.isArray(q.fields)) { q.fields = []; renderSubFields(subFieldsWrap, q); }
    });
    meta.appendChild(typeSelect);

    const reqLabel = document.createElement("label");
    const reqCheck = document.createElement("input");
    reqCheck.type = "checkbox";
    reqCheck.checked = !!q.required;
    reqCheck.addEventListener("change", () => (q.required = reqCheck.checked));
    reqLabel.appendChild(reqCheck);
    reqLabel.appendChild(document.createTextNode("Wajib diisi"));
    meta.appendChild(reqLabel);

    main.appendChild(meta);
    row.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "q-actions";
    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "btn btn-danger"; delBtn.textContent = "Hapus";
    delBtn.addEventListener("click", () => removeQuestion(idx));
    actions.appendChild(delBtn);
    row.appendChild(actions);

    return row;
  }

  function renderSubFields(wrap, q) {
    wrap.innerHTML = '<div class="hint" style="margin:8px 0 6px;">Kolom di dalam setiap baris grup ini:</div>';
    q.fields.forEach((sub, sIdx) => {
      const subRow = document.createElement("div");
      subRow.className = "subfield-row";

      const subOrder = document.createElement("div");
      subOrder.style.cssText = "display:flex; flex-direction:column; gap:1px;";
      const subUpBtn = document.createElement("button");
      subUpBtn.type = "button";
      subUpBtn.textContent = "\u25B2";
      subUpBtn.disabled = sIdx === 0;
      subUpBtn.style.cssText = "padding:2px 7px; font-size:10px; line-height:1; border:1px solid #cfd3dc; border-radius:4px; background:#fff; cursor:pointer;";
      subUpBtn.addEventListener("click", () => moveSubField(wrap, q, sIdx, -1));
      const subDownBtn = document.createElement("button");
      subDownBtn.type = "button";
      subDownBtn.textContent = "\u25BC";
      subDownBtn.disabled = sIdx === q.fields.length - 1;
      subDownBtn.style.cssText = "padding:2px 7px; font-size:10px; line-height:1; border:1px solid #cfd3dc; border-radius:4px; background:#fff; cursor:pointer;";
      subDownBtn.addEventListener("click", () => moveSubField(wrap, q, sIdx, 1));
      subOrder.appendChild(subUpBtn);
      subOrder.appendChild(subDownBtn);
      subRow.appendChild(subOrder);

      const subLabel = document.createElement("input");
      subLabel.type = "text";
      subLabel.placeholder = "Label kolom";
      subLabel.value = sub.label || "";
      subLabel.addEventListener("input", () => (sub.label = subLabel.value));
      subRow.appendChild(subLabel);

      const subType = document.createElement("select");
      Object.entries(SUB_TYPE_LABELS).forEach(([val, label]) => {
        const o = document.createElement("option");
        o.value = val; o.textContent = label;
        if (sub.type === val) o.selected = true;
        subType.appendChild(o);
      });
      subType.addEventListener("change", () => {
        sub.type = subType.value;
        subOptions.style.display = (sub.type === "select" || sub.type === "radio") ? "inline-block" : "none";
      });
      subRow.appendChild(subType);

      const subOptions = document.createElement("input");
      subOptions.type = "text";
      subOptions.placeholder = "Pilihan (koma)";
      subOptions.value = (sub.options || []).join(", ");
      subOptions.style.display = (sub.type === "select" || sub.type === "radio") ? "inline-block" : "none";
      subOptions.addEventListener("input", () => {
        sub.options = subOptions.value.split(",").map((s) => s.trim()).filter(Boolean);
      });
      subRow.appendChild(subOptions);

      const subReqLabel = document.createElement("label");
      subReqLabel.style.cssText = "display:flex; align-items:center; gap:4px; font-size:12.5px; white-space:nowrap;";
      const subReq = document.createElement("input");
      subReq.type = "checkbox";
      subReq.checked = !!sub.required;
      subReq.addEventListener("change", () => (sub.required = subReq.checked));
      subReqLabel.appendChild(subReq);
      subReqLabel.appendChild(document.createTextNode("Wajib"));
      subRow.appendChild(subReqLabel);

      const subDel = document.createElement("button");
      subDel.type = "button";
      subDel.className = "btn btn-danger";
      subDel.textContent = "\u2715";
      subDel.style.cssText = "padding:6px 9px;";
      subDel.addEventListener("click", () => {
        q.fields.splice(sIdx, 1);
        renderSubFields(wrap, q);
      });
      subRow.appendChild(subDel);

      wrap.appendChild(subRow);
    });

    const addSubBtn = document.createElement("button");
    addSubBtn.type = "button";
    addSubBtn.className = "btn-add";
    addSubBtn.style.cssText = "margin-top:6px; padding:6px 12px; font-size:12.5px;";
    addSubBtn.textContent = "+ Tambah Kolom";
    addSubBtn.addEventListener("click", () => {
      q.fields.push({ id: "kolom_" + Date.now().toString(36), label: "Kolom Baru", type: "text" });
      renderSubFields(wrap, q);
    });
    wrap.appendChild(addSubBtn);
  }

  function moveQuestion(idx, dir) {
    const t = idx + dir;
    if (t < 0 || t >= questions.length) return;
    const tmp = questions[idx]; questions[idx] = questions[t]; questions[t] = tmp;
    renderQuestions();
  }

  function moveSubField(wrap, q, sIdx, dir) {
    const t = sIdx + dir;
    if (t < 0 || t >= q.fields.length) return;
    const tmp = q.fields[sIdx]; q.fields[sIdx] = q.fields[t]; q.fields[t] = tmp;
    renderSubFields(wrap, q);
  }

  function removeQuestion(idx) {
    if (questions.length <= 1) { qAlert.innerHTML = '<div class="msg msg-err">Minimal harus ada 1 pertanyaan.</div>'; return; }
    if (!confirm("Hapus pertanyaan ini dari formulir?")) return;
    questions.splice(idx, 1);
    renderQuestions();
  }

  addQuestionBtn.addEventListener("click", () => {
    const id = "q_" + Date.now().toString(36);
    questions.push({ id: id, label: "Pertanyaan Baru", type: "text", required: false, section: sections[0].id });
    renderQuestions();
  });

  saveQuestionsBtn.addEventListener("click", async () => {
    const emptySec = sections.find((s) => !s.title || !s.title.trim());
    if (emptySec) { qAlert.innerHTML = '<div class="msg msg-err">Semua bagian harus punya judul.</div>'; return; }
    const emptyLabel = questions.find((q) => !q.label || !q.label.trim());
    if (emptyLabel) { qAlert.innerHTML = '<div class="msg msg-err">Semua pertanyaan harus punya teks pertanyaan.</div>'; return; }

    // pastikan setiap section punya id (untuk section baru yang idnya belum di-slug)
    const usedIds = [];
    sections.forEach((s) => {
      if (!s.id) s.id = slugify(s.title, usedIds);
      usedIds.push(s.id);
    });

    saveQuestionsBtn.disabled = true;
    saveQuestionsBtn.textContent = "Menyimpan\u2026";
    try {
      const res = await authedFetch("/.netlify/functions/admin-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: sections, questions: questions }),
      });
      if (!res.ok) {
        let msg = "Gagal menyimpan (status " + res.status + ").";
        try { const errData = await res.json(); if (errData && errData.message) msg = errData.message; } catch (e) {}
        qAlert.innerHTML = '<div class="msg msg-err">' + msg + '</div>';
      } else {
        qAlert.innerHTML = '<div class="msg msg-ok">Perubahan tersimpan. Formulir review langsung ter-update.</div>';
      }
    } catch (e) {
      if (e.message !== "Unauthorized") qAlert.innerHTML = '<div class="msg msg-err">Gagal menyimpan perubahan (kemungkinan masalah jaringan).</div>';
    }
    saveQuestionsBtn.disabled = false;
    saveQuestionsBtn.textContent = "Simpan Perubahan";
  });

  // ---------- Init ----------
  if (getToken()) { showAdmin(); } else { showLogin(); }
})();
