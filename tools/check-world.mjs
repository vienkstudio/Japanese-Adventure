// 檢查 data/world/ 的地圖與店家資料。用法：node tools/check-world.mjs [檔名（不含路徑，可多個）]
// 不給檔名 = 檢查 index.js 列出的全部檔案（含跨檔參照）。格式說明：docs/世界資料格式.md
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'world');
const ctx = { window: {}, console };
ctx.window = ctx; vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
run('index.js');
const W = ctx.WORLD;
const args = process.argv.slice(2).map(a => path.basename(a).replace(/\.js$/, ''));
const all = W.regions.flatMap(r => r.files);
const partial = args.length > 0;
const files = partial ? args : all;
const errs = [], warns = [];
let cur = '';
const E = m => errs.push(`[${cur}] ${m}`), Wn = m => warns.push(`[${cur}] ${m}`);
for (const f of files) {
  cur = f;
  if (!fs.existsSync(path.join(ROOT, f + '.js'))) { (partial ? E : Wn)(`檔案不存在：data/world/${f}.js`); continue; }
  try { run(f + '.js'); } catch (e) { E('語法或執行錯誤：' + e.message); }
}

const SCENES = ['konbini', 'ramen', 'cafe', 'drugstore', 'izakaya', 'clothes', 'directions', 'station', 'hotel', 'shrine', 'airport', 'emergency', 'yakiniku'];
const CNT = ['tsu', 'ko', 'mai', 'hon', 'hai', 'satsu', 'nin', 'soku', 'chaku', 'hako', 'fukuro', 'sara', 'dai', 'haku', 'kai', 'mei'];
const STYLES = ['y', 'g', 'b', 'r', 'k', 'w', 'o', 'p'];
const isStr = s => typeof s === 'string' && s.trim().length > 0;
const KANA_OK = /^[぀-ゟー、。！？・…\s「」（）〜~,.!?0-9０-９]*$/;
const need = (o, keys, what) => keys.forEach(k => { if (!isStr(o[k])) E(`${what} 缺少 ${k}`); });
function kanaPair(o, what) {   // {jp,kana,zh}
  if (!o || typeof o !== 'object') return E(`${what} 應為 {jp,kana,zh}`);
  need(o, ['jp', 'zh'], what);
  if (typeof o.kana !== 'string') E(`${what} 缺少 kana`);
  else if (!KANA_OK.test(o.kana)) E(`${what} 的 kana 含有非平假名字元：「${o.kana}」`);
}
const kanaOnly = (k, what) => { if (typeof k !== 'string' || !k) E(`${what} 缺少 kana`); else if (!KANA_OK.test(k)) E(`${what} 的 kana 含有非平假名字元：「${k}」`); };

function grid(map, what, min, max) {
  if (!Array.isArray(map) || !map.length || map.some(r => typeof r !== 'string')) { E(`${what} map 應為字串陣列`); return null; }
  const w = map[0].length;
  if (map.some(r => r.length !== w)) { E(`${what} map 每列長度不一致（${map.map(r => r.length).join(',')}）`); return null; }
  if (w < min[0] || w > max[0] || map.length < min[1] || map.length > max[1]) E(`${what} map 尺寸 ${w}×${map.length} 超出範圍（寬 ${min[0]}–${max[0]}、高 ${min[1]}–${max[1]}）`);
  return { w, h: map.length, at: (x, y) => (y < 0 || y >= map.length || x < 0 || x >= w) ? null : map[y][x] };
}
function reach(g, walk, start) {   // 回傳可走到的格子集合
  const seen = new Set(); const q = [start]; seen.add(start[0] + ',' + start[1]);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, c = g.at(nx, ny); if (c == null || !walk(c) || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny]); } }
  return seen;
}
function keysOnMap(g, map, base) {
  const out = {};
  map.forEach((row, y) => [...row].forEach((c, x) => { if (!base.includes(c)) (out[c] = out[c] || []).push([x, y]); }));
  return out;
}
function checkReach(g, keys, walk, start, what) {
  if (!Array.isArray(start) || start.length !== 2 || !walk(g.at(start[0], start[1]) || '#')) { E(`${what} start ${JSON.stringify(start)} 不是可走的格子`); return; }
  const seen = reach(g, walk, start);
  for (const k in keys) {
    const ok = keys[k].some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy))));
    if (!ok) E(`${what} 的「${k}」沒有緊鄰可走到的格子`);
  }
}

