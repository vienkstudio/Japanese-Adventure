// 建置 3D 心智圖資料：node tools/build-mind.mjs
// 輸入：tools/src/n*.csv（open-anki-jlpt-decks, MIT）＋ tools/annot/out/*.tsv（加註）＋ tools/annot/out/grammar-*.jsonl
// 輸出：data/mind/lex-n5.js … lex-n1.js、data/mind/grammar.js
import fs from 'node:fs';
import vm from 'node:vm';
import { readLevel } from './csv.mjs';

const ROOT = new URL('../', import.meta.url);
const P = p => new URL(p, ROOT);
const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(P(f), 'utf8'), ctx, { filename: f });
run('data/mind/taxonomy.js'); run('data/mind/conj.js');
const M = ctx.window.MIND;
const WH = new Set(M.WH.map(w => w.id)), SC = new Set(M.SCENES.map(s => s.id)), POS = new Set(Object.keys(M.POS));
const GCAT = new Set(M.GCAT), CONJ = new Set(M.CONJ.map(c => c.id));
const warn = {}; const W = (k, msg) => { (warn[k] = warn[k] || []).push(msg); };

// ---- 旅遊場景詞 ----
const sctx = { window: {} }; sctx.window.window = sctx.window; sctx.window.SCENES = []; vm.createContext(sctx);
for (const f of ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js']) {
  try { vm.runInContext(fs.readFileSync(P(f), 'utf8').replace(/\bSCENES\b/g, 'window.SCENES').replace(/\bSCENE_EXT\b/g, 'window.SCENE_EXT'), sctx); } catch (e) { W('scene', f + ': ' + e.message); }
}
const sceneOf = new Map(); // jp/kana → Set(subscene)
const addS = (k, id) => { if (!k) return; if (!sceneOf.has(k)) sceneOf.set(k, new Set()); sceneOf.get(k).add(id); };
for (const s of sctx.window.SCENES || []) for (const v of s.vocab || []) { addS(v.jp, s.id); }
for (const [id, ext] of Object.entries(sctx.window.SCENE_EXT || {})) for (const v of (ext && ext.vocab) || []) addS(v.jp, id);

// ---- 人工修正（不改 annot 原檔） ----
// 詞彙：'N3|新興' → {zh, pos, wh}
const LEX_FIX = {
  'N3|新興': { zh: '新興；新近興起', pos: 'n', wh: '事' }
};
// 文法類別重分類（原「其他」52 條）
const GCAT_FIX = {
  '〜です': '基本句型', '〜があります': '基本句型', '〜がいます': '基本句型', 'い形容詞＋です': '基本句型', 'な形容詞＋です': '基本句型', '〜だ': '基本句型', '〜が上手だ': '基本句型',
  'これ／それ／あれ／どれ': '指示詞', 'この／その／あの／どの': '指示詞', 'ここ／そこ／あそこ／どこ': '指示詞',
  '〜ことができる': '可能能力', '〜（ら）れる（可能）': '可能能力', '〜が見える・〜が聞こえる': '可能能力', '〜がする': '樣態',
  '〜って（主題）': '主題提示', '〜といえば': '主題提示', '〜ぶり': '時間先後',
  '〜合う': '複合動詞', '〜直す': '複合動詞', '〜そびれる': '複合動詞', '〜あぐねる': '複合動詞',
  '〜ついでに': '附帶同時', '〜かたがた': '附帶同時', '〜がてら': '附帶同時', '〜かたわら': '附帶同時',
  '〜ものだ（回想）': '語氣態度', '〜ものだ（感嘆）': '語氣態度',
  '〜によって（手段）': '手段根據', '〜を通じて／〜を通して': '手段根據', '〜をもとに': '手段根據', '〜に基づいて': '手段根據', '〜に沿って': '手段根據', '〜をもって（手段）': '手段根據', '〜をこめて': '樣態',
  '〜かわりに（代替）': '代替交換', '〜かわりに（交換）': '代替交換', '〜に代わって': '代替交換', '〜かわりに': '代替交換', '〜にかわって': '代替交換',
  '〜的': '名詞化形式', '〜たらどう／〜てはどうか': '建議勸誘', '〜もかまわず': '逆接讓步', '〜にあって': '對象範圍',
  '〜ものとする': '推測判斷', '〜ものとして': '推測判斷', '〜と相まって': '原因理由', '〜をいいことに': '原因理由', '〜とでもいうべき': '引用傳聞'
};
// 「其他」桶依詞性／中文重新分到 desc（顏色形容）、act（基本動作）、func（指示功能詞）
const COLOR = /色|顏|形狀/;
function fixScene(scs, pos, zh) {
  if (scs.length > 1 && scs.includes('abs')) scs = scs.filter(s => s !== 'abs');
  if (scs[0] !== 'abs') return scs;
  if (pos === 'i' || pos === 'na' || COLOR.test(zh || '')) return ['desc'];
  if (pos === 'v') return ['act'];
  if (['pron', 'adv', 'conj', 'part', 'pre', 'suf', 'exp', 'int', 'ctr'].includes(pos)) return ['func'];
  return scs;
}
// 核心標記：出現在本站內容（冒險世界、場景、特訓、旅程、字卡、手冊）或文法例句者
let CORPUS = '';
for (const f of fs.readdirSync(P('data/world/'))) CORPUS += fs.readFileSync(P('data/world/' + f), 'utf8');
for (const f of ['data/cards.js', 'data/drills.js', 'data/menus.js', 'data/scene-ext.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/travel-ext.js', 'data/travel-stops.js', 'data/travel.js', 'js/phrasebook.js'])
  if (fs.existsSync(P(f))) CORPUS += fs.readFileSync(P(f), 'utf8');
