// 歌曲跟唱（D 組）：路由 songs（歌曲清單／新增編輯）、song（跟唱頁）
// 依賴：App、Tracker、JPText（js/jp-text.js）、Reader（js/reader.js：tokensHTML、wordCard）
// 存放 App.idb：'songs:index'＝[{id,title,at,n,src}]、'song:<id>'＝{id,title,src:{type:'yt'|'url'|'file'|'tts', yt, url, name, mime, buf}, lines:[{jp,zh,t}], at}
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
    idx.unshift({ id: s.id, title: s.title, at: s.at, n: s.lines.length, src: s.src.type, timed: s.lines.filter(l => l.t != null).length, warn: !!s.timeWarn, synced: !!s.synced, by: s.cover ? s.cover.by || '' : '', yt: s.src.yt || '' });
    await App.idb.set('songs:index', idx);
  }
  // 新抓到的歌詞併入舊歌：沒歌詞就整份套用；歌詞相同只補時間（保留手動校時與中文）；不同則保留舊的
  const norm = s => String(s || '').normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '');
  function mergeLyrics(s, lines) {
    if (!s.lines.length) { s.lines = lines.map(l => ({ jp: l.jp, zh: l.zh || '', t: l.t })); return 'all'; }
    if (s.lines.length !== lines.length || s.lines.some((l, i) => norm(l.jp) !== norm(lines[i].jp))) return '';
    let n = 0; s.lines.forEach((l, i) => { if (l.t == null && lines[i].t != null) { l.t = lines[i].t; n++; } });
    return n ? 'time' : '';
  }
  // 「找歌詞」欄位預填：翻唱用原曲資訊；「歌名（X 翻唱・原唱 Y）」取 Y；原始影片標題交給 coverParse（評審 v18）
  function guessTitle(s) {
    const pair = x => { const m = String(x || '').match(/^(.+?)（(.+)）$/); return m ? { track: m[1].trim(), artist: m[2].trim() } : null; };
    if (s.cover && s.cover.orig && pair(s.cover.orig)) return pair(s.cover.orig);
    const full = String(s.title || ''), cv = full.match(/^(.+?)（[^（）]*翻唱・原唱\s*(.+)）$/);
    if (cv) return { track: cv[1].trim(), artist: cv[2].trim() === '?' ? '' : cv[2].trim() };
    if (/[【】\[\]|｜]|歌ってみた|cover/i.test(full) && LinkImport.coverParse) { const p = LinkImport.coverParse(full, ''); if (p && p.track) return { track: p.track, artist: p.artist || '' }; }
    const t = full.replace(/\s*・.*$/, '');
    return pair(t) || LinkImport.songTitle(t, '');
  }

  // 最後播放的歌（首頁「繼續上次那首歌」）：App.state.songLast ＝ {id, title, at}
  function setLast(s) { try { App.state.songLast = { id: s.id, title: String(s.title || '').slice(0, 60), at: Date.now() }; App.save(); } catch (e) { } }
  function last() { const L = App.state && App.state.songLast; return L && L.id ? { id: L.id, title: L.title || '' } : null; }
  async function delSong(id) {
    if (last() && last().id === id) { delete App.state.songLast; App.save(); }
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

  const fmt = t => (t == null || isNaN(t)) ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t * 10) % 10)}`;
  const SRC_NAME = { yt: '▶️ YouTube', url: '🔗 音訊網址', file: '🎧 音檔', tts: '🗣️ 語音朗讀' };

  /* ---------------- 歌曲清單 ---------------- */
  App.register('songs', {
    title: '跟唱', icon: '🎶', nav: false, navParent: 'read',
    render(el, params) {
      params = params || {};
      if (params.mode === 'new' || params.edit) return editView(el, params.edit || null);
      listView(el);
    }
  });

  // 熱門精選：一鍵匯入（YouTube 官方影片＋LRCLIB 逐句時間歌詞；使用者指定的例外，見 docs/資料來源.md）
  // [歌名, 歌手, YouTube id, 影片秒數, LRCLIB id]：固定和這支 MV 長度相符的時間軸版本
  const HOT = [["アイドル","YOASOBI","ZRtdQ81jPUQ",226,7159727],["夜に駆ける","YOASOBI","by4SYYWlhEs",261,9203852],["Bling-Bang-Bang-Born","Creepy Nuts","mLW35YMzELE",172,8248862],["ライラック","Mrs. GREEN APPLE","QjrkrVmC-8M",303,24754735],["ケセラセラ","Mrs. GREEN APPLE","Jy-QS27q7lA",314,16310136],["怪獣の花唄","Vaundy","UM9XNpgrqVk",233,19912792],["Lemon","米津玄師","SX_ViT4Ra7k",274,8948466],["KICK BACK","米津玄師","M2cckDmNLMI",227,10451203],["新時代","Ado","1FliVTcX8bQ",237,29694107],["唱","Ado","pgXpM4l_MwI",189,20169960],["Pretender","Official髭男dism","TQ8WlA2GXbk",336,29363557],["Subtitle","Official髭男dism","hN5MBlGv2Ac",322,36160284],["水平線","back number","iqEr3P78fz8",312,34777897],["SPECIALZ","King Gnu","fhzKLBZJC3w",241,8426482],["はいよろこんで","こっちのけんと","jzi6RNVEOtA",163,33555395],["晩餐歌","tuki.","oZpYEEcvu5I",220,36140303],["ドライフラワー","優里","kzZ6KXDM1RI",288,20605926],["紅蓮華","LiSA","x1FV6IrjZCY",235,29931709],["群青","YOASOBI","Y4nEEZwckuU",262,8996513],["ベテルギウス","優里","cbqvxDTLMps",291,39334885],["青と夏","Mrs. GREEN APPLE","-MKfbxHy_NA",273,20430644],["オトノケ","Creepy Nuts","tRwHpyOq4P4",196,15897258],["さよーならまたいつか！","米津玄師","-wb2PAx6aEs",208,36434512]];
  // 對外：Songs.importHot(x)，x＝'yt:<id>'｜YouTube id｜歌名｜HOT 索引 → 匯入後回傳歌曲 id（不是熱門歌回傳 null）
  function hotRow(x) {
    if (typeof x === 'number') return HOT[x] || null;
    const k = String(x || '').replace(/^yt:/, '');
    return HOT.find(h => h[2] === k || h[0] === k) || null;
  }
  function importHotX(x) { const h = hotRow(x); return h ? importHot.apply(null, h) : Promise.resolve(null); }
  async function importHot(t, a, yt, dur, lrc) {
    const id = 'yt:' + yt, old = await getSong(id);
    // 已有歌詞：自己對過時的不動；舊版自動匯入、時間軸超過影片長度（挑錯版本）的才換成固定版本
    if (old && old.lines.length && (old.synced || !(lastT(old) > dur + 1 || (old.lrc && old.lrc.id !== lrc)))) return id;
    const L = (lrc && await LinkImport.lyricsById(lrc).catch(() => null)) || await LinkImport.lyrics(t, a, dur).catch(() => null);
    const s = old || { id, title: `${t}（${a}）`, src: { type: 'yt', yt }, lines: [] };
    s.src.dur = dur;
    if (L && L.lines.length) {
      if (old && old.lines.length && L.timed) retime(s, L.lines);
      else mergeLyrics(s, L.lines);
      if (L.timed) { s.auto = true; s.lrc = { id: L.id, dur: L.dur }; }
    }
    s.timeWarn = timeWarn(s);
    await putSong(s);
    return id;
  }
  // 時間軸工具
  function lastT(s) { let m = -1; (s.lines || []).forEach(l => { if (l.t != null && l.t > m) m = l.t; }); return m < 0 ? null : m; }
  // 最後一句晚於影片結尾 → 時間軸版本不符；翻唱用原曲時間軸也不保證準
  function timeWarn(s) {
    if (s.synced || !(s.lines || []).some(l => l.t != null)) return false;
    const d = s.src && s.src.dur, L = lastT(s);
    return !!((d && L != null && L > d + 1) || (s.cover && s.auto) || (d && s.lrc && s.lrc.dur && Math.abs(s.lrc.dur - d) > 10));
  }
  // 換一份時間軸：歌詞相同就逐句換時間；不同就整份換（保留已填的中文）
  function retime(s, lines) {
    if (s.lines.length === lines.length && s.lines.every((l, i) => norm(l.jp) === norm(lines[i].jp))) { s.lines.forEach((l, i) => { l.t = lines[i].t; }); return; }
    const zh = new Map(s.lines.filter(l => l.zh).map(l => [norm(l.jp), l.zh]));
    s.lines = lines.map(l => ({ jp: l.jp, zh: zh.get(norm(l.jp)) || l.zh || '', t: l.t }));
  }
  function listView(el) {
    el.innerHTML = `<div class="sg-home">
      ${Reader.sectTabs('song')}
      <div class="sg-head"><h2 class="rd-h2">🎵 歌曲跟唱</h2></div>
      <form id="sgImport">
        <label class="rd-lbl">歌曲網址<input class="rd-in" type="url" id="sgLink" inputmode="url" placeholder="YouTube、YouTube Music 或音訊檔網址" required></label>
        <div class="rd-row"><button type="submit" id="sgFetch" class="btn primary">一鍵匯入歌曲</button><button type="button" class="btn" id="sgNew">上傳音檔或貼歌詞</button></div>
        <p class="rd-tip" id="sgImportStatus" role="status" aria-live="polite"></p>
      </form>
      <p class="muted rd-tip">YouTube 會自動帶入標題，再用歌名與歌手找日文歌詞與逐句時間。沒有找到時，可以自己貼歌詞。</p>
      <h3 class="rd-h3">我的歌</h3>
      <div class="rd-list" id="sgMine"><p class="muted rd-tip">讀取中…</p></div>
      <h3 class="rd-h3">🔥 熱門精選 <small class="muted">點一下自動匯入影片與逐句歌詞</small></h3>
      <div class="rd-list sg-hot">${HOT.map(([t, a, yt], k) => `<button type="button" class="rd-item" data-hot="${k}"><span class="rd-ic sg-hn" aria-hidden="true">${k + 1}</span><span class="rd-it"><b lang="ja">${esc(t)}</b><small class="muted" lang="ja">${esc(a)}</small></span><span class="rd-go" aria-hidden="true">▶</span></button>`).join('')}</div>
      <p class="muted rd-tip">儲存的歌曲留在這台裝置。YouTube 與音訊網址播放時需要連網。</p>
    </div>`;
    Reader.bindSect(el);
    el.querySelector('#sgNew').onclick = () => App.go('songs', { mode: 'new' });
    el.querySelectorAll('[data-hot]').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const [t, a, yt, dur, lrc] = HOT[+b.dataset.hot], sm = b.querySelector('small'), old = sm.textContent;
      b.disabled = true; sm.textContent = '匯入歌詞中…';
      try { const id = await importHot(t, a, yt, dur, lrc); if (b.isConnected) App.go('song', { id }); }
      catch (e) { if (b.isConnected) { sm.textContent = '匯入失敗，請稍後再試'; setTimeout(() => { if (sm.isConnected) sm.textContent = old; }, 4000); } }
      finally { b.disabled = false; }
    });
    const form = el.querySelector('#sgImport'), submit = form.querySelector('#sgFetch'), status = form.querySelector('#sgImportStatus');
    form.onsubmit = async e => {
      e.preventDefault();
      if (submit.disabled) return;
      const input = form.querySelector('#sgLink');
      const yt = LinkImport.youtubeID(input.value), audio = LinkImport.audio(input.value);
      if (!yt && !audio) { status.textContent = '請貼上 YouTube、YouTube Music 或 HTTPS 音訊檔網址（例如 .mp3、.m4a）'; input.focus(); return; }
      const id = yt ? 'yt:' + yt : 'audio:' + audio.href;
      submit.disabled = true;
      status.textContent = yt ? '正在讀取歌曲資訊與搜尋歌詞…' : '正在匯入音訊…';
      try {
        const existing = await getSong(id);
        if (!existing || !existing.lines.length || existing.lines.every(l => l.t == null)) {
          let data = yt ? await LinkImport.youtube(yt) : { title: audio.title, lines: [] };
          if (!yt && audio) { const f = LinkImport.songTitle(audio.title, ''); const L = await LinkImport.lyrics(f.track, f.artist).catch(() => null); if (L) data = Object.assign({}, data, L); }
          if (!form.isConnected) return;
          const src = yt ? { type: 'yt', yt } : { type: 'url', url: audio.href };
          const meta = { auto: !!data.timed, lrc: data.timed ? { id: data.id, dur: data.dur } : null, cover: data.cover ? { by: data.coverBy || '', orig: data.origTitle || '' } : null };
          if (!existing) { const ns = Object.assign({ id, title: data.title.trim().slice(0, 60) || '網路音訊', src, lines: data.lines }, meta); ns.timeWarn = timeWarn(ns); await putSong(ns); }
          else if (data.lines.length) { if (mergeLyrics(existing, data.lines) && !existing.synced) Object.assign(existing, meta); existing.timeWarn = timeWarn(existing); await putSong(existing); }
          if (data.cover && data.lines.some(l => l.t != null)) toast('🎤 翻唱版：時間軸來自原曲，可能對不上，建議到「⏱ 對時」重新對時');
          if (data.note) toast(esc(data.note));
        }
        if (form.isConnected) App.go('song', { id });
      } catch {
        if (form.isConnected) status.textContent = '歌曲匯入失敗，請稍後再試或改用音檔。';
      } finally { submit.disabled = false; }
    };
    el.querySelectorAll('[data-song]').forEach(b => b.onclick = () => App.go('song', { id: b.dataset.song }));
    songIndex().then(idx => {
      const box = el.querySelector('#sgMine'); if (!box) return;
      if (!idx.length) { box.innerHTML = '<p class="muted rd-tip">還沒有歌曲。可以用網址、音檔或歌詞新增一首。</p>'; return; }
      const cl = App.state.cleared || {};
      // 同一首歌有好幾個版本（原唱＋翻唱）：副標寫出是哪個版本，避免三首一模一樣
      const base = t => norm(String(t || '').replace(/（.*$/, ''));
      const cnt = new Map(); idx.forEach(s => cnt.set(base(s.title), (cnt.get(base(s.title)) || 0) + 1));
      const tl = s => s.src === 'tts' ? '' : !s.timed ? '・還沒對時' : s.warn ? '・<span class="sg-warnt">⚠️ 時間軸可能不準，建議對時</span>' : s.synced || s.timed === s.n ? `・已對時 ${s.timed}/${s.n}` : `・對時 ${s.timed}/${s.n}`;
      const ver = s => s.by ? `🎤 ${esc(s.by)} 翻唱` : cnt.get(base(s.title)) > 1 ? `同名的另一版・${/^yt:/.test(s.id) ? '影片 ' + esc(s.id.slice(3, 9)) : esc(SRC_NAME[s.src] || '')}` : '';
      box.innerHTML = idx.map(s => `<div class="rd-item rd-mine"><button type="button" class="rd-open" data-song="${esc(s.id)}"><span class="rd-ic" aria-hidden="true">${s.by ? '🎤' : '🎵'}</span><span class="rd-it"><b lang="ja">${esc(s.title)}</b>${ver(s) ? `<small class="sg-ver">${ver(s)}</small>` : ''}<small class="muted">${s.n} 句・${esc(SRC_NAME[s.src] || '')}${tl(s)}</small></span>${cl['song:' + s.id] ? '<span class="rd-done">✔</span>' : ''}</button><button type="button" class="rd-del" data-del="${esc(s.id)}" aria-label="刪除">✕</button></div>`).join('');
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
      <div class="sg-head"><h2 class="rd-h2">${old ? '✏️ 編輯歌曲' : '＋ 新增歌曲'}</h2></div>
      <label class="rd-lbl">歌名<input id="sgT" class="rd-in" maxlength="60" value="${esc(s.title)}" placeholder="例：我最喜歡的歌"></label>
      <div class="rd-lbl">音源</div>
      <div class="rd-tg sg-srcs" role="group" aria-label="音源">${['yt', 'url', 'file', 'tts'].map(k => `<button type="button" data-src="${k}" class="${k === type ? 'on' : ''}" aria-pressed="${k === type}">${SRC_NAME[k]}</button>`).join('')}</div>
      <div class="sg-srcbox" data-for="yt"><label class="rd-lbl">YouTube 網址<input id="sgY" class="rd-in" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${s.src.yt ? 'https://youtu.be/' + esc(s.src.yt) : ''}"></label><p class="muted rd-tip">需要連網。有些影片不允許嵌入播放，會顯示錯誤，可改用音檔。</p></div>
      <div class="sg-srcbox" data-for="url"><label class="rd-lbl">HTTPS 音訊檔網址<input id="sgU" class="rd-in" type="url" inputmode="url" placeholder="https://…/song.mp3" value="${esc(s.src.url || '')}"></label></div>
      <div class="sg-srcbox" data-for="file"><label class="rd-lbl">選擇音檔（mp3、m4a…）<input id="sgF" class="rd-in" type="file" accept="audio/*,video/mp4"></label><p class="muted rd-tip" id="sgFn">${s.src.name ? '目前：' + esc(s.src.name) : '音檔只存在這台裝置（最大 60MB），可離線播放。'}</p></div>
      <div class="sg-srcbox" data-for="tts"><p class="muted rd-tip">沒有音源時，用裝置的日文語音一句一句念（不會唱，但可練讀音與聽寫）。</p></div>
      <label class="rd-lbl">日文歌詞（每行一句，有音源時可留空）<textarea id="sgL" class="rd-in rd-ta" rows="9" lang="ja" placeholder="一行一句，空行會略過">${esc(s.lines.map(l => l.jp).join('\n'))}</textarea></label>
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
      if (!jp.length && type === 'tts') { toast('語音朗讀需要日文歌詞'); $('#sgL').focus(); return; }
      if (jp.length && !/[぀-ヿ㐀-鿿]/.test(jp.join(''))) { toast('看起來不是日文歌詞喔'); return; }
      const src = { type };
      if (type === 'yt') {
        const v = LinkImport.youtubeID($('#sgY').value);
        if (!v) { toast('看不懂這個 YouTube 網址'); $('#sgY').focus(); return; }
        src.yt = v;
      } else if (type === 'url') {
        const a = LinkImport.audio($('#sgU').value);
        if (!a) { toast('請輸入 HTTPS 音訊檔網址'); $('#sgU').focus(); return; }
        src.url = a.href; src.name = a.title;
      } else if (type === 'file') {
        if (file) {
          try { src.buf = await file.arrayBuffer(); src.name = file.name; src.mime = file.type || 'audio/mpeg'; }
          catch (e) { toast('讀不到這個檔案'); return; }
        } else if (s.src.type === 'file' && s.src.buf) { src.buf = s.src.buf; src.name = s.src.name; src.mime = s.src.mime; }
        else { toast('請選擇音檔'); return; }
      }
      // 歌詞沒改的句子保留原本的對時
      const oldT = new Map(); s.lines.forEach((l, i) => { if (l.t != null) oldT.set(i + '|' + l.jp, l.t); });
      const keepT = src.type === s.src.type && src.yt === s.src.yt && src.url === s.src.url && !(src.type === 'file' && file);
      s.title = ($('#sgT').value.trim() || jp[0] || src.name || 'YouTube・' + src.yt).slice(0, 60);
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
    const remote = s.src.type === 'url';
    const url = remote ? LinkImport.audio(s.src.url)?.href : URL.createObjectURL(new Blob([s.src.buf], { type: s.src.mime || 'audio/mpeg' }));
    box.innerHTML = `<audio class="sg-audio" controls preload="metadata"></audio><p class="sg-note" hidden>音訊無法播放，來源可能限制外部播放或已失效。</p>`;
    const a = box.querySelector('audio');
    const error = box.querySelector('.sg-note');
    a.addEventListener('error', () => { error.hidden = false; });
    if (url) a.src = url; else error.hidden = false;
    a.preservesPitch = true;
    return {
      kind: 'file', timed: true,
      time: () => a.currentTime, dur: () => a.duration || 0,
      play: () => a.play().catch(() => { }), pause: () => a.pause(), playing: () => !a.paused,
      seek: t => { a.currentTime = Math.max(0, t); }, rate: r => { a.playbackRate = r; },
      destroy: () => { a.pause(); a.removeAttribute('src'); try { a.load(); } catch (e) { } if (!remote) URL.revokeObjectURL(url); }
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
      if (m.event === 'onError') {
        // 評審 v18：官方 MV 多半禁止嵌入（錯誤 101／150）；改成「到 YouTube 播放＋這裡看歌詞」
        const code = typeof info === 'number' ? info : 0, ban = code === 101 || code === 150 || code === 153;
        note.hidden = false;
        note.innerHTML = (ban ? '😵 這部影片（多半是官方 MV）不允許在其他網站播放。' : '😵 這部影片暫時無法播放。')
          + '<br>可以：① <a href="https://www.youtube.com/watch?v=' + encodeURIComponent(s.src.yt) + '" target="_blank" rel="noopener">在 YouTube 開啟 ↗</a>，邊聽邊在這裡看歌詞跟唱；② 改貼 lyric video 或翻唱影片的網址；③ 按 🔊 用語音朗讀。';
      }
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
    const voice = () => { try { const tv = App.ttsVoice && App.ttsVoice(); if (tv && tv.voice) return tv.voice; return speechSynthesis.getVoices().find(v => /^ja/i.test(v.lang)) || null; } catch (e) { return null; } };
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
    title: '跟唱', icon: '🎶', nav: false, navParent: 'read',
    render(el, params) { const id = (params || {}).id; if (!id || id === 'demo') { App.go('songs'); return; } songView(el, id); }
  });

  async function songView(el, id) {
    el.innerHTML = '<p class="center muted rd-load">🎵 準備歌詞中…</p>';
    const loading = el.firstElementChild;
    let s = await getSong(id);
    if (!loading.isConnected) return;
    // 路線／首頁點到還沒匯入的公有領域歌曲：自動從維基文庫匯入再開
    if (!s && hotRow(id)) {
      loading.textContent = '🎵 第一次開這首，匯入歌詞中…';
      try { await importHotX(id); } catch (e) { console.warn('importHot', e); }
      if (!loading.isConnected) return;
      s = await getSong(id);
    }
    if (!s) { el.innerHTML = '<div class="panel center"><p>找不到這首歌（可能已刪除）。</p><button class="btn primary" type="button">回歌曲清單</button></div>'; el.querySelector('button').onclick = () => App.go('songs'); return; }
    setLast(s);
    if (s.lines.length) await JPText.ready(true);   // 歌詞等完整詞庫（N2／N1）載完再畫，第一次畫面就是正確斷詞（評審 v17 P1）
    if (!loading.isConnected) return;
    const hasLyrics = s.lines.length > 0;
    const P = pref();
    const V = { s, P, tokens: s.lines.map(l => JPText.tokenize(l.jp)), cur: -1, mode: 'sing', rate: 1, A: null, B: null, mark: 0, recs: [], rec: null, dict: null, dictBest: 0, listened: false, dirty: false };
    const prof = (App.profile && App.profile()) || {};
    V.lv = prof.lv || 'zero'; V.assist = prof.assist || 'full';
    if (s.lines.some(l => JPText.hasUnknown && JPText.hasUnknown(JPText.tokenize(l.jp)))) {
      JPText.ready(true).then(() => { if (!V.root || !V.root.isConnected) return; V.tokens = s.lines.map(l => JPText.tokenize(l.jp)); drawLines(V); drawVocab(V); });
    }
    const hasRec = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    el.innerHTML = `<div class="sg-page">
      <div class="sg-head"><h2 class="rd-h2" lang="ja">${esc(s.title)}</h2>${s.demo ? '' : '<button type="button" class="btn ghost sg-edit" aria-label="編輯">✏️</button>'}</div>
      ${s.license ? `<p class="muted rd-tip sg-lic">歌詞：<a href="${esc(s.url || '')}" target="_blank" rel="noopener">${esc(s.license)}</a>${s.note ? '　' + esc(s.note) : ''}</p>` : ''}
      ${s.cover ? `<p class="sg-sub muted" lang="ja">🎤 翻唱：${esc(s.cover.by || '（未知）')}${s.cover.orig ? `・原曲 ${esc(s.cover.orig)}` : ''}</p>` : ''}
      <div class="sg-media"></div>
      <p class="rd-warn sg-twarn" role="status" hidden></p>
      <div class="tabs sg-modes" role="tablist" ${hasLyrics ? '' : 'hidden'}>
        <button type="button" data-mode="sing" class="on" role="tab">🎤 跟唱</button>
        ${s.src.type === 'tts' ? '' : '<button type="button" data-mode="mark" role="tab">⏱ 對時</button>'}
      </div>
      <div class="rd-tg sg-tg" role="group" aria-label="顯示" ${hasLyrics ? '' : 'hidden'}>
        <button type="button" data-t="y" aria-pressed="${!!P.y}" class="${P.y ? 'on' : ''}">讀音</button>
        <button type="button" data-t="r" aria-pressed="${!!P.r}" class="${P.r ? 'on' : ''}">羅馬字</button>
        <button type="button" data-t="z" aria-pressed="${!!P.z}" class="${P.z ? 'on' : ''}">中文</button>
        <button type="button" data-t="follow" aria-pressed="${P.follow !== false}" class="${P.follow !== false ? 'on' : ''}">自動捲動</button>
      </div>
      <div class="sg-help muted rd-tip"></div>
      <div class="sg-lyr rd-doc mine ${P.y ? 'y' : ''} ${P.r ? 'r' : ''} ${P.z ? 'z' : ''}" lang="ja"></div>
      ${s.demo || s.src.type === 'tts' || (hasLyrics && s.lines.every(l => l.t != null)) ? '' : `<div class="sg-auto rd-box"><button type="button" class="btn primary sg-find">🔍 自動找${hasLyrics ? '時間軸' : '歌詞與時間軸'}</button><button type="button" class="btn sg-paste">📋 自己貼歌詞</button><div class="rd-row"><label class="rd-lbl">歌名<input class="rd-in sg-q" lang="ja" value="${esc(guessTitle(s).track || '')}"></label><label class="rd-lbl">歌手<input class="rd-in sg-a" lang="ja" value="${esc(guessTitle(s).artist || '')}"></label></div><p class="muted rd-tip sg-fst" role="status"></p></div>`}
      <div class="sg-vocab"></div>
      <div class="sg-recs"></div>
      <div class="sg-ctl" role="toolbar" aria-label="播放控制">
        <div class="sg-dictbar" hidden><button type="button" class="btn" id="sgReDict">🔀 換一組</button><button type="button" class="btn primary" id="sgCheck">對答案</button></div>
        <div class="sg-ctl-row">
          <button type="button" class="sg-b sg-play" aria-label="播放">▶</button>
          <span class="sg-time" aria-live="off">${s.src.type === 'tts' ? '' : '0:00.0'}</span>
          <div class="sg-rates" role="group" aria-label="速度">${RATES.map(r => `<button type="button" data-rate="${r}" class="${r === 1 ? 'on' : ''}">${r}×</button>`).join('')}</div>
          <button type="button" class="btn primary sg-finish" ${hasLyrics ? '' : 'hidden'}>✔ 練完這首</button>
        </div>
        <div class="sg-ctl-row sg-row2" ${hasLyrics ? '' : 'hidden'}>
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
    else if (s.src.type === 'url' || (s.src.type === 'file' && s.src.buf)) V.P2 = audioPlayer(media, s);
    else { V.P2 = ttsPlayer(s, hooks); media.innerHTML = '<p class="sg-note">🗣️ 語音朗讀模式：按 ▶ 一句一句念。</p>'; }
    if (V.P2.kind === 'file') { const a = media.querySelector('audio'); a.addEventListener('play', () => syncPlay(V)); a.addEventListener('pause', () => syncPlay(V)); }

    // 綁定
    if ($('.sg-edit')) $('.sg-edit').onclick = () => App.go('songs', { edit: s.id });
    if ($('.sg-paste')) $('.sg-paste').onclick = () => App.go('songs', { edit: s.id });
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
    if ($('.sg-find')) $('.sg-find').onclick = async () => {
      const b = $('.sg-find'), st = $('.sg-fst');
      b.disabled = true; st.textContent = '搜尋歌詞中…';
      try {
        const dur = V.P2 && V.P2.dur ? Math.round(V.P2.dur() || 0) : 0;
        const L = await LinkImport.lyrics($('.sg-q').value, $('.sg-a').value, dur);
        if (!V.root.isConnected) return;
        if (!L || !L.lines.length) { st.textContent = '找不到相符的日文歌詞。可修改歌名／歌手再試，或按「📋 自己貼歌詞」。'; return; }
        let r = mergeLyrics(s, L.lines);
        if (!r) {
          const ok = await new Promise(res => App.modal(`<h2>用找到的歌詞取代？</h2><p class="muted">找到「${esc(L.title)}」${L.timed ? '（含時間軸）' : ''}，和目前歌詞不同。取代後原本的歌詞、中文與校時會被覆蓋。</p>`, [{ label: '保留原本', onClick: () => res(false) }, { label: '取代', cls: 'primary', onClick: () => res(true) }]));
          if (!ok) { st.textContent = '已保留原本歌詞。'; return; }
          s.lines = L.lines.map(l => ({ jp: l.jp, zh: l.zh || '', t: l.t })); r = 'all';
        }
        if (/^YouTube・/.test(s.title) || s.src.type !== 'yt') s.title = L.title.slice(0, 60);
        if (L.timed && r === 'all') { s.auto = true; s.lrc = { id: L.id, dur: L.dur }; s.synced = false; }
        if (dur) s.src.dur = dur;
        s.timeWarn = timeWarn(s);
        await putSong(s);
        App.toast(L.timed ? '✅ 已套用歌詞與逐句時間' : '✅ 已套用歌詞（這版沒有時間軸，可用「⏱ 對時」手動標）', 'ok');
        cleanup(V); songView(el, s.id);
      } catch (e) { st.textContent = '搜尋失敗，請稍後再試。'; }
      finally { if (b.isConnected) b.disabled = false; }
    };
    drawVocab(V);
    showWarn(V);

    if (hasLyrics) setMode(V, 'sing');
    else $('.sg-help').textContent = '音源已匯入，還沒有歌詞：按下方「🔍 自動找歌詞」或「📋 自己貼歌詞」。';
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
    if (!V.tck && P2.dur() > 0) checkTiming(V);
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

  // 拿到影片長度後檢查時間軸：自動匯入、還沒自己對時的歌，用影片長度重挑 LRC 版本；仍超過影片長度就提示去對時
  async function checkTiming(V) {
    V.tck = true;
    const s = V.s, d = Math.round(V.P2.dur());
    if (!s.lines.some(l => l.t != null) || s.demo) { showWarn(V); return; }
    const was = s.src.dur; s.src.dur = d;
    let bad = timeWarn(s);
    if (bad && s.auto && !s.synced && !s.cover && navigator.onLine !== false) {
      const g = guessTitle(s);
      const L = await LinkImport.lyrics(g.track, g.artist, d).catch(() => null);
      if (V.dead) return;
      const lt = L && L.timed ? L.lines[L.lines.length - 1].t : null;
      if (L && L.timed && lt != null && lt <= d + 1 && (!s.lrc || L.id !== s.lrc.id) && LinkImport.sameSong(L.track, g.track)) {
        retime(s, L.lines); s.lrc = { id: L.id, dur: L.dur };
        V.tokens = s.lines.map(l => JPText.tokenize(l.jp)); V.dict = null;
        drawLines(V); drawVocab(V);
        toast('⏱ 已依影片長度換成相符的時間軸', 'ok');
        bad = timeWarn(s);
      }
    }
    if (bad !== !!s.timeWarn || was !== d) { s.timeWarn = bad; putSong(s); }
    showWarn(V);
  }
  function showWarn(V) {
    const w = V.$('.sg-twarn'), s = V.s; if (!w) return;
    const on = !!s.timeWarn && !s.synced;
    w.hidden = !on;
    if (on) w.textContent = s.cover ? '🎤 這是翻唱版：時間軸來自原曲，可能對不上。建議按「⏱ 對時」自己對一次。' : '⚠️ 時間軸可能不準（最後一句晚於影片結尾），建議按「⏱ 對時」重新對時。';
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
  function setMode(V, m, ok) {
    if (m === 'mark' && !V.P2.timed) m = 'sing';
    // 已經有完整時間軸（且沒被判定不準）：先確認，避免一按大按鈕就蓋掉
    if (m === 'mark' && !ok && V.mode !== 'mark' && V.s.lines.length && V.s.lines.every(l => l.t != null) && !V.s.timeWarn) {
      App.modal(`<h2>這首已經對好時了</h2><p class="muted">${V.s.synced ? '你已經自己對過時。' : '這首已有逐句時間軸。'}重新對時會從第 1 句開始覆蓋原本的時間，要繼續嗎？</p>`, [{ label: '不用了' }, { label: '重新對時', cls: 'primary', onClick: () => setMode(V, 'mark', true) }]);
      return;
    }
    V.mode = m;
    V.root.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', b.dataset.mode === m); });
    V.$('.sg-help').textContent = HELP[m] + (m === 'sing' && V.P2.timed && !V.s.lines.some(l => l.t != null) ? '　※ 還沒對時：先到「⏱ 對時」標記每句開始時間，才會逐句高亮。' : '') + (V.s.lines.some(l => l.zh) ? '' : '　※ 字下面的中文是逐詞參考，不是整句翻譯；可按 ✏️ 編輯貼上中文歌詞。');
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
        <span class="sg-acts"><button type="button" class="rd-say sg-say" data-say="${i}" aria-label="朗讀這句">🔊</button>${V.mode === 'dict' ? '' : App.trackBtn(lineItem(V, i), true)}</span>
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
      l.t = Math.max(0, Math.round((l.t + +d) * 10) / 10); V.s.synced = true; V.s.timeWarn = false; showWarn(V); V.dirty = true; saveSoon(V);
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
    // 查詞時先暫停音樂（歌詞也就不會在背後一直捲），關掉再接著播
    let wasOn = V.P2.playing();
    if (wasOn) V.P2.pause();
    Reader.wordCard(t, { title: V.s.title, sentence: line.jp, zh: line.zh, source: '🎵 歌曲', onClose: () => { w.classList.remove('sel'); markTracked(V); if (wasOn && !V.dead) { wasOn = false; V.P2.play(); setTimeout(() => syncPlay(V), 60); } } });
  }
  function lineItem(V, i) {
    const l = V.s.lines[i];
    return App.wordItem({ jp: l.jp, kana: '', zh: l.zh || '（歌詞整句）', hint: `出自《${V.s.title}》第 ${i + 1} 句` }, '🎵 歌曲', 'phrase');
  }
  // 本曲單字（與閱讀共用 Reader.vocabList）
  function drawVocab(V) {
    const box = V.$('.sg-vocab'); if (!box || !V.s.lines.length || !Reader.vocabList) return;
    const voc = Reader.vocabList(V.tokens, V.s.lines.map(l => l.jp), V.s.title, '🎵 歌曲', 50);
    V.vItems = voc.items;
    box.innerHTML = `<details class="rd-box sg-vdet"><summary>📚 本曲單字 ${voc.list.length} 個（可加入不會清單）</summary>${Reader.vocabHTML(voc)}</details>`;
    box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => App.speak(b.dataset.sp, .85));
    const all = box.querySelector('[data-all="v"]');
    if (all) all.onclick = () => {
      let n = 0; V.vItems.forEach(it => { if (!Tracker.has(it.id) && Tracker.add(it, true)) n++; });
      Reader.syncTrackBtns(V.root); markTracked(V);
      toast(n ? `📌 已加入 ${n} 筆到不會清單` : '都已在不會清單了', n ? 'ok' : '');
    };
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
    V.s.lines[V.mark].t = t; V.s.synced = true; V.s.timeWarn = false; showWarn(V);
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
    let ok = 0, blank = 0;
    const norm = x => JPText.toHira(String(x || '').replace(/[\s　]/g, ''));
    ins.forEach(inp => {
      const [li, k] = inp.dataset.a.split(':').map(Number), t = V.tokens[li][k];
      const v = norm(inp.value);
      // 沒填的格子：不算錯、不加入不會清單
      if (!v) { blank++; inp.classList.remove('ok', 'ng'); return; }
      const good = v === norm(t.kana) || v === norm(t.s);
      inp.classList.toggle('ok', good); inp.classList.toggle('ng', !good);
      if (good) ok++;
      else {
        Tracker.add(App.wordItem({ jp: t.base || t.s, kana: t.bkana || t.kana, romaji: JPText.romaji(t.bkana || t.kana || ''), zh: t.zh || '', hint: `出自《${V.s.title}》：${V.s.lines[li].jp}`, ex: V.s.lines[li].jp, exz: V.s.lines[li].zh || '', exw: t.s, from: V.s.title }, '🎵 歌曲', 'word'), true);
        if (!inp.nextElementSibling || !inp.nextElementSibling.classList.contains('sg-ans')) inp.insertAdjacentHTML('afterend', `<span class="sg-ans">${esc(t.s)}${t.kana && t.kana !== t.s ? '（' + esc(t.kana) + '）' : ''}</span>`);
      }
    });
    const done = ins.length - blank;
    if (!done) { toast('還沒有填任何格子喔'); return; }
    V.dictBest = Math.max(V.dictBest, ok / ins.length); V.dictDone = true;   // 按過對答案就算做過填空（全錯也能練完）
    toast(`答對 ${ok} / ${done}${ok < done ? '・答錯的已加入不會清單' : ' 🎉'}${blank ? `（${blank} 格未作答，不算錯）` : ''}`, ok === done ? 'ok' : '');
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
    if (!V.listened && !V.recs.length && !V.dictBest && !V.dictDone) { toast('先按 ▶ 聽一次，或做一下填空吧'); return; }
    const stars = Math.min(3, 1 + (V.recs.length ? 1 : 0) + (V.dictBest >= 0.7 ? 1 : 0));
    const r = App.reward('song:' + V.s.id, stars, '歌曲跟唱');
    const tips = [], d = App.state.today;
    // 今日課的「用出來」來這裡唱：結果彈窗給「回今日課」
    const fromToday = !!(d && d.date === App.today() && d.applyAt && d.apGoal === 'fun');
    if (!V.recs.length) tips.push('用 🎤 錄一句跟唱');
    if (V.dictBest < 0.7) tips.push('填空答對 7 成以上');
    App.showResult({
      title: '練完了！', stars, gained: r && r.gained,
      note: tips.length ? `<span class="muted">想拿更多星：${tips.join('、')}。</span>` : '<span class="muted">聽、唱、寫都完成了，很棒！</span>',
      back: { label: '歌曲清單', route: 'songs' }, ok: '繼續練',
      next: fromToday ? { label: '回今日練習 ▶', route: 'today', params: { goal: 'fun' } } : null
    });
  }

  window.Songs = { DEMO, HOT, importHot: importHotX, hotRow, get: getSong, ytId: LinkImport.youtubeID, list: songIndex, last };
})();
