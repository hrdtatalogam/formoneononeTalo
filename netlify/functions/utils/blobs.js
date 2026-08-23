const { getStore } = require("@netlify/blobs");

// Netlify Blobs seharusnya bisa mengonfigurasi dirinya sendiri secara otomatis
// di lingkungan Netlify Functions. Namun pada beberapa setup (misalnya saat
// "Base directory" custom digunakan), auto-konfigurasi itu gagal dan
// melempar error "environment has not been configured to use Netlify Blobs".
// Sebagai solusi, kita sediakan siteID dan token secara manual lewat
// environment variables BLOBS_SITE_ID dan BLOBS_TOKEN.
function getConfiguredStore(name) {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  // Fallback ke auto-konfigurasi bawaan kalau env var manual belum di-set.
  return getStore(name);
}

module.exports = { getConfiguredStore };
