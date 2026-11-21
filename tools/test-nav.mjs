// 導引 js/nav.js 回歸測試（離線）：node tools/test-nav.mjs
// 1) 每項有已註冊的 route 或 run；need:'pack' 的每一項在有場景的旅遊包都找得到 PathExtra 項目
// 2) 6 種身分的推薦（固定、不含今日課／路線／複習）
// 3) 40 條說法第一筆功能正確
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0, pass = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✗ ' + msg); } };

// 已註冊路由：index.html 的 r('x', …) ＋ 各 js 的 App.register('x'
const routes = new Set();
for (const m of rd('index.html').matchAll(/r\('([a-z0-9-]+)'/g)) routes.add(m[1]);
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))) for (const m of rd('js/' + f).matchAll(/App\.register\('([a-z0-9-]+)'/g)) routes.add(m[1]);

const state = { profile: {} };
const App = { state, esc: s => String(s), save() { }, profile: () => ({ lv: state.profile.lv || 'zero', goals: (state.profile.goals && state.profile.goals.length ? state.profile.goals : ['travel']).slice() }), go() { }, loadScript: () => Promise.resolve(), toast() { }, register() { } };
const ctx = { console, App };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(rd('js/classic.js'), ctx, { filename: 'classic.js' });
vm.runInContext(rd('js/nav.js'), ctx, { filename: 'nav.js' });
const N = ctx.NAV;

// 1) route / run / need
const OLD = ['trip', 'practice-map', 'scene'];
N.TOOLS.forEach(t => {
  ok(!!(t.route ? routes.has(t.route) : typeof t.run === 'function' || t.need === 'pack'), `${t.id}：route「${t.route}」未註冊且沒有 run`);
  ok(!OLD.includes(t.route), `${t.id}：不應放舊模組 ${t.route}`);
  ok(N.CATS.some(c => c[0] === t.cat), `${t.id}：類別 ${t.cat} 不存在`);
});
const ids = N.TOOLS.map(t => t.id); ok(new Set(ids).size === ids.length, 'id 重複');
N.TOOLS.filter(t => t.need === 'pack').forEach(t => {
  const have = N.packs().filter(([k]) => ctx.PathExtra.list('travel', 'tr-' + k).some(x => x.id.startsWith(t.pre)));
  ok(have.length >= 10, `${t.id}：只有 ${have.length} 個包有項目`);
});

// 2) 推薦
const rec = (lv, goals, placed = true) => { state.profile = { lv, goals, placed }; state.nav = {}; return N.forMe(4).map(t => t.id); };
const CASES = [
  ['零基礎旅客', 'zero', ['travel'], ['kana-table', 'kana-quiz', 'kana-battle', 'phrasebook']],
  ['N5 旅客', 'n5', ['travel'], ['phrasebook', 'dialog', 'menu']],
  ['N3 日檢', 'n3', ['exam'], ['gram', 'dict', 'chal']],
  ['N1 日檢', 'n1', ['exam'], ['chal', 'gram', 'kb']],
  ['N1 商務', 'n1', ['work'], ['biz', 'keigo', 'biz-read']],
  ['N4 歌曲', 'n4', ['fun'], ['songs', 'read', 'url']]
];
CASES.forEach(([n, lv, g, want]) => { const got = rec(lv, g); ok(want.every((w, i) => got[i] === w), `${n}：推薦 ${got.join(',')}，預期開頭 ${want.join(',')}`); ok(!got.some(x => ['today', 'path', 'review'].includes(x)), `${n}：推薦不該有今日課／路線／複習`); });
const multi = rec('n3', ['travel', 'exam', 'work', 'fun']); ok(multi.join() === 'phrasebook,gram,biz,songs', '多目的：' + multi.join());
const unplaced = rec('zero', ['travel'], false); ok(unplaced.join() === 'phrasebook,gram,biz,songs', '未定位＝多目的：' + unplaced.join());
// 釘選優先、上次用的放第 4 格、不依次數重排
state.profile = { lv: 'n5', goals: ['travel'], placed: true }; state.nav = {};
N.pin('songs'); let r = N.forMe(4).map(t => t.id); ok(r[0] === 'songs' && r.length === 4, '釘選優先：' + r.join());
N.note('mind3d', null); r = N.forMe(4).map(t => t.id); ok(r[3] === 'mind3d', '上次用的在第 4 格：' + r.join());
N.note('mind3d', null); N.note('mind3d', null); const r2 = N.forMe(4).map(t => t.id); ok(r2.join() === r.join(), '次數不影響排序');
N.pin('songs'); ok(!N.pinned('songs'), '再點一次取消釘選');

// 3) 搜尋：第一筆
const Q = [
  ['五十音', 'kana-table'], ['假名表', 'kana-table'], ['あいうえお', 'kana-table'], ['aiueo', 'kana-table'], ['hiragana', 'kana-table'], ['katakana', 'kana-table'],
  ['kana', 'kana-table'], ['50音', 'kana-table'], ['五十音图', 'kana-table'], ['點菜', 'dialog'], ['點餐', 'dialog'], ['拉麵', 'menu'], ['救命', 'emer'], ['警察', 'emer'],
  ['醫院', 'emer'], ['翻唱', 'songs'], ['cover', 'songs'], ['歌詞', 'songs'], ['卡拉OK', 'songs'], ['YouTube', 'songs'], ['JLPT', 'ex-path'], ['N2', 'ex-path'],
  ['模擬考', 'chal'], ['文法', 'gram'], ['语法', 'gram'], ['單字', 'dict'], ['敬語', 'keigo'], ['email', 'biz'], ['開會', 'biz'], ['字太小', 'settings'], ['字太大', 'settings'],
  ['深色', 'settings'], ['夜間', 'settings'], ['備份', 'backup'], ['換手機', 'backup'], ['心智圖', 'mind3d'], ['3D', 'mind3d'], ['網址', 'url'], ['新聞', 'news'],
  ['複習', 'review'], ['忘記了', 'review'], ['我想看五十音表', 'kana-table'], ['御朱印', 'goshuin'], ['特訓', 'boot']
];
Q.forEach(([q, want]) => { const s = N.search(q), first = (s.top[0] || s.more[0] || {}).id; ok(first === want, `搜「${q}」第一筆 ${first}，預期 ${want}`); });
ok(N.search('Lemon').top.length === 0, '「Lemon」不該有置頂功能（歌名先出）');

console.log(fail ? `✗ test-nav：${pass} 通過，${fail} 失敗` : `✓ test-nav：${pass} 通過，0 失敗（搜尋 ${Q.length} 條）`);
process.exit(fail ? 1 : 0);
