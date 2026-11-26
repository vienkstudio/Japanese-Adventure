// 相依樹（路由 tree；舊 mind3d 轉址過來）：用可展開的樹狀清單看「先學什麼 → 學完能接什麼」
// 文法：data/mind/grammar.js 的 pre（先修）→ 子節點＝把它列為先修的文法；動詞變化：data/mind/conj.js 的 from（由哪一形變來）
// params：{ focus: 'gram:…' | 'cj:…', tab: 'gram' | 'conj' }；點名稱開辭典頁（kb-page）
(function () {
  'use strict';
  const M = window.MIND, esc = App.esc;
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const GRAM = (M.gram || []).slice().sort((a, b) => LVS.indexOf(a.lv) - LVS.indexOf(b.lv) || (a.ord || 0) - (b.ord || 0));
  const G_BY = new Map(GRAM.map(g => [g.id, g]));
  const POST = new Map();   // 先修 id → 後續文法
  GRAM.forEach(g => (g.pre || []).forEach(p => { if (!POST.has(p)) POST.set(p, []); POST.get(p).push(g); }));
  const CONJ = M.CONJ || [], C_BY = new Map(CONJ.map(c => ['cj:' + c.id, c]));
  const CKIDS = new Map();
  CONJ.forEach(c => { if (c.from) { const k = 'cj:' + c.from; if (!CKIDS.has(k)) CKIDS.set(k, []); CKIDS.get(k).push(c); } });
  const UI = { tab: 'gram', q: '' };

  const st = id => { const s = window.Learn && Learn.status ? Learn.status(id) : 'new'; return s === 'review' || s === 'mastered' ? 'ok' : s === 'learning' ? 'ing' : ''; };
  const kidsOf = id => id.startsWith('cj:') ? (CKIDS.get(id) || []).map(c => 'cj:' + c.id) : (POST.get(id) || []).map(g => g.id);
  function label(id) {
    if (id.startsWith('cj:')) { const c = C_BY.get(id); return c ? `<b>${esc(c.name)}</b><span class="mt-ex" lang="ja">${esc(c.ex || '')}</span>` : esc(id); }
    const g = G_BY.get(id); if (!g) return esc(id);
    return `<i class="mt-lv">${esc(g.lv)}</i><b lang="ja">${esc(g.pat)}</b><span class="mt-zh">${esc(g.zh || '')}</span>`;
  }
  // 一個節點：名稱（點了開辭典頁）＋「n 個後續」可展開（第一次展開才產生子節點，避免整棵樹一次畫出 700 多個）
  function node(id, open) {
    const n = kidsOf(id).length, s = st(id);
    const row = `<button type="button" class="mt-n${s ? ' ' + s : ''}" data-open="${esc(id)}">${label(id)}${s === 'ok' ? '<em aria-label="已學會">✓</em>' : ''}</button>`;
    if (!n) return `<li class="mt-leaf">${row}</li>`;
    return `<li><details data-id="${esc(id)}"${open ? ' open' : ''}><summary><span class="mt-k">${n} 個後續</span>${row}</summary>${open ? `<ul>${kidsOf(id).map(k => node(k)).join('')}</ul>` : ''}</details></li>`;
  }
  // 先修鏈：由近到遠往上找（只列一層一層的先修，不重複）
  function ancestors(id) {
    const g = G_BY.get(id), c = C_BY.get(id);
    const pre = g ? (g.pre || []) : c && c.from ? ['cj:' + c.from] : [];
    return pre.filter(p => G_BY.has(p) || C_BY.has(p));
  }
  function preTree(id, seen) {
    seen = seen || new Set(); const ps = ancestors(id).filter(p => !seen.has(p)); ps.forEach(p => seen.add(p));
    if (!ps.length) return '';
    return `<ul>${ps.map(p => `<li><button type="button" class="mt-n${st(p) ? ' ' + st(p) : ''}" data-focus="${esc(p)}">${label(p)}</button>${preTree(p, seen)}</li>`).join('')}</ul>`;
  }
  function focusHTML(id) {
    const pre = preTree(id), kids = kidsOf(id);
    return `<div class="mt-focus"><div class="mt-cur">${label(id)}<button type="button" class="btn sm" data-open="${esc(id)}">📘 看說明</button><button type="button" class="btn sm ghost" data-focus="">✕ 全部</button></div>
      <h3 class="mt-h">⬆️ 先學</h3>${pre ? `<div class="mt-tree mt-up">${pre}</div>` : '<p class="muted">沒有先修，可以直接學</p>'}
      <h3 class="mt-h">⬇️ 學完可以接</h3>${kids.length ? `<ul class="mt-tree">${kids.map(k => node(k)).join('')}</ul>` : '<p class="muted">沒有後續文法</p>'}</div>`;
  }
  function listHTML() {
    if (UI.tab === 'conj') return `<ul class="mt-tree">${CONJ.filter(c => !c.from || !C_BY.has('cj:' + c.from)).map(c => node('cj:' + c.id, true)).join('')}</ul>`;
    const q = UI.q.trim().toLowerCase();
    if (q) {
      const hit = GRAM.filter(g => (g.pat + ' ' + (g.zh || '')).toLowerCase().includes(q)).slice(0, 40);
      return hit.length ? `<ul class="mt-tree mt-hits">${hit.map(g => `<li><button type="button" class="mt-n" data-focus="${esc(g.id)}">${label(g.id)}</button></li>`).join('')}</ul>` : '<p class="muted center">找不到</p>';
    }
    const roots = GRAM.filter(g => !(g.pre || []).length);
    return `<ul class="mt-tree">${roots.map(g => node(g.id)).join('')}</ul>`;
  }
  function render(el, p) {
    p = p || {};
    let focus = p.focus && (G_BY.has(p.focus) || C_BY.has(p.focus)) ? p.focus : '';
    if (p.tab) UI.tab = p.tab === 'conj' ? 'conj' : 'gram';
    if (focus) UI.tab = focus.startsWith('cj:') ? 'conj' : 'gram';
    const paint = () => {
      el.innerHTML = `<section class="mt">
        <h1 class="mt-t">🌳 相依樹</h1>
        <div class="tabs" role="tablist">${[['gram', '📗 文法'], ['conj', '🔁 動詞變化']].map(([k, n]) => `<button type="button" role="tab" data-tab="${k}" class="${UI.tab === k ? 'on' : ''}" aria-selected="${UI.tab === k}">${n}</button>`).join('')}</div>
        ${UI.tab === 'gram' && !focus ? `<input type="search" class="mt-q" placeholder="搜尋文法（例：て、可能、～たい）" value="${esc(UI.q)}" aria-label="搜尋文法">` : ''}
        <div class="mt-body">${focus ? focusHTML(focus) : listHTML()}</div></section>`;
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; focus = ''; paint(); });
      const q = el.querySelector('.mt-q');
      if (q) q.oninput = () => { UI.q = q.value; el.querySelector('.mt-body').innerHTML = listHTML(); };
    };
    // 事件委派：展開時才補子節點；點名稱開辭典；點先修／搜尋結果切換焦點
    el.addEventListener('toggle', e => {
      const d = e.target; if (!d.matches || !d.matches('details[data-id]') || !d.open || d.querySelector('ul')) return;
      d.insertAdjacentHTML('beforeend', `<ul>${kidsOf(d.dataset.id).map(k => node(k)).join('')}</ul>`);
    }, true);
    el.addEventListener('click', e => {
      const f = e.target.closest('[data-focus]');
      if (f) { e.preventDefault(); focus = f.dataset.focus; if (focus) UI.tab = focus.startsWith('cj:') ? 'conj' : 'gram'; paint(); window.scrollTo(0, 0); return; }
      const o = e.target.closest('[data-open]');
      if (o) { e.preventDefault(); App.go('kb-page', { id: o.dataset.open }); }
    });
    paint();
  }
  App.register('tree', { title: '相依樹', icon: '🌳', nav: false, navParent: 'kb', render });
  // 舊路由 mind3d（3D 心智圖已改成相依樹）→ 轉址
  App.register('mind3d', { title: '相依樹', icon: '🌳', nav: false, navParent: 'kb', transient: true, render(el, p) { App.go('tree', p && p.focus ? { focus: p.focus } : {}); } });
})();
