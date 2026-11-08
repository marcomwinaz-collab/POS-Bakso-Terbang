// Service worker sederhana: membuat aplikasi bisa dipasang (install) di Android.
// Data transaksi selalu diambil dari server, jadi tidak ada cache halaman.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(
      () =>
        new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Tidak ada koneksi internet</h2><p>Periksa koneksi lalu muat ulang halaman.</p></body></html>',
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});
