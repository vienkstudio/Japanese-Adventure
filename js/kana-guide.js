/* =========================================================
   入門講義與 50 音訓練表（v15）：把 日文講義.html、50音訓練表.html 原樣收進 App，不再另開頁面。
   路由 kana-guide（講義）、kana-drill（訓練表）{then?:'today'|unit id}
   做法：fetch 原檔 → 放進 Shadow DOM（樣式不會和 App 互相影響）→ 以 document 代理執行原檔腳本（getElementById／querySelectorAll 只找這頁）。
   原檔內的互連連結（日文講義.html ⇄ 50音訓練表.html）改成 App 路由；頁尾加「下一步」：講義 → 訓練表 → 分行單元（或今日課）。
   初學者引導 window.KanaPrep：
     done() -> 講義與訓練表都看過（App.state.kanaPrep = {guide, drill, skip}）
     need() -> 恆為 false（舊介面相容）；mini() -> 五十音分頁兩張小卡；bind(el, then) 綁定按鈕
   本檔由 index.html 直接載入（很小）；原檔腳本要的 KANA、speak 等在 render 時補載 kana-data.js。
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  const SRC = { 'kana-guide': '日文講義.html', 'kana-drill': '50音訓練表.html' };
  const st = () => { const S = App.state; if (!S.kanaPrep || typeof S.kanaPrep !== 'object') S.kanaPrep = {}; return S.kanaPrep; };
  const KanaPrep = {
    state: st,
    done: () => { const s = st(); return !!(s.skip || (s.guide && s.drill)); },
    need: () => false,   // 講義、訓練表改為選讀，不再擋今日課與單元
    mark(k) { st()[k] = Date.now(); App.save(); },
    // 五十音分頁常駐兩張小卡（選讀：講義、訓練表）
    mini() { return `<div class="kp-mini"><button type="button" data-kp="guide">🎓 入門講義</button><button type="button" data-kp="drill">🎯 50 音訓練表</button></div>`; },
    bind(el, then, onSkip) {
      el.querySelectorAll('[data-kp]').forEach(b => b.onclick = () => {
        const k = b.dataset.kp;
        if (k === 'skip') { KanaPrep.mark('skip'); return onSkip ? onSkip() : App.render(); }
        App.go(k === 'guide' ? 'kana-guide' : 'kana-drill', then ? { then } : {});
      });
    }
  };
  window.KanaPrep = KanaPrep;
  // 舊模組裡的 <a href="日文講義.html">、<a href="50音訓練表.html"> 一律改在 App 內開
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const h = decodeURIComponent(a.getAttribute('href') || '');
    const to = h === '日文講義.html' ? 'kana-guide' : h === '50音訓練表.html' ? 'kana-drill' : '';
    if (to) { e.preventDefault(); App.go(to); }
  });

  // 原檔快取（同一份只抓一次）
  const CACHE = {};
  const fetchDoc = f => CACHE[f] || (CACHE[f] = fetch(encodeURI(f)).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).catch(e => { delete CACHE[f]; throw e; }));
  // 原檔樣式：:root／html／body 換成 shadow 內的容器
  const scopeCSS = css => css.replace(/:root\b/g, ':host').replace(/(^|[}\s,])html\s*\{/g, '$1:host{').replace(/(^|[}\s,])body(?=[\s{,:.])/g, '$1.kg-body');
  const KEYS = new Set();   // 原檔掛在 document 的 keydown：離開頁面後失效

  function render(el, params, name) {
    params = params || {};
    const f = SRC[name];
    el.innerHTML = `<section class="kg"><div class="kg-host"></div><div class="kg-next"></div></section>`;   // .kg-next 固定在底部導覽上方
    const host = el.querySelector('.kg-host'), next = el.querySelector('.kg-next');
    host.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>';
    Promise.all([fetchDoc(f), typeof KANA === 'undefined' ? App.loadScript('kana-data.js') : 0]).then(([html]) => {
      if (!host.isConnected) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
      const code = [...doc.querySelectorAll('script:not([src])')].map(s => s.textContent).join('\n;\n');
      doc.querySelectorAll('script, style').forEach(s => s.remove());
      host.innerHTML = '';
      const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
      const fs = document.documentElement.dataset.fs; if (fs) host.classList.add('fs-' + fs);   // 大字：表格縮字、不切掉右欄
      root.innerHTML = `<style>${scopeCSS(css)}
        :host{display:block}.kg-body{min-height:0!important;border-radius:16px;overflow-x:auto}
        .kg-body table{table-layout:fixed;width:100%}.kg-body td,.kg-body th{overflow-wrap:anywhere}
        :host(.fs-l) table{font-size:.9em}:host(.fs-xl) table{font-size:.78em}:host(.fs-xl) .grid td{padding:4px 2px!important}
        .kg-body a.btn[href$=".html"],.kg-body p.noprint:has(a.btn){display:none!important}
        .kg-body .wrap{padding:16px 12px!important}
        @media(max-width:420px){.kg-body h1{font-size:1.6em!important}.kg-body section{padding:16px 14px!important}}</style>
        <div class="kg-body">${doc.body.innerHTML}</div>`;
      // 原檔互連連結 → App 路由
      root.querySelectorAll('a[href]').forEach(a => {
        const h = decodeURIComponent(a.getAttribute('href') || '');
        const to = h === '日文講義.html' ? 'kana-guide' : h === '50音訓練表.html' ? 'kana-drill' : '';
        if (to) a.onclick = e => { e.preventDefault(); if (to === 'kana-drill') KanaPrep.mark('guide'); App.go(to, params.then ? { then: params.then } : {}); };
        else if (h.startsWith('#')) a.onclick = e => { e.preventDefault(); const t = root.getElementById ? root.getElementById(h.slice(1)) : root.querySelector(h); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      });
      // 以代理 document 執行原檔腳本（speak 等用全域 kana-data.js）
      const D = {
        getElementById: id => root.getElementById ? root.getElementById(id) : root.querySelector('#' + id),
        querySelector: s => root.querySelector(s), querySelectorAll: s => root.querySelectorAll(s),
        createElement: (...a) => document.createElement(...a), createTextNode: t => document.createTextNode(t),
        addEventListener: (t, fn, o) => { const w = e => { if (!host.isConnected) { document.removeEventListener(t, w, o); KEYS.delete(w); return; } if (e.target && e.target.closest && e.target.closest('input,textarea,select') && e.target.getRootNode() === document) return; fn(e); }; KEYS.add(w); document.addEventListener(t, w, o); },
        get body() { return root; }, get documentElement() { return document.documentElement; }
      };
      try { new Function('document', code)(D); } catch (e) { console.error(e); }
      // 訓練表測驗：答對／答錯接全站音效與學習紀錄（kana:あ）
      if (name === 'kana-drill') root.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#qc button'); if (!b) return;
        const ok = b.classList.contains('ok'), ng = b.classList.contains('ng'); if (!ok && !ng) return;
        const fb = (root.getElementById ? root.getElementById('qfb') : root.querySelector('#qfb')) || {};
        const m = String(fb.textContent || '').match(/(?:正確！|答案是\s*)([ぁ-ゖ]+)/);
        if (window.Game && Game.sfx) Game.sfx(ok ? 'ok' : 'ng');
        if (m && window.Learn && Learn.record) Learn.record('kana:' + m[1], ok ? 2 : 0, { type: 'kana', m: { jp: m[1], kana: m[1], source: '🎯 50 音訓練表' } });
      });
    }).catch(() => { if (host.isConnected) host.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
    // 頁尾：下一步
    const then = params.then || '';
    // 下一步：今日課；或路線上下一個還沒學完的分行（あ行、か行都學過就不再寫「第一課」）
    const nx = (() => { try { return window.Path && Path.nextUnit ? Path.nextUnit('kana') : null; } catch (e) { return null; } })();
    const startTxt = then === 'today' ? '開始今天的課' : then ? '回到單元' : nx ? '開始 ' + String(nx.title).split('：')[0] : '開始あ行';
    const goStart = () => then && then !== 'today' ? App.go('path-unit', { id: then }) : then === 'today' ? App.go('today') : App.go('path-unit', { id: nx ? nx.id : 'kana-k1' });
    if (name === 'kana-guide') {
      next.innerHTML = `<button type="button" class="btn primary block" data-n="drill">下一步：50 音訓練表 →</button>`;
      next.querySelector('[data-n]').onclick = () => { KanaPrep.mark('guide'); App.go('kana-drill', then ? { then } : {}); };
    } else {
      next.innerHTML = `<button type="button" class="btn primary block" data-n="go">${esc(startTxt)} →</button>`;   // 底部條只放一顆滿寬按鈕（評審 v16 P1）
      next.querySelector('[data-n=go]').onclick = () => { KanaPrep.mark('drill'); goStart(); };
    }
  }
  App.register('kana-guide', { title: '入門講義', icon: '🎓', nav: false, navParent: 'path', render: (el, p) => render(el, p, 'kana-guide') });
  App.register('kana-drill', { title: '50 音訓練表', icon: '🎯', nav: false, navParent: 'path', render: (el, p) => render(el, p, 'kana-drill') });
})();
