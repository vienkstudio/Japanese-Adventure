/* 我的（路由 me，導覽 4）：今日到期與複習（→ review）、已學會統計（Learn 狀態）、連勝與成就、御朱印帳、設定、備份（經典練習已拆進路線各旅遊包與五十音分頁）。
   只讀 Learn／App／Game 的狀態，不另存資料；成就由現有進度即時計算。樣式 css/lookup.css（前綴 my-）。
   今天到期＝Learn.due(15)（與首頁今日課同一函式、同一上限）。
   「學會」＝Learn.stats().known（review 以上、隔天以上還記得；與複習頁同一函式）。 */
(function () {
  'use strict';
  const esc = App.esc;
  const KANA_N = 46, DUE_N = 15;
  const stampN = () => Object.keys(((App.state.world || {}).stamps) || {}).length;

  // 學會／學習中／已掌握：一律用 Learn.stats（與複習頁同一個函式，數字一致）
  //   known＝Learn 的「學會」定義（review 以上、隔天以上還記得）；learning＝學過但還沒學會
  function counts() {
    const S = o => (window.Learn && Learn.stats ? Learn.stats(o) : { total: 0, new: 0, known: 0, mastered: 0 });
    const b = t => { const s = S({ type: t }); return { known: s.known || 0, learning: Math.max(0, (s.total || 0) - (s.new || 0) - (s.known || 0)) }; };
    const all = S();
    return { v: b('v'), p: b('p'), g: b('g'), kana: b('kana'), known: all.known || 0, mastered: all.mastered || 0 };
  }

  // 成就：依目的與程度排序；與目的無關的（五十音給非零基礎、御朱印給非旅遊）不列
  function achievements(sk, C, kana, p) {
    const gs = p.goals && p.goals.length ? p.goals : ['travel'], zero = (p.lv || 'zero') === 'zero';
    const hi = ['n3', 'n2', 'n1'].includes(p.lv);
    const lv = App.level || 1, tot = C.v.known + C.p.known + C.g.known;
    // [圖示, 名稱, 達成, 適用（目的或 'all'／'zero'）, 權重：越小越前面]
    const A = [
      ['🔤', '平假名 46 個', kana >= KANA_N, 'zero', 0],
      ['🔥', '連續 3 天', sk.days >= 3, 'all', 1],
      ['💬', '學會 10 句', C.p.known >= 10, 'travel work', 2],
      ['📘', hi ? '學會 100 個單字' : '學會 30 個單字', C.v.known >= (hi ? 100 : 30), 'exam fun', 2],
      ['📗', '學會 10 個文法', C.g.known >= 10, 'exam work', 3],
      ['🙇', '學會 5 個文法（敬語）', C.g.known >= 5, 'work', 2.5],
      ['⛩️', '第一個御朱印', stampN() >= 1, 'travel', 3],
      ['🔥', '連續 7 天', sk.days >= 7, 'all', 4],
      ['💬', '學會 30 句', C.p.known >= 30, 'travel work fun', 5],
      ['📚', hi ? '學會 500 個單字' : '學會 300 個單字', C.v.known >= (hi ? 500 : 300), 'exam fun work', 5],
      ['🗾', '御朱印 10 個', stampN() >= 10, 'travel', 6],
      ['🎓', '掌握 100 個', C.mastered >= 100 || tot >= 300, 'all', 7],
      ['⭐', '升到 Lv.5', lv >= 5, 'all', 8],
      ['🏅', '連續 30 天', sk.days >= 30, 'all', 9]
    ];
    const fit = a => a[3] === 'all' || (a[3] === 'zero' ? zero : a[3].split(' ').some(g => gs.includes(g)));
    const seen = new Set();
    return A.filter(fit).filter(a => !seen.has(a[1]) && seen.add(a[1]))
      .map((a, i) => [a, i]).sort((x, y) => x[0][4] - y[0][4] || x[1] - y[1]).map(x => x[0]).slice(0, 9);
  }

  function render(el) {
    const p = App.profile(), sk = App.streakInfo(), lv = App.level || 1, xp = App.state.xp || 0, G = window.Game;
    const C = counts();
    const zero = (p.lv || 'zero') === 'zero';
    const kana = window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : 0;
    const due = window.Learn && Learn.due ? Learn.due(DUE_N).length : 0;
    const ach = achievements(sk, C, kana, p), got = ach.filter(a => a[2]).length;
    const daily = G && G.DAILY ? G.DAILY : [];
    const dd = G && G.daily ? G.daily() : { claimed: {} };
    const travel = (p.goals || []).includes('travel') || !(p.goals || []).length;
    const hasGos = travel && ((window.World && typeof World.goshuin === 'function') || stampN() > 0);
    const tile = (n, lbl, sub) => `<div class="my-tile"><b>${n}</b><span>${esc(lbl)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    const lrn = b => b.learning ? `學習中 ${b.learning}` : '';
    const tiles = (zero ? [tile(kana + '<small>/' + KANA_N + '</small>', '平假名')] : [])
      .concat([tile(C.v.known, '單字', lrn(C.v)), tile(C.p.known, '句子', lrn(C.p)), tile(C.g.known, '文法', lrn(C.g))]);
    el.innerHTML = `<section class="my">
      <div class="my-head"><span class="my-av" aria-hidden="true">${esc(G && G.avatar ? G.avatar() : '🙂')}</span>
        <div><b>Lv.${lv} ${esc((App.TITLES || [])[lv - 1] || '')}</b><small>${xp} XP・${esc((App.LV_NAMES || {})[p.lv] || '')}</small></div>
        <span class="my-fire${sk.done ? ' on' : ''}" title="連續天數">🔥 ${sk.days} 天</span></div>

      <button type="button" class="my-due${due ? ' hot' : ''}" data-go="review">
        <span class="i" aria-hidden="true">📌</span>
        <span><b>${due ? `今天到期 ${due} 個` : '今天沒有到期的 ✓'}</b><small>${due ? '先複習再學新的，記得最牢' : '可以提前複習或看不會清單'}</small></span><span aria-hidden="true">›</span></button>

      <div class="my-box"><h2>📊 已學會</h2>
        <div class="my-tiles${tiles.length === 3 ? ' t3' : ''}">${tiles.join('')}</div>
        <p class="my-note">「學會」＝答對、而且隔天以上還記得（今天剛學的先算「學習中」）；全部共學會 ${C.known} 個（與複習頁相同）</p>
      </div>

      <div class="my-box"><h2>🏆 連勝與成就<small>${got}／${ach.length}</small></h2>
        <p class="my-streak">🔥 已連續 <b>${sk.days}</b> 天${sk.done ? '・今天完成 ✓' : sk.risk ? '・今天還沒練，練一題就能保住' : ''}</p>
        ${daily.length ? `<ul class="my-daily">${daily.map(m => { const v = Math.min(m.goal, G.prog(m.id)); return `<li class="${dd.claimed && dd.claimed[m.id] ? 'ok' : ''}"><span aria-hidden="true">${m.icon}</span>${esc(m.name)}<i><b style="width:${v / m.goal * 100}%"></b></i><small>${v}/${m.goal}</small></li>`; }).join('')}</ul>` : ''}
        <div class="my-ach">${ach.map(([i, n, ok]) => `<span class="${ok ? 'ok' : ''}" title="${esc(n)}${ok ? '（已達成）' : ''}"><i aria-hidden="true">${ok ? i : '🔒'}</i>${esc(n)}</span>`).join('')}</div>
      </div>

      <div class="my-rows">
        ${hasGos ? `<button type="button" class="st-row" data-a="gos">⛩️ 御朱印帳<small>${stampN()} 間店 ›</small></button>` : ''}
        <button type="button" class="st-row" data-go="settings">⚙️ 設定<small>程度、目的、外觀、語音 ›</small></button>
        <button type="button" class="st-row" data-a="bk">💾 備份／還原<small>${App.saveStatus === 'cloud' ? '已雲端存檔' : '存在這台裝置'}</small></button>
      </div>
    </section>`;
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go(b.dataset.go));
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      if (b.dataset.a === 'bk') return App.backup();
      if (b.dataset.a === 'gos') {
        if (window.World && typeof World.goshuin === 'function') return World.goshuin();
        // 冒險世界還沒載入：先載入 play 需要的檔案再開
        if (window.Home && Home.need) { App.toast('⏳ 載入御朱印帳…'); Home.need('play').then(() => { if (window.World && World.goshuin) World.goshuin(); }).catch(() => App.toast('載入失敗，請稍後再試')); }
      }
    });
  }

  App.register('me', { title: '我的', icon: '👤', nav: true, navOrder: 4, render });
  // 學習進度變了（例如在別頁作答後返回）就重畫統計
  document.addEventListener('learnchange', () => { const m = document.getElementById('main'); if (m && m.className === 'route-me') { clearTimeout(render.t); render.t = setTimeout(() => { if (m.className === 'route-me') render(m); }, 300); } });
  window.Me = { counts, isKnown: id => !!(window.Learn && Learn.isLearned && Learn.isLearned(id)) };
})();
