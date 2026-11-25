// 網址匯入：只用開放授權來源（維基百科、維基文庫、維基新聞…，見下方「開放資料原則」與 docs/資料來源.md）；YouTube 只嵌入使用者自己貼的影片。
(function () {
  'use strict';
  const MAX_TEXT = 50000;
  const JAPANESE = /[ぁ-ゖァ-ヺ]/g;
  const hasJapanese = (text, count) => (String(text || '').match(JAPANESE) || []).length >= count;
  const tidy = text => String(text || '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean).join('\n');

  function publicURL(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      const host = url.hostname.replace(/\.$/, '');
      if (!host.includes('.') || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /\.(?:local|localhost|internal|test|invalid)$/.test(host)) return null;
      url.hash = '';
      return url;
    } catch { return null; }
  }

  async function request(url, accept, ms, extraHeaders) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), ms);
    try {
      const r = await fetch(url, { headers: { ...(accept && { Accept: accept }), ...extraHeaders }, credentials: 'omit', referrerPolicy: 'no-referrer', signal: abort.signal });
      if (!r.ok) throw new Error(String(r.status));
      return accept === 'application/json' ? await r.json() : await r.text();
    } finally {
      clearTimeout(timer);
    }
  }

  // <ruby>漢字<rt>かんじ</rt></ruby> → ｜漢字《かんじ》（青空文庫格式；閱讀器據此對應原文讀音）
  function rubyMark(node) {
    const box = node.cloneNode(true);
    box.querySelectorAll('ruby').forEach(r => {
      const rt = [...r.querySelectorAll('rt')].map(x => x.textContent.trim()).join('').replace(/[\s（）()、，,]+/g, '');
      r.querySelectorAll('rt, rp').forEach(x => x.remove());
      const base = r.textContent.replace(/[\s（）()、，,]+/g, '');   // 維基百科的 ruby 模板會把括號、頓號留在 ruby 內
      r.replaceWith(base && rt && /[ぁ-ゖァ-ヺー]/.test(rt) && !/[｜《》]/.test(base + rt) ? `｜${base}《${rt}》` : base);
    });
    box.querySelectorAll('rt, rp').forEach(x => x.remove());
    return box;
  }
  const plain = s => String(s || '').replace(/｜([^｜《》\n]+)《[^《》\n]+》/g, '$1');

  /* =========================================================
     開放資料原則（docs/資料來源.md）：只連「開放授權」的來源，不用需授權的新聞、歌詞、代讀服務。
     來源（多管道，皆可免費、免金鑰、允許跨網域 API）：
       維基百科（CC BY-SA）：文章匯入、「最近の出来事」每日新聞摘要
       維基新聞（CC BY 2.5；2026 年停止更新，過去報導仍可讀）
       維基文庫（公有領域／CC BY-SA）：唱歌・童謠歌詞、古典文學
       維基教科書、維基語錄、維基導遊、維基詞典（CC BY-SA）
     其他網站：不抓取；請使用者自己貼上有權使用的文字（只存在自己的裝置）。
     ========================================================= */
  const WIKI = /^(ja|zh|en)\.(?:m\.)?(wikipedia|wikinews|wikisource|wikibooks|wikiquote|wikivoyage|wiktionary)\.org$/;
  const WIKI_LIC = { wikipedia: 'CC BY-SA 4.0', wikinews: 'CC BY 2.5', wikisource: '公有領域／CC BY-SA 4.0', wikibooks: 'CC BY-SA 4.0', wikiquote: 'CC BY-SA 4.0', wikivoyage: 'CC BY-SA 4.0', wiktionary: 'CC BY-SA 4.0' };
  const WIKI_NAME = { wikipedia: '維基百科', wikinews: '維基新聞', wikisource: '維基文庫', wikibooks: '維基教科書', wikiquote: '維基語錄', wikivoyage: '維基導遊', wiktionary: '維基詞典' };
  const OPEN_MSG = '只能匯入開放授權的網站（維基百科、維基文庫、維基新聞等）。其他文章請自己貼上文字（只存在你的裝置）。';
  function wikiOf(url) {
    const m = url && url.hostname.match(WIKI); if (!m) return null;
    let title = '';
    const p = url.pathname.match(/^\/wiki\/(.+)$/);
    if (p) { try { title = decodeURIComponent(p[1]); } catch { title = p[1]; } }
    else title = url.searchParams.get('title') || '';
    return title ? { host: m[1] + '.' + m[2] + '.org', project: m[2], title: title.replace(/_/g, ' ') } : null;
  }
  const wikiApi = (host, params) => request(`https://${host}/w/api.php?` + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2', origin: '*' }, params)), 'application/json', 9000);
  // MediaWiki 解析後的 HTML → 正文（去掉註腳、目錄、表格、導覽框）；<ruby> 轉成「｜漢字《かな》」
  function wikiText(html) {
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    doc.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
    doc.querySelectorAll('.mw-editsection, .reference, .references, .reflist, .navbox, .infobox, table, style, script, .mw-empty-elt, .noprint, figure, .thumb, .gallery, .hatnote, .metadata, .licensetpl, .side-box, .toc, #toc, .sisitem, .mw-references-wrap').forEach(x => x.remove());
    const body = rubyMark(doc.body);
    // 文末的情報源、出典、外部リンク等不是正文：從該標題起整段丟掉
    const TAIL = /^(?:情報源|出典|脚注|注釈|参考文献|関連項目|関連ニュース|外部リンク|関連記事|ソース)\s*$/;
    const cut = [...body.querySelectorAll('h2, h3')].find(h => TAIL.test(h.textContent.replace(/\[[^\]]*\]/g, '').trim()));
    if (cut) { const top = cut.closest('.mw-heading') || cut; let x = top; while (x) { const nx = x.nextSibling; x.remove(); x = nx; } }
    const blocks = [...body.querySelectorAll('h2, h3, h4, p, li, dd, .poem')].filter(x => !x.closest('.poem') || x.matches('.poem'));
    const text = blocks.length ? blocks.map(x => x.textContent).join('\n') : body.textContent;
    return tidy(String(text).replace(/\[\d+\]|\[注 ?\d+\]|\[編集\]|\[編集 \| ソースを編集\]/g, ''));
  }
  async function wikiPage(w, lead) {
    const j = await wikiApi(w.host, Object.assign({ action: 'parse', page: w.title, prop: 'text', redirects: '1', disabletoc: '1', disableeditsection: '1' }, lead ? { section: '0' } : {}));
    if (!j || !j.parse || !j.parse.text) throw new Error('找不到這一頁');
    return { title: j.parse.title, html: j.parse.text, url: `https://${w.host}/wiki/${encodeURIComponent(j.parse.title.replace(/ /g, '_'))}`, license: WIKI_LIC[w.project], source: WIKI_NAME[w.project] };
  }

  async function article(value) {
    const url = publicURL(value);
    if (!url) throw new Error('請輸入公開的文章網址');
    const w = wikiOf(url);
    if (!w) throw new Error(OPEN_MSG);
    const p = await wikiPage(w);
    const text = wikiText(p.html);
    if (!hasJapanese(text, 8)) throw new Error('這一頁沒有日文正文，請換一篇日文頁面');
    return { title: p.title.slice(0, 240), text: text.slice(0, MAX_TEXT).replace(/｜[^》\n]*$/, ''), url: p.url, license: p.license, source: p.source };
  }
  // 「最近の出来事」的一則新聞：本文＝那則新聞摘要本身；另附每個相關條目的導言（只取開頭 2 段），不再開整篇條目
  async function newsDoc(n) {
    const rel = (n.rel || []).slice(0, 3);
    const parts = [n.title];
    for (const r of rel) {
      const w = wikiOf(publicURL(r.href)); if (!w) continue;
      try {
        const p = await wikiPage(w, true);
        const paras = wikiText(p.html).split('\n').filter(x => hasJapanese(x, 8)).slice(0, 2).join('\n').slice(0, 500);
        if (paras) parts.push('【' + p.title + '】\n' + paras);
      } catch { }
    }
    return { title: n.title.slice(0, 120), text: parts.join('\n\n'), url: n.key || n.link, license: 'CC BY-SA 4.0', source: '維基百科「最近の出来事」' };
  }
  // 相容舊介面：「最新簡單日文新聞」改成維基百科「最近の出来事」當天摘要
  const NHK = '';
  const EASY_FEEDS = [];
  const nhkHome = () => false;
  async function latestEasy() {
    const items = await newsList('wp', 7);
    if (!items.length) throw new Error('暫時無法取得最近的新聞');
    const day = items[0].day, today = items.filter(x => x.day === day);
    return { title: '最近の出来事（' + day + '）', text: today.map(x => x.title).join('\n'), url: 'https://ja.wikipedia.org/wiki/Portal:%E6%9C%80%E8%BF%91%E3%81%AE%E5%87%BA%E6%9D%A5%E4%BA%8B', license: 'CC BY-SA 4.0', source: '維基百科' };
  }
  const latestNHK = latestEasy;

  function audio(value) {
    const url = publicURL(value);
    if (!url || url.protocol !== 'https:' || !/\.(?:mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(url.pathname)) return null;
    let title = url.pathname.split('/').pop();
    try { title = decodeURIComponent(title); } catch { }
    return { href: url.href, title: title.replace(/\.[^.]+$/, '') };
  }

  function youtubeID(value) {
    const input = String(value || '').trim();
    if (/^[\w-]{11}$/.test(input)) return input;
    const url = publicURL(input);
    if (!url) return '';
    let id = '';
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/)?.[1];
    }
    return /^[\w-]{11}$/.test(id || '') ? id : '';
  }

  // ---------- 影片標題解析（翻唱／歌ってみた／カバー／弾き語り／翻唱…）：純函式，tools/test-cover.mjs 離線測試 ----------
  const COVER = /歌ってみた|歌わせて(?:いただ|頂)きました|歌いました|弾いてみた|弾き語り|叩いてみた|吹いてみた|演奏してみた|替え歌|カバー|カラオケ|翻唱|\bcover(?:s|ed)?\b|\bkaraoke\b|\bsung\s+by\b/i;
  const COVER_RM = /(?:を|で)?(?:本気で|全力で|ガチで)?(?:歌ってみた|歌わせて(?:いただ|頂)きました|歌いました|弾いてみた|弾き語り|叩いてみた|吹いてみた|演奏してみた|替え歌で?|カバー|カラオケ|翻唱|\b(?:acoustic\s+|girls?\s+rock\s+|rock\s+|piano\s+|collaboration\s+)?cover(?:s|ed)?\b\.?|\bkaraoke\b|\bcollaboration\b)/gi;
  const NOISE_RM = /\bofficial\b(?:\s+(?:music\s+)?video|\s+audio|\s+mv|\s+youtube)?|\bmusic\s*(?:video|clip)\b|\blyrics?(?:\s*video)?\b|\b(?:full|tv|short)\s*(?:size|ver(?:sion)?)\b\.?|\bthe\s+first\s+take\b|\bfirst\s+take\b|\bmv\b|\bpv\b|\bfull\b|\bhd\b|\b4k\b|\baudio\b|\bop\b|\bed\b|\bopening\b|\bending\b|フル(?:バージョン)?|歌詞付き?|歌詞|字幕|中字|和訳|コード|ギター|初心者向け|簡単|オープニング(?:テーマ)?|エンディング(?:テーマ)?|主題歌|挿入歌|女性が歌う|男性が歌う|原曲キー|\S*ver(?:sion)?\.(?=\s|$)|\S+\s+ver(?:sion)?\.?(?=\s|$)|\bfeat\.?\s.*$|\bft\.\s.*$/gi;
  const SEP = /\s*(?:[\/|¦┃│]+|\s[-–—~〜]+\s|[–—]+|:\s)\s*/;
  const JP = /[ぁ-ゖァ-ヺ一-龯々]/;
  // 常見原唱歌手（熱門歌單以外也認得出「誰的歌」）
  const ARTISTS = ['あいみょん', 'YOASOBI', 'Ado', 'LiSA', '米津玄師', 'Kenshi Yonezu', '優里', 'Vaundy', 'King Gnu', 'Official髭男dism', 'Mrs. GREEN APPLE', 'back number', 'RADWIMPS', 'Aimer', 'ヨルシカ', 'ずっと真夜中でいいのに。', 'ずとまろ', 'Creepy Nuts', 'tuki.', 'Eve', 'Uru', '藤井風', 'Fujii Kaze', '星野源', 'スピッツ', 'Mr.Children', 'ONE OK ROCK', 'SEKAI NO OWARI', 'Saucy Dog', 'マカロニえんぴつ', 'imase', 'Tani Yuuki', 'なとり', 'natori', 'Ayase', 'milet', 'Eill', 'wacci', 'DISH//', 'BUMP OF CHICKEN', 'サカナクション', '宇多田ヒカル', '椎名林檎', '中島みゆき', 'MISIA', 'Superfly', 'いきものがかり', 'GReeeeN', '西野カナ', '平井堅', '秦基博', '緑黄色社会', 'Novelbright', 'ハンバート ハンバート', 'Number_i', 'こっちのけんと', '川崎鷹也', '森山直太朗', '中森明菜', '竹内まりや', '松任谷由実', 'Hump Back', 'yama', 'reGretGirl', 'りりあ。', '幾田りら', 'Lilas', 'ちゃんみな', 'XG', 'BE:FIRST', 'King & Prince', 'Snow Man', '嵐', 'AKB48', '乃木坂46', '櫻坂46', '日向坂46', 'あいみょん', 'ClariS', 'Kalafina', '藍井エイル', 'ReoNa', 'Eve', 'まふまふ', 'DECO*27', 'ハチ', 'ピノキオピー', 'じん', 'kemu', 'wowaka'];
  const latinDesc = x => !JP.test(x) && /^[\x20-\x7e]+$/.test(x) && x.trim().split(/\s+/).length >= 3;
  const trimSym = x => String(x || '').replace(/^[\s\-–—~〜:・,.。!！?？&＆#＃*＊_]+|[\s\-–—~〜:・,。&＆#＃*＊_]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  const authorName = a => String(a || '').replace(/\s*(?:-\s*topic|official(?:\s+youtube)?(?:\s+channel)?|channel|チャンネル|ちゃんねる|\bch\.?)\s*$/i, '').trim();
  // 和熱門清單比對：key 相同＝確定；歌名包含熱門歌名（拉丁字母要整個單字、長度比 ≥ .5）＝候選
  function hotMatch(k, hot) {
    let exact = null, part = null;
    (hot || []).forEach(h => {
      const hk = key(h[0]); if (!hk || !k) return;
      if (hk === k) { exact = exact || h; return; }
      if (hk.length < 3 || !k.includes(hk) || hk.length / k.length < .5) return;
      if (/^[a-z0-9]+$/.test(hk) && !new RegExp('(^|[^a-z0-9])' + hk + '($|[^a-z0-9])').test(k)) return;
      part = part || h;
    });
    return { exact, part };
  }
  // 回傳 { cover, by, track, artist, hot, cands:[{track, artists[], prior, hot}], pieces }
  function coverParse(title, author, hot) {
    let s = String(title || '').normalize('NFKC').replace(/[​-‏﻿]/g, '');
    const cover = COVER.test(s);
    let by = '';
    const take = re => { s = s.replace(re, (m, x) => { if (!by && x && trimSym(x)) by = trimSym(x); return ' ¦ '; }); };
    // 歌手名本身含分隔符號（DISH//、Mr.Children…）：先換成佔位，免得被當成分隔
    const NAMES = [];
    ARTISTS.filter(a => /[\/|・.]/.test(a)).forEach(a => { if (s.includes(a)) { s = s.split(a).join('\u0003' + NAMES.length + '\u0004'); NAMES.push(a); } });
    // 翻唱者明寫（優先）：うた：X／歌：X／Vo. X；再來 covered by X／cover by X／sung by X／ver. X／Xが（本気で）「曲」歌ってみた
    take(/(?<=^|[\s¦】\])）)])(?:vo\.|vocal|歌|唄|うた|歌い手)\s*[:]\s*([^\[\]【】()「」『』\/|¦┃│]+?)(?=\s*(?:[\[\]【】()「」『』\/|¦┃│]|$))/gi);
    take(/(?:full\s+)?(?:covered|cover|sung)\.?\s*by\s*:?\s*([^\[\]【】()「」『』\/|¦┃│]+?)(?=\s*(?:[\[\]【】()「」『』\/|¦┃│]|\s[-–—]\s|$))/gi);
    take(/(?:^|[\s¦])(?:vo\.|vocal|歌|唄|歌い手)\s*[:]\s*([^\[\]【】()「」『』\/|¦┃│]+?)(?=\s*(?:[\[\]【】()「」『』\/|¦┃│]|$))/gi);
    if (cover) take(/(?:^|[\s\/|¦])ver\.\s*([^\s\-~)\]】【\[\/|¦][^\[\]【】()\/|¦]*)/i);
    if (cover) take(/([^\s¦\[\]【】()「」『』\/|]{2,15}?)が(?=[^「」『』¦]{0,10}?[「『]|(?:本気で|全力で)?歌ってみた)/);
    // 引號（'Lemon'、“…”）統一成「」；再把「」『』【】[]() 換成佔位符，保留在標題裡的位置
    s = s.replace(/(^|\s)'([^']{1,40})'(?=\s|$)/g, '$1「$2」').replace(/“([^”]{1,60})”/g, '「$1」');
    const store = [];
    const hold = (re, k) => { let prev; do { prev = s; s = s.replace(re, (m, x) => '\u0001' + (store.push({ x, k }) - 1) + '\u0002'); } while (s !== prev); };
    hold(/[「『]([^「」『』]*)[」』]/g, 'q'); hold(/[【\[]([^【】\[\]]*)[】\]]/g, 'b'); hold(/\(([^()]*)\)/g, 'p');
    const raw = [];
    const split = (str, kind) => str.split(/(\u0001\d+\u0002)/).forEach(part => {
      const m = part.match(/^\u0001(\d+)\u0002$/);
      if (m) { const st = store[+m[1]]; split(st.x, kind === 'q' || st.k === 'q' ? 'q' : kind === 't' ? st.k : kind); raw.push(null); return; }
      part.split(SEP).forEach(p => raw.push({ raw: p, k: kind }));
    });
    split(s, 't');
    // 每段清掉翻唱字樣、雜訊（MV、Full、ver.、OP…），記下「這段原本帶翻唱字樣」（多半是翻唱者名）
    const pieces = [];
    const unName = x => String(x).replace(/\u0003(\d+)\u0004/g, (m, i) => NAMES[+i]);
    by = unName(by);
    raw.forEach(r => {
      if (!r) return;
      let x = unName(r.raw).replace(/¦/g, ' ');
      const mark = COVER_RM.test(x); COVER_RM.lastIndex = 0;
      x = trimSym(x.replace(COVER_RM, ' ').replace(NOISE_RM, ' '));
      if (!x || !/[\p{L}\p{N}]/u.test(x) || key(x).length < 1) { let j = pieces.length - 1; while (j > 0 && pieces[j].k === 'p') j--; const lp = pieces[j]; if (mark && lp && r.k === 't' && lp.k === 't' && !/[\/|¦┃│]/.test(r.raw)) lp.mark = true; return; }   // 「高橋李依（アイ役）cover.」：只剩翻唱字樣的段，標記給前一段
      pieces.push({ text: x, k: r.k, mark: mark && r.k !== 'q', i: pieces.length });
    });
    const au = key(authorName(author));
    const isAuthor = p => au.length >= 2 && (key(p.text) === au || (key(p.text).length >= 3 && (au.includes(key(p.text)) || key(p.text).includes(au))));
    const hotArtists = (hot || []).map(h => key(h[1])).concat(ARTISTS.map(key)).filter(x => x.length >= 2);
    const knownArtist = p => { const k = key(p.text); return k.length >= 2 && hotArtists.some(a => a === k || (k.length >= 3 && (k.includes(a) || a.includes(k)))); };
    const hasJP = pieces.some(p => JP.test(p.text));
    const byKey = key(by);
    // 歌名候選：引號 ＞ 一般段 ＞ 括號；越前面越優先；拉丁長句（英文翻譯／說明）、韓文、太長的段扣分
    const cands = [];
    const addCand = (track, prior, src, hotRow) => {
      track = trimSym(track); const k = key(track);
      if (!k || (byKey && k === byKey)) return;
      const old = cands.find(c => key(c.track) === k);
      if (old) { if (prior > old.prior) Object.assign(old, { prior, src }); if (hotRow && !old.hot) old.hot = hotRow; return; }
      cands.push({ track, prior, src, hot: hotRow || null, artists: [] });
    };
    pieces.forEach((p, n) => {
      if (isAuthor(p) && p.k !== 'q') return;
      let prior = 50 - n * 4 + (p.k === 'q' ? 30 : p.k === 'b' ? -25 : p.k === 'p' ? -18 : 0);
      if (hasJP && !JP.test(p.text)) prior -= latinDesc(p.text) ? 30 : 4;
      if (/[가-힯]/.test(p.text)) prior -= 30;
      if (knownArtist(p)) prior -= 35;
      if (p.text.length > 25) prior -= 20;
      const hm = hotMatch(key(p.text), hot);
      if (hm.exact) addCand(hm.exact[0], prior + 100, p, hm.exact);
      else {
        if (hm.part) addCand(hm.part[0], prior + 35, p, hm.part);
        addCand(p.text, prior, p);
      }
      // 沒有分隔符號的「あいみょん マリーゴールド」：空白切開的子段也當候選
      const words = p.text.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && JP.test(p.text) && !latinDesc(p.text)) words.forEach(w => {
        const wm = hotMatch(key(w), hot);
        if (wm.exact) addCand(wm.exact[0], prior + 95, p, wm.exact);
        else { const art = words.some(o => o !== w && knownArtist({ text: o })); if (key(w).length >= 2 || (art && key(w).length >= 1 && JP.test(w))) addCand(w, prior - 10 + (knownArtist({ text: w }) ? -40 : art ? 25 : 0), p); }
      });
    });
    cands.sort((a, b) => b.prior - a.prior);
    // 每個候選配原唱：熱門歌原唱 ＞ 標題中已知歌手 ＞ 緊接在歌名後的（）＞ 相鄰段
    cands.forEach(c => {
      const at = c.src ? pieces.indexOf(c.src) : -1, list = [];
      if (c.hot) list.push(c.hot[1]);
      if (c.src) c.src.text.split(/\s+/).filter(w => knownArtist({ text: w })).forEach(w => list.push(w.replace(/^[-–—~]+/, '')));   // 「あいみょん マリーゴールド」「猫 -DISH//」同一段裡的歌手
      pieces.filter(p => knownArtist(p) && p !== c.src).forEach(p => list.push(p.text));
      const nx = pieces[at + 1], pv = pieces[at - 1];
      if (nx && nx.k === 'p') list.push(nx.text);
      [nx, pv].forEach(p => { if (p && p.k !== 'b' && (!cover || !isAuthor(p)) && key(p.text) !== byKey && !latinDesc(p.text)) list.push(p.text); });
      c.artists = [...new Set(list.map(trimSym).filter(a => a && key(a) !== key(c.track)))].slice(0, 4);
    });
    const best = cands[0] || null;
    const p = { cover, by, explicitBy: by, cands, pieces, author: String(author || ''), track: best ? best.track : '', artist: best ? best.artists[0] || '' : '', hot: best && best.hot && best.prior >= 100 ? best.hot : null };
    p.by = cover ? coverBy(p, p.track, p.artist) : '';
    return p;
  }
  // 翻唱者：明寫（covered by…）＞ 和頻道名相同的段 ＞ 原本帶「cover／歌ってみた」字樣的段 ＞ 歌名後面的一般段 ＞ 歌名前面的一般段 ＞ 歌名後面的【】 ＞ 頻道名
  function coverBy(p, track, artist) {
    const fix = x => trimSym(x).slice(0, 24);
    if (p.explicitBy) return p.explicitBy;
    const tk = key(baseTitle(track)), ak = key(artist), au = key(authorName(p.author));
    const at = p.pieces.findIndex(x => tk && (key(x.text) === tk || key(x.text).includes(tk) || (key(x.text).length >= 2 && tk.includes(key(x.text)))));
    const ok = x => { const k = key(x.text); return k && k !== tk && !(tk && k.includes(tk)) && !(ak && (k === ak || (k.length >= 2 && (ak.includes(k) || k.includes(ak))))) && !latinDesc(x.text) && x.k !== 'q'; };
    const marked = p.pieces.some(x => ok(x) && x.mark);
    const pick = p.pieces.find((x, n) => ok(x) && !(marked && x.k === 'b' && n < at) && au.length >= 2 && (key(x.text) === au || au.includes(key(x.text)) || key(x.text).includes(au)) && key(x.text).length >= 2)
      || p.pieces.find(x => ok(x) && x.mark)
      || p.pieces.find((x, n) => ok(x) && x.k === 't' && n > at)
      || p.pieces.find((x, n) => ok(x) && x.k === 't' && n < at && at >= 0)
      || p.pieces.filter((x, n) => ok(x) && x.k === 'b' && n > at).pop();
    return fix(pick ? pick.text : authorName(p.author));
  }
  function songTitle(title, author) {
    let name = String(title || '').replace(/\s*[（(【\[]?(?:Official\s+(?:Music\s+)?Video|Music Video|Official Audio|公式MV)[）)】\]]?\s*$/i, '').trim();
    const quoted = name.match(/^(.*?)\s*[「『](.+?)[」』]$/);
    const separated = name.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    const slash = !quoted && !separated && name.match(/^(.+?)\s*[\/／]\s*(.+)$/);
    if (slash) return { track: slash[1].trim(), artist: slash[2].trim() || author };
    const pair = quoted || separated;
    if (pair) return { track: pair[2].trim(), artist: pair[1].trim() || author };
    return { track: name, artist: author };
  }
  const hotList = () => (window.Songs && Array.isArray(window.Songs.HOT) ? window.Songs.HOT : []);
  // 翻唱影片的標題：「歌名（X 翻唱・原唱 Y）」
  function coverTitle(found, by) { return `${found.track}（${by ? by + ' 翻唱' : '翻唱'}・原唱 ${found.artist}）`; }

  // duration：影片長度（秒，可無），用來挑時間軸長度相符的 LRC 版本
  // 回傳 {title, lines, track, artist, timed, id, dur, cover, coverBy, want, origTitle, note, choices:[{id, track, artist, dur, timed}]}
  async function youtube(id, duration) {
    const address = 'https://www.youtube.com/watch?v=' + id;
    const endpoint = 'https://www.youtube.com/oembed?' + new URLSearchParams({ url: address, format: 'json' });
    const meta = await request(endpoint, 'application/json', 5000).catch(() => null);
    const title = meta && meta.title ? String(meta.title) : 'YouTube・' + id;
    const result = { title, lines: [] };
    if (!meta || /\b(?:reaction|shorts)\b/i.test(title)) return result;
    const p = coverParse(title, meta.author_name || '', hotList());
    let found = null, choices = [];
    // 1) 熱門歌：用固定的 LRCLIB 版本（影片長度差很多時改用長度相符的版本）
    if (p.hot) {
      const [t, a, , hd, lrc] = p.hot;
      if (duration && hd && Math.abs(hd - duration) > 10) found = await lyrics(t, a, duration).catch(() => null);
      if (!found && lrc) found = await lyricsById(lrc).catch(() => null);
      if (!found) found = await lyrics(t, a, duration).catch(() => null);
    }
    // 2) 多個歌名候選平行查 LRCLIB：查到的歌名要和候選歌名相符；分數＝歌詞分數＋候選先後
    if (!found && p.cands.length) {
      const top = p.cands.filter(c => c.prior > -20).slice(0, 4);
      const lists = await Promise.all(top.map((c, n) => lyricsRank(c.track, c.artists, duration).then(list => list.filter(x => sameSong(x.r.trackName, c.track)).map(x => ({ s: x.s + Math.max(-4, Math.min(4, c.prior / 15)) - n, r: x.r, sc: x.s }))).catch(() => [])));
      const bySong = new Map();
      lists.flat().forEach(x => { const k = key(baseTitle(x.r.trackName)); const o = bySong.get(k); if (!o || x.s > o.s) bySong.set(k, x); });
      const list = [...bySong.values()].sort((a, b) => b.s - a.s);
      const same = (a, b) => b && sameSong(a.r.trackName.replace(/[【\[][^】\]]*[】\]]/g, ''), b.r.trackName.replace(/[【\[][^】\]]*[】\]]/g, '')) && key(a.r.artistName) === key(b.r.artistName);   // 「【Ado】うっせぇわ」與「うっせぇわ」同一首
      if (list[0] && (!list[1] || list[0].s - list[1].s >= 3 || (same(list[0], list[1]) && (!list[2] || same(list[0], list[2]) || list[0].s - list[2].s >= 3)))) found = lrcResult(list[0].r, list[0].sc);
      else choices = list.slice(0, 3).map(x => pickRow(x.r));
    }
    // 3) 都對不上：用清理後的標題整句搜尋，給使用者挑
    if (!found && !choices.length && p.cands.length) {
      const q = p.cands.slice(0, 2).map(c => c.track).concat(p.artist ? [p.artist] : []).join(' ');
      const rows = await request(LYRICS + '?' + new URLSearchParams({ q }), 'application/json', 7000).catch(() => []);
      const seen = new Set();
      choices = (Array.isArray(rows) ? rows : []).filter(r => r && !r.instrumental && hasJapanese(r.syncedLyrics || r.plainLyrics, 8) && !seen.has(key(r.trackName) + key(r.artistName)) && seen.add(key(r.trackName) + key(r.artistName))).slice(0, 3).map(pickRow);
    }
    if (found) Object.assign(result, found);
    if (p.cover) {
      result.cover = true; result.want = found ? found.track : p.track;
      result.coverBy = found ? coverBy(p, found.track, found.artist) : p.by;
      // 原唱：LRCLIB 的歌手和標題裡認得的歌手不同時，用標題的（避免「k k」這類雜訊版本）
      const ta = p.artist && ARTISTS.some(a => key(a) === key(p.artist)) ? p.artist : '';
      if (found && ta && !key(found.artist).includes(key(ta)) && !key(ta).includes(key(found.artist))) found.artist = ta;
      if (found) { result.origTitle = found.title; result.title = coverTitle(found, result.coverBy); }
    }
    if (!found && choices.length) { result.choices = choices; result.note = `${p.cover ? '翻唱影片：' : ''}找到幾首可能的原曲，請選一首。`; }
    else if (!found && p.cover) result.note = `翻唱影片：找不到和「${p.track || title}」相符的歌詞，只匯入影片。可以按 ✏️ 編輯，用歌名手動搜尋歌詞。`;
    return result;
  }
  const pickRow = r => ({ id: r.id, track: r.trackName, artist: r.artistName, dur: r.duration ? Math.round(r.duration) : 0, timed: !!r.syncedLyrics });
  // 歌名比對：去掉「-Arrange ver.-」「(TV size)」這類版本標記後，歌名要相同或互相包含
  const VER = /[\s　]*(?:[-－~〜～][^-－~〜～]*?\b(?:ver(?:sion)?|arrange|remix|edit|size)\b\.?[^-－~〜～]*[-－~〜～]?|[（(【\[][^）)】\]]*?\b(?:ver(?:sion)?|arrange|remix|size|edit)\b[^）)】\]]*[）)】\]])/gi;
  function baseTitle(t) { return String(t || '').replace(VER, ' ').replace(/\s{2,}/g, ' ').trim(); }
  function sameSong(a, b) {
    const x = key(baseTitle(a)), y = key(baseTitle(b));
    if (!x || !y) return false;
    const lo = Math.min(x.length, y.length), hi = Math.max(x.length, y.length);
    return x === y || (lo >= 2 && lo / hi >= .5 && (x.includes(y) || y.includes(x)));
  }

  // LRC：[mm:ss.xx] 歌詞 → [{jp, zh:'', t}]
  function parseLRC(lrc) {
    const out = [];
    String(lrc || '').replace(/\r/g, '').split('\n').forEach(row => {
      const tags = [...row.matchAll(/\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
      const jp = row.replace(/\[[^\]]*\]/g, '').trim();
      if (!tags.length || !jp) return;
      tags.forEach(m => out.push({ jp, zh: '', t: Math.round((+m[1] * 60 + parseFloat(m[2].replace(':', '.'))) * 10) / 10 }));
    });
    return dropTrans(out.sort((a, b) => a.t - b.t)).slice(0, 300);
  }
  // 歌詞版本把英文翻譯夾在日文行之間：①同一時間點（差 0.3 秒內）有日文行就丟掉純英文行；②純英文行大多緊跟在日文行後面（交錯）→ 全部當翻譯丟掉
  const JP_RE = /[\u3040-\u30ff\u3400-\u9fff々]/;
  function dropTrans(lines) {
    const isEn = l => !JP_RE.test(l.jp) && /[A-Za-z]{2}/.test(l.jp);
    let out = lines.filter((l, i) => !(isEn(l) && l.t != null && lines.some((m, j) => j !== i && !isEn(m) && m.t != null && Math.abs(m.t - l.t) <= .3)));
    const en = out.filter(isEn).length, ja = out.length - en;
    if (en >= 4 && ja >= 4) {
      const after = out.filter((l, i) => isEn(l) && i > 0 && !isEn(out[i - 1])).length;
      if (after / en >= .7 && en / ja >= .5) out = out.filter(l => !isEn(l));
    }
    return out;
  }
  const key = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\(.*?\)|（.*?）/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
  // 歌詞：只找公有領域的唱歌・童謠（維基文庫）。流行歌歌詞受著作權保護，不自動抓取；請使用者自己貼上（只存在自己的裝置）
  const LYRICS = 'https://lrclib.net/api/search';   // 歌詞：LRCLIB（使用者指定的例外，只在使用者裝置上即時查，不收進專案）
  const WS = 'ja.wikisource.org';
  const WS_CATS = ['Category:唱歌・童謡', 'Category:文部省唱歌'];
  let wsList = null;
  function wsSongs() {
    return wsList || (wsList = Promise.all(WS_CATS.map(c => wikiApi(WS, { action: 'query', list: 'categorymembers', cmtitle: c, cmlimit: '200', cmnamespace: '0' }).catch(() => null)))
      .then(rs => { const out = []; rs.forEach(j => ((j && j.query && j.query.categorymembers) || []).forEach(m => { if (!out.includes(m.title)) out.push(m.title); })); if (!out.length) wsList = null; return out; }));
  }
  // 維基文庫頁面 → 歌詞行（<div class="poem"> 優先；沒有就取有日文的段落）
  async function wsLyrics(title) {
    const p = await wikiPage({ host: WS, project: 'wikisource', title });
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + p.html, 'text/html');
    doc.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
    doc.querySelectorAll('.mw-editsection, .reference, .licensetpl, .side-box, table, .sisitem, style').forEach(x => x.remove());
    const box = rubyMark(doc.body);
    const poems = [...box.querySelectorAll('.poem')];
    const raw = (poems.length ? poems.map(x => x.textContent).join('\n') : [...box.querySelectorAll('p, dd')].map(x => x.textContent).join('\n'));
    // 歌詞頁的振假名（｜漢字《かな》）去掉：歌曲頁自己標讀音
    const lines = tidy(raw).split('\n').map(x => plain(x).trim()).filter(x => (x.match(/[ぁ-ゖァ-ヺ一-鿿々]/g) || []).length >= 2 && x.length <= 80 && plain(x) !== p.title && !/著作|作者|著者|作詞|作曲|訳|出典|底本|ISBN|編集|姉妹プロジェクト|データ項目/.test(x)).slice(0, 200);
    return { title: p.title, lines, url: p.url };
  }
  // 依歌名（＋歌手）在 LRCLIB 找歌詞；優先有時間軸的版本。回傳 {title, artist, lines, timed} 或 null
  async function lyrics(track, artist, duration) {
    const best = (await lyricsRank(track, artist, duration))[0];
    return best ? lrcResult(best.r, best.s) : null;
  }
  // 排名版：artist 可為字串或多個候選原唱；回傳 [{s, r}]（分數 ≥ 4，高到低）
  async function lyricsRank(track, artist, duration) {
    track = String(track || '').trim();
    if (!track) return [];
    const artists = (Array.isArray(artist) ? artist : [artist]).map(a => String(a || '').replace(/\s*-\s*Topic$/i, '').trim()).filter(Boolean);
    const singers = artists.map(a => key(a).replace(/official(?:channel)?$/, '').replace(/topic$/, '').replace(/vevo$/, '')).filter(x => x.length >= 2);
    const queries = [{ track_name: track }, { q: (track + ' ' + (artists[0] || '')).trim() }];
    if (singers.length) queries.unshift({ track_name: track, artist_name: artists[0] });
    const seen = new Map();
    const get = q => request(LYRICS + '?' + new URLSearchParams(q), 'application/json', 7000);
    const res = await Promise.all(queries.map(q => get(q).catch(() => new Promise(r => setTimeout(r, 900)).then(() => get(q)).catch(() => []))));   // 失敗（限流、逾時）重試一次
    res.forEach(rows => { if (Array.isArray(rows)) rows.forEach(r => r && r.id != null && !seen.has(r.id) && seen.set(r.id, r)); });
    const all = key(track + artists.join(''));
    const score = r => {
      if (!hasJapanese(r.syncedLyrics || r.plainLyrics, 8) || r.instrumental) return -1;
      const a = key(r.artistName), t = key(r.trackName), k = key(track);
      let s = t === k ? 6 : (t.includes(k) || k.includes(t)) && Math.min(t.length, k.length) >= 2 ? 3 : 0;
      if (!s) return -1;
      if (a.length >= 2 && singers.some(g => g.includes(a) || a.includes(g))) s += 5;
      else if (singers.length && !all.includes(a)) s -= 2;
      if (/\b(?:live|remix|acoustic|instrumental|ver\.?|version)\b|ライブ|弾き語り/i.test(r.trackName + ' ' + (r.albumName || '')) && !/live|ver/i.test(track)) s -= 3;
      if (r.syncedLyrics) s += 3;
      // 影片長度相符的版本優先；差太多（例：紅蓮華 5 分半的版本配 3 分 55 秒的 MV）扣分；最後一句超過影片長度也扣分
      if (duration && r.duration) { const d = Math.abs(r.duration - duration); s += d < 4 ? 4 : d < 10 ? 1 : d > 20 ? -5 : -2; }
      if (duration && r.syncedLyrics) { const m = [...r.syncedLyrics.matchAll(/\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g)].pop(); if (m && +m[1] * 60 + +m[2] > duration + 1) s -= 6; }
      return s;
    };
    return [...seen.values()].map(r => ({ s: score(r), r })).filter(x => x.s >= 4).sort((a, b) => b.s - a.s);
  }
  // 指定 LRCLIB 版本（熱門精選固定版本，避免挑到長度不符的時間軸）
  async function lyricsById(id) {
    const r = await request('https://lrclib.net/api/get/' + encodeURIComponent(id), 'application/json', 7000).catch(() => null);
    return r && r.id != null && hasJapanese(r.syncedLyrics || r.plainLyrics, 8) ? lrcResult(r, 20) : null;
  }
  function lrcResult(r, score) {
    const timed = r.syncedLyrics ? parseLRC(r.syncedLyrics) : [];
    const lines = timed.length >= 4 ? timed : dropTrans(tidy(r.plainLyrics).split('\n').slice(0, 300).map(jp => ({ jp, zh: '', t: null })));
    return { title: `${r.trackName}（${r.artistName}）`, track: r.trackName, artist: r.artistName, lines, timed: timed.length >= 4, score, id: r.id, dur: r.duration ? Math.round(r.duration) : 0 };
  }

  // 最近新聞（多管道，皆開放授權）：維基百科「最近の出来事」（每天更新）、維基新聞（過去報導）、維基文庫（唱歌・名作）
  const NEWS_CATS = [
    { id: 'wp', name: '最近の出来事', icon: '🌐', note: '維基百科「最近の出来事」：每天更新的新聞摘要（CC BY-SA 4.0），點一則可讀相關條目' },
    { id: 'wn', name: '維基新聞（舊報導）', icon: '📰', note: '維基新聞日文版（CC BY 2.5）：已停止更新，這裡只有過去的舊報導；要看最近新聞請選「最近の出来事」' },
    { id: 'ws', name: '唱歌・名作', icon: '📜', note: '維基文庫：著作權已過期的唱歌、童謠與文學（公有領域）' }
  ];
  // 標題可能帶 <ruby>：還原成純文字，讀音存成「｜漢字《かな》」
  function cleanTitle(t) {
    t = String(t || '');
    for (let k = 0; k < 2 && !/</.test(t) && /&(?:lt|gt|amp|quot|#\d+);/.test(t); k++) t = new DOMParser().parseFromString('<!doctype html><body>' + t, 'text/html').body.textContent;
    if (/<\/?(?:ruby|rt|rb|rp)\b/i.test(t)) {
      const box = new DOMParser().parseFromString('<!doctype html><body><div>' + t + '</div>', 'text/html').body.firstElementChild;
      t = rubyMark(box).textContent;
    }
    return t.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  const NEWS_KEY = 'jpq.news4.';
  const WP = 'ja.wikipedia.org', PORTAL = 'Portal:最近の出来事';
  async function newsList(id, days) {
    const cat = NEWS_CATS.find(c => c.id === id) || NEWS_CATS[0];
    const ck = NEWS_KEY + cat.id;
    try { const c = JSON.parse(sessionStorage.getItem(ck) || 'null'); if (c && Date.now() - c.at < 20 * 60e3) return c.items; } catch { }
    let items = [];
    if (cat.id === 'wp') {
      const p = await wikiPage({ host: WP, project: 'wikipedia', title: PORTAL });
      const doc = new DOMParser().parseFromString('<!doctype html><body>' + p.html, 'text/html');
      const since = Date.now() - (days || 3) * 864e5;
      let day = '', t = 0;
      doc.querySelectorAll('h2, h3, h4, li').forEach(el => {
        if (/^H[234]$/.test(el.tagName)) {
          const m = el.textContent.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
          if (m) { day = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; t = Date.parse(day + 'T12:00:00+09:00'); }
          return;
        }
        if (!day || el.closest('.navbox, table')) return;
        const raw = el.textContent.replace(/\s+/g, ' ').trim();
        const m = raw.match(/^((?:（[^）]{1,12}）)*)(.+?)(?:\s*-\s*([^-]{1,12}))?$/);
        if (!m || !hasJapanese(m[2], 4)) return;
        // 相關條目：依出現順序，跳過年月日、入口頁、出典；點開時只讀這則新聞＋條目導言
        const seen = new Set();
        const rel = [...el.querySelectorAll('a[href^="/wiki/"]')].filter(x => !/^\/wiki\/(?:Portal|Category|Help|Wikipedia|特別|ファイル|Template):/.test(decodeURIComponent(x.getAttribute('href'))) && !/^\d+(年|月|日)$|^\d+月\d+日$|^\d{4}年$/.test(x.textContent.trim()) && !x.closest('sup'))
          .map(x => ({ t: x.textContent.trim(), href: 'https://' + WP + x.getAttribute('href') })).filter(r => r.t && !seen.has(r.href) && seen.add(r.href));
        const title = m[2].trim();
        items.push({ title, rt: '', link: p.url, key: p.url + '#' + day + '-' + title.slice(0, 40), rel, t, day, src: (m[1] || '').replace(/）（/g, '・').replace(/[（）]/g, '').trim() || '維基百科' });
      });
      items = items.filter(x => x.t >= since || items.indexOf(x) < 10).slice(0, 40);
    } else if (cat.id === 'wn') {
      const j = await wikiApi('ja.wikinews.org', { action: 'query', list: 'categorymembers', cmtitle: 'Category:公開中', cmsort: 'timestamp', cmdir: 'desc', cmlimit: '30', cmprop: 'title|timestamp', cmnamespace: '0' });
      items = ((j && j.query && j.query.categorymembers) || []).map(m => ({ title: m.title, rt: '', link: 'https://ja.wikinews.org/wiki/' + encodeURIComponent(m.title.replace(/ /g, '_')), t: Date.parse(m.timestamp) || 0, src: '維基新聞' }));
    } else {
      items = (await wsSongs()).map(title => ({ title, rt: '', link: 'https://' + WS + '/wiki/' + encodeURIComponent(title.replace(/ /g, '_')), t: 0, src: '維基文庫' }));
    }
    items = items.filter(x => x.title && publicURL(x.link));
    try { sessionStorage.setItem(ck, JSON.stringify({ at: Date.now(), items })); } catch { }
    return items;
  }

  window.LinkImport = { WIKI_NAME, WIKI_LIC, wikiOf, wikiText, OPEN_MSG, NEWS_CATS, NEWS_KEY, newsList, newsDoc, cleanTitle, sameSong, baseTitle, coverParse, coverBy, coverTitle, lyricsRank, NHK, EASY_FEEDS, latestEasy, nhkHome, publicURL, article, latestNHK, audio, youtubeID, youtube, lyrics, lyricsById, parseLRC, songTitle };
})();