/* ---------- 街區 ---------- */
const sceneUsed = {};
for (const id in W.districts) {
  const d = W.districts[id]; cur = 'district ' + id;
  need(d, ['id', 'name', 'jp', 'kana', 'icon', 'desc'], '街區'); kanaOnly(d.kana, '街區');
  const g = grid(d.map, '街區', [9, 9], [11, 13]); if (!g) continue;
  const BASE = '=.#^~ ';
  const keys = keysOnMap(g, d.map, BASE), P = d.places || {};
  for (const k in keys) if (!P[k]) E(`地圖上的「${k}」沒有在 places 定義`);
  for (const k in P) if (!keys[k]) E(`places.${k} 沒有畫在地圖上`);
  checkReach(g, keys, c => c === '=' || c === '.', d.start, '街區');
  const cnt = { shop: 0, gate: 0, spot: 0, sign: 0, npc: 0 };
  for (const k in P) {
    const p = P[k], w = `places.${k}`;
    if (!(p.type in cnt)) { E(`${w} type「${p.type}」不合法`); continue; }
    cnt[p.type]++;
    if (p.type === 'shop') { if (!isStr(p.shop)) E(`${w} 缺少 shop`); else if (!W.shops[p.shop]) (partial ? Wn : E)(`${w} 指向不存在的店 ${p.shop}`); }
    if (p.type === 'gate' || p.type === 'spot' || p.type === 'npc') { need(p, ['icon', 'name', 'jp'], w); kanaOnly(p.kana, w); }
    if (p.type === 'spot') { need(p, ['tip'], w); if (p.say) kanaPair(p.say, w + '.say'); }
    if (p.type === 'sign') { kanaPair(p, w); if (p.style && !STYLES.includes(p.style)) E(`${w} style 不合法`); }
    if (p.type === 'npc') { if (!Array.isArray(p.lines) || p.lines.length < 2) E(`${w} lines 至少 2 句`); else p.lines.forEach((l, i) => kanaPair(l, `${w}.lines[${i}]`)); }
  }
  if (cnt.gate !== 1) E(`gate 應恰好 1 個（目前 ${cnt.gate}）`);
  if (cnt.shop < 2) E(`shop 至少 2 間（目前 ${cnt.shop}）`);
  if (cnt.spot < 1) E('至少 1 個 spot');
  if (cnt.npc < 1) E('至少 1 個 npc');
  if (cnt.sign < 1) Wn('建議至少 1 個 sign');
}

