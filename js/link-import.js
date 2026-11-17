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
    const title = String((article && article.headline) || (meta && meta.content) || doc.querySelector('h1')?.textContent || doc.title || '');
    if (article) return { title, text: tidy(article.articleBody), feed };
    const area = doc.querySelector('#js-article-body, #article-body, [itemprop="articleBody"], .article-body, .article_body') ||
      doc.querySelector('article') || (doc.querySelector('main h1') && doc.querySelector('main'));
    if (!area || (feed && (new URL(url).pathname === '/' || doc.querySelectorAll('main article').length > 1))) return { feed };
    area.querySelectorAll('script, style, nav, aside, footer, rt, rp, noscript, figure, [hidden], [aria-hidden="true"]').forEach(x => x.remove());
    area.querySelectorAll('br').forEach(x => x.replaceWith('\n'));
    const blocks = [...area.querySelectorAll('p, h2, h3, blockquote, li')]
      .filter(x => !x.querySelector('p, blockquote, li') && x.textContent.trim() !== title?.trim() && hasJapanese(x.textContent, 1));
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
    return { title: String(found.title || '').trim().slice(0, 80), text: found.text.slice(0, MAX_TEXT), url: url.href };
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
    return article(latest, false);
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
    if (!meta || /カラオケ|歌ってみた|カバー|\b(?:cover|karaoke|live|remix|reaction|shorts)\b/i.test(title)) return result;
    const { track, artist } = songTitle(title, meta.author_name || '');
    if (!track || !artist) return result;
    const key = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
    const singer = key(artist).replace(/official(?:channel)?$/, '').replace(/topic$/, '');
    if (singer.length < 2) return result;
    const query = new URLSearchParams({ track_name: track });
    const records = await request(LYRICS + '?' + query, 'application/json', 6000).catch(() => []);
    if (!Array.isArray(records)) return result;
    const match = records.find(r => {
      const a = key(r.artistName);
      return key(r.trackName) === key(track) && a.length >= 2 && (singer.includes(a) || a.includes(singer)) && hasJapanese(r.plainLyrics, 8);
    });
    if (match) result.lines = tidy(match.plainLyrics).split('\n').slice(0, 300).map(jp => ({ jp, zh: '', t: null }));
    return result;
  }

  window.LinkImport = { NHK, nhkHome, publicURL, article, latestNHK, audio, youtubeID, youtube };
})();
