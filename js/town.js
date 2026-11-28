/* =========================================================
   日語冒險 — 場景互動 town.js
   沒有自己的路由；TownAPI 提供對話與測驗元件給 menu（js/practice.js）
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
.t-mission{background:var(--ai);color:var(--on-pri);border:none;border-radius:18px;padding:10px 14px;font-weight:bold;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}
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
.t-opts .choice.ok .t-aid,.t-opts .choice.ng .t-aid{color:var(--on-pri)}
.t-mic{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:6px 0}
.t-micbtn{width:64px;height:64px;border-radius:50%;font-size:1.8em;border:1px solid var(--line);background:var(--pri);color:var(--on-pri);cursor:pointer;box-shadow:0 4px 14px color-mix(in srgb,var(--pri) 35%,transparent)}
.t-micbtn.on{animation:tmic 1s infinite}
.t-micbtn:disabled{background:var(--chip);cursor:not-allowed}
.t-showopt{display:block;margin:6px auto}
.t-heard{font-size:.9em;min-height:1.3em;text-align:center}
@keyframes tmic{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--pri) 60%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
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
  const unlocked = () => true;   // 等級不再當鎖
  const arr = a => (Array.isArray(a) ? a : []);
  let aidOn = App.profile().assist !== 'none';   // 顯示讀音/中文：預設依 profile.assist
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
  function starsOf(ratio) { return ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0; }

  /* ---------------- 對話演練 ---------------- */
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
              ((w) => Learn.record(w.id, 0, { src: 'town', item: w }))(it);
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

  /* ---------------- 小測驗 ---------------- */
  // 題庫：kinds = ['word','phrase']；每題記住來源場景名稱
  function poolOf(list, kinds) {
    kinds = kinds || ['word', 'phrase'];
    return list.flatMap(sc => [].concat(
      kinds.includes('word') ? arr(sc.vocab).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'word', s: sc.name })) : [],
      kinds.includes('phrase') ? arr(sc.phrases).filter(w => w && w.jp && w.zh).map(w => ({ w, kind: 'phrase', s: sc.name })) : []));
  }
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
          ((w) => Learn.record(w.id, 0, { src: 'town', item: w }))(it);
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

  window.TownAPI = { scenes, findScene, isUnlocked: unlocked, runDialogue, quizRun, poolOf, listenJP, bestMatch, micErr, get hasSR() { return srOK(); }, lvOf };
})();
