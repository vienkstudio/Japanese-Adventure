// 離線快取：改版時請把 VERSION 加 1。個別檔案下載失敗不影響安裝（新檔還沒上線時也能裝）。只快取同網域、成功（r.ok）的回應；只清掉本站舊版（jpq-v 開頭）快取。
const VERSION = 'jpq-v33';
const FILES = ['./', './index.html', './css/tokens.css', './css/app.css', './css/kb.css', './css/reader.css', './css/kana.css', './js/kana-lesson.js', './css/challenge.css', './js/challenge.js', './js/home.js', './data/loan.js',
  './js/kb.js', './js/jp-text.js', './js/link-import.js', './js/reader.js', './js/songs.js', './data/reading/daily.js', './css/travel.css', './css/mind.css', './css/world.css', './kana-data.js',
  './js/phrase.js', './js/world-art.js', './js/world.js', './js/world-quest.js', './data/world/hokkaido-2.js', './data/world/hokkaido-3.js', './data/world/hokkaido.js', './data/world/index.js', './data/world/kyoto-2.js', './data/world/kyoto-3.js', './data/world/kyoto.js', './data/world/okinawa-2.js', './data/world/okinawa.js', './data/world/osaka-2.js', './data/world/osaka-3.js', './data/world/osaka.js', './data/world/tokyo-1.js', './data/world/tokyo-2.js', './data/world/tokyo-3.js', './data/world/tokyo-3b.js', './data/world/tokyo-4.js', './data/world/tokyo-4b.js', './data/world/tokyo-5.js', './data/world/tokyo-6.js', './data/world/tokyo-7.js', './data/world/tokyo-8.js',
  './data/scenes-1.js', './data/scenes-2.js', './data/scene-ext.js', './data/cards.js', './data/menus.js',
  './data/travel.js', './data/travel-ext.js', './data/travel-stops.js', './data/drills.js',
  './js/core.js', './js/game.js', './js/quest.js', './js/practice.js', './js/town.js', './js/review.js', './js/travel.js', './js/drill.js', './js/phrasebook.js', './js/mind3d.js', './js/mind-game.js', './data/mind/scripts.js',
  './vendor/3d-force-graph.min.js', './data/mind/taxonomy.js', './data/mind/conj.js', './data/mind/grammar.js',
  './data/mind/lex-n5.js', './data/mind/lex-n4.js', './data/mind/lex-n3.js', './data/mind/lex-n2.js', './data/mind/lex-n1.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/logo.svg', './icons/icon-512.png',
  './日文講義.html', './50音訓練表.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(encodeURI(f)).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('jpq-v') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 網路優先（4 秒逾時），失敗才用快取
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(timeout(fetch(req), 4000).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req))));
});
