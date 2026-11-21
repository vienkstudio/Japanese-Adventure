/* =========================================================
   導引 window.NAV（v14）：全站功能清單的單一來源＋依使用者推薦＋功能搜尋。由「查」頁（js/lookup.js）延遲載入。
   NAV.TOOLS：[{ id, cat, icon, name, desc, kw[], route?, params?, run?, need? }]
     route：App.go(route, params)；run：動作（備份、御朱印帳…不是路由）；need:'pack'：先選旅遊包（App.go('lookup',{pick:id})），
     選完呼叫 PathExtra.list('travel','tr-'+包) 裡 id 開頭為 pre 的那一項 go()（js/classic.js，唯一一份場景對照表）。
   NAV.forMe() -> 推薦 4 張：☆ 釘選 ＞ 身分預設（goals × lv，固定不依次數重排）；第 4 格＝上次用的（不重複）。
   NAV.search(q) -> {top:[≤3 功能：名稱或同義詞完全相同／開頭相同], more:[其他功能命中]}
   NAV.go(t)、NAV.note(id, params)、NAV.pin(id)、NAV.pinned(id)、NAV.CATS、NAV.renderPick(el, params)
   狀態存 App.state.nav = { pin:[id], last:{id, params} }（隨備份、雲端走）。
   不放 v13 收掉的舊模組（trip 13 站、practice-map、scene；深連結照舊可用）。
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const arr = a => Array.isArray(a) ? a : [];
  const CATS = [['kana', '🔤', '五十音'], ['travel', '🧳', '旅遊'], ['exam', '📝', '日檢'], ['work', '💼', '商務'], ['fun', '🎵', '歌曲・閱讀'], ['daily', '📅', '每天學'], ['me', '👤', '我的']];
  // 旅遊包（與 js/path.js PACKS 同步；有 Path.PACKS 時以它為準）
  const PACK0 = [['konbini', '🏪', '便利商店'], ['eat', '🍱', '餐廳・燒肉'], ['ramen', '🍜', '拉麵・麵店'], ['station', '🚉', '車站與交通'], ['hotel', '🏨', '飯店・旅館'], ['airport', '✈️', '機場'], ['cafe', '☕', '咖啡・甜點'],
    ['drug', '💊', '藥妝店'], ['shop', '🛍️', '購物・伴手禮'], ['izakaya', '🏮', '居酒屋'], ['sight', '⛩️', '觀光・寺社'], ['market', '🦀', '市場・美食街'], ['rental', '🚗', '租車・租借'], ['emer', '🆘', '緊急・醫療']];
  const packs = () => (window.Path && arr(Path.PACKS).length ? Path.PACKS.map(p => [p.id.slice(3), p.icon, p.name]) : PACK0);
  const classic = () => window.PathExtra ? Promise.resolve() : App.loadScript('js/classic.js');
  const T = (id, cat, icon, name, desc, kw, o) => Object.assign({ id, cat, icon, name, desc, kw }, o);
  const TOOLS = [
    T('kana-guide', 'kana', '📖', '入門講義', '三種文字、母音、圖解＋諧音、易混淆字', ['講義', '入門', '入門講義', '教學', '零基礎', '從頭學', '怎麼開始', '諧音', '圖解'], { route: 'kana-guide' }),
    T('kana-drill', 'kana', '🎯', '50 音訓練表', '總表背誦、閃卡、測驗、書寫練習紙', ['訓練表', '50音訓練表', '五十音訓練', '書寫', '寫字', '練習紙', '列印', '閃卡', '背五十音'], { route: 'kana-drill' }),
    T('kana-table', 'kana', '🔤', '五十音表', '平假名・片假名，點字聽發音、進單元', ['五十音', '50音', '五十音表', '五十音图', '假名', '假名表', '平假名', '片假名', 'あいうえお', 'アイウエオ', 'aiueo', 'hiragana', 'katakana', 'kana', '注音'], { route: 'path', params: { tab: 'kana' } }),
    T('kana-quiz', 'kana', '✏️', '50 音小考', '聽音選字、看字選音，10 題', ['小考', '假名測驗', '五十音測驗', 'quiz'], { route: 'kana-quiz' }),
    T('kana-battle', 'kana', '⚔️', '假名戰鬥', '答對就攻擊，闖關記假名', ['戰鬥', '闖關', '假名遊戲', 'battle'], { run: () => classic().then(() => { const x = PathExtra.list('kana', 'kana')[0]; if (x) x.go(); else App.go('quest', { id: 'h-a', free: true }); }) }),
    T('kana-cards', 'kana', '🎴', '五十音字卡', '翻卡記假名、諧音聯想', ['假名字卡', '五十音卡'], { route: 'cards', params: { deck: 'hira' } }),
    T('phrasebook', 'travel', '📖', '旅遊手冊', '點餐、購物、交通、住宿；大字給店員看', ['手冊', '旅遊手冊', '常用句', '旅遊句', '給店員看', '大字', '出示', 'phrase', '会话'], { route: 'phrasebook', params: { cat: 'must' } }),
    T('emer', 'travel', '🆘', '緊急求助', '110 警察・119 救護車・求救句', ['緊急', '急救', '救命', '求救', '警察', '醫院', '医院', '生病', '受傷', '救護車', '110', '119', 'help', 'sos'], { route: 'phrasebook', params: { cat: 'emer' } }),
    T('dialog', 'travel', '🎭', '對話演練', '選一個地方，跟店員來回對話', ['對話', '会话', '會話', '點餐', '點菜', '点餐', '店員', '餐廳', '對話練習', 'dialog'], { need: 'pack', pre: 'x:dlg:' }),
    T('speak', 'travel', '🎤', '口說對話', '開口說出回答（不支援麥克風改跟讀）', ['口說', '說話', '開口', '發音', '麥克風', '跟讀', 'speak'], { need: 'pack', pre: 'x:spk:' }),
    T('menu', 'travel', '🧾', '情境小遊戲', '點餐、結帳、買票的限時任務', ['小遊戲', '遊戲', '限時', '拉麵', '券売機', '買票', '結帳', 'game'], { need: 'pack', pre: 'x:menu:' }),
    T('event', 'travel', '⚡', '狀況題', '店員這樣說，你怎麼回？', ['狀況題', '情境題', '店員問', '怎麼回'], { need: 'pack', pre: 'x:ev:' }),
    T('boot', 'travel', '🎧', '實戰特訓', '店員問句聽解、看板、數字、量詞', ['特訓', '聽力', '看板', '數字', '量詞', '聽解', 'listening'], { route: 'boot' }),
    T('play', 'travel', '🗾', '冒險地圖', '逛日本街道、進店實戰、蓋御朱印', ['冒險', '地圖', '街道', '逛街', '進店', '實戰', 'map'], { route: 'play' }),
    T('tr-path', 'travel', '🧳', '旅遊路線', '14 個場景包：必備句、單字、進階句', ['旅遊', '旅行', '出國', '日本玩', '旅遊課', 'travel', 'trip'], { route: 'path', params: { tab: 'travel' } }),
    T('ex-path', 'exam', '📝', '日檢路線', 'N5–N1 每課 8 單字＋2 文法', ['日檢', '日檢課', 'jlpt', 'n1', 'n2', 'n3', 'n4', 'n5', '考試', '检定'], { route: 'path', params: { tab: 'exam' } }),
    T('chal', 'exam', '🏆', '日檢挑戰', '文字、文法、讀解、聽解分科題', ['挑戰', '模擬考', '考古題', '測驗', '讀解', '聽解', '分科', 'mock', 'test'], { route: 'challenge' }),
    T('gram', 'exam', '📗', '文法句型', 'N5–N1 句型、接續、例句', ['文法', '句型', '语法', '接續', 'grammar'], { route: 'lookup', params: { view: 'gram' } }),
    T('dict', 'exam', '📘', '字典', 'N5–N1 單字、讀音、例句', ['字典', '辭典', '词典', '單字', '单词', '生字', 'dictionary', 'vocab'], { route: 'kb', params: { p: 'db', kind: 'word' } }),
    T('ex-cards', 'exam', '🃏', '日檢字卡', 'N5–N1 單字牌組，翻卡自評', ['日檢字卡', '背單字', 'flashcard'], { route: 'cards', params: { deck: 'jlpt' } }),
    T('kb', 'exam', '📚', '知識庫', '單字、文法、場景的完整資料', ['知識庫', '資料庫', '百科', 'database'], { route: 'kb' }),
    T('mind3d', 'exam', '🧠', '3D 心智圖', '把單字與文法連成立體地圖', ['心智圖', '思維導圖', '3d', 'mindmap', '關聯圖'], { route: 'mind3d' }),
    T('biz', 'work', '💼', '商務日語', '敬語、電話、Email、開會、報連相', ['商務', '商用', '工作', '上班', '職場', 'email', 'mail', '信件', '開會', '會議', '电话', '電話', 'business'], { route: 'biz' }),
    T('keigo', 'work', '🙇', '敬語・商務句型', '尊敬語、謙讓語、商務常用句', ['敬語', '敬语', '尊敬語', '謙讓語', '丁寧語', 'keigo'], { route: 'lookup', params: { view: 'keigo' } }),
    T('biz-read', 'work', '📑', '商務閱讀', '職場文章，讀完回答問題', ['商務閱讀', '商業文章', '職場文章'], { run: () => { App.go('biz'); let n = 0; const tick = () => { const a = document.querySelector('#main [data-art]'); if (a) { a.scrollIntoView({ block: 'center' }); return; } if (++n < 40) setTimeout(tick, 150); }; setTimeout(tick, 200); } }),
    T('songs', 'fun', '🎵', '歌曲', '貼 YouTube（含翻唱）跟唱、看懂歌詞', ['歌', '歌曲', '歌詞', '跟唱', '唱歌', '日文歌', '翻唱', 'cover', '卡拉ok', 'karaoke', 'youtube', '動漫', '动漫', 'anime', 'song', 'music'], { route: 'songs' }),
    T('read', 'fun', '📚', '閱讀', '每日短文與我的文章', ['閱讀', '阅读', '文章', '短文', '我的文章', 'reading'], { route: 'read', params: { sec: 'art' } }),
    T('news', 'fun', '📰', '近三天新聞', '看懂日本新聞標題與重點', ['新聞', '新闻', 'news', 'nhk', 'yahoo'], { route: 'read', params: { sec: 'news' } }),
    T('url', 'fun', '🔗', '匯入網址', '貼網址或文字，變成可點詞的閱讀', ['網址', '网址', '網頁', '連結', '链接', '匯入', '貼上', 'url', 'link'], { route: 'read', params: { mode: 'url' } }),
    T('today', 'daily', '▶', '今日課', '複習＋新學＋應用，約 5 分鐘', ['今日課', '今天', '每日', '上課'], { route: 'today' }),
    T('review', 'daily', '📌', '複習', '今天到期的字、不會清單', ['複習', '复习', '忘記了', '忘记', '不會', '錯題', 'review'], { route: 'review' }),
    T('cards', 'daily', '🎴', '字卡', '所有牌組：五十音、日檢、不會清單', ['字卡', '卡片', 'cards'], { route: 'cards' }),
    T('path', 'daily', '🧭', '路線', '依目的排好的全部單元', ['路線', '課程', '單元', 'course'], { route: 'path' }),
    T('settings', 'me', '⚙️', '設定', '程度、目的、字級、深色、語音', ['設定', '设置', '字太小', '字太大', '字級', '大字', '深色', '夜間', '暗色', '黑色', '語音', '聲音', '音效', '程度', '目的', 'settings', 'dark'], { route: 'settings' }),
    T('backup', 'me', '💾', '備份／還原', '換手機、雲端存檔', ['備份', '备份', '還原', '換手機', '換電腦', '存檔', '雲端', 'backup'], { run: () => App.backup() }),
    T('goshuin', 'me', '⛩️', '御朱印帳', '冒險時蓋到的店家印章', ['御朱印', '印章', '蓋章', '集章', 'stamp'], { run: () => { if (window.World && World.goshuin) return World.goshuin(); if (window.Home && Home.need) { App.toast('⏳ 載入御朱印帳…'); Home.need('play').then(() => { if (window.World && World.goshuin) World.goshuin(); }).catch(() => App.toast('載入失敗，請稍後再試')); } } })
  ];
  const byId = id => TOOLS.find(t => t.id === id) || null;

  /* ---------- 狀態 ---------- */
  const st = () => { const S = App.state; if (!S.nav || typeof S.nav !== 'object') S.nav = {}; if (!Array.isArray(S.nav.pin)) S.nav.pin = []; S.nav.pin = S.nav.pin.filter(byId); return S.nav; };
  function note(id, params) { if (!byId(id)) return; st().last = { id, params: params || null }; App.save(); }
  const pinned = id => st().pin.includes(id);
  function pin(id) { const s = st(); if (!byId(id)) return false; const i = s.pin.indexOf(id); if (i >= 0) s.pin.splice(i, 1); else { s.pin.push(id); if (s.pin.length > 4) s.pin.shift(); } App.save(); return i < 0; }

  /* ---------- 推薦（固定）：☆ ＞ 身分預設；第 4 格＝上次用的 ---------- */
  const PRESET = {
    zero: ['kana-guide', 'kana-drill', 'kana-table'],
    travel: ['phrasebook', 'dialog', 'menu'],
    examLo: ['gram', 'dict', 'chal'], examHi: ['chal', 'gram', 'kb'],
    work: ['biz', 'keigo', 'biz-read'],
    fun: ['songs', 'read', 'url']
  };
  function preset() {
    const raw = (App.state && App.state.profile) || {}, p = App.profile();
    const known = ['travel', 'exam', 'work', 'fun'];
    const gs = raw.placed && Array.isArray(raw.goals) && raw.goals.length ? raw.goals.filter(g => known.includes(g)) : known;   // 沒定位／沒選目的＝多目的
    const lv = p.lv, hi = lv === 'n2' || lv === 'n1';
    const one = g => g === 'exam' ? PRESET[hi ? 'examHi' : 'examLo'] : PRESET[g] || [];
    if (lv === 'zero' && raw.placed) return PRESET.zero.concat(gs.includes('travel') ? ['phrasebook'] : []);
    if (gs.length === 1) return one(gs[0]).slice();
    return gs.map(g => one(g)[0]).concat(gs.map(g => one(g)[1]));   // 多目的：各目的第 1 名，再補第 2 名
  }
  const lastTxt = l => { const k = l && l.params && l.params.pack, pk = k && packs().find(x => x[0] === k); return '上次：' + (pk ? pk[2] : '用過的'); };
  function forMe(n) {
    n = n || 4;
    const s = st(), out = [], add = id => { const t = byId(id); if (t && !out.includes(t)) out.push(t); };
    s.pin.forEach(add);
    const base = preset().filter(id => !['today', 'path', 'review'].includes(id));
    for (const id of base) { if (out.length >= n - 1) break; add(id); }
    const L = s.last && byId(s.last.id);
    const LL = L && Object.assign({}, L, { last: s.last, lastTxt: lastTxt(s.last) });
    if (L && out.includes(L)) out[out.indexOf(L)] = LL;   // 上次用的已在推薦裡：原位改成帶參數的「上次」卡，不重複
    else if (L && out.length < n) out.push(LL);
    for (const id of base) { if (out.length >= n) break; add(id); }
    return out.slice(0, n);
  }

  /* ---------- 功能搜尋 ---------- */
  const norm = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[\s'’\-・。、！？!?〜~～「」（）()／/]/g, '');
  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function search(raw) {
    const q = toHira(norm(raw)); if (!q) return { top: [], more: [] };
    const hits = [];
    TOOLS.forEach((t, i) => {
      const keys = [t.name].concat(t.kw).map(k => toHira(norm(k)));
      let s = 9;
      if (keys.some(k => k === q)) s = 0;
      else if (keys.some(k => k.startsWith(q) && q.length >= (/^[a-z0-9]+$/.test(q) ? 2 : 1))) s = 1;
      else if (q.length >= 2 && (keys.some(k => k.includes(q)) || norm(t.desc).includes(q))) s = 2;
      else if (q.length >= 3 && keys.some(k => k.length >= 2 && q.includes(k))) s = 3;   // 「我想看五十音表」
      if (s < 9) hits.push([s + (keys[0] === q ? -0.5 : 0) + i / 1000, t]);
    });
    hits.sort((a, b) => a[0] - b[0]);
    const top = hits.filter(h => h[0] < 2).slice(0, 3).map(h => h[1]);
    return { top, more: hits.map(h => h[1]).filter(t => !top.includes(t)) };
  }

  /* ---------- 執行 ---------- */
  function go(t, last) {
    if (!t) return;
    if (last && last.params && last.params.pack && t.need === 'pack') return runPack(t, last.params.pack, last.params.x);
    note(t.id, null);
    if (t.need === 'pack') return App.go('lookup', { pick: t.id });
    if (t.run) return t.run();
    App.go(t.route, Object.assign({}, t.params || {}));
  }
  const itemsFor = (t, k) => window.PathExtra ? arr(PathExtra.list('travel', 'tr-' + k)).filter(x => String(x.id).startsWith(t.pre)) : [];
  function runPack(t, k, xid) {
    return classic().then(() => {
      const xs = itemsFor(t, k), x = xs.find(y => y.id === xid) || (xs.length === 1 ? xs[0] : null);
      if (x) { note(t.id, { pack: k, x: x.id }); return x.go(); }
      if (xs.length) { note(t.id, { pack: k }); return App.go('lookup', { pick: t.id, pack: k }); }
      App.toast('這個地方沒有' + t.name);
    });
  }
  // 選旅遊包（App.go('lookup',{pick})）→ 有多個項目再選一次（{pick, pack}）；返回用頂列 ←
  function renderPick(el, p) {
    const t = byId(p.pick); if (!t || t.need !== 'pack') { el.innerHTML = '<p class="lk-tip">找不到這個功能</p>'; return; }
    el.innerHTML = '<section class="lk"><p class="lk-tip">⏳ 載入中…</p></section>';
    classic().then(() => {
      if (!el.isConnected) return;
      const box = el.querySelector('.lk');
      if (p.pack) {
        const xs = itemsFor(t, p.pack), pk = packs().find(x => x[0] === p.pack) || ['', '🧳', ''];
        box.innerHTML = `<h1 class="lk-title">${esc(t.icon)} ${esc(t.name)}<small>${esc(pk[1] + ' ' + pk[2])}・選一個</small></h1>
          <div class="lk-list">${xs.map((x, i) => `<button type="button" class="lk-tool lk-row" data-i="${i}"><span class="i" aria-hidden="true">${esc(x.icon || t.icon)}</span><span><b>${esc(x.label)}</b><small>${esc(x.sub || '')}</small></span></button>`).join('')}</div>`;
        box.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const x = xs[+b.dataset.i]; if (x) { note(t.id, { pack: p.pack, x: x.id }); x.go(); } };
        return;
      }
      const s = st(), lastK = s.last && s.last.id === t.id && s.last.params ? s.last.params.pack : '';
      const list = packs().filter(k => itemsFor(t, k[0]).length);
      list.sort((a, b) => (b[0] === lastK) - (a[0] === lastK));
      box.innerHTML = `<h1 class="lk-title">${esc(t.icon)} ${esc(t.name)}<small>選一個地方</small></h1>
        <div class="lk-tools">${list.map(k => `<button type="button" class="lk-tool${k[0] === lastK ? ' on' : ''}" data-k="${esc(k[0])}"><span class="i" aria-hidden="true">${esc(k[1])}</span><span><b>${esc(k[2])}</b>${k[0] === lastK ? '<small>上次用的</small>' : ''}</span></button>`).join('')}</div>`;
      box.onclick = e => { const b = e.target.closest('[data-k]'); if (b) runPack(t, b.dataset.k); };
    });
  }

  window.NAV = { TOOLS, CATS, byId, forMe, preset, search, go, note, pin, pinned, renderPick, packs };
})();
