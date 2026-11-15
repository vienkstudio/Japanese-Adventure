// 離線快取：改版時請把 VERSION 加 1
const VERSION = 'jpq-v13';
const FILES = ['./', './index.html', './css/app.css', './css/travel.css', './kana-data.js', './data/scenes-1.js', './data/scenes-2.js', './data/cards.js', './data/menus.js', './data/travel.js',
  './js/core.js', './js/game.js', './js/quest.js', './js/practice.js', './js/town.js', './js/review.js', './js/travel.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/logo.svg', './icons/icon-512.png',
  './日文講義.html', './50音訓練表.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => encodeURI(f)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 網路優先，失敗才用快取（確保改版後拿到新檔）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