for (const f of ['grammar-n54.jsonl', 'grammar-n3.jsonl', 'grammar-n2.jsonl', 'grammar-n1.jsonl'])
  if (fs.existsSync(P('tools/annot/out/' + f))) CORPUS += fs.readFileSync(P('tools/annot/out/' + f), 'utf8');
const head = e => e.split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim();
const isCore = e => { const j = head(e); return j.length >= 2 && CORPUS.includes(j); };

// ---- 詞彙 ----
const seen = new Set(); const stats = { lex: {}, gram: {} }; let sceneHit = 0; const groups = {};
const variants = e => e.split(/[;；]/).map(s => s.trim()).filter(Boolean);
for (const n of [5, 4, 3, 2, 1]) {
  const lv = 'N' + n, rows = readLevel(n);
  const ann = new Map();
  for (const f of fs.readdirSync(P('tools/annot/out/'))) {
    if (!new RegExp(`^n${n}(-[abc])?\\.tsv$`).test(f)) continue;
    for (const line of fs.readFileSync(P('tools/annot/out/' + f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const c = line.split('\t'); ann.set(+c[0], c);
    }
  }
  const out = [];
  rows.forEach((r, i) => {
    const key = r.expr + '|' + r.kana; if (seen.has(key)) { W('dup', lv + ' ' + r.expr); return; } seen.add(key);
    const a = ann.get(i);
    if (!a) W('noann', lv + ' ' + r.expr);
    else if (a[1] !== r.expr) W('mismatch', `${lv} #${i} ${a[1]} != ${r.expr}`);
    let [, , zh, pos, grp, wh, sc] = a || [];
    const fx = LEX_FIX[lv + '|' + r.expr]; if (fx) { zh = fx.zh || zh; pos = fx.pos || pos; wh = fx.wh || wh; }
    if (!POS.has(pos)) { if (a) W('pos', `${lv} ${r.expr} ${pos}`); pos = ''; }
    if (!WH.has(wh)) { if (a) W('wh', `${lv} ${r.expr} ${wh}`); wh = pos === 'v' ? '事' : pos === 'i' || pos === 'na' || pos === 'adv' ? '狀' : '物'; }
    grp = /^[123s]$/.test(grp || '') ? grp : '';
    if (pos === 'v' && !grp) { W('grp', `${lv} ${r.expr}`); grp = /[いえ]る$/.test(r.kana) ? '2' : '1'; }
    let scs = (sc || '').split(',').map(s => s.trim()).filter(s => { const ok = SC.has(s); if (!ok && s) W('sc', `${lv} ${r.expr} ${s}`); return ok; });
    if (!scs.length) scs = ['abs'];
    scs = fixScene(scs, pos, zh);
    const subs = new Set();
    for (const k of [...variants(r.expr), r.kana]) for (const s of sceneOf.get(k) || []) subs.add(s);
    if (subs.size) { sceneHit++; for (const s of subs) { if (!scs.includes(M.SUB[s])) scs.push(M.SUB[s]); scs.push(s); } }
    const gk = wh + '|' + scs[0]; (groups[lv] = groups[lv] || {})[gk] = (groups[lv][gk] || 0) + 1;
    out.push([r.expr, r.kana === r.expr ? '' : r.kana, zh || r.en, pos, grp, wh, scs.join(','), isCore(r.expr) ? 1 : 0]);
  });
  stats.lex[lv] = out.length;
  const body = `// 自動產生（tools/build-mind.mjs），勿手改。欄位：[jp, kana(同jp時空), zh, pos, grp, wh, sc, core(本站常用=1)]\n(window.MIND = window.MIND || { lex: {}, gram: [] }).lex.${lv} = ${JSON.stringify(out).replace(/\],\[/g, '],\n[')};\n`;
  fs.writeFileSync(P(`data/mind/lex-n${n}.js`), body);
}

// ---- 文法 ----
const gram = []; const byPat = new Map();
const norm = s => String(s).replace(/[〜～~\s・]/g, '').replace(/（[^）]*）|\([^)]*\)/g, '');
const lvOrder = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
for (const f of ['grammar-n54.jsonl', 'grammar-n3.jsonl', 'grammar-n2.jsonl', 'grammar-n1.jsonl']) {
  if (!fs.existsSync(P('tools/annot/out/' + f))) { W('gfile', f + ' 缺'); continue; }
  fs.readFileSync(P('tools/annot/out/' + f), 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (!l.trim()) return;
    let g; try { g = JSON.parse(l); } catch (e) { W('gjson', `${f}:${i + 1}`); return; }
    if (!(g.lv in lvOrder)) { W('glv', g.pat); return; }
    if (byPat.has(g.pat)) { W('gdup', g.pat); return; }
    if (GCAT_FIX[g.pat]) g.cat = GCAT_FIX[g.pat];
    else if (g.lv === 'N5' && /^[ぁ-ん]{1,3}(（[^）]*）)?$/.test(g.pat)) g.cat = '助詞';
    if (!GCAT.has(g.cat)) { W('gcat', `${g.pat} ${g.cat}`); g.cat = '其他'; }
    if (!WH.has(g.wh)) { W('gwh', `${g.pat} ${g.wh}`); g.wh = '事'; }
    g.sc = (g.sc || []).filter(s => SC.has(s)); if (!g.sc.length) g.sc = ['abs'];
    g.conj = (g.conj || []).filter(c => { const ok = CONJ.has(c); if (!ok) W('gconj', `${g.pat} ${c}`); return ok; });
    const o = { id: 'gram:' + g.pat, pat: g.pat, lv: g.lv, ord: lvOrder[g.lv] * 1000 + (+g.ord || 999), zh: g.zh || '', conn: g.conn || '', ex: Array.isArray(g.ex) ? g.ex.slice(0, 2) : [], cat: g.cat, wh: g.wh, sc: g.sc, conj: g.conj, pre: g.pre || [], rel: g.rel || [] };
    if (g.note) o.note = g.note;
    gram.push(o); byPat.set(g.pat, o);
  });
}
const byNorm = new Map(); for (const g of gram) { const k = norm(g.pat); if (!byNorm.has(k)) byNorm.set(k, g); }
const resolve = (p, self, field) => {
  const t = byPat.get(p) || byNorm.get(norm(p));
  if (!t) { W('g' + field, `${self.pat} → ${p}`); return null; }
  return t === self ? null : t.id;
};
for (const g of gram) {
  g.pre = [...new Set(g.pre.map(p => resolve(p, g, 'pre')).filter(Boolean))].filter(id => byPat.get(id.slice(5)).ord < g.ord);
  g.rel = [...new Set(g.rel.map(p => resolve(p, g, 'rel')).filter(Boolean))];
}
gram.sort((a, b) => a.ord - b.ord);
for (const g of gram) stats.gram[g.lv] = (stats.gram[g.lv] || 0) + 1;
fs.writeFileSync(P('data/mind/grammar.js'),
  `// 自動產生（tools/build-mind.mjs），勿手改\n(function () {\n  const M = window.MIND = window.MIND || { lex: {}, gram: [] };\n  M.STATS = ${JSON.stringify(stats)};
  M.GROUPS = ${JSON.stringify(groups)};\n  M.gram = [\n${gram.map(g => '    ' + JSON.stringify(g)).join(',\n')}\n  ];\n})();\n`);

console.log('詞彙', stats.lex, '旅遊場景對應', sceneHit);
console.log('文法', stats.gram, '共', gram.length);
for (const [k, v] of Object.entries(warn)) console.log(`⚠ ${k}: ${v.length}`, v.slice(0, 6).join(' ｜ '));
