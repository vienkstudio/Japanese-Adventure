/* 我的（路由 me，導覽 4）：今日到期與複習（→ review）、已學會統計（Learn 狀態）、連勝與成就、御朱印帳、設定、🏯 經典練習、備份。
   只讀 Learn／App／Game 的狀態，不另存資料；成就由現有進度即時計算。樣式 css/lookup.css（前綴 my-）。 */
(function () {
  'use strict';
  const esc = App.esc;
  const KANA_N = 46;
  const stampN = () => Object.keys(((App.state.world || {}).stamps) || {}).length;

  function achievements(sk, S, kana) {
    const tot = S.all, lv = App.level || 1;
    return [
      ['🔥', '連續 3 天', sk.days >= 3], ['🔥', '連續 7 天', sk.days >= 7], ['🏅', '連續 30 天', sk.days >= 30],
      ['🔤', '平假名 46 個', kana >= KANA_N], ['📘', '學會 50 個單字', S.v.known >= 50], ['📚', '學會 300 個單字', S.v.known >= 300],
      ['💬', '學會 30 句', S.p.known >= 30], ['📗', '學會 10 個文法', S.g.known >= 10], ['🎓', '掌握 100 個', tot.mastered >= 100],
      ['⭐', '升到 Lv.5', lv >= 5], ['⛩️', '第一個御朱印', stampN() >= 1], ['🗾', '御朱印 10 個', stampN() >= 10]
    ];
  }

  function render(el) {
    const sk = App.streakInfo(), lv = App.level || 1, xp = App.state.xp || 0, G = window.Game;
    const st = o => window.Learn ? Learn.stats(o) : { known: 0, learning: 0, review: 0, mastered: 0, due: 0, total: 0 };
    const S = { all: st(), v: st({ type: 'v' }), p: st({ type: 'p' }), g: st({ type: 'g' }) };
    const kana = window.Learn && Learn.kanaLearned ? Learn.kanaLearned().length : 0;
    const due = S.all.due;
    const ach = achievements(sk, S, kana), got = ach.filter(a => a[2]).length;
    const daily = G && G.DAILY ? G.DAILY : [];
    const dd = G && G.daily ? G.daily() : { claimed: {} };
    const hasGos = (window.World && typeof World.goshuin === 'function') || stampN() > 0;
    const tile = (n, lbl, sub) => `<div class="my-tile"><b>${n}</b><span>${esc(lbl)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    el.innerHTML = `<section class="my">
      <div class="my-head"><span class="my-av" aria-hidden="true">${esc(G && G.avatar ? G.avatar() : '🧳')}</span>
        <div><b>Lv.${lv} ${esc((App.TITLES || [])[lv - 1] || '')}</b><small>${xp} XP・${esc((App.LV_NAMES || {})[App.profile().lv] || '')}</small></div>
        <span class="my-fire${sk.done ? ' on' : ''}" title="連續天數">🔥 ${sk.days} 天</span></div>

      <button type="button" class="my-due${due ? ' hot' : ''}" data-go="review">
        <span class="i" aria-hidden="true">📌</span>
        <span><b>${due ? `今天到期 ${due} 個` : '今天沒有到期的 ✓'}</b><small>${due ? '先複習再學新的，記得最牢' : '可以看不會清單或提前複習'}</small></span><span aria-hidden="true">›</span></button>

      <div class="my-box"><h2>📊 已學會</h2>
        <div class="my-tiles">${tile(kana + '<small>/' + KANA_N + '</small>', '平假名')}${tile(S.v.known, '單字', S.v.learning ? `學習中 ${S.v.learning}` : '')}${tile(S.p.known, '句子', S.p.learning ? `學習中 ${S.p.learning}` : '')}${tile(S.g.known, '文法', S.g.learning ? `學習中 ${S.g.learning}` : '')}</div>
        <p class="my-note">「學會」＝連續答對、隔天以上還記得；已完全掌握 ${S.all.mastered} 個 🎓</p>
      </div>

      <div class="my-box"><h2>🏆 連勝與成就<small>${got}／${ach.length}</small></h2>
        <p class="my-streak">🔥 已連續 <b>${sk.days}</b> 天${sk.done ? '・今天完成 ✓' : sk.risk ? '・今天還沒練，練一題就能保住' : ''}</p>
        ${daily.length ? `<ul class="my-daily">${daily.map(m => { const v = Math.min(m.goal, G.prog(m.id)); return `<li class="${dd.claimed && dd.claimed[m.id] ? 'ok' : ''}"><span aria-hidden="true">${m.icon}</span>${esc(m.name)}<i><b style="width:${v / m.goal * 100}%"></b></i><small>${v}/${m.goal}</small></li>`; }).join('')}</ul>` : ''}
        <div class="my-ach">${ach.map(([i, n, ok]) => `<span class="${ok ? 'ok' : ''}" title="${esc(n)}${ok ? '（已達成）' : ''}"><i aria-hidden="true">${ok ? i : '🔒'}</i>${esc(n)}</span>`).join('')}</div>
      </div>

      <div class="my-rows">
        ${hasGos ? `<button type="button" class="st-row" data-a="gos">⛩️ 御朱印帳<small>${stampN()} 間店 ›</small></button>` : ''}
        <button type="button" class="st-row" data-go="settings">⚙️ 設定<small>程度、目的、外觀、語音 ›</small></button>
        <button type="button" class="st-row" data-go="classic">🏯 經典練習<small>舊版旅程、關卡、小遊戲 ›</small></button>
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
})();
