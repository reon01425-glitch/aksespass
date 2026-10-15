/*
 * Service worker AKSESPASS.
 *
 * Hanya menyimpan cangkang offline yang TIDAK berisi data pasien:
 * halaman /offline.html, manifest, dan ikon. Respons API dan halaman
 * aplikasi tidak pernah disimpan. Data ringkasan kebutuhan ada di
 * localStorage perangkat (dibaca oleh offline.html), bukan di cache ini.
 */
const CACHE_NAME = "aksespass-shell-v2";
const SHELL_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Berkas cangkang: dari cache dulu.
  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Membuka halaman tanpa sinyal: tampilkan halaman offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
  }
});
