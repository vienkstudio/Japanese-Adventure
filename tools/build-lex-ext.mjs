// 大詞庫＋多義＋漢字音訓 產生器（來源：Tomoshi dict data，CC BY-SA 4.0；JMdict／KANJIDIC2 © EDRDG）
//   node --max-old-space-size=1024 tools/build-lex-ext.mjs [tomoshi.db] [zhtw-ruleset.json]
// 輸出（皆 CC BY-SA 4.0）：
//   data/reading/dict-big.js   斷詞用：JMdict 常用詞（is_common）中本站沒有的，完整模式（JPText.ready(true)）才載
//                              每行 表層|讀音|義項1｜義項2｜義項3|詞性|類別|等級|f
//   data/reading/senses.js     詞卡用：本站既有詞的多個義項（Tomoshi 台灣繁體），點詞時才載
//   data/reading/kanji.js      詞卡用：常用＋人名用漢字 2,999 字的音讀／訓讀／中文字義，點詞時才載
// 台灣用語：中文過 zhtw-mcp 的 ruleset.json（MIT；OpenCC TWPhrases，Apache-2.0）兩岸用語規則「只檢查不取代」——
//   它的規則以資訊科技用語為主（連接→連線、文件→檔案），套到一般詞義會改錯，命中的詞列在輸出最後給人工看。
// 原始資料不入專案：Tomoshi https://github.com/tomoshi-app/tomoshi-dict-data/releases、zhtw-mcp https://github.com/sysprog21/zhtw-mcp
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = process.argv[2] || 'D:/reviewtmp/lexicon/tomoshi/tomoshi.db';
const RULES = process.argv[3] || 'D:/reviewtmp/lexicon/zhtw/ruleset.json';
const OUT = f => path.join(ROOT, 'data/reading', f);
const LIC = `// 來源與授權（CC BY-SA 4.0，本檔亦以 CC BY-SA 4.0 釋出）：JMdict／KANJIDIC2 © Electronic Dictionary Research and Development Group（https://www.edrdg.org/edrdg/licence.html）；
//   中文：Tomoshi dict data © Y1Z（https://github.com/tomoshi-app/tomoshi-dict-data）；台灣用語校正：zhtw-mcp ruleset（MIT）／OpenCC TWPhrases（Apache-2.0）。
//   修改：每個義項只取前 2 段、去掉用字說明、詞性改成本站代碼。`;

/* ---------- 台灣用語校正 ---------- */
const TW = [];
try {
  const R = JSON.parse(fs.readFileSync(RULES, 'utf8'));
  (R.spelling_rules || []).forEach(r => { if (r.type === 'cross_strait' && !r.context_clues && !/@domain/.test(r.context || '') && r.from && r.to && r.to[0] && !/[A-Za-z0-9 ]/.test(r.from) && r.from.length >= 2) TW.push([r.from, r.to[0]]); });
  TW.sort((a, b) => b[0].length - a[0].length);
} catch (e) { console.warn('找不到 zhtw ruleset，略過台灣用語校正'); }
let twHits = 0;
const twList = [];
const tw = s => { const o = String(s); for (const [a, b] of TW) if (o.includes(a)) { twHits++; if (twList.length < 40) twList.push(a + '→' + b + '（' + o + '）'); } return o; };

/* ---------- 目前斷詞器（含 dict-fill） ---------- */
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js',
  'data/reading/dict-news.js', 'data/reading/dict-fill.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'js/jp-text.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const J = ctx.JPText; J._build();
const known = w => { const t = J.tokenize(w).filter(x => !x.sym); return t.length === 1 && t[0].known && (t[0].base === w || t[0].s === w); };
const lookupBase = w => { const t = J.tokenize(w).filter(x => !x.sym); return t.length === 1 && t[0].known ? t[0] : null; };

// 片語（ですか、ために、自分で、本当に、誰も、雨が降る…）：會把助詞、助動詞吞進去，讓文法提示與助詞學習失效，不收
//   規則：拆開後每一段都是已知詞（實詞至少 2 字或含漢字），且含 繫詞／助動詞／助詞，就不收——拆開也能正確翻譯。
//   拆出來有未知段或單一假名碎片（きつね＝き＋つ＋ね、懐かしむ）表示其實是一個詞，照收；形容詞（速やか、輝かしい）照收。
const phrase = (w, pos) => {
  const t = J.tokenize(w).filter(x => !x.sym); if (t.length < 2) return false;
  const fn = x => /^(cop|aux|part)$/.test(x.pos);
  if (!t.every(x => x.known && (fn(x) || x.s.length >= 2 || /[一-鿿]/.test(x.s)))) return false;
  if (t.some(x => /^(cop|aux)$/.test(x.pos))) return true;
  return t.some(x => x.pos === 'part') && !/^(i|na)$/.test(pos);
};

