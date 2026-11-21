// 翻唱影片標題解析回歸測試（離線，不連網）：node tools/test-cover.mjs（-v 列出全部結果）
// 測 js/link-import.js 的 LinkImport.coverParse(title, author, Songs.HOT)：
// 歌名候選（cands[0]）、原唱、翻唱者是否合理；歌名可列多個可接受寫法，原唱 '' 表示標題沒寫、不檢查。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const songs = fs.readFileSync(path.join(ROOT, 'js/songs.js'), 'utf8');
const HOT = JSON.parse(songs.match(/const HOT = (\[\[.*?\]\]);/)[1]);
const ctx = { console, URL, URLSearchParams };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/link-import.js'), 'utf8'), ctx, { filename: 'link-import.js' });
const L = ctx.LinkImport;
const verbose = process.argv.includes('-v');

// [標題, 頻道名, 期望歌名（| 分隔可接受寫法）, 期望原唱（'' 不檢查）, 期望翻唱者（| 分隔；null＝非翻唱）]
const CASES = [
  // 常見格式（自編）
  ['【歌ってみた】紅蓮華 / LiSA【まふまふ】', 'まふまふちゃんねる', '紅蓮華', 'LiSA', 'まふまふ'],
  ['アイドル (Cover) / YOASOBI - 歌い手名', '歌い手名', 'アイドル', 'YOASOBI', '歌い手名'],
  ['夜に駆ける 歌ってみた ver.ぽこた', 'ぽこた', '夜に駆ける', 'YOASOBI', 'ぽこた'],
  ['Lemon - 米津玄師 cover by 天月', 'amatsuki', 'Lemon', '米津玄師', '天月'],
  ['【弾き語り】マリーゴールド / あいみょん', 'ゆうりのギター', 'マリーゴールド', 'あいみょん', 'ゆうりのギター'],
  ['残酷な天使のテーゼ 翻唱', '小明', '残酷な天使のテーゼ', '', '小明'],
  ['【翻唱】紅蓮華 - LiSA｜阿月', '阿月 Ayue', '紅蓮華', 'LiSA', '阿月'],
  ['群青 / YOASOBI (Acoustic Cover)', 'Kobasolo', '群青', 'YOASOBI', 'Kobasolo'],
  ['Covered by 花譜「新時代」Ado', 'KAF', '新時代', 'Ado', '花譜'],
  ['【MV】ドライフラワー - 優里（cover）歌：りぶ', 'りぶ', 'ドライフラワー', '優里', 'りぶ'],
  ['うっせぇわ/Ado【歌ってみた】ver.そらる', 'そらる', 'うっせぇわ', 'Ado', 'そらる'],
  ['『怪獣の花唄』Vaundy (cover) feat. 誰か', 'チャンネルA', '怪獣の花唄', 'Vaundy', 'チャンネルA'],
  ['ベテルギウス 優里 カバー', 'カバー太郎', 'ベテルギウス', '優里', 'カバー太郎'],
  ['【女性が歌う】Subtitle / Official髭男dism (Full Covered by コバソロ & 相沢)', 'kobasolo', 'Subtitle', 'Official髭男dism', 'コバソロ & 相沢'],
  ['Bling-Bang-Bang-Born / Creepy Nuts 叩いてみた【ドラム】', 'ドラマーK', 'Bling-Bang-Bang-Born', 'Creepy Nuts', 'ドラム|ドラマーK'],
  ['【ピアノ】晩餐歌 / tuki. 弾いてみた', 'ピアノ弾き', '晩餐歌', 'tuki.', 'ピアノ|ピアノ弾き'],
  ['唱 / Ado 歌ってみた【いれいす】', 'いれいす', '唱', 'Ado', 'いれいす'],
  ['青と夏 - Mrs. GREEN APPLE (Cover by Uru)', 'Uru', '青と夏', 'Mrs. GREEN APPLE', 'Uru'],
  // 真實公開影片標題（2026-11 YouTube 搜尋結果）
  ['【鬼滅の刃】LiSA - 紅蓮華  / 獅子神レオナ【歌ってみた】Demon Slayer Kimetsu no Yaiba Opening', 'Leona Shishigami Ch. 獅子神レオナ / レオナ', '紅蓮華', 'LiSA', '獅子神レオナ'],
  ['【鬼滅の刃】紅蓮華 - LiSA / 星乃めあ【歌ってみた】Demon Slayer Opening Full Gurenge cover', 'MaiR', '紅蓮華', 'LiSA', '星乃めあ'],
  ['紅蓮華／LiSA【Covered by Hanon】', 'Hanon', '紅蓮華', 'LiSA', 'Hanon'],
  ['【鬼滅の刃】紅蓮華本気で歌ってみた【LiSA】', '鬼滅好き', '紅蓮華', 'LiSA', '鬼滅好き'],
  ['Gurenge / 紅蓮華【鬼滅の刃】Demon Slayer: Kimetsu no Yaiba | AiKA Cover (Rock Ver.)', 'AiKA', '紅蓮華', 'LiSA', 'AiKA'],
  ['【 推しの子OP / Oshi no ko 】アイドル / ver. 鴉紋ゆうく (Cover) 【のなめぷろだくしょん】', 'のなめぷろだくしょん', 'アイドル', 'YOASOBI', '鴉紋ゆうく'],
  ['アイドル (YOASOBI) ／ダズビー COVER', 'DAZBEE', 'アイドル', 'YOASOBI', 'ダズビー'],
  ['【推しの子】OP主題歌「アイドル／YOASOBI」 高橋李依（アイ役）cover.【歌ってみた】', '推しの子', 'アイドル', 'YOASOBI', '高橋李依'],
  ['アイドル (YOASOBI) / 藍璃かんな Cover', '아이리 칸나 Music', 'アイドル', 'YOASOBI', '藍璃かんな'],
  ['YOASOBI-「アイドル」（IDOL）cover |「推しの子」OP', '真栗', 'アイドル', 'YOASOBI', '真栗'],
  ['夜に駆ける / YOASOBI cover by Uh.', 'Uh.', '夜に駆ける', 'YOASOBI', 'Uh'],
  ['【歌ってみた】夜に駆ける / Covered by 花鋏キョウ【YOASOBI】', '花鋏キョウ', '夜に駆ける', 'YOASOBI', '花鋏キョウ'],
  ['【歌ってみた】夜に駆ける／YOASOBI covered by 手越祐也', '手越祐也', '夜に駆ける', 'YOASOBI', '手越祐也'],
  ['夜に駆ける / Covered by 紫咲シオン【YOASOBI】', 'Shion Ch. 紫咲シオン', '夜に駆ける', 'YOASOBI', '紫咲シオン'],
  ['【女性が歌う】Lemon/米津玄師(Full Covered by コバソロ & 春茶)', 'kobasolo', 'Lemon', '米津玄師', 'コバソロ & 春茶'],
  ["Billlie | 米津玄師 (Kenshi Yonezu) 'Lemon' COVER | COVERED BY HARUNA, TSUKI", 'Billlie', 'Lemon', '米津玄師', 'HARUNA, TSUKI'],
  ['【女性が歌う】 米津玄師 「Lemon」（TBS金曜ドラマ『アンナチュラル』主題歌） cover by Uh.', '女性が歌う', 'Lemon', '米津玄師', 'Uh'],
  ['米津玄師 Yonezu Kenshi - Lemon (Cover by YOOK SUNGJAE)', '육캔두잇 YOOK SUNGJAE', 'Lemon', '米津玄師', 'YOOK SUNGJAE'],
  ['【Rainych】 Lemon「米津玄師」- Kenshi Yonezu  (Cover)', 'Rainych Ran', 'Lemon', '米津玄師', 'Rainych'],
  ['Lemon (米津玄師) ／ダズビー COVER', 'DAZBEE', 'Lemon', '米津玄師', 'ダズビー'],
  ['マリーゴールド / あいみょん 歌ってみた 弾き語り covered by haru', 'haru', 'マリーゴールド', 'あいみょん', 'haru'],
  ['【弾き語り】マリーゴールド - あいみょん Covered by Kota Yamamoto', 'Kota Yamamoto', 'マリーゴールド', 'あいみょん', 'Kota Yamamoto'],
  ['【コード歌詞付】あいみょん マリーゴールド 武道館弾き語りver. カバー', '畑中摩美Mami Hatanaka', 'マリーゴールド', 'あいみょん', '畑中摩美Mami Hatanaka'],
  ['マリーゴールド（あいみょん COVER）Yas', 'naitnaitnaitseaside', 'マリーゴールド', 'あいみょん', 'Yas'],
  ['残酷な天使のテーゼ┃Cover by Raon Lee', 'Raon', '残酷な天使のテーゼ', '', 'Raon Lee'],
  ['【Evangelion OP】残酷な天使のテーゼ/高橋洋子(Covered by コバソロ & 若菜)', 'kobasolo', '残酷な天使のテーゼ', '高橋洋子', 'コバソロ & 若菜'],
  ['『残酷な天使のテーゼ』/後藤真希が歌ってみた', 'ゴマキのギルド', '残酷な天使のテーゼ', '', '後藤真希'],
  ['残酷な天使のテーゼ 【新世紀エヴァンゲリオン】 Cover by Seira', 'Seira', '残酷な天使のテーゼ', '', 'Seira'],
  ['【チェンソーマンOP】『KICK BACK／米津玄師』を死に物狂いで歌ってみた【虹色侍 ずま】', '虹色侍', 'KICK BACK', '米津玄師', '虹色侍 ずま'],
  ['KICK BACK 歌ってみた【もるでお】', 'もるでお', 'KICK BACK', '米津玄師', 'もるでお'],
  ['KICK BACK / 鷹嶺ルイ(cover)', 'Lui ch. 鷹嶺ルイ - holoX -', 'KICK BACK', '米津玄師', '鷹嶺ルイ'],
  ['KICK BACK / 米津玄師 (𝗰𝗼𝘃𝗲𝗿) | yoei.', 'yoei', 'KICK BACK', '米津玄師', 'yoei'],
  ['KICK BACK (米津玄師) / 藍璃かんな Cover', '아이리 칸나 Music', 'KICK BACK', '米津玄師', '藍璃かんな'],
  ['【１周年記念】最強にかっこよく『KICK BACK』歌ってみた【鴉紋ゆうく】', '鴉紋ゆうく', 'KICK BACK', '米津玄師', '鴉紋ゆうく'],
  ['EXILE ATSUSHI / ドライフラワー (Cover) 【Album ONE収録】', 'EXILE ATSUSHI', 'ドライフラワー', '優里', 'EXILE ATSUSHI'],
  ['ドライフラワー/優里 [Cover]', '鷲尾伶菜 Official YouTube', 'ドライフラワー', '優里', '鷲尾伶菜'],
  ['【Official】Uru 『ドライフラワー』cover official audio', 'Uru Official YouTube', 'ドライフラワー', '優里', 'Uru'],
  ['Official髭男dism - Pretender (Girls Rock Cover)ーJet City Bug verー', 'From サイバーパンク 江戸', 'Pretender', 'Official髭男dism', 'Jet City Bug verー|From サイバーパンク 江戸'],
  ["'Pretender' Official髭男dism Covered by ZEROBASEONE (제로베이스원) HAN BIN", 'ZEROBASEONE', 'Pretender', 'Official髭男dism', 'ZEROBASEONE'],
  ['「Pretender」 Covered by millsage', 'millsage', 'Pretender', 'Official髭男dism', 'millsage'],
  ['【歌ってみた】Pretender -  Official髭男dism covered by 明透【神椿】', '明透', 'Pretender', 'Official髭男dism', '明透'],
  ['Pretender -  Official髭男dism // covered by 道明寺ここあ', '道明寺ここあ / COCOA DOMYOJI', 'Pretender', 'Official髭男dism', '道明寺ここあ'],
  ['俗にゆう天才が本気で『うっせぇわ』歌ってみた【まぜ太】', 'まぜ太', 'うっせぇわ', '', '俗にゆう天才|まぜ太'],
  ['【Ado】桜井日奈子が本気で「うっせぇわ」歌ってみた', '桜井日奈子', 'うっせぇわ', 'Ado', '桜井日奈子'],
  ['うっせぇわ／Covered by紫咲シオン【歌ってみた】', 'Shion Ch. 紫咲シオン', 'うっせぇわ', '', '紫咲シオン'],
  ['【胡蝶しのぶっぽく】うっせぇわ【替え歌で歌ってみた】', 'ゆゆにゃん', 'うっせぇわ', '', 'ゆゆにゃん|胡蝶しのぶっぽく'],
  ['【歌ってみた】うっせぇわ covered by 春猿火', '春猿火 -Harusaruhi-', 'うっせぇわ', '', '春猿火'],
  // 非翻唱（同一套解析也要切對歌名）
  ["LiSA『紅蓮華』-MUSiC CLiP-（テレビアニメ「鬼滅の刃」竈門炭治郎 立志編 オープニングテーマ）", 'LiSA Official YouTube', '紅蓮華', 'LiSA', null],
  ['YOASOBI「夜に駆ける」 Official Music Video', 'Ayase / YOASOBI', '夜に駆ける', 'YOASOBI', null],
  ['あいみょん – マリーゴールド【AIMYON BUDOKAN -1995-】', 'あいみょん', 'マリーゴールド', 'あいみょん', null],
  ['残酷な天使のテーゼ - 高橋洋子（フル）', 'anime', '残酷な天使のテーゼ', '高橋洋子', null],
  ['Ado - うっせぇわ / THE FIRST TAKE', 'THE FIRST TAKE', 'うっせぇわ', 'Ado', null],
];

