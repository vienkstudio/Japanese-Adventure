(function () {
  'use strict';
  const { levels, stops } = TravelData;
  const esc = App.esc;
  const width = 5;
  const layout = [
    'water', 'stop', 'road', 'stop', 'trees',
    'water', 'trees', 'road', 'road', 'trees',
    'park', 'road', 'road', 'road', 'stop',
    'trees', 'road', 'road', 'trees', 'trees',
    'stop', 'road', 'road', 'stop', 'trees',
    'trees', 'road', 'road', 'road', 'stop',
    'stop', 'road', 'trees', 'road', 'park',
    'trees', 'stop', 'road', 'stop', 'water'
  ];
  const directions = {
    up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0]
  };
  const stopAt = tile => stops.find(stop => stop.tile === tile);
  const canWalk = tile => layout[tile] === 'road' || layout[tile] === 'stop';
  const selectedLevel = () => levels.find(level => level.id === App.state.trip?.level);
  const startTile = 2;
  const tagOf = level => level.tag || level.id;
  const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  // 分級狀況題本身的星數
  const evStars = (level, run, stop) => (run.stars && run.stars[stop.id]) || ((run.scores[stop.id] || 0) >= stop.events[level.id].length ? 3 : 0);
  // 站內流程：依到店時間線排列的原版互動小遊戲，最後是這個程度的狀況題
  function hubSteps(level, run, stop) {
    const P = window.PracticeAPI;
    const games = P && P.stageNodes ? P.stageNodes(stop.id).filter(n => /:m\d+$/.test(n.key)).map(n => {
      const i = +n.key.split(':m')[1], key = `${n.key}@${level.id}`;
      return { key, icon: n.icon, name: n.name, sub: n.sub, stars: P.sitStars(key), go: () => App.go('menu', { id: stop.id, m: i, lv: level.id, trip: 1 }) };
    }) : [];
    return games.concat([{ key: 'ev', icon: '🗣️', name: `${level.id} 狀況題`, sub: `💬 ${level.label}`, stars: evStars(level, run, stop), go: () => App.go('trip-event') }]);
  }
  function stopStars(level, run, stop) {
    const st = hubSteps(level, run, stop).map(s => s.stars);
    return st.every(x => x > 0) ? Math.min(...st) : 0;
  }
  const stopProgress = (level, run, stop) => { const st = hubSteps(level, run, stop); return [st.filter(s => s.stars > 0).length, st.length]; };

  function neighbor(tile, direction) {
    const [dx, dy] = directions[direction];
    const x = tile % width + dx, y = Math.floor(tile / width) + dy;
    return x >= 0 && x < width && y >= 0 && y < layout.length / width ? y * width + x : -1;
  }

  function routeBetween(start, target) {
    const queue = [[start, []]], seen = new Set([start]);
    for (const [tile, path] of queue) {
      if (tile === target) return path;
      for (const direction of Object.keys(directions)) {
        const next = neighbor(tile, direction);
        if (!canWalk(next) || seen.has(next)) continue;
        seen.add(next);
        queue.push([next, [...path, next]]);
      }
    }
    return [];
  }

  function tripRun(level) {
    const run = App.state.trip?.runs?.[level.id];
    const tile = run?.tile;
    return { tile: Number.isInteger(tile) && canWalk(tile) ? tile : startTile, scores: { ...run?.scores }, stars: { ...run?.stars } };
  }

  function saveRun(level, run, save = true) {
    App.state.trip.runs[level.id] = run;
    if (save) App.save();
  }

  function chooseLevel(level) {
    App.state.trip = { ...App.state.trip, level: level.id, runs: App.state.trip?.runs || {} };
    App.save();
    App.go('play');
  }

  function renderMap(el, level) {
    const run = tripRun(level);
    const cleared = stop => stopStars(level, run, stop) > 0;
    const count = stops.filter(cleared).length;
    const avatar = window.Game?.avatar();
    const scenery = { trees: '🌳', park: '🌸', water: '' };
    const tileHTML = (type, tile) => {
      const stop = stopAt(tile);
      if (!canWalk(tile)) {
        return `<div class="trip-tile trip-${type}" aria-hidden="true">${scenery[type]}</div>`;
      }
      const arms = Object.keys(directions).filter(d => canWalk(neighbor(tile, d)))
        .map(d => `<span class="trip-arm trip-arm-${d}"></span>`).join('');
      const building = stop ? `<button type="button" class="trip-stop trip-stop-${stop.id}" data-tile="${tile}" title="${esc(stop.jp)}">
        <span aria-hidden="true">${stop.icon}</span><strong>${esc(stop.name)}</strong>${cleared(stop) ? `<small aria-label="已通過">${stopStars(level, run, stop)}★</small>` : stopProgress(level, run, stop)[0] ? `<small class="trip-prog">${stopProgress(level, run, stop).join('/')}</small>` : ''}</button>` : '';
      return `<div class="trip-tile trip-path"><div class="trip-lane" aria-hidden="true">${arms}</div>${building}</div>`;
    };
    el.innerHTML = `
      <section class="trip-shell">
        <div class="trip-map" style="--rows:${layout.length / width}" tabindex="0" aria-label="東京地圖。點店家就會走過去。">
          ${layout.map(tileHTML).join('')}
          <div class="trip-player" aria-hidden="true"><span>${esc(avatar && avatar !== '🧳' ? avatar : '🚶')}</span></div>
        </div>
        <p class="trip-location trip-go" role="status"></p>
        <p class="trip-count">完成 ${count}／${stops.length} 站</p>
      </section>`;
    const shell = el.querySelector('.trip-shell');
    const map = shell.querySelector('.trip-map');
    const marker = shell.querySelector('.trip-player');
    const status = shell.querySelector('.trip-location');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let moving = false;
    function paintPlayer() {
      marker.style.setProperty('--tile-x', run.tile % width);
      marker.style.setProperty('--tile-y', Math.floor(run.tile / width));
    }
    function paintControls() {
      const stop = stopAt(run.tile);
      status.textContent = stop ? `${stop.day ? `${stop.day}・${stop.area}　` : ''}抵達 ${stop.name}${cleared(stop) ? `　${starStr(stopStars(level, run, stop))}` : ''}` : '👆 點店家，旅人就會走過去開始';
      map.querySelectorAll('[data-tile]').forEach(button => {
        if (+button.dataset.tile === run.tile) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }
    function enterStop() {
      const stop = stopAt(run.tile);
      if (moving || !stop) return;
      HUB.stop = null; App.go('trip-stop');
    }
    async function walk(path) {
      if (moving || !path.length) return;
      moving = true;
      status.textContent = '移動中';
      for (const tile of path) {
        if (!shell.isConnected) return;
        run.tile = tile;
        paintPlayer();
        if (!motion.matches) await new Promise(resolve => setTimeout(resolve, 160));
      }
      if (!shell.isConnected) return;
      moving = false;
      saveRun(level, run);
      paintControls();
    }
    function step(direction) {
      const next = neighbor(run.tile, direction);
      if (!canWalk(next)) {
        if (!moving) status.textContent = '這邊走不通，換個方向';
        return;
      }
      walk([next]);
    }
    const arrowKeys = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' };
    shell.onkeydown = event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = arrowKeys[event.key];
      if (direction) {
        event.preventDefault();
        step(direction);
      } else if (event.key === 'Enter' && event.target === map) {
        event.preventDefault();
        enterStop();
      }
    };
    map.querySelectorAll('[data-tile]').forEach(button => {
      button.onclick = () => {
        const target = +button.dataset.tile;
        if (target === run.tile) enterStop();
        else walk(routeBetween(run.tile, target)).then(() => { if (run.tile === target) enterStop(); });
      };
    });
    paintPlayer();
    paintControls();
    if (matchMedia('(pointer: fine)').matches) map.focus({ preventScroll: true });
  }

  /* ---------- 入門・五十音：閃卡／隨機選／講義／50音表 ---------- */
  const KSET = [['h', '平假名'], ['k', '片假名'], ['d', '濁音・半濁音'], ['y', '拗音']];
  const KUI = { set: 'h', ok: 0, n: 0, streak: 0 };
  function kanaPool(set) {
    if (set === 'h' || set === 'k') return KANA.map(r => ({ g: set === 'h' ? r[0] : r[1], h: r[0], r: r[2], hint: r[3], memo: set === 'h' ? r[5] : r[6], raw: r }));
    return (set === 'd' ? DAKU : YOON).flatMap(r => [{ g: r[0], h: r[0], r: r[2], hint: r[3] }, { g: r[1], h: r[0], r: r[2], hint: r[3] }]);
  }
  const kanaTrack = it => it.raw ? App.kanaItem(it.raw) : { id: 'kana:' + it.h, jp: it.g, kana: it.h, romaji: it.r, zh: '讀音 ' + it.r + '（諧音：' + it.hint + '）', source: '五十音' };
  function renderKana(el) {
    const pool = kanaPool(KUI.set);
    el.innerHTML = `<section class="trip-shell trip-kana">
      <div class="tabs kn-sets">${KSET.map(([k, n]) => `<button data-set="${k}" class="${KUI.set === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div id="kn-body"></div>
      <p class="kn-links"><a href="日文講義.html">📖 講義</a>・<a href="50音訓練表.html">🎯 50音表</a></p>
    </section>`;
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { KUI.set = b.dataset.set; renderKana(el); });
    const body = el.querySelector('#kn-body');
    const ask = () => {
      const it = pool[Math.random() * pool.length | 0];
      const opts = App.shuffle([it.r].concat(App.sample([...new Set(pool.map(x => x.r))].filter(r => r !== it.r), 3)));
      body.innerHTML = `<p class="kn-score">${KUI.n ? `答對 ${KUI.ok}／${KUI.n}` : '這個怎麼念？點字可以聽'}${KUI.streak >= 3 ? `　🔥${KUI.streak}` : ''}</p>
        <button class="kn-q jp" type="button">${esc(it.g)}</button><p class="kn-ans"></p>
        <div class="choices">${opts.map(o => `<button class="choice" type="button">${esc(o)}</button>`).join('')}</div>`;
      body.querySelector('.kn-q').onclick = () => App.speak(it.h);
      let done = false;
      body.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        if (done) return; done = true;
        const ok = b.textContent === it.r;
        KUI.n++; if (ok) { KUI.ok++; KUI.streak++; } else { KUI.streak = 0; Tracker.add(kanaTrack(it), true); }
        body.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (x.textContent === it.r) x.classList.add('ok'); });
        if (!ok) b.classList.add('ng');
        body.querySelector('.kn-ans').textContent = `${it.r}・諧音「${it.hint}」`;
        App.speak(it.h);
        setTimeout(() => { if (body.isConnected) ask(); }, ok ? 900 : 1800);
      });
    };
    ask();
  }

  /* ---------- 遊玩畫面：目前難度的內容（入門＝出題；N5～N1＝地圖） ---------- */
  function renderPlay(el) {
    const level = selectedLevel() || levels[0];
    el.innerHTML = `<button class="trip-lvnow" type="button">${esc(tagOf(level))}・${esc(level.label)} <span>切換難度 ▾</span></button><div id="trip-body"></div>`;
    el.querySelector('.trip-lvnow').onclick = () => pickLevel();
    const body = el.querySelector('#trip-body');
    if (level.kana) renderKana(body); else renderMap(body, level);
  }

  /* ---------- 首頁主選單：繼續／新開始／設定 ---------- */
  const LOGO = () => (document.querySelector('#top .logo .lg') || {}).innerHTML || '';
  const hasSave = () => !!(App.state.trip && App.state.trip.level && selectedLevel());
  function progressText() {
    const level = selectedLevel(); if (!level) return '';
    if (level.kana) return `${tagOf(level)}・${level.label}`;
    const run = tripRun(level);
    return `${tagOf(level)}・${level.label}　完成 ${stops.filter(st => stopStars(level, run, st) > 0).length}／${stops.length} 站`;
  }
  function renderTitle(el) {
    el.innerHTML = `<section class="tt">
      <div class="tt-logo">${LOGO()}</div>
      <h1 class="tt-name">日語冒險</h1>
      <p class="tt-sub">邊旅行邊學日文</p>
      <div class="tt-menu">
        ${hasSave() ? `<button class="tt-btn primary" id="tt-cont" type="button">▶ 繼續<small>${esc(progressText())}</small></button>` : ''}
        <button class="tt-btn${hasSave() ? '' : ' primary'}" id="tt-new" type="button">✨ 新開始</button>
        <button class="tt-btn" id="tt-set" type="button">⚙️ 設定</button>
      </div>
    </section>`;
    const c = el.querySelector('#tt-cont'); if (c) c.onclick = () => App.go('play');
    el.querySelector('#tt-new').onclick = newGame;
    el.querySelector('#tt-set').onclick = openSettings;
  }
  const levelBtns = cur => `<div class="tt-levels">${levels.map(l => `<button type="button" data-lv="${l.id}" class="${cur && cur.id === l.id ? 'on' : ''}"><b>${esc(tagOf(l))}</b><small>${esc(l.label)}</small></button>`).join('')}</div>`;
  function newGame() {
    App.modal(`<h2>✨ 新開始</h2><p class="muted">選一個難度開始${hasSave() ? '（目前的存檔進度會清除）' : ''}</p>${levelBtns(null)}`, [{ label: '取消' }]);
    document.querySelectorAll('.modal [data-lv]').forEach(b => b.onclick = () => {
      if (hasSave() && !confirmNew()) return;
      App.resetAll();
      App.state.trip = { level: b.dataset.lv, runs: {} }; App.save();
      document.querySelectorAll('.modal-bg').forEach(m => m.remove());
      App.go('play');
    });
  }
  let confirmed = false;
  function confirmNew() {   // 第二次點才真的清除（避免誤觸）
    if (confirmed) return true;
    confirmed = true; App.toast('⚠️ 再點一次確定清除存檔、重新開始'); setTimeout(() => { confirmed = false; }, 3000);
    return false;
  }
  function pickLevel() {
    App.modal(`<h2>切換難度</h2><p class="muted">各難度的進度分開保存</p>${levelBtns(selectedLevel())}`, [{ label: '關閉' }]);
    document.querySelectorAll('.modal [data-lv]').forEach(b => b.onclick = () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); chooseLevel(levels.find(l => l.id === b.dataset.lv)); });
  }
  function openSettings() {
    const G = window.Game;
    App.modal(`<h2>⚙️ 設定</h2>
      <p class="tt-lbl">難度</p>${levelBtns(selectedLevel())}
      <div class="tt-rows">
        ${G ? `<button class="tt-row" id="st-sfx" type="button">${G.sfxOn() ? '🔊 音效：開' : '🔇 音效：關'}</button>` : ''}
        <button class="tt-row" id="st-bk" type="button">💾 備份／還原存檔</button>
        <button class="tt-row" id="st-clear" type="button">🗑️ 清除全部進度</button>
      </div>`, [{ label: '完成', cls: 'primary' }]);
    const q = s => document.querySelector('.modal ' + s);
    document.querySelectorAll('.modal [data-lv]').forEach(b => b.onclick = () => {
      document.querySelectorAll('.modal [data-lv]').forEach(x => x.classList.toggle('on', x === b));
      App.state.trip = Object.assign({ runs: {} }, App.state.trip, { level: b.dataset.lv }); App.save();
      App.toast(`難度改為 ${tagOf(levels.find(l => l.id === b.dataset.lv))}`);
    });
    const sf = q('#st-sfx'); if (sf) sf.onclick = () => { G.toggleSfx(); sf.textContent = G.sfxOn() ? '🔊 音效：開' : '🔇 音效：關'; };
    q('#st-bk').onclick = () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); window.PracticeAPI && PracticeAPI.backup(); };
    q('#st-clear').onclick = () => { if (!confirmNew()) return; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); App.resetAll(); };
  }

  function renderEncounter(el) {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop) { App.go('play'); return; }
    const events = stop.events[level.id];
    const G = window.Game || { sfx() { }, floatText() { }, burst() { }, shake() { } };
    let at = 0, correct = 0, hearts = 3, combo = 0, best = 0, wrongItems = [];

    function makeHeader() {
      return `<div class="trip-map-header"><div><p class="trip-eyebrow">${esc(tagOf(level))}・${esc(level.label)}</p>
        <h1>${stop.icon} ${esc(stop.name)}</h1></div>
        <div class="trip-hud"><span class="trip-hearts">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="trip-combo">🔥${combo}</span>` : ''}</div>
        <button class="trip-secondary" type="button" id="trip-back">返回地圖</button></div>`;
    }

    function begin(rendered) {
      el.innerHTML = `<section class="trip-shell trip-event">${makeHeader()}${rendered}</section>`;
      el.querySelector('#trip-back').onclick = () => App.go('play');
    }

    function finish() {
      const n = events.length;
      const stars = correct === n ? 3 : correct * 2 >= n ? 2 : 0;
      const passed = stars > 0;
      const prevStars = stopStars(level, run, stop);
      if (correct > (run.scores[stop.id] || 0)) run.scores[stop.id] = correct;
      if (!run.stars) run.stars = {};
      let gained = 0;
      if (stars > prevStars) {
        run.stars[stop.id] = stars;
        if (!prevStars) App.noteClear();
        gained = [0, 10, 15, 20][stars] + (stars === 3 ? 10 : 0) - (prevStars ? [0, 10, 15, 20][prevStars] : 0);
      }
      saveRun(level, run);
      if (gained > 0) App.addXP(gained, `${stop.name}・${level.id}`);
      const hasGame = window.TownAPI && TownAPI.findScene(stop.id);
      App.showResult({
        title: passed ? `${stop.icon} ${stop.name} 通過！` + (best >= 2 ? `（最高 ${best} 連擊）` : '') : '再試一次挑戰本站',
        stars, correct, total: n, gained: Math.max(0, gained), wrong: wrongItems,
        retry: () => { at = 0; correct = 0; hearts = 3; combo = 0; best = 0; wrongItems = []; showQuestion(true); },
        back: { label: '🗺️ 回地圖', route: 'play' },
        next: { label: '下一關 ➜', route: 'trip-stop' }
      });
      begin(`<div class="trip-result">
        <p class="trip-eyebrow">${correct}／${events.length} 題答對</p>
        <h2 tabindex="-1" id="trip-summary">${passed ? '本站通過！' : '再試一次挑戰本站'} ${starStr(stars)}</h2>
        <button type="button" class="trip-primary" id="trip-return">返回地圖</button>
        ${hasGame ? '<button type="button" class="trip-secondary" id="trip-scene">🎮 在這站練點餐・對話小遊戲</button>' : ''}
        <button type="button" class="trip-secondary" id="trip-retry">重玩本站</button>
      </div>`);
      el.querySelector('#trip-return').onclick = () => App.go('trip-stop');
      el.querySelector('#trip-scene')?.addEventListener('click', () => App.go('trip-stop'));
      el.querySelector('#trip-retry').onclick = () => { at = 0; correct = 0; hearts = 3; combo = 0; best = 0; wrongItems = []; showQuestion(true); };
    }

    function showQuestion(focus) {
      const [scene, prompt, translation, answers, explanation, reading] = events[at];
      const choices = App.shuffle(answers);
      const advanced = !reading;
      begin(`<p class="trip-step">情境 ${at + 1}／${events.length}</p>
        <div class="trip-dialog">
          <h2 id="trip-scenario" tabindex="-1"${advanced ? ' lang="ja"' : ''}>${esc(scene)}</h2>
          <div class="trip-line">
            <span>${esc(stop.npc)}</span>
            <p class="jp" lang="ja">${esc(prompt)}</p>
            <button class="trip-secondary" type="button" id="trip-listen">聽日文</button>
          </div>
          <details class="trip-hint"${level.id === 'N5' ? ' open' : ''}>
            <summary>${reading ? '讀音與提示譯文' : '查看提示譯文'}</summary>
            ${reading && reading !== prompt ? `<span class="jp" lang="ja">${esc(reading)}</span>` : ''}
            <p>${esc(translation)}</p>
          </details>
        </div>
        <div class="trip-choices" role="group" aria-label="選擇回應">
          ${choices.map((choice, index) => `<button type="button" class="trip-answer jp" lang="ja" data-answer="${index}">${esc(choice)}</button>`).join('')}
        </div>
        <div class="trip-feedback" tabindex="-1"></div>
        <button type="button" class="trip-primary trip-next" hidden>
          ${at + 1 === events.length ? '查看結果' : '繼續對話'}
        </button>`);
      if (focus) el.querySelector('#trip-scenario').focus();
      el.querySelector('#trip-listen').onclick = () => App.speak(reading || prompt);
      const buttons = el.querySelectorAll('[data-answer]');
      const next = el.querySelector('.trip-next');
      const feedback = el.querySelector('.trip-feedback');
      buttons.forEach(button => button.onclick = () => {
        const right = choices[+button.dataset.answer] === answers[0];
        buttons.forEach(b => {
          b.disabled = true;
          if (choices[+b.dataset.answer] === answers[0]) b.classList.add('trip-right');
        });
        if (right) {
          correct++; combo++; best = Math.max(best, combo);
          G.sfx(combo >= 3 ? 'combo' : 'ok'); G.floatText(button, combo >= 2 ? `+1 🔥${combo}` : '+1'); G.burst(button, 12);
        } else {
          hearts = Math.max(0, hearts - 1); combo = 0;
          button.classList.add('trip-wrong');
          G.sfx('hurt'); G.shake(); G.floatText(button, '💔', true);
          const it = App.wordItem({ jp: answers[0], zh: scene, hint: explanation }, stop.name, 'phrase');
          Tracker.add(it, true); wrongItems.push(it);
        }
        const hud = el.querySelector('.trip-hud');
        if (hud) hud.innerHTML = `<span class="trip-hearts">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="trip-combo">🔥${combo}</span>` : ''}`;
        feedback.classList.add(right ? 'trip-right-note' : 'trip-wrong-note');
        feedback.innerHTML = `<strong>${right ? '回應正確' : '這樣回應更合適'}</strong><p>${esc(explanation)}</p>`;
        next.hidden = false;
        feedback.focus();
      });
      next.onclick = () => { if (++at < events.length) showQuestion(true); else finish(); };
    }

    showQuestion(true);
  }

  App.register('trip-event', { title: '旅遊情境', icon: '💬', nav: false, render: renderEncounter });

  /* ---------- 站內流程（Hub） ---------- */
  const HUB = { stop: null, i: -1 };
  function enterHub(stopId, steps) {   // 從第一個還沒過的關卡開始；全過了就從頭重玩
    const first = steps.findIndex(x => !x.stars);
    HUB.stop = stopId; HUB.i = (first < 0 ? 0 : first) - 1;
  }
  function renderStopHub() {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop || level.kana) { App.go('play'); return; }
    const steps = hubSteps(level, run, stop);
    if (HUB.stop !== stop.id) enterHub(stop.id, steps);
    HUB.i++;
    if (HUB.i >= steps.length) { HUB.stop = null; App.toast(stopStars(level, run, stop) ? `🎉 ${stop.name} 完成！` : `${stop.name} 還有關卡沒過，再進去挑戰`); App.go('play'); return; }
    App.toast(`${stop.icon} ${stop.name}　${HUB.i + 1}／${steps.length}：${steps[HUB.i].name}`);
    steps[HUB.i].go();
  }
  App.register('trip-stop', { title: '站內流程', icon: '📍', nav: false, render: renderStopHub });
  App.register('play', { title: '遊玩', icon: '🗾', nav: false, render: renderPlay });
  window.Travel = { renderTitle, renderPlay, openSettings };
})();
