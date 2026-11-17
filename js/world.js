/* =========================================================
   日語冒險 — 冒險世界引擎 world.js
   日本地圖 → 街區地圖 → 店內地圖，全部由 data/world/ 的資料驅動（格式：docs/世界資料格式.md）。
   這個檔案：存檔、載入、地圖行走、互動面板、句子組裝、店員問答、買東西／點餐／辦手續流程。
   委託（任務）、對話、狀況題、御朱印在 js/world-quest.js，透過 World.X 與 World.Q 溝通。
   路由：play（params {r 地區, d 街區, s 店}）
   ========================================================= */
(function () {
  'use strict';
  const W = window.WORLD, esc = App.esc;
  const G = new Proxy({}, { get: (_, k) => (window.Game && Game[k]) || (() => { }) });
  const LVS = W.LEVELS.map(l => l.id);

  /* ---------------- 存檔（App.state.world） ---------------- */
  function st() {
    const S = App.state;
    if (!S.world) S.world = {};
    const w = S.world;
    ['stamps', 'dex', 'zones', 'pos', 'spots', 'last'].forEach(k => { if (!w[k] || typeof w[k] !== 'object') w[k] = {}; });
    if (!LVS.includes(w.lv)) w.lv = 'N5';
    return w;
  }
  const lv = () => st().lv, li = () => LVS.indexOf(lv());
  const showKana = () => li() <= 1, showZh = () => li() === 0;

  /* ---------------- 載入 ---------------- */
  const regionOf = id => W.regions.find(r => r.id === id);
  const RP = {};
  function loadRegion(id) {
    const R = regionOf(id); if (!R) return Promise.reject(new Error('region'));
    return RP[id] || (RP[id] = R.files.reduce((p, f) => p.then(() => App.loadScript('data/world/' + f + '.js').catch(e => console.warn('世界資料載入失敗', f))), Promise.resolve()));
  }
  let EVP = null;
  const loadEvents = () => EVP || (EVP = ['data/travel.js', 'data/travel-ext.js', 'data/travel-stops.js'].reduce((p, f) => p.then(() => App.loadScript(f)), Promise.resolve()));

  /* ---------------- 文字：依程度顯示讀音／中文，其餘收在「提示」 ---------------- */
  function tx(o, full) {
    if (!o) return '';
    const k = o.kana && o.kana !== o.jp;
    let h = `<b class="jp" lang="ja">${esc(o.jp)}</b>`;
    const sk = full || showKana(), sz = full || showZh();
    if (k && sk) h += `<i class="wd-k" lang="ja">${esc(o.kana)}</i>`;
    if (o.zh && sz) h += `<i class="wd-z">${esc(o.zh)}</i>`;
    if ((k && !sk) || (o.zh && !sz)) h += `<button type="button" class="wd-peek" data-k="${k && !sk ? esc(o.kana) : ''}" data-z="${!sz ? esc(o.zh || '') : ''}">👁 提示</button>`;
    return `<span class="wd-tx">${h}</span>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.wd-peek'); if (!b) return;
    e.stopPropagation();
    b.outerHTML = (b.dataset.k ? `<i class="wd-k" lang="ja">${esc(b.dataset.k)}</i>` : '') + (b.dataset.z ? `<i class="wd-z">${esc(b.dataset.z)}</i>` : '');
  });
  const item = (o, src, kind) => App.wordItem({ jp: o.jp, kana: o.kana, zh: o.zh, emoji: o.emoji || '' }, src, kind || 'word');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* =========================================================
     地圖元件：格子地圖＋點擊行走＋物件
     cfg { rows, walk(c), cls(c), objs:{key:{icon,label,cls,badge}}, start, onObj(key), onStep(c,x,y) }
     ========================================================= */
  function buildMap(host, cfg) {
    const rows = cfg.rows, H = rows.length, Wd = rows[0].length;
    const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= Wd) ? null : rows[y][x];
    const isObj = c => c != null && !!cfg.objs[c];
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // 相連的同字母格子 = 一個物件
    const comps = [], cid = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y); if (!isObj(c) || cid[x + ',' + y] != null) continue;
      const comp = { key: c, tiles: [] }, q = [[x, y]]; cid[x + ',' + y] = comps.length;
      while (q.length) { const [a, b] = q.shift(); comp.tiles.push([a, b]); DIR.forEach(([dx, dy]) => { const k = (a + dx) + ',' + (b + dy); if (at(a + dx, b + dy) === c && cid[k] == null) { cid[k] = comps.length; q.push([a + dx, b + dy]); } }); }
      comps.push(comp);
    }
    let html = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      const c = at(x, y), o = isObj(c) ? cfg.objs[c] : null;
      html += `<div class="wd-t ${o ? 'wd-o ' + (o.cls || '') : cfg.cls(c, x, y)}" style="grid-column:${x + 1};grid-row:${y + 1}" data-x="${x}" data-y="${y}"${o ? ` data-o="${esc(c)}" role="button" tabindex="0" aria-label="${esc(o.label || '')}"` : ''}>${o ? `<span>${esc(o.icon || '')}</span>` : cfg.deco ? cfg.deco(c, x, y) : ''}</div>`;
    }
    comps.forEach((cp, i) => {
      const o = cfg.objs[cp.key]; if (!o.label && !o.badge) return;
      const xs = cp.tiles.map(t => t[0]), ys = cp.tiles.map(t => t[1]);
      const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, by = Math.max(...ys) + 1;
      if (o.label && (cfg.labelAll || cp.tiles.length > 1)) html += `<div class="wd-lb" style="left:calc(var(--ts)*${cx});top:calc(var(--ts)*${by})" data-c="${i}">${esc(o.label)}${o.badge ? `<em>${o.badge}</em>` : ''}</div>`;
      else if (o.badge) html += `<div class="wd-lb wd-lb-b" style="left:calc(var(--ts)*${cx});top:calc(var(--ts)*${by})">${o.badge}</div>`;
    });
    const av = (window.Game && Game.avatar()) || '🚶';
    host.innerHTML = `<div class="wd-map" style="--cols:${Wd};--rows:${H}">${html}<div class="wd-me" aria-hidden="true"><span>${esc(av === '🧳' ? '🚶' : av)}</span></div></div>`;
    const map = host.firstElementChild, me = map.querySelector('.wd-me');
    let pos = (cfg.start || [0, 0]).slice(), moving = 0;
    const place = () => { me.style.transform = `translate(calc(var(--ts)*${pos[0]}),calc(var(--ts)*${pos[1]}))`; };
    function fit() {
      const ts = Math.floor(Math.max(24, Math.min(64, host.clientWidth / Wd, host.clientHeight / H)));
      map.style.setProperty('--ts', ts + 'px');
    }
    // 最短路徑：從目前位置走到任一目標格
    function route(goal) {
      const q = [[pos[0], pos[1], []]], seen = new Set([pos[0] + ',' + pos[1]]);
      for (const [x, y, p] of q) {
        if (goal(x, y)) return p;
        for (const [dx, dy] of DIR) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !cfg.walk(at(nx, ny))) continue; seen.add(k); q.push([nx, ny, p.concat([[nx, ny]])]); }
      }
      return null;
    }
    async function walk(path) {
      const my = ++moving;
      for (const p of path) {
        if (my !== moving || !map.isConnected) return false;
        me.classList.toggle('flip', p[0] < pos[0]);
        pos = p; place(); await wait(95);
      }
      if (cfg.onMove) cfg.onMove(pos);
      return my === moving && map.isConnected;
    }
    async function goObj(key, ci) {
      const tiles = (ci != null ? comps[ci] : comps.find(c => c.key === key) || { tiles: [] }).tiles;
      const all = ci != null ? tiles : comps.filter(c => c.key === key).flatMap(c => c.tiles);
      const near = (x, y) => all.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) === 1);
      const p = route(near); if (!p) return;
      if (await walk(p)) cfg.onObj(key);
    }
    map.addEventListener('click', async e => {
      const t = e.target.closest('.wd-t'), lb = e.target.closest('.wd-lb[data-c]');
      if (lb) { const cp = comps[+lb.dataset.c]; return goObj(cp.key, +lb.dataset.c); }
      if (!t) return;
      const x = +t.dataset.x, y = +t.dataset.y, c = at(x, y);
      if (t.dataset.o) return goObj(c, cid[x + ',' + y]);
      if (!cfg.walk(c)) return;
      const p = route((a, b) => a === x && b === y); if (!p) return;
      if (await walk(p) && cfg.onStep) cfg.onStep(c, x, y);
    });
    map.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.o) { e.preventDefault(); e.target.click(); } });
    function pulse(key) {
      map.querySelectorAll('.wd-o').forEach(t => t.classList.toggle('pulse', t.dataset.o === String(key)));
      setTimeout(() => map.querySelectorAll('.wd-o.pulse').forEach(t => t.classList.remove('pulse')), 5200);
    }
    fit(); place();
    return { el: map, fit, pulse, goObj, pos: () => pos.slice(), comps, at, route, stop: () => { moving++; } };
  }

  /* =========================================================
     舞台：HUD＋地圖＋任務列＋互動面板
     ========================================================= */
  let STAGE = null, MAP = null, S = null, D = null, RUN = null, PARAMS = null, fromDistrict = false;
  const ABORT = { abort: 1 };
  let pending = null;
  const Q = {   // 由 world-quest.js 覆寫
    pref() { return null; }, mistake() { }, on() { }, bar() { return ''; }, async checkBasket() { return true; }, swap() { }, active() { return false; },
    clerkExtra() { return []; }, npcExtra() { return []; }, enter() { }, leave() { }, board() { }, shopBadge() { return ''; }, barTap() { }
  };
  function stage(el, hud) {
    el.innerHTML = `<section class="wd" id="wd">
      <div class="wd-hud">${hud}</div>
      <div class="wd-mapwrap"></div>
      <button type="button" class="wd-bar" id="wd-bar" hidden></button>
      <div class="wd-sheet" id="wd-sheet" hidden><button type="button" class="wd-x" aria-label="關閉">✕</button><div class="wd-in"></div></div>
    </section>`;
    STAGE = el.querySelector('#wd');
    const fit = () => {
      if (!STAGE.isConnected) { window.removeEventListener('resize', fit); return; }
      const nav = document.getElementById('nav'), bottom = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 10;
      STAGE.style.height = Math.max(380, window.innerHeight - STAGE.getBoundingClientRect().top - window.scrollY - bottom) + 'px';
      if (MAP) MAP.fit();
    };
    window.addEventListener('resize', fit);
    STAGE._fit = fit;
    STAGE.querySelector('.wd-x').onclick = closeSheet;
    STAGE.querySelector('#wd-bar').onclick = () => Q.barTap();
    return STAGE;
  }
  function sheet(html, opt) {
    if (pending) { const r = pending; pending = null; r(ABORT); }
    const sh = STAGE.querySelector('#wd-sheet'), inn = sh.querySelector('.wd-in');
    inn.innerHTML = html; sh.hidden = false; sh.className = 'wd-sheet' + (opt && opt.tall ? ' tall' : '');
    inn.scrollTop = 0;
    return inn;
  }
  function closeSheet() {
    if (!STAGE) return;
    const sh = STAGE.querySelector('#wd-sheet'); if (sh) sh.hidden = true;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (pending) { const r = pending; pending = null; r(ABORT); }
  }
  // 一個需要玩家回應的步驟；面板被關掉或換成別的就中止整段流程
  function step(html, bind, opt) {
    return new Promise((res, rej) => {
      const el = sheet(html, opt);
      pending = rej;
      bind(el, v => { if (pending === rej) pending = null; res(v); });
    });
  }
  const flow = fn => (...a) => Promise.resolve().then(() => fn(...a)).catch(e => { if (e !== ABORT) { console.error(e); App.toast('😵 發生錯誤：' + esc(e.message || e)); } });
  function paintBar() {
    if (!STAGE || !STAGE.isConnected) return;
    const b = STAGE.querySelector('#wd-bar'), h = Q.bar();
    b.hidden = !h; b.innerHTML = h;
    if (STAGE._fit) STAGE._fit();
  }

  /* ---------------- 共用互動元件 ---------------- */
  const bubble = (npc, line, cls) => `<div class="wd-npc ${cls || ''}"><span class="wd-face">${esc(npc.emoji || '🧑')}</span><div class="wd-bub"><small>${esc(npc.who || '')}</small>${tx(line)}<button type="button" class="wd-spk" data-spk aria-label="再聽一次">🔊</button></div></div>`;
  const bindSpk = (el, line) => el.querySelectorAll('[data-spk]').forEach(b => b.onclick = () => App.speak(line.jp));
  // 店員說一句話，按繼續
  function npcSay(npc, line, extra) {
    return step(`${bubble(npc, line)}${extra || ''}<div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">繼續 ➜</button></div>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      el.querySelector('#wd-ok').onclick = () => done();
    });
  }
  // 提示訊息（不是店員）
  function note(html, btn) {
    return step(`<div class="wd-note">${html}</div><div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">${btn || '知道了'}</button></div>`, (el, done) => { el.querySelector('#wd-ok').onclick = () => done(); });
  }
  // 從清單選一個
  function pick(title, list, render, cls) {
    return step(`<h3 class="wd-h">${title}</h3><div class="wd-pick ${cls || ''}">${list.map((x, i) => `<button type="button" data-i="${i}">${render(x)}</button>`).join('')}</div>`, (el, done) => {
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => done(list[+b.dataset.i]));
    }, { tall: true });
  }

  /* ---- 句子組裝：把詞塊排成句子再說出來 ---- */
  function build(model, opt) {
    opt = opt || {};
    const easy = lv() === 'N5';
    let tiles = App.shuffle(model.parts.map(p => ({ jp: p.jp, kana: p.kana })).concat((model.extra || []).slice(0, easy ? 1 : 3).map(e => ({ jp: e.jp, kana: e.kana }))));
    const seq = []; let miss = 0;
    const tileH = (t, i, where) => `<button type="button" class="wd-tile" data-${where}="${i}"><b class="jp" lang="ja">${esc(t.jp)}</b>${showKana() && t.kana && t.kana !== t.jp ? `<i lang="ja">${esc(t.kana)}</i>` : ''}</button>`;
    return step(`<div class="wd-build">
        <p class="wd-goal">🗣️ ${esc(opt.title || '用日文說')}：<b>${esc(model.zh)}</b></p>
        <div class="wd-model" ${easy ? '' : 'hidden'}><small>照著排：</small>${tx({ jp: model.jp, kana: model.kana }, true)}</div>
        <div class="wd-line" aria-label="你的句子"></div>
        <div class="wd-bank"></div>
        <p class="wd-fb" role="status"></p>
        <div class="wd-acts"><button type="button" class="btn" id="wd-clr">↺ 重排</button><button type="button" class="btn primary" id="wd-say">🗣️ 說出來</button></div>
      </div>`, (el, done) => {
      const line = el.querySelector('.wd-line'), bank = el.querySelector('.wd-bank'), fb = el.querySelector('.wd-fb');
      const paint = () => {
        line.innerHTML = seq.length ? seq.map((t, i) => tileH(t, i, 's')).join('') : '<span class="wd-ph">點下面的詞塊，排成句子</span>';
        bank.innerHTML = tiles.map((t, i) => t.used ? `<span class="wd-tile gone"><b>${esc(t.jp)}</b></span>` : tileH(t, i, 'b')).join('');
        bank.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const t = tiles[+b.dataset.b]; t.used = true; seq.push(t); G.sfx('tap'); paint(); });
        line.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const t = seq.splice(+b.dataset.s, 1)[0]; t.used = false; paint(); });
      };
      el.querySelector('#wd-clr').onclick = () => { seq.splice(0).forEach(t => { t.used = false; }); fb.textContent = ''; paint(); };
      el.querySelector('#wd-say').onclick = () => {
        const r = Phrase.check(model, seq.map(t => t.jp));
        if (r.ok) {
          App.speak(model.jp); G.sfx('ok'); G.bump('ok'); G.burst(line, 10);
          fb.className = 'wd-fb ok'; fb.textContent = '✓ ' + model.jp;
          el.querySelectorAll('button').forEach(b => { b.disabled = true; });
          setTimeout(() => done(miss), 650);
        } else {
          miss++; Q.mistake(); G.sfx('ng'); G.shake();
          Tracker.add(item({ jp: model.jp, kana: model.kana, zh: model.zh }, S ? S.name : '冒險', 'phrase'), true);
          fb.className = 'wd-fb ng'; fb.textContent = '✗ ' + r.fb;
          if (miss >= 2) el.querySelector('.wd-model').hidden = false;
        }
      };
      paint();
    }, { tall: true });
  }

  /* ---- 店員問你問題：聽懂再回答 ---- */
  function variant(a) {
    const n = a.v.length, i = li();
    const r = i === 0 ? 0 : i === 1 ? Math.random() * Math.min(2, n) | 0 : i === 2 ? Math.random() * Math.min(3, n) | 0 : i === 3 ? 1 + (Math.random() * (n - 1) | 0) : Math.max(0, n - 1 - (Math.random() * 2 | 0));
    return { jp: a.v[Math.min(n - 1, r)][0], kana: a.v[Math.min(n - 1, r)][1], zh: a.zh };
  }
  function askQ(a, want, npc) {
    const line = variant(a);
    const opts = App.shuffle(a.a.map(x => Object.assign({ ok: 1 }, x)).concat(a.bad.map(x => Object.assign({ ok: 0 }, x))));
    const wantA = want != null ? a.a.find(x => x.val === String(want)) : null;
    return step(`${bubble(npc, line)}${wantA ? `<p class="wd-need">📋 任務單：<b>${esc(wantA.brief)}</b></p>` : ''}
      <div class="wd-opts">${opts.map((o, i) => `<button type="button" class="wd-opt" data-i="${i}">${tx(o)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      const fb = el.querySelector('.wd-fb');
      el.querySelectorAll('.wd-opt').forEach(b => b.onclick = e => {
        if (e.target.closest('.wd-peek')) return;
        const o = opts[+b.dataset.i];
        const wrongPref = o.ok && wantA && o.val !== wantA.val;
        if (!o.ok || wrongPref) {
          b.disabled = true; b.classList.add('ng'); Q.mistake(); G.sfx('ng'); G.shake();
          fb.className = 'wd-fb ng'; fb.textContent = '✗ ' + (wrongPref ? `日文沒錯，但任務單寫的是「${wantA.brief}」` : o.fb);
          if (!o.ok) Tracker.add(item({ jp: line.jp, kana: line.kana, zh: '店員問：' + a.zh }, S.name, 'phrase'), true);
          return;
        }
        b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); App.speak(o.jp);
        el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
        setTimeout(() => done(o.val), 700);
      });
    });
  }
  /* ---- 聽店員回答，選出意思 ---- */
  function hear(npc, line, opts, title) {
    const list = App.shuffle(opts.map((t, i) => ({ t, ok: i === 0 })));
    const hide = li() >= 2;
    return step(`<div class="wd-npc"><span class="wd-face">${esc(npc.emoji || '🧑')}</span><div class="wd-bub"><small>${esc(npc.who || '')}</small><span class="wd-hid" ${hide ? '' : 'hidden'}>🔊 仔細聽…</span><span class="wd-shown" ${hide ? 'hidden' : ''}>${tx({ jp: line.jp, kana: line.kana })}</span><button type="button" class="wd-spk" data-spk aria-label="再聽一次">🔊</button></div></div>
      <p class="wd-goal">${esc(title || '店員說了什麼？')}</p>
      <div class="wd-opts">${list.map((o, i) => `<button type="button" class="wd-opt" data-i="${i}">${esc(o.t)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>`, (el, done) => {
      App.speak(line.jp); bindSpk(el, line);
      el.querySelectorAll('.wd-opt').forEach(b => b.onclick = () => {
        const o = list[+b.dataset.i];
        if (!o.ok) { b.disabled = true; b.classList.add('ng'); Q.mistake(); G.sfx('ng'); el.querySelector('.wd-hid').hidden = true; el.querySelector('.wd-shown').hidden = false; return; }
        b.classList.add('ok'); G.sfx('ok'); G.bump('ok');
        el.querySelector('.wd-hid').hidden = true; el.querySelector('.wd-shown').hidden = false;
        el.querySelector('.wd-fb').className = 'wd-fb ok'; el.querySelector('.wd-fb').textContent = line.zh || '';
        el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
        setTimeout(() => done(), 900);
      });
    });
  }

  /* =========================================================
     店內
     ========================================================= */
  const zone = k => S.zones[k];
  const itemsIn = k => S.items.filter(i => i.zone === k);
  const counters = () => Object.keys(S.zones).filter(k => S.zones[k].type === 'counter');
  const staff = k => (zone(k || counters()[0]) || {}).npc || { who: '店員', emoji: '🧑‍💼' };
  const inBasket = it => RUN.basket.find(b => b.it === it);
  const basketN = () => RUN.basket.reduce((a, b) => a + b.n, 0);
  const total = () => RUN.basket.filter(b => !b.paid).reduce((a, b) => a + b.it.price * b.n, 0);
  const tagsIn = () => new Set(RUN.basket.flatMap(b => b.it.tags || []));
  const asksFor = phase => S.asks.filter(a => a.phase === phase && (a.when === 'always' || tagsIn().has(a.when.slice(4))));
  function addDex(it) {
    const i = S.items.indexOf(it); if (i < 0) return;
    const d = st().dex[S.id] || (st().dex[S.id] = []);
    if (!d.includes(i)) { d.push(i); App.save(); paintHud(); }
  }
  function seeZone(k) {
    const w = st(); const cur = w.zones[S.id] || '';
    if (!cur.split(',').includes(String(k))) { w.zones[S.id] = cur ? cur + ',' + k : String(k); App.save(); }
    Q.on('visit', { zone: String(k) });
  }
  function addBasket(it, n, o) {
    const b = inBasket(it);
    if (b) b.n = Math.min(5, b.n + n); else RUN.basket.push(Object.assign({ it, n }, o));
    addDex(it); G.sfx('coin'); paintHud(); Q.on('basket'); paintBar();
  }
  function paintHud() {
    if (!STAGE || !STAGE.isConnected || !S) return;
    const b = STAGE.querySelector('#wd-bk'); if (b) b.innerHTML = `🧺<b>${basketN()}</b>`;
    const dx = STAGE.querySelector('#wd-dex'); if (dx) dx.innerHTML = `📖 ${(st().dex[S.id] || []).length}/${S.items.length}`;
    const q = STAGE.querySelector('#wd-q'); if (q) q.innerHTML = `📒 委託 ${Q.shopBadge(S)}`;
  }

  /* ---- 商品面板：貨架／券売機／菜單／櫃台商品 ---- */
  const KIND_BTN = { shelf: '🧺 放進籃子', machine: '💴 投幣購買', menu: '📝 加入點單', counter: '🗣️ 等一下跟店員說' };
  function itemsSheet(key, tabs) {
    const z = zone(key), list = itemsIn(key);
    let sel = null, n = 1;
    const el = sheet(`${tabs ? `<div class="tabs wd-tabs">${tabs.map(k => `<button type="button" data-tab="${esc(k)}" class="${k === key ? 'on' : ''}">${esc(zone(k).icon)} ${esc(zone(k).jp)}</button>`).join('')}</div>` : ''}
      <div class="wd-zh"><span class="wd-zi">${esc(z.icon || '')}</span>${tx(z)}<button type="button" class="wd-spk" id="wd-zs" aria-label="聽">🔊</button></div>
      <div class="wd-items">${list.map((it, i) => `<button type="button" class="wd-it" data-i="${i}"><span class="e">${esc(it.emoji)}</span><b class="jp" lang="ja">${esc(it.jp)}</b>${showKana() ? `<i lang="ja">${esc(it.kana)}</i>` : ''}${showZh() ? `<i class="z">${esc(it.zh)}</i>` : ''}<span class="p">${it.price ? '¥' + it.price.toLocaleString('en-US') : '無料'}</span><em hidden></em></button>`).join('')}</div>
      <div class="wd-sel" hidden></div>
      ${tabs ? `<div class="wd-acts wd-order"><span id="wd-on"></span><button type="button" class="btn primary" id="wd-call">🙋 すみません！<small>叫店員點餐</small></button></div>` : ''}`, { tall: true });
    el.querySelector('#wd-zs').onclick = () => App.speak(z.jp);
    if (tabs) {
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => itemsSheet(b.dataset.tab, tabs));
      el.querySelector('#wd-call').onclick = () => orderFlow();
    }
    const marks = () => {
      el.querySelectorAll('.wd-it').forEach((b, i) => { const k = inBasket(list[i]), em = b.querySelector('em'); em.hidden = !k; em.textContent = k ? '×' + k.n : ''; });
      const on = el.querySelector('#wd-on'); if (on) on.textContent = RUN.basket.length ? `點單 ${basketN()} 項・¥${total().toLocaleString('en-US')}` : '還沒選餐點';
    };
    const box = el.querySelector('.wd-sel');
    const show = () => {
      const it = sel, cnt = Phrase.count(it.c, n);
      box.hidden = false;
      box.innerHTML = `<div class="wd-sel-t"><span class="e">${esc(it.emoji)}</span><div>${tx(it, true)}</div>${App.trackBtn(item(it, S.name), true)}</div>
        <div class="wd-sel-a"><button type="button" class="wd-qb" data-q="-1" aria-label="減少">−</button><span class="wd-qn"><b lang="ja">${esc(cnt.jp)}</b><i lang="ja">${esc(cnt.kana)}</i></span><button type="button" class="wd-qb" data-q="1" aria-label="增加">＋</button>
        <button type="button" class="btn primary" id="wd-add">${KIND_BTN[z.type] || '選這個'}</button></div>`;
      box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { n = Math.max(1, Math.min(5, n + +b.dataset.q)); show(); App.speak(Phrase.count(it.c, n).kana); });
      box.querySelector('#wd-add').onclick = () => {
        if (z.type === 'machine') return vend(it, n, key);
        addBasket(it, n, { held: z.type === 'shelf', toSay: z.type !== 'shelf' });
        App.toast(`${it.emoji} ${esc(it.jp)} ×${n}`); marks();
      };
      box.scrollIntoView({ block: 'nearest' });
    };
    el.querySelectorAll('.wd-it').forEach(b => b.onclick = () => { sel = list[+b.dataset.i]; n = 1; App.speak(sel.jp); addDex(sel); el.querySelectorAll('.wd-it').forEach(x => x.classList.toggle('on', x === b)); show(); });
    marks();
    seeZone(key);
  }
  /* ---- 券売機／自動販賣機：投幣 ---- */
  const vend = flow(async (it, n, key) => {
    const price = it.price * n; let put = 0;
    await step(`<h3 class="wd-h">${esc(zone(key).icon)} ${esc(zone(key).jp)}</h3>
      <div class="wd-vend"><div class="wd-vend-s"><span class="e">${esc(it.emoji)}</span>${tx(it, true)}<b>¥${price.toLocaleString('en-US')}</b></div>
      <p class="wd-goal">投入金額 <b id="wd-put">¥0</b>（<span lang="ja">お金を入れてください</span>）</p>
      <div class="wd-coins">${[1000, 500, 100, 50, 10].map(c => `<button type="button" data-c="${c}">¥${c.toLocaleString('en-US')}</button>`).join('')}</div>
      <div class="wd-acts"><button type="button" class="btn" id="wd-ret" lang="ja">おつり・返却</button><button type="button" class="btn primary" id="wd-buy" disabled>🎫 按下按鈕</button></div></div>`, (el, done) => {
      const paint = () => { el.querySelector('#wd-put').textContent = '¥' + put.toLocaleString('en-US'); el.querySelector('#wd-buy').disabled = put < price; };
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { put += +b.dataset.c; G.sfx('coin'); paint(); });
      el.querySelector('#wd-ret').onclick = () => { put = 0; paint(); };
      el.querySelector('#wd-buy').onclick = () => done();
    });
    addBasket(it, n, { held: true, paid: true });
    const ch = put - price;
    App.toast(`🎫 ${esc(it.jp)} ×${n}${ch ? `・おつり ¥${ch.toLocaleString('en-US')}` : ''}`, 'ok');
    Q.on('vend');
    itemsSheet(key);
  });
  function basketSheet() {
    const paint = () => {
      const el = sheet(`<h3 class="wd-h">🧺 ${S.kind === 'eat' ? '點單' : '籃子'}</h3>
        ${RUN.basket.length ? `<div class="wd-bl">${RUN.basket.map((b, i) => `<div class="wd-br"><span class="e">${esc(b.it.emoji)}</span><div>${tx(b.it, true)}</div><span class="wd-bq"><button type="button" class="wd-qb" data-d="${i}" aria-label="減少">−</button><b>${b.n}</b><button type="button" class="wd-qb" data-u="${i}" aria-label="增加">＋</button></span><span class="p">${b.paid ? '已付' : '¥' + (b.it.price * b.n).toLocaleString('en-US')}</span></div>`).join('')}</div>
        <p class="wd-total">合計 <b>¥${total().toLocaleString('en-US')}</b></p><p class="muted center">${S.kind === 'eat' ? '回座位叫店員點餐' : '拿到收銀台找店員結帳'}</p>` : '<p class="muted center">還是空的。走到貨架前面挑東西吧。</p>'}`);
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const x = RUN.basket[+b.dataset.d]; if (x.paid) return App.toast('已經付錢的不能退'); if (--x.n <= 0) RUN.basket.splice(+b.dataset.d, 1); paintHud(); paintBar(); paint(); });
      el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const x = RUN.basket[+b.dataset.u]; if (x.paid) return; x.n = Math.min(5, x.n + 1); paintHud(); paintBar(); paint(); });
    };
    paint();
  }

  /* ---- 流程：問句、賣完、付款 ---- */
  async function runAsks(phase, npc) {
    for (const a of asksFor(phase)) RUN.vals[a.id] = await askQ(a, Q.pref(a.id), npc);
  }
  const orderLine = list => ({
    jp: list.map(b => Phrase.spoken(b.it).jp + 'を' + Phrase.count(b.it.c, b.n).jp).join('と、') + 'ですね。かしこまりました。',
    kana: list.map(b => Phrase.spoken(b.it).kana + 'を' + Phrase.count(b.it.c, b.n).kana).join('と、') + 'ですね。かしこまりました',
    zh: list.map(b => `${b.it.zh} ${b.n} 份`).join('、') + '對嗎？好的。'
  });
  async function incident(list, npc) {   // N3 以上的任務：其中一樣賣完了，要改點
    if (li() < 2 || !Q.active() || RUN.incident || !list.length) return;
    const b = list[Math.random() * list.length | 0];
    const alts = App.shuffle(itemsIn(b.it.zone).filter(i => i !== b.it && !inBasket(i))).slice(0, 3);
    if (!alts.length) return;
    RUN.incident = true;
    const sp = Phrase.spoken(b.it);
    await npcSay(npc, li() >= 3
      ? { jp: `申し訳ございません、${sp.jp}はただいま売り切れでございます。`, kana: `もうしわけございません、${sp.kana}はただいまうりきれでございます`, zh: `非常抱歉，${b.it.zh}目前賣完了。` }
      : { jp: `すみません、${sp.jp}は売り切れです。`, kana: `すみません、${sp.kana}はうりきれです`, zh: `不好意思，${b.it.zh}賣完了。` });
    const alt = await pick('賣完了！改點哪一個？', alts, it => `<span class="e">${esc(it.emoji)}</span>${tx(it)}`, 'wd-items3');
    await build(Phrase.make('instead', { items: [{ it: alt, n: b.n }] }, lv()), { title: '改點別的' });
    Q.swap(b.it, alt); b.it = alt; addDex(alt); paintHud(); paintBar();
    await npcSay(npc, { jp: 'かしこまりました。', kana: 'かしこまりました', zh: '好的。' });
  }
  async function payTotal(npc) {
    const t = total();
    if (t > 0) {
      const y = Phrase.yen(t), line = { jp: `お会計は${y.jp}です。`, kana: `おかいけいは${y.kana}です`, zh: `一共 ${y.zh}。` };
      if (li() === 0) await npcSay(npc, line, `<p class="wd-total">合計 <b>¥${t.toLocaleString('en-US')}</b></p>`);
      else {
        const d = t >= 1000 ? [100, 1000] : [10, 100];
        const wrong = App.shuffle([t + d[0], Math.max(10, t - d[0]), t + d[1], t + d[0] * 3]).filter((x, i, a) => x !== t && a.indexOf(x) === i).slice(0, 2);
        await hear(npc, line, [t].concat(wrong).map(x => '¥' + x.toLocaleString('en-US')), '要付多少錢？');
      }
    }
    G.sfx('coin');
    await npcSay(npc, { jp: 'ありがとうございました。', kana: 'ありがとうございました', zh: '謝謝光臨。' });
  }
  function finishPurchase() {
    const bought = RUN.basket.slice();
    bought.forEach(b => addDex(b.it));
    RUN.basket = []; RUN.served = false; RUN.toPay = false; RUN.incident = false;
    paintHud(); closeSheet();
    Q.on('bought', { items: bought, vals: RUN.vals });
    RUN.vals = {}; paintBar();
  }
  // 便利商店、藥妝店：拿商品到收銀台；服務台：開口要東西
  const checkout = flow(async key => {
    const npc = staff(key);
    if (!RUN.basket.length) return clerkSheet(key);
    if (!(await Q.checkBasket())) return;
    const sayL = RUN.basket.filter(b => b.toSay && !b.paid);
    await npcSay(npc, { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ', zh: '歡迎光臨。' });
    if (sayL.length) {
      await build(Phrase.make('want', { items: sayL }, lv()), { title: '跟店員說你要的' });
      await incident(sayL, npc);
      await npcSay(npc, orderLine(RUN.basket.filter(b => b.toSay && !b.paid)));
    }
    if (total() > 0) { await runAsks('pay', npc); await payTotal(npc); }
    else await npcSay(npc, { jp: 'はい、どうぞ。', kana: 'はい、どうぞ', zh: '好的，請用。' });
    finishPurchase();
  });
  // 餐廳：入座 → 翻菜單 → 叫店員 → 上菜 → 到櫃台結帳
  const menuKeys = () => Object.keys(S.zones).filter(k => S.zones[k].type === 'menu');
  const sit = flow(async key => {
    const npc = staff();
    seeZone(key);
    if (S.kind !== 'eat') return facilitySheet(key);
    if (RUN.toPay) return note('🍽️ 已經吃飽了。拿著帳單到 <b lang="ja">レジ</b>（收銀台）結帳。');
    if (!RUN.entered) {
      await npcSay(npc, { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ', zh: '歡迎光臨。' });
      await runAsks('enter', npc);
      RUN.entered = true; Q.on('entered');
      await npcSay(npc, { jp: 'こちらのお席へどうぞ。', kana: 'こちらのおせきへどうぞ', zh: '這邊請坐。' });
    }
    const mk = menuKeys();
    if (mk.length) itemsSheet(mk[0], mk);
    else {
      const el = sheet(`<h3 class="wd-h">${esc(zone(key).icon)} ${esc(zone(key).jp)}</h3><p class="muted center">${RUN.basket.length ? '餐券準備好了，交給店員吧。' : '這間店要先到門口的券売機買餐券。'}</p><div class="wd-acts"><button type="button" class="btn primary" id="wd-call" ${RUN.basket.length ? '' : 'disabled'}>🎫 把餐券交給店員</button></div>`);
      el.querySelector('#wd-call').onclick = () => orderFlow();
    }
  });
  const orderFlow = flow(async () => {
    const npc = staff();
    if (!RUN.basket.length) return App.toast('先選好要點的東西');
    if (!(await Q.checkBasket())) return;
    const sayL = RUN.basket.filter(b => !b.paid);
    if (sayL.length) {
      await build(Phrase.make('call', {}, lv()), { title: '叫店員過來' });
      await npcSay(npc, { jp: 'はい、ご注文をどうぞ。', kana: 'はい、ごちゅうもんをどうぞ', zh: '好的，請點餐。' });
      await build(Phrase.make('want', { items: sayL }, lv()), { title: '點餐' });
      await incident(sayL, npc);
      await npcSay(npc, orderLine(RUN.basket.filter(b => !b.paid)));
    } else await npcSay(npc, { jp: '食券をお預かりします。', kana: 'しょっけんをおあずかりします', zh: '收您的餐券。' });
    await runAsks('order', npc);
    await npcSay(npc, { jp: '少々お待ちください。', kana: 'しょうしょうおまちください', zh: '請稍等。' });
    RUN.basket.forEach(b => addDex(b.it));
    await npcSay(npc, { jp: 'お待たせしました。ごゆっくりどうぞ。', kana: 'おまたせしました。ごゆっくりどうぞ', zh: '讓您久等了，請慢用。' }, `<p class="wd-serve">${RUN.basket.map(b => esc(b.it.emoji)).join(' ')}</p>`);
    RUN.served = true;
    if (!sayL.length) return finishPurchase();
    RUN.toPay = true; closeSheet(); Q.on('served'); paintBar();
    App.toast('🍽️ ごちそうさまでした！到收銀台結帳', 'ok');
  });
  const bill = flow(async key => {
    const npc = staff(key);
    await build(Phrase.make('bill', {}, lv()), { title: '結帳' });
    await runAsks('pay', npc);
    await payTotal(npc);
    finishPurchase();
  });
  // 飯店、機場、租借：櫃台手續
  const checkin = flow(async key => {
    const npc = staff(key);
    await npcSay(npc, { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ', zh: '歡迎光臨。' });
    for (const a of S.asks.filter(a => a.phase === 'checkin')) RUN.vals[a.id] = await askQ(a, Q.pref(a.id), npc);
    await npcSay(npc, { jp: 'かしこまりました。ありがとうございます。', kana: 'かしこまりました。ありがとうございます', zh: '好的，謝謝您。' });
    closeSheet(); Q.on('checkin', { vals: RUN.vals }); RUN.vals = {}; paintBar();
  });

  /* ---- 自由對話：問位置、有沒有、多少錢、拜託、可不可以、問資訊 ---- */
  const locTargets = () => {
    const out = [];
    Object.keys(S.zones).forEach(k => { const z = S.zones[k]; if (z.loc && z.type !== 'counter') out.push({ id: 'z:' + k, zone: k, x: z, emoji: z.icon }); });
    S.items.forEach(it => { const z = S.zones[it.zone]; if (z && z.loc) out.push({ id: 'i:' + it.id, zone: it.zone, x: it, emoji: it.emoji, it }); });
    return out;
  };
  const locLine = t => {
    const z = S.zones[t.zone], sp = t.it ? Phrase.spoken(t.it) : { jp: t.x.jp, kana: t.x.kana };
    return { jp: `${sp.jp}は、${z.loc.jp}。`, kana: `${sp.kana}は、${z.loc.kana}`, zh: `${t.x.zh}${z.loc.zh}。` };
  };
  const talk = flow(async (intent, key, preset) => {
    const npc = staff(key);
    const pickIt = async (title, list) => preset || await pick(title, list, t => `<span class="e">${esc(t.emoji || '')}</span>${tx(t.x || t)}`, 'wd-items3');
    let id = '';
    if (intent === 'where') {
      const t = await pickIt('想問什麼在哪裡？', locTargets()); id = t.id;
      await build(Phrase.make('where', { x: t.it || t.x }, lv()));
      await npcSay(npc, locLine(t));
      if (!Q.active()) MAP.pulse(t.zone);
    } else if (intent === 'have' || intent === 'price') {
      const t = await pickIt(intent === 'have' ? '想問有沒有什麼？' : '想問什麼的價錢？', S.items.map(it => ({ id: 'i:' + it.id, x: it, it, emoji: it.emoji, zone: it.zone }))); id = t.id;
      await build(Phrase.make(intent, { x: t.it }, lv()));
      if (intent === 'have') {
        const z = S.zones[t.zone];
        await npcSay(npc, z.loc ? { jp: `はい、ございます。${z.loc.jp}。`, kana: `はい、ございます。${z.loc.kana}`, zh: `有的。${z.loc.zh}。` } : { jp: 'はい、ございます。', kana: 'はい、ございます', zh: '有的。' });
      } else {
        const y = Phrase.yen(t.it.price);
        await npcSay(npc, t.it.price ? { jp: `${y.jp}です。`, kana: `${y.kana}です`, zh: `${y.zh}。` } : { jp: '無料です。', kana: 'むりょうです', zh: '免費。' });
      }
      addDex(t.it);
    } else {
      const src = { act: S.acts, may: S.may, info: S.info }[intent] || [];
      const a = preset || await pick({ act: '想拜託店員做什麼？', may: '想問可不可以做什麼？', info: '想問什麼？' }[intent], src, x => `<i class="wd-z">${esc((x.q || x).zh)}</i>`, 'wd-list');
      id = a.id;
      await build(Phrase.make(intent, intent === 'info' ? { q: a.q } : { a }, lv()));
      await npcSay(npc, a.re);
    }
    const r = Q.on('said', { intent, id });
    if (!STAGE || !STAGE.isConnected || !S) return;
    if (r === 'close') closeSheet(); else if (r !== 'keep') clerkSheet(key);
  });

  /* ---- 面板：店員、設施、看板 ---- */
  function clerkSheet(key) {
    const z = zone(key), npc = z.npc || staff();
    const own = itemsIn(key);
    const hasCheckin = S.asks.some(a => a.phase === 'checkin');
    const acts = [];
    if (S.kind === 'eat' && RUN.toPay) acts.push(['bill', '🧾', 'お会計', '結帳']);
    else if (RUN.basket.length && S.kind !== 'eat') acts.push(['checkout', '🧾', '結帳／辦理', `籃子裡 ${basketN()} 件`]);
    if (hasCheckin) acts.push(['checkin', '🛎️', '辦手續', '回答櫃台的問題']);
    if (own.length) acts.push(['own', '🛒', '櫃台的東西', '用說的跟店員要']);
    Q.clerkExtra(key).forEach(x => acts.push(x));
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(npc.emoji)}</span>${tx(z)}</div>
      ${acts.length ? `<div class="wd-main">${acts.map(([id, ic, t, s]) => `<button type="button" class="wd-mb${id[0] === '!' ? ' quest' : ''}" data-a="${esc(id)}"><span>${ic}</span><b>${esc(t)}</b><small>${esc(s || '')}</small></button>`).join('')}</div>` : ''}
      <p class="wd-sub">💬 開口問店員（自己組句子）</p>
      <div class="wd-ints">${Phrase.INTENTS.filter(i => i.id !== 'want' && (i.id !== 'act' || (S.acts || []).length) && (i.id !== 'may' || (S.may || []).length) && (i.id !== 'info' || (S.info || []).length)).map(i => `<button type="button" data-t="${i.id}"><span>${i.icon}</span><b>${esc(i.zh)}</b><small lang="ja">${esc(i.hint)}</small></button>`).join('')}</div>`, { tall: true });
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => talk(b.dataset.t, key));
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'checkout') checkout(key); else if (a === 'bill') bill(key); else if (a === 'checkin') checkin(key); else if (a === 'own') itemsSheet(key);
      else { const x = Q.clerkExtra(key).find(e => e[0] === a); if (x && x[4]) x[4](); }
    });
    seeZone(key);
  }
  const SIGN_BG = { y: '#f6c400;#111', g: '#1f9d55;#fff', b: '#1c64c8;#fff', r: '#d7263d;#fff', k: '#1f1f1f;#fff', w: '#ffffff;#111', o: '#f08a24;#111', p: '#f7a8c4;#111' };
  const signHTML = z => { const [bg, fg] = (SIGN_BG[z.style] || SIGN_BG.w).split(';'); return `<div class="wd-sign" style="background:${bg};color:${fg}" lang="ja">${esc(z.jp)}</div>`; };
  function facilitySheet(key, zz, src) {
    const z = zz || zone(key), isSign = z.type === 'sign';
    const el = sheet(`${isSign ? signHTML(z) : `<div class="wd-zh"><span class="wd-zi">${esc(z.icon || '')}</span></div>`}
      <div class="wd-fac">${tx(z, true)}<button type="button" class="wd-spk" data-spk aria-label="聽">🔊</button></div>
      ${z.note ? `<p class="wd-tip">💡 ${esc(z.note)}</p>` : ''}${z.tip ? `<p class="wd-tip">💡 ${esc(z.tip)}</p>` : ''}
      ${z.loc ? `<p class="wd-tip">📍 ${tx(z.loc, true)}</p>` : ''}${z.hours ? `<p class="wd-tip">🕒 ${tx(z.hours, true)}</p>` : ''}
      <div class="wd-acts">${App.trackBtn(item(z, src || (S ? S.name : D.name)))}</div>`);
    bindSpk(el, z); App.speak(z.jp);
    if (!zz) seeZone(key);
  }
  function openZone(key) {
    const z = zone(key); if (!z) return;
    if (z.type === 'shelf' || z.type === 'machine') itemsSheet(key);
    else if (z.type === 'counter') (RUN.basket.length && S.kind !== 'eat' && Q.active() ? checkout : clerkSheet)(key);
    else if (z.type === 'seat') sit(key);
    else if (z.type === 'deco') App.toast(`${esc(z.icon)} 這裡不能進去`);
    else facilitySheet(key);
  }
  function infoSheet() {
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(S.icon)}</span>${tx(S, true)}</div><p>${esc(S.desc)}</p>
      <h3 class="wd-h">🎌 這種店的規矩</h3><ul class="wd-tips">${S.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h3 class="wd-h">🗺️ 店內有什麼</h3><div class="wd-legend">${Object.keys(S.zones).filter(k => S.zones[k].type !== 'deco' && S.zones[k].type !== 'menu').map(k => `<button type="button" data-z="${esc(k)}"><span>${esc(S.zones[k].icon || '🪧')}</span>${tx(S.zones[k])}</button>`).join('')}</div>`, { tall: true });
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = e => { if (e.target.closest('.wd-peek')) return; closeSheet(); MAP.goObj(b.dataset.z); });
  }
  const ZCLS = { shelf: 'z-shelf', machine: 'z-mach', counter: 'z-cnt', seat: 'z-seat', facility: 'z-fac', sign: 'z-sign', deco: 'z-deco' };
  function renderShop(el, shop, d) {
    S = shop; D = d;
    RUN = { basket: [], vals: {}, entered: false, served: false, toPay: false, incident: false };
    const first = !st().zones[S.id];
    stage(el, `<button type="button" class="wd-loc" id="wd-info"><span>${esc(S.icon)}</span><span><b lang="ja">${esc(S.jp)}</b><small>${esc(d.name)}・${esc(S.name)}</small></span></button>
      <button type="button" class="wd-hb" id="wd-q"></button><button type="button" class="wd-hb" id="wd-dex"></button><button type="button" class="wd-hb" id="wd-bk"></button><button type="button" class="wd-hb lv" id="wd-lv">${lv()}</button>`);
    const objs = {};
    Object.keys(S.zones).forEach(k => {
      const z = S.zones[k]; if (z.type === 'menu') return;
      objs[k] = { icon: z.type === 'sign' ? '🪧' : z.type === 'counter' ? (z.npc || {}).emoji || z.icon : z.icon, label: z.type === 'sign' || z.type === 'deco' ? '' : z.jp, cls: ZCLS[z.type] };
    });
    MAP = buildMap(STAGE.querySelector('.wd-mapwrap'), {
      rows: S.map, objs, start: S.start, walk: c => c === '.' || c === '+',
      cls: c => c === '#' ? 'w-wall' : c === '+' ? 'w-exit' : 'w-floor', deco: c => c === '+' ? '<span>🚪</span>' : '',
      onObj: openZone, onStep: c => { if (c === '+') leaveShop(); }
    });
    STAGE.querySelector('#wd-info').onclick = infoSheet;
    STAGE.querySelector('#wd-q').onclick = () => Q.board();
    STAGE.querySelector('#wd-bk').onclick = basketSheet;
    STAGE.querySelector('#wd-dex').onclick = infoSheet;
    STAGE.querySelector('#wd-lv').onclick = pickLevel;
    paintHud(); Q.enter(S); paintBar(); STAGE._fit();
    if (first) infoSheet();
  }
  function leaveShop() {
    Q.leave();
    if (fromDistrict) { fromDistrict = false; App.back(); } else App.go('play', { r: PARAMS.r, d: D.id });
  }

  /* =========================================================
     街區
     ========================================================= */
  const BLD = ['🏢', '🏬', '🏠', '🏣', '🏤', '🏘️'];
  function placeInfo(p) {
    if (p.type === 'shop') { const s = W.shops[p.shop]; return s ? { icon: s.icon, label: s.name, badge: Q.shopBadge(s, true) } : { icon: '🚧', label: '準備中' }; }
    if (p.type === 'sign') return { icon: '🪧', label: '' };
    return { icon: p.icon, label: p.type === 'npc' ? '' : p.name };
  }
  const gateSheet = flow(async () => {
    const R = regionOf(D.region), ds = R.order.map(id => W.districts[id]).filter(Boolean);
    const el = sheet(`<h3 class="wd-h">🚉 要去哪裡？<small lang="ja">どこへ行きますか</small></h3>
      <div class="wd-pick wd-list">${ds.map(d => `<button type="button" data-d="${esc(d.id)}" ${d.id === D.id ? 'disabled' : ''}><span class="e">${esc(d.icon)}</span><span class="wd-tx"><b>${esc(d.name)}</b><i class="wd-k" lang="ja">${esc(d.jp)}（${esc(d.kana)}）</i><i class="wd-z">${d.id === D.id ? '目前所在地' : esc(d.desc)}</i></span></button>`).join('')}
      <button type="button" data-d=""><span class="e">🗾</span><span class="wd-tx"><b>日本地圖</b><i class="wd-z">換一個地區</i></span></button></div>`, { tall: true });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (b.dataset.d) App.go('play', { r: D.region, d: b.dataset.d }); else App.go('home'); });
  });
  function spotSheet(key, p) {
    const k = D.id + ':' + key, got = st().spots[k];
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(p.icon)}</span>${tx({ jp: p.jp, kana: p.kana, zh: p.name }, true)}<button type="button" class="wd-spk" id="wd-s1" aria-label="聽">🔊</button></div>
      <p class="wd-tip">💡 ${esc(p.tip)}</p>
      ${p.say ? `<div class="wd-sayb"><small>在這裡用得到的一句話</small>${tx(p.say, true)}<div class="wd-acts"><button type="button" class="wd-spk" id="wd-s2" aria-label="聽">🔊</button>${App.trackBtn(item(p.say, D.name, 'phrase'), true)}</div></div>` : ''}
      <div class="wd-acts"><button type="button" class="btn primary" id="wd-photo" ${got ? 'disabled' : ''}>${got ? '📸 已打卡' : '📸 打卡（+3 XP）'}</button></div>`);
    el.querySelector('#wd-s1').onclick = () => App.speak(p.jp);
    const s2 = el.querySelector('#wd-s2'); if (s2) s2.onclick = () => App.speak(p.say.jp);
    el.querySelector('#wd-photo').onclick = e => { st().spots[k] = 1; App.save(); G.sfx('coin'); G.burst(e.target, 14); App.addXP(3, `打卡 ${p.name}`); spotSheet(key, p); };
    App.speak(p.jp);
  }
  function npcSheet(key, p) {
    const npc = { who: p.name, emoji: p.icon }, line = p.lines[Math.random() * p.lines.length | 0];
    const ex = Q.npcExtra(key, p);
    const el = sheet(`${bubble(npc, line)}<div class="wd-main">${ex.map(([id, ic, t, s]) => `<button type="button" class="wd-mb quest" data-a="${esc(id)}"><span>${ic}</span><b>${esc(t)}</b><small>${esc(s || '')}</small></button>`).join('')}</div>`);
    App.speak(line.jp); bindSpk(el, line);
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const x = ex.find(e => e[0] === b.dataset.a); if (x) x[4](); });
  }
  function openPlace(key) {
    const p = D.places[key]; if (!p) return;
    if (Q.on('place', { key, p }) === 'stop') return;
    if (p.type === 'shop') {
      if (!W.shops[p.shop]) return App.toast('🚧 這間店還在準備中');
      st().pos[D.id] = MAP.pos(); App.save();
      fromDistrict = true; App.go('play', { r: D.region, d: D.id, s: p.shop });
    } else if (p.type === 'gate') gateSheet();
    else if (p.type === 'spot') spotSheet(key, p);
    else if (p.type === 'sign') facilitySheet(key, Object.assign({ type: 'sign' }, p), D.name);
    else if (p.type === 'npc') npcSheet(key, p);
  }
  function districtInfo() {
    const shops = Object.values(D.places).filter(p => p.type === 'shop').map(p => W.shops[p.shop]).filter(Boolean);
    const el = sheet(`<div class="wd-zh"><span class="wd-zi">${esc(D.icon)}</span>${tx({ jp: D.jp, kana: D.kana, zh: D.name }, true)}</div><p>${esc(D.desc)}</p>
      <h3 class="wd-h">🏪 這一區的店</h3><div class="wd-legend">${Object.keys(D.places).filter(k => D.places[k].type === 'shop' && W.shops[D.places[k].shop]).map(k => { const s = W.shops[D.places[k].shop]; return `<button type="button" data-z="${esc(k)}"><span>${esc(s.icon)}</span><span class="wd-tx"><b class="jp" lang="ja">${esc(s.jp)}</b><i class="wd-z">${esc(s.name)}　${Q.shopBadge(s)}</i></span></button>`; }).join('')}</div>
      <p class="muted center">${shops.length} 間店・點地圖上的建築就會走過去</p>`, { tall: true });
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { closeSheet(); MAP.goObj(b.dataset.z); });
  }
  function renderDistrict(el, d) {
    D = d; S = null; RUN = null;
    const w = st(); w.last[d.region] = d.id;
    const first = !w.pos[d.id];
    stage(el, `<button type="button" class="wd-loc" id="wd-info"><span>${esc(d.icon)}</span><span><b lang="ja">${esc(d.jp)}</b><small>${esc(regionOf(d.region).name)}・${esc(d.name)}</small></span></button>
      <button type="button" class="wd-hb" id="wd-jp">🗾 地圖</button><button type="button" class="wd-hb lv" id="wd-lv">${lv()}</button>`);
    const objs = {};
    Object.keys(d.places).forEach(k => { const i = placeInfo(d.places[k]); objs[k] = { icon: i.icon, label: i.label, badge: i.badge, cls: 'p-' + d.places[k].type }; });
    const start = w.pos[d.id] && d.map[w.pos[d.id][1]] && '=.'.includes(d.map[w.pos[d.id][1]][w.pos[d.id][0]]) ? w.pos[d.id] : d.start;
    MAP = buildMap(STAGE.querySelector('.wd-mapwrap'), {
      rows: d.map, objs, start, labelAll: true, walk: c => c === '=' || c === '.',
      cls: (c, x, y) => c === '=' ? 't-road' : c === '.' ? 't-walk' : c === '^' ? 't-green' : c === '~' ? 't-water' : c === '#' ? 't-bld' : 't-void',
      deco: (c, x, y) => c === '#' ? `<span>${BLD[(x * 7 + y * 13) % BLD.length]}</span>` : c === '^' ? `<span>${(x + y) % 3 ? '🌳' : '🌸'}</span>` : '',
      onObj: openPlace, onMove: p => { w.pos[d.id] = p; }
    });
    w.pos[d.id] = start; App.save();
    STAGE.querySelector('#wd-info').onclick = districtInfo;
    STAGE.querySelector('#wd-jp').onclick = () => App.go('home');
    STAGE.querySelector('#wd-lv').onclick = pickLevel;
    Q.enter(null, d); paintBar(); STAGE._fit();
    if (first) districtInfo();
  }

  /* ---------------- 難度 ---------------- */
  function pickLevel(after) {
    App.modal(`<h2>選擇程度</h2><p class="muted">程度越高，提示越少、店員說得越客氣、任務越複雜。各程度的星星分開計算。</p>
      <div class="wd-lvs">${W.LEVELS.map(l => `<button type="button" data-lv="${l.id}" class="${l.id === lv() ? 'on' : ''}"><b>${l.id}</b><span>${esc(l.label)}</span><small>${esc(l.detail)}</small></button>`).join('')}</div>`, [{ label: '關閉' }]);
    document.querySelectorAll('.modal [data-lv]').forEach(b => b.onclick = () => {
      st().lv = b.dataset.lv; App.save();
      document.querySelectorAll('.modal-bg').forEach(m => m.remove());
      App.toast(`程度改為 ${b.dataset.lv}`);
      if (typeof after === 'function') after(); else App.render();
    });
  }

  /* ---------------- 路由 ---------------- */
  function render(el, params) {
    params = params || {};
    const w = st(), at = w.at || {};
    const r = params.r || at.r || 'tokyo';
    if (pending) { pending = null; }
    el.innerHTML = '<p class="center muted" style="margin:48px 0">🚃 移動中…</p>';
    loadRegion(r).then(() => {
      if (!el.isConnected) return;
      const R = regionOf(r);
      const d = W.districts[params.d] || W.districts[w.last[r]] || W.districts[R.order.find(id => W.districts[id])];
      if (!d) { el.innerHTML = '<div class="panel center"><h2>🚧 這個地區還在準備中</h2><button class="btn primary" id="wb">回日本地圖</button></div>'; el.querySelector('#wb').onclick = () => App.go('home'); return; }
      const s = params.s ? W.shops[params.s] : null;
      PARAMS = { r, d: d.id, s: s ? s.id : null };
      w.at = Object.assign({ label: `${d.icon} ${d.name}${s ? '・' + s.icon + ' ' + s.name : ''}` }, PARAMS); App.save();
      if (s) renderShop(el, s, d); else renderDistrict(el, d);
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  App.register('play', { title: '冒險', icon: '🗾', nav: false, navParent: 'home', render });

  window.World = {
    st, lv, li, showKana, showZh, loadRegion, loadEvents, regionOf, pickLevel, Q, tx, item,
    X: {
      get S() { return S; }, get D() { return D; }, get RUN() { return RUN; }, get MAP() { return MAP; }, get PARAMS() { return PARAMS; }, get STAGE() { return STAGE; },
      sheet, closeSheet, step, flow, note, pick, build, askQ, hear, npcSay, bubble, bindSpk, paintBar, paintHud, staff, zone, itemsIn, counters, locTargets, locLine, talk, clerkSheet, signHTML, ABORT, G
    }
  };
})();
