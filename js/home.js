/* =========================================================
   「今天」首頁 home、今日課 today、設定頁 settings、首次開啟的程度選擇、延遲載入 Home.lazy
   首頁：唯一主按鈕「▶ 開始今天的課」＋連勝＋今日進度（含頂列與導覽可點元素 ≤10）
   今日課：Learn.prepare(目的) → 到期複習（≤15）→ 新學 5–8 個（卡片）→ 小測驗 → 結算（＋1 個應用）
   依賴：App、Learn、Tracker（core／learn）；Game（選用）；其他資料／模組都在今日課開始時才載入
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const has = (o, k) => !!(o && typeof o[k] === 'function');
  const LV_ICON = { zero: '🌱', n5: '🔰', n4: '🙂', n3: '💬', n2: '💼', n1: '🎌' };

  /* =========================================================
     延遲載入：Home.lazy([[route, def], …], [js…], [css…])
     - 先登記路由外殼；第一次進入時依序載入 js、並行載入 css，載完重畫
     - 模組之後自己 App.register 同名路由時，render 仍會先確認該路由的 js／css 都已載入
       （例如 event 由 world-quest.js 註冊，但另外需要 TravelData）
     ========================================================= */
  const T = {}, jsDone = {}, cssOK = {}, cssP = {};
  const reg0 = App.register;
  const curIs = n => { const m = document.getElementById('main'); return !!m && m.className === 'route-' + n; };
  function loadCSS(h) {
    if (cssP[h]) return cssP[h];
    if (document.querySelector('link[rel="stylesheet"][href="' + h + '"]')) { cssOK[h] = 1; return (cssP[h] = Promise.resolve()); }
    return (cssP[h] = new Promise(res => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h;
      l.onload = l.onerror = () => { cssOK[h] = 1; res(); };
      document.head.appendChild(l);
    }));
  }
  function needSrc(js, css) {
    const pj = (js || []).reduce((p, s) => p.then(() => jsDone[s] ? 0 : App.loadScript(s).then(() => { jsDone[s] = 1; })), Promise.resolve());
    return Promise.all([pj, Promise.all((css || []).map(loadCSS))]);
  }
  const ready = n => { const t = T[n]; return !t || (t.js.every(s => jsDone[s]) && t.css.every(h => cssOK[h])); };
  const need = n => T[n] ? needSrc(T[n].js, T[n].css) : Promise.resolve();
  const LOADING = '<p class="center muted" style="margin:48px 0">載入中…</p>';
  function wrap(name, def) {
    const r = def.render;
    const w = Object.assign({}, def, {
      render(el, p) {
        if (r && ready(name)) { const out = r.call(w, el, p); if (AFTER[name]) try { AFTER[name](el, p || {}); } catch (e) { } return out; }
        if (!r && ready(name)) { el.innerHTML = '<p class="center" style="margin:48px 0">😵 這個頁面沒有載入成功</p>'; return; }
        el.innerHTML = LOADING;
        need(name).then(() => { if (curIs(name)) App.render(); })
          .catch(() => { if (curIs(name)) el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
      }
    });
    return w;
  }
  App.register = function (name, def) { return reg0(name, T[name] ? wrap(name, def) : def); };
  function lazy(defs, js, css) {
    defs.forEach(([name, def]) => { T[name] = { js: (js || []).slice(), css: (css || []).slice() }; App.register(name, Object.assign({}, def, { render: null })); });
  }
  const AFTER = {};   // 路由畫完後的掛鉤（v14 刪掉冒險地圖底部的經典練習入口）

  /* =========================================================
     今天：首頁
     ========================================================= */
  const GOALS = [['travel', '🧳', '去日本旅遊', '點餐、購物、問路、緊急求助'], ['exam', '📝', '考日檢', 'N5–N1 單字、文法、挑戰題'],
    ['work', '💼', '工作・商務', '敬語、Email、開會'], ['fun', '🎵', '歌曲・文章', '想唱就唱、想讀就讀（不排進每日課）']];
  const GOAL_OF = Object.fromEntries(GOALS.map(g => [g[0], g]));
  const GOAL_SHORT = { travel: '旅遊', exam: '日檢', work: '商務', fun: '歌曲新聞' };
  const KANA_N = 46;
  // 今日紀錄（App.state.today，home.js 擁有）：{date, goal, done, learned, reviewed, applied}
  function dayRec() {
    const S = App.state, t = App.today();
    if (!S.today || S.today.date !== t) S.today = { date: t, goal: null, done: 0, learned: 0, reviewed: 0, applied: 0 };
    return S.today;
  }
  // 已學平假名數：與手冊五十音同一個來源（Learn.kanaLearned）
  const kanaSeen = () => window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : (((App.state.kanaL || {}).h) || []).length;
  const kanaMode = p => p.lv === 'zero' && kanaSeen() < KANA_N;
  // 今日課的目的：歌曲・文章是興趣，不排進每日課（只選這個的人，今日課用日檢單字）
  const lessonGoals = p => { const gs = ((p || App.profile()).goals || []).filter(g => g !== 'fun'); return gs.length ? gs : ['exam']; };
  function curGoal(p) {
    p = p || App.profile();
    const g = dayRec().goal, gs = lessonGoals(p);
    return gs.includes(g) ? g : gs[0];
  }
  // 每天新學幾個：使用者自訂（設定 → 每日目標）優先，沒設才依程度；分鐘數少就少學一點
  const freshN = lv => { const p = App.profile(); if (p.fresh != null) return p.fresh; const b = ['n3', 'n2', 'n1'].includes(lv) ? 8 : lv === 'zero' ? 5 : 6; return p.mins <= 5 ? Math.min(b, 3) : p.mins >= 15 ? b + (p.mins >= 30 ? 6 : 3) : b; };
  // 應用只做一個小節：旅遊＝店內 1 個任務、日檢＝5 題、商務＝單元中 1 個小節、歌曲新聞＝唱一首歌、五十音＝下一個單元
  const APPLY_TXT = { travel: '進店完成 1 個任務', exam: '日檢 5 題', fun: '唱一首歌', work: '商務練一段', kana: '五十音下一行' };
  // 今日課時間估計（秒）：複習卡 8、新學（卡＋小測驗）20、應用依目的；總長 ≤8 分鐘 → 複習數依剩下的時間決定上限
  const APPLY_SEC = { travel: 180, exam: 75, fun: 180, work: 240, kana: 300 };
  const budget = () => (App.profile().mins || 8) * 60;   // 今日課長度＝使用者自訂的每天分鐘數
  function plan(goal, lv, dueAll, nFresh) {
    const n = nFresh != null ? nFresh : freshN(lv), ap = APPLY_SEC[goal] || 180, B = budget();
    const cap = Math.max(0, Math.min(Math.max(15, Math.round(B / 30)), Math.floor((B - n * 20 - ap) / 8)));
    const due = Math.min(cap, dueAll || 0);
    return { n, due, cap, min: Math.max(1, Math.ceil((due * 8 + n * 20 + ap) / 60)) };
  }
  const dueAllNow = () => window.Learn ? Learn.due(15).length : Tracker.dueCount();   // 與「我的」、導覽紅點同一個：Learn.due(15).length
  // 一天新學量：讓明天到期 ≤20（Learn.freshBudget）；當天第一課至少 2 個，「再上一課」可以是 0（只複習）
  function freshFor(g2, lv, dueAll) {
    const base = freshN(lv), pd = plan(g2, lv, dueAll, base).due;
    return window.Learn && Learn.freshBudget ? Learn.freshBudget(base, pd, dayRec().done || base === 0 ? 0 : Math.min(2, base)) : base;
  }
  const kanaPh = () => kanaSeen() >= 10 ? 2 : 1;   // 零基礎＋旅遊：五十音之外混入的旅遊必備句數
  /* ---- 商務：依程度排單元（「適合你」等級 → 更高 → 較低的當選修複習） ---- */
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  function bizOrder(lv) {
    const M = (window.BIZ && BIZ.META) || [];
    const L = Math.max(1, LVS.indexOf(lv && lv !== 'zero' ? String(lv).toUpperCase() : 'N5'));   // N5／零基礎 → 從 N4 單元
    const rank = m => { const i = LVS.indexOf(m.lv); return i === L ? 0 : i > L ? i - L : 10 + L - i; };
    return M.slice().sort((a, b) => rank(a) - rank(b) || M.indexOf(a) - M.indexOf(b));
  }
  const bizRun = id => ((App.state.bizRun || {})[id]) || null;
  const bizDone = id => { const P = bizRun(id); return ((P && P.done) || []).filter(Boolean).length; };
  const bizStars = id => (App.state.cleared || {})['biz:' + id] || 0;
  function bizPick(lv) {
    const o = bizOrder(lv);
    return o.find(m => !bizStars(m.id) && bizDone(m.id) > 0) || o.find(m => !bizStars(m.id)) || o.find(m => bizStars(m.id) < 3) || null;
  }
  // 應用完成判定：任何 App.reward（lastDoneAt）晚於按下「用出來」；商務另看小節數增加；五十音另看已學假名增加
  function applyDone(d) {
    if (d.applied || !d.applyAt) return !!d.applied;
    let ok = (App.state.lastDoneAt || 0) > d.applyAt;
    const sn = d.apSnap || {};
    if (!ok && sn.biz) ok = bizDone(sn.biz) > (sn.n || 0) || bizStars(sn.biz) > (sn.st || 0);
    if (!ok && sn.kana != null) ok = kanaSeen() >= sn.kana + 3;
    if (ok) { d.applied = 1; App.save(); }
    return ok;
  }

  function render(el) {
    const p = App.profile();
    if (!p.placed) return onboard(el);
    const d = dayRec();
    const km = kanaMode(p), goal = curGoal(p), g2 = km ? 'kana' : goal;
    const dueAll = dueAllNow(), pl = plan(g2, p.lv, dueAll, freshFor(g2, p.lv, dueAll)), n = pl.n, due = pl.due;
    const pg = !d.done && d.prog && d.prog.goal === g2 && d.prog.done > 0 ? d.prog : null;
    const sub = km ? `五十音 平假名 ${kanaSeen()}／${KANA_N}・今天學 ${n} 個字${(p.goals || []).includes('travel') ? `＋${kanaPh()} 句旅遊句` : ''}，先教再考`
      : `${due ? `複習 ${due} 個・` : ''}新學 ${n} 個・${APPLY_TXT[goal]}`;
    applyDone(d);
    const big = pg ? `▶ 繼續今天的課（已做 ${pg.done}／${pg.tot}）` : !d.done ? '▶ 開始今天的課' : d.applied ? '▶ 再上一課' : '▶ 去用出來（最後一步）';
    el.innerHTML = `<section class="hm">
      <h1 class="hm-hi">${greet()}</h1>
      <button type="button" class="hm-main" id="hm-main"><span class="ic" aria-hidden="true">${km ? 'あ' : (GOAL_OF[goal] || GOALS[0])[1]}</span><span><b>${esc(big)}</b><small>${esc(pg ? '剛剛做到一半，從離開的地方接著上' : !d.done ? '約 ' + pl.min + ' 分鐘・' + sub : d.applied ? '想多學可以再上一課' : (d.apLabel || '用出來一次'))}</small></span></button>
      ${!km && lessonGoals(p).length > 1 ? `<button type="button" class="hm-goal" id="hm-goal" aria-label="切換今天的目的">今天練：<b>${GOAL_OF[goal][1]} ${esc(GOAL_SHORT[goal])}</b><span aria-hidden="true">⇄ 換</span></button>` : ''}
      ${contHTML()}
      ${dueAll && d.done ? `<button type="button" class="hm-cont" id="hm-due"><span class="ic" aria-hidden="true">🔁</span><span><b>還有 ${dueAll} 個到期</b><small>到期複習</small></span><span aria-hidden="true">›</span></button>` : ''}
    </section>`;
    el.querySelector('#hm-main').onclick = () => App.go('today', Object.assign({ goal: g2 }, d.done && d.applied ? { more: 1 } : {}));
    const db = el.querySelector('#hm-due'); if (db) db.onclick = () => App.go('review');
    const cb = el.querySelector('#hm-cont'); if (cb) cb.onclick = () => { const c = window.NAV && NAV.cont(); if (c) App.go(c.name, c.params || {}); };
    const gb = el.querySelector('#hm-goal');
    if (gb) gb.onclick = () => { const lg = lessonGoals(p), i = lg.indexOf(goal); d.goal = lg[(i + 1) % lg.length]; App.save(); render(el); };
  }
  // 繼續上次（js/nav.js 記錄最後一個內容頁：單元、講義、歌曲、文章、小遊戲…；14 天內）
  function contHTML() {
    const c = window.NAV && NAV.cont && NAV.cont();
    if (!c || Date.now() - (c.t || 0) > 14 * 864e5) return '';
    return `<button type="button" class="hm-cont" id="hm-cont"><span class="ic" aria-hidden="true">⏯</span><span><b>繼續上次：${esc(c.title)}</b><small>${esc(c.where || '')}</small></span><span aria-hidden="true">›</span></button>`;
  }
  function greet() {
    const h = new Date().getHours();
    return h < 5 ? 'こんばんは 🌙' : h < 11 ? 'おはよう ☀️' : h < 18 ? 'こんにちは 👋' : 'こんばんは 🌙';
  }

  /* =========================================================
     今日課 today：params {goal:'travel'|'exam'|'fun'|'work'|'kana'}
     ========================================================= */
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const BIZ_JS = ['js/biz.js'];   // biz.js 的 BIZ.load() 再載入 data/biz/*
  const SRC = { kana: ['kana-data.js'].concat(SC), travel: SC, exam: [], fun: ['data/reading/daily.js'].concat(SC), work: BIZ_JS };
  const isKanaStr = s => /^[぀-ヿー・\s、。，！？!?「」]+$/.test(s || '');
  const romaOf = it => {
    if (it && it.type === 'grammar' && /^[〜~]?[はへを]$/.test(it.jp || '')) return { は: 'wa', へ: 'e', を: 'o' }[it.jp.slice(-1)];   // 助詞句型
    if (it.romaji) return it.romaji;
    const k = it.kana || (isKanaStr(it.jp) ? it.jp : '');
    if (!k || !isKanaStr(k)) return '';
    try { return window.Phrase && Phrase.romaji ? Phrase.romaji(k, it.jp) : ''; } catch (e) { return ''; }
  };
  const fresh = id => { const e = Learn.get(id); return !e || (e.s === 'new' && !e.reps); };
  const hasKanji = s => /[一-鿿々〆ヶ]/.test(s || '');
  // 句子卡讀音：沒有 kana 又有漢字 → 用 JPText 斷詞補讀音（有未收錄漢字就不補，避免錯讀）
  function fillReading(list) {
    const need = list.filter(it => it.type !== 'kana' && it.type !== 'grammar' && !/^g:/.test(it.id || '') && (!it.kana || hasKanji(it.kana)) && hasKanji(it.jp));
    if (!need.length) return Promise.resolve();
    return needSrc(['js/jp-text.js']).then(() => window.JPText && JPText.ready()).then(() => {
      need.forEach(it => {
        try {
          const tk = JPText.tokenize(it.jp); let ok = true;
          const k = tk.map(t => { if (t.sym) return t.s; if (t.kana && !hasKanji(t.kana)) return t.kana; if (!hasKanji(t.s)) return t.s; ok = false; return t.s; }).join('');
          if (ok && k && k !== it.jp) { it.kana = k; if (!it.romaji) it.romaji = romaOf({ jp: it.jp, kana: k }); }
        } catch (e) { }
      });
    }).catch(() => { });
  }
  // 單字新學卡的例句：知識庫文法例句（已載入時）→ 情境句
  function exOf(it) {
    if (window.Path && Path.exOf) { const r = Path.exOf(it, it.lv); if (r !== null) { const e = Array.isArray(r) && r[0]; return e ? [e.jp, e.zh || ''] : null; } }
    if (it.ex || it.type !== 'vocab' || !it.jp || String(it.jp).length < 2) return it.ex || null;
    const w = String(it.jp), M = window.MIND;
    // 短的純假名詞（さす、いち、ごと、きる）用子字串比對會配到別的詞（さすがに、いちばん、できる），寧可不配例句
    if (/^[぀-ヿ]{1,3}$/.test(w)) return null;
    const g = M && Array.isArray(M.gram) ? M.gram.find(x => x.ex && x.ex[0] && x.ex[0].includes(w) && x.ex[0].length <= 40) : null;
    if (g) return [g.ex[0], g.ex[1] || ''];
    for (const s of (window.SCENES || [])) for (const ph of (s.phrases || [])) if (ph && ph.jp && ph.jp !== w && ph.jp.includes(w)) return [ph.jp, ph.zh || ''];
    return null;
  }
  // 商務新學：從「適合你」等級的單元開始（應用那個單元優先），N3–N2 不從 N4 基礎詞開始
  function fillWork(Q, n, lv, first) {
    const B = window.BIZ; if (!B || !Array.isArray(B.units)) return;
    const ord = bizOrder(lv).map(m => m.id); if (first) ord.unshift(first);
    const us = B.units.filter(u => ord.includes(u.id)).sort((x, y) => ord.indexOf(x.id) - ord.indexOf(y.id));
    for (const u of us) for (const [k, t] of [['vocab', 'vocab'], ['phrases', 'phrase']]) for (const w of (u[k] || [])) {
      if (Q.fresh.length >= n) return;
      const id = w && w.jp && Learn.idOf({ jp: w.jp }, t);
      if (!id || !fresh(id) || Q.fresh.some(x => x.id === id)) continue;
      Q.fresh.push({ id, type: t, jp: w.jp, kana: w.kana || '', zh: w.zh || '', hint: w.when || '', lv: u.lv || '', source: '💼 ' + (u.title || '商務') });
    }
  }
  // 歌曲新聞：先載入歌曲模組（Songs.HOT／importHot／DEMO），Learn.prepare('fun') 才能取公有領域歌曲的歌詞詞
  const SONG_JS = ['js/phrase.js', 'data/loan.js'].concat(SC, ['data/reading/daily.js', 'data/reading/biz.js', 'js/jp-text.js', 'js/link-import.js', 'js/reader.js', 'js/songs.js']);
  const ACT_JS = ['js/phrase.js', 'js/activity.js', 'js/activities/flashcard.js', 'js/activities/choice.js', 'js/activities/wordbank.js', 'js/activities/listen.js'];
  // 零基礎＋旅遊的「用出來」：剛學的旅遊句所在的旅遊單元；沒有就下一個五十音單元（直接進單元，不停在路線分頁）
  function kanaApply(Q) {
    const P = window.Path; if (!P || !has(P, 'unit')) return null;
    const ph = Q.fresh.filter(x => x.type === 'phrase');
    let tu = null;
    if (ph.length && has(P, 'units')) {
      try {
        for (const r of P.units('travel')) {
          const u = P.unit(r.id);
          if (u && (u.items || []).some(it => ph.some(x => x.id === it.id))) { tu = u; break; }
        }
      } catch (e) { tu = null; }
    }
    // 零基礎：平假名還沒學到 30 個前，「用出來」固定走下一個五十音單元（不送進整句的旅遊單元；評審 v15 P1-3）
    if (tu && kanaSeen() >= 30) return { route: 'path-unit', params: { id: tu.id }, label: '旅遊：' + tu.title + '（剛學的句子）' };
    let ku = null; try { ku = has(P, 'nextUnit') ? P.nextUnit('kana') : null; } catch (e) { ku = null; }
    return ku ? { route: 'path-unit', params: { id: ku.id }, label: '五十音：' + ku.title, kana: 1 } : null;
  }
  // 零基礎＋旅遊：混入的旅遊句改用路線旅遊單元（便利商店起）的必備句，學了就能在那個單元用出來
  function kanaTravelPh(k) {
    const P = window.Path, out = [];
    if (!P || !has(P, 'units') || !has(P, 'unit')) return out;
    try {
      for (const r of P.units('travel')) {
        const u = P.unit(r.id);
        for (const it of ((u && u.items) || [])) {
          if (out.length >= k) return out;
          if (it.type !== 'phrase' || !it.kana || !it.zh || String(it.jp).replace(/[。！？、\s]/g, '').length > 6 || !fresh(it.id)) continue;   // 只挑短句（これください、トイレは…）
          out.push(Object.assign({}, it, { source: '🧳 旅遊必備句・' + u.title }));
        }
      }
    } catch (e) { }
    return out;
  }
  function prepLesson(goal) {
    const p = App.profile();
    const js = ['js/phrase.js'].concat(SRC[goal] || [], ['js/path.js'], goal === 'fun' ? SONG_JS : []);
    return needSrc(js).then(() => goal === 'work' && window.BIZ && has(BIZ, 'load') ? BIZ.load() : 0)
      .then(() => goal === 'kana' && window.Path && has(Path, 'load') ? Promise.all([Path.load('kana'), (p.goals || []).includes('travel') ? Path.load('travel') : 0]).catch(() => { }) : 0)
      .then(() => Learn.prepare(goal)).then(Q => {
      const dueAll = (Q.due || []).length, n = freshFor(goal, p.lv, Math.min(15, dueAll));
      Q = Object.assign({}, Q, { goal, fresh: (Q.fresh || []).slice(0, 12), due: (Q.due || []).slice(0, 15) });
      if (goal === 'travel') {
        // 旅遊：路線下一個場景包的「進店用出來」那一步（只做 1 個店內任務）
        let u = null;
        try { const pu = window.Path && has(Path, 'nextUnit') ? Path.nextUnit('travel') : null; u = pu && has(Path, 'unit') ? Path.unit(pu.id) : null; } catch (e) { u = null; }
        const sh = u && (u.steps || []).find(x => x.type === 'shop');
        Q.apply = sh ? { route: 'act', params: { steps: [sh], title: '用出來：' + u.title, reward: 'apply:' + u.id, back: { route: 'home', label: '回首頁' }, next: { route: 'today', params: { goal }, label: '回今日課 ▶' } }, label: '進店完成 1 個任務：' + u.title }
          : { world: 1, route: 'play', params: {}, label: '到冒險店家完成 1 個任務' };
      }
      if (goal === 'work') {
        const m = bizPick(p.lv);
        const keep = Q.fresh; Q.fresh = [];
        fillWork(Q, n, p.lv, m && m.id);
        if (Q.fresh.length < n) keep.forEach(x => { if (Q.fresh.length < n && !Q.fresh.some(y => y.id === x.id)) Q.fresh.push(x); });
        Q.apply = m ? { route: 'biz-unit', params: { id: m.id }, label: `商務：${m.title}・練一段（約 4 分）`, biz: m.id } : { route: 'biz', params: {}, label: '商務閱讀 1 篇' };
      }
      if (goal === 'kana') {
        // 五十音 n 個（預算不足時減少）＋旅遊必備句 1–2 句
        const kn = Q.fresh.filter(x => x.type === 'kana'), ph0 = Q.fresh.filter(x => x.type !== 'kana');
        const tp = ph0.length ? kanaTravelPh(ph0.length) : [];
        const ph = (tp.length ? tp : ph0).slice(0, n ? 2 : 0);
        Q.fresh = kn.slice(0, n >= 5 ? n : Math.max(0, n - ph.length)).concat(ph);
      } else Q.fresh = Q.fresh.slice(0, n);
      Q.due = Q.due.slice(0, plan(goal, p.lv, Q.due.length, Q.fresh.length).due);
      if (goal === 'kana') Q.apply = kanaApply(Q) || { route: 'path', params: { goal: 'kana' }, label: '五十音下一行', kana: 1 };
      if (goal === 'exam') {
        // 日檢：用今天新學的字與文法出 5 題
        // 評審 v18：不要 5 題都考 1 分鐘前剛看過的卡：今天新學最多 2 個＋以前學過的同級詞；不夠就從題庫隨機出
        const L = (p.lv && p.lv !== 'zero' ? p.lv : 'n5').toUpperCase(), fr = Q.fresh.filter(x => /^(v|g):/.test(x.id || '')).map(x => x.id);
        const LL = App.state.learn || {}, old = App.shuffle(Object.keys(LL).filter(id => /^v:/.test(id) && !fr.includes(id) && LL[id].reps && (!LL[id].m || !LL[id].m.lv || LL[id].m.lv === L))).slice(0, 3);
        const ids = old.length >= 2 ? fr.slice(0, 2).concat(old) : [];
        Q.apply = { route: 'act', params: { steps: [{ type: 'choice', params: Object.assign({ lv: L, kind: ['mean', 'ctx', 'form'], n: 5, quiz: true }, ids.length >= 3 ? { ids } : {}), title: L + ' 日檢 5 題' }], title: L + ' 日檢 5 題', lv: L, reward: 'apply:exam', back: { route: 'home', label: '回首頁' }, next: { route: 'today', params: { goal }, label: '回今日課 ▶' } }, label: L + ' 日檢 5 題' };
      }
      Q.fresh.forEach(it => { const ex = exOf(it); if (ex && !it.ex) it.ex = ex; });
      return fillReading(Q.fresh.concat(Q.due)).then(() => Q);
    });
  }
  let RUN = null;   // 進行中的今日課（離開再回來可接著上）：{key, goal, Q, phase:'run'|'end', res:[], t0}
  function lesson(el, params) {
    params = params || {};
    const p = App.profile(), goal = (params.goal && params.goal !== 'fun' ? params.goal : '') || (kanaMode(p) ? 'kana' : curGoal(p)), key = App.today() + '|' + goal;
    const d0 = dayRec(); applyDone(d0);
    if (!params.more && RUN && RUN.key === key) return RUN.phase === 'end' ? endView(el) : runLesson(el);
    const pend = !params.more && d0.done && !d0.applied;
    el.innerHTML = LOADING;
    Promise.all([prepLesson(goal), needSrc(ACT_JS)]).then(([Q]) => {
      if (!curIs('today')) return;
      RUN = { key, goal, Q, phase: 'run', cnt: {}, qg: {}, t0: Date.now(), due: new Set(Q.due.map(x => x.id)), neu: new Set(Q.fresh.map(x => x.id)) };
      if (pend) { Object.assign(RUN, { phase: 'end', saved: 1, sum: { learned: d0.learned || 0, rev: d0.reviewed || 0 } }); return endView(el); }
      if (!Q.due.length && !Q.fresh.length) return finishLesson(el);
      runLesson(el);
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center" style="margin:48px 0">😵 今日課載入失敗，請檢查網路後再試一次</p>'; });
  }
  // 已做過的：每個項目在今日課裡被記錄的次數（字卡在前、小測驗在後）→ 1 次＝字卡做過、新學 2 次＝小測驗也做過
  //   用 learnchange 事件計（中途切到別頁、沒按 ✕ 也記得進度）
  const doneSets = R => {
    const fc = new Set(), qz = new Set();
    for (const id in R.cnt) { if (R.cnt[id] >= 1) fc.add(id); if (R.neu.has(id) && R.cnt[id] >= 2) qz.add(id); }
    return { fc, qz };
  };
  document.addEventListener('learnchange', ev => {
    const R = RUN, id = ev.detail && ev.detail.id;
    if (!R || R.phase !== 'run' || !id || !(R.due.has(id) || R.neu.has(id))) return;
    R.cnt[id] = (R.cnt[id] || 0) + 1;
    if (R.neu.has(id) && R.cnt[id] >= 2 && ev.detail.e) R.qg[id] = ev.detail.e.g;
    dayRec().prog = progOf(R);
  });
  function progOf(R) {
    const Q = R.Q, { fc, qz } = doneSets(R);
    const rev = Q.due.filter(x => fc.has(x.id)).length, neu = Q.fresh.filter(x => fc.has(x.id)).length, qd = Q.fresh.filter(x => qz.has(x.id)).length;
    return { goal: R.goal, done: rev + neu + qd, tot: Q.due.length + Q.fresh.length * 2, rev, revN: Q.due.length, neu, neuN: Q.fresh.length };
  }
  // 今日課＝活動框架：①字卡（到期複習先考、新的先教）→ ②小測驗（四選一、不重考），結算由今日課自己畫
  function runLesson(el) {
    const R = RUN, Q = R.Q, { fc, qz } = doneSets(R);
    const cards = Q.due.concat(Q.fresh).filter(x => !fc.has(x.id)), quiz = Q.fresh.filter(x => !qz.has(x.id));
    const steps = [];
    if (cards.length) steps.push({ type: 'flashcard', items: cards, title: Q.due.length && cards.some(x => Q.due.includes(x)) ? '① 複習＋新學' : '① 新學' });
    if (quiz.length) steps.push({ type: 'choice', items: quiz, params: { mode: 'mix', retry: false }, title: '② 小測驗' });
    if (!steps.length) return finishLesson(el);
    const my = R.run = {};
    Activity.session(el, steps, { title: '今日課', end: false, back: { route: 'home' } }).then(sm => {
      if (RUN !== R || R.run !== my) return;
      if (sm.quit) { dayRec().prog = progOf(R); App.save(); return; }
      R.sm = sm;
      finishLesson(el);
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center" style="margin:48px 0">😵 今日課載入失敗，請重新整理再試一次</p>'; });
  }
  function finishLesson(el) {
    const R = RUN, Q = R.Q;
    if (!R.saved && !Q.due.length && !Q.fresh.length) { R.saved = 1; R.sum = { learned: 0, rev: 0 }; Q.apply = dayRec().done ? null : Q.apply; }   // 空的一課（明天到期已滿）不算一堂
    if (!R.saved) {
      R.saved = 1;
      const { fc } = doneSets(R);
      R.sum = { learned: Q.fresh.filter(x => (R.qg[x.id] || 0) >= 1).length, rev: Q.due.filter(x => fc.has(x.id)).length };
      const d = dayRec();
      delete d.prog;
      d.done = (d.done || 0) + 1; d.learned = (d.learned || 0) + R.sum.learned; d.reviewed = (d.reviewed || 0) + R.sum.rev;
      if (Q.apply && Q.apply.label) d.apLabel = Q.apply.label;
      R.xp = R.sm ? R.sm.xp || 0 : 0;   // XP 由活動框架給（不重複加）
      App.save();
    }
    R.phase = 'end';
    if (curIs('today')) endView(el);
  }
  function endView(el) {
    const R = RUN, Q = R.Q, sm = R.sum || { learned: 0, rev: 0 };
    const m = window.Learn && Learn.dueTomorrow ? Learn.dueTomorrow() : 0;   // 各結算頁共用 Learn.dueTomorrow
    const sk = App.streakInfo(), A = Q.apply || {}, dd = dayRec();
    applyDone(dd);
    const left = A.route && !dd.applied, empty = !Q.due.length && !Q.fresh.length;
    el.innerHTML = `<section class="td td-end">
      <p class="td-big" aria-hidden="true">${left ? '👍' : '🎉'}</p><h1>${empty ? '今天新學的量夠了' : left ? '主課完成，還差應用' : '今天的課完成！'}</h1>
      ${empty ? `<p class="td-left">明天要複習的已經有 ${m} 個（上限 ${(window.Learn && Learn.DUE_CAP) || 20}），明天再學新的</p>` : left ? '<p class="td-left">複習＋新學做完了 ✓ 最後一步：把今天學的用出來</p>' : ''}
      <div class="td-sum">
        <div><b>${sm.learned}</b><small>新學答對</small></div>
        <div><b>${sm.rev}</b><small>複習</small></div>
        <div><b>${m}</b><small>明天到期</small></div>
        <div><b>🔥${sk.days}</b><small>連勝天數</small></div>
      </div>
      ${R.xp ? `<p class="xpgain center">+${R.xp} XP</p>` : ''}
      <div class="td-endbtns">
      ${A.route ? `<button type="button" class="btn ${left ? 'primary' : ''} block" id="tdApply">▶ ${esc(A.label || '用出來')}${dd.applied ? ' ✓' : ''}</button>` : ''}
      ${dd.applied && !empty ? `<button type="button" class="btn primary block" id="tdMore">▶ 再上一課</button>` : ''}
      <button type="button" class="btn block" id="tdHome">回首頁</button>
      </div>
    </section>`;
    { const ts = el.querySelector('.td-sum'); if (ts && R.sm && window.Activity && Activity.celebrate) { const h = document.createElement('div'); ts.after(h); Activity.celebrate(h, R.sm, el.querySelector('.xpgain')); } }   // 星星、煙火、XP 往上跳
    const ap = el.querySelector('#tdApply');
    if (ap) ap.onclick = () => {
      const d = dayRec();
      if (!d.applied) { d.applyAt = Date.now(); d.apGoal = R.goal; d.apSnap = A.biz ? { biz: A.biz, n: bizDone(A.biz), st: bizStars(A.biz) } : A.kana ? { kana: kanaSeen() } : {}; }
      App.save();
      if (!A.world) return App.go(A.route, A.params || {});
      ap.disabled = true;
      need('play').then(() => { const nx = window.World && has(World, 'next') ? World.next() : null; App.go(nx && nx.route ? nx.route : 'play', nx && nx.route ? nx.params || {} : {}); }).catch(() => App.go('play'));
    };
    el.querySelector('#tdHome').onclick = () => App.go('home');
    const mo = el.querySelector('#tdMore'); if (mo) mo.onclick = () => { RUN = null; lesson(el, { goal: R.goal, more: 1 }); };
  }

  /* ---------- 首次開啟：直接選程度，或 3 題簡單定位 ---------- */
  // 每級 2 題（第 1 題假名）：該級兩題都對才往上一級；答錯停在上一級（會 N3 題、不會 N2 題 → 日常會話≈N3）
  const QUIZ = [
    { lv: 'kana', q: 'ね', sub: '這個假名怎麼念？', a: ['ne', 're', 'wa', 'nu'] },
    { lv: 'n5', q: 'すみません、水をください。', sub: '這句是什麼意思？', a: ['不好意思，請給我水', '不好意思，水在哪裡？', '這瓶水多少錢？', '謝謝，我不要水'] },
    { lv: 'n5', q: 'きのう、友だちと映画を見ました。', sub: '這句是什麼意思？', a: ['昨天和朋友看了電影', '明天要和朋友去看電影', '昨天一個人看了電影', '朋友昨天沒去看電影'] },
    { lv: 'n4', q: '雨が降ったら、タクシーで行きましょう。', sub: '這句是什麼意思？', a: ['如果下雨，就搭計程車去吧', '因為下雨，所以沒搭計程車', '雨停了，我們走路去吧', '下雨天計程車很貴'] },
    { lv: 'n4', q: '日本へ行ったことがありますか。', sub: '這句是什麼意思？', a: ['你去過日本嗎？', '你想去日本嗎？', '你什麼時候去日本？', '你現在在日本嗎？'] },
    { lv: 'n3', q: '忘れないように、手帳にメモしておきます。', sub: '這句是什麼意思？', a: ['為了不忘記，先記在手帳上', '忘了帶手帳，所以沒記下來', '我常常忘記看手帳', '手帳上的筆記不見了'] },
    { lv: 'n3', q: '彼は来るはずなのに、まだ来ていない。', sub: '這句是什麼意思？', a: ['他應該會來，卻還沒來', '他說不來，結果還是來了', '他可能不會來了，不用等', '他已經來過又走了'] },
    { lv: 'n2', q: '大雨にもかかわらず、会場には大勢の人が集まった。', sub: '這句是什麼意思？', a: ['儘管下大雨，會場還是來了很多人', '因為下大雨，會場沒什麼人', '大雨過後，大家才陸續到會場', '會場因大雨改到別的地方'] },
    { lv: 'n2', q: '努力したからこそ、合格できたのだ。', sub: '這句是什麼意思？', a: ['正因為努力了，才能考上', '雖然努力了，還是沒考上', '只要努力就一定能考上', '沒努力也考上了'] },
    { lv: 'n1', q: '当店は本日をもって閉店いたします。', sub: '這句是什麼意思？', a: ['本店於今天結束營業', '本店今天休息一天', '本店從今天開始營業', '本店今天提早打烊'] },
    { lv: 'n1', q: '雨が降ろうが槍が降ろうが、明日は必ず行く。', sub: '這句是什麼意思？', a: ['不管發生什麼事，明天一定去', '如果下雨，明天就不去了', '明天會下雨，記得帶傘', '天氣好的話明天才去'] }
  ];
  // 某級題目答錯 → 程度：假名錯＝完全沒學過；N5 題錯＝會五十音(≈N5)；N4 錯＝≈N5；N3 錯＝≈N4；N2 錯＝≈N3；N1 錯＝≈N2；全對＝≈N1
  const FAIL_AT = { kana: 'zero', n5: 'n5', n4: 'n5', n3: 'n4', n2: 'n3', n1: 'n2' };
  // 程度選項旁標 JLPT 對照
  const LV_N = { zero: '', n5: '≈N5', n4: '≈N4', n3: '≈N3', n2: '≈N2', n1: '≈N1' };
  const lvName = id => esc(App.LV_NAMES[id]) + (LV_N[id] ? `<em class="ob-n">${LV_N[id]}</em>` : '');
  function onboard(el, retake) {
    // 首次選程度：隱藏底部導覽與頂列按鈕，必須先選（core.render 換頁時自動解除）
    if (!App.profile().placed) document.body.classList.add('ob-mode');
    el.innerHTML = `<section class="ob">
      <h1>${retake ? '重新選程度' : 'ようこそ！歡迎 👋'}</h1>
      <p class="lead">你的日文大概到哪裡？選一個最接近的（之後隨時能在「我的」→ 設定改，進度不會歸零）</p>
      <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt" data-lv="${id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${lvName(id)}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
      <button type="button" class="btn ob-skip" id="ob-quiz">🤔 不確定？做幾題幫你判斷（最多 ${QUIZ.length} 題）</button>
    </section>`;
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => choose(b.dataset.lv, el));
    el.querySelector('#ob-quiz').onclick = () => quiz(el, 0);
  }
  function choose(lv, el) {
    const first = !App.profile().placed;
    App.setProfile({ lv });
    App.toast(`程度：${App.LV_NAMES[lv]}${lv === 'zero' ? '・先從五十音開始' : ''}`, 'ok');
    if (first && el) return goalAsk(el);   // 字級在設定裡改
    App.go('home');
  }
  // 首次開啟第二題：學日文的目的（可複選，存 profile.goals；決定首頁快查入口與推薦）
  const goalList = sel => GOALS.map(([id, ic, n, d]) => `<button type="button" class="ob-opt${sel.includes(id) ? ' on' : ''}" data-goal="${id}" aria-pressed="${sel.includes(id)}"><span aria-hidden="true">${ic}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('');
  function goalAsk(el) {
    document.body.classList.add('ob-mode');
    const sel = [];
    el.innerHTML = `<section class="ob">
      <h1>學日文是為了？</h1>
      <p class="lead">可以選好幾個，首頁會依這個推薦（之後能在「我的」→ 設定改）</p>
      <div class="ob-list">${goalList(sel)}</div>
      <button type="button" class="btn primary block" id="ob-go" disabled>選好了，開始！</button>
      <button type="button" class="btn ghost block" id="ob-any">還不確定，先都看看</button>
    </section>`;
    const go = el.querySelector('#ob-go');
    el.querySelector('#ob-any').onclick = () => { App.setProfile({ goals: GOALS.map(g => g[0]) }); App.go('home'); };   // 評審 v18：目的頁加「還不確定」
    el.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
      const g = b.dataset.goal, i = sel.indexOf(g);
      if (i < 0) sel.push(g); else sel.splice(i, 1);
      b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', i < 0);
      go.disabled = !sel.length;
    });
    go.onclick = () => { App.setProfile({ goals: sel.slice() }); App.go('home'); };
  }
  function quiz(el, i) {
    if (i >= QUIZ.length) return result(el, 'n1');
    const Q = QUIZ[i], opts = App.shuffle(Q.a);
    el.innerHTML = `<section class="ob">
      <p class="lead">定位小測驗 ${i + 1}／${QUIZ.length}・不會就選「不知道」，沒關係</p>
      <div class="bar"><div style="width:${i / QUIZ.length * 100}%"></div></div>
      <p class="ob-q"><span class="jp" lang="ja">${esc(Q.q)}</span><small>${esc(Q.sub)}</small></p>
      <div class="ob-list">${opts.map(a => `<button type="button" class="ob-opt" data-a="${esc(a)}"><span><b>${esc(a)}</b></span></button>`).join('')}
        <button type="button" class="ob-opt" data-a=""><span><b>不知道</b></span></button></div>
    </section>`;
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.dataset.a === Q.a[0] ? quiz(el, i + 1) : result(el, FAIL_AT[Q.lv]));
  }
  function result(el, lv) {
    el.innerHTML = `<section class="ob center">
      <p class="ob-q">${LV_ICON[lv]}<small>建議程度</small></p>
      <h1>${lvName(lv)}</h1>
      <p class="lead">${esc(App.LV_DESC[lv])}</p>
      <button type="button" class="btn primary block" id="ob-ok">就這個，開始！</button>
      <button type="button" class="btn ghost block" id="ob-back">我自己選</button>
    </section>`;
    el.querySelector('#ob-ok').onclick = () => choose(lv, el);
    el.querySelector('#ob-back').onclick = () => onboard(el, App.profile().placed);
  }

  /* ---------- 設定頁 ---------- */
  const PAL_NAMES = { coral: '珊瑚', sakura: '櫻花', matcha: '抹茶', ocean: '海洋', lavender: '薰衣草', mono: '墨黑' };
  let clearArmed = false;
  /* 語音包（資料與播放在 core.js：App.voicePacks／setVoice／ttsVoice） */
  const VOICE_DEMO = 'こんにちは。いらっしゃいませ、ご注文はお決まりですか？';
  function voiceBox() {
    if (!App.voicePacks) return '';
    const c = App.state.voice || {}, list = App.jaVoices ? App.jaVoices() : [];
    const rng = (id, lbl, v) => `<label class="st-rng"><span>${lbl}<b id="${id}-v">×${(+v).toFixed(2)}</b></span><input type="range" id="${id}" min="0.5" max="1.5" step="0.05" value="${v}"></label>`;
    return `<div class="st-box st-voice"><h2>🔊 語音</h2>${App.voiceHTML()}
        <p class="st-lbl">語音包</p>
        <div class="ob-list">${App.voicePacks().map(k => `<button type="button" class="ob-opt${k.on ? ' on' : ''}" data-vpack="${k.id}" aria-pressed="${k.on}"><span aria-hidden="true">${k.icon}</span><span><b>${esc(k.name)}${k.simulated ? '<em class="st-sim">模擬</em>' : ''}</b><small>${esc(k.desc)}</small></span></button>`).join('')}</div>
        <p class="st-lbl">指定系統語音</p>
        <select class="st-sel" id="st-vuri"><option value="">自動（依語音包挑選）</option>${list.map(v => `<option value="${esc(v.voiceURI)}"${v.voiceURI === c.voiceURI ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        ${list.some(v => v.voiceURI === c.voiceURI) || !c.voiceURI ? '' : '<p class="st-note">指定的語音在這台裝置找不到，改用自動。</p>'}
        <p class="st-lbl">微調</p>${rng('st-vrate', '速度', c.rate || 1)}${rng('st-vpitch', '音調', c.pitch || 1)}
        <div class="st-vbtns"><button type="button" class="btn primary" id="st-vtry">▶️ 試聽</button><button type="button" class="btn" id="st-vreset">↺ 微調歸零</button></div>
      </div>`;
  }
  function bindVoice(el) {
    if (!App.voicePacks) return;
    const q = s => el.querySelector(s), again = () => settings(el);
    el.querySelectorAll('[data-vpack]').forEach(b => b.onclick = () => { App.setVoice({ pack: b.dataset.vpack }); App.speak(VOICE_DEMO); again(); });
    q('#st-vuri').onchange = e => { App.setVoice({ voiceURI: e.target.value }); App.speak(VOICE_DEMO); };
    [['#st-vrate', 'rate'], ['#st-vpitch', 'pitch']].forEach(([s, k]) => {
      const r = q(s);
      r.oninput = () => { q(s + '-v').textContent = '×' + (+r.value).toFixed(2); };
      r.onchange = () => App.setVoice({ [k]: +r.value });
    });
    q('#st-vtry').onclick = () => App.speak(VOICE_DEMO);
    q('#st-vreset').onclick = () => { App.setVoice({ rate: 1, pitch: 1 }); again(); };
    // 語音清單晚載入時（Chrome 常見）補畫一次
    if (!(App.jaVoices && App.jaVoices().length)) document.addEventListener('voiceschange', () => { if (el.isConnected && el.querySelector('.st-voice')) again(); }, { once: true });
  }
  function settings(el, params) {
    const u = App.state.ui, p = App.profile(), G = window.Game;
    const seg = (name, cur, list) => `<div class="st-seg" role="group">${list.map(([v, n]) => `<button type="button" data-${name}="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;
    el.innerHTML = `<section class="st">
      <h1>⚙️ 設定</h1>
      <div class="st-box st-lv"><h2>📶 我的程度</h2>
        <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt${p.lv === id ? ' on' : ''}" data-lv="${id}" aria-pressed="${p.lv === id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${lvName(id)}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
        <p class="st-lbl">提示（讀音、中文、答案提示）</p>${seg('assist', p.assist, [['full', '全部顯示'], ['some', '只給讀音'], ['none', '不要提示']])}
        <p class="st-note">改程度只會換內容與提示，進度、星星、XP 都保留。</p>
        <button type="button" class="btn block" id="st-quiz">🤔 重新做定位測驗</button>
      </div>
      <div class="st-box" id="st-daily"><h2>🎯 每日目標</h2><p class="st-note">今日課長度、新學數量、每日任務都照這個調；歌曲、文章不算進每日進度，想做再做</p>
        <p class="st-lbl">每天學多久</p>${seg('mins', String(p.mins), [['5', '5 分'], ['8', '8 分'], ['15', '15 分'], ['30', '30 分']])}
        <p class="st-lbl">每天新學幾個</p>${seg('fresh', p.fresh == null ? 'auto' : String(p.fresh), [['auto', '自動'], ['0', '只複習'], ['3', '3'], ['5', '5'], ['8', '8'], ['12', '12']])}
      </div>
      <div class="st-box"><h2>🎯 學日文的目的</h2><p class="st-note">可複選，首頁會依這個推薦</p>
        <div class="ob-list">${goalList(p.goals)}</div>
      </div>
      <div class="st-box"><h2>🎨 外觀</h2>
        <p class="st-lbl">主題色</p>
        <div class="st-dots">${App.PALETTES.map(k => `<button type="button" class="st-dot${u.palette === k ? ' on' : ''}" data-pal="${k}" aria-pressed="${u.palette === k}"><i></i>${PAL_NAMES[k]}</button>`).join('')}</div>
        <p class="st-lbl">淺色／深色</p>${seg('theme', u.theme, [['system', '跟隨系統'], ['light', '☀️ 淺色'], ['dark', '🌙 深色']])}
        <p class="st-lbl">字級</p>${seg('fs', u.fs, [['m', '標準'], ['l', '大'], ['xl', '特大']])}
      </div>
      ${voiceBox()}
      <div class="st-box"><h2>🧰 其他</h2><div class="st-rows">
        ${G ? `<button type="button" class="st-row" id="st-sfx">${G.sfxOn() ? '🔊 音效' : '🔇 音效'}<small>${G.sfxOn() ? '開' : '關'}</small></button>` : ''}
        <button type="button" class="st-row" id="st-av">🎭 換頭像<small>›</small></button>
      </div></div>
      <div class="st-box"><h2>⚠️ 危險區</h2>
        <button type="button" class="btn block st-danger" id="st-clear">🗑️ 清除全部進度</button>
      </div>
      <p class="st-ver">日語冒險・版本 V${esc(App.VERSION || '')}</p>
    </section>`;
    const q = s => el.querySelector(s);
    el.querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { App.setTheme(null, b.dataset.pal); settings(el); });
    el.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { App.setTheme(b.dataset.theme); settings(el); });
    el.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { App.setTheme(null, null, b.dataset.fs); settings(el); });
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { App.setProfile({ lv: b.dataset.lv }); App.toast(`程度改為：${App.LV_NAMES[b.dataset.lv]}`, 'ok'); settings(el); });
    el.querySelectorAll('[data-assist]').forEach(b => b.onclick = () => { App.setProfile({ assist: b.dataset.assist }); settings(el); });
    el.querySelectorAll('[data-mins]').forEach(b => b.onclick = () => { App.setProfile({ mins: +b.dataset.mins }); App.toast(`每日目標：每天 ${b.dataset.mins} 分鐘`, 'ok'); settings(el, { focus: 'daily' }); });
    el.querySelectorAll('[data-fresh]').forEach(b => b.onclick = () => { App.setProfile({ fresh: b.dataset.fresh === 'auto' ? null : +b.dataset.fresh }); settings(el, { focus: 'daily' }); });
    el.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
      const g = App.profile().goals, i = g.indexOf(b.dataset.goal);
      if (i < 0) g.push(b.dataset.goal); else if (g.length > 1) g.splice(i, 1); else return App.toast('至少選一個目的');
      App.setProfile({ goals: g }); settings(el);
    });
    q('#st-quiz').onclick = () => quiz(el, 0);
    if (params && params.focus === 'daily') { const x = q('#st-daily'); if (x) setTimeout(() => x.scrollIntoView({ block: 'start' }), 50); }
    bindVoice(el);
    const sf =q('#st-sfx'); if (sf) sf.onclick = () => { G.toggleSfx(); settings(el); };
    q('#st-av').onclick = () => {
      if (G && has(G, 'pickAvatar')) G.pickAvatar(() => App.render());
    };
    q('#st-clear').onclick = () => {
      if (!clearArmed) { clearArmed = true; App.toast('⚠️ 會清除 XP、不會清單、所有進度。再點一次確定'); setTimeout(() => { clearArmed = false; }, 3000); return; }
      clearArmed = false; App.resetAll();
    };
  }


  App.register('home', { title: '首頁', icon: '🏠', nav: true, navOrder: 1, render });
  App.register('today', { title: '今日課', icon: '▶', nav: false, navParent: 'home', render: lesson });
  App.register('settings', { title: '設定', icon: '⚙️', nav: false, navParent: 'me', render: settings });
  window.Home = { render, settings, onboard, lazy, need, needSrc, loadCSS };
})();
