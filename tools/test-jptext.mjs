// JPText 斷詞／文法／片語回歸測試（node tools/test-jptext.mjs）
//   --save   把目前結果存成基準（tools/test-jptext.base.txt）
//   預設     與基準比對，列出修前修後差異，並檢查 CHECKS 的必要條件
// 語料：data/reading/daily.js 全部段落＋下方新聞／商務／歌詞片段；
//       若 D:\reviewtmp\v7-p4\*-tokens.txt 存在，另外還原歌詞逐句加入；
//       歌詞受著作權保護，其基準只存在本機 D:\reviewtmp\v7-p4\lyric-base.txt，不得寫進專案
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'tools', 'test-jptext.base.txt');
const LBASE = 'D:/reviewtmp/v7-p4/lyric-base.txt';   // 歌詞基準（本機，不進 repo）
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js', 'data/mind/grammar.js',
  'data/reading/dict-news.js', 'data/reading/dict-fill.js', 'data/reading/dict-big.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'data/reading/daily.js', 'js/jp-text.js'].forEach(f => { try { load(f); } catch (e) { console.error('載入失敗', f, e.message); } });
const J = ctx.JPText;
J._build();

const EXTRA = [
  // 新聞（06、03 評審）
  '国が守ろうとしてきた伝統が、いま失われようとする今、保全と継承が課題だ。',
  '景気は回復したとはいうものの、生活は苦しいままだ。',
  '議員定数につきましては、次の国会で議論します。',
  '制度の見直しによって、負担が減った。観光によって生まれる利益を文化の担い手に還元する。',
  'この法律で問題が解決されるわけではありません。',
  '総選挙における争点は、約における公約の実現だ。',
  '予算の一部を防災に充てる方針で、公約の実現を目指す。',
  '名簿を選挙管理委員会に届け出る必要がある。我が国の経済は回復している。',
  '日本文化を仕組みで守る。社団法人が富裕層向けの検索サービスを始めた。既存の制度を継承する。',
  '強化が挙げられている。',
  // 商務（03 評審）
  '田中様、いつもお世話になっております。山田さんから伺いました。',
  '会議は金曜日までに延期させていただきます。',
  '見積書を添付いたしましたので、ご査収のほどよろしくお願い申し上げます。',
  '弊社の担当者から折り返しご連絡いたします。',
  '金曜日までにご返信いただけますでしょうか。',
  // 評審 v16 對抗（v52 複測）
  '友達と旅行に行くことにした。',
  '日本語の勉強をしなければならないことに驚く。',
  '財布を忘れたことに気づいた。',
  '好きなことに夢中になる。',
  // 評審 v17：慣用語與反例（每條規則配一句反向用法）
  '君のせいで、思い切って言えなかった。会いたくて仕方ない。',
  'そんな気がするけど、どうしようもない。それさえわからない。',
  '一日ごとに変わる。りんごを皮ごと食べる。的を射る意見だ。',
  '今週中に送ります。何時間かかりますか。二日目の朝、彼だとわかった。',
  '口を開くと、毎月の家賃の話になる。',
  '一年中暑い町で、何本も激辛ラーメンを食べた。天才的な料理人だ。',
  // 口語／歌詞風格（自撰例句，04 評審點名的錯；不收真實歌詞）
  '弱いとこは見せちゃだめだよ',
  '質問をのらりくらりかわしている',
  'こんな暑さじゃ生きらんない',
  '月曜は本当にかったりい',
  '試験に打ちのめされて帰った',
  '水面下で交渉が進む',
  '庭に咲いた一輪のばらが美しい',
  '強いね',
  '今日の私は主役の引き立て役だ',
];
function lyricLines() {
  const out = [];
  for (const f of ['gurenge-tokens.txt', 'idol-tokens.txt']) {
    const p = path.join('D:\\reviewtmp\\v7-p4', f);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(l => {
      const toks = l.replace(/^\d+\s+/, '').split(' ').filter(Boolean).map(t => t.split(/[(=]/)[0]);
      if (!toks.length || toks.every(t => /^[A-Za-z']+$/.test(t))) return;
      out.push(toks.reduce((a, t) => a + (/^[A-Za-z]/.test(t) && /[A-Za-z]$/.test(a) ? ' ' : '') + t, ''));
    });
  }
  return [...new Set(out)];
}
const corpus = [];
(ctx.READING && ctx.READING.daily || []).forEach(a => a.p.forEach(([jp]) => corpus.push(['daily:' + a.id, jp])));
EXTRA.forEach(s => corpus.push(['extra', s]));
lyricLines().forEach(s => corpus.push(['lyric', s]));

const tokStr = tks => tks.filter(t => !t.sym).map(t => t.s + (t.zh ? '[' + String(t.zh).slice(0, 6) + ']' : t.pos === 'unk' && t.unreg ? '[?]' : '')).join(' ');
const lines = [];
for (const [src, s] of corpus) {
  const tk = J.tokenize(s);
  const gr = J.findGrammar(s, tk, 30, { lv: 'n1' }).map(g => g.pat).sort();
  const ph = J.findPhrases(s, tk, 10).map(p => p.jp);
  lines.push(`${src}\t${s}\n  T: ${tokStr(tk)}\n  G: ${gr.join(' | ')}\n  P: ${ph.join(' | ')}`);
}
const isLyric = l => l.startsWith('lyric\t');
const now = lines.filter(l => !isLyric(l)).join('\n'), nowL = lines.filter(isLyric).join('\n');

// 必要條件（修正目標）
const T = s => J.tokenize(s), G = (s, lv) => J.findGrammar(s, null, 40, { lv: lv || 'n1' }).map(g => g.pat), P = s => J.findPhrases(s, null, 20).map(p => p.jp);
const has = (arr, re) => arr.some(x => re.test(x));
const tok = (s, w) => T(s).find(t => t.s === w);
const CHECKS = [
  // 評審 v18 P1 文法
  ['キロとなり 不判〜なり', () => !has(G('距離は40万キロとなり、記録を更新した。', 'n3'), /〜なり（/)],
  ['帰るなり 判〜なり', () => has(G('家に帰るなり寝てしまった。', 'n3'), /〜なり（/)],
  ['ことに驚く 不判〜ことに（は）', () => !has(G('持ち帰らなければならないことに驚く。', 'n3'), /ことに（は）/)],
  ['驚いたことに、判〜ことに（は）', () => has(G('驚いたことに、彼は来なかった。', 'n3'), /ことに（は）/)],
  ['N3 也列 なければならない', () => has(G('毎日勉強しなければならない。', 'n3'), /なければならない/)],
  ['N3 也列 はずだ', () => has(G('彼はもう着いたはずだ。', 'n3'), /はずだ/)],
  ['ようになった 判〜ようになる、不判目的與使役', () => { const g = G('日本語が話せるようになった。', 'n3'); return has(g, /ようになる/) && !has(g, /目的|使役/); }],
  // 評審 v18 P0-6
  ['京都まで 不判甚至', () => !has(G('京都まで行きます。'), /まで（/)],
  ['屋根まで 不判甚至', () => !has(G('屋根まで飛んだ'), /まで（/)],
  ['子供まで知っている 判甚至', () => has(G('子供まで知っている。'), /まで（甚至）/)],
  ['二十日 不是八', () => { const t = tok('二十日に会いましょう。', '二十日'); return !!t && t.kana === 'はつか' && !/^八$/.test(t.zh); }],
  ['十分後 讀じゅっぷん', () => { const t = tok('十分後に出発します。', '十分'); return !!t && t.kana === 'じゅっぷん'; }],
  ['時間は十分 讀じゅうぶん', () => { const t = tok('時間は十分あります。', '十分'); return !!t && t.kana === 'じゅうぶん'; }],
  ['迷惑をおかけ 不是打電話', () => !T('ご迷惑をおかけしました。').some(t => /電話/.test(t.zh || ''))],
  ['迷惑をかける 不判〜かける（一半）', () => !has(G('迷惑をかける'), /かける／/)],
  ['と発表 是引用', () => /引用/.test((T('政府は値上げすると発表した。').find(t => t.s === 'と') || {}).zh || '') || !T('政府は値上げすると発表した。').some(t => t.s === 'と' && /^和/.test(t.zh || ''))],
  ['開くと 是條件', () => /條件/.test((T('ドアを開くと、猫がいた。').find(t => t.s === 'と') || {}).zh || '')],
  ['ずとも 不判條件', () => !/條件/.test((T('現地に赴かずとも味わえる。').find(t => t.s === 'と') || {}).zh || '')],
  ['までに 不判〜まで（甚至）', () => !has(G('会議は金曜日までに延期させていただきます。'), /まで（/)],
  ['(よ)うとする 不判〜(よ)うと', () => !has(G('伝統が失われようとする今'), /^〜\(よ\)うと（|うと$|うとも/)],
  ['とはいうものの 抓 N2 句型', () => has(G('景気は回復したとはいうものの、生活は苦しい。'), /とはいうものの/)],
  ['とはいうものの 不再算 もの／ものの', () => !has(G('景気は回復したとはいうものの、生活は苦しい。'), /^〜もの(（|／|$)|^〜ものの/)],
  ['につきまして 不判〜につき', () => !has(G('議員定数につきましては議論します。'), /につき（|^〜につき$/)],
  ['によって 手段不判行為者', () => !has(G('制度の見直しによって、負担が減った。'), /行為者/)],
  ['によって 被動仍判行為者', () => has(G('この絵はピカソによって描かれた。'), /行為者/)],
  ['させていただく 的いただく 不是開動了', () => !T('延期させていただきます').some(t => /開動/.test(t.zh || ''))],
  ['田中様 一組', () => !!tok('田中様、こんにちは', '田中様')],
  ['山田さん 一組', () => !!tok('山田さんから伺いました', '山田さん')],
  ['充てる', () => !!tok('予算を防災に充てる', '充てる')],
  ['実現', () => !!tok('公約の実現を目指す', '実現')],
  ['公約', () => !!tok('公約の実現を目指す', '公約')],
  ['仕組み', () => !!tok('日本文化を仕組みで守る', '仕組み')],
  ['弊社', () => !!tok('弊社の担当者', '弊社')],
  ['査収', () => T('ご査収のほど').some(t => /査収/.test(t.s) && t.known)],
  ['検索', () => T('検索サービス').some(t => /検索/.test(t.s) && t.known)],
  ['継承', () => T('制度を継承する').some(t => /継承/.test(t.s) && t.known)],
  ['保全', () => T('文化の保全').some(t => /保全/.test(t.s) && t.known)],
  ['いとこ 不給「堂」', () => !T('弱いとこは見せちゃだめだよ').some(t => /堂/.test(t.zh || ''))],
  ['ちゃ 不給「茶」', () => !T('弱いとこは見せちゃだめだよ').some(t => /茶/.test(t.zh || ''))],
  ['くら 不給「倉庫」', () => !T('質問をのらりくらりかわしている').some(t => /倉/.test(t.zh || ''))],
  ['らん 不給「欄位」', () => !T('こんな暑さじゃ生きらんない').some(t => /欄/.test(t.zh || ''))],
  ['強い 讀つよい', () => { const t = tok('強いね', '強い'); return !!t && /^つよ/.test(t.kana); }],
  ['不產生 総選挙におく', () => !has(P('総選挙における争点'), /におく/)],
  ['不產生 約におく', () => !has(P('約における公約'), /におく/)],
  ['被動不產生「強化が挙げる」', () => !has(P('強化が挙げられている。'), /が挙げる/)],
];
let fail = 0;
const res = CHECKS.map(([n, f]) => { let ok = false; try { ok = !!f(); } catch (e) { ok = false; } if (!ok) fail++; return (ok ? 'PASS ' : 'FAIL ') + n; });

if (process.argv.includes('--save')) { fs.writeFileSync(BASE, now); if (nowL) fs.writeFileSync(LBASE, nowL); console.log('已存基準', BASE, corpus.length, '句'); }
else for (const [BF, NOW] of [[BASE, now], [LBASE, nowL]]) if (NOW && fs.existsSync(BF)) {
  const old = fs.readFileSync(BF, 'utf8').split(/\n(?=\S)/), cur = NOW.split(/\n(?=\S)/);
  const om = new Map(old.map(b => [b.split('\n')[0], b]));
  let n = 0;
  for (const b of cur) {
    const k = b.split('\n')[0], o = om.get(k);
    if (o === b) continue;
    n++;
    console.log('── ' + k);
    if (!o) { console.log('  (新句)'); continue; }
    const ol = o.split('\n'), nl = b.split('\n');
    for (let i = 1; i < nl.length; i++) if (ol[i] !== nl[i]) console.log('  修前' + ol[i].trim().slice(0, 1) + ': ' + ol[i].trim().slice(3) + '\n  修後' + nl[i].trim().slice(0, 1) + ': ' + nl[i].trim().slice(3));
  }
  console.log(`\n差異 ${n} / ${cur.length} 句`);
}
console.log(res.join('\n'));
console.log(`\n必要條件：${CHECKS.length - fail}/${CHECKS.length} 通過`);
process.exitCode = fail ? 1 : 0;
