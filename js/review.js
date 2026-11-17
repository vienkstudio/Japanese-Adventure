/* =========================================================
   日語冒險 — 不會清單 / 間隔複習 review.js
   路由：review（nav:true，📌，不會清單）
   依賴：App、Tracker（core.js）；選用 KANA/DAKU/YOON、SCENES 作干擾項
   ========================================================= */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const g = name => { try { return W[name] !== undefined ? W[name] : eval(name); } catch (e) { return undefined; } };

  /* ---------------- 樣式 ---------------- */
  const CSS = `
.rv-stats{display:flex;gap:10px;flex-wrap:wrap}
.rv-stat{flex:1;min-width:110px;text-align:center;background:var(--soft);border-radius:12px;padding:8px}
.rv-stat b{display:block;font-size:1.8em;color:var(--red);line-height:1.2}
.rv-chip{cursor:pointer;font-family:inherit}
.rv-chip{min-height:44px;color:var(--text)}
.rv-chip.rv-on{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}
.rv-due{display:inline-block;font-size:.82em;border-radius:999px;padding:0 8px;background:var(--chip);color:var(--muted);margin-top:2px}
.rv-due.now{background:var(--pri-t);color:var(--pri-d);font-weight:700}
.rv-next{background:var(--acc-t);border-radius:14px;padding:10px 12px;margin:8px 0}
.rv-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.rv-tools input[type=search],.rv-tools select{padding:7px 12px;border:2px solid var(--line);border-radius:20px;font-family:inherit;font-size:1em;background:var(--card)}
.rv-tools input[type=search]{flex:1;min-width:180px}
.rv-list{display:flex;flex-direction:column;gap:8px}
.rv-item{display:flex;align-items:center;gap:12px;background:var(--card);border:2px solid var(--line);border-radius:14px;padding:10px 12px;flex-wrap:wrap}
.rv-item.rv-done{opacity:.6;background:var(--acc-t)}
.rv-emo{font-size:1.9em;width:1.6em;text-align:center}
.rv-main{flex:1;min-width:180px}
.rv-jp{font-size:1.45em;cursor:pointer;font-weight:bold}
.rv-jp:hover{color:var(--blue)}
.rv-sub{color:var(--muted);font-size:.9em}
.rv-zh{font-size:1.05em}
.rv-hint{font-size:.85em;color:var(--pri-d)}
.rv-meta{text-align:right;font-size:.85em;min-width:110px}
.rv-dots{color:var(--green);letter-spacing:2px;font-size:1.05em}
.rv-ops{display:flex;gap:4px}
.rv-modes{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.rv-opt{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.rv-opt .tabs{margin:0}
.rv-h{margin:0 0 var(--sp-2)}
.rv-go{flex-direction:column;min-height:56px;font-size:var(--fs-lg)}
.rv-go small{font-weight:500;font-size:var(--fs-sm);color:var(--on-pri-2)}
.rv-more{margin:var(--sp-2) 0}
.rv-more summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700;color:var(--muted)}
.rv-gap{margin-top:var(--sp-2)}
.rv-info{font-size:var(--fs-sm)}
.rv-center{justify-content:center;margin-top:14px}
.rv-sp{flex:1}
.rv-prog{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
.rv-prog .bar{flex:1}
.rv-card{perspective:1000px;max-width:460px;margin:10px auto;cursor:pointer;height:280px}
.rv-card-in{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.rv-card.rv-flip .rv-card-in{transform:rotateY(180deg)}
.rv-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px;border:3px solid var(--line);background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.rv-back{transform:rotateY(180deg);background:var(--soft)}
.rv-face .rv-fjp{font-size:3em;line-height:1.2;word-break:break-all}
.rv-q{text-align:center;margin:10px 0}
.rv-q .rv-qjp{font-size:2.6em;line-height:1.3;word-break:break-all}
.rv-listen{font-size:3em;border:none;background:var(--soft);border-radius:50%;width:110px;height:110px;cursor:pointer}
.rv-input{display:block;width:100%;max-width:420px;margin:10px auto;padding:12px 16px;font-size:1.3em;border:2px solid var(--line);border-radius:14px;text-align:center;font-family:inherit;background:var(--card);color:var(--text)}
.rv-input.rv-ok{border-color:var(--green);background:var(--acc-t)}
.rv-input.rv-ng{border-color:var(--red);background:var(--pri-t)}
.rv-tools input[type=search],.rv-tools select{color:var(--text);min-height:44px}
.rv-tools label{min-height:44px;display:inline-flex;align-items:center;gap:4px}
.rv-empty{text-align:center;padding:30px 16px}
.rv-empty .rv-big{font-size:4em}
.rv-result{text-align:center}
.rv-result .rv-big{font-size:3.4em}
.rv-printhead{display:none}
@media(max-width:640px){
  .rv-meta{text-align:left;min-width:0}
  .rv-item{gap:8px}
  .rv-face .rv-fjp{font-size:2.3em}
  .rv-q .rv-qjp{font-size:2em}
  .rv-card{height:240px}
}
@media print{
  body.rv-printing #main>*:not(.rv-printarea){display:none!important}
  body.rv-printing .rv-printarea .rv-ops{display:none!important}
  body.rv-printing .rv-printhead{display:block}
  .rv-item{break-inside:avoid;border:1px solid var(--line2)}
  .rv-item.rv-done{opacity:1}
}`;
  if (typeof document !== 'undefined' && !document.getElementById('css-review')) {
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
    return String(expected || '').split(/[\/／|｜,，、;；]|\bor\b/).some(e => { const b = normRomaji(e); return b && a === b; });
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
  const romajiOf = it => (isKana(it) && it.romaji ? cleanRom(it.romaji) : it.romaji) || (it.kana ? kanaToRomaji(it.kana) : '') || (/^[぀-ヿ・ー\s]+$/.test(it.jp || '') ? kanaToRomaji(String(it.jp).split('・')[0]) : '');

  /* ---------------- UI 狀態（換頁保留） ---------------- */
  const ui = { src: '', q: '', sort: 'new', showMastered: false, scope: 'due', count: '10', cmode: 'mix' };
  // 到期資訊：今天到期／N 天後
  const DAY = 864e5;
  function dueText(t) {
    if (t.mastered) return '';
    const d = (t.due || 0) - Date.now();
    if (d <= 0) return '<span class="rv-due now">⏰ 今天要複習</span>';
    const n = Math.ceil(d / DAY);
    return `<span class="rv-due">📅 ${n <= 1 ? '明天' : n + ' 天後'}複習</span>`;
  }
  function nextDue() {
    const fut = Tracker.list(false).filter(t => (t.due || 0) > Date.now()).sort((a, b) => a.due - b.due);
    return fut[0] || null;
  }
  let session = null;

  const isKana = it => String(it.id || '').startsWith('kana:');
  const speakItem = it => App.speak(it.kana || String(it.jp || '').split('・')[0]);
  const dots = n => { n = Math.min(3, n || 0); return '●'.repeat(n) + '○'.repeat(3 - n); };

  function filtered() {
    let arr = Tracker.list(ui.showMastered);
    if (ui.src) arr = arr.filter(t => (t.source || '其他') === ui.src);
    const q = ui.q.trim().toLowerCase();
    if (q) {
      const qr = normRomaji(q);
      arr = arr.filter(t => [t.jp, t.kana, t.romaji, t.zh, t.hint].some(v => String(v || '').toLowerCase().includes(q)) ||
        (qr && normRomaji(t.romaji || '').includes(qr)));
    }
    const s = ui.sort;
    arr = arr.slice();
    if (s === 'wrong') arr.sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || (a.streak || 0) - (b.streak || 0));
    else if (s === 'old') arr.sort((a, b) => (a.seen || 0) - (b.seen || 0) || (a.added || 0) - (b.added || 0));
    else arr.sort((a, b) => (b.added || 0) - (a.added || 0));
    return arr;
  }

  /* ---------------- 主頁面 ---------------- */
  function render(el) {
    session = null;
    const all = Tracker.list(true);
    if (!all.length) {
      el.innerHTML = `<div class="panel rv-empty">
        <div class="rv-big">📌</div>
        <h2>不會清單還是空的</h2>
        <p>闖關時答錯的字會<b>自動</b>加進來；看到不熟的字，也可以按「＋ 加入不會清單」。</p>
        <p class="muted">連續答對 3 次就算「已掌握」🎓</p>
        <div><button class="btn primary" data-go="home">🗾 去冒險</button></div>
        <div class="rv-opt rv-center"><button class="btn sm ghost" data-act="import">📥 匯入清單</button></div>
      </div>`;
      bindCommon(el);
      return;
    }
    if (ui.src && !all.some(t => (t.source || '其他') === ui.src)) ui.src = '';
    el.innerHTML = `
      <div class="panel noprint">
        <h2 class="rv-h">📌 複習</h2>
        <button class="btn primary block rv-go" data-mode="flash">▶ 開始複習<small id="rvGoSub"></small></button>
        <details class="rv-more"><summary>換題型、範圍、題數</summary>
        <div class="rv-opt"><b>範圍：</b><div class="tabs" id="rvScope">
          <button data-v="due">⏰ 今日到期</button><button data-v="all">提前複習全部</button><button data-v="filter">目前篩選結果</button></div></div>
        <div class="rv-opt"><b>題數：</b><div class="tabs" id="rvCount">
          <button data-v="10">10 題</button><button data-v="20">20 題</button><button data-v="all">全部</button></div></div>
        <div class="rv-modes">
          <div class="card click" data-mode="flash"><div class="icon">🃏</div><h3>閃卡</h3><div class="muted">看日文想意思，翻面對答案</div></div>
          <div class="card click" data-mode="choice"><div class="icon">✏️</div><h3>選擇題</h3><div class="muted">日→中、中→日、🎧 聽音選字</div></div>
          <div class="card click" data-mode="type"><div class="icon">⌨️</div><h3>拼音輸入</h3><div class="muted">看日文打出羅馬拼音</div></div>
        </div>
        <div class="rv-opt rv-gap"><b>選擇題題型：</b><div class="tabs" id="rvCmode">
          <button data-v="mix">混合</button><button data-v="j2z">日→中</button><button data-v="z2j">中→日</button><button data-v="listen">🎧 聽音</button></div></div>
        </details>
        <div class="muted rv-info" id="rvScopeInfo"></div>
        ${App.voiceHTML ? App.voiceHTML() : ''}
      </div>
      <div class="panel noprint">
        <div class="rv-stats" id="rvStats"></div>
        <div class="chips" id="rvChips"></div>
      </div>
      <div class="panel rv-printarea">
        <div class="rv-printhead"><h2>📌 日語不會清單</h2><div class="muted" id="rvPrintInfo"></div></div>
        <div class="rv-tools noprint">
          <input type="search" id="rvQ" placeholder="🔍 搜尋日文／假名／拼音／中文">
          <select id="rvSort"><option value="new">最新加入</option><option value="wrong">錯最多</option><option value="old">最久未複習</option></select>
        </div>
        <div class="rv-tools noprint">
          <label><input type="checkbox" id="rvShowM"> 顯示已掌握</label>
          <span class="rv-sp"></span>
          <button class="btn sm ghost" data-act="clearM">🧹 清除已掌握</button>
          <button class="btn sm ghost" data-act="export">📤 匯出</button>
          <button class="btn sm ghost" data-act="import">📥 匯入</button>
          <button class="btn sm ghost" data-act="print">🖨️ 列印</button>
        </div>
        <div class="rv-list" id="rvList"></div>
      </div>`;

    const q = el.querySelector('#rvQ'); q.value = ui.q;
    q.oninput = () => { ui.q = q.value; refresh(el); };
    const so = el.querySelector('#rvSort'); so.value = ui.sort;
    so.onchange = () => { ui.sort = so.value; refresh(el); };
    const sm = el.querySelector('#rvShowM'); sm.checked = ui.showMastered;
    sm.onchange = () => { ui.showMastered = sm.checked; refresh(el); };
    tabs(el, '#rvScope', 'scope', () => refresh(el));
    tabs(el, '#rvCount', 'count', () => refresh(el));
    tabs(el, '#rvCmode', 'cmode');
    el.querySelectorAll('[data-mode]').forEach(c => c.onclick = () => startSession(el, c.dataset.mode));
    bindCommon(el);
    refresh(el);
  }

  function tabs(el, sel, key, cb) {
    const box = el.querySelector(sel);
    const btns = box.querySelectorAll('button');
    const paint = () => btns.forEach(b => b.classList.toggle('on', b.dataset.v === ui[key]));
    btns.forEach(b => b.onclick = () => { ui[key] = b.dataset.v; paint(); cb && cb(); });
    paint();
  }

  function bindCommon(el) {
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go(b.dataset.go));
    el.querySelectorAll('[data-act]').forEach(b => {
      const a = b.dataset.act;
      if (a === 'export') b.onclick = doExport;
      else if (a === 'import') b.onclick = () => doImport(el);
      else if (a === 'print') b.onclick = doPrint;
      else if (a === 'clearM') b.onclick = () => {
        const n = Tracker.list(true).filter(t => t.mastered).length;
        if (!n) return App.toast('目前沒有已掌握的項目');
        App.modal(`<h2>清除已掌握？</h2><p>將從清單移除 <b>${n}</b> 個已掌握的項目。</p>`,
          [{ label: '取消' }, { label: '清除', cls: 'primary', onClick: () => { Tracker.clearMastered(); App.toast(`🧹 已清除 ${n} 項`, 'ok'); render(el); } }]);
      };
    });
  }

  function refresh(el) {
    const all = Tracker.list(true);
    const pending = all.filter(t => !t.mastered).length, mastered = all.length - pending;
    el.querySelector('#rvStats').innerHTML =
      `<div class="rv-stat"><b>${Tracker.dueCount()}</b>今天到期</div><div class="rv-stat"><b>${pending}</b>學習中</div><div class="rv-stat"><b>${mastered}</b>已掌握 🎓</div>`;
    // 來源分組
    const by = {};
    Tracker.list(ui.showMastered).forEach(t => { const s = t.source || '其他'; by[s] = (by[s] || 0) + 1; });
    const chips = el.querySelector('#rvChips');
    chips.innerHTML = `<button class="chip rv-chip ${ui.src ? '' : 'rv-on'}" data-src="">全部 ${Tracker.list(ui.showMastered).length}</button>` +
      Object.keys(by).sort((a, b) => by[b] - by[a]).map(s => `<button class="chip rv-chip ${ui.src === s ? 'rv-on' : ''}" data-src="${esc(s)}">${esc(s)} ${by[s]}</button>`).join('');
    chips.querySelectorAll('[data-src]').forEach(c => c.onclick = () => { ui.src = ui.src === c.dataset.src ? '' : c.dataset.src; refresh(el); });

    const list = filtered();
    const box = el.querySelector('#rvList');
    box.innerHTML = list.length ? list.map(itemHTML).join('') : `<div class="center muted" style="padding:20px">${ui.showMastered ? '沒有符合的項目' : '沒有符合的待複習項目（可勾選「顯示已掌握」）'}</div>`;
    box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { const t = Tracker.get(b.dataset.say); if (t) speakItem(t); });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const t = Tracker.get(b.dataset.del); if (!t) return;
      App.modal(`<h2>移除這個項目？</h2><p class="jp" style="font-size:1.5em">${esc(t.jp)}</p><p>${esc(t.zh)}</p>`,
        [{ label: '取消' }, { label: '🗑 移除', cls: 'primary', onClick: () => { Tracker.remove(t.id); App.toast('已移除'); Tracker.list(true).length ? refresh(el) : render(el); } }]);
    });
    const info = el.querySelector('#rvScopeInfo');
    if (info) {
      const n = scopeItems().length, nd = nextDue();
      const when = nd ? (() => { const d = new Date(nd.due); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : '';
      info.innerHTML = ui.scope === 'due' && !n
        ? `<div class="rv-next">🎉 今天到期的都複習完了！${nd ? `下一個到期：<b>${esc(nd.jp)}</b>（${when}）` : ''}<br><span class="muted">想多練可以選「提前複習全部」。</span></div>`
        : `本次範圍共 ${n} 個項目${ui.scope === 'due' ? '（間隔排程：答對後 1→3→7 天再出現）' : ''}`;
      const gs = el.querySelector('#rvGoSub'); if (gs) gs.textContent = n ? `閃卡・${Math.min(n, ui.count === 'all' ? n : +ui.count)} 題` : '今天沒有到期的，可展開下方改範圍';
    }
    const pi = el.querySelector('#rvPrintInfo');
    if (pi) pi.textContent = `共 ${list.length} 項${ui.src ? '・來源：' + ui.src : ''}・${new Date().toLocaleDateString()}`;
  }

  function itemHTML(t) {
    const rom = romajiOf(t);
    return `<div class="rv-item ${t.mastered ? 'rv-done' : ''}">
      <div class="rv-emo">${esc(t.emoji || (isKana(t) ? '🔤' : '💬'))}</div>
      <div class="rv-main">
        <div><span class="rv-jp jp" data-say="${esc(t.id)}" title="點擊發音">${esc(t.jp)}</span>
          ${t.kana && t.kana !== t.jp ? `<span class="rv-sub jp">${esc(t.kana)}</span>` : ''}
          ${rom ? `<span class="rv-sub">${esc(rom)}</span>` : ''}</div>
        <div class="rv-zh">${esc(t.zh)}</div>
        ${t.hint ? `<div class="rv-hint">💡 ${esc(t.hint)}</div>` : ''}
      </div>
      <div class="rv-meta">
        <div><span class="chip">${esc(t.source || '其他')}</span></div>
        <div>✅ ${t.right || 0}・❌ ${t.wrong || 0}</div>
        <div class="rv-dots" title="連對 ${t.streak || 0}/3">${t.mastered ? '🎓 已掌握' : dots(t.streak)}</div>
        <div>${dueText(t)}</div>
      </div>
      <div class="rv-ops"><button class="btn sm ghost" data-say="${esc(t.id)}" title="發音">🔊</button><button class="btn sm ghost" data-del="${esc(t.id)}" title="移除">🗑</button></div>
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
  function doPrint() {
    document.body.classList.add('rv-printing');
    const off = () => { document.body.classList.remove('rv-printing'); W.removeEventListener && W.removeEventListener('afterprint', off); };
    W.addEventListener && W.addEventListener('afterprint', off);
    W.print && W.print();
    setTimeout(off, 1500);
  }

  /* ---------------- 複習流程 ---------------- */
  function scopeItems() {
    if (ui.scope === 'due') return Tracker.dueList();               // 只出到期的字
    let arr = ui.scope === 'filter' ? filtered() : Tracker.list(false);
    if (!arr.length && ui.scope === 'all') arr = Tracker.list(true);   // 全部掌握時仍可複習
    return arr;
  }
  function pickItems(arr) {
    // 優先：連對少、錯多、久未複習；再隨機
    const r = new Map(arr.map(t => [t.id, Math.random()]));
    const sorted = arr.slice().sort((a, b) => (a.streak || 0) - (b.streak || 0) || (b.wrong || 0) - (a.wrong || 0) || (a.seen || 0) - (b.seen || 0) || r.get(a.id) - r.get(b.id));
    const n = ui.count === 'all' ? sorted.length : Math.min(sorted.length, +ui.count || 10);
    return App.shuffle(sorted.slice(0, n));
  }

  function startSession(el, mode, items) {
    let src = items || scopeItems();
    if (mode === 'type') src = src.filter(t => romajiOf(t));
    if (!src.length) return App.toast(mode === 'type' ? '範圍內沒有可拼音的項目' : ui.scope === 'due' && !items ? '🎉 今天沒有到期的字，可選「提前複習全部」' : '範圍內沒有項目');
    const list = items ? App.shuffle(src) : pickItems(src);
    session = { mode, list, i: 0, correct: 0, answered: 0, newly: [], wrongs: [], el, cmode: ui.cmode };
    el.innerHTML = `<div class="panel" id="rvSess"></div>`;
    W.scrollTo && W.scrollTo(0, 0);
    showQ();
  }

  function markItem(it, ok) {
    const s = session;
    const t = Tracker.get(it.id); if (!t) return;
    const was = !!t.mastered;
    t.seen = Date.now();
    const r = Tracker.mark(it.id, ok);
    s.answered++;
    if (ok) s.correct++; else s.wrongs.push(it);
    if (r && r.mastered && !was) s.newly.push(it);
  }

  function header(s) {
    const icons = { flash: '🃏 閃卡', choice: '✏️ 選擇題', type: '⌨️ 拼音輸入' };
    return `<div class="rv-prog"><b>${icons[s.mode]}</b><div class="bar"><div style="width:${s.i / s.list.length * 100}%"></div></div>
      <span>${s.i + 1}/${s.list.length}</span><button class="btn sm ghost" id="rvQuit">結束</button></div>`;
  }

  function showQ() {
    const s = session; if (!s) return;
    if (s.i >= s.list.length) return finish();
    const box = s.el.querySelector('#rvSess');
    const it = Tracker.get(s.list[s.i].id) || s.list[s.i];
    if (s.mode === 'flash') qFlash(box, it);
    else if (s.mode === 'choice') qChoice(box, it);
    else qType(box, it);
    const quit = box.querySelector('#rvQuit');
    if (quit) quit.onclick = () => finish();
  }
  function next() { if (!session) return; session.i++; showQ(); }

  function backHTML(it) {
    const rom = romajiOf(it);
    return `${it.emoji ? `<div style="font-size:2em">${esc(it.emoji)}</div>` : ''}
      ${it.kana && it.kana !== it.jp ? `<div class="jp" style="font-size:1.6em">${esc(it.kana)}</div>` : ''}
      ${rom ? `<div class="muted">${esc(rom)}</div>` : ''}
      <div style="font-size:1.3em;margin:6px 0"><b>${esc(it.zh)}</b></div>
      ${it.hint ? `<div class="rv-hint">💡 ${esc(it.hint)}</div>` : ''}`;
  }

  // a. 閃卡
  function qFlash(box, it) {
    box.innerHTML = header(session) + `
      <div class="rv-card" id="rvCard"><div class="rv-card-in">
        <div class="rv-face"><div class="rv-fjp jp">${esc(it.jp)}</div><div class="muted" style="margin-top:10px">👆 點卡片翻面</div></div>
        <div class="rv-face rv-back">${backHTML(it)}</div>
      </div></div>
      <div class="center"><button class="btn sm ghost" id="rvSay">🔊 發音</button></div>
      <div class="center" style="margin-top:8px"><button class="btn" id="rvNo">😵 還不會</button><button class="btn primary" id="rvYes">😊 會了</button></div>`;
    const card = box.querySelector('#rvCard');
    card.onclick = () => { card.classList.toggle('rv-flip'); if (card.classList.contains('rv-flip')) speakItem(it); };
    box.querySelector('#rvSay').onclick = () => speakItem(it);
    let done = false;
    const ans = ok => { if (done) return; done = true; markItem(it, ok); next(); };
    box.querySelector('#rvYes').onclick = () => ans(true);
    box.querySelector('#rvNo').onclick = () => ans(false);
  }

  // b. 選擇題
  function supplementPool(kana) {
    const out = [];
    if (kana) (g('KANA') || []).forEach(k => out.push(App.kanaItem(k)));
    else (g('SCENES') || []).forEach(sc => {
      (sc.vocab || []).forEach(w => out.push(App.wordItem(w, sc.name, 'word')));
      (sc.phrases || []).forEach(w => out.push(App.wordItem(w, sc.name, 'phrase')));
    });
    return out;
  }
  function buildOptions(it, field, n) {
    n = n || 4;
    const ans = String(it[field] || '');
    const seen = new Set([ans]);
    const opts = [it];
    const kana = isKana(it);
    const tracked = Tracker.list(true).filter(t => t.id !== it.id);
    const tiers = [
      tracked.filter(t => isKana(t) === kana),
      supplementPool(kana),
      tracked.filter(t => isKana(t) !== kana),
      supplementPool(!kana)
    ];
    for (const tier of tiers) {
      for (const c of App.shuffle(tier)) {
        if (opts.length >= n) break;
        const v = String(c[field] || '');
        if (!v || seen.has(v) || c.id === it.id) continue;
        seen.add(v); opts.push(c);
      }
      if (opts.length >= n) break;
    }
    return App.shuffle(opts);
  }
  function qChoice(box, it) {
    let type = session.cmode;
    const noVoice = App.voiceOK && App.voiceOK() === false;
    if (type === 'mix') type = (noVoice ? ['j2z', 'z2j'] : ['j2z', 'z2j', 'listen'])[Math.random() * (noVoice ? 2 : 3) | 0];
    if (type === 'listen' && noVoice) type = 'kana';   // 沒有日文語音：聽音題改成「看讀音選字」
    const field = type === 'j2z' ? 'zh' : 'jp';
    const opts = buildOptions(it, field, 4);
    let q;
    if (type === 'j2z') q = `<div class="muted">這是什麼意思？</div><div class="rv-qjp jp" id="rvQjp" style="cursor:pointer">${esc(it.jp)}</div>`;
    else if (type === 'z2j') q = `<div class="muted">日文怎麼說？</div><div style="font-size:1.8em">${esc(it.emoji || '')} <b>${esc(it.zh)}</b></div>`;
    else if (type === 'kana') q = `<div class="muted">🔇 沒有日文語音，改看讀音：是哪一個？</div><div style="font-size:1.8em">${esc(romajiOf(it) || it.kana || it.zh)}</div>`;
    else q = `<div class="muted">聽聽看，是哪一個？</div><button class="rv-listen" id="rvListen">🔊</button>`;
    box.innerHTML = header(session) + `<div class="rv-q">${q}</div>
      <div class="choices">${opts.map((o, k) => `<button class="choice ${field === 'jp' ? 'jp' : ''}" data-k="${k}">${esc(o[field])}</button>`).join('')}</div>
      <div class="feedback" id="rvFb"></div><div class="center" id="rvNext"></div>`;
    const qj = box.querySelector('#rvQjp'); if (qj) qj.onclick = () => speakItem(it);
    const li = box.querySelector('#rvListen'); if (li) { li.onclick = () => speakItem(it); setTimeout(() => { if (session && session.list[session.i] && session.list[session.i].id === it.id) speakItem(it); }, 300); }
    let done = false;
    const btns = box.querySelectorAll('[data-k]');
    btns.forEach(b => b.onclick = () => {
      if (done) return; done = true;
      const o = opts[+b.dataset.k], ok = o.id === it.id || String(o[field]) === String(it[field]);
      btns.forEach(x => { const ox = opts[+x.dataset.k]; if (ox.id === it.id) x.classList.add('ok'); });
      if (!ok) b.classList.add('ng');
      markItem(it, ok);
      speakItem(it);
      box.querySelector('#rvFb').innerHTML = (ok ? '⭕ 答對了！' : '❌ 正確答案：') +
        ` <span class="jp"><b>${esc(it.jp)}</b></span> ${it.kana && it.kana !== it.jp ? '（' + esc(it.kana) + '）' : ''} ＝ ${esc(it.zh)}`;
      nextBtn(box);
    });
  }
  function nextBtn(box) {
    const nb = box.querySelector('#rvNext');
    const last = session.i + 1 >= session.list.length;
    nb.innerHTML = `<button class="btn primary" id="rvGo">${last ? '看結果 ➜' : '下一題 ➜'}</button>`;
    const b = nb.querySelector('#rvGo');
    b.onclick = next;
    b.focus && b.focus();
  }

  // c. 拼音輸入
  function qType(box, it) {
    const rom = romajiOf(it);
    box.innerHTML = header(session) + `<div class="rv-q">
        <div class="muted">打出羅馬拼音（大小寫、空白、長音 ō/ou/oo 都不影響）</div>
        <div class="rv-qjp jp" id="rvQjp" style="cursor:pointer">${esc(it.jp)}</div>
        ${it.zh ? `<div class="muted">${esc(it.emoji || '')} ${esc(it.zh)}</div>` : ''}
      </div>
      <input class="rv-input" id="rvIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例如：konnichiwa">
      <div class="center"><button class="btn" id="rvSkip">🤔 不知道</button><button class="btn primary" id="rvOk">確定</button></div>
      <div class="feedback" id="rvFb"></div><div class="center" id="rvNext"></div>`;
    box.querySelector('#rvQjp').onclick = () => speakItem(it);
    const inp = box.querySelector('#rvIn');
    let done = false;
    const submit = skip => {
      if (done) return;
      if (!skip && !inp.value.trim()) return inp.focus && inp.focus();
      done = true;
      const ok = !skip && romajiMatch(inp.value, rom);
      inp.classList.add(ok ? 'rv-ok' : 'rv-ng');
      inp.readOnly = true;
      markItem(it, ok);
      speakItem(it);
      box.querySelector('#rvFb').innerHTML = (ok ? '⭕ 答對了！' : '❌ 正確拼音：') + ` <b>${esc(rom)}</b>　<span class="jp">${esc(it.kana || it.jp)}</span>`;
      box.querySelector('#rvOk').disabled = true; box.querySelector('#rvSkip').disabled = true;
      nextBtn(box);
    };
    box.querySelector('#rvOk').onclick = () => submit(false);
    box.querySelector('#rvSkip').onclick = () => submit(true);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault && e.preventDefault(); if (done) next(); else submit(false); } };
    setTimeout(() => inp.focus && inp.focus(), 50);
  }

  /* ---------------- 結果 ---------------- */
  const XP_PER = 3;
  function finish() {
    const s = session; if (!s) return;
    session = null;
    const el = s.el;
    if (!s.answered) return render(el);
    const xp = s.correct * XP_PER;
    if (xp) App.addXP(xp, '複習');
    const pct = s.correct / s.answered;
    const face = pct >= 0.9 ? '🏆' : pct >= 0.6 ? '👍' : '💪';
    const uniq = a => a.filter((x, i) => a.findIndex(y => y.id === x.id) === i);
    const wrongs = uniq(s.wrongs);
    el.innerHTML = `<div class="panel rv-result">
      <div class="rv-big">${face}</div>
      <h2>複習完成！</h2>
      <p>答對 <b>${s.correct}</b> / ${s.answered}</p>
      ${xp ? `<p class="xpgain">+${xp} XP</p>` : ''}
      <p>本次掌握了 <b>${s.newly.length}</b> 個 🎓</p>
      ${s.newly.length ? `<div class="chips" style="justify-content:center">${s.newly.map(w => `<span class="chip green jp">${esc(w.jp)}</span>`).join('')}</div>` : ''}
      ${wrongs.length ? `<div class="muted">還要加油：</div><div class="chips" style="justify-content:center">${wrongs.map(w => `<span class="chip red"><span class="jp">${esc(w.jp)}</span> <small>${esc(w.zh)}</small></span>`).join('')}</div>` : ''}
      <div style="margin-top:14px">
        ${wrongs.length ? '<button class="btn" id="rvRetryW">🔁 只練錯的</button>' : ''}
        <button class="btn" id="rvAgain">🔄 再來一輪</button>
        <button class="btn primary" id="rvBack">📌 回清單</button>
      </div></div>`;
    el.querySelector('#rvAgain').onclick = () => startSession(el, s.mode);
    el.querySelector('#rvBack').onclick = () => render(el);
    const rw = el.querySelector('#rvRetryW');
    if (rw) rw.onclick = () => startSession(el, s.mode, wrongs.map(w => Tracker.get(w.id)).filter(Boolean));
  }

  App.register('review', { title: '複習', icon: '📌', nav: true, navOrder: 5, render });

  // 供測試／其他模組使用
  W.ReviewAPI = { normRomaji, romajiMatch, kanaToRomaji, romajiOf };
})();
