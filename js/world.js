/* =========================================================
   日語冒險 — 冒險世界引擎 world.js
   日本地圖 → 街區地圖 → 店內場景卡，全部由 data/world/ 的資料驅動（格式：docs/世界資料格式.md）。
   這個檔案：存檔、程度／提示、場景插畫（CSS＋內嵌 SVG）、街區格子地圖、店內場景、對話面板、組句、店員問答、買東西流程。
   委託（可選目標）、今天想做的事、御朱印、問路、狀況題、日本地圖在 js/world-quest.js，透過 World.X 與 World.Q 溝通。
   全部地區／街區／店一開始就開放；程度只影響提示多寡與推薦，不鎖任何東西。
   路由：play（params {r 地區, d 街區, s 店} 或 {map:1} 日本地圖）
   ========================================================= */
(function () {
  'use strict';
  const W = window.WORLD, esc = App.esc;
  const G = new Proxy({}, { get: (_, k) => (window.Game && Game[k]) || (() => { }) });
  const LVS = ['zero', 'n5', 'n4', 'n3', 'n2', 'n1'];

  /* ---------------- 存檔（App.state.world） ---------------- */
  function st() {
    const S = App.state;
    if (!S.world) S.world = {};
    const w = S.world;
    ['stamps', 'dex', 'zones', 'pos', 'spots', 'last', 'goals', 'cards'].forEach(k => { if (!w[k] || typeof w[k] !== 'object') w[k] = {}; });
    if (!['plain', 'polite', 'keigo'].includes(w.style)) w.style = 'polite';
    if (!w.v3) {   // v3：進度與程度脫鉤 — 舊的 w:<店>:<委託>@N5…N1 合併成一個 key（取最高星）
      w.v3 = 1; delete w.lv;
      const C = S.cleared || {};
      Object.keys(C).forEach(k => { const m = /^(w:.+)@N[1-5]$/.exec(k); if (m) { C[m[1]] = Math.max(C[m[1]] || 0, C[k] || 0); delete C[k]; } });
    }
    return w;
  }

  /* ---------------- 程度與提示：讀 App.profile()（A 組），沒有就用預設 ---------------- */
  function prof() {
    let p = null;
    try { p = App.profile && App.profile(); } catch (e) { p = null; }
    p = p || {};
    return { lv: LVS.includes(p.lv) ? p.lv : 'zero', assist: ['full', 'some', 'none'].includes(p.assist) ? p.assist : 'full' };
  }
  const lv = () => prof().lv, li = () => LVS.indexOf(lv()), assist = () => prof().assist;
  const showKana = () => assist() !== 'none', showZh = () => assist() === 'full';
  // 零基礎：日文一律附讀音＋羅馬字＋中文
  const zero = () => lv() === 'zero' || assist() === 'full';
  const roma = (k, jp) => (window.Phrase && Phrase.romaji ? Phrase.romaji(k, jp) : '');
  const KANA_ONLY = /^[぀-ヿー、。？！!?・\s〜]+$/;
  const romaOf = o => { const src = o && (o.kana && KANA_ONLY.test(o.kana) ? o.kana : KANA_ONLY.test(o.jp || '') ? o.jp : ''); return src ? roma(src, o.jp) : ''; };
  document.addEventListener('profilechange', () => { if (STAGE && STAGE.isConnected && !pending) App.render(); });

  /* ---------------- 載入 ---------------- */
  const regionOf = id => W.regions.find(r => r.id === id);
  const RP = {};
  function loadRegion(id) {
    const R = regionOf(id); if (!R) return Promise.reject(new Error('region'));
    return RP[id] || (RP[id] = R.files.reduce((p, f) => p.then(() => App.loadScript('data/world/' + f + '.js').catch(() => console.warn('世界資料載入失敗', f))), Promise.resolve()));
  }
  let EVP = null;
  const loadEvents = () => EVP || (EVP = ['data/travel.js', 'data/travel-ext.js', 'data/travel-stops.js'].reduce((p, f) => p.then(() => App.loadScript(f)), Promise.resolve()));

  /* ---------------- 文字：依 assist 顯示讀音／中文，其餘收在「提示」 ---------------- */
  function tx(o, full) {
    if (!o) return '';
    const k = o.kana && o.kana !== o.jp;
    let h = `<b class="jp" lang="ja">${esc(o.jp)}</b>`;
    const sk = full || showKana(), sz = full || showZh();
    if (k && sk) h += `<i class="wd-k" lang="ja">${esc(o.kana)}</i>`;
    if (zero()) { const r = romaOf(o); if (r) h += `<i class="wd-r">${esc(r)}</i>`; }
    if (o.zh && sz) h += `<i class="wd-z">${esc(o.zh)}</i>`;
    if (sz && window.Loan) { const og = Loan.textHTML(o.jp, 'wd-og'); if (og) h += og; }
    if ((k && !sk) || (o.zh && !sz)) h += `<button type="button" class="wd-peek" data-k="${k && !sk ? esc(o.kana) : ''}" data-z="${!sz ? esc(o.zh || '') : ''}">💡 提示</button>`;
    return `<span class="wd-tx">${h}</span>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.wd-peek'); if (!b) return;
    e.stopPropagation();
    b.outerHTML = (b.dataset.k ? `<i class="wd-k" lang="ja">${esc(b.dataset.k)}</i>` : '') + (b.dataset.z ? `<i class="wd-z">${esc(b.dataset.z)}</i>` : '');
  });
  const item = (o, src, kind) => App.wordItem({ jp: o.jp, kana: o.kana, zh: o.zh, emoji: o.emoji || '' }, src, kind || 'word');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* =========================================================
     插畫：店內背景（依店類型 12 種）、店員人像、看板 — 內嵌 SVG（插畫內部固定色，外框與文字用變數）
     ========================================================= */
  const SHOP_BG = {
    'ueno-konbini': 'konbini', 'osaka-hyakkin': 'konbini',
    'ueno-station': 'station', 'narita-skyliner': 'station', 'kyoto-bus': 'station',
    'narita-airport': 'airport', 'narita-sim': 'airport',
    'ueno-hotel': 'hotel', 'kyoto-ryokan': 'ryokan', 'niseko-onsen': 'ryokan',
    'asakusa-sensoji': 'shrine', 'kyoto-kiyomizu': 'shrine',
    'yokohama-izakaya': 'izakaya', 'shinjuku-yakiniku': 'izakaya', 'osaka-kushikatsu': 'izakaya', 'sapporo-genghis': 'izakaya', 'yokohama-ramen': 'izakaya', 'osaka-okonomiyaki': 'izakaya',
    'ginza-drugstore': 'shop', 'harajuku-clothes': 'shop', 'ginza-bungu': 'shop', 'shinjuku-denki': 'shop', 'sapporo-omiyage': 'shop', 'asakusa-kimono': 'shop',
    'asakusa-nakamise': 'market', 'kyoto-nishiki': 'market', 'osaka-kuromon': 'market', 'naha-makishi': 'market', 'ginza-depachika': 'market', 'yokohama-chukagai': 'market', 'osaka-takoyaki': 'market', 'motobu-michinoeki': 'market',
    'shinjuku-clinic': 'office', 'shinjuku-karaoke': 'office', 'asakusa-kanko': 'office', 'niseko-rental': 'office', 'naha-rentacar': 'office', 'motobu-marine': 'office',
    'yokohama-cosmo': 'street', 'motobu-aquarium': 'street', 'osaka-castle': 'street'
  };
  const SCENE_BG = { konbini: 'konbini', ramen: 'izakaya', cafe: 'restaurant', drugstore: 'shop', izakaya: 'izakaya', clothes: 'shop', directions: 'office', station: 'station', hotel: 'hotel', shrine: 'shrine', airport: 'airport', emergency: 'office', yakiniku: 'izakaya' };
  const bgOf = s => SHOP_BG[s.id] || SCENE_BG[s.scene] || (s.kind === 'eat' ? 'restaurant' : s.kind === 'service' ? 'office' : 'shop');
  const PROD = ['#e95a4f', '#f2b33d', '#4caf50', '#3d8bd9', '#f07fb0', '#8e6bd9', '#ffd84a', '#ff8a3d'];
  // 大面積的牆、地板用 token（--wd-art-*，見 world.css），跟著深淺色切換；小物件維持插畫固定色
  const T = { wall: 'var(--wd-art-wall)', warm: 'var(--wd-art-warm)', floor: 'var(--wd-art-floor)', line: 'var(--wd-art-line)', paper: 'var(--wd-art-paper)', sky: 'var(--sc-sky)', sky2: 'var(--sc-water2)' };
  const fillA = f => /^var\(/.test(f) ? `style="fill:${f}"` : `fill="${f}"`;
  const strokeA = f => /^var\(/.test(f) ? `style="stroke:${f}"` : `stroke="${f}"`;
  const rect = (x, y, w, h, f, more) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillA(f)}${more ? ' ' + more : ''}/>`;
  function floorP(y0, base, line, rows) {   // 透視地板
    base = T.floor; line = T.line;
    let s = rect(0, y0, 600, 240 - y0, base);
    for (let i = 0; i < 15; i++) { const xb = -400 + i * 100, xt = 300 + (xb - 300) * 0.42; s += `<path d="M${xt} ${y0}L${xb} 240" ${strokeA(line)} stroke-width="1.2"/>`; }
    (rows || [0.14, 0.34, 0.6, 0.9]).forEach(f => { s += `<path d="M0 ${y0 + (240 - y0) * f}H600" ${strokeA(line)} stroke-width="1"/>`; });
    return s;
  }
  function goods(x0, y, w, n, seed, h) {   // 一排商品
    let s = '';
    for (let i = 0; i < n; i++) { const c = PROD[(i * 3 + seed) % PROD.length], hh = (h || 20) - ((i + seed) % 3) * 3; s += rect(x0 + i * w, y - hh, w - 4, hh, c, 'rx="2"'); }
    return s;
  }
  const sky = id => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--wd-art-sky1)"/><stop offset="1" style="stop-color:var(--wd-art-sky2)"/></linearGradient></defs>`;
  const lantern = (x, y) => `<g>${rect(x - 3, y - 36, 6, 8, '#2b2b2b')}<ellipse cx="${x}" cy="${y}" rx="22" ry="28" fill="#d9473c"/><path d="M${x - 21} ${y - 8}H${x + 21}M${x - 21} ${y + 8}H${x + 21}" stroke="#a83228" stroke-width="2"/>${rect(x - 12, y - 30, 24, 5, '#2b2b2b')}${rect(x - 12, y + 25, 24, 5, '#2b2b2b')}${rect(x - 4, y - 10, 8, 20, '#2b2b2b', 'opacity=".55"')}</g>`;
  const ART = {
    konbini() {
      let s = rect(0, 0, 600, 170, T.wall) + rect(0, 0, 600, 14, '#2a6fd0') + rect(0, 14, 600, 6, '#33a852');
      for (let x = 70; x < 560; x += 110) s += rect(x, 28, 70, 5, '#fffbe6', 'stroke="#d9dde2"');
      s += rect(40, 52, 320, 118, T.line, 'rx="4"');
      [86, 122, 158].forEach((y, r) => { s += rect(44, y, 312, 4, '#b8c0c8') + goods(50, y, 20, 15, r * 2, 26); });
      s += rect(380, 40, 190, 130, '#c9d3dc', 'rx="4"');
      for (let i = 0; i < 3; i++) { const x = 386 + i * 61; s += rect(x, 46, 56, 118, '#d9eef9', 'stroke="#9fb0bd"'); [80, 115, 150].forEach((y, r) => { s += goods(x + 4, y, 10, 5, i + r, 24); }); s += rect(x + 48, 90, 3, 30, '#7f8c97'); }
      return s + floorP(170, '#e9ecef', '#d3d8dd');
    },
    restaurant() {
      let s = rect(0, 0, 600, 170, T.warm) + rect(0, 118, 600, 52, '#a8723f');
      for (let x = 0; x < 600; x += 24) s += `<path d="M${x} 118V170" stroke="#8d5c30" stroke-width="2"/>`;
      [120, 250, 380].forEach(x => { s += rect(x, 40, 100, 58, '#3d2e22', 'rx="4"'); for (let i = 0; i < 4; i++) s += rect(x + 10, 52 + i * 11, 60 + (i * 7) % 20, 4, '#f4ead2', 'rx="2"'); });
      [80, 300, 520].forEach(x => { s += `<path d="M${x} 0V24" stroke="#555" stroke-width="2"/><path d="M${x - 20} 38 Q${x} 14 ${x + 20} 38Z" fill="#e4b34a"/>`; });
      return s + floorP(170, '#c89462', '#a8764a', [0.2, 0.5, 0.85]);
    },
    izakaya() {
      let s = rect(0, 0, 600, 240, '#6b4428');
      for (let x = 0; x < 600; x += 40) s += `<path d="M${x} 46V170" stroke="#5a3820" stroke-width="3"/>`;
      s += rect(0, 0, 600, 46, '#23395d');
      for (let x = 100; x < 600; x += 100) s += rect(x - 2, 6, 4, 40, '#6b4428');
      s += `<circle cx="300" cy="22" r="12" fill="none" stroke="#f4ead2" stroke-width="3"/>`;
      for (let i = 0; i < 8; i++) { const x = 190 + i * 28; s += rect(x, 62, 18, 78, '#f4ead2', 'rx="2"'); for (let j = 0; j < 4; j++) s += rect(x + 6, 70 + j * 16, 6, 9, '#2b2b2b'); }
      s += lantern(100, 100) + lantern(500, 100);
      return s + rect(0, 168, 600, 72, '#8b5a2b') + rect(0, 164, 600, 10, '#b07a42');
    },
    station() {
      let s = rect(0, 0, 600, 175, T.wall);
      for (let x = 0; x < 600; x += 30) s += `<path d="M${x} 0V175" stroke="#d6dce1"/>`;
      for (let y = 30; y < 175; y += 30) s += `<path d="M0 ${y}H600" stroke="#d6dce1"/>`;
      s += rect(170, 22, 260, 62, '#1d1f24', 'rx="4"');
      for (let i = 0; i < 4; i++) s += rect(182, 32 + i * 12, 70, 6, '#ffb02e') + rect(262, 32 + i * 12, 60, 6, '#6fdc6f') + rect(332, 32 + i * 12, 86, 6, '#ffb02e', 'opacity=".75"');
      s += rect(40, 40, 110, 26, '#1c5fb8', 'rx="3"') + rect(52, 50, 70, 6, '#fff') + rect(450, 40, 110, 26, '#f6c400', 'rx="3"') + rect(462, 50, 70, 6, '#111');
      s += floorP(175, '#d9d6cf', '#c4c0b7');
      for (let i = 0; i < 5; i++) { const x = 140 + i * 66; s += rect(x, 132, 26, 60, '#b9c2c9', 'rx="4"') + rect(x, 128, 26, 8, '#4fa3e0', 'rx="3"') + rect(x + 26, 150, 34, 4, '#e8b04a'); }
      return s + rect(0, 206, 600, 8, '#f2c200');
    },
    airport() {
      let s = sky('wd-sky') + rect(0, 0, 600, 165, T.wall) + rect(0, 16, 600, 112, 'url(#wd-sky)');
      s += `<path d="M330 84 L470 70 L486 60 L494 62 L486 74 L520 72 L524 78 L486 82 L470 98 L460 98 L466 84 L360 92Z" fill="#fff" opacity=".95"/>`;
      for (let x = 0; x <= 600; x += 75) s += rect(x - 3, 16, 6, 112, '#9fb0bd');
      s += rect(0, 10, 600, 8, '#9fb0bd') + rect(0, 126, 600, 6, '#9fb0bd');
      s += floorP(165, '#dfe4e8', '#cfd6dc', [0.25, 0.6]);
      return s + rect(180, 140, 240, 46, '#6e8ca6', 'rx="4"') + rect(176, 134, 248, 10, '#a9c0d3', 'rx="3"') + rect(270, 150, 60, 12, '#fff', 'rx="2" opacity=".85"');
    },
    hotel() {
      let s = rect(0, 0, 600, 168, T.warm);
      for (let x = 30; x < 600; x += 60) s += `<path d="M${x} 0V168" stroke="#e0d1b8" stroke-width="2"/>`;
      s += `<path d="M300 0V20" stroke="#b08d3a" stroke-width="2"/><ellipse cx="300" cy="30" rx="34" ry="10" fill="#f6d36b"/>`;
      [270, 290, 310, 330].forEach(x => { s += `<circle cx="${x}" cy="42" r="4" fill="#ffe9a8"/>`; });
      s += floorP(168, '#f3eee6', '#e2d9cb');
      s += rect(140, 120, 320, 70, '#7b4a2a', 'rx="4"') + rect(134, 112, 332, 12, '#a76c3e', 'rx="4"') + rect(270, 140, 60, 18, '#d4af37', 'rx="3"');
      return s + rect(40, 150, 36, 40, '#8a5a3b', 'rx="4"') + `<circle cx="48" cy="130" r="18" fill="#4a9a52"/><circle cx="70" cy="120" r="20" fill="#5bb063"/><circle cx="58" cy="104" r="16" fill="#4a9a52"/>`;
    },
    ryokan() {
      let s = rect(0, 0, 600, 175, '#a77b4f');
      for (let x = 10; x < 600; x += 120) { s += rect(x, 18, 110, 150, T.paper); for (let i = 1; i < 3; i++) s += `<path d="M${x + i * 36.7} 18V168" stroke="#a77b4f" stroke-width="2"/>`; for (let y = 48; y < 168; y += 30) s += `<path d="M${x} ${y}H${x + 110}" stroke="#a77b4f" stroke-width="2"/>`; }
      s += rect(0, 0, 600, 16, '#7a5230') + rect(430, 30, 46, 110, '#f4ead2') + `<path d="M446 50V110M458 60V100" stroke="#333" stroke-width="3"/>` + rect(428, 26, 50, 6, '#5a3c22') + rect(428, 138, 50, 6, '#5a3c22');
      s += rect(0, 175, 600, 65, 'var(--wd-art-tatami)');
      [0, 150, 300, 450].forEach(x => { s += rect(x, 175, 150, 65, 'none', 'stroke="#6b7d3b" stroke-width="3"'); });
      return s;
    },
    shrine() {
      let s = sky('wd-sky2') + rect(0, 0, 600, 240, 'url(#wd-sky2)');
      s += `<path d="M0 150 Q80 110 160 140 Q240 100 320 135 Q420 96 520 132 Q570 120 600 128V240H0Z" fill="#6aa86b"/>`;
      s += `<path d="M260 240 L285 172 H315 L340 240Z" fill="#cfc8bb"/>` + rect(0, 172, 600, 68, T.floor, 'opacity=".55"');
      s += rect(214, 46, 14, 140, '#d23a2c') + rect(372, 46, 14, 140, '#d23a2c') + rect(200, 66, 200, 10, '#d23a2c');
      s += `<path d="M184 40 Q300 26 416 40 L412 50 Q300 38 188 50Z" fill="#2b2b2b"/>` + rect(292, 50, 16, 18, '#2b2b2b');
      [110, 490].forEach(x => { s += rect(x - 6, 150, 12, 36, '#a9a59c') + rect(x - 16, 136, 32, 16, '#bdb9b0', 'rx="3"') + rect(x - 20, 128, 40, 8, '#97938a', 'rx="2"') + rect(x - 14, 186, 28, 6, '#97938a'); });
      return s;
    },
    shop() {
      let s = rect(0, 0, 600, 170, T.wall) + rect(0, 0, 600, 12, '#f28fb0');
      [100, 300, 500].forEach(x => { s += `<circle cx="${x}" cy="22" r="6" fill="#fff3c4" stroke="#e8d9a0"/>`; });
      [[30, 2], [420, 5]].forEach(([x, sd]) => { s += rect(x, 40, 150, 130, T.paper, 'stroke="#e5d9e0" stroke-width="2" rx="4"'); [78, 114, 150].forEach((y, r) => { s += rect(x + 4, y, 142, 3, '#e5d9e0') + goods(x + 10, y, 18, 7, sd + r, 22); }); });
      s += rect(240, 60, 120, 70, '#e7f3f6', 'stroke="#c9dde2" stroke-width="3" rx="6"');
      s += floorP(170, '#ead8c2', '#dcc6ab', [0.3, 0.75]);
      return s + rect(220, 150, 160, 40, '#e9dfe6', 'rx="6"') + goods(232, 150, 22, 6, 4, 14);
    },
    market() {
      let s = rect(0, 0, 600, 240, T.warm) + rect(0, 0, 600, 28, '#9fb7c6');
      for (let x = 0; x < 600; x += 50) s += `<path d="M${x} 28 Q${x + 25} 4 ${x + 50} 28" stroke="#7f98a8" fill="none" stroke-width="2"/>`;
      [[10, '#d9473c'], [205, '#2a6fd0'], [400, '#33a852']].forEach(([x, c], k) => {
        for (let i = 0; i < 6; i++) s += rect(x + i * 31.6, 52, 31.6, 26, i % 2 ? '#fff' : c);
        s += `<path d="M${x} 78 ${Array.from({ length: 6 }, (_, i) => `Q${x + i * 31.6 + 15.8} 90 ${x + (i + 1) * 31.6} 78`).join(' ')}Z" fill="${c}"/>`;
        s += rect(x + 50, 36, 90, 16, '#f6e7b0', 'rx="2"') + rect(x + 6, 128, 178, 52, '#b98a56', 'rx="3"');
        for (let i = 0; i < 8; i++) s += `<circle cx="${x + 20 + i * 21}" cy="122" r="9" fill="${PROD[(i + k * 3) % PROD.length]}"/>`;
      });
      return s + floorP(180, '#cfc6b8', '#bfb5a5', [0.4]);
    },
    office() {
      let s = rect(0, 0, 600, 168, T.wall);
      [[40, 30], [110, 40], [470, 32]].forEach(([x, y]) => { s += rect(x, y, 56, 72, '#fff', 'stroke="#c9d3dc" stroke-width="2"') + rect(x + 8, y + 10, 40, 22, '#9fc6e6') + rect(x + 8, y + 40, 34, 4, '#c9d3dc') + rect(x + 8, y + 50, 26, 4, '#c9d3dc'); });
      s += rect(250, 22, 100, 40, '#1d1f24', 'rx="4"') + rect(268, 34, 18, 16, '#ff5b4a') + rect(292, 34, 18, 16, '#ff5b4a') + rect(316, 34, 18, 16, '#ff5b4a');
      s += floorP(168, '#dcd8d0', '#cbc6bc');
      return s + rect(110, 82, 380, 58, '#dff0fb', 'opacity=".6"') + rect(100, 136, 400, 56, '#9fb3c4', 'rx="4"') + rect(94, 130, 412, 10, '#c8d6e1', 'rx="3"');
    },
    street() {
      let s = sky('wd-sky3') + rect(0, 0, 600, 240, 'url(#wd-sky3)');
      s += rect(0, 60, 90, 120, '#c9d3dc') + rect(80, 40, 80, 140, '#b7c3cc') + rect(440, 50, 90, 130, '#b7c3cc') + rect(520, 76, 80, 104, '#c9d3dc');
      for (let y = 70; y < 170; y += 22) s += rect(16, y, 14, 10, '#eaf6ff') + rect(46, y, 14, 10, '#eaf6ff') + rect(456, y, 14, 10, '#eaf6ff') + rect(490, y, 14, 10, '#eaf6ff');
      s += rect(0, 180, 600, 60, T.floor);
      s += rect(200, 70, 200, 116, '#f4efe6', 'rx="4"') + `<path d="M190 74 L300 36 L410 74Z" fill="#e4572e"/>` + rect(226, 100, 64, 44, '#bfe3f7', 'stroke="#8aa3b5" stroke-width="3"') + rect(310, 100, 64, 44, '#bfe3f7', 'stroke="#8aa3b5" stroke-width="3"');
      return s + `<path d="M170 60V186M430 60V186" stroke="#777" stroke-width="3"/><path d="M170 62L196 70L170 78Z" fill="#f6c400"/><path d="M430 62L456 70L430 78Z" fill="#33a852"/>`;
    }
  };
  const artSVG = bg => `<svg class="wd-bg" viewBox="0 0 600 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${(ART[bg] || ART.shop)()}</svg>`;

  // 店員人像：依店類型換制服與配件；髮色、長短髮依名稱雜湊
  const CLERK = {
    konbini: { u: '#2a6fd0', acc: 'stripe' }, restaurant: { u: '#f4f1ea', acc: 'apron', ap: '#3a3a3a', hat: 'band' }, izakaya: { u: '#23395d', hat: 'hachi' },
    station: { u: '#1f2d4d', hat: 'cap2', acc: 'tie' }, airport: { u: '#2b4a7a', acc: 'scarf' }, hotel: { u: '#2b2b2b', acc: 'vest' }, ryokan: { u: '#9b3b5a', acc: 'kimono' },
    shrine: { u: '#f4f1ea', acc: 'miko' }, shop: { u: '#f28fb0', acc: 'apron', ap: '#fff' }, market: { u: '#3d7a4a', acc: 'apron', ap: '#e8d9b0', hat: 'hachi' },
    office: { u: '#5f7d95', acc: 'tie' }, street: { u: '#e4572e', hat: 'cap' }
  };
  const HAIR = ['#2b2118', '#3b2a1e', '#1c1c1c', '#5a3d2b', '#7a7a7a'], SKIN = ['#f6d3b3', '#efc39d', '#f9dcc4'];
  const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 7);
  function clerkSVG(bg, seed, npc, face) {
    const c = CLERK[bg] || CLERK.shop, h = hash(seed), hair = HAIR[h % HAIR.length], skin = SKIN[(h >>> 3) % SKIN.length];
    const fem = /👩|💁|女|阿姨|仲居|巫女/.test((npc && (npc.emoji + npc.who)) || '') || (!/👨|🧓|👴|大將|師傅/.test((npc && (npc.emoji + npc.who)) || '') && h % 2 === 1);
    const old = /🧓|👴|🧑‍🦳|職人|大將/.test((npc && (npc.emoji + npc.who)) || '');
    const hc = old ? '#9a9a9a' : hair;
    let body = `<path d="M14 160 Q16 110 60 104 Q104 110 106 160Z" fill="${c.acc === 'miko' ? '#f4f1ea' : c.u}"/>`;
    if (c.acc === 'miko') body += `<path d="M24 140 H96 L102 160 H18Z" fill="#d23a2c"/>`;
    if (c.acc === 'kimono') body += `<path d="M44 106 L60 136 L76 106 L70 104 L60 124 L50 104Z" fill="#f4ead2"/><rect x="24" y="132" width="72" height="12" fill="#e4b34a"/>`;
    else body += `<path d="M48 104 L60 120 L72 104Z" fill="#fff"/>`;
    if (c.acc === 'apron') body += `<path d="M38 116 H82 L86 160 H34Z" fill="${c.ap}"/><path d="M44 116 L52 104 M76 116 L68 104" stroke="${c.ap}" stroke-width="4"/>`;
    if (c.acc === 'stripe') body += `<rect x="16" y="128" width="88" height="6" fill="#33a852"/><rect x="16" y="136" width="88" height="3" fill="#fff"/>`;
    if (c.acc === 'tie') body += `<path d="M57 112 L63 112 L65 140 L60 146 L55 140Z" fill="#d23a2c"/>`;
    if (c.acc === 'vest') body += `<path d="M30 112 L52 118 L56 160 H24Z M90 112 L68 118 L64 160 H96Z" fill="#7b2d2d"/>`;
    if (c.acc === 'scarf') body += `<path d="M46 106 Q60 122 74 106 L80 112 Q60 132 40 112Z" fill="#f6c400"/>`;
    body += `<rect x="70" y="124" width="22" height="10" rx="2" fill="#fff" stroke="#999"/>`;
    const long = fem && !/hachi|cap2/.test(c.hat || '') ? `<path d="M28 64 Q26 96 36 100 L40 70Z M92 64 Q94 96 84 100 L80 70Z" fill="${hc}"/>` : '';
    const miko = c.acc === 'miko' ? `<path d="M30 64 Q28 104 40 112 L44 72Z M90 64 Q92 104 80 112 L76 72Z" fill="#1c1c1c"/>` : '';
    let hat = '';
    if (c.hat === 'cap') hat = `<path d="M30 54 Q32 30 60 30 Q88 30 90 54Z" fill="${c.u}"/><rect x="16" y="50" width="50" height="7" rx="3" fill="${c.u}"/>`;
    if (c.hat === 'cap2') hat = `<rect x="32" y="28" width="56" height="20" rx="5" fill="${c.u}"/><rect x="28" y="44" width="64" height="7" rx="3" fill="#111"/><circle cx="60" cy="37" r="4" fill="#e8c14a"/>`;
    if (c.hat === 'hachi') hat = `<rect x="29" y="48" width="62" height="9" rx="3" fill="#fff"/><path d="M88 50 L100 44 L98 56Z" fill="#fff"/>`;
    if (c.hat === 'band') hat = `<rect x="31" y="46" width="58" height="8" rx="3" fill="${c.ap || '#fff'}"/>`;
    const head = `<rect x="52" y="88" width="16" height="18" fill="${skin}"/>${long}${miko}<circle cx="60" cy="66" r="29" fill="${skin}"/>
      <path d="M31 64 Q30 34 60 34 Q90 34 89 64 Q84 47 60 46 Q40 47 31 64Z" fill="${hc}"/>${hat}
      <g class="ck-e0"><circle cx="49" cy="68" r="3.4" fill="#2b2b2b"/><circle cx="71" cy="68" r="3.4" fill="#2b2b2b"/></g>
      <path class="ck-e1" d="M44 69 Q49 63 54 69M66 69 Q71 63 76 69" stroke="#2b2b2b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path class="ck-br" d="M43 58 Q48.5 55 54 57.5M66 57.5 Q71.5 55 77 58" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="42" cy="78" r="5" fill="#f4a3a3" opacity=".5"/><circle cx="78" cy="78" r="5" fill="#f4a3a3" opacity=".5"/>
      <path class="ck-m0" d="M53 80 Q60 86 67 80" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path class="ck-m1" d="M51 78 Q60 92 69 78Z" fill="#7a3b2e"/>
      <path class="ck-m2" d="M54 84 Q60 80 66 84" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    return face ? `<svg class="wd-pt" viewBox="24 28 72 72" aria-hidden="true">${head}</svg>` : `<svg class="wd-pt" viewBox="0 0 120 160" aria-hidden="true">${body}${head}</svg>`;
  }
  // 看板：真實看板配色（插畫），用 SVG 畫，不依賴新 emoji
  const SIGN = { y: ['#f6c400', '#111'], g: ['#1f9d55', '#fff'], b: ['#1c64c8', '#fff'], r: ['#d7263d', '#fff'], k: ['#1f1f1f', '#fff'], w: ['#ffffff', '#111'], o: ['#f08a24', '#111'], p: ['#f7a8c4', '#111'] };
  function signHTML(z, cls) {
    const [bg, fg] = SIGN[z.style] || SIGN.w, t = String(z.jp || ''), n = [...t].length, w = Math.max(64, n * 19 + 26);
    return `<svg class="wd-sign ${cls || ''}" viewBox="0 0 ${w} 42" role="img" aria-label="${esc(t)}" lang="ja"><rect x="1.5" y="1.5" width="${w - 3}" height="39" rx="6" fill="${bg}" stroke="#555" stroke-opacity=".45" stroke-width="3"/><text x="${w / 2}" y="28" text-anchor="middle" font-size="19" font-weight="900" fill="${fg}" font-family="Noto Sans JP,Hiragino Sans,Yu Gothic,Meiryo,sans-serif">${esc(t)}</text></svg>`;
  }

  /* =========================================================
     街區格子地圖：點擊行走＋物件；地圖填滿可用區，超出時可捲動、跟著角色
     cfg { rows, walk(c), cls(c), objs:{key:{icon,html,label,cls,badge}}, start, onObj(key), onStep(c,x,y) }
     ========================================================= */
  function buildMap(host, cfg) {
    const rows = cfg.rows, H = rows.length, Wd = rows[0].length;
    const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= Wd) ? null : rows[y][x];
    const isObj = c => c != null && !!cfg.objs[c];
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const comps = [], cid = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y); if (!isObj(c) || cid[x + ',' + y] != null) continue;
      const comp = { key: c, tiles: [] }, q = [[x, y]]; cid[x + ',' + y] = comps.length;
      while (q.length) { const [a, b] = q.shift(); comp.tiles.push([a, b]); DIR.forEach(([dx, dy]) => { const k = (a + dx) + ',' + (b + dy); if (at(a + dx, b + dy) === c && cid[k] == null) { cid[k] = comps.length; q.push([a + dx, b + dy]); } }); }
      comps.push(comp);
    }
    let html = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y), o = isObj(c) ? cfg.objs[c] : null;
      html += `<div class="wd-t ${o ? 'wd-o ' + (o.cls || '') : cfg.cls(c, x, y)}" style="grid-column:${x + 1};grid-row:${y + 1}" data-x="${x}" data-y="${y}"${o ? ` data-o="${esc(c)}" role="button" tabindex="0" aria-label="${esc(o.label || o.aria || '')}"` : ''}>${o ? (o.html != null ? o.html : `<span>${esc(o.icon || '')}</span>`) : !cfg.art && cfg.deco ? cfg.deco(c, x, y) : ''}</div>`;
    }
    comps.forEach((cp, i) => {
      const o = cfg.objs[cp.key]; if (!o.label && !o.badge) return;
      const xs = cp.tiles.map(t => t[0]), ys = cp.tiles.map(t => t[1]);
      const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, by = Math.max(...ys) + 1;
      if (o.label) html += `<div class="wd-lb" style="left:calc(var(--ts)*${cx});top:calc(var(--ts)*${by})" data-c="${i}">${esc(o.label)}${o.badge ? `<em>${o.badge}</em>` : ''}</div>`;
    });
    const art = cfg.art ? cfg.art() : '';
    host.innerHTML = `<div class="wd-map${art ? ' has-art' : ''}" style="--cols:${Wd};--rows:${H}">${art ? `<svg class="wd-art" viewBox="0 0 ${Wd * 100} ${H * 100}" preserveAspectRatio="none" aria-hidden="true">${art}</svg>` : ''}${html}<div class="wd-me" aria-hidden="true">${meSVG()}</div></div>`;
    const map = host.firstElementChild, me = map.querySelector('.wd-me');
    let pos = (cfg.start || [0, 0]).slice(), moving = 0, ts = 40;
    const place = () => { me.style.transform = `translate(${pos[0] * ts}px,${pos[1] * ts}px)`; };
    const follow = smooth => { const l = pos[0] * ts + ts / 2 - host.clientWidth / 2, t = pos[1] * ts + ts / 2 - host.clientHeight / 2; try { host.scrollTo({ left: l, top: t, behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { host.scrollLeft = l; host.scrollTop = t; } };
    function fit() {
      const cw = host.clientWidth, ch = host.clientHeight; if (!cw || !ch) return;
      ts = Math.floor(Math.max(34, Math.min(92, Math.max(cw / Wd, ch / H))));   // 填滿（cover），超出可捲動
      map.style.setProperty('--ts', ts + 'px'); place(); follow(false);
    }
    function route(goal) {
      const q = [[pos[0], pos[1], []]], seen = new Set([pos[0] + ',' + pos[1]]);
      for (const [x, y, p] of q) {
        if (goal(x, y)) return p;
        for (const [dx, dy] of DIR) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !cfg.walk(at(nx, ny))) continue; seen.add(k); q.push([nx, ny, p.concat([[nx, ny]])]); }
      }
      return null;
    }
    async function walk(path) {
      const my = ++moving;
      for (const p of path) {
        if (my !== moving || !map.isConnected) return false;
        me.classList.toggle('flip', p[0] < pos[0]);
        pos = p; place(); follow(true); await wait(70);
      }
      if (cfg.onMove) cfg.onMove(pos);
      return my === moving && map.isConnected;
    }
    async function goObj(key, ci) {
      const all = ci != null ? comps[ci].tiles : comps.filter(c => c.key === key).flatMap(c => c.tiles);
      const near = (x, y) => all.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) === 1);
      const p = route(near); if (!p) return;
      if (await walk(p)) cfg.onObj(key);
    }
    map.addEventListener('click', async e => {
      const t = e.target.closest('.wd-t'), lb = e.target.closest('.wd-lb[data-c]');
      if (lb) { const cp = comps[+lb.dataset.c]; return goObj(cp.key, +lb.dataset.c); }
      if (!t) return;
      const x = +t.dataset.x, y = +t.dataset.y, c = at(x, y);
      if (t.dataset.o) return goObj(c, cid[x + ',' + y]);
      if (!cfg.walk(c)) return;
      const p = route((a, b) => a === x && b === y); if (!p) return;
      if (await walk(p) && cfg.onStep) cfg.onStep(c, x, y);
    });
    map.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.o) { e.preventDefault(); e.target.click(); } });
    function pulse(key) {
      map.querySelectorAll('.wd-o').forEach(t => t.classList.toggle('pulse', t.dataset.o === String(key)));
      setTimeout(() => map.querySelectorAll('.wd-o.pulse').forEach(t => t.classList.remove('pulse')), 5200);
    }
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!map.isConnected) return ro.disconnect(); fit(); }); ro.observe(host); }
    fit();
    return { el: map, fit, pulse, goObj, pos: () => pos.slice(), comps, at, route, stop: () => { moving++; } };
  }
  // 玩家小人（SVG，主色上色）
  const meSVG = () => window.WorldArt ? WorldArt.me() : `<svg viewBox="0 0 40 48" aria-hidden="true"><ellipse cx="20" cy="45" rx="11" ry="3" fill="#000" opacity=".2"/><path d="M8 44 Q9 26 20 25 Q31 26 32 44Z" class="me-b"/><rect x="25" y="28" width="9" height="13" rx="2" fill="#8a5a3b"/><circle cx="20" cy="15" r="10" fill="#f6d3b3"/><path d="M10 14 Q10 4 20 4 Q30 4 30 14 Q26 9 20 9 Q14 9 10 14Z" fill="#2b2118"/><circle cx="16.5" cy="16" r="1.5" fill="#2b2b2b"/><circle cx="23.5" cy="16" r="1.5" fill="#2b2b2b"/></svg>`;

  /* =========================================================
     舞台：HUD＋（街區地圖｜店內場景）＋提示列＋面板（不覆蓋地圖，地圖讓位）
     ========================================================= */
  let STAGE = null, MAP = null, S = null, D = null, RUN = null, PARAMS = null, fromDistrict = false;
  const ABORT = { abort: 1 };
  let pending = null;
  // 只有「繼續」的店員台詞（いらっしゃいませ、お会計は…）不單獨佔一步：先記著，併進下一個需要回應的步驟
  let LEAD = [];
  const lead = (npc, line, extra) => { LEAD.push({ npc, line, extra: extra || '' }); };
  // SIM：shopSim 模式（活動框架的 shop 活動）；null = 自由逛
  let SIM = null;
  const mistake = () => { if (SIM) SIM.miss++; Q.mistake(); };
  const pref = id => (SIM ? (SIM.goal.prefs[id] != null ? SIM.goal.prefs[id] : null) : Q.pref(id));
  // 收集結果（同一句取最低分），由活動 runner 統一 Learn.record
  function simRec(o, grade, type) {
    if (!SIM || !o || !o.jp || !window.Learn) return;
    const id = Learn.idOf({ jp: o.jp }, type || 'phrase'); if (!id) return;
    const r = SIM.res.find(x => x.id === id);
    if (r) { r.grade = Math.min(r.grade, grade); return; }
    SIM.res.push({ id, grade, item: { jp: o.jp, kana: o.kana || '', zh: o.zh || '', source: '🧳 ' + (S ? S.name : '店家') } });
  }
  const Q = {   // 由 world-quest.js 覆寫
    pref() { return null; }, mistake() { }, on() { }, bar() { return ''; }, async checkBasket() { return true; }, swap() { }, active() { return false; },
    clerkExtra() { return []; }, npcExtra() { return []; }, enter() { }, leave() { }, board() { }, shopBadge() { return ''; }, barTap() { }, goals() { return ''; }, bindGoals() { }
  };
  function stage(el, hud, cls) {
    el.innerHTML = `<section class="wd ${cls || ''}" id="wd">
      <div class="wd-hud">${hud}</div>
      <div class="wd-box"></div>
      <button type="button" class="wd-bar" id="wd-bar" hidden></button>
      <div class="wd-sheet" id="wd-sheet" hidden><button type="button" class="wd-x" aria-label="關閉">✕</button><div class="wd-in"></div></div>
    </section>`;
    STAGE = el.querySelector('#wd');
    const fit = () => {
      if (!STAGE.isConnected) { window.removeEventListener('resize', fit); return; }
      const nav = document.getElementById('nav'), bottom = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 8;
      STAGE.style.height = Math.max(420, window.innerHeight - STAGE.getBoundingClientRect().top - window.scrollY - bottom) + 'px';
    };
    window.addEventListener('resize', fit);
    STAGE._fit = fit;
    STAGE.querySelector('.wd-x').onclick = closeSheet;
    STAGE.querySelector('#wd-bar').onclick = () => Q.barTap();
    return STAGE;
  }
  function sheet(html, opt) {
    if (pending) { const r = pending; pending = null; r(ABORT); }
    const sh = STAGE.querySelector('#wd-sheet'), inn = sh.querySelector('.wd-in');
    inn.innerHTML = html; sh.hidden = false;
    const home = !!(opt && opt.home);
    sh.classList.toggle('home', home);
    STAGE.classList.toggle('compact', !home);   // 面板展開（非店內首頁）時插畫縮小
    focusMode(!!(opt && opt.focus));
    inn.scrollTop = 0;
    return inn;
  }
  // 組句時收起底部導覽與頂列 Lv（只在窄螢幕，CSS 決定）
  function focusMode(on) {
    const b = document.body, was = b.classList.contains('wd-focus');
    b.classList.toggle('wd-focus', !!on);
    if (was !== !!on && STAGE && STAGE._fit) STAGE._fit();
  }
  function closeSheet() {
    focusMode(false); LEAD = [];
    if (!STAGE || !STAGE.isConnected) return;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (pending) { const r = pending; pending = null; r(ABORT); }
    if (S) return shopHome();
    const sh = STAGE.querySelector('#wd-sheet'); if (sh) sh.hidden = true;
    STAGE.classList.remove('compact');
  }
  // 一個需要玩家回應的步驟；面板被關掉或換成別的就中止整段流程
  function step(html, bind, opt) {
    const ld = LEAD; LEAD = [];
    if (ld.length) { html = `<div class="wd-lead">${ld.map(l => bubble(l.npc, l.line, 'wd-lead1') + l.extra).join('')}</div>` + html; App.speak(ld.map(l => l.line.jp).join('')); }
    return new Promise((res, rej) => {
      const el = sheet(html, opt);
      pending = rej;
      bind(el, v => { if (pending === rej) pending = null; res(v); });
      el.querySelectorAll('.wd-lead1 [data-spk]').forEach((b, i) => { b.onclick = () => App.speak(ld[i].line.jp); });
    });
  }
  const flow = fn => (...a) => Promise.resolve().then(() => { LEAD = []; return fn(...a); }).catch(e => { if (e !== ABORT) { console.error(e); App.toast('😵 發生錯誤：' + esc(e.message || e)); } });
  function paintBar() {
    if (!STAGE || !STAGE.isConnected) return;
    const b = STAGE.querySelector('#wd-bar'), h = Q.bar();
    b.hidden = !h; b.innerHTML = h;
  }

  /* ---------------- 店員表情 ---------------- */
  let moodT = 0;
  function mood(m, say) {
    const c = STAGE && STAGE.querySelector('#wd-clerk'); if (!c) return;
    c.classList.remove('mood-happy', 'mood-puzzled'); if (m) c.classList.add('mood-' + m);
    const b = c.querySelector('.wd-say'); if (b) { b.textContent = say || ''; b.hidden = !say; }
    clearTimeout(moodT); moodT = setTimeout(() => { c.classList.remove('mood-happy', 'mood-puzzled'); if (b) b.hidden = true; }, 1800);
  }

  /* ---------------- 共用互動元件 ---------------- */
  const faceHTML = npc => npc && npc.clerk && S ? `<span class="wd-face pt">${clerkSVG(bgOf(S), S.id + npc.who, npc, true)}</span>` : `<span class="wd-face">${esc((npc && npc.emoji) || '🧑')}</span>`;
  const bubble = (npc, line, cls) => `<div class="wd-npc ${cls || ''}">${faceHTML(npc)}<div class="wd-bub"><small>${esc(npc.who || '')}</small>${tx(line)}<button type="button" class="wd-spk" data-spk aria-label="再聽一次">🔊</button></div></div>`;
  const bindSpk = (el, line) => el.querySelectorAll('[data-spk]').forEach(b => b.onclick = () => App.speak(line.jp));
  function npcSay(npc, line, extra) {
    return step(`${bubble(npc, line)}${extra || ''}<div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">繼續 ➜</button></div>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      el.querySelector('#wd-ok').onclick = () => done();
    });
  }
  function note(html, btn) {
    return step(`<div class="wd-note">${html}</div><div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">${btn || '知道了'}</button></div>`, (el, done) => { el.querySelector('#wd-ok').onclick = () => done(); });
  }
  // more：{label, list} 先只列 list，按「更多」再展開 more.list
  function pick(title, list, render, cls, more) {
    const all = list.concat(more && more.list ? more.list : []);
    const btn = (x, i) => `<button type="button" data-i="${i}">${render(x)}</button>`;
    return step(`<h3 class="wd-h">${title}</h3><div class="wd-pick ${cls || ''}">${list.map(btn).join('')}</div>
      ${more && more.list && more.list.length ? `<div class="wd-acts wd-more"><button type="button" class="btn" id="wd-more">${esc(more.label)}（${more.list.length}）</button></div><div class="wd-pick ${cls || ''}" id="wd-morebox" hidden>${more.list.map((x, j) => btn(x, list.length + j)).join('')}</div>` : ''}`, (el, done) => {
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = e => { if (e.target.closest('.wd-peek')) return; done(all[+b.dataset.i]); });
      const mb = el.querySelector('#wd-more'); if (mb) mb.onclick = () => { el.querySelector('#wd-morebox').hidden = false; mb.parentNode.hidden = true; };
    });
  }

  /* ---- 句卡：說對的句子收進來（收集＝成長證明） ---- */
  function addCard(m) {
    const w = st(); if (!m || !m.jp) return false;
    // 說對一句＝統一進度記一次答對（第一次收集，或已到期該複習時）
    if (window.Learn && !SIM) { const id = Learn.idOf(m, 'phrase'), e = Learn.get(id); if (!e || (e.due || 0) <= Date.now()) Learn.record(id, 2, { src: 'world', item: { jp: m.jp, kana: m.kana || '', zh: m.zh || '', source: '冒險句卡' }, nosave: true }); }
    if (w.cards[m.jp]) { App.save(); return false; }
    w.cards[m.jp] = { jp: m.jp, kana: m.kana || '', zh: m.zh || '', r: S ? S.region : D ? D.region : '', s: S ? S.id : '', t: App.today() };
    App.save(); paintHud();
    App.toast(`🃏 新句卡：<span lang="ja">${esc(m.jp)}</span>`, 'ok');
    App.addXP(2, '說對一句・新句卡');   // 第一次收集到這張句卡才給（同一句不重複給）
    if (S) Q.on('card', {});
    return true;
  }
  const cardCount = r => Object.values(st().cards).filter(c => !r || c.r === r).length;
  function cardsSheet() {
    const list = Object.values(st().cards).reverse();
    const el = sheet(`<h3 class="wd-h">🃏 我的句卡 <small>${list.length} 張・說對一次就收進來，點一下再聽</small></h3>
      ${list.length ? `<div class="wd-cards">${list.map((c, i) => `<button type="button" class="wd-cd" data-i="${i}">${tx(c, true)}</button>`).join('')}</div>` : '<p class="muted center">還沒有句卡。跟店員說出第一句日文吧！</p>'}`);
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => App.speak(list[+b.dataset.i].jp));
  }

  /* ---- 句子組裝：說法切換（普通／です・ます／敬語）＋提示要自己點 ---- */
  const mk = (intent, slots) => style => Phrase.make(intent, slots, { style, lv: lv() });
  // 結帳說一句：です・ます時用單元教的「これください」當正解；これをください／これ(を)お願いします 也算對
  function thisModel(style) {
    const m = Phrase.make('this', {}, { style, lv: lv() });
    if (style === 'plain' || style === 'keigo') return m;
    const T = (jp, kana, zh) => ({ jp, kana: kana || jp, zh });
    const kore = T('これ', '', '這個'), wo = T('を', '', '（受詞）'), kuda = T('ください', '', '請給我'), one = T('お願いします', 'おねがいします', '麻煩了');
    const parts = li() === 0 ? [kore, kuda] : [kore, kuda, one];   // 詞塊就是單元教的「これください」（評審 v15 P1-9）
    const ends = parts.slice(1).map(p => p.jp);
    const accept = ends.flatMap(e => [['これ', e], ['これ', 'を', e]]);
    return { parts, accept, jp: 'これください。', kana: 'これください', zh: '我要這個（結帳）', extra: [], style: m.style, styles: m.styles };
  }
  function build(src, opt) {
    opt = opt || {};
    const make = typeof src === 'function' ? src : () => src;
    let model = make(st().style);
    const nX = li() <= 1 ? 1 : li() <= 3 ? 2 : 3;
    let tiles = [], seq = [], miss = 0;
    const tileH = (t, i, where) => {
      const z0 = zero(), r = z0 ? romaOf(t) : '';
      return `<button type="button" class="wd-tile" data-${where}="${i}"><b class="jp" lang="ja">${esc(t.jp)}</b>${(showKana() || z0) && t.kana && t.kana !== t.jp ? `<i lang="ja">${esc(t.kana)}</i>` : ''}${r ? `<i class="wd-r">${esc(r)}</i>` : ''}${z0 && t.zh ? `<i class="wd-tz">${esc(t.zh)}</i>` : ''}</button>`;
    };
    return step(`<div class="wd-build">
        <p class="wd-goal">🗣️ ${esc(opt.title || '用日文說')}：<b class="wd-zhg"></b></p>
        <div class="wd-styles" role="group" aria-label="說法"></div>
        <div class="wd-model" hidden></div>
        <div class="wd-line" aria-label="你的句子"></div>
        <div class="wd-bank"></div>
        <p class="wd-fb" role="status"></p>
        <div class="wd-acts"><button type="button" class="btn" id="wd-hint" hidden>💡 提示</button><button type="button" class="btn" id="wd-clr">↺ 重排</button><button type="button" class="btn primary" id="wd-say">🗣️ 說出來</button></div>
      </div>`, (el, done) => {
      focusMode(true);
      const fin = v => { focusMode(false); done(v); };
      const line = el.querySelector('.wd-line'), bank = el.querySelector('.wd-bank'), fb = el.querySelector('.wd-fb'), hint = el.querySelector('#wd-hint'), mdl = el.querySelector('.wd-model');
      const paint = () => {
        line.innerHTML = seq.length ? seq.map((t, i) => tileH(t, i, 's')).join('') : '<span class="wd-ph">點下面的詞塊，排成句子</span>';
        bank.innerHTML = tiles.map((t, i) => t.used ? `<span class="wd-tile gone"><b>${esc(t.jp)}</b></span>` : tileH(t, i, 'b')).join('');
        bank.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const t = tiles[+b.dataset.b]; t.used = true; seq.push(t); G.sfx('tap'); paint(); });
        line.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const t = seq.splice(+b.dataset.s, 1)[0]; t.used = false; paint(); });
      };
      const styles = () => {
        const box = el.querySelector('.wd-styles');
        if (!model.styles || SIM) { box.hidden = true; return; }
        box.innerHTML = '<small>說法</small>' + Phrase.STYLES.map(s => `<button type="button" data-st="${s.id}" class="${s.id === model.style ? 'on' : ''}" title="${esc(s.note)}">${esc(s.zh)}</button>`).join('');
        box.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { st().style = b.dataset.st; App.save(); reset(); App.toast(esc(Phrase.STYLES.find(s => s.id === b.dataset.st).note)); });
      };
      const reset = () => {
        model = make(st().style);
        const gl = j => (window.Phrase && Phrase.GLOSS && Phrase.GLOSS[j]) || '';
        // 零基礎、N5：干擾詞不放「あげます」（太刁鑽）
        tiles = App.shuffle(model.parts.map(p => ({ jp: p.jp, kana: p.kana, zh: p.zh || gl(p.jp) })).concat((model.extra || []).filter(e => li() > 1 || e.jp !== 'あげます').slice(0, nX).map(e => ({ jp: e.jp, kana: e.kana, zh: gl(e.jp) }))));
        seq = []; fb.textContent = ''; fb.className = 'wd-fb';
        el.querySelector('.wd-zhg').textContent = model.zh;
        mdl.hidden = true; mdl.innerHTML = `<small>參考答案</small>${tx({ jp: model.jp, kana: model.kana }, true)}`;
        hint.hidden = !(assist() === 'full' || miss >= 2);
        styles(); paint();
      };
      hint.onclick = () => { mdl.hidden = false; hint.hidden = true; App.speak(model.jp); };
      el.querySelector('#wd-clr').onclick = () => { seq.splice(0).forEach(t => { t.used = false; }); fb.textContent = ''; paint(); };
      el.querySelector('#wd-say').onclick = () => {
        const r = Phrase.check(model, seq.map(t => t.jp));
        if (r.ok) {
          App.speak(model.jp); G.sfx('ok'); G.bump('ok'); G.burst(line, 10); mood('happy');
          fb.className = 'wd-fb ok'; fb.textContent = '✓ ' + model.jp;
          el.querySelectorAll('button').forEach(b => { b.disabled = true; });
          simRec(model, miss ? (miss > 1 ? 0 : 1) : 2);
          addCard(model); Q.on('spoke', { model });
          setTimeout(() => fin(miss), 700);
        } else if (r.short) {   // 還沒排完：只提示，不算失誤、不收進不會清單
          fb.className = 'wd-fb'; fb.textContent = '👉 ' + r.fb;
        } else {
          miss++; mistake(); G.sfx('ng'); G.shake(); mood('puzzled', 'え？');
          if (!SIM) Tracker.add(item({ jp: model.jp, kana: model.kana, zh: model.zh }, S ? S.name : '冒險', 'phrase'), true);
          fb.className = 'wd-fb ng'; fb.textContent = '✗ ' + r.fb;
          if (miss >= 2 && mdl.hidden) hint.hidden = false;
        }
      };
      reset();
    });
  }
  const say = (intent, slots, opt) => build(mk(intent, slots), opt);

  /* ---- 店員問你問題：聽懂再回答（任務單只是參考，答別的也算數） ---- */
  function variant(a) {
    const n = a.v.length, i = li();
    const r = i <= 1 ? 0 : i === 2 ? Math.random() * Math.min(2, n) | 0 : i === 3 ? Math.random() * Math.min(3, n) | 0 : i === 4 ? 1 + (Math.random() * (n - 1) | 0) : Math.max(0, n - 1 - (Math.random() * 2 | 0));
    return { jp: a.v[Math.min(n - 1, r)][0], kana: a.v[Math.min(n - 1, r)][1], zh: a.zh };
  }
  function askQ(a, want, npc) {
    const line = variant(a);
    // shopSim：剛學的單元句優先當正解（例：温めてください 取代 はい、お願いします）
    const alt = SIM && SIM.alt && SIM.alt[a.id];
    const ans = alt ? a.a.map(x => x.val === alt.val ? Object.assign({}, x, alt.line) : x) : a.a;
    const opts = App.shuffle(ans.map(x => Object.assign({ ok: 1 }, x)).concat(a.bad.filter(x => !alt || x.jp !== alt.line.jp).map(x => Object.assign({ ok: 0 }, x))));
    const wantA = want != null ? ans.find(x => x.val === String(want)) : null;
    // shopSim：單元沒教過的問答，第一次出現時一律附讀音＋中文
    const taught = new Set(((SIM && SIM.items) || []).map(i => strip(i && i.jp)));
    const fresh = !!SIM && !alt && !ans.some(x => taught.has(strip(x.jp))) && !(SIM.seen || (SIM.seen = new Set())).has(a.id);
    if (fresh) SIM.seen.add(a.id);
    const T = o => tx(o, fresh);
    return step(`${fresh ? '<p class="wd-new">🆕 單元沒教過的句子：先看中文和讀音再選</p>' : ''}<div class="wd-npc">${faceHTML(npc)}<div class="wd-bub"><small>${esc(npc.who || '')}</small>${T(Object.assign({}, line, { zh: line.zh || a.zh }))}<button type="button" class="wd-spk" data-spk aria-label="再聽一次">🔊</button></div></div>${wantA ? `<p class="wd-need">📋 旅伴想要：<b>${esc(wantA.brief)}</b></p>` : ''}
      <div class="wd-opts">${opts.map((o, i) => `<button type="button" class="wd-opt" data-i="${i}">${T(o)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      const fb = el.querySelector('.wd-fb');
      let wrong = 0;
      el.querySelectorAll('.wd-opt').forEach(b => b.onclick = e => {
        if (e.target.closest('.wd-peek')) return;
        const o = opts[+b.dataset.i];
        if (!o.ok) {
          wrong++;
          b.disabled = true; b.classList.add('ng'); mistake(); G.sfx('ng'); G.shake(); mood('puzzled', 'え？');
          fb.className = 'wd-fb ng'; fb.textContent = '✗ ' + o.fb;
          if (SIM) simRec(line, 0);
          else Tracker.add(item({ jp: line.jp, kana: line.kana, zh: '店員問：' + a.zh }, S.name, 'phrase'), true);
          return;
        }
        simRec(o, wrong ? 1 : 2);
        b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); App.speak(o.jp); mood('happy');
        if (wantA && o.val !== wantA.val) { mistake(); fb.className = 'wd-fb'; fb.textContent = `✓ 日文正確（旅伴原本想要「${wantA.brief}」，沒關係）`; }
        el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
        setTimeout(() => done(o.val), 750);
      });
    });
  }
  /* ---- 聽店員回答，選出意思 ---- */
  function hear(npc, line, opts, title) {
    const list = App.shuffle(opts.map((t, i) => ({ t, ok: i === 0 })));
    const hide = assist() === 'none' || li() >= 3;
    return step(`<div class="wd-npc">${faceHTML(npc)}<div class="wd-bub"><small>${esc(npc.who || '')}</small><span class="wd-hid" ${hide ? '' : 'hidden'}>🔊 仔細聽…</span><span class="wd-shown" ${hide ? 'hidden' : ''}>${tx({ jp: line.jp, kana: line.kana })}</span><button type="button" class="wd-spk" data-spk aria-label="再聽一次">🔊</button></div></div>
      <p class="wd-goal">${esc(title || '店員說了什麼？')}</p>
      <div class="wd-opts">${list.map((o, i) => `<button type="button" class="wd-opt" data-i="${i}">${esc(o.t)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      const show = () => { el.querySelector('.wd-hid').hidden = true; el.querySelector('.wd-shown').hidden = false; };
      el.querySelectorAll('.wd-opt').forEach(b => b.onclick = () => {
        const o = list[+b.dataset.i];
        if (!o.ok) { b.disabled = true; b.classList.add('ng'); mistake(); simRec(line, 0); G.sfx('ng'); show(); return; }
        b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); show();
        el.querySelector('.wd-fb').className = 'wd-fb ok'; el.querySelector('.wd-fb').textContent = line.zh || '';
        el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
        setTimeout(() => done(), 900);
      });
    });
  }

  /* =========================================================
     店內：場景卡（背景＋店員＋熱點卡）＋下方對話面板
     ========================================================= */
  const zone = k => S.zones[k];
  const itemsIn = k => S.items.filter(i => i.zone === k);
  const counters = () => Object.keys(S.zones).filter(k => S.zones[k].type === 'counter');
  const keysOf = t => Object.keys(S.zones).filter(k => S.zones[k].type === t);
  const staff = k => Object.assign({ clerk: 1 }, (zone(k || counters()[0]) || {}).npc || { who: '店員', emoji: '🧑‍💼' });
  const inBasket = it => RUN.basket.find(b => b.it === it);
  const basketN = () => RUN.basket.reduce((a, b) => a + b.n, 0);
  const total = () => RUN.basket.filter(b => !b.paid).reduce((a, b) => a + b.it.price * b.n, 0);
  const tagsIn = () => new Set(RUN.basket.flatMap(b => b.it.tags || []));
  const asksFor = phase => S.asks.filter(a => a.phase === phase && (a.when === 'always' || tagsIn().has(a.when.slice(4))));
  const yen = n => '¥' + n.toLocaleString('en-US');
  function addDex(it) {
    const i = S.items.indexOf(it); if (i < 0) return;
    const d = st().dex[S.id] || (st().dex[S.id] = []);
    if (!d.includes(i)) { d.push(i); App.save(); }
  }
  function seeZone(k) {
    const w = st(); const cur = w.zones[S.id] || '';
    if (!cur.split(',').includes(String(k))) { w.zones[S.id] = cur ? cur + ',' + k : String(k); App.save(); }
    Q.on('visit', { zone: String(k) });
  }
  const lim = it => `限購 ${it.max} 件（<span lang="ja">お一人様${it.max === 1 ? '一点' : it.max + '点'}限り</span>）`;
  function addBasket(it, n, o) {
    const b = inBasket(it);
    const mx = it.max || 5;
    if (b) b.n = Math.min(mx, b.n + n); else RUN.basket.push(Object.assign({ it, n: Math.min(mx, n) }, o));
    addDex(it); G.sfx('coin'); paintHud(); Q.on('basket'); paintBar();
  }
  function paintHud() {
    if (!STAGE || !STAGE.isConnected) return;
    const b = STAGE.querySelector('#wd-bk'); if (b) { const n = RUN ? basketN() : 0; b.hidden = !n; b.innerHTML = `🧺<b>${n}</b>`; }
    const c = STAGE.querySelector('#wd-cards'); if (c) c.innerHTML = `🃏<b>${cardCount()}</b>`;
  }
  const zIcon = z => window.WorldArt ? WorldArt.zone(z) : esc(z.icon || '');
  const RANK = { counter: 0, shelf: 1, machine: 1, seat: 2, facility: 3, sign: 4 };
  function sceneHTML(s, only) {
    const bg = bgOf(s), ck = counters()[0], npc = staff(ck);
    const keys = Object.keys(s.zones).filter(k => !['deco', 'menu'].includes(s.zones[k].type) && (!only || only.includes(k))).sort((a, b) => (RANK[s.zones[a].type] || 0) - (RANK[s.zones[b].type] || 0));
    const card = k => { const z = s.zones[k]; return `<button type="button" class="wd-card t-${z.type}" data-z="${esc(k)}">${z.type === 'sign' ? signHTML(z, 'mini') : `<span class="e">${zIcon(z)}</span><b class="jp" lang="ja">${esc(z.jp)}</b>`}<small>${esc(z.zh || '')}</small></button>`; };
    return `<div class="wd-scene sc-${bg}">${artSVG(bg)}
      <button type="button" class="wd-clerk" id="wd-clerk" aria-label="跟${esc(npc.who)}說話">${clerkSVG(bg, s.id + npc.who, npc)}<span class="wd-tag">${esc(npc.who)}</span><span class="wd-say" hidden></span></button>
      <div class="wd-spots">${keys.map(card).join('')}</div></div>`;
  }
  const SCN = {
    pulse(k) {
      const c = STAGE && STAGE.querySelector(`.wd-card[data-z="${CSS.escape(String(k))}"]`); if (!c) return;
      c.classList.add('pulse'); c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      setTimeout(() => c.classList.remove('pulse'), 5200);
    }
  };

  /* ---- 店員開場語：依店的類型（車站、寺社、診所、飯店…） ---- */
  const isDestItem = it => (it.tags || []).includes('dest');
  const GREET = {
    station: { jp: 'どうされましたか。', kana: 'どうされましたか', zh: '請問有什麼需要嗎？' },
    shrine: { jp: 'こんにちは。', kana: 'こんにちは', zh: '你好。' },
    clinic: { jp: 'こんにちは。受付です。', kana: 'こんにちは。うけつけです', zh: '你好，這裡是掛號櫃台。' },
    hotel: { jp: 'いらっしゃいませ。チェックインでしょうか。', kana: 'いらっしゃいませ。チェックインでしょうか', zh: '歡迎光臨。請問是要辦入住嗎？' },
    ryokan: { jp: 'ようこそお越しくださいました。', kana: 'ようこそおこしくださいました', zh: '歡迎您的到來。' },
    airport: { jp: 'こんにちは。どうなさいましたか。', kana: 'こんにちは。どうなさいましたか', zh: '你好，請問需要什麼協助？' },
    info: { jp: 'こんにちは。観光案内所です。', kana: 'こんにちは。かんこうあんないじょです', zh: '你好，這裡是觀光服務處。' },
    ticket: { jp: 'こんにちは。チケットですか。', kana: 'こんにちは。チケットですか', zh: '你好，要買票嗎？' },
    shop: { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ', zh: '歡迎光臨。' }
  };
  function greetKind(s) {
    const bg = bgOf(s), id = s.id;
    if (s.scene === 'directions' || /kanko/.test(id)) return 'info';
    if (bg === 'station' || (s.items.some(isDestItem) && s.kind === 'service')) return 'station';
    if (bg === 'shrine' || /kiyomizu|sensoji/.test(id)) return 'shrine';
    if (s.scene === 'emergency' || /clinic/.test(id)) return 'clinic';
    if (bg === 'hotel') return 'hotel';
    if (bg === 'ryokan' && /ryokan/.test(id)) return 'ryokan';
    if (bg === 'airport') return 'airport';
    if (s.scene === 'directions' || /kanko/.test(id)) return 'info';
    if (s.kind === 'service' && /castle|aquarium|cosmo/.test(id)) return 'ticket';
    return 'shop';
  }
  const greetLine = () => GREET[greetKind(S)];
  // 「問店員」按鈕：依櫃台的人換稱呼（問站員、問櫃台、問寺務員…）
  const askWho = () => { const w = staff().who || '店員'; return w === '櫃台人員' ? '櫃台' : w; };

  /* ---- 店內首頁面板：店員開場＋3 個大按鈕＋馬上說一句＋今天想做的事 ---- */
  function primary() {
    if (S.kind === 'eat') { const sk = keysOf('seat')[0]; return sk ? ['🍽️', '入座點餐', RUN.toPay ? '吃飽了，去結帳' : '坐下來翻菜單', () => (RUN.toPay ? bill(counters()[0]) : sit(sk))] : null; }
    if (S.kind === 'service') {
      if (S.asks.some(a => a.phase === 'checkin')) return ['🛎️', '辦手續', '回答櫃台的問題', () => checkin(counters()[0])];
      const ck = counters().find(k => itemsIn(k).length); return ck ? ['🛒', '跟櫃台要東西', '用說的買', () => itemsSheet(ck)] : null;
    }
    const sh = keysOf('shelf').concat(keysOf('machine')); return sh.length ? ['🛒', '買東西', '逛貨架，放進籃子', () => itemsSheet(sh[0], sh)] : null;
  }
  // 「⚡馬上說一句」：依店輪替（設施、貨架、商品的位置），每天換、說過一次也換
  function quickLine() {
    const pool = locTargets().filter(t => !(t.it && isDestItem(t.it)));
    if (!pool.length) return null;
    const zs = pool.filter(t => !t.it), list = zs.length >= 2 ? zs : pool;
    const w = st(), qn = (w.qn || (w.qn = {}))[S.id] || 0;
    return list[(hash(App.today() + S.id) + qn) % list.length];
  }
  function shopHome() {
    if (SIM) return simHome();
    if (!S || !STAGE || !STAGE.isConnected) return;
    const npc = staff(), p = primary(), q = quickLine(), greet = !RUN.greeted, z0 = zero();
    const line = greetLine();
    const big = [p, ['💬', '問' + askWho(), '自己組句子開口問', () => clerkSheet(counters()[0])], ['👀', '看看店裡', '規矩、區域、看板', infoSheet]].filter(Boolean);
    const qq = q ? Phrase.make('where', { x: q.it || q.x }, { style: st().style, lv: lv() }) : null;
    const el = sheet(`${bubble(npc, line)}
      ${qq ? `<button type="button" class="wd-quick" id="wd-quick"><span>⚡</span><span><small>馬上說一句${z0 ? `：${esc(qq.zh)}` : ''}</small><b lang="ja">${esc(qq.jp)}</b>${z0 ? `<i class="wd-k" lang="ja">${esc(qq.kana)}</i><i class="wd-r">${esc(romaOf(qq))}</i>` : ''}</span></button>` : ''}
      <div class="wd-big">${big.map((b, i) => `<button type="button" data-b="${i}"><span>${b[0]}</span><b>${esc(b[1])}</b><small>${esc(b[2])}</small></button>`).join('')}</div>
      ${Q.goals(S)}
      <div class="wd-acts wd-leave"><button type="button" class="btn" id="wd-leave">🚪 離開</button></div>`, { home: 1 });
    bindSpk(el, line);
    if (greet) { RUN.greeted = true; App.speak(line.jp); }
    el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => big[+b.dataset.b][3]());
    const qb = el.querySelector('#wd-quick'); if (qb) qb.onclick = () => { const w = st(); w.qn[S.id] = (w.qn[S.id] || 0) + 1; App.save(); talk('where', counters()[0], q); };
    Q.bindGoals(el);
    el.querySelector('#wd-leave').onclick = leaveShop;
  }

  /* ---- 商品面板：貨架／券売機／菜單／櫃台商品 ---- */
  const KIND_BTN = { shelf: '🧺 放進籃子', machine: '💴 投幣購買', menu: '📝 加入點單', counter: '🗣️ 跟店員要' };
  function itemsSheet(key, tabs) {
    if (SIM) {   // 只列目標需要的區域與品項（加少量干擾）
      const zs = simZones();
      if (zs.length && !zs.includes(key)) key = zs[0];
      tabs = zs.length > 1 ? zs : null;
    }
    const z = zone(key), list = itemsIn(key).filter(it => !SIM || SIM.show.has(it));
    let sel = null, n = 1;
    const eat = S.kind === 'eat' && z.type === 'menu';
    const el = sheet(`${tabs && tabs.length > 1 ? `<div class="wd-tabs">${tabs.map(k => `<button type="button" data-tab="${esc(k)}" class="${k === key ? 'on' : ''}">${esc(zone(k).icon)} <span lang="ja">${esc(zone(k).jp)}</span></button>`).join('')}</div>` : ''}
      <div class="wd-zh"><span class="wd-zi">${esc(z.icon || '')}</span>${tx(z)}<button type="button" class="wd-spk" id="wd-zs" aria-label="聽">🔊</button></div>
      <div class="wd-items">${list.map((it, i) => `<button type="button" class="wd-it${it.soldOut ? ' sold' : ''}" data-i="${i}"><span class="e">${esc(it.emoji)}</span><b class="jp" lang="ja">${esc(it.jp)}</b>${showKana() && it.kana !== it.jp ? `<i lang="ja">${esc(it.kana)}</i>` : ''}${zero() && romaOf(it) ? `<i class="wd-r">${esc(romaOf(it))}</i>` : ''}<i class="z">${esc(it.zh)}</i><span class="p">${it.soldOut ? '<s>' + yen(it.price) + '</s> <b lang="ja">売り切れ</b>' : it.price ? yen(it.price) : '無料'}</span><em hidden></em></button>`).join('')}</div>
      <div class="wd-foot"><div class="wd-sel" hidden></div>
      <div class="wd-acts wd-order"><span id="wd-on"></span>${eat ? `<button type="button" class="btn primary" id="wd-call">🙋 すみません！<small>叫店員點餐</small></button>` : z.type === 'shelf' ? `<button type="button" class="btn primary" id="wd-pay">🧾 去結帳</button>` : ''}</div></div>`);
    el.querySelector('#wd-zs').onclick = () => App.speak(z.jp);
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => itemsSheet(b.dataset.tab, tabs));
    const call = el.querySelector('#wd-call'); if (call) call.onclick = () => orderFlow();
    const pay = el.querySelector('#wd-pay'); if (pay) pay.onclick = () => (RUN.basket.length ? checkout(counters()[0]) : App.toast('籃子還是空的，先點商品'));
    const marks = () => {
      el.querySelectorAll('.wd-it').forEach((b, i) => { const k = inBasket(list[i]), em = b.querySelector('em'); em.hidden = !k; em.textContent = k ? '×' + k.n : ''; });
      const on = el.querySelector('#wd-on'); if (on) on.textContent = RUN.basket.length ? `${S.kind === 'eat' ? '點單' : '籃子'} ${basketN()} 件・${yen(total())}` : '';
    };
    const box = el.querySelector('.wd-sel');
    const show = () => {
      const it = sel, cnt = Phrase.count(it.c, n);
      box.hidden = false;
      if (it.soldOut) {   // 看板寫賣完的品項：不能點，店員說賣完了
        const sp = Phrase.spoken(it), line = { jp: `申し訳ございません、${sp.jp}は売り切れました。`, kana: `もうしわけございません、${sp.kana}はうりきれました`, zh: `不好意思，${it.zh.replace(/（.*$/, '')}賣完了，請點別的。` };
        box.innerHTML = `<div class="wd-sel-t"><span class="e">${esc(it.emoji)}</span><div>${tx(line, true)}</div></div>`;
        App.speak(line.jp); return;
      }
      box.innerHTML = `<div class="wd-sel-t"><span class="e">${esc(it.emoji)}</span><div>${tx(it, true)}</div>${SIM ? '' : App.trackBtn(item(it, S.name), true)}</div>
        <div class="wd-sel-a"><button type="button" class="wd-qb" data-q="-1" aria-label="減少">−</button><span class="wd-qn"><b lang="ja">${esc(cnt.jp)}</b><i lang="ja">${esc(cnt.kana)}</i>${zero() ? `<i class="wd-r">${esc(roma(cnt.kana, cnt.jp))}</i>` : ''}</span><button type="button" class="wd-qb" data-q="1" aria-label="增加">＋</button>
        <button type="button" class="btn primary" id="wd-add">${KIND_BTN[z.type] || '選這個'}</button></div>`;
      box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (+b.dataset.q > 0 && n >= (it.max || 5)) return App.toast(lim(it)); n = Math.max(1, Math.min(it.max || 5, n + +b.dataset.q)); show(); App.speak(Phrase.count(it.c, n).kana); });
      box.querySelector('#wd-add').onclick = () => {
        if (z.type === 'machine') return vend(it, n, key);
        if (z.type === 'counter') { addBasket(it, n, { toSay: true }); if (SIM && simMissing().length) { App.toast(`${esc(it.emoji)} <span lang="ja">${esc(it.jp)}</span> ×${n}`); return simNext(); } return checkout(key); }
        addBasket(it, n, { held: z.type === 'shelf', toSay: z.type !== 'shelf' });
        App.toast(`${esc(it.emoji)} <span lang="ja">${esc(it.jp)}</span> ×${n}`); marks();
      };
    };
    el.querySelectorAll('.wd-it').forEach(b => b.onclick = () => { sel = list[+b.dataset.i]; n = 1; if (!sel.soldOut) App.speak(sel.jp); addDex(sel); el.querySelectorAll('.wd-it').forEach(x => x.classList.toggle('on', x === b)); show(); });
    marks();
    seeZone(key);
  }
  const vend = flow(async (it, n, key) => {
    const price = it.price * n; let put = 0;
    await step(`<h3 class="wd-h">${esc(zone(key).icon)} <span lang="ja">${esc(zone(key).jp)}</span></h3>
      <div class="wd-vend"><div class="wd-vend-s"><span class="e">${esc(it.emoji)}</span>${tx(it, true)}<b>${yen(price)}</b></div>
      <p class="wd-goal">投入金額 <b id="wd-put">¥0</b>（<span lang="ja">お金を入れてください</span>）</p>
      <div class="wd-coins">${[1000, 500, 100, 50, 10].map(c => `<button type="button" data-c="${c}">${yen(c)}</button>`).join('')}</div>
      <div class="wd-acts"><button type="button" class="btn" id="wd-ret" lang="ja">おつり・返却</button><button type="button" class="btn primary" id="wd-buy" disabled>🎫 按下按鈕</button></div></div>`, (el, done) => {
      const paint = () => { el.querySelector('#wd-put').textContent = yen(put); el.querySelector('#wd-buy').disabled = put < price; };
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { put += +b.dataset.c; G.sfx('coin'); paint(); });
      el.querySelector('#wd-ret').onclick = () => { put = 0; paint(); };
      el.querySelector('#wd-buy').onclick = () => done();
    });
    addBasket(it, n, { held: true, paid: true });
    const ch = put - price;
    App.toast(`🎫 <span lang="ja">${esc(it.jp)}</span> ×${n}${ch ? `・おつり ${yen(ch)}` : ''}`, 'ok');
    Q.on('vend');
    if (SIM) { simRec(it, 2, 'vocab'); }
    if (SIM) { if (simCheck()) return; if (!simMissing().some(x => zone(x.it.zone).type === 'machine')) return simHome(); }
    itemsSheet(key, keysOf('machine'));
  });
  function basketSheet() {
    const paint = () => {
      const el = sheet(`<h3 class="wd-h">🧺 ${S.kind === 'eat' ? '點單' : '籃子'}</h3>
        ${RUN.basket.length ? `<div class="wd-bl">${RUN.basket.map((b, i) => `<div class="wd-br"><span class="e">${esc(b.it.emoji)}</span><div>${tx(b.it, true)}</div><span class="wd-bq"><button type="button" class="wd-qb" data-d="${i}" aria-label="減少">−</button><b>${b.n}</b><button type="button" class="wd-qb" data-u="${i}" aria-label="增加">＋</button></span><span class="p">${b.paid ? '已付' : yen(b.it.price * b.n)}</span></div>`).join('')}</div>
        <p class="wd-total">合計 <b>${yen(total())}</b></p>
        <div class="wd-acts"><button type="button" class="btn primary" id="wd-go">${S.kind === 'eat' ? '🙋 叫店員點餐' : '🧾 去結帳'}</button></div>` : '<p class="muted center">還是空的。點上面的貨架挑東西吧。</p>'}`);
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const x = RUN.basket[+b.dataset.d]; if (x.paid) return App.toast('已經付錢的不能退'); if (--x.n <= 0) RUN.basket.splice(+b.dataset.d, 1); paintHud(); paintBar(); paint(); });
      el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const x = RUN.basket[+b.dataset.u]; if (x.paid) return; if (x.n >= (x.it.max || 5)) return App.toast(lim(x.it)); x.n++; paintHud(); paintBar(); paint(); });
      const go = el.querySelector('#wd-go'); if (go) go.onclick = () => (S.kind === 'eat' ? (RUN.toPay ? bill(counters()[0]) : orderFlow()) : checkout(counters()[0]));
    };
    paint();
  }

  // 店內 📖：依店型開手冊分類（scene 對應手冊分類；沒有 scene 的店依 kind／id 推）
  function pbCat(S) {
    if (S.pb) return S.pb;
    if (S.scene) return S.scene;
    if (S.kind === 'eat') return 'eat';
    if (S.kind === 'store') return 'shop';
    const id = S.id || '';
    return /hotel|ryokan|onsen/.test(id) ? 'stay' : /bus|skyliner|rentacar|station|airport|sim|train/.test(id) ? 'move' : 'see';
  }
  /* ---- 流程：問句、賣完、付款 ---- */
  async function runAsks(phase, npc) {
    for (const a of asksFor(phase)) RUN.vals[a.id] = await askQ(a, pref(a.id), npc);
  }
  const orderLine = list => ({
    jp: list.map(b => Phrase.spoken(b.it).jp + 'を' + Phrase.count(b.it.c, b.n).jp).join('と、') + 'ですね。かしこまりました。',
    kana: list.map(b => Phrase.spoken(b.it).kana + 'を' + Phrase.count(b.it.c, b.n).kana).join('と、') + 'ですね。かしこまりました',
    zh: list.map(b => `${b.it.zh} ${b.n} 份`).join('、') + '對嗎？好的。'
  });
  async function incident(list, npc) {   // 程度 n3 以上偶爾遇到：賣完了，要改點（內容變化，不是門檻）
    if (SIM || li() < 3 || RUN.incident || !list.length || Math.random() < 0.5) return;
    const b = list[Math.random() * list.length | 0];
    const alts = App.shuffle(itemsIn(b.it.zone).filter(i => i !== b.it && !i.soldOut && !inBasket(i))).slice(0, 3);
    if (!alts.length) return;
    RUN.incident = true;
    const sp = Phrase.spoken(b.it);
    await npcSay(npc, li() >= 4
      ? { jp: `申し訳ございません、${sp.jp}はただいま売り切れでございます。`, kana: `もうしわけございません、${sp.kana}はただいまうりきれでございます`, zh: `非常抱歉，${b.it.zh}目前賣完了。` }
      : { jp: `すみません、${sp.jp}は売り切れです。`, kana: `すみません、${sp.kana}はうりきれです`, zh: `不好意思，${b.it.zh}賣完了。` });
    const alt = await pick('賣完了！改點哪一個？', alts, it => `<span class="e">${esc(it.emoji)}</span>${tx(it)}`, 'wd-items3');
    await say('instead', { items: [{ it: alt, n: b.n }] }, { title: '改點別的' });
    Q.swap(b.it, alt); b.it = alt; addDex(alt); paintHud(); paintBar();
    lead(npc, { jp: 'かしこまりました。', kana: 'かしこまりました', zh: '好的。' });
  }
  async function payTotal(npc) {
    const t = total();
    if (t > 0) {
      const y = Phrase.yen(t), line = { jp: `お会計は${y.jp}です。`, kana: `おかいけいは${y.kana}です`, zh: `一共 ${y.zh}。` };
      if (li() === 0) lead(npc, line, `<p class="wd-total">合計 <b>${yen(t)}</b></p>`);
      else {
        const d = t >= 1000 ? [100, 1000] : [10, 100];
        const wrong = App.shuffle([t + d[0], Math.max(10, t - d[0]), t + d[1], t + d[0] * 3]).filter((x, i, a) => x !== t && a.indexOf(x) === i).slice(0, 2);
        await hear(npc, line, [t].concat(wrong).map(yen), '要付多少錢？');
      }
    }
    G.sfx('coin');
    await npcSay(npc, { jp: 'ありがとうございました。', kana: 'ありがとうございました', zh: '謝謝光臨。' });
  }
  function finishPurchase() {
    const bought = RUN.basket.slice();
    bought.forEach(b => addDex(b.it));
    if (SIM) bought.forEach(b => SIM.got.set(b.it, (SIM.got.get(b.it) || 0) + b.n));
    RUN.basket = []; RUN.served = false; RUN.toPay = false; RUN.incident = false;
    const vals = RUN.vals; RUN.vals = {};
    paintHud(); closeSheet();
    Q.on('bought', { items: bought, vals });
    paintBar();
    if (SIM) simCheck();
  }
  // shopSim：任務品項還沒拿齊就結帳／點餐 → 提示「還差：綠茶」並帶回去拿
  function simLack() {
    if (!SIM) return false;
    const m = simMissing(); if (!m.length) return false;
    const el = sheet(`<div class="wd-note"><p class="wd-miss-l">還差：${m.map(n => `${esc(n.it.emoji)} ${esc(String(n.it.zh || '').replace(/（.*$/, ''))}${n.n - (SIM.got.get(n.it) || 0) - inB(n.it) > 1 ? ' ×' + (n.n - (SIM.got.get(n.it) || 0) - inB(n.it)) : ''}`).join('、')}</p>
      <p>${m.map(n => `<span lang="ja">${esc(n.it.jp)}</span>`).join('、')}還沒放進${S.kind === 'eat' ? '點單' : '籃子'}，先回去拿。</p></div>
      <div class="wd-acts"><button type="button" class="btn primary" id="wd-back">${S.kind === 'eat' ? '📖 回去點' : '🧺 回去拿'} ➜</button></div>`);
    el.querySelector('#wd-back').onclick = () => itemsSheet(m[0].it.zone);
    return true;
  }
  const checkout = flow(async key => {
    const npc = staff(key);
    if (!RUN.basket.length) return clerkSheet(key);
    if (simLack()) return;
    await Q.checkBasket();
    const sayL = RUN.basket.filter(b => b.toSay && !b.paid);
    if (!SIM || !RUN.greeted) lead(npc, greetLine());   // 實戰進店時已打過招呼，結帳不再重複
    if (sayL.length) {
      await say('want', { items: sayL }, { title: '跟店員說你要的' });
      await incident(sayL, npc);
      lead(npc, orderLine(RUN.basket.filter(b => b.toSay && !b.paid)));
    } else if (RUN.basket.some(b => !b.paid)) {
      // 貨架拿的東西：把籃子放上櫃台，也要開口說一句
      await build(thisModel, { title: '把籃子放上櫃台，跟店員說' });
      lead(npc, { jp: 'はい、お預かりします。', kana: 'はい、おあずかりします', zh: '好的，我來幫您結帳。' });
    }
    if (SIM && S.kind !== 'eat') await runAsks('order', npc);   // 櫃台品項的追問（房號、送到房間、座位…）
    if (total() > 0) { await runAsks('pay', npc); await payTotal(npc); }
    else await npcSay(npc, { jp: 'はい、どうぞ。', kana: 'はい、どうぞ', zh: '好的，請用。' });
    finishPurchase();
  });
  const menuKeys = () => keysOf('menu');
  const sit = flow(async key => {
    const npc = staff();
    seeZone(key);
    if (S.kind !== 'eat') return facilitySheet(key);
    if (RUN.toPay) return note('🍽️ 已經吃飽了。按「入座點餐」旁的結帳，或點收銀台說「お会計」。');
    if (!RUN.entered) {
      lead(npc, { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ', zh: '歡迎光臨。' });
      await runAsks('enter', npc);
      RUN.entered = true; Q.on('entered');
      await npcSay(npc, { jp: 'こちらのお席へどうぞ。', kana: 'こちらのおせきへどうぞ', zh: '這邊請坐。' });
    }
    const mk2 = menuKeys();
    if (mk2.length) itemsSheet(mk2[0], mk2);
    else {
      const mach = keysOf('machine');
      const el = sheet(`<h3 class="wd-h">${esc(zone(key).icon)} <span lang="ja">${esc(zone(key).jp)}</span></h3><p class="muted center">${RUN.basket.length ? '餐券準備好了，交給店員吧。' : '這間店要先到券売機買餐券。'}</p><div class="wd-acts">${mach.length && !RUN.basket.length ? '<button type="button" class="btn" id="wd-m">🎫 去券売機</button>' : ''}<button type="button" class="btn primary" id="wd-call" ${RUN.basket.length ? '' : 'disabled'}>🎫 把餐券交給店員</button></div>`);
      el.querySelector('#wd-call').onclick = () => orderFlow();
      const m = el.querySelector('#wd-m'); if (m) m.onclick = () => itemsSheet(mach[0], mach);
    }
  });
  const orderFlow = flow(async () => {
    const npc = staff();
    if (!RUN.basket.length) return App.toast('先選好要點的東西');
    if (simLack()) return;
    await Q.checkBasket();
    const sayL = RUN.basket.filter(b => !b.paid);
    if (sayL.length) {
      await say('call', {}, { title: '叫店員過來' });
      lead(npc, { jp: 'はい、ご注文をどうぞ。', kana: 'はい、ごちゅうもんをどうぞ', zh: '好的，請點餐。' });
      await say('want', { items: sayL }, { title: '點餐' });
      await incident(sayL, npc);
      lead(npc, orderLine(RUN.basket.filter(b => !b.paid)));
    } else lead(npc, { jp: '食券をお預かりします。', kana: 'しょっけんをおあずかりします', zh: '收您的餐券。' });
    await runAsks('order', npc);
    lead(npc, { jp: '少々お待ちください。', kana: 'しょうしょうおまちください', zh: '請稍等。' });
    RUN.basket.forEach(b => addDex(b.it));
    await npcSay(npc, { jp: 'お待たせしました。ごゆっくりどうぞ。', kana: 'おまたせしました。ごゆっくりどうぞ', zh: '讓您久等了，請慢用。' }, `<p class="wd-serve">${RUN.basket.map(b => esc(b.it.emoji)).join(' ')}</p>`);
    RUN.served = true; if (SIM) SIM.served = true; Q.on('served');
    if (!sayL.length) return finishPurchase();
    RUN.toPay = true; closeSheet(); paintBar();
    App.toast('🍽️ ごちそうさまでした！按「入座點餐」去結帳', 'ok');
  });
  const bill = flow(async key => {
    const npc = staff(key);
    await say('bill', {}, { title: '結帳' });
    await runAsks('pay', npc);
    await payTotal(npc);
    finishPurchase();
  });
  const checkin = flow(async key => {
    const npc = staff(key);
    lead(npc, greetLine());
    for (const a of S.asks.filter(a => a.phase === 'checkin')) RUN.vals[a.id] = await askQ(a, pref(a.id), npc);
    // 車站類：問過目的地 → 最後報票價、付款
    const dest = RUN.vals.dest && S.items.find(i => i.id === RUN.vals.dest);
    if (dest && dest.price > 0) {
      const ppl = { 1: 1, 2: 2, 3: 2.5 }[RUN.vals.people] || 1, trip = RUN.vals.oneway === 'round' ? 2 : 1;
      const fare = Math.round(dest.price * ppl * trip / 10) * 10;
      const keep = RUN.basket; RUN.basket = [{ it: Object.assign({}, dest, { price: fare }), n: 1 }];
      const vals0 = RUN.vals; await runAsks('pay', npc); await payTotal(npc);
      RUN.basket = keep; RUN.vals = vals0;
      addDex(dest);
    } else await npcSay(npc, { jp: 'かしこまりました。ありがとうございます。', kana: 'かしこまりました。ありがとうございます', zh: '好的，謝謝您。' });
    const vals = RUN.vals; RUN.vals = {};
    if (SIM) SIM.checked = true;
    closeSheet(); Q.on('checkin', { vals }); paintBar();
    if (SIM) simCheck();
  });

  /* ---- 自由對話：問位置、有沒有、多少錢、拜託、可不可以、問資訊 ---- */
  const locTargets = () => {
    const out = [];
    Object.keys(S.zones).forEach(k => { const z = S.zones[k]; if (z.loc && z.type !== 'counter') out.push({ id: 'z:' + k, zone: k, x: z, emoji: z.icon }); });
    S.items.forEach(it => { const z = S.zones[it.zone]; if (z && z.loc) out.push({ id: 'i:' + it.id, zone: it.zone, x: it, emoji: it.emoji, it }); });
    return out;
  };
  // 問「有沒有／多少錢」只列實體物品（目的地、加值這類不列）
  const askItems = intent => S.items.filter(it => !isDestItem(it) && !(it.tags || []).includes('charge') && (intent !== 'price' || it.price > 0));
  const goItems = () => S.items.filter(it => isDestItem(it) && it.price > 0);
  const locLine = t => {
    const z = S.zones[t.zone], sp = t.it ? Phrase.spoken(t.it) : { jp: t.x.jp, kana: t.x.kana };
    return { jp: `${sp.jp}は、${z.loc.jp}`, kana: `${sp.kana}は、${z.loc.kana}`, zh: `${t.x.zh}${z.loc.zh}。` };
  };
  const talk = flow(async (intent, key, preset) => {
    const npc = staff(key);
    const pickIt = async (title, list) => preset || await pick(title, list, t => `<span class="e">${esc(t.emoji || '')}</span>${tx(t.x || t)}`, 'wd-items3');
    let id = '';
    if (intent === 'where') {
      // 先只列區域（≤8 個），商品收在「更多商品」
      const all = locTargets().filter(t => !(t.it && isDestItem(t.it))), zs = all.filter(t => !t.it);
      const first = zs.slice(0, 8), rest = zs.slice(8).concat(all.filter(t => t.it));
      const t = preset || await pick('想問什麼在哪裡？', first.length ? first : rest, t => `<span class="e">${esc(t.emoji || '')}</span>${tx(t.x || t)}`, 'wd-items3', first.length ? { label: '更多商品', list: rest } : null); id = t.id;
      await say('where', { x: t.it || t.x });
      await npcSay(npc, locLine(t));
      SCN.pulse(t.zone);
    } else if (intent === 'go') {
      const t = await pickIt('想去哪裡？', goItems().map(it => ({ id: 'i:' + it.id, x: it, it, emoji: it.emoji, zone: it.zone }))); id = t.id;
      await say('go', { x: t.it });
      const z = S.zones[t.zone] || {}, sp = Phrase.spoken(t.it), y = Phrase.yen(t.it.price);
      await npcSay(npc, { jp: `${sp.jp}までは${y.jp}です。${z.jp}でお求めください。`, kana: `${sp.kana}までは${y.kana}です。${z.kana || z.jp}でおもとめください`, zh: `到${t.it.zh}是 ${y.zh}，請在${z.zh || '那邊'}購買。` });
      SCN.pulse(t.zone); addDex(t.it);
    } else if (intent === 'have' || intent === 'price') {
      const t = await pickIt(intent === 'have' ? '想問有沒有什麼？' : '想問什麼的價錢？', askItems(intent).map(it => ({ id: 'i:' + it.id, x: it, it, emoji: it.emoji, zone: it.zone }))); id = t.id;
      await say(intent, { x: t.it });
      if (intent === 'have') {
        const z = S.zones[t.zone];
        await npcSay(npc, z.loc ? { jp: `はい、ございます。${z.loc.jp}`, kana: `はい、ございます。${z.loc.kana}`, zh: `有的。${z.loc.zh}。` } : { jp: 'はい、ございます。', kana: 'はい、ございます', zh: '有的。' });
      } else {
        const y = Phrase.yen(t.it.price);
        await npcSay(npc, t.it.price ? { jp: `${y.jp}です。`, kana: `${y.kana}です`, zh: `${y.zh}。` } : { jp: '無料です。', kana: 'むりょうです', zh: '免費。' });
      }
      addDex(t.it);
    } else {
      const src = { act: S.acts, may: S.may, info: S.info }[intent] || [];
      const a = preset || await pick({ act: '想拜託店員做什麼？', may: '想問可不可以做什麼？', info: '想問什麼？' }[intent], src, x => `<i class="wd-z">${esc((x.q || x).zh)}</i>`, 'wd-list');
      id = a.id;
      await say(intent, intent === 'info' ? { q: a.q } : { a });
      await npcSay(npc, a.re);
    }
    const r = Q.on('said', { intent, id });
    if (!STAGE || !STAGE.isConnected || !S) return;
    if (r === 'close') closeSheet(); else if (r !== 'keep') clerkSheet(key);
  });

  /* ---- 面板：店員、設施、看板 ---- */
  function clerkSheet(key) {
    const z = zone(key) || {}, npc = staff(key);
    const own = key ? itemsIn(key) : [];
    const acts = [];
    if (S.kind === 'eat' && RUN.toPay) acts.push(['bill', '🧾', 'お会計', '結帳']);
    else if (RUN.basket.length && S.kind !== 'eat') acts.push(['checkout', '🧾', '結帳', `籃子裡 ${basketN()} 件`]);
    if (S.asks.some(a => a.phase === 'checkin')) acts.push(['checkin', '🛎️', '辦手續', '回答櫃台的問題']);
    if (own.length) acts.push(['own', '🛒', '櫃台的東西', '用說的跟店員要']);
    Q.clerkExtra(key).forEach(x => acts.push(x));
    const el = sheet(`<div class="wd-zh">${faceHTML(npc)}${tx({ jp: z.jp || npc.who, kana: z.kana, zh: z.zh || npc.who })}</div>
      ${acts.length ? `<div class="wd-main">${acts.map(([id, ic, t, s]) => `<button type="button" class="wd-mb${id[0] === '!' ? ' quest' : ''}" data-a="${esc(id)}"><span>${ic}</span><b>${esc(t)}</b><small>${esc(s || '')}</small></button>`).join('')}</div>` : ''}
      <p class="wd-sub">💬 開口問${esc(npc.who || '店員')}（自己組句子）</p>
      <div class="wd-ints">${Phrase.INTENTS.filter(i => i.id !== 'want' && (i.id !== 'act' || (S.acts || []).length) && (i.id !== 'may' || (S.may || []).length) && (i.id !== 'info' || (S.info || []).length)
        && (i.id !== 'go' || goItems().length) && (!['have', 'price'].includes(i.id) || askItems(i.id).length)).map(i => `<button type="button" data-t="${i.id}"><span>${i.icon}</span><b>${esc(i.zh)}</b>${zero() ? `<small>${esc(i.hz || i.hint)}</small>` : `<small lang="ja">${esc(i.hint)}</small>`}</button>`).join('')}</div>`);
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => talk(b.dataset.t, key));
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'checkout') checkout(key); else if (a === 'bill') bill(key); else if (a === 'checkin') checkin(key); else if (a === 'own') itemsSheet(key);
      else { const x = Q.clerkExtra(key).find(e => e[0] === a); if (x && x[4]) x[4](); }
    });
    if (key) seeZone(key);
  }
  function facilitySheet(key, zz, src) {
    const z = zz || zone(key), isSign = z.type === 'sign';
    const el = sheet(`${isSign ? `<div class="wd-signbox">${signHTML(z)}</div>` : `<div class="wd-zh"><span class="wd-zi">${esc(z.icon || '')}</span></div>`}
      <div class="wd-fac">${tx(z, true)}<button type="button" class="wd-spk" data-spk aria-label="聽">🔊</button></div>
      ${z.note ? `<p class="wd-tip">💡 ${esc(z.note)}</p>` : ''}${z.tip ? `<p class="wd-tip">💡 ${esc(z.tip)}</p>` : ''}
      ${z.loc ? `<p class="wd-tip">📍 ${tx(z.loc, true)}</p>` : ''}${z.hours ? `<p class="wd-tip">🕒 ${tx(z.hours, true)}</p>` : ''}
      <div class="wd-acts">${S && z.loc ? `<button type="button" class="btn" id="wd-ask">📍 問店員在哪裡</button>` : ''}${App.trackBtn(item(z, src || (S ? S.name : D.name)))}</div>`);
    bindSpk(el, z); App.speak(z.jp);
    const ask = el.querySelector('#wd-ask'); if (ask) ask.onclick = () => talk('where', counters()[0], { id: 'z:' + key, zone: key, x: z });
    if (!zz) seeZone(key);
  }
  function openZone(key) {
    const z = zone(key); if (!z) return;
    if (SIM && z.type === 'counter') return simNext();
    if (z.type === 'shelf' || z.type === 'machine') itemsSheet(key, keysOf(z.type));
    else if (z.type === 'counter') (RUN.basket.length && S.kind !== 'eat' && !RUN.toPay ? checkout : RUN.toPay ? bill : clerkSheet)(key);
    else if (z.type === 'seat') sit(key);
    else facilitySheet(key);
  }
  function infoSheet() {
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(S.icon)}</span>${tx(S, true)}</div><p>${esc(S.desc)}</p>
      <h3 class="wd-h">🎌 這種店的規矩</h3><ul class="wd-tips">${S.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h3 class="wd-h">🗺️ 店內有什麼 <small>點一下過去看看</small></h3><div class="wd-legend">${Object.keys(S.zones).filter(k => !['deco', 'menu'].includes(S.zones[k].type)).map(k => `<button type="button" data-z="${esc(k)}">${S.zones[k].type === 'sign' ? signHTML(S.zones[k], 'mini') : `<span>${zIcon(S.zones[k])}</span>`}${tx(S.zones[k], true)}</button>`).join('')}</div>
      <div class="wd-acts"><button type="button" class="btn" id="wd-board">🎯 挑戰（選做）</button></div>`);
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = e => { if (e.target.closest('.wd-peek')) return; openZone(b.dataset.z); });
    el.querySelector('#wd-board').onclick = () => Q.board();
  }
  function renderShop(el, shop, d) {
    S = shop; D = d;
    RUN = { basket: [], vals: {}, entered: false, served: false, toPay: false, incident: false, greeted: false };
    stage(el, `<div class="wd-title"><b lang="ja">${esc(S.jp)}</b><small>${esc(S.icon)} ${esc(S.name)}・${esc(d.name)}</small></div>
      <button type="button" class="wd-hb" id="wd-pb" aria-label="會話手冊快查">📖</button><button type="button" class="wd-hb" id="wd-bk" hidden></button><button type="button" class="wd-hb" id="wd-cards" aria-label="我的句卡"></button>`, 'wd-shop');
    STAGE.querySelector('#wd-pb').onclick = () => App.go('phrasebook', { cat: pbCat(S) });
    STAGE.querySelector('.wd-box').innerHTML = sceneHTML(S);
    STAGE.querySelectorAll('.wd-card').forEach(b => b.onclick = () => openZone(b.dataset.z));
    STAGE.querySelector('#wd-clerk').onclick = () => clerkSheet(counters()[0]);
    STAGE.querySelector('#wd-bk').onclick = basketSheet;
    STAGE.querySelector('#wd-cards').onclick = cardsSheet;
    MAP = { pulse: SCN.pulse, pos: () => [0, 0], comps: [], goObj: openZone, fit() { }, stop() { } };
    paintHud(); Q.enter(S); paintBar(); STAGE._fit();
    shopHome();
  }
  function leaveShop() {
    Q.leave();
    if (fromDistrict) { fromDistrict = false; App.back(); } else App.go('play', { r: PARAMS.r, d: D.id });
  }

  /* =========================================================
     shopSim：活動框架的 shop 活動 — 直接進店、只顯示完成子目標需要的區域與按鈕
     World.shopSim(el, {shop, goal, items}) → Promise<{results:[{id, grade, item}], meta}>
     goal：委託 id（'night' 或 'q-night'）｜'checkin'｜'rand'｜{id?, title?, items:[[品項id, 數量]], prefs:{問句id: val}, checkin?}
     未指定 goal：依 items（Learn.view 陣列）挑重疊最多的委託，否則第一個未完成的委託
     不呼叫 Learn.record；說對的句子、答錯的店員問句放進 results，由 runner 統一記
     ========================================================= */
  const regionOfShop = id => W.regions.find(r => (r.shops || []).some(x => x[1] === id));
  function loadShop(id) {
    if (W.shops[id]) return Promise.resolve(W.shops[id]);
    const R = regionOfShop(id); if (!R) return Promise.reject(new Error('找不到店家 ' + id));
    return loadRegion(R.id).then(() => W.shops[id] || Promise.reject(new Error('找不到店家 ' + id)));
  }
  // 單元句 → 店員問句的回答：{問句id: {val, line:{jp,kana,zh}}}
  // 只比對「句子開頭的主詞」（第一個漢字詞／片假名詞）＋肯定否定語氣，不另建字典；對不上就維持原本的回答
  const strip = t => String(t || '').replace(/[。、！？!?\s]/g, '');
  const head = t => (String(t || '').match(/[一-鿿々]+|[ァ-ヺー]{2,}/) || [''])[0];
  const isQ = t => /[か？?]$/.test(strip(t)) || /[か？?][。]?$/.test(String(t || '').trim());
  const isNeg = t => /(いりません|いらないです|要りません|結構です|大丈夫です)$/.test(strip(t));
  const isPos = t => /(ください|お願いします|下さい)$/.test(strip(t));
  function unitAlt(s, items) {
    const out = {};
    const list = (items || []).filter(i => i && i.jp && (!i.type || i.type === 'phrase') && !isQ(i.jp));
    if (!list.length) return out;
    const used = new Set();
    s.asks.forEach(a => {
      const yn = a.a.some(o => o.val === 'yes') || a.a.some(o => o.val === 'no');
      const qh = head(a.v[0] && a.v[0][0]);
      for (const it of list) {
        if (used.has(it)) continue;
        const ih = head(it.jp), neg = isNeg(it.jp);
        // 1) 回答就在單元句裡（例：塩でお願いします ⊂ タンは塩でお願いします），或開頭主詞相同（例：窓側の席をお願いします）
        let x = a.a.find(o => !isQ(o.jp) && isNeg(o.jp) === neg && ((strip(o.jp).length >= 4 && strip(it.jp).includes(strip(o.jp))) || (ih.length >= 2 && head(o.jp) === ih)));
        // 2) 要／不要型的問句：問句主詞＝單元句主詞（温めますか ↔ 温めてください、袋はご利用ですか ↔ 袋はいりません）
        if (!x && yn && qh && qh === ih) x = neg ? a.a.find(o => o.val === 'no') : isPos(it.jp) ? a.a.find(o => o.val === 'yes') : null;
        if (x) { out[a.id] = { val: x.val, line: { jp: it.jp, kana: it.kana || '', zh: it.zh || x.zh } }; used.add(it); break; }
      }
    });
    return out;
  }
  // 任務和單元句（alt）是否矛盾：任務條件相反；或單元句說「只有大人」而任務要買小孩票
  const KID = /kodomo|child|kid|shogaku|小人|子供|子ども|小学生|兒童|小孩/;
  function questConflict(s, x, alt) {
    if (!alt) return false;
    for (const k in alt) {
      if (x.prefs && x.prefs[k] != null && String(x.prefs[k]) !== String(alt[k].val)) return true;
      const a = (s.asks || []).find(z => z.id === k), o = a && a.a.find(z => z.val === alt[k].val);
      const said = ((o && o.jp) || '') + ' ' + ((alt[k].line && alt[k].line.jp) || '');
      const adultOnly = /大人だけ|子(?:供|ども)はいません/.test(said) || (/^大人.{1,3}人です/.test(said.trim()) && !KID.test(said));
      if (adultOnly && x.items.some(([id]) => { const it = s.items.find(i => i.id === id); return KID.test(id + ' ' + ((it && (it.jp + it.zh)) || '')); })) return true;
    }
    return false;
  }
  function simGoal(s, goal, items, alt) {
    const qs = s.quests || [], byId = id => s.items.find(i => i.id === id);
    const zt = it => (s.zones[it.zone] || {}).type;
    const ckAsks = s.asks.filter(a => a.phase === 'checkin');
    let q = null, g = null;
    if (goal && typeof goal === 'object') g = goal;
    else if (goal === 'checkin' && ckAsks.length) g = { id: 'checkin', checkin: 1 };
    else if (goal === 'rand') g = { id: 'rand' };
    else if (goal) q = qs.find(x => x.id === goal || 'q-' + x.id === goal) || null;
    if (!g && !q && qs.length) {
      let cand = qs;
      if (items && items.length) {
        const txt = items.map(i => (i && (i.jp || '') + ' ' + (i.zh || '')) || '').join(' ');
        const hit = x => { const tg = new Set(x.items.flatMap(([id]) => (byId(id) || {}).tags || [])); return s.asks.filter(a => alt && alt[a.id] && (a.when === 'always' || tg.has(String(a.when).slice(4)))).length; };
        const sc = x => x.items.filter(([id]) => { const it = byId(id); return it && (txt.includes(it.jp) || txt.includes(it.zh)); }).length + hit(x);
        const best = Math.max(...qs.map(sc));
        if (best > 0) cand = qs.filter(x => sc(x) === best);
      }
      // 和單元句衝突的任務不選（例：單元教「大人だけです」，就不配「兩大一小」；任務自帶條件和單元句相反也不選）
      const ok = cand.filter(x => !questConflict(s, x, alt));
      if (ok.length) cand = ok; else if (alt && Object.keys(alt).length) cand = [];
      if (cand.length) q = cand.find(x => !App.stars(`w:${s.id}:q-${x.id}`)) || cand[hash(App.today() + s.id) % cand.length];
    }
    if (!g && !q) g = ckAsks.length ? { id: 'checkin', checkin: 1 } : { id: 'rand' };
    const icon = s.kind === 'eat' ? '🍽️' : s.kind === 'service' ? '🛎️' : '🛍️';
    let o;
    if (q) o = { id: 'q-' + q.id, title: q.title, icon, msg: q.zh, jpMsg: { jp: q.jp, kana: q.kana }, needs: q.items.map(([id, n]) => ({ it: byId(id), n })), prefs: Object.assign({}, q.prefs) };
    else if (g.checkin) {
      const prefs = {}; ckAsks.forEach(a => { prefs[a.id] = a.a[Math.random() * a.a.length | 0].val; });
      o = { id: 'checkin', title: g.title || '辦手續', icon: '📝', msg: g.msg || '到櫃台辦手續，照旅伴的條件回答。', needs: [], prefs: Object.assign(prefs, g.prefs || {}), checkin: 1 };
    } else if (g.items) o = { id: g.id || 'sim', title: g.title || '採買任務', icon, msg: g.msg || '', needs: g.items.map(([id, n]) => ({ it: byId(id), n: n || 1 })), prefs: Object.assign({}, g.prefs || {}), checkin: g.checkin ? 1 : 0 };
    else {   // 隨機：1–2 樣
      const hasM = s.items.some(i => zt(i) === 'machine');
      let pool = s.kind === 'eat' ? s.items.filter(i => zt(i) === (hasM ? 'machine' : 'menu')) : s.kind === 'service' ? s.items.filter(i => zt(i) === 'counter' || zt(i) === 'machine') : s.items.filter(i => zt(i) !== 'menu');
      pool = pool.filter(i => !i.soldOut && !(i.tags || []).includes('dest'));
      if (!pool.length) pool = s.items.filter(i => !i.soldOut);
      o = { id: 'rand', title: s.kind === 'eat' ? '今天吃什麼' : '臨時採買', icon: '🎲', msg: '旅伴傳來一張清單。', needs: App.sample(pool, Math.min(pool.length, li() >= 1 ? 2 : 1)).map(it => ({ it, n: 1 })), prefs: {} };
    }
    o.needs = o.needs.filter(n => n.it && !(s.kind === 'eat' && zt(n.it) === 'counter'));
    if (!o.needs.length && !o.checkin && ckAsks.length) o.checkin = 1;
    o.key = /^(q-|checkin$|rand$)/.test(o.id) ? `w:${s.id}:${o.id}` : '';
    // 單元句對到的問句：旅伴的條件改成單元句那一邊（例：袋はいりません → 不要袋子）
    let changed = false;
    Object.keys(alt || {}).forEach(k => { if (o.prefs[k] == null || String(o.prefs[k]) !== String(alt[k].val)) changed = true; o.prefs[k] = alt[k].val; });
    if (changed) { o.msg = o.needs.length ? '旅伴傳來清單：買齊下面的東西，店員問的時候用剛學的句子回答。' : '到櫃台辦手續，店員問的時候照旅伴的條件、用剛學的句子回答。'; o.jpMsg = null; }
    return o;
  }
  const simZones = () => [...new Set(SIM.goal.needs.map(n => n.it.zone))].filter(k => S.zones[k]);
  const inB = it => RUN.basket.filter(b => b.it === it).reduce((a, b) => a + b.n, 0);
  const paidB = it => RUN.basket.filter(b => b.it === it && b.paid).reduce((a, b) => a + b.n, 0);
  const simMissing = () => SIM.goal.needs.filter(n => (SIM.got.get(n.it) || 0) + inB(n.it) < n.n);
  const simHave = n => (SIM.got.get(n.it) || 0) + paidB(n.it) >= n.n;
  function simComplete() {
    const g = SIM.goal;
    if (g.checkin && !SIM.checked) return false;
    if (!g.needs.every(simHave)) return false;
    if (S.kind === 'eat' && g.needs.length) return !!SIM.served && !RUN.toPay;
    return !RUN.basket.some(b => !b.paid);
  }
  function simCheck() {
    if (!SIM || SIM.done || !simComplete()) return false;
    SIM.done = true;
    const stars = SIM.miss === 0 ? 3 : SIM.miss <= 2 ? 2 : 1, g = SIM.goal;
    if (g.key) { try { App.reward(g.key, stars, `${S.name}・${g.title}`); } catch (e) { } }
    G.sfx('win');
    sheet(`<div class="wd-sim-done"><p class="wd-sim-st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><h3>✓ ${esc(g.title)}　完成！</h3><p class="muted">${SIM.miss ? `失誤 ${SIM.miss} 次` : '零失誤！'}</p></div>`, { home: 1 });
    const fin = SIM.finish;
    setTimeout(() => fin({ done: true, stars }), 1200);
    return true;
  }
  // 下一步：[icon, 文字, fn]
  function simNext(run) {
    const g = SIM.goal, ck = counters()[0];
    let r = null;
    if (S.kind === 'eat') {
      const miss = simMissing(), mm = miss.filter(n => zone(n.it.zone).type === 'machine'), seat = keysOf('seat')[0];
      if (RUN.toPay) r = ['🧾', '吃飽了，結帳', () => bill(ck)];
      else if (mm.length) r = ['🎫', '去券売機買餐券', () => itemsSheet(mm[0].it.zone)];
      else if (!RUN.entered) r = ['🍽️', '進店入座', () => sit(seat)];
      else if (miss.length) r = ['📖', '翻菜單點餐', () => itemsSheet(miss[0].it.zone)];
      else if (RUN.basket.length && !RUN.served) r = ['🙋', '叫店員點餐', () => orderFlow()];
    } else {
      const miss = simMissing();
      if (g.checkin && !SIM.checked) r = ['🛎️', '到櫃台辦手續', () => checkin(ck)];
      else if (miss.length) {
        const t = zone(miss[0].it.zone).type;
        r = [t === 'machine' ? '🎫' : t === 'counter' ? '🗣️' : '🧺', t === 'machine' ? '去機器購買' : t === 'counter' ? '跟店員要' : '去貨架拿', () => itemsSheet(miss[0].it.zone)];
      } else if (RUN.basket.some(b => !b.paid)) r = ['🧾', '去結帳', () => checkout(ck)];
    }
    if (run === false) return r;
    if (r) r[2](); else if (!simCheck()) simHome();
    return r;
  }
  function simHome() {
    if (!SIM || !S || !STAGE || !STAGE.isConnected || SIM.done) return;
    const g = SIM.goal, nx = simNext(false), greet = !RUN.greeted, line = greetLine();
    const briefs = S.asks.filter(a => g.prefs[a.id] != null).map(a => a.a.find(x => x.val === String(g.prefs[a.id]))).filter(Boolean);
    const chip = (t, ok) => `<span class="wd-chip${ok ? ' ok' : ''}">${ok ? '✓ ' : ''}${t}</span>`;
    const jpOnly = assist() === 'none' && g.jpMsg;
    const el = sheet(`${greet ? bubble(staff(), line) : ''}
      <div class="wd-sim-goal"><p class="wd-sim-t">${g.icon} <b>${esc(g.title)}</b></p>
        ${jpOnly ? `<p class="wd-sim-m">${tx(g.jpMsg)}</p>` : g.msg ? `<p class="wd-sim-m">${esc(g.msg)}</p>` : ''}
        ${g.needs.length ? `<div class="wd-chips">${g.needs.map(n => chip(`${esc(n.it.emoji)} <span lang="ja">${esc(n.it.jp)}</span> ×${n.n}`, simHave(n) || (SIM.got.get(n.it) || 0) + inB(n.it) >= n.n)).join('')}</div>` : ''}
        ${briefs.length ? `<p class="wd-sub">店員問的時候，旅伴想要：</p><div class="wd-chips">${briefs.map(b => chip(esc(b.brief))).join('')}</div>` : ''}
        ${g.checkin ? `<div class="wd-chips">${chip('辦好手續', SIM.checked)}</div>` : ''}</div>
      ${nx ? `<div class="wd-acts"><button type="button" class="btn primary wd-sim-go" id="wd-sim-go"><span>${nx[0]}</span> ${esc(nx[1])} ➜</button></div>` : ''}`, { home: 1 });
    if (greet) { RUN.greeted = true; App.speak(line.jp); bindSpk(el, line); }
    const b = el.querySelector('#wd-sim-go'); if (b) b.onclick = () => simNext();
  }
  function shopSim(el, opt) {
    opt = opt || {};
    return new Promise(resolve => {
      const id = typeof opt.shop === 'string' ? opt.shop : opt.shop && opt.shop.id;
      el.innerHTML = '<p class="center muted wd-wait">🚃 移動中…</p>';
      let tick = 0, my = null;
      const finish = meta => {
        if (!my || my.closed) return; my.closed = true;
        clearInterval(tick);
        if (pending) { const r = pending; pending = null; r(ABORT); }
        if (window.speechSynthesis) speechSynthesis.cancel();
        focusMode(false);
        // 中途離開（✕ 離開、頂列 ←、換頁）：不回報任何結果、不算完成；任務完成後才交出結果
        const ok = !!(my.done || (meta && meta.done));
        const res = ok ? my.res.map(r => ({ id: r.id, grade: r.grade, item: r.item })) : [];
        const out = { results: res, meta: Object.assign({ shop: id, goal: my.goal.id, title: my.goal.title, mistakes: my.miss }, meta || {}, { done: ok }) };
        if (SIM === my) { SIM = null; S = null; RUN = null; }
        resolve(out);
      };
      if (SIM && SIM.finish) SIM.finish({ left: true });
      loadShop(id).then(shop => {
        if (!el.isConnected) return resolve({ results: [], meta: { shop: id, done: false } });
        const d = W.districts[(regionOfShop(id) || { shops: [] }).shops.find(x => x[1] === id)[0]] || Object.values(W.districts).find(x => x.region === shop.region) || { id: '', name: '', region: shop.region };
        S = shop; D = d; MAP = null; PARAMS = { r: shop.region, d: d.id, s: shop.id };
        RUN = { basket: [], vals: {}, entered: false, served: false, toPay: false, incident: false, greeted: false };
        const alt = unitAlt(shop, opt.items);
        my = SIM = { alt, items: opt.items || [], seen: new Set(), goal: simGoal(shop, opt.goal, opt.items, alt), res: [], miss: 0, got: new Map(), checked: false, served: false, done: false, closed: false, finish: m => finish(m) };
        // 品項面板只列：目標品項＋每區 2 個干擾
        const show = new Set(SIM.goal.needs.map(n => n.it));
        simZones().forEach(k => itemsIn(k).filter(it => !show.has(it) && !it.soldOut).slice(0, 2).forEach(it => show.add(it)));
        SIM.show = show;
        Q.enter(S);
        // 離開鍵只有一個：活動框架的「✕ 離開」（或頂列 ←）；店內不再放 ✕
        stage(el, `<div class="wd-title"><b lang="ja">${esc(S.jp)}</b><small>${esc(S.icon)} ${esc(S.name)}・${esc(d.name || '')}</small></div>`, 'wd-shop wd-sim');
        // 面板的 ✕ 在實戰裡只是「回任務清單」，改成 ↩ 免得和「✕ 離開」混淆
        const wx = STAGE.querySelector('.wd-x'); wx.textContent = '↩'; wx.setAttribute('aria-label', '回任務清單'); wx.title = '回任務清單';
        const box = STAGE.querySelector('.wd-box');
        box.innerHTML = sceneHTML(S, simZones().filter(k => S.zones[k].type !== 'counter'));
        box.querySelectorAll('.wd-card').forEach(b => b.onclick = () => openZone(b.dataset.z));
        STAGE.querySelector('#wd-clerk').onclick = () => simNext();
        MAP = { pulse: SCN.pulse, pos: () => [0, 0], comps: [], goObj: openZone, fit() { }, stop() { } };
        STAGE._fit();
        tick = setInterval(() => { if (!STAGE || !STAGE.isConnected || SIM !== my) finish({ done: false, left: true }); }, 1000);
        simHome();
      }).catch(e => { console.error(e); el.innerHTML = '<p class="center wd-wait">😵 載入失敗，請檢查網路後再試一次</p>'; resolve({ results: [], meta: { shop: id, done: false, error: String(e.message || e) } }); });
    });
  }

  /* ---------------- 店型分類（路線頁旅遊場景包用；不必載入地區資料） ---------------- */
  const SHOP_TYPES = {
    konbini: { name: '便利商店', icon: '🏪' }, restaurant: { name: '餐廳', icon: '🍱' }, ramen: { name: '拉麵與麵店', icon: '🍜' }, izakaya: { name: '居酒屋與燒肉', icon: '🏮' },
    cafe: { name: '咖啡與甜點', icon: '☕' }, drugstore: { name: '藥妝店', icon: '💊' }, shopping: { name: '購物', icon: '🛍️' }, market: { name: '市場與小吃', icon: '🐟' },
    transit: { name: '車站與交通', icon: '🚉' }, airport: { name: '機場', icon: '✈️' }, hotel: { name: '飯店與溫泉', icon: '🏨' }, sight: { name: '觀光與寺社', icon: '⛩️' },
    medical: { name: '緊急醫療', icon: '🏥' }, rental: { name: '租車與租借', icon: '🚗' }
  };
  const TYPE_OF = {
    'ueno-konbini': 'konbini',
    'ueno-shokudo': 'restaurant', 'harajuku-sushi': 'restaurant', 'kyoto-yudofu': 'restaurant', 'osaka-okonomiyaki': 'restaurant', 'sapporo-soupcurry': 'restaurant', 'sapporo-ichiba': 'restaurant',
    'yokohama-ramen': 'ramen', 'naha-soba': 'ramen',
    'yokohama-izakaya': 'izakaya', 'shinjuku-yakiniku': 'izakaya', 'osaka-kushikatsu': 'izakaya', 'sapporo-genghis': 'izakaya',
    'harajuku-cafe': 'cafe', 'kyoto-kanmi': 'cafe',
    'ginza-drugstore': 'drugstore',
    'harajuku-clothes': 'shopping', 'shinjuku-denki': 'shopping', 'ginza-bungu': 'shopping', 'osaka-hyakkin': 'shopping', 'sapporo-omiyage': 'shopping',
    'asakusa-nakamise': 'market', 'kyoto-nishiki': 'market', 'osaka-kuromon': 'market', 'naha-makishi': 'market', 'ginza-depachika': 'market', 'yokohama-chukagai': 'market', 'osaka-takoyaki': 'market', 'motobu-michinoeki': 'market',
    'ueno-station': 'transit', 'narita-skyliner': 'transit', 'kyoto-bus': 'transit',
    'narita-airport': 'airport', 'narita-sim': 'airport',
    'ueno-hotel': 'hotel', 'kyoto-ryokan': 'hotel', 'niseko-onsen': 'hotel',
    'asakusa-sensoji': 'sight', 'kyoto-kiyomizu': 'sight', 'asakusa-kanko': 'sight', 'osaka-castle': 'sight', 'motobu-aquarium': 'sight', 'yokohama-cosmo': 'sight', 'shinjuku-karaoke': 'sight',
    'shinjuku-clinic': 'medical',
    'naha-rentacar': 'rental', 'niseko-rental': 'rental', 'motobu-marine': 'rental', 'asakusa-kimono': 'rental'
  };
  const stripIcon = t => String(t || '').replace(/^[^぀-鿿\w]+\s*/u, '').trim();
  // → {type: [{id, name, district, districtName, region, icon}]}；type 說明見 World.SHOP_TYPES
  function shopsByType() {
    const out = {};
    W.regions.forEach(r => (r.shops || []).forEach(([d, id, label]) => {
      const s = W.shops[id], t = TYPE_OF[id] || (s && s.kind === 'eat' ? 'restaurant' : s && s.kind === 'service' ? 'sight' : 'shopping');
      const [dl, sl] = String(label).split('・');
      (out[t] || (out[t] = [])).push({ id, name: s ? s.name : stripIcon(sl), district: d, districtName: stripIcon(dl), region: r.id, icon: s ? s.icon : (String(sl || '').split(' ')[0] || '') });
    }));
    return out;
  }
  // 該店必備句（玩家說的）＋店員問句，Learn.view 格式；需先載入地區資料（World.loadShop(id)），未載入回傳 []
  function shopPhrases(id) {
    const s = W.shops[id]; if (!s || !window.Phrase) return [];
    const o = { style: st().style, lv: lv() }, out = [], seen = new Set(), src = '🧳 ' + s.name;
    const pid = m => (window.Learn ? Learn.idOf({ jp: m.jp }, 'phrase') : 'p:' + m.jp);
    const add = (m, role, zh) => {
      if (!m || !m.jp) return; const i = pid(m); if (!i || seen.has(i)) return; seen.add(i);
      const v = { id: i, type: 'phrase', jp: m.jp, kana: m.kana || '', zh: zh || m.zh || '', role, source: src };
      const r = romaOf(v); if (r) v.romaji = r;
      out.push(v);
    };
    const mkp = (intent, slots) => { try { return Phrase.make(intent, slots, o); } catch (e) { return null; } };
    const isDest = it => (it.tags || []).includes('dest');
    const q = (s.quests || [])[0], qi = q ? q.items.map(([i]) => s.items.find(x => x.id === i)).filter(Boolean) : [];
    const first = qi[0] || s.items.find(i => !i.soldOut);
    if (first) add(mkp('want', { items: [{ it: first, n: 1 }] }), 'say');
    if (s.kind === 'eat') { add(mkp('call', {}), 'say'); add(mkp('bill', {}), 'say'); } else if (s.kind === 'store') add(mkp('this', {}), 'say');
    const fac = Object.values(s.zones).find(z => z.type === 'facility' && z.loc); if (fac) add(mkp('where', { x: fac }), 'say');
    const pit = s.items.find(i => i.price > 0 && !isDest(i) && !(i.tags || []).includes('charge')); if (pit) add(mkp('price', { x: pit }), 'say');
    const dst = s.items.find(i => isDest(i) && i.price > 0); if (dst) add(mkp('go', { x: dst }), 'say');
    if ((s.may || [])[0]) add(mkp('may', { a: s.may[0] }), 'say');
    if ((s.info || [])[0]) add(s.info[0].q, 'say');
    out.splice(6);
    s.asks.slice().sort((a, b) => (a.when === 'always' ? 0 : 1) - (b.when === 'always' ? 0 : 1)).slice(0, 3).forEach(a => add({ jp: a.v[0][0], kana: a.v[0][1] }, 'clerk', '店員問：' + a.zh));
    return out;
  }

  /* =========================================================
     街區：格子地圖（店面立面＋看板，不用新 emoji）；首次進入只出底部提示列
     ========================================================= */
  function placeInfo(p) {
    if (p.type === 'shop') {
      const s = W.shops[p.shop]; if (!s) return { icon: '🚧', label: '準備中' };
      return { html: `<span class="fc nr-${bgOf(s)}"><i></i><span>${esc(s.icon)}</span></span>`, label: s.name, badge: Q.shopBadge(s, true) };
    }
    if (p.type === 'sign') return { html: `<span class="sg">${signHTML(p, 'mini')}</span>`, aria: p.zh };
    return { icon: p.icon, label: p.type === 'npc' ? '' : p.name, aria: p.name };
  }
  const gateSheet = flow(async () => {
    const R = regionOf(D.region), ds = R.order.map(id => W.districts[id]).filter(Boolean);
    const el = sheet(`<h3 class="wd-h">🚉 要去哪裡？<small lang="ja">どこへ行きますか</small></h3>
      <div class="wd-pick wd-list">${ds.map(d => `<button type="button" data-d="${esc(d.id)}" ${d.id === D.id ? 'disabled' : ''}><span class="e">${esc(d.icon)}</span><span class="wd-tx"><b>${esc(d.name)}</b><i class="wd-k" lang="ja">${esc(d.jp)}（${esc(d.kana)}）</i><i class="wd-z">${d.id === D.id ? '目前所在地' : esc(d.desc)}</i></span></button>`).join('')}
      <button type="button" data-d=""><span class="e">🗾</span><span class="wd-tx"><b>日本地圖</b><i class="wd-z">換一個地區（全部開放）</i></span></button></div>`);
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (b.dataset.d) App.go('play', { r: D.region, d: b.dataset.d }); else App.go('play', { map: 1 }); });
  });
  function spotSheet(key, p) {
    const k = D.id + ':' + key, got = st().spots[k];
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(p.icon)}</span>${tx({ jp: p.jp, kana: p.kana, zh: p.name }, true)}<button type="button" class="wd-spk" id="wd-s1" aria-label="聽">🔊</button></div>
      <p class="wd-tip">💡 ${esc(p.tip)}</p>
      ${p.say ? `<div class="wd-sayb"><small>在這裡用得到的一句話</small>${tx(p.say, true)}<div class="wd-acts"><button type="button" class="wd-spk" id="wd-s2" aria-label="聽">🔊</button>${App.trackBtn(item(p.say, D.name, 'phrase'), true)}</div></div>` : ''}
      <div class="wd-acts"><button type="button" class="btn primary" id="wd-photo" ${got ? 'disabled' : ''}>${got ? '📸 已打卡' : '📸 打卡（+3 XP）'}</button></div>`);
    el.querySelector('#wd-s1').onclick = () => App.speak(p.jp);
    const s2 = el.querySelector('#wd-s2'); if (s2) s2.onclick = () => App.speak(p.say.jp);
    el.querySelector('#wd-photo').onclick = e => { st().spots[k] = 1; App.save(); G.sfx('coin'); G.burst(e.target, 14); App.addXP(3, `打卡 ${p.name}`); spotSheet(key, p); };
    App.speak(p.jp);
  }
  function npcSheet(key, p) {
    const npc = { who: p.name, emoji: p.icon }, line = p.lines[Math.random() * p.lines.length | 0];
    const ex = Q.npcExtra(key, p);
    const el = sheet(`${bubble(npc, line)}<div class="wd-main">${ex.map(([id, ic, t, s]) => `<button type="button" class="wd-mb quest" data-a="${esc(id)}"><span>${ic}</span><b>${esc(t)}</b><small>${esc(s || '')}</small></button>`).join('')}</div>`);
    App.speak(line.jp); bindSpk(el, line);
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const x = ex.find(e => e[0] === b.dataset.a); if (x) x[4](); });
  }
  function enterShop(id) {
    if (!W.shops[id]) return App.toast('🚧 這間店還在準備中');
    if (MAP && MAP.pos) st().pos[D.id] = MAP.pos();
    App.save();
    fromDistrict = true; App.go('play', { r: D.region, d: D.id, s: id });
  }
  function openPlace(key) {
    const p = D.places[key]; if (!p) return;
    if (Q.on('place', { key, p }) === 'stop') return;
    if (p.type === 'shop') enterShop(p.shop);
    else if (p.type === 'gate') gateSheet();
    else if (p.type === 'spot') spotSheet(key, p);
    else if (p.type === 'sign') facilitySheet(key, Object.assign({ type: 'sign' }, p), D.name);
    else if (p.type === 'npc') npcSheet(key, p);
  }
  function districtInfo() {
    const keys = Object.keys(D.places);
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(D.icon)}</span>${tx({ jp: D.jp, kana: D.kana, zh: D.name }, true)}</div><p>${esc(D.desc)}</p>
      <h3 class="wd-h">🏪 這一區的店 <small>點一下直接進去</small></h3><div class="wd-legend">${keys.filter(k => D.places[k].type === 'shop' && W.shops[D.places[k].shop]).map(k => { const s = W.shops[D.places[k].shop]; return `<button type="button" data-s="${esc(s.id)}"><span>${esc(s.icon)}</span><span class="wd-tx"><b>${esc(s.name)}</b><i class="wd-k" lang="ja">${esc(s.jp)}</i><i class="wd-z">${Q.shopBadge(s) || '還沒去過'}</i></span></button>`; }).join('')}</div>
      <h3 class="wd-h">📍 其他地點</h3><div class="wd-legend">${keys.filter(k => ['gate', 'spot', 'npc'].includes(D.places[k].type)).map(k => { const p = D.places[k]; return `<button type="button" data-z="${esc(k)}"><span>${esc(p.icon)}</span><span class="wd-tx"><b>${esc(p.name)}</b><i class="wd-k" lang="ja">${esc(p.jp)}</i></span></button>`; }).join('')}</div>`);
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => enterShop(b.dataset.s));
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { closeSheet(); MAP.goObj(b.dataset.z); });
  }
  function renderDistrict(el, d) {
    D = d; S = null; RUN = null;
    const w = st(); w.last[d.region] = d.id; w.lastRegion = d.region;
    stage(el, `<button type="button" class="wd-hb" id="wd-jp" aria-label="日本地圖">🗾</button>
      <div class="wd-title"><b lang="ja">${esc(d.jp)}</b><small>${esc(d.icon)} ${esc(regionOf(d.region).name)}・${esc(d.name)}</small></div>
      <button type="button" class="wd-hb" id="wd-cards" aria-label="我的句卡"></button><button type="button" class="wd-hb" id="wd-info" aria-label="這一區">ℹ️</button>`, 'wd-district');
    const objs = {};
    const A = window.WorldArt;   // 有插畫圖庫：建築、景點、路人畫在底圖，格子只負責點擊
    Object.keys(d.places).forEach(k => { const p = d.places[k], i = placeInfo(p); if (A && p.type !== 'sign') i.html = ''; objs[k] = Object.assign({ cls: 'p-' + p.type }, i); });
    const start = w.pos[d.id] && d.map[w.pos[d.id][1]] && '=.'.includes(d.map[w.pos[d.id][1]][w.pos[d.id][0]]) ? w.pos[d.id] : d.start;
    const box = STAGE.querySelector('.wd-box'); box.className = 'wd-box wd-mapwrap';
    STAGE._fit();
    MAP = buildMap(box, {
      rows: d.map, objs, start, walk: c => c === '=' || c === '.',
      cls: c => c === '=' ? 't-road' : c === '.' ? 't-walk' : c === '^' ? 't-green' : c === '~' ? 't-water' : c === '#' ? 't-bld' : 't-void',
      deco: (c, x, y) => c === '#' ? `<i class="win w${(x * 7 + y * 13) % 4}"></i>` : c === '^' ? `<i class="tree${(x + y) % 3 ? '' : ' s'}"></i>` : c === '~' ? '<i class="wave"></i>' : '',
      art: A ? () => A.district(d, W.shops) : null,
      onObj: openPlace, onMove: p => { w.pos[d.id] = p; }
    });
    w.pos[d.id] = start; App.save();
    STAGE.querySelector('#wd-info').onclick = districtInfo;
    STAGE.querySelector('#wd-jp').onclick = () => App.go('play', { map: 1 });
    STAGE.querySelector('#wd-cards').onclick = cardsSheet;
    paintHud(); Q.enter(null, d); paintBar();
  }

  /* ---------------- 推薦起點（依程度；不鎖任何東西） ---------------- */
  const REC = {
    zero: { r: 'tokyo', d: 'ueno', s: 'ueno-konbini', sub: '🏪 上野・便利商店：買水、問廁所' },
    n5: { r: 'tokyo', d: 'ueno', s: 'ueno-konbini', sub: '🏪 上野・便利商店：買東西、結帳' },
    n4: { r: 'tokyo', d: 'harajuku', s: 'harajuku-cafe', sub: '☕ 原宿・咖啡廳：點餐、客製' },
    n3: { r: 'tokyo', d: 'shinjuku', s: 'shinjuku-yakiniku', sub: '🥩 新宿・燒肉店：點餐、聽店員說明' },
    n2: { r: 'kyoto', d: 'higashiyama', s: 'kyoto-ryokan', sub: '🏮 京都・日式旅館：聽懂敬語' },
    n1: { r: 'kyoto', d: 'higashiyama', s: 'kyoto-ryokan', sub: '🏮 京都・日式旅館：聽懂敬語' }
  };

  /* ---------------- 路由 ---------------- */
  function render(el, params) {
    params = params || {};
    const w = st();
    if (SIM && SIM.finish) SIM.finish({ left: true });   // 從實戰直接換到自由逛：先結束上一場（不回報結果）
    if (pending) { pending = null; }
    S = null; D = null; RUN = null; MAP = null;
    focusMode(false);
    const fd = fromDistrict; fromDistrict = false;   // 只有剛從街區點進店才算「從街區來」
    // 不帶地區參數一律顯示日本地圖（不自動跳回上次位置；首頁「繼續冒險」才帶 {r,d,s}）
    if (params.map || !params.r) return World.mapPage(el);
    const r = params.r;
    el.innerHTML = '<p class="center muted wd-wait">🚃 移動中…</p>';
    loadRegion(r).then(() => {
      if (!el.isConnected) return;
      const R = regionOf(r);
      const d = W.districts[params.d] || W.districts[w.last[r]] || W.districts[R.order.find(id => W.districts[id])];
      if (!d) { el.innerHTML = '<div class="panel center"><h2>🚧 這個地區還在準備中</h2><button class="btn primary" id="wb">回日本地圖</button></div>'; el.querySelector('#wb').onclick = () => App.go('play', { map: 1 }); return; }
      const sid = params.s;
      const s = sid ? W.shops[sid] : null;
      PARAMS = { r, d: d.id, s: s ? s.id : null };
      w.at = Object.assign({ label: `${d.icon} ${d.name}${s ? '・' + s.icon + ' ' + s.name : ''}` }, PARAMS); App.save();
      if (s) { fromDistrict = fd; renderShop(el, s, d); } else renderDistrict(el, d);
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center wd-wait">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  App.register('play', { title: '冒險', icon: '🗾', nav: false, navParent: 'path', render });

  window.World = {
    _test: { unitAlt: (s, items) => unitAlt(s, items) },
    st, lv, li, assist, prof, shopSim, shopsByType, shopPhrases, loadShop, SHOP_TYPES, showKana, showZh, zero, romaOf, loadRegion, loadEvents, regionOf, Q, tx, item, REC, cardCount, bgOf, clerkSVG, signHTML,
    X: {
      get S() { return S; }, get D() { return D; }, get RUN() { return RUN; }, get MAP() { return MAP; }, get PARAMS() { return PARAMS; }, get STAGE() { return STAGE; },
      sheet, closeSheet, step, flow, note, pick, build, say, mk, askQ, hear, npcSay, bubble, bindSpk, paintBar, paintHud, staff, zone, itemsIn, counters, locTargets, locLine, talk, clerkSheet, signHTML, mood, shopHome, enterShop, openPlace, districtInfo, cardsSheet, addCard, ABORT, G
    }
  };
})();
