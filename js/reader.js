// 閱讀模組（D 組）：路由 read（閱讀首頁）、read-article（閱讀器）
// 依賴：App、Tracker、JPText（js/jp-text.js）、READING（data/reading/daily.js）
// 使用者貼的文章存 App.idb：'docs:index'＝[{id,title,at,len,url}]（最近 50 篇）、'doc:<id>'＝{id,title,text,url,src,at}；不進 App.state、不上雲
// App.state.read ＝ { done:{文章id:星數}, pref:{y,r,z}, lastDay:'YYYY-MM-DD'（最後讀完每日短文的日期，首頁今日 3 件事用） }
(function () {
  'use strict';
  const esc = App.esc;
  if (!document.querySelector('link[href$="css/reader.css"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/reader.css'; document.head.appendChild(l);
  }
  const NHK = 'https://www3.nhk.or.jp/news/easy/';
  const MAXLEN = 50000;
  const ST = () => { const S = App.state; if (!S.read || typeof S.read !== 'object') S.read = {}; if (!S.read.done) S.read.done = {}; return S.read; };
  const prof = () => { try { if (typeof App.profile === 'function') return App.profile() || {}; } catch (e) { } return {}; };
  const lvNow = () => (window.READING ? READING.lvNow() : 'zero');
  // 顯示設定：讀音 y、羅馬字 r、中文 z；沒手動設過就依程度／提示多寡
  function pref() {
    const st = ST();
    if (st.pref) return st.pref;
    const p = prof(), lv = p.lv || 'zero', as = p.assist || 'full';
    return { y: as !== 'none' && !/^n[12]$/.test(lv), r: lv === 'zero' && as === 'full', z: as === 'full' || lv === 'zero' };
  }
  function setPref(k, v) { const st = ST(); st.pref = Object.assign({}, pref(), { [k]: v }); App.save(); }
  const lvBadge = lv => {
    if (!lv) return '';
    const k = String(lv).toLowerCase();
    return `<span class="lv-b ${k === 'zero' ? '' : k}">${esc(k === 'zero' ? '入門' : String(lv).toUpperCase())}</span>`;
  };
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); };
  const toast = (m, t) => App.toast(m, t);

  /* ---------------- 我的文章（IndexedDB） ---------------- */
  async function docIndex() { const a = await App.idb.get('docs:index'); return Array.isArray(a) ? a : []; }
  async function saveDoc(d) {
    const id = hash(d.text);
    const doc = { id, title: (d.title || '').trim().slice(0, 80) || d.text.trim().split('\n')[0].slice(0, 24), text: d.text, url: d.url || '', src: d.src || 'paste', at: Date.now() };
    await App.idb.set('doc:' + id, doc);
    let idx = (await docIndex()).filter(x => x.id !== id);
    idx.unshift({ id, title: doc.title, at: doc.at, len: doc.text.length, url: doc.url });
    const drop = idx.slice(50); idx = idx.slice(0, 50);
    drop.forEach(x => App.idb.del('doc:' + x.id));
    await App.idb.set('docs:index', idx);
    return id;
  }
  async function delDoc(id) {
    await App.idb.del('doc:' + id);
    await App.idb.set('docs:index', (await docIndex()).filter(x => x.id !== id));
  }

  /* ---------------- 分享／書籤小工具帶進來的文章 ---------------- */
  function readShare() {
    let q;
    try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    if (!q.has('share') && !q.has('text') && !q.has('url')) return null;
    let text = q.get('text') || '', url = q.get('url') || '', title = q.get('title') || '';
    const m = text.match(/https?:\/\/\S+$/);
    if (!url && m) { url = m[0]; text = text.slice(0, m.index).trim(); }
    try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) { }
    return { title, text: text.slice(0, MAXLEN), url };
  }

  /* ---------------- 閱讀首頁 ---------------- */
  App.register('read', {
    title: '閱讀', icon: '📰', nav: true, navOrder: 3,
    render(el, params) {
      params = params || {};
      const sh = readShare();
      if (sh) { App.go('read', { mode: 'paste', share: sh }); return; }
      if (params.mode === 'paste') return pasteView(el, params.share || {});
      if (params.mode === 'url') return urlView(el);
      homeView(el, params);
    }
  });

  function homeView(el, params) {
    const lv = lvNow(), st = ST();
    const t = READING.pick(lv, App.today());
    const tab = params.lv || lv;
    const list = READING.daily.filter(a => a.lv === tab);
    const doneMark = id => st.done[id] ? `<span class="rd-done" title="已讀">✔</span>` : '';
    el.innerHTML = `<div class="rd-home">
      <button type="button" class="rd-today" data-go="${t.id}">
        <span class="rd-today-ic" aria-hidden="true">${t.icon}</span>
        <span class="rd-today-tx"><small>今日短文・${esc(READING.LV_DESC[t.lv])}</small><b>${esc(t.title)}</b><span class="muted">${esc(t.zh)}</span></span>
        <span class="rd-today-go">${st.done[t.id] ? '✔ 已讀' : '開始讀 ➜'}</span>
      </button>
      <div class="rd-acts">
        <button type="button" class="rd-act" data-act="paste"><span>📋</span>貼上文章</button>
        <button type="button" class="rd-act" data-act="url"><span>🔗</span>貼網址</button>
        <a class="rd-act" href="${NHK}" target="_blank" rel="noopener"><span>🗞️</span>NHK 簡單新聞</a>
        <button type="button" class="rd-act" data-act="songs"><span>🎵</span>歌曲跟唱</button>
      </div>
      <h3 class="rd-h3">📚 文章庫</h3>
      <div class="tabs rd-tabs">${READING.LV.map(l => `<button type="button" data-lv="${l}" class="${l === tab ? 'on' : ''}">${esc(READING.LV_NAME[l])}</button>`).join('')}</div>
      <p class="muted rd-tip">${esc(READING.LV_DESC[tab])}・點文章開始讀，點任何一個詞看意思</p>
      <div class="rd-list">${list.map(a => `<button type="button" class="rd-item" data-go="${a.id}"><span class="rd-ic" aria-hidden="true">${a.icon}</span><span class="rd-it"><b>${esc(a.title)}</b><small class="muted">${esc(a.zh)}</small></span>${doneMark(a.id)}</button>`).join('')}</div>
      <h3 class="rd-h3">🗂️ 我的文章</h3>
      <div class="rd-list" id="rdMine"><p class="muted rd-tip">讀取中…</p></div>
      <p class="muted rd-tip">貼上的文章只存在這台裝置，不會上傳。</p>
    </div>`;
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go('read-article', { daily: b.dataset.go }));
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => homeView(el, { lv: b.dataset.lv }));
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'songs') App.go('songs'); else App.go('read', { mode: a });
    });
    docIndex().then(idx => {
      const box = el.querySelector('#rdMine'); if (!box) return;
      if (!idx.length) { box.innerHTML = `<p class="muted rd-tip">還沒有。按上面「📋 貼上文章」把新聞、網誌、歌詞貼進來就能逐詞查。</p>`; return; }
      box.innerHTML = idx.map(d => `<div class="rd-item rd-mine"><button type="button" class="rd-open" data-doc="${esc(d.id)}"><span class="rd-ic" aria-hidden="true">📄</span><span class="rd-it"><b>${esc(d.title)}</b><small class="muted">${d.len} 字・${esc(new Date(d.at).toLocaleDateString())}</small></span>${st.done['doc:' + d.id] ? '<span class="rd-done">✔</span>' : ''}</button><button type="button" class="rd-del" data-del="${esc(d.id)}" aria-label="刪除">✕</button></div>`).join('');
      box.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => App.go('read-article', { doc: b.dataset.doc }));
      box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => App.modal('<h2>刪除這篇文章？</h2><p class="muted">只會刪掉這台裝置上的全文，不會影響不會清單。</p>', [{ label: '取消' }, { label: '刪除', cls: 'primary', onClick: () => delDoc(b.dataset.del).then(() => homeView(el, { lv: tab })) }]));
    });
  }

  function pasteView(el, sh) {
    el.innerHTML = `<div class="rd-home">
      <h2 class="rd-h2">📋 貼上文章</h2>
      <p class="muted rd-tip">新聞、網誌、歌詞、菜單都可以。貼上後每個詞都能點，看讀音和中文。</p>
      <label class="rd-lbl">標題（可不填）<input id="rdT" class="rd-in" maxlength="80" value="${esc(sh.title || '')}"></label>
      <label class="rd-lbl">日文全文<textarea id="rdX" class="rd-in rd-ta" rows="10" placeholder="在這裡貼上日文…">${esc(sh.text || '')}</textarea></label>
      ${sh.url ? `<p class="muted rd-tip">來源：<a href="${esc(sh.url)}" target="_blank" rel="noopener">${esc(sh.url.slice(0, 60))}</a></p>` : ''}
      ${sh.url && !sh.text ? '<p class="rd-warn">只收到網址，沒有收到文字。請打開原網頁，選取本文複製後貼上。</p>' : ''}
      <div class="rd-row"><button type="button" class="btn" id="rdClip">📥 從剪貼簿貼上</button><button type="button" class="btn primary" id="rdGo">開始閱讀 ➜</button></div>
      <p class="muted rd-tip">全文只存在這台裝置（最多 ${MAXLEN.toLocaleString()} 字），不會上傳。</p>
    </div>`;
    const ta = el.querySelector('#rdX');
    const clip = el.querySelector('#rdClip');
    if (!(navigator.clipboard && navigator.clipboard.readText)) clip.remove();
    else clip.onclick = () => navigator.clipboard.readText().then(t => { if (t) ta.value = t.slice(0, MAXLEN); else toast('剪貼簿是空的'); }).catch(() => toast('無法讀取剪貼簿，請長按文字框貼上'));
    el.querySelector('#rdGo').onclick = async () => {
      const text = ta.value.replace(/\r/g, '').trim().slice(0, MAXLEN);
      if (!text) { toast('請先貼上文章'); ta.focus(); return; }
      if (!/[぀-ヿ㐀-鿿]/.test(text)) { toast('看起來不是日文喔'); return; }
      const id = await saveDoc({ title: el.querySelector('#rdT').value, text, url: sh.url, src: sh.url ? 'share' : 'paste' });
      App.go('read-article', { doc: id });
    };
  }

  function bookmarklet() {
    const base = location.origin + location.pathname;
    return "javascript:(function(){var s=String(getSelection()).trim();if(!s){var r=document.querySelector('article,main,[role=main]')||document.body;s=[].map.call(r.querySelectorAll('h1,h2,h3,p,li'),function(e){return e.innerText.trim()}).filter(Boolean).join('\\n')}s=s.slice(0,6000);window.open('" + base + "?share=1&title='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(s))})()";
  }
  function urlView(el) {
    const bm = bookmarklet(), httpOK = /^https?:/.test(location.protocol);
    el.innerHTML = `<div class="rd-home">
      <h2 class="rd-h2">🔗 貼網址</h2>
      <label class="rd-lbl">文章網址<input id="rdU" class="rd-in" type="url" inputmode="url" placeholder="https://…"></label>
      <div class="rd-row"><button type="button" class="btn" id="rdOpen">開啟原網頁</button><button type="button" class="btn primary" id="rdPaste">我複製好了，貼上 ➜</button></div>
      <div class="rd-box">
        <p><b>為什麼不能直接讀網址？</b>瀏覽器的安全規則（CORS）不讓一個網站直接讀另一個網站的內容，所以要請你幫忙把文字帶過來。三種方法：</p>
        <ol class="rd-ol">
          <li><b>複製貼上（最簡單）</b>：按「開啟原網頁」→ 長按選取本文 → 複製 → 回來按「我複製好了，貼上」。</li>
          <li><b>手機分享（Android）</b>：先把本站「加到主畫面」安裝，之後在任何網頁選取文字或按「分享」→ 選「日語冒險」，文章就會直接打開。</li>
          <li><b>電腦書籤小工具</b>：把下面的按鈕拖到書籤列。在新聞網頁上點它（可先選取一段文字），就會把本文送到這裡。${httpOK ? '' : '<br><span class="rd-warn">（需要用 http/https 網址開啟本站才能用）</span>'}</li>
        </ol>
        <div class="rd-row"><a class="btn rd-bm" href="${esc(bm)}" onclick="return false" draggable="true">📰 讀日文</a><button type="button" class="btn" id="rdCopyBm">複製程式碼</button></div>
        <details class="rd-det"><summary>書籤程式碼（手動新增書籤時，把它貼在「網址」欄）</summary><textarea class="rd-in rd-code" rows="4" readonly>${esc(bm)}</textarea></details>
      </div>
      <p class="muted rd-tip">想每天讀新聞？<a href="${NHK}" target="_blank" rel="noopener">NHK NEWS WEB EASY</a> 是給初學者的簡單新聞，讀完把全文貼回來就能查詞、加字卡。</p>
    </div>`;
    const u = el.querySelector('#rdU');
    const val = () => { const v = u.value.trim(); return /^https?:\/\/\S+$/i.test(v) ? v : ''; };
    el.querySelector('#rdOpen').onclick = () => { const v = val(); if (!v) { toast('請輸入 http 開頭的網址'); u.focus(); return; } window.open(v, '_blank', 'noopener'); };
    el.querySelector('#rdPaste').onclick = () => App.go('read', { mode: 'paste', share: { url: val(), text: '', title: '' } });
    el.querySelector('#rdCopyBm').onclick = () => {
      const done = () => toast('✅ 已複製書籤程式碼', 'ok');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(bm).then(done).catch(() => { el.querySelector('.rd-det').open = true; });
      else el.querySelector('.rd-det').open = true;
    };
  }

  /* ---------------- 共用：詞的 HTML 與查詞卡（歌曲也用） ---------------- */
  const CONTENT = /^(n|v|i|na|adv|pron|name|exp|int|conj|pre|num|unk|ctr|suf)$/;
  // 句讀、右括號黏在前一個詞後面（避免出現在行首）
  const CLOSE = /^[、。，．！？!?」』）)】〕…ー～〜]+$/;
  function tokensHTML(tokens, key) {
    const out = [];
    tokenParts(tokens, key).forEach((h, k) => {
      const t = tokens[k];
      if (t.sym && CLOSE.test(t.s) && out.length && !/^<br>$/.test(out[out.length - 1])) out[out.length - 1] = `<span class="rd-nb">${out[out.length - 1]}${h}</span>`;
      else out.push(h);
    });
    return out.join('');
  }
  function tokenParts(tokens, key) {
    return tokens.map((t, k) => {
      if (t.sym) return t.s === '\n' ? '<br>' : esc(t.s);
      const lv = t.lv ? ' l-' + t.lv.toLowerCase() : '';
      const tracked = Tracker.has('word:' + t.base) ? ' tk' : '';
      const gl = CONTENT.test(t.pos) && t.zh && t.pos !== 'num' ? `<span class="rd-gl">${esc(String(t.zh).split(/[；;，,（(]/)[0].slice(0, 8))}</span>` : '';
      return `<span class="rd-w${lv}${tracked}${t.known ? '' : ' unk'}" data-k="${key}:${k}"><span class="rd-s">${JPText.ruby(t.s, t.kana)}</span><span class="rd-ro">${esc(t.romaji || '')}</span>${gl}</span>`;
    });
  }
  function sentenceOf(text, i) {
    const s = JPText.sentences(text).find(x => i >= x.i && i < x.i + x.s.length);
    return s ? s.s.trim() : '';
  }
  // ctx: {title, sentence, source:'📖 閱讀'|'🎵 歌曲', zh(整句中文，可無), onClose}
  function wordCard(t, ctx) {
    ctx = ctx || {};
    const base = t.base || t.s, bk = t.bkana || t.kana || '';
    const item = App.wordItem({ jp: base, kana: bk, romaji: JPText.romaji(bk), zh: t.zh || '（自填）', hint: ctx.title ? `出自《${ctx.title}》：${ctx.sentence || ''}` : (ctx.sentence || '') }, ctx.source || '📖 閱讀', 'word');
    const sent = ctx.sentence && ctx.sentence.length <= 60 ? App.wordItem({ jp: ctx.sentence, kana: '', zh: ctx.zh || '（整句）', hint: ctx.title ? `出自《${ctx.title}》` : '' }, ctx.source || '📖 閱讀', 'phrase') : null;
    const form = t.form && JPText.FORM_ZH[t.form] ? `・${JPText.FORM_ZH[t.form]}` : '';
    const html = `<div class="rd-card">
      <div class="rd-big" lang="ja">${JPText.ruby(t.s, t.kana)}</div>
      <div class="rd-kana" lang="ja">${esc(t.kana || '')}${t.romaji ? ' ・ ' + esc(t.romaji) : ''}</div>
      ${base !== t.s ? `<div class="rd-base">原形：<b lang="ja">${esc(base)}</b>${bk && bk !== base ? `（${esc(bk)}）` : ''}${esc(form)}</div>` : ''}
      <div class="rd-mean">${t.zh ? esc(t.zh) : '<span class="muted">字典沒有這個詞</span>'}</div>
      <div class="chips rd-chips">${t.lv ? lvBadge(t.lv) : ''}${t.pos && JPText.POS_ZH[t.pos] ? `<span class="chip">${esc(JPText.POS_ZH[t.pos])}</span>` : ''}</div>
      ${t.alts && t.alts.length ? `<div class="rd-alts muted">也可能是：${t.alts.map(a => `${esc(a.jp)}（${esc(String(a.zh).split(/[；;]/)[0])}）`).join('、')}</div>` : ''}
      ${!t.known || t.user ? `<div class="rd-user"><input class="rd-in" id="rdUz" placeholder="自己填中文意思" value="${esc(t.user ? t.zh : '')}"><button type="button" class="btn sm" id="rdUs">存</button></div>` : ''}
      ${ctx.sentence ? `<div class="rd-sent" lang="ja">「${esc(ctx.sentence)}」</div>` : ''}
      <div class="rd-row rd-card-btns"><button type="button" class="btn sm" id="rdSay">🔊 聽</button>${App.trackBtn(item)}</div>
      ${sent ? `<div class="rd-row rd-card-btns"><span class="muted">整句：</span>${App.trackBtn(sent, true)}<button type="button" class="btn sm" id="rdSayS">🔊 整句</button></div>` : ''}
    </div>`;
    App.modal(html, [{ label: '關閉', onClick: ctx.onClose }]);
    const bg = document.body.lastElementChild;
    if (!bg) return;
    const $ = s => bg.querySelector(s);
    $('#rdSay').onclick = () => App.speak(t.s, .8);
    if ($('#rdSayS')) $('#rdSayS').onclick = () => App.speak(ctx.sentence, .85);
    if ($('#rdUs')) $('#rdUs').onclick = () => { const v = $('#rdUz').value.trim(); JPText.setUser(t.s, v); toast(v ? '✅ 已存，下次會顯示' : '已清除', 'ok'); };
    // 背景點掉也要刷新底線
    const obs = new MutationObserver(() => { if (!bg.isConnected) { obs.disconnect(); ctx.onClose && ctx.onClose(); } });
    obs.observe(document.body, { childList: true });
  }
  function syncTrackBtns(root) {
    (root || document).querySelectorAll('.track-btn[data-track]').forEach(x => { const on = Tracker.has(x.dataset.track); x.classList.toggle('on', on); x.textContent = on ? '✓ 已在清單' : '＋ 不會清單'; });
  }

  /* ---------------- 閱讀器 ---------------- */
  App.register('read-article', {
    title: '閱讀', icon: '📰', nav: false, navParent: 'read',
    render(el, params) { articleView(el, params || {}); }
  });

  async function loadArticle(params) {
    if (params.daily) {
      const a = READING.byId(params.daily); if (!a) return null;
      return { id: a.id, title: a.title, zh: a.zh, lv: a.lv, paras: a.p.map(x => ({ jp: x[0], zh: x[1] })), q: a.q, daily: true, icon: a.icon };
    }
    if (params.doc) {
      const d = await App.idb.get('doc:' + params.doc); if (!d) return null;
      return { id: 'doc:' + d.id, title: d.title, url: d.url, paras: d.text.split(/\n+/).map(s => s.trim()).filter(Boolean).map(jp => ({ jp, zh: '' })), daily: false };
    }
    return null;
  }

  async function articleView(el, params) {
    el.innerHTML = '<p class="center muted rd-load">📖 準備字典中…</p>';
    const A = await loadArticle(params);
    if (!A) { el.innerHTML = '<div class="panel center"><p>找不到這篇文章（可能已刪除）。</p><button class="btn primary" type="button">回閱讀</button></div>'; el.querySelector('button').onclick = () => App.go('read'); return; }
    await JPText.ready();
    if (!el.isConnected) return;
    const S = { A, tokens: [], tapped: 0, quiz: null, full: false };
    tokenizeAll(S);
    draw(el, S);
    // 文章有字典裡沒有的漢字詞 → 再載 N2/N1 詞庫重算
    if (S.tokens.some(t => JPText.hasUnknown(t))) {
      JPText.ready(true).then(() => { if (!el.isConnected) return; tokenizeAll(S); drawBody(el, S); });
    }
    JPText.ensureGrammar().then(() => { if (el.isConnected) drawExtras(el, S); });
  }
  function tokenizeAll(S) {
    S.tokens = S.A.paras.map(p => JPText.tokenize(p.jp));
    S.titleTk = JPText.tokenize(S.A.title);
  }
  function draw(el, S) {
    const A = S.A, P = pref();
    const len = A.paras.reduce((n, p) => n + p.jp.length, 0);
    el.innerHTML = `<article class="rd-art">
      <div class="rd-bar">
        <div class="rd-tg" role="group" aria-label="顯示">
          <button type="button" data-t="y" aria-pressed="${!!P.y}" class="${P.y ? 'on' : ''}">讀音</button>
          <button type="button" data-t="r" aria-pressed="${!!P.r}" class="${P.r ? 'on' : ''}">羅馬字</button>
          <button type="button" data-t="z" aria-pressed="${!!P.z}" class="${P.z ? 'on' : ''}">中文翻譯</button>
        </div>
        <button type="button" class="btn ghost rd-all" aria-label="朗讀全文">🔊</button>
      </div>
      <div class="rd-doc ${P.y ? 'y' : ''} ${P.r ? 'r' : ''} ${P.z ? 'z' : ''} ${A.daily ? 'daily' : 'mine'}">
        <div class="rd-meta">${A.lv ? lvBadge(A.lv) : '<span class="chip">我的文章</span>'}<span class="muted">${len} 字</span>${A.url ? `<a href="${esc(A.url)}" target="_blank" rel="noopener" class="muted">原文 ↗</a>` : ''}</div>
        <h1 class="rd-title" lang="ja">${A.icon ? `<span aria-hidden="true">${A.icon}</span> ` : ''}<span class="rd-tt">${tokensHTML(S.titleTk, 't')}</span></h1>
        ${A.zh ? `<div class="rd-zh rd-tzh">${esc(A.zh)}</div>` : ''}
        <p class="muted rd-tip rd-hint">👆 點任何一個詞：看讀音、中文，加入不會清單</p>
        <div class="rd-body" lang="ja"></div>
      </div>
      <div class="rd-extras"><p class="muted center">分析本文文法中…</p></div>
      <div class="rd-endbox"></div>
    </article>`;
    drawBody(el, S);
    drawEnd(el, S);
    const doc = el.querySelector('.rd-doc');
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, v = !b.classList.contains('on');
      b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); doc.classList.toggle(k, v); setPref(k, v);
    });
    el.querySelector('.rd-all').onclick = () => App.speak(A.paras.map(p => p.jp).join('。'), .85);
    doc.addEventListener('click', e => {
      const w = e.target.closest('.rd-w'); if (!w) return;
      const [key, k] = w.dataset.k.split(':');
      const t = key === 't' ? S.titleTk[+k] : S.tokens[+key][+k];
      if (!t) return;
      S.tapped++;
      const text = key === 't' ? A.title : A.paras[+key].jp;
      const zh = key === 't' ? A.zh : A.paras[+key].zh;
      el.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel'));
      w.classList.add('sel');
      wordCard(t, { title: A.title, sentence: sentenceOf(text, t.i), zh: A.paras.length && zh && JPText.sentences(text).length === 1 ? zh : '', source: '📖 閱讀', onClose: () => { w.classList.remove('sel'); markTracked(el, S); } });
    });
  }
  function drawBody(el, S) {
    const body = el.querySelector('.rd-body'); if (!body) return;
    body.innerHTML = S.A.paras.map((p, k) => `<div class="rd-para"><p class="rd-p">${tokensHTML(S.tokens[k], k)}<button type="button" class="rd-say" data-say="${k}" aria-label="朗讀這段">🔊</button></p>${p.zh ? `<p class="rd-zh">${esc(p.zh)}</p>` : ''}</div>`).join('');
    body.querySelectorAll('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); App.speak(S.A.paras[+b.dataset.say].jp, .85); });
    const tt = el.querySelector('.rd-tt'); if (tt) tt.innerHTML = tokensHTML(S.titleTk, 't');
  }
  function markTracked(el, S) {
    el.querySelectorAll('.rd-w[data-k]').forEach(w => {
      const [key, k] = w.dataset.k.split(':');
      const t = key === 't' ? S.titleTk[+k] : (S.tokens[+key] || [])[+k];
      if (t) w.classList.toggle('tk', Tracker.has('word:' + t.base));
    });
    syncTrackBtns(el);
  }

  // 文末：本文片語、本文文法
  function drawExtras(el, S) {
    const box = el.querySelector('.rd-extras'); if (!box) return;
    const A = S.A, text = A.paras.map(p => p.jp).join('\n');
    const all = [].concat(...S.tokens.map((tk, k) => { const off = A.paras.slice(0, k).reduce((n, p) => n + p.jp.length + 1, 0); return tk.map(t => Object.assign({}, t, { i: t.i + off })); }));
    const gram = JPText.findGrammar(text, all, 12);
    const phr = JPText.findPhrases(text, all, 10);
    const gItem = g => ({ id: g.id, jp: g.pat, kana: '', romaji: '', zh: g.zh, hint: (g.ex && g.ex[0] ? '例：' + g.ex[0] + '（' + (g.ex[1] || '') + '）' : '') + (g.conn ? '｜接續：' + g.conn : ''), source: '📐 文法' });
    const pItem = p => App.wordItem({ jp: p.jp, kana: p.kana, romaji: p.romaji, zh: p.zh, hint: `出自《${A.title}》：${p.sent}` }, '🧩 片語', 'phrase');
    const mark = (s, a, b) => esc(s.slice(0, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>' + esc(s.slice(b));
    S.gItems = gram.map(gItem); S.pItems = phr.map(pItem);
    box.innerHTML = `
      <section class="rd-sec">
        <div class="rd-sech"><h3>🧩 本文片語 <small class="muted">${phr.length}</small></h3>${phr.length ? '<button type="button" class="btn sm" data-all="p">全部加入</button>' : ''}</div>
        ${phr.length ? phr.map((p, k) => `<div class="rd-li">
          <div class="rd-lih"><b lang="ja">${esc(p.jp)}</b><button type="button" class="rd-say" data-sp="${esc(p.jp)}" aria-label="朗讀">🔊</button></div>
          <div class="rd-lik" lang="ja">${esc(p.kana || '')}${p.romaji ? ' ・ ' + esc(p.romaji) : ''}</div>
          <div>${esc(p.zh)} <span class="chip">${esc(p.src)}</span></div>
          ${p.sent ? `<div class="rd-src" lang="ja">${p.sent.indexOf(p.key) >= 0 ? mark(p.sent, p.sent.indexOf(p.key), p.sent.indexOf(p.key) + p.key.length) : esc(p.sent)}</div>` : ''}
          ${App.trackBtn(S.pItems[k], true)}</div>`).join('') : '<p class="muted rd-tip">這篇沒有找到常用片語。</p>'}
      </section>
      <section class="rd-sec">
        <div class="rd-sech"><h3>📐 本文文法 <small class="muted">${gram.length}</small></h3>${gram.length ? '<button type="button" class="btn sm" data-all="g">全部加入</button>' : ''}</div>
        ${gram.length ? gram.map((g, k) => `<div class="rd-li">
          <div class="rd-lih"><b lang="ja">${esc(g.pat)}</b>${lvBadge(g.lv)}${g.count > 1 ? `<small class="muted">出現 ${g.count} 次</small>` : ''}</div>
          <div>${esc(g.zh)}</div>
          ${g.conn ? `<div class="muted rd-small">接續：${esc(g.conn)}</div>` : ''}
          <div class="rd-src" lang="ja">${mark(g.sent, g.hl[0], g.hl[1])}</div>
          ${g.ex && g.ex[0] ? `<div class="muted rd-small" lang="ja">例：${esc(g.ex[0])}　${esc(g.ex[1] || '')}</div>` : ''}
          ${App.trackBtn(S.gItems[k], true)}</div>`).join('') : '<p class="muted rd-tip">這篇沒有找到可列出的文法。</p>'}
      </section>`;
    box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => App.speak(b.dataset.sp, .85));
    box.querySelectorAll('[data-all]').forEach(b => b.onclick = () => {
      const items = b.dataset.all === 'g' ? S.gItems : S.pItems;
      let n = 0; items.forEach(it => { if (!Tracker.has(it.id) && Tracker.add(it, true)) n++; });
      syncTrackBtns(el);
      toast(n ? `📌 已加入 ${n} 筆到不會清單` : '都已在不會清單了', n ? 'ok' : '');
    });
  }

  // 理解題＋讀完
  function drawEnd(el, S) {
    const box = el.querySelector('.rd-endbox'); if (!box) return;
    const A = S.A, q = A.q;
    let opts = null;
    if (q) opts = App.shuffle([q[1], q[2], q[3]]);
    box.innerHTML = `${q ? `<section class="rd-sec rd-quiz"><h3>❓ 讀懂了嗎？</h3><p>${esc(q[0])}</p><div class="rd-qopts">${opts.map(o => `<button type="button" class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div></section>` : ''}
      <button type="button" class="btn primary block rd-finish">✔ 讀完了</button>`;
    box.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      if (S.quiz != null) return;
      S.quiz = b.dataset.o === q[1];
      b.classList.add(S.quiz ? 'ok' : 'ng');
      if (!S.quiz) box.querySelectorAll('[data-o]').forEach(x => { if (x.dataset.o === q[1]) x.classList.add('ok'); });
      App.toast(S.quiz ? '⭕ 答對了！' : '❌ 再看一次文章吧', S.quiz ? 'ok' : '');
    });
    box.querySelector('.rd-finish').onclick = () => finish(S);
  }
  function finish(S) {
    const A = S.A;
    if (A.q && S.quiz == null) { toast('先回答上面的問題吧'); const q = document.querySelector('.rd-quiz'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const stars = Math.max(1, Math.min(3, 1 + (S.tapped > 0 ? 1 : 0) + (A.q ? (S.quiz ? 1 : 0) : (S.tapped > 2 ? 1 : 0))));
    const r = App.reward('read:' + A.id, stars, '閱讀');
    const st = ST(); st.done[A.id] = Math.max(st.done[A.id] || 0, stars); if (A.daily) st.lastDay = App.today(); App.save();
    try { document.dispatchEvent(new CustomEvent('readdone', { detail: { id: A.id, stars } })); } catch (e) { }
    let next = null;
    if (A.daily) {
      const same = READING.daily.filter(a => a.lv === A.lv);
      const n = same.find(a => !st.done[a.id] && a.id !== A.id) || same[(same.findIndex(a => a.id === A.id) + 1) % same.length];
      if (n && n.id !== A.id) next = { label: '下一篇 ➜', route: 'read-article', params: { daily: n.id } };
    }
    App.showResult({
      title: '讀完了！', stars, gained: r && r.gained,
      note: `<p class="muted">${S.tapped ? `查了 ${S.tapped} 個詞。` : '下次試著點不懂的詞，查一查會多一顆星。'}${A.q ? (S.quiz ? '理解題答對！' : '理解題沒答對，可以再讀一次。') : ''}</p>`,
      back: { label: '回閱讀', route: 'read' }, next
    });
  }

  document.addEventListener('profilechange', () => { try { const m = document.getElementById('main'); if (m && /route-read$/.test(m.className)) App.render(); } catch (e) { } });

  // 首頁用：今日每日短文已讀完 → true
  function todayDone() {
    try {
      const t = READING.pick(lvNow(), App.today());
      return !!(t && ST().done[t.id]);
    } catch (e) { return false; }
  }

  window.Reader = { tokensHTML, wordCard, syncTrackBtns, lvBadge, pref, setPref, saveDoc, readShare, todayDone };
})();
