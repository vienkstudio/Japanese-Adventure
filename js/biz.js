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
      if (i >= 0) {
        const m = META[i], P = runOf(m.id);
        return { label: '商務日語：' + m.title, sub: P ? `續做：第 ${Math.min(doneCount(P) + 1, secCount(P))} / ${secCount(P)} 小節・每節約 5 分` : `第 ${i + 1} 課・${m.lv}・分 ${secCount({ cards: Array(34) })} 小節，每節約 5 分`, route: 'biz-unit', params: { id: m.id }, icon: m.icon };
      }
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

  /* ---------------- 進度紀錄：只把「真正新學」的送進 Learn；同一項一次單元只記一次 ----------------
     卡片：還沒學過的才出現；「記住了」記一次，首次間隔分散（單字 1–2 天、句子／句型 2–4 天）
     對話／Email／測驗：只有答錯才記（grade 0，進不會清單）；答對不重複記 */
  const SRCN = u => '💼 商務・' + u.title;
  function itemOf(u, ref) {
    const t = ref.slice(0, 1), key = ref.slice(2), src = SRCN(u);
    if (t === 'v') { const v = u.vocab.find(x => x.jp === key); return v ? { id: 'word:' + v.jp, jp: v.jp, kana: v.kana, romaji: rom(v.kana, v.jp), zh: v.zh, source: src } : null; }
    if (t === 'p') {
      let p = u.phrases.find(x => x.jp === key);
      if (!p) u.dialogue.steps.forEach(s => s.choices.forEach(c => { if (c.jp === key) p = c; }));
      return { id: 'phrase:' + key, jp: key, kana: p ? p.kana : '', romaji: p && p.kana ? rom(p.kana, key) : '', zh: p ? p.zh : '', source: src };
    }
    if (t === 'g') { const g = u.grammar.find(x => x.pat === key); return g ? { id: 'phrase:' + g.ex[0][0], jp: g.ex[0][0], zh: g.ex[0][1] + '（' + g.pat + '）', hint: g.conn, source: src } : null; }
    return null;
  }
  // Learn 用的扁平項目（同 BIZ.items 格式＋source「💼 商務」）；不在單元清單內的句子（對話正解）也補讀音中文
  function flatItem(u, ref) {
    const f = (B.items || []).find(x => x.id === ref), it = itemOf(u, ref);
    const o = Object.assign({}, f || { id: ref, type: ref[0] === 'v' ? 'vocab' : ref[0] === 'g' ? 'grammar' : 'phrase', jp: ref.slice(2), kana: it ? it.kana || '' : '', zh: it ? it.zh || '' : '', lv: u.lv, unit: u.id });
    if (it && it.romaji && !o.romaji) o.romaji = it.romaji;
    o.source = SRCN(u);
    return o;
  }
  // 與路線同一個判斷（學過＝狀態不是 new 或答過）
  const learned = ref => { try { const e = window.Learn && Learn.get && Learn.get(ref); return !!(e && (e.s !== 'new' || e.reps > 0)); } catch (er) { return false; } };
  function addWrong(R, u, ref, via, item) {
    const it = item || itemOf(u, ref); if (!it) return;
    if (!via && window.Tracker) try { Tracker.add(it, true); } catch (e) { }
    if (!R.wrong.some(w => w.ref === ref)) R.wrong.push({ ref, jp: it.jp, zh: it.zh || '' });
  }
  function recCard(R, u, ref, g) {
    const P = R.P; if (P.rec[ref]) return;
    P.rec[ref] = 1;
    if (g >= 2) R.known++;
    let e = null, via = false;
    try { if (window.Learn && typeof Learn.record === 'function') { e = Learn.record(ref, g, { src: 'biz', unit: u.id, item: flatItem(u, ref), nosave: true }); via = true; } } catch (er) { }
    if (e && g >= 2 && e.reps === 1) e.due = Date.now() + ((ref[0] === 'v' ? 1 : 2) + Math.random() * (ref[0] === 'v' ? 1 : 2)) * 864e5 - 36e5;
    App.save();
    if (g < 2) addWrong(R, u, ref, via);
  }
  function recWrong(R, u, ref, item) {
    if (!ref) return;
    const P = R.P; if (P.rec[ref] === 2) return;
    P.rec[ref] = 2;
    let via = false;
    try { if (window.Learn && typeof Learn.record === 'function') { Learn.record(ref, 0, { src: 'biz', unit: u.id, item: item || flatItem(u, ref) }); via = true; } } catch (e) { }
    addWrong(R, u, ref, via, item);
  }
  // Email 第 i 格所在的整行（所有空格填正解）→ 複習卡：讀音、中文、羅馬字都有
  function mailItem(u, i) {
    const E = u.email, li = E.lines.findIndex(l => l.includes('［' + (i + 1) + '］'));
    if (li < 0) return null;
    const jp = E.lines[li].replace(/［(\d)］/g, (m, n) => (E.blanks[+n - 1] || { opts: [''] }).opts[0]).replace(/^■/, '');
    const kana = (E.kana && E.kana[li]) || '';
    return { id: 'p:' + jp, type: 'phrase', jp, kana, romaji: kana ? rom(kana, jp) : '', zh: (E.zh[li] || '').replace(/^■/, ''), lv: u.lv, unit: u.id, source: SRCN(u) };
  }

  /* ---------------- 單元進度存檔：App.state.bizRun[id] = {cards, skip, done[], ok, total, known, wrong[], rec{}} ---------------- */
  const RS = () => { const S = App.state; if (!S.bizRun || typeof S.bizRun !== 'object') S.bizRun = {}; return S.bizRun; };
  const runOf = id => { try { return RS()[id] || null; } catch (e) { return null; } };
  const CARD_MAX = 10;   // 與路線（path.js）同一套切法：單字每 10 張一節、句子＋句型每 10 張一節
  const secCount = P => (P && P.n) || Math.ceil(((P && P.cards) || []).length / 12) + 2;
  const doneCount = P => ((P && P.done) || []).filter(Boolean).length;

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
        const s = starsOf(u.id), P = runOf(u.id);
        return `<button type="button" class="bz-unit${s ? ' done' : ''}" data-unit="${esc(u.id)}">
          <span class="bz-u-i">${u.icon}</span>
          <span class="bz-u-tx"><b>${i + 1}. ${esc(u.title)}</b><small>${esc(u.zh)}</small>
            <span class="bz-u-meta">${lvB(u.lv)}${P ? `<span class="bz-rec">續做 ${doneCount(P)}/${secCount(P)} 小節</span>` : u.lv === lvNow ? '<span class="bz-rec">適合你</span>' : ''}<span class="bz-stars" aria-label="${s} 星">${'⭐'.repeat(s)}${'☆'.repeat(3 - s)}</span></span></span>
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

  /* ================= 路由 biz-unit：小節（每節 ≤15 步、約 5 分）＝卡片 ×N → 對話 → Email＋測驗 ================= */
  const RUNS = {};
  const normS = s => String(s || '').replace(/[\s　]/g, '').replace(/[。．！？!?]+$/, '');
  const hasKana = s => /[ぁ-ゟァ-ヿ]/.test(s || '');
  const refOf = c => c.k === 'v' ? 'v:' + c.d.jp : c.k === 'p' ? 'p:' + c.d.jp : 'g:' + String(c.d.gid || c.d.pat).replace(/^gram:/, '');
  // 卡片小節的切法（路線 Path 也用這個）：[{k:'v'|'p', title, short, cards:[{k,d}], refs}]
  function parts(u) {
    const split = (a, n) => { const k = Math.ceil(a.length / n), o = []; for (let i = 0; i < k; i++) o.push(a.slice(Math.floor(a.length * i / k), Math.floor(a.length * (i + 1) / k))); return o; };
    const out = [], V = (u.vocab || []).map(d => ({ k: 'v', d })), PG = (u.phrases || []).map(d => ({ k: 'p', d })).concat((u.grammar || []).map(d => ({ k: 'g', d })));
    split(V, CARD_MAX).forEach((cards, i, all) => out.push({ k: 'v', title: '單字' + (all.length > 1 ? ' ' + (i + 1) : ''), cards }));
    const ps = split(PG, CARD_MAX);
    ps.forEach((cards, i) => out.push({ k: 'p', title: (cards.some(c => c.k === 'g') ? '句子＋句型' : '句子') + (ps.length > 1 ? ' ' + (i + 1) : ''), cards }));
    return out.map((x, i) => Object.assign(x, { n: i + 1, refs: x.cards.map(refOf) }));
  }
  B.parts = parts;
  // 測驗題與剛看過的卡片／對話選項一模一樣 → 換呈現：填空（去掉共同頭尾）或選情境／選意思
  function remix(u, d, h) {
    const o = d.opts.map(String), z = o[0];
    let a = 0; while (o.every(x => a < x.length && x[a] === z[a])) a++;
    let b = 0; while (o.every(x => b < x.length - a && x[x.length - 1 - b] === z[z.length - 1 - b])) b++;
    const mids = o.map(x => x.slice(a, x.length - b)), pre = z.slice(0, a), suf = z.slice(z.length - b);
    if ((pre + suf).replace(/[、。，！？!?\s　]/g, '').length >= 2 && mids.every(Boolean) && new Set(mids).size === mids.length)
      return { t: 'cloze', q: d.q + (d.jp ? `（原句：${d.jp}）` : ''), jp: pre + '（　　）' + suf, opts: mids, exp: d.exp, ref: d.ref };
    const key = h.when ? 'when' : 'zh', right = h[key];
    const wrong = App.shuffle(u.phrases.filter(p => normS(p.jp) !== normS(h.jp)).map(p => p[key]).filter(x => x && x !== right)).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 2);
    if (!right || wrong.length < 2) return d;
    return { t: key === 'when' ? 'when' : 'mean', q: key === 'when' ? '這句話最適合用在什麼情況？' : '這句話是什麼意思？', jp: z, opts: [right].concat(wrong), exp: d.exp, ref: d.ref };
  }
  function quizSteps(u, sh) {
    const seen = u.phrases.map(p => ({ jp: p.jp, zh: p.zh, when: p.when }));
    u.dialogue.steps.forEach(st => st.choices.forEach(c => seen.push({ jp: c.jp, zh: c.zh, when: '' })));
    const hit = jp => { const n = normS(jp); return n.length >= 4 ? seen.find(x => { const m = normS(x.jp); return m === n || (n.length >= 8 && m.includes(n)); }) : null; };
    return u.quiz.map((d0, i) => {
      let d = d0;
      if (d.t !== 'order' && hasKana(d.opts[0])) { const h = hit(d.opts[0]); if (h) d = remix(u, d, h); }
      return d.t === 'order' ? { k: 'o', st: 'quiz', d, i, pool: sh(d.parts.length), pick: [] } : { k: 'q', st: 'quiz', d, i, o: sh(d.opts.length), tried: [] };
    });
  }
  // 小節＝路線同一套：單字 1／單字 2／句子 1／句子＋句型 2…（卡片）→ 對話演練 → Email＋小測驗
  // 卡片小節的進度看 Learn（在路線、今日課學過的卡算數，不重做）；已學過的卡在小節裡略過
  function build(u) {
    const sh = n => App.shuffle([...Array(n).keys()]);
    const PS = parts(u);
    let P = runOf(u.id);
    if (P && P.v !== 2) {   // 舊存檔（卡片小節每 12 張、只放沒學過的卡）：只保留對話、Email 兩節的完成狀態
      const nOld = Math.ceil(((P.cards || []).length) / 12), d = P.done || [];
      P = Object.assign({}, P, { v: 2, done: [] }); P.done[PS.length] = !!d[nOld]; P.done[PS.length + 1] = !!d[nOld + 1];
      RS()[u.id] = P;
    }
    if (!P) P = { v: 2, done: [], ok: 0, total: 0, known: 0, wrong: [], rec: {} };
    P.rec = P.rec || {}; P.done = P.done || []; P.wrong = P.wrong || []; P.n = PS.length + 2;
    PS.forEach((x, i) => { if (x.refs.every(learned)) P.done[i] = true; });
    P.skip = PS.reduce((n, x) => n + x.refs.filter(learned).length, 0);
    const secs = [], steps = [];
    const add = (title, short, icon, list, extra) => { secs.push(Object.assign({ title, short, icon, from: steps.length, to: steps.length + list.length }, extra || {})); steps.push(...list); };
    PS.forEach((x, i) => {
      const cards = P.done[i] ? x.cards : x.cards.filter(c => !learned(refOf(c)));
      add(x.title, x.title, x.k === 'v' ? '🔤' : '💬', (cards.length ? cards : x.cards).map(c => ({ k: c.k, st: 'card', d: c.d })), { part: x.n });
    });
    add('對話演練', '對話', '🗣️', [{ k: 'sec', st: 'dlg' }].concat(u.dialogue.steps.map((d, i) => ({ k: 'd', st: 'dlg', d, i, o: sh(d.choices.length), tried: [] }))));
    add('Email＋小測驗', '信＋測驗', '✉️', [{ k: 'sec', st: 'mail' }].concat(u.email.blanks.map((d, i) => ({ k: 'm', st: 'mail', d, i, o: sh(d.opts.length), tried: [] })), [{ k: 'sec', st: 'quiz' }], quizSteps(u, sh)));
    return { id: u.id, P, steps, secs, cur: -1, brk: -1, i: 0, ok: 0, total: 0, known: 0, wrong: [], mail: [] };
  }
  const SEC_T = { card: 15, d: 30, m: 25, q: 25, o: 30, sec: 5 };
  const secMin = (R, c) => Math.max(1, Math.round(R.steps.slice(R.secs[c].from, R.secs[c].to).reduce((n, s) => n + (SEC_T[s.st === 'card' ? 'card' : s.k] || 20), 0) / 60));
  const nextSec = R => R.secs.findIndex((x, i) => !R.P.done[i]);
  function startSec(u, c) {
    const old = RUNS[u.id];
    if (old && !runOf(u.id)) RS()[u.id] = old.P;   // 新單元第一次開始：P（卡片清單）此時才存檔
    const R = RUNS[u.id] = build(u);   // 每次進小節重建（題目狀態歸零），存檔 P 沿用
    RS()[u.id] = R.P;
    R.cur = c; R.i = R.secs[c].from; R.redo = !!R.P.done[c];
    App.save();
    return R;
  }
  function endSec(u, R) {
    const P = R.P, c = R.cur;
    if (!R.redo) {
      P.ok += R.ok; P.total += R.total; P.known += R.known; P.done[c] = true;
      R.wrong.forEach(w => { if (!P.wrong.some(x => x.ref === w.ref)) P.wrong.push(w); });
    }
    R.cur = -1; R.brk = c; R.ok = R.total = R.known = 0; R.wrong = []; R.mail = [];
    App.save();
    if (nextSec(R) < 0) R.fin = true;
  }
  // 打擊感（評審 v15 P1-7）：和活動框架同一套——答對音效（3 連升調）、粒子、浮字 +1／🔥n、輕震；答錯錯誤音＋雙震、連擊歸零
  function hitFX(R, ok, el) {
    const G = window.Game; if (!G) return;
    try {
      if (ok) { R.combo = (R.combo || 0) + 1; R.best = Math.max(R.best || 0, R.combo); G.sfx(R.combo >= 3 ? 'combo' : 'ok', R.combo); G.vibrate && G.vibrate(15); if (el) { G.burst && G.burst(el, 12); G.floatText && G.floatText(el, R.combo >= 3 ? '🔥' + R.combo : '+1'); } G.bump && G.bump('ok'); }
      else { R.combo = 0; G.sfx('ng'); G.vibrate && G.vibrate([60, 40, 60]); if (el) G.floatText && G.floatText(el, '✗', true); }
    } catch (e) { }
  }
  // 計分：對話、Email、測驗第一次作答
  function score(R, step, correct) {
    if (step.scored) return;
    step.scored = true; R.total++; if (correct) R.ok++;
  }
  function secList(R) {
    const nx = nextSec(R);
    return `<ol class="bz-secs">${R.secs.map((x, i) => {
      const d = !!R.P.done[i], on = i === nx;
      return `<li><button type="button" class="bz-secb${d ? ' done' : on ? ' on' : ''}" data-sec="${i}"><span class="bz-secn">${d ? '✓' : i + 1}</span><span class="bz-sect">${x.icon} ${esc(x.title)}</span><small>${x.to - x.from} 步・約 ${secMin(R, i)} 分</small></button></li>`;
    }).join('')}</ol>`;
  }
  function renderUnit(el, params) {
    if (!needData(el, 'biz-unit', params, renderUnit)) return;
    const u = unitOf(params && params.id);
    if (!u) { el.innerHTML = '<p class="center bz-load">找不到這個單元。</p>'; return; }
    let R = RUNS[u.id];
    // 不在小節中：重建，讓路線、今日課剛學的卡立刻反映到小節進度
    if (!R || (R.cur < 0 && !R.fin)) R = RUNS[u.id] = Object.assign(build(u), { brk: R ? R.brk : -1 });
    if (R.fin) { finish(u, R); return; }
    // 從路線進來：{id, sec:'dlg'|'mail'|小節序號}（路線點哪一節就從哪一節開始）；只用一次
    if (params && params.sec != null && !params._used && R.cur < 0) {
      params._used = true;
      const c = params.sec === 'dlg' || params.sec === 'mail' ? R.secs.findIndex(x => R.steps[x.from].st === params.sec) : +params.sec;
      if (c >= 0 && c < R.secs.length) { R = startSec(u, c); }
    }
    const draw = keep => { if (!onRoute('biz-unit')) return; renderUnit(el, params); const f = keep && el.querySelector('.bz-fb'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); };
    const begin = c => { startSec(u, c); draw(); };
    const skipCards = () => { R.secs.forEach((x, i) => { if (R.steps[x.from].st === 'card') R.P.done[i] = true; }); begin(R.secs.findIndex(x => R.steps[x.from].st === 'dlg')); };
    const bindHome = () => {
      el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => begin(+b.dataset.sec));
      const k = el.querySelector('[data-skipcards]'); if (k) k.onclick = skipCards;
      const l = el.querySelector('[data-list]'); if (l) l.onclick = () => App.go('biz');
    };
    // 單元首頁：小節進度（可中途離開，回來從未完成的小節繼續）
    if (R.cur < 0) {
      const nx = nextSec(R), nDone = doneCount(R.P), nS = R.secs.length, brk = R.brk >= 0 ? R.secs[R.brk] : null;
      const cardsLeft = R.secs.some((x, i) => R.steps[x.from].st === 'card' && !R.P.done[i]);
      const top = brk ? `<div class="bz-intro-i">✅</div><h2>小節完成！</h2><p>${brk.icon} ${esc(brk.title)}</p>
          <p class="muted">可以先休息，下次回來會從第 ${nx + 1} 小節繼續。</p>`
        : `<div class="bz-intro-i">${u.icon}</div><h2>${esc(u.title)}</h2><p class="muted">${esc(u.zh)}</p><p class="bz-goal">🎯 ${esc(u.goal)}</p>`;
      el.innerHTML = `<div class="bz bz-run"><div class="card bz-card bz-intro">${top}
        <div class="bz-prog"><div class="bar"><div style="width:${Math.round(nDone / nS * 100)}%"></div></div><span>小節 ${nDone} / ${nS}</span></div>
        ${secList(R)}
        ${R.P.skip ? `<p class="muted bz-skipn">已學過的 ${R.P.skip} 張卡片自動略過</p>` : ''}</div>
        <div class="bz-nav">${brk ? '<button type="button" class="btn" data-list>先休息</button>' : cardsLeft ? '<button type="button" class="btn" data-skipcards>已經會了，跳過卡片 ›</button>' : ''}
          <button type="button" class="btn primary bz-next" data-sec="${nx}">${brk ? '▶ 下一小節' : nDone ? '▶ 繼續第 ' + (nx + 1) + ' 小節' : '▶ 開始第 1 小節'}</button></div></div>`;
      bindHome();
      return;
    }
    const S0 = R.secs[R.cur], s = R.steps[R.i];
    const lastInSec = R.i === S0.to - 1, last = R.i === R.steps.length - 1;
    const go = n => { R.i = n; if (R.i >= S0.to) endSec(u, R); draw(); };
    const head = `<div class="bz-head">
      <div class="bz-head-t"><span>${u.icon} ${esc(u.title)}</span>${lvB(u.lv)}</div>
      <div class="bz-stages">${R.secs.map((x, i) => `<span class="${i === R.cur ? 'on' : R.P.done[i] ? 'past' : ''}">${R.P.done[i] && i !== R.cur ? '✓ ' : ''}${esc(x.short)}</span>`).join('')}</div>
      <div class="bar bz-bar"><div style="width:${Math.round((R.i - S0.from) / (S0.to - S0.from) * 100)}%"></div></div>
    </div>`;
    let body = '';
    const nextBtn = (label, extra) => `<div class="bz-nav">${extra || ''}<button type="button" class="btn primary bz-next" data-next>${label || '下一步 ➜'}</button></div>`;
    const endLabel = d => last ? '看結果 ➜' : lastInSec ? '完成這一小節 ➜' : d;
    if (s.k === 'v' || s.k === 'p' || s.k === 'g') {
      body = cardHTML(u, s) + `<div class="bz-nav bz-rate">
        <button type="button" class="btn" data-rate="1">🔁 還不熟</button>
        <button type="button" class="btn primary" data-rate="2">✓ 記住了</button></div>
        <p class="center"><button type="button" class="btn ghost sm" data-skipcards>跳過卡片，直接對話演練 ›</button></p>`;
    } else if (s.k === 'sec') {
      const T = { dlg: ['💬', '對話演練', `情境：${u.dialogue.title}。每一輪選出最得體的說法，答錯可以再選一次。`], mail: ['✉️', 'Email 填空', `${u.email.title}：把空格填上最適合的說法。`], quiz: ['📝', '小測驗', `填空、選情境、重組句子、敬語轉換，共 ${u.quiz.length} 題。`] }[s.st];
      body = `<div class="card bz-card bz-intro"><div class="bz-intro-i">${T[0]}</div><h2>${T[1]}</h2><p>${esc(T[2])}</p>
        ${s.st === 'dlg' && R.P.known ? `<p class="muted">卡片已記住 ${R.P.known} 張。</p>` : ''}</div>` + nextBtn('開始 ➜');
    } else if (s.k === 'd') {
      body = dlgHTML(u, s) + (s.done ? nextBtn(endLabel('下一步 ➜')) : '');
    } else if (s.k === 'm') {
      body = mailHTML(u, R, s) + (s.done ? nextBtn(s.i === u.email.blanks.length - 1 ? '完成 Email ➜' : '下一格 ➜') : '');
    } else if (s.k === 'q') {
      body = quizHTML(s) + (s.done ? nextBtn(endLabel('下一題 ➜')) : '');
    } else if (s.k === 'o') {
      body = orderHTML(s) + (s.done ? nextBtn(endLabel('下一題 ➜')) : '');
    }
    el.innerHTML = `<div class="bz bz-run">${head}${body}<p class="bz-count muted">小節 ${R.cur + 1}/${R.secs.length}・${R.i - S0.from + 1} / ${S0.to - S0.from}</p></div>`;
    bindCommon(el);
    const nb = el.querySelector('[data-next]'); if (nb) nb.onclick = () => go(R.i + 1);
    el.querySelectorAll('[data-skipcards]').forEach(b => b.onclick = skipCards);
    el.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      recCard(R, u, refOf(s), +b.dataset.rate);
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
      if (s.tried.length === 1 && !correct) {
        if (s.k === 'm') { const it = mailItem(u, s.i); if (it) recWrong(R, u, it.id, it); }
        else recWrong(R, u, ref);
      }
      if (correct) { s.done = true; if (s.k === 'm') R.mail[s.i] = s.d.opts[0]; }
      if (correct) App.speak && s.k === 'd' && App.speak(s.d.choices[k].jp);
      hitFX(R, correct, b);
      draw(true);
    });
    // 重組
    el.querySelectorAll('[data-pool]').forEach(b => b.onclick = () => { if (s.done) return; s.pick.push(+b.dataset.pool); s.bad = false; if (s.pick.length === s.d.parts.length) return check(b); draw(); });   // 排完自動檢查
    el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { if (s.done) return; s.pick.splice(+b.dataset.pick, 1); s.bad = false; draw(); });
    function check(btn) {
      const ans = s.pick.map(i => s.d.parts[i]).join(''), correct = ans === s.d.parts.join('');
      const first = !s.scored;
      score(R, s, correct);
      if (first && !correct) recWrong(R, u, s.d.ref);
      if (correct) { s.done = true; App.speak(s.d.parts.join('')); } else { s.bad = true; s.pick = []; }
      hitFX(R, correct, btn || el.querySelector('.bz-ans'));
      draw(true);
    }
    const ck = el.querySelector('[data-check]');
    if (ck) ck.onclick = () => check(ck);
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
      return `<button type="button" class="bz-opt${cls}" data-opt="${k}"${s.done ? ' disabled' : ''}>${typeof c === 'string' ? `<span${hasKana(c) ? ' class="jp"' : ''}>${esc(c)}</span>` : optTxt(c, tried || s.done)}</button>`;
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
  const QKIND = { keigo: '🎩 敬語轉換', cloze: '✏️ 填空', when: '🕒 選情境', mean: '🈯 選意思' };
  function quizHTML(s) {
    const d = s.d;
    return `<div class="card bz-card bz-q"><span class="bz-kind">${QKIND[d.t] || '✅ 選擇題'}</span>
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
      ${s.done ? '' : `<div class="bz-nav bz-chk"><button type="button" class="btn primary" data-check${s.pick.length === d.parts.length ? '' : ' disabled'}>✓ 檢查</button></div>`}</div>`;
  }
  function finish(u, R) {
    const P = R.P, pct = P.total ? P.ok / P.total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
    try { delete RS()[u.id]; } catch (e) { }
    delete RUNS[u.id];
    const r = App.reward('biz:' + u.id, stars, '商務');
    const i = META.findIndex(m => m.id === u.id), nx = META[i + 1];
    const el = document.getElementById('main');
    if (el && onRoute('biz-unit')) el.innerHTML = `<div class="bz"><div class="card bz-card bz-intro"><div class="bz-intro-i">${u.icon}</div><h2>${esc(u.title)}</h2><p class="bz-stars" aria-label="${stars} 星">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><p>完成！答對 ${P.ok}／${P.total}${R.best >= 2 ? `・最佳連擊 🔥${R.best}` : ''}</p>
      <p><button type="button" class="btn" data-again>🔄 再做一次</button><button type="button" class="btn primary" data-list>單元列表</button></p></div></div>`;
    try { const G = window.Game; if (G) { G.sfx(stars >= 2 ? 'win' : 'star'); if (stars >= 2 && G.confetti && !(G.reduced && G.reduced())) G.confetti(70); } } catch (e) { }
    if (el) {
      const a = el.querySelector('[data-again]'); if (a) a.onclick = () => renderUnit(el, { id: u.id });
      const l = el.querySelector('[data-list]'); if (l) l.onclick = () => App.go('biz');
    }
    App.showResult({
      title: stars === 3 ? '完美！商務達人' : stars === 2 ? '過關！' : '完成！再練一次會更好',
      stars, correct: P.ok, total: P.total, gained: r.gained, wrong: P.wrong.slice(0, 8),
      note: `<span class="muted">對話 ${u.dialogue.steps.length} 輪＋Email ${u.email.blanks.length} 格＋測驗 ${u.quiz.length} 題・新卡片記住 ${P.known} 張</span>`,
      retry: () => { const m = document.getElementById('main'); if (m) renderUnit(m, { id: u.id }); },
      back: { label: '單元列表', route: 'biz' },
      next: nx ? { label: '下一課 ➜', route: 'biz-unit', params: { id: nx.id } } : { label: '商務閱讀 ➜', route: 'biz' }
    });
  }

  /* ================= 路由 biz-read：商務短文（讀完 → 一題一屏 → 結算） ================= */
  const READS = {};
  const RD_SRC = ['js/jp-text.js', 'js/link-import.js', 'js/reader.js'];
  const rdOK = () => !!(window.Reader && Reader.tokensHTML && window.JPText && JPText.size);
  let rdLoad = null;
  const loadReader = () => rdLoad || (rdLoad = RD_SRC.reduce((p, s) => p.then(() => App.loadScript(s)), Promise.resolve()).then(() => JPText.ready()).catch(e => { rdLoad = null; throw e; }));
  function renderRead(el, params) {
    if (!needData(el, 'biz-read', params, renderRead)) return;
    const A = artOf(params && params.id);
    if (!A) { el.innerHTML = '<p class="center bz-load">找不到這篇文章。</p>'; return; }
    const S = READS[A.id] || (READS[A.id] = { ph: 'read', qi: 0, ok: 0, qs: [A.q].concat(A.qs || []).map(q => ({ q, o: App.shuffle([0, 1, 2]), tried: [] })) });
    const draw = keep => { if (!onRoute('biz-read')) return; renderRead(el, params); const f = keep && el.querySelector('.bz-fb'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); };
    const a = AS();
    if (S.ph === 'read') {
      // 讀音／羅馬字／中文切換與點詞查義：沿用閱讀器的 JPText＋Reader（tokensHTML、wordCard、pref）
      if (!rdOK()) {
        el.innerHTML = '<p class="center muted bz-load">📖 準備字典中…</p>';
        loadReader().then(() => { if (onRoute('biz-read')) renderRead(el, params); }, () => { S.plain = true; if (onRoute('biz-read')) renderRead(el, params); });
        if (!S.plain) return;
      }
      const R = rdOK() && !S.plain;
      if (R && !S.tk) S.tk = A.p.map(p => JPText.tokenize(p[0]));
      const P = R ? Reader.pref() : { y: a.kana, r: false, z: a.zh };
      const tg = R ? `<div class="rd-tg bz-tg" role="group" aria-label="顯示">${[['y', '讀音'], ['r', '羅馬字'], ['z', '中文']].map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${!!P[k]}" class="${P[k] ? 'on' : ''}">${l}</button>`).join('')}</div>` : '';
      el.innerHTML = `<div class="bz bz-read">
        <div class="bz-head"><div class="bz-head-t"><span>${A.icon} 商務閱讀</span>${lvB(A.lv.toUpperCase())}</div>${tg}</div>
        <h2 class="jp bz-rt">${esc(A.title)}</h2><p class="muted">${esc(A.zh)}</p>
        ${A.w && A.w.length ? `<details class="bz-gl"${a.kana ? ' open' : ''}><summary>📒 生詞 ${A.w.length} 個</summary><div class="bz-gl-l">${A.w.map(w => `<span class="bz-gw"><b class="jp">${esc(w[0])}</b>${w[1] && w[1] !== w[0] ? `<small class="jp">${esc(w[1])}</small>` : ''}<small>${esc(w[2])}</small></span>`).join('')}</div></details>` : ''}
        ${R ? `<p class="muted bz-tip">👆 點任何一個詞：看讀音、中文，加入不會清單</p>
        <div class="card bz-card bz-paras rd-doc daily${P.y ? ' y' : ''}${P.r ? ' r' : ''}${P.z ? ' z' : ''}" lang="ja">${A.p.map((p, k) => `<div class="bz-para">${spk(p[0])}<div><p class="rd-p bz-pj">${Reader.tokensHTML(S.tk[k], k)}</p><p class="rd-zh bz-zh">${esc(p[1])}</p></div></div>`).join('')}</div>`
        : `<div class="card bz-card bz-paras">${A.p.map(p => `<div class="bz-para">${spk(p[0])}<div><p class="jp bz-pj">${esc(p[0])}</p><p class="bz-zh"${a.zh ? '' : ' hidden'}>${esc(p[1])}</p>${a.zh ? '' : '<button type="button" class="bz-hint" data-hint>中文</button>'}</div></div>`).join('')}</div>`}
        <div class="bz-nav"><button type="button" class="btn primary" data-start>讀完了，作答（${S.qs.length} 題）➜</button></div></div>`;
      bindCommon(el);
      el.querySelector('[data-start]').onclick = () => { S.ph = 'q'; draw(); };
      if (R) {
        const doc = el.querySelector('.rd-doc');
        el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
          const k = b.dataset.t, v = !b.classList.contains('on');
          b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); doc.classList.toggle(k, v); Reader.setPref(k, v);
        });
        doc.addEventListener('click', e => {
          const w = e.target.closest('.rd-w'); if (!w || !w.dataset.k) return;
          const [pi, ti] = w.dataset.k.split(':').map(Number), t = (S.tk[pi] || [])[ti];
          if (!t) return;
          const text = A.p[pi][0], sent = (JPText.sentences(text).find(x => t.i >= x.i && t.i < x.i + x.s.length) || { s: text }).s.trim();
          el.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel'));
          w.classList.add('sel');
          Reader.wordCard(t, { title: A.title, sentence: sent, zh: JPText.sentences(text).length === 1 ? A.p[pi][1] : '', source: '💼 商務閱讀', onClose: () => { w.classList.remove('sel'); if (Reader.syncTrackBtns) Reader.syncTrackBtns(el); } });
        });
        // 有字典沒收的漢字詞 → 再載 N2/N1 詞庫重算一次
        if (!S.full && S.tk.some(r => JPText.hasUnknown(r))) { S.full = true; JPText.ready(true).then(() => { S.tk = A.p.map(p => JPText.tokenize(p[0])); if (onRoute('biz-read') && S.ph === 'read') renderRead(el, params); }).catch(() => { }); }
      }
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
