// 評審 v18 P0 回歸測試（node tools/test-v18.mjs）
//   P0-3 多義詞卡第一組必須是本詞（と≠十、この≠九、ボタン≠牡丹）
//   P0-4 公有領域歌曲 15 首內建、每行有中文、斷詞幾乎沒有未收錄詞
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, localStorage: { getItem: () => null, setItem() { } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['data/mind/conj.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js', 'data/mind/grammar.js',
  'data/reading/dict-news.js', 'data/reading/dict-fill.js', 'data/reading/dict-big.js', 'data/scenes-1.js', 'data/scenes-2.js', 'data/cards.js', 'js/jp-text.js',
  'data/reading/senses.js', 'data/reading/songs-pd.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const J = ctx.JPText; J._build();
let pass = 0, fail = 0;
const ok = (name, c, info) => { if (c) pass++; else { fail++; console.log('✗ ' + name + (info ? '：' + info : '')); } };

// P0-3
const S = ctx.JP_SENSES, first = w => String(S[w] || '').split('‖')[0];
ok('と 不含 十', !/十|土耳其/.test(S['と'] || ''), S['と']);
ok('この 不含 九', !/九/.test(S['この'] || ''), S['この']);
ok('ボタン 不含 牡丹', !/牡丹/.test(S['ボタン'] || ''), S['ボタン']);
ok('何 不含低俗義', !/陰莖|生殖器/.test(S['何'] || ''));
ok('彼 不含低俗義', !/陰莖|生殖器/.test(S['彼'] || ''));
ok('側 第一組是 がわ', /^がわ：/.test(first('側')) || !S['側'], first('側'));
ok('日 第一組是 ひ', /^ひ：/.test(first('日')), first('日'));

// P0-4
const SONGS = ['赤とんぼ', 'さくらさくら', 'ちょうちょう', 'どんぐりころころ', 'シャボン玉', '浜辺の歌', '早春賦', '椰子の実', '故郷の空', '星めぐりの歌', 'かもめの水兵さん', '証城寺の狸囃子', 'あんたがたどこさ', '仰げば尊し', '蛍の光'];
let unk = 0, all = 0;
for (const t of SONGS) {
  const P = ctx.SONGS_PD[t];
  ok('內建歌曲 ' + t, !!P && P.lines.length >= 4);
  if (!P) continue;
  ok(t + ' 每行有中文', P.lines.every(l => l[0] && l[1]));
  ok(t + ' 沒有作者／出處混進歌詞', !P.lines.some(l => /作詞|作曲|底本|ISBN|年頃|補訂/.test(l[0])));
  ok(t + ' 沒有歷史假名或舊字', !P.lines.some(l => /[ゐゑ櫻彌〳〵]|ふ$|にほ[ひふ]|あふ|たふ/.test(l[0])));
  for (const [jp] of P.lines) for (const k of J.tokenize(jp)) { if (k.sym) continue; all++; if (!k.known) unk++; }
}
ok('公有領域歌曲未收錄詞 < 3%', unk / all < 0.03, `${unk}/${all}`);
const tz = (s, w) => (J.tokenize(s).find(t => t.s === w) || {}).zh || '';
ok('とまれ 不是住宿', !/住宿/.test(tz('菜の葉にとまれ', 'とまれ')) || /停/.test(tz('菜の葉にとまれ', 'とまれ')));
ok('ゆかん 不是罐頭', !/罐/.test(tz('見にゆかん', 'ゆかん')));
ok('のみ 不是喝（名のみ）', !J.tokenize('春は名のみの風の寒さや').some(t => /喝/.test(t.zh || '')));

console.log(fail ? `✗ test-v18：${pass} 通過，${fail} 失敗` : `✓ test-v18：${pass} 通過，0 失敗（公有領域歌曲未收錄 ${unk}/${all}）`);
process.exitCode = fail ? 1 : 0;
