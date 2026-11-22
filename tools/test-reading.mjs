// 斷詞讀音回歸測試（評審 v15 P0）：node tools/test-reading.mjs
// [句子, 字面, 期望讀音(base 的 bkana), 中文須含(可省)]
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js', 'data/mind/grammar.js', 'data/reading/dict-news.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'data/reading/daily.js', 'js/jp-text.js'].forEach(f => { try { load(f); } catch (e) { } });
const J = ctx.JPText; J._build();
const C = [
  ['生ビールください', '生ビール', 'なまびーる'], ['日本酒を一つ', '日本酒', 'にほんしゅ'],
  ['お腹が空いた', '空いた', 'すく'], ['席が空いた', '空いた', 'あく'],
  ['こっちの方がいい', '方', 'ほう'], ['行った方がいい', '方', 'ほう'], ['あの方が先生です', '方', 'かた'],
  ['雨が降りそうです', '降り', 'ふる'], ['電車を降りる', '降りる', 'おりる'],
  ['会議は三時に開かれます', '開かれます', 'ひらく'], ['ドアが開かない', '開かない', 'あく'], ['店は十時に開く', '開く', 'ひらく'],
  ['窓を開けてください', '開けて', 'あける'],
  ['四月一日に出発します', '一日', 'ついたち'], ['一日中雨だった', '中', 'じゅう'], ['会議中です', '中', 'ちゅう'],
  ['今日は何曜日', '何', 'なん'], ['何を食べますか', '何', 'なに'],
  ['別れは辛い', '辛い', 'つらい'], ['このカレーは辛い', '辛い', 'からい'],
  ['彼は来ないそうだ', 'そう', 'そう', '傳聞'], ['飲み込んでしまいそうな', 'そう', 'そう', '樣態'], ['雨が降りそうです', 'そうです', 'そう', '樣態'],
  ['プレゼント用に', '用', 'よう', '用的'], ['気をつけてください', 'つけて', 'つける', '小心']
];
let f = 0;
for (const [s, w, k, zh] of C) {
  const t = J.tokenize(s).find(x => x.s === w);
  const ok = t && t.bkana === k && (!zh || String(t.zh).includes(zh));
  if (!ok) { f++; console.log(`✗ ${s}：「${w}」→ ${t ? t.bkana + '／' + t.zh : '（沒切出）'}，期望 ${k}${zh ? '／含' + zh : ''}`); }
}
console.log(f ? `✗ test-reading：${C.length - f}/${C.length}` : `✓ test-reading：${C.length}/${C.length}`);
process.exit(f ? 1 : 0);
