// 羅馬字回歸測試：node tools/test-romaji.mjs（-v 列出全部結果）
// 全站唯一的羅馬字來源是 js/phrase.js 的 Phrase.romaji(kana, jp)（也接受 (jp, kana)）。
// 長音寫法統一：ou／uu／aa（片假名長音「ー」重複母音），不用 ā ō。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/phrase.js'), 'utf8'), ctx, { filename: 'phrase.js' });
const P = ctx.Phrase;
const verbose = process.argv.includes('-v');

// [jp, kana, 期望, 評審報告的錯例]
const CASES = [
  ['最終入館 17:30', 'さいしゅうにゅうかん じゅうしちじはん', 'saishuunyuukan juushichiji han', 'juushi chijihan'],
  ['会議は17:30からです', 'かいぎはじゅうしちじさんじゅっぷんからです', 'kaigi wa juushichiji sanjuppun kara desu', ''],
  ['ご連絡申し上げます', 'ごれんらくもうしあげます', 'gorenraku moushiagemasu', 'gorenrakumoushiagemasu'],
  ['お詫び申し上げます', 'おわびもうしあげます', 'owabi moushiagemasu', 'owabimoushiagemasu'],
  ['お会計は150円です。', 'おかいけいはひゃくごじゅうえんです', 'okaikei wa hyaku gojuu en desu', 'okaikei wa hyakugojuuen desu'],
  ['お会計は1,780円です。', 'おかいけいはせんななひゃくはちじゅうえんです', 'okaikei wa sen nanahyaku hachijuu en desu', ''],
  ['お会計は2,580円です。', 'おかいけいはにせんごひゃくはちじゅうえんです', 'okaikei wa nisen gohyaku hachijuu en desu', 'okaikei wa nisengo hyakuhachijuuen'],
  ['たまごサンド', 'たまごサンド', 'tamago sando', 'tama gosando'],
  ['幕の内弁当', 'まくのうちべんとう', 'makunouchi bentou', 'maku no uchibentou'],
  ['鮭おにぎり', 'しゃけおにぎり', 'shake onigiri', 'shakeonigiri'],
  ['どちらまでですか。', 'どちらまでですか', 'dochira made desu ka', 'dochiramadedesuka'],
  ['490円', 'よんひゃくきゅうじゅうえん', 'yonhyaku kyuujuu en', 'yonhyakukyuujuuen'],
  ['大人一人です。', 'おとなひとりです', 'otona hitori desu', 'otonahitori'],
  ['何回乗りますか。', 'なんかいのりますか', 'nankai norimasu ka', 'nankainorimasu'],
  ['浅草までは1,370円です。', 'あさくさまではせんさんびゃくななじゅうえんです', 'asakusa made wa sen sanbyaku nanajuu en desu', 'asakusa made ha sensan byakunanajuuen'],
  ['チェックインは何時からですか。', 'チェックインはなんじからですか', 'chekkuin wa nanji kara desu ka', 'chiekkuin'],
  ['チェックアウトは十時です。', 'チェックアウトはじゅうじです', 'chekkuauto wa juuji desu', 'chiekkuauto'],
  ['清水寺に行きたいです。', 'きよみずでらにいきたいです', 'kiyomizudera ni ikitai desu', 'kiyomizuderaniikitai desu'],
  ['バスはICカードで乗れますか。', 'バスはあいしーカードでのれますか', 'basu wa aishii kaado de noremasu ka', 'basu haaishiikaado'],
  ['お待たせしました。ごゆっくりどうぞ。', 'おまたせしました。ごゆっくりどうぞ', 'omatase shimashita. goyukkuri douzo', 'omataseshimashita. goyukkuridouzo'],
  ['ティッシュはありますか。', 'ティッシュはありますか', 'tisshu wa arimasu ka', ''],
  ['もう一度お願いします。', 'もういちどおねがいします', 'mou ichido onegai shimasu', 'mō ichido（長音不一致）'],
  ['救急車を呼んでください。', 'きゅうきゅうしゃをよんでください', 'kyuukyuusha o yonde kudasai', 'kyūkyū（長音不一致）'],
  ['警察を呼んでください。', 'けいさつをよんでください', 'keisatsu o yonde kudasai', ''],
  ['カードで払えますか。', 'カードではらえますか', 'kaado de haraemasu ka', 'kādo（長音不一致）'],
  ['これはいくらですか。', 'これはいくらですか', 'kore wa ikura desu ka', ''],
  ['駅へはどう行けばいいですか。', 'えきへはどういけばいいですか', 'eki e wa dou ikeba ii desu ka', 'dō（長音不一致）'],
  ['お一人様五百五十円です。', 'おひとりさまごひゃくごじゅうえんです', 'ohitorisama gohyaku gojuu en desu', ''],
  ['一緒に行きましょう。', 'いっしょにいきましょう', 'issho ni ikimashou', ''],
  ['ジェラートをください。', 'ジェラートをください', 'jeraato o kudasai', ''],
  // 引數順序 (jp, kana) 也可
  ['@swap', '', 'otona hitori desu', ''],
];

let fail = 0;
for (const [jp, kana, want, old] of CASES) {
  const got = jp === '@swap' ? P.romaji('大人一人です。', 'おとなひとりです') : P.romaji(kana, jp);
  const ok = got === want;
  if (!ok) fail++;
  if (!ok || verbose) console.log(`${ok ? 'OK ' : 'NG '} ${jp === '@swap' ? '(jp,kana) 大人一人です。' : jp}\n     → ${got}${ok ? '' : `\n     期望 ${want}`}${old ? `\n     （評審錯例：${old}）` : ''}`);
}
console.log(`\n${CASES.length - fail}/${CASES.length} 通過`);
process.exit(fail ? 1 : 0);
