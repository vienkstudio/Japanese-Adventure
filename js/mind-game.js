// 3D 心智圖遊戲層：任務腳本引擎＋任務板＋HUD。腳本定義在 data/mind/scripts.js（格式說明見該檔開頭）。
(function () {
  'use strict';
  const M = window.MIND, V = M.view, esc = App.esc, ST = V.ST;
  ST.done = ST.done || {}; ST.best = ST.best || 0;
  const CANCEL = { cancel: 1 }, SKIP = { skip: 1 };
  const CATS = ['推薦', '導覽', '分類', '場景', '單字', '尋寶', '變化', '文法'];
  const FORM_IDS = ['masu', 'te', 'ta', 'nai', 'pot', 'pass', 'caus', 'cpass', 'vol', 'imp', 'ba'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const arr = x => x == null ? null : [].concat(x);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const rand = a => a[Math.floor(Math.random() * a.length)];

  /* ---------------- 樣板字串 ---------------- */
  const get = (vars, path) => path.split('.').reduce((o, k) => o == null ? o : o[k], vars);
  function tpl(x, vars) {
    if (typeof x !== 'string') return x;
    const m = x.match(/^\{([\w.]+)\}$/);
    if (m) { const v = get(vars, m[1]); return v === undefined ? x : v; }
    return x.replace(/\{([\w.]+)\}/g, (s, p) => { const v = get(vars, p); return v == null ? s : v; });
  }
  function deep(x, vars) {
    if (typeof x === 'string') return tpl(x, vars);
    if (Array.isArray(x)) return x.map(v => deep(v, vars));
    if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = k === 'steps' ? x[k] : deep(x[k], vars); return o; }
    return x;
  }

  /* ---------------- 任務清單（SCRIPTS＋TEMPLATES 展開） ---------------- */
  const ALL = [], BY = {};
  function add(s) { if (!s.id || BY[s.id]) return; BY[s.id] = s; ALL.push(s); }
  (M.SCRIPTS || []).forEach(s => add(Object.assign({ vars: {} }, s)));
  (M.TEMPLATES || []).forEach(t => {
    const keys = Object.keys(t.each || {});
    const combos = keys.reduce((acc, k) => acc.reduce((out, c) => out.concat(t.each[k].map(v => Object.assign({}, c, { [k]: v }))), []), [{}]);
    combos.forEach(c => {
      const vars = Object.assign({}, c, t.vars ? t.vars(c, M) : {});
      if (t.when && !t.when(vars, M)) return;
      add({ id: tpl(t.id, vars), cat: t.cat, icon: tpl(t.icon, vars), title: tpl(t.title, vars), desc: tpl(t.desc || '', vars), steps: t.steps, vars });
    });
  });
  // 舊存檔：以等級分的任務 id 併入不分等級的新任務（取最高星數），對應不到的保留不動
  const LEGACY = [[/^classify-N\d$/, () => 'classify'], [/^scenesort-N\d$/, () => 'scenesort'], [/^hunt-N\d$/, () => 'hunt'],
    [/^star-N\d-(.+)$/, m => 'star-' + m[1]], [/^gram-N\d-(.+)$/, m => 'gram-' + m[1]], [/^conj-identify-n3$/, () => 'conj-identify']];
  (function migrate() {
    let ch = false;
    Object.keys(ST.done).forEach(k => {
      for (const [re, to] of LEGACY) {
        const m = k.match(re); if (!m) continue;
        const id = to(m); if (!BY[id]) break;
        ST.done[id] = Math.max(ST.done[id] || 0, ST.done[k] || 0); delete ST.done[k]; ch = true; break;
      }
    });
    if (ch) V.saveST();
  })();
  const starSum = () => ALL.reduce((a, s) => a + (ST.done[s.id] || 0), 0);

  /* ---------------- 選題 ---------------- */
  const CLEAN = /[（(〜～;；・]/;
  const wv = w => Object.assign({}, w, { jp0: V.jp0(w), sc0: w.sc[0], scName: V.SCc[w.sc[0]] ? V.SCc[w.sc[0]].name : '', whDesc: V.WHc[w.wh] ? V.WHc[w.wh].desc : '' });
  async function pick(sel, run) {
    const n = sel.n || 5;
    if (sel.type === 'var') return shuffle(run.vars[sel.from] || []).slice(0, n);
    if (sel.type === 'word') {
      const lvs = arr(sel.lv) || M.LEVELS; await Promise.all(lvs.map(V.loadLex));
      const pos = arr(sel.pos);
      const pool = lvs.reduce((a, l) => a.concat(V.LEX[l] || []), []).filter(w => (!sel.wh || w.wh === sel.wh) && (!sel.sc || w.sc.includes(sel.sc)) && (!sel.sc0 || w.sc[0] === sel.sc0)
        && (!pos || pos.includes(w.pos)) && (!sel.verb || w.pos === 'v') && !CLEAN.test(w.jp) && w.zh.length <= 14);
      // 不分等級出題：優先挑接近使用者程度的詞（只影響難易，不是分類）
      const me = V.profIdx(), LI = l => M.LEVELS.indexOf(l);
      const near = pool.map(w => [Math.abs(LI(w.lv) - me) + Math.random(), w]).sort((a, b) => a[0] - b[0]).slice(0, Math.max(n * 5, 30)).map(x => x[1]);
      return shuffle(near).slice(0, n).map(wv);
    }
    if (sel.type === 'gram') {
      const lvs = arr(sel.lv);
      let pool = V.GRAM.filter(g => (!lvs || lvs.includes(g.lv)) && (!sel.cat || g.cat === sel.cat) && (!sel.conj || g.conj.includes(sel.conj)) && (!sel.unlearned || !ST.learned[g.id]));
      // 依路線出題：先修未學會者排後面；不限類別時直接走學習路線（會補入較低級的先修）
      const ready = g => g.pre.every(p => ST.learned[p]);
      if (sel.order === 'ord' && sel.unlearned && !sel.cat && !sel.conj && M.kb && M.kb.gramPath) { try { return M.kb.gramPath(lvs || null, n).map(g => V.G_BY.get(g.id) || g); } catch (e) { } }
      if (sel.order !== 'ord') pool = shuffle(pool);
      else { const un = pool.filter(g => !ST.learned[g.id]); pool = un.filter(ready).concat(un.filter(g => !ready(g)), pool.filter(g => ST.learned[g.id])); }
      return pool.slice(0, n);
    }
    if (sel.type === 'grp') {
      // 詞群＝人事時地物 × 場景（各級合併）
      const out = [];
      Object.keys(V.GRP).forEach(k => {
        const c = V.GRP[k], p = k.split('|');
        if (c >= (sel.min || 1) && c <= (sel.max || 1e9) && V.SCc[p[1]] && V.WHc[p[0]]) out.push({ id: 'grp:' + k, wh: p[0], sc: p[1], cnt: c, name: V.SCc[p[1]].name + '・' + p[0] });
      });
      return shuffle(out).slice(0, n);
    }
    return [];
  }

  /* ---------------- 出題器 ---------------- */
  function mc(correct, pool) { const ds = shuffle(Array.from(new Set(pool)).filter(x => x && x !== correct)).slice(0, 3); return ds.length < 2 ? null : { options: [correct].concat(ds), answer: 0 }; }
  const peers = w => shuffle((V.LEX[w.lv] || []).filter(x => x.pos === w.pos && x.id !== w.id && !CLEAN.test(x.jp))).slice(0, 12);
  const GEN = {
    zh: w => Object.assign(mc(w.zh, peers(w).map(x => x.zh)) || {}, { text: '是什麼意思？', big: w.jp0, speak: w.jp0 }),
    jp: w => Object.assign(mc(w.jp0, peers(w).map(x => V.jp0(x))) || {}, { text: '的日文是？', big: w.zh }),
    kana: w => w.kana === w.jp0 ? GEN.zh(w) : Object.assign(mc(w.kana, peers(w).map(x => x.kana).filter(k => k !== w.kana)) || {}, { text: '怎麼唸？', big: w.jp0 }),
    mix: w => GEN[rand(['zh', 'zh', 'jp', 'kana'])](w),
    form(w, st) {
      const f = M.conjugate(w.jp0, w.grp); if (!f) return null;
      const wrongGrp = M.conjugate(w.jp0, String(w.grp) === '2' ? '1' : '2') || {};
      const q = mc(f[st.form], [wrongGrp[st.form]].concat(shuffle(FORM_IDS.filter(k => k !== st.form).map(k => f[k]))));
      return q && Object.assign(q, { text: '的「' + M.CONJ_BY[st.form].name + '」是？', big: f.dict + '（' + w.zh + '）', note: M.CONJ_BY[st.form].rule, speakAfter: f[st.form] });
    },
    gzh: g => Object.assign(mc(g.zh, V.GRAM.filter(x => x.lv === g.lv && x !== g).map(x => x.zh)) || {}, { text: '是什麼意思？', big: g.pat }),
    cloze(g) {
      const core = p => p.replace(/（[^）]*）|\([^)]*\)/g, '').split(/[／\/]/)[0].replace(/[〜～\s]/g, '');
      const c = core(g.pat), ex = g.ex && g.ex[0];
      if (!ex || c.length < 2 || !ex.includes(c)) return GEN.gzh(g);
      const q = mc(c, V.GRAM.filter(x => x.lv === g.lv && x !== g).map(x => core(x.pat)).filter(x => x.length >= 2 && !ex.includes(x)));
      return q ? Object.assign(q, { text: '', big: ex.replace(c, '＿＿＿'), sub: g.ex[1] || '', note: ex, speakAfter: ex }) : GEN.gzh(g);
    }
  };

  /* ---------------- 執行狀態 ---------------- */
  let RUN = null, BD = { open: false, cat: '推薦' };
  function wait(run, kind) { return new Promise((resolve, reject) => { run.waiter = { kind, resolve, reject }; }); }
  function fire(kind, val) { if (!RUN || !RUN.waiter) return false; const w = RUN.waiter; if (val !== SKIP && w.kind !== kind) return false; RUN.waiter = null; w.resolve(val); return true; }
  function onNode(n) { if (RUN && !RUN.done) fire('node', n); return true; }
  function ui(run, o) { run.ui = o; hud(); }
  function fx(text, cls) {
    const st = V.stage; if (!st) return;
    const box = st.querySelector('.mm-fx'), d = document.createElement('div');
    d.className = 'mm-pop ' + (cls || ''); d.textContent = text; box.appendChild(d); setTimeout(() => d.remove(), 1000);
    st.classList.remove('fl-ok', 'fl-bad'); void st.offsetWidth; st.classList.add(cls === 'bad' ? 'fl-bad' : 'fl-ok');
  }
  function judge(run, right, st) {
    run.asked++; run.lastRight = right;
    if (right) { run.right++; run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); if (run.combo > ST.best) { ST.best = run.combo; V.saveST(); } fx(run.combo > 1 ? '✓ 連擊 ×' + run.combo : '✓ 答對', 'ok'); }
    else { run.wrong++; run.combo = 0; fx('✗', 'bad'); const w = st && st.track && run.vars[st.track]; if (w && w.jp) Tracker.add(V.trackItem(w), true); }
  }

  /* ---------------- 步驟 ---------------- */
  async function ask3d(st, run, scored) {
    const target = st.target || st.answer, accept = Array.isArray(st.accept) && st.accept.length ? st.accept : [target];
    const q = V.node('q'); if (st.q && q) q.lab = st.q;
    const tn = V.node(target), only = st.only || (tn ? [tn.type] : null);
    let wrongs = 0, hinted = false;
    ui(run, { text: st.text, tip: '👆 點 3D 圖中的節點作答', hint: true });
    if (st.speak) App.speak(st.speak);
    run.hint = () => { hinted = true; V.HL.set(target, 'hl'); V.restyle(); const n = V.node(target); if (n && V.mode !== 'game') V.flyTo(n, st.dist); };
    for (;;) {
      const n = await wait(run, 'node');
      if (n === SKIP) { wrongs++; run.hint(); await sleep(800); break; }
      if (accept.includes(n.id)) break;
      if (only && !only.includes(n.type)) continue;
      wrongs++; V.HL.set(n.id, 'bad'); V.restyle(); fx('✗', 'bad');
      setTimeout(() => { if (V.HL.get(n.id) === 'bad') { V.HL.delete(n.id); V.restyle(); } }, 650);
      if (wrongs >= 2) run.hint();
    }
    run.hint = null;
    V.HL.clear(); V.HL.set(target, 'ok'); V.restyle();
    if (scored) judge(run, wrongs === 0 && !hinted, st); else fx('✓', 'ok');
    if (st.explain && (wrongs || hinted)) { ui(run, { text: st.text, note: '答案：' + st.explain, next: '繼續 ▶' }); await wait(run, 'tap'); }
    else await sleep(550);
    V.HL.delete(target); V.restyle();
  }
  async function quiz(st, run, q) {
    q = q || (st.gen ? GEN[st.gen](run.vars[st.of], st, run) : { options: st.options, answer: st.answer, text: st.text });
    if (!q || !q.options) return;
    const order = shuffle(q.options.map((o, i) => i)), opts = order.map(i => q.options[i]), ci = order.indexOf(q.answer);
    const base = { text: st.text || q.text, big: st.big || q.big, sub: q.sub, options: opts };
    ui(run, base);
    if (q.speak) App.speak(q.speak);
    const p = await wait(run, 'choice');
    const right = p === ci;
    judge(run, right, st);
    if (q.speakAfter) App.speak(q.speakAfter);
    ui(run, Object.assign({}, base, { reveal: { ci, pick: p === SKIP ? -1 : p }, note: right ? '' : q.note, next: right ? '' : '繼續 ▶' }));
    if (right) await sleep(700); else await wait(run, 'tap');
  }
  const OPS = {
    async say(st, run) { ui(run, { text: st.text, next: st.btn || '繼續 ▶' }); if (st.speak) App.speak(st.speak); await wait(run, 'tap'); },
    async mode(st, run) { V.select(null); if (st.focus) await V.focus(st.focus); else await V.setMode(st.mode); await sleep(st.ms || 500); },
    async filter(st, run) {
      if (st.wh) { V.F.wh.clear(); arr(st.wh).forEach(w => V.F.wh.add(w)); }
      if ('sc' in st) { V.F.sc.clear(); if (st.sc) V.F.sc.add(st.sc); }
      V.restyle();
    },
    async cam(st) { const n = st.to && V.node(st.to); if (n) V.flyTo(n, st.dist); await sleep(st.ms || 700); },
    async mark(st) { V.HL.clear(); (st.ids || []).forEach(id => V.HL.set(id, 'hl')); V.restyle(); },
    async expand(st) { await V.expand(V.norm(st.grp)); await sleep(700); },
    async pick(st, run) { run.vars[st.as] = await pick(st.sel, run); },
    async set(st, run) {
      if (st.rand) run.vars[st.as] = rand(st.rand);
      else if (st.conj) {
        const w = run.vars[st.conj[0]], f = M.conjugate(w.jp0, w.grp) || {}, v = f[run.vars[st.conj[1]]] || '';
        run.vars[st.as] = v; run.vars[st.as + '_ids'] = FORM_IDS.filter(k => f[k] === v).map(k => 'cj:' + k);
      } else run.vars[st.as] = st.value;
    },
    async each(st, run) {
      const list = run.vars[st.in] || [], top = !run.depth; run.depth = (run.depth || 0) + 1;
      for (let i = 0; i < list.length; i++) { run.vars[st.as] = list[i]; if (top) run.prog = i / list.length; await runSteps(st.steps, run); }
      run.depth--; if (top) run.prog = 1;
    },
    async arena(st, run) {
      const b = V.GB(), R = 125; let hubs, c;
      if (st.hubs === 'words') {
        c = st.center && V.SCc[st.center.slice(3)] ? V.N.sc(st.center.slice(3)) : { id: 'q', type: 'verb', lab: '★', val: 12 };
        hubs = (run.vars[st.from] || []).map(w => { const n = V.N.word(w); n.id = 'a:' + w.id; n.lab = '？'; n.val = 6; n.cls = 'mm-l-star'; return n; });
      } else {
        c = { id: 'q', type: 'verb', lab: '？', val: 14 };
        if (st.hubs === 'wh') hubs = M.WH.map(w => V.N.wh(w.id));
        else {
          const ws = run.vars[st.from] || []; let ids = Array.from(new Set(ws.map(w => w.sc0)));
          const rest = shuffle(M.SCENES.map(s => s.id).filter(x => !ids.includes(x)));
          while (ids.length < (st.min || 5) && rest.length) ids.push(rest.pop());
          hubs = shuffle(ids).map(id => V.N.sc(id));
        }
        hubs.forEach(h => { h.val = 12; });
      }
      c.pri = 6; c.center = true; c.top = true; V.fix(b.add(c), 0, 0, 0);
      hubs.forEach((h, i) => { const a = Math.PI / 2 - i / hubs.length * Math.PI * 2; h.top = true; V.fix(b.add(h), Math.cos(a) * R, Math.sin(a) * R, 0); b.link(c.id, h.id, { t: 'in' }); });
      V.enter('game'); run.arena = { count: {} };
      V.apply(b.out(), { fixed: true, dir: [0, 0, 1], ext: [R + 90, R + 75] }); V.renderBar();
      await sleep(500);
    },
    async attach(st, run) {
      const w = run.vars[st.of], hub = V.node(st.to); if (!w || !hub || !run.arena || !V.graph) return;
      const k = run.arena.count[hub.id] = (run.arena.count[hub.id] || 0) + 1, a = k * 2.4, r = 20 + 5 * k;
      const n = V.N.word(w); n.id = 'a:' + w.id; n.val = 2.5; n.top = true;
      V.fix(n, hub.x + Math.cos(a) * r, hub.y + Math.sin(a) * r, 12);
      V.apply({ nodes: V.nodes.concat(n), links: V.graph.graphData().links.concat({ source: hub.id, target: n.id, t: 'in' }) }, { fixed: true, keep: true });
    },
    async reveal(st, run) { const w = run.vars[st.of], n = w && V.node('a:' + w.id); if (!n) return; n.lab = w.jp0; n.cls = ''; V.HL.set(n.id, run.lastRight ? 'ok' : 'bad'); V.restyle(); await sleep(450); V.HL.delete(n.id); V.restyle(); },
    async verb(st, run) {
      const w = run.vars[st.of]; run.verbSet = true;
      V.setVerb({ jp: w.jp0, grp: w.grp, zh: w.zh, hide: !!st.hide }); await V.setMode('tense'); await sleep(st.ms || 900);
    },
    ask3d: (st, run) => ask3d(st, run, true),
    find: (st, run) => ask3d(st, run, !!st.scored),
    quiz: (st, run) => quiz(st, run),
    cloze: (st, run) => quiz(st, run, GEN.cloze(run.vars[st.of])),
    async card(st, run) {
      const x = run.vars[st.of]; if (!x) return;
      const h = x.pat ? `<div class="mm-cj">${esc(x.pat)}</div><div class="mm-cz">${esc(x.zh)}</div>${x.conn ? `<div class="mm-cc">接續：${esc(x.conn)}</div>` : ''}${x.ex && x.ex[0] ? `<div class="mm-ce">${esc(x.ex[0])}<br><span>${esc(x.ex[1] || '')}</span></div>` : ''}${x.note ? `<div class="mm-cc">💡 ${esc(x.note)}</div>` : ''}`
        : `<div class="mm-cj">${esc(x.jp0 || x.jp)}</div><div class="mm-cc">${esc(x.kana || '')}</div><div class="mm-cz">${esc(x.zh)}</div>`;
      ui(run, { card: h, next: '我懂了 ▶' });
      if (x.pat && x.ex && x.ex[0]) App.speak(x.ex[0]); else if (x.jp0) App.speak(x.jp0);
      await wait(run, 'tap');
    },
    async learn(st, run) { if (run.lastRight !== false && st.gram) { V.learn(st.gram); fx('🧠 已學會', 'ok'); } },
    async xp(st) { App.addXP(st.n || 1, st.reason || '心智圖'); }
  };
  async function runSteps(steps, run) {
    for (const raw of steps) {
      if (run.cancel) throw CANCEL;
      const st = deep(raw, run.vars), fn = OPS[st.op];
      if (!fn) { console.warn('未知的步驟 op：', st.op); continue; }
      await fn(st, run);
      if (run.cancel) throw CANCEL;
    }
  }

  /* ---------------- 開始／結束 ---------------- */
  function start(id) {
    const sc = BY[id]; if (!sc) return;
    stop(true); BD.open = false;
    const run = RUN = { sc, vars: Object.assign({}, sc.vars), right: 0, wrong: 0, combo: 0, maxCombo: 0, asked: 0, prog: 0, cancel: false, waiter: null, ui: { text: '準備中…' },
      keep: { wh: Array.from(V.F.wh), sc: Array.from(V.F.sc) } };
    V.select(null); V.F.side = false; V.intercept(onNode); V.renderBar();
    Promise.resolve().then(() => runSteps(typeof sc.steps === 'function' ? sc.steps(run.vars, M) : sc.steps, run)).then(() => finish(run))
      .catch(e => { if (e === CANCEL) return; console.error(e); App.toast('任務發生錯誤：' + (e.message || e)); if (RUN === run) stop(); });
  }
  function finish(run) {
    if (RUN !== run) return;
    const id = run.sc.id, acc = run.asked ? run.right / run.asked : 1, stars = acc >= .9 ? 3 : acc >= .6 ? 2 : 1;
    const prev = ST.done[id] || 0, T = [0, 10, 15, 20];
    let xp = prev ? (stars > prev ? T[stars] - T[prev] : 3) : T[stars]; if (stars === 3 && prev < 3) xp += 10;
    ST.done[id] = Math.max(prev, stars); if (id === 'tour') ST.toured = 1; V.saveST();
    App.addXP(xp, run.sc.title);
    run.done = true; V.intercept(null); V.HL.clear(); V.restyle();
    ui(run, { result: { stars, xp, right: run.right, asked: run.asked, combo: run.maxCombo } });
    V.renderBar();
  }
  function stop(silent) {
    if (!RUN) return;
    const r = RUN; RUN = null; r.cancel = true;
    if (r.waiter) { const w = r.waiter; r.waiter = null; w.reject(CANCEL); }
    V.intercept(null); V.HL.clear();
    V.F.wh.clear(); r.keep.wh.forEach(w => V.F.wh.add(w)); V.F.sc.clear(); r.keep.sc.forEach(s => V.F.sc.add(s));
    if (r.verbSet) V.setVerb({ jp: '書く', grp: '1', zh: '寫' });
    if (V.mode === 'game') { V.F.mode = 'map'; if (!silent) { V.setMode('map'); return; } }
    if (!silent) { V.show(true); } else hud();
  }
  function nextOf(sc) {
    const same = ALL.filter(s => s.cat === sc.cat), i = same.indexOf(sc);
    return same.slice(i + 1).concat(same.slice(0, i)).find(s => !ST.done[s.id]) || ALL.find(s => !ST.done[s.id]) || null;
  }

  /* ---------------- HUD／任務板 ---------------- */
  const stars = n => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
  function recommend() {
    const nx = V.nextOf(), out = [];
    if (!ST.done.tour) out.push(BY.tour);
    out.push(BY.daily, BY['path-next']);
    // 文法：推薦「下一步」所屬類別的任務；其他分類推第一個還沒玩的
    const gc = nx && BY['gram-' + nx.cat];
    if (gc && !ST.done[gc.id]) out.push(gc);
    ['分類', '場景', '單字', '尋寶', '變化', '文法'].forEach(c => { const s = ALL.find(x => x.cat === c && !ST.done[x.id]); if (s) out.push(s); });
    return out.filter((s, i) => s && out.indexOf(s) === i);
  }
  function hud() {
    const root = V.root; if (!root || !root.isConnected) return;
    const Q = s => root.querySelector(s);
    const total = starSum(), learned = V.GRAM.filter(g => ST.learned[g.id]).length;
    const stt = Q('.mm-stats'); if (stt) stt.innerHTML = `<span title="任務星數">⭐ 星 ${total}</span><span title="已學文法">🧠 已學 ${learned}/${V.GRAM.length}</span><span title="最高連擊">🔥 連擊 ${ST.best}</span>`;
    const dock = Q('.mm-dock'); let h = '';
    if (RUN) {
      const u = RUN.ui || {}, sc = RUN.sc;
      if (u.result) {
        const r = u.result, nx = nextOf(sc);
        h = `<div class="mm-quest res"><div class="mm-qs">${stars(r.stars)}</div><div class="mm-qt">${esc(sc.title)} 完成！</div>
          <div class="mm-qn">${r.asked ? `答對 ${r.right}／${r.asked}　最高連擊 ${r.combo}　` : ''}+${r.xp} XP</div>
          <div class="mm-qo">${nx ? `<button type="button" class="btn primary" data-g="start" data-id="${esc(nx.id)}">下一個：${esc(nx.title)} ▶</button>` : ''}<button type="button" class="btn" data-g="start" data-id="${esc(sc.id)}">再玩一次</button><button type="button" class="btn" data-g="board">任務板</button><button type="button" class="btn ghost" data-g="quit">自由探索</button></div></div>`;
      } else {
        const rv = u.reveal;
        h = `<div class="mm-quest"><div class="mm-qh"><b>${esc(sc.icon || '🎮')} ${esc(sc.title)}</b>${RUN.combo > 1 ? `<span class="mm-combo">🔥×${RUN.combo}</span>` : ''}<span class="mm-qsp"></span>
            ${u.hint ? '<button type="button" class="mm-qb" data-g="hint" title="提示">💡</button>' : ''}${u.hint || u.options && !rv ? '<button type="button" class="mm-qb" data-g="skip" title="跳過">⏭</button>' : ''}<button type="button" class="mm-qb" data-g="quit" title="結束任務">✕</button></div>
          <div class="mm-qbar"><i style="width:${Math.round((RUN.prog || 0) * 100)}%"></i></div>
          ${u.card ? `<div class="mm-card">${u.card}</div>` : ''}
          ${u.big ? `<div class="mm-qbig">${esc(u.big)}</div>` : ''}${u.text ? `<div class="mm-qt">${esc(u.text)}</div>` : ''}${u.sub ? `<div class="mm-qsub">${esc(u.sub)}</div>` : ''}
          ${u.tip ? `<div class="mm-qtip">${u.tip}</div>` : ''}
          ${u.options ? `<div class="mm-qo">${u.options.map((o, i) => `<button type="button" class="mm-opt${rv ? (i === rv.ci ? ' ok' : i === rv.pick ? ' bad' : '') : ''}" data-g="opt" data-i="${i}"${rv ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>` : ''}
          ${u.note ? `<div class="mm-qn">${esc(u.note)}</div>` : ''}
          ${u.next ? `<div class="mm-qo"><button type="button" class="btn primary" data-g="next">${esc(u.next)}</button></div>` : ''}</div>`;
      }
    } else {
      const rec = recommend().slice(0, 3);
      h = `<div class="mm-quick">${rec.map(s => `<button type="button" class="mm-qk" data-g="start" data-id="${esc(s.id)}"><span>${esc(s.icon || '🎮')}</span>${esc(s.title)}</button>`).join('')}<button type="button" class="mm-qk all" data-g="board"><span>🎮</span>任務板（${ALL.length}）</button></div>`;
    }
    dock.innerHTML = h; dock.classList.toggle('quest', !!RUN);
    renderBoard();
  }
  function renderBoard() {
    const root = V.root, el = root && root.querySelector('.mm-board'); if (!el) return;
    el.classList.toggle('open', BD.open);
    if (!BD.open) { el.innerHTML = ''; return; }
    const list = BD.cat === '推薦' ? recommend() : ALL.filter(s => s.cat === BD.cat);
    const total = starSum();
    el.innerHTML = `<div class="mm-bd"><div class="mm-bh"><b>🎮 任務板</b><span class="muted">⭐ ${total}／${ALL.length * 3}</span><button type="button" class="mm-x" data-g="bclose" aria-label="關閉">✕</button></div>
      <div class="mm-row">${CATS.map(c => `<button type="button" class="mm-chip${BD.cat === c ? ' on' : ''}" data-g="bcat" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="mm-ml">${list.map(s => `<button type="button" class="mm-ms${ST.done[s.id] ? ' done' : ''}" data-g="start" data-id="${esc(s.id)}"><span class="ic">${esc(s.icon || '🎮')}</span><span class="tx"><b>${esc(s.title)}</b><small>${esc(s.desc || '')}</small></span><em>${stars(ST.done[s.id] || 0)}</em></button>`).join('') || '<p class="muted center">這個分類沒有任務</p>'}</div></div>`;
  }
  function onClick(e) {
    const t = e.target.closest('[data-g]'); if (!t) return;
    e.stopPropagation();
    const g = t.dataset.g;
    if (g === 'next') return void fire('tap');
    if (g === 'opt') return void fire('choice', +t.dataset.i);
    if (g === 'hint') return void (RUN && RUN.hint && RUN.hint());
    if (g === 'skip') return void fire('', SKIP);
    if (g === 'quit') return stop();
    if (g === 'start') return start(t.dataset.id);
    if (g === 'board') { BD.open = true; return renderBoard(); }
    if (g === 'bclose') { BD.open = false; return renderBoard(); }
    if (g === 'bcat') { BD.cat = t.dataset.v; return renderBoard(); }
  }
  function mount(params) {
    const root = V.root; if (!root) return;
    root.querySelector('.mm').addEventListener('click', onClick, true);
    BD.open = false; hud();
    if (params && params.script && BY[params.script]) start(params.script);
  }

  M.game = { all: ALL, by: BY, start, stop, hud, mount, board() { BD.open = !BD.open; renderBoard(); }, get running() { return RUN; }, ops: OPS, gen: GEN };
  if (V.root && V.root.isConnected) mount();
})();
