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
    App.go('home');
  }

  function renderLevels(el, current) {
    el.innerHTML = `
      <section class="trip-shell trip-select" aria-labelledby="trip-title">
        <div class="trip-welcome">
          <span class="trip-stamp" aria-hidden="true">東京</span>
          <p class="trip-eyebrow">日語冒險</p>
          <h1 id="trip-title">東京旅程</h1>
          <p>控制旅人走到店家和車站，用日文處理旅途中的各種狀況。</p>
        </div>
        <div class="trip-intro">
          <h2>選擇日文程度</h2>
          <p>參考 JLPT 難度，可隨時切換。各程度分開保存進度。</p>
        </div>
        <div class="trip-levels">${levels.map((level, i) => (i === 0 ? '<p class="trip-group">🔰 從零開始（還不會五十音選這裡）</p>' : level.id === 'N5' ? '<p class="trip-group">🗾 會假名之後</p>' : '') + `
          <button class="trip-level" type="button" data-level="${level.id}">
            <span class="trip-level-id">${esc(tagOf(level))}</span>
            <span><strong>${esc(level.label)}</strong><small>${esc(level.detail)}</small></span>
            <span class="trip-level-arrow" aria-hidden="true">→</span>
          </button>`).join('')}</div>
        <div class="trip-links">
          <button class="trip-link" type="button" id="trip-practice">🎮 所有場景小遊戲</button>
          ${current ? '<button class="trip-link" type="button" id="trip-cancel-level">返回地圖</button>' : ''}
        </div>
      </section>`;
    el.querySelectorAll('[data-level]').forEach(button => {
      button.onclick = () => chooseLevel(levels.find(level => level.id === button.dataset.level));
    });
    el.querySelector('#trip-practice').onclick = () => App.go('practice-map');
    el.querySelector('#trip-cancel-level')?.addEventListener('click', () => App.go('home'));
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
      <section class="trip-shell" aria-labelledby="trip-map-title">
        <div class="trip-map-header">
          <div><p class="trip-eyebrow">${esc(tagOf(level))}・${esc(level.label)}</p><h1 id="trip-map-title">東京旅程</h1></div>
          <button class="trip-secondary" type="button" id="trip-change">切換程度</button>
        </div>
        <div class="trip-map" style="--rows:${layout.length / width}" tabindex="0" aria-label="東京地圖。使用方向鍵移動，抵達地點後按 Enter 進入。" aria-keyshortcuts="ArrowUp ArrowLeft ArrowDown ArrowRight Enter">
          ${layout.map(tileHTML).join('')}
          <div class="trip-player" aria-hidden="true"><span>${esc(avatar && avatar !== '🧳' ? avatar : '🚶')}</span></div>
        </div>
        <div class="trip-map-controls">
          <div class="trip-dpad" role="group" aria-label="移動旅人">
            <button type="button" data-direction="up" aria-label="向上">↑</button>
            <button type="button" data-direction="left" aria-label="向左">←</button>
            <button type="button" data-direction="down" aria-label="向下">↓</button>
            <button type="button" data-direction="right" aria-label="向右">→</button>
          </div>
          <div class="trip-action">
            <p class="trip-location" role="status"></p>
            <button class="trip-primary" id="trip-enter" type="button">進入地點</button>
          </div>
        </div>
        <p class="trip-route">🗓️ 照朋友的 9 天行程走：${['airport', 'station', 'hotel', 'konbini', 'shrine', 'drugstore', 'yakiniku', 'ramen', 'izakaya'].map(id => stops.find(s => s.id === id)).filter(Boolean).map(s => `<span class="${cleared(s) ? 'ok' : ''}">${s.icon}</span>`).join('→')}</p>
        <div class="trip-links">
          <span>旅程進度 ${count}／${stops.length} 站</span>
          <button class="trip-link" type="button" id="trip-practice">🎮 場景小遊戲</button>
        </div>
      </section>`;
    const shell = el.querySelector('.trip-shell');
    const map = shell.querySelector('.trip-map');
    const marker = shell.querySelector('.trip-player');
    const enter = shell.querySelector('#trip-enter');
    const status = shell.querySelector('.trip-location');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let moving = false;
    function paintPlayer() {
      marker.style.setProperty('--tile-x', run.tile % width);
      marker.style.setProperty('--tile-y', Math.floor(run.tile / width));
    }
    function paintControls() {
      const stop = stopAt(run.tile);
      status.textContent = stop ? `${stop.day ? `${stop.day}・${stop.area}　` : ''}抵達 ${stop.name}${cleared(stop) ? `　${starStr(stopStars(level, run, stop))}` : ''}` : '點地點自動走，或用方向鍵移動';
      enter.textContent = stop && cleared(stop) ? '再玩一次' : '進入地點';
      enter.disabled = !stop;
      map.querySelectorAll('[data-tile]').forEach(button => {
        if (+button.dataset.tile === run.tile) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }
    function enterStop() {
      const stop = stopAt(run.tile);
      if (moving || !stop) return;
      App.go('trip-stop');
    }
    async function walk(path) {
      if (moving || !path.length) return;
      moving = true;
      enter.disabled = true;
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
        else walk(routeBetween(run.tile, target));
      };
    });
    shell.querySelectorAll('[data-direction]').forEach(button => {
      button.onclick = () => step(button.dataset.direction);
    });
    enter.onclick = enterStop;
    shell.querySelector('#trip-change').onclick = () => App.go('home', { choose: true });
    shell.querySelector('#trip-practice').onclick = () => App.go('practice-map');
    paintPlayer();
    paintControls();
    if (matchMedia('(pointer: fine)').matches) map.focus({ preventScroll: true });
  }

  /* ---------- 入門・五十音：閃卡／隨機選／講義／50音表 ---------- */
  const KSET = [['h', '平假名'], ['k', '片假名'], ['d', '濁音・半濁音'], ['y', '拗音']];
  const KUI = { set: 'h', mode: 'flash', ok: 0, n: 0, streak: 0 };
  function kanaPool(set) {
    if (set === 'h' || set === 'k') return KANA.map(r => ({ g: set === 'h' ? r[0] : r[1], h: r[0], r: r[2], hint: r[3], memo: set === 'h' ? r[5] : r[6], raw: r }));
    return (set === 'd' ? DAKU : YOON).flatMap(r => [{ g: r[0], h: r[0], r: r[2], hint: r[3] }, { g: r[1], h: r[0], r: r[2], hint: r[3] }]);
  }
  const kanaTrack = it => it.raw ? App.kanaItem(it.raw) : { id: 'kana:' + it.h, jp: it.g, kana: it.h, romaji: it.r, zh: '讀音 ' + it.r + '（諧音：' + it.hint + '）', source: '五十音' };
  function renderKana(el, level) {
    el.innerHTML = `<section class="trip-shell trip-kana">
      <div class="trip-map-header"><div><p class="trip-eyebrow">${esc(tagOf(level))}・${esc(level.label)}</p><h1>五十音</h1></div>
        <button class="trip-secondary" type="button" id="trip-change">切換程度</button></div>
      <div class="kn-links"><a class="kn-tile" href="日文講義.html">📖<b>講義</b><small>圖解＋諧音</small></a><a class="kn-tile" href="50音訓練表.html">🎯<b>50音表</b><small>總表・書寫</small></a></div>
      <div class="tabs kn-sets">${KSET.map(([k, n]) => `<button data-set="${k}" class="${KUI.set === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="tabs kn-modes"><button data-mode="flash" class="${KUI.mode === 'flash' ? 'on' : ''}">🃏 閃卡</button><button data-mode="pick" class="${KUI.mode === 'pick' ? 'on' : ''}">✅ 隨機選</button></div>
      <div id="kn-body"></div>
    </section>`;
    el.querySelector('#trip-change').onclick = () => App.go('home', { choose: true });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { KUI.set = b.dataset.set; renderKana(el, level); });
    el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { KUI.mode = b.dataset.mode; renderKana(el, level); });
    const body = el.querySelector('#kn-body'), pool = kanaPool(KUI.set);
    const pickOne = () => pool[Math.random() * pool.length | 0];
    if (KUI.mode === 'flash') {
      const card = () => {
        const it = pickOne();
        body.innerHTML = `<button class="kn-card" type="button"><span class="kn-g jp">${esc(it.g)}</span><span class="kn-back"><b>${esc(it.r)}</b><small>諧音「${esc(it.hint)}」</small>${it.memo ? `<small>${esc(it.memo)}</small>` : ''}</span><em>點一下翻面</em></button>
          <div class="kn-row"><button class="btn" type="button" id="kn-no">😵 不會</button><button class="btn primary" type="button" id="kn-yes">😊 會了</button></div>`;
        const c = body.querySelector('.kn-card');
        c.onclick = () => { c.classList.add('flip'); App.speak(it.h); };
        body.querySelector('#kn-no').onclick = () => { Tracker.add(kanaTrack(it), true); App.toast(`📌 ${it.g} 已加入不會清單`); card(); };
        body.querySelector('#kn-yes').onclick = card;
      };
      card();
    } else {
      const ask = () => {
        const it = pickOne(), opts = App.shuffle([it.r].concat(App.sample([...new Set(pool.map(x => x.r))].filter(r => r !== it.r), 3)));
        body.innerHTML = `<p class="kn-score">答對 ${KUI.ok} / ${KUI.n}${KUI.streak >= 3 ? `　🔥${KUI.streak} 連對` : ''}</p>
          <div class="kn-q jp">${esc(it.g)}</div><div class="choices">${opts.map(o => `<button class="choice" type="button">${esc(o)}</button>`).join('')}</div>`;
        let done = false;
        body.querySelectorAll('.choice').forEach(b => b.onclick = () => {
          if (done) return; done = true;
          const ok = b.textContent === it.r;
          KUI.n++; if (ok) { KUI.ok++; KUI.streak++; } else { KUI.streak = 0; Tracker.add(kanaTrack(it), true); }
          body.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (x.textContent === it.r) x.classList.add('ok'); });
          if (!ok) b.classList.add('ng');
          App.speak(it.h);
          setTimeout(() => { if (body.isConnected) ask(); }, ok ? 700 : 1500);
        });
      };
      ask();
    }
  }

  function renderHome(el, params = {}) {
    const level = selectedLevel();
    if (level && level.kana && !params.choose) renderKana(el, level);
    else if (level && !params.choose) renderMap(el, level);
    else renderLevels(el, level);
  }

  function renderEncounter(el) {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop) { App.go('home'); return; }
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
      el.querySelector('#trip-back').onclick = () => App.go('trip-stop');
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
        back: { label: '🗺️ 回地圖', route: 'home' },
        next: { label: '📍 回站內流程', route: 'trip-stop' }
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
  function renderStopHub(el) {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop) { App.go('home'); return; }
    const steps = hubSteps(level, run, stop);
    const cur = steps.find(s => !s.stars);
    const [done, total] = stopProgress(level, run, stop);
    el.innerHTML = `<section class="trip-shell trip-hub">
      <div class="trip-map-header"><div><p class="trip-eyebrow">${esc(tagOf(level))}・${esc(level.label)}</p>
        <h1>${stop.icon} ${esc(stop.name)}</h1></div>
        <button class="trip-secondary" type="button" id="hub-back">返回地圖</button></div>
      ${stop.story ? `<p class="trip-story">📅 ${esc(stop.day)}・${esc(stop.area)}｜${esc(stop.story)}</p>` : ''}
      <p class="trip-hub-sub">照實際到店的順序一關一關玩。全部過關，這站就完成！　<b>${done}／${total}</b></p>
      <ol class="trip-steps">${steps.map((s, i) => `<li class="trip-stepc${s.stars ? ' ok' : ''}${cur === s ? ' cur' : ''}" data-i="${i}">
        <span class="trip-sn">${s.stars ? '✓' : i + 1}</span><span class="trip-si">${esc(s.icon)}</span>
        <span class="trip-st"><b>${esc(s.name)}</b><small>${esc(s.sub)}</small></span>
        <span class="trip-ss">${starStr(s.stars)}</span></li>`).join('')}</ol>
      ${cur ? `<button class="trip-primary" type="button" id="hub-go">▶ ${esc(cur.name)}</button>` : `<p class="trip-hub-done">🎉 這站全部過關！${starStr(stopStars(level, run, stop))}</p>`}
    </section>`;
    el.querySelector('#hub-back').onclick = () => App.go('home');
    el.querySelectorAll('[data-i]').forEach(li => li.onclick = () => steps[+li.dataset.i].go());
    const g = el.querySelector('#hub-go'); if (g) g.onclick = () => cur.go();
  }
  App.register('trip-stop', { title: '站內流程', icon: '📍', nav: false, render: renderStopHub });
  window.Travel = { renderHome };
})();
