// Service worker de unamano: funciona offline y carga al instante.
const VERSION = 'unamano-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './app/', './app/index.html', './admin/', './admin/index.html',
  './assets/css/base.css', './assets/css/app.css', './assets/css/landing.css',
  './assets/js/app.js', './assets/js/landing.js', './assets/js/data.js', './assets/js/poster.js',
  './assets/js/icons.js', './assets/js/crypto.js', './assets/js/pwa.js',
  './assets/fonts/fraunces.woff2', './assets/fonts/fraunces-italic.woff2', './assets/fonts/archivo.woff2',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Copia en caché primero, se actualiza en segundo plano
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
