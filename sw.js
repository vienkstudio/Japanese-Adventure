// 離線快取：每次發布把 VERSION 改成新版本（'jpq-v' + V主.次.修，和 js/core.js 的 APP_VERSION 一致；tools/check-version.mjs 檢查）。外殼預快取＋執行期快取。個別檔案下載失敗不影響安裝。只快取同網域、成功（r.ok）的回應；只清掉本站舊版（jpq-v 開頭）快取。
const VERSION = 'jpq-v3.17.0';
// 預快取只放外殼（約 160KB）；其他檔案（模組、資料、CSS、3D 函式庫）第一次用到時由下方 fetch 執行期快取
const FILES = ['./', './index.html', './css/tokens.css', './css/app.css', './js/core.js', './js/learn.js', './js/game.js', './js/home.js', './js/kana-guide.js', './js/nav.js', './日文講義.html', './50音訓練表.html', './kana-data.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/logo.svg', './icons/icon-512.png'];
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