/* ---------- Tomoshi ---------- */
const db = new DatabaseSync(DB, { readOnly: true });
const zhOf = db.prepare('select data from zh_defs_zhtw where entry_id = ?');
const lvOf = db.prepare('select level from vocab_jlpt where entry_id = ?');
const rankOf = db.prepare('select rank from freq_rank where entry_id = ?');
function posOf(list) {
  const P = list.join('|');
  if (/Godan verb/.test(P)) return ['v', '1'];
  if (/Ichidan verb/.test(P)) return ['v', '2'];
  if (/Kuru verb|suru verb - (special|included)/.test(P) && !/noun/.test(P)) return ['v', '3'];
  if (/adjective \(keiyoushi\)/.test(P)) return ['i', ''];
  if (/adjectival nouns|keiyodoshi/.test(P)) return ['na', ''];
  if (/^adverb/.test(list[0] || '')) return ['adv', ''];
  if (/takes the aux\. verb suru/.test(P) && /noun/.test(P)) return ['n', 's'];
  if (/pronoun/.test(P)) return ['pron', ''];
  if (/pre-noun adjectival/.test(P)) return ['pre', ''];
  if (/interjection/.test(P)) return ['int', ''];
  if (/conjunction/.test(P)) return ['conj', ''];
  if (/counter/.test(P)) return ['ctr', ''];
  if (/suffix/.test(P) && !/noun \(common\)/.test(P)) return ['suf', ''];
  if (/expressions/.test(P)) return ['exp', ''];
  if (list.includes('particle')) return ['part', ''];
  if (/noun|numeric/.test(P)) return ['n', ''];
  if (/adverb/.test(P)) return ['adv', ''];
  return null;
}
const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const clean1 = z => tw(String(z || '').replace(/（(多|通常|常|也)[^）]*(假名|寫)[^）]*）/g, '').replace(/（[^）]{14,}）/g, '').trim());
function sensesOf(id, max) {
  const r = zhOf.get(id); if (!r) return [];
  const S = Object.values(JSON.parse(r.data).senses || {});
  const out = [];
  for (const s of S) {
    const g = s.glosses && s.glosses[0] ? clean1(s.glosses[0].text) : '';
    const seg = g.split(/[；;]/).map(x => x.trim()).filter(Boolean).slice(0, 2).join('；').replace(/[|｜]/g, '／');
    if (seg && !out.includes(seg)) out.push(seg.length > 20 ? seg.slice(0, 20) : seg);
    if (out.length >= max) break;
  }
  return out;
}
const BADK = /rarely|search-only|irregular|outdated/;
function surfaceOf(e) {
  const s0 = (e.senses || [])[0] || {};
  const kanaOnly = (s0.misc || []).some(m => /usually written using kana alone/.test(m));
  const kj = (e.kanji || []).find(k => !(k.info || []).some(i => BADK.test(i)));
  const kn = (e.kana || []).find(k => !(k.info || []).some(i => BADK.test(i))) || (e.kana || [])[0];
  if (!kn) return null;
  const surf = kanaOnly || !kj ? kn.text : kj.text;
  return { surf, kana: kn.text, kanaOnly, kj: kj && kj.text };
}

/* ---------- 1) dict-big ---------- */
const SKIP = new Set(['イエス', 'なんか', 'なんて', 'がる', 'どれどれ', 'くだん']);
const big = new Map();
let skipped = 0;
for (const r of db.prepare('select e.id id, e.data data, coalesce(f.rank, 999999) rank from entries e left join freq_rank f on f.entry_id = e.id where e.is_common = 1 order by rank').iterate()) {
  const e = JSON.parse(r.data), sf = surfaceOf(e); if (!sf) continue;
  const w = sf.surf;
  if (big.has(w) || SKIP.has(w) || w.length > 12 || /[０-９0-9Ａ-Ｚａ-ｚA-Za-z・＝]/.test(w)) { skipped++; continue; }
  if (/^[一-鿿々]$/.test(w) || /^[ぁ-ゖァ-ヺー]{1,2}$/.test(w) || /^[〇一二三四五六七八九十百千万億兆]+$/.test(w)) { skipped++; continue; }   // 漢數字交給數字＋量詞規則   // 單一漢字、2 字以內假名：易誤切
  if (known(w)) { skipped++; continue; }
  const pg = posOf(((e.senses || [])[0] || {}).pos || []); if (!pg || phrase(w, pg[0])) { skipped++; continue; }
  const S = sensesOf(r.id, 3); if (!S.length) { skipped++; continue; }
  const lv = (lvOf.get(r.id) || {}).level || (r.rank <= 12000 ? 'N2' : 'N1');
  const rd = w === sf.kana || /^[ァ-ヺー]+$/.test(w) ? '' : toHira(sf.kana);
  big.set(w, [w, rd, S.join('｜'), pg[0], pg[1], lv, 'f'].join('|'));
}
const bigLines = [...big.values()];
fs.writeFileSync(OUT('dict-big.js'), `// 自動產生（tools/build-lex-ext.mjs），勿手改。大詞庫：JMdict 常用詞中本站沒有的 ${bigLines.length} 詞；完整模式（JPText.ready(true)）才載入。
// 格式：表層|讀音(同表層時空)|義項1｜義項2｜義項3|詞性|類別|等級|f（f：不登記純假名寫法、成本略高，只補缺）
${LIC}
(function () {
  const D = \`
${bigLines.join('\n')}
\`;
  window.JP_DICT_EXT = (window.JP_DICT_EXT ? window.JP_DICT_EXT + String.fromCharCode(10) : '') + D.trim();
})();
`);

