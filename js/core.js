/* =========================================================
   日語冒險 — 核心框架 core.js
   提供：App（路由/存檔/經驗值/工具）、Tracker（不會清單）
   其他模組只透過這裡公開的 API 溝通，不得直接改 localStorage。
   ========================================================= */
(function () {
  const KEY = 'jpQuest.v1';
  const DEF = { xp: 0, cleared: {}, tracked: [], log: [], streak: { last: null, days: 0 }, sceneDone: {} };
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
  let S;
  try { S = Object.assign({}, DEF, JSON.parse(LS.get(KEY) || '{}')); }
  catch (e) { S = JSON.parse(JSON.stringify(DEF)); }

  // 等級門檻：第 n 級需要 LEVELS[n-1] XP
  const LEVELS = [0, 60, 150, 280, 450, 670, 940, 1260, 1640, 2080, 2600, 3200, 3900, 4700, 5600];
  const TITLES = ['新手旅人', '五十音學徒', '假名見習生', '片假名探險家', '便利商店常客', '拉麵達人', '電車通勤者',
    '購物高手', '觀光老手', '日語旅人', '街頭溝通王', '日本通', '準日本人', '日語大師', '傳說旅人'];

  function levelOf(xp) { let l = 1; for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; }

  const listeners = [];
  /* ---- 存檔：本機 localStorage ＋ 雲端（Claude 網站 db：data/users/<id>/save） ---- */
  const lsOK = (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })();
  const CL = { ref: null, status: lsOK ? 'local' : 'none', busy: false, dirty: false, timer: null };
  function cloudPush() {
    if (!CL.ref) return;
    if (CL.busy) { CL.dirty = true; return; }
    CL.busy = true; CL.dirty = false;
    CL.ref.set({ s: JSON.stringify(S), t: S._t || Date.now() })
      .then(() => { CL.status = 'cloud'; })
      .catch(e => { if (e && e.code === 'invalid_argument') { CL.ref = null; } CL.status = lsOK ? 'local' : 'none'; })
      .finally(() => { CL.busy = false; renderNav(); if (CL.dirty) cloudPush(); });
  }
  function save() {
    S._t = Date.now();
    LS.set(KEY, JSON.stringify(S));
    if (CL.ref) { clearTimeout(CL.timer); CL.timer = setTimeout(cloudPush, 1500); }
    listeners.forEach(f => { try { f(S); } catch (e) { console.error(e); } });
  }
  async function cloudInit() {
    try {
      if (!(window.claude && typeof claude.use === 'function')) return;
      const db = await claude.use('db'), u = await claude.use('user');
      if (!db || !u) return;
      const id = await u.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await Promise.race([ref.get(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))]);
      CL.ref = ref;
      const d = snap.exists ? snap.data() : null;
      if (d && d.s && (d.t || 0) > (S._t || 0)) {
        try { S = Object.assign({}, DEF, JSON.parse(d.s)); LS.set(KEY, JSON.stringify(S)); CL.status = 'cloud'; render(); toast('☁️ 已載入雲端存檔', 'ok'); } catch (e) { }
      } else if (S.xp || S.tracked.length || Object.keys(S.cleared).length) cloudPush();
      else CL.status = 'cloud';
      renderNav();
    } catch (e) { }
  }

  // 連續學習天數
  (function streak() {
    const today = new Date().toISOString().slice(0, 10);
    if (S.streak.last === today) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak.days = S.streak.last === y ? S.streak.days + 1 : 1;
    S.streak.last = today;
    LS.set(KEY, JSON.stringify(S));
  })();

  /* ---------------- 工具 ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);

  function speakJP(text) {
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(v => /ja/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  function toast(msg, type) {
    let box = document.getElementById('toastBox');
    if (!box) { box = document.createElement('div'); box.id = 'toastBox'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  // 彈窗：buttons = [{label, cls, onClick}]；回傳 close()
  function modal(html, buttons) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}<div class="modal-btns"></div></div>`;
    const close = () => bg.remove();
    const bb = bg.querySelector('.modal-btns');
    (buttons || [{ label: '關閉' }]).forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.onclick = () => { close(); b.onClick && b.onClick(); };
      bb.appendChild(el);
    });
    document.body.appendChild(bg);
    return close;
  }

  /* ---------------- 經驗值 / 關卡 ---------------- */
  function addXP(n, reason) {
    n = Math.round(n || 0); if (n <= 0) return { gained: 0, levelUp: false };
    const before = levelOf(S.xp);
    S.xp += n;
    S.log.unshift({ t: Date.now(), xp: n, reason: reason || '' });
    S.log = S.log.slice(0, 50);
    const after = levelOf(S.xp);
    save();
    toast(`✨ +${n} XP ${reason ? '・' + esc(reason) : ''}`, 'xp');
    if (after > before) setTimeout(() => modal(`<div class="lvup">🎉</div><h2>升級！Lv.${after}</h2><p>獲得稱號：<b>${TITLES[after - 1] || '傳說旅人'}</b></p><p class="muted">新的關卡或場景可能已解鎖！</p>`, [{ label: '太棒了！', cls: 'primary' }]) && document.body.lastElementChild.classList.add('keep'), 400);
    return { gained: n, levelUp: after > before };
  }

  /**
   * 完成關卡
   * @param {string} id 關卡 id
   * @param {number} stars 0–3（0＝未通過，不記錄）
   * @param {number} baseXP 首次通關的 XP；重玩只給 30%，刷新星數再補差額
   */
  function completeQuest(id, stars, baseXP) {
    stars = Math.max(0, Math.min(3, stars | 0));
    const prev = S.cleared[id] || 0;
    let xp = 0;
    if (stars > 0) {
      xp = prev ? Math.round(baseXP * 0.3) : baseXP;
      if (stars > prev) { S.cleared[id] = stars; xp += (stars - prev) * 5; }
    }
    save();
    const r = xp ? addXP(xp, '關卡完成') : { gained: 0, levelUp: false };
    return { stars, prevStars: prev, gained: r.gained, levelUp: r.levelUp, firstClear: !prev && stars > 0 };
  }

  /**
   * 標準結果畫面
   * opts: {title, stars, correct, total, gained, wrong:[trackerItem], retry:fn, next:{label, route, params}, back:{label, route, params}}
   */
  function showResult(opts) {
    const stars = [0, 1, 2].map(i => `<span class="s">${i < (opts.stars || 0) ? '⭐' : '☆'}</span>`).join('');
    const wrong = (opts.wrong || []);
    const html = `<div class="result">
      <div class="stars">${stars}</div>
      <h2>${esc(opts.title || (opts.stars ? '過關！' : '再試一次'))}</h2>
      ${opts.total != null ? `<p>答對 <b>${opts.correct}</b> / ${opts.total}</p>` : ''}
      ${opts.gained ? `<p class="xpgain">+${opts.gained} XP</p>` : ''}
      ${wrong.length ? `<div class="muted">答錯的已自動加入 📌不會清單：</div><div class="chips">${wrong.map(w => `<span class="chip">${esc(w.jp)} <small>${esc(w.zh || w.romaji || '')}</small></span>`).join('')}</div>` : ''}
    </div>`;
    const btns = [];
    if (opts.retry) btns.push({ label: '🔄 再玩一次', onClick: opts.retry });
    if (opts.back) btns.push({ label: opts.back.label || '返回', onClick: () => go(opts.back.route, opts.back.params) });
    if (opts.next) btns.push({ label: opts.next.label || '下一關 ➜', cls: 'primary', onClick: () => go(opts.next.route, opts.next.params) });
    if (!btns.length) btns.push({ label: '確定', cls: 'primary' });
    return modal(html, btns);
  }

  /* ---------------- 路由 ---------------- */
  const routes = {};
  const order = [];
  function register(name, def) { routes[name] = def; if (!order.includes(name)) order.push(name); if (started) { renderNav(); } }
  // 路由：記憶體為主，網址只放單純的 #名稱（相容 Claude 網站等沙盒環境）
  let CUR = null, skipHash = null;
  const lastParams = {};
  function readHash() {
    let h = '';
    try { h = location.hash.replace(/^#\/?/, ''); } catch (e) { }
    const [name, q] = h.split('?');
    const params = {};
    (q || '').split('&').filter(Boolean).forEach(p => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { name: name || 'home', params };
  }
  function parseHash() { return CUR || (CUR = readHash()); }
  function go(name, params) {
    CUR = { name, params: params || {} };
    lastParams[name] = CUR.params;
    const h = '#' + name;
    try { if (location.hash !== h) { skipHash = h; location.hash = h; } } catch (e) { }
    render();
  }
  function onHash() {
    let h = ''; try { h = location.hash; } catch (e) { }
    if (skipHash && h === skipHash) { skipHash = null; return; }
    skipHash = null;
    const r = readHash();
    if (CUR && r.name === CUR.name) return;
    if (!Object.keys(r.params).length && lastParams[r.name]) r.params = lastParams[r.name];
    CUR = r; render();
  }
  let started = false;
  function render() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll('.modal-bg:not(.keep)').forEach(m => m.remove());
    const { name, params } = parseHash();
    const r = routes[name] || routes.home;
    const main = document.getElementById('main');
    main.innerHTML = '';
    main.className = 'route-' + (routes[name] ? name : 'home');
    window.scrollTo(0, 0);
    renderNav();
    try { r.render(main, params); }
    catch (e) { console.error(e); main.innerHTML = `<div class="panel"><h2>😵 頁面發生錯誤</h2><pre>${esc(e.stack || e)}</pre></div>`; }
  }
  function renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const cur = parseHash().name;
    nav.innerHTML = order.filter(n => routes[n].nav).map(n => {
      const r = routes[n];
      const badge = n === 'review' && Tracker.count() ? `<span class="badge">${Tracker.count()}</span>` : '';
      return `<a href="#${n}" data-route="${n}" class="${cur === n ? 'on' : ''}"><span class="ni">${r.icon || ''}</span><span>${esc(r.title)}</span>${badge}</a>`;
    }).join('');
    nav.querySelectorAll('a[data-route]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.route); });
    const logo = document.querySelector('#top .logo'); if (logo) logo.onclick = e => { e.preventDefault(); go('home'); };
    const lv = levelOf(S.xp);
    const pc = document.getElementById('playerChip');
    if (pc) {
      const lo = LEVELS[lv - 1], hi = LEVELS[lv] || LEVELS[lv - 1] + 1000;
      const ss = { cloud: ['☁️', '已雲端存檔'], local: ['💾', '存在這台裝置'], none: ['⚠️', '無法存檔：本次進度關閉後會消失'] }[CL.status];
      pc.innerHTML = `<span class="sv" title="${ss[1]}">${ss[0]}</span><span class="lvb">Lv.${lv}</span><div class="xpw"><div class="mini-bar"><div style="width:${Math.min(100, (S.xp - lo) / (hi - lo) * 100)}%"></div></div><small>${S.xp} XP・🔥${S.streak.days}</small></div>` +
        (window.Game ? `<button class="icon-btn" id="sfxBtn" title="音效">${Game.sfxOn() ? '🔊' : '🔇'}</button>` : '');
      const sb = document.getElementById('sfxBtn'); if (sb) sb.onclick = () => { Game.toggleSfx(); renderNav(); };
    }
  }
  function start() { started = true; parseHash(); lastParams[CUR.name] = CUR.params; window.addEventListener('hashchange', onHash); onChange(renderNav); render(); cloudInit(); }
  function onChange(fn) { listeners.push(fn); }

  /* ---------------- Tracker：不會清單 ----------------
     item: {id, jp, kana?, romaji?, zh, hint?, emoji?, source}
     id 規則：'kana:あ'（假名，用平假名當 key）、'word:<jp>'、'phrase:<jp>'
  ---------------------------------------------------- */
  const Tracker = {
    add(item, silent) {
      if (!item || !item.id) return false;
      const ex = this.get(item.id);
      if (ex) { if (ex.mastered) { ex.mastered = false; ex.streak = 0; save(); } return false; }
      S.tracked.unshift(Object.assign({ source: '其他' }, item, { added: Date.now(), right: 0, wrong: 0, streak: 0, mastered: false }));
      save();
      if (!silent) toast(`📌 已加入不會清單：${esc(item.jp)}`);
      return true;
    },
    remove(id) { S.tracked = S.tracked.filter(t => t.id !== id); save(); },
    has(id) { return S.tracked.some(t => t.id === id && !t.mastered); },
    get(id) { return S.tracked.find(t => t.id === id) || null; },
    list(includeMastered) { return S.tracked.filter(t => includeMastered || !t.mastered); },
    count() { return S.tracked.filter(t => !t.mastered).length; },
    // 複習時呼叫：連續答對 3 次 → mastered
    mark(id, correct) {
      const t = this.get(id); if (!t) return null;
      if (correct) { t.right++; t.streak++; if (t.streak >= 3 && !t.mastered) { t.mastered = true; toast(`🎓 已掌握：${esc(t.jp)}`, 'ok'); } }
      else { t.wrong++; t.streak = 0; t.mastered = false; }
      save(); return t;
    },
    clearMastered() { S.tracked = S.tracked.filter(t => !t.mastered); save(); },
    exportJSON() { return JSON.stringify(S.tracked, null, 2); },
    importJSON(txt) { const arr = JSON.parse(txt); if (!Array.isArray(arr)) throw new Error('格式錯誤'); let n = 0; arr.forEach(i => { if (i && i.id && !this.get(i.id)) { S.tracked.push(i); n++; } }); save(); return n; }
  };

  // 把 KANA 陣列的一列轉成清單項目
  function kanaItem(k) {
    return { id: 'kana:' + k[0], jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', hint: k[5], emoji: k[4], source: '五十音' };
  }
  // 把場景單字/句子轉成清單項目
  function wordItem(w, sceneName, kind) {
    return { id: (kind || 'word') + ':' + w.jp, jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh, hint: w.hint || '', emoji: w.emoji || '', source: sceneName || '其他' };
  }

  window.App = {
    get state() { return S; },
    LEVELS, TITLES, levelOf,
    get level() { return levelOf(S.xp); },
    save, onChange, register, go, start, render,
    addXP, completeQuest, showResult, modal, toast,
    speak: speakJP, esc, shuffle, sample, kanaItem, wordItem,
    isCleared: id => !!S.cleared[id], stars: id => S.cleared[id] || 0,
    resetAll() { LS.del(KEY); S = JSON.parse(JSON.stringify(DEF)); save(); if (CL.ref) cloudPush(); go('home'); },
    get saveStatus() { return CL.status; },
    loadState(o) { S = Object.assign({}, JSON.parse(JSON.stringify(DEF)), o); save(); if (CL.ref) cloudPush(); render(); },
    store: LS
  };
  window.Tracker = Tracker;
})();