/* ---------- 店 ---------- */
for (const id in W.shops) {
  const s = W.shops[id]; cur = 'shop ' + id;
  if (!/^[a-z0-9-]+$/.test(id)) E('id 只能用小寫英數與 -');
  if (!['store', 'eat', 'service'].includes(s.kind)) E(`kind「${s.kind}」不合法`);
  if (s.scene !== null && !SCENES.includes(s.scene)) E(`scene「${s.scene}」不合法（沒有就填 null）`);
  if (s.scene) { if (sceneUsed[s.scene]) E(`scene ${s.scene} 已被 ${sceneUsed[s.scene]} 使用`); sceneUsed[s.scene] = id; }
  need(s, ['icon', 'name', 'jp', 'kana', 'desc'], '店'); kanaOnly(s.kana, '店');
  if (!Array.isArray(s.tips) || s.tips.length < 3 || s.tips.length > 6) E('tips 應有 3–6 條');
  const g = grid(s.map, '店', [7, 7], [11, 11]); if (!g) continue;
  const flat = s.map.join(''), exits = [...flat].filter(c => c === '+').length;
  if (exits !== 1) E(`出口 + 應恰好 1 個（目前 ${exits}）`);
  s.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === '+' && !(x === 0 || y === 0 || x === g.w - 1 || y === g.h - 1)) E('出口 + 必須在最外圈'); }));
  const keys = keysOnMap(g, s.map, '#.+'), Z = s.zones || {};
  for (const k in keys) if (!Z[k]) E(`地圖上的「${k}」沒有在 zones 定義`);
  const zc = {};
  for (const k in Z) {
    const z = Z[k], w = `zones.${k}`;
    if (!['shelf', 'machine', 'menu', 'counter', 'seat', 'facility', 'sign', 'deco'].includes(z.type)) { E(`${w} type「${z.type}」不合法`); continue; }
    zc[z.type] = (zc[z.type] || 0) + 1;
    if (z.type !== 'menu' && !keys[k]) E(`${w} 沒有畫在地圖上`);
    if (z.type === 'menu' && keys[k]) Wn(`${w} 是 menu，不需要畫在地圖上`);
    if (z.type === 'deco') { need(z, ['icon'], w); continue; }
    if (z.type === 'sign') { kanaPair(z, w); if (z.style && !STYLES.includes(z.style)) E(`${w} style 不合法`); continue; }
    need(z, ['icon', 'jp', 'zh'], w); kanaOnly(z.kana, w);
    if (['shelf', 'machine', 'counter', 'facility'].includes(z.type)) { if (!z.loc) E(`${w} 缺少 loc`); else kanaPair(z.loc, w + '.loc'); }
    if (z.type === 'counter' && !(z.npc && isStr(z.npc.who) && isStr(z.npc.emoji))) E(`${w} 缺少 npc:{who,emoji}`);
    if (z.hours) kanaPair(z.hours, w + '.hours');
  }
  checkReach(g, keys, c => c === '.' || c === '+', s.start, '店');
  if (s.start && g.at(s.start[0], s.start[1]) === '+') E('start 不可以是出口');
  const nz = Object.keys(Z).length;
  if (nz < 8 || nz > 18) E(`zones 應有 8–18 個（目前 ${nz}）`);
  if (!zc.counter) E('至少 1 個 counter');
  if ((zc.sign || 0) < 2) E('至少 2 個 sign');
  if (!zc.facility) E('至少 1 個 facility');
  if (s.kind === 'eat') { if (!zc.seat) E('eat 至少 1 個 seat'); if ((zc.menu || 0) + (zc.machine || 0) < 3) E('eat 至少 3 個 menu（或券売機 machine）'); }
  if (s.kind === 'store' && (zc.shelf || 0) < 4) E('store 至少 4 個 shelf');

  /* 商品 */
  const items = s.items || [], ids = new Set(), jps = new Set(), tags = new Set();
  if (items.length < 20 || items.length > 40) E(`items 應有 24–36 個（目前 ${items.length}）`);
  items.forEach((it, i) => {
    const w = `items[${i}] ${it.id || ''}`;
    need(it, ['id', 'jp', 'zh', 'emoji', 'zone'], w); kanaOnly(it.kana, w);
    if (ids.has(it.id)) E(`${w} id 重複`); ids.add(it.id);
    if (jps.has(it.jp)) E(`${w} jp 重複：${it.jp}`); jps.add(it.jp);
    if (/[（(]/.test(it.jp || '')) E(`${w} jp 不要有括號註記`);
    if (typeof it.price !== 'number' || it.price < 0) E(`${w} price 應為 ≥0 的數字`);
    if (it.c && !CNT.includes(it.c)) E(`${w} 量詞 c「${it.c}」不合法`);
    const z = Z[it.zone];
    if (!z) E(`${w} zone「${it.zone}」不存在`); else if (!['shelf', 'machine', 'menu', 'counter'].includes(z.type)) E(`${w} zone「${it.zone}」的類型 ${z.type} 不能放商品`);
    if (it.say) { need(it.say, ['jp'], w + '.say'); kanaOnly(it.say.kana, w + '.say'); }
    (it.tags || []).forEach(t => tags.add(t));
  });
  for (const k in Z) if (['shelf', 'machine', 'menu'].includes(Z[k].type) && !items.some(it => it.zone === k)) E(`zones.${k}（${Z[k].type}）沒有任何商品`);

  /* 問句 */
  const asks = s.asks || [], askBy = {};
  if (asks.length < 4 || asks.length > 9) E(`asks 應有 5–8 個（目前 ${asks.length}）`);
  asks.forEach((a, i) => {
    const w = `asks[${i}] ${a.id || ''}`;
    need(a, ['id', 'zh'], w);
    if (askBy[a.id]) E(`${w} id 重複`); askBy[a.id] = a;
    if (!['enter', 'order', 'pay', 'checkin'].includes(a.phase)) E(`${w} phase「${a.phase}」不合法`);
    if (a.when !== 'always' && !/^tag:.+/.test(a.when || '')) E(`${w} when 應為 always 或 tag:xxx`);
    else if (a.when !== 'always' && !tags.has(a.when.slice(4))) E(`${w} 的標籤 ${a.when} 沒有任何商品使用`);
    if (!Array.isArray(a.v) || a.v.length < 3 || a.v.length > 5) E(`${w} v 應有 3–5 種說法`);
    else a.v.forEach((p, j) => { if (!Array.isArray(p) || !isStr(p[0])) E(`${w}.v[${j}] 應為 [日文, 讀音]`); else kanaOnly(p[1], `${w}.v[${j}]`); });
    if (!Array.isArray(a.a) || a.a.length < 1 || a.a.length > 3) E(`${w} a 應有 1–3 個`);
    else { const vs = new Set(); a.a.forEach((x, j) => { kanaPair(x, `${w}.a[${j}]`); need(x, ['val', 'brief'], `${w}.a[${j}]`); if (vs.has(x.val)) E(`${w} val 重複`); vs.add(x.val); }); }
    if (!Array.isArray(a.bad) || a.bad.length < 1 || a.bad.length > 2) E(`${w} bad 應有 1–2 個`);
    else a.bad.forEach((x, j) => { kanaPair(x, `${w}.bad[${j}]`); need(x, ['fb'], `${w}.bad[${j}]`); });
  });
  const pay = askBy.pay;
  if (!pay) E('缺少付款方式的問句（id:\'pay\'）'); else if ((pay.a || []).length < 2) E('pay 的 a 至少 2 種付款方式');
  const ph = p => asks.filter(a => a.phase === p).length;
  if (s.kind === 'eat') { if (!ph('enter')) E('eat 需要 enter 問句（幾位）'); if (!ph('pay')) E('eat 需要 pay 問句'); }
  if (s.kind === 'service' && ph('checkin') < 3) E(`service 需要 3 題以上 checkin（目前 ${ph('checkin')}）`);

  /* acts / may / info */
  const list = (k, min, max) => { const a = s[k] || []; if (a.length < min || a.length > max) E(`${k} 應有 ${min}–${max} 個（目前 ${a.length}）`); return a; };
  list('acts', 2, 4).forEach((a, i) => { kanaPair(a, `acts[${i}]`); need(a, ['id'], `acts[${i}]`); if (!/[てで]$/.test(a.jp || '')) E(`acts[${i}] jp 要以て形結尾：${a.jp}`); kanaPair(a.re, `acts[${i}].re`); });
  const may = list('may', 2, 4);
  may.forEach((a, i) => { kanaPair(a, `may[${i}]`); need(a, ['id'], `may[${i}]`); if (!/[てで]$/.test(a.jp || '')) E(`may[${i}] jp 要以て形結尾：${a.jp}`); if (typeof a.ok !== 'boolean') E(`may[${i}] 缺少 ok`); kanaPair(a.re, `may[${i}].re`); });
  if (may.length && (!may.some(a => a.ok) || !may.some(a => a.ok === false))) E('may 至少要有 1 個 ok:true 和 1 個 ok:false');
  list('info', 3, 5).forEach((a, i) => { need(a, ['id'], `info[${i}]`); kanaPair(a.q, `info[${i}].q`); kanaPair(a.re, `info[${i}].re`); if (!Array.isArray(a.opts) || a.opts.length !== 3 || !a.opts.every(isStr)) E(`info[${i}] opts 應為 3 個中文選項`); });

  /* 委託 */
  list('quests', 2, 3).forEach((q, i) => {
    const w = `quests[${i}] ${q.id || ''}`;
    need(q, ['id', 'title', 'zh', 'jp'], w); kanaOnly(q.kana, w);
    if (!Array.isArray(q.items) || !q.items.length || q.items.length > 4) { E(`${w} items 應有 1–4 項`); return; }
    const qt = new Set();
    q.items.forEach(([iid, n]) => { const it = items.find(x => x.id === iid); if (!it) E(`${w} 商品 ${iid} 不存在`); else (it.tags || []).forEach(t => qt.add(t)); if (!(n >= 1 && n <= 3)) E(`${w} 數量應為 1–3`); });
    for (const k in (q.prefs || {})) {
      const a = askBy[k];
      if (!a) { E(`${w} prefs.${k} 沒有對應的問句`); continue; }
      if (!(a.a || []).some(x => x.val === String(q.prefs[k]))) E(`${w} prefs.${k}='${q.prefs[k]}' 不是該問句的 val`);
      if (a.when !== 'always' && !qt.has(a.when.slice(4))) E(`${w} prefs.${k}：任務商品沒有標籤 ${a.when}，店員不會問這題`);
      if (a.phase === 'checkin') E(`${w} prefs.${k}：checkin 問句不屬於買東西的流程`);
    }
  });

  /* 對話 */
  const dl = s.dialogues || [];
  if (!s.scene && dl.length < 1) E('沒有 scene 的店需要 1 段 dialogues');
  dl.forEach((d, i) => {
    const w = `dialogues[${i}]`;
    need(d, ['title'], w);
    if (!Array.isArray(d.steps) || d.steps.length < 5 || d.steps.length > 9) { E(`${w} steps 應有 6–8 輪`); return; }
    d.steps.forEach((st, j) => {
      const ws = `${w}.steps[${j}]`;
      need(st, ['speaker', 'emoji', 'jp', 'zh'], ws);
      if (typeof st.kana !== 'string' || !KANA_OK.test(st.kana)) E(`${ws} kana 不合法`);
      if (!Array.isArray(st.choices) || st.choices.length !== 3) { E(`${ws} choices 應為 3 個`); return; }
      st.choices.forEach((c, k) => { kanaPair(c, `${ws}.choices[${k}]`); need(c, ['feedback'], `${ws}.choices[${k}]`); if (typeof c.correct !== 'boolean') E(`${ws}.choices[${k}] 缺少 correct`); });
      if (!st.choices.some(c => c.correct)) E(`${ws} 沒有正確選項`);
    });
  });
}

/* ---------- 地區 ---------- */
if (!partial) for (const r of W.regions) {
  cur = 'region ' + r.id;
  const ds = Object.values(W.districts).filter(d => d.region === r.id);
  if (!ds.length) Wn('沒有任何街區');
  r.order.forEach(id => { if (!W.districts[id]) E(`order 裡的街區 ${id} 不存在`); });
  const placed = new Set(ds.flatMap(d => Object.values(d.places || {}).filter(p => p.type === 'shop').map(p => p.shop)));
  Object.values(W.shops).filter(s => s.region === r.id && !placed.has(s.id)).forEach(s => E(`店 ${s.id} 沒有放在任何街區`));
}

const nd = Object.keys(W.districts).length, ns = Object.keys(W.shops).length, ni = Object.values(W.shops).reduce((a, s) => a + (s.items || []).length, 0);
console.log(`街區 ${nd}、店 ${ns}、商品 ${ni}`);
warns.forEach(w => console.log('警告 ' + w));
errs.forEach(e => console.log('錯誤 ' + e));
console.log(errs.length ? `✗ ${errs.length} 個錯誤、${warns.length} 個警告` : `✓ 0 個錯誤、${warns.length} 個警告`);
process.exit(errs.length ? 1 : 0);
