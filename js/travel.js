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
    return { tile: Number.isInteger(tile) && canWalk(tile) ? tile : startTile, scores: { ...run?.scores } };
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
        <div class="trip-levels">${levels.map(level => `
          <button class="trip-level" type="button" data-level="${level.id}">
            <span class="trip-level-id">${level.id}</span>
            <span><strong>${esc(level.label)}</strong><small>${esc(level.detail)}</small></span>
            <span class="trip-level-arrow" aria-hidden="true">→</span>
          </button>`).join('')}</div>
        <div class="trip-links">
          <button class="trip-link" type="button" id="trip-practice">零基礎・五十音與原版練習</button>
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
    const cleared = stop => (run.scores[stop.id] || 0) === stop.events[level.id].length;
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
        <span aria-hidden="true">${stop.icon}</span><strong>${esc(stop.name)}</strong>${cleared(stop) ? '<small aria-label="已通過">✓</small>' : ''}</button>` : '';
      return `<div class="trip-tile trip-path"><div class="trip-lane" aria-hidden="true">${arms}</div>${building}</div>`;
    };
    el.innerHTML = `
      <section class="trip-shell" aria-labelledby="trip-map-title">
        <div class="trip-map-header">
          <div><p class="trip-eyebrow">${level.id}・${esc(level.label)}</p><h1 id="trip-map-title">東京旅程</h1></div>
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
        <div class="trip-links">
          <span>旅程進度 ${count}／${stops.length} 站</span>
          <button class="trip-link" type="button" id="trip-practice">原版練習</button>
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
      status.textContent = stop ? `抵達 ${stop.name}` : '點地點自動走，或用方向鍵移動';
      enter.textContent = stop && cleared(stop) ? '再玩一次' : '進入地點';
      enter.disabled = !stop;
      map.querySelectorAll('[data-tile]').forEach(button => {
        if (+button.dataset.tile === run.tile) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }
    function enterStop() {
      if (!moving && stopAt(run.tile)) App.go('trip-event');
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

  function renderHome(el, params = {}) {
    const level = selectedLevel();
    if (level && !params.choose) renderMap(el, level);
    else renderLevels(el, level);
  }

  function renderEncounter(el) {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop) { App.go('home'); return; }
    const events = stop.events[level.id];
    let at = 0, correct = 0;

    function makeHeader() {
      return `<div class="trip-map-header"><div><p class="trip-eyebrow">${level.id}・${esc(level.label)}</p>
        <h1>${stop.icon} ${esc(stop.name)}</h1></div>
        <button class="trip-secondary" type="button" id="trip-back">返回地圖</button></div>`;
    }

    function begin(rendered) {
      el.innerHTML = `<section class="trip-shell trip-event">${makeHeader()}${rendered}</section>`;
      el.querySelector('#trip-back').onclick = () => App.go('home');
    }

    function finish() {
      const prev = run.scores[stop.id] || 0;
      const passed = correct === events.length;
      if (correct > prev) {
        run.scores[stop.id] = correct;
        saveRun(level, run, !passed);
        if (passed) {
          App.noteClear();
          App.addXP(20, `${stop.name}・${level.id}`);
        }
      }
      begin(`<div class="trip-result">
        <p class="trip-eyebrow">${correct}／${events.length} 題答對</p>
        <h2 tabindex="-1" id="trip-summary">${passed ? '本站通過！' : '再試一次挑戰本站'}</h2>
        <button type="button" class="trip-primary" id="trip-return">返回地圖</button>
        ${window.TownAPI && TownAPI.findScene(stop.id) ? '<button type="button" class="trip-secondary" id="trip-scene">🎮 在這站練點餐・對話小遊戲</button>' : ''}
        <button type="button" class="trip-secondary" id="trip-retry">重玩本站</button>
      </div>`);
      el.querySelector('#trip-summary').focus();
      el.querySelector('#trip-return').onclick = () => App.go('home');
      el.querySelector('#trip-scene')?.addEventListener('click', () => App.go('stage', { id: stop.id }));
      el.querySelector('#trip-retry').onclick = () => { at = 0; correct = 0; showQuestion(true); };
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
        if (right) correct++;
        else {
          button.classList.add('trip-wrong');
          Tracker.add(App.wordItem({ jp: answers[0], zh: scene, hint: explanation }, stop.name, 'phrase'), true);
        }
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
  window.Travel = { renderHome };
})();
