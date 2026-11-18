/* =========================================================
   🏯 經典練習 classic：收納舊模組的單一入口（延遲載入，不在首頁）
   舊旅程 13 站（travel.js：trip／trip-stop／trip-event／trip-next）、舊練習地圖（practice.js：practice-map／stage）、
   情境小遊戲（practice.js：menu）、單字測驗／對話／口說（town.js：scene／drill）、假名關卡（quest.js：quest）、特訓（drill.js：boot）
   依賴（由 index.html 的 Home.lazy 一起載入）：KANA、SCENES、CARDS、MENUS、TravelData、QUESTS
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const arr = a => Array.isArray(a) ? a : [];
  function render(el) {
    const sc = arr(window.SCENES).filter(s => s && s.id);
    const M = window.MENUS || {}, ms = sc.filter(s => M[s.id]);
    const qs = arr(window.QUESTS).filter(q => q && q.type === 'kana');
    const chip = (attr, ic, t) => `<button type="button" class="chip cl-chip" ${attr}><span aria-hidden="true">${esc(ic || '')}</span>${esc(t)}</button>`;
    el.innerHTML = `<section class="cl">
      <h1>🏯 經典練習</h1>
      <p class="muted">舊版的旅程、關卡與小遊戲都收在這裡，想換換口味時來玩。主線請回首頁「今天的課」。</p>
      <div class="cl-list">
        <button type="button" class="cl-row" data-go="trip"><span aria-hidden="true">🗼</span><span><b>東京 13 站旅程</b><small>舊版旅程：每站狀況題、情境小遊戲</small></span></button>
        <button type="button" class="cl-row" data-go="practice-map"><span aria-hidden="true">🎯</span><span><b>練習地圖</b><small>舊版場景關卡與御朱印帳</small></span></button>
        <details class="cl-sec"><summary><span aria-hidden="true">🧾</span><span><b>情境小遊戲</b><small>點餐、結帳的限時小遊戲（${ms.length} 個場景）</small></span></summary>
          <div class="chips">${ms.map(s => chip(`data-menu="${esc(s.id)}"`, s.icon, s.name)).join('')}</div></details>
        <details class="cl-sec"><summary><span aria-hidden="true">📝</span><span><b>單字測驗・對話・口說</b><small>依場景練習（${sc.length} 個場景）</small></span></summary>
          <div class="chips">${sc.map(s => chip(`data-scene="${esc(s.id)}"`, s.icon, s.name)).join('')}</div></details>
        <details class="cl-sec"><summary><span aria-hidden="true">⚔️</span><span><b>假名關卡</b><small>舊版五十音闖關（${qs.length} 關）</small></span></summary>
          <div class="chips">${qs.map(q => chip(`data-quest="${esc(q.id)}"`, q.icon, q.title)).join('')}</div></details>
        <button type="button" class="cl-row" data-go="boot"><span aria-hidden="true">🎧</span><span><b>實戰特訓</b><small>店員問句聽解、看板、量詞</small></span></button>
      </div>
    </section>`;
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go(b.dataset.go));
    el.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => App.go('menu', { id: b.dataset.menu }));
    el.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => App.go('scene', { id: b.dataset.scene }));
    el.querySelectorAll('[data-quest]').forEach(b => b.onclick = () => App.go('quest', { id: b.dataset.quest, free: 1 }));
  }
  App.register('classic', { title: '經典練習', icon: '🏯', nav: false, navParent: 'play', render });
})();
