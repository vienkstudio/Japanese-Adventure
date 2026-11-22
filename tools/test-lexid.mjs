// 詞庫欄位清理與學習 id（評審 v15 P0）：node tools/test-lexid.mjs
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, setTimeout: () => 0, clearTimeout() { }, document: { addEventListener() { }, dispatchEvent() { } }, CustomEvent: class { }, localStorage: { getItem: () => null, setItem() { } } }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
ctx.App = { state: {}, save() { }, onChange() { }, today: () => '2026-11-22', profile: () => ({ lv: 'n5', goals: ['travel'] }) };
['data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js', 'js/learn.js'].forEach(f => load(f));
const L = ctx.Learn, M = ctx.MIND;
let f = 0; const ok = (c, m) => { if (!c) { f++; console.log('✗ ' + m); } };
// 1) 畫面不可出現原始格式
let bad = [];
for (const lv of ['N5', 'N4', 'N3', 'N2', 'N1']) M.lex[lv].forEach(r => { const x = L.lexForm(r); if (/[;；,，、|()（）]/.test(x.jp + x.kana) || /\s/.test(x.kana) || /[一-龯]/.test(x.kana)) bad.push(lv + ' ' + r[0] + ' / ' + r[1] + ' → ' + x.jp + ' / ' + x.kana); });
ok(!bad.length, '清理後仍有原始格式 ' + bad.length + ' 筆：' + bad.slice(0, 5).join('｜'));
const F = (jp, kana) => L.lexForm([jp, kana]);
ok(F('足; 脚', 'あし').jp === '足', '足; 脚'); ok(F('回る、回す', 'まわる、まわす').jp === '回る', '回る、回す');
ok(F('(花を〜) 生ける, 活ける', 'いける').jp === '生ける', '生ける'); ok(F('結婚', 'けっこん (する)').kana === 'けっこん', 'けっこん (する)');
ok(F('行く', 'いく; ゆく').kana === 'いく', 'いく; ゆく'); ok(F('頂く', 'いただく|頂く').kana === 'いただく', 'いただく|頂く');
// 2) 同形異讀分開
const ids = new Map(); let coll = 0;
for (const lv of ['N5', 'N4', 'N3', 'N2', 'N1']) M.lex[lv].forEach(r => { const x = L.lexForm(r), id = L.rowId(r), k = x.jp + '|' + x.kana.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); if (ids.has(id) && ids.get(id) !== k) coll++; else ids.set(id, k); });
ok(coll === 0, '不同讀音仍共用 id：' + coll + ' 組');
const pairs = [['開く', 'あく', 'ひらく'], ['辛い', 'からい', 'つらい'], ['一日', 'いちにち', 'ついたち']];
pairs.forEach(([j, a, b]) => ok(L.vid(j, a) !== L.vid(j, b), j + '：' + L.vid(j, a) + ' vs ' + L.vid(j, b)));
ok(L.vid('開く', 'あく') === 'v:開く', '最低等級讀音沿用舊 id：' + L.vid('開く', 'あく'));
ok(L.vid('食べる', 'たべる') === 'v:食べる', '唯一讀音沿用舊 id');
ok(L.idOf({ jp: '開く', kana: 'ひらく' }) === 'v:開く|ひらく', 'idOf 物件帶讀音');
ok(/^w:N\d:\d+$/.test(L.kbIdOf('v:開く|ひらく') || ''), 'kbIdOf 找得到 ひらく 那筆：' + L.kbIdOf('v:開く|ひらく'));
console.log(f ? `✗ test-lexid：${f} 項失敗` : `✓ test-lexid：全部通過（${ids.size} 個詞 id）`);
process.exit(f ? 1 : 0);
