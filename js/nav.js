/* =========================================================
   導引 window.NAV（v14）：全站功能清單的單一來源＋依使用者推薦＋功能搜尋。由「查」頁（js/lookup.js）延遲載入。
   NAV.TOOLS：工具 [{ id, cat, icon, name, desc, kw[], route?, params?, run?, sub? }]；場景模擬（對話、情境任務）只在學習 › 旅遊的場景單元裡，不另設工具；sub＝子入口（byId('工具~序號')）
   NAV.PLACES：學習的 6 個目的分頁（五十音、旅遊、日檢、商務、閱讀、歌曲），可被搜尋
     route：App.go(route, params)；run：動作（備份、御朱印帳…不是路由）；
   NAV.forMe() -> 推薦 4 張：☆ 釘選 ＞ 身分預設（goals × lv，固定不依次數重排）；第 4 格＝上次用的（不重複）。
   NAV.search(q) -> {top:[≤3 功能：名稱或同義詞完全相同／開頭相同], more:[其他功能命中]}
   NAV.go(t)、NAV.note(id, params)、NAV.pin(id)、NAV.pinned(id)、NAV.CATS
   狀態存 App.state.nav = { pin:[id], last:{id, params} }（隨備份、雲端走）。
   舊模組（trip、practice-map、stage、scene、town、quest）已刪除。分類原則見 docs/詞庫與分類/01-工具分類.md 第 3 節。
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const arr = a => Array.isArray(a) ? a : [];
  const CATS = [['today', '🏠', '首頁'], ['kana', '🔤', '五十音'], ['travel', '🧳', '旅遊'], ['exam', '📝', '日檢'], ['work', '💼', '商務'], ['song', '🎵', '歌曲'], ['fun', '📚', '閱讀'], ['lookup', '🔍', '查'], ['me', '👤', '我的']];
  // 旅遊包（與 js/path.js PACKS 同步；有 Path.PACKS 時以它為準）
  const PACK0 = [['konbini', '🏪', '便利商店'], ['eat', '🍱', '餐廳・燒肉'], ['ramen', '🍜', '拉麵・麵店'], ['station', '🚉', '車站與交通'], ['hotel', '🏨', '飯店・旅館'], ['airport', '✈️', '機場'], ['cafe', '☕', '咖啡・甜點'],
    ['drug', '💊', '藥妝店'], ['shop', '🛍️', '購物・伴手禮'], ['izakaya', '🏮', '居酒屋'], ['sight', '⛩️', '觀光・寺社'], ['market', '🦀', '市場・美食街'], ['rental', '🚗', '租車・租借'], ['emer', '🆘', '緊急・醫療']];
  const packs = () => (window.Path && arr(Path.PACKS).length ? Path.PACKS.map(p => [p.id.slice(3), p.icon, p.name]) : PACK0);
  const classic = () => window.PathExtra ? Promise.resolve() : App.loadScript('js/classic.js');
  const T = (id, cat, icon, name, desc, kw, o) => Object.assign({ id, cat, icon, name, desc, kw }, o);
  // 第一性原理＋奧卡姆剃刀（docs/詞庫與分類/01-工具分類.md 第 3 節）：學習者只做 4 件事＝底部 4 鈕（首頁／學習／查／我的），
  // 只差參數的功能合成一個工具；sub＝同一工具的子入口（搜尋說法命中時直接到那一頁），不另算工具。
  // cat：today（首頁）｜kana／travel／exam／work／fun（學習分頁）｜lookup（查）｜me（我的）
  const TOOLS = [
    T('today', 'today', '▶', '今日練習', '依學習目標排的新學＋到期複習＋應用', ['今日練習', '今日課', '今天', '每日', '上課', '複習', '复习', '忘記了', '忘记', '不會', '錯題', '到期', 'review'], { route: 'today',
      sub: [{ name: '到期複習', route: 'review', kw: ['複習', '复习', '忘記了', '忘记', '不會', '錯題', '到期', 'review'] }] }),
    T('cards', 'today', '🎴', '字卡', '五十音、日檢、場景、不會清單牌組，翻卡自評', ['字卡', '卡片', 'cards', '閃卡', 'flashcard', '背單字', '假名字卡', '五十音卡', '日檢字卡'], { route: 'cards',
      sub: [{ name: '五十音字卡', route: 'cards', params: { deck: 'hira' }, kw: ['假名字卡', '五十音卡', '五十音字卡'] }, { name: '日檢字卡', route: 'cards', params: { deck: 'jlpt' }, kw: ['日檢字卡', '背單字', 'flashcard'] }] }),
    T('kana-guide', 'kana', '🎓', '入門講義', '三種文字、母音、圖解＋諧音；50 音訓練表（背誦、書寫、列印）', ['講義', '入門', '入門講義', '教學', '零基礎', '從頭學', '怎麼開始', '諧音', '圖解', '訓練表', '50音訓練表', '五十音訓練', '書寫', '寫字', '練習紙', '列印', '背五十音'], { route: 'kana-guide',
      sub: [{ name: '50 音訓練表', route: 'kana-drill', kw: ['訓練表', '50音訓練表', '五十音訓練', '書寫', '寫字', '練習紙', '列印', '背五十音'] }] }),
    T('kana-test', 'kana', '✏️', '假名測驗', '聽音選字、看字選音，10 題', ['小考', '測驗', '假名測驗', '五十音測驗', 'quiz', '戰鬥', '闖關', '假名遊戲', 'battle'], { route: 'kana-quiz' }),
    T('play', 'travel', '🗾', '冒險地圖', '逛日本街道、進店實戰、蓋御朱印', ['冒險', '冒險地圖', '地圖', '街道', '逛街', '進店', '實戰', 'map'], { route: 'play' }),
    T('boot', 'travel', '🎧', '聽力特訓', '店員問句聽解、看板、數字、量詞', ['特訓', '聽力', '聽力特訓', '看板', '數字', '量詞', '聽解', 'listening'], { route: 'boot' }),
    T('chal', 'exam', '🏆', '日檢挑戰', '文字、文法、讀解、聽解分科題與模擬考', ['挑戰', '日檢挑戰', '模擬考', '考古題', '測驗', '讀解', '聽解', '分科', 'mock', 'test'], { route: 'challenge' }),
    T('songs', 'song', '🎶', '跟唱', '熱門歌、我的歌、貼 YouTube 跟唱、看懂歌詞', ['歌', '歌曲', '歌詞', '跟唱', '唱歌', '日文歌', '翻唱', 'cover', '卡拉ok', 'karaoke', 'youtube', '動漫', '动漫', 'anime', 'song', 'music'], { route: 'songs' }),
    T('read', 'fun', '📄', '文章・新聞', '每日短文、新聞、商務文章、匯入網址', ['閱讀', '阅读', '文章', '短文', '我的文章', 'reading', '新聞', '新闻', 'news', 'nhk', 'yahoo', '網址', '网址', '網頁', '連結', '链接', '匯入', '貼上', 'url', 'link', '商務閱讀', '商業文章', '職場文章'], { route: 'read', params: { sec: 'art' },
      sub: [{ name: '新聞', route: 'read', params: { sec: 'news' }, kw: ['新聞', '新闻', 'news', 'nhk', 'yahoo'] }, { name: '匯入網址', route: 'read', params: { mode: 'url' }, kw: ['網址', '网址', '網頁', '連結', '链接', '匯入', '貼上', 'url', 'link'] },
        { name: '商務文章', kw: ['商務閱讀', '商業文章', '職場文章'], run: () => { App.go('biz'); let n = 0; const tick = () => { const a = document.querySelector('#main [data-art]'); if (a) { a.scrollIntoView({ block: 'center' }); return; } if (++n < 40) setTimeout(tick, 150); }; setTimeout(tick, 200); } }] }),
    T('dict', 'lookup', '📘', '辭典', 'N5–N1 單字、文法、敬語、活用；相依樹', ['辭典', '字典', '词典', '單字', '单词', '生字', 'dictionary', 'vocab', '知識庫', '資料庫', '百科', 'database', '文法', '句型', '语法', '接續', 'grammar', '敬語', '敬语', '尊敬語', '謙讓語', '丁寧語', 'keigo', '心智圖', '相依', '先修', '樹狀', 'mindmap', '關聯圖'], { route: 'kb',
      sub: [{ name: '單字', route: 'kb', params: { p: 'db', kind: 'word' }, kw: ['字典', '辭典', '词典', '單字', '单词', '生字', 'dictionary', 'vocab'] }, { name: '文法句型', route: 'lookup', params: { view: 'gram' }, kw: ['文法', '句型', '语法', '接續', 'grammar'] },
        { name: '敬語', route: 'lookup', params: { view: 'keigo' }, kw: ['敬語', '敬语', '尊敬語', '謙讓語', '丁寧語', 'keigo'] }, { name: '相依樹', route: 'tree', kw: ['心智圖', '思維導圖', '相依', '先修', '樹狀', 'mindmap', '關聯圖'] }] }),
    T('phrasebook', 'lookup', '📖', '旅遊手冊', '點餐、購物、交通、住宿、緊急；大字給店員看', ['手冊', '旅遊手冊', '常用句', '旅遊句', '給店員看', '大字', '出示', 'phrase', '会话', '緊急', '急救', '救命', '求救', '警察', '醫院', '医院', '生病', '受傷', '救護車', '110', '119', 'help', 'sos'], { route: 'phrasebook', params: { cat: 'must' },
      sub: [{ name: '緊急求助', icon: '🆘', route: 'phrasebook', params: { cat: 'emer' }, kw: ['緊急', '急救', '救命', '求救', '警察', '醫院', '医院', '生病', '受傷', '救護車', '110', '119', 'help', 'sos'] }] }),
    T('settings', 'me', '⚙️', '設定', '程度、目的、字級、深色、語音', ['設定', '设置', '字太小', '字太大', '字級', '大字', '深色', '夜間', '暗色', '黑色', '語音', '聲音', '音效', '程度', '目的', 'settings', 'dark'], { route: 'settings' }),
    T('backup', 'me', '💾', '備份／還原', '換手機、雲端存檔', ['備份', '备份', '還原', '換手機', '換電腦', '存檔', '雲端', 'backup'], { run: () => App.backup() }),
    T('goshuin', 'me', '🖋️', '御朱印帳', '冒險時蓋到的店家印章', ['御朱印', '印章', '蓋章', '集章', 'stamp'], { run: () => { if (window.World && World.goshuin) return World.goshuin(); if (window.Home && Home.need) { App.toast('⏳ 載入御朱印帳…'); Home.need('play').then(() => { if (window.World && World.goshuin) World.goshuin(); }).catch(() => App.toast('載入失敗，請稍後再試')); } } })
  ];
  // 學習分頁（不是工具，是「學習」底下的 5 個目的）：供搜尋、查頁「全部功能」、首頁捷徑、側邊樹使用
  const PLACES = [
    T('kana', 'kana', '🔤', '五十音', '平假名・片假名表，依行學', ['五十音', '50音', '五十音表', '五十音图', '假名', '假名表', '平假名', '片假名', 'あいうえお', 'アイウエオ', 'aiueo', 'hiragana', 'katakana', 'kana', '注音'], { route: 'path', params: { tab: 'kana' }, place: true }),
    T('travel', 'travel', '🧳', '旅遊', '14 個場景：和店員對話、聽力、選句完成對話', ['旅遊', '旅行', '出國', '日本玩', '旅遊課', '旅遊路線', 'travel', 'trip', '場景', '對話', '會話', '会话', '點菜', '店員', '口說', '開口', '情境任務', '狀況題', '拉麵', '結帳', '買票'], { route: 'path', params: { tab: 'travel' }, place: true }),
    T('exam', 'exam', '📝', '日檢', 'N5–N1 單字與文法，依文法分組', ['日檢', '日檢課', '日檢路線', 'jlpt', 'n1', 'n2', 'n3', 'n4', 'n5', '考試', '检定'], { route: 'path', params: { tab: 'exam' }, place: true }),
    T('work', 'work', '💼', '商務', '敬語、電話、Email、開會、報連相', ['商務', '商務日語', '商用', '工作', '上班', '職場', 'email', 'mail', '信件', '開會', '會議', '电话', '電話', 'business'], { route: 'path', params: { tab: 'work' }, place: true }),
    T('song', 'song', '🎵', '歌曲', '熱門歌・我的歌：跟唱、看懂歌詞（不排進每日進度）', ['歌曲', '唱歌', '跟唱', '動漫', '娛樂', 'j-pop', 'jpop'], { route: 'songs', params: {}, place: true }),
    T('fun', 'fun', '📚', '閱讀', '每日短文、新聞、匯入文章（不排進每日進度）', ['閱讀', '文章', '短文', '新聞'], { route: 'path', params: { tab: 'fun' }, place: true })
  ];
  // 子入口：「工具 id~序號」→ 帶子入口 route／params／run 的工具副本（名稱「工具・子入口」）
  function subOf(t, i) {
    const x = t && t.sub && t.sub[i]; if (!x) return null;
    return Object.assign({}, t, { id: t.id + '~' + i, parent: t.id, name: t.name + '・' + x.name, icon: x.icon || t.icon, desc: x.desc || t.desc, kw: x.kw || [], route: x.route || '', params: x.params || null, run: x.run || null, need: x.need || null, sub: null });
  }
  // 舊工具 id（V3.3.0 以前的釘選、上次用的、深連結）→ 合併後的工具或子入口
  const OLD_ID = { 'kana-drill': 'kana-guide~0', 'kana-table': 'kana', 'kana-quiz': 'kana-test', 'kana-battle': 'kana-test', 'kana-cards': 'cards~0', 'ex-cards': 'cards~1', emer: 'phrasebook~0', speak: 'travel', dialog: 'travel', menu: 'travel', task: 'travel', event: 'travel',
    'tr-path': 'travel', 'ex-path': 'exam', gram: 'dict~1', keigo: 'dict~2', kb: 'dict', mind3d: 'dict~3', tree: 'dict~3', biz: 'work', 'biz-read': 'read~2', news: 'read~0', url: 'read~1', review: 'today~0', path: 'travel' };
  const byId = id => { id = OLD_ID[id] || id; const m = String(id || '').match(/^(.+)~(\d+)$/); if (m) return subOf(TOOLS.find(t => t.id === m[1]), +m[2]); return TOOLS.find(t => t.id === id) || PLACES.find(t => t.id === id) || null; };

  /* ---------- 狀態 ---------- */
  const st = () => { const S = App.state; if (!S.nav || typeof S.nav !== 'object') S.nav = {}; if (!Array.isArray(S.nav.pin)) S.nav.pin = []; S.nav.pin = S.nav.pin.filter(byId); return S.nav; };
  function note(id, params) { if (!byId(id)) return; st().last = { id, params: params || null }; App.save(); }
  const pinned = id => st().pin.includes(id);
  function pin(id) { const s = st(); if (!byId(id)) return false; const i = s.pin.indexOf(id); if (i >= 0) s.pin.splice(i, 1); else { s.pin.push(id); if (s.pin.length > 4) s.pin.shift(); } App.save(); return i < 0; }

  /* ---------- 推薦（固定）：☆ ＞ 身分預設；第 4 格＝上次用的 ---------- */
  const PRESET = {
    zero: ['kana-guide', 'kana-test', 'cards'],
    travel: ['phrasebook', 'play', 'boot'],
    examLo: ['dict~1', 'cards', 'chal'], examHi: ['chal', 'dict~1', 'read'],
    work: ['dict~2', 'read~2', 'work'],
    fun: ['songs', 'read', 'read~1']
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
    const s = st(), out = [], has = t => out.some(x => x.id === t.id), add = id => { const t = byId(id); if (t && !has(t)) out.push(t); };
    s.pin.forEach(add);
    const base = preset().filter(id => id !== 'today');
    for (const id of base) { if (out.length >= n - 1) break; add(id); }
    const L = s.last && byId(s.last.id);
    const LL = L && Object.assign({}, L, { last: s.last, lastTxt: lastTxt(s.last) });
    if (L && has(L)) out[out.findIndex(x => x.id === L.id)] = LL;   // 上次用的已在推薦裡：原位改成帶參數的「上次」卡，不重複
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
    const score = (t, name) => {
      const keys = [name].concat(t.kw || []).map(k => toHira(norm(k)));
      let s = 9;
      if (keys.some(k => k === q)) s = 0;
      else if (keys.some(k => k.startsWith(q) && q.length >= (/^[a-z0-9]+$/.test(q) ? 2 : 1))) s = 1;
      else if (q.length >= 2 && (keys.some(k => k.includes(q)) || norm(t.desc).includes(q))) s = 2;
      else if (q.length >= 3 && keys.some(k => k.length >= 2 && q.includes(k))) s = 3;   // 「我想看五十音表」
      return s + (s < 9 && keys[0] === q ? -0.5 : 0);
    };
    // 學習分頁排在工具前面（「五十音」先到五十音分頁）；說法命中子入口時直接給子入口（「救命」→ 旅遊手冊・緊急求助）
    PLACES.concat(TOOLS).forEach((t, i) => {
      const s = score(t, t.name); if (s >= 9) return;
      let best = [s, t];
      (t.sub || []).forEach((x, j) => { const ss = score({ kw: x.kw, desc: '' }, x.name); if (ss <= best[0] && ss < 2) best = [ss, subOf(t, j)]; });
      hits.push([best[0] + i / 1000, best[1]]);
    });
    hits.sort((a, b) => a[0] - b[0]);
    const top = hits.filter(h => h[0] < 2).slice(0, 3).map(h => h[1]);
    return { top, more: hits.map(h => h[1]).filter(t => !top.includes(t)) };
  }

  /* ---------- 執行 ---------- */
  function go(t, last) {
    if (!t) return;
    note(t.id, null);
    if (t.run) return t.run();
    App.go(t.route, Object.assign({}, t.params || {}));
  }
  /* =========================================================
     樹狀導覽（v48）：側邊樹（☰；寬螢幕常駐左側）＋頂列麵包屑＋「繼續上次」
     SECTIONS＝底部 4 鈕（首頁／學習／查／我的）；學習底下是 5 個目的分頁（GOALS），各含工具（TOOLS）與單元群組（展開時才載入）
     ========================================================= */
  // 一條分類軸＝底部 4 鈕：首頁／學習（5 個目的分頁）／查／我的。tools 都是 NAV.TOOLS 的 id，每個工具只在一個地方。
  const GOALS = [
    { id: 'kana', group: 'kana', tools: ['kana-guide', 'kana-test'] },
    { id: 'travel', group: 'packsFlat', tools: ['play', 'boot'] },   // 對話、情境任務在各場景的「練習」裡   // 評審 v18：場景包不再多摺一層（找觀光 5→4 步）
    { id: 'exam', group: 'levels', tools: ['chal'] },
    { id: 'work', group: 'biz', tools: ['dict~2'] },   // 評審 v18：商務底下直接有敬語、商務文章
    { id: 'song', tools: ['songs'] },
    { id: 'fun', tools: ['read'] }
  ].map(g => Object.assign({}, PLACES.find(x => x.id === g.id), g));
  const SECTIONS = [
    { id: 'home', icon: '🏠', name: '首頁', route: 'home', tools: [] },
    { id: 'learn', icon: '🧭', name: '學習', route: 'path', goals: GOALS },
    { id: 'lookup', icon: '🔍', name: '查', route: 'lookup', tools: ['dict', 'phrasebook'] },
    { id: 'me', icon: '👤', name: '我的', route: 'me', tools: ['cards', 'settings', 'backup'] }
  ];
  const LVL = ['N5', 'N4', 'N3', 'N2', 'N1'];
  // 路由 → 位置 {sec（4 鈕之一）, goal（學習分頁）, tool, sub}：麵包屑、側邊樹高亮
  function locate(name, p) {
    p = p || {};
    const sec = id => SECTIONS.find(x => x.id === id), goal = id => GOALS.find(x => x.id === id);
    const G = (g, o) => Object.assign({ sec: sec('learn'), goal: goal(g) }, o || {});
    const T = (id, o) => Object.assign({ tool: byId(id) }, o || {});
    if (name === 'home') return { sec: sec('home') };
    if (name === 'today') return { sec: sec('home'), tool: byId('today') };
    if (name === 'review') return { sec: sec('me'), tool: Object.assign({}, byId('today~0'), { name: '到期複習' }) };
    if (name === 'cards') return { sec: sec('me'), tool: byId('cards') };
    if (name === 'path') { const tab = p.tab || p.goal; return goal(tab) ? G(tab, { sub: tab === 'exam' && p.lv ? String(p.lv).toUpperCase() : '' }) : { sec: sec('learn') }; }
    if (name === 'path-unit') {
      const id = String(p.id || '');
      if (/^kana-/.test(id)) return G('kana', { sub: '依行學' });
      const m = id.match(/^tr-([a-z]+)/); if (m) { const pk = packs().find(x => x[0] === m[1]); return G('travel', { sub: pk ? pk[2] : '' }); }
      const e = id.match(/^(n[1-5])-/); if (e) return G('exam', { sub: e[1].toUpperCase() });
      if (/^biz/.test(id)) return G('work');
      if (/^fun/.test(id)) return G('fun');
      return { sec: sec('learn') };
    }
    if (/^(kana-guide|kana-drill)$/.test(name)) return G('kana', T('kana-guide'));
    if (name === 'kana-quiz') return G('kana', T('kana-test'));
    if (/^(biz|biz-unit)$/.test(name)) return G('work');
    if (name === 'biz-read') return G('work', { sub: '商務文章' });
    if (/^(songs|song)$/.test(name)) return G('song');
    if (/^(read|read-article)$/.test(name)) return G('fun', T('read'));
    if (/^(challenge|challenge-play)$/.test(name)) return G('exam', T('chal'));
    if (/^(play|event|map)$/.test(name)) return G('travel', T('play'));
    if (name === 'drill') return G('travel');
    if (name === 'menu') return G('travel');
    if (/^(boot|boot-play)$/.test(name)) return G('travel', T('boot'));
    if (/^(kb|kb-page|mind|mind3d|tree)$/.test(name) || (name === 'lookup' && /^(gram|keigo)$/.test(p.view || ''))) return { sec: sec('lookup'), tool: byId('dict') };
    if (name === 'phrasebook') return { sec: sec('lookup'), tool: byId('phrasebook') };
    if (name === 'lookup') return { sec: sec('lookup') };
    if (name === 'settings') return { sec: sec('me'), tool: byId('settings') };
    if (name === 'me') return { sec: sec('me') };
    return null;
  }
  const ROUTE_NAME = n => { try { return (App.routeTitle && App.routeTitle(n)) || ''; } catch (e) { return ''; } };
  const where = L => L ? (L.goal || L.sec) : null;   // 麵包屑第一段：學習頁內顯示目的（🧳 旅遊），其他顯示 4 鈕之一
  function crumb(name, p) {
    const L = locate(name, p); if (!L || !L.sec || (L.sec.id === 'home' && !L.tool)) return '';
    const w = where(L), t = L.tool ? L.tool.name : L.sub || '';
    return w.icon + ' ' + w.name + (t ? ' › ' + t : '');
  }

  /* ---------- 繼續上次：最後一個「內容頁」（單元、講義、歌曲、文章、小遊戲…） ---------- */
  const CONT = /^(path-unit|kana-guide|kana-drill|kana-quiz|song|read-article|biz-unit|biz-read|challenge-play|menu|drill|boot-play|kb-page|tree|phrasebook|play)$/;
  const TITLE_SEL = ['.sg-head h2', '.rd-art h1', '.rd-title', '.pa-uh h1', '.bz-intro h2', '.bz h2', '.kg-host', '.lk-title', '.wd-title b', '#main h1', '#main h2'];
  function remember(name, p) {
    if (!CONT.test(name)) return;
    const where = crumb(name, p), sn = (locate(name, p) || {}).sec;
    let n = 0;
    const tick = () => {
      if (curName !== name) return;   // 已經離開
      let title = name === 'play' ? '🗾 冒險地圖' : '';
      if (!title) for (const q of TITLE_SEL) {
        const h = document.querySelector('#main ' + q) || document.querySelector(q);
        if (!h) continue;
        const t = q === '.kg-host' ? (name === 'kana-guide' ? '入門講義' : '50 音訓練表') : h.textContent.trim().replace(/\s+/g, ' ');
        if (t && (!sn || t !== sn.name) && !/^載入中/.test(t)) { title = t.slice(0, 30); break; }
      }
      if (!title && ++n < 12) return setTimeout(tick, 500);
      const s = st(); s.cont = { name, params: p || {}, title: title || where || name, where, t: Date.now() }; App.save();
    };
    setTimeout(tick, 600);
  }
  const cont = () => { const c = st().cont; return c && c.name ? c : null; };

  /* ---------- 側邊樹 ---------- */
  const OPEN = new Set();
  let drawer = null, curName = 'home', curP = {}, painting = false;
  const isWide = () => { try { return matchMedia('(min-width: 1024px)').matches; } catch (e) { return false; } };
  const nodeBtn = (o, act) => `<button type="button" class="nv-n${act ? ' on' : ''}" data-r="${esc(o.route || '')}" data-p="${esc(JSON.stringify(o.params || {}))}"${o.tool ? ` data-t="${esc(o.tool)}"` : ''}><span aria-hidden="true">${esc(o.icon || '•')}</span><span>${esc(o.name)}</span></button>`;
  function groupHTML(sec) {
    const k = sec.id + ':g', open = OPEN.has(k);
    if (sec.group === 'packs') return `<details class="nv-g" data-g="${k}"${open || (curName === 'path-unit' && /^tr-/.test(String(curP.id || ''))) ? ' open' : ''}><summary>🧳 場景包（14）</summary>${packs().map(([id, ic, n]) => nodeBtn({ route: 'path-unit', params: { id: 'tr-' + id }, icon: ic, name: n }, curName === 'path-unit' && String(curP.id || '').startsWith('tr-' + id))).join('')}</details>`;
    if (sec.group === 'packsFlat') return `<p class="nv-lab">🏫 場景包</p>${packs().map(([id, ic, n]) => nodeBtn({ route: 'path-unit', params: { id: 'tr-' + id }, icon: ic, name: n }, curName === 'path-unit' && String(curP.id || '').startsWith('tr-' + id))).join('')}<p class="nv-lab">🧰 工具</p>`;
    if (sec.group === 'biz') return nodeBtn({ route: 'biz', icon: '🗂️', name: '商務情境與文章' }, curName === 'biz');
    if (sec.group === 'levels') return `<details class="nv-g" data-g="${k}"${open ? ' open' : ''}><summary>🪜 N5–N1</summary>${LVL.map(L => nodeBtn({ route: 'path', params: { tab: 'exam', lv: L }, icon: '🪜', name: L + ' 單元' }, curName === 'path' && String(curP.lv || '').toUpperCase() === L)).join('')}</details>`;
    if (sec.group === 'kana') {
      const KU = window.Path && Path.units ? (() => { try { return Path.units('kana'); } catch (e) { return []; } })() : [];
      return `<details class="nv-g" data-g="${k}" data-lazy="kana"${open ? ' open' : ''}><summary>🔤 依行學${KU.length ? '（' + KU.length + '）' : ''}</summary>${KU.length ? KU.map(u => nodeBtn({ route: 'path-unit', params: { id: u.id }, icon: u.complete ? '✓' : '•', name: u.title }, curName === 'path-unit' && curP.id === u.id)).join('') : '<p class="nv-load">展開時載入…</p>'}</details>`;
    }
    return '';
  }
  function treeHTML() {
    const here = locate(curName, curP), hs = here && here.sec ? here.sec.id : '', hg = here && here.goal ? here.goal.id : '';
    const tn = t => nodeBtn({ route: t.route || '', params: t.params, icon: t.icon, name: t.name, tool: t.id }, here && here.tool && (here.tool.id === t.id || here.tool.parent === t.id));
    const tools = list => (list || []).map(byId).filter(Boolean).map(tn).join('');
    const goalHTML = g => {
      const k = 'learn:' + g.id, op = OPEN.has(k) || hg === g.id;
      return `<details class="nv-g nv-goal" data-g="${esc(k)}"${op ? ' open' : ''}><summary class="${hg === g.id ? 'on' : ''}"><span aria-hidden="true">${g.icon}</span> ${esc(g.name)}</summary>
        <button type="button" class="nv-n nv-all" data-r="${esc(g.route || 'path')}" data-p="${esc(JSON.stringify(g.params || {}))}">前往${esc(g.name)}${g.route === 'path' ? '分頁' : ''} ›</button>${groupHTML(Object.assign({}, g, { id: 'learn-' + g.id }))}${tools(g.tools)}</details>`;
    };
    return `<div class="nv-head"><b>🗂️ 全部內容</b><button type="button" class="nv-x" data-x aria-label="關閉選單">✕</button></div>
      <nav class="nv-tree" aria-label="全部內容">${SECTIONS.map(sec => {
        const open = OPEN.has(sec.id) || hs === sec.id;
        const head = sec.id === 'learn' ? '' : nodeBtn({ route: sec.route, icon: sec.id === 'me' ? '📊' : sec.id === 'home' ? '🏠' : '🔍', name: sec.id === 'me' ? '學習紀錄' : sec.id === 'home' ? '今天' : '搜尋' }, curName === sec.route && !(here && here.tool) && !(curP && (curP.view || curP.pick)));
        return `<details class="nv-sec" data-s="${sec.id}"${open ? ' open' : ''}><summary class="${hs === sec.id ? 'on' : ''}"><span aria-hidden="true">${sec.icon}</span>${esc(sec.name)}</summary>
          ${head}${sec.goals ? sec.goals.map(goalHTML).join('') : tools(sec.tools)}</details>`;
      }).join('')}</nav>`;
  }
  function paintTree() {
    if (!drawer) return;
    painting = true; drawer.querySelector('.nv-in').innerHTML = treeHTML(); setTimeout(() => { painting = false; }, 50);   // 畫面自動展開的不算使用者展開
  }
  function ensureDrawer() {
    if (drawer) return drawer;
    drawer = document.createElement('aside'); drawer.id = 'nvTree'; drawer.className = 'nv-drawer'; drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '<div class="nv-bg" data-x></div><div class="nv-in" role="dialog" aria-label="全部內容"></div>';
    drawer.inert = true;
    document.body.appendChild(drawer);
    drawer.addEventListener('toggle', e => {
      const d = e.target; if (!d.dataset) return;
      const k = d.dataset.s || d.dataset.g; if (!k) return;
      if (!painting) { if (d.open) OPEN.add(k); else OPEN.delete(k); }
      if (d.open && d.dataset.lazy === 'kana' && !(window.Path && Path.units)) {
        App.loadScript('js/classic.js').then(() => App.loadScript('js/path.js')).then(() => Path.load('kana')).then(paintTree).catch(() => { });
      } else if (d.open && d.dataset.lazy === 'kana' && window.Path && Path.load && d.querySelector('.nv-load')) Path.load('kana').then(paintTree).catch(() => { });
    }, true);
    drawer.addEventListener('click', e => {
      if (e.target.closest('[data-x]')) return close();
      const b = e.target.closest('.nv-n'); if (!b) return;
      const t = b.dataset.t ? byId(b.dataset.t) : null;
      if (!isWide()) close(true);
      if (t) return go(t);
      let p = {}; try { p = JSON.parse(b.dataset.p || '{}'); } catch (er) { }
      App.go(b.dataset.r || 'home', p);
    });
    return drawer;
  }
  let closeLayer = null;
  function open() {
    ensureDrawer(); paintTree();
    document.body.classList.add('nv-open'); drawer.setAttribute('aria-hidden', 'false'); drawer.inert = false;
    if (!isWide() && App.layer) {   // 手機返回鍵＝關閉選單
      const mark = document.createElement('i'); mark.hidden = true;
      closeLayer = App.layer(mark);
      const ob = new MutationObserver(() => { if (!mark.isConnected) { ob.disconnect(); closeLayer = null; close(true); } }); ob.observe(document.body, { childList: true });
    }
    const f = drawer.querySelector('.nv-sec[open] summary') || drawer.querySelector('.nv-n'); if (f) try { f.focus(); } catch (e) { }
  }
  function close(silent) {
    if (!drawer) return;
    if (isWide() && !silent) return;
    document.body.classList.remove('nv-open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true;
    if (closeLayer && !silent) { const c = closeLayer; closeLayer = null; c(); }
  }
  // 頂列：☰ 與麵包屑（取代 logo 文字）
  function topBar() {
    const top = document.querySelector('#top .in'); if (!top) return;
    let mb = document.getElementById('nvMenu');
    if (!mb) {
      mb = document.createElement('button'); mb.id = 'nvMenu'; mb.type = 'button'; mb.className = 'icon-btn nv-menu'; mb.setAttribute('aria-label', '全部內容（選單）'); mb.textContent = '☰';
      mb.onclick = () => document.body.classList.contains('nv-open') && !isWide() ? close() : open();
      top.insertBefore(mb, top.firstChild);
    }
    let cb = document.getElementById('nvCrumb');
    const logo = top.querySelector('.logo');
    if (!cb) { cb = document.createElement('button'); cb.id = 'nvCrumb'; cb.type = 'button'; cb.className = 'nv-crumb'; cb.onclick = () => { const L = locate(curName, curP); if (!L || !L.sec) return; if (L.goal) App.go('path', { tab: L.goal.id }); else App.go(L.sec.route); }; if (logo) logo.after(cb); else top.appendChild(cb); }
    const c = crumb(curName, curP);
    const L0 = locate(curName, curP), xl = document.documentElement.dataset.fs === 'xl';
    cb.textContent = xl && L0 && L0.sec ? where(L0).icon + ' ›' : c; cb.hidden = !c || /^(home|path|lookup|me)$/.test(curName); cb.setAttribute('aria-label', c ? '目前位置：' + c + '（回上層）' : '');
    top.classList.toggle('nv-has-crumb', !!c);
  }
  document.addEventListener('routechange', e => {
    const d = e.detail || {}, keep = d.name === 'path' && !(d.params || {}).tab && curName === 'path' && curP.tab;   // 學習頁已用 refresh 回報實際分頁
    if (!keep) { curName = d.name || 'home'; curP = d.params || {}; }
    try { topBar(); } catch (er) { }
    if (drawer && (isWide() || document.body.classList.contains('nv-open'))) paintTree();
    remember(curName, curP);
    if (isWide()) { ensureDrawer(); if (!document.body.classList.contains('nv-open')) { document.body.classList.add('nv-open', 'nv-wide'); drawer.setAttribute('aria-hidden', 'false'); drawer.inert = false; paintTree(); } }
  });
  try { matchMedia('(min-width: 1024px)').addEventListener('change', ev => { if (ev.matches) { ensureDrawer(); document.body.classList.add('nv-open', 'nv-wide'); drawer.inert = false; paintTree(); } else { document.body.classList.remove('nv-open', 'nv-wide'); if (drawer) drawer.inert = true; } }); } catch (e) { }
  // 首頁用：主選項（每類的進度與下一步由首頁自己算）
  const mainSections = () => GOALS;   // 首頁卡＝學習的 5 個目的分頁捷徑（今天、查、我的已在底部導覽）
  // 頁面自己換分頁（學習頁的分頁鈕）時更新麵包屑與側邊樹
  function refresh(name, p) { curName = name; curP = p || {}; try { topBar(); } catch (e) { } if (drawer && (isWide() || document.body.classList.contains('nv-open'))) paintTree(); }

  window.NAV = { TOOLS, PLACES, GOALS, CATS, byId, forMe, preset, search, go, note, pin, pinned, packs, SECTIONS, mainSections, locate, crumb, cont, open, close, refresh };
})();
