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
  'N3|新興': { zh: '新興；新近興起', pos: 'n', wh: '事' },
  'N5|晴れ': { wh: '狀' }, 'N5|曇り': { wh: '狀' }, 'N4|政治': { wh: '事' }, 'N4|経済': { wh: '事' }, 'N3|携帯': { wh: '物' },
  'N2|～丁目': { zh: '～丁目（日本地址的街區編號）' }, 'N2|一旦': { zh: '暫且；姑且（不是中文的「一旦＝如果」）' },   // 評審 v11
  'N4|失礼': { wh: '狀' }, 'N4|久しぶり': { wh: '狀' }, 'N3|いたずら': { wh: '狀' }, 'N1|頻繁': { wh: '狀' }, 'N1|物好き': { wh: '狀' }
};
// 文法等級修正（依 JLPT 常見教材分級；原 annot 分錯者）
const GLV_FIX = {
  '〜つつある': 'N2', '〜ないことには': 'N2',
  '〜てさしあげる': 'N4', '〜ていただけませんか': 'N4', '〜ております': 'N4', '〜ように言う': 'N4'
};
// 手動補先修（自動規則找不到同類較低級條目者）
const GPRE_ADD = {
  '〜って（主題）': ['は'], '〜合う': ['〜ます'], '〜直す': ['〜ます'], '〜ものだ（感嘆）': ['〜ものだ（應然）'], '〜によって（手段）': ['で（手段）'],
  '〜ごとに': ['に（頻率）'], '〜おきに': ['〜ごとに'], '〜きる': ['〜おわる'], '〜たて': ['〜たばかり'], '〜ぎみ': ['〜そうだ（樣態）'],
  '〜こそ': ['は'], '〜さえ': ['も'], '〜まで（甚至）': ['まで'], '〜だけでなく': ['〜だけ'], '〜はもちろん': ['〜だけでなく'], '〜に限らず': ['〜だけでなく'],
  '〜に限って': ['〜だけ'], '〜に限る': ['〜ほうがいい'], '〜一方（で）': ['〜が（逆接）'], '〜反面': ['〜が（逆接）'], '〜にしては': ['〜のに（逆接）'],
  '〜とともに': ['と（共同）'], '〜から〜にかけて': ['〜から〜まで'], '〜に応じて': ['〜によって（不同）'], '〜次第で': ['〜によって（不同）'],
  '〜かねる': ['〜にくい'], '〜がたい': ['〜にくい'], '〜どころか': ['〜だけでなく'], '〜やら〜やら': ['〜とか〜とか'], '〜はともかく': ['は'], '〜はさておき': ['は'],
  '〜を経て': ['〜てから'], '〜末（に）': ['〜た後で'], '〜にあたって': ['〜とき'], '〜を問わず': ['〜かどうか'],
  '〜なり（一～就）': ['〜たとたん（に）'], '〜と見るや': ['〜たとたん（に）'], '〜かと思いきや': ['〜と思う'], '〜からある': ['〜も（數量強調）'], '〜からする': ['〜も（數量強調）'], '〜からの': ['〜も（數量強調）'],
  '〜まみれ': ['〜だらけ'], '〜ずくめ': ['〜だらけ'], '〜も同然だ': ['〜ようだ'], '〜ながらの': ['〜まま'], '〜なり〜なり': ['〜とか〜とか'], '〜だの〜だの': ['〜やら〜やら'],
  '〜そびれる': ['〜はじめる'], '〜あぐねる': ['〜はじめる'], '〜にあずかる': ['いただく'], '〜を賜る': ['いただく'],
  '〜といえば': ['〜と（條件）'], '〜かわりに（代替）': ['の（所屬）'], '〜に代わって': ['〜かわりに（代替）'], '〜を通じて／〜を通して': ['で（手段）']
};
// 先修整條改寫（原 annot 或自動規則選錯者；評審 v6）
const GPRE_FIX = {
  '〜いかん': ['〜次第で'], '〜にかかっている': ['〜次第で'], '〜いかんともしがたい': ['〜いかん', '〜ようがない'],
  '〜ごとく': ['〜ように（比喻・例示）'], '〜ごとき': ['〜ように（比喻・例示）'],
  '〜（さ）せる（使役）': ['〜ない'], '〜（さ）せられる（使役被動）': ['〜（さ）せる（使役）', '〜（ら）れる（被動）'],
  '〜ものとする': ['〜として', '〜ものとして'], '〜ものとして': ['〜として'], '〜ときたら': ['〜といえば', '〜といったら'], '〜ようによっては': ['〜によっては'],
  '〜を限りに': ['〜をもって（時點）'], '〜をもって（時點）': ['〜まで'], '〜ばかり（只）': ['〜だけ'], '〜しかない': ['〜しか〜ない'],
  '〜ところだった': ['〜るところだ'], '〜べきだ': ['〜ほうがいい'], '〜ものだ（應然）': ['〜べきだ'], '〜とは限らない': ['〜わけではない'],
  '〜ついでに': ['〜とき'], '〜にすぎない': ['〜だけ'], '〜までもない': ['〜ことはない'], '〜には及ばない': ['〜までもない'],
  '〜にかかわらず': ['〜を問わず'],
  // 以下為自動規則（同類別相似度）抽查後仍不合理者
  '〜かける／〜かけ': ['〜ているところだ'], '〜っぽい': ['〜ようだ'], '〜ふりをする': ['〜ように見える'], '〜なんて': ['〜なんか'],
  '〜において': ['で（地點）'], '〜に沿って': ['〜とおりに'], '〜からして': ['〜からすると'], '〜限りでは': ['〜によると／〜によれば'],
  '〜限り（限度）': ['〜だけ（限度）'], '〜に反して': ['〜に対して（對比）'], '〜だけあって': ['〜からこそ'], '〜得る': ['〜ことができる'],
  '〜ものか': ['〜わけがない'], '〜ようがない': ['〜方（かた）'], '〜ものがある': ['〜ような気がする'], '〜どころではない': ['〜どころか'],
  '〜をぬきにして': ['〜を除いて'], '〜につき': ['〜ため（に）（原因）'], '〜を除いて': [], 'お〜願う': ['お〜ください'],
  '〜というもの': ['〜あいだ'], '〜に至って': ['〜てはじめて'], '〜に至っては': ['〜まで（極端）'], '〜にあって': ['〜において'],
  '〜なくして(は)': ['〜ないことには'], '〜なしに(は)': ['〜ないことには'], '〜ゆえ(に)': ['〜ため（に）（原因）'], '〜こととて': ['〜ものだから'],
  '〜ならでは': ['〜こそ'], '〜あっての': ['〜からこそ'], '〜に堪えない（不堪）': ['〜がたい'], '〜に足りない': ['〜に足る'],
  '〜にかたくない': ['〜やすい'], '〜には当たらない': ['〜ことはない'], '〜と言っても過言ではない': ['〜といっても'],
  '〜でなくてなんだろう': ['〜にほかならない'], '〜始末だ': ['〜末（に）'], '〜ともなしに': ['〜ともなく'], '〜にもまして': ['〜より'],
  '〜とは裏腹に': ['〜に反して'], '〜と相まって': ['〜とともに'], '〜をおして': ['〜もかまわず'], '〜をいいことに': [],
  '〜にかかわる': ['〜に関して／〜に関する'], '〜(こと)このうえない': ['〜ほど〜はない'], '〜もいいところだ': ['〜にもほどがある'], '〜の至り': ['〜の極み'], '〜極まりない': ['〜極まる'],
  '〜かたがた': ['〜ついでに'], '〜がてら': ['〜ついでに'], '〜なりとも': ['〜でも（舉例）'], '〜たりとも': ['〜も（數量強調）']
};
// 接續修正
const GCONN_FIX = {
  '〜ごとく': '名詞の・動詞普通形（＋が）＋ごとく；名詞の＋ごとし', '〜ごとき': '名詞（の）・動詞普通形（＋が）＋ごとき',
  // 評審 v10／v11：「ない形＋ない〜」會變成 行かないない〜，改成「ない形去ない」（手改 data/mind/grammar.js 的同步）
  '〜ずに済む': '動詞ない形去ない＋ずに済む／動詞ない形去ない＋ないで済む', '〜ないものでもない': '動詞ない形去ない＋ないものでもない',
  '〜ないでもない': '動詞ない形去ない＋ないでもない', '〜ないとも限らない': '動詞ない形去ない＋ないとも限らない',
  '〜ないまでも': '動詞ない形去ない＋ないまでも', '〜ないものか': '動詞ない形去ない＋ないものか／ないものだろうか',
  '〜なくもない': '動詞ない形去ない＋なくもない（行かなくもない）'
};
// 詞彙改級（評審 v10：N4 裡的 N5 基本詞移到 N5，加在 N5 最後）
const LEX_MOVE = { 'N4|だめ': 'N5', 'N4|～ございます': 'N5', 'N4|大学生': 'N5' };
// 3D 分類修正（wh 人事時地物、sc 場景）
const GWH_FIX = { '〜（さ）せる（使役）': '事', '〜（さ）せられる（使役被動）': '事', '〜（ら）れる（被動）': '事', '〜矢先に': '時' };
const GSC_FIX = { '〜矢先に': ['time'] };
// 跨級同義重複條目：刪除左邊，引用改指右邊（保留較常見分級的一條）
const GALIAS = {
  '〜気味': '〜ぎみ', '〜かける': '〜かける／〜かけ', '〜次第': '〜次第（〜したらすぐ）', '〜とおり（に）': '〜とおりに',
  '〜を通じて': '〜を通じて／〜を通して', '〜に関して': '〜に関して／〜に関する', '〜をはじめ（として）': '〜をはじめ',
  '〜にかわって': '〜に代わって', '〜かわりに': '〜かわりに（代替）', '〜上に': '〜うえ（に）', '〜に過ぎない': '〜にすぎない',
  '〜ながら（逆接）': '〜ながら（も）', '〜ながらも': '〜ながら（も）', '〜(ら)れる（尊敬）': '〜（ら）れる（尊敬）',
  '〜(ら)れる（受害）': '〜（ら）れる（受害被動）', '〜ちゃう／〜じゃう': '〜ちゃう', '〜って（傳聞）': '〜って（引用・傳聞）',
  '〜ものだ（當然）': '〜ものだ（應然）', '〜に先立ち': '〜に先立って', '〜とは言うものの': '〜とはいうものの',
  '〜(さ)せていただく': '〜させていただく', '〜ほど': '〜ほど〜ない', '〜から（原因）': '〜から（理由）', '〜のに': '〜のに（逆接）', '〜ものだ': '〜ものだ（感嘆）', '〜後で': '〜た後で', '〜以上は': '〜以上（は）', '〜ところだ': '〜るところだ'
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
function fixScene(scs, pos, zh, wh) {
  if (scs.length > 1 && scs.includes('abs')) scs = scs.filter(s => s !== 'abs');
  if (scs[0] !== 'abs') return scs;
  if (wh === '地') return ['pos'];
  if (wh === '時') return ['time'];
  if (wh === '人') return ['comm'];
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
const seen = new Set(); const stats = { lex: {}, gram: {} }; const moved = {}; const lexOut = {}; let sceneHit = 0; const groups = {};
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
    scs = fixScene(scs, pos, zh, wh);
    const subs = new Set();
    for (const k of [...variants(r.expr), r.kana]) for (const s of sceneOf.get(k) || []) subs.add(s);
    if (subs.size) { sceneHit++; for (const s of subs) { if (!scs.includes(M.SUB[s])) scs.push(M.SUB[s]); scs.push(s); } }
    const gk = wh + '|' + scs[0]; (groups[lv] = groups[lv] || {})[gk] = (groups[lv][gk] || 0) + 1;
    // 「名詞＋する」的讀音不含する（運動＝うんどう，不是 うんどうする；評審 v10）
    let kana = r.kana === r.expr ? '' : r.kana;
    if (pos === 'n' && grp === 's' && !/する$/.test(r.expr) && /^[^;]+する$/.test(kana)) kana = kana.replace(/する$/, '');
    const row = [r.expr, kana, zh || r.en, pos, grp, wh, scs.join(','), isCore(r.expr) ? 1 : 0];
    const mv = LEX_MOVE[lv + '|' + r.expr];
    if (mv && mv !== lv) (moved[mv] = moved[mv] || []).push(row); else out.push(row);
  });
  lexOut[lv] = out;
}
for (const [lv, rows] of Object.entries(moved)) lexOut[lv].push(...rows);
for (const n of [5, 4, 3, 2, 1]) {
  const lv = 'N' + n, out = lexOut[lv];
  stats.lex[lv] = out.length;
  const body = `// 自動產生（tools/build-mind.mjs），勿手改。欄位：[jp, kana(同jp時空), zh, pos, grp, wh, sc, core(本站常用=1)]\n(window.MIND = window.MIND || { lex: {}, gram: [] }).lex.${lv} = ${JSON.stringify(out).replace(/\],\[/g, '],\n[')};\n`;
  fs.writeFileSync(P(`data/mind/lex-n${n}.js`), body);
}

