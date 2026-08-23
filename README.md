# Form Review Kinerja One-on-One (Tahunan)

Form review kinerja antara karyawan & atasan (one-on-one, biasanya diisi tiap
akhir tahun), dengan pertanyaan yang bisa diedit lewat panel admin, tanda
tangan digital, upload dokumen pendukung, **simpan draft & lanjutkan lewat
link** (bisa dibuka dari perangkat manapun), dan export data ke **PDF**,
**CSV**, maupun **Excel (.xlsx)**.

Arsitektur & cara kerja mengikuti project form kandidat kamu sebelumnya
(Netlify Functions + Netlify Blobs) — tidak ada database terpisah yang perlu
disiapkan.

## Perubahan utama dari versi form kandidat

- **Pertanyaan default** diganti jadi struktur review kinerja: Informasi
  Review, Penilaian Kinerja (nilai BSC dkk), Feedback & Rencana Pengembangan,
  dan Persetujuan (2 tanda tangan: Penilai/Atasan & Karyawan). Semua tetap
  100% bisa diedit/ditambah/dihapus lewat tab **Kelola Formulir** di Panel
  Admin (termasuk tipe jawaban: Teks Bebas, Teks Panjang, Dropdown, Upload
  File, Tanda Tangan, Grup Berulang, dll).
- **Status lamaran & email notifikasi otomatis dihapus** sesuai kebutuhan —
  form ini murni untuk mengumpulkan data (seperti Google Form), bukan
  pipeline rekrutmen.
- **Simpan & Lanjutkan Nanti**: kalau pengisian belum selesai, klik tombol ini
  untuk dapat link unik. Buka link itu dari device manapun untuk melanjutkan
  persis dari jawaban terakhir (termasuk isian yang sudah ada, file yang
  sudah diupload, dan tanda tangan yang sudah dibubuhkan).
- **Export data**: di tab **Data Review**, tombol "Download Semua Data"
  sekarang punya 3 pilihan — CSV, Excel (.xlsx), atau ZIP (laporan PDF +
  semua file lampiran, satu folder per review). Detail satu review juga bisa
  diunduh sebagai PDF sendiri-sendiri.
- **Kelola User & role (Admin / Super Admin)** tetap ada, tidak ada
  perubahan dari sistem sebelumnya.

## Cara kerja singkat

- `public/index.html` + `public/js/app.js` — form yang diisi (atasan mengisi
  penilaian, lalu keduanya menandatangani di bagian akhir). Struktur bagian &
  pertanyaan diambil otomatis dari server (`get-questions`), jadi begitu
  diubah lewat admin, form ini langsung berubah tanpa perlu deploy ulang.
- `public/admin.html` + `public/js/admin.js` — panel admin (login password)
  untuk:
  - Tab **Data Review**: tabel ringkas semua review masuk (baik yang masih
    draft maupun yang sudah final) → **Lihat Detail** untuk laporan lengkap
    per-bagian, unduh file lampiran, **Unduh PDF Laporan**, **Download Semua
    Data** (CSV/Excel/ZIP), atau hapus data.
  - Tab **Kelola Formulir**: atur bagian (section), tambah/hapus/urutkan
    pertanyaan, ubah tipe field (termasuk **Grup Berulang** untuk field
    seperti Rencana Tindak Lanjut — kamu atur sendiri kolom di dalamnya).
  - Tab **Kelola User** (khusus terlihat kalau login sebagai Super Admin):
    tambah/hapus user, reset password, ubah role, lihat log login.
- `netlify/functions/` — backend serverless (Netlify Functions), data
  disimpan di **Netlify Blobs** (built-in storage Netlify, otomatis aktif,
  tidak perlu database terpisah).
  - `submit-review.js` — menerima pengiriman draft (mode `draft`) maupun
    final (mode `final`). Draft dilindungi token acak yang hanya diketahui
    oleh pemegang link (server hanya menyimpan hash-nya, bukan token
    mentahnya) — jadi orang lain tidak bisa menebak/membuka draft orang lain
    hanya dari ID.
  - `get-draft.js` — dipakai form untuk mengambil kembali jawaban draft saat
    link "lanjutkan nanti" dibuka.
  - `admin-submissions.js` — list & hapus data (tanpa fitur ubah status/
    email seperti sebelumnya).

Data review (jawaban + file) **tidak pernah publik** — hanya bisa diakses
lewat `admin.html` dengan akun yang kamu buat sendiri.

### Soal export PDF laporan

Tombol **Unduh PDF Laporan** menghasilkan PDF berisi seluruh jawaban teks
(dikelompokkan per bagian) plus gambar tanda tangan digital kedua pihak. File
yang diupload (dokumen pendukung, dll) **tidak digabung otomatis** ke PDF
teks itu — namanya tetap dicantumkan di laporan, dan kamu unduh lewat tombol
link file di halaman detail, atau sekaligus lewat **Download Semua Data →
ZIP** (laporan PDF + semua lampiran asli, sudah dikelompokkan per folder).

### Soal simpan draft & lanjutkan nanti

