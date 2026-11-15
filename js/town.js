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
.t-street{background:linear-gradient(180deg,#bfe3ff 0%,#e9f6ff 55%,#f3e9dc 55%,#f3e9dc 100%);border-radius:20px;padding:18px 18px 10px;margin-bottom:12px;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.t-street h2{margin:0;color:var(--red)}
.t-skyline{font-size:2em;letter-spacing:6px;white-space:nowrap;overflow:hidden;margin-top:6px;opacity:.9}
.t-road{height:16px;margin:6px -18px 0;background:repeating-linear-gradient(90deg,#666 0 30px,#fff 30px 50px);background-size:100% 3px;background-repeat:repeat-x;background-position:center;background-color:#666}
.t-filter{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0}
.t-block{margin:18px 0 6px;display:flex;align-items:center;gap:8px}
.t-block .t-sign{background:#fff;border:2px solid var(--ink);border-radius:8px;padding:2px 12px;font-weight:bold;box-shadow:2px 2px 0 var(--ink)}
.t-block .t-line{flex:1;border-top:3px dashed #c9b8a3}
.t-card{border-top:8px solid var(--tc,#ccc);overflow:hidden}
.t-card .icon{font-size:3em}
.t-card h3{margin:6px 0 2px}
.t-card .t-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;font-size:.88em}
.t-card .t-done{position:absolute;top:8px;right:10px;font-size:1.3em}
.t-card.locked .t-lockmsg{color:var(--red);font-weight:bold}
.t-head{display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-left:10px solid var(--tc,#ccc)}
.t-head .t-icon{font-size:3.4em;line-height:1}
.t-head .t-info{flex:1;min-width:200px}
.t-head h2{margin:0}
.t-mission{background:linear-gradient(135deg,#3a2a6b,#7b3fa0);color:#fff;border-radius:14px;padding:10px 16px;font-weight:bold;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}
.t-mission .bar{flex:1;min-width:120px;background:rgba(255,255,255,.3)}
.t-tips summary{cursor:pointer;font-weight:bold}
.t-tips ul{margin:8px 0 0;padding-left:1.3em}
.t-words{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.t-word{cursor:pointer}
.t-word:hover{border-color:var(--red2)}
.t-word .t-emo{font-size:2em;line-height:1}
.t-word .t-jp{font-size:1.6em;font-weight:bold;margin:4px 0 0;word-break:break-all}
.t-word .t-kana{color:var(--blue)}
.t-word .t-rom{color:var(--muted);font-size:.88em}
.t-word .t-zh{font-size:1.08em;margin:2px 0}
.t-word .t-hint{font-size:.85em;color:#9a6a2a;background:#fff6e6;border-radius:8px;padding:2px 8px;display:inline-block}
.t-word .t-use{font-size:.85em;margin-top:4px}
.t-word .track-btn{margin-top:8px}
.t-phr .t-jp{font-size:1.35em}
.t-dlist{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
.t-dbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
.t-aidsw{cursor:pointer;user-select:none;font-size:.92em}
.t-chat{background:#f6f1ea;border-radius:14px;padding:12px;min-height:80px;max-height:60vh;overflow:auto}
.t-chat .bubble .j{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.t-aid{font-size:.88em;color:var(--muted)}
.t-noaid .t-aid{display:none}
.t-opts{grid-template-columns:1fr!important;max-width:600px}
.t-opts .choice{font-size:1.1em;text-align:left;padding:10px 14px}
.t-opts .choice .t-aid{display:block}
.t-opts .choice.ok .t-aid,.t-opts .choice.ng .t-aid{color:#fff}
.t-opts .choice:disabled{cursor:default}
.t-fb-ok{color:var(--green);font-weight:bold}
.t-fb-ng{color:var(--red);font-weight:bold}
.t-sum{text-align:center}
.t-sum .t-big{font-size:2.2em}
.t-quiz .q-mid{word-break:break-all}
.t-quiz .choice{font-size:1.1em}
.t-err{text-align:center}
.t-err .t-big{font-size:3.5em}
@media(max-width:640px){
  .t-words{grid-template-columns:1fr 1fr}
  .t-word .t-jp{font-size:1.3em}
  .t-head .t-icon{font-size:2.6em}
  .bubble{max-width:92%}
  .t-skyline{font-size:1.5em}
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
  let townFilter = 'all';
  let aidOn = true;                 // 初學者模式：顯示讀音/中文
  const tabMem = {};                // 每個場景記住目前分頁

  function trackHTML(id) {
    const on = Tracker.has(id);
    return `<button class="track-btn${on ? ' on' : ''}" data-tid="${esc(id)}">${on ? '✓ 已在清單' : '＋ 加入不會清單'}</button>`;
  }
  // 綁定 .track-btn：items 為 id→trackerItem
  function bindTrack(root, items) {
    root.querySelectorAll('.track-btn[data-tid]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const id = b.dataset.tid, it = items[id];
        if (Tracker.has(id)) { Tracker.remove(id); App.toast('已從不會清單移除'); }
        else if (it) Tracker.add(it);
        const on = Tracker.has(id);
        root.querySelectorAll('.track-btn[data-tid]').forEach(x => {
          if (x.dataset.tid !== id) return;
          x.classList.toggle('on', on);
          x.textContent = on ? '✓ 已在清單' : '＋ 加入不會清單';
        });
      };
    });
  }
  function errorView(el, title, msg) {
    el.innerHTML = `<div class="panel t-err"><div class="t-big">🧭</div><h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p>
      <button class="btn primary" id="tBack">🏙️ 返回日本街道</button></div>`;
    el.querySelector('#tBack').onclick = () => App.go('town');
  }
  function starsOf(ratio) { return ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0; }

  /* ---------------- 路由：town ---------------- */
  App.register('town', {
    title: '日本街道', icon: '🏙️', nav: true,
    render(el) {
      const all = scenes().slice().sort((a, b) => (a.unlockLevel || 1) - (b.unlockLevel || 1));
      const lv = App.level;
      const doneN = all.filter(s => isDone(s.id)).length;
      const openN = all.filter(unlocked).length;
      const list = all.filter(s => townFilter === 'unlocked' ? unlocked(s) : townFilter === 'todo' ? !isDone(s.id) : true);
      let lastLv = null, html = '';
      list.forEach(s => {
        const L = s.unlockLevel || 1;
        if (L !== lastLv) {
          if (lastLv !== null) html += '</div>';
          html += `<div class="t-block"><span class="t-sign">📍 Lv.${L} 街區</span><span class="t-line"></span>${L > lv ? '<span class="muted">🔒</span>' : ''}</div><div class="grid">`;
          lastLv = L;
        }
        const ok = unlocked(s), done = isDone(s.id);
        html += `<div class="card click t-card${ok ? '' : ' locked'}" data-id="${esc(s.id)}" style="--tc:${esc(s.color || '#ccc')}">
          ${done && ok ? '<span class="t-done" title="已完成">✅</span>' : ''}
          <div class="icon">${esc(s.icon || '🏠')}</div>
          <h3>${esc(s.name)}</h3>
          <div class="muted">${esc(s.desc || '')}</div>
          <div class="t-meta">
            ${ok ? `<span class="pill" style="background:${esc(s.color || 'var(--red)')}">Lv.${L}</span>` : `<span class="t-lockmsg">🔒 Lv.${L} 解鎖</span>`}
            <span class="chip">📚 ${arr(s.vocab).length}</span><span class="chip">💬 ${arr(s.phrases).length}</span><span class="chip">🎭 ${arr(s.dialogues).length}</span>
            ${done ? '<span class="chip green">✓ 已練習</span>' : ''}
          </div></div>`;
      });
      if (lastLv !== null) html += '</div>';
      if (!all.length) html = '<div class="panel center muted">🚧 街道施工中：場景資料尚未載入。</div>';
      else if (!list.length) html = `<div class="panel center muted">${townFilter === 'todo' ? '🎉 全部場景都練習過了！' : '目前沒有符合條件的場景。'}</div>`;

      el.innerHTML = `
        <div class="t-street">
          <h2>🏙️ 日本街道</h2>
          <div class="muted">走進每間店，學單字、練對話！完成對話可獲得經驗值。</div>
          <div class="t-skyline">🏪🍜☕💊🏮👕🚉🏨⛩️✈️🏥🗼</div>
          <div class="t-road"></div>
        </div>
        <div class="t-filter tabs">
          <button data-f="all" class="${townFilter === 'all' ? 'on' : ''}">全部 ${all.length}</button>
          <button data-f="unlocked" class="${townFilter === 'unlocked' ? 'on' : ''}">已解鎖 ${openN}</button>
          <button data-f="todo" class="${townFilter === 'todo' ? 'on' : ''}">未完成 ${all.length - doneN}</button>
          <span class="muted" style="margin-left:auto">目前 Lv.${lv}・已練習 ${doneN}/${all.length}</span>
        </div>
        ${html}`;
      el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { townFilter = b.dataset.f; App.render(); });
      el.querySelectorAll('.t-card[data-id]').forEach(c => c.onclick = () => {
        const s = findScene(c.dataset.id); if (!s) return;
        if (!unlocked(s)) App.toast(`🔒 「${esc(s.name)}」需要 Lv.${s.unlockLevel || 1} 才能進入（目前 Lv.${App.level}），去冒險地圖累積經驗值吧！`);
        else App.go('scene', { id: s.id });
      });
    }
  });

  /* ---------------- 路由：scene ---------------- */
  App.register('scene', {
    title: '場景', icon: '🏠', nav: false,
    render(el, params) {
      params = params || {};
      const sc = findScene(params.id);
      if (!sc) return errorView(el, '找不到這個場景', params.id ? `場景「${params.id}」不存在或資料尚未載入。` : '沒有指定場景。');
      const mission = params.mission || '';
      if (!mission && !unlocked(sc)) {
        el.innerHTML = `<div class="panel t-err"><div class="t-big">🔒</div><h2>${esc(sc.icon || '')} ${esc(sc.name)} 尚未解鎖</h2>
          <p>需要 <b>Lv.${sc.unlockLevel || 1}</b>，你目前是 Lv.${App.level}。</p><p class="muted">到冒險地圖完成任務累積經驗值就能解鎖！</p>
          <button class="btn" id="tBack">🏙️ 返回日本街道</button><button class="btn primary" id="tMap">🗺️ 冒險地圖</button></div>`;
        el.querySelector('#tBack').onclick = () => App.go('town');
        el.querySelector('#tMap').onclick = () => App.go('map');
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
      el.querySelector('#tBack').onclick = () => App.go(mission ? 'map' : 'town');
      const body = el.querySelector('#tBody');
      if (mission) return missionMode(body, sc, mission);

      const TABS = [['vocab', '📚 單字'], ['phrase', '💬 常用句'], ['dialog', '🎭 對話演練'], ['quiz', '⚡ 小測驗']];
      body.innerHTML = `<div class="tabs t-tabs">${TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('')}</div><div class="panel" id="tPane"></div>`;
      const pane = body.querySelector('#tPane');
      const show = k => {
        tabMem[sc.id] = k;
        body.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === k));
        if (window.speechSynthesis) speechSynthesis.cancel();
        ({ vocab: () => wordsView(pane, sc, 'word'), phrase: () => wordsView(pane, sc, 'phrase'), dialog: () => dialogMenu(pane, sc), quiz: () => quizIntro(pane, sc) })[k]();
      };
      body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => show(b.dataset.t));
      show(tabMem[sc.id] || 'vocab');
    }
  });

  /* ---------------- 單字 / 常用句 ---------------- */
  function wordsView(pane, sc, kind) {
    const list = arr(kind === 'word' ? sc.vocab : sc.phrases);
    if (!list.length) { pane.innerHTML = '<p class="muted center">這個場景還沒有資料。</p>'; return; }
    const items = {};
    pane.innerHTML = `<p class="muted" style="margin-top:0">👆 點卡片聽發音・不熟的按「＋ 加入不會清單」</p>
      <div class="t-words${kind === 'phrase' ? ' t-phr' : ''}">${list.map((w, i) => {
        const it = App.wordItem(w, sc.name, kind); items[it.id] = it;
        return `<div class="card t-word" data-i="${i}">
          ${w.emoji ? `<div class="t-emo">${esc(w.emoji)}</div>` : ''}
          <div class="t-jp jp">${esc(w.jp)} <span style="font-size:.6em">🔊</span></div>
          ${w.kana && w.kana !== w.jp ? `<div class="t-kana jp">${esc(w.kana)}</div>` : ''}
          ${w.romaji ? `<div class="t-rom">${esc(w.romaji)}</div>` : ''}
          <div class="t-zh">${esc(w.zh || '')}</div>
          ${w.hint ? `<div class="t-hint">${esc(w.hint)}</div>` : ''}
          ${kind === 'phrase' && w.use ? `<div class="t-use">🕒 <b>使用時機：</b>${esc(w.use)}</div>` : ''}
          <div>${trackHTML(it.id)}</div></div>`;
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
      box.innerHTML = `<div class="t-big">${pct >= 90 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div><h3>對話完成！</h3>
        <p>一次就選對 <b>${res.first}</b> / ${res.total} 步（${pct}%）</p>
        ${res.wrong.length ? `<div class="muted">選錯的句子已加入 📌不會清單：</div><div class="chips" style="justify-content:center">${res.wrong.map(w => `<span class="chip red jp">${esc(w.jp)} <small>${esc(w.zh)}</small></span>`).join('')}</div>` : ''}
        <button class="btn" id="tAgain">🔄 再練一次</button><button class="btn primary" id="tOther">選其他對話 ➜</button>`;
      pane.querySelector('#tRun').appendChild(box);
      box.querySelector('#tAgain').onclick = () => practice(pane, sc, di);
      box.querySelector('#tOther').onclick = () => dialogMenu(pane, sc);
      if (!App.state.sceneDone) App.state.sceneDone = {};
      App.state.sceneDone[sc.id] = true;
      App.save();
      App.addXP(10, '場景練習');
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
    host.innerHTML = `<label class="t-aidsw"><input type="checkbox" class="t-aidcb"${aidOn ? ' checked' : ''}> 初學者模式：顯示中文/讀音</label>
      <div class="chat t-chat${aidOn ? '' : ' t-noaid'}"></div>
      <div class="t-ask${aidOn ? '' : ' t-noaid'}"><div class="choices t-opts"></div><div class="feedback"></div><div class="center t-nx"></div></div>`;
    const chat = host.querySelector('.t-chat'), ask = host.querySelector('.t-ask');
    const opBox = host.querySelector('.t-opts'), fb = host.querySelector('.feedback'), nx = host.querySelector('.t-nx');
    host.querySelector('.t-aidcb').onchange = e => {
      aidOn = e.target.checked;
      chat.classList.toggle('t-noaid', !aidOn); ask.classList.toggle('t-noaid', !aidOn);
    };
    const scroll = () => { chat.scrollTop = chat.scrollHeight; };
    const bubble = (cls, who, jp, kana, romaji, zh) => {
      const b = document.createElement('div');
      b.className = 'bubble ' + cls;
      b.innerHTML = `<div class="who">${esc(who)}</div>
        <div class="j jp"><span>${esc(jp)}</span><button class="speak" title="播放">🔊</button></div>
        ${kana && kana !== jp ? `<div class="t-aid jp">${esc(kana)}</div>` : ''}
        ${romaji ? `<div class="t-aid">${esc(romaji)}</div>` : ''}
        ${zh ? `<div class="t-aid">🀄 ${esc(zh)}</div>` : ''}`;
      b.querySelector('.speak').onclick = () => App.speak(kana || jp);
      chat.appendChild(b); scroll();
      return b;
    };

    function step(i) {
      opBox.innerHTML = ''; fb.innerHTML = ''; nx.innerHTML = '';
      if (i >= steps.length) { ask.style.display = 'none'; onDone(res); return; }
      const s = steps[i];
      bubble('npc', `${s.emoji || '🙂'} ${s.speaker || '對方'}`, s.jp, s.kana, s.romaji, s.zh);
      App.speak(s.kana || s.jp);
      const cs = arr(s.choices);
      const hasCorrect = cs.some(c => c.correct);
      const isOK = c => hasCorrect ? !!c.correct : true;
      const nextBtn = () => {
        nx.innerHTML = `<button class="btn primary">${i + 1 >= steps.length ? '完成 🎉' : '繼續 ➜'}</button>`;
        nx.querySelector('button').onclick = () => step(i + 1);
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
      });
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
      pane.querySelector('#tMap').onclick = () => App.go('map');
      App.showResult({
        title: stars ? `任務完成！${sc.name}` : '任務失敗，再試一次！',
        stars, correct: first, total, gained: r && r.gained, wrong,
        retry, next: { label: '回冒險地圖', route: 'map' }
      });
    }
    play(0);
  }

  /* ---------------- 小測驗 ---------------- */
  function pool(sc) {
    return arr(sc.vocab).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'word' }))
      .concat(arr(sc.phrases).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'phrase' })));
  }
  function quizIntro(pane, sc) {
    const P = pool(sc);
    if (P.length < 2) { pane.innerHTML = '<p class="muted center">資料不足，無法出題。</p>'; return; }
    pane.innerHTML = `<div class="center"><div class="q-big">⚡</div><h3>${esc(sc.name)} 小測驗</h3>
      <p class="muted">從本場景的單字與常用句隨機出 ${Math.min(10, P.length)} 題：日→中、中→日、聽音選字。<br>答錯的會自動加入 📌不會清單。</p>
      <button class="btn primary" id="tGo">開始測驗 ➜</button></div>`;
    pane.querySelector('#tGo').onclick = () => quiz(pane, sc);
  }
  function quiz(pane, sc) {
    const P = pool(sc);
    const qs = App.sample(P, Math.min(10, P.length)).map(p => {
      const type = App.sample(['j2z', 'z2j', 'listen'], 1)[0];
      const key = type === 'j2z' ? 'zh' : 'jp';
      const others = P.filter(o => o !== p && o.w[key] !== p.w[key]);
      const uniq = [];
      App.shuffle(others).forEach(o => { if (uniq.length < 3 && !uniq.some(u => u.w[key] === o.w[key])) uniq.push(o); });
      return { p, type, key, opts: App.shuffle([p].concat(uniq)) };
    });
    let i = 0, correct = 0;
    const wrong = [];
    const one = () => {
      if (i >= qs.length) return end();
      const Q = qs[i], w = Q.p.w;
      const it = App.wordItem(w, sc.name, Q.p.kind);
      const prompt = Q.type === 'j2z'
        ? `<div class="muted">這是什麼意思？</div><div class="q-mid jp">${esc(w.jp)}</div>${w.kana && w.kana !== w.jp ? `<div class="jp muted">${esc(w.kana)}</div>` : ''}`
        : Q.type === 'z2j'
          ? `<div class="muted">日文怎麼說？</div><div class="q-mid">${esc(w.emoji || '')} ${esc(w.zh)}</div>`
          : `<div class="muted">聽聽看，選出聽到的字</div><div class="q-big"><button class="btn primary" id="tPlay" style="font-size:.5em">🔊 再聽一次</button></div>`;
      pane.innerHTML = `<div class="t-quiz">
        <div class="t-dbar"><b>第 ${i + 1} / ${qs.length} 題</b><span class="muted">答對 ${correct}</span></div>
        <div class="bar" style="margin:6px 0 10px"><div style="width:${i / qs.length * 100}%"></div></div>
        <div class="center">${prompt}</div>
        <div class="choices">${Q.opts.map((o, k) => `<button class="choice${Q.key === 'jp' ? ' jp' : ''}" data-k="${k}">${esc(o.w[Q.key])}</button>`).join('')}</div>
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
        fb.innerHTML += ` <span class="jp">${esc(w.jp)}</span>${w.kana && w.kana !== w.jp ? `（${esc(w.kana)}）` : ''} ${esc(w.romaji || '')} ＝ ${esc(w.zh)}
          ${w.hint ? `<div class="muted">${esc(w.hint)}</div>` : ''}<div>${trackHTML(it.id)}</div>`;
        bindTrack(fb, { [it.id]: it });
        if (Q.type !== 'listen') say();
        nx.innerHTML = `<button class="btn primary">${i + 1 >= qs.length ? '看結果 🏁' : '下一題 ➜'}</button>`;
        nx.querySelector('button').onclick = () => { i++; one(); };
      });
    };
    const end = () => {
      const stars = starsOf(correct / qs.length);
      const r = correct ? App.addXP(Math.max(1, Math.round(correct / 2)), '場景小測驗') : { gained: 0 };
      quizIntro(pane, sc);
      App.showResult({
        title: stars ? '測驗完成！' : '再接再厲！',
        stars, correct, total: qs.length, gained: r.gained, wrong,
        retry: () => quiz(pane, sc)
      });
    };
    one();
  }

  window.TownAPI = { scenes, findScene, isUnlocked: unlocked };
})();