const alt = x => String(x).split('|').map(v => L.sameSong(v, '') || true && v);
const same = (got, want) => String(want).split('|').some(w => got === w || (got && w && L.sameSong(got, w)));
const near = (got, want) => String(want).split('|').some(w => { const g = String(got || '').normalize('NFKC').toLowerCase().replace(/\s/g, ''), v = w.normalize('NFKC').toLowerCase().replace(/\s/g, ''); return g === v || (v.length >= 2 && (g.includes(v) || v.includes(g)) && g.length >= 2); });
let fail = 0;
const rows = [];
for (const [title, author, wt, wa, wb] of CASES) {
  const p = L.coverParse(title, author, HOT);
  const errs = [];
  if (!same(p.track, wt)) errs.push(`歌名「${p.track}」≠「${wt}」`);
  if (wa && !near(p.artist, wa) && !(p.cands[0] && p.cands[0].artists.some(a => near(a, wa)))) errs.push(`原唱「${p.artist}」≠「${wa}」`);
  if (wb === null ? p.cover : !p.cover) errs.push(wb === null ? '誤判為翻唱' : '沒認出是翻唱');
  if (wb && p.cover && !near(p.by, wb)) errs.push(`翻唱者「${p.by}」≠「${wb}」`);
  if (p.cands.length > 1 && p.cands[0].track === p.cands[1].track) errs.push('候選重複');
  if (errs.length) fail++;
  rows.push([errs.length ? '✗' : '✓', title, `歌名 ${p.track}｜原唱 ${p.artist || '—'}｜${p.cover ? '翻唱 ' + p.by : '非翻唱'}${p.hot ? '｜熱門' : ''}｜候選 ${p.cands.slice(0, 3).map(c => c.track).join('、')}`, errs.join('；')]);
}
rows.forEach(r => { if (verbose || r[0] === '✗') console.log(`${r[0]} ${r[1]}\n    → ${r[2]}${r[3] ? '\n    ✗ ' + r[3] : ''}`); });
console.log(`翻唱標題解析：${CASES.length - fail}/${CASES.length} 通過`);
process.exit(fail ? 1 : 0);
