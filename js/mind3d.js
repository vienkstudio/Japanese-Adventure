// 3D 心智圖（路由 mind3d，實驗功能；主介面為 js/kb.js 知識庫）：N5–N1 詞彙・文法・時態變化・學習順序，可依等級／人事時地物／場景篩選
// 依賴：vendor/3d-force-graph.min.js、data/mind/{taxonomy,conj,grammar}.js；詞彙 data/mind/lex-n*.js 需要時才載入
(function () {
  'use strict';
  const M = window.MIND, esc = App.esc;
  const LV = M.LEVELS, WH = M.WH;
  const WHc = Object.fromEntries(WH.map(w => [w.id, w]));
  const SCc = Object.fromEntries(M.SCENES.map(s => [s.id, s]));
  const SUBS = {};
  (window.SCENES || []).forEach(s => { if (M.SUB[s.id]) SUBS[s.id] = { id: s.id, name: s.name, icon: s.icon || '📍', parent: M.SUB[s.id] }; });
  const GRAM = M.gram, G_BY = new Map(GRAM.map(g => [g.id, g]));
  const POST = new Map(), BYCONJ = {}, BYCAT = {};
  GRAM.forEach(g => {
    g.pre.forEach(p => { if (!POST.has(p)) POST.set(p, []); POST.get(p).push(g); });
    g.conj.forEach(c => (BYCONJ[c] = BYCONJ[c] || []).push(g));
    (BYCAT[g.cat] = BYCAT[g.cat] || []).push(g);
  });
  const KIND_COLOR = { form: '#4a8cff', tense: '#ffb703', aspect: '#2ec4a6' };
  const KIND_NAME = { form: '變化形', tense: '時態', aspect: '體貌' };
  const MODES = [['map', '🌐', '總覽'], ['focus', '🎯', '焦點'], ['tense', '⏳', '時態'], ['path', '🧭', '路線']];
  const VERBS = [['書く', '1', '寫'], ['食べる', '2', '吃'], ['行く', '1', '去'], ['話す', '1', '說'], ['見る', '2', '看'], ['する', '3', '做'], ['来る', '3', '來'], ['勉強', 's', '學習']];

  /* ---------------- 狀態 ---------------- */
  const KEY = 'jpq.mind.v1';
  // 與知識庫（js/kb.js）共用同一份狀態物件，避免兩邊各自寫回互相覆蓋
  const ST = M.ST || (M.ST = (() => { try { return JSON.parse(App.store.get(KEY) || '{}'); } catch (e) { return {}; } })());
  ST.learned = ST.learned || {};
  const saveST = () => App.store.set(KEY, JSON.stringify(ST));
  // 預設只顯示使用者目前等級（App.profile().lv；zero→N5）
  function profLv() { let p = null; try { p = App.profile && App.profile(); } catch (e) { } const l = String((p && p.lv) || 'zero').toUpperCase(); return LV.includes(l) ? l : 'N5'; }
  const F = { mode: 'map', lv: new Set([profLv()]), wh: new Set(), sc: '', types: { word: true, gram: true }, color: 'wh', open: false };
  let FOCUS = 'cj:te', VERB = { jp: '書く', grp: '1', zh: '寫' }, EXP = null, SEL = null, NEXT = null;
  const HL = new Map(); let INTERCEPT = null;
  let G = null, GEL = null, NODES = [], MAP = null, ROOT = null, STAGE = null, PANEL = null, LAB = null, V = null, raf = 0, frame = 0, fitT = 0, noGL = false;

  /* ---------------- 詞彙（延遲載入） ---------------- */
  const LEX = {};
  function loadLex(lv) {
    if (LEX[lv]) return Promise.resolve(LEX[lv]);
    return App.loadScript('data/mind/lex-' + lv.toLowerCase() + '.js').then(() => {
      LEX[lv] = (M.lex[lv] || []).map((a, i) => ({ id: 'w:' + lv + ':' + i, lv, jp: a[0], kana: (a[1] || a[0]).replace(/\s*[（(].*?[）)]/g, ''), zh: a[2], pos: a[3], grp: a[4], wh: a[5], sc: a[6].split(',') }));
      return LEX[lv];
    });
  }
  const loadAll = () => Promise.all(LV.map(loadLex));
  const jp0 = w => (w.jp.split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || w.jp;
  const trackItem = w => ({ id: 'word:' + jp0(w), jp: jp0(w), kana: w.kana, zh: w.zh, source: '心智圖 ' + w.lv });
  const isVerb = w => w.pos === 'v' || w.grp === 's';

  /* ---------------- 節點 ---------------- */
  const N = {
    lv: lv => ({ id: 'lv:' + lv, type: 'lv', lv, lab: lv, pri: 4, val: 16 }),
    wh: (wh, lv) => ({ id: 'wh:' + (lv || '') + wh, type: 'wh', wh, lv, lab: wh, pri: 3, val: 9 }),
    sc: id => ({ id: 'sc:' + id, type: 'sc', sc: id, lab: SCc[id].icon + SCc[id].name, pri: 2.5, val: 8 }),
    sub: id => ({ id: 'sub:' + id, type: 'sub', sub: id, lab: SUBS[id].icon + SUBS[id].name, pri: 2.5, val: 6 }),
    grp: (lv, wh, sc, cnt) => ({ id: `grp:${lv}|${wh}|${sc}`, type: 'grp', lv, wh, sc, cnt, lab: SCc[sc].icon + SCc[sc].name + ' ' + cnt, pri: 1.5, val: 2 + Math.sqrt(cnt) }),
    word: w => ({ id: w.id, type: 'word', lv: w.lv, wh: w.wh, ref: w, lab: jp0(w), pri: 0, val: 1.2 }),
    gram: g => ({ id: g.id, type: 'gram', lv: g.lv, wh: g.wh, ref: g, lab: g.pat, pri: 1, val: 2.4 }),
    conj: (c, form) => ({ id: 'cj:' + c.id, type: 'conj', ref: c, form, lab: c.name.replace(/（.*/, '') + (form ? '｜' + form : ''), pri: 3, val: 7 }),
    cat: c => ({ id: 'cat:' + c, type: 'cat', cat: c, lab: '〔' + c + '〕', pri: 2.5, val: 6 })
  };
  function need(id) {
    const t = id.split(':')[0];
    if (t === 'w') return loadLex(id.split(':')[1]);
    if (t === 'grp') return loadLex(id.slice(4).split('|')[0]);
    if (t === 'sub') return loadAll();
    return Promise.resolve();
  }
  function mk(id) {
    const t = id.split(':')[0], r = id.slice(t.length + 1);
    if (t === 'w') { const p = r.split(':'), w = LEX[p[0]] && LEX[p[0]][+p[1]]; return w && N.word(w); }
    if (t === 'gram') { const g = G_BY.get(id); return g && N.gram(g); }
    if (t === 'cj') return M.CONJ_BY[r] && N.conj(M.CONJ_BY[r]);
    if (t === 'sc') return SCc[r] && N.sc(r);
    if (t === 'sub') return SUBS[r] && N.sub(r);
    if (t === 'grp') { const p = r.split('|'); return SCc[p[2]] && N.grp(p[0], p[1], p[2], (M.GROUPS[p[0]] || {})[p[1] + '|' + p[2]] || 0); }
    if (t === 'cat') return BYCAT[r] && N.cat(r);
    if (t === 'wh') { const lv = LV.find(l => r.startsWith(l)); const w = lv ? r.slice(2) : r; return WHc[w] && N.wh(w, lv); }
    if (t === 'lv') return LV.includes(r) && N.lv(r);
    return null;
  }
  function GB() {
    const nodes = new Map(), links = [], seen = new Set();
    return {
      add(n) { if (!nodes.has(n.id)) nodes.set(n.id, n); return nodes.get(n.id); },
      link(a, b, o) { const k = a + '>' + b; if (a === b || seen.has(k) || seen.has(b + '>' + a)) return; seen.add(k); links.push(Object.assign({ source: a, target: b }, o)); },
      out() { return { nodes: [...nodes.values()], links: links.filter(l => nodes.has(l.source) && nodes.has(l.target)) }; }
    };
  }
  const fix = (n, x, y, z) => { n.x = n.fx = x; n.y = n.fy = y; n.z = n.fz = z; return n; };
  const lvOK = g => F.lv.has(g.lv);

  /* ---------------- 圖 1：總覽（等級分層 × 人事時地物扇區 × 場景群） ---------------- */
  const LAYER = 380;
  function buildMap() {
    if (!MAP) {
      const b = GB(), SEC = Math.PI * 2 / WH.length, HALF = SEC * 0.42;
      LV.forEach((lv, li) => {
        const Y = (li - (LV.length - 1) / 2) * LAYER;
        fix(b.add(N.lv(lv)), 0, Y, 0);
        if (li) b.link('lv:' + LV[li - 1], 'lv:' + lv, { t: 'seq', arrow: 1 });
        WH.forEach((w, wi) => {
          const th = wi * SEC, hub = fix(b.add(N.wh(w.id, lv)), Math.cos(th) * 70, Y, Math.sin(th) * 70);
          b.link('lv:' + lv, hub.id, { t: 'in' });
          const gs = GRAM.filter(g => g.lv === lv && g.wh === w.id);
          gs.forEach((g, k) => {
            const r = 120 + 110 * Math.sqrt((k + .5) / gs.length), a = th + HALF * (((k * .618034) % 1) * 2 - 1);
            fix(b.add(N.gram(g)), Math.cos(a) * r, Y + 22 + (k % 3) * 12, Math.sin(a) * r); b.link(hub.id, g.id, { t: 'in' });
          });
          const grs = M.SCENES.map(s => [s.id, (M.GROUPS[lv] || {})[w.id + '|' + s.id] || 0]).filter(x => x[1]);
          grs.forEach((x, k) => {
            const a = th + (grs.length > 1 ? HALF * (k / (grs.length - 1) * 2 - 1) : 0), r = 290 + (k % 3) * 60;
            const n = fix(b.add(N.grp(lv, w.id, x[0], x[1])), Math.cos(a) * r, Y - 14, Math.sin(a) * r); b.link(hub.id, n.id, { t: 'in' });
          });
        });
      });
      GRAM.forEach(g => { g.pre.forEach(p => b.link(p, g.id, { t: 'pre', arrow: 1, hid: 1 })); g.rel.forEach(r => b.link(g.id, r, { t: 'rel', hid: 1 })); });
      MAP = b.out();
    }
    const nodes = MAP.nodes.slice(), links = MAP.links.slice();
    if (EXP) {
      const g = MAP.nodes.find(n => n.id === EXP);
      const ws = g && LEX[g.lv] ? LEX[g.lv].filter(w => w.wh === g.wh && w.sc[0] === g.sc) : [];
      const R = 16 + 4.2 * Math.sqrt(ws.length);
      ws.forEach((w, i) => {
        const y = 1 - (i + .5) / ws.length * 2, rr = Math.sqrt(1 - y * y), a = i * 2.399963;
        nodes.push(fix(N.word(w), g.x + Math.cos(a) * rr * R, g.y + y * R, g.z + Math.sin(a) * rr * R));
        links.push({ source: g.id, target: w.id, t: 'in' });
      });
    }
    return { nodes, links };
  }

  /* ---------------- 圖 2：焦點（任一節點的關聯） ---------------- */
  function buildFocus(id) {
    const b = GB(), c0 = mk(id); if (!c0) return null;
    const c = b.add(c0); c.pri = 6; c.val = Math.max(c.val * 2, 12); c.center = true;
    const addG = (g, to, o) => { const n = b.add(N.gram(g)); if (to) b.link(to, n.id, o); return n; };
    const addW = (w, to, o) => { const n = b.add(N.word(w)); if (to) b.link(to, n.id, o); return n; };
    const groups = (lv, wh, sc, to) => { const cnt = (M.GROUPS[lv] || {})[wh + '|' + sc]; if (!cnt) return; const n = b.add(N.grp(lv, wh, sc, cnt)); n.lab = lv + '・' + wh + '・' + SCc[sc].name + ' ' + cnt; b.link(to, n.id, { t: 'in' }); };
    if (c.type === 'word') {
      const w = c.ref; c.lab = jp0(w) + '　' + w.zh;
      b.add(N.lv(w.lv)); b.link('lv:' + w.lv, c.id);
      b.add(N.wh(w.wh)); b.link('wh:' + w.wh, c.id);
      w.sc.forEach(s => {
        if (SCc[s]) { b.add(N.sc(s)); b.link('sc:' + s, c.id); }
        else if (SUBS[s]) { b.add(N.sub(s)); b.link('sub:' + s, c.id); b.add(N.sc(SUBS[s].parent)); b.link('sc:' + SUBS[s].parent, 'sub:' + s); }
      });
      const idx = +w.id.split(':')[2], ix = x => +x.id.split(':')[2];
      LEX[w.lv].filter(x => x !== w && x.wh === w.wh && x.sc[0] === w.sc[0]).sort((a, z) => Math.abs(ix(a) - idx) - Math.abs(ix(z) - idx)).slice(0, 18).forEach(x => addW(x, 'sc:' + w.sc[0], { t: 'sib' }));
      (jp0(w).match(/[一-鿿]/g) || []).slice(0, 2).forEach(ch => {
        let cnt = 0;
        for (const lv of LV) for (const x of LEX[lv] || []) { if (cnt >= 8) break; if (x !== w && x.jp.includes(ch)) { addW(x, c.id, { t: 'kanji' }); cnt++; } }
      });
      if (isVerb(w)) {
        const f = M.conjugate(jp0(w), w.grp) || {};
        M.CONJ.filter(x => x.kind === 'form' && x.id !== 'dict').forEach(x => {
          const n = b.add(N.conj(x, f[x.id]));
          b.link(x.from === 'dict' ? c.id : 'cj:' + x.from, n.id, { t: 'conj', arrow: 1 });
          (BYCONJ[x.id] || []).filter(lvOK).slice(0, 2).forEach(g => addG(g, n.id, { t: 'use' }));
        });
      }
    } else if (c.type === 'gram') {
      const g = c.ref; c.lab = g.pat + '　' + g.zh;
      b.add(N.lv(g.lv)); b.link('lv:' + g.lv, c.id);
      b.add(N.wh(g.wh)); b.link('wh:' + g.wh, c.id);
      g.sc.forEach(s => { b.add(N.sc(s)); b.link('sc:' + s, c.id); });
      b.add(N.cat(g.cat)); b.link('cat:' + g.cat, c.id);
      BYCAT[g.cat].filter(x => x !== g && x.lv === g.lv).slice(0, 10).forEach(x => addG(x, 'cat:' + g.cat, { t: 'sib' }));
      const up = (x, d) => x.pre.forEach(p => { const pg = G_BY.get(p); if (!pg) return; addG(pg); b.link(p, x.id, { t: 'pre', arrow: 1 }); if (d < 3) up(pg, d + 1); });
      up(g, 1);
      (POST.get(g.id) || []).slice(0, 16).forEach(x => { addG(x); b.link(g.id, x.id, { t: 'pre', arrow: 1 }); });
      g.rel.forEach(r => { const x = G_BY.get(r); if (x) { addG(x); b.link(g.id, r, { t: 'rel' }); } });
      g.conj.forEach(cj => { b.add(N.conj(M.CONJ_BY[cj])); b.link('cj:' + cj, c.id, { t: 'conj' }); });
    } else if (c.type === 'conj') {
      const x = c.ref;
      if (x.from) { b.add(N.conj(M.CONJ_BY[x.from])); b.link('cj:' + x.from, c.id, { t: 'conj', arrow: 1 }); }
      M.CONJ.filter(y => y.from === x.id).forEach(y => { b.add(N.conj(y)); b.link(c.id, 'cj:' + y.id, { t: 'conj', arrow: 1 }); });
      (BYCONJ[x.id] || []).filter(lvOK).slice(0, 90).forEach(g => addG(g, c.id, { t: 'use' }));
    } else if (c.type === 'sc') {
      Object.values(SUBS).filter(s => s.parent === c.sc).forEach(s => { b.add(N.sub(s.id)); b.link(c.id, 'sub:' + s.id); });
      LV.filter(l => F.lv.has(l)).forEach(lv => WH.forEach(w => groups(lv, w.id, c.sc, c.id)));
      GRAM.filter(g => lvOK(g) && g.sc.includes(c.sc)).slice(0, 40).forEach(g => addG(g, c.id, { t: 'use' }));
    } else if (c.type === 'sub') {
      b.add(N.sc(SUBS[c.sub].parent)); b.link('sc:' + SUBS[c.sub].parent, c.id);
      LV.forEach(lv => (LEX[lv] || []).forEach(w => { if (w.sc.includes(c.sub)) addW(w, c.id, { t: 'in' }); }));
    } else if (c.type === 'grp') {
      b.add(N.lv(c.lv)); b.link('lv:' + c.lv, c.id); b.add(N.wh(c.wh)); b.link('wh:' + c.wh, c.id); b.add(N.sc(c.sc)); b.link('sc:' + c.sc, c.id);
      (LEX[c.lv] || []).filter(w => w.wh === c.wh && w.sc[0] === c.sc).slice(0, 260).forEach(w => addW(w, c.id, { t: 'in' }));
    } else if (c.type === 'cat') {
      BYCAT[c.cat].filter(lvOK).slice(0, 120).forEach(g => addG(g, c.id, { t: 'use' }));
    } else if (c.type === 'wh') {
      (c.lv ? [c.lv] : LV.filter(l => F.lv.has(l))).forEach(lv => {
        let to = c.id;
        if (!c.lv) { b.add(N.lv(lv)); b.link(c.id, 'lv:' + lv); to = 'lv:' + lv; }
        M.SCENES.forEach(s => groups(lv, c.wh, s.id, to));
      });
    } else if (c.type === 'lv') {
      WH.forEach(w => { const h = b.add(N.wh(w.id, c.lv)); b.link(c.id, h.id); M.SCENES.forEach(s => groups(c.lv, w.id, s.id, h.id)); });
    }
    return b.out();
  }

  /* ---------------- 圖 3：時態／動詞變化網 ---------------- */
  function buildTense(hide) {
    const b = GB(), f = hide ? {} : M.conjugate(VERB.jp, VERB.grp) || {};
    const v = b.add({ id: 'verb', type: 'verb', lab: (VERB.grp === 's' ? VERB.jp + 'する' : VERB.jp) + '　' + (VERB.zh || ''), pri: 6, val: 18 });
    M.CONJ.forEach(c => { const n = b.add(N.conj(c, f[c.id])); n.cnt = (BYCONJ[c.id] || []).filter(lvOK).length; });
    b.link('verb', 'cj:dict', { t: 'conj', arrow: 1 });
    M.CONJ.forEach(c => {
      if (c.from) b.link('cj:' + c.from, 'cj:' + c.id, { t: 'conj', arrow: 1 });
      (BYCONJ[c.id] || []).filter(lvOK).slice(0, 8).forEach(g => { b.add(N.gram(g)); b.link('cj:' + c.id, g.id, { t: 'use' }); });
    });
    v.center = true;
    return b.out();
  }

  /* ---------------- 圖 4：學習路線（N5→N1 螺旋時間軸） ---------------- */
  // 下一步：所選等級中第一條未學文法，但先修沒學會時改推最早的未學先修（可能在較低等級）
  const preDone = g => g.pre.every(p => ST.learned[p]);
  function nextOf() {
    if (M.kb && M.kb.gramPath) return M.kb.gramPath(LV.filter(l => F.lv.has(l)), 1)[0] || null;
    return GRAM.find(g => !ST.learned[g.id] && lvOK(g) && preDone(g)) || null;
  }
  function buildPath() {
    const b = GB(), list = GRAM.filter(lvOK), R = 180, D = 0.105, RISE = 0.9, H0 = list.length * RISE / 2;
    let prev = null, plv = null;
    list.forEach((g, k) => {
      const a = k * D, n = fix(b.add(N.gram(g)), Math.cos(a) * R, k * RISE - H0, Math.sin(a) * R);
      if (g.lv !== plv) { const h = fix(b.add(N.lv(g.lv)), Math.cos(a) * (R + 55), k * RISE - H0, Math.sin(a) * (R + 55)); h.lab = g.lv + ' 起點'; h.val = 7; b.link(h.id, n.id, { t: 'seq' }); plv = g.lv; }
      if (prev) b.link(prev.id, n.id, { t: 'seq' });
      prev = n;
    });
    list.forEach(g => g.pre.forEach(p => b.link(p, g.id, { t: 'pre', arrow: 1, hid: 1 })));
    const o = b.out(); o.h = list.length * RISE; return o;
  }

  /* ---------------- 外觀 ---------------- */
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
  function mix(a, b, t) { try { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); } catch (e) { return a; } }
  let BG = '#fafaf7';
  const TK = {};
  const tk = (v, d) => TK[v] || (TK[v] = css(v) || d);
  const lvC = lv => tk('--' + String(lv).toLowerCase(), M.LV_COLOR[lv]);
  function colorOf(n) {
    const hl = HL.get(n.id); if (hl) return hl === 'ok' ? tk('--ok', '#2ec4a6') : hl === 'bad' ? tk('--err', '#ff4d4f') : tk('--gold', '#ffd23f');
    if (n.type === 'lv') return lvC(n.lv);
    if (n.type === 'wh') return WHc[n.wh].color;
    if (n.type === 'sc' || n.type === 'sub') return '#d9a441';
    if (n.type === 'conj') return KIND_COLOR[n.ref.kind];
    if (n.type === 'cat') return '#8a94a6';
    if (n.type === 'verb') return '#ff6b5b';
    if (F.mode === 'path' && n.type === 'gram') {
      if (n.id === NEXT) return tk('--gold', '#ffb703');
      return ST.learned[n.id] ? lvC(n.lv) : mix(lvC(n.lv), BG, .62);
    }
    return F.color === 'lv' ? lvC(n.lv) : WHc[n.wh].color;
  }
  const valOf = n => n.val * (n === SEL && !n.center ? (n.type === 'word' || n.type === 'gram' ? 3 : 1.5) : 1) * (F.mode === 'path' && n.id === NEXT ? 2.5 : 1) * (HL.has(n.id) ? 2.2 : 1);
  function vis(n) {
    if (F.mode !== 'map' && F.mode !== 'path') return true;
    if (n.lv && !F.lv.has(n.lv)) return false;
    if (n.type === 'lv') return true;
    if (F.wh.size && n.wh && !F.wh.has(n.wh)) return false;
    if (n.type === 'grp') return F.types.word && (!F.sc || n.sc === F.sc);
    if (n.type === 'word') return F.types.word && (!F.sc || n.ref.sc[0] === F.sc);
    if (n.type === 'gram') return (F.mode === 'path' || F.types.gram) && (!F.sc || n.ref.sc.includes(F.sc));
    return true;
  }
  let NMAP = new Map();
  function lvis(l) {
    const s = typeof l.source === 'object' ? l.source : NMAP.get(l.source), t = typeof l.target === 'object' ? l.target : NMAP.get(l.target);
    if (!s || !t) return !l.hid;
    if (!vis(s) || !vis(t)) return false;
    return !l.hid || s === SEL || t === SEL;
  }
  const LINK_COLOR = { pre: '#ff8a3d', rel: '#a77bff', conj: '#4a8cff', seq: '#9aa3b2', kanji: '#ff6b8a', use: '#2ec4a6' };
  const linkColor = l => LINK_COLOR[l.t] || (BG < '#8' ? '#6b7280' : '#aab1bd');
  const tip = n => {
    const r = n.ref;
    if (n.type === 'word') return `<b>${esc(r.jp)}</b>　${esc(r.kana)}<br>${esc(r.zh)}`;
    if (n.type === 'gram') return `<b>${esc(r.pat)}</b><br>${esc(r.zh)}`;
    if (n.type === 'conj') return `<b>${esc(r.name)}</b><br>${esc(n.form || r.ex)}`;
    return esc(n.lab);
  };

  /* ---------------- 3D 引擎 ---------------- */
  function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function ensureGraph() {
    if (noGL) return false;
    if (G) { STAGE.insertBefore(GEL, STAGE.firstChild); G.resumeAnimation(); return true; }
    if (!window.ForceGraph3D || !hasGL()) { noGL = true; return false; }
    GEL = document.createElement('div'); GEL.className = 'mm-gl';
    STAGE.insertBefore(GEL, STAGE.firstChild);
    const mobile = innerWidth < 720;
    try {
      G = new window.ForceGraph3D(GEL, { controlType: 'orbit', rendererConfig: { antialias: !mobile, alpha: false, powerPreference: 'high-performance' } });
    } catch (e) { console.error(e); noGL = true; GEL.remove(); return false; }
    G.showNavInfo(false).nodeRelSize(4).nodeResolution(mobile ? 6 : 10).nodeOpacity(.92)
      .nodeVal(valOf).nodeColor(colorOf).nodeLabel(tip).nodeVisibility(vis)
      .linkVisibility(lvis).linkColor(linkColor).linkOpacity(.38).linkWidth(l => l.t === 'pre' || l.t === 'conj' ? .8 : 0)
      .linkDirectionalArrowLength(l => l.arrow ? 3.5 : 0).linkDirectionalArrowRelPos(1)
      .enableNodeDrag(false).onNodeClick(n => select(n, true)).onBackgroundClick(() => select(null))
      .onEngineStop(() => { if (fitT) { fitT = 0; G.zoomToFit(500, 50, vis); } });
    return true;
  }
  function apply(data, o) {
    o = o || {};
    NODES = data.nodes; NMAP = new Map(NODES.map(n => [n.id, n]));
    if (SEL) SEL = NODES.find(n => n.id === SEL.id) || null;
    if (!G) { renderList(); return; }
    BG = css('--bg') || '#fafaf7'; G.backgroundColor(BG); for (const k in TK) delete TK[k];
    G.warmupTicks(o.fixed ? 0 : 90).cooldownTicks(o.fixed ? 1 : 60).cooldownTime(o.fixed ? 200 : 3000);
    G.graphData(data);
    if (!o.fixed) { G.d3Force('charge').strength(-260); G.d3Force('link').distance(l => l.t === 'conj' ? 80 : l.t === 'in' || l.t === 'use' || l.t === 'sib' ? 46 : 64); }
    if (o.dir) {
      const t = Math.tan((G.camera().fov || 50) * Math.PI / 360), asp = Math.max(.3, GEL.clientWidth / Math.max(1, GEL.clientHeight));
      const dist = Math.max(o.ext[1] / t, o.ext[0] / (t * asp)) * 1.08, l = Math.hypot(o.dir[0], o.dir[1], o.dir[2]);
      const cy = o.cy || 0;
      G.cameraPosition({ x: o.dir[0] / l * dist, y: cy + o.dir[1] / l * dist, z: o.dir[2] / l * dist }, { x: 0, y: cy, z: 0 }, 0);
    }
    else if (o.fit !== false && !o.keep) { fitT = 1; setTimeout(() => G && fitT && G.zoomToFit(400, 60, vis), 250); }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function restyle() { if (!G) { renderList(); return; } G.nodeVal(valOf).nodeColor(colorOf).nodeVisibility(vis).linkVisibility(lvis); }
  function flyTo(n, dist) {
    if (!G || !n) return;
    const d = dist || 230, l = Math.hypot(n.x, n.z) || 1;
    G.cameraPosition({ x: n.x + n.x / l * d, y: n.y + d * .35, z: n.z + n.z / l * d }, { x: n.x, y: n.y, z: n.z }, 700);
  }

  /* ---------------- 文字標籤（HTML 疊在 3D 上，依距離挑最近的顯示） ---------------- */
  const shown = new Map(), free = [];
  function tick() {
    if (!GEL || !GEL.isConnected) { raf = 0; if (G) G.pauseAnimation(); return; }
    raf = requestAnimationFrame(tick);
    if (frame++ & 1) return;
    const cam = G.camera(), cp = cam.position, w = GEL.clientWidth, h = GEL.clientHeight;
    if (!V) V = cp.clone();
    const cand = [];
    for (const n of NODES) {
      if (n.x === undefined || !vis(n)) continue;
      const dx = n.x - cp.x, dy = n.y - cp.y, dz = n.z - cp.z;
      n._s = n === SEL || HL.has(n.id) || n.top ? 0 : (dx * dx + dy * dy + dz * dz) / (1 + n.pri * n.pri * 3) * (shown.has(n.id) ? .55 : 1);
      cand.push(n);
    }
    cand.sort((a, b) => a._s - b._s);
    const MAX = w < 720 ? 32 : 90, rects = [], now = new Set();
    let placed = 0;
    for (let i = 0; i < cand.length && placed < MAX && i < 700; i++) {
      const n = cand[i];
      V.set(n.x, n.y, n.z).project(cam);
      if (V.z > 1 || V.x < -1.05 || V.x > 1.05 || V.y < -1.05 || V.y > 1.05) continue;
      const sx = (V.x + 1) / 2 * w, sy = (1 - V.y) / 2 * h;
      // 標籤框：以 translate(-50%,-135%) 置中於節點上方；全形字寬≈字級、半形≈0.6 字級
      const big = n === SEL || n.center || HL.has(n.id), fs = big ? 14 : LFS[n.type] || 11, lw = Math.min(big ? 320 : 220, labW(n.lab, fs) + (big || LPAD[n.type] ? 20 : 10)), lh = fs * 1.25 + 4;
      const x0 = sx - lw / 2 - 2, x1 = sx + lw / 2 + 2, y1 = sy - lh * .35 + 2, y0 = y1 - lh - 4;
      let hit = false; for (const r of rects) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) { hit = true; break; }
      if (hit && n !== SEL && !n.center && !HL.has(n.id) && !n.top) continue;
      rects.push([x0, y0, x1, y1]);
      let el = shown.get(n.id);
      if (!el) { el = free.pop() || LAB.appendChild(document.createElement('div')); el.textContent = n.lab; el.style.display = ''; shown.set(n.id, el); }
      const cls = 'mm-l mm-l-' + n.type + (n === SEL ? ' sel' : '') + (n.center ? ' ctr' : '') + (HL.has(n.id) ? ' hl-' + HL.get(n.id) : '') + (n.cls ? ' ' + n.cls : '') + (F.mode === 'path' && n.type === 'gram' ? (n.id === NEXT ? ' next' : ST.learned[n.id] ? ' done' : '') : '');
      if (el._c !== cls) el.className = el._c = cls;
      if (el._t !== n.lab) el.textContent = el._t = n.lab;
      el._n = n;
      el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-135%)`;
      now.add(n.id); placed++;
    }
    for (const [id, el] of shown) if (!now.has(id)) { el.style.display = 'none'; el._t = el._c = null; shown.delete(id); free.push(el); }
  }
  const LFS = { lv: 17, wh: 15, sc: 12.5, sub: 12.5, cat: 12.5, conj: 12.5, verb: 12.5, gram: 11.5, grp: 11.5, star: 15 }, LPAD = { lv: 1, conj: 1, verb: 1 };
  function labW(t, fs) { let w = 0; for (const ch of t) w += /[\u0000-\u00ff]/.test(ch) ? fs * .6 : fs; return w; }
  function resetLabels() { shown.clear(); free.length = 0; if (LAB) LAB.innerHTML = ''; }

  /* ---------------- 無 WebGL：清單檢視 ---------------- */
  function renderList() {
    if (!STAGE) return;
    let box = STAGE.querySelector('.mm-list');
    if (!box) { box = document.createElement('div'); box.className = 'mm-list'; STAGE.insertBefore(box, STAGE.firstChild); }
    const by = {}; NODES.filter(vis).forEach(n => (by[n.type] = by[n.type] || []).push(n));
    const NAME = { lv: '等級', wh: '人事時地物', sc: '場景', sub: '旅遊場景', grp: '詞彙群', gram: '文法', conj: '變化形／時態', cat: '文法類別', word: '詞彙', verb: '動詞' };
    box.innerHTML = '<p class="muted">此裝置無法使用 3D（WebGL）。建議改用 <button type="button" class="mm-chip on" data-act="kb">📚 知識庫</button>，以下為簡易清單。</p>' + Object.keys(NAME).filter(t => by[t]).map(t =>
      `<div class="mm-ph">${NAME[t]}（${by[t].length}）</div><div class="mm-chips">${by[t].slice(0, 300).map(n => `<button class="mm-chip" data-sel="${esc(n.id)}">${esc(n.lab)}</button>`).join('')}</div>`).join('');
  }

  /* ---------------- 模式切換 ---------------- */
  function show(keep) {
    const m = F.mode; let p = Promise.resolve();
    NEXT = (nextOf() || {}).id || null;
    if (m === 'map') {
      // 鏡頭只框住目前勾選的等級層
      const ys = LV.map((l, i) => F.lv.has(l) ? (i - (LV.length - 1) / 2) * LAYER : null).filter(y => y !== null);
      const cy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0, hy = ys.length ? (Math.max(...ys) - Math.min(...ys)) / 2 : 0;
      apply(buildMap(), { fixed: true, keep, dir: keep ? null : [0, .32, 1], ext: [440, hy + 260], cy });
    }
    else if (m === 'focus') {
      const id = FOCUS;
      p = need(id).then(() => { if (F.mode !== 'focus' || FOCUS !== id) return; const d = buildFocus(id); if (!d) return; apply(d); if (!INTERCEPT) SEL = NODES.find(n => n.center) || null; restyle(); renderPanel(); });
    } else if (m === 'tense') apply(buildTense(VERB.hide));
    else if (m === 'path') { const d = buildPath(); apply(d, { fixed: true, keep, dir: keep ? null : [0, .3, 1], ext: [260, d.h / 2 + 90] }); }
    renderBar(); renderPanel();
    return p;
  }
  function setMode(m) { F.mode = m; SEL = null; HL.clear(); resetLabels(); return show(); }
  function focus(id) { FOCUS = id; F.mode = 'focus'; SEL = null; HL.clear(); resetLabels(); closeResults(); return show(); }
  function expand(id) {
    const lv = id.slice(4).split('|')[0]; EXP = id;
    return loadLex(lv).then(() => { if (F.mode !== 'map') return null; apply(buildMap(), { fixed: true, keep: true }); const g = NODES.find(x => x.id === id); if (g) flyTo(g, 130 + 14 * Math.sqrt(g.cnt)); return g; });
  }
  function select(n, fromGraph) {
    if (fromGraph && INTERCEPT && n) { if (INTERCEPT(n) !== false) return; }
    if (n && fromGraph && F.mode === 'focus' && n === SEL && !n.center) { focus(n.id); return; }
    SEL = n || null;
    if (n && F.mode === 'map' && n.type === 'grp') {
      EXP = EXP === n.id ? null : n.id;
      if (EXP) { loadLex(n.lv).then(() => { if (F.mode !== 'map' || EXP !== n.id) return; apply(buildMap(), { fixed: true, keep: true }); flyTo(NODES.find(x => x.id === n.id), 130 + 14 * Math.sqrt(n.cnt)); renderPanel(); }); }
      else apply(buildMap(), { fixed: true, keep: true });
    }
    restyle(); renderPanel();
  }
  function selectId(id, fly) {
    const n = NODES.find(x => x.id === id);
    if (!n) { if (!INTERCEPT) focus(id); return; }
    if (INTERCEPT) { select(n, true); return; }
    select(n); if (fly) flyTo(n);
  }

  /* ---------------- 工具列／篩選 ---------------- */
  const chip = (attr, val, on, html, title) => `<button type="button" class="mm-chip${on ? ' on' : ''}" data-${attr}="${esc(val)}"${title ? ` title="${esc(title)}"` : ''}>${html}</button>`;
  function renderBar() {
    if (!ROOT) return;
    const Q = sel => ROOT.querySelector(sel);
    Q('.mm').classList.toggle('gaming', !!INTERCEPT);
    Q('.mm-modes').innerHTML = MODES.map(m => `<button type="button" class="mm-mode${F.mode === m[0] ? ' on' : ''}" data-mode="${m[0]}" title="${m[2]}"><span>${m[1]}</span><em>${m[2]}</em></button>`).join('');
    const nF = (F.lv.size < LV.length ? 1 : 0) + (F.wh.size ? 1 : 0) + (F.sc ? 1 : 0) + (F.types.word && F.types.gram ? 0 : 1);
    Q('.mm-tools').innerHTML = `<button type="button" class="mm-tool" data-act="kb" aria-label="回知識庫" title="回知識庫">📚</button><button type="button" class="mm-tool" data-act="search" aria-label="搜尋">🔍</button><button type="button" class="mm-tool${nF ? ' on' : ''}" data-act="ftog" aria-label="篩選">🎛${nF ? `<sup>${nF}</sup>` : ''}</button><button type="button" class="mm-tool mm-play" data-act="board">🎮<em>任務</em></button>`;
    const subs = F.sc ? Object.values(SUBS).filter(s => s.parent === F.sc) : [];
    const dr = Q('.mm-drawer'); dr.classList.toggle('open', F.open);
    dr.innerHTML = `<div class="mm-dh"><b>篩選</b><button type="button" class="mm-chip" data-act="fclear">重設</button><button type="button" class="mm-x" data-act="ftog" aria-label="關閉">✕</button></div>
      <div class="mm-ph">等級</div><div class="mm-row">${LV.map(l => chip('lv', l, F.lv.has(l), l)).join('')}</div>
      <div class="mm-ph">顯示</div><div class="mm-row">${chip('type', 'word', F.types.word, '詞彙')}${chip('type', 'gram', F.types.gram, '文法')}</div>
      <div class="mm-ph">著色</div><div class="mm-row">${chip('color', 'wh', F.color === 'wh', '人事時地物')}${chip('color', 'lv', F.color === 'lv', '等級')}</div>
      <div class="mm-ph">人事時地物</div><div class="mm-row">${WH.map(w => chip('wh', w.id, F.wh.has(w.id), `<i style="background:${w.color}"></i>${w.name}`, w.desc)).join('')}</div>
      <div class="mm-ph">場景</div><div class="mm-row">${chip('sc', '', !F.sc, '全部')}${M.SCENES.map(s => chip('sc', s.id, F.sc === s.id, s.icon + s.name)).join('')}</div>
      ${subs.length ? `<div class="mm-ph">旅遊場景（點擊前往）</div><div class="mm-row">${subs.map(s => chip('go', 'sub:' + s.id, false, s.icon + s.name)).join('')}</div>` : ''}`;
    let sub = '';
    if (INTERCEPT) sub = '';
    else if (F.mode === 'map') sub = `<span class="muted">目前顯示 ${[...F.lv].join('、')}（🎛 可加其他等級）・點「場景群」展開詞彙</span>`;
    else if (F.mode === 'focus') { const c = mk(FOCUS); sub = `<span class="muted">中心</span><b>${esc(c ? c.lab : '')}</b><span class="muted">再點一次任一節點＝改以它為中心</span>`; }
    else if (F.mode === 'tense') sub = VERBS.map(v => `<button type="button" class="mm-chip${VERB.jp === v[0] ? ' on' : ''}" data-verb="${v.join('|')}">${v[0]}${v[1] === 's' ? 'する' : ''}</button>`).join('');
    else if (F.mode === 'path') {
      const list = GRAM.filter(lvOK), done = list.filter(g => ST.learned[g.id]).length, nx = nextOf();
      const why = nx && M.kb && M.kb.why ? G_BY.get(M.kb.why(nx.id)) : null;
      sub = `<b>已學 ${done}／${list.length}</b>${nx ? `<span class="muted">下一步</span><button type="button" class="mm-chip on" data-sel="${esc(nx.id)}" data-fly="1">${esc(nx.pat)}${lvOK(nx) ? '' : ' ' + nx.lv} ▶</button>${why ? `<span class="muted">（${esc(why.pat)} 的先修）</span>` : ''}` : '🎉 全部完成'}`;
    }
    Q('.mm-sub').innerHTML = sub;
    const lvL = LV.map(l => [lvC(l), l]), whL = WH.map(w => [w.color, w.name]);
    let lg = F.mode === 'tense' ? Object.keys(KIND_NAME).map(k => [KIND_COLOR[k], KIND_NAME[k]]) : F.mode === 'path' ? lvL.concat([[tk('--gold', '#ffb703'), '下一步'], [mix(lvC('N5'), BG, .62), '未學（淡）']]) : F.color === 'lv' ? lvL : whL;
    if (F.mode === 'focus') lg = lg.concat([['#d9a441', '場景'], ['#8a94a6', '文法類別'], [KIND_COLOR.form, '變化形']]);
    const note = F.mode === 'map' ? '<span class="mm-lgn">層：下 N5 → 上 N1</span>' : F.mode === 'path' ? '<span class="mm-lgn">由下往上＝學習順序</span>' : '';
    Q('.mm-legend').innerHTML = lg.map(x => `<span><i style="background:${x[0]}"></i>${x[1]}</span>`).join('') + note;
    if (M.game) M.game.hud();
  }
  function size() {
    if (!STAGE) return;
    const nav = document.getElementById('nav'), fixedNav = nav && getComputedStyle(nav).position === 'fixed';
    const h = Math.max(380, innerHeight - STAGE.getBoundingClientRect().top - (fixedNav ? nav.offsetHeight + 6 : 10));
    STAGE.style.height = h + 'px';
    if (G) G.width(STAGE.clientWidth).height(h);
  }

  /* ---------------- 詳情面板 ---------------- */
  const lvB = lv => `<span class="lv-b ${lv.toLowerCase()}">${lv}</span>`;
  const whB = wh => `<button type="button" class="mm-tag" data-go="wh:${wh}"><i style="background:${WHc[wh].color}"></i>${wh}</button>`;
  const scB = s => SCc[s] ? `<button type="button" class="mm-tag" data-go="sc:${s}">${SCc[s].icon}${SCc[s].name}</button>` : SUBS[s] ? `<button type="button" class="mm-tag" data-go="sub:${s}">${SUBS[s].icon}${SUBS[s].name}</button>` : '';
  const gB = id => { const g = G_BY.get(id); return g ? `<button type="button" class="mm-tag" data-go="${esc(id)}">${esc(g.pat)} <small>${g.lv}</small></button>` : ''; };
  const say = t => `<button type="button" class="mm-say" data-say="${esc(t)}" aria-label="發音">🔊</button>`;
  function formTable(f) {
    return `<table class="mm-tb">${M.CONJ.map(c => `<tr><th><button type="button" class="mm-lnk" data-go="cj:${c.id}">${esc(c.name)}</button></th><td>${esc(f[c.id] || '')}</td></tr>`).join('')}</table>`;
  }
  function renderPanel() {
    if (!PANEL) return;
    const n = SEL;
    if (!n) { PANEL.classList.remove('open'); PANEL.innerHTML = ''; return; }
    const r = n.ref; let h = '', btn = '';
    if (n.type === 'word') {
      const j = jp0(r), tr = Tracker.get('word:' + j);
      h = `<div class="mm-ph1"><span class="mm-jp">${esc(r.jp)}</span>${say(j)}</div>
        <div class="mm-kana">${esc(r.kana)}</div><div class="mm-zh">${esc(r.zh)}${tr && tr.mastered ? '　🎓已掌握' : ''}</div>
        <div class="mm-tags">${lvB(r.lv)}<span class="mm-tag st">${M.POS[r.pos] || ''}${r.grp ? '・' + M.GRP[r.grp] : ''}</span>${whB(r.wh)}${r.sc.map(scB).join('')}</div>`;
      if (isVerb(r)) { const f = M.conjugate(j, r.grp); if (f) h += `<div class="mm-ph">動詞變化</div>${formTable(f)}`; }
      else { const a = M.adjForms(j, r.pos); if (a) h += `<div class="mm-ph">形容詞變化</div><table class="mm-tb">${Object.keys(a).map(k => `<tr><th>${k}</th><td>${esc(a[k])}</td></tr>`).join('')}</table>`; }
      btn = App.trackBtn(trackItem(r)) + (isVerb(r) ? `<button type="button" class="btn sm" data-act="verb">⏳ 看變化</button>` : '');
    } else if (n.type === 'gram') {
      const post = (POST.get(r.id) || []).slice(0, 8);
      h = `<div class="mm-ph1"><span class="mm-jp">${esc(r.pat)}</span></div><div class="mm-zh">${esc(r.zh)}</div>
        <div class="mm-tags">${lvB(r.lv)}<button type="button" class="mm-tag" data-go="cat:${esc(r.cat)}">${esc(r.cat)}</button>${whB(r.wh)}${r.sc.map(scB).join('')}</div>
        ${r.conn ? `<div class="mm-ph">接續</div><div>${esc(r.conn)}</div>` : ''}
        ${r.ex && r.ex[0] ? `<div class="mm-ph">例句</div><div class="mm-ex">${esc(r.ex[0])}${say(r.ex[0])}<br><span class="muted">${esc(r.ex[1] || '')}</span></div>` : ''}
        ${r.note ? `<div class="mm-note">💡 ${esc(r.note)}</div>` : ''}
        ${r.conj.length ? `<div class="mm-ph">用到的變化／時態</div><div class="mm-tags">${r.conj.map(c => `<button type="button" class="mm-tag" data-go="cj:${c}">${esc(M.CONJ_BY[c].name)}</button>`).join('')}</div>` : ''}
        ${r.pre.length ? `<div class="mm-ph">先學（前置）</div><div class="mm-tags">${r.pre.map(gB).join('')}</div>` : ''}
        ${post.length ? `<div class="mm-ph">學完可接</div><div class="mm-tags">${post.map(g => gB(g.id)).join('')}</div>` : ''}
        ${r.rel.length ? `<div class="mm-ph">相近／對比</div><div class="mm-tags">${r.rel.map(gB).join('')}</div>` : ''}`;
      btn = `<button type="button" class="btn sm${ST.learned[r.id] ? ' ai' : ''}" data-act="learn">${ST.learned[r.id] ? '✓ 已學' : '標記已學'}</button>`;
    } else if (n.type === 'conj') {
      const list = (BYCONJ[r.id] || []);
      h = `<div class="mm-ph1"><span class="mm-jp">${esc(r.name)}</span></div><div class="mm-kana">${KIND_NAME[r.kind]}${n.form ? '　' + esc(n.form) : ''}</div>
        <div class="mm-ph">規則</div><div>${esc(r.rule)}</div><div class="mm-ph">例</div><div class="mm-ex">${esc(r.ex)}</div>
        <div class="mm-ph">用到此形的文法（${list.length}）</div><div class="mm-tags">${list.slice(0, 24).map(g => gB(g.id)).join('')}${list.length > 24 ? '<span class="muted">…</span>' : ''}</div>`;
    } else if (n.type === 'grp') {
      const ws = (LEX[n.lv] || []).filter(w => w.wh === n.wh && w.sc[0] === n.sc);
      h = `<div class="mm-ph1"><span class="mm-jp">${SCc[n.sc].icon}${SCc[n.sc].name}</span></div><div class="mm-kana">${n.lv}・${n.wh}・${n.cnt} 個詞</div>
        <div class="mm-tags">${lvB(n.lv)}${whB(n.wh)}${scB(n.sc)}</div>
        ${ws.length ? `<div class="mm-ph">詞彙</div><div class="mm-tags mm-words">${ws.slice(0, 80).map(w => `<button type="button" class="mm-tag" data-sel="${w.id}">${esc(jp0(w))} <small>${esc(w.zh)}</small></button>`).join('')}${ws.length > 80 ? '<span class="muted">…</span>' : ''}</div>` : '<p class="muted">點節點展開詞彙</p>'}`;
    } else if (n.type === 'sc' || n.type === 'sub') {
      const s = n.type === 'sc' ? SCc[n.sc] : SUBS[n.sub];
      h = `<div class="mm-ph1"><span class="mm-jp">${s.icon}${esc(s.name)}</span></div><div class="mm-kana">${n.type === 'sc' ? '生活場景' : '旅遊場景（' + SCc[s.parent].name + '）'}</div>`;
      if (n.type === 'sc') h += `<div class="mm-ph">各級詞數</div><div class="mm-tags">${LV.map(l => { const c = WH.reduce((a, w) => a + ((M.GROUPS[l] || {})[w.id + '|' + n.sc] || 0), 0); return `<span class="mm-tag st">${l}：${c}</span>`; }).join('')}</div>`;
      else btn = `<button type="button" class="btn sm" data-act="scene">🗾 前往場景練習</button>`;
    } else if (n.type === 'wh') {
      h = `<div class="mm-ph1"><span class="mm-jp">${n.wh}</span></div><div class="mm-kana">${n.lv || '全等級'}</div><div>${esc(WHc[n.wh].desc)}</div>`;
    } else if (n.type === 'lv') {
      h = `<div class="mm-ph1"><span class="mm-jp">${n.lv}</span></div><div class="mm-kana">詞彙 ${M.STATS.lex[n.lv] || 0}・文法 ${M.STATS.gram[n.lv] || 0}</div>`;
    } else if (n.type === 'cat') {
      h = `<div class="mm-ph1"><span class="mm-jp">${esc(n.cat)}</span></div><div class="mm-kana">文法類別・${BYCAT[n.cat].length} 條</div><div class="mm-tags">${LV.map(l => `<span class="mm-tag st">${l}：${BYCAT[n.cat].filter(g => g.lv === l).length}</span>`).join('')}</div>`;
    } else if (n.type === 'verb') {
      const f = M.conjugate(VERB.jp, VERB.grp) || {};
      h = `<div class="mm-ph1"><span class="mm-jp">${esc(f.dict || VERB.jp)}</span>${say(f.dict || VERB.jp)}</div><div class="mm-zh">${esc(VERB.zh || '')}</div><div class="mm-kana">${M.GRP[VERB.grp] || ''}</div>${formTable(f)}`;
    }
    const canFocus = n.type !== 'verb' && !(F.mode === 'focus' && n.center);
    const kbId = /^(w|gram|cj):/.test(n.id) && M.kb ? n.id : '';
    PANEL.innerHTML = `<button type="button" class="mm-x" data-act="close" aria-label="關閉">✕</button>${h}<div class="mm-btns">${kbId ? `<button type="button" class="btn sm" data-act="kbpage" data-id="${esc(kbId)}">📖 開成頁面</button>` : ''}${btn}${canFocus ? `<button type="button" class="btn sm primary" data-go="${esc(n.id)}">🎯 以此為中心</button>` : ''}</div>`;
    PANEL.classList.add('open'); PANEL.scrollTop = 0;
  }

  /* ---------------- 搜尋 ---------------- */
  let qT = 0;
  function closeResults() { if (!ROOT) return; const r = ROOT.querySelector('.mm-results'); r.innerHTML = ''; r.classList.remove('open'); }
  function search(q) {
    const box = ROOT.querySelector('.mm-results');
    q = q.trim().toLowerCase();
    if (!q) { closeResults(); return; }
    const out = [];
    GRAM.forEach(g => { if (out.length < 12 && (g.pat.toLowerCase().includes(q) || g.zh.includes(q))) out.push(`<button type="button" data-go="${esc(g.id)}">${lvB(g.lv)}<b>${esc(g.pat)}</b><span>${esc(g.zh)}</span><em>文法</em></button>`); });
    const ws = [];
    for (const lv of LV) for (const w of LEX[lv] || []) {
      const s = w.jp.startsWith(q) || w.kana.startsWith(q) ? 0 : w.jp.includes(q) || w.kana.includes(q) ? 1 : w.zh.includes(q) ? 2 : -1;
      if (s >= 0) ws.push([s, w]);
    }
    ws.sort((a, b) => a[0] - b[0]);
    ws.slice(0, 40).forEach(x => { const w = x[1]; out.push(`<button type="button" data-go="${w.id}">${lvB(w.lv)}<b>${esc(jp0(w))}</b><span>${esc(w.kana)}　${esc(w.zh)}</span><em>${w.wh}</em></button>`); });
    box.innerHTML = out.join('') || '<p class="muted">找不到</p>';
    box.classList.add('open');
  }

  /* ---------------- 事件 ---------------- */
  function onClick(e) {
    const t = e.target.closest('[data-mode],[data-lv],[data-wh],[data-sc],[data-type],[data-color],[data-go],[data-sel],[data-say],[data-act],[data-verb],.mm-l');
    if (!t) return;
    const d = t.dataset;
    if (t.classList.contains('mm-l')) { if (t._n) select(t._n, true); return; }
    if (d.mode) { if (M.game) M.game.stop(true); return setMode(d.mode); }
    if (d.say) return App.speak(d.say);
    if (d.go) { if (M.game) M.game.stop(true); return focus(d.go); }
    if (d.sel) return selectId(d.sel, d.fly || F.mode === 'map');
    if (d.verb) { const v = d.verb.split('|'); VERB = { jp: v[0], grp: v[1], zh: v[2] }; SEL = null; resetLabels(); return show(); }
    if (d.lv) { F.lv.has(d.lv) ? F.lv.size > 1 && F.lv.delete(d.lv) : F.lv.add(d.lv); if (F.mode === 'map') { restyle(); renderBar(); } else { resetLabels(); show(F.mode === 'path'); } return; }
    if (d.wh) { F.wh.has(d.wh) ? F.wh.delete(d.wh) : F.wh.add(d.wh); restyle(); return renderBar(); }
    if ('sc' in d) { F.sc = F.sc === d.sc ? '' : d.sc; restyle(); return renderBar(); }
    if (d.type) { F.types[d.type] = !F.types[d.type]; restyle(); return renderBar(); }
    if (d.color) { F.color = d.color; restyle(); return renderBar(); }
    const a = d.act;
    if (a === 'ftog') { F.open = !F.open; return renderBar(); }
    if (a === 'fclear') { LV.forEach(l => F.lv.add(l)); F.wh.clear(); F.sc = ''; F.types.word = F.types.gram = true; if (F.mode === 'map') restyle(); else show(F.mode === 'path'); return renderBar(); }
    if (a === 'search') { const sb = ROOT.querySelector('.mm-search'); sb.classList.toggle('open'); if (sb.classList.contains('open')) sb.querySelector('input').focus(); else closeResults(); return; }
    if (a === 'board') { if (M.game) M.game.board(); return; }
    if (a === 'kb') return App.go('kb');
    if (a === 'kbpage') return App.go('kb-page', { id: d.id });
    if (a === 'close') return select(null);
    if (a === 'learn' && SEL && SEL.type === 'gram') { if (ST.learned[SEL.id]) delete ST.learned[SEL.id]; else ST.learned[SEL.id] = 1; saveST(); NEXT = (nextOf() || {}).id || null; restyle(); renderBar(); return renderPanel(); }
    if (a === 'verb' && SEL && SEL.type === 'word') { const w = SEL.ref; VERB = { jp: jp0(w), grp: w.grp, zh: w.zh }; return setMode('tense'); }
    if (a === 'scene' && SEL && SEL.type === 'sub') return App.go('scene', { id: SEL.sub });
  }

  /* ---------------- 路由 ---------------- */
  function render(el, params) {
    ROOT = el;
    el.innerHTML = `<div class="mm"><div class="mm-stage">
      <div class="mm-labels"></div>
      <div class="mm-top"><div class="mm-modes"></div><div class="mm-stats"></div><div class="mm-tools"></div></div>
      <div class="mm-search"><input type="search" class="mm-q" placeholder="搜尋 單字／讀音／中文／文法" autocomplete="off" enterkeyhint="search"><div class="mm-results"></div></div>
      <div class="mm-sub"></div>
      <div class="mm-drawer"></div>
      <div class="mm-legend"></div>
      <div class="mm-hint">點節點看詳情・拖曳可旋轉</div>
      <aside class="mm-panel"></aside>
      <div class="mm-dock"></div>
      <div class="mm-board"></div>
      <div class="mm-fx"></div>
    </div>
    <p class="mm-foot muted">詞彙清單：open-anki-jlpt-decks（MIT，源自 tanos.co.uk JLPT 清單，CC BY）；JLPT 官方 2010 年後未公布清單，分級僅供參考。中文釋義、分類與文法為本站整理。</p></div>`;
    STAGE = el.querySelector('.mm-stage'); PANEL = el.querySelector('.mm-panel'); LAB = el.querySelector('.mm-labels');
    resetLabels();
    el.querySelector('.mm').addEventListener('click', onClick);
    const q = el.querySelector('.mm-q');
    let lexReady = LV.every(l => LEX[l]);
    const warm = () => { if (!lexReady) loadAll().then(() => { lexReady = true; if (q.isConnected && q.value) search(q.value); }).catch(() => { }); };
    q.addEventListener('focus', warm);
    q.addEventListener('input', () => { warm(); clearTimeout(qT); qT = setTimeout(() => search(q.value), 160); });
    STAGE.addEventListener('pointerdown', e => { if (!e.target.closest('.mm-gl,.mm-labels')) return; const h = STAGE.querySelector('.mm-hint'); if (h) h.remove(); closeResults(); }, { passive: true });
    if (M.game) M.game.stop(true);
    if (F.mode === 'game') F.mode = 'map';
    size();
    ensureGraph();
    if (params && params.focus) { FOCUS = params.focus; F.mode = 'focus'; }
    show();
    size();
    if (M.game) M.game.mount(params);
    if (!render.bound) { render.bound = 1; window.addEventListener('resize', () => { if (STAGE && STAGE.isConnected) size(); }); }
  }

  /* ---------------- 對外 API（給 js/mind-game.js 的腳本引擎用） ---------------- */
  M.view = {
    F, ST, saveST, LEX, N, GB, fix, loadLex, loadAll, jp0, trackItem, isVerb, GRAM, G_BY, BYCONJ, BYCAT, SUBS, WHc, SCc, HL,
    get nodes() { return NODES; }, get stage() { return STAGE; }, get root() { return ROOT; }, get mode() { return F.mode; }, get graph() { return G; },
    node: id => NODES.find(n => n.id === id) || null,
    setMode, focus, show, apply, restyle, flyTo, select, renderBar, renderPanel, expand, nextOf, resetLabels,
    setVerb(v) { VERB = v; },
    intercept(fn) { INTERCEPT = fn || null; },
    enter(mode) { F.mode = mode || 'game'; SEL = null; HL.clear(); resetLabels(); renderPanel(); },
    learn(id, on) { if (on === false) delete ST.learned[id]; else ST.learned[id] = 1; saveST(); NEXT = (nextOf() || {}).id || null; restyle(); }
  };
  App.register('mind3d', { title: '3D 心智圖', icon: '🌐', nav: false, navParent: 'kb', render });
})();
