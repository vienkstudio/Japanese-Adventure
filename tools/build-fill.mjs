// 補詞產生器：從 Tomoshi dict data（CC BY-SA 4.0，JMdict 衍生）挑出本站詞庫缺的詞，輸出 data/reading/dict-fill.js
//   node --max-old-space-size=1024 tools/build-fill.mjs <tomoshi.db 路徑>
// 挑選：① Tomoshi JLPT 標記（vocab_jlpt）裡本站斷詞查不到的詞 ② 下方 EXTRA（歌詞高頻詞）
// 原始資料不入專案（約 690 MB）；下載：https://github.com/tomoshi-app/tomoshi-dict-data/releases
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = process.argv[2] || 'D:/reviewtmp/lexicon/tomoshi/tomoshi.db';
const OUT = path.join(ROOT, 'data/reading/dict-fill.js');

// 歌詞、文章高頻但兩份詞表都沒有的詞（評審探針＋docs/詞庫與分類/03）
const EXTRA = ['時', '痛む', '素敵', '温もり', '淡い', '落ちる', '足', '川', '終わる', '風呂', '頃', '回る', '忘年会', '上限', '率先', '第一歩', '段落', '体中',
  '眠たい', '切なさ', '愛しさ', '面影', '眼差し', '戸惑う', '躊躇う', '巡る', '彷徨う', '佇む', '滲む', '霞む', '揺らぐ', '紡ぐ', '綴る', '焦がれる', '憧れ', '儚さ', '陽だまり', '木漏れ日', '茜色', '夕暮れ', '黄昏', '宵', '朝日', '夕日', '星空', '夜空', '花びら', '鼓動', '吐息', '溜息', '涙声', '口付け', '唇', '頬', '睫毛', '素肌', '温度', '体温'];

// 不補：常見用法和第一義項不同、或會干擾斷詞
const SKIP = new Set(['イエス', 'なんか', 'なんて', 'がる', 'どれどれ', 'くだん']);

// 目前斷詞器（不含本檔）：查不到才補
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js',
  'data/reading/dict-news.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'js/jp-text.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const J = ctx.JPText; J._build();
const known = w => { const t = J.tokenize(w).filter(x => !x.sym); return t.length === 1 && t[0].known && (t[0].base === w || t[0].s === w); };

const db = new DatabaseSync(DB, { readOnly: true });
const entryOf = db.prepare('select data from entries where id = ?');
const zhOf = db.prepare('select data from zh_defs_zhtw where entry_id = ?');
const lvOf = db.prepare('select level from vocab_jlpt where entry_id = ?');
const byForm = db.prepare('select f.entry_id id from forms f left join freq_rank r on r.entry_id = f.entry_id where f.text = ? order by f.is_common desc, coalesce(r.rank, 999999) limit 1');

// JMdict 詞性 → 本站 [詞性, 類別]
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
// 中文：第一義項的前 2 段，去掉「（多寫作假名）」這類用字說明，≤18 字
function zhClean(z) {
  let t = String(z || '').replace(/（(多|通常|常)[^）]*(假名|寫)[^）]*）/g, '').replace(/（[^）]{12,}）/g, '').trim();
  const seg = t.split(/[；;]/).map(x => x.trim()).filter(Boolean);
  let out = seg.slice(0, 2).join('；');
  if (out.length > 18) out = seg[0];
  return out.length > 18 ? out.slice(0, 18) : out;
}
function row(id, want, lvTag) {
  const e = JSON.parse(entryOf.get(id).data);
  const zr = zhOf.get(id); if (!zr) return null;
  const zs = JSON.parse(zr.data).senses || {};
  const z0 = zs['0'] && zs['0'].glosses && zs['0'].glosses[0] ? zs['0'].glosses[0].text : '';
  const zh = zhClean(z0); if (!zh) return null;
  const s0 = (e.senses || [])[0] || {};
  const pg = posOf(s0.pos || []); if (!pg) return null;
  const kanaOnly = (s0.misc || []).some(m => /usually written using kana alone/.test(m));
  const kj = (e.kanji || []).find(k => !(k.info || []).some(i => /rarely|search-only|irregular|outdated/.test(i)));
  const kn = (e.kana || [])[0];
  if (!kn) return null;
  let surf = want && (e.kanji || []).some(k => k.text === want) ? want : kanaOnly || !kj ? kn.text : kj.text;
  if (/[０-９0-9Ａ-Ｚａ-ｚ]/.test(surf) || SKIP.has(surf)) return null;
  if (!want && /^[ぁ-ゖァ-ヺー]{1,2}$/.test(surf)) return null;   // 2 字以內的假名詞容易誤切（えい、ビリ…）   // 日期數字由數字＋量詞規則處理
  const rd = surf === kn.text || /^[ァ-ヺー]+$/.test(surf) ? '' : toHira(kn.text);
  const lv = lvTag || (lvOf.get(id) || {}).level || '';
  return [surf, rd, zh, pg[0], pg[1], lv];
}

