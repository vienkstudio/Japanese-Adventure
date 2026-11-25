// 導引 js/nav.js 回歸測試（離線）：node tools/test-nav.mjs
// 1) 每項（含子入口）有已註冊的 route 或 run；need:'pack' 的每一項在有場景的旅遊包都找得到 PathExtra 項目
// 2) 分類（docs/詞庫與分類/01-工具分類.md 第 3 節）：側邊樹＝底部 4 鈕；每個工具只在一個地方；名稱、圖示全站唯一；路由標題＝工具名稱
// 3) 6 種身分的推薦（固定、不含今日課）
// 4) 說法第一筆功能正確（學習分頁、工具、子入口）
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
const ctx = { console, App, document: { addEventListener() { }, getElementById: () => null, querySelector: () => null }, matchMedia: () => ({ matches: false, addEventListener() { } }) };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(rd('js/classic.js'), ctx, { filename: 'classic.js' });
vm.runInContext(rd('js/nav.js'), ctx, { filename: 'nav.js' });
const N = ctx.NAV;

// 1) route / run / need
const OLD = ['trip', 'practice-map', 'scene'];
const subs = N.TOOLS.flatMap(t => (t.sub || []).map((x, i) => N.byId(t.id + '~' + i)));
N.TOOLS.concat(N.PLACES, subs).forEach(t => {
  ok(!!(t.route ? routes.has(t.route) : typeof t.run === 'function' || t.need === 'pack'), `${t.id}：route「${t.route}」未註冊且沒有 run`);
  ok(!OLD.includes(t.route), `${t.id}：不應放舊模組 ${t.route}`);
  ok(N.CATS.some(c => c[0] === t.cat), `${t.id}：類別 ${t.cat} 不存在`);
});
const ids = N.TOOLS.map(t => t.id); ok(new Set(ids).size === ids.length, 'id 重複');
N.TOOLS.filter(t => t.need === 'pack').forEach(t => {
  const have = N.packs().filter(([k]) => ctx.PathExtra.list('travel', 'tr-' + k).some(x => [].concat(t.pre).some(p => x.id.startsWith(p))));
  ok(have.length >= 10, `${t.id}：只有 ${have.length} 個包有項目`);
});

