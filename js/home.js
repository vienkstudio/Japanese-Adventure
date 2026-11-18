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
  // 冒險地圖頁（還沒進街區）底部放「經典練習」入口
  const AFTER = {
    play(el, p) {
      if (p.d || p.s || el.querySelector('.cl-entry')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn block cl-entry'; b.textContent = '🏯 經典練習（舊版旅程、關卡、小遊戲）';
      b.onclick = () => App.go('classic'); el.appendChild(b);
    }
  };

  /* =========================================================
     今天：首頁
     ========================================================= */
  const GOALS = [['travel', '🧳', '去日本旅遊', '點餐、購物、問路、緊急求助'], ['exam', '📝', '考日檢', 'N5–N1 單字、文法、挑戰題'],
    ['work', '💼', '工作・商務', '敬語、Email、開會'], ['fun', '🎵', '歌曲・動漫・新聞', '跟唱、看懂歌詞與文章']];
  const GOAL_OF = Object.fromEntries(GOALS.map(g => [g[0], g]));
  const GOAL_SHORT = { travel: '旅遊', exam: '日檢', work: '商務', fun: '歌曲新聞' };
  const KANA_N = 46;
  // 今日紀錄（App.state.today，home.js 擁有）：{date, goal, done, learned, reviewed, applied}
  function dayRec() {
    const S = App.state, t = App.today();
    if (!S.today || S.today.date !== t) S.today = { date: t, goal: null, done: 0, learned: 0, reviewed: 0, applied: 0 };
    return S.today;
  }
  const kanaSeen = () => {
    const L = App.state.learn || {}; let n = 0;
    for (const id in L) if (/^kana:[ぁ-ん]$/.test(id) && (L[id].reps || L[id].s !== 'new')) n++;
    return Math.max(n, (((App.state.kanaL || {}).h) || []).length);
  };
  const kanaMode = p => p.lv === 'zero' && kanaSeen() < KANA_N;
  function curGoal(p) {
    p = p || App.profile();
    const g = dayRec().goal, gs = p.goals && p.goals.length ? p.goals : ['travel'];
    return gs.includes(g) ? g : gs[0];
  }
  const freshN = lv => ['n3', 'n2', 'n1'].includes(lv) ? 8 : lv === 'zero' ? 5 : 6;
  const APPLY_TXT = { travel: '到冒險店家用一次', exam: '日檢綜合 10 題', fun: '讀今日短文', work: '商務情境一課', kana: '五十音小考' };

  function render(el) {
    const p = App.profile();
    if (!p.placed) return onboard(el);
    const st = window.Learn ? Learn.stats() : { due: Tracker.dueCount() }, sk = App.streakInfo(), d = dayRec();
    const km = kanaMode(p), goal = curGoal(p), n = freshN(p.lv);
    const due = Math.min(15, st.due || 0);
    const sub = km ? `五十音 平假名 ${kanaSeen()}／${KANA_N}・今天學 ${n} 個字，先教再考`
      : `${due ? `複習 ${due} 個・` : ''}新學 ${n} 個・${APPLY_TXT[goal]}`;
    const big = d.done ? '▶ 再上一課' : '▶ 開始今天的課（約 8 分鐘）';
    const steps = [
      { b: '複習', v: d.done && !due ? '✓' : due ? `${due} 個到期` : '沒有到期', ok: !due },
      { b: '新學', v: d.learned >= n ? `${d.learned} 個 ✓` : `${d.learned}／${n}`, ok: d.learned >= n },
      { b: '應用', v: d.applied ? '✓' : '—', ok: !!d.applied }
    ];
    const pct = Math.round(steps.filter(s => s.ok).length / 3 * 100);
    const gs = p.goals || [];
    el.innerHTML = `<section class="hm">
      <h1 class="hm-hi">${greet()}<small>程度：${esc(App.LV_NAMES[p.lv])}</small></h1>
      <button type="button" class="hm-main" id="hm-main"><span class="ic" aria-hidden="true">${km ? 'あ' : (GOAL_OF[goal] || GOALS[0])[1]}</span><span><b>${esc(big)}</b><small>${esc(d.done ? '今天的課完成了 ✓ 想多學可以再來一課' : sub)}</small></span></button>
      ${!km && gs.length > 1 ? `<button type="button" class="hm-goal" id="hm-goal" aria-label="切換今天的目的">今天練：<b>${GOAL_OF[goal][1]} ${esc(GOAL_SHORT[goal])}</b><span aria-hidden="true">⇄ 換</span></button>` : ''}
      <div class="hm-prog" aria-label="今日進度">
        <p class="hm-sec">今日進度<small>${pct}%</small></p>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="hm-steps">${steps.map(s => `<span class="${s.ok ? 'ok' : ''}"><b>${s.b}</b>${esc(s.v)}</span>`).join('')}</div>
      </div>
      <p class="hm-streak">${sk.days ? `🔥 連續 ${sk.days} 天${sk.risk ? '・今天上一課就能保住' : sk.done ? '・今天已練習 ✓' : ''}` : '🔥 今天上完一課，開始累積連勝'}</p>
    </section>`;
    el.querySelector('#hm-main').onclick = () => App.go('today', { goal: km ? 'kana' : goal });
    const gb = el.querySelector('#hm-goal');
    if (gb) gb.onclick = () => { const i = gs.indexOf(goal); d.goal = gs[(i + 1) % gs.length]; App.save(); render(el); };
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
  const SRC = { kana: ['kana-data.js'], travel: SC, exam: [], fun: ['data/reading/daily.js'].concat(SC), work: BIZ_JS };
  const isKanaStr = s => /^[぀-ヿー・\s、。，！？!?「」]+$/.test(s || '');
  const romaOf = it => {
    if (it.romaji) return it.romaji;
    const k = it.kana || (isKanaStr(it.jp) ? it.jp : '');
    if (!k || !isKanaStr(k)) return '';
    try { return window.Phrase && Phrase.romaji ? Phrase.romaji(k, it.jp) : ''; } catch (e) { return ''; }
  };
  const fresh = id => { const e = Learn.get(id); return !e || (e.s === 'new' && !e.reps); };
  function fillFun(Q, n) {
    const R = window.READING; if (!R || !has(R, 'pick')) return null;
    const a = R.pick(App.profile().lv, App.today()); if (!a) return null;
    (a.p || []).forEach(([jp, zh]) => {
      if (Q.fresh.length >= n || !jp || jp.length > 60) return;
      const id = Learn.idOf({ jp }, 'phrase');
      if (!id || !fresh(id) || Q.fresh.some(x => x.id === id)) return;
      Q.fresh.push({ id, type: 'phrase', jp, kana: isKanaStr(jp) ? jp : '', zh, source: '📰 今日短文：' + a.title });
    });
    return a;
  }
  function fillWork(Q, n) {
    const B = window.BIZ; if (!B || !Array.isArray(B.units)) return;
    const ord = (B.META || []).map(m => m.id), us = B.units.slice().sort((x, y) => ord.indexOf(x.id) - ord.indexOf(y.id));
    for (const u of us) for (const [k, t] of [['vocab', 'vocab'], ['phrases', 'phrase']]) for (const w of (u[k] || [])) {
      if (Q.fresh.length >= n) return;
      const id = w && w.jp && Learn.idOf({ jp: w.jp }, t);
      if (!id || !fresh(id) || Q.fresh.some(x => x.id === id)) continue;
      Q.fresh.push({ id, type: t, jp: w.jp, kana: w.kana || '', zh: w.zh || '', hint: w.when || '', lv: u.lv || '', source: '💼 ' + (u.title || '商務') });
    }
  }
  function prepLesson(goal) {
    const p = App.profile(), n = freshN(p.lv);
    const js = ['js/phrase.js'].concat(SRC[goal] || []);
    return needSrc(js).then(() => goal === 'work' && window.BIZ && has(BIZ, 'load') ? BIZ.load() : 0).then(() => Learn.prepare(goal === 'kana' ? 'travel' : goal)).then(Q => {
      Q = Object.assign({}, Q, { goal, fresh: (Q.fresh || []).slice(0, 8), due: (Q.due || []).slice(0, 15) });
      if (goal === 'kana') Q.apply = { route: 'phrasebook', params: { tab: 'kana', sub: 'quiz' }, label: '五十音小考 10 題' };
      if (goal === 'travel') Q.apply = { world: 1, route: 'play', params: {}, label: '到冒險店家用一次' };
      if (goal === 'fun') {
        const a = fillFun(Q, n);
        if (Q.fresh.length < n) Learn.queue('travel').fresh.forEach(x => { if (Q.fresh.length < n && !Q.fresh.some(y => y.id === x.id)) Q.fresh.push(x); });
        Q.apply = a ? { route: 'read-article', params: { daily: a.id }, label: '讀今日短文：' + a.title } : { route: 'songs', params: {}, label: '聽一首歌' };
      }
      if (goal === 'work') {
        if (Q.fresh.length < n) fillWork(Q, n);
        const nx = window.BIZ && has(BIZ, 'next') ? BIZ.next() : null;
        Q.apply = nx && nx.route ? { route: nx.route, params: nx.params || {}, label: nx.label } : { route: 'biz', params: {}, label: '商務日語' };
      }
      Q.fresh = Q.fresh.slice(0, n);
      return Q;
    });
  }
  let RUN = null;   // 進行中的今日課（離開再回來可接著上）
  function lesson(el, params) {
    params = params || {};
    const p = App.profile(), goal = params.goal || (kanaMode(p) ? 'kana' : curGoal(p)), key = App.today() + '|' + goal;
    if (RUN && RUN.key === key && RUN.phase !== 'end') return step(el);
    el.innerHTML = LOADING;
    prepLesson(goal).then(Q => {
      if (!curIs('today')) return;
      RUN = { key, goal, Q, phase: 'rev', i: 0, quiz: [], retry: [], res: { rev: 0, revOk: 0, learned: new Set(), ok: 0 } };
      if (!Q.due.length) RUN.phase = 'new';
      if (RUN.phase === 'new' && !Q.fresh.length) RUN.phase = 'end';
      step(el);
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center" style="margin:48px 0">😵 今日課載入失敗，請檢查網路後再試一次</p>'; });
  }
  const say = it => App.speak(it.type === 'kana' ? (it.kana || it.jp) : (it.kana && isKanaStr(it.kana) ? it.kana : it.jp));
  const answerOf = it => it.type === 'kana' ? romaOf(it) : (it.zh || '');
  function head(title, i, n) {
    const tot = RUN.Q.due.length + RUN.Q.fresh.length * 2 + 1;
    const done = RUN.phase === 'rev' ? i : RUN.phase === 'new' ? RUN.Q.due.length + i : RUN.phase === 'quiz' ? RUN.Q.due.length + RUN.Q.fresh.length + Math.min(i, RUN.Q.fresh.length) : tot;
    return `<div class="td-top"><div class="bar"><div style="width:${Math.round(done / tot * 100)}%"></div></div><p class="td-step">${esc(title)}${n ? `<small>${i + 1}／${n}</small>` : ''}</p></div>`;
  }
  function cardHTML(it, show) {
    const ro = romaOf(it), kn = it.type === 'kana' ? '' : (it.kana && it.kana !== it.jp ? it.kana : '');
    return `<div class="td-card">
      ${it.emoji ? `<div class="td-emo" aria-hidden="true">${esc(it.emoji)}</div>` : ''}
      <p class="td-jp jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</p>
      ${show ? `${kn ? `<p class="td-kana jp" lang="ja">${esc(kn)}</p>` : ''}${ro ? `<p class="td-ro">${esc(ro)}</p>` : ''}<p class="td-zh">${esc(it.type === 'kana' ? (it.zh || '') : it.zh || '')}</p>${it.hint ? `<p class="td-hint">${esc(it.hint)}</p>` : ''}` : '<p class="td-zh muted">想一想：怎麼念？什麼意思？</p>'}
      <button type="button" class="td-say" id="tdSay" aria-label="播放發音">🔊</button>
      ${it.source ? `<p class="td-src">${esc(it.source)}</p>` : ''}
    </div>`;
  }
  function rec(it, g) { try { Learn.record(it.id, g, { src: 'today', item: it, type: it.type }); } catch (e) { console.warn(e); } }
  function step(el) {
    const R = RUN, Q = R.Q;
    if (R.phase === 'rev') {
      const it = Q.due[R.i];
      if (!it) { R.phase = 'new'; R.i = 0; if (!Q.fresh.length) R.phase = 'end'; return step(el); }
      el.innerHTML = `<section class="td">${head('① 複習到期的', R.i, Q.due.length)}${cardHTML(it, false)}
        <div class="td-act"><button type="button" class="btn primary block" id="tdShow">看答案</button></div></section>`;
      el.querySelector('#tdSay').onclick = () => say(it);
      el.querySelector('#tdShow').onclick = () => {
        el.querySelector('.td-card').outerHTML = cardHTML(it, true);
        el.querySelector('#tdSay').onclick = () => say(it); say(it);
        el.querySelector('.td-act').innerHTML = `<p class="td-q">你剛剛記得嗎？</p><div class="td-grade">
          <button type="button" class="btn" data-g="0">😵 忘了</button><button type="button" class="btn" data-g="2">🙂 記得</button><button type="button" class="btn" data-g="3">😊 很簡單</button></div>`;
        el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = +b.dataset.g; rec(it, g); R.res.rev++; if (g) R.res.revOk++; R.i++; step(el); });
      };
      return;
    }
    if (R.phase === 'new') {
      const it = Q.fresh[R.i];
      if (!it) { R.phase = 'quiz'; R.i = 0; R.quiz = App.shuffle(Q.fresh.slice()); return step(el); }
      el.innerHTML = `<section class="td">${head('② 新學', R.i, Q.fresh.length)}${cardHTML(it, true)}
        <div class="td-act"><button type="button" class="btn primary block" id="tdNext">${R.i + 1 < Q.fresh.length ? '記住了，下一個 ▶' : '記住了，來小測驗 ▶'}</button></div></section>`;
      el.querySelector('#tdSay').onclick = () => say(it); say(it);
      el.querySelector('#tdNext').onclick = () => { R.i++; step(el); };
      return;
    }
    if (R.phase === 'quiz') {
      const it = R.quiz[R.i];
      if (!it) {
        if (R.retry.length) { R.quiz = R.retry; R.retry = []; R.i = 0; R.second = 1; return step(el); }
        R.phase = 'end'; return step(el);
      }
      const ans = answerOf(it);
      const pool = [...new Set(Q.fresh.concat(Q.due).filter(x => x.type === it.type || it.type !== 'kana').map(answerOf).filter(a => a && a !== ans))];
      if (!ans || pool.length < 1) { rec(it, 2); R.res.learned.add(it.id); R.i++; return step(el); }
      const opts = App.shuffle([ans].concat(App.shuffle(pool).slice(0, 3)));
      el.innerHTML = `<section class="td">${head('③ 小測驗' + (R.second ? '・再一次' : ''), R.i, R.quiz.length)}
        <div class="td-card"><p class="td-jp jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</p><button type="button" class="td-say" id="tdSay" aria-label="播放發音">🔊</button>
        <p class="td-q">${it.type === 'kana' ? '怎麼念？' : '是什麼意思？'}</p></div>
        <div class="td-opts">${opts.map((o, k) => `<button type="button" class="btn block" data-o="${k}">${esc(o)}</button>`).join('')}</div><p class="td-fb" aria-live="polite"></p></section>`;
      el.querySelector('#tdSay').onclick = () => say(it);
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.o] === ans;
        el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (opts[+x.dataset.o] === ans) x.classList.add('ok'); });
        if (!ok) b.classList.add('ng');
        if (window.Game && has(Game, 'sfx')) try { Game.sfx(ok ? 'ok' : 'ng'); } catch (e) { }
        if (ok) { rec(it, R.second ? 1 : 2); R.res.learned.add(it.id); R.res.ok++; }
        else { rec(it, 0); if (!R.second) R.retry.push(it); }
        const fb = el.querySelector('.td-fb'); fb.className = 'td-fb ' + (ok ? 'ok' : 'ng');
        fb.innerHTML = `${ok ? '✓ 答對了！' : '✗ 正確答案：' + esc(ans)}<button type="button" class="btn primary block" id="tdGo">繼續 ▶</button>`;
        say(it);
        el.querySelector('#tdGo').onclick = () => { R.i++; step(el); };
      });
      return;
    }
    // 結算
    if (!R.saved) {
      R.saved = 1;
      const d = dayRec();
      d.done = (d.done || 0) + 1; d.learned = (d.learned || 0) + R.res.learned.size; d.reviewed = (d.reviewed || 0) + R.res.rev;
      const xp = R.res.ok * 2 + R.res.revOk + 5;
      App.addXP(xp, '今日課');
      R.xp = xp;
      App.save();
    }
    const end = new Date(); end.setHours(0, 0, 0, 0); const tmr = end.getTime() + 2 * 864e5;
    const L = App.state.learn || {}; let m = 0;
    for (const id in L) { const e = L[id]; if (e.s !== 'new' && (e.reps || e.star || e.lapses) && (e.due || 0) < tmr) m++; }
    const sk = App.streakInfo(), A = Q.apply || {};
    el.innerHTML = `<section class="td td-end">
      <p class="td-big" aria-hidden="true">🎉</p><h1>今天的課完成！</h1>
      <div class="td-sum">
        <div><b>${R.res.learned.size}</b><small>學會</small></div>
        <div><b>${R.res.rev}</b><small>複習</small></div>
        <div><b>${m}</b><small>明天到期</small></div>
        <div><b>🔥${sk.days}</b><small>連勝天數</small></div>
      </div>
      ${R.xp ? `<p class="xpgain center">+${R.xp} XP</p>` : ''}
      ${A.route ? `<button type="button" class="btn primary block" id="tdApply">▶ 用出來：${esc(A.label || '應用')}</button>` : ''}
      <button type="button" class="btn block" id="tdHome">回首頁</button>
    </section>`;
    R.phase = 'end';
    const ap = el.querySelector('#tdApply');
    if (ap) ap.onclick = () => {
      const d = dayRec(); d.applied = 1; App.save();
      if (!A.world) return App.go(A.route, A.params || {});
      ap.disabled = true;
      need('play').then(() => { const nx = window.World && has(World, 'next') ? World.next() : null; App.go(nx && nx.route ? nx.route : 'play', nx && nx.route ? nx.params || {} : {}); }).catch(() => App.go('play'));
    };
    el.querySelector('#tdHome').onclick = () => App.go('home');
  }

  /* ---------- 首次開啟：直接選程度，或 3 題簡單定位 ---------- */
  const QUIZ = [
    { q: 'ね', sub: '這個假名怎麼念？', a: ['ne', 're', 'wa', 'nu'] },
    { q: 'すみません、水をください。', sub: '這句是什麼意思？', a: ['不好意思，請給我水', '不好意思，水在哪裡？', '這瓶水多少錢？', '謝謝，我不要水'] },
    { q: '雨が降ったら、タクシーで行きましょう。', sub: '這句是什麼意思？', a: ['如果下雨，就搭計程車去吧', '因為下雨，所以沒搭計程車', '雨停了，我們走路去吧', '下雨天計程車很貴'] },
    { q: '忘れないように、手帳にメモしておきます。', sub: '這句是什麼意思？', a: ['為了不忘記，先記在手帳上', '忘了帶手帳，所以沒記下來', '我常常忘記看手帳', '手帳上的筆記不見了'] },
    { q: '大雨にもかかわらず、会場には大勢の人が集まった。', sub: '這句是什麼意思？', a: ['儘管下大雨，會場還是來了很多人', '因為下大雨，會場沒什麼人', '大雨過後，大家才陸續到會場', '會場因大雨改到別的地方'] },
    { q: '当店は本日をもって閉店いたします。', sub: '這句是什麼意思？', a: ['本店於今天結束營業', '本店今天休息一天', '本店從今天開始營業', '本店今天提早打烊'] }
  ];
  const FAIL_AT = ['zero', 'n5', 'n5', 'n4', 'n3', 'n2'];   // 第 i 題答錯 → 程度；全對＝n1
  function onboard(el, retake) {
    // 首次選程度：隱藏底部導覽與頂列按鈕，必須先選（core.render 換頁時自動解除）
    if (!App.profile().placed) document.body.classList.add('ob-mode');
    el.innerHTML = `<section class="ob">
      <h1>${retake ? '重新選程度' : 'ようこそ！歡迎 👋'}</h1>
      <p class="lead">你的日文大概到哪裡？選一個最接近的（之後隨時能在 ⚙️ 設定改，進度不會歸零）</p>
      <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt" data-lv="${id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${esc(App.LV_NAMES[id])}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
      <button type="button" class="btn ob-skip" id="ob-quiz">🤔 不確定？最多 6 題幫你判斷</button>
    </section>`;
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => choose(b.dataset.lv, el));
    el.querySelector('#ob-quiz').onclick = () => quiz(el, 0);
  }
  function choose(lv, el) {
    const first = !App.profile().placed;
    App.setProfile({ lv });
    App.toast(`程度：${App.LV_NAMES[lv]}${lv === 'zero' ? '・先從五十音開始' : ''}`, 'ok');
    if (first && el) return fontAsk(el);
    App.go('home');
  }
  // 首次開啟第二題：字級（存 App.state.ui.fs；之後在 ⚙️ 設定也能改）
  function fontAsk(el) {
    document.body.classList.add('ob-mode');
    const cur = (App.state.ui || {}).fs || 'm';
    const FS = [['m', '標準', 100], ['l', '大', 125], ['xl', '特大', 150]];
    el.innerHTML = `<section class="ob">
      <h1>字要大一點嗎？</h1>
      <p class="lead">選一個看得最舒服的（之後隨時能在 ⚙️ 設定改）</p>
      <div class="ob-list">${FS.map(([v, n, pc]) => `<button type="button" class="ob-opt ob-fs${cur === v ? ' on' : ''}" data-fs="${v}" aria-pressed="${cur === v}"><span><b style="font-size:${pc}%">${n}</b><small class="jp" lang="ja" style="font-size:${pc}%">こんにちは・你好</small></span></button>`).join('')}</div>
    </section>`;
    el.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { App.setTheme(null, null, b.dataset.fs); goalAsk(el); });
  }
  // 首次開啟第三題：學日文的目的（可複選，存 profile.goals；決定首頁快查入口與推薦）
  const goalList = sel => GOALS.map(([id, ic, n, d]) => `<button type="button" class="ob-opt${sel.includes(id) ? ' on' : ''}" data-goal="${id}" aria-pressed="${sel.includes(id)}"><span aria-hidden="true">${ic}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('');
  function goalAsk(el) {
    document.body.classList.add('ob-mode');
    const sel = [];
    el.innerHTML = `<section class="ob">
      <h1>學日文是為了？</h1>
      <p class="lead">可以選好幾個，首頁會依這個推薦（之後能在 ⚙️ 設定改）</p>
      <div class="ob-list">${goalList(sel)}</div>
      <button type="button" class="btn primary block" id="ob-go" disabled>選好了，開始！</button>
    </section>`;
    const go = el.querySelector('#ob-go');
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
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.dataset.a === Q.a[0] ? quiz(el, i + 1) : result(el, FAIL_AT[i]));
  }
  function result(el, lv) {
    el.innerHTML = `<section class="ob center">
      <p class="ob-q">${LV_ICON[lv]}<small>建議程度</small></p>
      <h1>${esc(App.LV_NAMES[lv])}</h1>
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
  function settings(el) {
    const u = App.state.ui, p = App.profile(), G = window.Game;
    const seg = (name, cur, list) => `<div class="st-seg" role="group">${list.map(([v, n]) => `<button type="button" data-${name}="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;
    el.innerHTML = `<section class="st">
      <h1>⚙️ 設定</h1>
      <div class="st-box st-lv"><h2>📶 我的程度</h2>
        <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt${p.lv === id ? ' on' : ''}" data-lv="${id}" aria-pressed="${p.lv === id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${esc(App.LV_NAMES[id])}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
        <p class="st-lbl">提示（讀音、中文、答案提示）</p>${seg('assist', p.assist, [['full', '全部顯示'], ['some', '只給讀音'], ['none', '不要提示']])}
        <p class="st-note">改程度只會換內容與提示，進度、星星、XP 都保留。</p>
        <button type="button" class="btn block" id="st-quiz">🤔 重新做定位測驗</button>
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
        <button type="button" class="st-row" id="st-cl">🏯 經典練習<small>舊版旅程、關卡、小遊戲 ›</small></button>
        <button type="button" class="st-row" id="st-bk">💾 備份／還原存檔<small>${App.saveStatus === 'cloud' ? '已雲端存檔' : '存在這台裝置'}</small></button>
      </div></div>
      <div class="st-box"><h2>⚠️ 危險區</h2>
        <button type="button" class="btn block st-danger" id="st-clear">🗑️ 清除全部進度</button>
      </div>
      <p class="st-ver">日語冒險</p>
    </section>`;
    const q = s => el.querySelector(s);
    el.querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { App.setTheme(null, b.dataset.pal); settings(el); });
    el.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { App.setTheme(b.dataset.theme); settings(el); });
    el.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { App.setTheme(null, null, b.dataset.fs); settings(el); });
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { App.setProfile({ lv: b.dataset.lv }); App.toast(`程度改為：${App.LV_NAMES[b.dataset.lv]}`, 'ok'); settings(el); });
    el.querySelectorAll('[data-assist]').forEach(b => b.onclick = () => { App.setProfile({ assist: b.dataset.assist }); settings(el); });
    el.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
      const g = App.profile().goals, i = g.indexOf(b.dataset.goal);
      if (i < 0) g.push(b.dataset.goal); else if (g.length > 1) g.splice(i, 1); else return App.toast('至少選一個目的');
      App.setProfile({ goals: g }); settings(el);
    });
    q('#st-quiz').onclick = () => quiz(el, 0);
    bindVoice(el);
    const sf =q('#st-sfx'); if (sf) sf.onclick = () => { G.toggleSfx(); settings(el); };
    q('#st-av').onclick = () => {
      if (G && has(G, 'pickAvatar')) G.pickAvatar(() => App.render());
    };
    q('#st-bk').onclick = () => App.backup();
    q('#st-cl').onclick = () => App.go('classic');
    q('#st-clear').onclick = () => {
      if (!clearArmed) { clearArmed = true; App.toast('⚠️ 會清除 XP、不會清單、所有進度。再點一次確定'); setTimeout(() => { clearArmed = false; }, 3000); return; }
      clearArmed = false; App.resetAll();
    };
  }


  App.register('home', { title: '今天', icon: '🏠', nav: true, navOrder: 1, render });
  App.register('today', { title: '今日課', icon: '▶', nav: false, navParent: 'home', render: lesson });
  App.register('settings', { title: '設定', icon: '⚙️', nav: false, navParent: 'home', render: settings });
  window.Home = { render, settings, onboard, lazy, need, needSrc, loadCSS };
})();
