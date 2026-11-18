/* =========================================================
   日語冒險 — 升級任務 quest.js（關卡設計）
   路由：map（冒險地圖）、quest（假名關卡，params {id}）
   公開：window.QUESTS、window.QUEST_CHAPTERS、window.QuestAPI
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 樣式 ---------------- */
  (function injectCSS() {
    if (document.getElementById('css-quest')) return;
    const st = document.createElement('style');
    st.id = 'css-quest';
    st.textContent = `
.q-play{max-width:640px;margin:auto}
.q-hearts{font-size:1.3em;letter-spacing:2px}
.q-hearts.hit{animation:qshake .4s}
@keyframes qshake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.q-combo{color:var(--red);font-weight:bold;animation:pop .25s}
.q-ask{text-align:center;color:var(--muted);font-size:1.05em}
.q-snd{display:block;margin:14px auto;font-size:3em;width:110px;height:110px;border-radius:50%;border:1px solid var(--line);background:var(--soft);box-shadow:var(--shadow);cursor:pointer}
.q-snd:hover{filter:brightness(.97)}
.q-roma{font-size:3em;text-align:center;font-weight:bold;letter-spacing:2px;margin:10px 0}
.q-fb{border-radius:14px;padding:12px;margin-top:6px;text-align:left}
.q-fb.ok{background:var(--ok-t);border:2px solid var(--ok)}
.q-fb.ng{background:var(--err-t);border:2px solid var(--err)}
.q-fb .q-fh{font-weight:bold;font-size:1.1em}
.q-fb .q-fk{font-size:1.8em;margin-right:6px}
.q-fb .q-fr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
.q-fb .q-fr .btn{margin-left:auto}
.q-key{font-size:.75em;color:var(--muted);margin-right:4px}
@media(max-width:640px){
  .q-roma{font-size:2.4em}
  .q-key{display:none}
}`;
    document.head.appendChild(st);
  })();

  /* ---------------- 假名資料整理 ---------------- */
  const _KANA = typeof KANA !== 'undefined' ? KANA : [];
  const _DAKU = typeof DAKU !== 'undefined' ? DAKU : [];
  const _YOON = typeof YOON !== 'undefined' ? YOON : [];
  const _GRID = typeof GRID !== 'undefined' ? GRID : [];
  const HANDAKU = 'ぱぴぷぺぽ';
  const snd = r => String(r || '').split(/[\s(（]/)[0].toLowerCase();

  const ITEMS = {};            // 平假名 → 正規化項目
  const FAM = { basic: [], daku: [], handaku: [], yoon: [] };

  function romaOf(h) { const it = ITEMS[h]; return it ? it.r : ''; }
  function put(r9, fam) {
    const it = { h: r9[0], k: r9[1], r: r9[2], snd: snd(r9[2]), hint: r9[3], emoji: r9[4] || '', ah: r9[5] || '', ak: r9[6] || '', raw: r9, fam };
    ITEMS[it.h] = it; FAM[fam].push(it); return it;
  }
  _KANA.forEach(k => put(k, 'basic'));
  _DAKU.forEach(d => {
    const hd = HANDAKU.includes(d[0]), off = hd ? 2 : 1;
    const bh = String.fromCharCode(d[0].charCodeAt(0) - off), bk = String.fromCharCode(d[1].charCodeAt(0) - off);
    const mark = hd ? '小圈「゜」→ 半濁音' : '兩點「゛」→ 濁音';
    put([d[0], d[1], d[2], d[3], hd ? '⭕' : '〃',
      `「${bh}」(${romaOf(bh)}) 右上加${mark} ${d[2]}`, `「${bk}」右上加${mark} ${d[2]}`, bh, bk], hd ? 'handaku' : 'daku');
  });
  _YOON.forEach(y => {
    const b = y[0][0], s = y[0].slice(1);
    put([y[0], y[1], y[2], y[3], '🔗',
      `「${b}」(${romaOf(b)}) ＋ 小一號的「${s}」→ 兩個字連讀成一拍 ${y[2]}`, `「${y[1][0]}」＋ 小「${y[1].slice(1)}」→ ${y[2]}`, '', ''], 'yoon');
  });
  const rowKana = (...idx) => idx.flatMap(i => (_GRID[i] || []).filter(Boolean));
  const keys = fam => FAM[fam].map(i => i.h);

  /* ---------------- 章節與關卡 ---------------- */
  const CHAPTERS = [
    { n: 1, name: '平假名之森', icon: '🌲', color: 'var(--n5)', desc: '從最基本的 46 個平假名開始，每一行都是一段森林小徑。' },
    { n: 2, name: '片假名之城', icon: '🏯', color: 'var(--n4)', desc: '片假名常用在外來語（咖啡、拉麵菜單上滿滿都是），和平假名一起記！' },
    { n: 3, name: '濁音・拗音之谷', icon: '⛰️', color: 'var(--n2)', desc: '加兩點、加小圈、小字連讀，學會後幾乎所有日文都念得出來。' },
    { n: 4, name: '日本街道任務', icon: '🗾', color: 'var(--n1)', desc: '走進日本真實場景，用學會的日文點餐、購物、問路、求助。' }
  ];

  const SCENE_META = {
    konbini: ['便利商店', '🏪', 1], ramen: ['拉麵店', '🍜', 2], cafe: ['咖啡廳', '☕', 3],
    drugstore: ['藥妝店', '💊', 4], izakaya: ['居酒屋・餐廳', '🏮', 5], clothes: ['服飾店', '👕', 6],
    directions: ['問路', '🧭', 2], station: ['車站・電車', '🚉', 3], hotel: ['飯店入住', '🏨', 4],
    shrine: ['神社・觀光', '⛩️', 5], airport: ['機場', '✈️', 6], emergency: ['緊急求助・藥局', '🚑', 7]
  };

  const Q = [];
  function add(o) {
    o.requires = o.requires || (Q.length ? [Q[Q.length - 1].id] : []);
    o.minLevel = o.minLevel || 1;
    Q.push(o);
  }
  function kq(id, ch, title, icon, kana, script, xp, opt) {
    add(Object.assign({ id, chapter: ch, title, icon, type: 'kana', kana, script, xp, count: 10, boss: false }, opt || {}));
  }
  function bq(id, ch, title, icon, kana, script, xp, count, opt) {
    add(Object.assign({ id, chapter: ch, title, icon, type: 'kana', kana, script, xp, count, boss: true }, opt || {}));
  }
  function sq(sceneId, ch, xp) {
    const m = SCENE_META[sceneId];
    add({ id: 'scene-' + sceneId, chapter: ch, title: m[0] + '任務', icon: m[1], type: 'scene', sceneId, minLevel: m[2], xp });
  }

  // 第1章 平假名之森
  kq('h-a', 1, 'あ行：啊衣屋欸喔', '🌱', rowKana(0), 'h', 20);
  kq('h-ka', 1, 'か行：卡key哭K扣', '🍃', rowKana(1), 'h', 20);
  kq('h-sa', 1, 'さ行：撒吸酥say搜', '🌿', rowKana(2), 'h', 25);
  kq('h-ta', 1, 'た行：他七此貼偷', '🍀', rowKana(3), 'h', 25);
  kq('h-na', 1, 'な行：拿你奴內no', '🌾', rowKana(4), 'h', 25);
  kq('h-ha', 1, 'は行：哈hi呼嘿齁', '🌳', rowKana(5), 'h', 25);
  kq('h-ma', 1, 'ま行：媽咪哞咩摸', '🍄', rowKana(6), 'h', 25);
  kq('h-yrwn', 1, 'や・ら・わ・ん行', '🌸', rowKana(7, 8, 9, 10), 'h', 30);
  bq('h-boss', 1, 'BOSS：平假名總測驗', '🐉', keys('basic'), 'h', 60, 18);
  sq('konbini', 1, 40);
  // 第2章 片假名之城
  kq('k-aka', 2, 'ア行・カ行', '🚪', rowKana(0, 1), 'k', 30, { minLevel: 3 });
  kq('k-sata', 2, 'サ行・タ行', '🧱', rowKana(2, 3), 'k', 30);
  sq('ramen', 2, 40);
  kq('k-naha', 2, 'ナ行・ハ行', '🏮', rowKana(4, 5), 'k', 30);
  kq('k-maya', 2, 'マ行・ヤ行', '🎏', rowKana(6, 7), 'k', 30);
  sq('directions', 2, 40);
  kq('k-rawan', 2, 'ラ行・ワ行・ン', '🗝️', rowKana(8, 9, 10), 'k', 35);
  bq('k-boss', 2, 'BOSS：片假名總測驗', '👹', keys('basic'), 'k', 70, 18);
  // 第3章 濁音・拗音之谷
  sq('cafe', 3, 45);
  sq('station', 3, 45);
  kq('d-daku', 3, '濁音：が・ざ・だ・ば行', '〃', keys('daku'), 'both', 40, { minLevel: 5, count: 12 });
  kq('d-handaku', 3, '半濁音：ぱ行', '⭕', keys('handaku'), 'both', 35);
  sq('drugstore', 3, 50);
  kq('d-yoon', 3, '拗音：きゃ・しゅ・ちょ…', '🔗', keys('yoon'), 'both', 45, { count: 12 });
  sq('hotel', 3, 50);
  bq('d-boss', 3, 'BOSS：濁音・拗音大魔王', '🦂', keys('daku').concat(keys('handaku'), keys('yoon')), 'both', 80, 18);
  // 第4章 日本街道任務
  sq('izakaya', 4, 60);
  sq('shrine', 4, 60);
  sq('clothes', 4, 60);
  sq('airport', 4, 60);
  sq('emergency', 4, 70);
  bq('final-boss', 4, 'BOSS：假名畢業大考', '🏯', keys('basic').concat(keys('daku'), keys('handaku'), keys('yoon')), 'both', 120, 20, { minLevel: 7 });

  window.QUESTS = Q;
  window.QUEST_CHAPTERS = CHAPTERS;

  /* ---------------- 共用 ---------------- */
  const byId = id => Q.find(q => q.id === id) || null;
  const sceneData = id => (window.SCENES || []).find(s => s && s.id === id) || null;
  function needLevel(q) {
    let lv = q.minLevel || 1;
    if (q.type === 'scene') { const s = sceneData(q.sceneId); if (s && s.unlockLevel) lv = Math.max(lv, s.unlockLevel); }
    return lv;
  }
  function isUnlocked(id) {
    const q = byId(id); if (!q) return false;
    return q.requires.every(r => App.isCleared(r));
  }
  function nextQuest() {
    return Q.find(q => !App.isCleared(q.id) && isUnlocked(q.id)) || Q.find(q => !App.isCleared(q.id)) || null;
  }
  function lockReason(q) {
    const out = [];
    q.requires.filter(r => !App.isCleared(r)).forEach(r => { const p = byId(r); out.push(`先通過「<b>${App.esc(p ? p.title : r)}</b>」`); });
    return out;
  }
  function showLocked(q) {
    App.modal(`<div style="font-size:3em">🔒</div><h2>${App.esc(q.title)}</h2><p>這一關還沒解鎖，條件：</p>
      <ul style="text-align:left">${lockReason(q).map(s => `<li>${s}</li>`).join('')}</ul>`, [{ label: '知道了', cls: 'primary' }]);
  }
  function play(id) {
    const q = byId(id);
    if (!q) { App.toast('找不到這個關卡'); App.go('practice-map'); return; }
    if (!isUnlocked(id)) { showLocked(q); return; }
    if (q.type === 'scene') {
      if (!sceneData(q.sceneId)) {
        App.modal(`<div style="font-size:3em">${q.icon}</div><h2>${App.esc(q.title)}</h2><p>這個場景的內容還在準備中 🚧<br>請稍後再來，或先去其他關卡練習！</p>`, [{ label: '回地圖', cls: 'primary', onClick: () => App.go('practice-map') }]);
        return;
      }
      App.go('scene', { id: q.sceneId, mission: q.id });
      return;
    }
    App.go('quest', { id: q.id });
  }
  window.QuestAPI = { isUnlocked, nextQuest, play };


  /* ---------------- 題目產生 ---------------- */
  function pickDistractors(ans, pool, extra, n) {
    const seen = new Set([ans.snd]), out = [];
    [App.shuffle(pool), App.shuffle(extra)].forEach(list => list.forEach(it => {
      if (out.length < n && !seen.has(it.snd)) { seen.add(it.snd); out.push(it); }
    }));
    return out;
  }
  function buildQuestions(q) {
    const pool = q.kana.map(h => ITEMS[h]).filter(Boolean);
    const fams = [...new Set(pool.map(i => i.fam))];
    const extra = fams.flatMap(f => FAM[f]).concat(FAM.basic);
    let order = [];
    while (order.length < q.count) order = order.concat(App.shuffle(pool));
    order = order.slice(0, q.count);
    const types = ['h2r', 'listen', 'r2k'];
    if (q.script !== 'h') types.push('pair');
    let tl = [];
    while (tl.length < q.count) tl = tl.concat(types);
    tl = App.shuffle(tl.slice(0, q.count));
    return order.map((it, i) => {
      const s = q.script === 'both' ? (Math.random() < 0.5 ? 'h' : 'k') : q.script;
      const opts = App.shuffle([it].concat(pickDistractors(it, pool, extra, 3)));
      return { item: it, type: tl[i], s, opts };
    });
  }
  const glyph = (it, s) => s === 'k' ? it.k : it.h;
  const scriptName = s => s === 'k' ? '片假名' : '平假名';

  /* ---------------- 關卡遊玩（戰鬥模式） ---------------- */
  (function battleCSS() {
    if (document.getElementById('css-quest-battle')) return;
    const st = document.createElement('style'); st.id = 'css-quest-battle';
    st.textContent = `
.q-arena{position:relative;border-radius:20px;padding:14px 14px 10px;margin:10px 0;overflow:hidden;color:var(--text);background:linear-gradient(180deg,var(--sky,var(--sc-sky)) 0 62%,var(--grd,var(--sc-ground)) 62% 100%)}
.q-fighters,.q-vs{position:relative;z-index:1}
.q-arena.boss{--sky:var(--pri-t);--grd:color-mix(in srgb,var(--pri) 24%,var(--card))}
.q-arena.ch2{--sky:color-mix(in srgb,var(--n4) 10%,var(--card));--grd:color-mix(in srgb,var(--n4) 22%,var(--card))}
.q-arena.ch3{--sky:color-mix(in srgb,var(--gold) 12%,var(--card));--grd:color-mix(in srgb,var(--gold) 30%,var(--card))}
.q-arena.ch4{--sky:var(--pri-t);--grd:color-mix(in srgb,var(--pri) 20%,var(--card))}
.q-fighters{display:flex;justify-content:space-between;align-items:flex-end;min-height:120px}
.q-f{text-align:center;width:46%}
.q-f .q-sp{font-size:4em;line-height:1;display:inline-block}
.q-f.q-heroF .q-sp{animation:float 2.4s ease-in-out infinite}
.q-f.mon .q-sp{animation:qidle 1.6s ease-in-out infinite}
.q-arena.boss .q-f.mon .q-sp{font-size:5.2em}
.q-f .q-nm{font-weight:800;font-size:.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q-hp{height:8px;background:var(--shade2);border-radius:4px;overflow:hidden;margin:4px auto 0;max-width:150px}
.q-hp div{height:100%;background:var(--pri);border-radius:4px;transition:width .35s}
.q-hpn{font-size:.72em;font-weight:700;color:var(--muted)}
.q-hearts{font-size:1.2em;letter-spacing:1px}
.q-f.mon.hit .q-sp{animation:qhit .4s}
.q-f.mon.atk .q-sp{animation:qatk .45s}
.q-f.q-heroF.hurt .q-sp{animation:qhurt .45s}
.q-f.mon.dead .q-sp{animation:qdead .8s forwards}
@keyframes qidle{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-4px) scaleY(1.04)}}
@keyframes qhit{0%{transform:none;filter:none}30%{transform:translateX(12px) rotate(8deg);filter:brightness(2)}100%{transform:none}}
@keyframes qatk{0%{transform:none}40%{transform:translateX(-60%) scale(1.2)}100%{transform:none}}
@keyframes qhurt{0%,100%{transform:none}30%{transform:translateX(-10px) rotate(-10deg)}60%{transform:translateX(6px)}}
@keyframes qdead{0%{transform:none;opacity:1}100%{transform:translateY(20px) scale(.2) rotate(90deg);opacity:0}}
.q-vs{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-weight:800;font-size:1.2em;color:var(--muted)}
.q-combo{position:absolute;z-index:2;left:50%;bottom:8px;transform:translateX(-50%);background:var(--pri);color:var(--on-pri);font-weight:800;border-radius:999px;padding:0 12px;animation:pop .25s}
.q-intro{position:absolute;z-index:3;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.3em;font-weight:800;color:var(--on-pri);background:color-mix(in srgb,var(--pri) 88%,transparent);pointer-events:none;transition:opacity .4s;text-align:center;padding:10px}
/* 地圖節點：圓形＋簡單連線；完成＝主色、目前＝白底主色框、未開放＝淺灰 */
.q-path{position:relative;padding:10px 0 20px}
.q-nd{position:absolute;top:0;width:110px;text-align:center;cursor:pointer;transform:translateX(-50%)}
.q-circ{width:68px;height:68px;margin:auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.9em;background:var(--chip);border:none;box-shadow:none;transition:transform .1s;position:relative}
.q-nd:active .q-circ{transform:scale(.92)}
.q-nd.cl .q-circ{background:var(--pri);box-shadow:0 4px 12px color-mix(in srgb,var(--pri) 35%,transparent)}
.q-nd.open .q-circ{background:var(--card);box-shadow:0 0 0 3px var(--pri),var(--shadow)}
.q-nd.lock .q-circ{background:var(--chip);filter:grayscale(1);opacity:.7}
.q-nd.lock .q-circ::after{content:"🔒";position:absolute;right:-4px;bottom:-4px;font-size:.5em}
.q-nd.boss .q-circ{width:84px;height:84px;font-size:2.5em}
.q-nd.boss.open .q-circ{box-shadow:0 0 0 3px var(--gold),var(--shadow)}
.q-nd.cur .q-circ{animation:qbob 1s ease-in-out infinite}
.q-nd.cur .q-circ::before{content:"";position:absolute;inset:-8px;border-radius:50%;border:3px solid var(--pri);animation:qpulse2 1.4s infinite}
.q-nd .q-lbl{font-size:.78em;font-weight:700;margin-top:6px;line-height:1.25;color:var(--text);display:inline-block}
.q-nd .q-s{color:var(--gold);font-size:.82em;letter-spacing:1px;line-height:1;margin-top:4px}
.q-nd .q-me{position:absolute;top:-30px;left:50%;transform:translateX(-50%);font-size:1.7em;animation:float 1.6s ease-in-out infinite;z-index:2}
.q-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
@keyframes qbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes qpulse2{0%{transform:scale(.9);opacity:1}100%{transform:scale(1.3);opacity:0}}
@media(max-width:640px){.q-f .q-sp{font-size:3.2em}.q-arena.boss .q-f.mon .q-sp{font-size:4.2em}.q-fighters{min-height:100px}}
`;
    document.head.appendChild(st);
  })();

  let keyHandler = null;
  document.addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

  const MONSTERS = {
    1: [['🐸', '假名蛙'], ['🐌', '慢吞吞蝸牛'], ['🐛', '毛毛蟲'], ['🦔', '刺刺蝟'], ['🐍', '草叢蛇'], ['🦉', '夜貓頭鷹'], ['🍄', '毒菇怪'], ['🐺', '森林狼']],
    2: [['👻', '城堡幽靈'], ['🦇', '吸血蝙蝠'], ['🗿', '石像守衛'], ['🤡', '搗蛋小丑'], ['🧟', '片假名殭屍'], ['🐀', '地下鼠']],
    3: [['🦂', '沙漠蠍'], ['🐊', '谷底鱷'], ['🦖', '濁音暴龍'], ['🐲', '拗音小龍']],
    4: [['👺', '天狗']]
  };
  function monsterOf(q) {
    if (q.boss) return [q.icon, q.title.replace(/^BOSS：/, '')];
    const list = MONSTERS[q.chapter] || MONSTERS[1];
    const idx = Q.filter(x => x.chapter === q.chapter && x.type === 'kana' && !x.boss).indexOf(q);
    return list[Math.max(0, idx) % list.length];
  }
  const G_ = () => window.Game || { sfx() { }, vibrate() { }, floatText() { }, burst() { }, confetti() { }, fly(a, b, t, cb) { cb && cb(); }, avatar: () => '🧳' };

  function renderQuest(el, params) { { const host = el; el = document.createElement('div'); host.appendChild(el); }
    keyHandler = null;
    const q = byId(params.id);
    const stageP = q ? { id: 'ch' + q.chapter } : null;
    const backR = 'stage';
    if (!q) { el.innerHTML = `<div class="panel center"><h2>😵 找不到關卡</h2><button class="btn primary" id="qBack">回冒險地圖</button></div>`; el.querySelector('#qBack').onclick = () => App.go('practice-map'); return; }
    if (!params.free && !isUnlocked(q.id)) {
      el.innerHTML = `<div class="panel center"><div style="font-size:3em">🔒</div><h2>${App.esc(q.title)}</h2><ul style="text-align:left;display:inline-block">${lockReason(q).map(s => `<li>${s}</li>`).join('')}</ul><br><button class="btn primary" id="qBack">回冒險地圖</button></div>`;
      el.querySelector('#qBack').onclick = () => App.go('practice-map'); return;
    }
    if (q.type === 'scene') { el.innerHTML = `<div class="panel center muted">前往場景中…</div>`; setTimeout(() => play(q.id), 0); return; }

    const HP = q.count;
    const G = { qs: buildQuestions(Object.assign({}, q, { count: q.count + 2 })), i: 0, hearts: 3, hp: HP, correct: 0, combo: 0, maxCombo: 0, wrong: new Map(), answered: false, done: 0 };
    const [mIcon, mName] = monsterOf(q);
    const hero = G_().avatar ? G_().avatar() : '🧳';
    el.innerHTML = `<div class="q-play">
      <div class="q-hud2">
        <button class="btn sm" id="qExit">✕</button>
        <div class="q-tt">${q.icon} ${App.esc(q.title)}</div>
      </div>
      <div class="q-arena ${q.boss ? 'boss' : 'ch' + q.chapter}" id="qArena">
        <div class="q-fighters">
          <div class="q-f q-heroF" id="qHero"><div class="q-sp">${hero}</div><div class="q-nm">你</div><div class="q-hearts" id="qHearts"></div></div>
          <div class="q-f mon" id="qMon"><div class="q-sp">${mIcon}</div><div class="q-nm">${App.esc(mName)}</div>
            <div class="q-hp"><div id="qHp" style="width:100%"></div></div><div class="q-hpn" id="qHpn"></div></div>
        </div>
        <div class="q-vs">VS</div>
        <div id="qCombo"></div>
        <div class="q-intro">${q.boss ? '⚠️ BOSS 出現了！<br>' : ''}野生的 ${App.esc(mName)} 出現了！<br><small>答對就能攻擊！</small></div>
      </div>
      <div class="panel" id="qCard" style="margin-top:6px"></div>
    </div>`;
    const $ = s => el.querySelector(s);
    $('#qExit').onclick = () => App.modal('<h2>要逃跑嗎？</h2><p>這一關的進度不會保存。</p>', [{ label: '繼續戰鬥', cls: 'primary' }, { label: '🏃 逃跑', onClick: () => stageP ? App.go('stage', stageP) : App.go('practice-map') }]);
    const hearts = () => { $('#qHearts').textContent = '❤️'.repeat(G.hearts) + '🖤'.repeat(3 - G.hearts); };
    const hpBar = () => { $('#qHp').style.width = (G.hp / HP * 100) + '%'; $('#qHpn').textContent = `HP ${G.hp} / ${HP}`; };
    hearts(); hpBar();
    setTimeout(() => { const t = $('.q-intro'); if (t) { t.style.opacity = '0'; setTimeout(() => t.remove(), 450); } }, 1100);
    const anim = (sel, cls) => { const e = $(sel); e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); setTimeout(() => e.classList.remove(cls), 500); };

    function show() {
      const Qn = G.qs[G.i], it = Qn.item;
      G.answered = false;
      let ask = '', prompt = '';
      if (Qn.type === 'h2r') { ask = `這個${scriptName(Qn.s)}怎麼念？`; prompt = `<div class="q-big jp">${glyph(it, Qn.s)}</div>`; }
      else if (Qn.type === 'listen') { ask = `仔細聽，是哪一個${scriptName(Qn.s)}？`; prompt = `<button class="q-snd" id="qSnd" title="再聽一次">🔊</button>`; }
      else if (Qn.type === 'r2k') { ask = `「${App.esc(it.r)}」的${scriptName(Qn.s)}是哪一個？`; prompt = `<div class="q-roma">${App.esc(it.r)}</div>`; }
      else { const o = Qn.s === 'k' ? 'h' : 'k'; ask = `這個${scriptName(Qn.s)}對應哪一個${scriptName(o)}？`; prompt = `<div class="q-big jp">${glyph(it, Qn.s)}</div>`; }
      const label = o => {
        if (Qn.type === 'h2r') return App.esc(o.r);
        if (Qn.type === 'pair') return glyph(o, Qn.s === 'k' ? 'h' : 'k');
        return glyph(o, Qn.s);
      };
      $('#qCard').innerHTML = `<div class="q-ask">${ask}</div>${prompt}
        <div class="choices">${Qn.opts.map((o, j) => `<button class="choice${Qn.type === 'h2r' ? '' : ' jp'}" data-j="${j}"><span class="q-key">${j + 1}</span>${label(o)}</button>`).join('')}</div>
        <div class="feedback" id="qFb"></div>`;
      const say = () => App.speak(it.h);
      if (Qn.type === 'listen') { $('#qSnd').onclick = say; setTimeout(say, G.i === 0 ? 1300 : 250); }
      el.querySelectorAll('.choice').forEach(b => b.onclick = () => answer(+b.dataset.j));
    }

    function answer(j) {
      if (G.answered) return;
      G.answered = true;
      const Qn = G.qs[G.i], it = Qn.item, ok = Qn.opts[j] === it;
      G.done++;
      el.querySelectorAll('.choice').forEach((b, k) => {
        b.disabled = true;
        if (Qn.opts[k] === it) b.classList.add('ok');
        else if (k === j) b.classList.add('ng');
      });
      const g = G_();
      if (ok) {
        G.correct++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
        if (Qn.type !== 'listen') App.speak(it.h);
        const dmg = 1, combo = G.combo;
        G.hp = Math.max(0, G.hp - dmg);
        const left = G.hp;
        g.fly($('#qHero .q-sp'), $('#qMon .q-sp'), glyph(it, Qn.s), () => {
          if (!el.isConnected) return;
          hpBar(); anim('#qMon', 'hit'); g.sfx('hit');
          g.floatText($('#qMon .q-sp'), combo >= 3 ? `-${dmg} 💥` : `-${dmg}`, true);
          if (left <= 0) { $('#qMon').classList.add('dead'); g.burst($('#qMon .q-sp'), 30); }
        });
      } else {
        G.combo = 0; G.hearts--;
        G.wrong.set(it.h, App.kanaItem(it.raw));
        ((w) => Learn.record(w.id, 0, { src: 'quest', item: w }))(App.kanaItem(it.raw));
        anim('#qMon', 'atk');
        setTimeout(() => { anim('#qHero', 'hurt'); hearts(); g.sfx('hurt'); }, 220);
        App.speak(it.h);
      }
      $('#qCombo').innerHTML = G.combo >= 2 ? `<span class="q-combo">🔥 ${G.combo} 連擊</span>` : '';
      if (ok && G.combo >= 3 && G.combo % 3 === 0) { App.toast(`🔥 ${G.combo} 連擊！`, 'ok'); g.sfx('combo'); }
      const willWin = ok && G.hp <= 0;
      const last = G.hearts <= 0 || willWin || G.i + 1 >= G.qs.length;
      const tid = 'kana:' + it.h;
      const assoc = [it.ah ? `平假名 ${it.h}：${App.esc(it.ah)}` : '', it.ak ? `片假名 ${it.k}：${App.esc(it.ak)}` : ''].filter(Boolean).map(s => `<div>💡 ${s}</div>`).join('');
      $('#qFb').innerHTML = `<div class="q-fb ${ok ? 'ok' : 'ng'}">
        <div class="q-fh">${ok ? (willWin ? '🏆 最後一擊！' : pickOne(['⭕ 命中！', '⭕ 漂亮！', '⭕ 正確！'])) : '❌ 被反擊了！記住它：'}</div>
        <div><span class="q-fk jp">${it.h}・${it.k}</span> 念 <b>${App.esc(it.r)}</b>　諧音「${App.esc(it.hint)}」 ${it.emoji}</div>
        ${ok ? '' : assoc}
        <div class="q-fr">${App.trackBtn(App.kanaItem(it.raw))} <button class="btn sm ghost speak" id="qRe">🔊</button>
          <button class="btn primary" id="qNext">${last ? '查看結果 ➜' : '下一題 ➜'}</button></div>
      </div>`;
      $('#qRe').onclick = () => App.speak(it.h);
      $('#qNext').onclick = () => { if (last) finish(); else { G.i++; show(); } };
      setTimeout(() => { const n = $('#qNext'); if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50);
      if (ok && G.hearts > 0 && !willWin) {
        // 答對自動前進，節奏更像遊戲（仍可手動按）
        const myI = G.i; setTimeout(() => { if (G.i === myI && G.answered && el.isConnected && !document.querySelector('.modal-bg')) $('#qNext') && $('#qNext').click(); }, 1100);
      }
      if (willWin) setTimeout(() => { if (el.isConnected && !document.querySelector('.modal-bg') && $('#qNext')) finish(); }, 1200);
    }

    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      keyHandler = null;
      const wrong = [...G.wrong.values()];
      const nq = Q[Q.indexOf(q) + 1];
      if (G.hearts <= 0 || G.hp > 0) {
        App.completeQuest(q.id, 0, q.xp);
        App.showResult({
          title: `💀 被 ${mName} 打敗了…再挑戰一次！`, stars: 0, correct: G.correct, total: G.done, gained: 0, wrong,
          retry: () => App.go('quest', { id: q.id, free: true }), back: { label: '🗺️ 關卡地圖', route: 'stage', params: stageP }
        });
        return;
      }
      const stars = G.hearts;   // 剩幾顆心＝幾顆星
      const r = App.completeQuest(q.id, stars, q.xp);
      let next = { label: '🗺️ 關卡地圖', route: 'stage', params: stageP };
      if (nq && nq.type === 'kana' && nq.chapter === q.chapter) next = { label: '下一關 ➜', route: 'quest', params: { id: nq.id, free: true } };
      App.showResult({
        title: (q.boss ? `🏆 擊敗 BOSS ${mName}！` : `🎉 打倒 ${mName}！`) + (G.maxCombo >= 3 ? `（最高 ${G.maxCombo} 連擊）` : ''),
        stars, correct: G.correct, total: G.done, gained: r.gained, wrong,
        retry: () => App.go('quest', { id: q.id, free: true }),
        back: next.route === 'stage' ? null : { label: '🗺️ 地圖', route: 'stage', params: stageP },
        next
      });
    }

    keyHandler = e => {
      if (!el.isConnected || !$('#qCard')) { keyHandler = null; return; }
      if (document.querySelector('.modal-bg')) return;
      if (!G.answered && /^[1-4]$/.test(e.key)) { const b = el.querySelector(`.choice[data-j="${+e.key - 1}"]`); if (b) b.click(); }
      else if (G.answered && (e.key === 'Enter' || e.key === ' ')) { const n = $('#qNext'); if (n) { e.preventDefault(); n.click(); } }
    };
    show();
  }
  const pickOne = a => a[Math.random() * a.length | 0];

  App.register('map', { title: '冒險地圖', icon: '🗺️', nav: false, transient: true, render() { App.go('play'); } });
  App.register('quest', { title: '關卡', icon: '⚔️', nav: false, render: renderQuest });
})();
