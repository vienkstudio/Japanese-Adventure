/* =========================================================
   路線額外練習 window.PathExtra（v13：經典練習拆進主線，不再有「🏯 經典練習」集中頁）
   PathExtra.list(goal, key) -> [{ id, icon, label, sub, go() }]
     key 'tr-<包>'（旅遊包）：該場景的舊旅程狀況題（trip-event）、情境小遊戲（menu）、對話演練／口說（town drill）、
                             聽力特訓（boot-play：店員問句、看板、數字、量詞，依場景過濾）
     key 'kana' 或 goal 'kana'：假名戰鬥（quest 平／片／濁拗音／畢業大考）、50 音小考（kana-quiz）、五十音字卡（cards）
     goal 'exam'：日檢字卡（cards jlpt）、日檢挑戰（challenge）
     其他：[]
   PathExtra.kanaTable(el)：五十音表（平／片切換、清音／濁音／拗音、點字發音、已學 ✓、點行首進對應路線五十音單元 path-unit kana-k*）
   go() 一律 App.go(舊路由, {…, from:'path'})：舊模組由 index.html 的 Home.lazy 延遲載入；做完按頂列 ← 回路線。
   本檔載入時不需要任何舊資料（清單用靜態對照表；有 MENUS 時用它的名稱）。
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const arr = a => Array.isArray(a) ? a : [];
  const FROM = 'path';

  /* ---------- 旅遊包 → 舊場景（與 js/path.js PACKS 同步；有 Path.PACKS 時以它為準） ---------- */
  const PACK_SC = {
    konbini: ['konbini'], eat: ['yakiniku'], ramen: ['ramen'], station: ['station', 'directions'], hotel: ['hotel'], airport: ['airport'],
    cafe: ['cafe'], drug: ['drugstore'], shop: ['clothes'], izakaya: ['izakaya'], sight: ['shrine'], market: [], rental: [], emer: ['emergency']
  };
  const SC = {
    konbini: ['🏪', '便利商店'], ramen: ['🍜', '拉麵店'], cafe: ['☕', '咖啡廳'], drugstore: ['💊', '藥妝店'], izakaya: ['🏮', '居酒屋'], clothes: ['👕', '服飾店'],
    directions: ['🧭', '問路'], station: ['🚉', '車站'], hotel: ['🏨', '飯店'], shrine: ['⛩️', '神社'], airport: ['✈️', '機場'], emergency: ['🆘', '緊急求助'], yakiniku: ['🥩', '燒肉店']
  };
  // 情境小遊戲名稱（data/menus.js；沒載入時用這份）
  const MENU_N = {
    konbini: ['收銀台熱食', '飲料冷藏櫃', '結帳時回答店員'], ramen: ['券売機買餐券', '告訴師傅喜好', '用餐中・吃完離開'], cafe: ['點飲料', '客製化需求', '甜點櫃'],
    drugstore: ['藥品貨架', '美妝專櫃', '問商品在哪'], izakaya: ['入店・帶位・先點飲料', '平板點菜', '續攤：野毛串燒', 'ラストオーダー・結帳'],
    yakiniku: ['入店・選方案', 'QR 點肉', '選醬汁', '烤肉中', '追加點肉', '櫃台結帳'], clothes: ['挑衣服', '問尺寸・顏色', '店內找地方'],
    directions: ['街上問路', '找觀光景點', '搭計程車'], station: ['買車票', '問月台', '新幹線綠色窗口'], hotel: ['跟櫃台要備品', '問設施時間', '客房服務'],
    shrine: ['授與所', '挑御守', '境內問路'], airport: ['報到選座位', '機場商店', '機上服務'], emergency: ['藥局買藥', '說明哪裡痛', '緊急找地方']
  };
  // 聽力特訓（data/drills.js）：c 店員問句場景、s 看板分類、n 數字類別、k 量詞
  const BOOT = {
    konbini: { c: ['konbini'], s: 'sh', n: 'price', k: 1 }, eat: { c: ['yakiniku', 'rest'], s: 'fd', n: 'people', k: 1 }, ramen: { c: ['ramen'], s: 'fd', n: 'price' },
    station: { c: ['station'], s: 'st', n: 'track' }, hotel: { c: ['hotel'], s: 'ct', n: 'floor' }, airport: { s: 'st', n: 'time' }, cafe: { c: ['cafe'], s: 'fd', n: 'price', k: 1 },
    drug: { c: ['drugstore'], s: 'sh', n: 'price' }, shop: { s: 'sh', n: 'price', k: 1 }, izakaya: { c: ['izakaya'], s: 'fd', n: 'people', k: 1 }, sight: { s: 'ct', n: 'time' },
    market: { s: 'fd', n: 'price', k: 1 }, rental: { n: 'date' }, emer: { s: 'fa' }
  };
  const CLERK_N = { konbini: '便利商店', ramen: '拉麵店', izakaya: '居酒屋', yakiniku: '燒肉店', rest: '餐廳', cafe: '咖啡廳', drugstore: '藥妝店', hotel: '飯店', station: '車站' };
  const SIGN_N = { st: '車站', fa: '設施', sh: '店家', fd: '餐飲', ct: '街道・飯店' };
  const NUM_N = { price: '價格', floor: '樓層', track: '月台', car: '車廂', people: '人數', time: '時間', date: '日期' };

  const item = (id, icon, label, sub, route, params) => ({ id, icon, label, sub, go: () => App.go(route, Object.assign({}, params, { from: FROM })) });
  function packScenes(k) {
    const P = window.Path && arr(Path.PACKS).find(p => p.id === 'tr-' + k);
    return (P ? arr(P.scenes) : arr(PACK_SC[k])).filter(s => SC[s]);
  }
  function menuNames(sc) {
    const M = window.MENUS && arr(window.MENUS[sc]);
    return M && M.length ? M.map(m => [m.icon || '🧾', m.name]) : arr(MENU_N[sc]).map(n => ['🧾', n]);
  }
  function travel(key) {
    const k = String(key).replace(/^tr-/, ''), scs = packScenes(k), out = [];
    scs.forEach(sc => out.push(item('x:ev:' + sc, '⚡', SC[sc][1] + '狀況題', '店員這樣說，你怎麼回？5 題', 'trip-event', { stop: sc })));
    scs.forEach(sc => menuNames(sc).forEach(([ic, n], i) => out.push(item('x:menu:' + sc + ':' + i, ic, n, SC[sc][0] + ' 情境任務・限時', 'menu', { id: sc, m: i }))));
    if (scs.length) {
      const nm = scs.map(s => SC[s][1]).join('・');
      out.push(item('x:dlg:' + k, '🎭', '打字對話', nm + '：跟店員來回對話', 'drill', { scenes: scs, kind: 'dialog', title: nm }));
      out.push(item('x:spk:' + k, '🎤', '口說對話', '開口說出回答（不支援麥克風時改跟讀）', 'drill', { scenes: scs, kind: 'speak', title: nm }));
    }
    const B = BOOT[k] || {};
    arr(B.c).forEach(c => out.push(item('x:clerk:' + c, '🗣️', '聽店員問句', CLERK_N[c] + '：同一句話的不同講法', 'boot-play', { m: 'clerk', f: c })));
    if (B.s) out.push(item('x:sign:' + B.s, '🪧', '看標示', SIGN_N[B.s] + '的標示', 'boot-play', { m: 'sign', f: B.s }));
    if (B.n) out.push(item('x:num:' + B.n, '🔢', '聽數字', '聽' + NUM_N[B.n] + '，打出數字', 'boot-play', { m: 'num', f: B.n }));
    if (B.k) out.push(item('x:cnt', '🧮', '聽量詞', '一個、兩杯、三張…', 'boot-play', { m: 'num', f: 'counter' }));
    return out;
  }
  /* ---------- 五十音：小考、字卡 ---------- */
  function kana() {
    const out = [item('x:kquiz', '✏️', '假名小考', '聽音選字、看字選音，10 題', 'kana-quiz', {})];
    out.push(item('x:kcards', '🎴', '五十音字卡', '平假名・片假名・濁音拗音', 'cards', { deck: 'hira' }));
    return out;
  }
  function exam() {
    return [
      item('x:jcards', '🎴', '日檢字卡', 'N5～N1 單字牌組，翻卡自評', 'cards', { deck: 'jlpt' }),
      item('x:chal', '🏆', '日檢挑戰', '分科題組、限時、模擬考', 'challenge', {})
    ];
  }
  function list(goal, key) {
    key = String(key || '');
    try {
      if (/^tr-/.test(key)) return travel(key);
      if (key === 'kana' || (!key && goal === 'kana')) return kana();
      if (goal === 'exam') return exam();
    } catch (e) { console.error(e); }
    return [];
  }

  /* ---------- 五十音表 ---------- */
  const KD = () => ({
    K: typeof KANA !== 'undefined' ? KANA : [], D: typeof DAKU !== 'undefined' ? DAKU : [], Y: typeof YOON !== 'undefined' ? YOON : [],
    G: typeof GRID !== 'undefined' ? GRID : [], R: typeof ROW_NAMES !== 'undefined' ? ROW_NAMES : []
  });
  const TS = { sc: 'h', t: 'seion' };
  const rn = r => String(r || '').replace(/\s*\(.*\)/, '');
  function learned() {
    const s = new Set(window.Learn && Learn.kanaLearned ? Learn.kanaLearned() : []);
    return h => s.has(h) || !!(window.Learn && Learn.status && Learn.status('kana:' + h) !== 'new');
  }
  // 行 → 路線單元 id（js/path.js：kana-k1..k10、kana-k11-1..3、kana-k12-1..3；KanaLesson.units 的切法：濁音每課 10、拗音每課 9）
  function rows() {
    const d = KD(), by = {};
    d.K.concat(d.D, d.Y).forEach(k => { if (!by[k[0]]) by[k[0]] = k; });
    if (TS.t === 'seion') return { cols: 5, by, list: d.G.map((r, i) => ({ name: d.R[i] || '', unit: 'k' + Math.min(i + 1, 10), cells: r })) };
    const src = TS.t === 'daku' ? d.D : d.Y, n = TS.t === 'daku' ? 5 : 3, per = TS.t === 'daku' ? 10 : 9, base = TS.t === 'daku' ? 'k11' : 'k12', out = [];
    for (let i = 0; i < src.length; i += n) out.push({ name: TS.t === 'daku' ? src[i][0] + '行' : src[i][0], unit: base + '-' + (Math.floor(i / per) + 1), cells: src.slice(i, i + n).map(k => k[0]) });
    return { cols: n, by, list: out };
  }
  function tableHTML() {
    const R = rows(), on = learned(), kt = TS.sc === 'k';
    const seg = (attr, l, cur) => `<div class="kt-seg" role="group">${l.map(([v, n]) => `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${n}</button>`).join('')}</div>`;
    const nameOf = r => kt ? r.name.replace(/^[ぁ-ゖ]+/, m => [...m].map(c => (R.by[c] || [])[1] || c).join('')) : r.name;
    const nOn = KD().K.filter(k => on(k[0])).length;
    return `<div class="kt-h"><h2>🔤 五十音表</h2><small>已學 ${nOn}／46・點字聽發音</small></div>
      ${seg('ksc', [['h', 'ひらがな 平假名'], ['k', 'カタカナ 片假名']], TS.sc)}
      ${seg('kt', [['seion', '清音'], ['daku', '濁音'], ['yoon', '拗音']], TS.t)}
      <div class="kt-g${R.cols === 3 ? ' c3' : ''}">${R.list.map(r => {
        const hs = r.cells.filter(Boolean), done = hs.length && hs.every(on);
        return `<button type="button" class="kt-row${done ? ' done' : ''}" data-unit="${esc(r.unit)}" aria-label="${esc(r.name)}：進入單元"><span lang="ja">${esc(nameOf(r))}</span><small>${done ? '✓ 學過' : '學 ›'}</small></button>` +
          r.cells.map(h => { const k = h && R.by[h]; if (!k) return '<span class="kt-c nil" aria-hidden="true"></span>';
            return `<button type="button" class="kt-c${on(h) ? ' on' : ''}" data-ks="${esc(h)}" aria-label="${esc(kt ? k[1] : k[0])} ${esc(rn(k[2]))}"><span class="g" lang="ja">${esc(kt ? k[1] : k[0])}</span><span class="r">${esc(rn(k[2]))}</span></button>`; }).join('');
      }).join('')}</div>`;
  }
  function kanaTable(el) {
    if (!el) return;
    let box = el.querySelector(':scope > .kt');
    if (!box) { box = document.createElement('section'); box.className = 'kt'; el.insertBefore(box, el.firstChild); }
    const draw = () => { box.innerHTML = tableHTML(); };
    if (typeof KANA === 'undefined') { box.innerHTML = '<p class="kt-note">載入五十音表…</p>'; App.loadScript('kana-data.js').then(draw).catch(() => { box.innerHTML = '<p class="kt-note">五十音表載入失敗</p>'; }); }
    else draw();
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b || !box.contains(b)) return;
      const d = b.dataset;
      if (d.ksc) { TS.sc = d.ksc; draw(); return; }
      if (d.kt) { TS.t = d.kt; draw(); return; }
      if (d.unit) { App.go('path-unit', { id: 'kana-' + d.unit }); return; }
      if (d.ks) {
        const k = rows().by[d.ks]; App.speak(k ? k[0] : d.ks);
        box.querySelectorAll('.kt-c.say').forEach(c => c.classList.remove('say')); b.classList.add('say');
      }
    };
    return box;
  }

  window.PathExtra = { list, kanaTable };

  // 50 音小考（獨立頁，PathExtra 用；依賴 kana-data.js、js/kana-lesson.js 由 index.html 的 Home.lazy 載入）
  App.register('kana-quiz', {
    title: '假名測驗', icon: '✏️', nav: false, navParent: 'path',
    render(el) {
      if (!window.KanaLesson || !KanaLesson.quiz) { el.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>'; return; }
      el.innerHTML = '<section class="kq"><h1>✏️ 假名測驗</h1><div class="tabs kq-mode" role="group" aria-label="模式"><button type="button" class="on" aria-pressed="true">✏️ 小考 10 題</button><button type="button" id="kqBattle" aria-pressed="false">⚔️ 戰鬥模式</button></div><div id="kqBox"></div></section>';
      el.querySelector('#kqBattle').onclick = () => { const x = PathExtra.list('kana', 'kana')[0]; if (x) x.go(); else App.go('quest', { id: 'h-a', free: true, from: 'path' }); };
      KanaLesson.quiz(el.querySelector('#kqBox'));
    }
  });
  // 舊連結 classic → 路線（經典練習已拆進各旅遊包與五十音分頁）
  App.register('classic', { title: '路線', icon: '🧭', nav: false, transient: true, navParent: 'path', render() { setTimeout(() => App.go('path'), 0); } });
})();
