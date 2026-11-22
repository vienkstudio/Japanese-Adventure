// 公開新聞、YouTube 與歌詞資料的網址匯入。
(function () {
  'use strict';
  const MAX_TEXT = 50000;
  const JAPANESE = /[ぁ-ゖァ-ヺ]/g;
  const READER = 'https://r.jina.ai/';
  const NHK = 'https://news.web.nhk/news/easy/';
  const LYRICS = 'https://lrclib.net/api/search';
  const NHK_HOSTS = ['news.web.nhk', 'www3.nhk.or.jp', 'www.nhk.or.jp'];
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

  // 已知不開放 CORS 的網站：直接走代讀，避免 console 出現 CORS 錯誤
  const NO_CORS = /(^|\.)(?:news\.web\.nhk|nhk\.or\.jp|matcha-jp\.com|news\.yahoo\.co\.jp)$/;
  async function request(url, accept, ms, extraHeaders) {
    try { if (NO_CORS.test(new URL(url).hostname)) throw new Error('no-cors'); } catch (e) { if (e.message === 'no-cors') throw e; }
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
      const rt = [...r.querySelectorAll('rt')].map(x => x.textContent.trim()).join('');
      r.querySelectorAll('rt, rp').forEach(x => x.remove());
      const base = r.textContent.replace(/\s+/g, '');
      r.replaceWith(base && rt && /[ぁ-ゖァ-ヺー]/.test(rt) && !/[｜《》]/.test(base + rt) ? `｜${base}《${rt}》` : base);
    });
    box.querySelectorAll('rt, rp').forEach(x => x.remove());
    return box;
  }
  const plain = s => String(s || '').replace(/｜([^｜《》\n]+)《[^《》\n]+》/g, '$1');

  function nhkHome(url) {
    return NHK_HOSTS.includes(url.hostname) && /^\/news\/easy\/?$/.test(url.pathname);
  }

  function articleDocument(html, url) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const alternate = doc.querySelector('link[rel~="alternate"][type="application/rss+xml"], link[rel~="alternate"][type="application/atom+xml"]');
    let feed = '';
    if (alternate) {
      try { feed = publicURL(new URL(alternate.getAttribute('href'), url).href)?.href || ''; } catch { }
    }
    const meta = doc.querySelector('meta[property="og:title"]');
    const structured = [];
    for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(node.textContent);
        for (const entry of [].concat(data)) {
          if (entry && Array.isArray(entry['@graph'])) structured.push(...entry['@graph']);
          else if (entry) structured.push(entry);
        }
      } catch { }
    }
    const article = structured.find(x => x && typeof x.articleBody === 'string' && hasJapanese(x.articleBody, 8));
    const h1 = doc.querySelector('article h1, main h1, h1');
    const rubyTitle = h1 && h1.querySelector('ruby') ? rubyMark(h1).textContent.replace(/\s+/g, ' ').trim() : '';
    const title = String(rubyTitle || (article && article.headline) || (meta && meta.content) || (h1 && h1.textContent) || doc.title || '').trim();
    if (article) return { title, text: tidy(article.articleBody), feed };
    let area = doc.querySelector('#js-article-body, #article-body, [itemprop="articleBody"], .article-body, .article_body') ||
      doc.querySelector('article') || (doc.querySelector('main h1') && doc.querySelector('main'));
    if (!area || (feed && (new URL(url).pathname === '/' || doc.querySelectorAll('main article').length > 1))) return { feed };
    area = rubyMark(area);
    area.querySelectorAll('script, style, nav, aside, footer, noscript, figure, [hidden], [aria-hidden="true"], [class*="author"], [class*="profile"], [class*="related"], [class*="share"], [class*="breadcrumb"]').forEach(x => x.remove());
    area.querySelectorAll('br').forEach(x => x.replaceWith('\n'));
    const blocks = [...area.querySelectorAll('p, h2, h3, blockquote, li')]
      .filter(x => !x.querySelector('p, blockquote, li') && plain(x.textContent).trim() !== plain(title) && hasJapanese(x.textContent, 1));
    return { title, text: tidy(blocks.map(x => x.textContent).join('\n') || area.textContent), feed };
  }

  async function reader(url, format) {
    const result = await request(READER + url, 'application/json', 11000, format ? { 'X-Respond-With': format } : {});
    const data = result.data;
    const content = data && (format === 'html' ? data.html || data.content : data.content);
    if (typeof content !== 'string') throw new Error('empty reader response');
    return content;
  }

  function firstFeedArticle(xml, source) {
    if (!/<(?:[\w-]+:)?(?:rss|feed|RDF)[\s>]/i.test(xml)) return null;
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    const entries = [...doc.getElementsByTagNameNS('*', 'item'), ...doc.getElementsByTagNameNS('*', 'entry')];
    for (const entry of entries) {
      const link = [...entry.children].find(x => x.localName === 'link' && (!x.hasAttribute('rel') || x.getAttribute('rel') === 'alternate'));
      if (!link) continue;
      try {
        const url = publicURL(new URL(link.getAttribute('href') || link.textContent.trim(), source).href);
        if (url) return url;
      } catch { }
    }
    return null;
  }

  async function article(value, followFeed = true) {
    const url = publicURL(value);
    if (!url) throw new Error('請輸入公開的文章網址');
    if (followFeed && nhkHome(url)) return latestNHK();
    const getContent = markup => {
      const link = followFeed && firstFeedArticle(markup, url.href);
      return link ? { link } : articleDocument(markup, url.href);
    };
    let found;
    try { found = getContent(await request(url.href, null, 4200)); } catch { }
    if (!found?.link && !found?.feed && !hasJapanese(found?.text, 8)) {
      try { found = getContent(await reader(url.href, 'html')); }
      catch { throw new Error('無法讀取這個網址，請確認文章公開且可在瀏覽器開啟'); }
    }
    if (!found?.text || !hasJapanese(found.text, 80)) {
      // Yahoo!ニュース「pickup」摘要頁：改讀「記事全文を読む」連結的原文
      if (/(^|\.)news\.yahoo\.co\.jp$/.test(url.hostname) && /^\/pickup\//.test(url.pathname) && followFeed !== 'pickup') {
        try {
          const doc = new DOMParser().parseFromString(await reader(url.href, 'html'), 'text/html');
          const a = [...doc.querySelectorAll('a[href*="/articles/"]')].map(x => x.getAttribute('href')).find(Boolean);
          if (a) return article(new URL(a, url.href).href, 'pickup');
        } catch { }
      }
    }
    if (found?.link) return article(found.link.href, false);
    if (followFeed && found?.feed && !hasJapanese(found.text, 8)) {
      let link;
      try { link = firstFeedArticle(await request(found.feed, null, 4200), found.feed); } catch { }
      if (!link) {
        try { link = firstFeedArticle(await reader(found.feed, 'html'), found.feed); } catch { }
      }
      if (link) return article(link.href, false);
    }
    if (!found || !hasJapanese(found.text, 8)) throw new Error('沒有找到日文正文，請貼上單篇文章的網址');
    return { title: String(found.title || '').trim().slice(0, 240), text: found.text.slice(0, MAX_TEXT).replace(/｜[^》\n]*$/, ''), url: url.href };
  }

  async function latestNHK() {
    const sitemap = NHK + 'sitemap/sitemap.xml';
    let text;
    try { text = await request(sitemap, null, 4200); }
    catch {
      try { text = await reader(sitemap); }
      catch { throw new Error('暫時無法取得 NHK 的新聞索引'); }
    }
    const links = text.match(/https:\/\/news\.web\.nhk\/news\/easy\/ne\d{10,}\/ne\d{10,}\.html/g);
    if (!links?.length) throw new Error('NHK 索引沒有可匯入的文章');
    const [latest] = [...new Set(links)].sort().reverse();
    const d = await article(latest, false);
    // NHK 改版後全文需登入 NHK ONE：只拿到摘要時視為失敗
    if (/受信契約|NHK ONE/.test(d.text) || d.text.length < 300) throw new Error('NHK 新聞目前需登入才能看全文');
    return d;
  }

  // 一鍵匯入簡單日文新聞：MATCHA 簡單日文（有完整振假名）→ 失敗再試 NHK
  const EASY_FEEDS = ['https://matcha-jp.com/easy/feed'];
  async function latestEasy() {
    for (const feed of EASY_FEEDS) { try { return await article(feed); } catch { } }
    return latestNHK();
  }

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
    return out.sort((a, b) => a.t - b.t).slice(0, 300);
  }

  const key = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\(.*?\)|（.*?）/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
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
    const lines = timed.length >= 4 ? timed : tidy(r.plainLyrics).split('\n').slice(0, 300).map(jp => ({ jp, zh: '', t: null }));
    return { title: `${r.trackName}（${r.artistName}）`, track: r.trackName, artist: r.artistName, lines, timed: timed.length >= 4, score, id: r.id, dur: r.duration ? Math.round(r.duration) : 0 };
  }

  // 近三天新聞：Yahoo!ニュース各分類 RSS（經代讀取得）＋ MATCHA 簡單日文（附振假名）
  const YN = 'https://news.yahoo.co.jp/rss/';
  const NEWS_CATS = [
    { id: 'domestic', name: '國內', icon: '🏠', url: YN + 'categories/domestic.xml' },
    { id: 'world', name: '國際', icon: '🌏', url: YN + 'categories/world.xml' },
    { id: 'business', name: '經濟', icon: '💴', url: YN + 'categories/business.xml' },
    { id: 'entertainment', name: '娛樂', icon: '🎬', url: YN + 'categories/entertainment.xml' },
    { id: 'sports', name: '運動', icon: '⚾', url: YN + 'categories/sports.xml' },
    { id: 'it', name: '科技', icon: '💻', url: YN + 'categories/it.xml' },
    { id: 'science', name: '科學', icon: '🔬', url: YN + 'categories/science.xml' },
    { id: 'life', name: '生活', icon: '🍙', url: YN + 'categories/life.xml' },
    { id: 'local', name: '地方', icon: '🗾', url: YN + 'categories/local.xml' },
    { id: 'easy', name: '簡單日文', icon: '🔰', url: 'https://matcha-jp.com/easy/feed', easy: true, note: 'MATCHA 簡單日文：附原文振假名・更新較慢、不限日期（來源偶爾會擋代讀，讀不到請稍後再試）' }
  ];
  // RSS 標題可能帶（或被轉義兩次的）<ruby>：還原成純文字，讀音存成「｜漢字《かな》」
  function cleanTitle(t) {
    t = String(t || '');
    for (let k = 0; k < 2 && !/</.test(t) && /&(?:lt|gt|amp|quot|#\d+);/.test(t); k++) t = new DOMParser().parseFromString('<!doctype html><body>' + t, 'text/html').body.textContent;
    if (/<\/?(?:ruby|rt|rb|rp)\b/i.test(t)) {
      const box = new DOMParser().parseFromString('<!doctype html><body><div>' + t + '</div>', 'text/html').body.firstElementChild;
      t = rubyMark(box).textContent;
    }
    return t.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  const NEWS_KEY = 'jpq.news2.';
  async function newsList(id, days) {
    const cat = NEWS_CATS.find(c => c.id === id) || NEWS_CATS[0];
    const ck = NEWS_KEY + cat.id;
    try { const c = JSON.parse(sessionStorage.getItem(ck) || 'null'); if (c && Date.now() - c.at < 20 * 60e3) return c.items; } catch { }
    let xml;
    try { xml = await request(cat.url, null, 4200); } catch { xml = await reader(cat.url, 'html'); }
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('新聞來源暫時無法讀取');
    const since = Date.now() - (days || 3) * 864e5;
    const pick = (el, n) => { const x = [...el.children].find(c => c.localName === n); return x ? x.textContent.trim() : ''; };
    let items = [...doc.getElementsByTagNameNS('*', 'item')].map(it => {
      const rt = cleanTitle(pick(it, 'title'));
      let title = plain(rt), src = '';
      const m = title.match(/^(.*?)\s*[（(]([^（）()]{1,20})[）)]$/); if (m) { title = m[1].trim(); src = m[2]; }
      const t = Date.parse(pick(it, 'pubDate') || pick(it, 'date')) || 0;
      return { title, rt: rt !== plain(rt) ? rt : '', link: pick(it, 'link'), t, src: src || (cat.easy ? 'MATCHA' : 'Yahoo!ニュース') };
    }).filter(x => x.title && publicURL(x.link));
    items = cat.easy ? items.slice(0, 15) : items.filter(x => !x.t || x.t >= since).slice(0, 30);
    try { sessionStorage.setItem(ck, JSON.stringify({ at: Date.now(), items })); } catch { }
    return items;
  }

  window.LinkImport = { NEWS_CATS, NEWS_KEY, newsList, cleanTitle, sameSong, baseTitle, coverParse, coverBy, coverTitle, lyricsRank, NHK, EASY_FEEDS, latestEasy, nhkHome, publicURL, article, latestNHK, audio, youtubeID, youtube, lyrics, lyricsById, parseLRC, songTitle };
})();
