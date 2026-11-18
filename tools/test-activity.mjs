// 活動框架測試：node tools/test-activity.mjs（-v 顯示細節）
// node＋vm 載入 js/learn.js、js/phrase.js、js/activity.js、js/activities/*.js（簡易 DOM stub）
// 測：choice 干擾項唯一（不同義、同型別同等級）、wordbank 多種詞序判定、runner 結果格式與 Learn.record
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('-v');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✗ ' + msg); } };

/* ---- 簡易 DOM ---- */
class El {
  constructor(tag) { this.tagName = tag || 'div'; this.kids = {}; this._html = ''; this.style = {}; this.dataset = {}; this.attrs = {}; this.className = ''; this.textContent = ''; this.disabled = false; this.isConnected = true; this.nodeType = 1; this.classList = { add() { }, remove() { }, toggle() { }, contains() { return false; } }; }
  set innerHTML(h) { this._html = String(h); this.kids = {}; }
  get innerHTML() { return this._html; }
  get firstElementChild() { return this.kids.__first || (this.kids.__first = new El()); }
  querySelector(s) { return this.kids[s] || (this.kids[s] = new El()); }
  querySelectorAll() { return []; }
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(c) { return c; }
  remove() { }
  focus() { }
}
const document = {
  createElement: t => new El(t), head: new El('head'), body: new El('body'),
  getElementById: () => new El(), querySelector: () => null, querySelectorAll: () => [],
  dispatchEvent() { }, addEventListener() { }
};
const routes = {}, xp = [], rewards = [];
const state = { learn: {}, xp: 0, cleared: {} };
const App = {
  state, esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  register: (n, d) => { routes[n] = d; }, save() { }, onChange() { }, onMigrate() { },
  loadScript: src => { if (/world|loan|challenge|jp-text/.test(src)) return Promise.resolve(); try { load(src); } catch (e) { return Promise.reject(e); } return Promise.resolve(); },
  profile: () => ({ lv: 'n5', goals: ['travel'] }), addXP: (n, r) => { xp.push([n, r]); return { gained: n }; },
  reward: (id, s, r) => { rewards.push([id, s, r]); return { gained: 15 }; }, streakInfo: () => ({ days: 2 }),
  speak() { }, voiceOK: () => false, voiceHTML: () => '', modal() { }, toast() { }, go() { }, back() { },
  shuffle: a => a.slice(), today: () => '2026-11-19'
};
const ctx = { console, App, document, setTimeout: () => 0, clearTimeout() { }, localStorage: { getItem: () => null, setItem() { } }, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } } };
ctx.window = ctx; vm.createContext(ctx);
const loaded = new Set();
function load(rel) { if (loaded.has(rel)) return; loaded.add(rel); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }
['js/learn.js', 'js/phrase.js', 'kana-data.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/grammar.js', 'data/scenes-1.js', 'data/scenes-2.js',
  'js/activity.js', 'js/activities/choice.js', 'js/activities/wordbank.js', 'js/activities/listen.js', 'js/activities/flashcard.js'].forEach(load);
const { Activity, MIND, Learn } = ctx;
const C = Activity.get('choice'), W = Activity.get('wordbank'), Ls = Activity.get('listen');

ok(['flashcard', 'choice', 'wordbank', 'listen', 'shop'].every(t => Activity.get(t)), '5 種活動都已註冊：' + Activity.types().join(','));
ok(routes.act && routes.act.nav === false && routes.act.navParent === 'path', '路由 act nav:false navParent:path');

/* ---- choice：干擾項 ---- */
const lexItems = lv => MIND.lex[lv].filter(r => r[0] && r[2]).map(r => Activity.item({ jp: Learn.jp0(r[0]), kana: String(r[1] || '').split(/;\s*/)[0] || r[0], zh: r[2], lv, pos: r[3] }, 'vocab')).map((it, i) => Object.assign(it, { pos: MIND.lex[lv][i] && MIND.lex[lv][i][3] }));
const N5 = lexItems('N5'), N4 = lexItems('N4');
const pool = N5.concat(N4);
let bad = 0, n = 0, short = 0;
for (const mode of ['jp2zh', 'zh2jp', 'listen']) for (let i = 0; i < 300; i++) {
  const it = N5[Math.floor(Math.random() * N5.length)];
  const q = C.question(it, mode, pool);
  if (!q) { short++; continue; }
  n++;
  const set = new Set(q.opts);
  const errs = [];
  if (set.size !== q.opts.length) errs.push('選項重複');
  if (q.opts[q.ansI] !== q.ans) errs.push('正解索引錯');
  if (q.opts.length < 3) errs.push('選項不足');
  const dis = q.opts.filter(o => o !== q.ans);
  if (mode === 'jp2zh') dis.forEach(d => { if (C.zhClash(d, q.ans)) errs.push('中文同義：' + d + '≈' + q.ans); });
  else dis.forEach(d => { if (d.includes(q.ans) || q.ans.includes(d)) errs.push('日文包含：' + d + '/' + q.ans); });
  // 同等級：干擾項都來自 N5
  dis.forEach(d => { const src = pool.find(x => (mode === 'jp2zh' ? x.zh : x.jp) === d); if (src && src.lv !== 'N5' && !N5.some(x => (mode === 'jp2zh' ? x.zh : x.jp) === d)) errs.push('等級不同：' + d); });
  if (errs.length) { bad++; if (verbose || bad <= 5) console.log('  ', mode, it.jp, errs.join('；')); }
}
ok(bad === 0, `choice 單字干擾項唯一（${n} 題，${bad} 題有問題）`);
ok(short < 20, `choice 干擾項不足的題數少（${short}）`);

