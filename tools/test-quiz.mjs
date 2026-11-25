// 出題回歸測試：node tools/test-quiz.mjs（-v 列出細節）
// 掃 N5–N1 全部路線單元小考（同 path.js 的參數：ids＋avoid 字卡例句）與挑戰題（文法、單字、模擬考），檢查：
//   1. 挖空落在詞中間（JPText 斷詞後，挖空範圍切開名詞等詞，例：おみや（　）、きょ（　）は）＝0
//      ※ 文法自己的例句（為該句型撰寫）只算「複合詞以外」的切開（使い方、泥だらけ 這種 詞幹＋句型 不算）
//   2. 語意題正解是中文同形（原則＝原則）＝0
//   3. 有文法的單元，小考至少 1 題考本課文法
//   4. Challenge.problems 檢出的問題＝0
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = process.argv.includes('-v');
const routes = {};
const state = { learn: {}, xp: 0, cleared: {}, chal: {} };
const loaded = new Set();
function load(rel) { if (loaded.has(rel)) return; loaded.add(rel); vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }
const App = {
  state, esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  register: (n, d) => { routes[n] = d; }, save() { }, onChange() { }, onMigrate() { },
  loadScript: src => { try { if (fs.existsSync(path.join(ROOT, src))) load(src); } catch (e) { return Promise.reject(e); } return Promise.resolve(); },
  profile: () => ({ lv: 'n3', goals: ['exam'] }), stars: () => 0, shuffle: a => a.slice(), today: () => '2026-11-21', reward: () => ({ gained: 0 })
};
const ctx = { console, App, setTimeout: (f) => { f(); return 0; }, clearTimeout() { }, localStorage: { getItem: () => null, setItem() { } }, document: { addEventListener() { }, dispatchEvent() { } }, CustomEvent: class { } };
ctx.window = ctx; vm.createContext(ctx);
['js/learn.js', 'data/mind/conj.js', 'data/mind/grammar.js', 'data/mind/lex-n5.js', 'data/mind/lex-n4.js', 'data/mind/lex-n3.js', 'data/mind/lex-n2.js', 'data/mind/lex-n1.js', 'data/reading/daily.js', 'js/jp-text.js', 'js/challenge.js', 'js/path.js'].forEach(load);
const { Path, Challenge, MIND } = ctx;

const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const OWN = new Map(MIND.gram.map(g => [g.id, g.ex && g.ex[0]]));
let total = 0, mid = [], same = [], prob = [], noGram = [], leak = [];
function check(q, L, where) {
  total++;
  const p = Challenge.problems(q, L); if (p.length) prob.push([where, L, q.k, p.join('；')]);
  if (q.k === 'mean' && q.item && Challenge.sameForm({ jp: q.item.jp, zh: q.opts[q.ans] })) same.push([where, q.item.jp, q.opts[q.ans]]);
  if (q.k === 'ctx') { const z = (String(q.body).match(/<p class="muted center">([\s\S]*?)<\/p>/) || [])[1]; const ans = q.opts[q.ans]; if (z && [...ans].some(c => /[㐀-鿿々]/.test(c) && unesc(z).includes(c))) leak.push([where, L, ans, unesc(z)]); }
  if (q.k !== 'form' && q.k !== 'ctx') return;
  const m = String(q.body).match(/class="ch-sent jp">([\s\S]*?)<span class="ch-blank">[^<]*<\/span>([\s\S]*?)<\/div>/); if (!m) return;
  const pre = unesc(m[1]), post = unesc(m[2]), ans = q.opts[q.ans], s = pre + ans + post, a = pre.length, b = a + ans.length;
  const own = q.k === 'form' && q.item && OWN.get(q.item.id) === s;
  for (const t of ctx.JPText.tokenize(s)) {
    const e = t.i + t.s.length;
    if (!/^(n|pron|adv|num|name|unk|user)$/.test(t.pos) && !(!own && /^(conj|int|exp)$/.test(t.pos))) continue;
    if (!((t.i < a && a < e) || (t.i < b && b < e))) continue;
    if (own && (e === b && t.s.endsWith(ans) || t.pos === 'n' && t.s.length <= 2)) continue;   // 原句：詞幹＋句型的複合詞、2 字誤切
    mid.push([where, L, q.k, pre + '（' + ans + '）' + post, t.s]); break;
  }
}
const LV = ['N5', 'N4', 'N3', 'N2', 'N1'];
let units = 0;
for (const L of LV) {
  await Path.load('exam', { lv: L });
  const list = Path.units('exam', { lv: L }).filter(u => !u.route);
  for (const r of list) {
    const u = Path.unit(r.id); if (!u) continue; units++;
    const st = u.steps.find(s => s.type === 'choice'), p = st.params;
    const qs = Challenge.makeQuestions(p.lv, p.kind, p.n, { ids: p.ids, avoid: p.avoid });
    qs.forEach(q => check(q, L, u.id));
    const gIds = u.items.filter(x => x.type === 'grammar').map(x => x.id);
    if (gIds.length && !qs.some(q => q.id && gIds.includes(q.id))) noGram.push(u.id);
  }
  for (let i = 0; i < 40; i++) for (const t of ['grammar', 'vocab', 'mock']) Challenge.makeRound(L, t).forEach(q => check(q, L, 'chal:' + t));
  // 挑戰題：字卡例句都避開時的替代例句（每個文法都試一次）
  const B = Challenge.bank(L);
  const allEx = MIND.gram.filter(g => g.ex && g.ex[0]).map(g => g.ex[0]);
  for (const x of B.gform) { const qs = Challenge.makeQuestions(L, ['form'], 1, { ids: ['g:' + String(x.g.id).replace(/^gram:/, '')], avoid: [x.ex[0]] }); qs.forEach(q => check(q, L, 'alt:' + x.g.pat)); }
  void allEx;
}
const show = (name, a) => { console.log((a.length ? '✗ ' : '✓ ') + name + '：' + a.length); if (a.length && (V || a.length <= 20)) a.slice(0, V ? 1e9 : 20).forEach(x => console.log('   ', x.join(' ｜ '))); };
console.log(`單元 ${units} 個，題目 ${total} 題`);
show('挖空落在詞中間', mid);
show('語意題中文同形送分', same);
show('有文法的單元小考沒考文法', noGram);
show('Challenge.problems', prob);
// 評審 v17／v18：讀音干擾項不得是念不出來的假字（かんっしょう、せっぢ）
const fakeKana = [];
const KOK = x => !/^[っゃゅょーん]|っ$/.test(x) && !/っ(?![かきくけこさしすせそたちつてとぱぴぷぺぽ])/.test(x) && !/[んっー]っ/.test(x) && !/(^|[^きしちにひみりぎじぢびぴ])[ゃゅょ]/.test(x);
for (const L of ['N5', 'N4', 'N3', 'N2', 'N1']) for (const r of (MIND.lex[L] || [])) { const k = String(r[1] || ''); if (!/^[ぁ-ゖー]{2,}$/.test(k)) continue; for (const m of Challenge.mutate(k)) if (!KOK(m) || (/[ぢづ]/.test(m) && !/[ぢづ]/.test(k))) fakeKana.push([L, r[0], k, m]); }
show('讀音干擾項是假字', fakeKana);
show('文脈規定中文洩答案', leak);
process.exit(mid.length || same.length || noGram.length || prob.length || fakeKana.length || leak.length ? 1 : 0);
