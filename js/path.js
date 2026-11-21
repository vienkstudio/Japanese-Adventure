/* =========================================================
   路線 path.js（G2）：路由 path（導覽 2）、path-unit {id}
   單元在執行時由現有內容組出（不新增店家、地區）；每單元 ≤10 張新卡＋≤5 題（目標 ≤25 次點擊、≤5 分鐘）：
     旅遊 14 場景包（必備句 ≤8 → 排句子 2 句 → 進店；實戰店依地區挑同包的店）
     日檢 N5–N1 每課 8 詞＋2 文法（MIND，依 core 排序；詞庫只收本級、低級已有的詞與文法同形詞剔除）→ 字卡 → 小考 5 題
     五十音 每課 ≤10 字（KanaLesson.units）→ 字卡 → 聽音 5 題
     商務 每個 BIZ 單元拆成 單字 1／單字 2／句子 1／句子＋句型（各 ≤10 張＋≤5 題）＋對話與 Email（進 biz-unit）
     歌曲新聞 依程度的短文路線（read-article）＋熱門歌單元（song）＋近三天新聞
   資料用 App.loadScript 依分頁需要才載入。
   對外 window.Path：
     units(goal) -> [{id, icon, title, sub, total, done, stars, complete, route?, params?}]   // goal：travel|exam|work|fun|kana
     load(goal) -> Promise                       // 先載入該目的需要的資料
     unit(id) -> {id, kind, icon, title, sub, items:[Learn.view 格式], steps:[{type, items, params, title}]}|null
     loadUnit(id) -> Promise<unit>
     nextUnit(goal) -> {id, title, items:[未學的 Learn.view 格式 ≤8]}|null   // 今日課「新學」用；資料未載入回 null
     prepare(goal) -> Promise<nextUnit>
     exOf(item, lv) -> [{jp, zh}]|[]|null        // 單字例句（以詞為單位比對、例句等級 ≤ lv；找不到回 []；索引未建回 null）
     region() -> 'tokyo'|'kyoto'|'osaka'|'hokkaido'|'okinawa'|null；shopFor(packId, region?) -> 店 id
   ========================================================= */
