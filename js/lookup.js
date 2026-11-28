/* 查（路由 lookup，導覽 3）：一個搜尋框跨「手冊句子、MIND 單字與文法、外來語、我的文章與歌曲」＋導引（js/nav.js：🆘 緊急、為你推薦、全部功能、功能搜尋置頂）。
   依賴：App、Phrasebook（js/phrasebook.js，⭐ 必備＋🆘 緊急句、大字出示）、Phrase（羅馬字）。
   其他資料搜尋時才載入：SCENES（data/scenes-*.js）、冒險世界 WORLD（data/world，京阪等地名・景點・店內句子）、MIND（data/mind/grammar.js、lex-n*.js）、LOAN（data/loan.js）；
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
      mine().then(tick),
      // 冒險世界：地區索引＋各地區店家（京阪地名、景點、店內句子）；搜尋時才載
      load('data/world/index.js').then(() => { const pb = PB(); return pb && pb.loadWorld ? pb.loadWorld() : seq(worldFiles()); }).then(() => { PL = null; tick(); })
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
  const jp0 = s => window.Learn && Learn.jp0 ? Learn.jp0(s) : (String(s).split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || s;   // 全站同一份清理（js/learn.js lexForm）
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

  /* ---------- 冒險世界地名：地區、街區、景點、店家（data/world，搜尋時才載） ---------- */
  const worldFiles = () => { const W = window.WORLD; return W && W.regions ? [].concat(...W.regions.map(r => (r.files || []).map(f => 'data/world/' + f + '.js'))) : []; };
  let PL = null;
  function places() {
    if (PL) return PL;
    const W = window.WORLD; if (!W || !W.regions) return [];
    const out = [], seen = new Set();
    const rn = id => { const r = W.regions.find(x => x.id === id); return r ? r.name : ''; };
    const add = (o, sub) => {
      if (!o || !o.jp) return; const k = o.jp + '|' + (o.name || ''); if (seen.has(k)) return; seen.add(k);
      const kana = String(o.kana || '').replace(/[・\s]/g, '');
      out.push({ jp: o.jp, kana: o.kana || '', zh: o.name || o.zh || '', icon: o.icon || '📍', sub, tip: o.tip || o.desc || '', say: o.say && o.say.jp ? o.say : null,
        nj: norm(o.jp), nk: toHira(norm(kana)), nz: norm(o.name || ''), r: null });
    };
    W.regions.forEach(r => add(r, '地區'));
    Object.values(W.districts || {}).forEach(d => {
      add(d, rn(d.region) + '・街區');
      Object.values(d.places || {}).forEach(p => { if (p && (p.type === 'spot' || p.type === 'gate')) add(p, [rn(d.region), d.name].filter(Boolean).join('・')); });
    });
    Object.values(W.shops || {}).forEach(s => {
      const d = (W.districts || {})[Object.keys(W.districts || {}).find(k => (W.districts[k].places && Object.values(W.districts[k].places).some(p => p && p.shop === s.id))) || ''];
      add(s, [rn(s.region), d && d.name].filter(Boolean).join('・'));
    });
    return (PL = out);
  }
  function findPlace(q, qh, qa, n) {
    const out = [];
    places().forEach(p => {
      let s = 9;
      if (qa) {
        if (q.length < 3) return;
        if (p.r == null) p.r = romN(rom(p.kana || p.jp));
        const r = romN(q);
        if (p.r === r) s = 0; else if (p.r.startsWith(r)) s = 1; else if (r.length >= 4 && p.r.includes(r)) s = 2;
      } else if (p.nj === q || p.nz === q || (p.nk && p.nk === qh)) s = 0;
      else if (p.nj.startsWith(q) || p.nz.startsWith(q) || (p.nk && p.nk.startsWith(qh))) s = 1;
      else if (p.nj.includes(q) || p.nz.includes(q) || (qh.length > 1 && p.nk.includes(qh))) s = 2;
      if (s < 9) out.push([s + (p.sub === '地區' ? -0.5 : 0) + p.jp.length / 100, p]);
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
  let KEYS = [], HOTK = [];
  const key = w => { KEYS.push(w); return KEYS.length - 1; };
  const PB = () => window.Phrasebook || null;
  const romOf = w => { const pb = PB(); return pb && pb.showRom && pb.showRom() && pb.romOf ? pb.romOf(w) : ''; };
  const kanaOf = w => { const pb = PB(); return pb && pb.kanaOf ? pb.kanaOf(w) : ''; };
  function phRow(w) {
    const k = key(w), kn = kanaOf(w), rm = romOf(w);
    return `<button type="button" class="lk-ph" data-big="${k}" aria-label="${esc(w.zh)}：放大給店員看">
      <span class="t"><b lang="ja">${esc(w.jp)}</b>${kn ? `<small lang="ja">${esc(kn)}</small>` : ''}${rm ? `<small class="rm">${esc(rm)}</small>` : ''}<span class="zh">${esc(w.zh)}</span></span><span class="go" aria-hidden="true">📢</span></button>`;
  }
  // 地名列：點一下全螢幕大字（給司機、站員看）；景點附一句現場用得到的話
  function plRow(p) {
    const k = key({ jp: p.jp, kana: p.kana, zh: p.zh }), rm = romOf({ jp: p.jp, kana: p.kana });
    return `<button type="button" class="lk-ph lk-pl" data-big="${k}" aria-label="${esc(p.zh)}：放大給對方看">
      <span class="t"><b lang="ja">${esc(p.icon)} ${esc(p.jp)}</b>${p.kana && p.kana !== p.jp ? `<small lang="ja">${esc(p.kana)}</small>` : ''}${rm ? `<small class="rm">${esc(rm)}</small>` : ''}<span class="zh">${esc(p.zh)}<small> ・${esc(p.sub)}</small></span></span><span class="go" aria-hidden="true">📢</span></button>` +
      (p.say ? phRow({ jp: p.say.jp, kana: p.say.kana || '', zh: p.say.zh || '' }) : '');
  }
  const lvB = lv => lv ? `<span class="lv-b ${String(lv).toLowerCase()}">${esc(lv)}</span>` : '';

  // 旅遊常用句（點一下就大字）：從手冊 ⭐ 必備挑
  const QUICK = ['袋はいりません。', 'これください。', 'これはいくらですか。', 'カードで払えますか。', 'トイレはどこですか。', '免税できますか。'];
  const quick = n => { const pb = PB(); if (!pb || !pb.MUST) return []; return QUICK.map(j => pb.MUST.find(w => w.jp === j)).filter(Boolean).slice(0, n); };

  // 搜尋框範例依目的（第一個目的優先）
  const HINT = '查單字：日文、假名、羅馬字或中文';
  // 功能卡（js/nav.js 的 NAV.TOOLS）：data-nv＝工具 id；推薦卡第 4 格「上次用的」帶參數（data-last）
  const NV = () => window.NAV || null;
  const navCard = (t, cls) => `<button type="button" class="lk-tool${cls ? ' ' + cls : ''}" data-nv="${esc(t.id)}"${t.last ? ' data-last="1"' : ''}><span class="i" aria-hidden="true">${esc(t.icon)}</span><span><b>${esc(t.name)}</b><small>${esc(t.last ? t.lastTxt || '上次用的' : t.desc)}</small></span></button>`;
  function home() {
    const p = App.profile(), gs = p.goals && p.goals.length ? p.goals : ['travel'], travel = gs.includes('travel'), N = NV();
    const q = travel ? quick(gs.length > 2 ? 3 : 4) : [];
    const emer = `<button type="button" class="lk-emer${travel ? '' : ' sm'}" data-nv="phrasebook~0"><span class="i" aria-hidden="true">🆘</span><span><b>緊急求助</b><small>110 警察・119 救護車・求救句</small></span><span aria-hidden="true">›</span></button>`;
    // 查＝先查單字：辭典三個入口在最上面；旅遊的緊急求助、常用句、手冊放在後面
    const dict = N ? ['dict~0', 'dict~1', 'dict~2'].map(N.byId).filter(Boolean) : [];
    const pb = N ? N.byId('phrasebook') : null;
    return (dict.length ? `<h2 class="lk-h">📘 辭典</h2><div class="lk-tools lk-rec">${dict.map(t => navCard(t)).join('')}</div>` : (N ? '' : '<p class="lk-tip">⏳ 載入中…</p>')) +
      (travel ? `<h2 class="lk-h">🧳 旅遊</h2>` + emer : '') +
      (q.length ? `<h2 class="lk-h">💬 常用句<small>點一下放大給店員看</small></h2><div class="lk-list">${q.map(phRow).join('')}</div>` : '') +
      (pb ? `<div class="lk-tools lk-rec">${navCard(pb)}</div>` : '') + (travel ? '' : emer);
  }
  // 搜尋結果最上面：功能命中（≤3）；其他功能命中排在內容後面
  function navHits(raw) {
    const N = NV(); if (!N) return { top: '', more: '' };
    const r = N.search(raw);
    return {
      top: r.top.length ? `<h2 class="lk-h">🧭 功能</h2><div class="lk-list">${r.top.map(t => navCard(t, 'lk-row')).join('')}</div>` : '',
      more: r.more.length ? `<h2 class="lk-h">🧭 相關功能</h2><div class="lk-list">${r.more.slice(0, 4).map(t => navCard(t, 'lk-row')).join('')}</div>` : ''
    };
  }

  /* ---------- 文法句型（日檢，依級數）／敬語・商務句型（商務）：查頁內的精簡清單，一次 ≤12 個 ---------- */
  const BIZF = ['data/biz/units-1.js', 'data/biz/units-2.js', 'data/biz/units-3.js', 'data/biz/units-4.js'];
  const GV = { lv: '', tab: 'keigo', n: 12 };
  const exOf = ex => !ex ? [] : Array.isArray(ex) && typeof ex[0] === 'string' ? [[ex[0], ex[1] || '']] : Array.isArray(ex) ? ex.map(x => Array.isArray(x) ? x : x && x.jp ? [x.jp, x.zh || ''] : null).filter(Boolean) : [];
  const gOf = g => ({ pat: g.pat, zh: g.zh, conn: g.conn, ex: exOf(g.ex), id: g.id, lv: g.lv, note: g.note });
  function gramList(view) {
    const G = (window.MIND && MIND.gram) || [];
    if (view === 'gram') return G.filter(g => g.lv === (GV.lv || 'N5')).slice().sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(gOf);
    if (GV.tab === 'keigo') return G.filter(g => g.cat === '敬語').slice().sort((a, b) => lvI(a.lv) - lvI(b.lv) || (a.ord || 0) - (b.ord || 0)).map(gOf);
    const out = [], seen = new Set();
    ((window.BIZ && BIZ.units) || []).forEach(u => (u.grammar || []).forEach(g => {
      if (!g || !g.pat || seen.has(g.pat)) return; seen.add(g.pat);
      out.push({ pat: g.pat, zh: g.zh, conn: g.conn, ex: exOf(g.ex), id: g.gid && G.some(x => x.id === g.gid) ? g.gid : '', lv: u.lv, unit: [u.icon, u.title].filter(Boolean).join(' ') });
    }));
    return out;
  }
  function gramRow(g) {
    return `<details class="lk-g"><summary><b lang="ja">${esc(g.pat)}</b><span class="zh">${esc(g.zh || '')}</span>${lvB(g.lv)}</summary>
      <div class="lk-gd">${g.conn ? `<p><small>接續</small> ${esc(g.conn)}</p>` : ''}${g.ex.slice(0, 2).map(e => `<p class="ex"><span lang="ja">${esc(e[0])}</span><small>${esc(e[1] || '')}</small></p>`).join('')}${g.note ? `<p class="nt">💡 ${esc(g.note)}</p>` : ''}${g.unit ? `<p class="nt">出自商務情境：${esc(g.unit)}</p>` : ''}${g.id ? `<button type="button" class="lk-all" data-kb="${esc(g.id)}">完整說明與例句 ›</button>` : ''}</div></details>`;
  }
  function gramView(view) {
    const isG = view === 'gram';
    if (isG && !GV.lv) { const l = String(App.profile().lv || '').toUpperCase(); GV.lv = LVS.includes(l) ? l : 'N5'; }
    const all = gramList(view), list = all.slice(0, GV.n);
    const tabs = isG ? LVS.map(l => `<button type="button" class="lk-tab${GV.lv === l ? ' on' : ''}" data-gl="${l}" aria-pressed="${GV.lv === l}">${l}</button>`).join('')
      : [['keigo', '🙇 敬語'], ['biz', '💼 商務句型']].map(([k, n]) => `<button type="button" class="lk-tab${GV.tab === k ? ' on' : ''}" data-gt="${k}" aria-pressed="${GV.tab === k}">${n}</button>`).join('');
    return `<h1 class="lk-title">${isG ? '📗 文法句型' : '🙇 敬語・商務句型'}<small>${all.length ? all.length + ' 個・點一下看接續與例句' : ''}</small></h1>
      <div class="lk-tabs" role="group" aria-label="${isG ? '級數' : '分類'}">${tabs}</div>
      ${list.length ? `<div class="lk-list">${list.map(gramRow).join('')}</div>` : `<p class="lk-tip">⏳ 載入中…</p>`}
      ${all.length > list.length ? `<button type="button" class="lk-all" data-gmore="1">再顯示 ${Math.min(12, all.length - list.length)} 個（共 ${all.length}）</button>` : ''}`;
  }
  function renderGram(el, view) {
    el.innerHTML = `<section class="lk" id="lk-g"></section>`;
    const box = el.querySelector('#lk-g');
    const paint = () => { if (box.isConnected) box.innerHTML = gramView(view); };
    paint();
    Promise.all([load('data/mind/grammar.js')].concat(view === 'keigo' ? [seq(BIZF)] : [])).then(paint);
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.gl) { GV.lv = d.gl; GV.n = 12; paint(); }
      else if (d.gt) { GV.tab = d.gt; GV.n = 12; paint(); }
      else if (d.gmore) { GV.n += 12; paint(); }
      else if (d.kb) App.go('kb-page', { id: d.kb });
    };
  }

  /* ---------- 公有領域歌曲（維基文庫；未匯入也搜得到）：優先讀 Songs.HOT（songs.js 對外時），否則用這份歌名清單（與 songs.js HOT 同步） ---------- */
  const HOT0 = [['アイドル', 'YOASOBI', 'ZRtdQ81jPUQ'], ['夜に駆ける', 'YOASOBI', 'by4SYYWlhEs'], ['Bling-Bang-Bang-Born', 'Creepy Nuts', 'mLW35YMzELE'], ['ライラック', 'Mrs. GREEN APPLE', 'QjrkrVmC-8M'], ['ケセラセラ', 'Mrs. GREEN APPLE', 'Jy-QS27q7lA'], ['怪獣の花唄', 'Vaundy', 'UM9XNpgrqVk'], ['Lemon', '米津玄師', 'SX_ViT4Ra7k'], ['KICK BACK', '米津玄師', 'M2cckDmNLMI'], ['新時代', 'Ado', '1FliVTcX8bQ'], ['唱', 'Ado', 'pgXpM4l_MwI'], ['Pretender', 'Official髭男dism', 'TQ8WlA2GXbk'], ['Subtitle', 'Official髭男dism', 'hN5MBlGv2Ac'], ['水平線', 'back number', 'iqEr3P78fz8'], ['SPECIALZ', 'King Gnu', 'fhzKLBZJC3w'], ['はいよろこんで', 'こっちのけんと', 'jzi6RNVEOtA'], ['晩餐歌', 'tuki.', 'oZpYEEcvu5I'], ['ドライフラワー', '優里', 'kzZ6KXDM1RI'], ['紅蓮華', 'LiSA', 'x1FV6IrjZCY'], ['群青', 'YOASOBI', 'Y4nEEZwckuU'], ['ベテルギウス', '優里', 'cbqvxDTLMps'], ['青と夏', 'Mrs. GREEN APPLE', '-MKfbxHy_NA'], ['オトノケ', 'Creepy Nuts', 'tRwHpyOq4P4'], ['さよーならまたいつか！', '米津玄師', '-wb2PAx6aEs']];
  const hotList = () => (window.Songs && Array.isArray(Songs.HOT) && Songs.HOT.length ? Songs.HOT : HOT0);
  function findHot(q, n) {
    const have = new Set(MINE.songs.map(x => String(x.id))), out = [];
    hotList().forEach(h => {
      const t = norm(h[0]), a = norm(h[1]);
      let s = 9;
      if (t === q) s = 0; else if (t.startsWith(q)) s = 1;
      else if (q.length >= 2 && (t.includes(q) || toHira(t).includes(toHira(q)))) s = 2;
      else if (q.length >= 2 && a.includes(q)) s = 3;
      if (s < 9 && !have.has('yt:' + h[2])) out.push([s, { t: h[0], a: h[1], yt: h[2] }]);
    });
    return out.sort((x, y) => x[0] - y[0]).slice(0, n).map(x => x[1]);
  }
  // 點公有領域歌曲：未匯入 → Songs.importHot（若有）；否則開歌曲列表、按那首的「一鍵匯入」（匯入完自動進歌曲頁）
  function openHot(h) {
    const id = 'yt:' + h.yt;
    if (MINE.songs.some(x => String(x.id) === id)) return App.go('song', { id });
    if (window.Songs && typeof Songs.importHot === 'function') {
      App.toast('⏳ 匯入歌詞中…');
      return Promise.resolve(Songs.importHot(h.t, h.a, h.yt)).then(i => App.go('song', { id: i || id })).catch(() => App.toast('匯入失敗，請稍後再試'));
    }
    App.go('songs');
    let n = 0;
    const tick = () => {
      const b = [...document.querySelectorAll('#main [data-hot]')].find(x => { const t = x.querySelector('b'); return t && t.textContent.trim() === h.t; });
      if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return; }
      if (++n < 60) setTimeout(tick, 150);
    };
    setTimeout(tick, 100);
  }

  function results(raw) {
    const q = norm(raw), qh = toHira(q), qa = isAscii(q);
    if (!q) return '';
    const pb = PB();
    const ph = pb && pb.search ? pb.search(raw) : [];
    const pl = findPlace(q, qh, qa, 4);
    const ws = findWords(q, qh, qa, 4), gm = findGram(q, qa, 3), ln = findLoan(q, qa, 2), my = findMine(q, 2), hot = findHot(q, 3);
    HOTK = hot;
    const hotH = hot.length ? `<h2 class="lk-h">🎵 熱門歌<small>點一下匯入歌詞、開始跟唱</small></h2><div class="lk-list">${hot.map((x, i) => `<button type="button" class="lk-w" data-hot="${i}"><span aria-hidden="true">🎵</span><b lang="ja">${esc(x.t)}</b><span class="zh" lang="ja">${esc(x.a)}</span><span class="go" aria-hidden="true">▶</span></button>`).join('')}</div>` : '';
    let h = '';
    if (ws.length) h += `<h2 class="lk-h">📘 單字</h2><div class="lk-list">${ws.map(w => `<button type="button" class="lk-w" data-kb="${esc(w.id)}"><b lang="ja">${esc(w.jp)}</b>${w.kana !== w.jp ? `<small lang="ja">${esc(w.kana)}</small>` : ''}<span class="zh">${esc(w.zh)}</span>${lvB(w.lv)}</button>`).join('')}</div>`;   // 單字排最前（查「水」先看到 みず）
    if (pl.length) h += `<h2 class="lk-h">📍 地名・景點<small>點一下放大給司機、店員看</small></h2><div class="lk-list">${pl.map(plRow).join('')}</div>`;
    // 目的是日檢、或查的字就是文法句型本身：文法排在句子前（「ように」不先出旅遊句「プレゼント用に」；評審 v15 P1-11）
    const gm0 = gm.length && ((App.profile().goals || []).includes('exam') || gm.some(g => g.nj === q));
    const gmH = gm.length ? `<h2 class="lk-h">📗 文法</h2><div class="lk-list">${gm.map(g => `<button type="button" class="lk-w" data-kb="${esc(g.id)}"><b lang="ja">${esc(g.jp)}</b><span class="zh">${esc(g.zh)}</span>${lvB(g.lv)}</button>`).join('')}</div>` : '';
    if (gm0) h += gmH;
    if (ph.length) h += `<h2 class="lk-h">💬 句子<small>點一下放大</small></h2><div class="lk-list">${ph.slice(0, 5).map(phRow).join('')}</div>` +
      (ph.length > 5 ? `<button type="button" class="lk-all" data-pbq="1">在手冊看全部 ${ph.length} 句 ›</button>` : '');
    if (!gm0) h += gmH;
    if (ln.length) h += `<h2 class="lk-h">🌐 外來語</h2><div class="lk-list">${ln.map(x => `<button type="button" class="lk-w" data-say="${key({ jp: x.jp })}"><b lang="ja">${esc(x.jp)}</b><span class="zh">${esc(x.o ? x.o.name + '：' + x.o.src : String(x.e[1] || ''))}</span><span class="go" aria-hidden="true">🔊</span></button>`).join('')}</div>`;
    h += hotH;
    if (my.length) h += `<h2 class="lk-h">⭐ 我的文章與歌曲</h2><div class="lk-list">${my.map(x => `<button type="button" class="lk-w" data-mine="${x.k}:${esc(x.id)}"><span aria-hidden="true">${x.k === 'song' ? '🎵' : '📄'}</span><b>${esc(x.t)}</b></button>`).join('')}</div>`;
    const busy = more && !more.done;
    const nv = navHits(raw);
    h = h + nv.top + nv.more;   // 單字永遠在最前面，功能命中放在內容後面
    if (!h) return busy ? `<p class="lk-tip">⏳ 搜尋中…</p>` : `<p class="lk-tip">找不到「${esc(raw)}」，換個說法試試（中文、日文、羅馬字都可以）</p>`;
    return h + (busy ? `<p class="lk-tip">⏳ 還在載入更多資料…</p>` : '');
  }

  function render(el, params) {
    params = params || {};
    if (params.view === 'gram' || params.view === 'keigo') return renderGram(el, params.view);
    UI.q = params.q != null ? String(params.q) : '';   // 從底部導覽進來＝空白（看推薦）；按返回回到搜尋結果（查詢存在歷史紀錄）
    el.innerHTML = `<section class="lk">
      <div class="lk-sbar"><input class="lk-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="${esc(HINT)}" value="${esc(UI.q)}" aria-label="搜尋">
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
    const keepQ = () => { if (App.replaceEntry) App.replaceEntry('lookup', UI.q.trim() ? { q: UI.q } : {}); };
    inp.oninput = () => { UI.q = inp.value; clearTimeout(t); t = setTimeout(() => { paint(); kick(); keepQ(); }, 150); };
    inp.onkeydown = e => { if (e.key === 'Enter') { inp.blur(); } };
    x.onclick = () => { UI.q = ''; inp.value = ''; paint(true); keepQ(); inp.focus(); };
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.big != null) { const w = KEYS[+d.big]; if (!w) return; const pb = PB(); if (pb && pb.showBig) pb.showBig(w); else App.speak(w.kana || w.jp); }
      else if (d.say != null) { const w = KEYS[+d.say]; if (w) App.speak(w.jp); }
      else if (d.nv) { const N = NV(); if (N) N.go(N.byId(d.nv), d.last && (App.state.nav || {}).last); }
      else if (d.kb) App.go('kb-page', { id: d.kb });
      else if (d.pbq) App.go('phrasebook', { q: UI.q });
      else if (d.hot != null) { const hh = HOTK[+d.hot]; if (hh) openHot(hh); }
      else if (d.mine) { const i = d.mine.indexOf(':'), k = d.mine.slice(0, i), id = d.mine.slice(i + 1); App.go(k === 'song' ? 'song' : 'read-article', k === 'song' ? { id } : { doc: id }); }
    };
    paint(true); kick();
    if (!NV()) withNav(() => { if (box.isConnected && !UI.q.trim()) paint(true); else refresh(); });
  }
  // nav.js 由 index.html 與查頁一起載入；萬一沒有就補載
  function withNav(fn, el) {
    if (window.NAV) return fn();
    if (el) el.innerHTML = '<p class="lk-tip">⏳ 載入中…</p>';
    App.loadScript('js/nav.js').then(fn, () => { if (el) el.innerHTML = '<p class="lk-tip">載入失敗，請稍後再試</p>'; });
  }

  App.register('lookup', { title: '查', icon: '🔍', nav: true, navOrder: 3, render });
  window.Lookup = { search: q => { const n = norm(q), qa = isAscii(n); return { places: findPlace(n, toHira(n), qa, 10), ph: PB() && PB().search ? PB().search(q) : [], words: findWords(n, toHira(n), qa, 10), gram: findGram(n, qa, 10), loan: findLoan(n, qa, 10), mine: findMine(n, 10), hot: findHot(n, 10) }; }, loadMore: () => loadMore(() => { }) };
})();
