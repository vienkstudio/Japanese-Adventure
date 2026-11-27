/* =========================================================
   日語冒險 — 核心框架 core.js
   提供：App（路由/存檔/經驗值/工具）、Tracker（不會清單）
   其他模組只透過這裡公開的 API 溝通，不得直接改 localStorage。
   ========================================================= */
(function () {
  const KEY = 'jpQuest.v1';
  // App 版本（V主.次.修）：和 sw.js 的 VERSION（'jpq-v' + 版本）必須一致，tools/check-version.mjs 會檢查；規則見 CONTRACT.md「版本編號」
  const APP_VERSION = '3.12.0';
  const SCHEMA = 2;
  const MIGS = [];
  const DEF = { v: SCHEMA, xp: 0, cleared: {}, learn: {}, log: [], streak: { last: null, days: 0, freezeWeek: null }, sceneDone: {} };
  const fresh = () => JSON.parse(JSON.stringify(DEF));
  /* ---- 單一程度 profile（取代 world.lv、trip.level、L1–L4）與外觀 ui ---- */
  const LV_IDS = ['zero', 'n5', 'n4', 'n3', 'n2', 'n1'];
  const LV_NAMES = { zero: '完全沒學過', n5: '會五十音', n4: '會簡單句', n3: '日常會話', n2: '工作程度', n1: '已過 N2・準備 N1' };   // 評審 v18：要考 N1 的人選得到
  const LV_DESC = { zero: '從五十音開始，每個字都有讀音和中文', n5: '看得懂假名，想學旅行常用句', n4: '會說簡單的句子，想更自然', n3: '能日常對話，想聽懂店員的各種說法', n2: '能用敬語，想練交涉與正式場合', n1: '幾乎沒問題，想挑戰言外之意' };
  const ASSIST_DEF = { zero: 'full', n5: 'full', n4: 'some', n3: 'none', n2: 'none', n1: 'none' };
  const OLD2LV = { K0: 'zero', N5: 'n5', N4: 'n4', N3: 'n3', N2: 'n2', N1: 'n1' };
  const PALETTES = ['coral', 'sakura', 'matcha', 'ocean', 'lavender', 'mono'];
  const UI_KEY = 'jpQuest.ui';
  function normProfile(p) {
    p = p && typeof p === 'object' ? p : {};
    if (!LV_IDS.includes(p.lv)) p.lv = 'zero';
    if (!Array.isArray(p.goals) || !p.goals.length) p.goals = ['travel'];
    if (!['full', 'some', 'none'].includes(p.assist)) p.assist = ASSIST_DEF[p.lv];
    // 每日目標（使用者自訂）：mins＝每天幾分鐘（今日課長度、每日任務量都依這個調）；fresh＝每天新學幾個（null＝依程度自動）
    if (![5, 8, 15, 30].includes(p.mins)) p.mins = 8;
    if (p.fresh != null && !(Number.isInteger(p.fresh) && p.fresh >= 0 && p.fresh <= 15)) p.fresh = null;
    return p;
  }
  // 舊存檔：冒險世界有進度就用 world.lv，否則用舊旅程 trip.level；都沒有＝新玩家（要做首次定位）
  function profileFromOld(st) {
    const wl = st.world && OLD2LV[st.world.lv], tl = st.trip && OLD2LV[st.trip.level];
    const worldUsed = st.world && (st.world.at || Object.keys(st.world.stamps || {}).length);
    const lv = (worldUsed && wl) || tl || wl || null;
    // 舊玩家已有 XP（玩過舊版其他模組）也視為已定位，不再要求重選程度
    return normProfile({ lv: lv || 'zero', placed: !!lv || (Number(st.xp) > 0) });
  }
  // 舊模組暫時還讀 world.lv／trip.level：一律由 profile 同步過去（程度不再分開存）
  function syncOld(st) {
    const p = st.profile, up = p.lv === 'zero' ? 'N5' : p.lv.toUpperCase();
    if (st.world && typeof st.world === 'object') st.world.lv = up;
    if (st.trip && typeof st.trip === 'object' && st.trip.level) st.trip.level = p.lv === 'zero' ? 'K0' : up;
  }
  // 存檔升級：舊版缺欄位補齊、型別修正
  function migrate(o) {
    const st = Object.assign(fresh(), o && typeof o === 'object' ? o : {});
    st.xp = Number.isFinite(+st.xp) ? Math.max(0, Math.round(+st.xp)) : 0;   // 字串、NaN、負數 → 修正，避免 S.xp += n 變成字串相加
    if (Array.isArray(st.cleared)) st.cleared = {};
    if (st.tracked != null && !Array.isArray(st.tracked)) delete st.tracked;   // 舊不會清單：由 learn.js 遷移到 learn
    if (!st.learn || typeof st.learn !== 'object' || Array.isArray(st.learn)) st.learn = {};
    if (!Array.isArray(st.log)) st.log = [];
    ['cleared', 'sceneDone'].forEach(k => { if (!st[k] || typeof st[k] !== 'object') st[k] = {}; });
    if (!st.streak || typeof st.streak !== 'object') st.streak = fresh().streak;
    if (typeof st.streak.days !== 'number') st.streak.days = 0;
    if ((st.v || 1) < 2 && st.tracked) st.tracked.forEach(t => { if (t && t.due == null) t.due = 0; });   // v1 → v2：不會清單加複習排程
    if (!st.profile || typeof st.profile !== 'object') st.profile = profileFromOld(st); else normProfile(st.profile);
    if (!st.profile.placed && st.xp > 0) st.profile.placed = true;
    syncOld(st);
    st.ui = Object.assign({ theme: 'system', palette: 'coral', fs: 'm' }, st.ui && typeof st.ui === 'object' ? st.ui : {});
    if (!['system', 'light', 'dark'].includes(st.ui.theme)) st.ui.theme = 'system';
    if (!PALETTES.includes(st.ui.palette)) st.ui.palette = 'coral';
    if (!['m', 'l', 'xl'].includes(st.ui.fs)) st.ui.fs = 'm';
    st.v = SCHEMA;
    MIGS.forEach(f => { try { f(st); } catch (e) { console.error(e); } });   // 其他模組的存檔遷移（learn.js）
    return st;
  }
  const hasProgress = st => !!(st && (st.xp || Object.keys(st.learn || {}).length || (st.tracked || []).length));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
  let S;
  try { S = migrate(JSON.parse(LS.get(KEY) || '{}')); }
  catch (e) { S = fresh(); }

  // 等級門檻：第 n 級需要 LEVELS[n-1] XP
  const LEVELS = [0, 60, 150, 280, 450, 670, 940, 1260, 1640, 2080, 2600, 3200, 3900, 4700, 5600];
  // 稱號依目的與程度：零基礎（還在學假名）用五十音稱號；其他依第一個目的；沒有目的用中性稱號
  const TITLE_SETS = {
    kana: ['五十音新手', '五十音學徒', '假名見習生', '片假名探險家', '日語起步者', '單字收集者', '句子練習生', '日常會話新秀', '日語旅人', '溝通小達人', '日本通', '準日本人', '日語達人', '日語大師', '傳說學習者'],
    travel: ['新手旅人', '點餐入門', '問路小幫手', '車站通', '便利商店常客', '拉麵達人', '電車通勤者', '購物高手', '觀光老手', '日語旅人', '街頭溝通王', '日本通', '準日本人', '日語大師', '傳說旅人'],
    exam: ['日檢起步', '單字收集者', '文法入門', '穩紮穩打', '讀解挑戰者', '聽解練習生', '模擬考常客', '文法達人', '讀解高手', '日檢衝刺者', '合格候補', '日檢老手', '準合格者', '日檢大師', '傳說考生'],
    work: ['商務新人', '名片交換者', '敬語入門', '電話應對者', 'Email 寫手', '會議參與者', '客戶接待者', '報連相達人', '簡報能手', '談判新秀', '商務溝通者', '職場日語通', '部門骨幹', '商務大師', '傳說社長'],
    fun: ['歌詞新手', '跟唱入門', '歌詞解讀者', '字幕挑戰者', '新聞初讀者', '卡拉 OK 常客', '動漫通', '歌詞翻譯者', '新聞讀者', 'J-pop 達人', '日本文化通', '準日本人', '日語達人', '日語大師', '傳說歌手'],
    any: ['日語新手', '日語學習者', '每日練習者', '單字收集者', '句子練習生', '穩定進步中', '日語溝通者', '日語好手', '閱讀達人', '日語進階者', '日語高手', '日本通', '準日本人', '日語大師', '傳說學習者']
  };
  const AVATAR_OF = { kana: '🌱', travel: '🧳', exam: '🎓', work: '💼', fun: '🎧', any: '🙂' };
  const KANA_SEION = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
  function titleKey() {
    const p = (S && S.profile) || {}, g = Array.isArray(p.goals) && p.goals[0];
    if ((p.lv || 'zero') === 'zero') {
      const L = window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : [...KANA_SEION].filter(c => ((S.kanaL || {}).h || []).includes(c)).length;
      if (L < 46) return 'kana';
    }
    return TITLE_SETS[g] ? g : 'any';
  }
  const titles = () => TITLE_SETS[titleKey()];
  // 預設頭像依目的（使用者自己挑過就不動）：S.avatarAuto 記錄自動給的那個
  function syncAvatar() {
    if (!S) return;
    const want = AVATAR_OF[titleKey()] || '🙂';
    if (!S.avatar || (S.avatarAuto && S.avatar === S.avatarAuto) || (!S.avatarAuto && S.avatar === '🧳' && want !== '🧳')) {
      if (S.avatar !== want) { S.avatar = want; S.avatarAuto = want; }
      else S.avatarAuto = want;
    }
  }

  function levelOf(xp) { let l = 1; for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; }

  const listeners = [];
  /* ---- 存檔：本機 localStorage ＋ 雲端（Claude 網站 db：data/users/<id>/save） ---- */
  const lsOK = (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })();
  const CL = { ref: null, status: lsOK ? 'local' : 'none', busy: false, dirty: false, timer: null };
  function cloudPush() {
    if (!CL.ref) return;
    if (CL.busy) { CL.dirty = true; return; }
    CL.busy = true; CL.dirty = false;
    CL.ref.set({ s: JSON.stringify(S), t: S._t || Date.now() })
      .then(() => { CL.status = 'cloud'; })
      .catch(e => { if (e && e.code === 'invalid_argument') { CL.ref = null; } CL.status = lsOK ? 'local' : 'none'; })
      .finally(() => { CL.busy = false; renderNav(); if (CL.dirty) cloudPush(); });
  }
  /* ---- IndexedDB：存檔備援（localStorage 被清掉時可救回）＋給大型資料用的 key-value 儲存 App.idb ---- */
  const IDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      try { const r = indexedDB.open('jpQuest', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    }));
    const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('kv', mode), rq = fn(t.objectStore('kv')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }));
    return { get: k => tx('readonly', s => s.get(k)).catch(() => undefined), set: (k, v) => tx('readwrite', s => s.put(v, k)).catch(() => { }), del: k => tx('readwrite', s => s.delete(k)).catch(() => { }) };
  })();
  let idbT = null;
  function save() {
    S._t = Date.now();
    LS.set(KEY, JSON.stringify(S));
    clearTimeout(idbT); idbT = setTimeout(() => IDB.set('save', JSON.stringify(S)), 800);
    if (CL.ref) { clearTimeout(CL.timer); CL.timer = setTimeout(cloudPush, 1500); }
    listeners.forEach(f => { try { f(S); } catch (e) { console.error(e); } });
  }
  async function cloudInit() {
    try {
      if (!(window.claude && typeof claude.use === 'function')) return;
      const db = await claude.use('db'), u = await claude.use('user');
      if (!db || !u) return;
      const id = await u.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await Promise.race([ref.get(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))]);
      CL.ref = ref;
      const d = snap.exists ? snap.data() : null;
      if (d && d.s && (d.t || 0) > (S._t || 0)) {
        try { S = migrate(JSON.parse(d.s)); LS.set(KEY, JSON.stringify(S)); CL.status = 'cloud'; applyTheme(); render(); toast('☁️ 已載入雲端存檔', 'ok'); } catch (e) { }
      } else if (hasProgress(S) || Object.keys(S.cleared).length) cloudPush();
      else CL.status = 'cloud';
      renderNav();
    } catch (e) { }
  }

  // 連續學習天數：用本地日期；真的有練習（拿到 XP）才算；每週 1 次斷一天自動保護
  const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayAgo = n => dayKey(new Date(Date.now() - n * 864e5));
  const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); };
  function touchStreak() {
    const st = S.streak, today = dayKey();
    if (st.last === today) return;
    if (st.last === dayAgo(1)) st.days++;
    else if (st.last === dayAgo(2) && st.days > 0 && st.freezeWeek !== weekKey()) { st.days++; st.freezeWeek = weekKey(); setTimeout(() => toast('🧊 連勝保護：昨天沒練，幫你保住了（每週 1 次）', 'ok'), 1200); }
    else st.days = 1;
    st.last = today;
  }
  // 連勝狀態：done 今天已練；risk 今天還沒練、再不練會斷
  function streakInfo() {
    const st = S.streak, today = dayKey();
    const alive = st.last === today || st.last === dayAgo(1) || (st.last === dayAgo(2) && st.freezeWeek !== weekKey());
    const days = alive ? st.days || 0 : 0;
    return { days, done: st.last === today, risk: days > 0 && st.last !== today };
  }

  /* ---------------- 工具 ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);

  // 日文語音：voiceOK() → true 有／false 沒有／null 還不知道（語音清單尚未載入）
  const jaVoice = () => { try { return speechSynthesis.getVoices().find(v => /^ja|jpn|japan/i.test(v.lang + ' ' + v.name)) || null; } catch (e) { return null; } };
  function voiceOK() {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return false;
    let n = 0; try { n = speechSynthesis.getVoices().length; } catch (e) { }
    return n ? !!jaVoice() : (Date.now() - T0 > 3000 ? false : null);
  }
  const T0 = Date.now();
  let warned = false;
  const VOICE_TIP = '🔇 這台裝置沒有<b>日文語音</b>，聽力題會改成看文字。安裝方法：Android「設定→語言→文字轉語音→Google 語音→安裝日文」；iPhone「設定→輔助使用→朗讀內容→聲音→日文」；Windows「設定→時間與語言→語音→新增日文」。';
  function voiceWarn() {
    if (warned || voiceOK() !== false) return;
    warned = true;
    toast('🔇 找不到日文語音：聽力題改成看文字（手冊、特訓、不會清單頁上方有安裝方法）');
  }
  function voiceHTML() { return voiceOK() === false ? `<div class="voice-warn">${VOICE_TIP}</div>` : ''; }
  /* ---- 語音包：S.voice = {pack, voiceURI, rate, pitch}（rate／pitch 是使用者微調倍率，預設 1） ---- */
  const VOICE_PACKS = [
    { id: 'std_f', icon: '👩', name: '標準女聲', desc: '清楚自然的女聲', g: 'f', rate: 1, pitch: 1 },
    { id: 'std_m', icon: '👨', name: '標準男聲', desc: '沉穩的男聲', g: 'm', rate: 1, pitch: 1 },
    { id: 'slow', icon: '🐢', name: '慢速教學', desc: '0.7 倍速，逐句停頓', g: 'f', rate: 0.7, pitch: 1, chunk: true },
    { id: 'news', icon: '📺', name: '播音員', desc: '略快、音調平穩', g: '', rate: 1.15, pitch: 0.95 },
    { id: 'kid', icon: '🧒', name: '可愛童聲', desc: '高音調、活潑', g: 'f', rate: 1.05, pitch: 1.6 },
    { id: 'elder', icon: '👴', name: '長輩友善', desc: '慢速＋畫面大字提示', g: 'f', rate: 0.75, pitch: 0.95, chunk: true, cap: true }
  ];
  const V_F = /haruka|ayumi|nanami|kyoko|o-?ren|sayaka|mizuki|aoi|shiori|mayu|nanako|female|女/i;
  const V_M = /ichiro|keita|otoya|hattori|takumi|daichi|naoki|kenji|male|男/i;
  const vGender = v => V_F.test(v.name) ? 'f' : V_M.test(v.name) ? 'm' : /google/i.test(v.name) ? 'f' : '';
  const clampN = (x, a, b, d) => { x = +x; return Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };
  function vcfg() {
    const v = S.voice && typeof S.voice === 'object' ? S.voice : (S.voice = {});
    if (!VOICE_PACKS.some(p => p.id === v.pack)) v.pack = 'std_f';
    if (typeof v.voiceURI !== 'string') v.voiceURI = '';
    v.rate = clampN(v.rate, 0.5, 1.5, 1); v.pitch = clampN(v.pitch, 0.5, 1.5, 1);
    return v;
  }
  const jaVoices = () => { try { return speechSynthesis.getVoices().filter(v => /^ja|jpn|japan/i.test(v.lang + ' ' + v.name)); } catch (e) { return []; } };
  // 依語音包挑語音：指定語音 > 同性別 > 任何日文語音（性別不符時用音調模擬）
  function pickVoice(pk, uri) {
    const all = jaVoices();
    if (uri) { const v = all.find(x => x.voiceURI === uri); if (v) return { voice: v, sim: false }; }
    if (!pk.g) return { voice: all[0] || null, sim: false };
    const m = all.find(x => vGender(x) === pk.g);
    return m ? { voice: m, sim: false } : { voice: all[0] || null, sim: all.length > 0 };
  }
  function voicePacks() {
    const c = vcfg();
    return VOICE_PACKS.map(p => ({ id: p.id, icon: p.icon, name: p.name, desc: p.desc, gender: p.g, rate: p.rate, pitch: p.pitch, on: c.pack === p.id, simulated: pickVoice(p, '').sim }));
  }
  function setVoice(patch) {
    const c = vcfg();
    if (patch && typeof patch === 'object') ['pack', 'voiceURI', 'rate', 'pitch'].forEach(k => { if (k in patch) c[k] = patch[k]; });
    vcfg(); save();
    document.dispatchEvent(new CustomEvent('voicechange', { detail: Object.assign({}, S.voice) }));
    return Object.assign({}, S.voice);
  }
  // 給自己建 SpeechSynthesisUtterance 的模組用：u.voice = t.voice; u.rate = 原本速度 × t.rate; u.pitch = t.pitch
  function ttsVoice(baseRate) {
    const c = vcfg(), pk = VOICE_PACKS.find(p => p.id === c.pack), r = pickVoice(pk, c.voiceURI);
    let pitch = pk.pitch * c.pitch;
    if (r.sim) pitch *= pk.g === 'm' ? 0.7 : 1.2;
    return { voice: r.voice, rate: clampN((baseRate || 1) * pk.rate * c.rate, 0.1, 3, 1), pitch: clampN(pitch, 0, 2, 1), simulated: r.sim, pack: pk.id, chunk: !!pk.chunk, caption: !!pk.cap };
  }
  function speakJP(text, rate) {
    if (!text) return;
    if (voiceOK() === false) { voiceWarn(); return; }
    speechSynthesis.cancel();
    const t = ttsVoice(rate || 0.85);
    // 慢速／長輩：在標點處切成短句逐句念，停頓更明顯
    const parts = t.chunk ? String(text).split(/(?<=[、。！？!?，,…\n])/).map(s => s.trim()).filter(Boolean) : [String(text)];
    parts.forEach(s => {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = 'ja-JP'; u.rate = t.rate; u.pitch = t.pitch; u.volume = 1;
      if (t.voice) u.voice = t.voice;
      speechSynthesis.speak(u);
    });
    if (t.caption) document.querySelectorAll('.toast.tts-cap').forEach(e => e.remove());
    if (t.caption) toast(`🔊 ${esc(text)}`, 'tts-cap');
  }
  try { speechSynthesis.addEventListener('voiceschanged', () => document.dispatchEvent(new CustomEvent('voiceschange'))); } catch (e) { }

  function toast(msg, type) {
    let box = document.getElementById('toastBox');
    if (!box) { box = document.createElement('div'); box.id = 'toastBox'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  // 彈窗：buttons = [{label, cls, onClick}]；回傳 close()
  function modal(html, buttons) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}<div class="modal-btns"></div></div>`;
    const close = () => bg.remove();
    bg.onclick = e => { if (e.target === bg) close(); };
    const bb = bg.querySelector('.modal-btns');
    (buttons || [{ label: '關閉' }]).forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.onclick = () => { close(); b.onClick && b.onClick(); };
      bb.appendChild(el);
    });
    document.body.appendChild(bg);
    return close;
  }

  /* ---------------- 經驗值 / 關卡 ---------------- */
  function addXP(n, reason) {
    n = Math.round(n || 0); if (n <= 0) return { gained: 0, levelUp: false };
    const before = levelOf(S.xp);
    S.xp += n;
    touchStreak();
    S.log.unshift({ t: Date.now(), xp: n, reason: reason || '' });
    S.log = S.log.slice(0, 50);
    const after = levelOf(S.xp);
    save();
    toast(`✨ +${n} XP ${reason ? '・' + esc(reason) : ''}`, 'xp');
    // 升級彈窗等其他彈窗（結果畫面）關掉後才出現，避免兩個主按鈕疊在一起
    const lvModal = () => { if (document.querySelector('.modal-bg')) return setTimeout(lvModal, 400); modal(`<div class="lvup">🎉</div><h2>升級！Lv.${after}</h2><p>獲得稱號：<b>${esc(titles()[after - 1] || titles()[titles().length - 1])}</b></p>${unlockHTML(after)}`, [{ label: '太棒了！', cls: 'primary' }]); };
    if (after > before) setTimeout(lvModal, 600);
    if (after > before) remindBackup(`升到 Lv.${after} 了`);
    return { gained: n, levelUp: after > before };
  }
  // 升級解鎖說明：各模組用 App.addUnlock(fn(lv) → 字串陣列) 登記
  const unlockFns = [];
  function unlockHTML(lv) {
    const items = unlockFns.flatMap(f => { try { return f(lv) || []; } catch (e) { return []; } });
    return items.length ? `<p>🔓 解鎖：<b>${items.map(esc).join('、')}</b></p>` : '';
  }
  // 備份提醒：非雲端存檔時，每升一級、每完成 5 關提醒一次
  function remindBackup(why) {
    if (CL.status === 'cloud') return;
    setTimeout(() => toast(`💾 ${esc(why)}！記得到「我的」→「💾 備份」保存進度${CL.status === 'none' ? '（這裡無法自動存檔）' : '（進度只存在這台裝置）'}`), 2600);
  }
  function noteClear() {
    S.clearN = (S.clearN || 0) + 1; save();
    if (S.clearN % 5 === 0) remindBackup(`已完成 ${S.clearN} 關`);
  }

  /**
   * 完成關卡
   * @param {string} id 關卡 id
   * @param {number} stars 0–3（0＝未通過，不記錄）
   * @param {number} baseXP 首次通關的 XP；重玩只給 30%，刷新星數再補差額
   */
  function completeQuest(id, stars, baseXP) {
    stars = Math.max(0, Math.min(3, stars | 0));
    const prev = S.cleared[id] || 0;
    let xp = 0;
    if (stars > 0) {
      xp = prev ? Math.round(baseXP * 0.3) : baseXP;
      if (stars > prev) { S.cleared[id] = stars; xp += (stars - prev) * 5; }
    }
    save();
    const r = xp ? addXP(xp, '關卡完成') : { gained: 0, levelUp: false };
    if (!prev && stars > 0) noteClear();
    return { stars, prevStars: prev, gained: r.gained, levelUp: r.levelUp, firstClear: !prev && stars > 0 };
  }

  /**
   * 全站統一獎勵：首次過關依星數 10／15／20，首次三星再 +10；刷新最佳星數只補差額；重玩沒進步給 3 XP
   * 星數存 S.cleared[id]；回傳 {stars, prevStars, gained, levelUp, firstClear}
   */
  const XPS = [0, 10, 15, 20];
  function reward(id, stars, reason) {
    stars = Math.max(0, Math.min(3, stars | 0));
    const prev = S.cleared[id] || 0;
    if (!S.lastDone || typeof S.lastDone !== 'object') S.lastDone = {};
    S.lastDone[String(id).split(':')[0]] = dayKey(); S.lastDoneAt = Date.now();
    if (!stars) { save(); return { stars, prevStars: prev, gained: 0, levelUp: false, firstClear: false }; }
    let xp = 3;
    if (stars > prev) { xp = XPS[stars] - XPS[prev] + (stars === 3 ? 10 : 0); S.cleared[id] = stars; }
    save();
    const r = addXP(xp, reason || '委託完成');
    if (!prev) noteClear();
    return { stars, prevStars: prev, gained: r.gained, levelUp: r.levelUp, firstClear: !prev };
  }

  /**
   * 標準結果畫面（另支援 note：額外說明 HTML；ok：沒有 back/next 時的確定鈕文字）
   * opts: {title, stars, correct, total, gained, wrong:[trackerItem], retry:fn, next:{label, route, params}, back:{label, route, params}}
   */
  function showResult(opts) {
    const stars = [0, 1, 2].map(i => `<span class="s">${i < (opts.stars || 0) ? '⭐' : '☆'}</span>`).join('');
    const wrong = (opts.wrong || []);
    const html = `<div class="result">
      <div class="stars">${stars}</div>
      <h2>${esc(opts.title || (opts.stars ? '過關！' : '再試一次'))}</h2>
      ${opts.total != null ? `<p>答對 <b>${opts.correct}</b> / ${opts.total}</p>` : ''}
      ${opts.gained ? `<p class="xpgain">+${opts.gained} XP</p>` : ''}
      ${opts.note ? `<p class="result-note">${opts.note}</p>` : ''}
      ${wrong.length ? `<div class="muted">答錯的已自動加入 📌不會清單：</div><div class="chips">${wrong.map(w => `<span class="chip">${esc(w.jp)} <small>${esc(w.zh || w.romaji || '')}</small></span>`).join('')}</div>` : ''}
    </div>`;
    const btns = [];
    if (opts.retry) btns.push({ label: '🔄 再玩一次', onClick: opts.retry });
    if (opts.back) btns.push({ label: opts.back.label || '返回', onClick: () => opts.back.route ? go(opts.back.route, opts.back.params) : back() });
    if (opts.next) btns.push({ label: opts.next.label || '下一站 ➜', cls: 'primary', onClick: () => go(opts.next.route, opts.next.params) });
    if (opts.ok || !btns.length) btns.push({ label: opts.ok || '確定', cls: 'primary' });
    return modal(html, btns);
  }

  /* ---------------- 路由 ---------------- */
  const routes = {};
  const order = [];
  function register(name, def) { routes[name] = def; if (!order.includes(name)) order.push(name); if (started) { renderNav(); } }
  // 路由：狀態放在 history.state（不改網址，相容 Claude 網站沙盒）；手機返回鍵＝回上一頁。
  // 路由定義 transient:true 表示「只負責轉址」的頁面，不留在歷史紀錄。
  let CUR = null, IDX = 0, canHist = false;
  const HIST = [];   // history API 不能用時的備援
  const STK = {};    // 各筆歷史紀錄的路由（i → {name, params}），給 backTo 判斷上一頁是誰
  // 返回攔截（活動進行中）：頂列 ← 與手機返回鍵都交給 onBack（例：問「要離開嗎？」）；換頁時呼叫 onDrop
  let GUARD = null;
  function guardBack(onBack, onDrop) {
    const g = { onBack, onDrop };
    GUARD = g;
    return () => { if (GUARD === g) GUARD = null; };
  }
  // 回到指定頁：上一筆歷史就是它 → history.back()（不重複堆疊）；否則把目前這筆換成它（返回不會回到剛離開的頁）
  function backTo(name, params) {
    params = params || {};
    const prev = canHist ? (IDX > 0 ? STK[IDX - 1] : null) : HIST[HIST.length - 1];
    const pp = (prev && prev.params) || {};
    if (prev && prev.name === name && Object.keys(params).every(k => JSON.stringify(pp[k]) === JSON.stringify(params[k]))) return back();
    if (canHist) try { history.replaceState({ jpq: 1, i: IDX, name, params }, ''); STK[IDX] = { name, params }; } catch (e) { }
    CUR = { name, params };
    render();
  }
  // 只換掉目前這筆歷史紀錄（不重繪）：之後按返回／從下一頁回來會落到 name，而不是目前畫面
  function replaceEntry(name, params) {
    params = params || {};
    if (canHist) try { history.replaceState({ jpq: 1, i: IDX, name, params }, ''); STK[IDX] = { name, params }; } catch (e) { }
    else if (CUR) { CUR = { name, params }; }
  }
  function parseHash() { return CUR || { name: 'home', params: {} }; }
  function entryRoute() {
    if (new URLSearchParams(location.search).has('share')) return 'read';
    return { '#mind3d': 'mind3d', '#read': 'read', '#songs': 'songs' }[location.hash] || 'home';
  }
  function go(name, params, isBack) {
    params = params || {};
    const same = CUR && CUR.name === name && JSON.stringify(CUR.params) === JSON.stringify(params);
    const fromTransient = CUR && routes[CUR.name] && routes[CUR.name].transient;
    if (!isBack && !same && CUR) {
      if (fromTransient) { if (canHist) try { history.replaceState({ jpq: 1, i: IDX, name, params }, ''); STK[IDX] = { name, params }; } catch (e) { } }
      else if (canHist) { try { history.pushState({ jpq: 1, i: IDX + 1, name, params }, ''); IDX++; STK[IDX] = { name, params }; } catch (e) { canHist = false; HIST.push(CUR); } }
      else { HIST.push(CUR); if (HIST.length > 30) HIST.shift(); }
    }
    CUR = { name, params };
    render();
  }
  function back() {
    if (GUARD) { try { GUARD.onBack(); } catch (e) { console.error(e); GUARD = null; } return; }
    if (canHist && IDX > 0) { history.back(); return; }
    const p = HIST.pop();
    if (p) go(p.name, p.params, true); else go('home', null, true);
  }
  function initHistory() {
    try {
      history.replaceState({ jpq: 1, i: 0, name: CUR.name, params: CUR.params }, '');
      STK[0] = { name: CUR.name, params: CUR.params };
      canHist = true;
      window.addEventListener('popstate', e => {
        const st = e.state;
        // 浮層（大字畫面等）：返回鍵＝關掉浮層，留在原頁
        if (skipPop) { skipPop = false; if (st && st.jpq) IDX = st.i || 0; return; }
        const top = LAYERS[LAYERS.length - 1];
        if (top) { LAYERS.pop(); top.remove(); if (st && st.jpq) IDX = st.i || 0; return; }
        // 活動進行中按手機返回鍵：補回這一筆、留在原頁，交給活動問「要離開嗎？」
        if (GUARD && CUR) {
          IDX = st && st.jpq ? st.i || 0 : 0;
          try { history.pushState({ jpq: 1, i: IDX + 1, name: CUR.name, params: CUR.params }, ''); IDX++; STK[IDX] = { name: CUR.name, params: CUR.params }; } catch (e) { }
          try { GUARD.onBack(); } catch (e) { console.error(e); GUARD = null; }
          return;
        }
        if (st && st.jpq) STK[st.i || 0] = { name: st.name || 'home', params: st.params || {} };
        if (!st || !st.jpq) { IDX = 0; CUR = { name: entryRoute(), params: {} }; render(); return; }
        // 轉址頁（transient）不重跑，順著方向再跳一格，避免返回時重開已完成的關卡
        if (routes[st.name] && routes[st.name].transient && (st.i || 0) > 0) { const fwd = (st.i || 0) > IDX; IDX = st.i || 0; fwd ? history.forward() : history.back(); return; }
        IDX = st.i || 0;
        CUR = { name: st.name || 'home', params: st.params || {} };
        render();
      });
    } catch (e) { canHist = false; }
  }
  // 浮層：layer(el) 放到畫面上並佔一筆歷史，手機返回鍵會先關掉它；回傳 close()
  const LAYERS = [];
  let skipPop = false;
  function layer(el) {
    document.body.appendChild(el);
    let pushed = false;
    if (canHist && CUR) try { history.pushState({ jpq: 1, i: IDX + 1, name: CUR.name, params: CUR.params, ov: 1 }, ''); IDX++; STK[IDX] = { name: CUR.name, params: CUR.params }; pushed = true; } catch (e) { }
    if (pushed) LAYERS.push(el);
    return () => {
      const k = LAYERS.indexOf(el);
      el.remove();
      if (k >= 0) { LAYERS.splice(k, 1); skipPop = true; history.back(); }
    };
  }
  let started = false;
  function render() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll('.modal-bg:not(.keep)').forEach(m => m.remove());
    LAYERS.splice(0).forEach(m => m.remove());
    if (GUARD) { const g = GUARD; GUARD = null; try { g.onDrop && g.onDrop(); } catch (e) { console.error(e); } }   // 換頁：進行中的活動以「未完成」結束，等待中的呼叫端不會卡住
    try { syncAvatar(); } catch (e) { }
    const { name, params } = parseHash();
    const r = routes[name] || routes.home;
    const main = document.getElementById('main');
    main.innerHTML = '';
    main.className = 'route-' + (routes[name] ? name : 'home');
    document.body.classList.remove('ob-mode');   // 首次程度選擇模式（home.js 設定）：換頁就解除
    window.scrollTo(0, 0);
    renderNav();
    try { r.render(main, params); }
    catch (e) { console.error(e); main.innerHTML = `<div class="panel"><h2>😵 頁面發生錯誤</h2><pre>${esc(e.stack || e)}</pre></div>`; }
    try { document.dispatchEvent(new CustomEvent('routechange', { detail: { name: routes[name] ? name : 'home', params: params || {} } })); } catch (e) { }   // 側邊樹、麵包屑、繼續上次（js/nav.js）
  }
  // 導覽圖示：線條 SVG（stroke=currentColor，跟主題變色）；沒列在這裡的路由用 emoji
  const NAV_SVG = {
    home: 'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5',
    path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
    lookup: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20',
    me: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
    play: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
    read: 'M4 5h11v14H6.5A2.5 2.5 0 0 1 4 16.5V5zM15 9h5v8a2 2 0 0 1-2 2h-3M7 9h5M7 12.5h5M7 16h3',
    kb: 'M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
    review: 'M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7'
  };
  function renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const cur0 = parseHash().name, r0 = routes[cur0];
    const SEC_R = { home: 'home', learn: 'path', lookup: 'lookup', me: 'me' };
    let cur = '';
    try { const L = window.NAV && NAV.locate(cur0, parseHash().params); if (L && L.sec) cur = SEC_R[L.sec.id] || ''; } catch (e) { }   // 底部亮燈＝麵包屑同一來源（NAV.locate）
    if (!cur) { let x = cur0; for (let i = 0; i < 4 && x && routes[x] && !routes[x].nav; i++) x = routes[x].navParent; cur = x && routes[x] && routes[x].nav ? x : 'home'; }
    nav.innerHTML = order.filter(n => routes[n].nav).sort((a, b) => (routes[a].navOrder || 9) - (routes[b].navOrder || 9)).map(n => {
      const r = routes[n];
      const dn = n === 'me' || n === 'review' ? (window.Learn ? Learn.due(15).length : Tracker.dueCount()) : 0;   // 紅點＝今天到期數（與首頁、我的同一個 Learn.due(15).length）
      const badge = dn ? `<span class="badge">${dn}</span>` : '';
      return `<a href="#${n}" data-route="${n}" class="${cur === n ? 'on' : ''}"${cur === n ? ' aria-current="page"' : ''}><span class="ni">${NAV_SVG[n] ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${NAV_SVG[n]}"/></svg>` : r.icon || ''}</span><span>${esc(r.title)}</span>${badge}</a>`;
    }).join('');
    nav.querySelectorAll('a[data-route]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.route); });
    const logo = document.querySelector('#top .logo'); if (logo) logo.onclick = e => { e.preventDefault(); go('home'); };
    const lv = levelOf(S.xp);
    const pc = document.getElementById('playerChip');
    if (pc) {
      const lo = LEVELS[lv - 1], hi = LEVELS[lv] || LEVELS[lv - 1] + 1000;
      const ss = { cloud: ['☁️', '已雲端存檔'], local: ['💾', '存在這台裝置'], none: ['⚠️', '無法存檔：本次進度關閉後會消失'] }[CL.status];
      const sk = streakInfo();
      pc.innerHTML = `<button class="pc-lv" id="lvBtn" type="button" title="${S.xp} XP・連續 ${sk.days} 天"><span class="pc-st${sk.done ? ' on' : ''}">🔥${sk.days}</span><b>Lv.${lv}</b><span class="pc-xp"><i style="width:${Math.max(4, Math.min(100, (S.xp - lo) / (hi - lo) * 100))}%"></i></span></button>
`;
      document.getElementById('lvBtn').onclick = () => modal(`<h2>Lv.${lv} ${esc(titles()[lv - 1] || '')}</h2><p class="muted">程度：${esc(LV_NAMES[S.profile.lv])}（在「我的」→ 設定可改）</p><p>${S.xp} XP・下一級還差 <b>${Math.max(0, hi - S.xp)}</b> XP</p><p>🔥 連續 ${sk.days} 天${sk.risk ? '（今天還沒練！練一題就能保住）' : ''}</p>`, [{ label: '關閉', cls: 'primary' }]);
      let bk = document.getElementById('backBtn');
      if (!bk) { bk = document.createElement('button'); bk.id = 'backBtn'; bk.className = 'icon-btn'; bk.title = '回上一頁'; bk.textContent = '←'; const top = document.querySelector('#top .in'); top.insertBefore(bk, top.firstChild); bk.onclick = back; }
      bk.hidden = !!(routes[cur0] && routes[cur0].nav);   // 首頁不顯示（不留空位，logo 貼齊左緣）；#backBtn 是全站唯一返回鍵，頁內不再放 ←
    }
  }
  /* ---------------- 外觀：主題色、淺深色、字級 ---------------- */
  function applyTheme() {
    const u = S.ui || {}, h = document.documentElement;
    if (u.theme === 'light' || u.theme === 'dark') h.dataset.theme = u.theme; else delete h.dataset.theme;
    h.dataset.palette = u.palette || 'coral';
    if (u.fs && u.fs !== 'm') h.dataset.fs = u.fs; else delete h.dataset.fs;
    LS.set(UI_KEY, JSON.stringify({ theme: u.theme, palette: u.palette, fs: u.fs }));
    const m = document.querySelector('meta[name=theme-color]');
    if (m) try { m.content = getComputedStyle(h).getPropertyValue('--bg').trim() || m.content; } catch (e) { }
  }
  function setTheme(theme, palette, fs) {
    const u = S.ui;
    if (theme && ['system', 'light', 'dark'].includes(theme)) u.theme = theme;
    if (palette && PALETTES.includes(palette)) u.palette = palette;
    if (fs && ['m', 'l', 'xl'].includes(fs)) u.fs = fs;
    save(); applyTheme();
    document.dispatchEvent(new CustomEvent('themechange', { detail: Object.assign({}, u) }));
  }
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.ui.theme === 'system') { applyTheme(); document.dispatchEvent(new CustomEvent('themechange', { detail: Object.assign({}, S.ui) })); } }); } catch (e) { }
  /* ---------------- 單一程度 ---------------- */
  function profile() { const p = normProfile(S.profile || (S.profile = {})); return { lv: p.lv, goals: p.goals.slice(), assist: p.assist, placed: !!p.placed, mins: p.mins, fresh: p.fresh }; }
  function setProfile(patch) {
    patch = patch || {};
    const p = S.profile || (S.profile = {}), was = p.lv;
    Object.assign(p, patch);
    if (patch.lv && !patch.assist && patch.lv !== was) p.assist = ASSIST_DEF[patch.lv] || p.assist;
    if (patch.lv) p.placed = true;
    normProfile(p); syncOld(S); syncAvatar(); save();
    document.dispatchEvent(new CustomEvent('profilechange', { detail: profile() }));
    return profile();
  }
  function start() { started = true; applyTheme(); CUR = { name: entryRoute(), params: {} }; initHistory(); onChange(renderNav); render(); cloudInit(); idbRestore(); }
  // localStorage 沒資料（被清除、私密模式切換）但 IndexedDB 有較新的存檔 → 還原
  function idbRestore() {
    IDB.get('save').then(v => {
      if (!v) { if (S._t) IDB.set('save', JSON.stringify(S)); return; }
      let o; try { o = migrate(JSON.parse(v)); } catch (e) { return; }
      if ((o._t || 0) > (S._t || 0) && hasProgress(o)) { S = o; LS.set(KEY, JSON.stringify(S)); applyTheme(); render(); toast('💾 已從備援存檔還原進度', 'ok'); }
    });
  }
  // 延遲載入：先登記路由外殼，第一次進入時才依序載入 scripts，載完自動重畫
  const loadedJS = {};
  function loadScript(src) {
    return loadedJS[src] || (loadedJS[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src;
      s.onload = res; s.onerror = () => { delete loadedJS[src]; rej(new Error(src)); };
      document.head.appendChild(s);
    }));
  }
  function lazy(defs, srcs) {
    const load = () => srcs.reduce((p, s) => p.then(() => loadScript(s)), Promise.resolve());
    defs.forEach(([name, def]) => register(name, Object.assign({}, def, {
      lazy: true,
      render(el) {
        el.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>';
        load().then(() => { if (CUR && CUR.name === name && routes[name] && !routes[name].lazy) render(); })
          .catch(() => { el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
      }
    })));
    return load;
  }
  function onChange(fn) { listeners.push(fn); }

  /* ---------------- Tracker：不會清單（Learn 的檢視） ----------------
     item: {id, jp, kana?, romaji?, zh, hint?, emoji?, source}
     舊 id（'word:<jp>'、'phrase:<jp>'、'gram:<句型>'）會由 Learn.idOf 轉成新 id（v:、p:、g:）；kana:、num:、cnt: 原樣
     清單＝ App.state.learn 中 star 或 lapses>ack 的項目；排程與掌握全部走 Learn.record
  ---------------------------------------------------- */
  const LN = () => window.Learn;
  const Tracker = {
    add(item, silent) {
      if (!item || !item.id || !LN()) return false;
      const ex = LN().get(item.id), was = !!(ex && LN().inList(item.id) && ex.s !== 'mastered');
      if (was) return false;
      LN().star(item.id, true, { item, src: 'review' });
      if (!S.trackHelp) { S.trackHelp = 1; save(); setTimeout(() => toast('📌 答錯或不熟的字會收進「不會清單」，按底部「複習」就能複習', 'ok'), 1500); }
      if (!silent) toast(`📌 已加入不會清單：${esc(item.jp)}`);
      return true;
    },
    remove(id) { if (LN()) LN().star(id, false); },
    has(id) { const e = LN() && LN().get(id); return !!(e && LN().inList(id) && e.s !== 'mastered'); },
    // 任何有進度的項目都回傳（含不在清單、已掌握）；欄位與舊版相同：mastered、due、right、wrong、streak、added、source…
    get(id) { return LN() ? LN().view(id) : null; },
    list(includeMastered) { return LN() ? LN().views((e, id) => LN().inList(id) && (includeMastered || e.s !== 'mastered')).sort((a, b) => b.added - a.added) : []; },
    count() { return LN() ? LN().stats().list : 0; },
    // 複習時呼叫：走 Learn 排程（答對拉長間隔、答錯立刻再練）；達到穩定度＝mastered
    mark(id, correct) {
      if (!LN()) return null;
      const before = LN().status(id);
      LN().record(id, correct ? 2 : 0, { src: 'review' });
      const t = LN().view(id);
      if (t && t.mastered && before !== 'mastered') toast(`🎓 已掌握：${esc(t.jp)}`, 'ok');
      return t;
    },
    // 今天該複習的：所有到期的學習項目（不限不會清單）
    dueList() { return LN() ? LN().due().map(id => LN().view(id)) : []; },
    dueCount() { return LN() ? LN().due().length : 0; },
    clearMastered() { if (!LN()) return; this.list(true).filter(t => t.mastered).forEach(t => LN().star(t.id, false)); },
    exportJSON() { return JSON.stringify(this.list(true), null, 2); },
    importJSON(txt) { const arr = JSON.parse(txt); if (!Array.isArray(arr)) throw new Error('格式錯誤'); return LN() ? LN().importList(arr) : 0; }
  };

  // 共用「＋不會清單」按鈕：trackBtn(item) 產生 HTML，點擊由事件代理處理
  const TB = new Map();
  function trackBtn(item, small) {
    if (!item || !item.id) return '';
    TB.set(item.id, item);
    const on = Tracker.has(item.id);
    return `<button type="button" class="track-btn${on ? ' on' : ''}${small ? ' sm' : ''}" data-track="${esc(item.id)}">${on ? '✓ 已在清單' : '＋ 不會清單'}</button>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.track-btn[data-track]');
    if (!b) return;
    e.stopPropagation();
    const id = b.dataset.track;
    if (Tracker.has(id)) { Tracker.remove(id); toast('已從不會清單移除'); }
    else if (TB.get(id)) Tracker.add(TB.get(id));
    const on = Tracker.has(id);
    document.querySelectorAll('.track-btn[data-track]').forEach(x => { if (x.dataset.track === id) { x.classList.toggle('on', on); x.textContent = on ? '✓ 已在清單' : '＋ 不會清單'; } });
  });

  // 把 KANA 陣列的一列轉成清單項目
  function kanaItem(k) {
    return { id: 'kana:' + k[0], jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', hint: k[5], emoji: k[4], source: '五十音' };
  }
  // 把場景單字/句子轉成清單項目
  function wordItem(w, sceneName, kind) {
    return { id: (kind || 'word') + ':' + w.jp, jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh, hint: w.hint || '', emoji: w.emoji || '', source: sceneName || '其他', ex: w.ex || '', exz: w.exz || '', exw: w.exw || '', from: w.from || '' };
  }

  /* ---------------- 備份／還原（原在 practice.js） ---------------- */
  function parseBackup(txt) {
    txt = String(txt || '').trim();
    let o = null;
    try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { } }
    if (o && o.state) o = o.state;
    if (!o || typeof o.xp !== 'number') throw new Error('bad');
    return o;
  }
  function backup() {
    const st = App.state, code = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
    const d = new Date(), stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const fname = '日語冒險備份-' + stamp + '.json';
    const json = JSON.stringify({ app: '日語冒險', v: 1, t: Date.now(), state: st });
    App.modal(`<h2>💾 備份／還原進度</h2>
      <p class="muted" style="font-size:.85em;margin:.3em 0">目前：Lv.${App.level}・${st.xp} XP・不會清單 ${Tracker.count()} 個</p>
      <div class="sec-t" style="margin:10px 0 6px">備份</div>
      <div class="bk-g">
        <button class="btn primary" id="bkShare">📤 分享備份<small>選 iCloud 雲碟、Google 雲端、LINE…</small></button>
        <button class="btn" id="bkSave">📁 存成檔案<small>自己選要放的位置</small></button>
        <button class="btn" id="bkCopy">📋 複製備份碼<small>貼到備忘錄／Keep</small></button>
      </div>
      <textarea id="bkOut" readonly style="width:100%;height:46px;font-size:.65em;margin-top:6px">${code}</textarea>
      <div class="sec-t" style="margin:10px 0 6px">還原</div>
      <div class="bk-g">
        <label class="btn" style="margin:0">📂 從檔案還原<small>選先前存的 .json</small><input type="file" id="bkFile" accept=".json,.txt,application/json,text/plain" style="display:none"></label>
      </div>
      <textarea id="bkIn" placeholder="或在這裡貼上備份碼，再按「還原」" style="width:100%;height:46px;font-size:.65em;margin-top:6px"></textarea>
      <style>.bk-g{display:grid;gap:6px}.bk-g .btn{margin:0;flex-direction:column;line-height:1.25;min-height:50px}.bk-g .btn small{font-weight:normal;font-size:.75em;opacity:.85}</style>`,
      [{ label: '關閉' }, { label: '還原', cls: 'primary' }]);
    const bg = [...document.querySelectorAll('.modal-bg')].pop(), $ = q => bg.querySelector(q);
    const copy = () => {
      const out = $('#bkOut'); out.focus(); out.select(); let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { }
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(code).then(() => App.toast('📋 已複製備份碼', 'ok')).catch(() => App.toast('請長按上方文字框，手動全選複製'));
      else App.toast(ok ? '📋 已複製備份碼，貼到備忘錄或 Keep 保存' : '請長按上方文字框，手動全選複製');
    };
    const download = () => {
      try {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const aEl = document.createElement('a'); aEl.href = url; aEl.download = fname; document.body.appendChild(aEl); aEl.click(); aEl.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        App.toast('📁 已送出下載（若沒反應，請改用「複製備份碼」）');
      } catch (e) { copy(); }
    };
    $('#bkShare').onclick = async () => {
      try {
        const file = typeof File === 'function' ? new File([json], fname, { type: 'application/json' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '日語冒險備份' }); App.toast('✅ 已分享備份', 'ok'); return; }
        if (navigator.share) { await navigator.share({ title: '日語冒險備份碼', text: code }); App.toast('✅ 已分享備份碼', 'ok'); return; }
        App.toast('這裡不支援分享，已改用複製'); copy();
      } catch (e) {
        if (e && e.name === 'AbortError') return;     // 使用者自己取消
        App.toast('分享被瀏覽器擋住，已改用複製'); copy();
      }
    };
    $('#bkSave').onclick = async () => {
      if (window.showSaveFilePicker) {
        try {
          const h = await showSaveFilePicker({ suggestedName: fname, types: [{ description: '日語冒險備份', accept: { 'application/json': ['.json'] } }] });
          const w = await h.createWritable(); await w.write(json); await w.close();
          App.toast('✅ 已存到你選的位置', 'ok'); return;
        } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      download();
    };
    $('#bkCopy').onclick = copy;
    const restore = txt => {
      try { const o = parseBackup(txt); bg.remove(); App.loadState(o); App.toast(`✅ 已還原：Lv.${App.level}・${o.xp} XP`, 'ok'); }
      catch (e) { App.toast('❌ 備份內容不正確'); }
    };
    $('#bkFile').onchange = e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => restore(r.result); r.onerror = () => App.toast('❌ 讀不到這個檔案'); r.readAsText(f);
    };
    [...bg.querySelectorAll('.modal-btns .btn')].pop().onclick = () => restore($('#bkIn').value);
  }


  window.App = {
    get state() { return S; },
    VERSION: APP_VERSION,
    LEVELS, get TITLES() { return titles(); }, TITLE_SETS, titleKey, levelOf,
    get level() { return levelOf(S.xp); },
    save, onChange, register, go, start, render,
    addXP, completeQuest, reward, showResult, modal, toast,
    speak: speakJP, voiceOK, voiceHTML, voicePacks, setVoice, ttsVoice, jaVoices, layer, esc, shuffle, sample, kanaItem, wordItem,
    isCleared: id => !!S.cleared[id], stars: id => S.cleared[id] || 0,
    back, backTo, replaceEntry, guardBack,
    resetAll() { LS.del(KEY); IDB.del('save'); S = migrate({}); save(); if (CL.ref) cloudPush(); go('home'); },
    get saveStatus() { return CL.status; },
    noteClear,
    loadState(o) { S = migrate(JSON.parse(JSON.stringify(o))); save(); if (CL.ref) cloudPush(); applyTheme(); render(); },
    profile, setProfile, setTheme, applyTheme, LV_IDS, LV_NAMES, LV_DESC, PALETTES,
    trackBtn, streakInfo, today: dayKey, backup, lazy, loadScript, idb: IDB,
    addUnlock(fn) { unlockFns.push(fn); },
    store: { get: LS.get, del: LS.del, set(k, v) { if (k === 'jpq.mind.v1') { save(); return; } LS.set(k, v); } },   // 知識庫狀態已併入 App.state（learn、mind）
    onMigrate(fn) { MIGS.push(fn); let ch = false; try { ch = fn(S); } catch (e) { console.error(e); } if (ch) save(); }
  };
  window.Tracker = Tracker;
})();
