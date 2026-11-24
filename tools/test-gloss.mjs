// 逐詞中文（JPText.gloss：辭書形意思＋活用語意）與補詞（data/reading/dict-fill.js）回歸測試
//   node --max-old-space-size=1024 tools/test-gloss.mjs
// 句子為自擬、仿歌詞常見句型（不收真實歌詞）；見 docs/詞庫與分類/03-歌曲翻譯分析.md
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js',
  'data/reading/dict-news.js', 'data/reading/dict-fill.js', 'data/reading/dict-big.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'js/jp-text.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const J = ctx.JPText; J._build();

// [句子, 詞, 該詞的逐詞中文]
const CASES = [
  ['忘れられないあの日の約束', '忘れられない', '忘記不了'],
  ['君のそばにいたかった', 'いたかった', '好想在'],
  ['会いたくて会えなくて', '会いたくて', '想見面'],
  ['会いたくて会えなくて', '会えなくて', '見面不了'],
  ['抱きしめたいのに届かない', '抱きしめたい', '想緊緊擁抱'],
  ['笑ってたって心は泣いてる', '笑ってたって', '就算笑'],
  ['笑ってたって心は泣いてる', '泣いてる', '在哭'],
  ['叶わない恋だと知ってても', '知ってても', '即使知道'],
  ['このまま時が止まればいい', '止まれば', '要是停止'],
  ['このまま時が止まればいい', '時', '時候'],
  ['もう二度と戻れない', '戻れない', '回來不了'],
  ['優しさに包まれて', '優しさ', '溫柔'],
  ['走り出そう', '走り出そう', '跑起來吧'],
  ['言わなきゃ', '言わなきゃ', '得說'],
  ['君がいなくなった夜に', 'いなくなった', '不見了'],
  ['思い出す度に胸が痛む', '痛む', '疼痛'],
  ['素敵な夜', '素敵', '很棒'],
  ['足が痛い', '足', '腳'],
  ['映画が終わった', '終わった', '結束了'],
  ['涙が落ちる', '落ちる', '落下'],
  ['昨日は行かなかった', '行かなかった', '沒去'],
  ['寒くなった', '寒くなった', '變冷']
];
let ok = 0;
const bad = [];
for (const [line, w, want] of CASES) {
  const t = J.tokenize(line).find(x => x.s === w);
  const got = t ? J.gloss(t) : '（沒切出這個詞）';
  if (got === want) ok++; else bad.push(`${line}｜${w}：期望「${want}」，實際「${got}」`);
}
// 漢字音讀／訓讀（data/reading/kanji.js）：[詞, 讀音, 期望「字:讀音:音訓」…；熟字訓寫 'jukuji']
['data/reading/kanji.js', 'data/reading/senses.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const KCASES = [
  ['学校', 'がっこう', '学:がっ:音 校:こう:音'],
  ['一本', 'いっぽん', '一:いっ:音 本:ぽん:音'],
  ['人々', 'ひとびと', '人:ひと:訓 々:びと:訓'],
  ['食べる', 'たべる', '食:た:訓'],
  ['山登り', 'やまのぼり', '山:やま:訓 登:のぼ:訓'],
  ['勉強', 'べんきょう', '勉:べん:音 強:きょう:音'],
  ['日', 'ひ', '日:ひ:訓'],
  ['毎日', 'まいにち', '毎:まい:音 日:にち:音'],
  ['今日', 'きょう', 'jukuji'],
  ['大人', 'おとな', 'jukuji']
];
const SCASES = [['届く', 3], ['日', 4]];   // 詞卡多義：至少幾個義項
const done = [];
for (const [w, r, want] of KCASES) done.push(J.kanji({ s: w, base: w, kana: r, bkana: r }).then(P => {
  const got = P.length && P[0].jukuji ? 'jukuji' : P.map(p => `${p.k}:${p.r}:${p.t}`).join(' ');
  if (got === want) ok++; else bad.push(`漢字 ${w}（${r}）：期望「${want}」，實際「${got}」`);
}));
for (const [w, n] of SCASES) done.push(J.senses({ s: w, base: w, zh: '' }).then(G => {
  const got = G.reduce((a, g) => a + g.list.length, 0);
  if (got >= n) ok++; else bad.push(`多義 ${w}：期望 ≥${n} 個義項，實際 ${got}`);
}));
await Promise.all(done);
const total = CASES.length + KCASES.length + SCASES.length;
bad.forEach(b => console.log('FAIL', b));
console.log(`${bad.length ? '✗' : '✓'} test-gloss：${ok}/${total}（逐詞 ${CASES.length}、漢字音訓 ${KCASES.length}、多義 ${SCASES.length}）`);
process.exitCode = bad.length ? 1 : 0;
