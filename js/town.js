/* =========================================================
   日語冒險 — 場景互動 town.js
   路由：town（日本街道）、scene（場景：單字/常用句/對話演練/小測驗/任務模式）
   ========================================================= */
(function () {
  'use strict';
  if (!window.App) return;
  const esc = App.esc;

  /* ---------------- 樣式 ---------------- */
  (function css() {
    if (document.getElementById('css-town')) return;
    const st = document.createElement('style');
    st.id = 'css-town';
    st.textContent = `
.t-head{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.t-head .t-icon{font-size:2.4em;line-height:1;width:64px;height:64px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;flex:none}
.t-head .t-info{flex:1;min-width:180px}
.t-head h2{margin:0}
.t-mission{background:var(--ai);color:#fff;border:none;border-radius:18px;padding:10px 14px;font-weight:bold;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}
.t-mission .bar{flex:1;min-width:120px}
.t-tips summary{cursor:pointer;font-weight:bold}
.t-tips ul{margin:8px 0 0;padding-left:1.3em}
.t-words{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.t-word{cursor:pointer}
.t-word .t-emo{font-size:1.9em;line-height:1}
.t-word .t-lv{position:absolute;top:8px;right:8px}
.t-word .t-jp{font-size:1.5em;font-weight:bold;margin:4px 0 2px;word-break:break-all}
.t-word .t-kana{color:var(--ai2)}
.t-word .t-rom{color:var(--muted);font-size:.86em}
.t-word .t-zh{font-size:1.05em;margin:2px 0}
.t-word .t-hint{font-size:.83em;color:var(--pri-d);background:var(--pri-t);border-radius:999px;padding:1px 7px;display:inline-block}
.t-word .t-use{font-size:.85em;margin-top:4px}
.t-word .track-btn{margin-top:8px}
.t-phr .t-jp{font-size:1.3em}
.t-dlist{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
.t-dbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
.t-sw{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.t-aidsw{cursor:pointer;user-select:none;font-size:.85em;border:none;border-radius:999px;padding:4px 12px;background:var(--card);box-shadow:var(--shadow);display:inline-flex;align-items:center;gap:4px}
.t-chat{background:var(--card);border:none;border-radius:18px;padding:12px;min-height:80px;max-height:56vh;overflow:auto}
.t-chat .bubble .j{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.t-aid{font-size:.86em;color:var(--muted)}
.t-noaid .t-aid{display:none}
.t-listen .bubble.npc:not(.rev) .j span,.t-listen .bubble.npc:not(.rev) .t-aid{filter:blur(7px);user-select:none}
.t-listen .bubble.npc:not(.rev)::after{content:"👆 點一下顯示文字";display:block;font-size:.75em;color:var(--shu)}
.t-opts{grid-template-columns:1fr!important;max-width:600px}
.t-opts .choice{font-size:1.08em;text-align:left;padding:10px 14px}
.t-opts .choice .t-aid{display:block}
.t-opts .choice.ok .t-aid,.t-opts .choice.ng .t-aid{color:#fff}
.t-mic{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:6px 0}
.t-micbtn{width:64px;height:64px;border-radius:50%;font-size:1.8em;border:1px solid var(--line);background:var(--pri);color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(255,107,91,.35)}
.t-micbtn.on{animation:tmic 1s infinite}
.t-micbtn:disabled{background:var(--chip);cursor:not-allowed}
.t-showopt{display:block;margin:6px auto}
.t-heard{font-size:.9em;min-height:1.3em;text-align:center}
@keyframes tmic{0%{box-shadow:0 0 0 0 rgba(255,107,91,.6)}100%{box-shadow:0 0 0 16px rgba(255,107,91,0)}}
.t-fb-ok{color:var(--acc-d);font-weight:bold}
.t-fb-ng{color:var(--shu);font-weight:bold}
.t-sum{text-align:center}
.t-sum .t-big{font-size:2.2em}
.t-quiz .q-mid{word-break:break-all}
.t-quiz .choice{font-size:1.08em}
.t-err{text-align:center}
.t-err .t-big{font-size:3.5em}
@media(max-width:640px){
  .t-words{grid-template-columns:1fr 1fr}
  .t-word .t-jp{font-size:1.25em}
  .t-head .t-icon{font-size:2.5em}
  .bubble{max-width:92%}
  }
@media(max-width:400px){.t-words{grid-template-columns:1fr}}
`;
    document.head.appendChild(st);
  })();

  /* ---------------- 共用 ---------------- */
  const scenes = () => (Array.isArray(window.SCENES) ? window.SCENES.filter(s => s && s.id) : []);
  const findScene = id => scenes().find(s => s.id === id) || null;
  const unlocked = s => (s.unlockLevel || 1) <= App.level;
  const isDone = id => !!(App.state.sceneDone && App.state.sceneDone[id]);
  const arr = a => (Array.isArray(a) ? a : []);
  let aidOn = true;                 // 初學者模式：顯示讀音/中文
  const tabMem = {};                // 每個場景記住目前分頁
  let listenOn = false;             // 聽力挑戰：對方的話先模糊
  let micOn = false;                // 口說模式：預設用說的回答

  /* ---------------- JLPT 分級 ---------------- */
  const lvOf = (jp, kind) => (window.CARDS ? CARDS.levelOf(jp, kind) : 'x');
  const lvCls = lv => (lv || 'x').toLowerCase();
  const lvBadge = lv => (window.CARDS ? CARDS.badge(lv) : '');

  /* ---------------- 語音辨識（口述回答） ---------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const normJP = s => toHira(s).replace(/[\s、。，,．.！!？?「」『』（）()・〜~ー-]/g, '').toLowerCase();
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let p = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[n];
  }
  const simil = (a, b) => { a = normJP(a); b = normJP(b); if (!a || !b) return 0; return 1 - lev(a, b) / Math.max(a.length, b.length); };
  // 聽一句日文：cb(alternatives[])、err(code)
  let srBlocked = false;              // 環境不允許語音辨識（權限被拒、沙盒）→ 之後一律改點選
  const srOK = () => !!SR && !srBlocked;
  const BLOCK = ['not-allowed', 'service-not-allowed', 'blocked'];
  function listenJP(cb, err0) {
    const err = c => { if (BLOCK.includes(c)) srBlocked = true; err0(c); };
    if (!srOK()) { err(SR ? 'blocked' : 'unsupported'); return null; }
    let r;
    try {
      r = new SR(); r.lang = 'ja-JP'; r.interimResults = false; r.maxAlternatives = 5;
      let got = false;
      r.onresult = e => { got = true; cb(Array.from(e.results[0]).map(a => a.transcript)); };
      r.onerror = e => { got = true; err(e.error || 'error'); };
      r.onend = () => { if (!got) err('no-speech'); };
      r.start();
    } catch (e) { err('blocked'); return null; }
    return r;
  }
  const micErr = c => ({ 'not-allowed': '麥克風權限被拒絕（或此網站環境不允許），請改用點選作答', 'service-not-allowed': '此環境不允許語音辨識，請改用點選作答', unsupported: '這個瀏覽器不支援語音辨識（建議用 Chrome／Android 或 Safari），請改用點選', 'no-speech': '沒聽到聲音，再按一次 🎤 說說看', blocked: '無法啟動麥克風，請改用點選作答', 'audio-capture': '找不到麥克風' }[c] || ('語音辨識失敗（' + c + '），請改用點選'));
  // 從選項中找最接近說出來的句子
  function bestMatch(alts, cs) {
    let best = null, score = 0;
    alts.forEach(t => cs.forEach(c => { const v = Math.max(simil(t, c.jp), simil(t, c.kana || c.jp)); if (v > score) { score = v; best = c; } }));
    return { best, score };
  }

  // 「＋不會清單」按鈕改用 core 的共用 App.trackBtn（點擊由 core 統一處理）
  const bindTrack = () => { };
  function errorView(el, title, msg) {
    el.innerHTML = `<div class="panel t-err"><div class="t-big">🧭</div><h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p>
      <button class="btn primary" id="tBack">🏙️ 返回日本街道</button></div>`;
    el.querySelector('#tBack').onclick = () => App.go('town');
  }
  function starsOf(ratio) { return ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0; }

  /* ---------------- 路由：town ---------------- */
  App.register('town', {
    title: '日本街道', icon: '🏙️', nav: false,
    render() { setTimeout(() => App.go('practice-map'), 0); }
  });

  /* ---------------- 路由：scene ---------------- */
  App.register('scene', {
    title: '場景', icon: '🏠', nav: false,
    render(el, params) {
      params = params || {};
      const sc = findScene(params.id);
      if (!sc) return errorView(el, '找不到這個場景', params.id ? `場景「${params.id}」不存在或資料尚未載入。` : '沒有指定場景。');
      const mission = params.mission || '';
      if (!mission && !params.free && !unlocked(sc)) {
        el.innerHTML = `<div class="panel t-err"><div class="t-big">🔒</div><h2>${esc(sc.icon || '')} ${esc(sc.name)} 尚未解鎖</h2>
          <p>需要 <b>Lv.${sc.unlockLevel || 1}</b>，你目前是 Lv.${App.level}。</p><p class="muted">到冒險地圖完成任務累積經驗值就能解鎖！</p>
          <button class="btn" id="tBack">🏙️ 返回日本街道</button><button class="btn primary" id="tMap">🗺️ 冒險地圖</button></div>`;
        el.querySelector('#tBack').onclick = () => App.go('town');
        el.querySelector('#tMap').onclick = () => App.go('practice-map');
        return;
      }
      const tips = arr(sc.tips);
      el.innerHTML = `
        <div class="panel t-head" style="--tc:${esc(sc.color || '#ccc')}">
          <div class="t-icon">${esc(sc.icon || '🏠')}</div>
          <div class="t-info"><h2>${esc(sc.name)}</h2><div class="muted">${esc(sc.desc || '')}</div></div>
          <button class="btn sm ghost" id="tBack">${mission ? '🗺️ 冒險地圖' : '🏙️ 返回街道'}</button>
        </div>
        ${tips.length ? `<div class="panel t-tips"><details${mission ? '' : ' open'}><summary>🎌 文化小知識（${tips.length}）</summary><ul>${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details></div>` : ''}
        <div id="tBody"></div>`;
      el.querySelector('#tBack').onclick = () => (mission ? App.go('practice-map') : App.go('stage', { id: sc.id }));
      const body = el.querySelector('#tBody');
      if (mission) return missionMode(body, sc, mission);

      const TABS = [['vocab', '📚 單字'], ['phrase', '💬 常用句'], ['dialog', '🎭 對話演練'], ['quiz', '⚡ 小測驗']].concat((window.MENUS || {})[sc.id] ? [['menu', '🗺️ 情境關卡']] : []);
      body.innerHTML = `<div class="tabs t-tabs">${TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('')}</div><div class="panel" id="tPane"></div>`;
      const pane = body.querySelector('#tPane');
      const show = k => {
        tabMem[sc.id] = k;
        body.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === k));
        if (window.speechSynthesis) speechSynthesis.cancel();
        ({ vocab: () => wordsView(pane, sc, 'word'), phrase: () => wordsView(pane, sc, 'phrase'), dialog: () => dialogMenu(pane, sc), quiz: () => quizIntro(pane, sc), menu: () => { tabMem[sc.id] = 'vocab'; App.go('stage', { id: sc.id }); } })[k]();
      };
      body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => show(b.dataset.t));
      show(params.tab || tabMem[sc.id] || 'vocab');
    }
  });

  /* ---------------- 單字 / 常用句 ---------------- */
  function wordsView(pane, sc, kind) {
    const list = arr(kind === 'word' ? sc.vocab : sc.phrases);
    if (!list.length) { pane.innerHTML = '<p class="muted center">這個場景還沒有資料。</p>'; return; }
    const items = {};
    pane.innerHTML = `<p class="muted" style="margin-top:0">👆 點卡片聽發音・底線顏色＝JLPT 參考分級</p>
      <div class="lv-legend" style="margin-bottom:8px">${['N5', 'N4', 'N3', 'N2', 'N1', 'x'].map(lvBadge).join('')}</div>
      <div class="t-words${kind === 'phrase' ? ' t-phr' : ''}">${list.map((w, i) => {
        const it = App.wordItem(w, sc.name, kind); items[it.id] = it;
        const lv = lvOf(w.jp, kind);
        return `<div class="card t-word" data-i="${i}">
          <span class="t-lv">${lvBadge(lv)}</span>
          ${w.emoji ? `<div class="t-emo">${esc(w.emoji)}</div>` : ''}
          <div class="t-jp jp"><span class="lv-u ${lvCls(lv)}">${esc(w.jp)}</span> <span style="font-size:.6em">🔊</span></div>
          ${w.kana && w.kana !== w.jp ? `<div class="t-kana jp">${esc(w.kana)}</div>` : ''}
          ${w.romaji ? `<div class="t-rom">${esc(w.romaji)}</div>` : ''}
          <div class="t-zh">${esc(w.zh || '')}</div>
          ${w.hint ? `<div class="t-hint">${esc(w.hint)}</div>` : ''}
          ${kind === 'phrase' && w.use ? `<div class="t-use">🕒 <b>使用時機：</b>${esc(w.use)}</div>` : ''}
          <div>${App.trackBtn(it)}</div></div>`;
      }).join('')}</div>`;
    pane.querySelectorAll('.t-word').forEach(c => c.onclick = () => { const w = list[+c.dataset.i]; App.speak(w.kana || w.jp); });
    bindTrack(pane, items);
  }

  /* ---------------- 對話演練 ---------------- */
  function dialogMenu(pane, sc) {
    const ds = arr(sc.dialogues);
    if (!ds.length) { pane.innerHTML = '<p class="muted center">這個場景還沒有對話。</p>'; return; }
    pane.innerHTML = `<p style="margin-top:0">選一段對話開始演練：店員/路人會先說話，你從選項中挑出適合的回答。</p>
      <div class="t-dlist">${ds.map((d, i) => `<div class="card click" data-d="${i}"><div class="icon">🎭</div><b>${esc(d.title || '對話 ' + (i + 1))}</b>
        <div class="muted">${arr(d.steps).length} 步</div></div>`).join('')}</div>`;
    pane.querySelectorAll('[data-d]').forEach(c => c.onclick = () => practice(pane, sc, +c.dataset.d));
  }

  function practice(pane, sc, di) {
    const d = arr(sc.dialogues)[di];
    pane.innerHTML = `<div class="t-dbar"><h3 style="margin:0">🎭 ${esc(d.title || '')}</h3><button class="btn sm ghost" id="tDl">↩ 選其他對話</button></div><div id="tRun"></div>`;
    pane.querySelector('#tDl').onclick = () => dialogMenu(pane, sc);
    runDialogue(pane.querySelector('#tRun'), sc, d, res => {
      const box = document.createElement('div');
      box.className = 't-sum';
      const pct = res.total ? Math.round(res.first / res.total * 100) : 100;
      const rw = App.reward('scene-dlg:' + sc.id + ':' + di, starsOf(pct / 100), '場景練習');
      box.innerHTML = `<div class="t-big">${pct >= 90 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div><h3>對話完成！</h3>
        <p>一次就選對 <b>${res.first}</b> / ${res.total} 步（${pct}%）</p>
        ${rw.gained ? `<p class="xpgain">+${rw.gained} XP${rw.prevStars && rw.gained <= 3 ? '<br><small class="muted">重玩沒刷新星數，只給 3 XP</small>' : ''}</p>` : ''}
        ${res.wrong.length ? `<div class="muted">選錯的句子已加入 📌不會清單：</div><div class="chips" style="justify-content:center">${res.wrong.map(w => `<span class="chip red jp">${esc(w.jp)} <small>${esc(w.zh)}</small></span>`).join('')}</div>` : ''}
        <button class="btn" id="tAgain">🔄 再練一次</button><button class="btn primary" id="tOther">選其他對話 ➜</button>`;
      pane.querySelector('#tRun').appendChild(box);
      box.querySelector('#tAgain').onclick = () => practice(pane, sc, di);
      box.querySelector('#tOther').onclick = () => dialogMenu(pane, sc);
      if (!App.state.sceneDone) App.state.sceneDone = {};
      App.state.sceneDone[sc.id] = true;
      App.save();
      box.scrollIntoView && box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /**
   * 執行一段對話。onDone({total, first, wrong:[trackerItem]})
   * opts.onStep(firstTryCorrect) 每步完成時呼叫（任務模式進度條用）
   */
  function runDialogue(host, sc, d, onDone, opts) {
    opts = opts || {};
    const steps = arr(d.steps);
    const res = { total: steps.length, first: 0, wrong: [] };
    if (opts.mic != null) micOn = !!opts.mic;
    host.innerHTML = `<div class="t-sw">
        <label class="t-aidsw"><input type="checkbox" class="t-aidcb"${aidOn ? ' checked' : ''}> 中文/讀音</label>
        <label class="t-aidsw"><input type="checkbox" class="t-lscb"${listenOn ? ' checked' : ''}> 🎧 聽力挑戰</label>
        ${srOK() && !opts.shadow ? `<label class="t-aidsw t-micsw"><input type="checkbox" class="t-miccb"${micOn ? ' checked' : ''}> 🎤 用說的回答</label>` : ''}</div>
      <div class="chat t-chat${aidOn ? '' : ' t-noaid'}${listenOn ? ' t-listen' : ''}"></div>
      <div class="t-ask${aidOn ? '' : ' t-noaid'}"><div class="t-micbox"></div><div class="choices t-opts"></div><div class="feedback"></div><div class="center t-nx"></div></div>`;
    const chat = host.querySelector('.t-chat'), ask = host.querySelector('.t-ask');
    const opBox = host.querySelector('.t-opts'), fb = host.querySelector('.feedback'), nx = host.querySelector('.t-nx'), micBox = host.querySelector('.t-micbox');
    host.querySelector('.t-aidcb').onchange = e => {
      aidOn = e.target.checked;
      chat.classList.toggle('t-noaid', !aidOn); ask.classList.toggle('t-noaid', !aidOn);
    };
    host.querySelector('.t-lscb').onchange = e => { listenOn = e.target.checked; chat.classList.toggle('t-listen', listenOn); };
    let curMic = null;
    const mcb = host.querySelector('.t-miccb');
    if (mcb) mcb.onchange = e => { micOn = e.target.checked; if (curMic) curMic(); };
    const hideMic = () => { const sw = host.querySelector('.t-micsw'); if (sw) sw.remove(); micBox.innerHTML = ''; curMic = null; };
    const scroll = () => { chat.scrollTop = chat.scrollHeight; };
    const bubble = (cls, who, jp, kana, romaji, zh) => {
      const b = document.createElement('div');
      b.className = 'bubble ' + cls;
      b.innerHTML = `<div class="who">${esc(who)}</div>
        <div class="j jp"><span>${esc(jp)}</span><button class="speak" title="播放">🔊</button></div>
        ${kana && kana !== jp ? `<div class="t-aid jp">${esc(kana)}</div>` : ''}
        ${romaji ? `<div class="t-aid">${esc(romaji)}</div>` : ''}
        ${zh ? `<div class="t-aid">🀄 ${esc(zh)}</div>` : ''}`;
      b.querySelector('.speak').onclick = e => { e.stopPropagation(); App.speak(kana || jp); };
      if (cls === 'npc') b.onclick = () => b.classList.add('rev');
      chat.appendChild(b); scroll();
      return b;
    };

    function step(i) {
      opBox.innerHTML = ''; fb.innerHTML = ''; nx.innerHTML = ''; micBox.innerHTML = ''; curMic = null;
      chat.querySelectorAll('.bubble.npc').forEach(b => b.classList.add('rev'));
      if (i >= steps.length) { ask.style.display = 'none'; onDone(res); return; }
      const s = steps[i];
      bubble('npc', `${s.emoji || '🙂'} ${s.speaker || '對方'}`, s.jp, s.kana, s.romaji, s.zh);
      App.speak(s.kana || s.jp);
      const cs = arr(s.choices);
      const hasCorrect = cs.some(c => c.correct);
      const isOK = c => hasCorrect ? !!c.correct : true;
      const nextBtn = () => {
        nx.innerHTML = `<button class="btn primary">${i + 1 >= steps.length ? '完成 🎉' : '繼續 ➜'}</button>`;
        const nb = nx.querySelector('button');
        nb.onclick = () => step(i + 1);
        // 捲到畫面中間，不要停在底部導覽列後面（點到導覽會跳回首頁）
        setTimeout(() => { if (nb.isConnected && nb.scrollIntoView) nb.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
      };
      if (!cs.length) { res.first++; opts.onStep && opts.onStep(true); nextBtn(); return; }
      let missed = false, finished = false;
      App.shuffle(cs).forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.innerHTML = `<span class="jp">${esc(c.jp)}</span>${c.kana && c.kana !== c.jp ? `<span class="t-aid jp">${esc(c.kana)}</span>` : ''}${c.zh ? `<span class="t-aid">${esc(c.zh)}</span>` : ''}`;
        btn.onclick = () => {
          if (finished || btn.disabled) return;
          if (isOK(c)) {
            finished = true;
            btn.classList.add('ok');
            opBox.querySelectorAll('.choice').forEach(x => x.disabled = true);
            fb.innerHTML = `<span class="t-fb-ok">⭕ ${missed ? '答對了！' : '太棒了，一次就對！'}</span> ${esc(c.feedback || '')}`;
            bubble('me', '🧳 我', c.jp, c.kana, c.romaji, c.zh);
            App.speak(c.kana || c.jp);
            if (!missed) res.first++;
            opts.onStep && opts.onStep(!missed);
            nextBtn();
          } else {
            btn.classList.add('ng'); btn.disabled = true;
            fb.innerHTML = `<span class="t-fb-ng">❌ 不太對</span> ${esc(c.feedback || '')} <span class="muted">再選一次吧！</span>`;
            if (!missed) {
              missed = true;
              const r = cs.find(isOK);
              const it = App.wordItem({ jp: r.jp, kana: r.kana, romaji: r.romaji, zh: r.zh, hint: `情境：${s.speaker || '對方'}說「${s.zh || s.jp}」時這樣回` }, sc.name, 'phrase');
              Tracker.add(it, true);
              if (!res.wrong.some(w => w.id === it.id)) res.wrong.push(it);
            }
          }
        };
        opBox.appendChild(btn);
        c._btn = btn;
      });
      // 口說：說出其中一個選項，辨識後自動選取
      const drawMic = () => {
        if (opts.shadow) {
          const r = cs.find(isOK); if (!r) return;
          const play = () => App.speak(r.kana || r.jp);
          micBox.innerHTML = `<div class="t-mic"><button class="t-micbtn" title="再聽一次正確說法">🔁</button>
            <div style="text-align:left;font-size:.88em">🔁 跟讀：先聽正確說法、跟著唸一次<br><span class="muted">再點選剛剛聽到的那一句</span></div></div>`;
          micBox.querySelector('.t-micbtn').onclick = play;
          setTimeout(() => { if (host.isConnected && !finished) play(); }, 900 + String(s.kana || s.jp).length * 140);
          return;
        }
        if (!micOn || !srOK()) { micBox.innerHTML = ''; opBox.style.display = ''; return; }
        micBox.innerHTML = `<div class="t-mic"><button class="t-micbtn" title="按下後用日文說出回答">🎤</button>
          <div style="text-align:left;font-size:.88em">按 🎤 用日文回答<br><span class="muted">先自己想、自己說；想不出來再看選項</span></div></div><div class="t-heard muted"></div>
          <button type="button" class="btn sm t-showopt">🙋 想不出來，看選項</button>`;
        // 口說：答案（選項）先藏起來，避免還沒開口就看到答案
        opBox.style.display = 'none';
        const showOpt = () => { opBox.style.display = ''; const so = micBox.querySelector('.t-showopt'); if (so) so.remove(); };
        micBox.querySelector('.t-showopt').onclick = showOpt;
        const mb = micBox.querySelector('.t-micbtn'), heard = micBox.querySelector('.t-heard');
        mb.onclick = () => {
          if (finished || mb.classList.contains('on')) return;
          mb.classList.add('on'); heard.textContent = '🎙️ 聆聽中…請說日文';
          listenJP(alts => {
            mb.classList.remove('on');
            const live = cs.filter(c => !c._btn.disabled);
            const { best, score } = bestMatch(alts, live);
            heard.innerHTML = `聽到：「<span class="jp">${esc(alts[0] || '')}</span>」${best ? `（相似度 ${Math.round(score * 100)}%）` : ''}`;
            if (best && score >= 0.5) { showOpt(); best._btn.click(); }
            else { showOpt(); heard.innerHTML += '<br><b style="color:var(--shu)">沒對上選項，再說一次或直接點選</b>'; }
          }, code => { mb.classList.remove('on'); showOpt(); if (!srOK()) { hideMic(); App.toast(micErr(code)); } else heard.textContent = micErr(code); });
        };
      };
      curMic = drawMic; drawMic();
    }
    step(0);
  }

  /* ---------------- 任務模式 ---------------- */
  function missionMode(body, sc, mission) {
    const ds = arr(sc.dialogues);
    const q = (window.QUESTS || []).find(x => x.id === mission);
    const total = ds.reduce((n, d) => n + arr(d.steps).length, 0);
    let doneSteps = 0, first = 0;
    const wrong = [];
    body.innerHTML = `<div class="t-mission">⚔️ 任務模式${q && q.title ? '：' + esc(q.title) : ''}
        <div class="bar"><div id="tMBar" style="width:0%"></div></div><span id="tMTxt">0/${total}</span></div>
      <div class="panel" id="tMPane"></div>`;
    const pane = body.querySelector('#tMPane'), bar = body.querySelector('#tMBar'), txt = body.querySelector('#tMTxt');
    if (!total) { pane.innerHTML = '<p class="muted center">這個場景還沒有對話資料，暫時無法進行任務。</p>'; return; }
    const onStep = () => { doneSteps++; bar.style.width = (doneSteps / total * 100) + '%'; txt.textContent = doneSteps + '/' + total; };

    function play(i) {
      while (i < ds.length && !arr(ds[i].steps).length) i++;
      if (i >= ds.length) return finish();
      const d = ds[i];
      pane.innerHTML = `<h3 style="margin-top:0">第 ${i + 1} / ${ds.length} 段：${esc(d.title || '')}</h3><div id="tRun"></div>`;
      runDialogue(pane.querySelector('#tRun'), sc, d, res => {
        first += res.first;
        res.wrong.forEach(w => { if (!wrong.some(x => x.id === w.id)) wrong.push(w); });
        const more = ds.slice(i + 1).some(x => arr(x.steps).length);
        const box = document.createElement('div');
        box.className = 't-sum';
        box.innerHTML = `<p>本段一次答對 <b>${res.first}</b> / ${res.total}</p><button class="btn primary">${more ? '下一段 ➜' : '查看結果 🏁'}</button>`;
        pane.querySelector('#tRun').appendChild(box);
        box.querySelector('button').onclick = () => play(i + 1);
      }, { onStep });
    }
    function finish() {
      const ratio = total ? first / total : 0;
      const stars = starsOf(ratio);
      const r = App.completeQuest(mission, stars, (q && q.xp) || 40);
      pane.innerHTML = `<div class="t-sum"><div class="t-big">${stars ? '🏆' : '💪'}</div><h3>${stars ? '任務完成！' : '任務失敗，再挑戰一次吧！'}</h3>
        <p>一次答對 ${first} / ${total}（${Math.round(ratio * 100)}%）</p>
        <button class="btn" id="tRe">🔄 重新挑戰</button><button class="btn primary" id="tMap">🗺️ 回冒險地圖</button></div>`;
      const retry = () => App.go('scene', { id: sc.id, mission });
      pane.querySelector('#tRe').onclick = retry;
      pane.querySelector('#tMap').onclick = () => App.go('practice-map');
      App.showResult({
        title: stars ? `任務完成！${sc.name}` : '任務失敗，再試一次！',
        stars, correct: first, total, gained: r && r.gained, wrong,
        retry, next: { label: '回冒險地圖', route: 'practice-map' }
      });
    }
    play(0);
  }

  /* ---------------- 小測驗 ---------------- */
  // 題庫：kinds = ['word','phrase']；每題記住來源場景名稱
  function poolOf(list, kinds) {
    kinds = kinds || ['word', 'phrase'];
    return list.flatMap(sc => [].concat(
      kinds.includes('word') ? arr(sc.vocab).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'word', s: sc.name })) : [],
      kinds.includes('phrase') ? arr(sc.phrases).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'phrase', s: sc.name })) : []));
  }
  const pool = sc => poolOf([sc]);
  function quizIntro(pane, sc) {
    const P = pool(sc);
    if (P.length < 2) { pane.innerHTML = '<p class="muted center">資料不足，無法出題。</p>'; return; }
    pane.innerHTML = `<div class="center"><div class="q-big">⚡</div><h3>${esc(sc.name)} 小測驗</h3>
      <p class="muted">從本場景的單字與常用句隨機出 ${Math.min(10, P.length)} 題：日→中、中→日、聽音選字。<br>答錯的會自動加入 📌不會清單。</p>
      <button class="btn primary" id="tGo">開始測驗 ➜</button></div>`;
    pane.querySelector('#tGo').onclick = () => quiz(pane, sc);
  }
  function quiz(pane, sc) {
    quizRun(pane, pool(sc), { count: 10, reason: '場景小測驗', id: 'scene-quiz:' + sc.id, onEnd: () => quizIntro(pane, sc), retry: () => quiz(pane, sc) });
  }
  // 通用測驗：P 題庫、opts {count, reason, onEnd, retry, back}
  function quizRun(pane, P, opts) {
    opts = opts || {};
    const qs = App.sample(P, Math.min(opts.count || 10, P.length)).map(p => {
      const type = App.sample(App.voiceOK && App.voiceOK() === false ? ['j2z', 'z2j'] : ['j2z', 'z2j', 'listen'], 1)[0];   // 沒有日文語音就不出聽音題
      const key = type === 'j2z' ? 'zh' : 'jp';
      const near = P.filter(o => o.kind === p.kind && o.s === p.s), far = P.filter(o => o.kind === p.kind);
      const uniq = [];
      [App.shuffle(near), App.shuffle(far), App.shuffle(P)].forEach(L => L.forEach(o => {
        if (uniq.length < 3 && o !== p && o.w[key] !== p.w[key] && !uniq.some(u => u.w[key] === o.w[key])) uniq.push(o);
      }));
      return { p, type, key, opts: App.shuffle([p].concat(uniq)) };
    });
    let i = 0, correct = 0;
    const wrong = [];
    const one = () => {
      if (i >= qs.length) return end();
      const Q = qs[i], w = Q.p.w;
      const it = App.wordItem(w, Q.p.s, Q.p.kind);
      const lv = lvOf(w.jp, Q.p.kind);
      const prompt = Q.type === 'j2z'
        ? `<div class="muted">這是什麼意思？ ${lvBadge(lv)}</div><div class="q-mid jp"><span class="lv-u ${lvCls(lv)}">${esc(w.jp)}</span></div>${w.kana && w.kana !== w.jp ? `<div class="jp muted">${esc(w.kana)}</div>` : ''}`
        : Q.type === 'z2j'
          ? `<div class="muted">日文怎麼說？ ${lvBadge(lv)}</div><div class="q-mid">${esc(w.emoji || '')} ${esc(w.zh)}</div>`
          : `<div class="muted">聽聽看，選出聽到的${Q.p.kind === 'phrase' ? '句子' : '字'} ${lvBadge(lv)}</div><div class="q-big"><button class="btn primary" id="tPlay" style="font-size:.5em">🔊 再聽一次</button></div>`;
      pane.innerHTML = `<div class="t-quiz">
        <div class="t-dbar"><b>第 ${i + 1} / ${qs.length} 題</b><span class="muted">${esc(Q.p.s || '')}・答對 ${correct}</span></div>
        <div class="bar" style="margin:6px 0 10px"><div style="width:${i / qs.length * 100}%"></div></div>
        <div class="center">${prompt}</div>
        <div class="choices${Q.p.kind === 'phrase' && Q.key === 'jp' ? ' t-opts' : ''}">${Q.opts.map((o, k) => `<button class="choice${Q.key === 'jp' ? ' jp' : ''}" data-k="${k}">${esc(o.w[Q.key])}</button>`).join('')}</div>
        <div class="feedback"></div><div class="center t-nx"></div></div>`;
      const fb = pane.querySelector('.feedback'), nx = pane.querySelector('.t-nx');
      const say = () => App.speak(w.kana || w.jp);
      if (Q.type === 'listen') { pane.querySelector('#tPlay').onclick = say; say(); }
      pane.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const o = Q.opts[+b.dataset.k], ok = o === Q.p;
        pane.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (Q.opts[+x.dataset.k] === Q.p) x.classList.add('ok'); });
        if (ok) { correct++; fb.innerHTML = `<span class="t-fb-ok">⭕ 正確！</span>`; }
        else {
          b.classList.add('ng');
          Tracker.add(it, true);
          if (!wrong.some(x => x.id === it.id)) wrong.push(it);
          fb.innerHTML = `<span class="t-fb-ng">❌ 答錯了</span>`;
        }
        fb.innerHTML += ` <span class="jp lv-u ${lvCls(lv)}">${esc(w.jp)}</span>${w.kana && w.kana !== w.jp ? `（${esc(w.kana)}）` : ''} ${esc(w.romaji || '')} ＝ ${esc(w.zh)}
          ${w.hint ? `<div class="muted">${esc(w.hint)}</div>` : ''}<div>${App.trackBtn(it)}</div>`;
        bindTrack(fb, { [it.id]: it });
        if (Q.type !== 'listen') say();
        nx.innerHTML = `<button class="btn primary">${i + 1 >= qs.length ? '看結果 🏁' : '下一題 ➜'}</button>`;
        nx.querySelector('button').onclick = () => { i++; one(); };
      });
    };
    const end = () => {
      const stars = starsOf(correct / qs.length);
      // 依全站規則：首次依星數給、重玩只補差額或 3 XP
      const r = App.reward(opts.id || 'quiz:' + (opts.reason || ''), stars, opts.reason || '小測驗');
      opts.onStars && opts.onStars(stars);
      opts.onEnd && opts.onEnd();
      App.showResult({
        title: stars ? '測驗完成！' : '再接再厲！',
        stars, correct, total: qs.length, gained: r.gained, wrong,
        retry: opts.retry, back: opts.back
      });
    };
    one();
  }

  /* ---------------- 路由：drill（自由練習，不受解鎖限制） ----------------
     params: {scenes:[id], kind:'word'|'phrase'|'mix'|'dialog'|'speak', count, title, dialog?:index} */
  function runDialogs(pane, list, onAll, opts) {
    const queue = [];
    list.forEach(({ sc, d }) => { if (arr(d.steps).length) queue.push({ sc, d }); });
    const total = queue.reduce((n, x) => n + x.d.steps.length, 0);
    let first = 0; const wrong = [];
    const next = k => {
      if (k >= queue.length) return onAll({ total, first, wrong });
      const { sc, d } = queue[k];
      pane.innerHTML = `<div class="t-dbar"><h3 style="margin:0">${esc(sc.icon || '')} ${esc(d.title || '對話')}</h3><span class="muted">第 ${k + 1} / ${queue.length} 段</span></div><div id="tRun"></div>`;
      runDialogue(pane.querySelector('#tRun'), sc, d, res => {
        first += res.first;
        res.wrong.forEach(w => { if (!wrong.some(x => x.id === w.id)) wrong.push(w); });
        const box = document.createElement('div'); box.className = 't-sum';
        box.innerHTML = `<p>本段一次答對 <b>${res.first}</b> / ${res.total}</p><button class="btn primary">${k + 1 < queue.length ? '下一段 ➜' : '查看結果 🏁'}</button>`;
        pane.querySelector('#tRun').appendChild(box);
        box.querySelector('button').onclick = () => next(k + 1);
        box.scrollIntoView && box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, opts);
    };
    if (!queue.length) { pane.innerHTML = '<p class="muted center">這裡還沒有對話資料。</p>'; return; }
    next(0);
  }
  App.register('drill', {
    title: '練習', icon: '🎯', nav: false, navParent: 'home',
    render(el, params) {
      params = params || {};
      const list = arr(params.scenes).map(findScene).filter(Boolean);
      if (!list.length) return errorView(el, '沒有選到場景', '請回「練習」重新選擇。');
      let kind0 = params.kind || 'mix';
      if (kind0 === 'speak' && !srOK()) kind0 = 'shadow';
      const KN = { word: '📚 單字測驗', phrase: '💬 句子測驗', mix: '⚡ 綜合測驗', dialog: '🎭 對話演練', speak: '🎤 口說對話', shadow: '🔁 跟讀練習' };
      const kind = kind0;
      const one = list.length === 1 ? list[0] : null;
      el.innerHTML = `<div class="panel t-head" style="--tc:${esc(one ? one.color || '#c73e2e' : '#c73e2e')}">
          <div class="t-icon">${esc(one ? one.icon : '🗾')}</div>
          <div class="t-info"><h2>${esc(params.title || (one ? one.name : list.length + ' 個場景'))}</h2><div class="muted">${KN[kind] || ''}${one ? '' : '・' + list.map(s => s.name).join('、')}</div></div>
          <button class="btn sm ghost" id="tBack">↩ 練習選單</button></div>
        <div class="panel" id="tPane"></div>`;
      const home = params.trip ? { label: '本站下一步 ➜', route: 'trip-stop' } : params.sit ? { label: '🗺️ 關卡地圖', route: 'stage', params: { id: params.sit.split(':')[0] } } : { label: '🎯 練習選單', route: 'practice' };
      const saveSit = st => { if (params.sit && window.PracticeAPI) PracticeAPI.setSit(params.sit, st); };
      el.querySelector('#tBack').textContent = params.trip ? '🗺️ 回地圖' : params.sit ? '🗺️ 關卡地圖' : '↩ 練習選單';
      if (params.trip) home.back = 1;
      el.querySelector('#tBack').onclick = () => params.trip ? App.go('trip') : App.go(home.route, home.params);
      const pane = el.querySelector('#tPane');
      const again = () => App.go('drill', params);
      if (kind === 'dialog' || kind === 'speak' || kind === 'shadow') {
        const ds = list.flatMap(sc => arr(sc.dialogues).map((d, i) => ({ sc, d, i }))).filter(x => params.dialog == null || x.i === +params.dialog);
        const pick = params.dialog != null ? ds : App.sample(ds, Math.min(params.count || 3, ds.length));
        runDialogs(pane, pick, res => {
          const stars = starsOf(res.total ? res.first / res.total : 0);
          saveSit(stars);
          list.forEach(sc => { if (!App.state.sceneDone) App.state.sceneDone = {}; App.state.sceneDone[sc.id] = true; });
          App.save();
          const r = App.reward('drill:' + kind + ':' + list.map(s => s.id).join(',') + ':' + (params.dialog != null ? params.dialog : 'r'), stars, KN[kind].replace(/^\S+\s/, ''));
          pane.innerHTML = `<div class="t-sum"><div class="t-big">${stars ? '🎉' : '💪'}</div><h3>練習完成</h3><p>一次答對 ${res.first} / ${res.total}</p>
            <button class="btn" id="tRe">🔄 再練一次</button><button class="btn primary" id="tPr">🎯 練習選單</button></div>`;
          pane.querySelector('#tRe').onclick = again; pane.querySelector('#tPr').onclick = () => App.go(home.route, home.params);
          App.showResult({ title: stars ? '對話練習完成！' : '再練練看！', stars, correct: res.first, total: res.total, gained: r.gained, wrong: res.wrong, retry: again, back: home });
        }, { mic: kind === 'speak', shadow: kind === 'shadow' });
        return;
      }
      const P = poolOf(list, kind === 'word' ? ['word'] : kind === 'phrase' ? ['phrase'] : ['word', 'phrase']);
      if (P.length < 2) { pane.innerHTML = '<p class="muted center">資料不足，無法出題。</p>'; return; }
      quizRun(pane, P, {
        count: params.count || 10, reason: (KN[kind] || '⚡ 測驗').replace(/^\S+\s/, ''), id: 'drill:' + kind + ':' + list.map(s => s.id).join(','), onStars: saveSit,
        onEnd: () => { pane.innerHTML = `<div class="t-sum"><div class="t-big">🏁</div><h3>測驗結束</h3><button class="btn" id="tRe">🔄 再來一次</button><button class="btn primary" id="tPr">🎯 練習選單</button></div>`; pane.querySelector('#tRe').onclick = again; pane.querySelector('#tPr').onclick = () => App.go(home.route, home.params); },
        retry: again, back: home
      });
    }
  });

  window.TownAPI = { scenes, findScene, isUnlocked: unlocked, runDialogue, quizRun, poolOf, listenJP, bestMatch, micErr, get hasSR() { return srOK(); }, lvOf };
})();
