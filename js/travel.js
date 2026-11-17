(function () {
  'use strict';
  const { levels, stops } = TravelData;
  const esc = App.esc;
  const width = 5;
  const layout = [
    'water', 'stop', 'road', 'stop', 'trees',
    'water', 'trees', 'road', 'road', 'stop',
    'stop', 'road', 'road', 'road', 'stop',
    'trees', 'road', 'road', 'stop', 'trees',
    'stop', 'road', 'road', 'stop', 'trees',
    'trees', 'road', 'road', 'road', 'stop',
    'stop', 'road', 'trees', 'road', 'stop',
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
  // 新店解鎖等級（升級時真的開新店）
  const STOP_LV = { cafe: 2, directions: 3, clothes: 4, emergency: 5 };
  const lockLv = stop => STOP_LV[stop.id] || 1;
  const locked = stop => App.level < lockLv(stop);
  App.addUnlock(lv => stops.filter(s => lockLv(s) === lv).map(s => `${s.icon} ${s.name}（地圖新店）`));
  // 首次通過一站的掉落：御朱印＋隨機頭像
  const DROPS = ['🍣', '🍙', '🍡', '🎎', '🗻', '🦝', '🐸', '🎏', '🍵', '🐟', '🌸', '🎐', '🍜'];
  function firstClearDrop(stop) {
    const T = App.state.trip; if (!T.stamps) T.stamps = {};
    if (T.stamps[stop.id]) return '';
    T.stamps[stop.id] = App.today();
    const own = App.state.avatarsOwned || (App.state.avatarsOwned = []);
    const left = DROPS.filter(e => !own.includes(e));
    const got = left.length ? left[Math.random() * left.length | 0] : '';
    if (got) own.push(got);
    App.save();
    return `⛩️ 蓋上「${stop.name}」御朱印${got ? `・🎁 獲得頭像 ${got}` : ''}`;
  }
  // 一站全部步驟都有星 → 第一次蓋御朱印＋掉頭像（在狀況題結算或站內流程任何一步完成後檢查）
  function checkDrop(level, run, stop) {
    if (!stop || stopStars(level, run, stop) <= 0) return '';
    const d = firstClearDrop(stop);
    if (d) setTimeout(() => App.toast(d, 'ok'), 1600);
    return d;
  }
  function goshuinModal() {
    const T = App.state.trip || {}, got = T.stamps || {}, n = stops.filter(s => got[s.id]).length;
    App.modal(`<h2>⛩️ 御朱印帳</h2><p class="muted">每一站第一次通過就蓋一個印，還會掉落頭像</p>
      <div class="tg-grid">${stops.map(s => `<div class="tg-cell${got[s.id] ? ' ok' : ''}"><span>${s.icon}</span><small>${got[s.id] ? esc(s.name) : locked(s) ? '🔒Lv.' + lockLv(s) : '？'}</small></div>`).join('')}</div>
      <p class="center">已得 <b>${n}</b>／${stops.length}</p>`, [{ label: '🎭 換頭像', onClick: () => window.Game && Game.pickAvatar(() => App.render()) }, { label: '關閉', cls: 'primary' }]);
  }
  // 分級狀況題本身的星數
  const evStars = (level, run, stop) => (run.stars && run.stars[stop.id]) || ((run.scores[stop.id] || 0) >= stop.events[level.id].length ? 3 : 0);
  // 站內流程：依到店時間線排列的原版互動小遊戲，最後是這個程度的狀況題
  function hubSteps(level, run, stop) {
    const P = window.PracticeAPI;
    const games = P && P.stageNodes ? P.stageNodes(stop.id).filter(n => /:m\d+$/.test(n.key)).map(n => {
      const i = +n.key.split(':m')[1], key = `${n.key}@${level.id}`;
      return { key, icon: n.icon, name: n.name, sub: n.sub, stars: P.sitStars(key), go: () => App.go('menu', { id: stop.id, m: i, lv: level.id, trip: 1 }) };
    }) : [];
    const sc = window.TownAPI && TownAPI.findScene(stop.id);
    const pre = [], post = [];
    if (sc && P) {
      const wk = `${stop.id}:word@${level.id}`, dk = `${stop.id}:talk@${level.id}`, sr = TownAPI.hasSR;
      pre.push({ key: wk, icon: '📚', name: '本站單字', sub: '📚 先學單字', stars: P.sitStars(wk), go: () => App.go('drill', { scenes: [stop.id], kind: 'word', count: 10, sit: wk, trip: 1 }) });
      if ((sc.dialogues || []).length) post.push({ key: dk, icon: sr ? '🎤' : '🎭', name: sr ? '口說對話' : '對話演練', sub: sr ? '🎤 用說的' : '🎭 對話', stars: P.sitStars(dk), go: () => App.go('drill', { scenes: [stop.id], kind: sr ? 'speak' : 'dialog', count: 2, sit: dk, trip: 1 }) });
    }
    return pre.concat(games, post, [{ key: 'ev', icon: '🗣️', name: `${level.id} 狀況題`, sub: `💬 ${level.label}`, stars: evStars(level, run, stop), go: () => App.go('trip-event') }]);
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
    App.go('trip');
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
      const building = stop && locked(stop) ? `<button type="button" class="trip-stop trip-locked" data-lock="${lockLv(stop)}" data-name="${esc(stop.name)}" title="Lv.${lockLv(stop)} 解鎖">
        <span aria-hidden="true">🔒</span><strong>Lv.${lockLv(stop)}</strong></button>` : stop ? `<button type="button" class="trip-stop trip-stop-${stop.id}" data-tile="${tile}" title="${esc(stop.jp)}">
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
        <div class="trip-under"><p class="trip-count">完成 ${count}／${stops.filter(s => !locked(s)).length} 站</p><button type="button" class="trip-gos" id="trip-gos">⛩️ 御朱印 ${Object.keys((App.state.trip || {}).stamps || {}).length}/${stops.length}</button></div>
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
    shell.querySelector('#trip-gos').onclick = goshuinModal;
    map.querySelectorAll('[data-lock]').forEach(b => b.onclick = () => App.toast(`🔒 ${b.dataset.name}：升到 Lv.${b.dataset.lock} 解鎖（目前 Lv.${App.level}）`));
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

  /* ---------- 入門・五十音：先教 5 字 → 小考 10 題 → 結算 ---------- */
  const KSET = [['h', '平假名'], ['k', '片假名'], ['d', '濁音・半濁音'], ['y', '拗音']];
  const KUI = { set: 'h' };
  function kanaBase(set) {
    if (set === 'h' || set === 'k') return KANA.map(r => ({ g: set === 'h' ? r[0] : r[1], h: r[0], r: r[2], hint: r[3], memo: set === 'h' ? r[5] : r[6], emoji: r[4], raw: r }));
    return (set === 'd' ? DAKU : YOON).map(r => ({ g: r[0], h: r[0], r: r[2], hint: r[3], alt: r[1] }));
  }
  const learned = set => ((App.state.kanaL || {})[set] || []);
  const hiraDone = () => learned('h').length >= KANA.length;
  const kanaTrack = it => it.raw ? App.kanaItem(it.raw) : { id: 'kana:' + it.h, jp: it.g + (it.alt ? '・' + it.alt : ''), kana: it.h, romaji: it.r, zh: '讀音 ' + it.r + '（諧音：' + it.hint + '）', source: '五十音' };
  function renderKana(el) {
    if (KUI.set !== 'h' && !hiraDone()) KUI.set = 'h';
    const base = kanaBase(KUI.set), L = learned(KUI.set);
    const fresh = base.filter(x => !L.includes(x.g)).slice(0, 5);
    el.innerHTML = `<section class="trip-shell trip-kana">
      <div class="tabs kn-sets">${KSET.map(([k, n]) => { const lock = k !== 'h' && !hiraDone(); return `<button type="button" data-set="${k}" class="${KUI.set === k ? 'on' : ''}"${lock ? ' data-lock="1"' : ''}>${lock ? '🔒 ' : ''}${n}</button>`; }).join('')}</div>
      <p class="kn-prog">已學 <b>${L.length}</b>／${base.length} 字${fresh.length ? '' : '・全部學完，來複習吧！'}</p>
      <div class="bar kn-bar"><div style="width:${L.length / base.length * 100}%"></div></div>
      <div id="kn-body"></div>
      <p class="kn-links"><a href="日文講義.html">📖 講義</a>・<a href="50音訓練表.html">🎯 50音表</a></p>
    </section>`;
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      if (b.dataset.lock) { App.toast('🔒 先學完 46 個平假名，就會開放'); return; }
      KUI.set = b.dataset.set; renderKana(el);
    });
    const body = el.querySelector('#kn-body');
    if (fresh.length) kanaTeach(el, body, fresh); else kanaQuiz(el, body, []);
  }
  function kanaTeach(el, body, items) {
    let i = 0;
    const show = () => {
      const it = items[i];
      body.innerHTML = `<div class="kn-teach">
        <p class="kn-step">📖 新字 ${i + 1}／${items.length}</p>
        <button class="kn-big jp" type="button" lang="ja" aria-label="再聽一次">${esc(it.g)}</button>
        <p class="kn-rom">${esc(it.r)}</p>
        <p class="kn-hint">諧音「${esc(it.hint)}」${it.memo ? `<br><small>${esc(it.emoji || '')} ${esc(it.memo)}</small>` : ''}${it.alt ? `<br><small>片假名寫法：${esc(it.alt)}</small>` : ''}</p>
        <div class="kn-nav">${i ? '<button class="btn" type="button" id="kn-prev">← 上一個</button>' : ''}<button class="btn primary" type="button" id="kn-next">${i + 1 < items.length ? '下一個 ➜' : '學好了，開始小考 ✏️'}</button></div>
      </div>`;
      App.speak(it.h);
      body.querySelector('.kn-big').onclick = () => App.speak(it.h);
      const pv = body.querySelector('#kn-prev'); if (pv) pv.onclick = () => { i--; show(); };
      body.querySelector('#kn-next').onclick = () => { if (++i < items.length) show(); else kanaQuiz(el, body, items); };
    };
    show();
  }
  function kanaQuiz(el, body, newItems) {
    const base = kanaBase(KUI.set), L = learned(KUI.set);
    const pool = base.filter(x => L.includes(x.g) || newItems.includes(x));
    const weak = pool.filter(x => Tracker.has(kanaTrack(x).id));
    let qs = newItems.concat(newItems);
    while (qs.length < 10) qs.push(Math.random() < 0.4 && weak.length ? weak[Math.random() * weak.length | 0] : pool[Math.random() * pool.length | 0]);
    qs = App.shuffle(qs.slice(0, 10));
    const R = { i: 0, ok: 0, wrong: [] };
    const allR = [...new Set(base.map(x => x.r))];
    const ask = () => {
      const it = qs[R.i], at = R.i;
      const opts = App.shuffle([it.r].concat(App.sample(allR.filter(r => r !== it.r), 3)));
      body.innerHTML = `<p class="kn-score">✏️ 小考 ${R.i + 1}／${qs.length}・答對 ${R.ok}</p>
        <button class="kn-q jp" type="button" lang="ja">${esc(it.g)}</button><div class="kn-ans"></div>
        <div class="choices">${opts.map(o => `<button class="choice" type="button">${esc(o)}</button>`).join('')}</div><div class="kn-after"></div>`;
      body.querySelector('.kn-q').onclick = () => App.speak(it.h);
      let done = false;
      const next = () => { if (R.i !== at) return; if (++R.i < qs.length) ask(); else end(); };
      body.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        if (done) return; done = true;
        const ok = b.textContent === it.r;
        body.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (x.textContent === it.r) x.classList.add('ok'); });
        App.speak(it.h);
        if (ok) { R.ok++; body.querySelector('.kn-ans').textContent = `${it.r}・諧音「${it.hint}」`; setTimeout(() => { if (body.isConnected) next(); }, 800); return; }
        b.classList.add('ng');
        const item = kanaTrack(it);
        Tracker.add(item, true); if (!R.wrong.some(w => w.id === item.id)) R.wrong.push(item);
        body.querySelector('.kn-ans').innerHTML = `<div class="kn-miss"><b class="jp" lang="ja">${esc(it.g)}</b><span>＝ ${esc(it.r)}</span><small>諧音「${esc(it.hint)}」${it.memo ? '・' + esc(it.memo) : ''}</small></div>`;
        body.querySelector('.kn-after').innerHTML = `<div class="kn-nav">${App.trackBtn(item)}<button class="btn primary" type="button" id="kn-go">下一題 ➜</button></div>`;
        body.querySelector('#kn-go').onclick = next;
      });
    };
    const end = () => {
      const kl = App.state.kanaL || (App.state.kanaL = {});
      kl[KUI.set] = [...new Set(learned(KUI.set).concat(newItems.map(x => x.g)))];
      const stars = R.ok >= 9 ? 3 : R.ok >= 7 ? 2 : R.ok >= 4 ? 1 : 0;
      App.save();
      const gained = stars ? stars * 4 + (newItems.length ? 5 : 0) : 0;
      if (gained) App.addXP(gained, newItems.length ? `學會 ${newItems.length} 個新字` : '五十音複習');
      const allDone = KUI.set === 'h' && hiraDone() && newItems.length;
      App.showResult({
        title: allDone ? '🎉 46 個平假名全部學完！片假名開放了' : stars ? `${newItems.length ? '學會 ' + newItems.map(x => x.g).join('') : '複習完成'}！` : '再練一次就會了',
        stars, correct: R.ok, total: qs.length, gained, wrong: R.wrong,
        retry: () => renderKana(el), back: { label: '🏠 回首頁', route: 'home' },
        next: { label: learned(KUI.set).length < kanaBase(KUI.set).length ? '下一組新字 ➜' : '再複習一局 ➜', route: 'trip', params: { r: Date.now() } }
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
    const G = window.Game, d = G ? G.daily() : null, due = Tracker.dueCount(), sk = App.streakInfo();
    el.innerHTML = `<section class="tt">
      <div class="tt-head"><div class="tt-logo">${LOGO()}</div><div><h1 class="tt-name">日語冒險</h1><p class="tt-sub">邊旅行邊學日文</p></div></div>
      ${sk.risk ? `<p class="tt-risk">🔥 已連續 ${sk.days} 天！今天還沒練，練一題就能保住</p>` : ''}
      <div class="tt-menu">
        ${hasSave() ? `<button class="tt-btn primary" id="tt-cont" type="button">▶ 繼續<small>${esc(progressText())}</small></button>` : ''}
        <button class="tt-btn${hasSave() ? ' sub' : ' primary'}" id="tt-new" type="button">✨ 新開始${hasSave() ? '<small>換難度從頭玩（其他難度與 XP 保留）</small>' : '<small>第一次來？從這裡選難度</small>'}</button>
        ${d ? `<div class="h-daily tt-daily">${G.DAILY.map(m => { const v = Math.min(m.goal, d[m.id] || 0); return `<div class="${d.claimed[m.id] ? 'ok' : ''}"><span>${d.claimed[m.id] ? '✅' : m.icon}</span><small>${esc(m.label)}</small><i style="width:${v / m.goal * 100}%"></i></div>`; }).join('')}</div>` : ''}
        <button class="tt-btn" id="tt-rev" type="button">📌 今日複習<small>${due ? `${due} 個字該複習了` : Tracker.count() ? '今天的都複習完了 👍' : '答錯的字會自動收進來'}</small></button>
        <button class="tt-btn" id="tt-book" type="button">📖 旅遊會話手冊<small>緊急・交通・點餐・購物・住宿，可放大給店員看</small></button>
        <button class="tt-btn" id="tt-drill" type="button">🎧 實戰特訓<small>店員問句・看板・數字</small></button>
        <button class="tt-btn sub" id="tt-set" type="button">⚙️ 設定</button>
      </div>
    </section>`;
    const c = el.querySelector('#tt-cont'); if (c) c.onclick = () => App.go('trip');
    el.querySelector('#tt-new').onclick = newGame;
    el.querySelector('#tt-set').onclick = openSettings;
    el.querySelector('#tt-rev').onclick = () => App.go('review');
    el.querySelector('#tt-book').onclick = () => App.go('phrasebook');
    el.querySelector('#tt-drill').onclick = () => App.go('boot');
  }
  const levelBtns = cur => {
    const k = levels[0];
    return `<button type="button" data-lv="${k.id}" class="tt-lv0${cur && cur.id === k.id ? ' on' : ''}"><b>🔰 ${esc(tagOf(k))}・${esc(k.label)}</b><small>完全沒學過日文選這個：從五十音開始，先教再考</small></button>
      <div class="tt-levels">${levels.slice(1).map(l => `<button type="button" data-lv="${l.id}" class="${cur && cur.id === l.id ? 'on' : ''}"><b>${esc(tagOf(l))}</b><small>${esc(l.label)}</small><i>${esc(l.detail || '')}</i></button>`).join('')}</div>`;
  };
  function newGame() {
    App.modal(`<h2>✨ 新開始</h2><p class="muted">選一個難度${hasSave() ? '。只會重來「該難度」的地圖進度；XP、不會清單、其他難度都保留' : '開始'}</p>${levelBtns(null)}`, [{ label: '取消' }]);
    document.querySelectorAll('.modal [data-lv]').forEach(b => b.onclick = () => {
      const lv = b.dataset.lv, T = App.state.trip || {};
      const has = T.runs && T.runs[lv] && Object.keys(T.runs[lv].stars || {}).length;
      if (has && !confirmNew()) return;
      const runs = Object.assign({}, T.runs); delete runs[lv];
      App.state.trip = Object.assign({}, T, { level: lv, runs }); App.save();
      document.querySelectorAll('.modal-bg').forEach(m => m.remove());
      App.go('trip');
    });
  }
  let confirmed = false;
  function confirmNew() {   // 第二次點才真的清除（避免誤觸）
    if (confirmed) return true;
    confirmed = true; App.toast('⚠️ 這個難度已有進度，再點一次確定重來'); setTimeout(() => { confirmed = false; }, 3000);
    return false;
  }
  let confirmedAll = false;
  function confirmAll() {
    if (confirmedAll) return true;
    confirmedAll = true; App.toast('⚠️ 會清除 XP、不會清單、所有難度。再點一次確定'); setTimeout(() => { confirmedAll = false; }, 3000);
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
        <button class="tt-row" id="st-av" type="button">🎭 換頭像・⛩️ 御朱印帳</button>
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
    q('#st-bk').onclick = () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); App.backup(); };
    q('#st-av').onclick = () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); goshuinModal(); };
    q('#st-clear').onclick = () => { if (!confirmAll()) return; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); App.resetAll(); };
  }

  // 狀況題：支援物件格式 {scene, prompt, translation, answers, explanation, reading}；舊的位置陣列自動轉換
  const evObj = e => Array.isArray(e) ? { scene: e[0], prompt: e[1], translation: e[2], answers: e[3], explanation: e[4], reading: e[5] } : e;
  function renderEncounter(el) {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop || !stop.events[level.id]) { App.go('trip'); return; }
    const events = stop.events[level.id];
    const G = window.Game || { sfx() { }, floatText() { }, burst() { }, shake() { } };
    let at = 0, correct = 0, hearts = 3, combo = 0, best = 0, wrongItems = [];
    const XPS = [0, 10, 15, 20];   // 全站統一：刷新最佳星數補差額＋首次三星 +10；重玩沒進步 3 XP

    function makeHeader() {
      return `<div class="trip-map-header"><div><p class="trip-eyebrow">${esc(tagOf(level))}・${esc(level.label)}</p>
        <h1>${stop.icon} ${esc(stop.name)}</h1></div>
        <div class="trip-hud"><span class="trip-hearts">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="trip-combo">🔥${combo}</span>` : ''}</div>
        <button class="trip-secondary" type="button" id="trip-back">🗺️ 地圖</button></div>`;
    }

    function begin(rendered) {
      el.innerHTML = `<section class="trip-shell trip-event">${makeHeader()}${rendered}</section>`;
      el.querySelector('#trip-back').onclick = () => App.go('trip');
    }
    const restart = () => { at = 0; correct = 0; hearts = 3; combo = 0; best = 0; wrongItems = []; showQuestion(true); };

    function finish() {
      const n = events.length;
      const stars = hearts <= 0 ? 0 : correct === n ? 3 : correct >= n - 1 ? 2 : correct * 2 >= n ? 1 : 0;
      const passed = stars > 0;
      const prevStop = stopStars(level, run, stop);
      const prevEv = (run.stars && run.stars[stop.id]) || 0;
      if (correct > (run.scores[stop.id] || 0)) run.scores[stop.id] = correct;
      if (!run.stars) run.stars = {};
      if (stars > prevEv) run.stars[stop.id] = stars;
      saveRun(level, run);
      const gained = !stars ? 0 : stars > prevEv ? XPS[stars] - XPS[prevEv] + (stars === 3 ? 10 : 0) : 3;
      if (gained > 0) App.addXP(gained, `${stop.name}・${level.id}`);
      const nowStop = stopStars(level, run, stop);
      if (nowStop > 0 && !prevStop) App.noteClear();
      const drop = checkDrop(level, run, stop);
      App.showResult({
        title: hearts <= 0 ? '💔 愛心用完了，本站結束' : passed ? `${stop.icon} ${stop.name} 通過！` + (best >= 2 ? `（最高 ${best} 連擊）` : '') : '再試一次挑戰本站',
        stars, correct, total: n, gained: Math.max(0, gained), wrong: wrongItems,
        retry: restart,
        back: { label: '🗺️ 返回地圖', route: 'trip' },
        next: nowStop > 0 ? { label: '下一站 ➜', route: 'trip-next' } : null
      });
      begin(`<div class="trip-result">
        <p class="trip-eyebrow">${correct}／${n} 題答對</p>
        <h2 tabindex="-1" id="trip-summary">${passed ? '本站通過！' : hearts <= 0 ? '愛心用完了' : '再試一次挑戰本站'} ${starStr(stars)}</h2>
        ${drop ? `<p class="trip-drop">${esc(drop)}</p>` : ''}
        ${nowStop > 0 ? '<button type="button" class="trip-primary" id="trip-next">下一站 ➜</button>' : ''}
        <button type="button" class="trip-secondary" id="trip-retry">重玩本站</button>
        <button type="button" class="trip-secondary" id="trip-return">🗺️ 返回地圖</button>
      </div>`);
      const nb = el.querySelector('#trip-next'); if (nb) nb.onclick = () => App.go('trip-next');
      el.querySelector('#trip-return').onclick = () => App.go('trip');
      el.querySelector('#trip-retry').onclick = restart;
    }

    function showQuestion(focus) {
      const { scene, prompt, translation, answers, explanation, reading } = evObj(events[at]);
      const choices = App.shuffle(answers);
      const advanced = !reading;
      begin(`<p class="trip-step">情境 ${at + 1}／${events.length}</p>
        <div class="trip-dialog">
          <h2 id="trip-scenario" tabindex="-1"${advanced ? ' lang="ja"' : ''}>${esc(scene)}</h2>
          <div class="trip-line">
            <span>${esc(stop.npc)}</span>
            <p class="jp" lang="ja">${esc(prompt)}</p>
            <button class="trip-secondary" type="button" id="trip-listen">🔊 聽日文</button>
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
        <button type="button" class="trip-primary trip-next" hidden></button>`);
      if (focus) el.querySelector('#trip-scenario').focus();
      el.querySelector('#trip-listen').onclick = () => App.speak(reading || prompt);
      const buttons = el.querySelectorAll('[data-answer]');
      const next = el.querySelector('.trip-next');
      const feedback = el.querySelector('.trip-feedback');
      const item = App.wordItem({ jp: answers[0], zh: scene, hint: explanation }, stop.name, 'phrase');
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
          Tracker.add(item, true); wrongItems.push(item);
        }
        const hud = el.querySelector('.trip-hud');
        if (hud) hud.innerHTML = `<span class="trip-hearts">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)}</span>${combo >= 2 ? `<span class="trip-combo">🔥${combo}</span>` : ''}`;
        feedback.classList.add(right ? 'trip-right-note' : 'trip-wrong-note');
        feedback.innerHTML = `<strong>${right ? '回應正確' : '這樣回應更合適'}</strong><p class="jp" lang="ja">${esc(answers[0])}</p><p>${esc(explanation)}</p><div class="trip-fb-act">${App.trackBtn(item)}</div>`;
        next.textContent = hearts <= 0 ? '💔 愛心用完，結束本站' : at + 1 === events.length ? '查看結果' : '繼續對話';
        next.hidden = false;
        feedback.focus();
      });
      next.onclick = () => { if (hearts > 0 && ++at < events.length) showQuestion(true); else finish(); };
    }

    showQuestion(true);
  }

  App.register('trip-event', { title: '旅遊情境', icon: '💬', nav: false, navParent: 'home', render: renderEncounter });

  /* ---------- 站內流程（Hub） ---------- */
  const HUB = { stop: null, i: -1 };
  function enterHub(stopId, steps) {   // 從第一個還沒過的關卡開始；全過了就從頭重玩
    const first = steps.findIndex(x => !x.stars);
    HUB.stop = stopId; HUB.i = (first < 0 ? 0 : first) - 1;
  }
  function renderStopHub() {
    const level = selectedLevel();
    const run = level && tripRun(level), stop = run && stopAt(run.tile);
    if (!stop || level.kana) { App.go('trip'); return; }
    const steps = hubSteps(level, run, stop);
    checkDrop(level, run, stop);
    if (HUB.stop !== stop.id) enterHub(stop.id, steps);
    HUB.i++;
    if (HUB.i >= steps.length) { HUB.stop = null; App.toast(stopStars(level, run, stop) ? `🎉 ${stop.name} 完成！` : `${stop.name} 還有關卡沒過，再進去挑戰`); App.go('trip'); return; }
    App.toast(`${stop.icon} ${stop.name}　${HUB.i + 1}／${steps.length}：${steps[HUB.i].name}`);
    steps[HUB.i].go();
  }
  // 下一站：走到最近一個還沒通過、已解鎖的店
  function nextStop() {
    const level = selectedLevel();
    if (!level || level.kana) { App.go('trip'); return; }
    const run = tripRun(level);
    const cand = stops.filter(s => !locked(s) && s.tile !== run.tile && stopStars(level, run, s) === 0)
      .map(s => [s, routeBetween(run.tile, s.tile).length]).sort((a, b) => a[1] - b[1]);
    if (!cand.length) { App.toast('🎉 這個難度能去的店都通過了！'); App.go('trip'); return; }
    const st = cand[0][0];
    run.tile = st.tile; saveRun(level, run);
    HUB.stop = null;
    App.toast(`🚶 前往下一站：${st.icon} ${st.name}`);
    App.go('trip-stop');
  }
  App.register('trip-next', { title: '下一站', icon: '🚶', nav: false, transient: true, navParent: 'home', render: nextStop });
  App.register('trip-stop', { title: '站內流程', icon: '📍', nav: false, transient: true, navParent: 'home', render: renderStopHub });
  App.register('trip', { title: '舊版旅程', icon: '🗾', nav: false, navParent: 'home', render: renderPlay });
  window.Travel = { renderTitle, renderPlay, openSettings };
})();
