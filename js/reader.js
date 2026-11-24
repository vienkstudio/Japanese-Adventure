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
  // 開放授權來源的標示（CC BY／BY-SA 要求標出處與授權）：維基系列網址 → 「維基百科・CC BY-SA 4.0」
  const licOf = url => { try { const w = LinkImport.wikiOf(new URL(url)); return w ? `<span class="muted rd-lic">${esc(LinkImport.WIKI_NAME[w.project] + '・' + LinkImport.WIKI_LIC[w.project])}</span>` : ''; } catch (e) { return ''; } };
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
  // 原文讀音：匯入時把 <ruby> 存成「｜漢字《かんじ》」，顯示前拆成 純文字＋讀音區段
  const FURI = /｜([^｜《》\n]+)《([^《》\n]+)》/g;
  const plain = s => String(s || '').replace(FURI, '$1');
  function parseFuri(s) {
    s = String(s || ''); let jp = '', last = 0; const furi = [];
    s.replace(FURI, (m, b, r, off) => { jp += s.slice(last, off); furi.push([jp.length, jp.length + b.length, JPText.toHira(r)]); jp += b; last = off + m.length; return m; });
    return { jp: jp + s.slice(last), furi };
  }
  // 斷詞結果套用原文讀音：讀音區段完整落在詞內才採用（優先於字典推測）
  function applyFuri(tokens, furi) {
    if (!furi || !furi.length) return tokens;
    tokens.forEach(t => {
      if (t.sym || !JPText.hasKanji(t.s)) return;
      const a = t.i, b = t.i + t.s.length, rs = furi.filter(f => f[0] < b && f[1] > a);
      if (!rs.length || rs.some(f => f[0] < a || f[1] > b)) return;
      let out = '', p = a;
      rs.forEach(f => { out += t.s.slice(p - a, f[0] - a) + f[2]; p = f[1]; });
      out += t.s.slice(p - a);
      if (JPText.hasKanji(out)) return;
      out = JPText.toHira(out);
      if (out === t.kana) { t.src = true; return; }
      if (t.known && t.bkana && t.kana && t.bkana === t.kana) t.bkana = out;
      if (!t.known) t.bkana = out;
      t.kana = out; t.src = true; t.romaji = JPText.romaji(out);
    });
    return tokens;
  }
  function tokenizeFuri(p) { return applyFuri(JPText.tokenize(p.jp), p.furi); }

  async function saveDoc(d) {
    const id = hash(d.text);
    const doc = { id, title: (d.title || '').trim().slice(0, 240) || plain(d.text).trim().split('\n')[0].slice(0, 24), text: d.text, url: d.url || '', src: d.src || 'paste', at: Date.now() };
    await App.idb.set('doc:' + id, doc);
    let idx = (await docIndex()).filter(x => x.id !== id);
    idx.unshift({ id, title: plain(doc.title).slice(0, 80), at: doc.at, len: plain(doc.text).length, url: doc.url });
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
    return { title, text: text.slice(0, MAXLEN), url: LinkImport.publicURL(url)?.href || '' };
  }

  /* ---------------- 閱讀首頁 ---------------- */
  App.register('read', {
    title: '閱讀', icon: '📄', nav: false, navParent: 'lookup',
    render(el, params) {
      params = params || {};
      const sh = readShare();
      if (sh) {
        App.go('read', sh.url && !sh.text ? { mode: 'url', url: sh.url } : { mode: 'paste', share: sh });
        return;
      }
      if (params.mode === 'paste') return pasteView(el, params.share || {});
      if (params.mode === 'url') return urlView(el, params);
      homeView(el, params);
    }
  });

  function homeView(el, params) {
    const lv = lvNow(), st = ST();
    const t = READING.pick(lv, App.today());
    const tab = params.lv || lv;
    const list = READING.daily.filter(a => a.lv === tab);
    const doneMark = id => st.done[id] ? `<span class="rd-done" title="已讀">✔</span>` : '';
    const nc = LinkImport.NEWS_CATS.some(c => c.id === (params.news || newsCat)) ? params.news || newsCat : 'wp';
    const sec = params.sec || readSec || 'news'; readSec = sec;
    el.innerHTML = `<div class="rd-home">
      ${Reader.sectTabs(sec)}
      <section class="rd-news"${sec === 'news' ? '' : ' hidden'}>
        <div class="rd-sech"><h3 class="rd-h3" id="rdNewsH">🗞️ 最近的新聞</h3><button type="button" class="btn sm ghost" id="rdNewsRe" aria-label="重新整理">🔄</button></div>
        <div class="tabs rd-tabs rd-ncat" role="tablist">${LinkImport.NEWS_CATS.map(c => `<button type="button" data-ncat="${c.id}" class="${c.id === nc ? 'on' : ''}" role="tab" aria-selected="${c.id === nc}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>
        <p class="muted rd-tip rd-nnote"></p>
        <div class="rd-list" id="rdNews"><p class="muted rd-tip">讀取新聞中…</p></div>
        <details class="rd-box rd-det rd-support"><summary>ℹ️ 哪些來源可以匯入？（只用開放授權）</summary>
          <ul class="rd-sup">
            <li>✅ <b>維基百科「最近の出来事」</b>：每天更新的新聞摘要，點一則讀相關條目（CC BY-SA 4.0）。</li>
            <li>✅ <b>維基新聞</b>：日文版 2026 年起停止更新，過去的報導都能讀（CC BY 2.5）。</li>
            <li>✅ <b>維基文庫</b>：著作權已過期的唱歌、童謠與文學（公有領域）。</li>
            <li>✅ <b>維基百科、維基教科書、維基語錄、維基導遊的任一頁網址</b>：自動擷取正文。</li>
            <li>✍️ <b>其他網站</b>：不自動抓取（新聞、部落格多半受著作權保護）。請自己貼上文字，只存在你的裝置。</li>
          </ul>
          <p class="muted rd-tip">匯入後一律自動標讀音、羅馬字、中文，文末列出本文單字、片語、文法，都能加入不會清單。</p>
        </details>
      </section>
      <div class="rd-artsec"${sec === 'art' ? '' : ' hidden'}>
      <button type="button" class="rd-today" data-go="${t.id}">
        <span class="rd-today-ic" aria-hidden="true">${t.icon}</span>
        <span class="rd-today-tx"><small>今日短文・${esc(READING.LV_DESC[t.lv])}</small><b>${esc(t.title)}</b><span class="muted">${esc(t.zh)}</span></span>
        <span class="rd-today-go">${st.done[t.id] ? '✔ 已讀' : '開始讀 ➜'}</span>
      </button>
      <div class="rd-acts">
        <button type="button" class="rd-act" data-act="paste"><span>📋</span>貼上文章</button>
        <button type="button" class="rd-act" data-act="url"><span>🔗</span>匯入文章網址</button>
      </div>
      <h3 class="rd-h3">📚 文章庫</h3>
      <div class="tabs rd-tabs">${READING.LV.map(l => `<button type="button" data-lv="${l}" class="${l === tab ? 'on' : ''}">${esc(READING.LV_NAME[l])}</button>`).join('')}</div>
      <p class="muted rd-tip">${esc(READING.LV_DESC[tab])}・點文章開始讀，點任何一個詞看意思</p>
      <div class="rd-list">${list.map(a => `<button type="button" class="rd-item" data-go="${a.id}"><span class="rd-ic" aria-hidden="true">${a.icon}</span><span class="rd-it"><b>${esc(a.title)}</b><small class="muted">${esc(a.zh)}</small></span>${doneMark(a.id)}</button>`).join('')}</div>
      ${(window.BIZ_READING || []).length ? `<h3 class="rd-h3">💼 商務</h3><div class="rd-list">${window.BIZ_READING.map(a => `<button type="button" class="rd-item" data-biz="${esc(a.id)}"><span class="rd-ic" aria-hidden="true">${a.icon || '💼'}</span><span class="rd-it"><b>${esc(a.title)}</b><small class="muted">${esc(a.zh)}・${esc(String(a.lv || '').toUpperCase())}</small></span></button>`).join('')}</div>` : ''}
      <h3 class="rd-h3">🗂️ 我的文章</h3>
      <div class="rd-list" id="rdMine"><p class="muted rd-tip">讀取中…</p></div>
      <p class="muted rd-tip">貼上的文章只存在這台裝置，不會上傳。</p>
      </div>
    </div>`;
    bindSect(el, true);
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => App.go('read-article', { daily: b.dataset.go }));
    el.querySelectorAll('[data-biz]').forEach(b => b.onclick = () => App.go('biz-read', { id: b.dataset.biz }));
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => homeView(el, { lv: b.dataset.lv, news: nc, sec: 'art' }));
    el.querySelectorAll('[data-ncat]').forEach(b => b.onclick = () => {
      newsCat = b.dataset.ncat;
      el.querySelectorAll('[data-ncat]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      delete el.querySelector('#rdNews').dataset.more; drawNews(el, newsCat);
    });
    el.querySelector('#rdNewsRe').onclick = () => { try { sessionStorage.removeItem((LinkImport.NEWS_KEY || 'jpq.news.') + (newsCat || nc)); } catch (e) { } drawNews(el, newsCat || nc); };
    if (sec === 'news') drawNews(el, nc);
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'songs') App.go('songs');
      else App.go('read', { mode: a });
    });
    docIndex().then(idx => {
      const box = el.querySelector('#rdMine'); if (!box) return;
      if (!idx.length) { box.innerHTML = `<p class="muted rd-tip">還沒有。按上面「📋 貼上文章」把新聞、網誌、歌詞貼進來就能逐詞查。</p>`; return; }
      box.innerHTML = idx.map(d => `<div class="rd-item rd-mine"><button type="button" class="rd-open" data-doc="${esc(d.id)}"><span class="rd-ic" aria-hidden="true">📄</span><span class="rd-it"><b>${esc(d.title)}</b><small class="muted">${d.len} 字・${esc(new Date(d.at).toLocaleDateString())}</small></span>${st.done['doc:' + d.id] ? '<span class="rd-done">✔</span>' : ''}</button><button type="button" class="rd-del" data-del="${esc(d.id)}" aria-label="刪除">✕</button></div>`).join('');
      box.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => App.go('read-article', { doc: b.dataset.doc }));
      box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => App.modal('<h2>刪除這篇文章？</h2><p class="muted">只會刪掉這台裝置上的全文，不會影響不會清單。</p>', [{ label: '取消' }, { label: '刪除', cls: 'primary', onClick: () => delDoc(b.dataset.del).then(() => homeView(el, { lv: tab })) }]));
    });
  }

  let newsCat = '', readSec = '';
  // 閱讀頁與歌曲頁共用的頂部分頁
  function sectTabs(cur) {
    return `<div class="tabs rd-sects" role="tablist">${[['news', '📰 新聞'], ['art', '📚 文章'], ['song', '🎵 歌曲']].map(([k, n]) => `<button type="button" role="tab" data-sect="${k}" class="${k === cur ? 'on' : ''}" aria-selected="${k === cur}">${n}</button>`).join('')}</div>`;
  }
  function bindSect(el, inRead) {
    el.querySelectorAll('[data-sect]').forEach(b => b.onclick = () => {
      const k = b.dataset.sect;
      if (k === 'song') { App.go('songs'); return; }
      readSec = k;
      if (inRead) return homeView(el, { sec: k });
      App.go('read', { sec: k });
    });
  }
  const ago = t => { if (!t) return ''; const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + ' 分鐘前' : m < 1440 ? Math.round(m / 60) + ' 小時前' : Math.round(m / 1440) + ' 天前'; };
  async function drawNews(el, id) {
    const box = el.querySelector('#rdNews'); if (!box) return;
    const cat = LinkImport.NEWS_CATS.find(c => c.id === id) || LinkImport.NEWS_CATS[0];
    el.querySelector('.rd-nnote').textContent = cat.note || '點標題自動匯入全文，標好讀音與中文';
    const hh = el.querySelector('#rdNewsH'); if (hh) hh.textContent = cat.id === 'wp' ? '🗞️ 最近的新聞' : cat.icon + ' ' + cat.name;
    box.innerHTML = '<p class="muted rd-tip">讀取新聞中…</p>';
    let items;
    try { items = await LinkImport.newsList(cat.id, 7); }
    catch (e) { if (box.isConnected) box.innerHTML = '<p class="rd-warn">新聞來源暫時讀不到，請按 🔄 重試，或改用「貼上文章」。</p>'; return; }
    if (!box.isConnected || (newsCat && newsCat !== cat.id)) return;
    if (!items.length) { box.innerHTML = '<p class="muted rd-tip">這個來源目前沒有內容。</p>'; return; }
    const idx = await docIndex();
    const have = new Map(idx.filter(d => d.url).map(d => [d.url, d.id]));
    const kOf = n => n.key || n.link;
    const lim = box.dataset.more ? items.length : 8;
    box.innerHTML = items.slice(0, lim).map((n, k) => `<button type="button" class="rd-item rd-nitem" data-n="${k}"><span class="rd-ic" aria-hidden="true">${cat.icon}</span><span class="rd-it"><b lang="ja">${esc(n.title)}</b><small class="muted">${esc(n.src)}${n.t ? '・' + (cat.easy ? new Date(n.t).toLocaleDateString() : ago(n.t)) : ''}</small></span>${have.has(kOf(n)) ? '<span class="rd-done" title="已匯入">✔</span>' : '<span class="rd-go" aria-hidden="true">➜</span>'}</button>`).join('') + (items.length > lim ? `<button type="button" class="btn block ghost rd-nmore">顯示更多（還有 ${items.length - lim} 則）</button>` : '');
    const more = box.querySelector('.rd-nmore'); if (more) more.onclick = () => { box.dataset.more = '1'; drawNews(el, id); };
    box.querySelectorAll('[data-n]').forEach(b => b.onclick = async () => {
      const n = items[+b.dataset.n];
      if (have.has(kOf(n))) { App.go('read-article', { doc: have.get(kOf(n)) }); return; }
      if (b.disabled) return;
      b.disabled = true; const sm = b.querySelector('small'), old = sm.textContent; sm.textContent = '匯入中，正在擷取全文…';
      try {
        const d = n.key && LinkImport.newsDoc ? await LinkImport.newsDoc(n) : await LinkImport.article(n.link);
        const id = await saveDoc({ ...d, title: d.title || n.rt || n.title, src: 'news' });
        if (b.isConnected) App.go('read-article', { doc: id });
      } catch (e) {
        if (b.isConnected) { sm.textContent = '這篇讀不到全文（可能需要登入），可開原網頁複製後用「貼上文章」'; b.disabled = false; setTimeout(() => { if (sm.isConnected) sm.textContent = old; }, 5000); }
      }
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
  function urlView(el, params) {
    const bm = bookmarklet(), httpOK = /^https?:/.test(location.protocol);
    el.innerHTML = `<div class="rd-home">
      <h2 class="rd-h2">🔗 匯入日文文章</h2>
      <form id="rdImport">
        <label class="rd-lbl">開放授權網頁網址（維基百科、維基文庫…）<input id="rdU" class="rd-in" type="url" inputmode="url" placeholder="https://ja.wikipedia.org/wiki/…" value="${esc(params.url || '')}" required></label>
        <div class="rd-row"><button type="submit" class="btn primary" id="rdFetch">匯入並開始讀</button><button type="button" class="btn" id="rdPaste">手動貼上全文</button></div>
        <p id="rdImportStatus" class="rd-tip" role="status" aria-live="polite"></p>
      </form>
      <p class="muted rd-tip">只自動匯入開放授權的網站：維基百科、維基文庫、維基新聞、維基教科書、維基語錄、維基導遊。其他網站的文章請按「手動貼上全文」（只存在你的裝置，不上傳）。</p>
      <details class="rd-box rd-det"><summary>開啟原文或使用書籤小工具</summary>
        <p><button type="button" class="btn" id="rdOpen">開啟原網頁</button></p>
        <p>可把按鈕拖到書籤列，在原網頁按一下就送出選取的文字。${httpOK ? '' : '（需透過網站開啟日語冒險。）'}</p>
        <div class="rd-row"><a class="btn rd-bm" href="${esc(bm)}" onclick="return false" draggable="true">📰 讀日文</a><button type="button" class="btn" id="rdCopyBm">複製程式碼</button></div>
        <details id="rdBmCode"><summary>書籤程式碼</summary><textarea class="rd-in rd-code" rows="4" readonly>${esc(bm)}</textarea></details>
      </details>
    </div>`;
    const u = el.querySelector('#rdU'), form = el.querySelector('#rdImport');
    const submit = form.querySelector('#rdFetch'), status = form.querySelector('#rdImportStatus');
    const val = () => LinkImport.publicURL(u.value);
    el.querySelector('#rdOpen').onclick = () => { const v = val(); if (!v) { toast('請輸入公開網頁網址'); u.focus(); return; } window.open(v.href, '_blank', 'noopener'); };
    el.querySelector('#rdPaste').onclick = () => App.go('read', { mode: 'paste', share: { url: val()?.href || '', text: '', title: '' } });
    form.onsubmit = async e => {
      e.preventDefault();
      if (submit.disabled) return;
      const url = val();
      if (!url) { status.textContent = '請輸入公開的文章網址'; u.focus(); return; }
      submit.disabled = true;
      status.textContent = '正在擷取文章正文…';
      try {
        const d = await LinkImport.article(url.href);
        if (!form.isConnected) return;
        const id = await saveDoc({ ...d, src: 'url' });
        if (form.isConnected) App.go('read-article', { doc: id });
      } catch (err) {
        if (form.isConnected) status.textContent = (err.message || '匯入失敗') + '。也可以改用「手動貼上全文」。';
      } finally { submit.disabled = false; }
    };
    el.querySelector('#rdCopyBm').onclick = () => {
      const done = () => toast('✅ 已複製書籤程式碼', 'ok');
      const show = () => { const box = el.querySelector('#rdBmCode'); if (box) box.open = true; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(bm).then(done).catch(show);
      else show();
    };
    if (params.auto) form.requestSubmit();
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
      // 逐詞中文：辭書形意思＋活用語意（JPText.gloss：忘れられない→忘記不了、会いたかった→好想見面）
      const g0 = t.zh ? (JPText.gloss ? JPText.gloss(t) : String(t.zh).split(/[；;，,（(]/)[0].slice(0, 8)) : '';
      // 否定形：「見えない」顯示「不 看得見」；字典沒有的漢字詞顯示「未收錄」（整詞保留）
      const gl = CONTENT.test(t.pos) && t.zh && t.pos !== 'num' ? `<span class="rd-gl">${esc(g0)}</span>` : t.unreg ? '<span class="rd-gl rd-unreg">未收錄</span>' : '';
      const og = window.Loan && Loan.isKata(t.s) ? Loan.label(t.s) : '';
      return `<span class="rd-w${lv}${tracked}${t.known ? '' : ' unk'}" data-k="${key}:${k}"><span class="rd-s">${JPText.ruby(t.s, t.kana)}</span><span class="rd-ro">${esc(t.romaji || '')}</span>${gl}${og ? `<span class="rd-og" lang="en">${esc(og)}</span>` : ''}</span>`;
    });
  }
  function sentenceOf(text, i) {
    const s = JPText.sentences(text).find(x => i >= x.i && i < x.i + x.s.length);
    return s ? s.s.trim() : '';
  }
  // 多管道查詢（知識是公共財）：只連開放授權的辭典與例句庫，本站不抓取它們的內容
  const REFS = [['維基詞典・日', w => 'https://ja.wiktionary.org/wiki/' + encodeURIComponent(w)], ['維基詞典・中', w => 'https://zh.wiktionary.org/wiki/' + encodeURIComponent(w)],
    ['維基百科', w => 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(w)], ['Tatoeba 例句', w => 'https://tatoeba.org/zh-tw/sentences/search?' + new URLSearchParams({ query: w, from: 'jpn', to: 'cmn' })]];
  const refLinks = w => w ? `<div class="rd-refs"><b class="rd-sh">查更多（開放資料）</b>${REFS.map(([n, u]) => `<a href="${esc(u(w))}" target="_blank" rel="noopener" class="chip">${esc(n)} ↗</a>`).join('')}</div>` : '';
  // ctx: {title, sentence, source:'📖 閱讀'|'🎵 歌曲', zh(整句中文，可無), onClose}
  function wordCard(t, ctx) {
    ctx = ctx || {};
    const base = t.base || t.s, bk = t.bkana || t.kana || '';
    const item = App.wordItem({ jp: base, kana: bk, romaji: JPText.romaji(bk), zh: (t.zh || '（自填）') + (window.Loan && Loan.label(base) ? '（' + Loan.label(base) + '）' : ''), hint: ctx.title ? `出自《${ctx.title}》：${ctx.sentence || ''}` : (ctx.sentence || '') }, ctx.source || '📖 閱讀', 'word');
    const sent = ctx.sentence && ctx.sentence.length <= 60 ? App.wordItem({ jp: ctx.sentence, kana: '', zh: ctx.zh || '（整句）', hint: ctx.title ? `出自《${ctx.title}》` : '' }, ctx.source || '📖 閱讀', 'phrase') : null;
    const form = t.form && JPText.FORM_ZH[t.form] ? `・${JPText.FORM_ZH[t.form]}` : '';
    const html = `<div class="rd-card">
      <div class="rd-big" lang="ja">${JPText.ruby(t.s, t.kana)}</div>
      <div class="rd-kana" lang="ja">${esc(t.kana || '')}${t.romaji ? ' ・ ' + esc(t.romaji) : ''}</div>
      ${base !== t.s ? `<div class="rd-base">原形：<b lang="ja">${esc(base)}</b>${bk && bk !== base ? `（${esc(bk)}）` : ''}${esc(form)}</div>` : ''}
      <div class="rd-mean">${t.frag ? '<span class="muted">這是前一個詞的活用或口語語尾（例：〜ちゃ＝〜ては、〜とく＝〜ておく），不是獨立的單字，請點前一個詞看意思。</span>' : t.zh ? (t.neg ? '<span class="chip">否定</span> ' : '') + esc(String(t.zh).split('｜')[0]) : t.unreg ? `<span class="muted">未收錄：字典還沒有「${esc(t.s)}」這個詞${t.kana ? (t.src ? '，讀音取自原文' : '') : '，讀音未知'}。可在下面自己填中文。</span>` : '<span class="muted">字典沒有這個詞</span>'}</div>
      ${window.Loan && Loan.label(t.s, 1) ? `<div class="rd-loan">${esc(Loan.label(t.s, 1))}</div>` : window.Loan && Loan.isKata(t.s) && t.s.length > 2 && !(window.LOAN[t.s] && LOAN[t.s][0] === 'ja') ? `<div class="rd-loan muted">🌐 外來語（字典尚未收錄原文，讀音：${esc(t.romaji || '')}）</div>` : ''}
      <div class="chips rd-chips">${t.lv ? lvBadge(t.lv) : ''}${t.pos && JPText.POS_ZH[t.pos] ? `<span class="chip">${esc(JPText.POS_ZH[t.pos])}</span>` : ''}</div>
      <div class="rd-sen" hidden></div><div class="rd-kj" hidden></div>
      ${t.frag || t.hon ? '' : refLinks(base)}
      ${t.alts && t.alts.length ? `<div class="rd-alts muted">也可能是：${t.alts.map(a => `${esc(a.jp)}（${esc(String(a.zh).split(/[；;]/)[0])}）`).join('、')}</div>` : ''}
      ${(!t.known && !t.frag) || t.user ? `<div class="rd-user"><input class="rd-in" id="rdUz" placeholder="自己填中文意思" value="${esc(t.user ? t.zh : '')}"><button type="button" class="btn sm" id="rdUs">存</button></div>` : ''}
      ${ctx.sentence ? `<div class="rd-sent" lang="ja">「${esc(ctx.sentence)}」</div>` : ''}
      <div class="rd-row rd-card-btns"><button type="button" class="btn sm" id="rdSay">🔊 聽</button>${t.frag || t.hon ? '' : App.trackBtn(item)}</div>
      ${sent ? `<div class="rd-row rd-card-btns"><span class="muted">整句：</span>${App.trackBtn(sent, true)}<button type="button" class="btn sm" id="rdSayS">🔊 整句</button></div>` : ''}
    </div>`;
    App.modal(html, [{ label: '關閉', onClick: ctx.onClose }]);
    const bg = document.body.lastElementChild;
    if (!bg) return;
    const $ = s => bg.querySelector(s);
    $('#rdSay').onclick = () => App.speak(t.s, .8);
    // 多義（data/reading/senses.js）與漢字音讀／訓讀（data/reading/kanji.js）：點開詞卡才載，載完補上
    if (t.known && !t.frag && JPText.senses) JPText.senses(t).then(G => {
      const box = $('.rd-sen'); if (!box || !G.length || G.reduce((a, g) => a + g.list.length, 0) < 2) return;
      box.innerHTML = `<b class="rd-sh">意思</b>` + G.map(g => `${G.length > 1 && g.kana ? `<div class="rd-sk" lang="ja">${esc(g.kana)}</div>` : ''}<ol class="rd-sl">${g.list.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`).join('');
      box.hidden = false;
    }).catch(() => { });
    if (t.known && !t.frag && JPText.kanji && JPText.hasKanji(t.base || t.s)) JPText.kanji(t).then(P => {
      const box = $('.rd-kj'); if (!box || !P.length) return;
      box.innerHTML = `<b class="rd-sh">漢字</b>${P[0] && P[0].jukuji ? '<p class="rd-kn muted">整詞特殊讀法（熟字訓），不能逐字拆音讀／訓讀</p>' : ''}<div class="rd-kl">${P.map(p => `<div class="rd-k"><span class="rd-kc" lang="ja">${esc(p.k)}</span><span class="rd-kr" lang="ja">${esc(p.r || '')}${p.t ? `<i class="rd-kt ${p.t === '音' ? 'on' : 'kun'}">${p.t}讀</i>` : ''}</span><small class="rd-kz">${esc(p.zh || '')}</small><small class="rd-ko muted" lang="ja">${p.on ? '音 ' + esc(p.on.replace(/,/g, '、')) : ''}${p.on && p.kun ? '・' : ''}${p.kun ? '訓 ' + esc(p.kun.replace(/,/g, '、')) : ''}</small></div>`).join('')}</div>`;
      box.hidden = false;
    }).catch(() => { });
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
    title: '閱讀', icon: '📄', nav: false, navParent: 'read',
    render(el, params) { articleView(el, params || {}); }
  });

  async function loadArticle(params) {
    if (params.daily) {
      const a = READING.byId(params.daily); if (!a) return null;
      return { id: a.id, title: a.title, zh: a.zh, lv: a.lv, paras: a.p.map(x => ({ jp: x[0], zh: x[1] })), q: a.q, daily: true, icon: a.icon };
    }
    if (params.doc) {
      const d = await App.idb.get('doc:' + params.doc); if (!d) return null;
      const T = parseFuri(d.title);
      return { id: 'doc:' + d.id, title: T.jp, titleFuri: T.furi, url: d.url, paras: d.text.split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => Object.assign(parseFuri(s), { zh: '' })), daily: false };
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
    S.tokens = S.A.paras.map(tokenizeFuri);
    S.titleTk = tokenizeFuri({ jp: S.A.title, furi: S.A.titleFuri });
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
        <button type="button" class="btn sm primary rd-topdone" aria-label="讀完了">✔ 讀完</button>
      </div>
      <div class="rd-doc ${P.y ? 'y' : ''} ${P.r ? 'r' : ''} ${P.z ? 'z' : ''} ${A.daily ? 'daily' : 'mine'}">
        <div class="rd-meta">${A.lv ? lvBadge(A.lv) : '<span class="chip">我的文章</span>'}<span class="muted">${len} 字</span>${A.url ? `<a href="${esc(A.url)}" target="_blank" rel="noopener" class="muted">原文 ↗</a>` : ''}${licOf(A.url)}</div>
        <h1 class="rd-title" lang="ja">${A.icon ? `<span aria-hidden="true">${A.icon}</span> ` : ''}<span class="rd-tt">${tokensHTML(S.titleTk, 't')}</span></h1>
        ${A.zh ? `<div class="rd-zh rd-tzh">${esc(A.zh)}</div>` : ''}
        <p class="muted rd-tip rd-hint">👆 點任何一個詞：看讀音、中文，加入不會清單</p>
        <div class="rd-body" lang="ja"></div>
      </div>
      <div class="rd-endbox"></div>
      <div class="rd-extras"><p class="muted center">分析本文文法中…</p></div>
    </article>`;
    drawBody(el, S);
    drawEnd(el, S);
    const doc = el.querySelector('.rd-doc');
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, v = !b.classList.contains('on');
      b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); doc.classList.toggle(k, v); setPref(k, v);
    });
    el.querySelector('.rd-all').onclick = () => App.speak(A.paras.map(p => p.jp).join('。'), .85);
    el.querySelector('.rd-topdone').onclick = () => finish(S);
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

  // 本文單字：依等級排序的內容詞（去重），每個可加入不會清單；歌曲也共用
  const VPOS = /^(n|v|i|na|adv|exp|pron|int|conj|pre|unk|suf)$/;
  const LVR = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  function vocabList(tokenRows, texts, title, source, max) {
    const seen = new Map();
    tokenRows.forEach((row, r) => (row || []).forEach((t, ti) => {
      if (t.sym || !VPOS.test(t.pos) || t.pos === 'num') return;
      if (JPText.isFunc && JPText.isFunc(t, row[ti - 1])) return;   // いる、こと、ため、そう…不列為本文單字
      if (!t.known && !(t.src && t.kana)) return;
      if (t.known && !t.zh) return;
      if (t.s.length < 2 && !JPText.hasKanji(t.s)) return;
      const base = t.base || t.s, k = base;
      const o = seen.get(k);
      if (o) { o.n++; return; }
      const kana = t.bkana || t.kana || '';
      seen.set(k, { base, kana, romaji: JPText.romaji(kana), zh: t.zh || '', lv: t.lv || '', n: 1, sent: sentenceOf(texts[r] || '', t.i) });
    }));
    // 依使用者程度：N3 以上不列 N5／N4；自己的等級排最前，再來更難的，沒有等級的（未收錄）放最後
    const u = JPText.userLv ? JPText.userLv() : 0;
    const rank = lv => !LVR[lv] ? 30 : JPText.lvRank ? JPText.lvRank(lv, u) : LVR[lv];
    const list = [...seen.values()].filter(v => !JPText.lvKeep || JPText.lvKeep(v.lv, u)).sort((a, b) => rank(a.lv) - rank(b.lv) || b.n - a.n).slice(0, max || 60);
    const items = list.map(v => App.wordItem({ jp: v.base, kana: v.kana, romaji: v.romaji, zh: v.zh || '（自填）', hint: title ? `出自《${title}》：${v.sent}` : v.sent }, source, 'word'));
    return { list, items };
  }
  function vocabHTML(voc) {
    const { list, items } = voc;
    return `<section class="rd-sec">
        <div class="rd-sech"><h3>📚 本文單字 <small class="muted">${list.length}</small></h3>${list.length ? '<button type="button" class="btn sm" data-all="v">全部加入</button>' : ''}</div>
        ${list.length ? list.map((v, k) => `<div class="rd-li">
          <div class="rd-lih"><b lang="ja">${JPText.ruby(v.base, v.kana)}</b>${lvBadge(v.lv)}${v.n > 1 ? `<small class="muted">出現 ${v.n} 次</small>` : ''}<button type="button" class="rd-say" data-sp="${esc(v.base)}" aria-label="朗讀">🔊</button></div>
          <div class="rd-lik" lang="ja">${esc(v.kana)}${v.romaji ? ' ・ ' + esc(v.romaji) : ''}</div>
          <div>${esc(v.zh || '（字典沒有，加入後可自填）')}</div>
          ${window.Loan && Loan.label(v.base, 1) ? `<div class="rd-loan">${esc(Loan.label(v.base, 1))}</div>` : ''}
          ${App.trackBtn(items[k], true)}</div>`).join('') : '<p class="muted rd-tip">沒有找到可列出的單字。</p>'}
      </section>`;
  }

  // 文末：本文片語、本文文法
  function drawExtras(el, S) {
    const box = el.querySelector('.rd-extras'); if (!box) return;
    const A = S.A, text = A.paras.map(p => p.jp).join('\n');
    const all = [].concat(...S.tokens.map((tk, k) => { const off = A.paras.slice(0, k).reduce((n, p) => n + p.jp.length + 1, 0); return tk.map(t => Object.assign({}, t, { i: t.i + off })); }));
    const gram = JPText.findGrammar(text, all, 12, { lv: prof().lv || 'zero' });
    const phr = JPText.findPhrases(text, all, 10);
    const gItem = g => ({ id: g.id, jp: g.pat, kana: '', romaji: '', zh: g.zh, hint: (g.ex && g.ex[0] ? '例：' + g.ex[0] + '（' + (g.ex[1] || '') + '）' : '') + (g.conn ? '｜接續：' + g.conn : ''), source: '📐 文法' });
    const pItem = p => App.wordItem({ jp: p.jp, kana: p.kana, romaji: p.romaji, zh: p.zh, hint: `出自《${A.title}》：${p.sent}` }, '🧩 片語', 'phrase');
    const mark = (s, a, b) => esc(s.slice(0, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>' + esc(s.slice(b));
    S.gItems = gram.map(gItem); S.pItems = phr.map(pItem);
    const voc = vocabList([S.titleTk].concat(S.tokens), [A.title].concat(A.paras.map(p => p.jp)), A.title, '📖 閱讀');
    S.vItems = voc.items;
    box.innerHTML = vocabHTML(voc) + `
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
      const items = b.dataset.all === 'g' ? S.gItems : b.dataset.all === 'v' ? S.vItems : S.pItems;
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

  window.Reader = { sectTabs, bindSect, tokensHTML, wordCard, syncTrackBtns, vocabList, vocabHTML, parseFuri, applyFuri, lvBadge, pref, setPref, saveDoc, readShare, todayDone };
})();
