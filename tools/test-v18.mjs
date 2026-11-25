// 評審 v18 P0 回歸測試（node tools/test-v18.mjs）
//   P0-3 多義詞卡第一組必須是本詞（と≠十、この≠九、ボタン≠牡丹）
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
  'data/reading/senses.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
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

const tz = (s, w) => (J.tokenize(s).find(t => t.s === w) || {}).zh || '';
ok('とまれ 不是住宿', !/住宿/.test(tz('菜の葉にとまれ', 'とまれ')) || /停/.test(tz('菜の葉にとまれ', 'とまれ')));
ok('ゆかん 不是罐頭', !/罐/.test(tz('見にゆかん', 'ゆかん')));
ok('のみ 不是喝（名のみ）', !J.tokenize('春は名のみの風の寒さや').some(t => /喝/.test(t.zh || '')));

// 使用者回報：歌詞裡的基本字顯示「字典沒有這個詞」
const known = (s, w) => { const t = J.tokenize(s).find(x => x.s === w); return !!t && t.known && !!t.zh; };
ok('コレ（片假名寫法）查得到', known('マジで？コレおま全部生身で？', 'コレ'));
ok('マジ 查得到', known('マジで？コレおま全部生身で？', 'マジ'));
ok('ダントツ、ピカイチ 查得到', known('あきらかにダントツでピカイチ', 'ダントツ') && known('あきらかにダントツでピカイチ', 'ピカイチ'));
ok('認めねー＝ない、ゼッテー＝絶対', /ない/.test(tz('バグでまぐれ認めねーゼッテー', 'ねー')) && /絕對/.test(tz('バグでまぐれ認めねーゼッテー', 'ゼッテー')));

console.log(fail ? `✗ test-v18：${pass} 通過，${fail} 失敗` : `✓ test-v18：${pass} 通過，0 失敗`);
process.exitCode = fail ? 1 : 0;
