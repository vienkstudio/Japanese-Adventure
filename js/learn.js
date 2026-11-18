/* =========================================================
   日語冒險 — 統一學習進度 learn.js（window.Learn）
   Item id 以內容為鍵：kana:<平假名>、v:<辭書形>、p:<句子正規化>、g:<句型>（其他前綴原樣保留，如 num:、cnt:、cj:）
   單一進度：App.state.learn = { <id>: { s, due, stab, diff, reps, lapses, last, src, star?, fav?, ack?, str?, g?, m? } }
     s：'new'|'learning'|'review'|'mastered'；due：毫秒時間戳（0＝立刻）；stab：穩定度（天）；diff：難度 1–10
     reps：作答次數；lapses：答錯次數；last：最後作答；src：最後來源；star：使用者加入不會清單
     fav：知識庫收藏；ack：移出不會清單時的 lapses；str：連對次數；g：最後一次評分；m：顯示用資料 {jp,kana,romaji,zh,hint,emoji,source,lv}
   「不會清單」＝ star 或 lapses>ack 的項目（Tracker 是它的檢視）。
   依賴：core.js（App）；選用 KANA、SCENES、MIND、WORLD、BIZ。
   ========================================================= */
(function () {
  'use strict';
  const DAY = 864e5;
  const ST_ORDER = { new: 0, learning: 1, review: 2, mastered: 3 };
  const S = () => App.state;
  const L = () => { const st = S(); if (!st.learn || typeof st.learn !== 'object' || Array.isArray(st.learn)) st.learn = {}; return st.learn; };
  const G = n => { try { return window[n] !== undefined ? window[n] : (0, eval)('typeof ' + n + '!=="undefined"?' + n + ':undefined'); } catch (e) { return undefined; } };

  /* ---------------- id 轉換 ---------------- */
  const jp0 = s => (String(s || '').split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || String(s || '');
  const normP = s => String(s || '').replace(/[\s　]+/g, '').replace(/[。．.！!？?…]+$/, '');
  const GA = id => { const A = window.MIND && MIND.GALIAS; return (A && A[id]) || id; };
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  function lexRow(lv, i) { const a = window.MIND && MIND.lex && MIND.lex[lv]; return a ? a[+i] || null : null; }
  function gramOfLv(lv, i) { const g = window.MIND && MIND.gram; return g ? g.filter(x => x.lv === lv)[+i] || null : null; }
  // 來源物件或舊 id → 新 id；無法解析（例如索引類但詞庫未載入）回傳 null
  function idOf(x, type) {
    if (x == null) return null;
    if (typeof x === 'object') {
      if (type === 'chal') {   // {L, kind:'w'|'g', i}：挑戰舊索引，用當下詞庫查回
        if (x.kind === 'w') { const r = lexRow(x.L, x.i); return r ? 'v:' + jp0(r[0]) : null; }
        const g = gramOfLv(x.L, x.i); return g ? 'g:' + GA(g.id).replace(/^gram:/, '') : null;
      }
      if (x.id) return idOf(x.id);
      if (!x.jp) return null;
      if (type === 'kana') return 'kana:' + String(x.kana || x.jp).split('・')[0];
      if (type === 'phrase' || type === 'p') return 'p:' + normP(x.jp);
      if (type === 'grammar' || type === 'g') return 'g:' + String(x.pat || x.jp);
      return 'v:' + jp0(x.jp);
    }
    const s = String(x);
    if (/^(kana|v|p|g|word|phrase|gram|w|num|cnt|cj|adj|idiom|proverb):/.test(s)) type = null;
    if (type === 'vocab' || type === 'v') return 'v:' + jp0(s);
    if (type === 'phrase' || type === 'p') return 'p:' + normP(s);
    if (type === 'grammar' || type === 'g') return 'g:' + s.replace(/^gram:/, '');
    if (type === 'kana') return 'kana:' + s;
    const i = s.indexOf(':'); if (i < 0) return s;
    const pre = s.slice(0, i), rest = s.slice(i + 1);
    switch (pre) {
      case 'v': case 'p': case 'g': case 'kana': return s;
      case 'word': case 'adj': return 'v:' + jp0(rest);
      case 'phrase': case 'idiom': case 'proverb': return 'p:' + normP(rest);
      case 'gram': return 'g:' + GA(s).replace(/^gram:/, '');
      case 'w': { const p = rest.split(':'); const r = lexRow(p[0], p[1]); return r ? 'v:' + jp0(r[0]) : null; }
      default: return s;
    }
  }
  // 新 id → 知識庫 id（g:→gram:；v:→w:Lv:i 需詞庫已載入）
  const vIndex = {};
  function kbIdOf(id) {
    if (!id) return null;
    if (id.startsWith('g:')) return 'gram:' + id.slice(2);
    if (id.startsWith('cj:')) return id;
    if (id.startsWith('v:')) {
      const jp = id.slice(2), lex = (window.MIND && MIND.lex) || {};
      for (const lv of LVS) {
        const a = lex[lv]; if (!a) continue;
        if (!vIndex[lv] || vIndex[lv].n !== a.length) { const m = new Map(); a.forEach((r, i) => { const k = jp0(r[0]); if (!m.has(k)) m.set(k, i); }); vIndex[lv] = { n: a.length, m }; }
        const i = vIndex[lv].m.get(jp); if (i != null) return 'w:' + lv + ':' + i;
      }
    }
    return null;
  }

  /* ---------------- 排程（FSRS-lite） ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const stOfStab = st => st >= 6 ? 'mastered' : st >= 2 ? 'review' : 'learning';
  const META = ['jp', 'kana', 'romaji', 'zh', 'hint', 'emoji', 'source', 'lv'];
  function putMeta(e, it) {
    if (!it || typeof it !== 'object') return;
    const m = e.m || (e.m = {});
    META.forEach(k => { const v = it[k]; if (v != null && v !== '' && (m[k] == null || m[k] === '' || k === 'source')) m[k] = String(v); });
  }
  function blank(src) { return { s: 'new', due: 0, stab: 0, diff: 5, reps: 0, lapses: 0, last: 0, src: src || '' }; }
  function ensure(id, ctx) {
    const LL = L(); let e = LL[id];
    if (!e) e = LL[id] = blank(ctx && ctx.src);
    if (ctx && ctx.item) putMeta(e, ctx.item);
    if (ctx && ctx.lv && !(e.m && e.m.lv)) putMeta(e, { lv: ctx.lv });
    return e;
  }
  const emit = (id, e) => { try { document.dispatchEvent(new CustomEvent('learnchange', { detail: { id, e } })); } catch (er) { } };
  // grade：0 忘了／答錯、1 困難、2 普通／答對、3 簡單；ctx.retryAt（答錯時的到期時間，毫秒）
  function record(id, grade, ctx) {
    ctx = ctx || {};
    id = idOf(id, ctx.type); if (!id) return null;
    const e = ensure(id, ctx), now = Date.now(), g = clamp(Math.round(+grade || 0), 0, 3);
    e.reps++; e.g = g;
    if (g === 0) {
      e.lapses++; e.str = 0;
      e.stab = Math.max(0.2, (e.stab || 0) * 0.3);
      e.diff = clamp((e.diff || 5) + 1.5, 1, 10);
      e.due = ctx.retryAt > now ? ctx.retryAt : 0; e.s = 'learning';   // retryAt：今日課答錯不當下到期，排到明天
    } else {
      if (!e.stab || e.s === 'new') e.stab = Math.max(e.stab || 0, [0, 0.6, 1, 3][g]);
      else {
        const mult = [0, 1.2, 2.5, 3.5][g] * (1 + (5 - (e.diff || 5)) * 0.05);
        e.stab = Math.max(e.stab + [0, 0.2, 0.5, 1][g], e.stab * mult);
      }
      e.diff = clamp((e.diff || 5) - (g - 2) * 0.8, 1, 10);
      e.str = (e.str || 0) + 1;
      e.due = now + Math.max(0.02, e.stab) * DAY - (e.stab >= 1 ? 36e5 : 0);
      e.s = stOfStab(e.stab);
    }
    e.last = now; if (ctx.src) e.src = ctx.src;
    if (!ctx.nosave) App.save();
    emit(id, e);
    return e;
  }
  // 手動設定狀態（知識庫三態）：'new'｜'learning'｜'review'｜'mastered'
  function setStatus(id, s, ctx) {
    ctx = ctx || {};
    id = idOf(id, ctx.type); if (!id || !(s in ST_ORDER)) return null;
    if (s === 'new' && !L()[id] && !ctx.item) return null;
    const e = ensure(id, ctx), now = Date.now();
    e.s = s;
    if (s === 'new') { e.stab = 0; e.due = 0; e.str = 0; }
    else if (s === 'learning') { e.stab = Math.min(e.stab || 1, 1.5); e.due = now; }
    else if (s === 'review') { e.stab = clamp(e.stab || 3, 2, 5.9); e.due = now + e.stab * DAY; e.last = e.last || now; }
    else { e.stab = Math.max(e.stab || 0, 7); e.due = now + e.stab * DAY; e.last = e.last || now; }
    if (ctx.src) e.src = ctx.src;
    if (!ctx.nosave) App.save();
    emit(id, e);
    return e;
  }
  const get = id => { id = idOf(id); return id ? L()[id] || null : null; };
  const status = id => { const e = get(id); return e ? e.s : 'new'; };
  const atLeast = (id, s) => ST_ORDER[status(id)] >= ST_ORDER[s];
  function star(id, on, ctx) {
    ctx = ctx || {};
    id = idOf(id, ctx.type); if (!id) return null;
    const LL = L();
    if (on === false) { const e = LL[id]; if (!e) return null; delete e.star; e.ack = e.lapses || 0; App.save(); emit(id, e); return e; }
    const e = ensure(id, ctx);
    e.star = 1; delete e.ack; if (!e.add) e.add = Date.now();
    if (e.s === 'new' || e.s === 'mastered') { e.s = 'learning'; e.due = 0; e.str = 0; if (e.stab >= 2) e.stab = 1.5; }
    if (!ctx.nosave) App.save();
    emit(id, e);
    return e;
  }
  function fav(id, on, ctx) {
    id = idOf(id, ctx && ctx.type); if (!id) return null;
    const e = on === false ? L()[id] : ensure(id, ctx); if (!e) return null;
    if (on === false) delete e.fav; else e.fav = 1;
    App.save(); emit(id, e); return e;
  }
  const inList = e => !!e && (!!e.star || (e.lapses || 0) > (e.ack || 0));
  const isDue = (e, now) => e.s !== 'new' && (e.reps > 0 || e.star || e.lapses) && (e.due || 0) <= now;
  function due(n) {
    const now = Date.now(), LL = L();
    const ids = Object.keys(LL).filter(id => isDue(LL[id], now)).sort((a, b) => (LL[a].due || 0) - (LL[b].due || 0) || (LL[b].lapses || 0) - (LL[a].lapses || 0));
    return n ? ids.slice(0, n) : ids;
  }

  /* ---------------- 顯示資料（Tracker 檢視） ---------------- */
  function metaOf(id) {
    const e = L()[id], m = Object.assign({}, e && e.m);
    if (!m.jp) {
      const rest = id.slice(id.indexOf(':') + 1);
      if (id.startsWith('kana:')) { const K = G('BY_HIRA'), k = K && K[rest]; if (k) Object.assign(m, { jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', emoji: k[4], source: m.source || '五十音' }); else m.jp = rest; }
      else if (id.startsWith('g:')) { m.jp = rest; const g = window.MIND && MIND.gram && MIND.gram.find(x => x.id === 'gram:' + rest); if (g) { m.zh = m.zh || g.zh; m.lv = m.lv || g.lv; } m.source = m.source || '📐 文法'; }
      else m.jp = rest;
    }
    return m;
  }
  const SRC_NAME = { chal: '🏆 挑戰', card: '🎴 字卡', kb: '📚 知識庫', world: '🗾 冒險', review: '📌 複習', mind: '📚 知識庫' };
  function view(id) {
    id = idOf(id); if (!id) return null;
    const e = L()[id]; if (!e) return null;
    const m = metaOf(id);
    return {
      id, jp: m.jp || '', kana: m.kana || '', romaji: m.romaji || '', zh: m.zh || '', hint: m.hint || '', emoji: m.emoji || '',
      source: m.source || SRC_NAME[e.src] || '其他', lv: m.lv || '',
      added: e.add || e.last || 0, seen: e.last || 0, right: Math.max(0, (e.reps || 0) - (e.lapses || 0)), wrong: e.lapses || 0,
      streak: e.str || 0, mastered: e.s === 'mastered', due: e.due || 0, s: e.s, inList: inList(e), star: !!e.star
    };
  }
  const views = filter => { const LL = L(); return Object.keys(LL).filter(id => !filter || filter(LL[id], id)).map(view); };

  /* ---------------- 統計 ---------------- */
  function stats(opt) {
    opt = opt || {};
    const now = Date.now(), LL = L(), o = { total: 0, new: 0, learning: 0, review: 0, mastered: 0, due: 0, list: 0, known: 0 };
    for (const id in LL) {
      const e = LL[id];
      if (opt.type && !id.startsWith(opt.type + ':')) continue;
      if (opt.lv && !(e.m && e.m.lv === opt.lv)) continue;
      o.total++; o[e.s] = (o[e.s] || 0) + 1;
      if (isDue(e, now)) o.due++;
      if (inList(e) && e.s !== 'mastered') o.list++;
      if (ST_ORDER[e.s] >= 2) o.known++;
    }
    return o;
  }

  /* ---------------- 今日課 queue ---------------- */
  const lvKey = () => { let p = 'zero'; try { p = App.profile().lv; } catch (e) { } return p === 'zero' ? 'N5' : String(p).toUpperCase(); };
  const isFresh = id => { const e = L()[id]; return !e || (e.s === 'new' && !e.reps); };
  const arr = a => Array.isArray(a) ? a : [];
  // 已學平假名（清音 46）：Learn 的 kana: 有作答或非 new，加上舊課程 kanaL.h；首頁與手冊共用
  const SEION = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
  function kanaLearned() {
    const LL = L(), out = new Set(((S().kanaL || {}).h || []).filter(c => SEION.includes(c)));
    for (const c of SEION) { const e = LL['kana:' + c]; if (e && (e.reps || e.s !== 'new')) out.add(c); }
    return [...SEION].filter(c => out.has(c));
  }
  function kanaFresh(n) {
    const K = G('KANA') || [], kl = new Set(kanaLearned());
    return K.filter(k => !kl.has(k[0]) && isFresh('kana:' + k[0])).slice(0, n).map(k => ({ id: 'kana:' + k[0], type: 'kana', jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', emoji: k[4], source: '五十音' }));
  }
  function travelFresh(n, lv) {
    const out = [], seen = new Set();
    const push = (w, t, src, ex) => {
      if (!w || !w.jp || out.length >= n) return;
      const id = idOf(w, t); if (seen.has(id) || !isFresh(id)) return; seen.add(id);
      out.push(Object.assign({ id, type: t === 'phrase' ? 'phrase' : 'vocab', jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh || '', hint: w.hint || '', emoji: w.emoji || '', source: src }, ex));
    };
    if (lv === 'zero') { const k = kanaFresh(n); if (k.length) return k; }
    return sceneFresh(n, lv, push, out);
  }
  // 零基礎＋旅遊：學滿 10 個假名後，每堂課混入 2–3 句旅遊必備句（短句、附讀音與羅馬字）
  function kanaMix(n) {
    const out = kanaFresh(n);
    let goals = []; try { goals = App.profile().goals || []; } catch (e) { }
    if (!goals.includes('travel') || kanaLearned().length < 10) return out;
    const k = out.length >= n ? 2 : 3, ph = [];
    for (const s of arr(G('SCENES'))) for (const w of arr(s.phrases)) {
      if (ph.length >= k) break;
      if (!w || !w.jp || !w.kana || String(w.jp).length > 10) continue;
      const id = idOf(w, 'phrase'); if (!isFresh(id) || ph.some(x => x.id === id)) continue;
      ph.push({ id, type: 'phrase', jp: w.jp, kana: w.kana, romaji: w.romaji || '', zh: w.zh || '', hint: w.use || w.hint || '', source: '🧳 旅遊必備句・' + s.name });
    }
    return out.concat(ph);
  }
  function sceneFresh(n, lv, push, out) {
    const sc = arr(G('SCENES'));
    const phraseFirst = ['n4', 'n3', 'n2', 'n1'].includes(lv);
    const order = phraseFirst ? ['phrases', 'vocab'] : ['vocab', 'phrases'];
    for (const k of order) for (const s of sc) { arr(s[k]).forEach(w => push(w, k === 'vocab' ? 'vocab' : 'phrase', s.name)); if (out.length >= n) return out; }
    const W = window.WORLD;
    if (W && W.shops) for (const sid in W.shops) { arr(W.shops[sid].items).forEach(it => push(it, 'vocab', W.shops[sid].name || '冒險')); if (out.length >= n) break; }
    return out;
  }
  function examFresh(n) {
    const Lv = lvKey(), M = window.MIND, out = [];
    if (!M) return out;
    const half = Math.ceil(n / 2);
    arr(M.gram).filter(g => g.lv === Lv).sort((a, b) => (a.ord || 0) - (b.ord || 0)).some(g => {
      const id = 'g:' + g.id.replace(/^gram:/, '');
      if (isFresh(id)) out.push({ id, type: 'grammar', jp: g.pat, kana: '', zh: g.zh, hint: g.conn ? '接續：' + g.conn : '', lv: g.lv, source: '📐 文法 ' + g.lv });
      return out.length >= Math.min(half, 3);
    });
    const lex = M.lex && M.lex[Lv];
    if (lex) for (const r of lex.filter(r => r[7]).concat(lex.filter(r => !r[7]))) {
      if (out.length >= n) break;
      const id = 'v:' + jp0(r[0]); if (!isFresh(id) || out.some(o => o.id === id)) continue;
      out.push({ id, type: 'vocab', jp: jp0(r[0]), kana: (r[1] || '').replace(/\s*[（(].*?[）)]/g, '') || jp0(r[0]), zh: r[2] || '', lv: Lv, source: 'JLPT ' + Lv });
    }
    return out.slice(0, n);
  }
  // 歌曲新聞：先用閱讀／歌曲收進來還沒學的詞 → 最後播放（或最近存的）那首歌的歌詞詞彙 → 今日短文的句子 → 同級其他短文；不用旅遊句補位
  function dailyPick() { let lv = 'zero'; try { lv = App.profile().lv; } catch (e) { } const R = window.READING; return R && typeof R.pick === 'function' ? R.pick(lv, App.today()) : null; }
  let SONG = null;   // prepare('fun') 時從 App.idb 讀出的歌：{id, title, lines:[{jp,zh}]}
  function loadSong() {
    const I = App.idb; if (!I) return Promise.resolve(null);
    const last = S().songLast;
    return (last && last.id ? Promise.resolve(last.id) : I.get('songs:index').then(a => Array.isArray(a) && a[0] ? a[0].id : null))
      .then(id => id ? I.get('song:' + id) : null)
      .then(s => (SONG = s && Array.isArray(s.lines) && s.lines.length ? { id: s.id, title: s.title || '', lines: s.lines } : null))
      .catch(() => (SONG = null));
  }
  const POS_OK = /^(n|v|i|na|adv)$/;
  function songWords(n) {
    const J = window.JPText, out = [];
    if (!SONG || !J || typeof J.tokenize !== 'function' || !J.size) return out;
    for (const l of SONG.lines) {
      const jp = String(l.jp || '').trim(); if (!jp || jp.length > 40) continue;
      let tk = []; try { tk = J.tokenize(jp); } catch (e) { }
      for (const t of tk) {
        if (out.length >= n) return out;
        if (!t.known || !t.zh || !POS_OK.test(t.pos || '') || String(t.base).length < 2) continue;
        const id = 'v:' + jp0(t.base); if (!isFresh(id) || out.some(x => x.id === id)) continue;
        out.push({ id, type: 'vocab', jp: t.base, kana: t.bkana || '', zh: String(t.zh).split(/[；;]/)[0], lv: t.lv || '', ex: [jp, l.zh || ''], source: '🎵 歌詞：' + SONG.title });
      }
    }
    return out;
  }
  function funFresh(n) {
    const LL = L(), out = [];
    for (const id in LL) {
      const e = LL[id], src = (e.m && e.m.source) || e.src || '';
      if (!e.reps && /歌|song|閱讀|文章|read|新聞|📰|🎵/.test(src)) { const v = view(id); v.type = id.startsWith('p:') ? 'phrase' : 'vocab'; out.push(v); }
      if (out.length >= n) break;
    }
    if (out.length < n) songWords(Math.min(n - out.length, Math.ceil(n / 2))).forEach(x => out.push(x));
    const R = window.READING, a = dailyPick();
    let lv = 'zero'; try { lv = App.profile().lv; } catch (e) { }
    const arts = a ? [a] : [];
    if (R && Array.isArray(R.daily)) R.daily.filter(x => x.lv === (a ? a.lv : lv) && x !== a).forEach(x => arts.push(x));
    for (const art of arts) {
      if (out.length >= n) break;
      (art.p || []).forEach(([jp, zh]) => {
        if (out.length >= n || !jp || jp.length > 60) return;
        const id = idOf({ jp }, 'phrase');
        if (!id || !isFresh(id) || out.some(x => x.id === id)) return;
        out.push({ id, type: 'phrase', jp, kana: /^[ぁ-ゖァ-ヺー、。！？「」\s]+$/.test(jp) ? jp : '', zh, source: '📰 ' + (art === a ? '今日短文' : '短文') + '：' + art.title });
      });
    }
    return out.slice(0, n);
  }
  function bizList() {
    const B = window.BIZ; if (!B) return [];
    if (Array.isArray(B)) return B;
    if (Array.isArray(B.items)) return B.items;
    const o = []; Object.keys(B).forEach(k => { const v = B[k]; if (Array.isArray(v)) o.push(...v); else if (v && Array.isArray(v.items)) o.push(...v.items); });
    return o;
  }
  function workFresh(n) {
    const out = [];
    bizList().some(x => {
      if (!x || !x.jp) return false;
      const t = x.type === 'grammar' ? 'grammar' : x.type === 'vocab' || x.type === 'word' ? 'vocab' : x.type === 'phrase' ? 'phrase' : (String(x.jp).length > 6 ? 'phrase' : 'vocab');
      const id = x.id && /^(v|p|g):/.test(x.id) ? x.id : idOf(x, t);
      if (isFresh(id)) out.push({ id, type: t, jp: x.jp, kana: x.kana || '', romaji: x.romaji || '', zh: x.zh || '', hint: x.hint || x.note || '', emoji: x.emoji || '', lv: x.lv || '', source: x.source || '💼 商務' });
      return out.length >= n;
    });
    return out;
  }
  const APPLY = {
    travel: () => ({ route: 'play', params: {}, label: '到冒險店家用出來' }),
    exam: () => ({ route: 'challenge-play', params: { lv: lvKey(), t: 'mix' }, label: lvKey() + ' 綜合 10 題' }),
    // 歌曲新聞：依日期輪替「唱一首歌（最後那首，沒有就熱門精選）」與「讀一篇短文」
    fun: () => {
      const a = dailyPick(), odd = Math.floor(Date.parse(App.today()) / DAY) % 2, last = S().songLast;
      const song = last && last.id ? { route: 'song', params: { id: last.id }, label: '唱一首歌：' + (last.title || '上次那首') } : { route: 'songs', params: {}, label: '唱一首歌：熱門精選第一首' };
      return odd || !a ? song : { route: 'read-article', params: { daily: a.id }, label: '讀一篇短文：' + a.title };
    },
    work: () => ({ route: 'biz', params: {}, label: '商務情境練習' })
  };
  function queue(goal) {
    let p = { lv: 'zero', goals: ['travel'] }; try { p = App.profile(); } catch (e) { }
    goal = goal || (p.goals && p.goals[0]) || 'travel';
    const n = ['n3', 'n2', 'n1'].includes(p.lv) ? 8 : p.lv === 'zero' ? 5 : 6;
    const fresh = goal === 'exam' ? examFresh(n) : goal === 'work' ? workFresh(n) : goal === 'fun' ? funFresh(n) : goal === 'kana' ? kanaMix(n) : travelFresh(n, p.lv);
    return { goal, due: due(15).map(view), fresh, apply: (APPLY[goal] || APPLY.travel)() };
  }
  // 需要的內容先載入（日檢：文法＋當級詞庫）再回傳 queue
  function prepare(goal) {
    let p = { goals: ['travel'] }; try { p = App.profile(); } catch (e) { }
    goal = goal || (p.goals && p.goals[0]) || 'travel';
    const src = goal === 'exam' ? ['data/mind/grammar.js', 'data/mind/lex-' + lvKey().toLowerCase() + '.js'] : goal === 'fun' ? ['data/reading/daily.js'] : [];
    let pr = src.reduce((pr, s) => pr.then(() => App.loadScript(s)), Promise.resolve()).catch(() => { });
    // 歌曲新聞：有存歌就讀歌詞，載入斷詞（JPText）取歌詞裡的詞
    if (goal === 'fun') pr = pr.then(loadSong).then(s => s ? App.loadScript('js/jp-text.js').then(() => window.JPText && JPText.ready()) : 0).catch(() => { });
    return pr.then(() => queue(goal));
  }

  /* ---------------- 知識庫狀態相容層（取代 localStorage jpq.mind.v1） ----------------
     Learn.mindST() 回傳與舊 ST 相同形狀的物件：learned／ing／fav 由 Learn 計算，done／best／toured／recent 存 App.state.mind */
  const mindData = () => { const st = S(); if (!st.mind || typeof st.mind !== 'object') st.mind = {}; const m = st.mind; m.done = m.done || {}; m.recent = Array.isArray(m.recent) ? m.recent : []; m.best = m.best || 0; return m; };
  function flagProxy(kind) {
    const test = e => !e ? false : kind === 'learned' ? ST_ORDER[e.s] >= 2 : kind === 'ing' ? e.s === 'learning' : !!e.fav;
    const keys = () => { const LL = L(), o = []; for (const id in LL) if (test(LL[id])) { const k = kbIdOf(id); if (k) o.push(k); } return o; };
    return new Proxy({}, {
      get(t, k) { if (typeof k !== 'string') return undefined; if (k === 'toJSON') return () => Object.fromEntries(keys().map(x => [x, 1])); const id = idOf(k); return id && test(L()[id]) ? 1 : undefined; },
      has(t, k) { const id = typeof k === 'string' && idOf(k); return !!(id && test(L()[id])); },
      set(t, k, v) {
        const id = idOf(k); if (!id) return true;
        if (kind === 'fav') { fav(id, !!v, { src: 'kb', item: kbItem(k) }); return true; }
        if (!v) return this.deleteProperty(t, k);
        const e = L()[id]; if (test(e)) return true;
        setStatus(id, kind === 'learned' ? 'review' : 'learning', { src: 'kb', item: kbItem(k) });
        return true;
      },
      deleteProperty(t, k) {
        const id = idOf(k); if (!id) return true; const e = L()[id];
        if (kind === 'fav') { if (e && e.fav) fav(id, false); return true; }
        if (test(e)) setStatus(id, 'new', { src: 'kb' });
        return true;
      },
      ownKeys() { return keys(); },
      getOwnPropertyDescriptor(t, k) { const id = idOf(k); return id && test(L()[id]) ? { value: 1, writable: true, enumerable: true, configurable: true } : undefined; }
    });
  }
  // 知識庫 id → 顯示資料（給 Learn 存 m）
  function kbItem(k) {
    if (!k) return null;
    if (k.startsWith('w:')) { const p = k.split(':'), r = lexRow(p[1], p[2]); return r ? { jp: jp0(r[0]), kana: (r[1] || '').replace(/\s*[（(].*?[）)]/g, ''), zh: r[2] || '', lv: p[1], source: '知識庫 ' + p[1] } : null; }
    if (k.startsWith('gram:')) { const g = window.MIND && MIND.gram && MIND.gram.find(x => x.id === k); return g ? { jp: g.pat, zh: g.zh, lv: g.lv, source: '📐 文法' } : { jp: k.slice(5), source: '📐 文法' }; }
    return null;
  }
  let MST = null;
  function mindST() {
    if (MST) return MST;
    const P = { learned: flagProxy('learned'), ing: flagProxy('ing'), fav: flagProxy('fav') };
    MST = new Proxy({}, {
      get(t, k) { if (k in P) return P[k]; if (k === 'toJSON') return () => Object.assign({}, mindData(), { learned: P.learned.toJSON(), ing: P.ing.toJSON(), fav: P.fav.toJSON() }); return mindData()[k]; },
      set(t, k, v) { if (k in P) return true; mindData()[k] = v; return true; },
      has(t, k) { return k in P || k in mindData(); },
      deleteProperty(t, k) { if (!(k in P)) delete mindData()[k]; return true; },
      ownKeys() { return [...new Set(Object.keys(mindData()).concat(Object.keys(P)))]; },
      getOwnPropertyDescriptor(t, k) { return (k in P || k in mindData()) ? { value: this.get(t, k), writable: true, enumerable: true, configurable: true } : undefined; }
    });
    return MST;
  }

  /* ---------------- 遷移（只做一次，App.state.learnV） ---------------- */
  const LEARN_V = 1;
  const MK = 'jpq.mind.v1';
  function readMindLS() { try { const o = JSON.parse(localStorage.getItem(MK) || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
  // 把舊格式合併進 learn；不動 xp、cleared（星星）
  function migrate(st) {
    if (!st || (st.learnV || 0) >= LEARN_V) return false;
    if (!st.learn || typeof st.learn !== 'object' || Array.isArray(st.learn)) st.learn = {};
    const LL = st.learn, now = Date.now(), pend = [];
    const put = (id, o, meta) => {
      if (!id) return null;
      const e = LL[id] || (LL[id] = blank(o && o.src));
      if (meta) putMeta(e, meta);
      if (o) {
        if (o.s && ST_ORDER[o.s] > ST_ORDER[e.s]) { e.s = o.s; e.stab = Math.max(e.stab || 0, o.stab || 0); e.due = o.due != null ? o.due : e.due; e.last = Math.max(e.last || 0, o.last || 0); }
        ['reps', 'lapses'].forEach(k => { if (o[k]) e[k] = Math.max(e[k] || 0, o[k]); });
        if (o.star) e.star = 1; if (o.fav) e.fav = 1; if (o.g != null && e.g == null) e.g = o.g; if (o.str != null) e.str = Math.max(e.str || 0, o.str);
        if (o.add && !e.add) e.add = o.add;
      }
      return e;
    };
    const spread = d => now + d * DAY * (0.8 + Math.random() * 0.4);
    // 1. 不會清單 tracked
    (Array.isArray(st.tracked) ? st.tracked : []).forEach(t => {
      if (!t || !t.id) return;
      const id = idOf(t.id); if (!id) return;
      const sk = t.streak || 0, stab = t.mastered ? 7 : [0.3, 1, 2.5, 6.25][Math.min(3, sk)];
      put(id, { s: t.mastered ? 'mastered' : sk >= 2 ? 'review' : 'learning', stab, due: t.mastered ? spread(7) : (t.due || 0), last: t.seen || t.added || now, reps: (t.right || 0) + (t.wrong || 0), lapses: t.wrong || 0, star: 1, str: sk, add: t.added, src: 'review' }, t);
    });
    // 2. 字卡自評 cardDiff（3 困難、2 普通、1 簡單）
    const CD = st.cardDiff && typeof st.cardDiff === 'object' ? st.cardDiff : {};
    Object.keys(CD).forEach(k => {
      const v = +CD[k]; if (!v) return;
      const id = idOf(k); if (!id) return;
      const g = { 3: 0, 2: 2, 1: 3 }[v];
      const o = v === 3 ? { s: 'learning', stab: 0.3, due: 0, reps: 1, lapses: 1, g, src: 'card' } : v === 2 ? { s: 'learning', stab: 1, due: spread(1), reps: 1, g, src: 'card' } : { s: 'review', stab: 3, due: spread(3), reps: 1, g, src: 'card' };
      const e = put(id, o); if (e && e.g == null) e.g = g;
    });
    // 3. 挑戰已掌握 chal.m（索引類：詞庫載入後再轉，先放 learnPend）
    const CM = st.chal && st.chal.m && typeof st.chal.m === 'object' ? st.chal.m : {};
    Object.keys(CM).forEach(Lv => ['w', 'g'].forEach(kind => (Array.isArray(CM[Lv][kind]) ? CM[Lv][kind] : []).forEach(i => pend.push(['chal', Lv, kind, i]))));
    // 4. 知識庫 jpq.mind.v1（learned／ing／fav；w:Lv:i 需要詞庫）
    const MS = readMindLS();
    if (MS) {
      [['learned', 'review'], ['ing', 'learning'], ['fav', 'fav']].forEach(([k, s]) => Object.keys(MS[k] || {}).forEach(kid => {
        if (!MS[k][kid]) return;
        if (kid.startsWith('w:')) { pend.push(['kb', kid, s]); return; }
        const id = idOf(kid); if (!id) return;
        put(id, s === 'fav' ? { fav: 1 } : { s, stab: s === 'review' ? 3 : 1, due: s === 'review' ? spread(3) : now, last: now, src: 'kb' }, kbItem(kid) || (kid.startsWith('gram:') ? { jp: kid.slice(5), source: '📐 文法' } : null));
      }));
      const md = st.mind && typeof st.mind === 'object' ? st.mind : (st.mind = {});
      if (MS.done && !md.done) md.done = MS.done;
      if (MS.best && !md.best) md.best = MS.best;
      if (MS.toured && !md.toured) md.toured = MS.toured;
      if (Array.isArray(MS.recent) && !md.recent) md.recent = MS.recent;
    }
    // 5. 冒險句卡 world.cards
    const WC = st.world && st.world.cards && typeof st.world.cards === 'object' ? st.world.cards : {};
    Object.keys(WC).forEach(k => { const c = WC[k]; if (!c || !c.jp) return; put('p:' + normP(c.jp), { s: 'learning', stab: 1, due: spread(1), reps: 1, last: now, src: 'world' }, { jp: c.jp, kana: c.kana, zh: c.zh, source: '冒險句卡' }); });
    if (pend.length) st.learnPend = (Array.isArray(st.learnPend) ? st.learnPend : []).concat(pend);
    // 舊欄位移除（進度已在 learn）；world.cards 保留當句卡收藏冊
    delete st.tracked; delete st.cardDiff;
    if (st.chal && st.chal.m) delete st.chal.m;
    st.learnV = LEARN_V;
    return true;
  }
  // 索引類舊進度：載入需要的詞庫後轉成新 id（一次性）
  let pendBusy = null;
  function resolvePending() {
    const st = S(), P = Array.isArray(st.learnPend) ? st.learnPend : [];
    if (!P.length) { delete st.learnPend; return Promise.resolve(0); }
    if (pendBusy) return pendBusy;
    const lvs = new Set(); let needG = false;
    P.forEach(p => { if (p[0] === 'chal') { if (p[2] === 'w') lvs.add(p[1]); else needG = true; } else lvs.add(p[1].split(':')[1]); });
    const src = (needG ? ['data/mind/grammar.js'] : []).concat([...lvs].filter(l => LVS.includes(l)).map(l => 'data/mind/lex-' + l.toLowerCase() + '.js'));
    pendBusy = src.reduce((pr, s) => pr.then(() => App.loadScript(s)), Promise.resolve()).then(() => {
      const LL = L(), now = Date.now(), cur = Array.isArray(S().learnPend) ? S().learnPend : [];
      let n = 0;
      cur.forEach(p => {
        let id, s, meta;
        if (p[0] === 'chal') {
          id = idOf({ L: p[1], kind: p[2], i: p[3] }, 'chal'); s = 'review';
          if (p[2] === 'w') { const r = lexRow(p[1], p[3]); meta = r && { jp: jp0(r[0]), kana: (r[1] || '').replace(/\s*[（(].*?[）)]/g, ''), zh: r[2], lv: p[1], source: '🏆 挑戰 ' + p[1] }; }
          else { const g = gramOfLv(p[1], p[3]); meta = g && { jp: g.pat, zh: g.zh, lv: g.lv, source: '📐 文法' }; }
        } else { id = idOf(p[1]); s = p[2]; meta = kbItem(p[1]); }
        if (!id) return;
        const e = LL[id] || (LL[id] = blank(p[0]));
        if (meta) putMeta(e, meta);
        if (s === 'fav') e.fav = 1;
        else if (ST_ORDER[s] > ST_ORDER[e.s]) { e.s = s; e.stab = Math.max(e.stab || 0, s === 'review' ? 3 : 1); e.due = s === 'review' ? now + 3 * DAY * (0.8 + Math.random() * 0.4) : now; e.last = e.last || now; e.reps = e.reps || 1; }
        n++;
      });
      delete S().learnPend; App.save(); emit('*', null);
      return n;
    }).catch(() => 0).finally(() => { pendBusy = null; });
    return pendBusy;
  }

  /* ---------------- Tracker 匯入／匯出 ---------------- */
  function importList(list) {
    let n = 0;
    (Array.isArray(list) ? list : []).forEach(t => {
      if (!t || !t.id) return; const id = idOf(t.id); if (!id) return;
      const ex = L()[id]; if (ex && inList(ex)) return;
      star(id, true, { item: t, nosave: true, src: 'review' }); n++;
    });
    App.save(); return n;
  }

  /* ---------------- 啟動 ---------------- */
  // 存檔換掉（還原、雲端、IndexedDB 備援）時 core 會呼叫 migrate 鉤子
  if (App.onMigrate) App.onMigrate(migrate);
  else if (migrate(App.state)) App.save();
  // 有索引類舊進度 → 閒置時載詞庫轉換
  const kick = () => { if (Array.isArray(S().learnPend) && S().learnPend.length) resolvePending(); };
  setTimeout(kick, 2500);
  let kickT = null;
  App.onChange(() => { if (!kickT && !pendBusy && Array.isArray(S().learnPend) && S().learnPend.length) kickT = setTimeout(() => { kickT = null; kick(); }, 2500); });

  window.Learn = {
    idOf, kbIdOf, jp0, normP,
    record, setStatus, get, status, atLeast, star, fav, inList: id => inList(get(id)),
    due, queue, prepare, stats, view, views, kanaLearned,
    mindST, kbItem, resolvePending, migrate, importList,
    ORDER: ST_ORDER
  };
})();
