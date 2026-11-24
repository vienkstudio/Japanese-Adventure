// 知識庫（路由 kb、kb-page；舊 mind 轉址）：Notion 式資料庫，資料源 data/mind/*.js
// 依賴：data/mind/{taxonomy,conj,grammar}.js；詞彙 data/mind/lex-n*.js 用到才載入
(function () {
  'use strict';
  const M = window.MIND, esc = App.esc;
  const LV = M.LEVELS;
  const SCc = Object.fromEntries(M.SCENES.map(s => [s.id, s]));
  const KIND = { word: { name: '單字', icon: '📘' }, gram: { name: '文法', icon: '📗' }, conj: { name: '動詞變化', icon: '🔁' } };
  const ST_NAME = ['未學', '學習中', '已掌握'], ST_ICON = ['○', '◐', '●'];
  const TRAVEL = M.TRAVEL || ['trans', 'travel', 'food', 'shop', 'med'];
  const DESK = () => innerWidth >= 960;

  /* ---------------- 狀態：統一進度 Learn（App.state.learn；收藏、最近開啟在 App.state.mind） ----------------
     M.ST 保留舊形狀給 3D／任務用：ST.learned／ing／fav 由 Learn 計算，done／best／recent 存 App.state.mind（跟著備份） */
  const ST = M.ST = Learn.mindST();
  const saveST = () => App.save();
  // 文法重複條目已合併：learned／ing／fav 由 Learn.idOf 依 GALIAS 對應；最近開啟清單直接換 id
  (() => { const A = M.GALIAS || {}; if (ST.recent.some(id => A[id])) { ST.recent = [...new Set(ST.recent.map(id => A[id] || id))]; saveST(); } })();
  const ST_ID = ['new', 'learning', 'review'];
  const stOf = id => { const s = Learn.status(id); return s === 'review' || s === 'mastered' ? 2 : s === 'learning' ? 1 : 0; };
  function setSt(id, s, nosave) { if (stOf(id) === s) return; Learn.setStatus(id, ST_ID[s], { src: 'kb', item: Learn.kbItem(id), nosave }); }
  function touch(id) { ST.recent = [id].concat(ST.recent.filter(x => x !== id)).slice(0, 40); saveST(); }
  const PK = 'jpq.kb.v1';
  const PR = (() => { try { return JSON.parse(App.store.get(PK) || '{}'); } catch (e) { return {}; } })();
  PR.v = PR.v || {}; PR.grp = PR.grp || {};
  const savePR = () => App.store.set(PK, JSON.stringify(PR));
  const defV = kind => ({ view: 'list', sort: 'ord', group: kind === 'gram' ? 'cat' : 'sc', f: {} });
  const VS = kind => (PR.v[kind] = Object.assign(defV(kind), PR.v[kind] || {}));

  function profLv() {
    let p = null; try { p = App.profile && App.profile(); } catch (e) { }
    const l = String((p && p.lv) || 'zero').toUpperCase();
    return LV.includes(l) ? l : 'N5';
  }

  /* ---------------- 資料 → Item ---------------- */
  const jp0 = s => window.Learn && Learn.jp0 ? Learn.jp0(s) : (String(s).split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || s;   // 全站同一份清理（js/learn.js lexForm）
  const WORDS = {};
  function words(lv) {
    if (WORDS[lv]) return WORDS[lv];
    const raw = M.lex && M.lex[lv]; if (!raw) return null;
    return (WORDS[lv] = raw.map((a, i) => {
      const kana = (a[1] || '').replace(/\s*[（(].*?[）)]/g, '');
      return { id: 'w:' + lv + ':' + i, kind: 'word', lv, ord: i, raw: a[0], jp: jp0(a[0]), kana: kana || jp0(a[0]), zh: a[2] || '', pos: a[3], grp: a[4], sc: String(a[6] || 'abs').split(','), core: !!a[7] };
    }));
  }
  const loadLv = lv => words(lv) ? Promise.resolve(words(lv)) : App.loadScript('data/mind/lex-' + lv.toLowerCase() + '.js').then(() => words(lv));
  const loadLvs = lvs => Promise.all(lvs.map(loadLv));
  const GRAM = M.gram.map(g => ({ id: g.id, kind: 'gram', lv: g.lv, ord: g.ord, jp: g.pat, kana: '', zh: g.zh, cat: g.cat, ref: g }));
  const G_BY = new Map(GRAM.map(g => [g.id, g]));
  const POST = new Map(); M.gram.forEach(g => g.pre.forEach(p => { if (!POST.has(p)) POST.set(p, []); POST.get(p).push(g.id); }));
  const BYCONJ = {}; M.gram.forEach(g => (g.conj || []).forEach(c => (BYCONJ[c] = BYCONJ[c] || []).push(g.id)));
  const CONJ = M.CONJ.map((c, i) => ({ id: 'cj:' + c.id, kind: 'conj', lv: '', ord: i, jp: c.name, kana: '', zh: c.rule, ref: c }));
  const C_BY = new Map(CONJ.map(c => [c.id, c]));
  function getItem(id) {
    if (!id) return null;
    if (id.startsWith('w:')) { const p = id.split(':'); const ws = words(p[1]); return ws ? ws[+p[2]] || null : null; }
    if (id.startsWith('gram:')) return G_BY.get(id) || null;
    if (id.startsWith('cj:')) return C_BY.get(id) || null;
    return null;
  }
  const needFor = id => id && id.startsWith('w:') ? loadLv(id.split(':')[1]) : Promise.resolve();
  const romaji = k => { try { if (!/^[ぁ-ゟ゠-ヿー・\s]+$/.test(k)) return ''; if (window.Phrase && Phrase.romaji) return Phrase.romaji(k); return window.ReviewAPI ? ReviewAPI.kanaToRomaji(k) : ''; } catch (e) { return ''; } };
  const isVerb = w => w.pos === 'v' || w.grp === 's';
  const trackItem = it => it.kind === 'word' ? { id: 'word:' + it.jp, jp: it.jp, kana: it.kana, zh: it.zh, source: '知識庫 ' + it.lv }
    : { id: 'gram:' + it.jp, jp: it.jp, zh: it.zh, source: '知識庫 ' + (it.lv || '') + ' 文法' };

  /* ---------------- 篩選／排序／分組 ---------------- */
  const has = (a, v) => Array.isArray(a) && a.length && a.includes(v);
  function filterList(list, f, kind) {
    const q = (f.q || '').trim().toLowerCase();
    return list.filter(it => {
      if (f.lv && f.lv.length && !f.lv.includes(it.lv)) return false;
      if (f.st && f.st.length && !f.st.includes(stOf(it.id))) return false;
      if (f.fav && !ST.fav[it.id]) return false;
      if (kind === 'word') {
        if (f.pos && f.pos.length && !f.pos.includes(it.pos)) return false;
        if (f.sc && f.sc.length && !it.sc.some(s => f.sc.includes(s))) return false;
        if (f.core && !it.core) return false;
        if (f.travel && !it.sc.some(s => TRAVEL.includes(s))) return false;
      } else if (kind === 'gram') {
        if (f.cat && f.cat.length && !f.cat.includes(it.cat)) return false;
      }
      if (q) {
        if (it.jp.toLowerCase().includes(q) || it.kana.includes(q) || it.zh.includes(q)) return true;
        if (/^[a-z]+$/.test(q) && it.kind === 'word') return (it._ro || (it._ro = romaji(it.kana))).includes(q);
        return false;
      }
      return true;
    });
  }
  const LVI = Object.fromEntries(LV.map((l, i) => [l, i]));
  function sortList(list, sort, dir) {
    const a = list.slice(), d = dir === -1 ? -1 : 1;
    const rIdx = id => { const i = ST.recent.indexOf(id); return i < 0 ? 999 : i; };
    const k = {
      ord: x => (LVI[x.lv] || 0) * 1e5 + x.ord,
      kana: x => x.kana || x.jp, jp: x => x.jp, zh: x => x.zh,
      lv: x => (LVI[x.lv] || 0) * 1e5 + x.ord, st: x => -stOf(x.id) * 1e5 + x.ord,
      recent: x => rIdx(x.id) * 1e5 + x.ord,
      grp: x => x.kind === 'gram' ? x.cat : (SCc[x.sc[0]] ? SCc[x.sc[0]].name : '')
    }[sort] || (x => x.ord);
    const str = sort === 'kana' || sort === 'jp' || sort === 'zh' || sort === 'grp';
    a.sort((x, y) => { const p = k(x), q = k(y); return d * (str ? String(p).localeCompare(String(q), 'ja') : p - q); });
    return a;
  }
  const SC_ORDER = Object.fromEntries(M.SCENES.map((s, i) => [s.id, s.id === 'abs' ? 999 : i]));
  const CAT_ORDER = Object.fromEntries(M.GCAT.map((c, i) => [c, c === '其他' ? 999 : i]));
  function groupList(list, by, kind) {
    if (by === 'none') return [{ key: 'all', name: '全部', icon: '', items: list }];
    const m = new Map();
    const keyOf = it => by === 'sc' ? it.sc[0] : by === 'cat' ? it.cat : by === 'st' ? String(stOf(it.id)) : by === 'pos' ? it.pos || '-' : by === 'lv' ? it.lv : 'all';
    list.forEach(it => { const k = keyOf(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); });
    const out = [...m.entries()].map(([k, items]) => {
      let name = k, icon = '';
      if (by === 'sc') { name = SCc[k] ? SCc[k].name : k; icon = SCc[k] ? SCc[k].icon : ''; }
      else if (by === 'st') { name = ST_NAME[+k]; icon = ST_ICON[+k]; }
      else if (by === 'pos') name = M.POS[k] || '其他';
      return { key: by + ':' + k, k, name, icon, items };
    });
    const ord = g => by === 'sc' ? (SC_ORDER[g.k] ?? 500) : by === 'cat' ? (CAT_ORDER[g.k] ?? 500) : by === 'lv' ? LVI[g.k] : by === 'st' ? +g.k : by === 'pos' ? Object.keys(M.POS).indexOf(g.k) : 0;
    return out.sort((a, b) => ord(a) - ord(b));
  }

  /* ---------------- 共用片段 ---------------- */
  const lvB = lv => lv ? `<span class="kb-lv ${lv.toLowerCase()}">${lv}</span>` : '';
  const sayB = (t, sm) => `<button type="button" class="kb-ib${sm ? ' sm' : ''}" data-say="${esc(t)}" aria-label="發音">🔊</button>`;
  const favB = id => `<button type="button" class="kb-ib kb-fav${ST.fav[id] ? ' on' : ''}" data-fav="${esc(id)}" aria-label="收藏">${ST.fav[id] ? '★' : '☆'}</button>`;
  const stB = id => { const s = stOf(id); return `<button type="button" class="kb-ib kb-st s${s}" data-st="${esc(id)}" aria-label="狀態：${ST_NAME[s]}" title="${ST_NAME[s]}（點擊切換）">${ST_ICON[s]}</button>`; };
  const bar = (n, t) => `<span class="kb-bar"><i style="width:${t ? Math.round(n / t * 100) : 0}%"></i></span>`;
  const relChip = id => { const it = getItem(id); return it ? `<button type="button" class="kb-rel${ST.learned[id] ? ' done' : ''}" data-open="${esc(id)}">${ST.learned[id] ? '✓ ' : ''}${esc(it.jp)}${it.lv ? ` <small>${it.lv}</small>` : ''}</button>` : ''; };
  const scName = s => SCc[s] ? SCc[s].icon + ' ' + SCc[s].name : '';
  const subOf = it => it.kind === 'word' ? scName(it.sc[0]) : it.kind === 'gram' ? it.cat : '變化';
  function rowHTML(it) {
    return `<div class="kb-row" data-open="${esc(it.id)}" role="button" tabindex="0">${stB(it.id)}
      <span class="kb-tx"><span class="kb-l1"><b class="kb-jp jp">${esc(it.jp)}</b>${it.kana && it.kana !== it.jp ? `<span class="kb-kana jp">${esc(it.kana)}</span>` : ''}${it.core && it.lv === 'N3' ? '<span class="kb-core">核心</span>' : ''}</span>
      <span class="kb-zh">${esc(it.zh)}</span></span>
      ${it.kind !== 'conj' ? sayB(it.kind === 'gram' && it.ref.ex && it.ref.ex[0] ? it.ref.ex[0] : it.jp) : ''}${favB(it.id)}</div>`;
  }
  function learnedCount(lv, kind) {
    if (kind === 'gram') return GRAM.filter(g => g.lv === lv && stOf(g.id) === 2).length;
    const ws = words(lv);
    return ws ? ws.filter(w => stOf(w.id) === 2).length : Learn.stats({ lv, type: 'v' }).known;
  }
  const total = (lv, kind) => (M.STATS[kind === 'gram' ? 'gram' : 'lex'] || {})[lv] || 0;

  /* ---------------- 學習路線（等級→先修拓撲；grammar.js 的 ord 已是拓撲序） ---------------- */
  // 推薦一律先補齊未學會（未標「已掌握」）的先修，再學目標條目
  const RAW = new Map(M.gram.map(g => [g.id, g])), WHY = new Map();
  // floor：低於此等級（使用者程度以下）的先修視為已會，不再往回推薦
  function missingPre(g, out, floor) { for (const p of g.pre) { const x = RAW.get(p); if (x && !ST.learned[p] && !out.has(p) && LVI[x.lv] >= (floor || 0)) { out.add(p); missingPre(x, out, floor); } } return out; }
  function gramPath(lvs, n, floor) {
    const res = [], inRes = new Set();
    for (const g of M.gram) {
      if (res.length >= n) break;
      if (ST.learned[g.id] || inRes.has(g.id) || (lvs && !lvs.includes(g.lv))) continue;
      const chain = [...missingPre(g, new Set(), floor)].map(id => RAW.get(id)).filter(x => !inRes.has(x.id)).sort((a, b) => a.ord - b.ord);
      chain.forEach(x => WHY.set(x.id, g.id)); WHY.delete(g.id);
      for (const x of chain.concat(g)) { inRes.add(x.id); res.push(x); }
    }
    return res.slice(0, n);
  }
  const preLeft = g => (g.pre || []).filter(p => !ST.learned[p]).length;
  /* ---------------- 下一步 ---------------- */
  // 依所在等級頁（沒有就用使用者程度）推薦；使用者程度以下的先修視為已會
  function nextGram(lv) {
    const me = LVI[profLv()];
    const g = lv ? gramPath([lv], 1, Math.min(me, LVI[lv]))[0] : (gramPath(LV.slice(me), 1, me)[0] || gramPath(null, 1, me)[0]);
    return g ? G_BY.get(g.id) : null;
  }
  function nextWords(n, at) {
    const lv = at || profLv(), ws = words(lv); if (!ws) return [];
    const todo = ws.filter(w => !stOf(w.id));
    const tr = w => w.sc.some(s => TRAVEL.includes(s));
    return todo.filter(w => w.core && tr(w)).concat(todo.filter(w => w.core && !tr(w)), todo.filter(w => !w.core)).slice(0, n);
  }
  function nextCard(compact, at) {
    const g = nextGram(at), ws = nextWords(compact ? 0 : 6, at);
    if (!g && !ws.length) return `<div class="kb-next done">🎉 ${at ? at + ' ' : '這一級'}都學完了，可以挑戰下一級！</div>`;
    const idx = g ? GRAM.filter(x => x.lv === g.lv).indexOf(g) + 1 : 0;
    const why = g && WHY.get(g.id), wt = why && G_BY.get(why), low = g && wt && LVI[g.lv] < LVI[wt.lv];
    return `<div class="kb-next${compact ? ' compact' : ''}">
      <div class="kb-next-h">▶ 下一步該學什麼</div>
      ${g ? `<button type="button" class="kb-next-main" data-open="${esc(g.id)}"><span><b class="jp">${esc(g.jp)}</b><small>${esc(g.zh)}</small></span><em>${g.lv} 文法 #${idx}　開始 ›</em></button>${wt ? `<div class="kb-next-pre">要學「<b class="jp">${esc(wt.jp)}</b>」（${wt.lv}）得先會這條${low ? `<button type="button" class="kb-qc" data-a="lvknown" data-lv="${g.lv}">我已會 ${g.lv} 以下文法</button>` : ''}</div>` : ''}` : ''}
      ${ws.length ? `<div class="kb-next-w"><span class="muted">先學這幾個字：</span>${ws.map(w => `<button type="button" class="kb-rel" data-open="${w.id}">${esc(w.jp)} <small>${esc(w.zh.split(/[；;]/)[0])}</small></button>`).join('')}</div>` : ''}
    </div>`;
  }

  /* ---------------- 側邊欄樹 ---------------- */
  function treeOpen(lv) { if (!PR.tree) return lv === profLv(); return !!PR.tree[lv]; }
  function treeHTML(cur) {
    const on = k => cur === k ? ' on' : '';
    const lvRow = lv => {
      const o = treeOpen(lv), wl = learnedCount(lv, 'word'), gl = learnedCount(lv, 'gram');
      return `<div class="kb-tn">
        <button type="button" class="kb-tg" data-tree="${lv}" aria-expanded="${o}">${o ? '▾' : '▸'}</button>
        <button type="button" class="kb-ti${on(lv)}" data-nav="lv" data-lv="${lv}"><i class="kb-dot ${lv.toLowerCase()}"></i>${lv}<small>${wl + gl}/${total(lv, 'word') + total(lv, 'gram')}</small></button></div>
        ${o ? `<div class="kb-tsub">
          <button type="button" class="kb-ti${on(lv + '/word')}" data-nav="db" data-kind="word" data-lv="${lv}">📘 單字<small>${total(lv, 'word')}</small></button>
          <button type="button" class="kb-ti${on(lv + '/gram')}" data-nav="db" data-kind="gram" data-lv="${lv}">📗 文法<small>${total(lv, 'gram')}</small></button></div>` : ''}`;
    };
    return `<div class="kb-tree">
      <button type="button" class="kb-ti${on('home')}" data-nav="home">🏠 學習首頁</button>
      <div class="kb-th">等級</div>${LV.map(lvRow).join('')}
      <div class="kb-th">其他</div>
      <button type="button" class="kb-ti${on('conj')}" data-nav="conj">🔁 動詞變化<small>${CONJ.length}</small></button>
      <button type="button" class="kb-ti${on('fav')}" data-nav="fav">⭐ 收藏<small>${Learn.views(e => e.fav).length}</small></button>
      <button type="button" class="kb-ti${on('recent')}" data-nav="recent">🕘 最近開啟</button>
      <button type="button" class="kb-ti" data-nav="3d">🌐 3D 心智圖</button>
    </div>`;
  }

  /* ---------------- 版面 ---------------- */
  let ROOT = null, CUR = null, PEEK = null, LIM = {}, PAGE = 0, SCROLL = {};
  const curKey = p => p.p === 'db' ? (p.lv || 'all') + '/' + p.kind : p.p === 'lv' ? p.lv : (p.p || 'home');
  function crumbs(list) {
    return `<nav class="kb-crumb" aria-label="位置"><button type="button" class="kb-menu" data-a="drawer" aria-label="目錄">☰</button>${list.map((c, i) =>
      i < list.length - 1 ? `<button type="button" class="kb-cb" data-go='${esc(JSON.stringify(c[1]))}'>${esc(c[0])}</button><span class="kb-sep">/</span>` : `<span class="kb-cb cur">${esc(c[0])}</span>`).join('')}</nav>`;
  }
  function shell(el, key, crumb) {
    el.innerHTML = `<div class="kb">
      <aside class="kb-side">${treeHTML(key)}</aside>
      <div class="kb-scrim" data-a="drawer"></div>
      <div class="kb-main">${crumbs(crumb)}<div class="kb-content"></div></div>
      <aside class="kb-peek" aria-label="詳情"></aside></div>`;
    ROOT = el.querySelector('.kb');
    ROOT.addEventListener('click', onClick);
    ROOT.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.kb-row,.kb-gcard')) { e.preventDefault(); e.target.click(); } });
    ROOT.addEventListener('change', onChange);
    ROOT.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.drag); });
    ROOT.addEventListener('dragover', e => { if (e.target.closest('[data-drop]')) e.preventDefault(); });
    ROOT.addEventListener('drop', e => { const c = e.target.closest('[data-drop]'); if (!c) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) { setSt(id, +c.dataset.drop); body(); } });
    return el.querySelector('.kb-content');
  }
  const C = () => ROOT && ROOT.querySelector('.kb-content');

  /* ---------------- 首頁 ---------------- */
  const homeOpen = lv => PR.home && PR.home[lv] !== undefined ? !!PR.home[lv] : lv === profLv();
  function renderHome(el) {
    const me = profLv();
    const c = shell(el, 'home', [['知識庫', {}]]);
    const lvCard = lv => {
      const big = homeOpen(lv);
      const wl = learnedCount(lv, 'word'), gl = learnedCount(lv, 'gram'), wt = total(lv, 'word'), gt = total(lv, 'gram');
      const ready = (wl + gl) / Math.max(1, wt + gt) >= .8 && LV[LVI[lv] + 1];
      return `<div class="kb-lvc${big ? ' open' : ''}">
        <button type="button" class="kb-lvh" data-a="lvcard" data-lv="${lv}" aria-expanded="${!!big}"><span>${big ? '▾' : '▸'}</span><i class="kb-dot ${lv.toLowerCase()}"></i><b>${lv}</b>${lv === me ? '<em class="kb-me">你的程度</em>' : ''}<small>${wl + gl}/${wt + gt}</small></button>
        ${big ? `<div class="kb-lvb">
          <button type="button" class="kb-lvl" data-nav="db" data-kind="word" data-lv="${lv}"><span>📘 單字</span><span>${wl}/${wt}</span>${bar(wl, wt)}</button>
          <button type="button" class="kb-lvl" data-nav="db" data-kind="gram" data-lv="${lv}"><span>📗 文法</span><span>${gl}/${gt}</span>${bar(gl, gt)}</button>
          ${ready ? `<p class="kb-ready">✨ 已學 80%，可挑戰 ${LV[LVI[lv] + 1]}</p>` : ''}</div>` : ''}</div>`;
    };
    c.innerHTML = `<h1 class="kb-h1">📚 知識庫</h1>
      <button type="button" class="btn" data-nav="3d">🌐 開啟 3D 心智圖</button>
      ${nextCard()}
      <div class="kb-sec">各等級進度</div>
      ${LV.map(lvCard).join('')}
      <div class="kb-sec">快速開啟</div>
      <div class="kb-quick">
        <button type="button" class="kb-qb" data-nav="db" data-kind="word" data-lv="${me}" data-preset="travel">🧳 旅遊必備單字</button>
        <button type="button" class="kb-qb" data-nav="conj">🔁 動詞變化</button>
        <button type="button" class="kb-qb" data-nav="fav">⭐ 收藏</button>
      </div>
      <p class="kb-foot muted">詞彙清單：open-anki-jlpt-decks（MIT，源自 tanos.co.uk JLPT 清單，CC BY）；JLPT 官方 2010 年後未公布清單，分級僅供參考。「核心」＝在本站冒險、手冊、特訓或文法例句中出現過的字。中文釋義、分類與文法為本站整理。</p>`;
    loadLv(me).then(() => { if (C() === c && !c.querySelector('.kb-next-w')) { const n = c.querySelector('.kb-next'); if (n) n.outerHTML = nextCard(); } }).catch(() => { });
  }

  /* ---------------- 等級頁 ---------------- */
  function renderLv(el, lv) {
    const c = shell(el, lv, [['知識庫', {}], [lv, { p: 'lv', lv }]]);
    const wl = learnedCount(lv, 'word'), gl = learnedCount(lv, 'gram'), wt = total(lv, 'word'), gt = total(lv, 'gram');
    c.innerHTML = `<h1 class="kb-h1"><i class="kb-dot ${lv.toLowerCase()}"></i>${lv}</h1>
      <div class="kb-lvc open"><div class="kb-lvb">
        <button type="button" class="kb-lvl" data-nav="db" data-kind="word" data-lv="${lv}"><span>📘 單字</span><span>${wl}/${wt}</span>${bar(wl, wt)}</button>
        <button type="button" class="kb-lvl" data-nav="db" data-kind="gram" data-lv="${lv}"><span>📗 文法</span><span>${gl}/${gt}</span>${bar(gl, gt)}</button></div></div>
      ${nextCard(true, lv)}
      ${lv === 'N3' ? '<p class="muted">N3 單字較多（2,140），建議先開「核心」篩選，只看本站常出現的字。</p>' : ''}`;
  }

  /* ---------------- 資料庫頁 ---------------- */
  let DB = null; // {kind, title, base:[]|fn, special}
  const VIEWS = [['list', '☰', '清單'], ['table', '▦', '表格'], ['board', '▥', '看板'], ['gallery', '▣', '畫廊']];
  function renderDB(el, p) {
    const kind = p.kind === 'gram' ? 'gram' : 'word', v = VS(kind);
    if (p.lv) { v.f = Object.assign({}, v.f, { lv: [p.lv] }); }
    if (p.preset === 'travel') v.f = Object.assign({}, v.f, { travel: true });
    if (p.preset === 'core') v.f = Object.assign({}, v.f, { core: true });
    if (!v.f.lv || !v.f.lv.length) v.f.lv = [profLv()];
    savePR();
    DB = { kind, special: null };
    LIM = {}; PAGE = 0;
    const lvs = v.f.lv.length === 1 ? v.f.lv[0] : '多個等級';
    const c = shell(el, (v.f.lv.length === 1 ? v.f.lv[0] : 'all') + '/' + kind, [['知識庫', {}], [lvs, v.f.lv.length === 1 ? { p: 'lv', lv: v.f.lv[0] } : {}], [KIND[kind].name, { p: 'db', kind }]]);
    c.innerHTML = `<h1 class="kb-h1">${KIND[kind].icon} ${lvs} ${KIND[kind].name}<small class="kb-cnt"></small></h1>
      ${kind === 'gram' ? nextCard(true, v.f.lv.length === 1 ? v.f.lv[0] : null) : ''}
      <div class="kb-views" role="tablist">${VIEWS.map(x => `<button type="button" role="tab" class="kb-vt${v.view === x[0] ? ' on' : ''}" data-view="${x[0]}" aria-selected="${v.view === x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</div>
      <div class="kb-tools">
        <input type="search" class="kb-q" placeholder="搜尋 日文／讀音／中文／羅馬字" value="${esc(v.f.q || '')}" autocomplete="off" enterkeyhint="search" aria-label="搜尋">
        <label class="kb-sel">排序<select data-set="sort">${[['ord', '學習順序'], ['kana', '五十音'], ['recent', '最近開啟'], ['st', '狀態']].map(o => `<option value="${o[0]}"${v.sort === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>
        <label class="kb-sel">分組<select data-set="group">${(kind === 'gram' ? [['cat', '類別'], ['st', '狀態'], ['lv', '等級'], ['none', '無']] : [['sc', '場景'], ['pos', '詞類'], ['st', '狀態'], ['lv', '等級'], ['none', '無']]).map(o => `<option value="${o[0]}"${v.group === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>
      </div>
      <div class="kb-chips"></div>
      <div class="kb-fp" hidden></div>
      <div class="kb-body"><p class="muted center">載入中…</p></div>`;
    let qT = 0;
    c.querySelector('.kb-q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { v.f.q = e.target.value; savePR(); LIM = {}; PAGE = 0; body(); }, 200); });
    chips(); body();
  }
  function renderSpecial(el, which) {
    DB = { kind: 'mix', special: which };
    LIM = {}; PAGE = 0;
    const t = which === 'fav' ? '⭐ 收藏' : '🕘 最近開啟';
    const c = shell(el, which, [['知識庫', {}], [t.slice(2), { p: which }]]);
    c.innerHTML = `<h1 class="kb-h1">${t}</h1><div class="kb-body"><p class="muted center">載入中…</p></div>`;
    let ids = which === 'fav' ? null : ST.recent.slice();
    const favLv = Learn.views(e => e.fav).map(v => v.lv).filter(l => LV.includes(l));
    const lvs = [...new Set((ids || []).filter(i => i.startsWith('w:')).map(i => i.split(':')[1]).concat(favLv))];
    loadLvs(lvs).then(() => {
      const b = c.querySelector('.kb-body'); if (!b) return;
      if (!ids) ids = Object.keys(ST.fav);
      const list = ids.map(getItem).filter(Boolean);
      b.innerHTML = list.length ? `<div class="kb-list">${list.slice(0, 60).map(rowHTML).join('')}</div>` : `<p class="kb-empty">${which === 'fav' ? '還沒有收藏。點任一項右邊的 ☆ 就會收進這裡。' : '還沒有開過任何項目。'}</p>`;
    }).catch(() => { });
  }
  function chips() {
    const box = ROOT && ROOT.querySelector('.kb-chips'); if (!box || !DB || DB.special) return;
    const kind = DB.kind, f = VS(kind).f;
    const act = [];
    if (f.lv && f.lv.length) act.push(['lv', '等級', f.lv.join('、')]);
    if (f.st && f.st.length) act.push(['st', '狀態', f.st.map(s => ST_NAME[s]).join('、')]);
    if (f.pos && f.pos.length) act.push(['pos', '詞類', f.pos.map(x => M.POS[x]).join('、')]);
    if (f.sc && f.sc.length) act.push(['sc', '場景', f.sc.map(x => SCc[x] ? SCc[x].name : x).join('、')]);
    if (f.cat && f.cat.length) act.push(['cat', '類別', f.cat.join('、')]);
    const quick = [['todo', '只看未學', f.st && f.st.length === 2 && !f.st.includes(2)], ['fav', '⭐ 收藏', f.fav]];
    if (kind === 'word') quick.splice(1, 0, ['core', '核心常用', f.core], ['travel', '🧳 旅遊必備', f.travel]);
    box.innerHTML = act.map(a => `<span class="kb-fc"><button type="button" class="kb-fcb" data-a="fpanel">${a[1]}：<b>${esc(a[2])}</b></button><button type="button" class="kb-fx" data-unf="${a[0]}" aria-label="移除 ${a[1]} 篩選">✕</button></span>`).join('')
      + `<button type="button" class="kb-add" data-a="fpanel">＋ 篩選</button>`
      + quick.map(q => `<button type="button" class="kb-qc${q[2] ? ' on' : ''}" data-quick="${q[0]}" aria-pressed="${!!q[2]}">${q[1]}</button>`).join('');
    const fp = ROOT.querySelector('.kb-fp');
    if (fp && !fp.hidden) fpanel(fp);
  }
  function fpanel(fp) {
    const kind = DB.kind, f = VS(kind).f;
    const row = (k, name, opts) => `<div class="kb-fph">${name}</div><div class="kb-fpr">${opts.map(o => `<button type="button" class="kb-qc${has(f[k], o[0]) ? ' on' : ''}" data-tog="${k}" data-val="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`;
    let h = row('lv', '等級', LV.map(l => [l, l])) + row('st', '狀態', ST_NAME.map((n, i) => [i, n]));
    if (kind === 'word') h += row('pos', '詞類', Object.keys(M.POS).map(k => [k, M.POS[k]])) + row('sc', '場景', M.SCENES.map(s => [s.id, s.icon + s.name]));
    else h += row('cat', '類別', M.GCAT.map(c => [c, c]));
    fp.innerHTML = `<div class="kb-fpt"><b>篩選</b><button type="button" class="kb-qc" data-a="freset">全部清除</button><button type="button" class="kb-ib" data-a="fpanel" aria-label="關閉">✕</button></div>${h}`;
  }
  function body() {
    if (!ROOT || !DB || DB.special) return;
    const b = ROOT.querySelector('.kb-body'); if (!b) return;
    const kind = DB.kind, v = VS(kind), f = v.f;
    const lvs = f.lv && f.lv.length ? f.lv : LV;
    const ready = kind === 'gram' ? Promise.resolve() : loadLvs(lvs);
    ready.then(() => {
      if (!b.isConnected) return;
      const base = kind === 'gram' ? GRAM : lvs.reduce((a, l) => a.concat(words(l) || []), []);
      // 狀態值在 f.st 為數字陣列
      const list = sortList(filterList(base, f, kind), v.sort);
      const cnt = ROOT.querySelector('.kb-cnt'); if (cnt) cnt.textContent = list.length + ' 項';
      b.className = 'kb-body v-' + v.view;
      if (!list.length) { b.innerHTML = `<p class="kb-empty">沒有符合的項目。<button type="button" class="kb-qc" data-a="freset">清除篩選</button></p>`; return; }
      if (v.view === 'table') b.innerHTML = tableHTML(list, kind);
      else if (v.view === 'board') b.innerHTML = boardHTML(list);
      else if (v.view === 'gallery') b.innerHTML = galleryHTML(list);
      else b.innerHTML = listHTML(groupList(list, v.group, kind));
    }).catch(() => { b.innerHTML = '<p class="kb-empty">😵 詞彙載入失敗，請檢查網路後再試一次</p>'; });
  }
  function listHTML(groups) {
    let first = true;
    return groups.map(g => {
      const k = DB.kind + '|' + g.key;
      const open = PR.grp[k] !== undefined ? PR.grp[k] : (first || groups.length === 1);
      first = false;
      const done = g.items.filter(x => stOf(x.id) === 2).length, lim = LIM[k] || 20;
      return `<section class="kb-grp${open ? ' open' : ''}">
        <button type="button" class="kb-gh" data-grp="${esc(k)}" aria-expanded="${open}"><span class="kb-car">${open ? '▾' : '▸'}</span><span class="kb-gn">${g.icon ? g.icon + ' ' : ''}${esc(g.name)}</span><span class="kb-gc">${g.items.length}</span>${bar(done, g.items.length)}<span class="kb-gp">${Math.round(done / g.items.length * 100)}%</span></button>
        ${open ? `<div class="kb-list">${g.items.slice(0, lim).map(rowHTML).join('')}</div>${g.items.length > lim ? `<button type="button" class="kb-more" data-more="${esc(k)}">顯示更多（還有 ${g.items.length - lim}）</button>` : ''}` : ''}</section>`;
    }).join('');
  }
  const PER = 50;
  function tableHTML(list, kind) {
    const pages = Math.ceil(list.length / PER); if (PAGE >= pages) PAGE = pages - 1;
    const rows = list.slice(PAGE * PER, PAGE * PER + PER), v = VS(kind);
    const th = (k, n) => `<th><button type="button" class="kb-th-b${v.sort === k ? ' on' : ''}" data-sortby="${k}">${n}${v.sort === k ? ' ▴' : ''}</button></th>`;
    return `<div class="kb-tw"><table class="kb-tb"><thead><tr>${th('jp', '日文')}${kind === 'word' ? th('kana', '讀音') : ''}${th('zh', '中文')}${th('lv', '等級')}${th('grp', kind === 'gram' ? '類別' : '場景')}${th('st', '狀態')}<th>⭐</th></tr></thead><tbody>
      ${rows.map(it => `<tr data-open="${esc(it.id)}"><td class="jp"><b>${esc(it.jp)}</b></td>${kind === 'word' ? `<td class="jp kb-kana">${esc(it.kana)}</td>` : ''}<td>${esc(it.zh)}</td><td>${lvB(it.lv)}</td><td>${esc(subOf(it))}</td><td>${stB(it.id)}</td><td>${favB(it.id)}</td></tr>`).join('')}
      </tbody></table></div>
      ${pages > 1 ? `<div class="kb-pager"><button type="button" class="kb-qc" data-page="${PAGE - 1}"${PAGE ? '' : ' disabled'}>‹ 上一頁</button><span>${PAGE + 1} / ${pages}</span><button type="button" class="kb-qc" data-page="${PAGE + 1}"${PAGE < pages - 1 ? '' : ' disabled'}>下一頁 ›</button></div>` : ''}`;
  }
  function boardHTML(list) {
    return `<div class="kb-board">${[0, 1, 2].map(s => {
      const items = list.filter(x => stOf(x.id) === s), k = 'board|' + s, lim = LIM[k] || 30;
      return `<div class="kb-col" data-drop="${s}"><div class="kb-colh">${ST_ICON[s]} ${ST_NAME[s]}<small>${items.length}</small></div>
        ${items.slice(0, lim).map(it => `<div class="kb-card" draggable="${DESK()}" data-drag="${esc(it.id)}"><button type="button" class="kb-cardt" data-open="${esc(it.id)}"><b class="jp">${esc(it.jp)}</b>${it.kana && it.kana !== it.jp ? `<span class="kb-kana jp">${esc(it.kana)}</span>` : ''}<small>${esc(it.zh)}</small></button>
          <div class="kb-cardb">${[0, 1, 2].filter(x => x !== s).map(x => `<button type="button" class="kb-mv" data-setst="${esc(it.id)}" data-s="${x}">→ ${ST_NAME[x]}</button>`).join('')}</div></div>`).join('')}
        ${items.length > lim ? `<button type="button" class="kb-more" data-more="${k}" data-step="30">顯示更多（還有 ${items.length - lim}）</button>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function galleryHTML(list) {
    const k = 'gallery', lim = LIM[k] || 24;
    return `<p class="muted kb-tip">點卡片翻面看讀音與中文，當閃卡用。</p><div class="kb-gal">${list.slice(0, lim).map(it => `<div class="kb-gcard" data-flip="1" role="button" tabindex="0">
      <div class="kb-gf"><b class="jp">${esc(it.jp)}</b>${lvB(it.lv)}</div>
      <div class="kb-gb"><span class="kb-kana jp">${esc(it.kana || '')}</span><span class="kb-ro">${esc(romaji(it.kana))}</span><span>${esc(it.zh)}</span>${window.Loan ? Loan.html(it.jp, 'kb-og') : ''}
        <span class="kb-gbt">${sayB(it.jp, 1)}<button type="button" class="kb-qc" data-open="${esc(it.id)}">開啟</button></span></div></div>`).join('')}</div>
      ${list.length > lim ? `<button type="button" class="kb-more" data-more="${k}" data-step="24">顯示更多（還有 ${list.length - lim}）</button>` : ''}`;
  }

  /* ---------------- 動詞變化頁 ---------------- */
  function renderConj(el) {
    DB = { kind: 'conj', special: 'conj' };
    const c = shell(el, 'conj', [['知識庫', {}], ['動詞變化', { p: 'conj' }]]);
    const KN = { form: '變化形', tense: '時態', aspect: '體貌' };
    c.innerHTML = `<h1 class="kb-h1">🔁 動詞變化<small class="kb-cnt">${CONJ.length} 項</small></h1>
      ${['form', 'tense', 'aspect'].map((k, i) => { const items = CONJ.filter(x => x.ref.kind === k); return items.length ? `<section class="kb-grp open"><div class="kb-gh static"><span class="kb-gn">${KN[k]}</span><span class="kb-gc">${items.length}</span></div><div class="kb-list">${items.map(rowHTML).join('')}</div></section>` : ''; }).join('')}`;
  }

  /* ---------------- 項目頁 ---------------- */
  const tog = (key, title, inner, open) => inner ? `<details class="kb-tog"${open ? ' open' : ''}><summary>${title}</summary><div class="kb-togb">${inner}</div></details>` : '';
  function formTable(f) { return `<table class="kb-ft">${M.CONJ.filter(c => f[c.id]).map(c => `<tr><th><button type="button" class="kb-lnk" data-open="cj:${c.id}">${esc(c.name)}</button></th><td class="jp">${esc(f[c.id])}${sayB(f[c.id], 1)}</td></tr>`).join('')}</table>`; }
  function itemHTML(it, mode) {
    const s = stOf(it.id), r = it.ref;
    const crumb = mode === 'full' ? crumbs([['知識庫', {}], ...(it.lv ? [[it.lv, { p: 'lv', lv: it.lv }]] : []), [KIND[it.kind].name, it.kind === 'conj' ? { p: 'conj' } : { p: 'db', kind: it.kind, lv: it.lv }], [it.jp, {}]]) : '';
    let props = `${lvB(it.lv)}`, main = '', more = '';
    if (it.kind === 'word') {
      props += `<span class="kb-pp">${esc(scName(it.sc[0]))}</span>${it.sc.slice(1).filter(x => SCc[x]).map(x => `<span class="kb-pp">${esc(scName(x))}</span>`).join('')}<span class="kb-pp">${esc(M.POS[it.pos] || '')}${it.grp ? '・' + esc(M.GRP[it.grp] || '') : ''}</span>${it.core ? '<span class="kb-pp core">核心常用</span>' : ''}`;
      const ro = romaji(it.kana);
      const og = window.Loan ? Loan.get(it.jp) : null;
      main = `<dl class="kb-dl"><dt>讀音</dt><dd class="jp kb-kana">${esc(it.kana)}</dd>${ro ? `<dt>羅馬字</dt><dd>${esc(ro)}</dd>` : ''}<dt>中文</dt><dd>${esc(it.zh)}</dd>${og && og.src ? `<dt>語源</dt><dd>🌐 ${esc(og.name)}：<b lang="en">${esc(og.src)}</b>${og.note ? `<small class="muted">（${esc(og.note)}）</small>` : ''}</dd>` : ''}${it.raw !== it.jp ? `<dt>寫法</dt><dd class="jp">${esc(it.raw)}</dd>` : ''}</dl>`;
      const ex = it.jp.length >= 2 ? M.gram.find(g => g.ex && g.ex[0] && g.ex[0].includes(it.jp)) : null;
      if (ex) main += `<div class="kb-ex"><div class="kb-exj jp">${esc(ex.ex[0])}${sayB(ex.ex[0], 1)}</div><div class="muted">${esc(ex.ex[1] || '')}</div><button type="button" class="kb-lnk" data-open="${esc(ex.id)}">出自文法 ${esc(ex.pat)}</button></div>`;
      if (isVerb(it) && M.conjugate) { const f = M.conjugate(it.jp, it.grp); if (f) more += tog('conj', '🔁 動詞變化表', formTable(f), false); }
      else if (M.adjForms) { const a = M.adjForms(it.jp, it.pos); if (a) more += tog('adj', '🔁 形容詞變化', `<table class="kb-ft">${Object.keys(a).map(k => `<tr><th>${esc(k)}</th><td class="jp">${esc(a[k])}</td></tr>`).join('')}</table>`, false); }
      const kan = (it.jp.match(/[一-鿿]/g) || []).slice(0, 2), rel = [];
      kan.forEach(ch => { for (const lv of LV) for (const w of words(lv) || []) { if (rel.length >= 12) break; if (w !== it && w.jp.includes(ch) && !rel.includes(w)) rel.push(w); } });
      const same = (words(it.lv) || []).filter(w => w !== it && w.sc[0] === it.sc[0]).sort((a, b) => Math.abs(a.ord - it.ord) - Math.abs(b.ord - it.ord)).slice(0, 10);
      more += rel.length ? `<div class="kb-relh">同漢字的詞</div><div class="kb-rels">${rel.map(w => relChip(w.id)).join('')}</div>` : '';
      more += same.length ? `<div class="kb-relh">同場景（${esc(scName(it.sc[0]))}）</div><div class="kb-rels">${same.map(w => relChip(w.id)).join('')}</div>` : '';
    } else if (it.kind === 'gram') {
      props += `<span class="kb-pp">${esc(it.cat)}</span>`;
      main = `<dl class="kb-dl"><dt>意思</dt><dd>${esc(it.zh)}</dd>${r.conn ? `<dt>接續</dt><dd class="jp">${esc(r.conn)}</dd>` : ''}</dl>`;
      if (r.ex && r.ex[0]) main += `<div class="kb-ex"><div class="kb-exj jp">${esc(r.ex[0])}${sayB(r.ex[0], 1)}</div><div class="muted">${esc(r.ex[1] || '')}</div></div>`;
      if (r.note) main += `<div class="kb-note">💡 ${esc(r.note)}</div>`;
      const post = POST.get(it.id) || [];
      main += `<div class="kb-steps">
        <div class="kb-step"><div class="kb-relh">⬅ 先學${preLeft(r) ? `<small class="kb-left">還差 ${preLeft(r)} 條</small>` : ''}</div><div class="kb-rels">${r.pre.length ? r.pre.map(relChip).join('') : '<span class="muted">無（可直接學）</span>'}</div></div>
        <div class="kb-step"><div class="kb-relh">學完可接 ➡</div><div class="kb-rels">${post.length ? post.slice(0, 12).map(relChip).join('') : '<span class="muted">—</span>'}</div></div></div>`;
      more += tog('rel', '↔ 相近／對比', r.rel.length ? `<div class="kb-rels">${r.rel.map(relChip).join('')}</div>` : '', true);
      more += tog('cj', '🔁 用到的變化', (r.conj || []).length ? `<div class="kb-rels">${r.conj.map(c => relChip('cj:' + c)).join('')}</div>` : '', false);
      more += `<p class="muted kb-tip">「下一步」推薦會先補齊未標「已掌握」的先修；已會的可直接標記已掌握。</p>`;
    } else {
      const c = r, KN = { form: '變化形', tense: '時態', aspect: '體貌' };
      props += `<span class="kb-pp">${KN[c.kind] || ''}</span>`;
      const VB = [['書く', '1', '寫'], ['食べる', '2', '吃'], ['する', '3', '做'], ['来る', '3', '來']];
      const ex = M.conjugate ? VB.map(v => { const f = M.conjugate(v[0], v[1]) || {}; return f[c.id] ? `<tr><th class="jp">${v[0]}<small>（${v[2]}）</small></th><td class="jp">${esc(f[c.id])}${sayB(f[c.id], 1)}</td></tr>` : ''; }).join('') : '';
      main = `<dl class="kb-dl"><dt>規則</dt><dd>${esc(c.rule)}</dd><dt>例</dt><dd class="jp">${esc(c.ex)}</dd></dl>${ex ? `<table class="kb-ft">${ex}</table>` : ''}`;
      const list = BYCONJ[c.id] || [];
      more += c.from ? `<div class="kb-relh">⬅ 由這一形變來</div><div class="kb-rels">${relChip('cj:' + c.from)}</div>` : '';
      const kids = M.CONJ.filter(x => x.from === c.id);
      more += kids.length ? `<div class="kb-relh">可再變成 ➡</div><div class="kb-rels">${kids.map(x => relChip('cj:' + x.id)).join('')}</div>` : '';
      more += tog('use', `📗 用到此形的文法（${list.length}）`, list.length ? `<div class="kb-rels">${list.slice(0, 40).map(relChip).join('')}</div>` : '', true);
    }
    const sayT = it.kind === 'word' ? it.jp : it.kind === 'gram' && r.ex && r.ex[0] ? r.ex[0] : '';
    return `${crumb}<article class="kb-item${mode === 'peek' ? ' peek' : ''}">
      ${mode === 'peek' ? `<div class="kb-peekt"><button type="button" class="kb-ib" data-a="peekx" aria-label="關閉">✕</button><button type="button" class="kb-qc" data-full="${esc(it.id)}">⤢ 開成整頁</button></div>` : ''}
      <div class="kb-ih"><h1 class="kb-it jp">${esc(it.jp)}</h1>${sayT ? sayB(sayT) : ''}${favB(it.id)}</div>
      <div class="kb-props">${props}</div>
      <div class="kb-seg" role="group" aria-label="學習狀態">${ST_NAME.map((n, i) => `<button type="button" class="kb-sg${s === i ? ' on' : ''}" data-setst="${esc(it.id)}" data-s="${i}" aria-pressed="${s === i}">${ST_ICON[i]} ${n}</button>`).join('')}</div>
      ${main}${more}
      <div class="kb-iact">${it.kind !== 'conj' ? App.trackBtn(trackItem(it)) : ''}<button type="button" class="btn sm" data-a="to3d" data-id="${esc(it.id)}">🌐 在 3D 中看</button></div>
    </article>`;
  }
  function openItem(id) {
    if (!DESK()) { if (ROOT) SCROLL[JSON.stringify(CUR)] = scrollY; App.go('kb-page', { id }); return; }
    needFor(id).then(() => {
      const it = getItem(id); if (!it || !ROOT) return;
      touch(id); PEEK = id;
      const pk = ROOT.querySelector('.kb-peek');
      pk.innerHTML = itemHTML(it, 'peek'); pk.classList.add('open'); pk.scrollTop = 0;
      ROOT.classList.add('has-peek');
    });
  }
  function closePeek() { PEEK = null; if (!ROOT) return; const pk = ROOT.querySelector('.kb-peek'); pk.classList.remove('open'); pk.innerHTML = ''; ROOT.classList.remove('has-peek'); }
  function refreshItem() {
    if (!ROOT) return;
    const art = ROOT.querySelector('.kb-content .kb-item');
    if (art && CUR && CUR.page) { const it = getItem(CUR.page); if (it) { const c = C(); c.innerHTML = itemHTML(it, 'full'); } }
    if (PEEK) { const it = getItem(PEEK), pk = ROOT.querySelector('.kb-peek'); if (it && pk) { const t = pk.scrollTop; pk.innerHTML = itemHTML(it, 'peek'); pk.scrollTop = t; } }
  }
  function renderPage(el, p) {
    const id = p && p.id;
    CUR = { page: id };
    el.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>';
    needFor(id).then(() => {
      if (!el.isConnected) return;
      const it = getItem(id);
      const c = shell(el, it ? (it.lv ? it.lv + '/' + it.kind : it.kind) : '', [['知識庫', {}]]);
      ROOT.classList.add('full');
      if (!it) { c.innerHTML = '<p class="kb-empty">找不到這個項目。</p>'; return; }
      touch(id);
      ROOT.querySelector('.kb-main .kb-crumb').remove();
      c.innerHTML = itemHTML(it, 'full');
    }).catch(() => { el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }

  /* ---------------- 事件 ---------------- */
  function rerender() { App.render(); }
  function onChange(e) {
    const t = e.target;
    if (t.dataset.set && DB && !DB.special) { VS(DB.kind)[t.dataset.set] = t.value; savePR(); LIM = {}; PAGE = 0; body(); }
  }
  function onClick(e) {
    const t = e.target.closest('[data-say],[data-fav],[data-st],[data-setst],[data-open],[data-nav],[data-tree],[data-go],[data-a],[data-view],[data-quick],[data-tog],[data-unf],[data-grp],[data-more],[data-page],[data-sortby],[data-full],[data-flip]');
    if (!t || !ROOT.contains(t)) return;
    if (e.target.closest('.track-btn')) return;
    const d = t.dataset;
    if (d.say) { e.stopPropagation(); return App.speak(d.say); }
    if (d.fav) { if (ST.fav[d.fav]) delete ST.fav[d.fav]; else ST.fav[d.fav] = 1; saveST(); document.querySelectorAll(`[data-fav="${CSS.escape(d.fav)}"]`).forEach(b => { b.classList.toggle('on', !!ST.fav[d.fav]); b.textContent = ST.fav[d.fav] ? '★' : '☆'; }); return; }
    if (d.st) { const s = (stOf(d.st) + 1) % 3; setSt(d.st, s); document.querySelectorAll(`[data-st="${CSS.escape(d.st)}"]`).forEach(b => { b.className = 'kb-ib kb-st s' + s; b.textContent = ST_ICON[s]; b.title = ST_NAME[s]; b.setAttribute('aria-label', '狀態：' + ST_NAME[s]); }); refreshItem(); return; }
    if (d.setst) { setSt(d.setst, +d.s); if (DB && !DB.special && VS(DB.kind).view === 'board') body(); else document.querySelectorAll(`[data-st="${CSS.escape(d.setst)}"]`).forEach(b => { b.className = 'kb-ib kb-st s' + d.s; b.textContent = ST_ICON[+d.s]; }); refreshItem(); return; }
    if (d.flip) { t.classList.toggle('flip'); return; }
    if (d.open) { closeDrawer(); return openItem(d.open); }
    if (d.full) return App.go('kb-page', { id: d.full });
    if (d.tree) { PR.tree = PR.tree || Object.fromEntries(LV.map(l => [l, l === profLv() ? 1 : 0])); PR.tree[d.tree] = PR.tree[d.tree] ? 0 : 1; savePR(); const s = ROOT.querySelector('.kb-side'); s.innerHTML = treeHTML(curKey(CUR || {})); return; }
    if (d.nav) {
      closeDrawer();
      if (d.nav === 'home') return App.go('kb', {});
      if (d.nav === 'lv') return App.go('kb', { p: 'lv', lv: d.lv });
      if (d.nav === 'db') return App.go('kb', Object.assign({ p: 'db', kind: d.kind, lv: d.lv }, d.preset ? { preset: d.preset } : {}));
      if (d.nav === '3d') return App.go('mind3d', {});
      return App.go('kb', { p: d.nav });
    }
    if (d.go) { let p = {}; try { p = JSON.parse(d.go); } catch (er) { } return App.go('kb', p); }
    if (d.view) { VS(DB.kind).view = d.view; savePR(); ROOT.querySelectorAll('.kb-vt').forEach(b => { b.classList.toggle('on', b.dataset.view === d.view); b.setAttribute('aria-selected', b.dataset.view === d.view); }); LIM = {}; PAGE = 0; return body(); }
    if (d.quick) {
      const f = VS(DB.kind).f;
      if (d.quick === 'todo') f.st = f.st && f.st.length === 2 && !f.st.includes(2) ? [] : [0, 1];
      else f[d.quick] = !f[d.quick];
      savePR(); LIM = {}; PAGE = 0; chips(); return body();
    }
    if (d.tog) {
      const f = VS(DB.kind).f, k = d.tog, val = k === 'st' ? +d.val : d.val;
      f[k] = (f[k] || []).includes(val) ? f[k].filter(x => x !== val) : (f[k] || []).concat(val);
      if (k === 'lv' && !f.lv.length) f.lv = [profLv()];
      savePR(); LIM = {}; PAGE = 0; chips(); return body();
    }
    if (d.unf) { const f = VS(DB.kind).f; f[d.unf] = d.unf === 'lv' ? LV.slice() : []; savePR(); LIM = {}; PAGE = 0; chips(); return body(); }
    if (d.grp) { const sec = t.closest('.kb-grp'), open = !sec.classList.contains('open'); PR.grp[d.grp] = open; savePR(); return body(); }
    if (d.more) { LIM[d.more] = (LIM[d.more] || (+d.step || 20)) + (+d.step || 40); return body(); }
    if (d.page) { PAGE = +d.page; body(); const b = ROOT.querySelector('.kb-body'); if (b) b.scrollIntoView({ block: 'start' }); return; }
    if (d.sortby) { VS(DB.kind).sort = d.sortby; savePR(); const s = ROOT.querySelector('select[data-set="sort"]'); if (s) s.value = d.sortby; return body(); }
    const a = d.a;
    if (a === 'drawer') return ROOT.classList.toggle('drawer');
    if (a === 'peekx') return closePeek();
    if (a === 'lvcard') { PR.home = PR.home || {}; PR.home[d.lv] = !homeOpen(d.lv); savePR(); return rerender(); }
    if (a === 'fpanel') { const fp = ROOT.querySelector('.kb-fp'); fp.hidden = !fp.hidden; if (!fp.hidden) fpanel(fp); return; }
    if (a === 'freset') { const v = VS(DB.kind); v.f = { lv: [profLv()] }; savePR(); const q = ROOT.querySelector('.kb-q'); if (q) q.value = ''; LIM = {}; PAGE = 0; chips(); return body(); }
    if (a === 'to3d') return App.go('mind3d', { focus: d.id });
    if (a === 'lvknown') {
      // 不跳 confirm：直接標記，提供一鍵復原
      const ch = GRAM.filter(g => LVI[g.lv] <= LVI[d.lv] && stOf(g.id) !== 2).map(g => [g.id, stOf(g.id) === 1]);
      ch.forEach(([id]) => setSt(id, 2, true)); saveST(); rerender();
      App.toast(`✓ 已把 ${d.lv} 以下 ${ch.length} 條文法標為已掌握 <button type="button" class="kb-undo">復原</button>`, 'ok');
      const u = document.querySelector('#toastBox .toast:last-child .kb-undo');
      if (u) u.onclick = () => { ch.forEach(([id, ing]) => setSt(id, ing ? 1 : 0, true)); saveST(); rerender(); u.closest('.toast').remove(); };
      return;
    }
  }
  function closeDrawer() { if (ROOT) ROOT.classList.remove('drawer'); }

  /* ---------------- 路由 ---------------- */
  function render(el, p) {
    p = p || {};
    CUR = p; PEEK = null;
    if (p.page) return renderPage(el, { id: p.page });
    if (p.p === 'db') renderDB(el, p);
    else if (p.p === 'lv' && LV.includes(p.lv)) renderLv(el, p.lv);
    else if (p.p === 'conj') renderConj(el);
    else if (p.p === 'fav' || p.p === 'recent') renderSpecial(el, p.p);
    else renderHome(el);
    const y = SCROLL[JSON.stringify(p)];
    if (y) setTimeout(() => scrollTo(0, y), 60);
  }
  if (!render.bound) {
    render.bound = 1;
    document.addEventListener('profilechange', () => { const m = document.getElementById('main'); if (m && /route-kb/.test(m.className)) App.render(); });
  }
  M.kb = { ST, saveST, stOf, setSt, getItem, words, loadLv, gramPath, why: id => WHY.get(id) || null, open: id => App.go('kb-page', { id }) };
  App.register('kb', { title: '辭典', icon: '📘', nav: false, navParent: 'lookup', render });
  App.register('kb-page', { title: '辭典', icon: '📘', nav: false, navParent: 'kb', render: renderPage });
  // 舊路由 mind：轉址（{focus}/{script} 進 3D，其餘進知識庫）
  App.register('mind', { title: '辭典', icon: '📘', nav: false, navParent: 'kb', transient: true, render(el, p) { p = p || {}; App.go(p.focus || p.script ? 'mind3d' : 'kb', p.focus || p.script ? p : {}); } });
})();
