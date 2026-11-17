/* =========================================================
   日語冒險 — 冒險世界：委託、對話、狀況題、問路、御朱印、日本地圖  world-quest.js
   每間店的委託由資料自動產生（依 kind 與有的資料）＋資料裡的劇情委託 quests。
   星數統一存在 App.state.cleared['w:<店>:<委託>@<程度>']，獎勵走 App.reward（全站同一套規則）。
   路由：event（狀況題）
   ========================================================= */
(function () {
  'use strict';
  const W = window.WORLD, { X, Q, st, lv, li, tx, item } = World, esc = App.esc, G = X.G;
  const key = (shop, mid) => `w:${shop.id}:${mid}@${lv()}`;
  const starsOf = (shop, mid) => App.stars(key(shop, mid));
  const sceneOf = s => s.scene ? (window.SCENES || []).find(x => x.id === s.scene) : null;
  const yen = n => '¥' + n.toLocaleString('en-US');

  /* ---------------- 委託清單 ---------------- */
  function missionsOf(s) {
    if (s._m) return s._m;
    const m = [{ id: 'tour', type: 'tour', icon: '👣', title: '認識這間店', sub: '逛一圈，看每個區域叫什麼' },
      { id: 'find', type: 'find', icon: '📍', title: '問路找東西', sub: '問店員在哪裡，聽懂後走過去' }];
    (s.quests || []).forEach(q => m.push({ id: 'q-' + q.id, type: 'shop', icon: s.kind === 'eat' ? '🍽️' : s.kind === 'service' ? '🛎️' : '🛍️', title: q.title, sub: '劇情委託', quest: q }));
    m.push({ id: 'rand', type: 'shop', icon: '🎲', title: s.kind === 'eat' ? '今天吃什麼' : s.kind === 'service' ? '櫃台需求' : '臨時採買', sub: '每次內容都不一樣' });
    if (s.asks.some(a => a.phase === 'checkin')) m.push({ id: 'checkin', type: 'checkin', icon: '📝', title: '辦手續', sub: '聽懂櫃台的每個問題' });
    m.push({ id: 'ask', type: 'ask', icon: '💬', title: '打聽消息', sub: '開口問，再聽懂回答' });
    m.push({ id: 'read', type: 'read', icon: '🪧', title: '看懂標示', sub: '認出看板和區域名稱' });
    const dl = (s.dialogues && s.dialogues.length ? s.dialogues : (sceneOf(s) || {}).dialogues || []).slice(0, 2);
    dl.forEach((d, i) => m.push({ id: 'talk' + i, type: 'talk', icon: '🎭', title: '對話：' + (d.title || '第 ' + (i + 1) + ' 段'), sub: '完整走一遍對話', dialog: d }));
    if (s.scene) m.push({ id: 'ev', type: 'event', icon: '⚡', title: '狀況題', sub: '旅途中的突發狀況' });
    return (s._m = m);
  }
  const progress = s => { const m = missionsOf(s); return [m.filter(x => starsOf(s, x.id) > 0).length, m.length, m.reduce((a, x) => a + starsOf(s, x.id), 0)]; };
  const stampNeed = s => Math.min(5, missionsOf(s).length);
  Q.shopBadge = (s, short) => {
    const [n, t] = progress(s), stamp = st().stamps[s.id];
    return short ? (stamp ? '⛩️' : n ? `${n}/${t}` : '') : `${n}/${t}${stamp ? ' ⛩️' : ''}`;
  };

  /* ---------------- 執行中的委託 ---------------- */
  let M = null, R = null;   // M：店內委託；R：街區問路
  Q.active = () => !!M;
  Q.pref = id => (M && M.prefs && M.prefs[id] != null ? M.prefs[id] : null);
  Q.mistake = () => { if (M) M.mistakes++; else if (R) R.mistakes++; };
  Q.enter = () => { M = null; R = null; };
  Q.leave = () => { M = null; };
  Q.swap = (a, b) => { if (M && M.needs) M.needs.forEach(n => { if (n.it === a) n.it = b; }); };
  Q.barTap = () => { if (M) (M.brief || Q.board)(); else if (R) R.replay(); else Q.board(); };
  Q.bar = () => {
    if (R) return `<span class="wd-bi">🧭</span><span class="wd-bt"><b>照路人說的走，點你認為的目的地</b><small>點這裡再聽一次</small></span>`;
    if (!X.S) return '';
    if (!M) { const [n, t] = progress(X.S); return `<span class="wd-bi">📒</span><span class="wd-bt"><b>${n ? `委託 ${n}/${t}` : '接一個委託開始'}</b><small>${n >= t ? '這間店全部完成了，也可以自由逛' : '或直接逛：點貨架、點店員都可以互動'}</small></span><span class="wd-go">▶</span>`; }
    return `<span class="wd-bi">${M.def.icon}</span><span class="wd-bt"><b>${esc(M.def.title)}</b><small>${M.text ? M.text() : ''}</small></span>${M.mistakes ? `<span class="wd-miss">✗${M.mistakes}</span>` : ''}`;
  };
  Q.board = () => {
    const s = X.S; if (!s) return;
    const ms = missionsOf(s), [n, t, tot] = progress(s);
    const el = X.sheet(`<h3 class="wd-h">📒 委託板<small>${lv()}・完成 ${n}/${t}・⭐ ${tot}</small></h3>
      <p class="wd-stamp ${st().stamps[s.id] ? 'ok' : ''}">${st().stamps[s.id] ? '⛩️ 已蓋御朱印' : `⛩️ 完成 ${stampNeed(s)} 個委託就能蓋御朱印（${Math.min(n, stampNeed(s))}/${stampNeed(s)}）`}</p>
      ${M ? `<div class="wd-acts"><button type="button" class="btn" id="wd-quit">放棄目前的委託：${esc(M.def.title)}</button></div>` : ''}
      <div class="wd-ms">${ms.map((m, i) => { const sx = starsOf(s, m.id); return `<button type="button" class="wd-m${sx ? ' done' : ''}${M && M.def === m ? ' on' : ''}" data-i="${i}"><span class="ic">${m.icon}</span><span class="t"><b>${esc(m.title)}</b><small>${esc(m.sub)}</small></span><span class="st">${'★'.repeat(sx)}${'☆'.repeat(3 - sx)}</span></button>`; }).join('')}</div>`, { tall: true });
    const q = el.querySelector('#wd-quit'); if (q) q.onclick = () => { M = null; X.paintBar(); Q.board(); };
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => start(ms[+b.dataset.i]));
  };
  function start(def) {
    const s = X.S;
    M = { def, shop: s, mistakes: 0 };
    X.RUN.basket = []; X.RUN.vals = {}; X.RUN.incident = false; X.RUN.toPay = false; X.RUN.served = false; X.RUN.entered = false;
    X.paintHud();
    TYPES[def.type](M);
    X.paintBar();
  }
  function finish() {
    const m = M; if (!m) return;
    M = null;
    const stars = m.mistakes === 0 ? 3 : m.mistakes <= 2 ? 2 : 1;
    const r = App.reward(key(m.shop, m.def.id), stars, `${m.shop.name}・${m.def.title}`);
    const stamp = checkStamp(m.shop);
    X.closeSheet(); X.paintBar(); X.paintHud();
    App.showResult({ title: `${m.def.icon} ${m.def.title}　完成！`, stars, gained: r.gained, note: (m.mistakes ? `失誤 ${m.mistakes} 次` : '零失誤！') + (stamp ? `<br>${stamp}` : ''), retry: () => start(m.def), ok: '繼續 ➜' });
  }
  const DROPS = ['🍣', '🍙', '🍡', '🎎', '🗻', '🦝', '🐸', '🎏', '🍵', '🐟', '🌸', '🎐', '🍜', '🦌', '🐙', '🦀', '🐬', '🌺', '⛄', '🏯'];
  function checkStamp(s) {
    const w = st(); if (w.stamps[s.id]) return '';
    if (progress(s)[0] < stampNeed(s)) return '';
    const before = Object.keys(w.stamps).length;
    w.stamps[s.id] = { r: s.region, i: s.icon, n: s.name, t: App.today() };
    const own = App.state.avatarsOwned || (App.state.avatarsOwned = []);
    const left = DROPS.filter(e => !own.includes(e)), got = left.length ? left[Math.random() * left.length | 0] : '';
    if (got) own.push(got);
    App.save();
    const open = W.regions.filter(r => r.need > before && r.need <= before + 1);
    if (open.length) setTimeout(() => App.toast(`🔓 新地區開放：${open.map(r => r.icon + ' ' + r.name).join('、')}`, 'ok'), 2600);
    return `⛩️ 蓋上「${esc(s.name)}」御朱印${got ? `・🎁 頭像 ${got}` : ''}`;
  }

  /* ---------------- 各類委託 ---------------- */
  const chip = (t, ok) => `<span class="wd-chip${ok ? ' ok' : ''}">${ok ? '✓ ' : ''}${t}</span>`;
  const itName = it => `${esc(it.emoji)} <span lang="ja">${esc(it.jp)}</span>`;
  const TYPES = {
    tour(m) {
      const zs = Object.keys(m.shop.zones).filter(k => !['deco', 'menu'].includes(m.shop.zones[k].type));
      m.need = Math.min(6, zs.length); m.seen = new Set();
      m.text = () => `走到不同的區域看看：${m.seen.size}/${m.need}`;
      m.on = (e, d) => { if (e === 'visit') { m.seen.add(d.zone); X.paintBar(); if (m.seen.size >= m.need) setTimeout(finish, 600); } };
      X.closeSheet();
      App.toast('👣 點地圖上的櫃位、設施、看板，走過去看看');
    },
    find(m) {
      const all = App.shuffle(X.locTargets()), ts = [];
      all.forEach(t => { if (ts.length < 3 && !ts.some(x => x.zone === t.zone)) ts.push(t); });
      m.ts = ts; m.i = 0; m.phase = 'ask';
      m.text = () => m.phase === 'ask' ? `${m.i + 1}/${ts.length} 問店員：「${esc(ts[m.i].x.zh)}」在哪裡？` : `${m.i + 1}/${ts.length} 走到店員說的地方`;
      m.extra = k => m.phase === 'ask' ? [['!find', '🎯', `問「${ts[m.i].x.zh}」在哪裡`, '委託', () => X.talk('where', k, ts[m.i])]] : [];
      m.on = (e, d) => {
        const t = ts[m.i];
        if (e === 'said' && d.intent === 'where' && d.id === t.id && m.phase === 'ask') { m.phase = 'go'; X.paintBar(); return 'close'; }
        if (e === 'visit' && m.phase === 'go') {
          if (d.zone === String(t.zone)) { G.sfx('ok'); G.bump('ok'); App.toast('✓ 找到了！', 'ok'); m.i++; m.phase = 'ask'; X.paintBar(); if (m.i >= ts.length) setTimeout(finish, 500); else setTimeout(() => X.closeSheet(), 900); }
          else if (m.shop.zones[d.zone].type !== 'counter') { m.mistakes++; G.sfx('ng'); App.toast('✗ 不是這裡，回想店員說的話（可以再問一次）'); m.phase = 'ask'; X.paintBar(); }
        }
      };
      X.closeSheet();
      App.toast('📍 先走到店員那裡開口問');
    },
    shop(m) {
      const s = m.shop, q = m.def.quest, byId = id => s.items.find(i => i.id === id);
      const zt = it => s.zones[it.zone].type;
      if (q) { m.needs = q.items.map(([id, n]) => ({ it: byId(id), n })); m.prefs = Object.assign({}, q.prefs); }
      else {
        const hasMach = s.items.some(i => zt(i) === 'machine');
        let pool = s.kind === 'eat' ? s.items.filter(i => zt(i) === (hasMach ? 'machine' : 'menu')) : s.kind === 'service' ? s.items.filter(i => zt(i) === 'counter' || zt(i) === 'machine') : s.items.filter(i => zt(i) !== 'menu');
        if (!pool.length) pool = s.items;
        const k = Math.min(pool.length, s.kind === 'service' ? 1 + (li() >= 1) : 2 + (li() >= 1) + (li() >= 3));
        m.needs = App.sample(pool, k).map(it => ({ it, n: Math.random() < 0.3 ? 2 : 1 }));
        m.prefs = {};
      }
      const tags = new Set(m.needs.flatMap(n => n.it.tags || [])), free = m.needs.every(n => n.it.price === 0 || zt(n.it) === 'machine');
      const phases = s.kind === 'eat' ? ['enter', 'order', 'pay'] : ['pay'];
      s.asks.forEach(a => {
        if (!phases.includes(a.phase) || (a.phase === 'pay' && free)) { delete m.prefs[a.id]; return; }
        if (a.when !== 'always' && !tags.has(a.when.slice(4))) return;
        if (m.prefs[a.id] == null) m.prefs[a.id] = a.a[Math.random() * a.a.length | 0].val;
      });
      const have = n => { const b = X.RUN.basket.find(x => x.it === n.it); return b && b.n === n.n; };
      const where = s.kind === 'eat' ? (s.items.some(i => zt(i) === 'machine') ? '券売機買餐券 → 入座交給店員' : '入座 → 翻菜單 → 叫店員') : s.kind === 'service' ? '到櫃台跟店員說' : '拿齊後到收銀台';
      m.text = () => X.RUN.toPay ? '吃飽了，到 <span lang="ja">レジ</span> 結帳' : m.needs.map(n => chip(`${itName(n.it)} ×${n.n}`, have(n))).join('') + `<span class="wd-next">${where}</span>`;
      m.brief = () => {
        const briefs = s.asks.filter(a => m.prefs[a.id] != null).map(a => a.a.find(x => x.val === String(m.prefs[a.id]))).filter(Boolean);
        const jpOnly = q && li() >= 3;
        const el = X.sheet(`<h3 class="wd-h">${m.def.icon} ${esc(m.def.title)}</h3>
          ${q ? `<div class="wd-msg"><span class="wd-face">🧑‍🤝‍🧑</span><div class="wd-bub">${jpOnly ? tx({ jp: q.jp, kana: q.kana, zh: q.zh }) : `<span class="wd-tx"><b>${esc(q.zh)}</b></span>${li() >= 1 ? tx({ jp: q.jp, kana: q.kana }) : ''}`}</div></div>` : '<p class="muted">旅伴傳來一張清單：</p>'}
          <div class="wd-need-l">${m.needs.map(n => `<div><span class="e">${esc(n.it.emoji)}</span>${tx(n.it)}<b>×${n.n}</b></div>`).join('')}</div>
          ${briefs.length ? `<p class="wd-sub">店員問的時候要回答：</p><div class="wd-chips">${briefs.map(b => chip(esc(b.brief))).join('')}</div>` : ''}
          <p class="wd-tip">🧭 ${where}。品名要自己在店裡找，價錢和位置都可以問店員。</p>
          <div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">出發 ➜</button></div>`, { tall: true });
        el.querySelector('#wd-ok').onclick = () => X.closeSheet();
      };
      m.check = async () => {
        const B = X.RUN.basket, miss = m.needs.filter(n => !have(n)), extra = B.filter(b => !m.needs.some(n => n.it === b.it));
        if (!miss.length && !extra.length) return true;
        m.mistakes++; G.sfx('ng');
        await X.note(`<b>🧑‍🤝‍🧑 旅伴：東西不對喔！</b>${miss.length ? `<p>還缺：${miss.map(n => `${itName(n.it)} ×${n.n}`).join('、')}</p>` : ''}${extra.length ? `<p>多拿了：${extra.map(b => itName(b.it)).join('、')}</p>` : ''}<p class="muted">點右上 🧺 可以調整數量。</p>`);
        X.closeSheet();
        return false;
      };
      m.on = e => { if (e === 'bought') setTimeout(finish, 300); else X.paintBar(); };
      m.brief();
    },
    checkin(m) {
      const as = m.shop.asks.filter(a => a.phase === 'checkin');
      m.prefs = {}; as.forEach(a => { m.prefs[a.id] = a.a[Math.random() * a.a.length | 0].val; });
      m.text = () => '到櫃台按「辦手續」，照任務單回答';
      m.brief = () => {
        const el = X.sheet(`<h3 class="wd-h">📝 辦手續</h3><p class="muted">櫃台會一題一題問，照下面的條件回答：</p>
          <div class="wd-chips">${as.map(a => chip(esc(a.a.find(x => x.val === m.prefs[a.id]).brief))).join('')}</div>
          <div class="wd-acts"><button type="button" class="btn primary" id="wd-ok">出發 ➜</button></div>`);
        el.querySelector('#wd-ok').onclick = () => X.closeSheet();
      };
      m.on = e => { if (e === 'checkin') setTimeout(finish, 300); };
      m.brief();
    },
    ask(m) {
      const s = m.shop, pool = [];
      App.sample(s.info || [], 2).forEach(x => pool.push({ k: 'info', x, zh: x.q.zh }));
      App.sample(s.items.filter(i => i.price > 0), 1).forEach(x => pool.push({ k: 'price', x, zh: `${x.zh}多少錢？` }));
      App.sample(s.may || [], 1).forEach(x => pool.push({ k: 'may', x, zh: `可以${x.zh}嗎？` }));
      m.rs = App.shuffle(pool).slice(0, 3); m.i = 0;
      m.text = () => `${m.i + 1}/${m.rs.length} 問店員：${esc(m.rs[m.i].zh)}`;
      const round = X.flow(async k => {
        const r = m.rs[m.i], npc = X.staff(k);
        if (r.k === 'info') { await X.build(Phrase.make('info', { q: r.x.q }, lv())); await X.hear(npc, r.x.re, r.x.opts); }
        else if (r.k === 'price') {
          await X.build(Phrase.make('price', { x: r.x }, lv()));
          const p = r.x.price, y = Phrase.yen(p), d = p >= 1000 ? 100 : 10;
          await X.hear(npc, { jp: `${y.jp}です。`, kana: `${y.kana}です`, zh: y.zh }, [yen(p), yen(p + d), yen(p + d * 10)], '多少錢？');
        } else { await X.build(Phrase.make('may', { a: r.x }, lv())); await X.hear(npc, r.x.re, r.x.ok ? ['可以', '不可以', '要另外付費'] : ['不可以', '可以', '要另外付費'], '店員的意思是？'); }
        m.i++;
        if (m.i >= m.rs.length) return finish();
        X.paintBar(); X.clerkSheet(k);
      });
      m.extra = k => [['!ask', '🎯', m.rs[m.i].zh, '委託', () => round(k)]];
      X.closeSheet();
      App.toast('💬 走到店員那裡，按委託的問題');
    },
    read(m) {
      const s = m.shop, pool = Object.values(s.zones).filter(z => z.jp && z.zh && z.type !== 'menu');
      const qs = App.sample(pool, Math.min(5, pool.length));
      const run = X.flow(async () => {
        for (let i = 0; i < qs.length; i++) {
          const z = qs[i], opts = App.shuffle([z].concat(App.sample(pool.filter(x => x.jp !== z.jp), 3)));
          await X.step(`<p class="wd-goal">🪧 ${i + 1}/${qs.length}　你想找：<b>${esc(z.zh)}</b></p><p class="muted center">要看哪一個標示？</p>
            <div class="wd-opts wd-signs">${opts.map((o, j) => `<button type="button" class="wd-opt" data-i="${j}">${o.type === 'sign' ? X.signHTML(o) : `<b class="jp" lang="ja">${esc(o.jp)}</b>`}${World.showKana() ? `<i class="wd-k" lang="ja">${esc(o.kana)}</i>` : ''}</button>`).join('')}</div><p class="wd-fb" role="status"></p>`, (el, done) => {
            el.querySelectorAll('.wd-opt').forEach(b => b.onclick = () => {
              const o = opts[+b.dataset.i];
              if (o !== z) { b.disabled = true; b.classList.add('ng'); m.mistakes++; G.sfx('ng'); Tracker.add(item(z, s.name), true); el.querySelector('.wd-fb').className = 'wd-fb ng'; el.querySelector('.wd-fb').textContent = `✗ ${o.jp}＝${o.zh}`; return; }
              b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); App.speak(z.jp);
              el.querySelector('.wd-fb').className = 'wd-fb ok'; el.querySelector('.wd-fb').textContent = `✓ ${z.jp}（${z.kana}）＝${z.zh}`;
              el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
              setTimeout(done, 900);
            });
          }, { tall: true });
        }
        finish();
      });
      m.text = () => '認出標示';
      run().then(() => { if (M === m) { M = null; X.paintBar(); } });
    },
    talk(m) {
      const d = m.def.dialog, s = m.shop;
      const run = X.flow(async () => {
        for (let i = 0; i < d.steps.length; i++) {
          const stp = d.steps[i], me = stp.speaker === '你', opts = App.shuffle(stp.choices);
          await X.step(`<p class="wd-goal">🎭 ${esc(d.title || '')}　${i + 1}/${d.steps.length}</p>
            ${me ? `<div class="wd-note">🙋 ${esc(stp.zh)}</div>` : X.bubble({ who: stp.speaker, emoji: stp.emoji }, stp)}
            <div class="wd-opts">${opts.map((o, j) => `<button type="button" class="wd-opt" data-i="${j}">${tx(o)}</button>`).join('')}</div><p class="wd-fb" role="status"></p>
            <div class="wd-acts"><button type="button" class="btn primary" id="wd-ok" hidden>繼續 ➜</button></div>`, (el, done) => {
            if (!me) { App.speak(stp.jp); X.bindSpk(el, stp); }
            const fb = el.querySelector('.wd-fb');
            el.querySelectorAll('.wd-opt').forEach(b => b.onclick = e => {
              if (e.target.closest('.wd-peek')) return;
              const o = opts[+b.dataset.i];
              fb.className = 'wd-fb ' + (o.correct ? 'ok' : 'ng'); fb.textContent = (o.correct ? '✓ ' : '✗ ') + o.feedback;
              if (!o.correct) { b.disabled = true; b.classList.add('ng'); m.mistakes++; G.sfx('ng'); Tracker.add(item(stp.choices.find(c => c.correct), s.name, 'phrase'), true); return; }
              b.classList.add('ok'); G.sfx('ok'); G.bump('ok'); App.speak(o.jp);
              el.querySelectorAll('.wd-opt').forEach(x => { x.disabled = true; });
              el.querySelector('#wd-ok').hidden = false;
            });
            el.querySelector('#wd-ok').onclick = () => done();
          }, { tall: true });
        }
        finish();
      });
      m.text = () => '對話中';
      run().then(() => { if (M === m) { M = null; X.paintBar(); } });
    },
    event(m) { const p = X.PARAMS; M = null; App.go('event', { r: p.r, d: p.d, s: p.s }); }
  };
  Q.on = (e, d) => {
    if (R && e === 'place') return R.on(d);
    if (M && M.on) return M.on(e, d);
  };
  Q.checkBasket = async () => (M && M.check ? M.check() : true);
  Q.clerkExtra = k => (M && M.extra ? M.extra(k) : []);

  /* ---------------- 街區：聽指路走到目的地 ---------------- */
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROW = ['⬆️', '➡️', '⬇️', '⬅️'];
  function dirPath(d, from, goal) {   // 轉彎少的路徑；回傳每一步的方向（0 上 1 右 2 下 3 左）
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
        if (k !== R.target) { R.mistakes++; G.sfx('ng'); G.shake(); App.toast('✗ 不是這裡。點下面的任務列可以再聽一次'); return 'stop'; }
        const stars = R.mistakes === 0 ? 3 : R.mistakes <= 2 ? 2 : 1, tp = d.places[k];
        R = null; X.paintBar();
        const r = App.reward(`w:${d.id}:route@${lv()}`, stars, `${d.name}・問路`);
        const nm = tp.type === 'shop' ? (W.shops[tp.shop] || {}).name : tp.name;
        App.showResult({ title: `🧭 找到了：${nm}`, stars, gained: r.gained, ok: '繼續 ➜' });
        return 'stop';
      }
    };
    X.closeSheet(); X.paintBar();
  });
  Q.npcExtra = (k, p) => [['!route', '🧭', '聽指路走過去', '路人推薦一個地方，照他說的走', () => routeStart(k, p)]];

  /* =========================================================
     路由：event — 狀況題（沿用 data/travel*.js，每站每級 5 題、3 顆愛心）
     ========================================================= */
  const evObj = e => Array.isArray(e) ? { scene: e[0], prompt: e[1], translation: e[2], answers: e[3], explanation: e[4], reading: e[5] } : e;
  function renderEvent(el, params) {
    params = params || {};
    el.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>';
    Promise.all([World.loadRegion(params.r || 'tokyo'), World.loadEvents()]).then(() => {
      if (!el.isConnected) return;
      const shop = W.shops[params.s], stop = shop && (window.TravelData || { stops: [] }).stops.find(x => x.id === shop.scene);
      const events = stop && stop.events[lv()];
      if (!events) { App.toast('這間店沒有狀況題'); return App.back(); }
      let at = 0, correct = 0, hearts = 3, combo = 0; const wrong = [];
      const hud = () => `<span class="ev-h">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="ev-c">🔥${combo}</span>` : ''}`;
      const finishEv = () => {
        const n = events.length, stars = hearts <= 0 ? 0 : correct === n ? 3 : correct >= n - 1 ? 2 : correct * 2 >= n ? 1 : 0;
        const r = stars ? App.reward(key(shop, 'ev'), stars, `${shop.name}・狀況題`) : { gained: 0 };
        const stamp = stars ? checkStamp(shop) : '';
        el.innerHTML = `<section class="ev"><div class="panel center"><h2>${stars ? '狀況題通過！' : hearts <= 0 ? '💔 愛心用完了' : '再挑戰一次'}</h2><p>${correct}／${n} 題答對</p></div></section>`;
        App.showResult({ title: stars ? `⚡ ${shop.name}・狀況題 通過！` : hearts <= 0 ? '💔 愛心用完了' : '再試一次', stars, correct, total: n, gained: r.gained, wrong, note: stamp, retry: () => renderEvent(el, params), back: { label: '回店裡 ➜' } });
      };
      const show = () => {
        const q = evObj(events[at]), choices = App.shuffle(q.answers);
        const it = App.wordItem({ jp: q.answers[0], zh: q.scene, hint: q.explanation }, shop.name, 'phrase');
        el.innerHTML = `<section class="ev">
          <div class="ev-top"><b>${esc(shop.icon)} ${esc(shop.name)}・${lv()} 狀況題</b><span>${at + 1}／${events.length}</span><span id="ev-hud">${hud()}</span></div>
          <div class="panel"><p class="ev-scene">${esc(q.scene)}</p>
            <div class="wd-npc"><span class="wd-face">${esc((X.staff && shop.zones[Object.keys(shop.zones).find(k => shop.zones[k].npc)] || {}).npc ? shop.zones[Object.keys(shop.zones).find(k => shop.zones[k].npc)].npc.emoji : '🧑')}</span><div class="wd-bub"><small>${esc(stop.npc)}</small>${tx({ jp: q.prompt, kana: q.reading && q.reading !== q.prompt ? q.reading : '', zh: q.translation })}<button type="button" class="wd-spk" id="ev-spk" aria-label="再聽一次">🔊</button></div></div></div>
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
          else { hearts = Math.max(0, hearts - 1); combo = 0; b.classList.add('ng'); G.sfx('hurt'); G.shake(); Tracker.add(it, true); wrong.push(it); }
          el.querySelector('#ev-hud').innerHTML = hud();
          fb.hidden = false; fb.className = 'ev-fb ' + (right ? 'ok' : 'ng');
          fb.innerHTML = `<b>${right ? '✓ 回應正確' : '✗ 這樣回應更合適'}</b><p class="jp" lang="ja">${esc(q.answers[0])}</p><p>${esc(q.explanation)}</p>${App.trackBtn(it, true)}`;
          next.hidden = false; next.textContent = hearts <= 0 ? '💔 愛心用完，結束' : at + 1 === events.length ? '看結果 ➜' : '下一題 ➜';
          next.scrollIntoView({ block: 'nearest' });
        });
        next.onclick = () => { if (hearts > 0 && ++at < events.length) show(); else finishEv(); };
      };
      show();
    }).catch(e => { console.error(e); el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗</p>'; });
  }
  App.register('event', { title: '狀況題', icon: '⚡', nav: false, navParent: 'home', render: renderEvent });

  /* =========================================================
     日本地圖（首頁用）、御朱印帳、摘要
     ========================================================= */
  const stampCount = () => Object.keys(st().stamps).length;
  const regionStamps = id => Object.values(st().stamps).filter(s => s.r === id).length;
  function japan(el) {
    const n = stampCount();
    el.innerHTML = `<div class="jp-map"><svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <path class="land" d="M70 6c6-2 13 1 17 6 3 4 1 9-4 11-3 1-5 4-9 4-5 0-8-3-9-7-1-5 0-11 5-14z"/>
        <path class="land" d="M72 30c4 2 5 8 4 14-1 7-3 13-8 17-4 3-9 3-13 4-5 1-8 5-13 6-5 2-10 5-15 5-3 0-5-2-4-5 2-4 8-4 12-7 6-4 12-7 17-12 5-6 9-13 12-21 1-3 5-3 8-1z"/>
        <path class="land" d="M35 79c4-2 9-2 12 1 1 3-2 5-5 6-4 1-8 0-9-3 0-2 0-3 2-4z"/>
        <path class="land" d="M21 76c4-1 8 1 9 5 1 4 0 9-4 11-4 2-8-1-9-5-1-4 0-9 4-11z"/>
        <path class="land" d="M10 91c2-1 4 0 4 2s-2 3-4 3-2-4 0-5zM4 96c1-1 3 0 2 2-1 1-3 0-2-2z"/>
        <path class="rail" d="M12 92 L24 86 L33 80 L50 68 L66 59 L76 17"/>
      </svg>
      ${W.regions.map(r => { const lock = n < r.need, got = regionStamps(r.id); return `<button type="button" class="jp-node${lock ? ' lock' : ''}${(st().at || {}).r === r.id ? ' here' : ''}" style="left:${r.x}%;top:${r.y}%" data-r="${r.id}"><span>${lock ? '🔒' : r.icon}</span><b>${esc(r.name)}</b><small>${lock ? `⛩️ ${n}/${r.need}` : got ? `⛩️ ${got}` : '出發'}</small></button>`; }).join('')}</div>`;
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      const r = World.regionOf(b.dataset.r);
      if (n < r.need) return App.toast(`🔒 ${r.name}：再蓋 ${r.need - n} 個御朱印就開放（${r.desc}）`);
      App.go('play', { r: r.id, d: st().last[r.id] || undefined });
    });
  }
  function goshuin() {
    const w = st(), n = stampCount();
    App.modal(`<h2>⛩️ 御朱印帳</h2><p class="muted">在一間店完成 5 個委託就能蓋印，還會掉落頭像。蓋越多，開放越多地區。</p>
      ${W.regions.map(r => { const list = Object.values(w.stamps).filter(s => s.r === r.id); return `<p class="gs-r"><b>${r.icon} ${esc(r.name)}</b>${n < r.need ? `　🔒 需要 ${r.need} 個印` : `　${list.length} 個`}</p><div class="tg-grid">${list.map(s => `<div class="tg-cell ok"><span>${esc(s.i)}</span><small>${esc(s.n)}</small></div>`).join('') || '<div class="tg-cell"><span>？</span><small>還沒有</small></div>'}</div>`; }).join('')}
      <p class="center">共 <b>${n}</b> 個</p>`, [{ label: '🎭 換頭像', onClick: () => window.Game && Game.pickAvatar(() => App.render()) }, { label: '關閉', cls: 'primary' }]);
  }
  /* ---------------- 首頁：日本地圖＋繼續＋程度＋每日任務＋複習＋御朱印＋手冊／特訓 ---------------- */
  function home(el) {
    const w = st(), at = w.at, GM = window.Game, d = GM ? GM.daily() : null, due = Tracker.dueCount(), sk = App.streakInfo();
    const logo = (document.querySelector('#top .logo .lg') || {}).innerHTML || '';
    const L = W.LEVELS.find(l => l.id === lv());
    el.innerHTML = `<section class="jp-home">
      <div class="jp-head"><span class="lg">${logo}</span><div><h1>日語冒險</h1><p>走進日本的店，開口說日文</p></div><span class="sp"></span>
        <button type="button" class="jp-chip lv" id="jp-lv" title="切換程度">${lv()}・${esc(L.label)}</button></div>
      ${sk.risk ? `<p class="jp-risk">🔥 已連續 ${sk.days} 天！今天還沒練，練一題就能保住</p>` : ''}
      ${at && at.d ? `<button type="button" class="jp-cont" id="jp-cont"><span>▶</span><span>繼續冒險<small>${esc(at.label || '')}</small></span></button>` : `<button type="button" class="jp-cont" id="jp-cont"><span>▶</span><span>開始冒險<small>🗼 東京・成田機場出發</small></span></button>`}
      <div id="jp-mapbox"></div>
      ${d ? `<div class="h-daily tt-daily">${GM.DAILY.map(m => { const v = Math.min(m.goal, d[m.id] || 0); return `<div class="${d.claimed[m.id] ? 'ok' : ''}"><span>${d.claimed[m.id] ? '✅' : m.icon}</span><small>${esc(m.label)}</small><i style="width:${v / m.goal * 100}%"></i></div>`; }).join('')}</div>` : ''}
      <div class="jp-grid">
        <button type="button" class="jp-tile" id="jp-rev">📌 今日複習<small>${due ? `${due} 個字該複習了` : Tracker.count() ? '今天的都複習完了 👍' : '答錯的字會自動收進來'}</small></button>
        <button type="button" class="jp-tile" id="jp-gs">⛩️ 御朱印帳<small>已蓋 ${stampCount()} 個・每店完成 5 個委託</small></button>
        <button type="button" class="jp-tile" id="jp-book">📖 會話手冊<small>可放大給店員看</small></button>
        <button type="button" class="jp-tile" id="jp-drill">🎧 實戰特訓<small>問句・看板・數字</small></button>
        <button type="button" class="jp-tile" id="jp-kana">🔰 五十音入門<small>完全沒學過從這裡</small></button>
        <button type="button" class="jp-tile" id="jp-set">⚙️ 設定<small>音效・備份・頭像</small></button>
      </div></section>`;
    japan(el.querySelector('#jp-mapbox'));
    const q = id => el.querySelector(id);
    q('#jp-lv').onclick = () => World.pickLevel();
    q('#jp-cont').onclick = () => (at && at.d ? App.go('play', { r: at.r, d: at.d, s: at.s || undefined }) : App.go('play', { r: 'tokyo' }));
    q('#jp-rev').onclick = () => App.go('review');
    q('#jp-gs').onclick = goshuin;
    q('#jp-book').onclick = () => App.go('phrasebook');
    q('#jp-drill').onclick = () => App.go('boot');
    q('#jp-kana').onclick = () => {
      const k = ((window.TravelData || {}).levels || []).find(l => l.kana);
      if (k) { App.state.trip = Object.assign({ runs: {} }, App.state.trip, { level: k.id }); App.save(); }
      App.go('trip');
    };
    q('#jp-set').onclick = () => window.Travel && Travel.openSettings();
  }
  Object.assign(World, { japan, goshuin, home, stampCount, missionsOf, progress });
  App.addUnlock(() => []);
})();