(function () {
  'use strict';
  const esc = s => App.esc(String(s == null ? '' : s));
  const arr = a => Array.isArray(a) ? a : [];
  const GOALS = [['travel', '🧳', '旅遊'], ['exam', '📝', '日檢'], ['work', '💼', '商務'], ['fun', '🎵', '歌曲新聞']];
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const KN = ['kana-data.js', 'js/kana-lesson.js'];
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const lvI = L => LVS.indexOf(String(L || '').toUpperCase());
  const W_PER = 8, G_PER = 2, Q_N = 5, CARD = 10, SHOW = 8;
  const seq = list => list.reduce((p, s) => p.then(() => App.loadScript(s)), Promise.resolve());
  const jp0 = s => window.Learn && Learn.jp0 ? Learn.jp0(s) : String(s || '');
  const normP = s => window.Learn && Learn.normP ? Learn.normP(s) : String(s || '');
  const learned = id => { const e = Learn.get(id); return !!e && (e.s !== 'new' || e.reps > 0); };
  const fresh = id => !learned(id);
  const stored = id => App.stars ? App.stars('path:' + id) : 0;
  const segs = z => String(z || '').replace(/（[^）]*）|\([^)]*\)/g, '').split(/[；;，,、／/・。]/).map(s => s.trim()).filter(Boolean);
  const zhClash = (a, b) => { const A = segs(a), B = segs(b); return A.some(x => B.some(y => x === y || (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))))); };
  const lvNow = () => { const p = App.profile().lv; return p && p !== 'zero' ? p.toUpperCase() : 'N5'; };

  /* ---------------- 旅遊：49 間店 → 14 場景包 ---------------- */
  // [id, icon, 名稱, SCENES id, 店家 id（同包可實戰的店）, 句型來源 [世界檔, 店 id]（沒有 SCENES 時）]
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
  const RG = { tokyo: '東京', kyoto: '京都', osaka: '大阪', hokkaido: '北海道', okinawa: '沖繩' };
  // 實戰地區：路線裡自己選的（App.state.path.region）→ 冒險存檔的最近地區（world.lastRegion → 最近拿到的卡片 → 去過的街區）
  function region() {
    const S = App.state || {}, w = S.world || {};
    if (S.path && RG[S.path.region]) return S.path.region;
    if (RG[w.lastRegion]) return w.lastRegion;
    let best = null, bt = '';
    Object.values(w.cards || {}).forEach(c => { if (c && RG[c.r] && String(c.t || '') >= bt) { bt = String(c.t || ''); best = c.r; } });
    if (best) return best;
    const ks = Object.keys(w.last || {}).filter(k => RG[k]);
    return ks.length ? ks[ks.length - 1] : null;
  }
  function setRegion(r) { if (!RG[r]) return; const S = App.state; S.path = Object.assign({}, S.path, { region: r }); App.save(); }
  const packOf = id => PACKS.find(p => p.id === id || p.id === 'tr-' + id);
  function shopFor(pack, rg) {
    pack = typeof pack === 'string' ? packOf(pack) : pack; if (!pack) return null;
    rg = rg || region();
    return (rg && pack.shops.find(s => REGION(s) === rg)) || pack.shops[0];
  }
  // 店名（data/world/index.js 已載入時）：「🐼 上野・🏪 便利商店」
  function shopLabel(id) {
    const W = window.WORLD;
    const strip = t => String(t || '').replace(/^[^぀-鿿A-Za-z0-9]+\s*/u, '').trim();
    for (const r of arr(W && W.regions)) for (const s of arr(r.shops)) if (s[1] === id) { const [dl, sl] = String(s[2] || '').split('・'); return RG[r.id] + '・' + strip(dl) + ' ' + strip(sl); }
    return RG[REGION(id)] || '';
  }
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

  /* ---------------- 日檢：MIND 詞庫 → 每課 8 詞＋2 文法 ---------------- */
  const patWord = p => String(p || '').replace(/（[^）]*）|\([^)]*\)/g, '').replace(/[〜～]/g, '').replace(/(だ|です)$/, '').trim();
  const EXB = {};
  function examBank(L) {
    const M = window.MIND, lex = M && M.lex && M.lex[L];
    if (!lex || !Array.isArray(M.gram)) return null;
    const low = LVS.slice(0, lvI(L)), sig = lex.length + ':' + low.map(l => arr(M.lex[l]).length).join(',');
    if (EXB[L] && EXB[L].sig === sig) return EXB[L];
    // 低級詞庫已有的詞（N4 課不再出 N5 詞）、與本級以下文法同形的詞（つもり 只當文法）
    const lower = new Set(); low.forEach(l => arr(M.lex[l]).forEach(r => lower.add(jp0(r[0]))));
    const gw = new Set(M.gram.filter(g => lvI(g.lv) >= 0 && lvI(g.lv) <= lvI(L)).map(g => patWord(g.pat)).filter(Boolean));
    const seen = new Set(), words = [];
    lex.filter(r => r[7]).concat(lex.filter(r => !r[7])).forEach(r => {
      const jp = jp0(r[0]), id = 'v:' + jp; if (!jp || !r[2] || seen.has(id) || lower.has(jp) || gw.has(jp)) return;
      if (lvI(L) >= 3 && /^[ぁ-ゟ]{1,2}$/.test(jp)) return;   // N2／N1 的 2 字平假名多是接尾或片段（ごと、さす、いち），不當單字課
      seen.add(id);
      words.push({ id, type: 'vocab', jp, kana: String(r[1] || '').split(/;\s*/)[0].replace(/\s*[（(].*?[）)]/g, '') || jp, romaji: '', zh: r[2], hint: '', lv: L });
    });
    const grams = M.gram.filter(g => g.lv === L).sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(g => ({
      id: 'g:' + String(g.id).replace(/^gram:/, ''), type: 'grammar', jp: g.pat, kana: '', romaji: '', zh: g.zh, hint: g.conn ? '接續：' + g.conn : '',
      ex: g.ex && g.ex[0] ? [{ jp: g.ex[0], zh: g.ex[1] || '' }] : [], lv: L
    }));
    const units = Math.max(1, Math.ceil(words.length / W_PER), Math.ceil(grams.length / G_PER));
    return (EXB[L] = { sig, L, words, grams, units });
  }
  /* ---- 例句：以詞為單位（JPText 斷詞後比對原形／表層），例句來源的等級 ≤ 單元等級 ---- */
  const EXI = {};
  let jpOK = { base: false, full: false };
  function exIndex(L) {
    if (EXI[L]) return EXI[L];
    const J = window.JPText, M = window.MIND;
    if (!J || typeof J.tokenize !== 'function' || !(lvI(L) >= 3 ? jpOK.full : jpOK.base) || !M || !Array.isArray(M.gram)) return null;
    const src = [];
    M.gram.forEach(g => { if (g.ex && g.ex[0] && lvI(g.lv) >= 0 && lvI(g.lv) <= lvI(L) && g.ex[0].length <= 45) src.push({ jp: g.ex[0], zh: g.ex[1] || '' }); });
    const R = window.READING;
    arr(R && R.daily).forEach(a => { const al = String(a.lv || '').toUpperCase(); if (lvI(al) < 0 || lvI(al) > lvI(L)) return; arr(a.p).forEach(p => { if (p[0] && p[0].length <= 45 && !/\s/.test(p[0])) src.push({ jp: p[0], zh: p[1] || '' }); }); });
    const map = new Map();
    src.forEach((s, i) => {
      try { s.tk = J.tokenize(s.jp).filter(t => !t.sym); } catch (e) { s.tk = []; }
      new Set([].concat(...s.tk.map(t => [t.s, t.base]))).forEach(k => { if (k) { if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    });
    return (EXI[L] = { src, map });
  }
  const KANA_W = /^[ぁ-ゟァ-ヿー]+$/;
  function exFor(w, L, used) {
    const X = exIndex(L); if (!X) return null;
    if (!w || !w.jp || (KANA_W.test(w.jp) && w.jp.length < 2)) return [];
    const kanaOnly = KANA_W.test(w.jp);
    const ok = arr(X.map.get(w.jp)).map(i => X.src[i]).filter(s => !(used && used.has(s.jp)) && s.tk.some(t => (t.base === w.jp || t.s === w.jp) && t.pos !== 'part' && (!kanaOnly || !t.zh || !w.zh || zhClash(t.zh, w.zh))));
    ok.sort((a, b) => Math.abs(a.jp.length - 20) - Math.abs(b.jp.length - 20));
    return ok[0] ? [{ jp: ok[0].jp, zh: ok[0].zh }] : [];
  }
  function exOf(it, lv) {
    const L = lvI(lv) >= 0 ? String(lv).toUpperCase() : lvI(it && it.lv) >= 0 ? String(it.lv).toUpperCase() : lvNow();
    if (!it || it.type !== 'vocab') return null;
    return exFor(it, L, null);
  }
  function examItems(L, i) {
    const B = examBank(L); if (!B || i < 0 || i >= B.units) return null;
    const src = '📝 JLPT ' + L + ' 第 ' + (i + 1) + ' 課';
    const out = B.grams.slice(i * G_PER, i * G_PER + G_PER).concat(B.words.slice(i * W_PER, i * W_PER + W_PER)).map(x => Object.assign({}, x, { source: src }));
    // 同一課例句不重複（文法卡的例句先佔）；找不到就不配（ex:[]，首頁也不會再用子字串補）
    const used = new Set(out.filter(x => x.type === 'grammar' && x.ex[0]).map(x => x.ex[0].jp));
    out.forEach(x => { if (x.type !== 'vocab') return; const e = exFor(x, L, used); x.ex = e || []; if (e && e[0]) used.add(e[0].jp); });
    return out;
  }
  const examNeed = L => seq(['data/mind/grammar.js'].concat(LVS.slice(0, lvI(L) + 1).reverse().map(l => 'data/mind/lex-' + l.toLowerCase() + '.js'), ['data/reading/daily.js', 'js/jp-text.js']))
    .then(() => window.JPText && JPText.ready ? JPText.ready(lvI(L) >= 3) : 0)
    .then(() => { jpOK.base = true; if (lvI(L) >= 3) jpOK.full = true; Object.keys(EXI).forEach(k => { if (lvI(k) >= 3 && !jpOK.full) delete EXI[k]; }); });
  const CHAL = [['vocab', '🔤', '單字'], ['grammar', '🧩', '文法'], ['reading', '📄', '讀解'], ['listen', '🎧', '聽解']];

  /* ---------------- 商務：BIZ 單元 → 小單元 ---------------- */
  function bizParts(u) {
    if (!u) return [];
    const lv = String(u.lv || '').toUpperCase(), src = '💼 ' + u.title;
    const V = arr(u.vocab).map(x => ({ id: 'v:' + jp0(x.jp), type: 'vocab', jp: x.jp, kana: x.kana || '', zh: x.zh || '', lv, source: src, ex: [] }));
    const P = arr(u.phrases).map(x => ({ id: 'p:' + normP(x.jp), type: 'phrase', jp: x.jp, kana: x.kana || '', zh: x.zh || '', hint: x.when || '', lv, source: src }));
    const G = arr(u.grammar).map(g => ({ id: 'g:' + String(g.gid || g.pat).replace(/^gram:/, ''), type: 'grammar', jp: g.pat, kana: '', zh: g.zh || '', hint: g.conn ? '接續：' + g.conn : '', lv, source: src, ex: arr(g.ex).map(e => ({ jp: e[0], zh: e[1] || '' })) }));
    const split = (a, n) => { const k = Math.ceil(a.length / n), o = []; for (let i = 0; i < k; i++) o.push(a.slice(Math.floor(a.length * i / k), Math.floor(a.length * (i + 1) / k))); return o; };
    const out = [];
    split(V, CARD).forEach((items, i, all) => out.push({ k: 'v', title: '單字' + (all.length > 1 ? ' ' + (i + 1) : ''), items }));
    const pg = P.concat(G), ps = split(pg, CARD);
    ps.forEach((items, i) => out.push({ k: 'p', title: (items.some(x => x.type === 'grammar') ? '句子＋句型' : '句子') + (ps.length > 1 ? ' ' + (i + 1) : ''), items }));
    return out.map((p, i) => Object.assign(p, { id: 'bz-' + u.id + '-' + (i + 1), n: i + 1, u }));
  }
  const bizUnit = id => arr(window.BIZ && BIZ.units).find(u => u.id === id);

  /* ---------------- 歌曲新聞：依程度短文＋熱門歌 ---------------- */
  // 熱門歌清單以 Songs.HOT 為準（songs.js 匯出後），未匯出前用這份 [歌名, 歌手, YouTube id]
  const HOT0 = [['アイドル', 'YOASOBI', 'ZRtdQ81jPUQ'], ['夜に駆ける', 'YOASOBI', 'by4SYYWlhEs'], ['ライラック', 'Mrs. GREEN APPLE', 'QjrkrVmC-8M'], ['怪獣の花唄', 'Vaundy', 'UM9XNpgrqVk'], ['Lemon', '米津玄師', 'SX_ViT4Ra7k'], ['新時代', 'Ado', '1FliVTcX8bQ'], ['Pretender', 'Official髭男dism', 'TQ8WlA2GXbk'], ['水平線', 'back number', 'iqEr3P78fz8'], ['紅蓮華', 'LiSA', 'x1FV6IrjZCY'], ['群青', 'YOASOBI', 'Y4nEEZwckuU'], ['青と夏', 'Mrs. GREEN APPLE', '-MKfbxHy_NA'], ['ドライフラワー', '優里', 'kzZ6KXDM1RI']];
  const hotList = () => (window.Songs && Array.isArray(Songs.HOT) && Songs.HOT.length ? Songs.HOT : HOT0);
  const RLV = ['zero', 'n5', 'n4', 'n3', 'n2', 'n1'];
  function readOrder() {
    const p = App.profile().lv, k = Math.max(0, RLV.indexOf(p));
    return RLV.slice(k).concat(RLV.slice(0, k).reverse());   // 自己的程度起往上，再補簡單的
  }
  function funRows() {
    const R = window.READING, ord = readOrder();
    const arts = arr(R && R.daily).slice().sort((a, b) => ord.indexOf(a.lv) - ord.indexOf(b.lv));
    const LVN = l => l === 'zero' ? '入門' : String(l).toUpperCase();
    const reads = arts.map(a => { const s = App.stars ? App.stars('read:' + a.id) : 0; return { id: 'fun-r-' + a.id, icon: a.icon || '📰', title: a.title, sub: LVN(a.lv) + '・' + (a.zh || '') + '・' + arr(a.p).length + ' 段', total: 1, done: s ? 1 : 0, stars: s, complete: s > 0, route: 'read-article', params: { daily: a.id }, sec: 'read' }; });
    const hs = [['🌅', '示範曲（自編童謠）', '語音朗讀・可以先試', 'song:demo', { id: 'demo' }]].concat(hotList().map(h => ['🎵', h[0], h[1], 'song:yt:' + h[2], { id: 'yt:' + h[2], hot: h[2] }]));
    const songs = hs.map(([icon, t, a, key, params], i) => { const s = App.stars ? App.stars(key) : 0; return { id: 'fun-s-' + i, icon, title: t, sub: a, total: 1, done: s ? 1 : 0, stars: s, complete: s > 0, route: 'song', params, sec: 'song' }; });
    return reads.concat(songs, [{ id: 'fun-news', icon: '🗞️', title: '近三天新聞', sub: '看懂新聞標題與重點', total: null, done: null, stars: 0, route: 'read', params: { sec: 'news' }, sec: 'news', noNext: true }]);
  }

  /* ---------------- 單元 id ---------------- */
  // tr-<包>、n5-u<1..>（舊 n5-<k>＝20 詞一課，換算到新課）、kana-k1..k10／k11-1..3／k12-1..3、bz-<商務>-<n>、fun-*
  function parse(id) {
    id = String(id || '');
    let m;
    if (id.startsWith('tr-')) return { kind: 'travel', pack: packOf(id), id };
    if ((m = id.match(/^(n[1-5])-u(\d+)$/))) return { kind: 'exam', L: m[1].toUpperCase(), i: +m[2] - 1, id };
    if ((m = id.match(/^(n[1-5])-(\d+)$/))) { const i = Math.floor((+m[2] - 1) * 20 / W_PER); return { kind: 'exam', L: m[1].toUpperCase(), i, id: m[1] + '-u' + (i + 1) }; }
    if ((m = id.match(/^kana-(k1[12])$/))) return { kind: 'kana', k: m[1] + '-1', id: 'kana-' + m[1] + '-1' };
    if ((m = id.match(/^kana-(k\d+(?:-\d)?)$/))) return { kind: 'kana', k: m[1], id };
    if ((m = id.match(/^bz-([a-z]+)-(\d+)$/))) return { kind: 'biz', b: m[1], n: +m[2], id };
    return null;
  }
  const quizAvoid = items => [].concat(...items.map(x => arr(x.ex).map(e => e.jp))).filter(Boolean);
  function unit(id) {
    const P = parse(id); if (!P) return null;
    id = P.id;
    if (P.kind === 'travel' && P.pack) {
      const p = P.pack, items = packItems(p), shop = shopFor(p);
      const wb = items.slice().sort((a, b) => a.jp.length - b.jp.length).slice(0, 2);
      return {
        id, kind: 'travel', icon: p.icon, title: p.name, sub: '必備句 ' + items.length + ' 句・實戰：' + shopLabel(shop), items, shop, shops: p.shops, hasShop: true,
        steps: [
          { type: 'flashcard', items, title: p.name + '：必備句', learn: true },
          { type: 'wordbank', items: wb, params: { max: 5 }, title: p.name + '：排句子' },
          { type: 'shop', items, params: { shop, region: REGION(shop), goal: id }, title: p.name + '：進店用出來' }
        ]
      };
    }
    if (P.kind === 'exam') {
      const items = examItems(P.L, P.i); if (!items) return null;
      const ids = items.map(x => x.id), t = P.L + ' 第 ' + (P.i + 1) + ' 課', ng = items.filter(x => x.type === 'grammar').length;
      return {
        id, kind: 'exam', icon: '📝', title: t, sub: (items.length - ng) + ' 個單字' + (ng ? '＋' + ng + ' 個文法' : '') + '・小考 ' + Q_N + ' 題', items, lv: P.L,
        steps: [
          { type: 'flashcard', items, title: t + '：字卡', learn: true },
          { type: 'choice', items, params: { lv: P.L, kind: ng ? ['form', 'mean', 'kanji', 'form', 'ctx'] : ['mean', 'kanji', 'ctx', 'mean', 'spell'], n: Q_N, ids, quiz: true, retry: false, avoid: quizAvoid(items) }, title: t + '：小考' }
        ]
      };
    }
    if (P.kind === 'kana' && window.KanaLesson && KanaLesson.unitInfo) {
      const u = KanaLesson.unitInfo(P.k); if (!u) return null;
      const q = App.shuffle ? App.shuffle(u.items.slice()).slice(0, Q_N) : u.items.slice(0, Q_N);
      return {
        id, kind: 'kana', icon: '🔤', title: u.title, sub: u.chars.length + ' 個假名・聽音 ' + q.length + ' 題', items: u.items, intro: u.intro, more: u.more,
        steps: [
          { type: 'flashcard', items: u.items, title: '五十音：' + u.title, learn: true },
          { type: 'listen', items: q, params: { mode: 'word', retry: false }, title: u.title + '：聽音選字' }
        ]
      };
    }
    if (P.kind === 'biz') {
      const bu = bizUnit(P.b), part = bizParts(bu).find(x => x.n === P.n); if (!part) return null;
      const items = part.items, t = bu.title + '：' + part.title, lv = String(bu.lv || '').toUpperCase();
      const ph = items.filter(x => x.type === 'phrase'), other = items.filter(x => x.type !== 'phrase');
      const steps = [{ type: 'flashcard', items, title: t, learn: true }];
      if (part.k === 'v') steps.push({ type: 'choice', items: (App.shuffle ? App.shuffle(items.slice()) : items).slice(0, Q_N), params: { retry: false, pool: arr(bu.vocab).map(x => ({ jp: x.jp, kana: x.kana, zh: x.zh, lv, type: 'vocab' })) }, title: t + '：選選看' });
      else {
        const wb = ph.slice().sort((a, b) => a.jp.length - b.jp.length).slice(0, 2);
        if (wb.length) steps.push({ type: 'wordbank', items: wb, params: { max: 5, retry: false }, title: t + '：排句子' });
        const rest = other.concat(ph.filter(x => !wb.includes(x))).slice(0, Q_N - wb.length);
        if (rest.length) steps.push({ type: 'choice', items: rest, params: { retry: false, pool: ph.concat(other) }, title: t + '：選選看' });
      }
      const qn = steps.slice(1).reduce((n, s) => n + s.items.length, 0);
      return { id, kind: 'biz', icon: bu.icon, title: t, sub: items.length + ' 張卡・' + qn + ' 題', items, lv, biz: bu.id, steps };
    }
    return null;
  }
  function loadUnit(id) {
    const P = parse(id); if (!P) return Promise.resolve(null);
    let pr = Promise.resolve();
    if (P.kind === 'travel' && P.pack) pr = seq(['data/world/index.js']).catch(() => { }).then(() => P.pack.src ? seq(['data/world/' + P.pack.src[0] + '.js']) : seq(SC));
    else if (P.kind === 'exam') pr = examNeed(P.L);
    else if (P.kind === 'kana') pr = seq(KN);
    else if (P.kind === 'biz') pr = App.loadScript('js/biz.js').then(() => BIZ.load());
    return pr.then(() => unit(id));
  }

  /* ---------------- 單元列表（給路線頁與其他組） ---------------- */
  // stars：只看「整個單元做完」時的獎勵（App.reward('path:<id>')）；中途離開不給星
  // complete：拿過星，或（沒有實戰步驟的單元）每張卡都學過
  function row(id, icon, title, sub, ids, extra) {
    const total = ids ? ids.length : null, done = ids ? ids.filter(learned).length : null, st = stored(id);
    const o = Object.assign({ id, icon, title, sub, total, done, stars: st }, extra || {});
    if (o.complete == null) o.complete = st > 0 || (!o.hasShop && !!total && done >= total);
    return o;
  }
  const kanaDone = () => window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : 0;
  const zeroKana = () => App.profile().lv === 'zero' && kanaDone() < 46;
  function units(goal, opt) {
    opt = opt || {};
    if (goal === 'travel') return PACKS.map(p => { const sh = shopFor(p); return row(p.id, p.icon, p.name, (window.WORLD ? '實戰：' + shopLabel(sh) : '必備句＋進店'), packIds(p), { hasShop: true }); });
    if (goal === 'kana') {
      if (!window.KanaLesson || !KanaLesson.units) return [];
      return KanaLesson.units().map(u => row('kana-' + u.id, '🔤', u.title, u.chars.slice(0, 5).join(' ') + (u.chars.length > 5 ? '…' : ''), u.chars.map(c => 'kana:' + c)));
    }
    if (goal === 'exam') {
      const L = String(opt.lv || lvNow()).toUpperCase();
      const B = examBank(L); if (!B) return [];
      const out = [];
      for (let i = 0; i < B.units; i++) {
        const gs = B.grams.slice(i * G_PER, i * G_PER + G_PER), ws = B.words.slice(i * W_PER, i * W_PER + W_PER);
        out.push(row(L.toLowerCase() + '-u' + (i + 1), '📝', L + ' 第 ' + (i + 1) + ' 課', ws.slice(0, 3).map(x => x.jp).concat(gs.slice(0, 1).map(x => x.jp)).join('・'), gs.concat(ws).map(x => x.id)));
      }
      out.push(row(L.toLowerCase() + '-mock', '🏁', L + ' 模擬考', '計時・分科配分・合格判定', null, { route: 'challenge-play', params: { lv: L, t: 'mock' }, stars: App.stars ? App.stars('chal:' + L + ':mock') : 0, noNext: true }));
      return out;
    }
    if (goal === 'work') {
      const B = window.BIZ; if (!B || !B.META) return [];
      const out = [];
      B.META.forEach(m => {
        const u = bizUnit(m.id); if (!u) return;
        bizParts(u).forEach(p => out.push(row(p.id, m.icon, p.title, m.title + '・' + m.lv, p.items.map(x => x.id), { group: m.id, lv: m.lv })));
        out.push(row('bz-' + m.id + '-d', '💬', '對話演練＋Email', m.title + '・' + m.lv, null, { group: m.id, lv: m.lv, route: 'biz-unit', params: { id: m.id }, stars: B.stars ? B.stars(m.id) : 0, complete: !!(B.stars && B.stars(m.id)) }));
      });
      return out;
    }
    if (goal === 'fun') return funRows();
    return [];
  }
  function load(goal, opt) {
    opt = opt || {};
    if (goal === 'travel') return seq(SC).then(() => App.loadScript('data/world/index.js').catch(() => { }));
    if (goal === 'kana') return seq(KN);
    if (goal === 'exam') return examNeed(String(opt.lv || lvNow()).toUpperCase());
    if (goal === 'work') return App.loadScript('js/biz.js').then(() => BIZ.load());
    if (goal === 'fun') return App.loadScript('data/reading/daily.js');
    return Promise.resolve();
  }
  // 建議下一單元：第一個還沒完成的（商務先從「適合你」程度以上的單元找）
  function nextOf(list) {
    const can = list.filter(u => !u.noNext && (u.total || u.route) && !u.complete);
    if (list.length && list[0].group) { const k = lvI(lvNow()), up = can.find(u => lvI(u.lv) >= k); if (up) return up; }
    return can[0] || null;
  }
  function nextUnit(goal) {
    try {
      goal = goal || (App.profile().goals || [])[0] || 'travel';
      if (goal === 'travel' && zeroKana()) goal = 'kana';
      if (!['travel', 'exam', 'kana', 'work'].includes(goal)) return null;
      const list = units(goal).filter(u => !u.route);
      const u0 = nextOf(list); if (!u0) return null;
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
  const UI = { tab: null, lv: null, more: {}, open: false, bz: null };
  // 分頁：只顯示所選目的（零基礎未學完假名：五十音放最前）；其他收進「更多」
  function tabs() {
    const p = App.profile(), gs = (p.goals || []).filter(g => GOALS.some(x => x[0] === g));
    const k = ['kana', '🔤', '五十音'];
    const main = (gs.length ? gs : GOALS.map(g => g[0])).map(g => GOALS.find(x => x[0] === g));
    const rest = GOALS.filter(g => !main.includes(g));
    if (zeroKana()) main.unshift(k); else rest.push(k);
    return { main, rest, all: main.concat(rest) };
  }
  const starTxt = n => n ? '★'.repeat(n) + '☆'.repeat(3 - n) : '';
  function progTxt(u) {
    if (u.total == null) return '';
    if (u.hasShop && !u.complete && u.done >= u.total) return `句子 ${u.done}／${u.total}・還差進店`;
    if (u.route) return u.complete ? '已完成' : '還沒做';
    return `已學 ${u.done}／${u.total}`;
  }
  function card(u, next) {
    const pct = u.total ? Math.round(u.done / u.total * 100) : 0, pt = progTxt(u);
    const prog = pt ? `<span class="pa-n">${esc(pt)}</span>${u.route ? '' : `<span class="pa-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>`}` : '';
    return `<button type="button" class="pa-card${next ? ' next' : ''}${u.complete ? ' done' : ''}" data-u="${esc(u.id)}">
      ${next ? '<span class="pa-tag">建議下一個</span>' : ''}
      <span class="pa-ic" aria-hidden="true">${esc(u.icon)}</span><span class="pa-t"><b>${esc(u.title)}</b><small>${esc(u.sub || '')}</small>${prog}</span>
      ${u.stars ? `<span class="pa-st" aria-label="${u.stars} 星">${starTxt(u.stars)}</span>` : ''}</button>`;
  }
  function renderPath(el, params) {
    params = params || {};
    const T = tabs();
    if (params.goal && !params.tab) params = Object.assign({}, params, { tab: params.goal });   // 相容 {goal}
    if (params.tab && T.all.some(t => t[0] === params.tab)) UI.tab = params.tab;
    if (!UI.tab || !T.all.some(t => t[0] === UI.tab)) UI.tab = (T.main.find(t => t[0] !== 'kana') || T.main[0])[0];
    if (params.lv) UI.lv = String(params.lv).toUpperCase();
    const inRest = T.rest.some(t => t[0] === UI.tab), open = UI.open || inRest;
    const tb = ([id, ic, n]) => `<button type="button" role="tab" data-tab="${id}" class="${id === UI.tab ? 'on' : ''}" aria-selected="${id === UI.tab}">${ic} ${esc(n)}</button>`;
    el.innerHTML = `<div class="pa">
      ${zeroKana() && UI.tab !== 'kana' ? `<button type="button" class="pa-pin" data-tab="kana"><b>🔤 先學五十音 ›</b><span>已會 ${kanaDone()}／46 個平假名，每課 5 個字。</span></button>` : ''}
      <div class="tabs pa-tabs" role="tablist">${T.main.map(tb).join('')}${T.rest.length ? `<button type="button" class="pa-mt${open ? ' on2' : ''}" data-mt aria-expanded="${open}">${open ? '收起' : '⋯ 更多'}</button>` : ''}</div>
      ${open && T.rest.length ? `<div class="tabs pa-tabs pa-rest" role="tablist">${T.rest.map(tb).join('')}</div>` : ''}
      <div class="pa-body"><p class="center muted pa-load">載入中…</p></div></div>`;
    const body = el.querySelector('.pa-body');
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; renderPath(el, {}); });
    const mt = el.querySelector('[data-mt]'); if (mt) mt.onclick = () => { UI.open = !open; if (!UI.open && inRest) UI.tab = T.main[0][0]; renderPath(el, {}); };
    const tab = UI.tab, lv = UI.lv || lvNow();
    load(tab, { lv }).then(() => { if (el.isConnected && UI.tab === tab) paint(body, tab); })
      .catch(() => { if (el.isConnected) body.innerHTML = '<p class="center pa-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
    body.addEventListener('change', e => { if (e.target.matches('[data-lvsel]')) { UI.lv = e.target.value; renderPath(el, {}); } });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-u],[data-more],[data-go],[data-bz]'); if (!b) return;
      if (b.dataset.more) { UI.more[b.dataset.more] = (UI.more[b.dataset.more] || 0) + 1; paint(body, UI.tab); return; }
      if (b.dataset.bz) { UI.bz = UI.bz === b.dataset.bz ? '' : b.dataset.bz; paint(body, UI.tab); return; }
      if (b.dataset.go) { App.go(b.dataset.go, b.dataset.lv ? { lv: b.dataset.lv, t: b.dataset.t } : {}); return; }
      const id = b.dataset.u, u = (body._list || []).find(x => x.id === id);
      if (u && u.route) App.go(u.route, u.params || {}); else App.go('path-unit', { id });
    });
  }
  // 長清單只顯示建議單元附近 SHOW 個，其他按「顯示更多」
  function windowed(list, nx, key) {
    if (list.length <= SHOW + 1) return { shown: list, more: '', from: 0 };
    const at = nx ? list.indexOf(nx) : 0, k = UI.more[key] || 0;
    const from = Math.max(0, Math.min(at - 1, list.length - SHOW)), to = Math.min(list.length, from + SHOW * (k + 1));
    return { shown: list.slice(from, to), from, more: to < list.length ? `<button type="button" class="btn block pa-more" data-more="${key}">顯示更多（還有 ${list.length - to} 個）</button>` : '' };
  }
  const grid = (list, nx, one) => `<div class="pa-grid${one ? ' one' : ''}">${list.map(u => card(u, nx && u.id === nx.id)).join('')}</div>`;
  function paint(body, tab) {
    const lv = (UI.lv || lvNow()).toUpperCase();
    const list = units(tab, { lv });
    body._list = list;
    if (!list.length) { body.innerHTML = '<p class="center muted pa-load">這裡還沒有內容</p>'; return; }
    const nx = nextOf(list);
    let html = '';
    if (tab === 'exam') {
      const mock = list[list.length - 1], lessons = list.slice(0, -1), w = windowed(lessons, nx, 'exam' + lv);
      const doneN = lessons.filter(u => u.complete).length;
      html = `<label class="pa-lv"><span>等級</span><select data-lvsel aria-label="日檢等級">${LVS.map(L => `<option value="${L}"${L === lv ? ' selected' : ''}>${L}${L === lvNow() ? '（我的程度）' : ''}</option>`).join('')}</select></label>
        <p class="pa-note">每課 8 個單字＋2 個文法，小考 5 題・已完成 ${doneN}／${lessons.length} 課${w.from > 0 ? `・已跳到第 ${w.from + 1} 課` : ''}</p>
        ${grid(w.shown, nx)}${w.more}${grid([mock], null, true)}
        <details class="pa-more-d"><summary>🏆 ${lv} 分科挑戰題</summary><div class="pa-chal">${CHAL.map(([t, ic, n]) => `<button type="button" class="btn" data-go="challenge-play" data-lv="${lv}" data-t="${t}">${ic} ${n}</button>`).join('')}</div></details>`;
    } else if (tab === 'work') {
      const cur = nx ? nx.group : list[0].group, open = UI.bz == null ? cur : UI.bz;
      html = '<p class="pa-note">每個情境拆成幾個小單元（10 張卡＋5 題），最後做對話與 Email。</p>';
      window.BIZ.META.forEach(m => {
        const g = list.filter(u => u.group === m.id); if (!g.length) return;
        const dn = g.filter(u => u.complete).length, isOpen = open === m.id;
        html += `<button type="button" class="pa-grp${isOpen ? ' on' : ''}" data-bz="${esc(m.id)}" aria-expanded="${isOpen}"><span aria-hidden="true">${esc(m.icon)}</span><b>${esc(m.title)}</b><small>${esc(m.lv)}${lvI(m.lv) >= lvI(lvNow()) && cur === m.id ? '・適合你' : ''}・${dn}／${g.length}</small>${window.BIZ.stars(m.id) ? `<span class="pa-st">${starTxt(window.BIZ.stars(m.id))}</span>` : ''}</button>`;
        if (isOpen) html += grid(g, nx);
      });
      html += '<button type="button" class="btn block pa-free" data-go="biz">📚 商務閱讀與全部單元</button>';
    } else if (tab === 'fun') {
      const reads = list.filter(u => u.sec === 'read'), songs = list.filter(u => u.sec === 'song'), news = list.filter(u => u.sec === 'news');
      const nr = nextOf(reads), ns = nextOf(songs), wr = windowed(reads, nr, 'funr'), ws = windowed(songs, ns, 'funs');
      html = `<h2 class="pa-h">📖 短文路線 <small>已讀 ${reads.filter(u => u.complete).length}／${reads.length} 篇</small></h2>${grid(wr.shown, nr)}${wr.more}
        <h2 class="pa-h">🎵 熱門歌 <small>唱過 ${songs.filter(u => u.complete).length}／${songs.length} 首</small></h2>${grid(ws.shown, ns)}${ws.more}
        ${grid(news, null, true)}<p class="pa-note">歌詞與文章裡點過的詞會自動收進今日課。</p>`;
    } else {
      const w = windowed(list, nx, tab);
      html = grid(w.shown, nx) + w.more;
      if (tab === 'travel') {
        const rg = region();
        html = `<p class="pa-note">每包 8 句必備句＋排 2 句，再進店用一次${rg ? `・實戰地區：${esc(RG[rg])}` : ''}</p>` + html + `<button type="button" class="btn block pa-free" data-go="play">🗾 自由逛日本（冒險地圖）</button>`;
      }
    }
    body.innerHTML = html;
  }

  /* ---------------- 單元頁 ---------------- */
  const ST_DOT = { new: '○', learning: '◐', review: '●', mastered: '★' };
  function renderUnit(el, params) {
    const id = params && params.id;
    el.innerHTML = '<p class="center muted pa-load">載入中…</p>';
    loadUnit(id).then(u => { if (el.isConnected) drawUnit(el, u); })
      .catch(() => { if (el.isConnected) el.innerHTML = '<p class="center pa-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  const STEP = { flashcard: '字卡', wordbank: '排句子', shop: '進店用出來', choice: '選選看', listen: '聽音選字' };
  function goalOf(u) { return u.kind === 'biz' ? 'work' : u.kind; }
  function drawUnit(el, u) {
    if (!u || !u.items.length) { el.innerHTML = '<div class="pa"><p class="center pa-load">找不到這個單元</p></div>'; return; }
    const ids = u.items.map(x => x.id), d = ids.filter(learned).length, st = stored(u.id);
    const pct = Math.round(d / ids.length * 100);
    const list = units(goalOf(u), { lv: u.lv }), k = list.findIndex(x => x.id === u.id), after = list.slice(k + 1).filter(x => !x.noNext);
    const nxt = u.kind === 'biz' ? after[0] : (after.find(x => !x.route && !x.complete) || after[0]);
    const complete = st > 0 || (!u.hasShop && d >= ids.length);
    const steps = u.steps.map(s => s.params && s.params.quiz ? '小考' : STEP[s.type] || s.type).join(' → ');
    const pr = u.hasShop && !complete && d >= ids.length ? `句子 ${d}／${ids.length}・還差：進店用出來` : `已學 ${d}／${ids.length}`;
    let shops = '';
    if (u.kind === 'travel') {
      const rs = [...new Set(u.shops.map(REGION))];
      shops = `<div class="pa-rg"><span>實戰地點</span>${rs.length > 1 ? rs.map(r => `<button type="button" class="btn sm${REGION(u.shop) === r ? ' on' : ''}" data-rg="${r}" aria-pressed="${REGION(u.shop) === r}">${esc(RG[r])}</button>`).join('') : ''}<small>${esc(shopLabel(u.shop))}</small></div>`;
    }
    el.innerHTML = `<div class="pa pa-unit">
      <div class="pa-uh"><span class="pa-ic" aria-hidden="true">${esc(u.icon)}</span><div><h1>${esc(u.title)}</h1><p class="muted">${esc(u.sub)}</p></div>${st ? `<span class="pa-st" aria-label="${st} 星">${starTxt(st)}</span>` : ''}</div>
      <div class="pa-prog"><span>${esc(pr)}</span><span class="pa-bar" aria-hidden="true"><i style="width:${pct}%"></i></span></div>
      <p class="pa-note pa-flow">${esc(steps)}・約 ${Math.max(2, Math.round(u.steps.length * 1.5))} 分鐘</p>
      ${shops}
      <button type="button" class="btn primary block pa-start" id="pa-start">${complete ? '▶ 再練一次' : d >= ids.length && u.hasShop ? '▶ 進店用出來' : d ? '▶ 繼續學' : '▶ 開始'}</button>
      ${u.intro ? `<div class="pa-intro">${u.intro}</div>` : ''}
      ${u.more ? `<details class="pa-more-d"><summary>📘 ${esc(u.more.title)}</summary><div class="kn">${u.more.html}</div></details>` : ''}
      ${u.kind !== 'kana' ? `<h2 class="pa-h">這課會學到</h2><ul class="pa-items">${u.items.map(x => `<li class="s-${Learn.status(x.id)}"><span class="pa-dot" aria-hidden="true">${ST_DOT[Learn.status(x.id)] || '○'}</span><span class="pa-jp"><b lang="ja">${esc(x.jp)}</b>${x.kana && x.kana !== x.jp ? `<small lang="ja">${esc(x.kana)}</small>` : ''}</span><span class="pa-zh">${esc(x.zh)}</span></li>`).join('')}</ul>` : ''}
      ${u.kind === 'biz' && !(nxt && nxt.route) ? `<button type="button" class="btn block pa-next" data-biz="${esc(u.biz)}">💬 對話演練＋Email（${esc(bizUnit(u.biz).title)}）›</button>` : ''}
      ${nxt ? `<button type="button" class="btn block pa-next" data-u="${esc(nxt.id)}">下一單元：${esc(nxt.title)} ›</button>` : ''}
    </div>`;
    const root = el.querySelector('.pa-unit');
    root.querySelector('#pa-start').onclick = () => start(u, nxt, complete);
    root.addEventListener('click', e => {
      const s = e.target.closest('[data-ks]'); if (s) { App.speak(s.dataset.ks); return; }
      const r = e.target.closest('[data-rg]'); if (r) { setRegion(r.dataset.rg); drawUnit(el, unit(u.id)); return; }
      const z = e.target.closest('[data-biz]'); if (z) { App.go('biz-unit', { id: z.dataset.biz }); return; }
      const n = e.target.closest('.pa-next[data-u]'); if (n) { if (nxt && nxt.route) App.go(nxt.route, nxt.params || {}); else App.go('path-unit', { id: n.dataset.u }); }
    });
  }
  // 開始：交給 G1 的 act 路由（Activity.session 跑全部步驟、統一結算）；做完才給星（reward path:<id>），中途離開不給
  // 已學過的卡不再出現在字卡步驟（今日課學過的不重來）；「再練一次」才全部重看
  function start(u, nxt, again) {
    const back = { route: 'path-unit', params: { id: u.id } };
    const steps = u.steps.map(s => {
      const items = s.learn && !again ? s.items.filter(x => fresh(x.id)) : s.items;
      return items.length || !s.learn ? { type: s.type, items, params: s.params || {}, title: s.title } : null;
    }).filter(Boolean);
    const next = nxt ? (nxt.route ? { label: '下一步：' + nxt.title, route: nxt.route, params: nxt.params || {} } : { label: '下一單元：' + nxt.title, route: 'path-unit', params: { id: nxt.id } }) : null;
    if (!u.hasShop) { App.go('act', { steps, title: u.title, back, next, lv: u.lv, reward: 'path:' + u.id }); return; }
    // 有實戰的單元：星數只在 shop 步驟 meta.done 時給（中途離開實戰＝沒完成，不給星）
    App.loadScript('js/activity.js').then(() => {
      shopWrap();
      steps.forEach(s => { if (s.type === 'shop') s.type = 'pathshop'; });
      App.go('act', { steps, title: u.title, back, next, lv: u.lv });
    }).catch(() => App.go('act', { steps, title: u.title, back, next, lv: u.lv }));
  }
  function shopWrap() {
    if (!window.Activity || Activity.get('pathshop')) return;
    Activity.register('pathshop', {
      needItems: false,
      start(el, ctx) {
        const def = Activity.get('shop'); if (!def) return Promise.resolve(null);
        return Promise.resolve(def.start(el, ctx)).then(r => {
          const m = r && r.meta;
          if (m && m.done) { try { App.reward('path:' + ctx.params.goal, Math.max(1, Math.min(3, m.stars || 2)), ctx.title); } catch (e) { } }
          return r;
        });
      }
    });
  }

  App.register('path', { title: '路線', icon: '🧭', nav: true, navOrder: 2, render: renderPath });
  App.register('path-unit', { title: '單元', icon: '🧭', nav: false, navParent: 'path', render: renderUnit });
  window.Path = { units, load, unit, loadUnit, nextUnit, prepare, exOf, region, shopFor, PACKS };
})();
