/* =========================================================
   冒險世界插畫圖庫 world-art.js（內嵌 SVG，無外部素材）
   扁平插畫風：街區地圖的地面／道路／建築／景點／路人、店內區域卡圖示、日本地圖地區徽章、玩家標記。
   大面積（地面、道路、水、草地）用 world.css 的 --wd-* token，跟著主題與深淺色；小物件用固定插畫色。
   依資料自動選圖：店（icon、scene、id）、place（type、icon、name）、zone（type、icon、jp、zh）。
   window.WorldArt = { district(d, shops), zone(z), region(id), seal(), pin(), me() }
   ========================================================= */
(function () {
  'use strict';
  const U = 100;   // 每格 100 單位
  const fa = c => /^(var|url)\(/.test(c) ? `style="fill:${c}"` : `fill="${c}"`;
  const sa = c => /^var\(/.test(c) ? `style="stroke:${c}"` : `stroke="${c}"`;
  const n = v => Math.round(v * 10) / 10;
  const R = (x, y, w, h, c, rx, ex) => w <= 0 || h <= 0 ? '' : `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${rx}"` : ''} ${fa(c)}${ex ? ' ' + ex : ''}/>`;
  const P = (d, c, ex) => `<path d="${d}" ${fa(c)}${ex ? ' ' + ex : ''}/>`;
  const L = (d, c, w, ex) => `<path d="${d}" fill="none" ${sa(c)} stroke-width="${w}"${ex ? ' ' + ex : ''}/>`;
  const C = (cx, cy, r, c, ex) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${fa(c)}${ex ? ' ' + ex : ''}/>`;
  const E = (cx, cy, rx, ry, c, ex) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${fa(c)}${ex ? ' ' + ex : ''}/>`;
  const OL = 'stroke="#2b2620" stroke-opacity=".28" stroke-width="2"';
  const shadow = (x, y, w) => E(x + w / 2, y, w / 2 + 2, 6, '#000', 'opacity=".16"');
  const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 7);
  const pick = (arr, h) => arr[h % arr.length];
  const g = (s, t) => `<g transform="${t}">${s}</g>`;

  /* ---------------- 單色圖示（24×24，給招牌、看板用） ---------------- */
  const GL = {
    cup: c => P('M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z', c) + L('M17 11h2a2.6 2.6 0 0 1 0 5.2h-2', c, 2) + L('M8 2.5c-1 1.8 1 2.8 0 4.6M12 2.5c-1 1.8 1 2.8 0 4.6', c, 1.6, 'stroke-linecap="round"'),
    bowl: c => P('M2.5 11h19a9.5 8 0 0 1-19 0z', c) + R(8, 19, 8, 2.5, c, 1) + L('M14 2.5 9 10M19 3l-7 7.5', c, 1.6, 'stroke-linecap="round"'),
    bento: c => R(3, 6, 18, 13, c, 2) + L('M12 7v11M4 12h8', '#000', 1.4, 'opacity=".35"') + C(16.5, 12.5, 2.2, '#000', 'opacity=".3"'),
    rice: c => P('M12 3 21 19H3z', c, 'stroke-linejoin="round"') + R(8, 13.5, 8, 5.5, '#000', 0, 'opacity=".4"'),
    sushi: c => R(3, 11, 18, 8, c, 4) + P('M3 12c3-5 15-5 18 0z', c, 'opacity=".7"') + R(10, 9, 4, 10, '#000', 0, 'opacity=".35"'),
    lantern: c => E(12, 13, 7, 8.5, c) + R(8, 3, 8, 2.5, c, 1) + R(8, 20.5, 8, 2.5, c, 1) + L('M5.4 10h13.2M5.4 16h13.2', '#000', 1.2, 'opacity=".3"'),
    cross: c => P('M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', c),
    shirt: c => P('M8 3 3 6l2 5 3-1.5V21h8V9.5L19 11l2-5-5-3c-.5 2-2 3-4 3s-3.5-1-4-3z', c),
    kimono: c => P('M7 3 2 7l2.5 4L7 9.8V21h10V9.8l2.5 1.2L22 7l-5-4-5 9z', c) + R(7, 13, 10, 2.5, '#000', 0, 'opacity=".35"'),
    bag: c => R(4, 8, 16, 13, c, 2) + L('M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10', c, 2),
    gift: c => R(3.5, 9, 17, 12, c, 1.5) + R(2.5, 6.5, 19, 4, c, 1) + R(11, 6.5, 2, 14.5, '#000', 0, 'opacity=".35"') + L('M12 6.5C10 2 6 3 7.5 6M12 6.5c2-4.5 6-3.5 4.5-.5', c, 1.8),
    train: c => R(5, 3, 14, 15, c, 4) + R(7.5, 6, 9, 5, '#000', 1, 'opacity=".35"') + C(9, 14.5, 1.3, '#000', 'opacity=".4"') + C(15, 14.5, 1.3, '#000', 'opacity=".4"') + L('M8 18 6 22M16 18l2 4', c, 1.8),
    plane: c => P('M12 2c1 0 1.6 1 1.6 2.2V9l8 4.6v2.2l-8-2.4v4.6l2.4 1.8V22L12 21l-4 1v-2.2l2.4-1.8v-4.6l-8 2.4v-2.2l8-4.6V4.2C10.4 3 11 2 12 2z', c),
    bed: c => R(2.5, 12, 19, 5.5, c, 1.5) + R(2.5, 8, 3, 13, c, 1) + R(6.5, 9, 6, 3.5, c, 1.5) + R(19, 17, 2.5, 4, c),
    bus: c => R(4, 3, 16, 16, c, 3) + R(6, 6, 12, 5.5, '#000', 1, 'opacity=".35"') + C(8.5, 15, 1.3, '#000', 'opacity=".4"') + C(15.5, 15, 1.3, '#000', 'opacity=".4"') + R(6, 19, 3, 3, c) + R(15, 19, 3, 3, c),
    car: c => P('M3 13l2.5-6h13L21 13v5H3z', c) + R(6.5, 8.5, 11, 4, '#000', 1, 'opacity=".3"') + C(7, 18, 2.4, c) + C(17, 18, 2.4, c) + C(7, 18, 1, '#000', 'opacity=".4"') + C(17, 18, 1, '#000', 'opacity=".4"'),
    fish: c => P('M2 12c4-6 11-6 15 0-4 6-11 6-15 0zM17 12l5-4.5v9z', c) + C(6.5, 11, 1.2, '#000', 'opacity=".45"'),
    octo: c => P('M5 12a7 7 0 0 1 14 0v2c0 1 1 2 2.5 2.5-1.5 1.5-3.5 1-4.5-.5l-.5 4.5-2-3.5-2.5 4-2.5-4-2 3.5-.5-4.5c-1 1.5-3 2-4.5.5C4 16 5 15 5 14z', c) + C(9.5, 10.5, 1.2, '#000', 'opacity=".45"') + C(14.5, 10.5, 1.2, '#000', 'opacity=".45"'),
    mic: c => R(9, 2.5, 6, 11, c, 3) + L('M6 10a6 6 0 0 0 12 0M12 16v5M8.5 21h7', c, 2, 'stroke-linecap="round"'),
    plug: c => R(6, 8, 12, 8, c, 2.5) + R(8.5, 3, 2, 5.5, c) + R(13.5, 3, 2, 5.5, c) + L('M12 16v6', c, 2.4),
    pen: c => P('M17 2.5 21.5 7 9 19.5l-5.5 1 1-5.5z', c) + L('M14.5 5l4.5 4.5', '#000', 1.3, 'opacity=".35"'),
    ski: c => L('M4 20 20 4M8 21 21 8', c, 2.6, 'stroke-linecap="round"') + C(12, 4, 2.5, c),
    onsen: c => P('M3 15h18a9 6 0 0 1-18 0z', c) + L('M7 12c-2-2.5 2-4 0-7M12 12c-2-2.5 2-4 0-7M17 12c-2-2.5 2-4 0-7', c, 1.9, 'stroke-linecap="round"'),
    whale: c => P('M2 13c0-5 6-8 12-7s8 5 8 8c0 4-4 6-9 6s-8-2-10-5zM14 6c1-3 4-3 5-2-1 0-3 1-3 3z', c) + C(7.5, 12, 1.1, '#000', 'opacity=".45"'),
    wheel: c => C(12, 10, 8, 'none', `stroke="${c}" stroke-width="2"`) + L('M12 2v16M4 10h16M6.3 4.3l11.4 11.4M17.7 4.3 6.3 15.7', c, 1.2) + P('M8 21l4-11 4 11z', c),
    dango: c => L('M12 2v20', c, 1.6) + C(12, 6.5, 3.3, c) + C(12, 12, 3.3, c, 'opacity=".8"') + C(12, 17.5, 3.3, c, 'opacity=".6"'),
    tea: c => P('M5 8h14l-1.5 11a3 3 0 0 1-3 2.5h-5a3 3 0 0 1-3-2.5z', c) + L('M9 2.5c-1 1.8 1 2.8 0 4.5M14 2.5c-1 1.8 1 2.8 0 4.5', c, 1.5, 'stroke-linecap="round"'),
    info: c => C(12, 5.5, 2.4, c) + P('M9 10h5v9h2v2.5H8V19h2v-6.5H9z', c),
    yen: c => L('M6 3l6 8 6-8M12 11v10M7 13h10M7 17h10', c, 2.4, 'stroke-linecap="round"'),
    wifi: c => L('M3 9.5a13 13 0 0 1 18 0M6 13a8.5 8.5 0 0 1 12 0M9 16.5a4 4 0 0 1 6 0', c, 2.2, 'stroke-linecap="round"') + C(12, 19.5, 1.8, c),
    meat: c => P('M5 7c3-4 10-4 13 0s2 9-3 11-11 1-12-4c-.5-2 .5-5 2-7z', c) + E(11, 12, 3, 2.2, '#000', 'opacity=".25"'),
    crab: c => E(12, 14, 7, 5, c) + L('M5 13 2 10M19 13l3-3M6 17l-3 2M18 17l3 2', c, 1.8) + C(6, 6, 2.6, c) + C(18, 6, 2.6, c),
    pill: c => g(R(3, 8.5, 18, 7, c, 3.5) + R(12, 8.5, 9, 7, '#000', 0, 'opacity=".3"'), 'rotate(-35 12 12)'),
    dumpling: c => P('M3 15c0-5 4-8 9-8s9 3 9 8c-2 2-16 2-18 0z', c) + L('M8 9l1 3M12 7.5V11M16 9l-1 3', '#000', 1.2, 'opacity=".35"'),
    pot: c => P('M3 10h18v3a9 7 0 0 1-18 0z', c) + R(8, 6.5, 8, 3, c, 1.5) + R(1, 10, 3, 2, c) + R(20, 10, 3, 2, c),
    fruit: c => P('M12 6c5 0 8 4 8 8s-4 7-8 7-8-3-8-7 3-8 8-8z', c) + P('M12 6c0-2 2-4 5-4-1 2-2 3.5-5 4z', c, 'opacity=".7"'),
    mask: c => R(3, 7, 18, 9, c, 4.5) + R(5.5, 9, 5.5, 5, '#000', 2, 'opacity=".35"') + R(13, 9, 5.5, 5, '#000', 2, 'opacity=".35"') + L('M20 8v-4', c, 2),
    skewer: c => L('M12 2v20', c, 1.4) + R(8, 4, 8, 4.5, c, 2) + R(8, 9.5, 8, 4.5, c, 2, 'opacity=".8"') + R(8, 15, 8, 4.5, c, 2, 'opacity=".65"'),
    okono: c => E(12, 14, 9.5, 6.5, c) + L('M5 13l3 2 3-2 3 2 3-2 2 1', '#000', 1.4, 'opacity=".35"'),
    hundred: c => `<text x="12" y="17" text-anchor="middle" font-size="11" font-weight="900" font-family="Arial,sans-serif" fill="${c}">100</text>`,
    curry: c => E(12, 15, 10, 5, c) + P('M4 14c1-4 5-6 8-6v6z', c, 'opacity=".6"'),
    pin: c => P('M12 22s7-7.5 7-12.5a7 7 0 0 0-14 0C5 14.5 12 22 12 22z', c) + C(12, 9.5, 2.6, '#000', 'opacity=".3"'),
    key: c => C(8, 12, 4.5, 'none', `stroke="${c}" stroke-width="2.4"`) + L('M12.5 12H21M18 12v3.5M21 12v3', c, 2.4),
    camera: c => R(3, 7, 18, 12, c, 2) + R(8, 4.5, 8, 3, c, 1) + C(12, 13, 3.6, '#000', 'opacity=".35"'),
    star: c => P('M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z', c),
    drink: c => P('M7 6h10l-1.5 15h-7z', c) + L('M13 6l2-4h3', c, 1.6) + R(7.5, 10, 9, 3, '#000', 0, 'opacity=".25"'),
    beer: c => R(5, 6, 11, 15, c, 1.5) + L('M16 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2', c, 2) + C(7.5, 5.5, 2.4, c) + C(11, 4.5, 2.6, c) + C(14, 5.5, 2.2, c),
    snow: c => L('M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7', c, 2, 'stroke-linecap="round"'),
    torii: c => P('M2 5c4 1 16 1 20 0v3H2z', c) + R(3.5, 9.5, 17, 2.2, c) + R(5.5, 8, 2.4, 14, c) + R(16.1, 8, 2.4, 14, c),
    wc: c => C(7, 4.5, 2.3, c) + P('M4.5 8h5l1 7H9v7H5v-7H3.5z', c) + C(17, 4.5, 2.3, c) + P('M14.5 8h5l2 8h-2.5v6h-4v-6H12.5z', c) + R(11.3, 3, 1.4, 19, c, 0, 'opacity=".6"'),
    arrow: c => P('M12 3l8 9h-5v9H9v-9H4z', c),
    lock: c => R(4, 10, 16, 12, c, 2) + L('M8 10V7a4 4 0 0 1 8 0v3', c, 2.4) + C(12, 15.5, 1.8, '#000', 'opacity=".35"'),
    trash: c => R(4, 5, 16, 2.5, c, 1) + P('M5.5 8.5h13l-1.3 13h-10.4z', c) + R(9.5, 2.5, 5, 2.5, c, 1),
    drop: c => P('M12 2.5s7 8 7 12.5a7 7 0 0 1-14 0C5 10.5 12 2.5 12 2.5z', c),
    door: c => R(5, 2.5, 14, 19.5, c, 1) + C(16, 13, 1.3, '#000', 'opacity=".45"'),
    shoe: c => P('M2 15c2-1 4-4 5-7h4c0 2 2 3 5 3.5 3 .5 6 1.5 6 4.5v2H2z', c),
    bell: c => P('M12 4a6.5 6.5 0 0 1 6.5 6.5V16l2 2.5h-17l2-2.5v-5.5A6.5 6.5 0 0 1 12 4z', c) + C(12, 20.5, 2, c) + R(11, 1.5, 2, 3, c),
    ticket: c => P('M2 7h20v3.2a2 2 0 0 0 0 3.6V17H2v-3.2a2 2 0 0 0 0-3.6z', c) + L('M15 7.5v9', '#000', 1.2, 'stroke-dasharray="1.5 1.5" opacity=".4"'),
    smoke: c => R(2, 14, 15, 4, c, 1) + R(18, 14, 4, 4, c, 1, 'opacity=".7"') + L('M19 12c-1-2 1-3 0-5', c, 1.5),
    baby: c => C(12, 6, 4, c) + P('M6 13c2-2 10-2 12 0l-2 8H8z', c),
    hanger: c => L('M12 6.5V5a2 2 0 1 1 2 2L12 9 3 16h18z', c, 2, 'stroke-linejoin="round"'),
    map: c => P('M2 5l6-2 8 2 6-2v16l-6 2-8-2-6 2z', c) + L('M8 3v16M16 5v16', '#000', 1.2, 'opacity=".35"'),
    clock: c => C(12, 12, 9.5, c) + L('M12 6.5V12l4 2.5', '#000', 2, 'opacity=".45" stroke-linecap="round"'),
    passport: c => R(5, 2.5, 14, 19, c, 2) + C(12, 10.5, 4, '#000', 'opacity=".3"') + R(8, 17, 8, 1.6, '#000', 0, 'opacity=".3"'),
    leaf: c => P('M4 20C4 9 10 4 21 3c-1 11-6 17-17 17zM4 20 13 11', c)
  };
  const glyph = (name, cx, cy, s, c) => GL[name] ? `<g transform="translate(${n(cx - s / 2)} ${n(cy - s / 2)}) scale(${n(s / 24 * 1000) / 1000})">${GL[name](c || '#fff')}</g>` : '';

  /* ---------------- 店 → 建築外觀類型 ---------------- */
  // arch：konbini eatery izakaya cafe retail dept station airport hotel shrine temple castle market booth garage aqua ferris chalet onsen chinese clinic tower
  const SHOP_ICON = {
    '🏪': ['konbini', 'bento'], '🍱': ['eatery', 'bento', '#22385e'], '🍛': ['cafe', 'curry', '#b8641c'], '🍜': ['eatery', 'bowl', '#c0392b'], '🍣': ['eatery', 'sushi', '#1d4f8f'],
    '🏮': ['izakaya', 'lantern'], '☕': ['cafe', 'cup', '#6b8e5a'], '💊': ['retail', 'pill', '#f2c500'], '👕': ['retail', 'shirt', '#7a5ac8'], '👘': ['eatery', 'kimono', '#9a3b6a'],
    '🍡': ['dept', 'dango', '#a8424e'], '🚉': ['station', 'train'], '🚄': ['booth', 'train', '#1f7a4d'], '🚌': ['booth', 'bus', '#1f6fc5'], '🛬': ['airport', 'plane'], '📶': ['booth', 'wifi', '#2b8fd6'],
    '🏨': ['hotel', 'bed', '#334a7a'], '⛩️': ['shrine', 'torii'], '🛕': ['temple', 'lantern'], '🏯': ['castle', 'star'], '🥩': ['izakaya', 'meat', '#5a2a1e'], '🔌': ['retail', 'plug', '#e8a400'],
    '🏥': ['clinic', 'cross', '#1f9d55'], '🎤': ['retail', 'mic', '#8a3fd1'], '🥟': ['chinese', 'dumpling'], 'ℹ️': ['booth', 'info', '#1f6fc5'], '🖋️': ['retail', 'pen', '#3b4a5a'], '🎡': ['ferris', 'wheel'],
    '🎿': ['chalet', 'ski', '#c0392b'], '♨️': ['onsen', 'onsen', '#7a2f3b'], '🎁': ['retail', 'gift', '#d0505a'], '🦀': ['market', 'crab', '#d4522a'], '🐑': ['eatery', 'meat', '#3c3c3c'], '🍲': ['eatery', 'pot', '#2c3e50'],
    '🍵': ['eatery', 'tea', '#4d7a2e'], '🤿': ['retail', 'mask', '#0f8fb0'], '🐋': ['aqua', 'whale'], '🥭': ['market', 'fruit', '#e08a1c'], '🚗': ['garage', 'car', '#d23b3b'], '🐟': ['market', 'fish', '#2a78b8'],
    '🍢': ['izakaya', 'skewer', '#8a2b1e'], '🛍️': ['retail', 'hundred', '#e5397a'], '🐙': ['market', 'octo', '#d84a2a'], '🥞': ['eatery', 'okono', '#7a4a1e']
  };
  function shopArt(s) {
    if (!s) return ['retail', 'bag', '#888'];
    const id = s.id || '';
    if (/ryokan/.test(id)) return ['ryokan', 'lantern', '#5a3a2a'];
    if (/nishiki|nakamise/.test(id)) return ['market', s.icon === '🍡' ? 'dango' : 'lantern', '#c0392b'];
    if (/yakiniku/.test(id)) return ['izakaya', 'meat', '#5a2a1e'];
    const a = SHOP_ICON[s.icon];
    if (a) return a;
    const sc = { konbini: 'konbini', ramen: 'eatery', cafe: 'cafe', drugstore: 'retail', izakaya: 'izakaya', clothes: 'retail', station: 'station', hotel: 'hotel', shrine: 'shrine', airport: 'airport' }[s.scene];
    return [sc || (s.kind === 'eat' ? 'eatery' : s.kind === 'service' ? 'booth' : 'retail'), s.kind === 'eat' ? 'bowl' : 'bag', '#7a5a3a'];
  }

  /* ---------------- 共用構件 ---------------- */
  const WALLS = ['#f3ece0', '#e6edf1', '#f1e4d3', '#e9e3f0', '#e3eee2', '#f4e6e1'];
  const ROOFS = ['#7d6656', '#5f7484', '#94604f', '#6a7062', '#7a6a8a', '#566a7a'];
  const glass = (x, y, w, h) => R(x, y, w, h, '#a9d4e6', 1.5, OL) + P(`M${n(x + w * .15)} ${n(y + h)}L${n(x + w * .55)} ${n(y)}h${n(w * .18)}L${n(x + w * .33)} ${n(y + h)}z`, '#fff', 'opacity=".38"');
  const goodsRow = (x, y, w, h, hsh) => { let s = '', i = 0; const cs = ['#e95a4f', '#f2b33d', '#4caf50', '#3d8bd9', '#f07fb0', '#8e6bd9']; for (let gx = x + 2; gx < x + w - 4; gx += 6) { s += R(gx, y + (i % 2), 4.5, h - (i % 2), cs[(hsh + i * 7) % cs.length]); i++; } return s; };
  const awning = (x, y, w, c1, c2) => { let s = ''; const k = Math.max(3, Math.round(w / 14)), sw = w / k; for (let i = 0; i < k; i++) s += P(`M${n(x + i * sw)} ${n(y)}h${n(sw)}v10a${n(sw / 2)} 4 0 0 1-${n(sw)} 0z`, i % 2 ? c2 : c1); return s + L(`M${n(x)} ${n(y)}h${n(w)}`, '#000', 1.5, 'opacity=".25"'); };
  const noren = (x, y, w, h, c, gl) => { const k = 3, sw = w / k; let s = ''; for (let i = 0; i < k; i++) s += R(x + i * sw + .8, y, sw - 1.6, h, c, 1); return s + R(x - 2, y - 2, w + 4, 2.5, '#5a3a22') + (gl ? glyph(gl, x + w / 2, y + h * .55, Math.min(h * .7, w * .5), '#fff') : ''); };
  const lanternR = (cx, cy, s) => R(cx - s * .3, cy - s * .62, s * .6, s * .16, '#2b2b2b') + E(cx, cy, s * .42, s * .52, '#e0483c') + L(`M${n(cx - s * .4)} ${n(cy - s * .15)}h${n(s * .8)}M${n(cx - s * .4)} ${n(cy + s * .15)}h${n(s * .8)}`, '#a8322a', 1.4) + R(cx - s * .3, cy + s * .48, s * .6, s * .16, '#2b2b2b');
  const tileRoof = (x, y, w, h, c) => P(`M${n(x - 8)} ${n(y + h)}Q${n(x)} ${n(y + h - 3)} ${n(x + 6)} ${n(y)}H${n(x + w - 6)}Q${n(x + w)} ${n(y + h - 3)} ${n(x + w + 8)} ${n(y + h)}z`, c, OL) + L(`M${n(x + 4)} ${n(y + h * .45)}H${n(x + w - 4)}`, '#fff', 1.4, 'opacity=".22"') + R(x - 8, y + h - 2.5, w + 16, 3, '#000', 0, 'opacity=".22"');
  const disc = (cx, cy, r, bg, gl) => C(cx, cy, r, bg, OL) + glyph(gl, cx, cy, r * 1.35, '#fff');
  const plaque = (cx, cy, w, h, gl) => R(cx - w / 2, cy - h / 2, w, h, '#6b4425', 2, OL) + R(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4, '#f4e4c4', 1.5) + glyph(gl, cx, cy, h * .8, '#6b4425');
  const fakeText = (x, y, w, c) => { let s = '', gx = x; const ws = [9, 6, 11, 7, 8]; let i = 0; while (gx < x + w - 5) { const ww = Math.min(ws[i++ % ws.length], x + w - gx); s += R(gx, y, ww, 4, c, 1.5); gx += ww + 3.5; } return s; };

  /* 通用店面：牆、屋頂、招牌帶、一樓門面 */
  function front(B, o) {
    const m = 5, X = B.x + m, Wd = B.w - 2 * m, bot = B.y + B.h - 7, trad = o.roof === 'tile';
    const top = B.y + (trad ? 22 : 10);
    let s = shadow(X, bot + 1, Wd) + R(X, top, Wd, bot - top, o.wall, 0, OL);
    const gTop = bot - Math.min(52, (bot - top) * .64);
    // 上層窗戶
    if (gTop - top > 46) { const rows = Math.floor((gTop - top - 28) / 22), cols = Math.max(2, Math.round(Wd / 30)); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const ww = Wd / cols; s += R(X + c * ww + ww * .2, top + 8 + r * 22, ww * .6, 13, o.win || '#b8d8e8', 1.5, OL); } }
    // 招牌帶
    const bandY = gTop - 20;
    if (o.band) {
      s += R(X - 1, bandY, Wd + 2, 17, o.band, 2, OL);
      if (o.stripes) o.stripes.forEach((c, i) => { s += R(X - 1, bandY + 17 + i * 3.2, Wd + 2, 3.2, c); });
      if (Wd > 110) s += disc(X + 14, bandY + 8.5, 11, o.disc || '#000', o.gl) + fakeText(X + 30, bandY + 6.5, Math.min(Wd - 40, 70), o.ink || 'rgba(255,255,255,.85)');
      else s += disc(B.x + B.w / 2, bandY + 8.5, 11, o.disc || '#000', o.gl);
    } else if (o.plaque) s += plaque(B.x + B.w / 2, bandY + 8, Math.min(46, Wd * .6), 17, o.gl);
    // 一樓
    const gH = bot - gTop - (o.stripes ? o.stripes.length * 3.2 : 0), gY = bot - gH;
    if (o.awning) s += awning(X + 2, gY, Wd - 4, o.awning[0], o.awning[1]);
    const dw = Math.min(26, Wd * .32), dx = B.x + B.w / 2 - dw / 2, dTop = gY + (o.awning ? 12 : 5);
    if (o.door === 'noren') {
      s += R(dx - 2, dTop, dw + 4, bot - dTop, '#3a2a1e') + R(dx, dTop + 2, dw, bot - dTop - 2, '#e8d9b8') + L(`M${n(dx + dw / 2)} ${n(dTop + 2)}V${n(bot)}`, '#6b4425', 1.5);
      s += noren(dx - 3, dTop, dw + 6, Math.min(22, (bot - dTop) * .55), o.noren || '#22385e', o.gl);
    } else {
      s += R(dx, dTop, dw, bot - dTop, '#5f6b74', 1, OL) + glass(dx + 2, dTop + 2, dw / 2 - 3, bot - dTop - 2) + glass(dx + dw / 2 + 1, dTop + 2, dw / 2 - 3, bot - dTop - 2);
    }
    // 兩側櫥窗／格子窗
    const sideW = (Wd - dw) / 2 - 8;
    if (sideW > 8) [X + 4, dx + dw + 4].forEach(wx => {
      const wy = dTop + 2, wh = bot - wy - 8;
      if (trad || o.lattice) { s += R(wx, wy, sideW, wh, '#e8d9b8', 1, OL); for (let lx = wx + 4; lx < wx + sideW - 1; lx += 5) s += R(lx, wy, 1.2, wh, '#6b4425', 0, 'opacity=".7"'); }
      else { s += glass(wx, wy, sideW, wh); if (o.goods) s += goodsRow(wx + 1, wy + wh - 9, sideW - 2, 7, hash(wx)) + goodsRow(wx + 1, wy + wh - 19, sideW - 2, 6, hash(wx) + 3); }
      s += R(wx - 1, bot - 7, sideW + 2, 7, o.base || '#8c8c8c');
    });
    // 屋頂
    if (trad) s += tileRoof(X, B.y + 6, Wd, 18, o.roofC || '#4a5560');
    else s += R(X - 3, top - 6, Wd + 6, 7, o.roofC || '#6d6d6d', 1.5, OL);
    if (o.lanterns && sideW > 6) { s += lanternR(X + 7, gY + 18, 13) + lanternR(X + Wd - 7, gY + 18, 13); }
    return s;
  }

  /* ---------------- 建築類型 ---------------- */
  const ARCH = {
    konbini: (B, a) => front(B, { wall: '#fbfaf6', band: '#ffffff', stripes: ['#f08a24', '#1f9d55', '#2a6fdb'], disc: '#1f9d55', gl: 'bento', ink: 'rgba(0,0,0,.35)', goods: 1, roofC: '#9aa3a8', base: '#b7bec2' }),
    eatery: (B, a) => front(B, { wall: '#e9d9bd', roof: 'tile', roofC: '#4a5560', plaque: 1, gl: a[1], door: 'noren', noren: a[2], base: '#7a5a3a' }),
    ryokan: (B, a) => front(B, { wall: '#efe4cc', roof: 'tile', roofC: '#3d4650', plaque: 1, gl: 'lantern', door: 'noren', noren: '#5a3a2a', lanterns: 1, base: '#6b4425' }),
    onsen: (B, a) => front(B, { wall: '#e8d4b4', roof: 'tile', roofC: '#4a5560', plaque: 1, gl: 'onsen', door: 'noren', noren: a[2] || '#7a2f3b', base: '#6b4425' }) + steam(B),
    izakaya: (B, a) => front(B, { wall: '#7a5236', roof: 'tile', roofC: '#3a3f46', plaque: 1, gl: a[1], door: 'noren', noren: a[2] || '#22385e', lanterns: 1, lattice: 1, base: '#4a3020' }),
    cafe: (B, a) => front(B, { wall: '#f4ead8', band: a[2] || '#6b8e5a', disc: '#3e5a32', gl: a[1], awning: ['#ffffff', a[2] || '#6b8e5a'], roofC: '#7d6656' }) + plant(B.x + 9, B.y + B.h - 8) + plant(B.x + B.w - 9, B.y + B.h - 8),
    retail: (B, a) => front(B, { wall: '#f1f1ef', band: a[2] || '#555', disc: '#00000055', gl: a[1], goods: 1, roofC: '#77808a' }),
    clinic: (B, a) => front(B, { wall: '#f6f8f7', band: '#ffffff', ink: 'rgba(0,0,0,.3)', disc: '#1f9d55', gl: 'cross', roofC: '#9aa3a8', win: '#cfe6ee' }),
    dept: (B, a) => { let s = front(B, { wall: '#e8e1d4', band: a[2] || '#8a4250', disc: '#00000040', gl: a[1], goods: 1, roofC: '#6e6255', base: '#9b8f7f' }); const x = B.x + 5; for (let i = 0; i < 2; i++) s += R(x + (i ? B.w - 18 : 3), B.y + 14, 5, B.h - 30, '#d2c8b6'); return s; },
    hotel: (B, a) => { const X = B.x + 8, Wd = B.w - 16, top = B.y + 4, bot = B.y + B.h - 7; let s = shadow(X, bot + 1, Wd) + R(X, top, Wd, bot - top, '#dfe6ee', 2, OL) + R(X - 2, top - 2, Wd + 4, 6, '#334a7a', 1.5);
      const cols = Math.max(3, Math.round(Wd / 18)), cw = Wd / cols; for (let r = 0; r < Math.floor((bot - top - 40) / 14); r++) for (let c = 0; c < cols; c++) s += R(X + c * cw + cw * .22, top + 9 + r * 14, cw * .56, 8, '#8fb8d6', 1);
      s += R(X + Wd / 2 - 22, bot - 34, 44, 8, '#334a7a', 2, OL) + R(X + Wd / 2 - 13, bot - 26, 26, 26, '#5f6b74', 1) + glass(X + Wd / 2 - 11, bot - 24, 22, 24) + disc(X + 12, top + 12, 9, '#334a7a', 'bed'); return s; },
    station: (B, a) => { const X = B.x + 4, Wd = B.w - 8, bot = B.y + B.h - 7, top = B.y + 30; let s = shadow(X, bot + 1, Wd) + R(X, top, Wd, bot - top, '#efe7da', 0, OL);
      s += P(`M${n(X - 6)} ${top + 2}L${n(B.x + B.w / 2)} ${B.y + 6}L${n(X + Wd + 6)} ${top + 2}z`, '#8a3b2e', OL) + C(B.x + B.w / 2, B.y + 21, 7.5, '#fff', OL) + L(`M${n(B.x + B.w / 2)} ${B.y + 16.5}v4.5l3 2`, '#333', 1.4);
      s += R(X, top + 3, Wd, 8, '#1f9d55') + R(X, top + 11, Wd, 2.5, '#f6c400');
      const k = Math.max(2, Math.round(Wd / 40)), aw = Wd / k; for (let i = 0; i < k; i++) s += P(`M${n(X + i * aw + 6)} ${bot}V${n(top + 30)}a${n(aw / 2 - 6)} ${n(aw / 2 - 6)} 0 0 1 ${n(aw - 12)} 0V${bot}z`, '#5f6b74', OL) + glass(X + i * aw + 9, top + 30, aw - 18, bot - top - 30);
      return s + disc(X + 12, top + 24, 8, '#1f9d55', 'train'); },
    airport: (B, a) => { const X = B.x + 4, Wd = B.w - 8, bot = B.y + B.h - 7, top = B.y + 30; let s = shadow(X, bot + 1, Wd);
      if (B.w >= 300) { const tx = X + Wd - 26; s += R(tx + 6, B.y + 14, 10, top - B.y, '#cfd6dc', 0, OL) + P(`M${tx} ${B.y + 18}h22l-3-10h-16z`, '#5f6b74', OL) + R(tx + 3, B.y + 9, 16, 5, '#8fd0ea'); }
      s += P(`M${X} ${bot}V${top + 4}Q${n(X + Wd / 2)} ${top - 18} ${n(X + Wd)} ${top + 4}V${bot}z`, '#dfe8ee', OL);
      for (let gx = X + 6; gx < X + Wd - 6; gx += 14) s += R(gx, top + 10, 11, bot - top - 12, '#8fc6e0', 1);
      s += P(`M${X} ${top + 4}Q${n(X + Wd / 2)} ${top - 18} ${n(X + Wd)} ${top + 4}`, 'none', `stroke="#e9eef2" stroke-width="5"`) + R(X, bot - 6, Wd, 6, '#9aa3a8');
      return s + disc(B.x + B.w / 2, top + 4, 9, '#2a6fdb', 'plane'); },
    booth: (B, a) => { const cx = B.x + B.w / 2, w = Math.min(B.w - 16, 78), X = cx - w / 2, bot = B.y + B.h - 7, top = B.y + 30; let s = shadow(X, bot + 1, w) + R(X, top, w, bot - top, '#f2f2ee', 3, OL);
      s += R(X - 3, top - 14, w + 6, 16, a[2] || '#1f6fc5', 3, OL) + disc(cx, top - 6, 10, '#00000040', a[1]) + R(X + 6, top + 8, w - 12, 22, '#bfe0ee', 2, OL) + R(X + 3, top + 32, w - 6, 6, '#c8b08a', 1) + R(X + 4, top + 38, w - 8, bot - top - 38, a[2] || '#1f6fc5', 1, 'opacity=".25"');
      return s + person(cx, top + 30, 15, hash(a[1]), 'staff'); },
    shrine: (B, a) => { const cx = B.x + B.w / 2, bot = B.y + B.h - 7, w = Math.min(B.w - 14, 150); let s = shadow(cx - w / 2, bot + 1, w);
      s += R(cx - w * .32, B.y + 30, w * .64, bot - B.y - 34, '#f2ead8', 0, OL) + tileRoof(cx - w * .32, B.y + 14, w * .64, 18, '#5f9a8a') + R(cx - w * .28, B.y + 34, w * .56, 4, '#c0392b');
      s += R(cx - 10, B.y + 48, 20, bot - B.y - 52, '#a8322a') + R(cx - 7, B.y + 52, 14, 8, '#d4a72c', 1);
      return s + torii(cx, bot, Math.min(w * .9, 86), 60); },
    temple: (B, a) => { const cx = B.x + B.w / 2, bot = B.y + B.h - 7, w = B.w - 14; let s = shadow(cx - w / 2, bot + 1, w) + R(cx - w * .42, B.y + 42, w * .84, bot - B.y - 44, '#efe4cc', 0, OL);
      for (let px = cx - w * .4; px <= cx + w * .4; px += w * .2) s += R(px - 2.5, B.y + 44, 5, bot - B.y - 46, '#b03a2e');
      s += tileRoof(cx - w * .42, B.y + 22, w * .84, 22, '#3a4048') + tileRoof(cx - w * .26, B.y + 6, w * .52, 16, '#3a4048') + lanternR(cx, bot - 22, 22); return s; },
    castle: (B, a) => { const cx = B.x + B.w / 2, bot = B.y + B.h - 7, w = Math.min(B.w - 12, 140); let s = shadow(cx - w / 2, bot + 1, w);
      s += P(`M${n(cx - w / 2)} ${bot}L${n(cx - w * .42)} ${bot - 20}H${n(cx + w * .42)}L${n(cx + w / 2)} ${bot}z`, '#9a9488', OL);
      [[.4, 20, 18], [.3, 38, 16], [.2, 54, 14]].forEach(([k, dy, hh]) => { s += R(cx - w * k, bot - dy - hh, w * k * 2, hh, '#f8f6f0', 0, OL) + tileRoof(cx - w * k, bot - dy - hh - 8, w * k * 2, 9, '#4d8a78'); });
      return s + R(cx - 3, bot - 82, 6, 6, '#d4a72c') + R(cx - 6, bot - 36, 12, 16, '#3a3f46', 1); },
    market: (B, a) => { const X = B.x + 4, Wd = B.w - 8, bot = B.y + B.h - 7, top = Math.max(B.y + 26, bot - 78); let s = shadow(X, bot + 1, Wd) + (top - B.y > 50 ? R(X + 2, B.y + 26, Wd - 4, top - B.y - 40, '#efe4cc', 0, OL) + tileRoof(X + 2, B.y + 10, Wd - 4, 18, '#4a5560') : '') + R(X, top - 16, Wd, 16, '#6b4425', 2, OL) + fakeText(X + 26, top - 10, Math.min(Wd - 34, 80), '#f4e4c4') + disc(X + 12, top - 8, 9, a[2] || '#c0392b', a[1]);
      const k = Math.max(2, Math.round(Wd / 34)), sw = Wd / k; for (let i = 0; i < k; i++) { const x = X + i * sw; s += R(x + 2, top + 8, sw - 4, bot - top - 8, '#7a5a40', 1) + R(x + 3, bot - 26, sw - 6, 26, '#c8a874', 1, OL) + goodsRow(x + 4, bot - 33, sw - 8, 7, i * 5 + hash(a[1])) + awning(x + 1, top, sw - 2, i % 2 ? '#2a6fdb' : (a[2] || '#d4522a'), '#fff'); }
      if (Wd > 120) s += lanternR(X + Wd / 2, top + 18, 12); return s; },
    garage: (B, a) => { const X = B.x + 5, Wd = B.w - 10, bot = B.y + B.h - 7, top = B.y + 18; let s = shadow(X, bot + 1, Wd) + R(X, top, Wd, bot - top, '#eef0f1', 0, OL) + R(X - 2, top - 4, Wd + 4, 18, a[2] || '#d23b3b', 2, OL) + disc(X + 12, top + 5, 9, '#00000040', 'car') + fakeText(X + 26, top + 3, Math.min(Wd - 34, 60), '#fff');
      s += R(X + 8, top + 22, Wd - 16, bot - top - 22, '#4a4f55', 1) + car(X + Wd / 2, bot - 2, Math.min(52, Wd - 24), '#f2f2f2'); return s; },
    aqua: (B, a) => { const X = B.x + 5, Wd = B.w - 10, bot = B.y + B.h - 7, top = B.y + 22; let s = shadow(X, bot + 1, Wd) + P(`M${X} ${bot}V${top + 10}Q${X} ${top} ${X + 14} ${top - 4}Q${n(X + Wd / 2)} ${top - 14} ${n(X + Wd - 14)} ${top - 4}Q${n(X + Wd)} ${top} ${n(X + Wd)} ${top + 10}V${bot}z`, '#2f8fc8', OL);
      s += P(`M${X} ${top + 30}q${n(Wd / 8)} -8 ${n(Wd / 4)} 0t${n(Wd / 4)} 0t${n(Wd / 4)} 0t${n(Wd / 4)} 0V${bot}H${X}z`, '#1d6fa5') + glyph('whale', B.x + B.w / 2, top + 14, 30, '#e8f6ff') + R(B.x + B.w / 2 - 12, bot - 22, 24, 22, '#5f6b74', 1) + glass(B.x + B.w / 2 - 10, bot - 20, 20, 20); return s; },
    ferris: (B, a) => { const cx = B.x + B.w / 2, bot = B.y + B.h - 7, r = Math.min(B.h, B.w) * .36; let s = L(`M${n(cx - r * .6)} ${bot}L${cx} ${n(B.y + 8 + r)}L${n(cx + r * .6)} ${bot}`, '#7a8590', 4) + C(cx, B.y + 8 + r, r, 'none', 'stroke="#e0483c" stroke-width="3.5"');
      for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, px = cx + Math.cos(t) * r, py = B.y + 8 + r + Math.sin(t) * r; s += L(`M${cx} ${n(B.y + 8 + r)}L${n(px)} ${n(py)}`, '#9aa3a8', 1.4) + R(px - 4, py - 3, 8, 7, ['#f6c400', '#2a6fdb', '#1f9d55', '#e95a4f'][i % 4], 2); }
      return s + ARCH.booth({ x: B.x + B.w - 52, y: B.y + 30, w: 52, h: B.h - 30 }, a); },
    chalet: (B, a) => { let s = front(B, { wall: '#a0704a', band: a[2] || '#c0392b', disc: '#00000040', gl: a[1], lattice: 1, roofC: '#5a3a2a', base: '#5a3a2a' }); return s + R(B.x + 2, B.y + 3, B.w - 4, 6, '#ffffff', 3, OL); },
    chinese: (B, a) => { const X = B.x + 5, Wd = B.w - 10, bot = B.y + B.h - 7; let s = front(B, { wall: '#c8302a', roof: 'tile', roofC: '#2f7a5a', plaque: 1, gl: 'dumpling', lattice: 1, base: '#7a1e1a' }); return s + R(X + 3, B.y + 26, Wd - 6, 3, '#e8b030') + lanternR(X + 8, B.y + 44, 12) + lanternR(X + Wd - 8, B.y + 44, 12); }
  };
  function steam(B) { const cx = B.x + B.w - 20; return L(`M${cx} ${B.y + 14}c-4-4 4-6 0-11M${cx + 7} ${B.y + 15}c-4-4 4-6 0-11`, '#ffffff', 2.4, 'opacity=".85" stroke-linecap="round"'); }
  function plant(x, y) { return R(x - 4, y - 9, 8, 9, '#a0522d', 1.5) + C(x, y - 13, 6, '#4caf50') + C(x - 3, y - 16, 4, '#3d9442'); }
  function car(cx, by, w, c) { const h = w * .42; return P(`M${n(cx - w / 2)} ${n(by - h * .35)}l${n(w * .14)} -${n(h * .45)}h${n(w * .72)}l${n(w * .14)} ${n(h * .45)}v${n(h * .3)}h-${n(w)}z`, c, OL) + R(cx - w * .3, by - h * .74, w * .6, h * .3, '#8fc6e0', 1.5) + C(cx - w * .28, by - h * .05, h * .18, '#2b2b2b') + C(cx + w * .28, by - h * .05, h * .18, '#2b2b2b'); }
  function torii(cx, by, w, h) { return R(cx - w * .36, by - h * .82, w * .1, h * .82, '#d9473c', 0, OL) + R(cx + w * .26, by - h * .82, w * .1, h * .82, '#d9473c', 0, OL) + R(cx - w * .42, by - h * .7, w * .84, h * .08, '#d9473c', 0, OL) + P(`M${n(cx - w / 2)} ${n(by - h * .92)}Q${cx} ${n(by - h * .84)} ${n(cx + w / 2)} ${n(by - h * .92)}V${n(by - h * .82)}H${n(cx - w / 2)}z`, '#2b2b2b') + R(cx - w * .46, by - h * .86, w * .92, h * .07, '#d9473c'); }

  /* ---------------- 人物（路人、店員、玩家） ---------------- */
  const SKIN = ['#f6d3b3', '#efc39d', '#e8b48c', '#f9dcc4'], HAIR = ['#2b2118', '#3b2a1e', '#1c1c1c', '#5a3d2b', '#8a8a8a'];
  const CLOTH = ['#e95a4f', '#3d8bd9', '#4caf50', '#f2b33d', '#8e6bd9', '#f07fb0', '#2f9c95', '#6d6d6d'];
  function person(cx, by, h, seed, role) {
    const sk = pick(SKIN, seed), hr = pick(HAIR, seed >>> 3), cl = role === 'police' ? '#22385e' : role === 'staff' ? '#2a6fdb' : role === 'old' ? '#8a6b4a' : pick(CLOTH, seed >>> 5);
    const k = h / 40; let s = E(cx, by, 9 * k, 2.6 * k, '#000', 'opacity=".2"');
    s += R(cx - 5 * k, by - 12 * k, 4 * k, 12 * k, '#3a3f46', 1.5) + R(cx + 1 * k, by - 12 * k, 4 * k, 12 * k, '#3a3f46', 1.5);
    s += P(`M${n(cx - 8 * k)} ${n(by - 10 * k)}Q${n(cx - 8 * k)} ${n(by - 25 * k)} ${cx} ${n(by - 25 * k)}Q${n(cx + 8 * k)} ${n(by - 25 * k)} ${n(cx + 8 * k)} ${n(by - 10 * k)}z`, cl, OL);
    s += C(cx, by - 31 * k, 7.5 * k, sk, OL) + P(`M${n(cx - 7.5 * k)} ${n(by - 31 * k)}a${n(7.5 * k)} ${n(7.5 * k)} 0 0 1 ${n(15 * k)} 0q-${n(7.5 * k)} -${n(3.5 * k)} -${n(15 * k)} 0z`, role === 'old' ? '#c8c8c8' : hr);
    if (role === 'police') s += P(`M${n(cx - 8.5 * k)} ${n(by - 35 * k)}h${n(17 * k)}l-${n(2 * k)} -${n(5 * k)}h-${n(13 * k)}z`, '#1a2a48') + R(cx - 9.5 * k, by - 35.5 * k, 19 * k, 2 * k, '#111');
    if (role === 'staff') s += R(cx - 1 * k, by - 24 * k, 2 * k, 6 * k, '#f2f2f2');
    return s + C(cx - 2.6 * k, by - 30.5 * k, 1 * k, '#2b2b2b') + C(cx + 2.6 * k, by - 30.5 * k, 1 * k, '#2b2b2b');
  }
  const roleOf = p => /👮|警/.test((p.icon || '') + (p.name || '')) ? 'police' : /💁|💂|🧑‍💼|服務|接待|店員|巡邏|志工/.test((p.icon || '') + (p.name || '')) ? 'staff' : /👵|👴|🧓|阿嬤|老奶奶|大叔|阿姨/.test((p.icon || '') + (p.name || '')) ? 'old' : 'walk';

  /* ---------------- 景點 ---------------- */
  function spotKind(p) {
    const t = (p.icon || '') + ' ' + (p.name || '') + (p.jp || '');
    if (/橋|🌉|🏃/.test(t)) return 'bridge';
    if (/雷門/.test(t)) return 'kaminari';
    if (/八坂|塔.*寺|五重/.test(t)) return 'pagoda';
    if (/⛩️|鳥居|神宮|神社|天滿宮/.test(t)) return 'torii';
    if (/🗼|通天閣|🏙️|展望室/.test(t)) return 'tower';
    if (/🕰️|鐘|時計/.test(t)) return 'clock';
    if (/🏯|城|守禮門/.test(t)) return 'gate';
    if (/🛫|觀景/.test(t)) return 'deck';
    if (/🚌|巴士/.test(t)) return 'bus';
    if (/🏖️|海灘/.test(t)) return 'beach';
    if (/🌊|鴨川|川/.test(t)) return 'river';
    if (/🗻|山/.test(t)) return 'mount';
    if (/🦁|🦶|像|風獅爺/.test(t)) return 'statue';
    if (/🧱|倉庫/.test(t)) return 'brick';
    if (/🚡|纜車/.test(t)) return 'ropeway';
    if (/🏡|小木屋/.test(t)) return 'cabin';
    if (/🎭|歌舞伎座/.test(t)) return 'theater';
    if (/🐼|🌳|🌽|🌹|公園|林道|大道/.test(t)) return 'park';
    if (/🌃|🌆|夜景|一番街|棧橋/.test(t)) return 'neon';
    return 'street';   // 🏮 🛍️ 🍭 🚶 👘 橫丁、商店街
  }
  const tree = (cx, by, s, kind, seed) => {
    if (kind === 'palm') return E(cx, by, s * .3, s * .08, '#000', 'opacity=".18"') + P(`M${n(cx - s * .04)} ${by}q${n(s * .08)} -${n(s * .4)} ${n(s * .02)} -${n(s * .75)}h${n(s * .07)}q-${n(s * .02)} ${n(s * .4)} ${n(s * .03)} ${n(s * .75)}z`, '#8a6b4a') + [[-1, .1], [1, .1], [-.7, -.25], [.7, -.25], [0, -.35]].map(([dx, dy]) => { const ty = by - s * .75, ex = cx + dx * s * .45, ey = ty + s * .12 + dy * s * .3, mx = (cx + ex) / 2 + (dx ? 0 : s * .06), my = Math.min(ty, ey) - s * .14; return P(`M${n(cx)} ${n(ty)}Q${n(mx)} ${n(my)} ${n(ex)} ${n(ey)}Q${n(mx)} ${n(my + s * .12)} ${n(cx)} ${n(ty)}z`, '#3f9a4a'); }).join('');
    if (kind === 'pine') return E(cx, by, s * .3, s * .08, '#000', 'opacity=".18"') + R(cx - s * .05, by - s * .2, s * .1, s * .2, '#7a5a3a') + P(`M${cx} ${n(by - s * .95)}l${n(s * .3)} ${n(s * .42)}h-${n(s * .12)}l${n(s * .2)} ${n(s * .3)}H${n(cx - s * .38)}l${n(s * .2)} -${n(s * .3)}h-${n(s * .12)}z`, '#2f6e4a', OL) + (seed % 2 ? P(`M${cx} ${n(by - s * .95)}l${n(s * .14)} ${n(s * .2)}h-${n(s * .28)}z`, '#fff') : '');
    const c = kind === 'sakura' ? ['#f4a7c0', '#f8c8d8'] : kind === 'autumn' ? ['#e0883a', '#f0a850'] : ['#4a9a52', '#6cbf5f'];
    return E(cx, by, s * .32, s * .08, '#000', 'opacity=".18"') + R(cx - s * .05, by - s * .32, s * .1, s * .32, '#7a5a3a', 1.5) + C(cx, by - s * .55, s * .3, c[0], OL) + C(cx - s * .1, by - s * .63, s * .17, c[1]) + C(cx + s * .12, by - s * .5, s * .12, c[1], 'opacity=".7"');
  };
  function spotArt(B, p, ctx) {
    const k = spotKind(p), cx = B.x + B.w / 2, bot = B.y + B.h - 7, X = B.x + 6, Wd = B.w - 12; let s = '';
    switch (k) {
      case 'park': s += R(B.x + 3, B.y + 3, B.w - 6, B.h - 6, 'var(--wd-green)', 14) + P(`M${n(cx - 8)} ${B.y + B.h - 3}Q${n(cx)} ${n(B.y + B.h / 2)} ${n(cx + 22)} ${B.y + 5}h12Q${n(cx + 8)} ${n(B.y + B.h / 2)} ${n(cx + 6)} ${B.y + B.h - 3}z`, 'var(--wd-walk)');
        for (let i = 0; i < Math.max(2, B.w / 50); i++) s += tree(B.x + 20 + i * 46 % (B.w - 30), B.y + 46 + (i % 2) * 34, 44, ctx.treeKind(i + 3), i);
        if (/🐼/.test(p.icon)) s += panda(cx + 10, bot - 6, 30); else s += C(cx + 12, B.y + B.h / 2 + 6, 12, 'var(--wd-water)', OL);
        return s;
      case 'bridge': return R(B.x, B.y + 24, B.w, B.h - 48, '#c9b28a', 0, OL) + L(`M${B.x} ${B.y + 26}H${B.x + B.w}M${B.x} ${B.y + B.h - 26}H${B.x + B.w}`, '#b03a2e', 4) + [...Array(Math.max(2, B.w / 25 | 0))].map((_, i) => R(B.x + 8 + i * 25, B.y + 18, 4, 10, '#b03a2e') + R(B.x + 8 + i * 25, B.y + B.h - 28, 4, 10, '#b03a2e')).join('');
      case 'pagoda': { let t = shadow(cx - 26, bot + 1, 52); for (let i = 0; i < 5; i++) { const w = 56 - i * 7, y = bot - 16 - i * 15; t += R(cx - w * .3, y, w * .6, 14, '#c0392b', 0, OL) + tileRoof(cx - w * .5 + 6, y - 6, w - 12, 7, '#3a3f46'); } return t + R(cx - 1.5, bot - 98, 3, 16, '#d4a72c'); }
      case 'torii': return shadow(cx - 40, bot + 1, 80) + tree(B.x + 12, bot, 46, 'round', 1) + tree(B.x + B.w - 12, bot, 46, 'round', 2) + torii(cx, bot, Math.min(Wd, 92), Math.min(B.h - 14, 84));
      case 'tower': { const h = B.h - 12; return shadow(cx - 22, bot + 1, 44) + P(`M${cx - 24} ${bot}L${cx - 4} ${bot - h}h8L${cx + 24} ${bot}h-9L${cx} ${n(bot - h * .5)}L${cx - 15} ${bot}z`, '#e0483c', OL) + R(cx - 13, bot - h * .42, 26, 6, '#f4f1e8', 1, OL) + R(cx - 8, bot - h * .72, 16, 5, '#f4f1e8', 1, OL) + L(`M${cx} ${bot - h}v-6`, '#666', 2); }
      case 'clock': return shadow(cx - 26, bot + 1, 52) + R(cx - 24, bot - 40, 48, 40, '#f4efe6', 0, OL) + P(`M${cx - 28} ${bot - 40}L${cx} ${bot - 54}L${cx + 28} ${bot - 40}z`, '#b03a2e', OL) + R(cx - 9, bot - 76, 18, 24, '#f4efe6', 0, OL) + P(`M${cx - 12} ${bot - 76}L${cx} ${bot - 90}L${cx + 12} ${bot - 76}z`, '#b03a2e', OL) + C(cx, bot - 64, 6.5, '#fff', OL) + L(`M${cx} ${bot - 68}v4l3 2`, '#333', 1.4) + R(cx - 6, bot - 20, 12, 20, '#7a5236');
      case 'kaminari': return shadow(X, bot + 1, Wd) + R(X + 8, bot - 52, 8, 52, '#b03a2e', 0, OL) + R(X + Wd - 16, bot - 52, 8, 52, '#b03a2e', 0, OL) + tileRoof(X + 2, bot - 70, Wd - 4, 18, '#3a4048') + R(X + 6, bot - 54, Wd - 12, 5, '#b03a2e') + R(cx - 16, bot - 49, 32, 4, '#2b2b2b') + E(cx, bot - 28, 17, 21, '#d9473c', OL) + L(`M${cx - 16} ${bot - 36}h32M${cx - 16} ${bot - 20}h32`, '#a8322a', 1.6) + R(cx - 7, bot - 36, 14, 16, '#2b2b2b', 1, 'opacity=".6"') + R(cx - 13, bot - 8, 26, 4, '#2b2b2b');
      case 'gate': return shadow(X, bot + 1, Wd) + R(X + 6, bot - 34, Wd - 12, 34, '#b03a2e', 0, OL) + R(cx - 12, bot - 30, 24, 30, '#3a2f28') + tileRoof(X + 4, bot - 50, Wd - 8, 14, '#3a4048') + tileRoof(X + 18, bot - 64, Wd - 36, 10, '#3a4048');
      case 'deck': return R(X, bot - 30, Wd, 30, '#cfd6dc', 2, OL) + L(`M${X} ${bot - 34}H${X + Wd}`, '#7a8590', 3) + [...Array(Math.max(3, Wd / 14 | 0))].map((_, i) => R(X + 3 + i * 14, bot - 34, 2.4, 6, '#7a8590')).join('') + glyph('plane', cx, B.y + 30, 32, '#5f7484') + person(cx - 10, bot - 6, 22, 9, 'walk') + person(cx + 12, bot - 6, 20, 4, 'walk');
      case 'bus': return busStop(cx, bot, ctx) + E(cx - 16, bot, 1, 1, 'none');
      case 'beach': return R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, '#f2dfa8', 12) + P(`M${B.x + 2} ${B.y + 30}q${n(B.w / 6)} -10 ${n(B.w / 3)} 0t${n(B.w / 3)} 0t${n(B.w / 3 - 4)} 0V${B.y + 2}H${B.x + 2}z`, 'var(--wd-water)') + L(`M${B.x + 2} ${B.y + 31}q${n(B.w / 6)} -10 ${n(B.w / 3)} 0t${n(B.w / 3)} 0t${n(B.w / 3 - 4)} 0`, '#fff', 3, 'opacity=".8"') + parasol(cx - 14, bot - 4, '#e0483c') + parasol(cx + 22, bot - 10, '#2a6fdb');
      case 'river': return R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, 'var(--wd-water)', 10) + waves(B.x + 8, B.y + 20, B.w - 16, B.h - 30) + tree(B.x + 18, bot, 40, 'sakura', 1);
      case 'mount': return P(`M${B.x + 4} ${bot}L${cx} ${B.y + 14}L${B.x + B.w - 4} ${bot}z`, '#6a8fb0', OL) + P(`M${n(cx - 14)} ${B.y + 38}L${cx} ${B.y + 14}L${n(cx + 14)} ${B.y + 38}l-5 -4-5 5-4-5z`, '#fff');
      case 'statue': return shadow(cx - 20, bot + 1, 40) + R(cx - 18, bot - 20, 36, 20, '#a8a29a', 2, OL) + (/🦁/.test(p.icon) ? shisa(cx, bot - 20, 34) : billiken(cx, bot - 20, 34));
      case 'brick': return front(B, { wall: '#b5523a', band: '#7a2f22', disc: '#00000040', gl: 'star', lattice: 0, roofC: '#5a5f66', win: '#e8d9b8' });
      case 'ropeway': return L(`M${B.x} ${B.y + 18}L${B.x + B.w} ${B.y + 6}`, '#555', 1.6) + R(cx - 12, B.y + 14, 24, 18, '#e0483c', 3, OL) + R(cx - 9, B.y + 17, 18, 7, '#bfe0ee', 1) + L(`M${cx} ${B.y + 12}v2`, '#555', 2) + ARCH.booth({ x: B.x, y: B.y + 30, w: B.w, h: B.h - 30 }, ['booth', 'ticket', '#c0392b']);
      case 'cabin': return ARCH.chalet(B, ['chalet', 'leaf', '#7a5a3a']) + tree(B.x + B.w - 10, bot, 44, 'pine', 1);
      case 'theater': return front(B, { wall: '#f1e6d2', roof: 'tile', roofC: '#3a3f46', plaque: 1, gl: 'star', lattice: 1, base: '#7a1e1a' }) + R(B.x + 10, B.y + 32, B.w - 20, 4, '#c0392b') + lanternR(B.x + 14, B.y + 52, 13) + lanternR(B.x + B.w - 14, B.y + 52, 13);
      case 'neon': { let t = ''; const k2 = Math.max(2, B.w / 40 | 0), bw = Wd / k2; for (let i = 0; i < k2; i++) { const hh = 40 + (i * 23 % 30); t += R(X + i * bw + 2, bot - hh, bw - 4, hh, ['#3a3550', '#2f3b55', '#4a3550'][i % 3], 1, OL); for (let r = 0; r < hh / 12 - 1; r++) t += R(X + i * bw + 7, bot - hh + 6 + r * 12, bw - 14, 5, ['#ffd84a', '#ff6fae', '#5fd0ff'][(i + r) % 3], 1, 'opacity=".9"'); } return shadow(X, bot + 1, Wd) + t; }
      default: { // 橫丁・商店街：入口拱門＋燈籠串
        let t = shadow(X, bot + 1, Wd) + R(X + 2, bot - 62, 7, 62, '#6b4425') + R(X + Wd - 9, bot - 62, 7, 62, '#6b4425') + R(X - 2, bot - 70, Wd + 4, 16, p.icon === '🍭' ? '#f07fb0' : '#b03a2e', 3, OL) + fakeText(cx - Math.min(36, Wd / 2 - 10), bot - 64, Math.min(72, Wd - 20), '#fff');
        const k2 = Math.max(3, Wd / 18 | 0); for (let i = 0; i < k2; i++) t += lanternR(X + 12 + i * (Wd - 24) / (k2 - 1 || 1), bot - 44 + (i % 2) * 3, 11);
        for (let i = 0; i < 2; i++) t += person(X + 22 + i * (Wd - 44), bot - 2, 22, i * 13 + hash(p.name), 'walk');
        return t;
      }
    }
  }
  function panda(cx, by, s) { const k = s / 30; return E(cx, by, 12 * k, 3 * k, '#000', 'opacity=".18"') + E(cx, by - 9 * k, 10 * k, 9 * k, '#fff', OL) + C(cx, by - 22 * k, 8 * k, '#fff', OL) + C(cx - 6.5 * k, by - 28 * k, 3 * k, '#222') + C(cx + 6.5 * k, by - 28 * k, 3 * k, '#222') + E(cx - 3 * k, by - 22 * k, 2.2 * k, 2.8 * k, '#222') + E(cx + 3 * k, by - 22 * k, 2.2 * k, 2.8 * k, '#222') + C(cx, by - 18.5 * k, 1.2 * k, '#222') + E(cx - 8 * k, by - 8 * k, 3 * k, 5 * k, '#222') + E(cx + 8 * k, by - 8 * k, 3 * k, 5 * k, '#222'); }
  function shisa(cx, by, s) { const k = s / 34; return P(`M${n(cx - 12 * k)} ${by}v-${n(14 * k)}q0-${n(16 * k)} ${n(12 * k)} -${n(16 * k)}t${n(12 * k)} ${n(16 * k)}v${n(14 * k)}z`, '#c8763a', OL) + C(cx, by - 26 * k, 9 * k, '#d98a48', OL) + C(cx - 3.5 * k, by - 27 * k, 1.6 * k, '#2b2b2b') + C(cx + 3.5 * k, by - 27 * k, 1.6 * k, '#2b2b2b') + R(cx - 5 * k, by - 23 * k, 10 * k, 3 * k, '#7a3a1a', 1.5); }
  function billiken(cx, by, s) { const k = s / 34; return E(cx, by - 9 * k, 9 * k, 9 * k, '#e8c060', OL) + P(`M${n(cx - 8 * k)} ${n(by - 20 * k)}Q${cx} ${n(by - 42 * k)} ${n(cx + 8 * k)} ${n(by - 20 * k)}z`, '#f0cc70', OL) + L(`M${n(cx - 4 * k)} ${n(by - 22 * k)}q${n(4 * k)} ${n(3 * k)} ${n(8 * k)} 0`, '#7a5a2a', 1.4); }
  function parasol(cx, by, c) { return L(`M${cx} ${by}v-30`, '#7a5a3a', 2) + P(`M${cx - 18} ${by - 26}Q${cx} ${by - 44} ${cx + 18} ${by - 26}z`, c, OL) + E(cx, by, 12, 3, '#000', 'opacity=".12"'); }
  function waves(x, y, w, h) { let s = ''; for (let yy = y; yy < y + h; yy += 18) for (let xx = x + ((yy / 18) % 2) * 14; xx < x + w - 16; xx += 30) s += L(`M${n(xx)} ${n(yy)}q4 -4 8 0t8 0`, 'var(--wd-sea)', 2.4, 'stroke-linecap="round"'); return s; }
  function busStop(cx, by) { return E(cx, by, 30, 4, '#000', 'opacity=".14"') + R(cx - 28, by - 46, 44, 5, '#5f6b74', 2, OL) + R(cx - 26, by - 42, 3, 42, '#7a8590') + R(cx + 11, by - 42, 3, 42, '#7a8590') + R(cx - 22, by - 38, 32, 26, '#bfe0ee', 2, 'opacity=".75"') + R(cx - 24, by - 12, 36, 4, '#8a6b4a', 1) + L(`M${cx + 24} ${by}v-52`, '#7a8590', 3) + C(cx + 24, by - 54, 9, '#1f6fc5', OL) + glyph('bus', cx + 24, by - 54, 12, '#fff'); }

  /* ---------------- 車站／巴士站等出入口 gate ---------------- */
  function gateArt(B, p, ctx) {
    const t = (p.icon || '') + (p.name || '');
    if (/🚌/.test(t)) return busStop(B.x + B.w / 2, B.y + B.h - 7) + (B.w > 120 ? tree(B.x + 14, B.y + B.h - 6, 40, ctx.treeKind(1), 1) : '');
    if (/🅿️|停車/.test(t)) { const cx = B.x + B.w / 2, bot = B.y + B.h - 7; let s = R(B.x + 4, B.y + 10, B.w - 8, B.h - 16, '#7d8389', 4) + L(`M${B.x + 4 + (B.w - 8) / 3} ${B.y + 12}v${B.h - 22}M${B.x + 4 + 2 * (B.w - 8) / 3} ${B.y + 12}v${B.h - 22}`, '#fff', 2.5); s += car(B.x + 4 + (B.w - 8) / 6, bot - 8, 40, '#e95a4f') + car(B.x + 4 + 5 * (B.w - 8) / 6, bot - 8, 40, '#3d8bd9'); return s + L(`M${cx} ${bot}v-50`, '#7a8590', 3) + R(cx - 11, bot - 72, 22, 22, '#1f6fc5', 3, OL) + `<text x="${cx}" y="${bot - 54}" text-anchor="middle" font-size="18" font-weight="900" font-family="Arial,sans-serif" fill="#fff">P</text>`; }
    if (/🚇/.test(t) && B.w <= 300) { const cx = B.x + B.w / 2, bot = B.y + B.h - 7, w = Math.min(B.w - 14, 90); return shadow(cx - w / 2, bot + 1, w) + R(cx - w / 2, bot - 44, w, 44, '#d8dde2', 3, OL) + R(cx - w / 2 + 8, bot - 30, w - 16, 30, '#2b2f35', 1) + [...Array(5)].map((_, i) => R(cx - w / 2 + 10, bot - 26 + i * 5.5, w - 20, 2, '#6d737a')).join('') + R(cx - w / 2 - 2, bot - 50, w + 4, 10, '#2a6fdb', 2, OL) + disc(cx, bot - 54, 10, '#2a6fdb', 'train'); }
    if (/🚝/.test(t)) { const bot = B.y + B.h - 7; return ARCH.station(B, ['station', 'train']) + R(B.x, B.y + 6, B.w, 6, '#9aa3a8') + R(B.x + 10, B.y - 2, Math.min(70, B.w - 20), 10, '#2a8f5a', 3); }
    return ARCH.station(B, ['station', 'train']);
  }

  /* =========================================================
     街區整張圖：d = district（map, places, region）、shops = WORLD.shops
     ========================================================= */
  let uid = 0;
  function district(d, shops) {
    const rows = d.map, H = rows.length, Wd = rows[0].length, id = 'wa' + (++uid);
    const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= Wd) ? null : rows[y][x];
    const isRoad = c => c === '=', isWalk = c => c === '.', isPl = c => c != null && !!d.places[c];
    const reg = d.region || '';
    const treeKind = i => reg === 'okinawa' ? 'palm' : reg === 'hokkaido' ? 'pine' : (i % 5 === 2 ? (reg === 'kyoto' ? 'autumn' : 'sakura') : i % 4 === 3 ? 'pine' : 'round');
    const ctx = { treeKind };
    let ground = '', marks = '', objs = [], furn = '';
    // 地面
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y), X = x * U, Y = y * U;
      const base = isRoad(c) ? 'var(--wd-road)' : c === '^' ? 'var(--wd-green)' : c === '~' ? 'var(--wd-water)' : c === ' ' ? null : 'var(--wd-walk)';
      if (base) ground += R(X - .5, Y - .5, U + 1, U + 1, base);
      if (isWalk(c) || isPl(c) || c === '#') ground += R(X, Y, U, U, `url(#${id}p)`);
      if (c === '^') ground += C(X + 22, Y + 78, 3, '#000', 'opacity=".08"') + C(X + 70, Y + 30, 2.5, '#000', 'opacity=".08"');
    }
    // 道路：路緣、分隔線、斑馬線、路燈、紅綠燈
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y), X = x * U, Y = y * U;
      if (isRoad(c)) {
        const horiz = isRoad(at(x - 1, y)) || isRoad(at(x + 1, y)) || !(isRoad(at(x, y - 1)) || isRoad(at(x, y + 1)));
        const zebra = horiz ? (isWalk(at(x, y - 1)) && isWalk(at(x, y + 1)) && x % 4 === 1) : (isWalk(at(x - 1, y)) && isWalk(at(x + 1, y)) && y % 4 === 1);
        const water = horiz ? at(x, y - 1) === '~' && at(x, y + 1) === '~' : at(x - 1, y) === '~' && at(x + 1, y) === '~';
        if (zebra) { for (let i = 0; i < 6; i++) marks += horiz ? R(X + 14, Y + 9 + i * 15, 72, 8, '#f4f1e8', 1, 'opacity=".9"') : R(X + 9 + i * 15, Y + 14, 8, 72, '#f4f1e8', 1, 'opacity=".9"'); }
        else marks += horiz ? R(X + 12, Y + 48, 30, 4, '#f4d35e', 1, 'opacity=".9"') + R(X + 62, Y + 48, 30, 4, '#f4d35e', 1, 'opacity=".9"') : R(X + 48, Y + 12, 4, 30, '#f4d35e', 1, 'opacity=".9"') + R(X + 48, Y + 62, 4, 30, '#f4d35e', 1, 'opacity=".9"');
        [[0, -1, `M${X} ${Y + 2}h${U}`], [0, 1, `M${X} ${Y + U - 2}h${U}`], [-1, 0, `M${X + 2} ${Y}v${U}`], [1, 0, `M${X + U - 2} ${Y}v${U}`]].forEach(([dx, dy, dd]) => { const nb = at(x + dx, y + dy); if (!isRoad(nb) && nb != null) marks += L(dd, '#cfc8b8', 4); });
        if (water) marks += L(`M${X} ${Y + 4}h${U}M${X} ${Y + U - 4}h${U}`, '#b03a2e', 3);
        if (zebra && horiz && isWalk(at(x - 1, y - 1))) furn += signal(X - 6, Y - 4);
      } else if (isWalk(c)) {
        if (at(x, y - 1) === '~' && at(x, y + 1) === '~') marks += R(X, Y + 6, U, U - 12, '#c9b28a') + L(`M${X} ${Y + 8}h${U}M${X} ${Y + U - 8}h${U}`, '#b03a2e', 4);
        else if (isRoad(at(x, y + 1)) && x % 4 === 3) furn += lamp(X + 12, Y + U - 6);
        else if (isRoad(at(x, y - 1)) && x % 4 === 1 && !isPl(at(x, y + 1))) furn += lamp(X + U - 12, Y + U - 30);
      } else if (c === '~') {
        marks += waves(X + 6, Y + 20, U - 8, U - 26);
        [[0, -1, `M${X} ${Y + 3}h${U}`], [0, 1, `M${X} ${Y + U - 3}h${U}`], [-1, 0, `M${X + 3} ${Y}v${U}`], [1, 0, `M${X + U - 3} ${Y}v${U}`]].forEach(([dx, dy, dd]) => { const nb = at(x + dx, y + dy); if (nb != null && nb !== '~' && !(isPl(nb) && spotKind(d.places[nb] || {}) === 'bridge')) marks += L(dd, '#e9f2f2', 5, 'opacity=".55"'); });
      }
    }
    // 樹、一般建築（# 依列切成 1～2 格一棟）
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < Wd; x++) if (at(x, y) === '^') { const h = hash(d.id + x + ',' + y); objs.push([y * U + 90, tree(x * U + 34 + h % 12, y * U + 62, 50, treeKind(h), h) + (h % 3 ? tree(x * U + 70, y * U + 92, 44, treeKind(h >>> 2), h >>> 2) : '')]); }
      let x = 0; while (x < Wd) {
        if (at(x, y) !== '#') { x++; continue; }
        let run = 0; while (at(x + run, y) === '#') run++;
        let i = 0; while (i < run) { const h = hash(d.id + (x + i) + 'b' + y), w = run - i >= 2 && h % 3 === 0 ? 2 : 1; objs.push([y * U + 92, bldg((x + i) * U, y * U, w * U, U, h, at(x + i, y + 1))]); i += w; }
        x += run;
      }
    }
    // places（連在一起的同一字母 = 一棟）
    const seen = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y); if (!isPl(c) || seen[x + ',' + y]) continue;
      const q = [[x, y]], ts = []; seen[x + ',' + y] = 1;
      while (q.length) { const [a, b] = q.shift(); ts.push([a, b]); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = (a + dx) + ',' + (b + dy); if (at(a + dx, b + dy) === c && !seen[k]) { seen[k] = 1; q.push([a + dx, b + dy]); } }); }
      const xs = ts.map(t => t[0]), ys = ts.map(t => t[1]), B = { x: Math.min(...xs) * U, y: Math.min(...ys) * U, w: (Math.max(...xs) - Math.min(...xs) + 1) * U, h: (Math.max(...ys) - Math.min(...ys) + 1) * U };
      const p = d.places[c]; let art = '';
      try {
        if (p.type === 'shop') { const a = shopArt(shops[p.shop]); art = (ARCH[a[0]] || ARCH.retail)(B, a); }
        else if (p.type === 'gate') art = gateArt(B, p, ctx);
        else if (p.type === 'spot') art = spotArt(B, p, ctx);
        else if (p.type === 'npc') { const cx = B.x + B.w / 2, by = B.y + B.h - 10; art = E(cx, by, 24, 7, '#fff', 'opacity=".5"') + person(cx, by, 66, hash(p.name || c), roleOf(p)) + R(cx + 8, B.y + 4, 26, 17, '#ffffff', 8, OL) + P(`M${cx + 12} ${B.y + 20}l-3 6 9-6z`, '#ffffff') + C(cx + 15, B.y + 12.5, 2, '#5f6b74') + C(cx + 21, B.y + 12.5, 2, '#5f6b74') + C(cx + 27, B.y + 12.5, 2, '#5f6b74'); }
        else if (p.type === 'sign') art = R(B.x + B.w / 2 - 2.5, B.y + 58, 5, B.h - 64, '#7a8590') + E(B.x + B.w / 2, B.y + B.h - 6, 10, 3, '#000', 'opacity=".18"');
      } catch (e) { art = ''; }
      objs.push([B.y + B.h, art]);
    }
    objs.sort((a, b) => a[0] - b[0]);
    const defs = `<defs><pattern id="${id}p" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M0 .5H50M.5 0V50" fill="none" style="stroke:var(--wd-art-line)" stroke-width="1.5" opacity=".55"/></pattern></defs>`;
    return defs + `<g>${ground}</g><g>${marks}</g><g class="ob">${objs.map(o => o[1]).join('')}${furn}</g>`;
  }
  function bldg(x, y, w, h, hs, below) {
    const wall = pick(WALLS, hs), roof = pick(ROOFS, hs >>> 3), X = x + 4, Wd = w - 8, top = y + 14, bot = y + h - 4;
    let s = R(X, top, Wd, bot - top, wall, 1, OL) + R(X - 2, top - 8, Wd + 4, 10, roof, 2, OL);
    const cols = Math.max(2, Math.round(Wd / 30)), cw = Wd / cols;
    for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) { const lit = (hs >>> (r * 3 + c)) % 5 === 0; s += R(X + c * cw + cw * .22, top + 8 + r * 24, cw * .56, 14, lit ? '#ffe39a' : '#a9c8da', 1.5); }
    if (below === '.' || below === '=') s += R(x + w / 2 - 9, bot - 20, 18, 20, '#6b5a4a', 1);
    if (hs % 4 === 0) s += R(X + Wd - 16, top - 16, 10, 8, '#9aa3a8', 1) ;
    return s;
  }
  function lamp(x, by) { return E(x, by, 5, 1.8, '#000', 'opacity=".2"') + R(x - 1.5, by - 40, 3, 40, '#5f6b74') + P(`M${x - 1.5} ${by - 40}q0 -6 9 -6v3q-6 0-6 3z`, '#5f6b74') + E(x + 9, by - 41, 5, 2.6, '#ffe39a', OL); }
  function signal(x, y) { return R(x - 1.5, y - 2, 3, 30, '#5f6b74') + R(x - 5, y - 18, 10, 22, '#2b2f35', 2) + C(x, y - 13, 2.8, '#e0483c') + C(x, y - 6, 2.8, '#3fbf6a', 'opacity=".5"') + C(x, y + 1, 2.8, '#f6c400', 'opacity=".4"'); }

  /* =========================================================
     店內區域卡圖示（32×32）：依 type＋icon/名稱 選圖，貨架依商品類別上色
     ========================================================= */
  const CAT = [
    [/🥤|🧊|🍦|🥛|飲|冷|ドリンク|アイス|ビール|酒/, 'cold'],
    [/👔|👕|👖|👘|👚|👟|👡|🧢|🧣|🧤|🧥|🎀|服|衣|靴|帽/, 'cloth'],
    [/💄|🧴|💊|🩹|😷|👁️|💇|薬|化粧|コスメ|スキンケア/, 'care'],
    [/🍙|🍱|🍚|🍜|🍘|🍠|🍡|🍪|🍫|🍬|🍰|🥐|🥪|🥮|🌰|🍄|🍓|🥭|🥒|🥔|🥬|🦀|🐟|🐠|🐡|🍳|🥩|🧂|🍣|🍽️|🥢|🍵|🍶|弁当|菓子|パン|食/, 'food'],
    [/.*/, 'goods']
  ];
  const CATC = { cold: ['#3d8bd9', '#5fd0ff', '#f2f2f2', '#e95a4f'], cloth: ['#8e6bd9', '#f07fb0', '#3d8bd9', '#f2b33d'], care: ['#f07fb0', '#5fc7b0', '#ffffff', '#b98be0'], food: ['#f2b33d', '#e95a4f', '#7cc36a', '#c8763a'], goods: ['#2f9c95', '#8e6bd9', '#f2b33d', '#e95a4f'] };
  const catOf = z => { const t = (z.icon || '') + (z.jp || '') + (z.zh || ''); return CAT.find(([re]) => re.test(t))[1]; };
  const ZS = 32;
  const zsvg = inner => `<svg class="wa-z" viewBox="0 0 ${ZS} ${ZS}" aria-hidden="true">${R(0, 0, ZS, ZS, '#f3efe6', 8)}<g transform="translate(3 3) scale(.8125)">${inner}</g></svg>`;
  function zShelf(cat) {
    const c = CATC[cat]; let s = E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(3, 4, 26, 26, '#8c8f94', 2) + R(5, 6, 22, 22, '#eceae4', 1);
    if (cat === 'cold') { s = E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(4, 2, 24, 28, '#6f7a85', 2.5) + R(6, 4, 20, 24, '#cfeaf5', 1.5); for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) s += R(7.5 + i * 4.6, 6.5 + r * 7.7, 3, 5.6, c[(r + i) % 4], 1); return s + L('M16 4v24', '#6f7a85', 1.2) + P('M8 5 13 5 9 27 7 27z', '#fff', 'opacity=".35"'); }
    if (cat === 'cloth') { s = E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + L('M4 6h24M6 6v24M26 6v24', '#7a8590', 2); for (let i = 0; i < 4; i++) s += L(`M${8.5 + i * 5} 6v2`, '#7a8590', 1) + P(`M${6.5 + i * 5} 9.5l2-1.5 2 1.5 1 .5v11h-6v-11z`, c[i % 4]); return s; }
    for (let r = 0; r < 3; r++) { s += R(5, 13 + r * 7.5, 22, 1.6, '#8c8f94'); for (let i = 0; i < 5; i++) s += R(6 + i * 4.3, 7.5 + r * 7.5 + (i % 2), 3.4, 5.5 - (i % 2), c[(r * 2 + i) % 4], .8); }
    return s;
  }
  const ZONE_ART = {
    register: () => E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(2, 18, 28, 12, '#c8a874', 1.5, OL) + R(2, 16, 28, 3, '#9a7a4a', 1) + R(16, 7, 11, 9, '#4a5560', 1.5, OL) + R(17.5, 8.5, 8, 4, '#8fe0b0', 1) + R(7, 11, 7, 5, '#2b2f35', 1) + R(8, 12, 5, 2, '#5fd0ff'),
    kitchen: () => E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(2, 18, 28, 12, '#b9bfc4', 1.5, OL) + R(2, 16, 28, 3, '#8c9298', 1) + E(16, 13, 8, 3, '#3a3f46') + R(9, 9, 14, 5, '#5f6b74', 1.5) + L('M12 7c-1-2 1-3 0-5M16 7c-1-2 1-3 0-5M20 7c-1-2 1-3 0-5', '#9aa3a8', 1.2, 'stroke-linecap="round"'),
    desk: g2 => E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(2, 17, 28, 13, '#e7e2d6', 1.5, OL) + R(2, 15, 28, 3, '#8a6b4a', 1) + R(4, 20, 24, 3, '#2a6fdb', 1, 'opacity=".7"') + R(17, 5, 11, 8, '#3a3f46', 1.5) + R(18.5, 6.5, 8, 5, '#8fd0ea', .8) + R(21.5, 13, 2, 2, '#3a3f46') + C(9, 9, 5.5, '#f2b33d', OL) + glyph(g2 || 'bell', 9, 9, 7.5, '#fff'),
    table: () => E(16, 30, 14, 1.6, '#000', 'opacity=".15"') + R(5, 4, 5, 9, '#a0704a', 1.5) + R(22, 4, 5, 9, '#a0704a', 1.5) + R(3, 13, 26, 4, '#c8935a', 1.5, OL) + R(6, 17, 2.5, 12, '#8a5a3a') + R(23.5, 17, 2.5, 12, '#8a5a3a') + R(3, 21, 6, 3, '#a0704a', 1) + R(23, 21, 6, 3, '#a0704a', 1) + C(13, 11.5, 2.4, '#fff', OL) + R(17, 10, 2, 3.5, '#f2b33d'),
    stool: () => E(16, 30, 14, 1.6, '#000', 'opacity=".15"') + R(2, 8, 28, 4, '#8a5a3a', 1.5, OL) + R(3, 12, 26, 6, '#c8935a') + [6, 16, 26].map(x => E(x, 21, 3.6, 1.6, '#e0483c', OL) + R(x - .8, 22, 1.6, 7, '#7a8590')).join(''),
    grill: () => E(16, 30, 14, 1.6, '#000', 'opacity=".15"') + R(3, 14, 26, 4, '#5a3a2a', 1.5, OL) + R(6, 18, 3, 11, '#4a3020') + R(23, 18, 3, 11, '#4a3020') + E(16, 13, 7, 2.6, '#2b2b2b') + L('M10 12.5h12M11 14h10', '#e0883a', 1) + L('M13 9c-1-2 1-3 0-5M17 9c-1-2 1-3 0-5', '#b9bfc4', 1.2, 'stroke-linecap="round"'),
    tatami: () => E(16, 30, 14, 1.6, '#000', 'opacity=".15"') + R(1, 20, 30, 9, '#c9c98a', 1, OL) + L('M11 20v9M21 20v9', '#8a8a4a', .8) + R(7, 14, 18, 3.5, '#7a4a2a', 1.5, OL) + R(9, 17.5, 2, 3, '#5a3a2a') + R(21, 17.5, 2, 3, '#5a3a2a') + R(2, 24, 6, 4, '#c0392b', 1) + R(24, 24, 6, 4, '#c0392b', 1) + C(16, 12.5, 2, '#f2f2f2', OL),
    sofa: () => E(16, 30, 14, 1.6, '#000', 'opacity=".15"') + R(3, 9, 26, 12, '#5a7fb0', 3, OL) + R(1, 15, 6, 11, '#4a6a98', 2.5) + R(25, 15, 6, 11, '#4a6a98', 2.5) + R(6, 18, 20, 8, '#6c92c4', 2) + R(5, 26, 2, 3, '#3a3f46') + R(25, 26, 2, 3, '#3a3f46'),
    vend: c => E(16, 30, 11, 1.6, '#000', 'opacity=".15"') + R(6, 2, 20, 28, c || '#d9473c', 2, OL) + R(8, 4, 16, 13, '#e8f4f8', 1) + [0, 1, 2].map(r => [0, 1, 2, 3].map(i => R(9 + i * 3.6, 5 + r * 4.2, 2.4, 3.4, ['#3d8bd9', '#f2b33d', '#4caf50', '#e95a4f'][(r + i) % 4], .6)).join('')).join('') + R(8, 19, 10, 3, '#2b2f35', .8) + R(20, 19, 4, 6, '#c8ccd0', .8) + R(8, 24.5, 16, 3.5, '#2b2f35', 1),
    kiosk: () => E(16, 30, 11, 1.6, '#000', 'opacity=".15"') + R(6, 3, 20, 27, '#6f7a85', 2, OL) + R(8.5, 5.5, 15, 10, '#5fd0ff', 1) + R(10, 7, 6, 2, '#fff', .5) + R(10, 10.5, 11, 1.5, '#fff', .5, 'opacity=".7"') + R(9, 18, 6, 4, '#c8ccd0', .8) + R(17, 18, 6, 1.6, '#2b2f35') + R(9, 24.5, 14, 3, '#2b2f35', 1),
    atm: () => E(16, 30, 11, 1.6, '#000', 'opacity=".15"') + R(5, 2, 22, 28, '#2a6fdb', 2.5, OL) + R(8, 5, 16, 9, '#bfe8f8', 1) + glyph('yen', 16, 9.5, 7, '#2a6fdb') + R(8, 16, 16, 7, '#d8dde2', 1) + [0, 1, 2].map(i => R(9.5 + i * 4.6, 17.5, 3.4, 1.6, '#5f6b74')).join('') + [0, 1, 2].map(i => R(9.5 + i * 4.6, 20.2, 3.4, 1.6, '#5f6b74')).join('') + R(9, 25.5, 14, 2, '#2b2f35', 1),
    locker: () => E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + R(3, 3, 26, 27, '#7a8590', 2, OL) + [0, 1, 2].map(r => [0, 1, 2].map(i => R(4.5 + i * 8, 4.5 + r * 8.3, 7, 7.5, '#c8d4dc', 1) + C(9.5 + i * 8, 8.3 + r * 8.3, .9, '#5f6b74')).join('')).join(''),
    elevator: () => R(5, 3, 22, 27, '#9aa3a8', 2, OL) + R(7, 8, 18, 22, '#cfd6dc', 1) + L('M16 8v22', '#7a8590', 1.2) + R(12, 3.5, 8, 4, '#2b2f35', 1) + P('M16 4.2l2 2.4h-4z', '#f2b33d'),
    toilet: () => R(2, 3, 28, 26, '#f4f6f8', 3, OL) + C(9.5, 8.5, 2.6, '#2a6fdb') + P('M6.5 12.5h6l1 7h-2v6.5H7.5v-6.5h-2z', '#2a6fdb') + R(15.4, 6, 1.2, 21, '#9aa3a8') + C(22.5, 8.5, 2.6, '#e0483c') + P('M20 12.5h5l2.5 8h-3V26h-4v-5.5h-3z', '#e0483c'),
    trash: () => E(16, 30, 13, 1.6, '#000', 'opacity=".15"') + [['#3d8bd9', 3], ['#4caf50', 12], ['#e95a4f', 21]].map(([c, x]) => R(x, 12, 8, 17, c, 1.5, OL) + R(x - .5, 10, 9, 3, '#3a3f46', 1) + R(x + 2.5, 15, 3, 3, '#fff', 1.5, 'opacity=".7"')).join(''),
    water: () => E(16, 30, 9, 1.6, '#000', 'opacity=".15"') + R(10, 12, 12, 18, '#c8ccd0', 2, OL) + R(7, 9, 18, 4, '#9aa3a8', 1.5) + L('M16 9c0-3 3-5 5-4', '#5fb0e0', 1.8, 'stroke-linecap="round"') + glyph('drop', 16, 21, 8, '#3d8bd9'),
    door: () => R(7, 2, 18, 28, '#8a5a3a', 1.5, OL) + R(9.5, 4.5, 13, 23, '#a8744a', 1) + C(20, 17, 1.4, '#f2c500') + R(3, 29, 26, 2, '#7a8590', .5),
    shoe: () => R(3, 4, 26, 26, '#b08a5a', 2, OL) + [0, 1, 2].map(r => [0, 1, 2].map(i => R(5 + i * 7.7, 6 + r * 7.8, 6.5, 6.5, '#8a6a3a', 1)).join('')).join('') + glyph('shoe', 16, 29, 10, '#3a3f46'),
    bath: () => R(2, 2, 28, 28, '#dff1f6', 4, OL) + E(16, 21, 12, 6, '#7ec8e3') + glyph('onsen', 16, 13, 16, '#e0483c'),
    fitting: () => L('M4 4h24', '#7a8590', 2) + P('M5 5h10v24H5z', '#c0392b') + P('M17 5h10v24H17z', '#a8322a') + L('M8 5v24M12 5v24M20 5v24M24 5v24', '#000', .8, 'opacity=".2"'),
    board: g2 => E(16, 30, 10, 1.6, '#000', 'opacity=".15"') + R(15, 18, 2, 12, '#7a8590') + R(3, 3, 26, 17, '#2a6fdb', 2, OL) + R(5, 5, 22, 13, '#e8f1fb', 1) + glyph(g2 || 'info', 16, 11.5, 11, '#2a6fdb'),
    machineC: g2 => E(16, 30, 11, 1.6, '#000', 'opacity=".15"') + R(6, 3, 20, 27, '#5f6b74', 2, OL) + R(8.5, 5.5, 15, 10, '#bfe8f8', 1) + glyph(g2, 16, 10.5, 9, '#2a6fdb') + R(9, 18, 14, 2, '#2b2f35') + R(9, 24, 14, 3, '#2b2f35', 1),
    panel: g2 => E(16, 30, 11, 1.6, '#000', 'opacity=".15"') + C(16, 14, 12, '#5f7484', OL) + glyph(g2 || 'pin', 16, 14, 14, '#fff') + R(15, 26, 2, 4, '#7a8590')
  };
  const FAC = [
    [/🚻|トイレ|化粧室|お手洗/, 'toilet'], [/🏧|ATM/, 'atm'], [/🔼|エレベーター|エスカレーター/, 'elevator'], [/🔐|ロッカー|コインロッカー/, 'locker'], [/🗑️|ゴミ/, 'trash'], [/🚰|💧|給水|ウォーター/, 'water'],
    [/🚪|出口|入口|ドア/, 'door'], [/👞|下駄箱|靴/, 'shoe'], [/♨️|🛁|🚿|風呂|湯|シャワー/, 'bath'], [/👕|🧥|試着/, 'fitting'], [/🪑|🛋️|休憩|待合|ベンチ/, 'sofa'],
    [/ℹ️|🗺️|案内|マップ|地図/, ['board', 'info']], [/🚬|喫煙/, ['panel', 'smoke']], [/👶|ベビー|授乳/, ['panel', 'baby']], [/☕|コーヒー/, ['machineC', 'cup']], [/🖨️|コピー/, ['machineC', 'map']], [/📶|📱|🔌|Wi|充電/, ['machineC', 'wifi']],
    [/🛂|🛃|審査|税関|検疫/, ['desk', 'passport']], [/🎫|🎟️|券/, ['machineC', 'ticket']], [/💱|両替/, ['machineC', 'yen']], [/📦|🧳|荷物|宅配/, ['desk', 'bag']]
  ];
  function zoneArt(z) {
    const t = z.type, ic = (z.icon || '') + ' ' + (z.jp || '') + (z.zh || '');
    let k;
    if (t === 'shelf') return zShelf(catOf(z));
    if (t === 'machine') k = /🏧|ATM/.test(ic) ? 'atm' : /🔐/.test(ic) ? 'locker' : /🥤|🥛|🍦|🍺|🥚|🥠|飲|自販|自動販売/.test(ic) ? ['vend', /🍺|🥚|🥠/.test(ic) ? '#2a6fdb' : '#d9473c'] : ['kiosk'];
    else if (t === 'counter') k = /レジ|会計|お会計|💴|🧾/.test(ic) ? 'register' : /🧑‍🍳|🔪|🔥|🍳|🐙|🍡|🥟|🍗|🍘|🍟|🍩|🍦|🧋|🥗|🐟|厨房|キッチン/.test(ic) ? 'kitchen' : /レジ|会計|💴|🧾|🛍️/.test(ic) ? 'register' : ['desk', /🎫|🎟️|🚄|🚆|券|切符/.test(ic) ? 'ticket' : /🛂|🛃|審査|税関/.test(ic) ? 'passport' : /🔑|🛎️|フロント/.test(ic) ? 'key' : /🧳|🛄|📦/.test(ic) ? 'bag' : /💱|両替/.test(ic) ? 'yen' : /📶/.test(ic) ? 'wifi' : /ℹ️|案内/.test(ic) ? 'info' : 'bell'];
    else if (t === 'seat') k = /🔥|焼/.test(ic) ? 'grill' : /💺|カウンター/.test(ic) ? 'stool' : /🎎|🟫|🍵|🧘|座敷|畳|お座敷/.test(ic) ? 'tatami' : /🛋️|ソファ/.test(ic) ? 'sofa' : 'table';
    else if (t === 'facility') { const f = FAC.find(([re]) => re.test(ic)); k = f ? f[1] : ['panel', 'pin']; }
    else k = ['panel', 'star'];
    const [name, arg] = Array.isArray(k) ? k : [k];
    return (ZONE_ART[name] || ZONE_ART.panel)(arg);
  }

  /* ---------------- 日本地圖：地區徽章、御朱印、所在地圖釘 ---------------- */
  const REGION = {
    tokyo: () => E(20, 37, 10, 2, '#000', 'opacity=".15"') + P('M10 37 18.5 4h3L30 37h-4l-6-20-6 20z', '#e0483c', OL) + R(13, 22, 14, 3.5, '#f4f1e8', 1, OL) + R(15.5, 12, 9, 3, '#f4f1e8', 1, OL) + L('M20 4V1', '#666', 1.5) + L('M15 27.5h10M16.5 32h7', '#b03a2e', 1.2),
    kyoto: () => E(20, 37, 14, 2, '#000', 'opacity=".15"') + torii(20, 37, 34, 32),
    osaka: () => E(20, 37, 14, 2, '#000', 'opacity=".15"') + P('M5 37l2-8h26l2 8z', '#9a9488', OL) + R(8, 22, 24, 7, '#f8f6f0', 0, OL) + tileRoof(8, 17, 24, 5.5, '#4d8a78') + R(11, 12, 18, 5, '#f8f6f0', 0, OL) + tileRoof(11, 7.5, 18, 5, '#4d8a78') + R(18.5, 3, 3, 3, '#d4a72c') + R(18, 30, 4, 7, '#3a3f46'),
    hokkaido: () => E(20, 37, 15, 2, '#000', 'opacity=".15"') + P('M3 36 15 12l5 7 5-5 12 22z', '#6a8fb0', OL) + P('M11.5 19 15 12l5 7 5-5 4 7-3-1-3 3-4-4-4 3z', '#fff') + glyph('snow', 31, 8, 10, '#5fb0e0'),
    okinawa: () => [0, 1, 2, 3, 4].map(i => P('M20 20c-3-6-2-13 0-15 2 2 3 9 0 15z', '#e0483c', `transform="rotate(${i * 72} 20 20)"`)).join('') + C(20, 20, 3.4, '#f6c400') + L('M20 20l7-9', '#f6c400', 1.4) + C(27, 11, 1.4, '#f6c400')
  };
  const region = id => `<svg class="wa-reg" viewBox="0 0 40 40" aria-hidden="true">${(REGION[id] || (() => glyph('pin', 20, 20, 34, '#e0483c')))()}</svg>`;
  const seal = () => `<svg class="wa-seal" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" fill="#d9473c"/><rect x="4.5" y="4.5" width="15" height="15" rx="2.5" fill="none" stroke="#fff" stroke-width="1.4" opacity=".85"/><g transform="translate(6 6) scale(.5)">${GL.torii('#fff')}</g></svg>`;
  const pin = () => `<svg class="wa-pin" viewBox="0 0 24 30" aria-hidden="true"><ellipse cx="12" cy="28" rx="5" ry="1.6" fill="#000" opacity=".2"/><path d="M12 28s9-9.5 9-16a9 9 0 0 0-18 0c0 6.5 9 16 9 16z" class="wa-pin-b" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="#fff"/></svg>`;
  // 玩家：主色外套、背包、腳下所在位置環
  const me = () => `<svg viewBox="0 0 40 48" aria-hidden="true"><ellipse cx="20" cy="44.5" rx="13" ry="3.6" class="me-r" fill="none" stroke-width="2"/><ellipse cx="20" cy="44.5" rx="9" ry="2.4" fill="#000" opacity=".22"/><rect x="14" y="36" width="5" height="9" rx="2" fill="#3a3f46"/><rect x="21" y="36" width="5" height="9" rx="2" fill="#3a3f46"/><rect x="25" y="26" width="9" height="13" rx="2.5" fill="#8a5a3b" stroke="#2b2620" stroke-opacity=".3"/><path d="M9 39 Q9.5 25 20 24.5 Q30.5 25 31 39Z" class="me-b" stroke="#2b2620" stroke-opacity=".3" stroke-width="1.2"/><path d="M15 25.5 L18 33 M25 25.5 L22 33" stroke="#6b4425" stroke-width="1.6"/><circle cx="20" cy="15" r="10" fill="#f6d3b3" stroke="#2b2620" stroke-opacity=".25" stroke-width="1.2"/><path d="M10 14 Q10 4 20 4 Q30 4 30 14 Q26 9 20 9 Q14 9 10 14Z" fill="#2b2118"/><path d="M9 11.5 Q20 1 31 11.5 L30 9 Q20 -1 10 9Z" class="me-b"/><circle cx="16.5" cy="16" r="1.5" fill="#2b2b2b"/><circle cx="23.5" cy="16" r="1.5" fill="#2b2b2b"/><path d="M17.5 20 Q20 21.6 22.5 20" stroke="#7a3b2e" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;

  window.WorldArt = { district, zone: z => zsvg(zoneArt(z)), region, seal, pin, me, shopArt };
})();