// ---- 文法 ----
const gram = []; const byPat = new Map(); const dropped = []; const noAuto = new Set();
const norm = s => String(s).replace(/[〜～~\s・]/g, '').replace(/（[^）]*）|\([^)]*\)/g, '');
const lvOrder = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
for (const f of ['grammar-n54.jsonl', 'grammar-n3.jsonl', 'grammar-n2.jsonl', 'grammar-n1.jsonl']) {
  if (!fs.existsSync(P('tools/annot/out/' + f))) { W('gfile', f + ' 缺'); continue; }
  fs.readFileSync(P('tools/annot/out/' + f), 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (!l.trim()) return;
    let g; try { g = JSON.parse(l); } catch (e) { W('gjson', `${f}:${i + 1}`); return; }
    if (!(g.lv in lvOrder)) { W('glv', g.pat); return; }
    if (byPat.has(g.pat)) { W('gdup', g.pat); return; }
    if (GALIAS[g.pat]) { dropped.push(g.pat); return; }
    if (GLV_FIX[g.pat] && GLV_FIX[g.pat] !== g.lv) { W('glvfix', `${g.pat} ${g.lv}→${GLV_FIX[g.pat]}`); g.lv = GLV_FIX[g.pat]; g.ord = 990; }
    if (GCAT_FIX[g.pat]) g.cat = GCAT_FIX[g.pat];
    if (GCONN_FIX[g.pat]) g.conn = GCONN_FIX[g.pat];
    if (GWH_FIX[g.pat]) g.wh = GWH_FIX[g.pat];
    if (GSC_FIX[g.pat]) g.sc = GSC_FIX[g.pat];
    if (GPRE_FIX[g.pat]) { g.pre = GPRE_FIX[g.pat]; g.preFix = 1; }
    else if (g.lv === 'N5' && /^[ぁ-ん]{1,3}(（[^）]*）)?$/.test(g.pat)) g.cat = '助詞';
    if (!GCAT.has(g.cat)) { W('gcat', `${g.pat} ${g.cat}`); g.cat = '其他'; }
    if (!WH.has(g.wh)) { W('gwh', `${g.pat} ${g.wh}`); g.wh = '事'; }
    g.sc = (g.sc || []).filter(s => SC.has(s)); if (!g.sc.length) g.sc = ['abs'];
    g.conj = (g.conj || []).filter(c => { const ok = CONJ.has(c); if (!ok) W('gconj', `${g.pat} ${c}`); return ok; });
    const o = { id: 'gram:' + g.pat, pat: g.pat, lv: g.lv, ord: lvOrder[g.lv] * 1000 + (+g.ord || 999), zh: g.zh || '', conn: g.conn || '', ex: Array.isArray(g.ex) ? g.ex.slice(0, 2) : [], cat: g.cat, wh: g.wh, sc: g.sc, conj: g.conj, pre: (g.pre || []).concat(GPRE_ADD[g.pat] || []), rel: g.rel || [] };
    if (g.note) o.note = g.note;
    if (g.preFix) { o.pre = g.pre.slice(); if (!o.pre.length) noAuto.add(o.id); }
    gram.push(o); byPat.set(g.pat, o);
  });
}
const byNorm = new Map(); for (const g of gram) { const k = norm(g.pat); if (!byNorm.has(k)) byNorm.set(k, []); byNorm.get(k).push(g); }
// 意思相似度：中文義項共用字（去掉虛字）＋句型假名雙字組
const ZSTOP = new Set([...'～〜、，；（）()的是了在一～也都就而著把被和或與之了'] );
const zset = z => new Set([...String(z || '')].filter(c => /[㐀-鿿]/.test(c) && !ZSTOP.has(c)));
const bigr = p => { const s = norm(p), o = new Set(); for (let i = 0; i + 1 < s.length; i++) o.add(s.slice(i, i + 2)); return o; };
const sim = (a, b) => { let n = 0; const A = zset(a.zh), B = zset(b.zh); for (const c of A) if (B.has(c)) n++; const P = bigr(a.pat), Q = bigr(b.pat); for (const c of P) if (Q.has(c)) n += 2; return n; };
const wide = s => String(s).replace(/[〜～~\s]/g, '').replace(/\(/g, '（').replace(/\)/g, '）');
const byWide = new Map(); for (const g of gram) if (!byWide.has(wide(g.pat))) byWide.set(wide(g.pat), g);
const qual = s => (String(s).match(/（([^）]*)）$/) || [])[1] || '';
const resolve = (p, self, field) => {
  const q = GALIAS[p] || p; let t = byPat.get(q) || byWide.get(wide(q));
  if (!t) {
    const c = (byNorm.get(norm(q)) || []).filter(x => x !== self), qq = qual(wide(q));
    const sc = x => sim(x, self) + (x.cat === self.cat ? 1 : 0) + (qq && qual(wide(x.pat)) && [...qq].some(ch => qual(wide(x.pat)).includes(ch)) ? 5 : 0);
    if (c.length > 1) { t = c.slice().sort((a, b) => sc(b) - sc(a) || lvOrder[a.lv] - lvOrder[b.lv])[0]; W('g' + field + 'amb', `${self.pat} → ${p} ⇒ ${t.pat}`); }
    else t = c[0] || (byNorm.get(norm(q)) || [])[0];
  }
  if (!t) { W('g' + field, `${self.pat} → ${p}`); return null; }
  return t === self ? null : t.id;
};
const byId = new Map(gram.map(g => [g.id, g]));
for (const g of gram) {
  // 先修只能指向同級或更低級；指向更高級者視為資料錯誤丟棄
  g.pre = [...new Set(g.pre.map(p => resolve(p, g, 'pre')).filter(Boolean))].filter(id => { const ok = lvOrder[byId.get(id).lv] <= lvOrder[g.lv]; if (!ok) W('gpreup', `${g.pat}(${g.lv}) → ${id.slice(5)}(${byId.get(id).lv})`); return ok; });
  g.rel = [...new Set(g.rel.map(p => resolve(p, g, 'rel')).filter(Boolean))];
}
// N4 以上沒有先修者自動補：優先取「相近」中較低級的條目，否則取同類別在最近較低等級的第一條
let autoPre = 0;
for (const g of gram) {
  if (g.pre.length || g.lv === 'N5' || noAuto.has(g.id)) continue;
  const L = lvOrder[g.lv];
  let p = g.rel.map(id => byId.get(id)).filter(x => lvOrder[x.lv] < L).sort((a, b) => lvOrder[b.lv] - lvOrder[a.lv] || a.ord - b.ord).slice(0, 2);
  // 同類別較低級中「意思最接近」者（相似度 ≥ 2 才採用；否則寧可不給先修，避免硬湊）
  if (!p.length) {
    const c = gram.filter(x => lvOrder[x.lv] < L && x.cat === g.cat).map(x => [x, sim(x, g)]).filter(([, s]) => s >= 2)
      .sort((a, b) => b[1] - a[1] || lvOrder[b[0].lv] - lvOrder[a[0].lv] || a[0].ord - b[0].ord);
    if (c.length) p = [c[0][0]];
  }
  if (p.length) { g.pre = p.map(x => x.id); g.preAuto = 1; autoPre++; } else W('gnopre', g.pat);
}
// 依等級→先修拓撲排序（同級內 Kahn，優先原順序），重編 ord
const sorted = [];
for (const lv of Object.keys(lvOrder)) {
  const list = gram.filter(g => g.lv === lv).sort((a, b) => a.ord - b.ord), inLv = new Set(list.map(g => g.id));
  const need = new Map(list.map(g => [g.id, new Set(g.pre.filter(p => inLv.has(p)))])), done = new Set();
  while (done.size < list.length) {
    let nx = list.find(g => !done.has(g.id) && [...need.get(g.id)].every(p => done.has(p)));
    if (!nx) { nx = list.find(g => !done.has(g.id)); W('gcycle', nx.pat); nx.pre = nx.pre.filter(p => !inLv.has(p) || done.has(p)); }
    done.add(nx.id); sorted.push(nx);
  }
}
sorted.forEach((g, i) => { g.ord = lvOrder[g.lv] * 1000 + sorted.filter((x, j) => j < i && x.lv === g.lv).length + 1; });
gram.length = 0; gram.push(...sorted);
// 分級檢查：低級條目的例句裡出現較高級句型（3 字以上、無變數）→ 警告 gexhi
const hiPat = gram.map(g => [g, String(g.pat).replace(/[〜～]/g, '').replace(/（[^）]*）|\([^)]*\)/g, '').trim()]).filter(([, p]) => p.length >= 3 && !/[＋+／/…・A-Za-z\s]/.test(p));
const lowHas = (L, p) => hiPat.some(([x, q]) => lvOrder[x.lv] <= L && q.includes(p)) || gram.some(x => lvOrder[x.lv] <= L && norm(x.pat).includes(p));
for (const g of gram) if (lvOrder[g.lv] <= 1 && g.ex[0]) for (const [h, p] of hiPat) if (lvOrder[h.lv] > lvOrder[g.lv] && g.ex[0].includes(p) && !lowHas(lvOrder[g.lv], p)) W('gexhi', `${g.lv} ${g.pat}：${g.ex[0]} ⊃ ${h.lv} ${h.pat}`);
const GALIAS_OUT = {}; for (const d of dropped) { const t = byPat.get(GALIAS[d]) || byNorm.get(norm(GALIAS[d])); if (t) GALIAS_OUT['gram:' + d] = t.id; else W('galias', d); }
for (const g of gram) stats.gram[g.lv] = (stats.gram[g.lv] || 0) + 1;
fs.writeFileSync(P('data/mind/grammar.js'),
  `// 自動產生（tools/build-mind.mjs），勿手改\n(function () {\n  const M = window.MIND = window.MIND || { lex: {}, gram: [] };\n  M.STATS = ${JSON.stringify(stats)};
  M.GROUPS = ${JSON.stringify(groups)};\n  M.GALIAS = ${JSON.stringify(GALIAS_OUT)};
  M.gram = [\n${gram.map(g => '    ' + JSON.stringify(g)).join(',\n')}\n  ];\n})();\n`);

console.log('詞彙', stats.lex, '旅遊場景對應', sceneHit);
console.log('文法', stats.gram, '共', gram.length, '刪重複', dropped.length, '自動補先修', autoPre);
for (const [k, v] of Object.entries(warn)) console.log(`⚠ ${k}: ${v.length}`, v.slice(0, process.env.FULL ? 1e9 : 12).join(' ｜ '));