// 文法形式題
const G5 = MIND.gram.filter(g => g.lv === 'N5').map(g => Activity.item({ id: g.id, jp: g.pat, zh: g.zh, lv: g.lv, ex: g.ex }, 'grammar'));
let gq = 0, gbad = 0;
G5.forEach(it => {
  if (!C.formable(it)) return;
  const q = C.question(it, 'form', G5); if (!q) return; gq++;
  const f = C.formable(it), dis = q.opts.filter(o => o !== q.ans);
  if (new Set(q.opts).size !== q.opts.length || dis.some(d => d.includes(q.ans) || q.ans.includes(d)) || dis.some(d => f.s.replace(f.p, d) === f.s)) { gbad++; if (verbose) console.log('  form', it.jp, q.opts); }
});
ok(gq > 10 && gbad === 0, `choice 文法形式題干擾項唯一（${gq} 題，${gbad} 題有問題）`);

// 假名題：同型別
const KANA = vm.runInContext('KANA', ctx);
const KI = KANA.slice(0, 46).map(k => Activity.item({ jp: k[0], kana: k[0], romaji: k[2], zh: '' }, 'kana'));
let kbad = 0;
KI.forEach(it => { const q = C.question(it, 'kana', KI.concat(N5)); if (!q || new Set(q.opts).size !== q.opts.length || q.opts.some(o => /[^a-z ()]/.test(o)) || new Set(q.opts.map(o => o.split(' ')[0])).size !== q.opts.length) kbad++; });
ok(kbad === 0, `choice 假名題選項都是羅馬字且不重複（${kbad} 題有問題）`);

// 同義詞手動案例
const syn = [
  { id: 'v:大きい', type: 'vocab', jp: '大きい', kana: 'おおきい', zh: '大的', lv: 'N5' },
  { id: 'v:大きな', type: 'vocab', jp: '大きな', kana: 'おおきな', zh: '大的；巨大的', lv: 'N5' },
  { id: 'v:でかい', type: 'vocab', jp: 'でかい', kana: 'でかい', zh: '大', lv: 'N5' },
  { id: 'v:小さい', type: 'vocab', jp: '小さい', kana: 'ちいさい', zh: '小的', lv: 'N5' },
  { id: 'v:高い', type: 'vocab', jp: '高い', kana: 'たかい', zh: '高的；貴的', lv: 'N5' },
  { id: 'v:安い', type: 'vocab', jp: '安い', kana: 'やすい', zh: '便宜的', lv: 'N5' },
  { id: 'p:すみません', type: 'phrase', jp: 'すみません', kana: 'すみません', zh: '不好意思', lv: 'N5' }
];
for (let i = 0; i < 50; i++) { const d = C.distractors(syn[0], 'jp2zh', syn, 3); ok(!d.includes('大的；巨大的') && !d.includes('不好意思') && new Set(d).size === d.length, '同義詞／不同型別不得當干擾：' + d.join('、')); if (fail) break; }

/* ---- wordbank：詞序 ---- */
const s1 = ['明日、', '東京で', '友達に', '会います'];
const acc = W.orders(s1);
ok(W.judge(['明日、', '東京で', '友達に', '会います'], acc), 'wordbank 原句正確');
ok(W.judge(['明日、', '友達に', '東京で', '会います'], acc), 'wordbank 助詞塊互換也算對');
ok(!W.judge(['東京で', '明日、', '友達に', '会います'], acc), 'wordbank 「明日、」移位不算對');
ok(!W.judge(['会います', '明日、', '東京で', '友達に'], acc), 'wordbank 述語不在句尾不算對');
const s2 = W.chunks('すみません、駅までの道を教えてください。');
ok(s2.length >= 3 && s2.join('') === 'すみません、駅までの道を教えてください', 'wordbank 分詞還原原句：' + s2.join('｜'));
const acc2 = W.orders(['水を', '二つ', 'ください'], [['二つ', '水を', 'ください']]);
ok(W.judge(['二つ', '水を', 'ください'], acc2) && W.judge(['水を', '二つ', 'ください'], acc2), 'wordbank 接受 item.accept 的詞序');
ok(W.chunks('あいうえおかきくけこさしすせそたちつてと、なにぬねの、はひふへほ、まみむめも、やゆよ、らりるれろ、わをん、がぎぐげご、ざじずぜぞ', 6).length <= 6, 'wordbank 詞塊上限 6');

