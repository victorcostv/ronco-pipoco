/* Virtual Pops — cache pra funcionar sem internet (no carro) */
const VERSION = 'ronco-v3';
const FONTS = 'ronco-fonts-v1';
const SHELL = [
  './', './index.html', './css/app.css',
  './js/engine.js', './js/obd.js', './js/cluster.js', './js/app.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './img/camaro.webp', './img/gti.webp', './img/huracan.webp', './img/maverick.webp', './img/f1.webp',
  './img/civic.webp', './img/gt3.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // arquivos do app: rede primeiro (pega atualização), cache como reserva
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {
    // fontes: cache primeiro (a folha do Google Fonts vem opaca, sem CORS)
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(FONTS).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