const out = new Map();
let skipKnown = 0;
for (const r of db.prepare('select entry_id id, level from vocab_jlpt').all()) {
  const x = row(r.id, '', r.level); if (!x) continue;
  if (known(x[0]) || out.has(x[0])) { skipKnown++; continue; }
  // 單一漢字（等、身、期）會搶走既有斷詞，不補（讀音的假名寫法另由第 7 欄 f 關掉，見 jp-text buildExt）
  if (/^[一-鿿々]$/.test(x[0])) { skipKnown++; continue; }
  out.set(x[0], x);
}
const miss = [];
for (const w of EXTRA) {
  if (known(w) || out.has(w)) continue;
  const f = byForm.get(w); if (!f) { miss.push(w); continue; }
  const x = row(f.id, w, ''); if (!x) { miss.push(w); continue; }
  x[0] = w; out.set(w, x);
}
// 人工修正：Tomoshi 第一義項不合常用語境、或挑錯條目的詞
const FIX = { '頃': ['頃', 'ころ', '時候；左右（時間）', 'n', '', 'N3'], '素敵': ['素敵', 'すてき', '很棒；美好', 'na', '', 'N3'], '綴る': ['綴る', 'つづる', '寫下；編寫', 'v', '1', ''],
  '痛む': ['痛む', 'いたむ', '疼痛；痛', 'v', '1', 'N3'], '時': ['時', 'とき', '時候；時光', 'n', '', 'N5'], '朝日': ['朝日', 'あさひ', '朝陽；旭日', 'n', '', ''], '会': ['会', 'かい', '（…）會；聚會', 'suf', '', 'N3'] };
for (const [k, v] of Object.entries(FIX)) out.set(k, v);
const lines = [...out.values()].sort((a, b) => (a[5] || 'N9').localeCompare(b[5] || 'N9') || a[0].localeCompare(b[0], 'ja')).map(r => r.join('|') + '|f');
const head = `// 自動產生（tools/build-fill.mjs），勿手改。補詞：本站 N5–N1 詞表與 dict-news 都沒有的常用詞，${lines.length} 行。
// 格式同 dict-news：表層|讀音(同表層時空)|中文|詞性|類別(動詞1/2/3、サ變s)|等級|f（f＝補詞：不登記純假名寫法，避免搶走既有詞的假名形，如 いっぱい）
// 來源與授權（CC BY-SA 4.0，本檔亦以 CC BY-SA 4.0 釋出）：
//   JMdict © Electronic Dictionary Research and Development Group（https://www.edrdg.org/edrdg/licence.html）
//   中文釋義：Tomoshi dict data © Y1Z（https://github.com/tomoshi-app/tomoshi-dict-data），JLPT 標記 tanos.co.uk 系
//   修改：只取第一義項前 2 段、去掉用字說明、詞性改成本站代碼。
// 由 JPText.ready() 載入（接在 dict-news 後面）。
`;
fs.writeFileSync(OUT, head + '(function () {\n  const D = `\n' + lines.join('\n') + '\n`;\n  window.JP_DICT_EXT = (window.JP_DICT_EXT ? window.JP_DICT_EXT + String.fromCharCode(10) : \'\') + D.trim();\n})();\n');
const byLv = {}; [...out.values()].forEach(r => { byLv[r[5] || '-'] = (byLv[r[5] || '-'] || 0) + 1; });
console.log('輸出', OUT, lines.length, '行', JSON.stringify(byLv), '已收錄略過', skipKnown, 'EXTRA 找不到', miss.join(' ') || '無', (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB');
