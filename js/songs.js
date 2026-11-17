// 歌曲跟唱（D 組）：路由 songs（歌曲清單／新增編輯）、song（跟唱頁）
// 依賴：App、Tracker、JPText（js/jp-text.js）、Reader（js/reader.js：tokensHTML、wordCard）
// 存放 App.idb：'songs:index'＝[{id,title,at,n,src}]、'song:<id>'＝{id,title,src:{type:'yt'|'file'|'tts', yt, name, mime, buf}, lines:[{jp,zh,t}], at}
// 不進 App.state、不上雲；錄音只在記憶體，離開頁面即丟。本站不內建任何有版權的歌詞，示範曲為自編。
(function () {
  'use strict';
  const esc = App.esc;
  const toast = (m, t) => App.toast(m, t);
  const MAXF = 60 * 1024 * 1024;
  const PKEY = 'jpq.song.pref';
  const RATES = [0.5, 0.75, 1];

  /* ---------------- 自編示範曲（原創，無版權問題） ---------------- */
  const DEMO = {
    id: 'demo', demo: true, title: '朝の歌', src: { type: 'tts' },
    lines: [
      ['朝が来た 来た 太陽が 笑う', '早晨來了來了，太陽在笑'],
      ['小鳥も歌う チュン チュン チュン', '小鳥也在唱，啾啾啾'],
      ['顔を洗って ご飯を食べて', '洗洗臉，吃早飯'],
      ['行ってきます 元気に歩こう', '我出門了，精神飽滿地走吧'],
      ['道の花が 風に揺れる', '路邊的花在風中搖曳'],
      ['友達見つけて おはようと言おう', '看到朋友，說聲早安吧'],
      ['今日もいい日 楽しい日', '今天也是好日子、快樂的日子']
    ].map(([jp, zh]) => ({ jp, zh, t: null }))
  };

  /* ---------------- 存取 ---------------- */
  async function songIndex() { const a = await App.idb.get('songs:index'); return Array.isArray(a) ? a : []; }
  async function getSong(id) {
    if (id === 'demo') return JSON.parse(JSON.stringify(DEMO));
    const s = await App.idb.get('song:' + id);
    return s && Array.isArray(s.lines) ? s : null;
  }
  async function putSong(s) {
    if (s.demo) return;
    s.at = Date.now();
    await App.idb.set('song:' + s.id, s);
    const idx = (await songIndex()).filter(x => x.id !== s.id);
    idx.unshift({ id: s.id, title: s.title, at: s.at, n: s.lines.length, src: s.src.type, timed: s.lines.filter(l => l.t != null).length });
    await App.idb.set('songs:index', idx);
  }
  async function delSong(id) {
    await App.idb.del('song:' + id);
    await App.idb.set('songs:index', (await songIndex()).filter(x => x.id !== id));
  }

  function pref() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { }
    if (p && typeof p === 'object') return p;
    const r = (window.Reader && Reader.pref) ? Reader.pref() : { y: true, r: false, z: true };
    return { y: !!r.y, r: !!r.r, z: !!r.z, follow: true };
  }
  function setPref(k, v) { const p = pref(); p[k] = v; try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { } }

  function ytId(u) {
    u = String(u || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    const m = u.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  const fmt = t => (t == null || isNaN(t)) ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t * 10) % 10)}`;
  const SRC_NAME = { yt: '▶️ YouTube', file: '🎧 音檔', tts: '🗣️ 語音朗讀' };

  /* ---------------- 歌曲清單 ---------------- */
  App.register('songs', {
    title: '歌曲', icon: '🎵', nav: false, navParent: 'home',
    render(el, params) {
      params = params || {};
      if (params.mode === 'new' || params.edit) return editView(el, params.edit || null);
      listView(el);
    }
  });

  function listView(el) {
    el.innerHTML = `<div class="sg-home">
      <div class="sg-head"><button type="button" class="btn ghost rd-back" aria-label="返回">←</button><h2 class="rd-h2">🎵 歌曲跟唱</h2></div>
      <p class="muted rd-tip">貼上你喜歡的日文歌詞，搭配 YouTube 或手機裡的音檔：逐句高亮、點詞查意思、填空聽寫、慢速、A-B 循環、錄音跟唱。</p>
      <button type="button" class="btn primary block" id="sgNew">＋ 新增歌曲</button>
      <h3 class="rd-h3">示範曲</h3>
      <div class="rd-list"><button type="button" class="rd-item" data-song="demo"><span class="rd-ic" aria-hidden="true">🌅</span><span class="rd-it"><b lang="ja">${esc(DEMO.title)}</b><small class="muted">自編童謠・${DEMO.lines.length} 句・語音朗讀</small></span>${App.state.cleared && App.state.cleared['song:demo'] ? '<span class="rd-done">✔</span>' : ''}</button></div>
      <h3 class="rd-h3">我的歌</h3>
      <div class="rd-list" id="sgMine"><p class="muted rd-tip">讀取中…</p></div>
      <p class="muted rd-tip">歌詞與音檔只存在這台裝置，不會上傳。請只使用你有權使用的內容；本站不提供任何歌詞。</p>
    </div>`;
    el.querySelector('.rd-back').onclick = () => App.back();
    el.querySelector('#sgNew').onclick = () => App.go('songs', { mode: 'new' });
    el.querySelectorAll('[data-song]').forEach(b => b.onclick = () => App.go('song', { id: b.dataset.song }));
    songIndex().then(idx => {
      const box = el.querySelector('#sgMine'); if (!box) return;
      if (!idx.length) { box.innerHTML = '<p class="muted rd-tip">還沒有歌。按「＋ 新增歌曲」貼上歌詞就能開始。</p>'; return; }
      const cl = App.state.cleared || {};
      box.innerHTML = idx.map(s => `<div class="rd-item rd-mine"><button type="button" class="rd-open" data-song="${esc(s.id)}"><span class="rd-ic" aria-hidden="true">🎵</span><span class="rd-it"><b lang="ja">${esc(s.title)}</b><small class="muted">${s.n} 句・${esc(SRC_NAME[s.src] || '')}${s.src !== 'tts' ? `・已對時 ${s.timed || 0}/${s.n}` : ''}</small></span>${cl['song:' + s.id] ? '<span class="rd-done">✔</span>' : ''}</button><button type="button" class="rd-del" data-del="${esc(s.id)}" aria-label="刪除">✕</button></div>`).join('');
      box.querySelectorAll('[data-song]').forEach(b => b.onclick = () => App.go('song', { id: b.dataset.song }));
      box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => App.modal('<h2>刪除這首歌？</h2><p class="muted">歌詞、對時與音檔都會從這台裝置刪除，無法復原。</p>', [{ label: '取消' }, { label: '刪除', cls: 'primary', onClick: () => delSong(b.dataset.del).then(() => listView(el)) }]));
    });
  }

  /* ---------------- 新增／編輯 ---------------- */
  async function editView(el, id) {
    const old = id ? await getSong(id) : null;
    if (id && (!old || old.demo)) { App.go('songs'); return; }
    const s = old || { id: 's' + Date.now().toString(36), title: '', src: { type: 'yt' }, lines: [] };
    let type = s.src.type, file = null;
    el.innerHTML = `<div class="sg-home">
      <div class="sg-head"><button type="button" class="btn ghost rd-back" aria-label="返回">←</button><h2 class="rd-h2">${old ? '✏️ 編輯歌曲' : '＋ 新增歌曲'}</h2></div>
      <label class="rd-lbl">歌名<input id="sgT" class="rd-in" maxlength="60" value="${esc(s.title)}" placeholder="例：我最喜歡的歌"></label>
      <div class="rd-lbl">音源</div>
      <div class="rd-tg sg-srcs" role="group" aria-label="音源">${['yt', 'file', 'tts'].map(k => `<button type="button" data-src="${k}" class="${k === type ? 'on' : ''}" aria-pressed="${k === type}">${SRC_NAME[k]}</button>`).join('')}</div>
      <div class="sg-srcbox" data-for="yt"><label class="rd-lbl">YouTube 網址<input id="sgY" class="rd-in" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${s.src.yt ? 'https://youtu.be/' + esc(s.src.yt) : ''}"></label><p class="muted rd-tip">需要連網。有些影片不允許嵌入播放，會顯示錯誤，可改用音檔。</p></div>
      <div class="sg-srcbox" data-for="file"><label class="rd-lbl">選擇音檔（mp3、m4a…）<input id="sgF" class="rd-in" type="file" accept="audio/*,video/mp4"></label><p class="muted rd-tip" id="sgFn">${s.src.name ? '目前：' + esc(s.src.name) : '音檔只存在這台裝置（最大 60MB），可離線播放。'}</p></div>
      <div class="sg-srcbox" data-for="tts"><p class="muted rd-tip">沒有音源時，用裝置的日文語音一句一句念（不會唱，但可練讀音與聽寫）。</p></div>
      <label class="rd-lbl">日文歌詞（每行一句）<textarea id="sgL" class="rd-in rd-ta" rows="9" lang="ja" placeholder="一行一句，空行會略過">${esc(s.lines.map(l => l.jp).join('\n'))}</textarea></label>
      <label class="rd-lbl">中文翻譯（可不填；一行對一句）<textarea id="sgZ" class="rd-in rd-ta" rows="6" placeholder="第 1 行對應第 1 句…">${esc(s.lines.map(l => l.zh || '').join('\n').replace(/\n+$/, ''))}</textarea></label>
      <div class="rd-row"><button type="button" class="btn" id="sgCancel">取消</button><button type="button" class="btn primary" id="sgSave">儲存並開始 ➜</button></div>
      <p class="muted rd-tip">存好後在跟唱頁按「⏱ 對時」，邊聽邊點，每句開始時按一下，就能逐句高亮。</p>
    </div>`;
    const $ = q => el.querySelector(q);
    const showSrc = () => {
      el.querySelectorAll('[data-src]').forEach(b => { const on = b.dataset.src === type; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      el.querySelectorAll('.sg-srcbox').forEach(b => { b.hidden = b.dataset.for !== type; });
    };
    showSrc();
    el.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { type = b.dataset.src; showSrc(); });
    $('.rd-back').onclick = () => App.back();
    $('#sgCancel').onclick = () => App.back();
    $('#sgF').onchange = e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > MAXF) { toast('檔案太大（上限 60MB）'); e.target.value = ''; return; }
      file = f; $('#sgFn').textContent = '已選：' + f.name;
    };
    $('#sgSave').onclick = async () => {
      const jp = $('#sgL').value.replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 300);
      const zhRaw = $('#sgZ').value.replace(/\r/g, '').split('\n').map(x => x.trim());
      const zh = zhRaw.filter((x, i) => x || i < zhRaw.length - 1);
      if (!jp.length) { toast('請貼上歌詞'); $('#sgL').focus(); return; }
      if (!/[぀-ヿ㐀-鿿]/.test(jp.join(''))) { toast('看起來不是日文歌詞喔'); return; }
      const src = { type };
      if (type === 'yt') {
        const v = ytId($('#sgY').value);
        if (!v) { toast('看不懂這個 YouTube 網址'); $('#sgY').focus(); return; }
        src.yt = v;
      } else if (type === 'file') {
        if (file) {
          try { src.buf = await file.arrayBuffer(); src.name = file.name; src.mime = file.type || 'audio/mpeg'; }
          catch (e) { toast('讀不到這個檔案'); return; }
        } else if (s.src.type === 'file' && s.src.buf) { src.buf = s.src.buf; src.name = s.src.name; src.mime = s.src.mime; }
        else { toast('請選擇音檔'); return; }
      }
      // 歌詞沒改的句子保留原本的對時
      const oldT = new Map(); s.lines.forEach((l, i) => { if (l.t != null) oldT.set(i + '|' + l.jp, l.t); });
      const keepT = src.type === s.src.type && (src.type !== 'yt' || src.yt === s.src.yt) && !(src.type === 'file' && file);
      s.title = $('#sgT').value.trim().slice(0, 60) || jp[0].slice(0, 20);
      s.src = src;
      s.lines = jp.map((x, i) => ({ jp: x, zh: zh[i] || '', t: keepT && oldT.has(i + '|' + x) ? oldT.get(i + '|' + x) : null }));
      if (zh.length && zh.length !== jp.length) toast(`翻譯 ${zh.length} 行、歌詞 ${jp.length} 句，已依行號對應`);
      await putSong(s);
      App.go('song', { id: s.id });
    };
  }

  /* ---------------- 播放器 ---------------- */
  // 共同介面：kind、timed、time()、play()、pause()、playing()、seek(t)、rate(r)、dur()、destroy()
  function audioPlayer(box, s) {
    const blob = new Blob([s.src.buf], { type: s.src.mime || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    box.innerHTML = `<audio class="sg-audio" controls preload="metadata" src="${url}"></audio>`;
    const a = box.querySelector('audio');
    a.preservesPitch = true;
    return {
      kind: 'file', timed: true,
      time: () => a.currentTime, dur: () => a.duration || 0,
      play: () => a.play().catch(() => { }), pause: () => a.pause(), playing: () => !a.paused,
      seek: t => { a.currentTime = Math.max(0, t); }, rate: r => { a.playbackRate = r; },
      destroy: () => { a.pause(); a.removeAttribute('src'); try { a.load(); } catch (e) { } URL.revokeObjectURL(url); }
    };
  }

  // YouTube：用 iframe＋postMessage（不載入外部 API 程式），離線時優雅降級
  function ytPlayer(box, s, onState) {
    const origin = /^https?:/.test(location.protocol) ? location.origin : '';
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.src.yt)}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1${origin ? '&origin=' + encodeURIComponent(origin) : ''}`;
    const off = navigator.onLine === false;
    box.innerHTML = `<div class="sg-yt">${off ? '' : `<iframe src="${src}" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`}</div>
      <p class="sg-note" ${off ? '' : 'hidden'}>${off ? '📴 目前離線，YouTube 無法播放。歌詞、查詞、填空仍可使用；按句號旁 🔊 可用語音朗讀。' : ''}</p>`;
    const fr = box.querySelector('iframe'), note = box.querySelector('.sg-note');
    let t0 = 0, at = 0, st = -1, rt = 1, d = 0, linked = false, tries = 0;
    const post = o => { try { fr && fr.contentWindow && fr.contentWindow.postMessage(JSON.stringify(o), '*'); } catch (e) { } };
    const cmd = (func, args) => post({ event: 'command', func, args: args || [] });
    const listen = () => post({ event: 'listening', id: 'sg', channel: 'widget' });
    const onMsg = e => {
      if (!fr || e.source !== fr.contentWindow) return;
      let m; try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
      if (!m || typeof m !== 'object') return;
      linked = true;
      const info = m.info || {};
      if (m.event === 'onStateChange' && typeof info === 'number') { st = info; at = performance.now(); }
      if (info && typeof info === 'object') {
        if (typeof info.currentTime === 'number') { t0 = info.currentTime; at = performance.now(); }
        if (typeof info.playerState === 'number') st = info.playerState;
        if (typeof info.playbackRate === 'number') rt = info.playbackRate;
        if (typeof info.duration === 'number') d = info.duration;
      }
      if (m.event === 'onError') { note.hidden = false; note.textContent = '😵 這部影片不允許嵌入播放。請到「編輯」改用音檔或語音朗讀。'; }
      onState && onState();
    };
    window.addEventListener('message', onMsg);
    if (fr) fr.addEventListener('load', listen);
    const ping = setInterval(() => {
      if (linked || !fr) { clearInterval(ping); return; }
      listen();
      if (++tries === 16) { note.hidden = false; note.textContent = '⚠️ 連不上 YouTube 播放器（可能離線或被封鎖）。可以直接點影片播放，但無法自動高亮與對時。'; }
    }, 500);
    const time = () => st === 1 ? t0 + (performance.now() - at) / 1000 * rt : t0;
    return {
      kind: 'yt', timed: true,
      time, dur: () => d, linked: () => linked,
      play: () => cmd('playVideo'), pause: () => cmd('pauseVideo'), playing: () => st === 1,
      seek: t => { t = Math.max(0, t); cmd('seekTo', [t, true]); t0 = t; at = performance.now(); },
      rate: r => { cmd('setPlaybackRate', [r]); },
      destroy: () => { clearInterval(ping); window.removeEventListener('message', onMsg); cmd('pauseVideo'); }
    };
  }

  // 沒有音源：用語音一句一句念
  function ttsPlayer(s, hooks) {
    let idx = -1, on = false, r = 1, u = null;
    const ok = 'speechSynthesis' in window;
    const voice = () => { try { return speechSynthesis.getVoices().find(v => /^ja/i.test(v.lang)) || null; } catch (e) { return null; } };
    function say(i) {
      if (!ok) { App.speak(s.lines[i] && s.lines[i].jp); return; }
      if (i < 0 || i >= s.lines.length) { on = false; hooks.change(); return; }
      idx = i; hooks.change();
      const x = new SpeechSynthesisUtterance(s.lines[i].jp);
      x.lang = 'ja-JP'; x.rate = 0.9 * r; const v = voice(); if (v) x.voice = v;
      x.onend = () => { if (u !== x || !on) return; const n = hooks.next(idx); setTimeout(() => { if (on && u === x) say(n); }, 350); };
      u = x;
      speechSynthesis.cancel(); speechSynthesis.speak(x);
    }
    return {
      kind: 'tts', timed: false,
      line: () => idx, time: () => 0, dur: () => 0,
      play: () => { on = true; say(idx < 0 || idx >= s.lines.length ? 0 : idx); },
      pause: () => { on = false; u = null; if (ok) speechSynthesis.cancel(); hooks.change(); },
      playing: () => on,
      playLine: i => { on = false; idx = i; hooks.change(); if (!ok) { App.speak(s.lines[i].jp, .85 * r); return; } const x = new SpeechSynthesisUtterance(s.lines[i].jp); x.lang = 'ja-JP'; x.rate = .9 * r; const v = voice(); if (v) x.voice = v; u = x; speechSynthesis.cancel(); speechSynthesis.speak(x); },
      seekLine: i => { idx = i; if (on) say(i); else hooks.change(); },
      seek: () => { }, rate: v => { r = v; },
      destroy: () => { on = false; u = null; if (ok) speechSynthesis.cancel(); }
    };
  }

  /* ---------------- 跟唱頁 ---------------- */
  App.register('song', {
    title: '歌曲', icon: '🎵', nav: false, navParent: 'home',
    render(el, params) { songView(el, (params || {}).id || 'demo'); }
  });

  async function songView(el, id) {
    el.innerHTML = '<p class="center muted rd-load">🎵 準備歌詞中…</p>';
    const s = await getSong(id);
    if (!s) { el.innerHTML = '<div class="panel center"><p>找不到這首歌（可能已刪除）。</p><button class="btn primary" type="button">回歌曲清單</button></div>'; el.querySelector('button').onclick = () => App.go('songs'); return; }
    await JPText.ready();
    if (!el.isConnected) return;
    const P = pref();
    const V = { s, P, tokens: s.lines.map(l => JPText.tokenize(l.jp)), cur: -1, mode: 'sing', rate: 1, A: null, B: null, mark: 0, recs: [], rec: null, dict: null, dictBest: 0, listened: false, dirty: false };
    const prof = (App.profile && App.profile()) || {};
    V.lv = prof.lv || 'zero'; V.assist = prof.assist || 'full';
    if (s.lines.some(l => JPText.hasUnknown && JPText.hasUnknown(JPText.tokenize(l.jp)))) {
      JPText.ready(true).then(() => { if (!V.root || !V.root.isConnected) return; V.tokens = s.lines.map(l => JPText.tokenize(l.jp)); drawLines(V); });
    }
    const hasRec = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    el.innerHTML = `<div class="sg-page">
      <div class="sg-head"><button type="button" class="btn ghost rd-back" aria-label="返回">←</button><h2 class="rd-h2" lang="ja">${esc(s.title)}</h2>${s.demo ? '' : '<button type="button" class="btn ghost sg-edit" aria-label="編輯">✏️</button>'}</div>
      <div class="sg-media"></div>
      <div class="tabs sg-modes" role="tablist">
        <button type="button" data-mode="sing" class="on" role="tab">🎤 跟唱</button>
        ${s.src.type === 'tts' ? '' : '<button type="button" data-mode="mark" role="tab">⏱ 對時</button>'}
        <button type="button" data-mode="dict" role="tab">✍️ 填空</button>
      </div>
      <div class="rd-tg sg-tg" role="group" aria-label="顯示">
        <button type="button" data-t="y" aria-pressed="${!!P.y}" class="${P.y ? 'on' : ''}">讀音</button>
        <button type="button" data-t="r" aria-pressed="${!!P.r}" class="${P.r ? 'on' : ''}">羅馬字</button>
        <button type="button" data-t="z" aria-pressed="${!!P.z}" class="${P.z ? 'on' : ''}">中文</button>
        <button type="button" data-t="follow" aria-pressed="${P.follow !== false}" class="${P.follow !== false ? 'on' : ''}">自動捲動</button>
      </div>
      <div class="sg-help muted rd-tip"></div>
      <div class="sg-lyr rd-doc mine ${P.y ? 'y' : ''} ${P.r ? 'r' : ''} ${P.z ? 'z' : ''}" lang="ja"></div>
      <div class="sg-recs"></div>
      <div class="sg-dictbar" hidden><button type="button" class="btn" id="sgReDict">🔀 換一組</button><button type="button" class="btn primary" id="sgCheck">對答案</button></div>
      <button type="button" class="btn primary block sg-finish">✔ 練完這首</button>
      <div class="sg-ctl" role="toolbar" aria-label="播放控制">
        <div class="sg-ctl-row">
          <button type="button" class="sg-b sg-play" aria-label="播放">▶</button>
          <span class="sg-time" aria-live="off">${s.src.type === 'tts' ? '' : '0:00.0'}</span>
          <div class="sg-rates" role="group" aria-label="速度">${RATES.map(r => `<button type="button" data-rate="${r}" class="${r === 1 ? 'on' : ''}">${r}×</button>`).join('')}</div>
        </div>
        <div class="sg-ctl-row sg-row2">
          <button type="button" class="sg-b" data-ab="A" aria-label="循環起點設在目前這句">A</button>
          <button type="button" class="sg-b" data-ab="B" aria-label="循環終點設在目前這句">B</button>
          <button type="button" class="sg-b" data-ab="one" aria-label="單句循環">🔁</button>
          <button type="button" class="sg-b" data-ab="x" aria-label="取消循環">✕</button>
          ${hasRec ? '<button type="button" class="sg-b sg-recb" aria-label="錄音跟唱目前這句">🎤</button>' : ''}
          <span class="sg-ab muted"></span>
        </div>
        <button type="button" class="btn primary block sg-markb" hidden>👆 第 1 句開始了</button>
      </div>
    </div>`;
    V.root = el.querySelector('.sg-page');
    const $ = q => V.root.querySelector(q);
    V.$ = $;
    // 播放器
    const media = $('.sg-media');
    const hooks = {
      change: () => { if (V.P2.kind === 'tts') setCur(V, V.P2.line()); syncPlay(V); },
      next: i => {
        if (V.A != null && V.B != null && i >= V.B) return V.A;
        return i + 1;
      }
    };
    if (s.src.type === 'yt' && s.src.yt) V.P2 = ytPlayer(media, s, () => syncPlay(V));
    else if (s.src.type === 'file' && s.src.buf) V.P2 = audioPlayer(media, s);
    else { V.P2 = ttsPlayer(s, hooks); media.innerHTML = '<p class="sg-note">🗣️ 語音朗讀模式：按 ▶ 一句一句念。</p>'; }
    if (V.P2.kind === 'file') { const a = media.querySelector('audio'); a.addEventListener('play', () => syncPlay(V)); a.addEventListener('pause', () => syncPlay(V)); }

    // 綁定
    $('.rd-back').onclick = () => App.back();
    if ($('.sg-edit')) $('.sg-edit').onclick = () => App.go('songs', { edit: s.id });
    V.root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, v = !b.classList.contains('on');
      b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); setPref(k, v); V.P[k] = v;
      if (k !== 'follow') $('.sg-lyr').classList.toggle(k, v);
    });
    V.root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(V, b.dataset.mode));
    $('.sg-play').onclick = () => { if (V.P2.playing()) V.P2.pause(); else { V.P2.play(); V.listened = true; } setTimeout(() => syncPlay(V), 60); };
    V.root.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      V.rate = +b.dataset.rate; V.P2.rate(V.rate);
      V.root.querySelectorAll('[data-rate]').forEach(x => x.classList.toggle('on', x === b));
    });
    V.root.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => setAB(V, b.dataset.ab));
    if ($('.sg-recb')) $('.sg-recb').onclick = () => toggleRec(V);
    $('.sg-markb').onclick = () => markNow(V);
    $('#sgReDict').onclick = () => { V.dict = makeDict(V, true); drawLines(V); };
    $('#sgCheck').onclick = () => checkDict(V);
    $('.sg-finish').onclick = () => finish(V);
    $('.sg-lyr').addEventListener('click', e => onLyrClick(V, e));

    drawLines(V);
    setMode(V, 'sing');
    // 計時：高亮、循環、錄音自動停、離開頁面清理
    V.timer = setInterval(() => tick(V), 150);
  }

  function cleanup(V) {
    if (V.dead) return; V.dead = true;
    clearInterval(V.timer);
    try { V.P2.destroy(); } catch (e) { }
    stopRec(V, true);
    V.recs.forEach(r => URL.revokeObjectURL(r.url)); V.recs = [];
    if (V.dirty) putSong(V.s);
  }

  function lineStart(V, i) { const l = V.s.lines[i]; return l && l.t != null ? l.t : null; }
  function lineEnd(V, i) {
    for (let k = i + 1; k < V.s.lines.length; k++) if (V.s.lines[k].t != null) return V.s.lines[k].t;
    const d = V.P2.dur(); const st = lineStart(V, i);
    return d && d > (st || 0) ? d : (st != null ? st + 8 : null);
  }
  function curFromTime(V, t) {
    let c = -1;
    V.s.lines.forEach((l, i) => { if (l.t != null && l.t <= t + 0.05) c = i; });
    return c;
  }

  function tick(V) {
    if (!V.root.isConnected) { cleanup(V); return; }
    const P2 = V.P2;
    if (!P2.timed) return;
    const t = P2.time();
    const tm = V.$('.sg-time'); if (tm) tm.textContent = fmt(t);
    if (V.mode !== 'mark') setCur(V, curFromTime(V, t));
    if (P2.playing()) V.listened = true;
    // A-B 循環
    if (V.A != null && V.B != null && P2.playing()) {
      const a = lineStart(V, V.A), b = lineEnd(V, V.B);
      if (a != null && b != null && (t >= b - 0.05 || t < a - 0.5)) P2.seek(a);
    }
    if (V.rec && V.rec.end != null && t >= V.rec.end) stopRec(V);
    syncPlay(V);
  }

  function syncPlay(V) {
    const b = V.$ && V.$('.sg-play'); if (!b) return;
    const on = V.P2.playing();
    b.textContent = on ? '⏸' : '▶'; b.setAttribute('aria-label', on ? '暫停' : '播放');
  }

  function setCur(V, i) {
    if (i === V.cur) return;
    V.cur = i;
    const rows = V.root.querySelectorAll('.sg-line');
    rows.forEach((r, k) => { r.classList.toggle('on', k === i); r.classList.toggle('past', i >= 0 && k < i); });
    if (i >= 0 && rows[i] && V.P.follow !== false && V.mode !== 'dict') {
      try { rows[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
    }
  }

  const HELP = {
    sing: '點句首號碼跳到那一句；點任何一個詞看意思、加入不會清單。A／B 設定循環範圍，🔁 單句循環，🎤 錄自己唱這句。',
    mark: '先按 ▶ 播放，每一句「開始唱」的瞬間按下方大按鈕。按錯可以用每句旁的 −／＋ 微調 0.2 秒，或點句號從那句重來。',
    dict: '聽歌，把空格裡的詞用假名填進去，再按「對答案」。填錯的詞會自動加入不會清單。'
  };
  function setMode(V, m) {
    if (m === 'mark' && !V.P2.timed) m = 'sing';
    V.mode = m;
    V.root.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', b.dataset.mode === m); });
    V.$('.sg-help').textContent = HELP[m] + (m === 'sing' && V.P2.timed && !V.s.lines.some(l => l.t != null) ? '　※ 還沒對時：先到「⏱ 對時」標記每句開始時間，才會逐句高亮。' : '');
    V.$('.sg-markb').hidden = m !== 'mark';
    V.$('.sg-dictbar').hidden = m !== 'dict';
    V.$('.sg-lyr').classList.toggle('marking', m === 'mark');
    if (m === 'mark') { const k = V.s.lines.findIndex(l => l.t == null); V.mark = k < 0 ? 0 : k; }
    if (m === 'dict' && !V.dict) V.dict = makeDict(V, false);
    drawLines(V);
  }

  /* ---------- 歌詞 ---------- */
  function drawLines(V) {
    const box = V.$('.sg-lyr'); if (!box) return;
    const s = V.s;
    box.innerHTML = s.lines.map((l, i) => {
      const body = V.mode === 'dict' ? dictLine(V, i) : Reader.tokensHTML(V.tokens[i], i);
      const tm = V.mode === 'mark' ? `<span class="sg-adj"><button type="button" class="sg-mini" data-adj="${i}:-0.2" aria-label="提早 0.2 秒">−</button><span class="sg-t">${fmt(l.t)}</span><button type="button" class="sg-mini" data-adj="${i}:0.2" aria-label="延後 0.2 秒">＋</button></span>` : '';
      return `<div class="sg-line${i === V.cur ? ' on' : ''}${V.mode === 'mark' && i === V.mark ? ' next' : ''}${l.zh ? '' : ' nozh'}" data-i="${i}">
        <button type="button" class="sg-no" data-jump="${i}" aria-label="第 ${i + 1} 句">${i + 1}</button>
        <div class="sg-tx"><div class="sg-jp">${body}</div>${l.zh ? `<div class="rd-zh sg-zh" lang="zh-Hant">${esc(l.zh)}</div>` : ''}${tm}</div>
        <button type="button" class="rd-say sg-say" data-say="${i}" aria-label="朗讀這句">🔊</button>
      </div>`;
    }).join('');
    if (V.mode === 'mark') updMarkBtn(V);
    if (V.mode === 'dict') {
      box.querySelectorAll('.sg-in').forEach(inp => inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return; e.preventDefault();
        const all = [...box.querySelectorAll('.sg-in')], k = all.indexOf(inp);
        if (all[k + 1]) all[k + 1].focus(); else checkDict(V);
      }));
    }
  }

  function onLyrClick(V, e) {
    const j = e.target.closest('[data-jump]');
    if (j) { jumpTo(V, +j.dataset.jump); return; }
    const sy = e.target.closest('[data-say]');
    if (sy) { const i = +sy.dataset.say; if (V.P2.kind === 'tts') V.P2.playLine(i); else { if (V.P2.playing()) V.P2.pause(); App.speak(V.s.lines[i].jp, V.rate < 1 ? .6 : .85); } return; }
    const ad = e.target.closest('[data-adj]');
    if (ad) {
      const [i, d] = ad.dataset.adj.split(':'); const l = V.s.lines[+i];
      if (l.t == null) { toast('這句還沒標記'); return; }
      l.t = Math.max(0, Math.round((l.t + +d) * 10) / 10); V.dirty = true; saveSoon(V);
      ad.parentNode.querySelector('.sg-t').textContent = fmt(l.t);
      if (V.P2.timed) { V.P2.seek(l.t); if (!V.P2.playing()) V.P2.play(); }
      return;
    }
    if (V.mode === 'dict') return;
    const w = e.target.closest('.rd-w'); if (!w) return;
    const [li, k] = w.dataset.k.split(':').map(Number);
    const t = (V.tokens[li] || [])[k]; if (!t) return;
    V.root.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel'));
    w.classList.add('sel');
    const line = V.s.lines[li];
    Reader.wordCard(t, { title: V.s.title, sentence: line.jp, zh: line.zh, source: '🎵 歌曲', onClose: () => { w.classList.remove('sel'); markTracked(V); } });
  }
  function markTracked(V) {
    if (!V.root.isConnected) return;
    V.root.querySelectorAll('.rd-w[data-k]').forEach(w => { const [li, k] = w.dataset.k.split(':').map(Number); const t = (V.tokens[li] || [])[k]; if (t) w.classList.toggle('tk', Tracker.has('word:' + t.base)); });
    Reader.syncTrackBtns(V.root);
  }

  function jumpTo(V, i) {
    const P2 = V.P2;
    if (V.mode === 'mark') { V.mark = i; const t = lineStart(V, i - 1); if (P2.timed && t != null) P2.seek(t); drawLines(V); return; }
    if (P2.kind === 'tts') { P2.seekLine(i); if (!P2.playing()) P2.playLine(i); V.listened = true; return; }
    const t = lineStart(V, i);
    if (t == null) { toast('這句還沒對時，先到「⏱ 對時」標記'); return; }
    P2.seek(t); P2.play(); V.listened = true; setCur(V, i);
  }

  /* ---------- 對時 ---------- */
  let saveT = null;
  function saveSoon(V) { clearTimeout(saveT); saveT = setTimeout(() => { if (V.dirty) { V.dirty = false; putSong(V.s); } }, 800); }
  function updMarkBtn(V) {
    const b = V.$('.sg-markb');
    b.textContent = V.mark < V.s.lines.length ? `👆 第 ${V.mark + 1} 句開始了` : '✔ 全部標好了（點句號可重標）';
    b.disabled = V.mark >= V.s.lines.length;
  }
  function markNow(V) {
    const P2 = V.P2;
    if (P2.linked && !P2.linked()) { toast('YouTube 播放器還沒連上，暫時無法對時'); return; }
    if (!P2.playing()) { P2.play(); toast('先播放，聽到這句開始再按'); return; }
    if (V.mark >= V.s.lines.length) return;
    const t = Math.max(0, Math.round((P2.time() - 0.1) * 10) / 10);
    V.s.lines[V.mark].t = t;
    // 後面的時間如果比這句早，代表要重標 → 清掉
    for (let k = V.mark + 1; k < V.s.lines.length; k++) if (V.s.lines[k].t != null && V.s.lines[k].t <= t) V.s.lines[k].t = null;
    V.dirty = true; saveSoon(V);
    V.mark++;
    if (V.mark >= V.s.lines.length) toast('✅ 對時完成！切到「🎤 跟唱」看逐句高亮', 'ok');
    drawLines(V); setCur(V, V.mark - 1);
  }

  /* ---------- A-B 循環 ---------- */
  function setAB(V, k) {
    const c = V.cur >= 0 ? V.cur : 0;
    if (k === 'x') { V.A = V.B = null; }
    else if (k === 'one') { V.A = V.B = c; }
    else if (k === 'A') { V.A = c; if (V.B == null || V.B < c) V.B = c; }
    else if (k === 'B') { V.B = c; if (V.A == null || V.A > c) V.A = c; }
    if (V.A != null && V.P2.timed && lineStart(V, V.A) == null) { toast('這句還沒對時，先到「⏱ 對時」標記'); V.A = V.B = null; }
    const lab = V.$('.sg-ab');
    lab.textContent = V.A == null ? '' : (V.A === V.B ? `循環第 ${V.A + 1} 句` : `循環 ${V.A + 1}–${V.B + 1} 句`);
    V.root.querySelectorAll('.sg-line').forEach((r, i) => r.classList.toggle('loop', V.A != null && i >= V.A && i <= V.B));
    V.root.querySelectorAll('[data-ab]').forEach(b => b.classList.toggle('on', V.A != null && b.dataset.ab !== 'x' && (b.dataset.ab === 'one' ? V.A === V.B : true)));
    if (V.A != null && V.P2.timed) { V.P2.seek(lineStart(V, V.A)); V.P2.play(); }
    else if (V.A != null && V.P2.kind === 'tts') { V.P2.seekLine(V.A); V.P2.play(); }
  }

  /* ---------- 填空聽寫 ---------- */
  const DICT_POS = /^(n|v|i|na|adv)$/;
  function makeDict(V, shuffle) {
    const low = /^(zero|n5)$/.test(V.lv), per = low ? 1 : 2;
    return V.tokens.map((tk, li) => {
      let c = tk.map((t, k) => ({ t, k })).filter(({ t }) => !t.sym && t.known && DICT_POS.test(t.pos) && (t.kana || t.s) && (t.s.length >= 2 || JPText.hasKanji(t.s)));
      if (low) { const e = c.filter(({ t }) => t.lv === 'N5' || t.lv === 'N4'); if (e.length) c = e; }
      if (!c.length) return [];
      if (shuffle) c = App.shuffle(c);
      else c = c.slice().sort((a, b) => ((a.k * 7 + li * 3) % 5) - ((b.k * 7 + li * 3) % 5));
      return c.slice(0, per).map(x => x.k).sort((a, b) => a - b);
    });
  }
  function dictLine(V, i) {
    const pick = V.dict[i] || [], tk = V.tokens[i];
    return tk.map((t, k) => {
      if (pick.indexOf(k) < 0) return t.sym ? esc(t.s) : `<span class="sg-plain">${JPText.ruby(t.s, V.P.y ? t.kana : '')}</span>`;
      const ans = JPText.toHira(t.kana || t.s);
      const hint = V.assist === 'none' ? '' : '＿'.repeat(Math.min(ans.length, 8));
      return `<input class="sg-in" data-a="${i}:${k}" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" size="${Math.max(3, ans.length + 1)}" placeholder="${hint}" aria-label="第 ${i + 1} 句空格">`;
    }).join('');
  }
  function checkDict(V) {
    const ins = [...V.root.querySelectorAll('.sg-in')];
    if (!ins.length) { toast('這首歌沒有可挖空的詞'); return; }
    let ok = 0;
    const norm = x => JPText.toHira(String(x || '').replace(/[\s　]/g, ''));
    ins.forEach(inp => {
      const [li, k] = inp.dataset.a.split(':').map(Number), t = V.tokens[li][k];
      const v = norm(inp.value);
      const good = !!v && (v === norm(t.kana) || v === norm(t.s));
      inp.classList.toggle('ok', good); inp.classList.toggle('ng', !good);
      if (good) ok++;
      else {
        Tracker.add(App.wordItem({ jp: t.base || t.s, kana: t.bkana || t.kana, romaji: JPText.romaji(t.bkana || t.kana || ''), zh: t.zh || '', hint: `出自《${V.s.title}》：${V.s.lines[li].jp}` }, '🎵 歌曲', 'word'), true);
        if (!inp.nextElementSibling || !inp.nextElementSibling.classList.contains('sg-ans')) inp.insertAdjacentHTML('afterend', `<span class="sg-ans">${esc(t.s)}${t.kana && t.kana !== t.s ? '（' + esc(t.kana) + '）' : ''}</span>`);
      }
    });
    const r = ok / ins.length;
    V.dictBest = Math.max(V.dictBest, r);
    toast(`答對 ${ok} / ${ins.length}${ok < ins.length ? '・錯的已加入不會清單' : ' 🎉'}`, ok === ins.length ? 'ok' : '');
  }

  /* ---------- 錄音跟唱 ---------- */
  async function toggleRec(V) {
    if (V.rec) { stopRec(V); return; }
    const i = V.cur >= 0 ? V.cur : 0;
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { toast('無法使用麥克風（請允許麥克風權限）'); return; }
    if (V.dead) { stream.getTracks().forEach(t => t.stop()); return; }
    let mr;
    try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); toast('這個瀏覽器不支援錄音'); return; }
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const R = { mr, stream, line: i, end: null, chunks };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (R.discard || !chunks.length) return;
      const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }));
      V.recs.unshift({ line: i, url });
      while (V.recs.length > 10) URL.revokeObjectURL(V.recs.pop().url);
      drawRecs(V);
      toast('🎤 錄好了，可以比較原句和你的聲音', 'ok');
    };
    V.rec = R;
    mr.start();
    const b = V.$('.sg-recb'); if (b) { b.classList.add('rec'); b.textContent = '⏹'; b.setAttribute('aria-label', '停止錄音'); }
    if (V.P2.timed && lineStart(V, i) != null) { V.P2.seek(lineStart(V, i)); V.P2.play(); R.end = lineEnd(V, i) + 0.6; }
    else { toast(`🎤 錄音中：唱第 ${i + 1} 句，唱完按 ⏹`); setTimeout(() => { if (V.rec === R) stopRec(V); }, 20000); }
  }
  function stopRec(V, discard) {
    const R = V.rec; if (!R) return;
    V.rec = null; R.discard = !!discard;
    try { if (R.mr.state !== 'inactive') R.mr.stop(); else R.stream.getTracks().forEach(t => t.stop()); } catch (e) { R.stream.getTracks().forEach(t => t.stop()); }
    if (!discard && V.P2.timed && R.end != null) V.P2.pause();
    const b = V.$ && V.$('.sg-recb'); if (b && !discard) { b.classList.remove('rec'); b.textContent = '🎤'; b.setAttribute('aria-label', '錄音跟唱目前這句'); }
  }
  function drawRecs(V) {
    const box = V.$('.sg-recs'); if (!box) return;
    if (!V.recs.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<section class="rd-sec"><div class="rd-sech"><h3>🎤 我的錄音 <small class="muted">${V.recs.length}</small></h3></div>
      ${V.recs.map((r, k) => `<div class="sg-rec"><div class="sg-rech"><b>第 ${r.line + 1} 句</b><span class="muted" lang="ja">${esc(V.s.lines[r.line].jp.slice(0, 24))}</span></div>
        <div class="rd-row"><button type="button" class="btn sm" data-orig="${r.line}">▶ 原句</button><audio controls src="${r.url}" class="sg-myaudio"></audio><button type="button" class="btn sm ghost" data-rdel="${k}" aria-label="刪除錄音">✕</button></div></div>`).join('')}
      <p class="muted rd-tip">錄音只在這個頁面，離開就會消失。</p></section>`;
    box.querySelectorAll('[data-orig]').forEach(b => b.onclick = () => {
      const i = +b.dataset.orig;
      if (V.P2.kind === 'tts') { V.P2.playLine(i); return; }
      const t = lineStart(V, i);
      if (t == null) { App.speak(V.s.lines[i].jp, .85); return; }
      V.P2.seek(t); V.P2.play(); V.recEndPlay = lineEnd(V, i);
      const stopAt = V.recEndPlay; const w = setInterval(() => { if (V.dead || !V.P2.playing()) { clearInterval(w); return; } if (V.P2.time() >= stopAt) { V.P2.pause(); clearInterval(w); } }, 100);
    });
    box.querySelectorAll('[data-rdel]').forEach(b => b.onclick = () => { const r = V.recs.splice(+b.dataset.rdel, 1)[0]; if (r) URL.revokeObjectURL(r.url); drawRecs(V); });
  }

  /* ---------- 練完 ---------- */
  function finish(V) {
    if (!V.listened && !V.recs.length && !V.dictBest) { toast('先按 ▶ 聽一次，或做一下填空吧'); return; }
    const stars = Math.min(3, 1 + (V.recs.length ? 1 : 0) + (V.dictBest >= 0.7 ? 1 : 0));
    const r = App.reward('song:' + V.s.id, stars, '歌曲跟唱');
    const tips = [];
    if (!V.recs.length) tips.push('用 🎤 錄一句跟唱');
    if (V.dictBest < 0.7) tips.push('填空答對 7 成以上');
    App.showResult({
      title: '練完了！', stars, gained: r && r.gained,
      note: tips.length ? `<span class="muted">想拿更多星：${tips.join('、')}。</span>` : '<span class="muted">聽、唱、寫都完成了，很棒！</span>',
      back: { label: '歌曲清單', route: 'songs' }, ok: '繼續練'
    });
  }

  window.Songs = { DEMO, ytId, list: songIndex };
})();
