/* =========================================================
   日語冒險 — 自由練習 practice.js
   路由：practice（nav：🎯 練習）
     分頁「🧭 現在要去哪？」：選目的地 → 細分情境（互動菜單／各段對話／口說／單字／句子）
     分頁「🎚️ 自選等級」：先選等級＋類別＋模式，直接開打（不受地圖解鎖限制）
     分頁「🎴 分級字卡」：單字／會話句／形容詞／片語／諺語，JLPT 參考分級底線，自評難度可儲存
   路由：menu（互動菜單小遊戲，params {id}）
   依賴：App、Tracker、QuestAPI（quest.js）、TownAPI（town.js，render 時才取用）、MENUS、CARDS
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  (function css() {
    if (document.getElementById('css-practice')) return;
    const st = document.createElement('style'); st.id = 'css-practice';
    st.textContent = `
.p-hero{position:relative;overflow:hidden;border-radius:14px;border:2px solid var(--ink);padding:16px;color:#f5eedc;margin-bottom:10px;
  background-color:var(--ai);background-image:radial-gradient(circle at calc(100% - 30px) 28px,var(--shu) 0 18px,transparent 19px),var(--sgd);background-size:auto,40px 20px;box-shadow:inset 0 0 0 3px var(--ai),inset 0 0 0 4.5px var(--kin),var(--shadow)}
.p-hero h2{margin:0;color:#fff;font-size:1.35em}
.p-hero .muted{color:rgba(245,238,220,.85);font-size:.88em}
.p-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2px solid var(--ink);border-radius:10px;overflow:hidden;margin:10px 0;box-shadow:0 3px 0 var(--ink)}
.p-seg button{border:none;border-right:2px solid var(--ink);background:var(--card);padding:9px 2px;font-family:var(--serif);font-weight:900;font-size:.92em;cursor:pointer;color:var(--ink)}
.p-seg button:last-child{border-right:none}
.p-seg button.on{background:var(--shu);color:#fff}
.p-dest{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.p-d{text-align:center;padding:10px 4px 8px;cursor:pointer}
.p-d .icon{font-size:2em}
.p-d b{display:block;font-size:.85em;font-family:var(--serif);line-height:1.3;margin-top:2px}
.p-d small{color:var(--muted);font-size:.7em}
.p-sit{display:flex;flex-direction:column;gap:8px;text-align:left;margin-top:10px}
.p-sit .btn{justify-content:flex-start;text-align:left;margin:0;width:100%}
.p-sit .btn small{margin-left:auto;font-weight:normal;opacity:.8}
.p-step{display:flex;align-items:center;gap:8px;margin:16px 0 8px;font-family:var(--serif);font-weight:900;color:var(--ai)}
.p-step i{font-style:normal;width:26px;height:26px;border-radius:50%;background:var(--shu);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:.85em;flex:none}
.p-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.p-o{padding:10px;cursor:pointer;min-height:64px}
.p-o b{font-family:var(--serif);color:var(--ai);display:block}
.p-o small{color:var(--muted);font-size:.78em;line-height:1.3;display:block}
.p-o .icon{font-size:1.5em;float:right;margin-left:4px}
.p-o.on{background:var(--ai);border-color:var(--ink)}
.p-o.on b,.p-o.on small{color:#f5eedc}
.p-go{position:sticky;bottom:calc(var(--navH) + var(--safeB) + 8px);z-index:5;margin-top:14px}
@media(max-width:640px){.c-card{height:230px}.c-face .c-jp{font-size:2em}}
@media(min-width:769px){.p-go{bottom:10px}.p-dest{grid-template-columns:repeat(6,1fr)}.p-opts{grid-template-columns:repeat(3,1fr)}}
/* 菜單遊戲 */
.m-task{background:var(--soft);border:2px dashed var(--shu);border-radius:10px;padding:8px 12px;font-weight:bold}
.m-board{border:3px solid var(--ink);border-radius:10px;background:#2a1c14;padding:10px;box-shadow:inset 0 0 0 2px #6b4a2a,var(--shadow)}
.m-board h3{margin:0 0 8px;color:#f0cf73;text-align:center;font-size:1em}
.m-items{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.m-it{position:relative;background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 6px;cursor:pointer;text-align:center;font-family:inherit;color:var(--ink);box-shadow:0 3px 0 #000}
.m-it:active{transform:translateY(2px);box-shadow:0 1px 0 #000}
.m-it .e{font-size:1.5em;line-height:1}
.m-it .j{font-weight:900;font-size:1.02em;line-height:1.3}
.m-it .k{font-size:.72em;color:var(--muted)}
.m-it .z{font-size:.75em;color:var(--ai2)}
.m-it .p{font-family:var(--serif);color:var(--shu);font-weight:900;font-size:.9em}
.m-it .q{position:absolute;top:-8px;right:-6px;background:var(--shu);color:#fff;border:2px solid var(--paper);border-radius:50%;width:28px;height:28px;font-weight:900;display:flex;align-items:center;justify-content:center}
.m-it.sel{background:#fff3c4}
.m-noz .z{display:none}
.m-tray{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;min-height:30px}
/* 字卡 */
.c-card{perspective:1000px;max-width:440px;margin:8px auto;height:300px;cursor:pointer}
.c-in{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.c-card.flip .c-in{transform:rotateY(180deg)}
.c-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:2px solid var(--ink);border-radius:14px;background:var(--card);box-shadow:var(--frame),4px 5px 0 var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.c-back{transform:rotateY(180deg);background:var(--soft)}
.c-face .c-jp{font-size:2.3em;font-weight:900;line-height:1.35;word-break:break-all}
.c-face .c-top{position:absolute;top:10px;left:12px;right:12px;display:flex;justify-content:space-between;font-size:.8em;color:var(--muted)}
.c-ex{margin-top:8px;font-size:.9em;background:var(--card);border:1.5px solid var(--line);border-radius:8px;padding:6px 10px}
.c-rate{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:440px;margin:8px auto}
.c-rate .btn{margin:0;flex-direction:column;line-height:1.2;font-size:.9em}
.c-rate .btn.on{background:var(--ai);color:#f5eedc}
.c-nav{display:flex;justify-content:space-between;align-items:center;max-width:440px;margin:4px auto}
.c-stat{display:flex;gap:4px;flex-wrap:wrap;font-size:.8em}
`;
    document.head.appendChild(st);
  })();

  const arr = a => (Array.isArray(a) ? a : []);
  const scenes = () => arr(window.SCENES).filter(s => s && s.id);
  const findScene = id => scenes().find(s => s.id === id) || null;
  const starsOf = r => r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
  const lvBadge = lv => (window.CARDS ? CARDS.badge(lv) : '');
  const lvCls = lv => (lv || 'x').toLowerCase();
  const T = () => window.TownAPI || {};

  // 目的地分組
  const GROUPS = [
    ['🍜 吃喝', ['konbini', 'ramen', 'cafe', 'izakaya']],
    ['🛍️ 購物', ['drugstore', 'clothes']],
    ['🚃 交通', ['directions', 'station', 'airport']],
    ['🏨 住宿・觀光', ['hotel', 'shrine']],
    ['🚑 緊急', ['emergency']]
  ];
  // 等級
  const LEVELS = [
    { id: 'L1', name: '入門', sub: '五十音', icon: '🌱', desc: '平假名・片假名 46 音' },
    { id: 'L2', name: '初級', sub: '濁音・拗音', icon: '🌿', desc: 'が・ぱ・きゃ… 讀遍所有假名' },
    { id: 'L3', name: '中級', sub: '生活場景', icon: '🏮', desc: '便利商店、拉麵、車站、飯店…' },
    { id: 'L4', name: '高級', sub: '旅遊進階', icon: '🏯', desc: '居酒屋、神社、機場、緊急求助' }
  ];
  const UI = { tab: 'go', lv: 'L1', cat: 'h', rows: [], mode: 'mix', count: 10, deck: 'word', lvF: 'all', dF: 'all', ci: 0 };

  function catsOf(lv) {
    if (lv === 'L1') return [{ id: 'h', icon: 'あ', name: '平假名', desc: '46 個基本平假名' }, { id: 'k', icon: 'ア', name: '片假名', desc: '外來語、菜單常見' }, { id: 'hk', icon: '混', name: '平＋片 混合', desc: '兩種一起考' }];
    if (lv === 'L2') return [{ id: 'daku', icon: 'が', name: '濁音', desc: 'が・ざ・だ・ば 行' }, { id: 'handaku', icon: 'ぱ', name: '半濁音', desc: 'ぱ 行' }, { id: 'yoon', icon: 'きゃ', name: '拗音', desc: 'きゃ・しゅ・ちょ…' }, { id: 'all2', icon: '総', name: '綜合', desc: '濁音＋半濁音＋拗音' }];
    const ids = lv === 'L3' ? ['konbini', 'ramen', 'directions', 'cafe', 'station', 'drugstore', 'hotel'] : ['izakaya', 'clothes', 'shrine', 'airport', 'emergency'];
    const list = ids.map(findScene).filter(Boolean).map(s => ({ id: s.id, icon: s.icon, name: s.name, desc: s.desc }));
    return list.concat([{ id: 'ALL', icon: '🗾', name: '本級全部混合', desc: list.map(x => x.name).join('、') }]);
  }
  const MODES_SCENE = [
    { id: 'word', icon: '📚', name: '單字', desc: '日↔中、聽音選字' }, { id: 'phrase', icon: '💬', name: '句子', desc: '常用句測驗' },
    { id: 'mix', icon: '⚡', name: '綜合', desc: '單字＋句子' }, { id: 'dialog', icon: '🎭', name: '對話', desc: '跟店員一來一往' },
    { id: 'speak', icon: '🎤', name: '口說對話', desc: '用說的回答店員' }, { id: 'menu', icon: '🧾', name: '互動菜單', desc: '看菜單點餐、聽價錢' }
  ];

  /* ---------------- 路由：practice ---------------- */
  function render(el, params) {
    if (params && params.tab) { UI.tab = params.tab; delete params.tab; }
    el.innerHTML = `<div class="p-hero"><h2>🎯 自由練習</h2><div class="muted">不用照地圖順序，想練什麼就練什麼！答錯的一樣會自動加入 📌不會清單。</div></div>
      <div class="p-seg">${[['go', '🧭 現在去哪'], ['pick', '🎚️ 自選等級'], ['cards', '🎴 分級字卡']].map(([k, l]) => `<button data-tab="${k}" class="${UI.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="pBody"></div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; render(el); });
    const body = el.querySelector('#pBody');
    ({ go: goView, pick: pickView, cards: cardsView })[UI.tab](body);
  }

  /* ---- 🧭 現在要去哪？ ---- */
  function goView(body) {
    body.innerHTML = `<div class="sec-t">現在要去哪？</div><p class="muted" style="margin:0 0 4px;font-size:.88em">選一個地方，再選要練的情境（不受等級限制）</p>` +
      GROUPS.map(([g, ids]) => `<div class="sec-t" style="font-size:.95em">${g}</div><div class="p-dest">${ids.map(findScene).filter(Boolean).map(s =>
        `<div class="card click p-d" data-s="${s.id}"><div class="icon">${esc(s.icon)}</div><b>${esc(s.name)}</b><small>${arr(s.dialogues).length} 個情境</small></div>`).join('')}</div>`).join('');
    body.querySelectorAll('[data-s]').forEach(c => c.onclick = () => situations(c.dataset.s));
  }
  function situations(id) {
    const s = findScene(id); if (!s) return;
    const m = (window.MENUS || {})[id];
    const ds = arr(s.dialogues);
    const close = App.modal(`<div style="font-size:2.6em;line-height:1">${esc(s.icon)}</div><h2 style="margin:.2em 0">${esc(s.name)}</h2><div class="muted" style="font-size:.88em">${esc(s.desc || '')}</div>
      <div class="p-sit">
        ${m ? `<button class="btn primary" data-a="menu">🧾 ${esc(m.board.replace(/^\S+\s/, ''))}<small>互動</small></button>` : ''}
        ${ds.map((d, i) => `<button class="btn" data-a="dlg" data-i="${i}">🎭 ${esc(d.title || '對話 ' + (i + 1))}<small>${arr(d.steps).length} 句</small></button>`).join('')}
        <button class="btn ai" data-a="speak">🎤 口說挑戰：全部情境<small>用說的</small></button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn" data-a="word">📚 單字測驗</button><button class="btn" data-a="phrase">💬 句子測驗</button></div>
        <button class="btn ghost" data-a="scene">🏙️ 進入場景（單字卡・文化小知識）</button>
      </div>`, [{ label: '關閉' }]);
    document.querySelectorAll('.p-sit [data-a]').forEach(b => b.onclick = () => {
      close();
      const a = b.dataset.a;
      if (a === 'menu') App.go('menu', { id });
      else if (a === 'dlg') App.go('drill', { scenes: [id], kind: 'dialog', dialog: +b.dataset.i });
      else if (a === 'speak') App.go('drill', { scenes: [id], kind: 'speak', count: ds.length });
      else if (a === 'scene') App.go('scene', { id, free: true });
      else App.go('drill', { scenes: [id], kind: a, count: 10 });
    });
  }

  /* ---- 🎚️ 自選等級＋類別 ---- */
  function pickView(body) {
    const cats = catsOf(UI.lv);
    if (!cats.some(c => c.id === UI.cat)) { UI.cat = cats[0].id; UI.rows = []; }
    const isKana = UI.lv === 'L1' || UI.lv === 'L2';
    const isScene = !isKana;
    if (isScene && UI.cat === 'ALL' && UI.mode === 'menu') UI.mode = 'mix';
    const rows = (window.QuestAPI && QuestAPI.kanaSets) ? QuestAPI.kanaSets().rows : [];
    let html = `<div class="p-step"><i>1</i>選等級</div><div class="p-opts">${LEVELS.map(l => `<div class="card click p-o${UI.lv === l.id ? ' on' : ''}" data-lv="${l.id}"><span class="icon">${l.icon}</span><b>${l.name}・${l.sub}</b><small>${l.desc}</small></div>`).join('')}</div>
      <div class="p-step"><i>2</i>選類別</div><div class="p-opts">${cats.map(c => `<div class="card click p-o${UI.cat === c.id ? ' on' : ''}" data-cat="${c.id}"><span class="icon">${esc(c.icon)}</span><b>${esc(c.name)}</b><small>${esc(c.desc || '')}</small></div>`).join('')}</div>`;
    if (UI.lv === 'L1') html += `<div class="p-step"><i>＋</i>只練某幾行（可不選＝全部）</div><div class="chips">${rows.map((r, i) => `<button class="tabs-like btn sm${UI.rows.includes(i) ? ' primary' : ''}" data-row="${i}">${esc(r.name)}</button>`).join('')}</div>`;
    if (isScene) html += `<div class="p-step"><i>3</i>選練習方式</div><div class="p-opts">${MODES_SCENE.filter(m => !(m.id === 'menu' && (UI.cat === 'ALL' || !(window.MENUS || {})[UI.cat]))).map(m => `<div class="card click p-o${UI.mode === m.id ? ' on' : ''}" data-mode="${m.id}"><span class="icon">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small></div>`).join('')}</div>`;
    const showCount = isKana || ['word', 'phrase', 'mix'].includes(UI.mode);
    if (showCount) html += `<div class="p-step"><i>${isKana ? 3 : 4}</i>${isKana ? '怪物 HP（題數）' : '題數'}</div><div class="tabs">${[10, 20, 30].map(n => `<button data-n="${n}" class="${UI.count === n ? 'on' : ''}">${n} 題</button>`).join('')}</div>`;
    html += `<div class="p-go"><button class="btn primary block" id="pStart" style="font-size:1.12em;min-height:52px">⚔️ 開始練習</button></div>`;
    body.innerHTML = html;
    const re = () => pickView(body);
    body.querySelectorAll('[data-lv]').forEach(c => c.onclick = () => { UI.lv = c.dataset.lv; UI.cat = ''; UI.rows = []; re(); });
    body.querySelectorAll('[data-cat]').forEach(c => c.onclick = () => { UI.cat = c.dataset.cat; re(); });
    body.querySelectorAll('[data-row]').forEach(c => c.onclick = () => { const i = +c.dataset.row; UI.rows = UI.rows.includes(i) ? UI.rows.filter(x => x !== i) : UI.rows.concat(i); re(); });
    body.querySelectorAll('[data-mode]').forEach(c => c.onclick = () => { UI.mode = c.dataset.mode; re(); });
    body.querySelectorAll('[data-n]').forEach(c => c.onclick = () => { UI.count = +c.dataset.n; re(); });
    body.querySelector('#pStart').onclick = start;
  }
  function start() {
    const lv = UI.lv, cat = UI.cat;
    if (lv === 'L1' || lv === 'L2') {
      if (!window.QuestAPI || !QuestAPI.playCustom) return App.toast('戰鬥模組尚未載入');
      const K = QuestAPI.kanaSets();
      let kana, script, title, icon, chapter;
      if (lv === 'L1') {
        kana = UI.rows.length ? UI.rows.flatMap(i => K.rows[i].kana) : K.basic;
        script = cat === 'hk' ? 'both' : cat; chapter = cat === 'k' ? 2 : 1;
        const nm = { h: '平假名', k: '片假名', hk: '平＋片' }[cat];
        title = nm + (UI.rows.length ? '：' + UI.rows.map(i => K.rows[i].name).join('・') : '：全部'); icon = cat === 'k' ? 'ア' : 'あ';
      } else {
        kana = cat === 'all2' ? K.daku.concat(K.handaku, K.yoon) : K[cat];
        script = 'both'; chapter = 3; title = { daku: '濁音', handaku: '半濁音', yoon: '拗音', all2: '濁音・拗音綜合' }[cat]; icon = { daku: '〃', handaku: '⭕', yoon: '🔗', all2: '🦂' }[cat];
      }
      if (!kana || kana.length < 2) return App.toast('這個範圍的假名太少，請多選幾行');
      QuestAPI.playCustom({ title: '自由練習・' + title, icon, kana, script, count: UI.count, chapter, boss: UI.count >= 30 });
      return;
    }
    const ids = cat === 'ALL' ? catsOf(lv).filter(c => c.id !== 'ALL').map(c => c.id) : [cat];
    if (UI.mode === 'menu') return App.go('menu', { id: cat });
    App.go('drill', { scenes: ids, kind: UI.mode, count: ['dialog', 'speak'].includes(UI.mode) ? 3 : UI.count, title: cat === 'ALL' ? (lv === 'L3' ? '中級・生活場景綜合' : '高級・旅遊進階綜合') : '' });
  }

  /* ---- 🎴 分級字卡 ---- */
  const DECKS = [['word', '📚', '場景單字'], ['phrase', '💬', '會話句'], ['adj', '🎨', '形容詞'], ['idiom', '🧩', '片語'], ['proverb', '📜', '諺語']];
  function deckCards(k) {
    if (window.CARDS && CARDS.decks[k]) return CARDS.decks[k].cards;
    const seen = new Set(), out = [];
    scenes().forEach(s => arr(k === 'word' ? s.vocab : s.phrases).forEach(w => {
      if (!w || !w.jp || seen.has(w.jp)) return; seen.add(w.jp);
      out.push({ id: k + ':' + w.jp, kind: k, jp: w.jp, kana: w.kana, romaji: w.romaji, zh: w.zh, hint: w.hint || '', ex: w.use ? '使用時機：' + w.use : '', exzh: '', emoji: w.emoji || '', lv: window.CARDS ? CARDS.levelOf(w.jp, k) : 'x', source: s.name });
    }));
    return out;
  }
  const diffOf = id => ((App.state.cardDiff || {})[id] || 0);
  function cardsView(body) {
    const all = deckCards(UI.deck);
    const list = all.filter(c => (UI.lvF === 'all' || c.lv === UI.lvF) && (UI.dF === 'all' || diffOf(c.id) === +UI.dF));
    if (UI.ci >= list.length) UI.ci = 0;
    const cnt = lv => all.filter(c => c.lv === lv).length;
    const c = list[UI.ci];
    const LVS = ['N5', 'N4', 'N3', 'N2', 'N1', 'x'];
    body.innerHTML = `<div class="tabs">${DECKS.map(([k, i, n]) => `<button data-dk="${k}" class="${UI.deck === k ? 'on' : ''}">${i} ${n}</button>`).join('')}</div>
      <div class="tabs" style="margin-top:0"><button data-lf="all" class="${UI.lvF === 'all' ? 'on' : ''}">全部級 ${all.length}</button>${LVS.filter(cnt).map(l => `<button data-lf="${l}" class="${UI.lvF === l ? 'on' : ''}">${CARDS.LV_NAME[l]} ${cnt(l)}</button>`).join('')}</div>
      <div class="tabs" style="margin-top:0">${[['all', '全部'], ['3', '😵 困難'], ['2', '🤔 普通'], ['1', '😊 簡單'], ['0', '未評']].map(([k, n]) => `<button data-df="${k}" class="${UI.dF === k ? 'on' : ''}">${n} ${k === 'all' ? '' : all.filter(x => diffOf(x.id) === +k).length}</button>`).join('')}</div>
      ${c ? `<div class="c-card" id="cCard"><div class="c-in">
          <div class="c-face"><div class="c-top"><span>${UI.ci + 1} / ${list.length}</span>${lvBadge(c.lv)}</div>
            ${c.emoji ? `<div style="font-size:2em">${esc(c.emoji)}</div>` : ''}
            <div class="c-jp jp"><span class="lv-u ${lvCls(c.lv)}">${esc(c.jp)}</span></div>
            <div class="muted" style="margin-top:12px;font-size:.85em">👆 點卡片翻面・🔊 自動發音</div></div>
          <div class="c-face c-back"><div class="c-top"><span>${esc(c.source || '')}</span>${lvBadge(c.lv)}</div>
            ${c.kana && c.kana !== c.jp ? `<div class="jp" style="font-size:1.4em">${esc(c.kana)}</div>` : ''}
            <div class="muted">${esc(c.romaji || '')}</div>
            <div style="font-size:1.3em;font-weight:900;margin:4px 0">${esc(c.zh)}</div>
            ${c.hint ? `<div style="font-size:.85em;color:#7a4a1a">${esc(c.hint)}</div>` : ''}
            ${c.ex ? `<div class="c-ex"><span class="jp">${esc(c.ex)}</span>${c.exzh ? `<br><small class="muted">${esc(c.exzh)}</small>` : ''}</div>` : ''}
          </div></div></div>
        <div class="c-rate">${[[3, '😵', '困難'], [2, '🤔', '普通'], [1, '😊', '簡單']].map(([v, e, n]) => `<button class="btn${diffOf(c.id) === v ? ' on' : ''}" data-rate="${v}"><span style="font-size:1.4em">${e}</span>${n}</button>`).join('')}</div>
        <div class="c-nav"><button class="btn sm" id="cPrev">◀ 上一張</button>
          <span><button class="btn sm ghost" id="cSay">🔊</button><button class="track-btn${Tracker.has(c.id) ? ' on' : ''}" id="cTrack">${Tracker.has(c.id) ? '✓ 已在清單' : '＋ 不會清單'}</button></span>
          <button class="btn sm" id="cNext">下一張 ▶</button></div>`
        : `<div class="panel center muted">這個條件下沒有字卡，換個篩選吧！</div>`}
      <div class="panel" style="font-size:.82em"><div class="lv-legend">底線顏色：${LVS.map(lvBadge).join('')}</div><div class="muted" style="margin-top:6px">${esc(window.CARDS ? CARDS.NOTE : '')}</div>
        <div class="muted">自評難度會自動儲存在本機，可用上方「困難」篩選集中複習。</div></div>`;
    const re = () => cardsView(body);
    body.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { UI.deck = b.dataset.dk; UI.lvF = 'all'; UI.ci = 0; re(); });
    body.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { UI.lvF = b.dataset.lf; UI.ci = 0; re(); });
    body.querySelectorAll('[data-df]').forEach(b => b.onclick = () => { UI.dF = b.dataset.df; UI.ci = 0; re(); });
    if (!c) return;
    const say = () => App.speak(c.kana || c.jp);
    body.querySelector('#cCard').onclick = () => { const cc = body.querySelector('#cCard'); cc.classList.toggle('flip'); if (cc.classList.contains('flip')) say(); };
    body.querySelector('#cSay').onclick = say;
    body.querySelector('#cPrev').onclick = () => { UI.ci = (UI.ci - 1 + list.length) % list.length; re(); };
    body.querySelector('#cNext').onclick = () => { UI.ci = (UI.ci + 1) % list.length; re(); };
    body.querySelector('#cTrack').onclick = () => {
      if (Tracker.has(c.id)) Tracker.remove(c.id);
      else Tracker.add({ id: c.id, jp: c.jp, kana: c.kana, romaji: c.romaji, zh: c.zh, hint: c.hint, emoji: c.emoji || '', source: c.source || '字卡' });
      re();
    };
    body.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      if (!App.state.cardDiff) App.state.cardDiff = {};
      App.state.cardDiff[c.id] = +b.dataset.rate; App.save();
      App.toast(`已標記「${b.textContent.trim()}」`);
      const stillIn = UI.dF === 'all' || +UI.dF === +b.dataset.rate;
      if (stillIn) UI.ci = (UI.ci + 1) % Math.max(1, list.length);
      re();
    });
  }

  App.register('practice', { title: '練習', icon: '🎯', nav: true, render });

  /* =========================================================
     路由：menu — 互動菜單小遊戲（看菜單點 → 選/說日文 → 聽價錢或回答）
     ========================================================= */
  const CNT = {
    tsu: { jp: ['', '一つ', '二つ', '三つ'], k: ['', 'ひとつ', 'ふたつ', 'みっつ'] },
    mai: { jp: ['', '一枚', '二枚', '三枚'], k: ['', 'いちまい', 'にまい', 'さんまい'] },
    hon: { jp: ['', '一本', '二本', '三本'], k: ['', 'いっぽん', 'にほん', 'さんぼん'] }
  };
  // 日幣金額讀法（0–99999）
  function yomi(n) {
    const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
    let s = '';
    const man = Math.floor(n / 10000), sen = Math.floor(n / 1000) % 10, hy = Math.floor(n / 100) % 10, ju = Math.floor(n / 10) % 10, ic = n % 10;
    if (man) s += D[man] + 'まん';
    if (sen) s += sen === 1 ? 'せん' : sen === 3 ? 'さんぜん' : sen === 8 ? 'はっせん' : D[sen] + 'せん';
    if (hy) s += hy === 1 ? 'ひゃく' : hy === 3 ? 'さんびゃく' : hy === 6 ? 'ろっぴゃく' : hy === 8 ? 'はっぴゃく' : D[hy] + 'ひゃく';
    if (ju) s += ju === 1 ? 'じゅう' : D[ju] + 'じゅう';
    if (ic) s += ic === 4 ? 'よ' : D[ic];
    return (s || 'ぜろ') + 'えん';
  }
  const yen = n => '¥' + n.toLocaleString('en-US');
  const cOf = (m, it) => it.c || m.c || 'tsu';

  function sentence(m, tray, alt) {
    // alt: {qtyShift, swapItem, verb, kara}
    alt = alt || {};
    const t = tray.map(x => Object.assign({}, x));
    if (alt.qty != null) t[0].n = alt.qty;
    if (alt.item) t[0].it = alt.item;
    const q = (x, f) => CNT[cOf(m, x.it)][f][x.n];
    if (m.type === 'ticket') {
      const x = t[0];
      return { jp: `${x.it.jp}${alt.kara ? 'から' : 'まで'}、大人${q(x, 'jp')}ください`, kana: `${x.it.kana}${alt.kara ? 'から' : 'まで'}、おとな${q(x, 'k')}ください` };
    }
    if (m.type === 'ask') {
      const x = t[0], tail = alt.tail || 'はどこですか';
      return { jp: `すみません、${x.it.jp}${tail}`, kana: `すみません、${x.it.kana}${alt.tailK || 'はどこですか'}` };
    }
    const verb = alt.verb || (m.type === 'request' ? 'お願いします' : 'ください'), verbK = alt.verbK || (m.type === 'request' ? 'おねがいします' : 'ください');
    const pre = m.type === 'request' ? 'もう' : '';
    return {
      jp: t.map(x => `${x.it.jp}を${pre}${q(x, 'jp')}`).join('と、') + verb,
      kana: t.map(x => `${x.it.kana}を${pre}${q(x, 'k')}`).join('と、') + verbK
    };
  }
  function sayChoices(m, tray) {
    const ok = Object.assign(sentence(m, tray), { correct: true, feedback: '完全正確！' });
    const other = App.shuffle(m.items.filter(i => !tray.some(t => t.it === i)))[0];
    const out = [ok];
    if (m.type === 'ask') {
      out.push(Object.assign(sentence(m, tray, { tail: 'は何ですか', tailK: 'はなんですか' }), { feedback: '「何ですか」是問「這是什麼」，不是問在哪裡' }));
      out.push(Object.assign(sentence(m, tray, { tail: 'をください', tailK: 'をください' }), { feedback: '「ください」是「請給我」，問路要說「どこですか」' }));
      out.push(Object.assign(sentence(m, tray, { tail: 'はいくらですか', tailK: 'はいくらですか' }), { feedback: '「いくらですか」是問價錢' }));
    } else {
      const n0 = tray[0].n, wq = n0 === 1 ? 2 : n0 - 1;
      if (m.type !== 'ask') out.push(Object.assign(sentence(m, tray, { qty: wq }), { feedback: `數量不對，要的是 ${CNT[cOf(m, tray[0].it)].jp[n0]}` }));
      if (m.type === 'ticket') out.push(Object.assign(sentence(m, tray, { kara: true }), { feedback: '「から」是「從…出發」，到某地要用「まで」' }));
      else out.push(Object.assign(sentence(m, tray, { verb: 'あげます', verbK: 'あげます' }), { feedback: '「あげます」是「我給你」，買東西要說「ください」' }));
      if (other) out.push(Object.assign(sentence(m, tray, { item: other }), { feedback: `點錯品項了：${other.jp} 是「${other.zh}」` }));
    }
    return App.shuffle(out.slice(0, 4));
  }

  function renderMenu(el, params) {
    const id = (params || {}).id, m = (window.MENUS || {})[id], sc = findScene(id);
    if (!m || !sc) { el.innerHTML = `<div class="panel center"><h2>🧭 找不到這個菜單</h2><button class="btn primary" id="mB">回練習</button></div>`; el.querySelector('#mB').onclick = () => App.go('practice'); return; }
    const ROUNDS = 3;
    const S = { r: 0, pts: 0, max: 0, wrong: [], zh: false };
    el.innerHTML = `<div class="panel t-head" style="--tc:${esc(sc.color || '#c73e2e')};padding:10px 14px">
        <div class="t-icon" style="font-size:2.4em">${esc(sc.icon)}</div>
        <div class="t-info"><h2 style="font-size:1.15em">${esc(sc.name)}・互動</h2><div class="muted" style="font-size:.85em">${esc(m.board)}</div></div>
        <button class="btn sm ghost" id="mBack">↩ 練習</button></div>
      <div class="t-dbar"><b id="mRound"></b><label class="t-aidsw"><input type="checkbox" id="mZh"> 菜單顯示中文</label></div>
      <div class="bar" style="margin:6px 0"><div id="mBar" style="width:0"></div></div>
      <div class="panel" id="mPane"></div>`;
    el.querySelector('#mBack').onclick = () => App.go('practice');
    const pane = el.querySelector('#mPane');
    el.querySelector('#mZh').onchange = e => { S.zh = e.target.checked; const b = pane.querySelector('.m-board'); if (b) b.classList.toggle('m-noz', !S.zh); };
    const addWrong = it => { Tracker.add(it, true); if (!S.wrong.some(w => w.id === it.id)) S.wrong.push(it); };
    const npc = (host, jp, kana, zh) => {
      const b = document.createElement('div'); b.className = 'bubble npc';
      b.innerHTML = `<div class="who">${esc(m.npc.emoji)} ${esc(m.npc.who)}</div><div class="j jp" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span>${esc(jp)}</span><button class="speak">🔊</button></div><div class="t-aid jp">${esc(kana)}</div>${zh ? `<div class="t-aid">🀄 ${esc(zh)}</div>` : ''}`;
      b.querySelector('.speak').onclick = () => App.speak(kana || jp);
      host.appendChild(b); App.speak(kana || jp); return b;
    };

    function round() {
      if (S.r >= ROUNDS) return finish();
      el.querySelector('#mRound').textContent = `第 ${S.r + 1} / ${ROUNDS} 回合`;
      el.querySelector('#mBar').style.width = (S.r / ROUNDS * 100) + '%';
      // 產生任務
      const nItems = m.type === 'order' && S.r > 0 ? 2 : 1;
      const task = App.sample(m.items, nItems).map(it => ({ it, n: m.type === 'ask' ? 1 : 1 + (Math.random() * (m.type === 'request' ? 2 : 3) | 0) }));
      const qty = {};
      const taskTxt = task.map(t => `<b>${esc(t.it.zh)}</b>${m.type === 'ask' ? '' : ' × ' + t.n}`).join('、');
      const verbZh = { order: '點／買', ticket: '買車票到', ask: '問路去', request: '跟櫃台要' }[m.type];
      pane.innerHTML = `<div class="m-task">🎯 任務：${verbZh} ${taskTxt}</div>
        <div class="chat" id="mChat"></div>
        <div class="m-board${S.zh ? '' : ' m-noz'}"><h3>${esc(m.board)}</h3><div class="m-items">${m.items.map((it, i) => `<button class="m-it" data-i="${i}">
          <div class="e">${esc(it.emoji || '')}</div><div class="j jp">${esc(it.jp)}</div>${it.kana !== it.jp ? `<div class="k jp">${esc(it.kana)}</div>` : ''}<div class="z">${esc(it.zh)}</div>
          ${it.price ? `<div class="p">${yen(it.price)}</div>` : ''}<span class="q" style="display:none"></span></button>`).join('')}</div></div>
        <div class="m-tray" id="mTray"></div>
        <div class="feedback" id="mFb"></div>
        <button class="btn primary block" id="mOk">✅ 選好了</button>`;
      npc(pane.querySelector('#mChat'), m.greet.jp, m.greet.kana, m.greet.zh);
      const tray = pane.querySelector('#mTray');
      const paint = () => {
        pane.querySelectorAll('.m-it').forEach(b => { const n = qty[b.dataset.i] || 0, q = b.querySelector('.q'); q.style.display = n ? '' : 'none'; q.textContent = n; b.classList.toggle('sel', !!n); });
        const sel = Object.keys(qty).filter(k => qty[k]);
        tray.innerHTML = sel.length ? '🧺 ' + sel.map(k => `<span class="chip jp">${esc(m.items[k].jp)}${m.type === 'ask' ? '' : ' ×' + qty[k]}</span>`).join('') : '<span class="muted">👆 點菜單上的日文來選（再點可加數量）</span>';
      };
      pane.querySelectorAll('.m-it').forEach(b => b.onclick = () => {
        const i = b.dataset.i;
        if (m.type === 'ask' || m.type === 'ticket') { Object.keys(qty).forEach(k => { if (k !== i) qty[k] = 0; }); }
        const max = m.type === 'ask' ? 1 : 3;
        qty[i] = ((qty[i] || 0) + 1) % (max + 1);
        App.speak(m.items[i].kana || m.items[i].jp); paint();
      });
      paint();
      let tries = 0;
      pane.querySelector('#mOk').onclick = () => {
        const sel = Object.keys(qty).filter(k => qty[k]).map(k => ({ it: m.items[k], n: qty[k] }));
        const ok = sel.length === task.length && task.every(t => sel.some(s => s.it === t.it && s.n === t.n));
        const fb = pane.querySelector('#mFb');
        if (!ok) {
          tries++;
          task.forEach(t => { if (!sel.some(s => s.it === t.it && s.n === t.n)) addWrong(App.wordItem(t.it, sc.name, 'word')); });
          pane.querySelectorAll('.m-it').forEach(b => { if (task.some(t => t.it === m.items[b.dataset.i])) { b.classList.add('choice', 'ng'); setTimeout(() => b.classList.remove('choice', 'ng'), 50); } });
          fb.innerHTML = `<span class="t-fb-ng">❌ 不太對</span> ${tries >= 2 ? '提示：' + task.map(t => `<span class="jp">${esc(t.it.jp)}</span>（${esc(t.it.zh)}）${m.type === 'ask' ? '' : '×' + t.n}`).join('、') : '再看看菜單上的日文，數量也要對喔！'}`;
          return;
        }
        S.max++; if (!tries) S.pts++;
        say(task);
      };
    }
    // 第二步：選／說出要講的日文
    function say(task) {
      const cs = sayChoices(m, task);
      pane.querySelector('.m-board').remove(); pane.querySelector('#mTray').remove(); pane.querySelector('#mOk').remove();
      const fb = pane.querySelector('#mFb'); fb.innerHTML = '';
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">要怎麼跟${esc(m.npc.who)}說？</div><div class="t-micbox"></div><div class="choices t-opts"></div>`;
      pane.insertBefore(box, fb);
      const opBox = box.querySelector('.t-opts');
      let missed = false, done = false;
      cs.forEach(c => {
        const b = document.createElement('button'); b.className = 'choice';
        b.innerHTML = `<span class="jp">${esc(c.jp)}</span><span class="t-aid jp" style="display:block">${esc(c.kana)}</span>`;
        c._btn = b;
        b.onclick = () => {
          if (done || b.disabled) return;
          if (c.correct) {
            done = true; b.classList.add('ok'); opBox.querySelectorAll('.choice').forEach(x => x.disabled = true);
            fb.innerHTML = `<span class="t-fb-ok">⭕ ${missed ? '答對了！' : '一次就對！'}</span>`;
            const me = document.createElement('div'); me.className = 'bubble me';
            me.innerHTML = `<div class="who">🧳 我</div><div class="j jp">${esc(c.jp)}</div>`;
            pane.querySelector('#mChat').appendChild(me); App.speak(c.kana);
            S.max++; if (!missed) S.pts++;
            setTimeout(() => answer(task), 900);
          } else {
            b.classList.add('ng'); b.disabled = true;
            fb.innerHTML = `<span class="t-fb-ng">❌</span> ${esc(c.feedback)}`;
            if (!missed) { missed = true; const r = cs.find(x => x.correct); addWrong(App.wordItem({ jp: r.jp, kana: r.kana, zh: '在' + sc.name + '：' + task.map(t => t.it.zh + (m.type === 'ask' ? '' : '×' + t.n)).join('、'), hint: '互動菜單' }, sc.name, 'phrase')); }
          }
        };
        opBox.appendChild(b);
      });
      // 口說
      const TA = T(), micBox = box.querySelector('.t-micbox');
      micBox.innerHTML = `<div class="t-mic"><button class="t-micbtn"${TA.hasSR ? '' : ' disabled'}>🎤</button><div style="text-align:left;font-size:.85em">可以直接用日文說出來<br><span class="muted">或點選下方句子</span></div></div><div class="t-heard muted">${TA.hasSR ? '' : esc(TA.micErr ? TA.micErr('unsupported') : '')}</div>`;
      const mb = micBox.querySelector('.t-micbtn'), heard = micBox.querySelector('.t-heard');
      mb.onclick = () => {
        if (done || !TA.listenJP || mb.classList.contains('on')) return;
        mb.classList.add('on'); heard.textContent = '🎙️ 聆聽中…';
        TA.listenJP(alts => {
          mb.classList.remove('on');
          const { best, score } = TA.bestMatch(alts, cs.filter(c => !c._btn.disabled));
          heard.innerHTML = `聽到：「<span class="jp">${esc(alts[0] || '')}</span>」${best ? `（${Math.round(score * 100)}%）` : ''}`;
          if (best && score >= 0.5) best._btn.click(); else heard.innerHTML += '<br><b style="color:var(--shu)">沒對上，再說一次或直接點選</b>';
        }, code => { mb.classList.remove('on'); heard.textContent = TA.micErr(code); });
      };
    }
    // 第三步：聽對方回答（價錢 or 回應）
    function answer(task) {
      const fb = pane.querySelector('#mFb');
      pane.querySelectorAll('.sec-t,.t-micbox,.t-opts').forEach(x => x.remove()); fb.innerHTML = '';
      const chat = pane.querySelector('#mChat');
      let line, opts, right;
      if (m.type === 'order' || m.type === 'ticket') {
        const total = task.reduce((s, t) => s + (t.it.price || 0) * t.n, 0);
        line = { jp: `全部で${total.toLocaleString('ja-JP')}円です。`, kana: `ぜんぶで${yomi(total)}です` };
        const set = new Set([total]);
        [100, -100, 1000, 10, -10, 200, 500].forEach(d => { if (set.size < 4 && total + d > 0) set.add(total + d); });
        right = yen(total); opts = App.shuffle([...set].map(yen));
      } else {
        const rep = App.sample(m.replies, 1)[0];
        line = rep;
        right = rep.zh; opts = App.shuffle([rep.zh].concat(App.sample(m.replies.filter(r => r !== rep).map(r => r.zh), 3)));
      }
      const bub = npc(chat, line.jp, line.kana, '');
      bub.classList.add('t-listen-b');
      bub.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = 'blur(7px)');
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">🎧 ${m.type === 'order' || m.type === 'ticket' ? '總共多少錢？' : esc(m.npc.who) + '說了什麼？'}</div>
        <div class="center"><button class="btn sm" id="mRe">🔊 再聽一次</button></div><div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}" style="font-size:1.05em">${esc(o)}</button>`).join('')}</div>`;
      pane.insertBefore(box, fb);
      box.querySelector('#mRe').onclick = () => App.speak(line.kana);
      box.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.k] === right;
        box.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (opts[+x.dataset.k] === right) x.classList.add('ok'); });
        bub.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = '');
        S.max++;
        if (ok) { S.pts++; fb.innerHTML = '<span class="t-fb-ok">⭕ 聽懂了！</span>'; }
        else { b.classList.add('ng'); fb.innerHTML = `<span class="t-fb-ng">❌ 答案是 ${esc(right)}</span>`; addWrong(App.wordItem({ jp: line.jp, kana: line.kana, zh: m.type === 'order' || m.type === 'ticket' ? '總共 ' + right : right, hint: '聽力：' + sc.name }, sc.name, 'phrase')); }
        fb.innerHTML += `<div class="jp muted">${esc(line.jp)}（${esc(line.kana)}）</div><button class="btn primary" id="mNx">${S.r + 1 >= ROUNDS ? '看結果 🏁' : '下一位客人 ➜'}</button>`;
        fb.querySelector('#mNx').onclick = () => { S.r++; round(); };
      });
    }
    function finish() {
      el.querySelector('#mBar').style.width = '100%';
      const stars = starsOf(S.max ? S.pts / S.max : 0);
      const r = S.pts ? App.addXP(S.pts * 2, '互動菜單') : { gained: 0 };
      if (!App.state.sceneDone) App.state.sceneDone = {};
      App.state.sceneDone[id] = true; App.save();
      pane.innerHTML = `<div class="t-sum"><div class="t-big">${stars ? '🎉' : '💪'}</div><h3>營業結束！</h3><p>一次答對 ${S.pts} / ${S.max}</p>
        <button class="btn" id="mAg">🔄 再來一輪</button><button class="btn primary" id="mPr">🎯 練習選單</button></div>`;
      pane.querySelector('#mAg').onclick = () => App.go('menu', { id });
      pane.querySelector('#mPr').onclick = () => App.go('practice');
      App.showResult({ title: stars ? `${sc.name} 互動完成！` : '再練一輪吧！', stars, correct: S.pts, total: S.max, gained: r.gained, wrong: S.wrong, retry: () => App.go('menu', { id }), back: { label: '🎯 練習選單', route: 'practice' } });
    }
    round();
  }
  App.register('menu', { title: '互動菜單', icon: '🧾', nav: false, render: renderMenu });
  window.PracticeAPI = { situations, yomi };
})();
