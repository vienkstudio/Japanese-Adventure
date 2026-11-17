/* 旅遊會話手冊：依情境分類、中日文搜尋、每句語音、全螢幕「給店員看」。
   路由：phrasebook（底部導覽 📖）。資料直接取 SCENES 的 phrases / vocab（含 data/scene-ext.js 加深內容）。 */
(function () {
  'use strict';
  const esc = App.esc;
  const CATS = [
    ['emer', '🆘 緊急', ['emergency']],
    ['move', '🚃 交通', ['airport', 'station', 'directions']],
    ['eat', '🍜 點餐', ['ramen', 'izakaya', 'yakiniku', 'cafe']],
    ['shop', '🛍️ 購物', ['konbini', 'drugstore', 'clothes']],
    ['stay', '🏨 住宿', ['hotel']],
    ['see', '⛩️ 觀光', ['shrine']]
  ];
  const UI = { cat: 'emer', q: '' };
  (function css() {
    if (document.getElementById('css-pb')) return;
    const s = document.createElement('style'); s.id = 'css-pb';
    s.textContent = `
.pb{max-width:720px;margin:0 auto;padding:6px 16px 48px}
.pb h1{font-size:1.4em;margin:6px 0 10px}
.pb-search{width:100%;font:inherit;font-size:1.05em;padding:12px 16px;border-radius:999px;border:1px solid var(--line2);background:var(--card);color:var(--text);min-height:48px}
.pb-cats{display:flex;gap:6px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch}
.pb-cats button{flex:none;border:none;border-radius:999px;background:var(--chip);color:var(--text);font:inherit;font-weight:800;padding:10px 16px;min-height:44px;cursor:pointer}
.pb-cats button.on{background:var(--pri);color:var(--on-pri)}
.pb-cats button.emer:not(.on){background:var(--pri-t);color:var(--pri)}
.pb h2{font-size:1.05em;margin:18px 0 6px}
.pb-row{display:flex;gap:10px;align-items:flex-start;background:var(--card);border-radius:16px;box-shadow:var(--shadow);padding:10px 12px;margin:8px 0}
.pb-say,.pb-show{flex:none;border:none;border-radius:50%;width:44px;height:44px;font-size:1.15em;cursor:pointer;background:var(--pri-t);color:var(--pri)}
.pb-t{flex:1;min-width:0}
.pb-t p{margin:0}
.pb-t .jp{font-size:1.12em;font-weight:700}
.pb-t .k{color:var(--muted);font-size:.85em}
.pb-t .zh{font-size:.95em}
.pb-t .use{color:var(--muted);font-size:.82em}
.pb-act{display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.pb-act .track-btn{font-size:.8125rem;padding:2px 10px}
.pb details{margin:10px 0}
.pb summary{cursor:pointer;font-weight:800;min-height:44px;display:flex;align-items:center}
.pb-voc{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.pb-voc button{border:none;background:var(--card);box-shadow:var(--shadow);border-radius:14px;padding:8px 10px;text-align:left;font:inherit;color:var(--text);cursor:pointer;min-height:44px}
.pb-voc b{display:block}.pb-voc small{color:var(--muted);font-size:.82em}
.pb-empty{color:var(--muted);text-align:center;margin:30px 0}
.pb-full{position:fixed;inset:0;z-index:300;background:var(--card);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;cursor:pointer}
.pb-full .big{font-size:var(--pbz,clamp(2.8rem,15vw,7rem));font-weight:800;line-height:1.25;word-break:break-all;font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif}
.pb-full .kk{font-size:1.5rem;color:var(--muted);margin-top:12px}
.pb-full .zz{font-size:1.3rem;color:var(--muted);margin-top:18px}
.pb-full .x{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;width:48px;height:48px;border-radius:50%;border:1px solid var(--line2);background:var(--card);color:var(--text);font-size:1.3em;cursor:pointer}
.pb-full .tip{position:absolute;bottom:calc(20px + env(safe-area-inset-bottom,0px));font-size:.9rem;color:var(--muted)}`;
    document.head.appendChild(s);
  })();

  const scenes = () => (window.SCENES || []).filter(s => s && s.id);
  const sceneOf = id => scenes().find(s => s.id === id);
  let KEYS = [];
  const key = (w, sc) => { KEYS.push({ w, sc }); return KEYS.length - 1; };
  function row(w, sc) {
    const k = key(w, sc), it = App.wordItem(w, sc.name, 'phrase');
    return `<div class="pb-row"><button type="button" class="pb-say" data-say="${k}" aria-label="播放">🔊</button>
      <div class="pb-t"><p class="jp" lang="ja">${esc(w.jp)}</p>${w.kana && w.kana !== w.jp ? `<p class="k" lang="ja">${esc(w.kana)}</p>` : ''}<p class="zh">${esc(w.zh)}</p>${w.use ? `<p class="use">🕒 ${esc(w.use)}</p>` : ''}</div>
      <div class="pb-act"><button type="button" class="pb-show" data-show="${k}" aria-label="放大給店員看">📢</button>${App.trackBtn(it, true)}</div></div>`;
  }
  const vocab = (w, sc) => { const k = key(w, sc); return `<button type="button" data-say="${k}"><b lang="ja">${esc(w.jp)}</b><small>${esc(w.kana && w.kana !== w.jp ? w.kana + '・' : '')}${esc(w.zh)}</small></button>`; };
  const norm = t => String(t || '').toLowerCase();

  function list() {
    KEYS = [];
    const q = norm(UI.q).trim();
    if (q) {
      const hit = w => [w.jp, w.kana, w.romaji, w.zh, w.use].some(x => norm(x).includes(q));
      const ph = [], vo = [], seen = new Set();   // 同一句出現在多個場景只列一次
      const add = (arr, w, sc, k) => { const id = k + (w.jp || '').replace(/[。！？!?\s]/g, ''); if (seen.has(id)) return; seen.add(id); arr.push([w, sc]); };
      scenes().forEach(sc => { (sc.phrases || []).filter(hit).forEach(w => add(ph, w, sc, 'p:')); (sc.vocab || []).filter(hit).forEach(w => add(vo, w, sc, 'v:')); });
      if (!ph.length && !vo.length) return `<p class="pb-empty">找不到「${esc(UI.q)}」，換個關鍵字試試（中文、日文、羅馬拼音都可以）</p>`;
      return (ph.length ? `<h2>💬 句子（${ph.length}）</h2>` + ph.slice(0, 60).map(([w, sc]) => row(w, sc)).join('') : '') +
        (vo.length ? `<h2>📚 單字（${vo.length}）</h2><div class="pb-voc">${vo.slice(0, 60).map(([w, sc]) => vocab(w, sc)).join('')}</div>` : '');
    }
    const cat = CATS.find(c => c[0] === UI.cat) || CATS[0];
    return cat[2].map(sceneOf).filter(Boolean).map(sc => `<h2>${esc(sc.icon || '')} ${esc(sc.name)}</h2>
      ${(sc.phrases || []).map(w => row(w, sc)).join('')}
      <details><summary>📚 常用單字 ${(sc.vocab || []).length} 個</summary><div class="pb-voc">${(sc.vocab || []).map(w => vocab(w, sc)).join('')}</div></details>`).join('');
  }

  function showBig(w) {
    const d = document.createElement('div');
    d.className = 'pb-full';
    // 字數少就放到最大：依字數算字級（手機橫寬約可放 6～7 字一行）
    const len = String(w.jp).length;
    d.style.setProperty('--pbz', `min(${len <= 4 ? 22 : len <= 8 ? 15 : len <= 14 ? 11 : 8.5}vw, ${len <= 4 ? 9 : 6}rem)`);
    d.innerHTML = `<button type="button" class="x" aria-label="關閉">✕</button><div class="big" lang="ja">${esc(w.jp)}</div>${w.kana && w.kana !== w.jp ? `<div class="kk" lang="ja">${esc(w.kana)}</div>` : ''}<div class="zz">${esc(w.zh)}</div><div class="tip">點一下或按返回鍵關閉${App.voiceOK && App.voiceOK() === false ? '' : '・🔊 已播放'}</div>`;
    const close = App.layer ? App.layer(d) : (document.body.appendChild(d), () => d.remove());
    d.onclick = () => close();
    App.speak(w.kana || w.jp);
  }

  function render(el) {
    el.innerHTML = `<section class="pb">
      <h1>📖 旅遊會話手冊</h1>
      <input class="pb-search" type="search" placeholder="搜尋：廁所、多少錢、いくら、toire…" value="${esc(UI.q)}" aria-label="搜尋會話">
      <div class="pb-cats">${CATS.map(([id, n]) => `<button type="button" data-cat="${id}" class="${id === 'emer' ? 'emer ' : ''}${!UI.q && UI.cat === id ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div id="pb-list"></div>${App.voiceHTML ? App.voiceHTML() : ''}</section>`;
    const box = el.querySelector('#pb-list');
    const paint = () => {
      box.innerHTML = list();
      el.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('on', !UI.q && b.dataset.cat === UI.cat));
    };
    box.onclick = e => {
      const s = e.target.closest('[data-say]'), b = e.target.closest('[data-show]');
      if (s) { const { w } = KEYS[+s.dataset.say]; App.speak(w.kana || w.jp); }
      if (b) showBig(KEYS[+b.dataset.show].w);
    };
    const inp = el.querySelector('.pb-search');
    inp.oninput = () => { UI.q = inp.value; paint(); };
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { UI.cat = b.dataset.cat; UI.q = ''; inp.value = ''; paint(); window.scrollTo(0, 0); });
    paint();
  }

  App.register('phrasebook', { title: '手冊', icon: '📖', nav: false, navParent: 'home', render });
})();
