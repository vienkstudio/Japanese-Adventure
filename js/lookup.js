/* 查（路由 lookup，導覽 3）：一個搜尋框跨「手冊句子、MIND 單字與文法、外來語、我的文章與歌曲」＋依目的的工具卡。
   依賴：App、Phrasebook（js/phrasebook.js，⭐ 必備＋🆘 緊急句、大字出示）、Phrase（羅馬字）。
   其他資料搜尋時才載入：SCENES（data/scenes-*.js）、MIND（data/mind/grammar.js、lex-n*.js）、LOAN（data/loan.js）；
   我的文章／歌曲直接讀 IndexedDB 索引（docs:index、songs:index），不必先載入 reader／songs。
   旅遊：🆘 緊急置頂、常用句點一下就全螢幕大字（給店員看）；冷啟動 → 查 → 點句子＝2 步，打字搜尋＝3 步。
   樣式 css/lookup.css（前綴 lk-）。 */
(function () {
  'use strict';
  const esc = App.esc;
  const SCN = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const UI = { q: '' };

  /* ---------- 載入（同一檔只載一次；失敗不擋搜尋） ---------- */
  const P = {};
  const load = src => P[src] || (P[src] = App.loadScript(src).catch(() => { }));
  const seq = list => list.reduce((p, s) => p.then(() => load(s)), Promise.resolve());
  let more = null;   // 搜尋需要的資料：第一次打字才開始載
  function loadMore(onEach) {
    if (more) return more;
    const tick = () => { try { onEach(); } catch (e) { } };
    return (more = Promise.all([
      seq(SCN).then(tick),
      load('data/mind/grammar.js').then(() => { GRAM = null; tick(); }),
      load('data/loan.js').then(tick),
      Promise.all(LVS.map(l => load('data/mind/lex-' + l.toLowerCase() + '.js').then(() => { delete WORDS[l]; tick(); }))),
      mine().then(tick)
    ]));
  }

  /* ---------- 正規化 ---------- */
  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const toKata = s => String(s || '').replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const norm = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[\s'’\-・。、！？!?〜~～「」（）()]/g, '');
  const isAscii = s => /^[\x00-\x7f]+$/.test(s);
  const MAC = { ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o' };
  const romN = s => String(s || '').toLowerCase().replace(/[āīūēō]/g, c => MAC[c]).replace(/[^a-z]/g, '').replace(/([aiueo])\1+/g, '$1').replace(/ou/g, 'o');
  const rom = k => { try { return window.Phrase && Phrase.romaji ? Phrase.romaji(k) : ''; } catch (e) { return ''; } };

  /* ---------- MIND 單字／文法 ---------- */
  const WORDS = {};
  const jp0 = s => (String(s).split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || s;
  function words(lv) {
    if (WORDS[lv]) return WORDS[lv];
    const raw = window.MIND && MIND.lex && MIND.lex[lv]; if (!raw) return [];
    return (WORDS[lv] = raw.map((a, i) => {
      const jp = jp0(a[0]), kana = String(a[1] || '').replace(/\s*[（(].*?[）)]/g, '') || jp;
      return { id: 'w:' + lv + ':' + i, lv, jp, kana, zh: a[2] || '', core: !!a[7], nj: norm(jp), nk: toHira(norm(kana)), r: null };
    }));
  }
  let GRAM = null;
  const grams = () => GRAM || (GRAM = ((window.MIND && MIND.gram) || []).map(g => ({ id: g.id, lv: g.lv, jp: g.pat, zh: g.zh || '', nj: norm(g.pat) })));
  const lvI = l => { const i = LVS.indexOf(l); return i < 0 ? 9 : i; };
  function findWords(q, qh, qa, n) {
    const out = [];
    LVS.forEach(lv => words(lv).forEach(w => {
      let s = 9;
      if (w.nj === q || w.nk === qh) s = 0;
      else if (w.nj.startsWith(q) || w.nk.startsWith(qh)) s = 1;
      else if (w.nj.includes(q) || (qh.length > 1 && w.nk.includes(qh))) s = 3;
      else if (!qa && w.zh.includes(q)) s = w.zh.split(/[；;、，]/).some(z => norm(z) === q) ? 1 : 2;
      else if (qa && q.length >= 3) { if (w.r == null) w.r = romN(rom(w.kana)); const r = romN(q); if (w.r === r) s = 1; else if (w.r.startsWith(r)) s = 2; }
      if (s < 9) out.push([s - (w.core ? 0.5 : 0) + lvI(lv) * 0.1, w]);
    }));
    return out.sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  }
  function findGram(q, qa, n) {
    if (qa) return [];
    const out = [];
    grams().forEach(g => {
      let s = 9;
      if (g.nj === q) s = 0; else if (g.nj.includes(q)) s = 1; else if (g.zh.includes(q)) s = 2;
      if (s < 9) out.push([s + lvI(g.lv) * 0.1, g]);
    });
    return out.sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  }

  /* ---------- 外來語 LOAN ---------- */
  let LKEYS = null;
  function findLoan(q, qa, n) {
    const L = window.LOAN; if (!L) return [];
    if (!LKEYS) LKEYS = Object.keys(L).filter(k => L[k][0] !== 'ja');
    const qk = toKata(q), out = [];
    for (const k of LKEYS) {
      const e = L[k], src = String(e[1] || '').toLowerCase();
      let s = 9;
      if (k === qk) s = 0; else if (!qa && qk.length >= 2 && k.includes(qk)) s = 1;
      else if (qa && q.length >= 3 && src.replace(/[^a-z]/g, '').includes(q)) s = src === q ? 0 : 2;
      if (s < 9) out.push([s + k.length / 100, k]);
    }
    return out.sort((a, b) => a[0] - b[0]).slice(0, n).map(x => ({ jp: x[1], o: window.Loan ? Loan.get(x[1]) : null, e: L[x[1]] }));
  }

  /* ---------- 我的文章與歌曲（IndexedDB 索引） ---------- */
  let MINE = { docs: [], songs: [] }, mineP = null;
  const mine = () => mineP || (mineP = Promise.all([App.idb.get('docs:index'), App.idb.get('songs:index')])
    .then(([d, s]) => { MINE = { docs: Array.isArray(d) ? d : [], songs: Array.isArray(s) ? s : [] }; })
    .catch(() => { }));
  const plain = s => String(s || '').replace(/｜([^｜《》\n]+)《[^《》\n]+》/g, '$1');
  function findMine(q, n) {
    const hit = t => norm(plain(t)).includes(q) || toHira(norm(plain(t))).includes(toHira(q));
    return MINE.songs.filter(x => hit(x.title)).map(x => ({ k: 'song', id: x.id, t: plain(x.title) }))
      .concat(MINE.docs.filter(x => hit(x.title)).map(x => ({ k: 'doc', id: x.id, t: plain(x.title) }))).slice(0, n);
  }

  /* ---------- 畫面 ---------- */
  let KEYS = [];
  const key = w => { KEYS.push(w); return KEYS.length - 1; };
  const PB = () => window.Phrasebook || null;
  const romOf = w => { const pb = PB(); return pb && pb.showRom && pb.showRom() && pb.romOf ? pb.romOf(w) : ''; };
  const kanaOf = w => { const pb = PB(); return pb && pb.kanaOf ? pb.kanaOf(w) : ''; };
  function phRow(w) {
    const k = key(w), kn = kanaOf(w), rm = romOf(w);
    return `<button type="button" class="lk-ph" data-big="${k}" aria-label="${esc(w.zh)}：放大給店員看">
      <span class="t"><b lang="ja">${esc(w.jp)}</b>${kn ? `<small lang="ja">${esc(kn)}</small>` : ''}${rm ? `<small class="rm">${esc(rm)}</small>` : ''}<span class="zh">${esc(w.zh)}</span></span><span class="go" aria-hidden="true">📢</span></button>`;
  }
  const lvB = lv => lv ? `<span class="lv-b ${String(lv).toLowerCase()}">${esc(lv)}</span>` : '';

  // 旅遊常用句（點一下就大字）：從手冊 ⭐ 必備挑
  const QUICK = ['袋はいりません。', 'これをください。', 'これはいくらですか。', 'カードで払えますか。', 'トイレはどこですか。', '免税できますか。'];
  const quick = n => { const pb = PB(); if (!pb || !pb.MUST) return []; return QUICK.map(j => pb.MUST.find(w => w.jp === j)).filter(Boolean).slice(0, n); };

  const TOOLS = {
    travel: [['phrasebook', { cat: 'must' }, '📖', '旅遊快查手冊', '點餐、購物、交通、住宿；可大字給店員看']],
    exam: [['kb', { p: 'db', kind: 'word' }, '📘', '字典', 'N5–N1 單字、讀音、例句'], ['kb', { p: 'db', kind: 'gram' }, '📗', '文法', '句型、接續、例句']],
    work: [['kb', { p: 'db', kind: 'word' }, '📘', '字典', 'N5–N1 單字、讀音、例句'], ['kb', { p: 'db', kind: 'gram' }, '📗', '文法', '敬語、商務句型']],
    fun: [['read', {}, '📰', '閱讀', '新聞、今日短文'], ['songs', {}, '🎵', '歌曲', '跟唱、看懂歌詞'], ['read', { sec: 'art' }, '📄', '我的文章', '貼上或匯入的文章']]
  };
  let TK = [];
  const tool = t => { TK.push(t); return `<button type="button" class="lk-tool" data-tool="${TK.length - 1}"><span class="i" aria-hidden="true">${t[2]}</span><span><b>${esc(t[3])}</b><small>${esc(t[4])}</small></span></button>`; };

  function home() {
    const p = App.profile(), gs = p.goals && p.goals.length ? p.goals : ['travel'], travel = gs.includes('travel');
    TK = [];
    const seen = new Set(), own = [], rest = [];
    gs.forEach(g => (TOOLS[g] || []).forEach(t => { const id = t[0] + JSON.stringify(t[1]); if (!seen.has(id)) { seen.add(id); own.push(t); } }));
    Object.keys(TOOLS).forEach(g => TOOLS[g].forEach(t => { const id = t[0] + JSON.stringify(t[1]); if (!seen.has(id)) { seen.add(id); rest.push(t); } }));
    const emer = `<button type="button" class="lk-emer${travel ? '' : ' sm'}" data-tool="${TK.push(['phrasebook', { cat: 'emer' }]) - 1}"><span class="i" aria-hidden="true">🆘</span><span><b>緊急求助</b><small>110 警察・119 救護車・求救句</small></span><span aria-hidden="true">›</span></button>`;
    const q = travel ? quick(gs.length > 2 ? 4 : gs.length > 1 ? 5 : 6) : [];
    return emer +
      (q.length ? `<h2 class="lk-h">💬 常用句<small>點一下放大給店員看</small></h2><div class="lk-list">${q.map(phRow).join('')}</div>` : '') +
      `<div class="lk-tools">${own.map(tool).join('')}</div>` +
      (rest.length ? `<details class="lk-more"><summary>其他工具</summary><div class="lk-tools">${rest.map(tool).join('')}</div></details>` : '') +
      `<div class="lk-exp"><span>實驗：</span><button type="button" data-tool="${TK.push(['mind3d', {}]) - 1}">🧠 3D 心智圖</button><button type="button" data-tool="${TK.push(['read', { mode: 'url' }]) - 1}">🔗 匯入網址</button></div>`;
  }

  function results(raw) {
    const q = norm(raw), qh = toHira(q), qa = isAscii(q);
    if (!q) return '';
    const pb = PB();
    const ph = pb && pb.search ? pb.search(raw) : [];
    const ws = findWords(q, qh, qa, 4), gm = findGram(q, qa, 3), ln = findLoan(q, qa, 2), my = findMine(q, 2);
    let h = '';
    if (ph.length) h += `<h2 class="lk-h">💬 句子<small>點一下放大</small></h2><div class="lk-list">${ph.slice(0, 5).map(phRow).join('')}</div>` +
      (ph.length > 5 ? `<button type="button" class="lk-all" data-pbq="1">在手冊看全部 ${ph.length} 句 ›</button>` : '');
    if (ws.length) h += `<h2 class="lk-h">📘 單字</h2><div class="lk-list">${ws.map(w => `<button type="button" class="lk-w" data-kb="${esc(w.id)}"><b lang="ja">${esc(w.jp)}</b>${w.kana !== w.jp ? `<small lang="ja">${esc(w.kana)}</small>` : ''}<span class="zh">${esc(w.zh)}</span>${lvB(w.lv)}</button>`).join('')}</div>`;
    if (gm.length) h += `<h2 class="lk-h">📗 文法</h2><div class="lk-list">${gm.map(g => `<button type="button" class="lk-w" data-kb="${esc(g.id)}"><b lang="ja">${esc(g.jp)}</b><span class="zh">${esc(g.zh)}</span>${lvB(g.lv)}</button>`).join('')}</div>`;
    if (ln.length) h += `<h2 class="lk-h">🌐 外來語</h2><div class="lk-list">${ln.map(x => `<button type="button" class="lk-w" data-say="${key({ jp: x.jp })}"><b lang="ja">${esc(x.jp)}</b><span class="zh">${esc(x.o ? x.o.name + '：' + x.o.src : String(x.e[1] || ''))}</span><span class="go" aria-hidden="true">🔊</span></button>`).join('')}</div>`;
    if (my.length) h += `<h2 class="lk-h">⭐ 我的文章與歌曲</h2><div class="lk-list">${my.map(x => `<button type="button" class="lk-w" data-mine="${x.k}:${esc(x.id)}"><span aria-hidden="true">${x.k === 'song' ? '🎵' : '📄'}</span><b>${esc(x.t)}</b></button>`).join('')}</div>`;
    const busy = more && !more.done;
    if (!h) return busy ? `<p class="lk-tip">⏳ 搜尋中…</p>` : `<p class="lk-tip">找不到「${esc(raw)}」，換個說法試試（中文、日文、羅馬字都可以）</p>`;
    return h + (busy ? `<p class="lk-tip">⏳ 還在載入更多資料…</p>` : '');
  }

  function render(el, params) {
    params = params || {};
    if (params.q != null) UI.q = String(params.q);
    el.innerHTML = `<section class="lk">
      <div class="lk-sbar"><input class="lk-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="查句子、單字、文法：袋子、いくら、ikura" value="${esc(UI.q)}" aria-label="搜尋">
      <button type="button" class="lk-x" aria-label="清除"${UI.q ? '' : ' hidden'}>✕</button></div>
      <div id="lk-box"></div>${App.voiceHTML ? App.voiceHTML() : ''}</section>`;
    const box = el.querySelector('#lk-box'), inp = el.querySelector('.lk-q'), x = el.querySelector('.lk-x');
    let t = null, last = '';
    const paint = force => {
      const q = UI.q.trim();
      if (!force && q === last && box.childElementCount) return;
      last = q; KEYS = [];
      box.innerHTML = q ? results(q) : home();
      x.hidden = !UI.q;
    };
    const refresh = () => { if (box.isConnected && UI.q.trim()) paint(true); };
    const kick = () => {
      if (!UI.q.trim()) return;
      const p = loadMore(() => { clearTimeout(t); t = setTimeout(refresh, 60); });
      p.then(() => { p.done = true; refresh(); });
    };
    inp.oninput = () => { UI.q = inp.value; clearTimeout(t); t = setTimeout(() => { paint(); kick(); }, 150); };
    inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); } };
    x.onclick = () => { UI.q = ''; inp.value = ''; paint(true); inp.focus(); };
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.big != null) { const w = KEYS[+d.big]; if (!w) return; const pb = PB(); if (pb && pb.showBig) pb.showBig(w); else App.speak(w.kana || w.jp); }
      else if (d.say != null) { const w = KEYS[+d.say]; if (w) App.speak(w.jp); }
      else if (d.tool != null) { const tt = TK[+d.tool]; if (tt) App.go(tt[0], tt[1]); }
      else if (d.kb) App.go('kb-page', { id: d.kb });
      else if (d.pbq) App.go('phrasebook', { q: UI.q });
      else if (d.mine) { const i = d.mine.indexOf(':'), k = d.mine.slice(0, i), id = d.mine.slice(i + 1); App.go(k === 'song' ? 'song' : 'read-article', k === 'song' ? { id } : { doc: id }); }
    };
    paint(true); kick();
  }

  App.register('lookup', { title: '查', icon: '🔍', nav: true, navOrder: 3, render });
  window.Lookup = { search: q => { const n = norm(q), qa = isAscii(n); return { ph: PB() && PB().search ? PB().search(q) : [], words: findWords(n, toHira(n), qa, 10), gram: findGram(n, qa, 10), loan: findLoan(n, qa, 10), mine: findMine(n, 10) }; }, loadMore: () => loadMore(() => { }) };
})();
