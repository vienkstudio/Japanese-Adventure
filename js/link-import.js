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
  const NO_CORS = /(^|.)(?:news.web.nhk|nhk.or.jp|matcha-jp.com)$/;
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

  function songTitle(title, author) {
    let name = String(title || '').replace(/\s*[（(【\[]?(?:Official\s+(?:Music\s+)?Video|Music Video|Official Audio|公式MV)[）)】\]]?\s*$/i, '').trim();
    const quoted = name.match(/^(.*?)\s*[「『](.+?)[」』]$/);
    const separated = name.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    const pair = quoted || separated;
    if (pair) return { track: pair[2].trim(), artist: pair[1].trim() || author };
    return { track: name, artist: author };
  }

  async function youtube(id) {
    const address = 'https://www.youtube.com/watch?v=' + id;
    const endpoint = 'https://www.youtube.com/oembed?' + new URLSearchParams({ url: address, format: 'json' });
    const meta = await request(endpoint, 'application/json', 5000).catch(() => null);
    const title = meta && meta.title ? String(meta.title) : 'YouTube・' + id;
    const result = { title, lines: [] };
    if (!meta || /カラオケ|歌ってみた|カバー|\b(?:cover|karaoke|reaction|shorts)\b/i.test(title)) return result;
    const { track, artist } = songTitle(title, meta.author_name || '');
    const found = await lyrics(track, artist);
    if (found) Object.assign(result, found);
    return result;
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
    track = String(track || '').trim(); artist = String(artist || '').trim();
    if (!track) return null;
    const singer = key(artist).replace(/official(?:channel)?$/, '').replace(/topic$/, '').replace(/vevo$/, '');
    const queries = [{ track_name: track, ...(singer.length >= 2 && { artist_name: artist.replace(/\s*-\s*Topic$/i, '') }) }, { track_name: track }, { q: (track + ' ' + artist).trim() }];
    const seen = new Map();
    for (const q of queries) {
      const rows = await request(LYRICS + '?' + new URLSearchParams(q), 'application/json', 7000).catch(() => []);
      if (Array.isArray(rows)) rows.forEach(r => r && r.id != null && !seen.has(r.id) && seen.set(r.id, r));
    }
    const score = r => {
      if (!hasJapanese(r.syncedLyrics || r.plainLyrics, 8) || r.instrumental) return -1;
      const a = key(r.artistName), t = key(r.trackName), k = key(track);
      let s = t === k ? 6 : (t.includes(k) || k.includes(t)) && Math.min(t.length, k.length) >= 2 ? 3 : 0;
      if (!s) return -1;
      if (singer.length >= 2 && a.length >= 2 && (singer.includes(a) || a.includes(singer))) s += 5;
      else if (singer.length >= 2 && !key(track + artist).includes(a)) s -= 2;
      if (/\b(?:live|remix|acoustic|instrumental|ver\.?|version)\b|ライブ|弾き語り/i.test(r.trackName + ' ' + (r.albumName || '')) && !/live|ver/i.test(track)) s -= 3;
      if (r.syncedLyrics) s += 3;
      if (duration && r.duration && Math.abs(r.duration - duration) < 4) s += 2;
      return s;
    };
    const best = [...seen.values()].map(r => [score(r), r]).filter(x => x[0] >= 4).sort((a, b) => b[0] - a[0])[0];
    if (!best) return null;
    const r = best[1];
    const timed = r.syncedLyrics ? parseLRC(r.syncedLyrics) : [];
    const lines = timed.length >= 4 ? timed : tidy(r.plainLyrics).split('\n').slice(0, 300).map(jp => ({ jp, zh: '', t: null }));
    return { title: `${r.trackName}（${r.artistName}）`, artist: r.artistName, lines, timed: timed.length >= 4 };
  }

  window.LinkImport = { NHK, EASY_FEEDS, latestEasy, nhkHome, publicURL, article, latestNHK, audio, youtubeID, youtube, lyrics, parseLRC, songTitle };
})();