- Saat klik **Simpan & Lanjutkan Nanti**, sistem membuat/menyimpan draft dan
  menampilkan link unik (`...?resume=<id>:<token>`). Simpan/salin link itu.
- Membuka link itu (dari device manapun, browser manapun) akan otomatis
  memuat ulang seluruh jawaban yang sudah diisi sebelumnya — termasuk file
  yang sudah diupload (tidak perlu upload ulang kalau tidak diganti) dan
  tanda tangan yang sudah ada.
- Draft **tidak muncul sebagai data final** sampai tombol "Kirim Data" di
  bagian terakhir ditekan. Di Panel Admin, draft tetap terlihat (ditandai
  badge "Draft") supaya HR bisa memantau siapa saja yang belum selesai
  mengisi, tapi begitu status "Sudah Final", data itu terkunci (tidak bisa
  diubah lagi lewat link tersebut).
- Link ini sebaiknya diperlakukan seperti password sederhana — siapapun yang
  memegang link bisa melanjutkan/mengisi draft tersebut. Jangan disebar ke
  orang yang tidak berkepentingan.

## Langkah deploy ke Netlify

### 1. Push ke GitHub (paling gampang & direkomendasikan)

```bash
cd review-one-on-one
git init
git add .
git commit -m "Form review one-on-one"
```

Buat repo baru di GitHub, lalu:
```bash
git remote add origin <url-repo-kamu>
git push -u origin main
```

### 2. Connect ke Netlify

1. Buka [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project**.
2. Pilih repo GitHub kamu.
3. Build settings biasanya otomatis kebaca dari `netlify.toml`:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Klik **Deploy**.

> Catatan: kalau mau deploy tanpa GitHub (drag & drop), functions **tidak
> akan jalan** — drag & drop cuma untuk file statis. Kalau mau tanpa GitHub,
> pakai Netlify CLI: `npm install -g netlify-cli` lalu `netlify deploy --prod`
> dari folder project ini.

### 3. Set environment variables

Di dashboard Netlify: **Site settings → Environment variables → Add a
variable**, tambahkan 2 variable ini:

```
Key:   ADMIN_PASSWORD
Value: (password yang dipakai SEKALI untuk bikin akun Super Admin pertama,
        username "admin", dan juga jadi jalur darurat kalau semua akun lupa
        password)

Key:   SESSION_SECRET
Value: (string acak yang panjang & rahasia — dipakai buat menandatangani
        sesi login & token link draft, bukan password siapapun)
```

Setelah nambah env var, **trigger deploy ulang** sekali (Deploys → Trigger
deploy) supaya functions membaca variable barunya.

### 4. Login pertama kali & tambah akun tim

- Buka `https://nama-site-kamu.netlify.app/admin.html`
- Login pertama kali pakai **username `admin`** + password yang kamu isi di
  `ADMIN_PASSWORD` tadi → otomatis jadi akun **Super Admin** pertama.
- Buka tab **Kelola User** → tambahkan akun kamu sendiri, lalu (kalau mau)
  turunkan role akun `admin` bawaan jadi **Admin** biasa lewat dropdown
  "Ubah Role", atau biarkan sebagai cadangan darurat.
- Bagikan link form ke atasan/karyawan: `https://nama-site-kamu.netlify.app/`

## Sistem akun & role

- **Super Admin**: akses penuh (Data Review, Kelola Formulir, Kelola User —
  tambah/hapus user, reset password siapa saja, ubah role, lihat Log Login).
- **Admin**: akses Data Review & Kelola Formulir, bisa ganti password sendiri
  lewat tab Kelola User, tapi tidak bisa tambah/hapus/lihat user lain atau
  lihat log login.
- **Lupa password?** Minta Super Admin reset dari tab Kelola User → Daftar
  User → tombol "Reset Password".
- **Semua Super Admin lupa password (jalur darurat)**: set/ubah
  `ADMIN_PASSWORD` di Netlify env, trigger deploy ulang, lalu login pakai
  username `admin` + password itu — akun `admin` otomatis ke-reset dan jadi
  Super Admin lagi.

## Catatan penting

- **Batas ukuran file**: maksimal 8MB per file gabungan per pengiriman
  (client-side sudah membatasi 4MB per pengiriman & 2MB per file, dengan
  margin aman untuk batas keras 6MB Netlify Functions). Kalau butuh lebih
  besar, ubah `MAX_FILE_BYTES`/`MAX_TOTAL_BYTES` di
  `netlify/functions/submit-review.js` dan konstanta yang sepadan di
  `public/js/app.js` — atau pertimbangkan upload langsung ke storage seperti
  S3 kalau file rutin besar.
- **Ubah pertanyaan default**: pertanyaan awal ada di
  `netlify/functions/default-config.js` sebagai fallback — begitu kamu simpan
  sekali lewat admin panel, itu yang jadi acuan seterusnya (tersimpan di
  Netlify Blobs).
- **Kepatuhan data pribadi**: karena ini data penilaian kinerja karyawan,
  pastikan hanya buatkan akun Panel Admin untuk orang yang memang berwenang.
