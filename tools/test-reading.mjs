// 斷詞讀音回歸測試（評審 v15 P0）：node tools/test-reading.mjs
// [句子, 字面, 期望讀音(base 的 bkana), 中文須含(可省)]
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 兩種條件都測：App 冷啟動 JPText.ready()（N5–N3＋補充字典）與 ready(true)（再加 N2、N1）；不另載場景資料，免得假綠燈
function mk(full) {
  const ctx = { console, localStorage: { getItem: () => null, setItem() { } } }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  ['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js'].concat(full ? ['data/mind/lex-n2.js', 'data/mind/lex-n1.js'] : [], ['data/reading/dict-news.js', 'js/jp-text.js']).forEach(f => { try { load(f); } catch (e) { console.error('載入失敗', f, e.message); } });
  ctx.JPText._build(); return ctx.JPText;
}
const JS = [['冷啟動', mk(false)], ['完整', mk(true)]];
const C = [
  ['生ビールください', '生ビール', 'なまびーる'], ['日本酒を一つ', '日本酒', 'にほんしゅ'],
  ['お腹が空いた', '空いた', 'すく'], ['席が空いた', '空いた', 'あく'],
  ['こっちの方がいい', '方', 'ほう'], ['行った方がいい', '方', 'ほう'], ['あの方が先生です', '方', 'かた'],
  ['雨が降りそうです', '降り', 'ふる'], ['電車を降りる', '降りる', 'おりる'],
  ['会議は三時に開かれます', '開かれます', 'ひらく'], ['ドアが開かない', '開かない', 'あく'], ['店は十時に開く', '開く', 'ひらく'],
  ['窓を開けてください', '開けて', 'あける'],
  ['四月一日に出発します', '一日', 'ついたち'], ['一日中雨だった', '一日中', 'いちにちじゅう'], ['今日中に', '中', 'じゅう'], ['会議中です', '中', 'ちゅう'],
  ['今日は何曜日', '何', 'なん'], ['何を食べますか', '何', 'なに'],
  ['別れは辛い', '辛い', 'つらい'], ['このカレーは辛い', '辛い', 'からい'],
  ['彼は来ないそうだ', 'そう', 'そう', '傳聞'], ['飲み込んでしまいそうな', 'そう', 'そう', '樣態'], ['雨が降りそうです', 'そうです', 'そう', '樣態'],
  ['プレゼント用に', '用', 'よう', '用的'], ['気をつけてください', 'つけて', 'つける', '小心'],
  // 評審 v16
  ['北海道限定生ビール', '生ビール', 'なまびーる'], ['辛い思い出', '辛い', 'つらい'], ['辛くも勝った', '辛くも', 'からくも'],
  ['道が空いている', '空いて', 'すく'], ['席が空いている', '空いて', 'あく'], ['生の声を聞く', '生の声', 'なまのこえ'], ['上手くいく', '上手く', 'うまく'],
  ['君がいなくなった', 'いなくなった', 'いなくなる'], ['馬鹿馬鹿しい話だ', '馬鹿馬鹿しい', 'ばかばかしい'], ['そうはいかない', 'そうはいかない', 'そうはいかない'],
  ['幻だと思おう', 'と', 'と', '引用'],
  // 評審 v16 對抗（v52 複測）
  ['行くことにした', 'こと', 'こと'], ['ならないことに驚く', 'こと', 'こと'], ['食べたことに気づいた', '気づいた', 'きづく'], ['好きなことに夢中', 'こと', 'こと'],
  ['行かなければならない', 'ならない', 'なる', '必須'], ['口を開く', '開く', 'ひらく'], ['毎月払う', '毎月', 'まいつき'],
  ['一年中暑い', '一年中', 'いちねんじゅう'], ['何本ですか', '何本', 'なんぼん'], ['辛口のカレー', '辛口', 'からくち'], ['激辛ラーメン', '激辛', 'げきから'],
  ['天才的な人', '的', 'てき'], ['街ごと燃えた', 'ごと', 'ごと']
];
let f = 0, n = 0;
for (const [lab, J] of JS) for (const [s, w, k, zh] of C) {
  n++;
  const t = J.tokenize(s).find(x => x.s === w);
  const ok = t && t.bkana === k && (!zh || String(t.zh).includes(zh));
  if (!ok) { f++; console.log(`✗ [${lab}] ${s}：「${w}」→ ${t ? t.bkana + '／' + t.zh : '（沒切出）'}，期望 ${k}${zh ? '／含' + zh : ''}`); }
}
console.log(f ? `✗ test-reading：${n - f}/${n}` : `✓ test-reading：${n}/${n}（冷啟動＋完整詞庫）`);
process.exit(f ? 1 : 0);