// 2) 分類
ok(N.SECTIONS.map(x => x.id).join() === 'home,learn,lookup,me', '側邊樹應＝底部 4 鈕：' + N.SECTIONS.map(x => x.id).join());
ok(N.TOOLS.length <= 16, `工具應 ≤16 個，現在 ${N.TOOLS.length}`);
const homes = {};
N.SECTIONS.forEach(sec => (sec.tools || []).concat(...(sec.goals || []).map(g => g.tools)).forEach(id => { homes[id] = (homes[id] || 0) + 1; }));
N.TOOLS.forEach(t => ok(homes[t.id] === 1, `${t.id}：側邊樹裡出現 ${homes[t.id] || 0} 次（應剛好 1 次）`));
const names = N.TOOLS.concat(N.PLACES).map(t => t.name), icons = N.TOOLS.concat(N.PLACES).map(t => t.icon);
ok(new Set(names).size === names.length, '名稱重複：' + names.filter((x, i) => names.indexOf(x) !== i).join());
ok(new Set(icons).size === icons.length, '圖示重複：' + icons.filter((x, i) => icons.indexOf(x) !== i).join());
// 路由標題＝工具名稱（index.html 的 r(路由, 標題, 圖示) 與 App.register 的 title）
const titles = {};
for (const m of rd('index.html').matchAll(/r\('([a-z0-9-]+)', '([^']+)', '([^']+)'/g)) titles[m[1]] = [m[2], m[3]];
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))) for (const m of rd('js/' + f).matchAll(/App\.register\('([a-z0-9-]+)', \{\s*title: '([^']+)', icon: '([^']+)'/g)) { if (titles[m[1]] && titles[m[1]].join() !== [m[2], m[3]].join()) ok(false, `${m[1]}：index.html「${titles[m[1]].join(' ')}」與 ${f}「${m[2]} ${m[3]}」不一致`); titles[m[1]] = titles[m[1]] || [m[2], m[3]]; }
N.TOOLS.filter(t => t.route && !/^(lookup|path|me|home)$/.test(t.route)).forEach(t => { const r = titles[t.route]; if (r) ok(r[0] === t.name && r[1] === t.icon, `${t.id}：路由 ${t.route} 標題「${r.join(' ')}」≠ 工具「${t.name} ${t.icon}」`); });
// 舊 id（釘選、上次用的）仍找得到
['kana-drill', 'kana-table', 'emer', 'gram', 'keigo', 'kb', 'mind3d', 'news', 'url', 'menu', 'event', 'speak', 'review', 'biz', 'biz-read'].forEach(id => ok(!!N.byId(id), `舊 id ${id} 找不到`));
// 位置：每個工具的路由都定位到它所在的分類
N.SECTIONS.forEach(sec => [[sec, null, sec.tools || []]].concat((sec.goals || []).map(g => [sec, g, g.tools])).forEach(([s0, g, list]) => list.forEach(id => {
  const t = N.byId(id); if (!t.route || /^(lookup|me|home)$/.test(t.route)) return;
  const L = N.locate(t.route, t.params || {}); ok(L && L.sec === s0 && (!g || L.goal === g), `${id}：路由 ${t.route} 定位到 ${L && L.sec && L.sec.id}/${L && L.goal && L.goal.id}，應在 ${s0.id}/${g ? g.id : ''}`);
})));

// 3) 推薦
const rec = (lv, goals, placed = true) => { state.profile = { lv, goals, placed }; state.nav = {}; return N.forMe(4).map(t => t.id); };
const CASES = [
  ['零基礎旅客', 'zero', ['travel'], ['kana-guide', 'kana-test', 'cards', 'phrasebook']],
  ['N5 旅客', 'n5', ['travel'], ['phrasebook', 'dialog', 'task']],
  ['N3 日檢', 'n3', ['exam'], ['dict~1', 'cards', 'chal']],
  ['N1 日檢', 'n1', ['exam'], ['chal', 'dict~1', 'read']],
  ['N1 商務', 'n1', ['work'], ['dict~2', 'read~2', 'work']],
  ['N4 歌曲', 'n4', ['fun'], ['songs', 'read', 'read~1']]
];
CASES.forEach(([n, lv, g, want]) => { const got = rec(lv, g); ok(want.every((w, i) => got[i] === w), `${n}：推薦 ${got.join(',')}，預期開頭 ${want.join(',')}`); ok(!got.some(x => ['today', 'today~0'].includes(x)), `${n}：推薦不該有今日課／路線／複習`); });
const multi = rec('n3', ['travel', 'exam', 'work', 'fun']); ok(multi.join() === 'phrasebook,dict~1,dict~2,songs', '多目的：' + multi.join());
const unplaced = rec('zero', ['travel'], false); ok(unplaced.join() === 'phrasebook,dict~1,dict~2,songs', '未定位＝多目的：' + unplaced.join());
// 釘選優先、上次用的放第 4 格、不依次數重排
state.profile = { lv: 'n5', goals: ['travel'], placed: true }; state.nav = {};
N.pin('songs'); let r = N.forMe(4).map(t => t.id); ok(r[0] === 'songs' && r.length === 4, '釘選優先：' + r.join());
N.note('dict~3', null); r = N.forMe(4).map(t => t.id); ok(r[3] === 'dict~3', '上次用的在第 4 格：' + r.join());
N.note('dict~3', null); N.note('dict~3', null); const r2 = N.forMe(4).map(t => t.id); ok(r2.join() === r.join(), '次數不影響排序');
N.pin('songs'); ok(!N.pinned('songs'), '再點一次取消釘選');

// 4) 搜尋：第一筆
const Q = [
  ['五十音', 'kana'], ['假名表', 'kana'], ['あいうえお', 'kana'], ['aiueo', 'kana'], ['hiragana', 'kana'], ['katakana', 'kana'],
  ['kana', 'kana'], ['50音', 'kana'], ['五十音图', 'kana'], ['點菜', 'dialog'], ['點餐', 'dialog'], ['口說', 'dialog'], ['拉麵', 'task'], ['狀況題', 'task'], ['救命', 'phrasebook~0'], ['警察', 'phrasebook~0'],
  ['醫院', 'phrasebook~0'], ['翻唱', 'songs'], ['cover', 'songs'], ['歌詞', 'songs'], ['卡拉OK', 'songs'], ['YouTube', 'songs'], ['JLPT', 'exam'], ['N2', 'exam'],
  ['模擬考', 'chal'], ['文法', 'dict~1'], ['语法', 'dict~1'], ['單字', 'dict~0'], ['字典', 'dict~0'], ['敬語', 'dict~2'], ['email', 'work'], ['開會', 'work'], ['字太小', 'settings'], ['字太大', 'settings'],
  ['深色', 'settings'], ['夜間', 'settings'], ['備份', 'backup'], ['換手機', 'backup'], ['心智圖', 'dict~3'], ['3D', 'dict~3'], ['網址', 'read~1'], ['新聞', 'read~0'],
  ['複習', 'today~0'], ['忘記了', 'today~0'], ['我想看五十音表', 'kana'], ['御朱印', 'goshuin'], ['特訓', 'boot'], ['講義', 'kana-guide'], ['零基礎', 'kana-guide'], ['訓練表', 'kana-guide~0'], ['書寫', 'kana-guide~0'], ['列印', 'kana-guide~0'],
  ['小考', 'kana-test'], ['戰鬥', 'kana-test~0'], ['字卡', 'cards'], ['冒險', 'play'], ['商務閱讀', 'read~2']
];
Q.forEach(([q, want]) => { const s = N.search(q), first = (s.top[0] || s.more[0] || {}).id; ok(first === want, `搜「${q}」第一筆 ${first}，預期 ${want}`); });
ok(N.search('Lemon').top.length === 0, '「Lemon」不該有置頂功能（歌名先出）');

console.log(fail ? `✗ test-nav：${pass} 通過，${fail} 失敗` : `✓ test-nav：${pass} 通過，0 失敗（搜尋 ${Q.length} 條）`);
process.exit(fail ? 1 : 0);
