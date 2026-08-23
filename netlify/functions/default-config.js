// Konfigurasi default formulir Review One-on-One Karyawan & Atasan (Tahunan).
// Dipakai kalau admin belum pernah menyimpan perubahan lewat Panel Admin.
// Begitu admin ubah & simpan lewat panel, konfigurasi tersimpan di Netlify
// Blobs dan itu yang jadi acuan seterusnya (fallback di bawah tidak dipakai lagi).
//
// Tipe field yang didukung:
//   text, email, tel, number, date, month, textarea, select, radio,
//   checkbox, file, signature, repeater
// "repeater" punya `fields[]` sendiri (sub-field), bisa tambah/hapus baris.

const DEFAULT_SECTIONS = [
  { id: "info", title: "Informasi Review", description: "Data karyawan, atasan/penilai, dan periode review." },
  { id: "penilaian", title: "Penilaian Kinerja", description: "Skor dan ringkasan pencapaian selama periode berjalan." },
  { id: "feedback", title: "Feedback & Rencana Pengembangan", description: "Masukan dari atasan dan komitmen perbaikan dari karyawan." },
  { id: "persetujuan", title: "Persetujuan", description: "Konfirmasi dan tanda tangan kedua belah pihak." },
];

const DEFAULT_QUESTIONS = [
  // ---------- Informasi Review ----------
  { id: "tanggal_review", section: "info", type: "date", label: "Tanggal Review", required: true },
  { id: "periode_review", section: "info", type: "text", label: "Periode Penilaian", description: "cth. Tahun 2025 - 2026 atau Semester 2 2025", required: true },
  { id: "nama_karyawan", section: "info", type: "text", label: "Nama Karyawan yang Dinilai", required: true },
  { id: "id_karyawan", section: "info", type: "text", label: "Nomor ID Karyawan", required: true },
  { id: "nama_atasan", section: "info", type: "text", label: "Nama Atasan / Penilai", required: true },
  { id: "perusahaan", section: "info", type: "text", label: "Perusahaan", required: true },
  { id: "lokasi", section: "info", type: "text", label: "Lokasi / Cabang" },
  { id: "departemen", section: "info", type: "text", label: "Department / Bagian" },
  { id: "jabatan", section: "info", type: "text", label: "Jabatan Saat Ini" },

  // ---------- Penilaian Kinerja ----------
  {
    id: "nilai_bsc", section: "penilaian", type: "select",
    label: "Nilai Raport BSC (Balanced Scorecard)",
    options: ["1", "2", "3", "4", "5"], required: true,
  },
  { id: "pencapaian_target", section: "penilaian", type: "textarea", label: "Ringkasan Pencapaian Target Selama Periode Ini" },
  { id: "kekuatan", section: "penilaian", type: "textarea", label: "Kekuatan / Hal Positif yang Menonjol" },
  { id: "area_pengembangan", section: "penilaian", type: "textarea", label: "Area yang Perlu Dikembangkan" },
  { id: "upload_pendukung", section: "penilaian", type: "file", label: "Upload Dokumen Pendukung (opsional)", description: "PDF, maksimal 2MB. cth. hasil KPI, notulen, dsb." },

  // ---------- Feedback & Rencana Pengembangan ----------
  { id: "feedback_penilai", section: "feedback", type: "textarea", label: "Masukan / Feedback dari Penilai (Atasan)", required: true },
  { id: "komitmen_karyawan", section: "feedback", type: "textarea", label: "Komitmen Perbaikan dan Peningkatan dari Karyawan yang Dinilai", required: true },
  { id: "usulan_training", section: "feedback", type: "text", label: "Usulan Training / Pengembangan" },
  { id: "rencana_karir", section: "feedback", type: "textarea", label: "Rencana Karir / Career Path ke Depan" },
  {
    id: "tindak_lanjut", section: "feedback", type: "repeater",
    label: "Rencana Tindak Lanjut", itemLabel: "Tindak Lanjut", addLabel: "+ Tambah Rencana Tindak Lanjut", minRows: 0,
    fields: [
      { id: "aksi", label: "Rencana Aksi", type: "text" },
      { id: "target_selesai", label: "Target Selesai", type: "month" },
      { id: "penanggung_jawab", label: "Penanggung Jawab", type: "text" },
    ],
  },

  // ---------- Persetujuan ----------
  { id: "pernyataan", section: "persetujuan", type: "checkbox", label: "Kedua belah pihak menyatakan hasil review ini telah didiskusikan bersama dan disetujui.", required: true },
  { id: "tanda_tangan_penilai", section: "persetujuan", type: "signature", label: "Tanda Tangan Penilai (Atasan)", required: true },
  { id: "tanda_tangan_karyawan", section: "persetujuan", type: "signature", label: "Tanda Tangan Karyawan yang Dinilai", required: true },
];

module.exports = { DEFAULT_SECTIONS, DEFAULT_QUESTIONS };
