/* =========================================================
   日語冒險 — 間隔複習 review.js
   路由：review（nav:false，navParent me；從「我的」今日到期進入）
   複習一律走統一活動框架（act 路由：flashcard 自評 4 鍵／choice 四選一，由 runner 呼叫 Learn.record）；
   今日到期＝Learn.due(15)（與首頁今日課同一函式）。清單、篩選、匯出入、列印收在「⋯ 更多」。
   依賴：App、Learn、Tracker（core.js）
   ========================================================= */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const g = name => { try { return W[name] !== undefined ? W[name] : eval(name); } catch (e) { return undefined; } };

  /* ---------------- 樣式（只用 tokens.css 變數） ---------------- */
  const CSS = `
.rv{max-width:720px;margin:0 auto}
.rv-h{margin:0 0 var(--sp-2)}
.rv-stats{display:flex;gap:var(--sp-2);margin:0 0 var(--sp-3)}
.rv-stat{flex:1;text-align:center;background:var(--chip);border-radius:var(--r-m);padding:var(--sp-2) 4px;font-size:var(--fs-sm)}
.rv-stat b{display:block;font-size:var(--fs-xl);color:var(--pri-d);line-height:1.2}
.rv-go{display:flex;flex-direction:column;align-items:center;min-height:56px;font-size:var(--fs-lg)}
.rv-go small{font-weight:500;font-size:var(--fs-sm);color:var(--on-pri-2)}
.rv-alt{margin-top:var(--sp-2);min-height:48px}
.rv-next{background:var(--acc-t);border-radius:var(--r-m);padding:var(--sp-2) var(--sp-3);margin:0 0 var(--sp-3);font-size:var(--fs-sm)}
.rv-info{font-size:var(--fs-sm);color:var(--muted);margin:var(--sp-2) 0 0}
.rv-more{margin:var(--sp-3) 0 0}
.rv-more>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px;font-weight:700;color:var(--muted);list-style:none}
.rv-more>summary::-webkit-details-marker{display:none}
.rv-tools{display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:center;margin:var(--sp-2) 0}
.rv-tools input[type=search],.rv-tools select{padding:7px 12px;border:2px solid var(--line);border-radius:var(--r-pill);font:inherit;font-size:var(--fs-md);background:var(--card);color:var(--text);min-height:44px}
.rv-tools input[type=search]{flex:1;min-width:160px}
.rv-tools label{min-height:44px;display:inline-flex;align-items:center;gap:4px;font-size:var(--fs-sm)}
.rv-chip{cursor:pointer;font-family:inherit;min-height:44px;color:var(--text)}
.rv-chip.rv-on{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}
.rv-list{display:flex;flex-direction:column;gap:var(--sp-2)}
.rv-item{display:flex;align-items:center;gap:var(--sp-2);background:var(--card);border:2px solid var(--line);border-radius:var(--r-m);padding:var(--sp-2) var(--sp-3)}
.rv-item.rv-done{opacity:.6;background:var(--acc-t)}
.rv-main{flex:1;min-width:0}
.rv-jp{font-size:var(--fs-lg);font-weight:700}
.rv-sub{color:var(--muted);font-size:var(--fs-sm);margin-left:6px}
.rv-zh{font-size:var(--fs-sm)}
.rv-meta{font-size:var(--fs-xs);color:var(--muted)}
.rv-due{display:inline-block;font-size:var(--fs-xs);border-radius:var(--r-pill);padding:0 8px;background:var(--chip);color:var(--muted)}
.rv-due.now{background:var(--pri-t);color:var(--pri-d);font-weight:700}
.rv-ops{display:flex;gap:4px;flex:none}
.rv-ops button{min-width:44px;min-height:44px}
.rv-empty{text-align:center;padding:30px 16px}
.rv-big{font-size:4em}
.rv-printhead{display:none}
@media print{
  body.rv-printing #main>*:not(.rv){display:none!important}
  body.rv-printing .rv>.panel:first-child,body.rv-printing .rv-ops,body.rv-printing .noprint{display:none!important}
  body.rv-printing .rv-printhead{display:block}
  .rv-item{break-inside:avoid;border:1px solid var(--line2)}
}`;
  if (typeof document !== 'undefined') {
    const old = document.getElementById('css-review'); if (old) old.remove();
    const st = document.createElement('style');
    st.id = 'css-review';
    st.textContent = CSS;
    (document.head || document.body || document.documentElement).appendChild(st);
  }

  const esc = s => App.esc(s);

  /* ---------------- 羅馬拼音寬鬆比對 ---------------- */
  const MACRON = { 'ā': 'aa', 'ī': 'ii', 'ū': 'uu', 'ē': 'ee', 'ō': 'oo', 'â': 'aa', 'î': 'ii', 'û': 'uu', 'ê': 'ee', 'ô': 'oo' };
  function normRomaji(s) {
    s = String(s == null ? '' : s).toLowerCase();
    s = s.replace(/[āīūēōâîûêô]/g, c => MACRON[c]);
    s = s.normalize ? s.normalize('NFKD').replace(/[̀-ͯ]/g, '') : s;
    s = s.replace(/[^a-z]/g, '');               // 空白、標點、長音符號 - ー ' 全去掉
    // 訓令式 → 平文式
    s = s.replace(/sy/g, 'sh').replace(/ty/g, 'ch').replace(/[zj]y/g, 'j')
      .replace(/si/g, 'shi').replace(/ti/g, 'chi').replace(/tu/g, 'tsu').replace(/zi/g, 'ji')
      .replace(/(^|[^sc])hu/g, '$1fu').replace(/du/g, 'zu').replace(/di/g, 'ji');
    s = s.replace(/m(?=[bp])/g, 'n');             // shimbun = shinbun
    s = s.replace(/ou/g, 'o').replace(/oh(?![aiueoy])/g, 'o');  // 長音：ou / oh → o
    s = s.replace(/([aiueo])\1+/g, '$1');          // aa/ii/uu/ee/oo → 單一
    return s;
  }
  function romajiMatch(input, expected) {
    const a = normRomaji(input);
    if (!a) return false;
    // 整句（含逗號）先比；助詞 wa／e／o 也接受照字面打 ha／he／wo
    const ex = String(expected || ''), alt = e => [e, e.replace(/\bwa\b/g, 'ha').replace(/\be\b/g, 'he').replace(/\bo\b/g, 'wo')];
    return [ex].concat(ex.split(/[\/／|｜,，、;；]|\bor\b/)).flatMap(alt).some(e => { const b = normRomaji(e); return b && a === b; });
  }

  // 假名 → 羅馬拼音（item 沒有 romaji 時的備援）
  let K2R = null;
  // 「o (wo)」「hu／fu」這類註記只取第一個讀法，避免拼成「moufuo (wo)nimai」
  const cleanRom = r => String(r || '').trim().split(/[\s(（/／]/)[0];
  function kanaToRomaji(str) {
    if (!K2R) {
      K2R = {};
      [g('KANA'), g('DAKU'), g('YOON')].forEach(t => (t || []).forEach(r => { if (r && r[0]) { const v = cleanRom(r[2]); K2R[r[0]] = v; if (r[1]) K2R[r[1]] = v; } }));
    }
    let out = '', dbl = false;
    for (let i = 0; i < str.length; i++) {
      const two = str.substr(i, 2), one = str[i];
      let r;
      if (K2R[two]) { r = K2R[two]; i++; }
      else if (one === 'っ' || one === 'ッ') { dbl = true; continue; }
      else if (one === 'ー') { r = out.slice(-1); }
      else if (K2R[one]) r = K2R[one];
      else if (/[\s、。！？!?]/.test(one)) r = ' ';
      else return '';                               // 含漢字等無法轉換
      if (dbl && r) { r = (r.startsWith('ch') ? 't' : r[0]) + r; dbl = false; }
      out += r;
    }
    return out.trim();
  }
  // 句子／單字的羅馬字一律走 Phrase.romaji（分詞、助詞 wa／e／o、數字分段），與冒險、手冊同一套；五十音卡用卡上的讀音
  const PR = (k, jp) => { try { return W.Phrase && W.Phrase.romaji ? W.Phrase.romaji(k, jp) : ''; } catch (e) { return ''; } };
  const romajiOf = it => {
    if (isKana(it)) return (it.romaji ? cleanRom(it.romaji) : '') || kanaToRomaji(String(it.kana || it.jp || '').split('・')[0]);
    const kanaJp = /^[぀-ヿ・ー\s、。！？〜]+$/.test(it.jp || '') ? String(it.jp).split('・')[0] : '';
    return (it.kana ? PR(it.kana, it.jp) : '') || (kanaJp ? PR(kanaJp, kanaJp) : '') || it.romaji || (it.kana ? kanaToRomaji(it.kana) : '');
  };

  /* ---------------- UI 狀態（換頁保留） ---------------- */
  const ui = { src: '', q: '', sort: 'new', showMastered: false, every: false, open: false, shown: 10 };
  // 清單來源：預設＝不會清單（Tracker）；勾「全部學過的」＝統一進度裡所有學過的項目
  const pool = inclM => ui.every ? Learn.views(e => e.s !== 'new' && (inclM || e.s !== 'mastered')).sort((a, b) => b.added - a.added) : Tracker.list(inclM);
  const DAY = 864e5;
  const DUE_N = 15;   // 與首頁今日課相同：最多 15 個
  function dueText(t) {
    if (t.mastered) return '🎓 已掌握';
    const d = (t.due || 0) - Date.now();
    if (d <= 0) return '<span class="rv-due now">⏰ 今天</span>';
    const n = Math.ceil(d / DAY);
    return `<span class="rv-due">📅 ${n <= 1 ? '明天' : n + ' 天後'}</span>`;
  }
  function nextDue() {
    const L = App.state.learn || {}, now = Date.now();
    let best = null;
    for (const id in L) { const e = L[id]; if (e.s !== 'new' && (e.reps || e.star || e.lapses) && (e.due || 0) > now && (!best || e.due < L[best].due)) best = id; }
    return best ? Learn.view(best) : null;
  }
  const isKana = it => String(it.id || '').startsWith('kana:');
  const speakItem = it => App.speak(it.kana || String(it.jp || '').split('・')[0]);

  function filtered() {
    let arr = pool(ui.showMastered);
    if (ui.src) arr = arr.filter(t => (t.source || '其他') === ui.src);
    const q = ui.q.trim().toLowerCase();
    if (q) {
      const qr = normRomaji(q);
      arr = arr.filter(t => [t.jp, t.kana, t.romaji, t.zh, t.hint].some(v => String(v || '').toLowerCase().includes(q)) ||
        (qr && normRomaji(t.romaji || '').includes(qr)));
    }
    arr = arr.slice();
    if (ui.sort === 'wrong') arr.sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || (a.streak || 0) - (b.streak || 0));
    else if (ui.sort === 'old') arr.sort((a, b) => (a.seen || 0) - (b.seen || 0) || (a.added || 0) - (b.added || 0));
    else arr.sort((a, b) => (b.added || 0) - (a.added || 0));
    return arr;
  }

  /* ---------------- 要複習的 id ---------------- */
  // 到期：Learn.due(15)（首頁今日課同一函式）；沒有到期 → 提前複習：最快到期的 10 個（未掌握）
  function runIds() {
    const due = Learn.due(DUE_N);
    if (due.length) return { ids: due, early: false };
    const L = App.state.learn || {};
    const ids = Object.keys(L).filter(id => { const e = L[id]; return e.s !== 'new' && e.s !== 'mastered' && (e.reps || e.star || e.lapses); })
      .sort((a, b) => (L[a].due || 0) - (L[b].due || 0)).slice(0, 10);
    return { ids, early: true };
  }
  function start(type) {
    const r = runIds();
    if (!r.ids.length) return App.go('path');
    App.go('act', { type, ids: r.ids, title: type === 'choice' ? '複習・選擇題' : '複習', back: { route: 'review', params: {} } });
  }

  /* ---------------- 主頁面 ---------------- */
  function render(el) {
    const st = Learn.stats();
    if (!st.learning && !st.review && !st.mastered && !Tracker.list(true).length) {
      el.innerHTML = `<div class="panel rv-empty">
        <div class="rv-big" aria-hidden="true">📌</div>
        <h2>還沒有要複習的</h2>
        <p>上課、路線單元學過的字句，會照「答對越多次、隔越久」自動排進這裡。</p>
        <button type="button" class="btn primary" data-go="path">🧭 去路線學新的</button>
      </div>`;
      el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go(b.dataset.go));
      return;
    }
    const r = runIds(), n = r.ids.length, nd = r.early ? nextDue() : null;
    const when = nd ? (() => { const d = new Date(nd.due); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : '';
    if (ui.src && !pool(true).some(t => (t.source || '其他') === ui.src)) ui.src = '';
    el.innerHTML = `<div class="rv">
      <div class="panel">
        <h2 class="rv-h">📌 複習</h2>
        <div class="rv-stats"><div class="rv-stat"><b>${r.early ? 0 : n}</b>今天到期</div><div class="rv-stat"><b>${st.learning + st.review}</b>學習中</div><div class="rv-stat"><b>${st.mastered}</b>已掌握 🎓</div></div>
        ${r.early ? `<div class="rv-next">🎉 今天到期的都複習完了！${nd ? `下一個：<b class="jp" lang="ja">${esc(nd.jp)}</b>（${when}）` : ''}</div>` : ''}
        ${n ? `<button type="button" class="btn primary block rv-go" data-run="flashcard">▶ ${r.early ? '提前複習' : '開始複習'} ${n} 個<small>字卡：想一想→翻面→自評 4 級</small></button>
        <button type="button" class="btn block rv-alt" data-run="choice">✏️ 改用選擇題複習</button>` : `<button type="button" class="btn primary block rv-go" data-go="path">🧭 去路線學新的</button>`}
        <p class="rv-info">答對越多次，隔越久再出現；上課、路線、店家學過的到期都會排進來。</p>
      </div>
      <details class="panel rv-more"${ui.open ? ' open' : ''}><summary class="noprint">⋯ 更多：清單、篩選、匯出入、列印</summary>
        <div class="rv-printhead"><h2>📌 日語不會清單</h2><div class="muted" id="rvPrintInfo"></div></div>
        <div class="rv-tools noprint">
          <input type="search" id="rvQ" placeholder="🔍 搜尋日文／假名／拼音／中文" aria-label="搜尋清單">
          <select id="rvSort" aria-label="排序"><option value="new">最新加入</option><option value="wrong">錯最多</option><option value="old">最久未複習</option></select>
        </div>
        <div class="rv-tools noprint">
          <label><input type="checkbox" id="rvShowM"> 顯示已掌握</label>
          <label><input type="checkbox" id="rvEvery"> 全部學過的</label>
        </div>
        <div class="chips noprint" id="rvChips"></div>
        <div class="rv-list" id="rvList"></div>
        <div class="rv-tools noprint">
          <button type="button" class="btn sm ghost" data-act="clearM">🧹 清除已掌握</button>
          <button type="button" class="btn sm ghost" data-act="export">📤 匯出</button>
          <button type="button" class="btn sm ghost" data-act="import">📥 匯入</button>
          <button type="button" class="btn sm ghost" data-act="print">🖨️ 列印</button>
        </div>
      </details>
      ${App.voiceHTML ? App.voiceHTML() : ''}
    </div>`;
    el.querySelectorAll('[data-run]').forEach(b => b.onclick = () => start(b.dataset.run));
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go(b.dataset.go));
    const det = el.querySelector('.rv-more');
    det.ontoggle = () => { ui.open = det.open; if (det.open) refresh(el); };
    const q = el.querySelector('#rvQ'); q.value = ui.q;
    q.oninput = () => { ui.q = q.value; ui.shown = 10; refresh(el); };
    const so = el.querySelector('#rvSort'); so.value = ui.sort;
    so.onchange = () => { ui.sort = so.value; refresh(el); };
    const sm = el.querySelector('#rvShowM'); sm.checked = ui.showMastered;
    sm.onchange = () => { ui.showMastered = sm.checked; refresh(el); };
    const ev = el.querySelector('#rvEvery'); ev.checked = ui.every;
    ev.onchange = () => { ui.every = ev.checked; ui.src = ''; ui.shown = 10; refresh(el); };
    el.querySelectorAll('[data-act]').forEach(b => {
      const a = b.dataset.act;
      if (a === 'export') b.onclick = doExport;
      else if (a === 'import') b.onclick = () => doImport(el);
      else if (a === 'print') b.onclick = () => { const s = ui.shown; ui.shown = 1e9; refresh(el); doPrint(() => { ui.shown = s; if (det.isConnected) refresh(el); }); };
      else if (a === 'clearM') b.onclick = () => {
        const n = Tracker.list(true).filter(t => t.mastered).length;
        if (!n) return App.toast('目前沒有已掌握的項目');
        App.modal(`<h2>清除已掌握？</h2><p>將從不會清單移除 <b>${n}</b> 個已掌握的項目。</p>`,
          [{ label: '取消' }, { label: '清除', cls: 'primary', onClick: () => { Tracker.clearMastered(); App.toast(`🧹 已清除 ${n} 項`, 'ok'); render(el); } }]);
      };
    });
    if (ui.open) refresh(el);
  }

  function refresh(el) {
    const chips = el.querySelector('#rvChips'); if (!chips) return;
    const by = {}, cur = pool(ui.showMastered);
    cur.forEach(t => { const s = t.source || '其他'; by[s] = (by[s] || 0) + 1; });
    const srcs = Object.keys(by).sort((a, b) => by[b] - by[a]);
    chips.innerHTML = srcs.length > 1 ? `<button type="button" class="chip rv-chip ${ui.src ? '' : 'rv-on'}" data-src="">全部 ${cur.length}</button>` +
      srcs.slice(0, 5).map(s => `<button type="button" class="chip rv-chip ${ui.src === s ? 'rv-on' : ''}" data-src="${esc(s)}">${esc(s)} ${by[s]}</button>`).join('') : '';
    chips.querySelectorAll('[data-src]').forEach(c => c.onclick = () => { ui.src = ui.src === c.dataset.src ? '' : c.dataset.src; ui.shown = 10; refresh(el); });
    const list = filtered(), show = list.slice(0, ui.shown);
    const box = el.querySelector('#rvList');
    box.innerHTML = list.length ? show.map(itemHTML).join('') + (list.length > show.length ? `<button type="button" class="btn block ghost noprint" data-moreitems="1">再顯示 ${Math.min(10, list.length - show.length)} 個（共 ${list.length}）</button>` : '')
      : `<p class="rv-info">${ui.every || ui.showMastered ? '沒有符合的項目' : '不會清單是空的（答錯的字會自動加入；勾「全部學過的」可看全部）'}</p>`;
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.moreitems) { ui.shown += 10; return refresh(el); }
      if (b.dataset.say) { const t = Learn.view(b.dataset.say); if (t) speakItem(t); }
      if (b.dataset.del) {
        const t = Learn.view(b.dataset.del); if (!t) return;
        App.modal(`<h2>從不會清單移除？</h2><p class="jp" lang="ja">${esc(t.jp)}</p><p>${esc(t.zh)}</p><p class="muted">學習進度保留，到期仍會出現在複習。</p>`,
          [{ label: '取消' }, { label: '🗑 移除', cls: 'primary', onClick: () => { Tracker.remove(t.id); App.toast('已移除'); refresh(el); } }]);
      }
    };
    const pi = el.querySelector('#rvPrintInfo');
    if (pi) pi.textContent = `共 ${list.length} 項${ui.src ? '・來源：' + ui.src : ''}・${new Date().toLocaleDateString()}`;
  }

  function itemHTML(t) {
    const rom = isKana(t) ? '' : romajiOf(t), inL = Learn.inList ? Learn.inList(t.id) : false;
    return `<div class="rv-item ${t.mastered ? 'rv-done' : ''}">
      <div class="rv-main">
        <div><span class="rv-jp jp" lang="ja">${esc(t.jp)}</span>${t.kana && t.kana !== t.jp ? `<span class="rv-sub jp" lang="ja">${esc(t.kana)}</span>` : ''}${rom ? `<span class="rv-sub">${esc(rom)}</span>` : ''}</div>
        <div class="rv-zh">${esc(t.zh)}</div>
        <div class="rv-meta">${esc(t.source || '其他')}・✅ ${t.right || 0} ❌ ${t.wrong || 0}・${dueText(t)}</div>
      </div>
      <div class="rv-ops noprint"><button type="button" class="btn sm ghost" data-say="${esc(t.id)}" aria-label="發音">🔊</button>${inL ? `<button type="button" class="btn sm ghost" data-del="${esc(t.id)}" aria-label="從不會清單移除">🗑</button>` : ''}</div>
    </div>`;
  }

  /* ---------------- 匯出 / 匯入 / 列印 ---------------- */
  function doExport() {
    const txt = Tracker.exportJSON();
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const name = `不會清單-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
    try {
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      App.toast(`📤 已匯出 ${Tracker.list(true).length} 項`, 'ok');
    } catch (e) { }
    try { navigator.clipboard && navigator.clipboard.writeText(txt).then(() => App.toast('📋 清單也已複製，可貼到記事本保存'), () => { }); } catch (e) { }
  }
  function doImport(el) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { const n = Tracker.importJSON(String(rd.result)); App.toast(`📥 匯入 ${n} 個新項目`, 'ok'); render(el); }
        catch (e) { App.toast('匯入失敗：檔案格式不正確'); }
      };
      rd.readAsText(f, 'utf-8');
    };
    inp.click();
  }
  function doPrint(after) {
    document.body.classList.add('rv-printing');
    let done = false;
    const off = () => { if (done) return; done = true; document.body.classList.remove('rv-printing'); W.removeEventListener && W.removeEventListener('afterprint', off); if (after) after(); };
    W.addEventListener && W.addEventListener('afterprint', off);
    W.print && W.print();
    setTimeout(off, 1500);
  }

  App.register('review', { title: '複習', icon: '📌', nav: false, navParent: 'me', render });

  // 供測試／其他模組使用
  W.ReviewAPI = { normRomaji, romajiMatch, kanaToRomaji, romajiOf, dueIds: () => Learn.due(DUE_N) };
})();