/* ---------- 2) senses：本站既有詞的多義 ---------- */
const mine = new Set();
const addMine = w => { if (w) mine.add(w); };
['N5', 'N4', 'N3', 'N2', 'N1'].forEach(l => (ctx.MIND.lex[l] || []).forEach(r => addMine(String(r[0]).replace(/\s*\(.*?\)\s*|～|〜/g, '').split(/[,、]/)[0].trim())));
String(ctx.JP_DICT_EXT || '').split('\n').forEach(l => addMine(l.split('|')[0]));
// forms 表沒有索引：一次讀進記憶體（只留本站有的表層）
const FORMS = new Map();
for (const r of db.prepare('select f.text t, f.entry_id id, f.is_common c, e.is_common ec, coalesce(r.rank, 999999) rk from forms f join entries e on e.id = f.entry_id left join freq_rank r on r.entry_id = f.entry_id').iterate()) {
  if (!mine.has(r.t)) continue;
  if (!FORMS.has(r.t)) FORMS.set(r.t, []);
  FORMS.get(r.t).push(r);
}
const entryData = db.prepare('select data from entries where id = ?');
const byFormAll = w => (FORMS.get(w) || []).sort((a, b) => b.c - a.c || b.ec - a.ec || a.rk - b.rk).filter((x, i, A) => A.findIndex(y => y.id === x.id) === i);
const SEN = {};
for (const w of mine) {
  const ids = byFormAll(w).map(x => x.id); if (!ids.length) continue;
  // 同形異義（日＝ひ／にち）：最多取 2 個條目，各自讀音分開列
  const groups = [];
  for (const id of ids.slice(0, 2)) {
    const S = sensesOf(id, 5); if (!S.length) continue;
    const e = JSON.parse(entryData.get(id).data);
    groups.push([toHira(((e.kana || [])[0] || {}).text || ''), S]);
  }
  const n = groups.reduce((a, g) => a + g[1].length, 0);
  if (n >= 2) SEN[w] = groups.map(([k, S]) => (k && k !== w ? k + '：' : '') + S.join('｜')).join('‖');
}
const senN = Object.keys(SEN).length;
fs.writeFileSync(OUT('senses.js'), `// 自動產生（tools/build-lex-ext.mjs），勿手改。多義：本站既有 ${senN} 個詞的義項（點詞卡時才載入）。
// 格式：{表層: '讀音：義項1｜義項2‖讀音：義項…'}（‖ 分隔同形異義的不同詞；讀音與表層相同時省略）
${LIC}
window.JP_SENSES = ${JSON.stringify(SEN).replace(/","/g, '",\n"')};
`);

/* ---------- 3) kanji：音讀／訓讀／字義 ---------- */
const KJ = {};
const kgz = db.prepare('select zho from kanji_gloss_zhtw where literal = ?');
for (const r of db.prepare("select literal, data from kanji where json_extract(data, '$.grade') is not null").iterate()) {
  const d = JSON.parse(r.data);
  let zh = []; try { zh = JSON.parse((kgz.get(r.literal) || {}).zho || '[]'); } catch (e) { }
  KJ[r.literal] = [(d.on || []).map(toHira).join(','), (d.kun || []).join(','), zh.slice(0, 4).map(tw).join('；'), d.grade || 0];
}
fs.writeFileSync(OUT('kanji.js'), `// 自動產生（tools/build-lex-ext.mjs），勿手改。常用＋人名用漢字 ${Object.keys(KJ).length} 字（KANJIDIC2）：點詞卡時才載入。
// 格式：{字: [音讀(平假名,逗號分隔), 訓讀(KANJIDIC2 原樣：「.」後為送假名、「-」為接頭接尾), 中文字義, 年級(1–6 小學、8 中學、9–10 人名用)]}
${LIC}
window.JP_KANJI = ${JSON.stringify(KJ).replace(/\],"/g, '],\n"')};
`);
const kb = f => (fs.statSync(OUT(f)).size / 1024).toFixed(0) + ' KB';
if (twList.length) console.log('兩岸用語命中（未取代，請人工確認）：\n  ' + twList.join('\n  '));
console.log(`dict-big ${bigLines.length} 詞 ${kb('dict-big.js')}（略過 ${skipped}）；senses ${senN} 詞 ${kb('senses.js')}；kanji ${Object.keys(KJ).length} 字 ${kb('kanji.js')}；台灣用語校正 ${twHits} 處（規則 ${TW.length}）`);
