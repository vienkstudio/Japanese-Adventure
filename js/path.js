/* =========================================================
   路線 path.js（G2）：路由 path（導覽 2）、path-unit {id}
   單元在執行時由現有內容組出（不新增店家、地區）：
     旅遊 14 場景包（SCENES 必備句／冒險店家的句型）、日檢 N5–N3 每單元 20 詞＋3 文法（MIND）、N2／N1 用挑戰入口、
     五十音 12 單元（KanaLesson.unitInfo）、商務 8 單元（BIZ.META → biz-unit）、歌曲新聞入口卡。
   資料用 App.loadScript 依分頁需要才載入。
   對外 window.Path：
     units(goal) -> [{id, icon, title, sub, total, done, stars, route?, params?}]   // goal：travel|exam|work|fun|kana（資料未載入時 total 可能為 null）
     load(goal) -> Promise                       // 先載入該目的需要的資料
     unit(id) -> {id, kind, icon, title, sub, items:[Learn.view 格式], steps:[{type, items, params, title}]}|null
     loadUnit(id) -> Promise<unit>
     nextUnit(goal) -> {id, title, items:[未學的 Learn.view 格式 ≤8]}|null   // 今日課「新學」用；資料未載入回 null
     prepare(goal) -> Promise<nextUnit>
   ========================================================= */
