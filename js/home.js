/* =========================================================
   首頁 home、設定頁 settings、首次開啟的程度選擇（A 組）
   首頁：主按鈕「繼續」＋今日 3 件事＋次要入口（可點元素 ≤10）
   依賴（皆防呆）：World.next()、World.japan(el)（B 組）；Game.daily()；Tracker
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const has = (o, k) => !!(o && typeof o[k] === 'function');
  const safe = (fn, fb) => { try { const v = fn(); return v == null ? fb : v; } catch (e) { console.warn(e); return fb; } };
  const LV_ICON = { zero: '🌱', n5: '🔰', n4: '🙂', n3: '💬', n2: '💼', n1: '🎌' };

  /* ---------- 冒險下一步：B 的 World.next()，沒有就用存檔推算 ---------- */
  function worldNext() {
    if (has(window.World, 'next')) {
      const n = safe(() => World.next(), null);
      if (n && n.route) return n;
    }
    const at = (App.state.world || {}).at;
    if (at && at.d) return { label: at.label || '回到上次的位置', route: 'play', params: { r: at.r, d: at.d, s: at.s || undefined } };
    return { label: '東京・成田機場出發', route: 'play', params: { r: 'tokyo' } };
  }
  const kanaLearned = () => (((App.state.kanaL || {}).h) || []).length;
  const KANA_N = window.KANA ? KANA.length : 46;
  const goKana = () => App.go('trip', { kana: 1 });
  // 今日短文：不依賴延遲載入的 reader.js——直接讀存檔（讀完每日短文時 reader 寫入 read.lastDay）；READING 已載入時再比對今天的篇目
  function readDone() {
    const r = App.state.read || {}, today = App.today();
    if (r.lastDay === today) return true;
    return safe(() => { if (!window.READING || !has(READING, 'pick')) return false; const t = READING.pick(App.profile().lv, today); return !!(t && r.done && r.done[t.id]); }, false);
  }

  /* ---------- 首頁 ---------- */
  function render(el) {
    const p = App.profile();
    if (!p.placed) return onboard(el);
    const due = Tracker.dueCount(), total = Tracker.count(), sk = App.streakInfo();
    const d = window.Game && has(Game, 'daily') ? safe(() => Game.daily(), null) : null;
    const nx = Object.assign({}, worldNext()), kl = kanaLearned();
    if (!nx.sub && /^繼續冒險/.test(nx.label || '')) nx.sub = '從上次的位置繼續';   // 副標不和主按鈕標題重複
    const kanaFirst = p.lv === 'zero' && kl < KANA_N;
    const main = kanaFirst
      ? { ic: '🔰', b: kl ? '繼續學五十音' : '從五十音開始', s: `平假名 ${kl}／${KANA_N}・每次 5 個字，先教再考`, go: goKana }
      : { ic: '▶', b: '繼續冒險', s: nx.sub || nx.label, go: () => App.go(nx.route, nx.params) };
    // 今天練過任何題目（答對、複習、店內完成、其他過關）
    const practiced = !!(d && ((d.ok || 0) + (d.review || 0) + (d.quests || 0) + (d.clear || 0) > 0));
    const kanaToday = App.state.kanaDay === App.today();
    const rd = readDone();
    const cd = App.state.cardDay || {}, cardsN = cd.d === App.today() ? cd.n || 0 : 0, ld = App.state.lastDone || {};
    const cardTask = n => ({ id: 'cards', n, done: cardsN >= 10, b: kanaFirst ? '翻 10 張五十音字卡' : '翻 10 張字卡', s: cardsN >= 10 ? '今天翻完了 👍' : `今天已翻 ${cardsN}／10 張`, go: () => App.go('cards', kanaFirst ? { deck: 'hira' } : {}) });
    const tasks = [
      total
        ? { id: 'rev', n: 1, done: !due, b: due ? `複習 ${due} 個字` : '今日複習', s: due ? '答錯或不熟的字，到期了' : '今天的都複習完了 👍', go: () => App.go('review') }
        : cardTask(1),
      { id: 'read', n: 2, done: rd, b: '今日短文', s: rd ? '今天讀完了 👍' : '一則簡單日文，附讀音與中文', go: () => App.go('read', { sec: 'art' }) },
      kanaFirst
        ? (total ? cardTask(3) : { id: 'kq', n: 3, done: ld.kana === App.today(), b: '五十音小練習', s: '聽音選字、看字選音，10 題', go: () => App.go('phrasebook', { tab: 'kana', sub: 'quiz' }) })
        : { id: 'chal', n: 3, done: ld.chal === App.today(), b: `${String(p.lv || 'n5').toUpperCase()} 挑戰一輪`, s: ld.chal === App.today() ? '今天挑戰過了 👍' : '仿 JLPT 題型，10 題', go: () => App.go('challenge') }
    ];
    const doneN = tasks.filter(t => t.done).length;
    el.innerHTML = `<section class="hm">
      <h1 class="hm-hi">${greet()}<small>程度：${esc(App.LV_NAMES[p.lv])}${sk.days ? `　<span class="hm-streak">🔥 連續 ${sk.days} 天${sk.risk ? '・今天練一題就能保住' : ''}</span>` : ''}</small></h1>
      <button type="button" class="hm-main" id="hm-main"><span class="ic" aria-hidden="true">${main.ic}</span><span><b>${esc(main.b)}</b><small>${esc(main.s)}</small></span></button>
      <p class="hm-sec">今日 3 件事<small>${doneN}／3 完成</small></p>
      <div class="hm-today">${tasks.map(t => `<button type="button" class="hm-task${t.done ? ' done' : ''}" data-t="${t.id}"><span class="n">${t.done ? '✓' : t.n}</span><span class="t"><b>${esc(t.b)}</b><small>${esc(t.s)}</small></span><span class="go" aria-hidden="true">›</span></button>`).join('')}</div>
      <div class="hm-more">
        <button type="button" data-go="kana"><span aria-hidden="true">あ</span>五十音</button>
        <button type="button" data-go="phrasebook"><span aria-hidden="true">📖</span>手冊</button>
        <button type="button" data-go="cards"><span aria-hidden="true">🎴</span>字卡</button>
        <button type="button" data-go="challenge"><span aria-hidden="true">🏆</span>N5–N1 挑戰</button>
        <button type="button" data-go="boot"><span aria-hidden="true">🎧</span>特訓</button>
      </div>
    </section>`;
    el.querySelector('#hm-main').onclick = main.go;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => tasks.find(t => t.id === b.dataset.t).go());
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => b.dataset.go === 'kana' ? App.go('phrasebook', { tab: 'kana' }) : App.go(b.dataset.go));
    const det = el.querySelector('#hm-map');
    if (det) det.addEventListener('toggle', () => {
      const box = det.querySelector('.mapbox');
      if (!det.open || box.childElementCount) return;
      if (has(window.World, 'japan')) safe(() => World.japan(box), null);
      if (!box.childElementCount) box.innerHTML = `<button type="button" class="btn block" id="hm-play">🗾 打開冒險地圖</button>`;
      const b = box.querySelector('#hm-play'); if (b) b.onclick = () => App.go('play');
    });
  }
  function greet() {
    const h = new Date().getHours();
    return h < 5 ? 'こんばんは 🌙' : h < 11 ? 'おはよう ☀️' : h < 18 ? 'こんにちは 👋' : 'こんばんは 🌙';
  }

  /* ---------- 首次開啟：直接選程度，或 3 題簡單定位 ---------- */
  const QUIZ = [
    { q: 'ね', sub: '這個假名怎麼念？', a: ['ne', 're', 'wa', 'nu'] },
    { q: 'すみません、水をください。', sub: '這句是什麼意思？', a: ['不好意思，請給我水', '不好意思，水在哪裡？', '這瓶水多少錢？', '謝謝，我不要水'] },
    { q: '雨が降ったら、タクシーで行きましょう。', sub: '這句是什麼意思？', a: ['如果下雨，就搭計程車去吧', '因為下雨，所以沒搭計程車', '雨停了，我們走路去吧', '下雨天計程車很貴'] }
  ];
  const FAIL_AT = ['zero', 'n5', 'n4'];   // 第 i 題答錯 → 程度
  function onboard(el, retake) {
    // 首次選程度：隱藏底部導覽與頂列按鈕，必須先選（core.render 換頁時自動解除）
    if (!App.profile().placed) document.body.classList.add('ob-mode');
    el.innerHTML = `<section class="ob">
      <h1>${retake ? '重新選程度' : 'ようこそ！歡迎 👋'}</h1>
      <p class="lead">你的日文大概到哪裡？選一個最接近的（之後隨時能在 ⚙️ 設定改，進度不會歸零）</p>
      <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt" data-lv="${id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${esc(App.LV_NAMES[id])}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
      <button type="button" class="btn ob-skip" id="ob-quiz">🤔 不確定？3 題幫你判斷</button>
    </section>`;
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => choose(b.dataset.lv));
    el.querySelector('#ob-quiz').onclick = () => quiz(el, 0);
  }
  function choose(lv) {
    App.setProfile({ lv });
    App.toast(`程度：${App.LV_NAMES[lv]}${lv === 'zero' ? '・先從五十音開始' : ''}`, 'ok');
    App.go('home');
  }
  function quiz(el, i) {
    if (i >= QUIZ.length) return result(el, 'n3');
    const Q = QUIZ[i], opts = App.shuffle(Q.a);
    el.innerHTML = `<section class="ob">
      <p class="lead">定位小測驗 ${i + 1}／${QUIZ.length}・不會就選「不知道」，沒關係</p>
      <div class="bar"><div style="width:${i / QUIZ.length * 100}%"></div></div>
      <p class="ob-q"><span class="jp" lang="ja">${esc(Q.q)}</span><small>${esc(Q.sub)}</small></p>
      <div class="ob-list">${opts.map(a => `<button type="button" class="ob-opt" data-a="${esc(a)}"><span><b>${esc(a)}</b></span></button>`).join('')}
        <button type="button" class="ob-opt" data-a=""><span><b>不知道</b></span></button></div>
    </section>`;
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => b.dataset.a === Q.a[0] ? quiz(el, i + 1) : result(el, FAIL_AT[i]));
  }
  function result(el, lv) {
    el.innerHTML = `<section class="ob center">
      <p class="ob-q">${LV_ICON[lv]}<small>建議程度</small></p>
      <h1>${esc(App.LV_NAMES[lv])}</h1>
      <p class="lead">${esc(App.LV_DESC[lv])}${lv === 'n3' ? '。程度更高可以到設定再往上調' : ''}</p>
      <button type="button" class="btn primary block" id="ob-ok">就這個，開始！</button>
      <button type="button" class="btn ghost block" id="ob-back">我自己選</button>
    </section>`;
    el.querySelector('#ob-ok').onclick = () => choose(lv);
    el.querySelector('#ob-back').onclick = () => onboard(el, App.profile().placed);
  }

  /* ---------- 設定頁 ---------- */
  const PAL_NAMES = { coral: '珊瑚', sakura: '櫻花', matcha: '抹茶', ocean: '海洋', lavender: '薰衣草', mono: '墨黑' };
  let clearArmed = false;
  /* 語音包（資料與播放在 core.js：App.voicePacks／setVoice／ttsVoice） */
  const VOICE_DEMO = 'こんにちは。いらっしゃいませ、ご注文はお決まりですか？';
  function voiceBox() {
    if (!App.voicePacks) return '';
    const c = App.state.voice || {}, list = App.jaVoices ? App.jaVoices() : [];
    const rng = (id, lbl, v) => `<label class="st-rng"><span>${lbl}<b id="${id}-v">×${(+v).toFixed(2)}</b></span><input type="range" id="${id}" min="0.5" max="1.5" step="0.05" value="${v}"></label>`;
    return `<div class="st-box st-voice"><h2>🔊 語音</h2>${App.voiceHTML()}
        <p class="st-lbl">語音包</p>
        <div class="ob-list">${App.voicePacks().map(k => `<button type="button" class="ob-opt${k.on ? ' on' : ''}" data-vpack="${k.id}" aria-pressed="${k.on}"><span aria-hidden="true">${k.icon}</span><span><b>${esc(k.name)}${k.simulated ? '<em class="st-sim">模擬</em>' : ''}</b><small>${esc(k.desc)}</small></span></button>`).join('')}</div>
        <p class="st-lbl">指定系統語音</p>
        <select class="st-sel" id="st-vuri"><option value="">自動（依語音包挑選）</option>${list.map(v => `<option value="${esc(v.voiceURI)}"${v.voiceURI === c.voiceURI ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        ${list.some(v => v.voiceURI === c.voiceURI) || !c.voiceURI ? '' : '<p class="st-note">指定的語音在這台裝置找不到，改用自動。</p>'}
        <p class="st-lbl">微調</p>${rng('st-vrate', '速度', c.rate || 1)}${rng('st-vpitch', '音調', c.pitch || 1)}
        <div class="st-vbtns"><button type="button" class="btn primary" id="st-vtry">▶️ 試聽</button><button type="button" class="btn" id="st-vreset">↺ 微調歸零</button></div>
      </div>`;
  }
  function bindVoice(el) {
    if (!App.voicePacks) return;
    const q = s => el.querySelector(s), again = () => settings(el);
    el.querySelectorAll('[data-vpack]').forEach(b => b.onclick = () => { App.setVoice({ pack: b.dataset.vpack }); App.speak(VOICE_DEMO); again(); });
    q('#st-vuri').onchange = e => { App.setVoice({ voiceURI: e.target.value }); App.speak(VOICE_DEMO); };
    [['#st-vrate', 'rate'], ['#st-vpitch', 'pitch']].forEach(([s, k]) => {
      const r = q(s);
      r.oninput = () => { q(s + '-v').textContent = '×' + (+r.value).toFixed(2); };
      r.onchange = () => App.setVoice({ [k]: +r.value });
    });
    q('#st-vtry').onclick = () => App.speak(VOICE_DEMO);
    q('#st-vreset').onclick = () => { App.setVoice({ rate: 1, pitch: 1 }); again(); };
    // 語音清單晚載入時（Chrome 常見）補畫一次
    if (!(App.jaVoices && App.jaVoices().length)) document.addEventListener('voiceschange', () => { if (el.isConnected && el.querySelector('.st-voice')) again(); }, { once: true });
  }
  function settings(el) {
    const u = App.state.ui, p = App.profile(), G = window.Game;
    const seg = (name, cur, list) => `<div class="st-seg" role="group">${list.map(([v, n]) => `<button type="button" data-${name}="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;
    el.innerHTML = `<section class="st">
      <h1>⚙️ 設定</h1>
      <div class="st-box st-lv"><h2>📶 我的程度</h2>
        <div class="ob-list">${App.LV_IDS.map(id => `<button type="button" class="ob-opt${p.lv === id ? ' on' : ''}" data-lv="${id}" aria-pressed="${p.lv === id}"><span aria-hidden="true">${LV_ICON[id]}</span><span><b>${esc(App.LV_NAMES[id])}</b><small>${esc(App.LV_DESC[id])}</small></span></button>`).join('')}</div>
        <p class="st-lbl">提示（讀音、中文、答案提示）</p>${seg('assist', p.assist, [['full', '全部顯示'], ['some', '只給讀音'], ['none', '不要提示']])}
        <p class="st-note">改程度只會換內容與提示，進度、星星、XP 都保留。</p>
        <button type="button" class="btn block" id="st-quiz">🤔 重新做 3 題定位</button>
      </div>
      <div class="st-box"><h2>🎨 外觀</h2>
        <p class="st-lbl">主題色</p>
        <div class="st-dots">${App.PALETTES.map(k => `<button type="button" class="st-dot${u.palette === k ? ' on' : ''}" data-pal="${k}" aria-pressed="${u.palette === k}"><i></i>${PAL_NAMES[k]}</button>`).join('')}</div>
        <p class="st-lbl">淺色／深色</p>${seg('theme', u.theme, [['system', '跟隨系統'], ['light', '☀️ 淺色'], ['dark', '🌙 深色']])}
        <p class="st-lbl">字級</p>${seg('fs', u.fs, [['m', '標準'], ['l', '大'], ['xl', '特大']])}
      </div>
      ${voiceBox()}
      <div class="st-box"><h2>🧰 其他</h2><div class="st-rows">
        ${G ? `<button type="button" class="st-row" id="st-sfx">${G.sfxOn() ? '🔊 音效' : '🔇 音效'}<small>${G.sfxOn() ? '開' : '關'}</small></button>` : ''}
        <button type="button" class="st-row" id="st-av">🎭 換頭像<small>›</small></button>
        <button type="button" class="st-row" id="st-bk">💾 備份／還原存檔<small>${App.saveStatus === 'cloud' ? '已雲端存檔' : '存在這台裝置'}</small></button>
      </div></div>
      <div class="st-box"><h2>⚠️ 危險區</h2>
        <button type="button" class="btn block st-danger" id="st-clear">🗑️ 清除全部進度</button>
      </div>
      <p class="st-ver">日語冒險</p>
    </section>`;
    const q = s => el.querySelector(s);
    el.querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { App.setTheme(null, b.dataset.pal); settings(el); });
    el.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { App.setTheme(b.dataset.theme); settings(el); });
    el.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { App.setTheme(null, null, b.dataset.fs); settings(el); });
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { App.setProfile({ lv: b.dataset.lv }); App.toast(`程度改為：${App.LV_NAMES[b.dataset.lv]}`, 'ok'); settings(el); });
    el.querySelectorAll('[data-assist]').forEach(b => b.onclick = () => { App.setProfile({ assist: b.dataset.assist }); settings(el); });
    q('#st-quiz').onclick = () => quiz(el, 0);
    bindVoice(el);
    const sf =q('#st-sfx'); if (sf) sf.onclick = () => { G.toggleSfx(); settings(el); };
    q('#st-av').onclick = () => {
      if (G && has(G, 'pickAvatar')) G.pickAvatar(() => App.render());
    };
    q('#st-bk').onclick = () => App.backup();
    q('#st-clear').onclick = () => {
      if (!clearArmed) { clearArmed = true; App.toast('⚠️ 會清除 XP、不會清單、所有進度。再點一次確定'); setTimeout(() => { clearArmed = false; }, 3000); return; }
      clearArmed = false; App.resetAll();
    };
  }

  App.register('home', { title: '首頁', icon: '🏠', nav: true, navOrder: 1, render });
  App.register('settings', { title: '設定', icon: '⚙️', nav: false, navParent: 'home', render: settings });
  window.Home = { render, settings, onboard };
})();
