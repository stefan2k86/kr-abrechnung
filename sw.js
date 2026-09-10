// Service Worker: App-Shell + Bibliotheken offline verfügbar halten.
const CACHE = 'kr-abrechnung-v7';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './js/app.js',
  './js/dom.js',
  './js/state.js',
  './js/rates.js',
  './js/calc.js',
  './js/import-csv.js',
  './js/import-meldeergebnis.js',
  './js/signature.js',
  './js/pdf-export.js',
  './js/views/view-start.js',
  './js/views/view-veranstaltung.js',
  './js/views/view-personen.js',
  './js/views/view-pruefen.js',
  './js/views/view-auszahlung.js',
  './js/views/view-export.js',
  './lib/pdf.min.mjs',
  './lib/pdf.worker.min.mjs',
  './lib/pdf-lib.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && new URL(req.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
