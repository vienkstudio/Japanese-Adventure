/* =========================================================
   日語冒險 — 冒險世界：御朱印（完成店家主要任務就蓋）、挑戰（選做委託）、問路、狀況題、日本地圖  world-quest.js
   原則：全部開放、不強制。御朱印＝這間店的主要任務（買東西／點餐／辦手續）完成一次。
   挑戰的星數存在 App.state.cleared['w:<店>:<挑戰>']（不分程度），獎勵走 App.reward。
   對外：World.japan(el) 日本地圖元件、World.next() 下一步建議、World.mapPage(el)、World.goshuin()。
   路由：event（狀況題）
   ========================================================= */
(function () {
  'use strict';
  const W = window.WORLD, { X, Q, st, lv, li, tx, item } = World, esc = App.esc, G = X.G;
  const key = (shop, mid) => `w:${shop.id}:${mid}`;
  const starsOf = (shop, mid) => App.stars(key(shop, mid));
  const sceneOf = s => s.scene ? (window.SCENES || []).find(x => x.id === s.scene) : null;
  const yen = n => '¥' + n.toLocaleString('en-US');

  /* ---------------- 主要任務：每間店一個（買東西／點餐／辦手續），完成就蓋御朱印 ---------------- */
  function mainGoal(s) {
    if (s.kind === 'eat') return { id: 'order', t: '點一份餐', ev: ['served'] };
    if (s.kind === 'service' && s.asks.some(a => a.phase === 'checkin')) return { id: 'checkin', t: '辦好櫃台手續', ev: ['checkin'] };
    return { id: 'buy', t: '買一樣東西', ev: ['bought', 'vend'] };
  }
  const goalsOf = s => [mainGoal(s)];
  function track(e, d, shop) {
    const s = shop || X.S; if (!s || !mainGoal(s).ev.includes(e)) return;
    if (window.Game && Game.bump) Game.bump('quests');   // 首頁「冒險一關」
    if (!st().stamps[s.id]) setTimeout(() => stamp(s), 600);
    else if (!shop || shop === X.S) { const box = X.STAGE && X.STAGE.querySelector('#wd-goals'); if (box) { box.outerHTML = Q.goals(s); Q.bindGoals(X.STAGE); } }
  }
  Q.goals = s => {
    const stp = st().stamps[s.id], n = stp ? next() : null, [c, t] = progress(s);
    return `<div class="wd-goals" id="wd-goals"><div class="wd-acts"><span class="wd-stp${stp ? ' ok' : ''}">${stp ? '⛩️ 已蓋御朱印' : `⛩️ ${esc(mainGoal(s).t)}就蓋御朱印`}</span>${t ? `<button type="button" class="btn sm" id="wd-board">🎯 挑戰 ${c}/${t}</button>` : ''}</div>
      ${n && n.params && n.params.s !== s.id ? `<button type="button" class="wd-nextshop" id="wd-nextshop"><span>▶</span><span><small>下一間店</small><b>${esc(n.sub)}</b></span></button>` : ''}</div>`;
  };
  Q.bindGoals = el => {
    const bd = el.querySelector('#wd-board'); if (bd) bd.onclick = () => Q.board();
    const nx = el.querySelector('#wd-nextshop'); if (nx) nx.onclick = () => { const n = next(); App.go(n.route, n.params); };
  };

  /* ---------------- 御朱印：完成主要任務就蓋；全螢幕蓋印動畫 ---------------- */
  function stamp(s) {
    const w = st(); if (w.stamps[s.id]) return '';
    w.stamps[s.id] = { r: s.region, i: s.icon, n: s.name, t: App.today() };
    setNext(s);
    App.save();
    sealFX(s);
    App.addXP(10, `${s.name}・御朱印`);
    const box = X.STAGE && X.STAGE.querySelector('#wd-goals'); if (box && X.S === s) { box.outerHTML = Q.goals(s); Q.bindGoals(X.STAGE); }
    return `⛩️ 蓋上「${esc(s.name)}」御朱印`;
  }
  function sealFX(s) {
    const R = W.regions.find(r => r.id === s.region) || {}, tot = (R.shops || []).length, has = regionStamps(s.region), n = next();
    const el = document.createElement('div');
    el.className = 'modal-bg wd-seal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '蓋上御朱印');
    el.innerHTML = `<div class="wd-seal-in">
      <div class="wd-seal-st" aria-hidden="true"><span class="ic">${esc(s.icon)}</span><b lang="ja">${esc(s.jp)}</b><i lang="ja">奉拝</i><small>${esc(App.today())}</small></div>
      <h2>⛩️ 蓋上御朱印！</h2>
      <p><b>${esc(s.name)}</b>・${esc(R.name || '')} ${has}／${tot || '?'}</p>
      <p class="wd-seal-xp">+10 XP</p>
      <div class="wd-seal-b">${n && n.params && n.params.s && n.params.s !== s.id ? `<button type="button" class="btn primary" data-go>▶ 下一站：${esc(n.sub)}</button>` : ''}<button type="button" class="btn" data-x>留在這裡</button></div></div>`;
    document.body.appendChild(el);
    G.sfx('win'); if (G.confetti) G.confetti(70); if (G.vibrate) G.vibrate([30, 60, 30]);
    const close = () => el.remove();
    el.querySelector('[data-x]').onclick = close;
    el.onclick = e => { if (e.target === el) close(); };
    const go = el.querySelector('[data-go]'); if (go) go.onclick = () => { close(); App.go(n.route, n.params); };
  }

  /* =========================================================
     挑戰（選做委託）：接了也不清籃子、不擋任何操作，做到就給星
     ========================================================= */
  function missionsOf(s) {
    if (s._m) return s._m;
    const m = [];   // 只留旅伴請託、對話、狀況題（其餘和主要任務、問店員重複）
    (s.quests || []).forEach(q => m.push({ id: 'q-' + q.id, type: 'shop', icon: s.kind === 'eat' ? '🍽️' : s.kind === 'service' ? '🛎️' : '🛍️', title: q.title, sub: '旅伴的請託', quest: q }));
    const dl = (s.dialogues && s.dialogues.length ? s.dialogues : (sceneOf(s) || {}).dialogues || []).slice(0, 2);
    dl.forEach((d, i) => m.push({ id: 'talk' + i, type: 'talk', icon: '🎭', title: '對話：' + (d.title || '第 ' + (i + 1) + ' 段'), sub: '完整走一遍對話', dialog: d }));
    if (s.scene) m.push({ id: 'ev', type: 'event', icon: '⚡', title: '狀況題', sub: '旅途中的突發狀況' });
    return (s._m = m);
  }
  const progress = s => { const m = missionsOf(s); return [m.filter(x => starsOf(s, x.id) > 0).length, m.length, m.reduce((a, x) => a + starsOf(s, x.id), 0)]; };
  Q.shopBadge = (s, short) => st().stamps[s.id] ? (short ? '⛩️' : '⛩️ 已蓋印') : '';

  let M = null, R = null;   // M：店內挑戰；R：街區問路
  Q.active = () => !!M;
  Q.pref = id => (M && M.prefs && M.prefs[id] != null ? M.prefs[id] : null);
  Q.mistake = () => { if (M) M.mistakes++; else if (R) R.mistakes++; };
  Q.enter = () => { M = null; R = null; };
  Q.leave = () => { M = null; };
  Q.swap = (a, b) => { if (M && M.needs) M.needs.forEach(n => { if (n.it === a) n.it = b; }); };
  Q.barTap = () => { if (M) (M.brief || Q.board)(); else if (R) R.replay(); else if (X.D && !X.S) X.districtInfo(); };
  Q.bar = () => {
    if (R) return `<span class="wd-bi">🧭</span><span class="wd-bt"><b>照路人說的走，點你認為的目的地</b><small>點這裡再聽一次</small></span>`;
    if (M) return `<span class="wd-bi">${M.def.icon}</span><span class="wd-bt"><b>${esc(M.def.title)}</b><small>${M.text ? M.text() : ''}</small></span><span class="wd-go" data-quit>✕</span>`;
    if (X.D && !X.S && !stampCount()) { const n = Object.values(X.D.places).filter(p => p.type === 'shop').length; return `<span class="wd-bi">👆</span><span class="wd-bt"><b>點店面就會走過去、走進去</b><small>這一區有 ${n} 間店・點這裡看清單直接進店</small></span><span class="wd-go">▶</span>`; }
    return '';
  };
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#wd-bar [data-quit]')) { e.stopPropagation(); M = null; X.paintBar(); App.toast('已放下這個挑戰，隨時可以再接'); } }, true);
  Q.board = () => {
    const s = X.S; if (!s) return;
    const ms = missionsOf(s), [n, t, tot] = progress(s);
    const el = X.sheet(`<h3 class="wd-h">🎯 挑戰（選做）<small>完成 ${n}/${t}・⭐ ${tot}</small></h3>
      <div class="wd-ms">${ms.map((m, i) => { const sx = starsOf(s, m.id); return `<button type="button" class="wd-m${sx ? ' done' : ''}${M && M.def === m ? ' on' : ''}" data-i="${i}"><span class="ic">${m.icon}</span><span class="t"><b>${esc(m.title)}</b><small>${esc(m.sub)}</small></span><span class="st">${'★'.repeat(sx)}${'☆'.repeat(3 - sx)}</span></button>`; }).join('')}</div>`);
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => start(ms[+b.dataset.i]));
  };
  function start(def) {
    M = { def, shop: X.S, mistakes: 0 };
    TYPES[def.type](M);
    X.paintBar();
  }
  function finish() {
    const m = M; if (!m) return;
    M = null;
    const stars = m.mistakes === 0 ? 3 : m.mistakes <= 2 ? 2 : 1;
    const r = App.reward(key(m.shop, m.def.id), stars, `${m.shop.name}・${m.def.title}`);
    X.closeSheet(); X.paintBar(); X.paintHud();
    App.showResult({ title: `${m.def.icon} ${m.def.title}　完成！`, stars, gained: r.gained, note: m.mistakes ? `失誤 ${m.mistakes} 次（不影響進度）` : '零失誤！', retry: () => start(m.def), ok: '繼續 ➜' });
    setTimeout(() => track('mission', {}, m.shop), 400);
  }

  /* ---------------- 各類挑戰 ---------------- */
  const chip = (t, ok) => `<span class="wd-chip${ok ? ' ok' : ''}">${ok ? '✓ ' : ''}${t}</span>`;
  const itName = it => `${esc(it.emoji)} <span lang="ja">${esc(it.jp)}</span>`;
  const TYPES = {
    shop(m) {
      const s = m.shop, q = m.def.quest, byId = id => s.items.find(i => i.id === id);
      const zt = it => s.zones[it.zone].type;
      if (q) { m.needs = q.items.map(([id, n]) => ({ it: byId(id), n })).filter(n => n.it); m.prefs = Object.assign({}, q.prefs); }
      else {
        const hasMach = s.items.some(i => zt(i) === 'machine');
        let pool = s.kind === 'eat' ? s.items.filter(i => zt(i) === (hasMach ? 'machine' : 'menu')) : s.kind === 'service' ? s.items.filter(i => zt(i) === 'counter' || zt(i) === 'machine') : s.items.filter(i => zt(i) !== 'menu');
        pool = pool.filter(i => !i.soldOut);
        if (!pool.length) pool = s.items.filter(i => !i.soldOut);
        const k = Math.min(pool.length, s.kind === 'service' ? 1 + (li() >= 3) : 1 + (li() >= 1) + (li() >= 3));
        m.needs = App.sample(pool, k).map(it => ({ it, n: Math.min(it.max || 5, Math.random() < 0.3 ? 2 : 1) }));
        m.prefs = {};
      }
      const tags = new Set(m.needs.flatMap(n => n.it.tags || [])), free = m.needs.every(n => n.it.price === 0 || zt(n.it) === 'machine');
      const phases = s.kind === 'eat' ? ['enter', 'order', 'pay'] : ['pay'];
      s.asks.forEach(a => {
        if (!phases.includes(a.phase) || (a.phase === 'pay' && free)) { delete m.prefs[a.id]; return; }
        if (a.when !== 'always' && !tags.has(a.when.slice(4))) return;
        if (m.prefs[a.id] == null) m.prefs[a.id] = a.a[Math.random() * a.a.length | 0].val;
      });
      m.got = new Map();
      const have = n => (m.got.get(n.it) || 0) >= n.n || ((X.RUN.basket.find(x => x.it === n.it) || {}).n || 0) >= n.n;
      const where = s.kind === 'eat' ? (s.items.some(i => zt(i) === 'machine') ? '券売機買餐券 → 入座交給店員' : '入座 → 翻菜單 → 叫店員') : s.kind === 'service' ? '到櫃台跟店員說' : '拿到後去結帳';
      m.text = () => X.RUN.toPay ? '吃飽了，去結帳' : m.needs.map(n => chip(`${itName(n.it)} ×${n.n}`, have(n))).join('') + `<span class="wd-next">${where}</span>`;
      m.brief = () => {
        const briefs = s.asks.filter(a => m.prefs[a.id] != null).map(a => a.a.find(x => x.val === String(m.prefs[a.id]))).filter(Boolean);
        const jpOnly = q && World.assist() === 'none';
        const el = X.sheet(`<h3 class="wd-h">${m.def.icon} ${esc(m.def.title)}<small>選做：多買、少買都不會擋你，做到就給星</small></h3>
          ${q ? `<div class="wd-msg"><span class="wd-face">🧑‍🤝‍🧑</span><div class="wd-bub">${jpOnly ? tx({ jp: q.jp, kana: q.kana, zh: q.zh }) : `<span class="wd-tx"><b>${esc(q.zh)}</b></span>${li() >= 2 ? tx({ jp: q.jp, kana: q.kana }) : ''}`}</div></div>` : '<p class="muted">旅伴傳來一張清單：</p>'}
          <div class="wd-need-l">${m.needs.map(n => `<div><span class="e">${esc(n.it.emoji)}</span>${tx(n.it)}<b>×${n.n}</b></div>`).join('')}</div>
          ${briefs.length ? `<p class="wd-sub">店員問的時候，旅伴想要：</p><div class="wd-chips">${briefs.map(b => chip(esc(b.brief))).join('')}</div>` : ''}
          <p class="wd-tip">🧭 ${where}。價錢和位置都可以問店員。</p>
          <div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">出發 ➜</button></div>`);
        el.querySelector('#wd-ok').onclick = () => X.closeSheet();
      };
      m.on = (e, d) => {
        if (e === 'bought') {
          (d.items || []).forEach(b => m.got.set(b.it, (m.got.get(b.it) || 0) + b.n));
          const miss = m.needs.filter(n => (m.got.get(n.it) || 0) < n.n);
          if (!miss.length) setTimeout(finish, 300);
          else { X.paintBar(); App.toast(`還差：${miss.map(n => `${esc(n.it.emoji)}${esc(n.it.jp)}×${n.n}`).join('、')}（可以再買一次）`); }
        } else X.paintBar();
      };
      m.brief();
    },
    talk(m) {
      const d = m.def.dialog, s = m.shop;
      const run = X.flow(async () => {
        for (let i = 0; i < d.steps.length; i++) {
          const stp = d.steps[i], me = stp.speaker === '你', opts = App.shuffle(stp.choices);
          await X.step(`<p class="wd-goal">🎭 ${esc(d.title || '')}　${i + 1}/${d.steps.length}</p>
            ${me ? `<div class="wd-note">🙋 ${esc(stp.zh)}</div>` : X.bubble({ who: stp.speaker, emoji: stp.emoji, clerk: /店|員|服務|櫃台/.test(stp.speaker) }, stp)}
            <div class="wd-opts">${opts.map((o, j) => `<button type="button" class="wd-opt" data-i="${j}">${tx(o)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>
            <div class="wd-acts"><button type="button" class="btn primary" id="wd-ok" hidden>繼續 ➜</button></div>`, (el, done) => {
            if (!me) { App.speak(stp.jp); X.bindSpk(el, stp); }
            const fb = el.querySelector('.wd-fb');
            el.querySelectorAll('.wd-opt').forEach(b => b.onclick = e => {
              if (e.target.closest('.wd-peek')) return;
              const o = opts[+b.dataset.i];
              fb.className = 'wd-fb ' + (o.correct ? 'ok' : 'ng'); fb.textContent = (o.correct ? '✓ ' : '✗ ') + o.feedback;
              if (!o.correct) { b.disabled = true; b.classList.add('ng'); m.mistakes++; G.sfx('ng'); X.mood('puzzled', 'え？'); ((w) => Learn.record(w.id, 0, { src: 'world', item: w }))(item(stp.choices.find(c => c.correct), s.name, 'phrase')); return; }
              b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); App.speak(o.jp); X.mood('happy');
              el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
              el.querySelector('#wd-ok').hidden = false;
            });
            el.querySelector('#wd-ok').onclick = () => done();
          });
        }
        Q.on('said', { intent: 'talk', id: m.def.id });
        finish();
      });
      m.text = () => '對話中';
      run().then(() => { if (M === m) { M = null; X.paintBar(); } });
    },
    event(m) { const p = X.PARAMS; M = null; App.go('event', { r: p.r, d: p.d, s: p.s }); }
  };
  Q.on = (e, d) => {
    if (R && e === 'place') return R.on(d);
    track(e, d || {});
    if (M && M.on) return M.on(e, d || {});
  };
  Q.checkBasket = async () => true;
  Q.clerkExtra = k => (M && M.extra ? M.extra(k) : []);

  /* ---------------- 街區：聽指路走到目的地（走錯不擋，只提醒） ---------------- */
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROW = ['⬆️', '➡️', '⬇️', '⬅️'];
  function dirPath(d, from, goal) {
    const walk = (x, y) => d.map[y] && (d.map[y][x] === '=' || d.map[y][x] === '.');
    const done = new Set(), pq = [[0, from[0], from[1], -1, []]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [c, x, y, h, p] = pq.shift(), k = x + ',' + y + ',' + h;
      if (done.has(k)) continue; done.add(k);
      if (p.length && goal(x, y)) return { path: p, x, y };
      DIR.forEach(([dx, dy], nd) => { if (!walk(x + dx, y + dy) || (h >= 0 && (nd + 2) % 4 === h)) return; pq.push([c + 1 + (h >= 0 && nd !== h ? 5 : 0), x + dx, y + dy, nd, p.concat(nd)]); });
    }
    return null;
  }
  function describe(d, from, tiles) {
    const near = (x, y) => tiles.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) === 1);
    const r = dirPath(d, from, near); if (!r) return null;
    const turns = []; for (let i = 1; i < r.path.length; i++) if (r.path[i] !== r.path[i - 1]) turns.push((r.path[i] - r.path[i - 1] + 4) % 4 === 1 ? 'R' : 'L');
    if (turns.length > 3) return null;
    const last = r.path[r.path.length - 1], t = tiles.find(([a, b]) => Math.abs(a - r.x) + Math.abs(b - r.y) === 1);
    const td = DIR.findIndex(([dx, dy]) => r.x + dx === t[0] && r.y + dy === t[1]), rel = (td - last + 4) % 4;
    if (rel === 2) return null;
    const J = { R: ['右', 'みぎ', '右'], L: ['左', 'ひだり', '左'] };
    const fin = rel === 0 ? ['目の前にあります。', 'めのまえにあります', '就在正前方。'] : [`${J[rel === 1 ? 'R' : 'L'][0]}側にあります。`, `${J[rel === 1 ? 'R' : 'L'][1]}がわにあります`, `就在${J[rel === 1 ? 'R' : 'L'][2]}手邊。`];
    let jp = 'あちらへまっすぐ行', kana = 'あちらへまっすぐい', zh = '往那邊直走';
    if (!turns.length) { jp += 'くと、'; kana += 'くと、'; zh += '，'; }
    else {
      jp += 'って、'; kana += 'って、'; zh += '，';
      turns.forEach((t, i) => { const lastT = i === turns.length - 1; jp += `${J[t][0]}に曲が${lastT ? 'ると、' : 'って、'}`; kana += `${J[t][1]}にまが${lastT ? 'ると、' : 'って、'}`; zh += `${J[t][2]}轉，`; });
    }
    return { jp: jp + fin[0], kana: kana + fin[1], zh: zh + fin[2], first: r.path[0] };
  }
  const routeStart = X.flow(async (npcKey, p) => {
    const d = X.D, npc = { who: p.name, emoji: p.icon }, from = X.MAP.pos();
    const cands = X.MAP.comps.filter(c => c.key !== npcKey && d.places[c.key].type !== 'sign').map(c => ({ key: c.key, line: describe(d, from, c.tiles) })).filter(c => c.line);
    const uniq = cands.filter(c => cands.filter(o => o.line.jp === c.line.jp && o.line.first === c.line.first).length === 1);
    if (!uniq.length) return App.toast('這個位置不好指路，換個地方再來問');
    const t = uniq[Math.random() * uniq.length | 0];
    await X.npcSay(npc, { jp: 'おすすめの場所がありますよ。よく聞いてくださいね。', kana: 'おすすめのばしょがありますよ。よくきいてくださいね', zh: '我推薦一個地方，仔細聽喔。' });
    const tell = () => X.npcSay(npc, t.line, `<p class="wd-goal">「あちら」＝ ${ARROW[t.line.first]} 這個方向</p>`);
    await tell();
    R = {
      mistakes: 0, target: t.key,
      replay: X.flow(async () => { await tell(); X.closeSheet(); }),
      on({ key: k }) {
        if (k === npcKey) { R.replay(); return 'stop'; }
        if (d.places[k].type === 'sign') return;
        if (k !== R.target) {   // 走錯：明確告訴他錯了，可以再聽一次或照樣進去
          R.mistakes++; G.sfx('ng');
          const wp = d.places[k], wn = wp.type === 'shop' ? (W.shops[wp.shop] || {}).name || wp.name : wp.name;
          const el = X.sheet(`<p class="wd-fb ng" role="status">✗ 走錯了：這裡是「${esc(wn || '')}」，不是路人說的地方。</p>
            <div class="wd-acts"><button type="button" class="btn" id="wd-rgo">先進去看看</button><button type="button" class="btn primary" id="wd-rre">🔊 再聽一次指路</button></div>`);
          el.querySelector('#wd-rre').onclick = () => R && R.replay();
          el.querySelector('#wd-rgo').onclick = () => { R = null; X.paintBar(); X.closeSheet(); X.openPlace(k); };
          return 'stop';
        }
        const stars = R.mistakes === 0 ? 3 : R.mistakes <= 2 ? 2 : 1, tp = d.places[k];
        R = null; X.paintBar();
        const r = App.reward(`w:${d.id}:route`, stars, `${d.name}・問路`);
        const nm = tp.type === 'shop' ? (W.shops[tp.shop] || {}).name : tp.name;
        App.showResult({ title: `✓ 走對了！🧭 ${nm}`, stars, gained: r.gained, ok: '繼續 ➜' });
        return 'stop';
      }
    };
    X.closeSheet(); X.paintBar();
  });
  Q.npcExtra = (k, p) => [['!route', '🧭', '聽指路走過去', '路人推薦一個地方，照他說的走', () => routeStart(k, p)]];

  /* =========================================================
     路由：event — 狀況題（沿用 data/travel*.js，依程度挑題組、3 顆愛心）
     ========================================================= */
  const EVL = { zero: 'N5', n5: 'N5', n4: 'N4', n3: 'N3', n2: 'N2', n1: 'N1' }, EVO = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const evObj = e => Array.isArray(e) ? { scene: e[0], prompt: e[1], translation: e[2], answers: e[3], explanation: e[4], reading: e[5] } : e;
  function renderEvent(el, params) {
    params = params || {};
    el.innerHTML = '<p class="center muted wd-wait">載入中…</p>';
    Promise.all([World.loadRegion(params.r || 'tokyo'), World.loadEvents()]).then(() => {
      if (!el.isConnected) return;
      const shop = W.shops[params.s], stop = shop && (window.TravelData || { stops: [] }).stops.find(x => x.id === shop.scene);
      let L = EVL[lv()];
      if (stop && !stop.events[L]) L = EVO.slice(0, EVO.indexOf(L) + 1).reverse().concat(EVO).find(k => stop.events[k]);
      const events = stop && L && stop.events[L];
      if (!events) { App.toast('這間店沒有狀況題'); return App.back(); }
      let at = 0, correct = 0, hearts = 3, combo = 0; const wrong = [];
      const hud = () => `<span class="ev-h">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="ev-c">🔥${combo}</span>` : ''}`;
      const ck = Object.keys(shop.zones).find(k => shop.zones[k].npc), npc = ck ? shop.zones[ck].npc : { who: '店員' };
      const finishEv = () => {
        const n = events.length, stars = hearts <= 0 ? 0 : correct === n ? 3 : correct >= n - 1 ? 2 : correct * 2 >= n ? 1 : 0;
        const r = stars ? App.reward(key(shop, 'ev'), stars, `${shop.name}・狀況題`) : { gained: 0 };
        el.innerHTML = `<section class="ev"><div class="panel center"><h2>${stars ? '狀況題通過！' : hearts <= 0 ? '💔 愛心用完了' : '再挑戰一次'}</h2><p>${correct}／${n} 題答對</p></div></section>`;
        App.showResult({ title: stars ? `⚡ ${shop.name}・狀況題 通過！` : hearts <= 0 ? '💔 愛心用完了' : '再試一次', stars, correct, total: n, gained: r.gained, wrong, retry: () => renderEvent(el, params), back: { label: '回店裡 ➜' } });
        if (stars) setTimeout(() => track('mission', {}, shop), 400);
      };
      const show = () => {
        const q = evObj(events[at]), choices = App.shuffle(q.answers);
        const it = App.wordItem({ jp: q.answers[0], zh: q.scene, hint: q.explanation }, shop.name, 'phrase');
        el.innerHTML = `<section class="ev">
          <div class="ev-top"><b>${esc(shop.icon)} ${esc(shop.name)}・狀況題</b><span>${at + 1}／${events.length}</span><span id="ev-hud">${hud()}</span></div>
          <div class="panel"><p class="ev-scene">${esc(q.scene)}</p>
            <div class="wd-npc"><span class="wd-face pt">${World.clerkSVG(World.bgOf(shop), shop.id + npc.who, npc, true)}</span><div class="wd-bub"><small>${esc(stop.npc)}</small>${tx({ jp: q.prompt, kana: q.reading && q.reading !== q.prompt ? q.reading : '', zh: q.translation })}<button type="button" class="wd-spk" id="ev-spk" aria-label="再聽一次">🔊</button></div></div></div>
          <div class="wd-opts">${choices.map((c, i) => `<button type="button" class="wd-opt jp" lang="ja" data-i="${i}">${esc(c)}</button>`).join('')}</div>
          <div class="ev-fb" hidden></div>
          <div class="wd-acts"><button type="button" class="btn primary" id="ev-next" hidden></button></div></section>`;
        App.speak(q.reading || q.prompt);
        el.querySelector('#ev-spk').onclick = () => App.speak(q.reading || q.prompt);
        const btns = el.querySelectorAll('.wd-opt'), next = el.querySelector('#ev-next'), fb = el.querySelector('.ev-fb');
        btns.forEach(b => b.onclick = () => {
          const right = choices[+b.dataset.i] === q.answers[0];
          btns.forEach(x => { x.disabled = true; if (choices[+x.dataset.i] === q.answers[0]) x.classList.add('ok'); });
          if (right) { correct++; combo++; G.sfx(combo >= 3 ? 'combo' : 'ok'); G.bump('ok'); G.burst(b, 12); }
          else { hearts = Math.max(0, hearts - 1); combo = 0; b.classList.add('ng'); G.sfx('hurt'); G.shake(); ((w) => Learn.record(w.id, 0, { src: 'world', item: w }))(it); wrong.push(it); }
          el.querySelector('#ev-hud').innerHTML = hud();
          fb.hidden = false; fb.className = 'ev-fb ' + (right ? 'ok' : 'ng');
          fb.innerHTML = `<b>${right ? '✓ 回應正確' : '✗ 這樣回應更合適'}</b><p class="jp" lang="ja">${esc(q.answers[0])}</p><p>${esc(q.explanation)}</p>${App.trackBtn(it, true)}`;
          next.hidden = false; next.textContent = hearts <= 0 ? '💔 愛心用完，結束' : at + 1 === events.length ? '看結果 ➜' : '下一題 ➜';
          next.scrollIntoView({ block: 'nearest' });
        });
        next.onclick = () => { if (hearts > 0 && ++at < events.length) show(); else finishEv(); };
      };
      show();
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center wd-wait">😵 載入失敗</p>'; });
  }
  App.register('event', { title: '狀況題', icon: '⚡', nav: false, navParent: 'play', render: renderEvent });

  /* =========================================================
     日本地圖元件（首頁可嵌入）、日本地圖頁、御朱印帳、句卡、下一步建議
     ========================================================= */
  const stampCount = () => Object.keys(st().stamps).length;
  const regionStamps = id => Object.values(st().stamps).filter(s => s.r === id).length;
  // 卡片位置：index.js 的 nx,ny（已排開不重疊）；沒有就放在地名點下方
  const nodeOf = r => [r.nx != null ? r.nx : r.x, r.ny != null ? r.ny : r.y + 10];
  const LAND = [
    'M68.6 25.5L71.7 26.1L72.0 31.1L75.1 36.7L72.6 41.8L69.2 44.0L69.2 50.7L67.0 54.6L68.4 58.0L65.8 60.8L62.8 62.5L62.5 59.7L61.4 60.2L58.8 60.8L57.2 64.2L55.8 61.6L53.5 64.2L48.5 63.9L46.0 63.3L46.2 65.8L42.9 67.5L40.1 70.6L36.2 68.4L36.4 65.8L38.1 63.6L33.9 63.3L28.9 64.7L24.4 65.8L20.5 66.4L16.6 67.8L12.6 67.8L12.9 65.3L16.0 63.6L21.0 60.2L26.1 58.8L32.2 58.6L37.3 58.0L40.6 57.7L41.8 55.2L45.1 51.6L45.4 48.5L48.8 47.9L46.8 51.3L49.0 51.8L53.5 50.2L56.9 46.2L60.2 44.0L62.2 39.5L63.9 35.0L62.8 30.6L65.3 27.2Z',
    'M63.9 25.8L65.0 21.9L62.5 19.4L65.8 16.0L71.2 16.0L72.8 9.8L73.1 3.7L75.9 3.4L81.5 8.2L88.8 11.5L93.3 9.6L93.3 13.8L96.1 15.2L91.6 17.1L85.2 18.0L82.1 22.7L77.6 21.0L73.1 19.4L69.2 20.8L66.4 19.9L67.8 24.1L67.0 25.8Z',
    'M21.0 71.4L23.0 68.4L27.2 67.5L30.8 66.1L33.9 66.7L34.2 68.6L31.1 71.4L27.8 70.6L24.4 74.5L22.2 74.2Z',
    'M6.2 70.0L9.8 67.8L13.2 67.8L16.8 70.9L18.2 75.4L15.7 82.1L13.2 84.0L11.2 84.0L8.7 82.6L9.6 78.2L7.6 74.5L5.6 74.5L5.4 72.0Z',
    'M25.3 97.8L28.6 94.5L31.9 90.1L34.1 86.8L39.6 81.3L38.5 83.5L33.0 83.5L29.7 86.8L26.4 90.1L27.5 92.3L25.3 95.6Z'
  ];
  function japan(el) {
    const here = (st().at || {}).r, A = window.WorldArt;
    el.innerHTML = `<div class="jp-map"><svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs><pattern id="jp-wave" width="8" height="5" patternUnits="userSpaceOnUse"><path d="M0 3 Q2 1 4 3 T8 3" class="wave"/></pattern></defs>
        <rect width="100" height="100" fill="url(#jp-wave)"/>
        <rect x="21" y="78" width="22" height="21" rx="2" class="inset"/>
        ${LAND.map(d => `<path class="land" d="${d}"/>`).join('')}
        <path class="rail" d="M26 95.4 L38.4 63.7 L39.9 61.9 L61.9 58.1 L71.2 16.8"/>
        ${W.regions.map(r => { const o = nodeOf(r); return `<line class="lead" x1="${r.x}" y1="${r.y}" x2="${o[0]}" y2="${o[1]}"/><circle class="pin" cx="${r.x}" cy="${r.y}" r="1.4"/>`; }).join('')}
      </svg>
      ${W.regions.map(r => { const o = nodeOf(r), g = regionStamps(r.id), tot = (r.shops || []).length; return `<button type="button" class="jp-node${here === r.id ? ' here' : ''}${A ? ' art' : ''}" style="left:${o[0]}%;top:${o[1]}%" data-r="${r.id}" aria-label="${esc(r.name)}"><span>${A ? A.region(r.id) : r.icon}</span><b>${esc(r.name)}</b><small>${A ? A.seal() : '⛩️'}${g}/${tot}</small>${A && here === r.id ? `<i class="jp-here">${A.pin()}</i>` : ''}</button>`; }).join('')}</div>`;
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => App.go('play', { r: b.dataset.r }));
  }
  function mapPage(el) {
    const n = next();
    el.innerHTML = `<section class="jp-page">
      <h2 class="jp-t">🗾 日本地圖</h2>
      <button type="button" class="jp-cont" id="jp-next"><span>▶</span><span>${esc(n.label)}<small>${esc(n.sub || '')}</small></span></button>
      <div id="jp-mapbox"></div>
      <div class="jp-grid"><button type="button" class="jp-tile" id="jp-boot">🎧 聽力特訓<small>店員問句・數字</small></button><button type="button" class="jp-tile" id="jp-gs">⛩️ 御朱印帳<small>${stampCount()}／${allShops().length} 間店</small></button></div>
    </section>`;
    japan(el.querySelector('#jp-mapbox'));
    el.querySelector('#jp-next').onclick = () => App.go(n.route, n.params);
    el.querySelector('#jp-gs').onclick = goshuin;
    el.querySelector('#jp-boot').onclick = () => App.go('boot');
  }
  // 全部店家（index.js 的推薦清單，不必載入地區資料）
  const allShops = () => W.regions.flatMap(r => (r.shops || []).map(([d, s, label]) => ({ r: r.id, d, s, label })));
  const iconOf = label => (String(label).split('・').slice(1).join('・').split(' ')[0]) || '⛩️';
  function goshuin() {
    const w = st(), n = stampCount(), all = allShops();
    App.modal(`<h2>⛩️ 御朱印帳</h2><p class="muted">完成一間店的主要任務（買東西、點餐、辦手續）就蓋印；灰色是還沒蓋的店。</p>
      ${W.regions.map(r => {
        const list = (r.shops || []), got = list.filter(x => w.stamps[x[1]]).length;
        const extra = Object.keys(w.stamps).filter(id => w.stamps[id].r === r.id && !list.some(x => x[1] === id));
        return `<p class="gs-r"><b>${r.icon} ${esc(r.name)}</b>　${got + extra.length}／${list.length}</p><div class="tg-grid gs-grid">${list.map(([d, id, label]) => { const sp = w.stamps[id]; return sp ? `<div class="tg-cell ok"><span>${esc(sp.i)}</span><small>${esc(sp.n)}</small></div>` : `<div class="tg-cell gs-ghost" title="${esc(label)}"><span>${esc(iconOf(label))}</span><small>？？？</small></div>`; }).join('')}${extra.map(id => `<div class="tg-cell ok"><span>${esc(w.stamps[id].i)}</span><small>${esc(w.stamps[id].n)}</small></div>`).join('')}</div>`;
      }).join('')}
      <p class="center">共 <b>${n}</b>／${all.length} 間店</p>`, [{ label: '🎭 換頭像', onClick: () => window.Game && Game.pickAvatar(() => App.render()) }, { label: '關閉', cls: 'primary' }]);
  }
  // 推薦清單：依程度從推薦起點開始，往後找第一間還沒蓋印的店
  function nextOpen(exclude) {
    const w = st(), C = allShops(), R = World.REC[lv()] || World.REC.zero;
    const i = Math.max(0, C.findIndex(c => c.s === R.s)), order = C.slice(i).concat(C.slice(0, i));
    return order.find(c => !w.stamps[c.s] && c.s !== exclude) || null;
  }
  // 蓋印後記下「下一間推薦店」：同街區還沒蓋印的店優先，否則照推薦清單
  function setNext(s) {
    const w = st(), D = X.D;
    let nx = null;
    if (D && D.region === s.region) {
      const sh = Object.values(D.places).filter(p => p.type === 'shop').map(p => W.shops[p.shop]).find(x => x && x.id !== s.id && !w.stamps[x.id]);
      if (sh) nx = { r: s.region, d: D.id, s: sh.id, label: `${D.icon} ${D.name}・${sh.icon} ${sh.name}` };
    }
    w.nextShop = nx || nextOpen(s.id);
  }
  // 下一步建議（給首頁用）：{label, sub, route, params}；sub 一定是目的地（例「🐼 上野・🏪 便利商店」）
  function next() {
    const w = st(), at = w.at || {}, go = c => ({ r: c.r, d: c.d, s: c.s });
    if (at.s && at.d && !w.stamps[at.s]) return { label: '繼續冒險', sub: at.label || '', route: 'play', params: go(at) };
    if (w.nextShop && w.nextShop.s && !w.stamps[w.nextShop.s]) return { label: '下一間店', sub: w.nextShop.label, route: 'play', params: go(w.nextShop) };
    const c = nextOpen();
    if (c) return { label: stampCount() ? '下一間店' : '開始冒險', sub: c.label, route: 'play', params: go(c) };
    return { label: '自由逛', sub: '🗾 日本地圖（全部店都蓋過印了！）', route: 'play', params: { map: 1 } };
  }
  Object.assign(World, { japan, mapPage, goshuin, next, stampCount, missionsOf, progress, goalsOf });
  App.addUnlock(() => []);
})();