/* ---- listen：數字題 ---- */
let nbad = 0;
for (let i = 0; i < 200; i++) { const q = Ls.numQ(i % 2 ? 'time' : 'price'); if (new Set(q.opts).size !== 4 || !q.opts.includes(q.ans) || !/^num:(price|time):/.test(q.id)) nbad++; }
ok(nbad === 0, `listen 數字題 4 個不重複選項（${nbad} 題有問題）`);

/* ---- runner：結果格式 ---- */
const S = Activity.summarize([{ id: 'v:a', grade: 0 }, { id: 'v:b', grade: 2 }, { id: 'v:a', grade: 1 }, { id: 'v:c', grade: 3 }], { 'v:a': { id: 'v:a', jp: 'a' } });
ok(S.total === 3 && S.correct === 2 && S.learned === 3 && S.rate === 67 && S.wrong.length === 1 && S.stars === 1, 'summarize 計算：' + JSON.stringify({ t: S.total, c: S.correct, l: S.learned, r: S.rate, s: S.stars }));
ok(S.results.every(r => typeof r.id === 'string' && Number.isInteger(r.grade) && r.type), 'summarize results 格式 {id, grade, type}');

Activity.register('fake', {
  start(el, c) {
    c.mark(c.items[0], 2); c.mark(c.items[1], 0);
    return Promise.resolve({ results: c.results.concat([{ id: c.items[2].id, grade: 3 }]) });
  }
});
const items = [{ jp: '水', kana: 'みず', zh: '水', type: 'vocab' }, { jp: 'お茶', kana: 'おちゃ', zh: '茶', type: 'vocab' }, { jp: 'すみません', zh: '不好意思', type: 'phrase' }];
const el = new El();
const sum = await Activity.run(el, { type: 'fake', items, title: '測試活動' });
ok(sum && Array.isArray(sum.results) && sum.results.length === 3, 'run 回傳 3 筆 results（' + (sum && sum.results.length) + '）');
ok(['title', 'results', 'total', 'correct', 'rate', 'learned', 'wrong', 'due', 'streak', 'xp', 'stars', 'quit', 'meta'].every(k => k in sum), 'summary 欄位齊全：' + Object.keys(sum).join(','));
ok(sum.total === 3 && sum.correct === 2 && sum.quit === false && sum.streak === 2, 'summary 數值');
ok(state.learn['v:水'] && state.learn['v:水'].src === '測試活動' && state.learn['v:お茶'].lapses === 1 && state.learn['p:すみません'] && state.learn['p:すみません'].g === 3, 'runner 呼叫 Learn.record（src＝title，回傳的 results 也記錄、不重複）');
ok(state.learn['v:水'].reps === 1, 'mark 過的不會重複記錄');
ok(xp.length === 1 && xp[0][0] === 3 + 2 * 2, '結算給 XP（3＋答對×2）：' + JSON.stringify(xp));

// session：兩步只結算一次、用 reward
xp.length = 0;
const s2sum = await Activity.session(new El(), [{ type: 'fake', items }, { type: 'fake', items: items.slice().reverse() }, { type: 'no_such', items }], { title: '單元', reward: 'path:test' });
ok(s2sum.results.length === 6 && xp.length === 0 && rewards.length === 1 && rewards[0][0] === 'path:test', 'session 兩步合併、只結算一次（reward）');
// shop 不存在 World.shopSim → 跳過
const s3 = await Activity.session(new El(), [{ type: 'shop', params: { shop: 'x' } }], { title: 'shop' });
ok(s3.total === 0, 'shop：World.shopSim 不存在時跳過');
// World.shopSim 存在 → 結果由 runner 記錄
ctx.World = { shopSim: (e, o) => Promise.resolve({ results: [{ id: 'p:' + 'これください', grade: 2, item: { jp: 'これください', kana: 'これください', zh: '請給我這個', source: '🏪 便利商店' } }], meta: { done: true } }) };
const s4 = await Activity.session(new El(), [{ type: 'shop', params: { shop: 'x' } }], { title: 'shop2' });
ok(s4.total === 1 && state.learn['p:これください'] && state.learn['p:これください'].src === 'shop2' && state.learn['p:これください'].m && state.learn['p:これください'].m.zh === '請給我這個', 'shop：item 傳給 Learn.record、World.shopSim 結果交給 runner 記錄');

// ids → items
const its = await Activity.items(['v:会う', 'kana:あ', 'g:' + MIND.gram.find(g => g.lv === 'N5').id.replace(/^gram:/, '')], { lv: 'N5' });
ok(its.length === 3 && its.every(x => x.id && x.jp && x.type), 'ids 解析成 item：' + its.map(x => x.type + ':' + x.jp + '/' + x.zh).join('、'));

console.log(`${fail ? '✗' : '✓'} test-activity：${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
