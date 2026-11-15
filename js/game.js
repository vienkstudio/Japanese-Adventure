/* =========================================================
   日語冒險 — 遊戲感模組 game.js
   音效（WebAudio 合成，免音檔）、震動、特效、每日任務、角色頭像
   透過觀察 DOM 自動套用到所有模組：.choice.ok/.ng、結果彈窗、升級、XP 提示
   ========================================================= */
(function () {
  const SFX_KEY = 'jpQuest.sfx';
  let sfxOn = App.store.get(SFX_KEY) !== '0';
  let ctx = null;
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t0, dur, type, vol, f2) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const st = a.currentTime + t0;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, st);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, st + dur);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, st + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    o.connect(g); g.connect(a.destination);
    o.start(st); o.stop(st + dur + 0.02);
  }
  const SFX = {
    tap: () => tone(700, 0, 0.04, 'sine', 0.04),
    ok: () => { tone(660, 0, 0.09, 'triangle', 0.16); tone(990, 0.08, 0.16, 'triangle', 0.16); },
    ng: () => { tone(220, 0, 0.25, 'sawtooth', 0.09, 110); },
    coin: () => { tone(988, 0, 0.07, 'square', 0.05); tone(1319, 0.07, 0.2, 'square', 0.05); },
    hit: () => { tone(320, 0, 0.12, 'square', 0.07, 60); },
    hurt: () => { tone(160, 0, 0.3, 'sawtooth', 0.1, 70); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.4 : 0.12, 'triangle', 0.15)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.15, 0.2, 'triangle', 0.12)),
    lvup: () => [523, 587, 659, 784, 880, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.14, 'square', 0.06)),
    combo: () => { tone(880, 0, 0.06, 'square', 0.05); tone(1175, 0.06, 0.06, 'square', 0.05); tone(1568, 0.12, 0.12, 'square', 0.05); }
  };
  function sfx(name) { if (!sfxOn) return; try { SFX[name] && SFX[name](); } catch (e) { } }
  function vibrate(p) { if (sfxOn && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(p); } catch (e) { } }

  /* ---------------- 特效 ---------------- */
  let layer;
  function fx() { if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.className = 'fx-layer'; document.body.appendChild(layer); } return layer; }
  function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function floatText(el, text, ng) {
    const c = center(el), d = document.createElement('div');
    d.className = 'fx-float' + (ng ? ' ng' : ''); d.textContent = text;
    d.style.left = c.x + 'px'; d.style.top = (c.y - 20) + 'px';
    fx().appendChild(d); setTimeout(() => d.remove(), 950);
  }
  function burst(el, n) {
    const c = center(el), cols = ['#ffd54f', '#22b573', '#3a86ff', '#ff5a8a', '#8b5cf6'];
    for (let i = 0; i < (n || 14); i++) {
      const s = document.createElement('div'); s.className = 'fx-spark';
      const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 60;
      s.style.left = c.x + 'px'; s.style.top = c.y + 'px'; s.style.background = cols[i % cols.length];
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      fx().appendChild(s); setTimeout(() => s.remove(), 850);
    }
  }
  function confetti(n) {
    const cols = ['#ffd54f', '#22b573', '#3a86ff', '#ff5a8a', '#8b5cf6', '#ff9a3c'];
    for (let i = 0; i < (n || 60); i++) {
      const s = document.createElement('div'); s.className = 'fx-conf';
      s.style.left = Math.random() * 100 + 'vw'; s.style.background = cols[i % cols.length];
      s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's'; s.style.animationDelay = Math.random() * .4 + 's';
      fx().appendChild(s); setTimeout(() => s.remove(), 3500);
    }
  }
  function shake() {
    document.body.classList.remove('fx-shake', 'fx-flash'); void document.body.offsetWidth;
    document.body.classList.add('fx-shake', 'fx-flash');
    setTimeout(() => document.body.classList.remove('fx-shake', 'fx-flash'), 400);
  }
  // 飛行物（戰鬥用）：from 元素飛到 to 元素
  function fly(from, to, text, cb) {
    const a = center(from), b = center(to), d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${a.x}px;top:${a.y}px;font-size:2em;font-weight:900;transform:translate(-50%,-50%);transition:left .35s ease-in,top .35s ease-in,transform .35s;z-index:2;text-shadow:0 0 8px #fff`;
    d.textContent = text; fx().appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; d.style.transform = 'translate(-50%,-50%) scale(1.5) rotate(360deg)'; }));
    setTimeout(() => { d.remove(); cb && cb(); }, 380);
  }

  /* ---------------- 每日任務 ---------------- */
  const DAILY = [
    { id: 'ok', label: '答對 20 題', icon: '✅', goal: 20, xp: 20 },
    { id: 'quests', label: '完成 1 個關卡或任務', icon: '⚔️', goal: 1, xp: 25 },
    { id: 'review', label: '複習不會清單 5 次', icon: '📌', goal: 5, xp: 15 }
  ];
  function daily() {
    const S = App.state, today = new Date().toISOString().slice(0, 10);
    if (!S.daily || S.daily.date !== today) S.daily = { date: today, ok: 0, quests: 0, review: 0, claimed: {} };
    return S.daily;
  }
  function bump(key, n) {
    const d = daily(); d[key] = (d[key] || 0) + (n || 1);
    const m = DAILY.find(x => x.id === key);
    if (m && d[key] >= m.goal && !d.claimed[key]) {
      d.claimed[key] = true; App.save();
      setTimeout(() => { App.toast(`🎯 每日任務完成：${m.label}`, 'ok'); App.addXP(m.xp, '每日任務'); }, 900);
      if (DAILY.every(x => d.claimed[x.id])) setTimeout(() => { App.toast('🏆 今日任務全部完成！+30 XP', 'xp'); App.addXP(30, '全勤獎勵'); confetti(80); }, 2200);
    } else App.save();
  }

  /* ---------------- 頭像 ---------------- */
  const AVATARS = [['🧳', 1], ['🐱', 1], ['🐶', 1], ['🥷', 2], ['🧙', 3], ['🦊', 4], ['🐼', 5], ['🤖', 6], ['🧑‍🚀', 7], ['🐉', 8], ['🦄', 10], ['👑', 12]];
  function avatar() { return App.state.avatar || '🧳'; }
  function pickAvatar(cb) {
    const lv = App.level;
    const close = App.modal(`<h2>選擇你的角色</h2><p class="muted">升級可以解鎖更多角色！</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${AVATARS.map(([e, l]) =>
        `<button class="btn g-av" data-e="${e}" ${lv < l ? 'disabled' : ''} style="font-size:2em;flex-direction:column;min-height:72px;${avatar() === e ? 'box-shadow:0 0 0 3px var(--purple)' : ''}">${e}<small style="font-size:.4em">${lv < l ? '🔒Lv.' + l : 'Lv.' + l}</small></button>`).join('')}</div>`,
      [{ label: '關閉' }]);
    document.querySelectorAll('.g-av').forEach(b => b.onclick = () => { App.state.avatar = b.dataset.e; App.save(); sfx('coin'); close(); cb && cb(); });
  }

  /* ---------------- 自動套用：觀察 DOM ---------------- */
  function onChoices(okEls, ngEls) {
    if (ngEls.length) {
      sfx('ng'); vibrate([60, 40, 60]); shake();
      ngEls.forEach(e => floatText(e, '✗', true));
    } else if (okEls.length) {
      sfx('ok'); vibrate(15);
      okEls.forEach(e => { floatText(e, '+1 ✓'); burst(e, 12); });
      bump('ok');
    }
  }
  function onModal(m) {
    if (m.querySelector('.lvup')) { sfx('lvup'); vibrate([40, 40, 40, 40, 120]); confetti(100); return; }
    const r = m.querySelector('.result');
    if (r) {
      const st = (r.querySelector('.stars') || {}).textContent || '';
      const n = (st.match(/⭐/g) || []).length;
      if (n > 0) { setTimeout(() => sfx('win'), 100); vibrate([30, 50, 30]); confetti(30 + n * 20); }
      else { sfx('lose'); vibrate(200); }
    }
  }
  const mo = new MutationObserver(list => {
    const ok = [], ng = [];
    list.forEach(m => {
      if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('choice')) {
        const was = m.oldValue || '';
        if (m.target.classList.contains('ng') && !/\bng\b/.test(was)) ng.push(m.target);
        else if (m.target.classList.contains('ok') && !/\bok\b/.test(was)) ok.push(m.target);
      }
      if (m.type === 'childList') m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.classList.contains('modal-bg')) onModal(n);
        else if (n.classList.contains('toast') && n.classList.contains('xp')) sfx('coin');
      });
    });
    if (ok.length || ng.length) onChoices(ok, ng);
  });
  function observe() {
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true, childList: true });
  }
  if (document.body) observe(); else document.addEventListener('DOMContentLoaded', observe);

  // 點擊音
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest && e.target.closest('.btn,.card.click,#nav a,.tabs button,.track-btn,.icon-btn');
    if (t && !t.disabled) sfx('tap');
  }, { passive: true });

  // 包裝：關卡完成、複習計數
  const _cq = App.completeQuest;
  App.completeQuest = function (id, stars, xp) { const r = _cq.apply(this, arguments); if (stars > 0) bump('quests'); return r; };
  const _mark = Tracker.mark.bind(Tracker);
  Tracker.mark = function (id, ok) { const r = _mark(id, ok); bump('review'); return r; };

  window.Game = {
    sfx, vibrate, floatText, burst, confetti, shake, fly,
    sfxOn: () => sfxOn,
    toggleSfx() { sfxOn = !sfxOn; App.store.set(SFX_KEY, sfxOn ? '1' : '0'); if (sfxOn) sfx('coin'); },
    DAILY, daily, avatar, pickAvatar, AVATARS
  };
})();
