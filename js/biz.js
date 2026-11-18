// 商務日語（C 組）：路由 biz（單元列表＋商務閱讀）、biz-unit（單元流程）、biz-read（商務短文）
// 依賴：App、Tracker；可選 Phrase.romaji（羅馬字）、Learn.record（統一進度，A 組）
// 資料：data/biz/units-1..4.js（window.BIZ.units）、data/reading/biz.js（window.BIZ_READING）；未載入時自行 App.loadScript
// 對外：BIZ.next() → {label, sub, route:'biz-unit', params:{id}}（首頁今日課）、BIZ.load()、BIZ.stars(id)、BIZ.progress()
(function () {
  const B = window.BIZ = window.BIZ || {};
  B.units = B.units || [];
  const esc = s => App.esc(s == null ? '' : String(s));

  /* ---------------- 單元目錄（只載 biz.js 時 BIZ.next 也能用） ---------------- */
  const META = [
    ['intro', '🤝', '自我介紹與名片交換', 'N4'], ['phone', '📞', '打電話：接聽、轉接、留言', 'N4'],
    ['email', '✉️', '商務 Email', 'N3'], ['meeting', '🗣️', '開會：發言、贊成反對、確認待辦', 'N3'],
    ['visit', '🏢', '拜訪客戶與接待', 'N3'], ['request', '🙏', '請求與委婉拒絕', 'N2'],
    ['hourensou', '📋', '報連相：報告、聯絡、相談', 'N2'], ['apology', '🙇', '道歉與客訴應對', 'N1']
  ].map(([id, icon, title, lv]) => ({ id, icon, title, lv }));
  B.META = META;
  const SRC = ['data/biz/units-1.js', 'data/biz/units-2.js', 'data/biz/units-3.js', 'data/biz/units-4.js', 'data/reading/biz.js'];
  function ensureCss() {
    if (document.querySelector('link[href$="css/biz.css"]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/biz.css'; document.head.appendChild(l);
  }
  const ready = () => META.every(m => B.units.some(u => u.id === m.id)) && Array.isArray(window.BIZ_READING);
  let loading = null;
  function load() {
    ensureCss();
    if (ready()) return Promise.resolve();
    if (!loading) loading = SRC.reduce((p, s) => p.then(() => App.loadScript(s)), Promise.resolve()).then(() => { loading = null; }, e => { loading = null; throw e; });
    return loading;
  }
  B.load = load;
  const unitOf = id => B.units.find(u => u.id === id);
  const artOf = id => (window.BIZ_READING || []).find(a => a.id === id);
  const cleared = () => (App.state && App.state.cleared) || {};
  const starsOf = id => cleared()['biz:' + id] || 0;
  const rStars = id => cleared()['biz:r:' + id] || 0;
  B.stars = starsOf;
  B.progress = () => ({ done: META.filter(m => starsOf(m.id) > 0).length, total: META.length });
  B.next = function () {
    try {
      const i = META.findIndex(m => !starsOf(m.id));
      if (i >= 0) { const m = META[i]; return { label: '商務日語：' + m.title, sub: `第 ${i + 1} 課・${m.lv}・單字句子→對話→Email→測驗`, route: 'biz-unit', params: { id: m.id }, icon: m.icon }; }
      const low = META.slice().sort((a, b) => starsOf(a.id) - starsOf(b.id))[0];
      if (starsOf(low.id) < 3) return { label: '商務日語複習：' + low.title, sub: '再挑戰拿滿 3 星', route: 'biz-unit', params: { id: low.id }, icon: low.icon };
      return { label: '商務閱讀', sub: '8 課都 3 星了，讀一篇商務短文', route: 'biz', params: {}, icon: '💼' };
    } catch (e) { return { label: '商務日語', sub: '', route: 'biz', params: {} }; }
  };

  /* ---------------- 讀音／羅馬字／中文：依 App.profile().assist ---------------- */
  const prof = () => { try { return App.profile(); } catch (e) { return { lv: 'n3', assist: 'full' }; } };
  const AS = () => { const p = prof(); return { kana: p.assist !== 'none', rom: p.assist === 'full' || p.lv === 'zero', zh: p.assist === 'full' }; };
  const rom = (kana, jp) => { try { return window.Phrase && Phrase.romaji ? (kana ? Phrase.romaji(kana, jp) : Phrase.romaji(jp)) : ''; } catch (e) { return ''; } };
  const spk = jp => jp ? `<button type="button" class="bz-spk" data-say="${esc(jp)}" aria-label="播放發音">🔊</button>` : '';
  // 一段日文：jp＋讀音＋羅馬字＋中文；被隱藏的部分收在「💡 提示」
  function txt(o, cls) {
    const a = AS(), k = !!o.kana && o.kana !== o.jp;
    const r = a.rom && o.kana ? rom(o.kana, o.jp) : '';
    let h = `<div class="bz-t ${cls || ''}"><div class="bz-jp jp">${esc(o.jp)}</div>`;
    if (k) h += `<div class="bz-kana jp"${a.kana ? '' : ' hidden'}>${esc(o.kana)}</div>`;
    if (r) h += `<div class="bz-rom">${esc(r)}</div>`;
    if (o.zh) h += `<div class="bz-zh"${a.zh ? '' : ' hidden'}>${esc(o.zh)}</div>`;
    if ((k && !a.kana) || (o.zh && !a.zh)) h += `<button type="button" class="bz-hint" data-hint>💡 提示</button>`;
    return h + '</div>';
  }
  function bindCommon(el) {
    el.querySelectorAll('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); App.speak(b.dataset.say); });
    el.querySelectorAll('[data-hint]').forEach(b => b.onclick = e => { e.stopPropagation(); b.parentElement.querySelectorAll('[hidden]').forEach(x => x.hidden = false); b.remove(); });
  }
  const lvB = lv => `<span class="lv-b ${String(lv).toLowerCase()}">${esc(lv)}</span>`;
  const POL = { '普通': 0, '丁寧': 1, '尊敬謙讓': 2 };
  const polB = p => `<span class="bz-pol p${POL[p] != null ? POL[p] : 1}">${esc(p)}</span>`;
  const onRoute = name => { const m = document.getElementById('main'); return m && m.className === 'route-' + name; };
  function needData(el, name, params, fn) {
    if (ready()) { ensureCss(); return true; }
    el.innerHTML = '<p class="center muted bz-load">載入中…</p>';
    load().then(() => { if (onRoute(name)) fn(el, params); })
      .catch(() => { if (onRoute(name)) el.innerHTML = '<p class="center bz-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
    return false;
  }

  /* ---------------- 進度紀錄：Learn 優先，否則答錯進不會清單 ---------------- */
  function itemOf(u, ref) {
    const t = ref.slice(0, 1), key = ref.slice(2), src = '商務・' + u.title;
    if (t === 'v') { const v = u.vocab.find(x => x.jp === key); return v ? { id: 'word:' + v.jp, jp: v.jp, kana: v.kana, romaji: rom(v.kana, v.jp), zh: v.zh, source: src } : null; }
    if (t === 'p') {
      let p = u.phrases.find(x => x.jp === key);
      if (!p) u.dialogue.steps.forEach(s => s.choices.forEach(c => { if (c.jp === key) p = c; }));
      return { id: 'phrase:' + key, jp: key, kana: p ? p.kana : '', romaji: p && p.kana ? rom(p.kana, key) : '', zh: p ? p.zh : '', source: src };
    }
    if (t === 'g') { const g = u.grammar.find(x => x.pat === key); return g ? { id: 'phrase:' + g.ex[0][0], jp: g.ex[0][0], zh: g.ex[0][1] + '（' + g.pat + '）', hint: g.conn, source: src } : null; }
    return null;
  }
  // Learn 用的扁平項目（同 BIZ.items 格式）；不在單元清單內的句子（對話正解、Email 行）也給最小欄位
  function flatItem(u, ref) {
    const f = (B.items || []).find(x => x.id === ref);
    if (f) return f;
    const it = itemOf(u, ref);
    return { id: ref, type: ref[0] === 'v' ? 'vocab' : ref[0] === 'g' ? 'grammar' : 'phrase', jp: ref.slice(2), kana: it ? it.kana || '' : '', zh: it ? it.zh || '' : '', lv: u.lv, unit: u.id };
  }
  function rec(R, u, ref, grade) {
    if (!ref) return;
    let viaLearn = false;
    try { if (window.Learn && typeof Learn.record === 'function') { Learn.record(ref, grade, { src: 'biz', unit: u.id, item: flatItem(u, ref) }); viaLearn = true; } } catch (e) { }
    if (grade >= 2) return;
    const it = itemOf(u, ref);
    if (!it) return;
    if (!viaLearn && window.Tracker) try { Tracker.add(it, true); } catch (e) { }
    if (R && !R.wrong.some(w => w.id === it.id)) R.wrong.push(it);
  }

  /* ================= 路由 biz：單元列表 ================= */
  function renderList(el) {
    if (!needData(el, 'biz', {}, renderList)) return;
    const p = B.progress(), nx = B.next(), lvNow = String(prof().lv || '').toUpperCase();
    const units = META.map(m => unitOf(m.id)).filter(Boolean);
    const arts = window.BIZ_READING || [];
    el.innerHTML = `<div class="bz">
      <div class="bz-hero">
        <div class="bz-hero-t"><span class="bz-hero-i">💼</span><div><h2>商務日語</h2><p class="muted">真實職場說法：敬語、電話、Email、開會、報連相</p></div></div>
        <div class="bz-prog"><div class="bar"><div style="width:${Math.round(p.done / p.total * 100)}%"></div></div><span>${p.done} / ${p.total} 課完成</span></div>
        ${nx.route === 'biz-unit' ? `<button type="button" class="btn primary block bz-go" data-unit="${esc(nx.params.id)}">▶ ${esc(nx.label.replace(/^商務日語(複習)?：/, ''))}<small>${esc(nx.sub)}</small></button>` : ''}
      </div>
      <h3 class="bz-sec">情境單元</h3>
      <div class="bz-units">${units.map((u, i) => {
        const s = starsOf(u.id);
        return `<button type="button" class="bz-unit${s ? ' done' : ''}" data-unit="${esc(u.id)}">
          <span class="bz-u-i">${u.icon}</span>
          <span class="bz-u-tx"><b>${i + 1}. ${esc(u.title)}</b><small>${esc(u.zh)}</small>
            <span class="bz-u-meta">${lvB(u.lv)}${u.lv === lvNow ? '<span class="bz-rec">適合你</span>' : ''}<span class="bz-stars" aria-label="${s} 星">${'⭐'.repeat(s)}${'☆'.repeat(3 - s)}</span></span></span>
        </button>`;
      }).join('')}</div>
      <h3 class="bz-sec">商務閱讀</h3>
      <div class="bz-arts">${arts.map(a => {
        const s = rStars(a.id);
        return `<button type="button" class="bz-art${s ? ' done' : ''}" data-art="${esc(a.id)}"><span class="bz-u-i">${a.icon}</span>
          <span class="bz-u-tx"><b class="jp">${esc(a.title)}</b><small>${esc(a.zh)}</small><span class="bz-u-meta">${lvB(a.lv.toUpperCase())}<span class="bz-stars">${'⭐'.repeat(s)}${'☆'.repeat(3 - s)}</span></span></span></button>`;
      }).join('')}</div>
    </div>`;
    el.querySelectorAll('[data-unit]').forEach(b => b.onclick = () => App.go('biz-unit', { id: b.dataset.unit }));
    el.querySelectorAll('[data-art]').forEach(b => b.onclick = () => App.go('biz-read', { id: b.dataset.art }));
  }

  /* ================= 路由 biz-unit：卡片 → 對話 → Email → 測驗 → 結算 ================= */
  const RUNS = {};
  const STAGES = [['card', '單字句子'], ['dlg', '對話演練'], ['mail', 'Email'], ['quiz', '小測驗']];
  function build(u) {
    const sh = n => App.shuffle([...Array(n).keys()]);
    const steps = [{ k: 'intro', st: 'card' }];
    u.vocab.forEach(d => steps.push({ k: 'v', st: 'card', d }));
    u.phrases.forEach(d => steps.push({ k: 'p', st: 'card', d }));
    u.grammar.forEach(d => steps.push({ k: 'g', st: 'card', d }));
    steps.push({ k: 'sec', st: 'dlg' });
    u.dialogue.steps.forEach((d, i) => steps.push({ k: 'd', st: 'dlg', d, i, o: sh(d.choices.length), tried: [] }));
    steps.push({ k: 'sec', st: 'mail' });
    u.email.blanks.forEach((d, i) => steps.push({ k: 'm', st: 'mail', d, i, o: sh(d.opts.length), tried: [] }));
    steps.push({ k: 'sec', st: 'quiz' });
    u.quiz.forEach((d, i) => steps.push(d.t === 'order'
      ? { k: 'o', st: 'quiz', d, i, pool: sh(d.parts.length), pick: [] }
      : { k: 'q', st: 'quiz', d, i, o: sh(d.opts.length), tried: [] }));
    return { id: u.id, steps, i: 0, ok: 0, total: 0, wrong: [], mail: [], known: 0 };
  }
  // 計分：對話、Email、測驗第一次作答
  function score(R, step, correct) {
    if (step.scored) return;
    step.scored = true; R.total++; if (correct) R.ok++;
  }
  function renderUnit(el, params) {
    if (!needData(el, 'biz-unit', params, renderUnit)) return;
    const u = unitOf(params && params.id);
    if (!u) { el.innerHTML = '<p class="center bz-load">找不到這個單元。</p>'; return; }
    const R = RUNS[u.id] || (RUNS[u.id] = build(u));
    const draw = keep => { if (!onRoute('biz-unit')) return; renderUnit(el, params); const f = keep && el.querySelector('.bz-fb'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); };
    const go = n => { R.i = Math.max(0, Math.min(R.steps.length, n)); draw(); };
    if (R.i >= R.steps.length) { finish(u, R); return; }
    const s = R.steps[R.i];
    const stI = STAGES.findIndex(x => x[0] === s.st);
    const head = `<div class="bz-head">
      <div class="bz-head-t"><span>${u.icon} ${esc(u.title)}</span>${lvB(u.lv)}</div>
      <div class="bz-stages">${STAGES.map((x, i) => `<span class="${i < stI ? 'past' : i === stI ? 'on' : ''}">${i < stI ? '✓ ' : ''}${x[1]}</span>`).join('')}</div>
      <div class="bar bz-bar"><div style="width:${Math.round(R.i / R.steps.length * 100)}%"></div></div>
    </div>`;
    let body = '';
    const nextBtn = (label, extra) => `<div class="bz-nav">${extra || ''}<button type="button" class="btn primary bz-next" data-next>${label || '下一步 ➜'}</button></div>`;
    if (s.k === 'intro') {
      body = `<div class="card bz-card bz-intro">
        <div class="bz-intro-i">${u.icon}</div><h2>${esc(u.title)}</h2><p class="muted">${esc(u.zh)}</p>
        <p class="bz-goal">🎯 ${esc(u.goal)}</p>
        <ol class="bz-plan">
          <li>📇 單字 ${u.vocab.length}・句子 ${u.phrases.length}・句型 ${u.grammar.length}</li>
          <li>💬 對話演練 ${u.dialogue.steps.length} 輪（${esc(u.dialogue.title)}）</li>
          <li>✉️ Email 填空 ${u.email.blanks.length} 格</li>
          <li>📝 小測驗 ${u.quiz.length} 題</li>
        </ol></div>
        <div class="bz-nav"><button type="button" class="btn" data-skip="dlg">已經會了，直接對話 ›</button><button type="button" class="btn primary bz-next" data-next>開始學習 ➜</button></div>`;
    } else if (s.k === 'v' || s.k === 'p' || s.k === 'g') {
      body = cardHTML(u, s) + `<div class="bz-nav bz-rate">
        <button type="button" class="btn" data-rate="1">🔁 還不熟</button>
        <button type="button" class="btn primary" data-rate="2">✓ 記住了</button></div>
        <p class="center"><button type="button" class="btn ghost sm" data-skip="dlg">跳過卡片，直接對話演練 ›</button></p>`;
    } else if (s.k === 'sec') {
      const T = { dlg: ['💬', '對話演練', `情境：${u.dialogue.title}。每一輪選出最得體的說法，答錯可以再選一次。`], mail: ['✉️', 'Email 填空', `${u.email.title}：把空格填上最適合的說法。`], quiz: ['📝', '小測驗', `選擇、重組句子、敬語轉換，共 ${u.quiz.length} 題。`] }[s.st];
      body = `<div class="card bz-card bz-intro"><div class="bz-intro-i">${T[0]}</div><h2>${T[1]}</h2><p>${esc(T[2])}</p>
        ${s.st === 'dlg' && R.known ? `<p class="muted">剛才記住了 ${R.known} 張卡片。</p>` : ''}</div>` + nextBtn('開始 ➜');
    } else if (s.k === 'd') {
      body = dlgHTML(u, s) + (s.done ? nextBtn() : '');
    } else if (s.k === 'm') {
      body = mailHTML(u, R, s) + (s.done ? nextBtn(s.i === u.email.blanks.length - 1 ? '完成 Email ➜' : '下一格 ➜') : '');
    } else if (s.k === 'q') {
      body = quizHTML(s) + (s.done ? nextBtn(R.i === R.steps.length - 1 ? '看結果 ➜' : '下一題 ➜') : '');
    } else if (s.k === 'o') {
      body = orderHTML(s) + (s.done ? nextBtn(R.i === R.steps.length - 1 ? '看結果 ➜' : '下一題 ➜') : '');
    }
    el.innerHTML = `<div class="bz bz-run">${head}${body}<p class="bz-count muted">${R.i + 1} / ${R.steps.length}</p></div>`;
    bindCommon(el);
    const nb = el.querySelector('[data-next]'); if (nb) nb.onclick = () => go(R.i + 1);
    el.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => go(R.steps.findIndex(x => x.k === 'sec' && x.st === b.dataset.skip)));
    el.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      const g = +b.dataset.rate, ref = s.k === 'v' ? 'v:' + s.d.jp : s.k === 'p' ? 'p:' + s.d.jp : 'g:' + s.d.pat;
      if (g >= 2) R.known++;
      rec(g < 2 ? R : null, u, ref, g);
      go(R.i + 1);
    });
    el.querySelectorAll('[data-kb]').forEach(b => b.onclick = () => App.go('kb-page', { id: b.dataset.kb }));
    // 選擇題（對話／Email／測驗）
    el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
      if (s.done) return;
      const k = +b.dataset.opt;
      if (s.tried.includes(k)) return;
      let correct, ref;
      if (s.k === 'd') { correct = !!s.d.choices[k].correct; const c = s.d.choices.find(x => x.correct); ref = c ? 'p:' + c.jp : ''; }
      else { correct = k === 0; ref = s.k === 'm' ? '' : s.d.ref; }
      s.tried.push(k); s.last = k;
      score(R, s, correct);
      if (s.tried.length === 1) {
        if (s.k === 'm') { const ln = u.email.lines.find(l => l.includes('［' + (s.i + 1) + '］')); if (ln) ref = 'p:' + ln.replace('［' + (s.i + 1) + '］', s.d.opts[0]); }
        if (ref && s.k === 'm') { try { if (window.Learn && Learn.record) Learn.record(ref, correct ? 3 : 0, { src: 'biz', unit: u.id, item: flatItem(u, ref) }); } catch (e) { } }
        else rec(R, u, ref, correct ? 3 : 0);
      }
      if (correct) { s.done = true; if (s.k === 'm') R.mail[s.i] = s.d.opts[0]; }
      if (correct) App.speak && s.k === 'd' && App.speak(s.d.choices[k].jp);
      draw(true);
    });
    // 重組
    el.querySelectorAll('[data-pool]').forEach(b => b.onclick = () => { if (s.done) return; s.pick.push(+b.dataset.pool); s.bad = false; draw(); });
    el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { if (s.done) return; s.pick.splice(+b.dataset.pick, 1); s.bad = false; draw(); });
    const ck = el.querySelector('[data-check]');
    if (ck) ck.onclick = () => {
      const ans = s.pick.map(i => s.d.parts[i]).join(''), correct = ans === s.d.parts.join('');
      const first = !s.scored;
      score(R, s, correct);
      if (first) rec(R, u, s.d.ref, correct ? 3 : 0);
      if (correct) { s.done = true; App.speak(s.d.parts.join('')); } else { s.bad = true; s.pick = []; }
      draw(true);
    };
  }
  function cardHTML(u, s) {
    const d = s.d;
    if (s.k === 'v') {
      const it = itemOf(u, 'v:' + d.jp);
      return `<div class="card bz-card bz-flash"><span class="bz-kind">📇 單字</span>${spk(d.jp)}
        ${txt({ jp: d.jp, kana: d.kana, zh: d.zh }, 'big')}
        <div class="bz-trk">${App.trackBtn(it, true)}</div></div>`;
    }
    if (s.k === 'p') {
      const it = itemOf(u, 'p:' + d.jp);
      return `<div class="card bz-card bz-flash"><span class="bz-kind">💬 句子</span>${spk(d.jp)}
        ${txt({ jp: d.jp, kana: d.kana, zh: d.zh })}
        <div class="bz-when"><span>🕒 ${esc(d.when)}</span>${polB(d.pol)}</div>
        <div class="bz-trk">${App.trackBtn(it, true)}</div></div>`;
    }
    return `<div class="card bz-card bz-gram"><span class="bz-kind">📐 句型</span>
      <h3 class="jp bz-pat">${esc(d.pat)}</h3>
      <p class="bz-conn"><b>接續</b> <span class="jp">${esc(d.conn)}</span></p>
      <p>${esc(d.zh)}</p>
      <div class="bz-exs">${d.ex.map(e => `<div class="bz-ex">${spk(e[0])}<div><div class="jp bz-jp">${esc(e[0])}</div><div class="bz-zh">${esc(e[1])}</div></div></div>`).join('')}</div>
      ${d.gid ? `<button type="button" class="btn sm" data-kb="${esc(d.gid)}">📚 在知識庫看這個句型</button>` : ''}</div>`;
  }
  function choiceBtns(s, list, fbOf) {
    return `<div class="bz-opts">${s.o.map(k => {
      const c = list[k], tried = s.tried.includes(k), good = tried && (s.k === 'd' ? c.correct : k === 0);
      const cls = tried ? (good ? ' ok' : ' bad') : (s.done ? ' dim' : '');
      return `<button type="button" class="bz-opt${cls}" data-opt="${k}"${s.done ? ' disabled' : ''}>${typeof c === 'string' ? `<span class="jp">${esc(c)}</span>` : optTxt(c, tried || s.done)}</button>`;
    }).join('')}</div>${s.last != null ? `<div class="bz-fb ${s.done ? 'ok' : 'bad'}" aria-live="polite">${s.done ? '⭕ ' : '❌ '}${esc(fbOf(s.last))}${s.done ? '' : '<br><small>再選一次。</small>'}</div>` : ''}`;
  }
  // 選項內不能放按鈕（button 不可巢狀）：讀音依 assist；中文只在選過或答對後顯示
  function optTxt(c, open) {
    const a = AS(), k = !!c.kana && c.kana !== c.jp, r = a.rom && c.kana ? rom(c.kana, c.jp) : '';
    return `<div class="bz-t"><div class="bz-jp jp">${esc(c.jp)}</div>${k && (a.kana || open) ? `<div class="bz-kana jp">${esc(c.kana)}</div>` : ''}${r ? `<div class="bz-rom">${esc(r)}</div>` : ''}${open && c.zh ? `<div class="bz-zh">${esc(c.zh)}</div>` : ''}</div>`;
  }
  function dlgHTML(u, s) {
    const d = s.d, me = d.speaker === '你';
    const line = me ? `<div class="bz-sit">🙋 <b>輪到你</b>　${esc(d.jp.replace(/^（|）$/g, ''))}<br><small>${esc(d.zh)}</small></div>`
      : `<div class="bz-bub"><div class="bz-who">${d.emoji} ${esc(d.speaker)}${spk(d.jp)}</div>${txt({ jp: d.jp, kana: d.kana, zh: d.zh })}</div>`;
    return `<div class="bz-dlg"><p class="bz-dt muted">💬 ${esc(u.dialogue.title)}・第 ${s.i + 1} / ${u.dialogue.steps.length} 輪</p>${line}
      <p class="bz-ask">${me ? '你要怎麼說？' : '你怎麼回應？'}</p>
      ${choiceBtns(s, d.choices, k => d.choices[k].feedback)}</div>`;
  }
  function mailHTML(u, R, s) {
    const E = u.email, a = AS();
    const fill = ln => esc(ln).replace(/［(\d)］/g, (m, n) => {
      const i = +n - 1;
      if (R.mail[i] != null) return `<b class="bz-filled jp">${esc(R.mail[i])}</b>`;
      return i === s.i ? `<span class="bz-blank on">［${n}］？</span>` : `<span class="bz-blank">［${n}］</span>`;
    });
    return `<div class="card bz-card bz-mail">
      <div class="bz-mail-h"><span class="muted">件名</span> <b class="jp">${esc(E.subject)}</b></div>
      <div class="bz-mail-b jp">${E.lines.map(l => `<div>${l ? fill(l) : '&nbsp;'}</div>`).join('')}</div>
      <details class="bz-mail-zh"${a.zh && s.done && s.i === E.blanks.length - 1 ? ' open' : ''}><summary>看中文翻譯</summary>${E.zh.map(l => `<div>${esc(l) || '&nbsp;'}</div>`).join('')}</details>
    </div>
    <p class="bz-ask">［${s.i + 1}］要填什麼？</p>
    ${choiceBtns(s, s.d.opts, () => s.d.exp)}`;
  }
  function quizHTML(s) {
    const d = s.d;
    return `<div class="card bz-card bz-q"><span class="bz-kind">${d.t === 'keigo' ? '🎩 敬語轉換' : '✅ 選擇題'}</span>
      <p class="bz-qq">${esc(d.q)}</p>${d.jp ? `<p class="bz-qjp jp">${esc(d.jp)}</p>` : ''}</div>
      ${choiceBtns(s, d.opts, () => d.exp)}`;
  }
  function orderHTML(s) {
    const d = s.d, used = new Set(s.pick);
    return `<div class="card bz-card bz-q"><span class="bz-kind">🧩 重組句子</span>
      <p class="bz-qq">把詞語排成：「${esc(d.zh)}」</p>
      <div class="bz-ans${s.done ? ' ok' : ''}">${s.pick.length ? s.pick.map((k, i) => `<button type="button" class="bz-chip on jp" data-pick="${i}"${s.done ? ' disabled' : ''}>${esc(d.parts[k])}</button>`).join('') : '<span class="muted">點下面的詞語依序排好</span>'}</div>
      ${s.done ? '' : `<div class="bz-pool">${s.pool.filter(k => !used.has(k)).map(k => `<button type="button" class="bz-chip jp" data-pool="${k}">${esc(d.parts[k])}</button>`).join('')}</div>`}
      ${s.done ? `<div class="bz-fb ok">⭕ ${esc(d.exp)}</div>` : s.bad ? `<div class="bz-fb bad">❌ 順序不對，再排一次。<br><small>正確答案：<span class="jp">${esc(d.parts.join(''))}</span></small></div>` : ''}
      ${s.done ? '' : `<div class="bz-nav"><button type="button" class="btn primary" data-check${s.pick.length === d.parts.length ? '' : ' disabled'}>確認</button></div>`}</div>`;
  }
  function finish(u, R) {
    const pct = R.total ? R.ok / R.total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
    const r = App.reward('biz:' + u.id, stars, '商務');
    delete RUNS[u.id];
    const i = META.findIndex(m => m.id === u.id), nx = META[i + 1];
    const el = document.getElementById('main');
    if (el && onRoute('biz-unit')) el.innerHTML = `<div class="bz"><div class="card bz-card bz-intro"><div class="bz-intro-i">${u.icon}</div><h2>${esc(u.title)}</h2><p>完成！</p>
      <p><button type="button" class="btn" data-again>🔄 再做一次</button><button type="button" class="btn primary" data-list>單元列表</button></p></div></div>`;
    if (el) {
      const a = el.querySelector('[data-again]'); if (a) a.onclick = () => renderUnit(el, { id: u.id });
      const l = el.querySelector('[data-list]'); if (l) l.onclick = () => App.go('biz');
    }
    App.showResult({
      title: stars === 3 ? '完美！商務達人' : stars === 2 ? '過關！' : '完成！再練一次會更好',
      stars, correct: R.ok, total: R.total, gained: r.gained, wrong: R.wrong.slice(0, 8),
      note: `<span class="muted">對話 ${u.dialogue.steps.length} 輪＋Email ${u.email.blanks.length} 格＋測驗 ${u.quiz.length} 題・卡片記住 ${R.known} 張</span>`,
      retry: () => { const m = document.getElementById('main'); if (m) renderUnit(m, { id: u.id }); },
      back: { label: '單元列表', route: 'biz' },
      next: nx ? { label: '下一課 ➜', route: 'biz-unit', params: { id: nx.id } } : { label: '商務閱讀 ➜', route: 'biz' }
    });
  }

  /* ================= 路由 biz-read：商務短文（讀完 → 一題一屏 → 結算） ================= */
  const READS = {};
  function renderRead(el, params) {
    if (!needData(el, 'biz-read', params, renderRead)) return;
    const A = artOf(params && params.id);
    if (!A) { el.innerHTML = '<p class="center bz-load">找不到這篇文章。</p>'; return; }
    const S = READS[A.id] || (READS[A.id] = { ph: 'read', qi: 0, ok: 0, qs: [A.q].concat(A.qs || []).map(q => ({ q, o: App.shuffle([0, 1, 2]), tried: [] })) });
    const draw = keep => { if (!onRoute('biz-read')) return; renderRead(el, params); const f = keep && el.querySelector('.bz-fb'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); };
    const a = AS();
    if (S.ph === 'read') {
      el.innerHTML = `<div class="bz bz-read">
        <div class="bz-head"><div class="bz-head-t"><span>${A.icon} 商務閱讀</span>${lvB(A.lv.toUpperCase())}</div></div>
        <h2 class="jp bz-rt">${esc(A.title)}</h2><p class="muted">${esc(A.zh)}</p>
        ${A.w && A.w.length ? `<details class="bz-gl"${a.kana ? ' open' : ''}><summary>📒 生詞 ${A.w.length} 個</summary><div class="bz-gl-l">${A.w.map(w => `<span class="bz-gw"><b class="jp">${esc(w[0])}</b>${w[1] && w[1] !== w[0] ? `<small class="jp">${esc(w[1])}</small>` : ''}<small>${esc(w[2])}</small></span>`).join('')}</div></details>` : ''}
        <div class="card bz-card bz-paras">${A.p.map(p => `<div class="bz-para">${spk(p[0])}<div><p class="jp bz-pj">${esc(p[0])}</p><p class="bz-zh"${a.zh ? '' : ' hidden'}>${esc(p[1])}</p>${a.zh ? '' : '<button type="button" class="bz-hint" data-hint>中文</button>'}</div></div>`).join('')}</div>
        <div class="bz-nav"><button type="button" class="btn primary" data-start>讀完了，作答（${S.qs.length} 題）➜</button></div></div>`;
      bindCommon(el);
      el.querySelector('[data-start]').onclick = () => { S.ph = 'q'; draw(); };
      return;
    }
    if (S.qi >= S.qs.length) {
      const n = S.qs.length, stars = S.ok === n ? 3 : S.ok >= n - 1 ? 2 : 1;
      const r = App.reward('biz:r:' + A.id, stars, '商務閱讀');
      delete READS[A.id];
      const arts = window.BIZ_READING || [], k = arts.findIndex(x => x.id === A.id), nx = arts[k + 1];
      el.innerHTML = `<div class="bz"><div class="card bz-card bz-intro"><div class="bz-intro-i">${A.icon}</div><h2 class="jp">${esc(A.title)}</h2><p>讀完了！</p></div></div>`;
      App.showResult({ title: stars === 3 ? '全對！' : '讀完了！', stars, correct: S.ok, total: n, gained: r.gained,
        retry: () => renderRead(el, params), back: { label: '商務日語', route: 'biz' },
        next: nx ? { label: '下一篇 ➜', route: 'biz-read', params: { id: nx.id } } : null });
      return;
    }
    const Q = S.qs[S.qi], q = Q.q;
    const opts = Q.o.map(k => {
      const tried = Q.tried.includes(k), cls = tried ? (k === 0 ? ' ok' : ' bad') : (Q.done ? ' dim' : '');
      return `<button type="button" class="bz-opt${cls}" data-o="${k}"${Q.done ? ' disabled' : ''}><span class="${/[぀-ヿ一-鿿]/.test(q[k + 1]) ? 'jp' : ''}">${esc(q[k + 1])}</span></button>`;
    }).join('');
    el.innerHTML = `<div class="bz bz-read">
      <div class="bz-head"><div class="bz-head-t"><span>${A.icon} <span class="jp">${esc(A.title)}</span></span>${lvB(A.lv.toUpperCase())}</div>
      <div class="bar bz-bar"><div style="width:${Math.round(S.qi / S.qs.length * 100)}%"></div></div></div>
      <details class="bz-gl"><summary>回頭看文章</summary>${A.p.map(p => `<p class="jp bz-pj">${esc(p[0])}</p>`).join('')}</details>
      <div class="card bz-card bz-q"><span class="bz-kind">📖 理解題 ${S.qi + 1} / ${S.qs.length}</span><p class="bz-qq ${/[぀-ヿ]/.test(q[0]) ? 'jp' : ''}">${esc(q[0])}</p></div>
      <div class="bz-opts">${opts}</div>
      ${Q.last != null ? `<div class="bz-fb ${Q.done ? 'ok' : 'bad'}">${Q.done ? '⭕ 答對了' : '❌ 不對，再找找文章裡的線索。'}</div>` : ''}
      ${Q.done ? `<div class="bz-nav"><button type="button" class="btn primary" data-n>${S.qi === S.qs.length - 1 ? '看結果 ➜' : '下一題 ➜'}</button></div>` : ''}</div>`;
    el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      if (Q.done) return; const k = +b.dataset.o; if (Q.tried.includes(k)) return;
      if (!Q.tried.length && k === 0) S.ok++;
      Q.tried.push(k); Q.last = k; if (k === 0) Q.done = true; draw(true);
    });
    const nb = el.querySelector('[data-n]'); if (nb) nb.onclick = () => { S.qi++; draw(); };
  }

  App.register('biz', { title: '商務日語', icon: '💼', nav: false, navParent: 'home', render: renderList });
  App.register('biz-unit', { title: '商務日語', icon: '💼', nav: false, navParent: 'home', render: renderUnit });
  App.register('biz-read', { title: '商務閱讀', icon: '💼', nav: false, navParent: 'home', render: renderRead });
  ensureCss();
})();