(function () {
  'use strict';
  const esc = s => App.esc(String(s == null ? '' : s));
  const arr = a => Array.isArray(a) ? a : [];
  const GOALS = [['travel', '🧳', '旅遊'], ['exam', '📝', '日檢'], ['work', '💼', '商務'], ['fun', '🎵', '歌曲新聞']];
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const KN = ['kana-data.js', 'js/kana-lesson.js'];
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const PER = 20, GPER = 3, SHOW = 8;
  const seq = list => list.reduce((p, s) => p.then(() => App.loadScript(s)), Promise.resolve());
  const jp0 = s => window.Learn && Learn.jp0 ? Learn.jp0(s) : String(s || '');
  const normP = s => window.Learn && Learn.normP ? Learn.normP(s) : String(s || '');
  const learned = id => { const e = Learn.get(id); return !!e && (e.s !== 'new' || e.reps > 0); };
  const known = id => Learn.atLeast(id, 'review');
  const fresh = id => !learned(id);

  /* ---------------- 旅遊：49 間店 → 14 場景包 ---------------- */
  // [id, icon, 名稱, SCENES id, 店家 id（第一間＝實戰用）, 句型來源 [世界檔, 店 id]（沒有 SCENES 時）]
  const PACKS = [
    ['konbini', '🏪', '便利商店', ['konbini'], ['ueno-konbini']],
    ['eat', '🍱', '餐廳・燒肉', ['yakiniku'], ['ueno-shokudo', 'shinjuku-yakiniku', 'harajuku-sushi', 'kyoto-yudofu', 'osaka-okonomiyaki', 'sapporo-soupcurry', 'sapporo-genghis']],
    ['ramen', '🍜', '拉麵・麵店', ['ramen'], ['yokohama-ramen', 'naha-soba']],
    ['station', '🚉', '車站與交通', ['station', 'directions'], ['ueno-station', 'narita-skyliner', 'kyoto-bus', 'asakusa-kanko']],
    ['hotel', '🏨', '飯店・旅館', ['hotel'], ['ueno-hotel', 'kyoto-ryokan', 'niseko-onsen']],
    ['airport', '✈️', '機場', ['airport'], ['narita-airport', 'narita-sim']],
    ['cafe', '☕', '咖啡・甜點', ['cafe'], ['harajuku-cafe', 'kyoto-kanmi']],
    ['drug', '💊', '藥妝店', ['drugstore'], ['ginza-drugstore']],
    ['shop', '🛍️', '購物・伴手禮', ['clothes'], ['harajuku-clothes', 'shinjuku-denki', 'ginza-bungu', 'osaka-hyakkin', 'asakusa-nakamise', 'sapporo-omiyage', 'motobu-michinoeki']],
    ['izakaya', '🏮', '居酒屋', ['izakaya'], ['yokohama-izakaya', 'osaka-kushikatsu']],
    ['sight', '⛩️', '觀光・寺社', ['shrine'], ['asakusa-sensoji', 'kyoto-kiyomizu', 'osaka-castle', 'motobu-aquarium', 'yokohama-cosmo', 'shinjuku-karaoke']],
    ['market', '🦀', '市場・美食街', [], ['osaka-kuromon', 'kyoto-nishiki', 'naha-makishi', 'sapporo-ichiba', 'ginza-depachika', 'osaka-takoyaki', 'yokohama-chukagai'], ['osaka-3', 'osaka-kuromon']],
    ['rental', '🚗', '租車・租借', [], ['naha-rentacar', 'niseko-rental', 'asakusa-kimono', 'motobu-marine'], ['okinawa', 'naha-rentacar']],
    ['emer', '🆘', '緊急・醫療', ['emergency'], ['shinjuku-clinic']]
  ].map(([id, icon, name, scenes, shops, src]) => ({ id: 'tr-' + id, icon, name, scenes, shops, src }));
  const REGION = s => /^(ueno|asakusa|harajuku|ginza|shinjuku|yokohama|narita)-/.test(s) ? 'tokyo' : /^kyoto-/.test(s) ? 'kyoto' : /^osaka-/.test(s) ? 'osaka' : /^(sapporo|niseko)-/.test(s) ? 'hokkaido' : 'okinawa';
  // 世界店家句型的 id 快取（店家檔很大，只在進單元時載入；列表用快取顯示 n／總數）
  const CK = 'jpq.path.v1';
  const cache = (() => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { return {}; } })();
  const putCache = (id, ids) => { cache[id] = ids; try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (e) { } };
  const sceneOf = id => arr(window.SCENES).find(s => s.id === id);
  function phraseItem(jp, kana, zh, extra, pack) {
    return Object.assign({ id: 'p:' + normP(jp), type: 'phrase', jp, kana: kana || '', romaji: '', zh: zh || '', hint: '', lv: 'N5', source: '🧳 ' + pack.name }, extra || {});
  }
  function shopPhrases(pack) {
    const W = window.WORLD, s = pack.src && W && W.shops && W.shops[pack.src[1]]; if (!s) return [];
    const o = [], add = (jp, kana, zh, hint) => { if (jp && !o.some(x => x.jp === jp)) o.push(phraseItem(jp, kana, zh, { hint: hint || '' }, pack)); };
    arr(s.info).forEach(x => x.q && add(x.q.jp, x.q.kana, x.q.zh));
    arr(s.acts).forEach(x => add(x.jp + 'ください。', (x.kana || '') + 'ください', '請' + x.zh));
    arr(s.may).forEach(x => add(x.jp + 'もいいですか。', (x.kana || '') + 'もいいですか', '可以' + x.zh + '嗎？'));
    arr(s.asks).forEach(a => { const x = arr(a.a)[0]; if (x) add(x.jp, x.kana, x.zh, '店員問「' + (a.zh || '') + '」時'); });
    return o;
  }
  function packItems(pack) {
    if (pack.src) { const o = shopPhrases(pack).slice(0, 8); if (o.length) putCache(pack.id, o.map(x => x.id)); return o; }
    const o = [], per = pack.scenes.length > 1 ? [5, 3] : [8];
    pack.scenes.forEach((sid, k) => {
      const s = sceneOf(sid); if (!s) return;
      arr(s.phrases).filter(w => w && w.jp).slice(0, per[k] || 3).forEach(w => {
        const it = phraseItem(w.jp, w.kana, w.zh, { romaji: w.romaji || '', hint: w.use || w.hint || '' }, pack);
        if (!o.some(x => x.id === it.id)) o.push(it);
      });
    });
    return o;
  }
  const packIds = pack => pack.src ? (cache[pack.id] || null) : (window.SCENES ? packItems(pack).map(x => x.id) : null);

  /* ---------------- 日檢：MIND 詞庫 → 每單元 20 詞＋3 文法 ---------------- */
  const EXB = {};
  function examBank(L) {
    const M = window.MIND, lex = M && M.lex && M.lex[L];
    if (!lex || !Array.isArray(M.gram)) return null;
    if (EXB[L] && EXB[L].n === lex.length) return EXB[L];
    const seen = new Set(), words = [];
    lex.filter(r => r[7]).concat(lex.filter(r => !r[7])).forEach(r => {
      const jp = jp0(r[0]), id = 'v:' + jp; if (!jp || !r[2] || seen.has(id)) return; seen.add(id);
      words.push({ id, type: 'vocab', jp, kana: String(r[1] || '').split(/;\s*/)[0].replace(/\s*[（(].*?[）)]/g, '') || jp, romaji: '', zh: r[2], hint: '', lv: L });
    });
    const grams = M.gram.filter(g => g.lv === L).sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(g => ({
      id: 'g:' + String(g.id).replace(/^gram:/, ''), type: 'grammar', jp: g.pat, kana: '', romaji: '', zh: g.zh, hint: g.conn ? '接續：' + g.conn : '',
      ex: g.ex && g.ex[0] ? [{ jp: g.ex[0], zh: g.ex[1] || '' }] : [], lv: L
    }));
    const n = Math.ceil(words.length / PER);
    return (EXB[L] = { n: lex.length, L, words, grams, units: n });
  }
  function examItems(L, i) {
    const B = examBank(L); if (!B || i < 0 || i >= B.units) return null;
    const src = '📝 JLPT ' + L + ' 第 ' + (i + 1) + ' 課';
    return B.grams.slice(i * GPER, i * GPER + GPER).concat(B.words.slice(i * PER, i * PER + PER)).map(x => Object.assign({}, x, { source: src }));
  }
  const examNeed = L => seq(['data/mind/grammar.js', 'data/mind/lex-' + L.toLowerCase() + '.js']);
  const CHAL = [['vocab', '🔤', '單字'], ['grammar', '🧩', '文法'], ['reading', '📄', '讀解'], ['listen', '🎧', '聽解'], ['mock', '📝', '綜合模擬考']];
  const lvNow = () => { const p = App.profile().lv; return p && p !== 'zero' ? p.toUpperCase() : 'N5'; };

  /* ---------------- 單元 id ---------------- */
  // tr-<包>、n5-<1..>、n5-mock、kana-k1..k12、biz-<id>、fun-*
  function parse(id) {
    id = String(id || '');
    let m;
    if (id.startsWith('tr-')) return { kind: 'travel', pack: PACKS.find(p => p.id === id) };
    if ((m = id.match(/^(n[1-5])-(\d+)$/))) return { kind: 'exam', L: m[1].toUpperCase(), i: +m[2] - 1 };
    if ((m = id.match(/^kana-(k\d+)$/))) return { kind: 'kana', k: m[1] };
    return null;
  }
  function unit(id) {
    const P = parse(id); if (!P) return null;
    if (P.kind === 'travel' && P.pack) {
      const p = P.pack, items = packItems(p);
      const shop = p.shops[0];
      return {
        id, kind: 'travel', icon: p.icon, title: p.name, sub: '必備句 ' + items.length + ' 句・可以去 ' + p.shops.length + ' 間店用', items,
        steps: [
          { type: 'flashcard', items, title: p.name + '：必備句' },
          { type: 'wordbank', items, title: p.name + '：排句子' },
          { type: 'shop', items, params: { shop, region: REGION(shop), goal: id }, title: p.name + '：進店用出來' }
        ]
      };
    }
    if (P.kind === 'exam') {
      const items = examItems(P.L, P.i); if (!items) return null;
      const ids = items.map(x => x.id);
      return {
        id, kind: 'exam', icon: '📝', title: P.L + ' 第 ' + (P.i + 1) + ' 課', sub: (items.length - items.filter(x => x.type === 'grammar').length) + ' 個單字＋' + items.filter(x => x.type === 'grammar').length + ' 個文法', items, lv: P.L,
        steps: [
          { type: 'flashcard', items, title: P.L + ' 第 ' + (P.i + 1) + ' 課：字卡' },
          { type: 'choice', items, params: { lv: P.L, kind: ['mean', 'kanji', 'form'], ids }, title: P.L + ' 第 ' + (P.i + 1) + ' 課：選選看' },
          { type: 'choice', items, params: { lv: P.L, kind: ['mean', 'spell', 'ctx', 'form', 'order', 'lword'], n: 10, ids, quiz: true }, title: P.L + ' 第 ' + (P.i + 1) + ' 課：單元小考' }
        ]
      };
    }
    if (P.kind === 'kana' && window.KanaLesson && KanaLesson.unitInfo) {
      const u = KanaLesson.unitInfo(P.k); if (!u) return null;
      return {
        id, kind: 'kana', icon: '🔤', title: u.title, sub: u.chars.length + ' 個假名', items: u.items, intro: u.intro, more: u.more,
        steps: [
          { type: 'flashcard', items: u.items, title: '五十音：' + u.title },
          { type: 'listen', items: u.items, params: { mode: 'kana' }, title: u.title + '：聽音選字' },
          { type: 'choice', items: u.items, params: { mode: 'kana' }, title: u.title + '：看字選音' }
        ]
      };
    }
    return null;
  }
  function loadUnit(id) {
    const P = parse(id); if (!P) return Promise.resolve(null);
    let pr = Promise.resolve();
    if (P.kind === 'travel' && P.pack) pr = P.pack.src ? seq(['data/world/index.js', 'data/world/' + P.pack.src[0] + '.js']) : seq(SC);
    else if (P.kind === 'exam') pr = examNeed(P.L);
    else if (P.kind === 'kana') pr = seq(KN);
    return pr.then(() => unit(id));
  }

  /* ---------------- 單元列表（給路線頁與其他組） ---------------- */
  function starsOf(id, ids) {
    const s0 = App.stars ? App.stars('path:' + id) : 0;
    if (!ids || !ids.length) return s0;
    const d = ids.filter(learned).length, k = ids.filter(known).length;
    const s = d < ids.length ? 0 : k >= ids.length ? 3 : k * 2 >= ids.length ? 2 : 1;
    return Math.max(s0, s);
  }
  const row = (id, icon, title, sub, ids, extra) => Object.assign({ id, icon, title, sub, total: ids ? ids.length : null, done: ids ? ids.filter(learned).length : null, stars: starsOf(id, ids) }, extra || {});
  const kanaDone = () => window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : 0;
  const zeroKana = () => App.profile().lv === 'zero' && kanaDone() < 46;
  function units(goal, opt) {
    opt = opt || {};
    if (goal === 'travel') return PACKS.map(p => row(p.id, p.icon, p.name, p.shops.length + ' 間店', packIds(p)));
    if (goal === 'kana') {
      if (!window.KanaLesson || !KanaLesson.units) return [];
      return KanaLesson.units().map(u => row('kana-' + u.id, '🔤', u.title, u.chars.slice(0, 5).join(' ') + (u.chars.length > 5 ? '…' : ''), u.chars.map(c => 'kana:' + c)));
    }
    if (goal === 'exam') {
      const L = String(opt.lv || lvNow()).toUpperCase();
      if (L === 'N2' || L === 'N1') return CHAL.map(([t, ic, n]) => row('chal-' + L + '-' + t, ic, L + ' ' + n, '挑戰題', null, { route: 'challenge-play', params: { lv: L, t }, stars: App.stars ? App.stars('chal:' + L + ':' + t) : 0 }));
      const B = examBank(L); if (!B) return [];
      const out = [];
      for (let i = 0; i < B.units; i++) { const it = examItems(L, i); out.push(row(L.toLowerCase() + '-' + (i + 1), '📝', L + ' 第 ' + (i + 1) + ' 課', it.filter(x => x.type === 'vocab').slice(0, 3).map(x => x.jp).join('・') + '…', it.map(x => x.id))); }
      out.push(row(L.toLowerCase() + '-mock', '🏁', L + ' 模擬考', '30 題・合格判定', null, { route: 'challenge-play', params: { lv: L, t: 'mock' }, stars: App.stars ? App.stars('chal:' + L + ':mock') : 0 }));
      return out;
    }
    if (goal === 'work') {
      const B = window.BIZ; if (!B || !B.META) return [];
      return B.META.map(m => {
        const u = arr(B.units).find(x => x.id === m.id), ids = u ? arr(u.vocab).map(x => 'v:' + jp0(x.jp)).concat(arr(u.phrases).map(x => 'p:' + normP(x.jp))) : null;
        return row('biz-' + m.id, m.icon, m.title, m.lv, ids, { route: 'biz-unit', params: { id: m.id }, stars: B.stars ? B.stars(m.id) : 0 });
      });
    }
    if (goal === 'fun') {
      const R = window.READING, a = R && R.pick ? R.pick(App.profile().lv, App.today()) : null;
      return [
        row('fun-songs', '🎵', '熱門精選歌曲', '點一首就有逐句歌詞', null, { route: 'songs', params: {} }),
        row('fun-daily', '📰', '今日短文', a ? a.title : '依程度每天換一篇', null, { route: a ? 'read-article' : 'read', params: a ? { daily: a.id } : {} }),
        row('fun-news', '🗞️', '近三天新聞', '看懂新聞標題與重點', null, { route: 'read', params: { sec: 'news' } })
      ];
    }
    return [];
  }
  function load(goal, opt) {
    opt = opt || {};
    if (goal === 'travel') return seq(SC);
    if (goal === 'kana') return seq(KN);
    if (goal === 'exam') { const L = String(opt.lv || lvNow()).toUpperCase(); return L === 'N2' || L === 'N1' ? Promise.resolve() : examNeed(L); }
    if (goal === 'work') return App.loadScript('js/biz.js');
    if (goal === 'fun') return App.loadScript('data/reading/daily.js');
    return Promise.resolve();
  }
  // 建議下一單元：第一個還有沒學過項目的單元
  function nextOf(list) { return list.find(u => u.total && u.done < u.total) || null; }
  function nextUnit(goal) {
    try {
      goal = goal || (App.profile().goals || [])[0] || 'travel';
      if (goal === 'travel' && zeroKana()) goal = 'kana';
      if (!['travel', 'exam', 'kana'].includes(goal)) return null;
      const u0 = nextOf(units(goal)); if (!u0) return null;
      const u = unit(u0.id); if (!u) return null;
      const items = u.items.filter(x => fresh(x.id)).slice(0, 8);
      return items.length ? { id: u.id, title: u.title, items } : null;
    } catch (e) { return null; }
  }
  function prepare(goal) {
    goal = goal || (App.profile().goals || [])[0] || 'travel';
    if (goal === 'travel' && zeroKana()) goal = 'kana';
    return load(goal).catch(() => { }).then(() => nextUnit(goal));
  }

  /* ---------------- 路線頁 ---------------- */
  const UI = { tab: null, lv: null, more: {} };
  function tabs() {
    const p = App.profile(), gs = (p.goals || []).filter(g => GOALS.some(x => x[0] === g));
    const order = gs.concat(GOALS.map(g => g[0]).filter(g => !gs.includes(g)));
    const t = order.map(g => GOALS.find(x => x[0] === g));
    const k = ['kana', '🔤', '五十音'];
    return zeroKana() ? [k].concat(t) : t.concat([k]);
  }
  const starTxt = n => n ? '★'.repeat(n) + '☆'.repeat(3 - n) : '';
  function card(u, next) {
    const pct = u.total ? Math.round(u.done / u.total * 100) : 0;
    const prog = u.total != null ? `<span class="pa-n">已學 ${u.done}／${u.total}</span><span class="pa-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : '';
    return `<button type="button" class="pa-card${next ? ' next' : ''}${u.total && u.done >= u.total ? ' done' : ''}" data-u="${esc(u.id)}">
      ${next ? '<span class="pa-tag">建議下一個</span>' : ''}
      <span class="pa-ic" aria-hidden="true">${esc(u.icon)}</span><span class="pa-t"><b>${esc(u.title)}</b><small>${esc(u.sub || '')}</small>${prog}</span>
      ${u.stars ? `<span class="pa-st" aria-label="${u.stars} 星">${starTxt(u.stars)}</span>` : ''}</button>`;
  }
  function renderPath(el, params) {
    params = params || {};
    const ts = tabs();
    if (params.goal && !params.tab) params = Object.assign({}, params, { tab: params.goal });   // 相容 {goal}
    if (params.tab && ts.some(t => t[0] === params.tab)) UI.tab = params.tab;
    if (!UI.tab || !ts.some(t => t[0] === UI.tab)) UI.tab = ts[0][0];
    if (params.lv) UI.lv = String(params.lv).toUpperCase();
    el.innerHTML = `<div class="pa">
      ${zeroKana() ? `<div class="pa-pin"><b>🔤 先學五十音</b><span>已會 ${kanaDone()}／46 個平假名，學完再去旅遊、日檢路線更輕鬆。</span></div>` : ''}
      <div class="tabs pa-tabs" role="tablist">${ts.map(([id, ic, n]) => `<button type="button" role="tab" data-tab="${id}" class="${id === UI.tab ? 'on' : ''}" aria-selected="${id === UI.tab}">${ic} ${esc(n)}</button>`).join('')}</div>
      <div class="pa-body"><p class="center muted pa-load">載入中…</p></div></div>`;
    const body = el.querySelector('.pa-body');
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; renderPath(el, {}); });
    const tab = UI.tab, lv = UI.lv || lvNow();
    load(tab, { lv }).then(() => { if (el.isConnected && UI.tab === tab) paint(body, tab); })
      .catch(() => { if (el.isConnected) body.innerHTML = '<p class="center pa-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
    body.addEventListener('change', e => { if (e.target.matches('[data-lvsel]')) { UI.lv = e.target.value; renderPath(el, {}); } });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-u],[data-more],[data-go]'); if (!b) return;
      if (b.dataset.more) { UI.more[b.dataset.more] = (UI.more[b.dataset.more] || 0) + 1; paint(body, UI.tab); return; }
      if (b.dataset.go) { App.go(b.dataset.go); return; }
      const id = b.dataset.u, u = (body._list || []).find(x => x.id === id);
      if (u && u.route) App.go(u.route, u.params || {}); else App.go('path-unit', { id });
    });
  }
  function paint(body, tab) {
    const lv = (UI.lv || lvNow()).toUpperCase();
    const list = units(tab, { lv });
    body._list = list;
    const nx = nextOf(list);
    let head = '', foot = '', shown = list;
    if (tab === 'exam') {
      head = `<label class="pa-lv"><span>等級</span><select data-lvsel aria-label="日檢等級">${LVS.map(L => `<option value="${L}"${L === lv ? ' selected' : ''}>${L}${L === lvNow() ? '（我的程度）' : ''}</option>`).join('')}</select></label>
        ${lv === 'N2' || lv === 'N1' ? `<p class="pa-note">${lv} 單元整理中，先用挑戰題練習。</p>` : ''}`;
      if (lv !== 'N2' && lv !== 'N1' && list.length > SHOW + 1) {
        const mock = list[list.length - 1], lessons = list.slice(0, -1);
        const at = nx ? lessons.indexOf(nx) : 0, k = UI.more['exam' + lv] || 0;
        const from = Math.max(0, Math.min(at - 1, lessons.length - SHOW)), to = Math.min(lessons.length, from + SHOW * (k + 1));
        shown = lessons.slice(from, to);
        foot = (to < lessons.length ? `<button type="button" class="btn block pa-more" data-more="exam${lv}">顯示更多（還有 ${lessons.length - to} 課）</button>` : '') + card(mock, false);
        if (from > 0) head += `<p class="pa-note">已跳到你學到的地方（第 ${from + 1} 課起）。</p>`;
      }
    }
    if (tab === 'travel') foot = `<button type="button" class="btn block pa-free" data-go="play">🗾 自由逛日本（冒險地圖）</button>`;
    if (tab === 'fun') head = '<p class="pa-note">歌曲與文章裡點過的詞會自動收進今日課。</p>';
    if (tab === 'work') head = '<p class="pa-note">8 個商務情境：單字、說法、對話、Email。</p>';
    if (!list.length) { body.innerHTML = '<p class="center muted pa-load">這裡還沒有內容</p>'; return; }
    body.innerHTML = head + `<div class="pa-grid${tab === 'fun' || tab === 'work' ? ' one' : ''}">${shown.map(u => card(u, nx && u.id === nx.id)).join('')}</div>` + foot;
  }

  /* ---------------- 單元頁 ---------------- */
  const ST_DOT = { new: '○', learning: '◐', review: '●', mastered: '★' };
  function renderUnit(el, params) {
    const id = params && params.id;
    el.innerHTML = '<p class="center muted pa-load">載入中…</p>';
    loadUnit(id).then(u => { if (el.isConnected) drawUnit(el, u); })
      .catch(() => { if (el.isConnected) el.innerHTML = '<p class="center pa-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  const STEP = { flashcard: ['🃏', '字卡'], wordbank: ['🧩', '排句子'], shop: ['🏪', '進店用出來'], choice: ['✅', '選選看'], listen: ['🎧', '聽音選字'] };
  function drawUnit(el, u) {
    if (!u || !u.items.length) { el.innerHTML = '<div class="pa"><p class="center pa-load">找不到這個單元</p></div>'; return; }
    const ids = u.items.map(x => x.id), d = ids.filter(learned).length, st = starsOf(u.id, ids);
    const pct = Math.round(d / ids.length * 100);
    const goal = u.kind === 'kana' ? 'kana' : u.kind;
    const list = units(goal, { lv: u.lv }), k = list.findIndex(x => x.id === u.id), nxt = list.slice(k + 1).find(x => !x.route);
    const steps = u.steps.map((s, i) => { const t = s.params && s.params.quiz ? ['📝', '單元小考'] : STEP[s.type] || ['▶', s.type]; return `<li><span aria-hidden="true">${t[0]}</span>${i + 1}. ${esc(t[1])}</li>`; }).join('');
    const shops = u.kind === 'travel' ? `<p class="pa-note">學完可以去這些店用：${esc(parse(u.id).pack.shops.length)} 間（第一間會直接帶你進去）。</p>` : '';
    el.innerHTML = `<div class="pa pa-unit">
      <div class="pa-uh"><span class="pa-ic" aria-hidden="true">${esc(u.icon)}</span><div><h1>${esc(u.title)}</h1><p class="muted">${esc(u.sub)}</p></div>${st ? `<span class="pa-st" aria-label="${st} 星">${starTxt(st)}</span>` : ''}</div>
      <div class="pa-prog"><span>已學 ${d}／${ids.length}</span><span class="pa-bar" aria-hidden="true"><i style="width:${pct}%"></i></span></div>
      <ol class="pa-steps">${steps}</ol>
      <button type="button" class="btn primary block pa-start" id="pa-start">${d >= ids.length ? '▶ 再練一次' : d ? '▶ 繼續學' : '▶ 開始'}</button>
      ${u.intro ? `<div class="pa-intro">${u.intro}</div>` : ''}
      ${u.more ? `<details class="pa-more-d"><summary>📘 ${esc(u.more.title)}</summary><div class="kn">${u.more.html}</div></details>` : ''}
      ${shops}
      ${u.kind !== 'kana' ? `<h2 class="pa-h">這課會學到</h2><ul class="pa-items">${u.items.map(x => `<li class="s-${Learn.status(x.id)}"><span class="pa-dot" aria-hidden="true">${ST_DOT[Learn.status(x.id)] || '○'}</span><span class="pa-jp"><b lang="ja">${esc(x.jp)}</b>${x.kana && x.kana !== x.jp ? `<small lang="ja">${esc(x.kana)}</small>` : ''}</span><span class="pa-zh">${esc(x.zh)}</span></li>`).join('')}</ul>` : ''}
      ${nxt ? `<button type="button" class="btn block pa-next" data-u="${esc(nxt.id)}">下一單元：${esc(nxt.title)} ›</button>` : ''}
    </div>`;
    const root = el.querySelector('.pa-unit');
    root.querySelector('#pa-start').onclick = () => start(u, nxt);
    root.addEventListener('click', e => {
      const s = e.target.closest('[data-ks]'); if (s) { App.speak(s.dataset.ks); return; }
      const n = e.target.closest('.pa-next[data-u]'); if (n) App.go('path-unit', { id: n.dataset.u });
    });
  }
  // 開始：交給 G1 的 act 路由（Activity.session 跑全部步驟、統一結算）；完成回單元頁，結算可接下一單元
  function start(u, nxt) {
    const back = { route: 'path-unit', params: { id: u.id } };
    const steps = u.steps.map(s => ({ type: s.type, items: s.items, params: s.params || {}, title: s.title }));
    App.go('act', { steps, title: u.title, back, next: nxt ? { label: '下一單元：' + nxt.title, route: 'path-unit', params: { id: nxt.id } } : null, lv: u.lv });
  }

  App.register('path', { title: '路線', icon: '🧭', nav: true, navOrder: 2, render: renderPath });
  App.register('path-unit', { title: '單元', icon: '🧭', nav: false, navParent: 'path', render: renderUnit });
  window.Path = { units, load, unit, loadUnit, nextUnit, prepare, PACKS };
})();
