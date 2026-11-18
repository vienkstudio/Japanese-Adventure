// N5–N1 挑戰（仿 JLPT 題型）：路由 challenge（等級選單）、challenge-play（作答）
// 題目從 data/mind/lex-n*.js、data/mind/grammar.js、data/reading/daily.js 自動產生；資料需要時才載入。
// 存檔：App.state.chal = { timed, best:{'N5:vocab':0..100}, pass:{N5:1} }；單字／文法掌握走 Learn.record（App.state.learn，舊 chal.m 由 learn.js 遷移）
// 星數走 App.reward('chal:N5:vocab', stars)，存在 App.state.cleared。
(function () {
  const esc = s => App.esc(String(s == null ? '' : s));
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const lvN = L => LVS.indexOf(L);
  const zhOK = L => lvN(L) <= 1;   // N5、N4 題幹可附中文；N3 以上作答前不給中文（解說才有）
  const LV_TIP = { N5: '基本單字・句型', N4: '日常簡單會話', N3: '日常與一般文章', N2: '工作、新聞程度', N1: '論說文、高階表達' };
  const TYPES = [
    { id: 'vocab', ic: '🔤', name: '單字', desc: '漢字讀音・表記・文脈規定・意思' },
    { id: 'grammar', ic: '🧩', name: '文法', desc: '文法形式判斷・句子重組 ★' },
    { id: 'reading', ic: '📄', name: '讀解', desc: '短文讀解・句意理解' },
    { id: 'listen', ic: '🎧', name: '聽解', desc: '聽單字・聽句子後選答案' },
    { id: 'mock', ic: '📝', name: '綜合模擬', desc: '30 題四大題・合格判定' }
  ];
  // 首頁「今日任務」用的綜合 10 題（不列在選單）
  const MIX = { id: 'mix', ic: '🎯', name: '綜合', desc: '單字・文法・讀解各幾題' };
  const typeOf = t => t === 'mix' ? MIX : TYPES.find(x => x.id === t);
  const SEC = { vocab: '文字・語彙', grammar: '文法', reading: '讀解', listen: '聽解' };
  const PASS = { N5: 44, N4: 50, N3: 53, N2: 50, N1: 55 };   // 合格線（總分 %，參考 JLPT 合格點／總分）；另每大題需 ≥ 1/3
  const PLAN = {
    vocab: [['kanji', 3], ['spell', 2], ['ctx', 3], ['mean', 2]],
    grammar: [['form', 6], ['order', 4]],
    reading: [['daily', 2], ['para', 3], ['sent', 5]],
    listen: [['lword', 4], ['ljp', 2], ['lsent', 3], ['lpara', 1]],
    mix: [['kanji', 2], ['mean', 2], ['form', 2], ['order', 1], ['sent', 2], ['para', 1]]
  };
  const MOCK = [
    ['vocab', [['kanji', 2], ['spell', 2], ['ctx', 2], ['mean', 2]]],
    ['grammar', [['form', 5], ['order', 3]]],
    ['reading', [['daily', 1], ['para', 2], ['sent', 4]]],
    ['listen', [['lword', 3], ['ljp', 1], ['lsent', 2], ['lpara', 1]]]
  ];
  const FALLBACK = { kanji: 'mean', spell: 'mean', ctx: 'mean', mean: 'lword', form: 'sent', order: 'form', daily: 'para', para: 'sent', sent: 'mean', lword: 'mean', ljp: 'lword', lsent: 'lword', lpara: 'lsent' };
  const SECS = { kanji: 20, spell: 20, ctx: 30, mean: 20, form: 35, order: 50, daily: 120, para: 60, sent: 40, lword: 25, ljp: 25, lsent: 40, lpara: 60 };
  const LABEL = { kanji: '漢字讀音', spell: '表記', ctx: '文脈規定', mean: '語意', form: '文法形式判斷', order: '句子重組', daily: '短文讀解', para: '短文讀解', sent: '句意理解', lword: '聽解・單字', ljp: '聽解・單字', lsent: '聽解・句子', lpara: '聽解・短文' };

  /* ---------------- 存檔 ---------------- */
  function rec() {
    const S = App.state;
    const c = S.chal && typeof S.chal === 'object' ? S.chal : (S.chal = {});
    if (!c.best || typeof c.best !== 'object') c.best = {};
    if (!c.pass || typeof c.pass !== 'object') c.pass = {};
    return c;
  }
  // 已掌握：統一進度 App.state.learn（Learn）中，該級單字／文法狀態 ≥ review 的數量（與知識庫、複習同一份）
  function masteredCount(L) { const a = Learn.stats({ lv: L, type: 'v' }), b = Learn.stats({ lv: L, type: 'g' }); return a.known + b.known; }
  // 作答記進 Learn：第一次就答對＝本來就會（3 簡單）；之後答對 2；答錯 0
  function recordAns(q, L, ok) {
    if (!q.item) return;
    const id = Learn.idOf(q.item.id); if (!id) return;
    Learn.record(id, ok ? (Learn.status(id) === 'new' ? 3 : 2) : 0, { src: 'chal', lv: L, item: Object.assign({}, q.item, { lv: L }), nosave: true });
  }
  const starsOf = (L, t) => (App.state.cleared || {})['chal:' + L + ':' + t] || 0;
  const lvKey = () => { const p = App.profile().lv; return p && p !== 'zero' ? p.toUpperCase() : 'N5'; };

  /* ---------------- 資料載入 ---------------- */
  function need(L) {
    const src = ['data/mind/grammar.js'];
    if (L) src.push('data/mind/lex-' + L.toLowerCase() + '.js', 'data/reading/daily.js');
    return src.reduce((p, s) => p.then(() => App.loadScript(s)), Promise.resolve());
  }

  /* ---------------- 工具 ---------------- */
  const KJ = /[㐀-鿿々〆ヶ]/;
  const KANA = /^[぀-ヿー]+$/;
  const HIRA = /^[぀-ゟ]+$/;
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clean = s => String(s || '').replace(/\s*[（(][^）)]*[)）]\s*/g, '').replace(/[〜～]/g, '').trim();
  const segs = z => String(z || '').replace(/（[^）]*）|\([^)]*\)/g, '').split(/[；;，,、／/・。]/).map(s => s.trim()).filter(Boolean);
  // 兩個中文意思是否「同義／重疊」：任一義項相同或互相包含（2 字以上）
  function zhClash(a, b) {
    const A = segs(a), B = segs(b);
    return A.some(x => B.some(y => x === y || (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x)))));
  }
  // 從 pool 依序挑 n 個符合 ok(c, chosen) 的；pool 可以是多層（先挑前面的）
  function pick(pools, n, ok) {
    const out = [];
    for (const pool of pools) {
      for (const c of shuf(pool)) { if (out.length >= n) return out; if (ok(c, out)) out.push(c); }
    }
    return out;
  }
  function unusedOf(list, used, key) { const c = list.filter(x => !used.has(key(x))); return c.length ? c[Math.floor(Math.random() * c.length)] : null; }

  /* ---------------- 題庫（每級建一次） ---------------- */
  const BANK = {};
  function stripPat(pat) {
    if (/[〜～]/.test(String(pat || '').replace(/^\s*[〜～]/, ''))) return null;   // 成對句型（〜なり〜なり、〜から〜まで…）去掉〜會變成錯字串
    const p = String(pat || '').replace(/[〜～]/g, '').replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    if (!p || /[＋+／/…・A-Za-z\s]/.test(p)) return null;
    return p;
  }
  function bank(L) {
    if (BANK[L]) return BANK[L];
    const M = window.MIND || { lex: {}, gram: [] };
    const raw = (M.lex && M.lex[L]) || [];
    const words = [];
    raw.forEach((r, i) => {
      const jp = clean(String(r[0] || '').split(/;\s*/)[0]);
      const alts = String(r[1] || r[0] || '').split(/;\s*/).map(clean).filter(Boolean);
      const kana = alts[0] || jp;
      if (!jp || !r[2]) return;
      words.push({ i, jp, kana, alts, zh: String(r[2]), pos: r[3] || '', kj: KJ.test(jp) && KANA.test(kana) && kana !== jp, kn: KANA.test(kana) });
    });
    const readings = {};   // 同一個寫法的所有讀音（避免把另一個正確讀音當干擾）
    words.forEach(w => { (readings[w.jp] = readings[w.jp] || new Set()); w.alts.forEach(k => readings[w.jp].add(k)); });
    const grams = (M.gram || []).filter(g => g.lv === L).map((g, i) => ({ g, i, p: stripPat(g.pat), ex: Array.isArray(g.ex) ? g.ex : [] }));
    const gform = grams.filter(x => {
      if (!x.p || !x.ex[0] || !x.ex[1]) return false;
      const s = x.ex[0], k = s.indexOf(x.p);
      if (k < 0) return false;
      if (x.p.length === 1 && s.indexOf(x.p, k + 1) >= 0) return false;   // 單一假名出現兩次以上，挖空位置不明確
      return true;
    });
    const sents = grams.filter(x => x.ex[0] && x.ex[1]);
    const gorder = grams.map(orderOf).filter(Boolean);
    const R = window.READING, lo = L.toLowerCase();
    const arts = R && Array.isArray(R.daily) ? R.daily.filter(a => a.lv === lo) : [];
    const paraOf = a => (a.p || []).map((x, k) => ({ id: a.id + ':' + k, jp: x[0], zh: x[1], a }));
    const paras = [].concat(...arts.map(paraOf));
    const allParas = R && Array.isArray(R.daily) ? [].concat(...R.daily.map(paraOf)) : paras;
    const B = BANK[L] = {
      L, words, readings, grams, gform, sents, gorder, arts, paras, allParas,
      dailyQ: arts.filter(a => Array.isArray(a.q) && a.q.length >= 3),
      ctx: null
    };
    return B;
  }
  // 文脈規定：找出例句中「原形」出現的本級單字（例句來源：全部文法例句＋每日短文）
  function ctxOf(B) {
    if (B.ctx) return B.ctx;
    const M = window.MIND || { gram: [] };
    const pool = [];
    // 例句只取本級以下的文法與短文，避免 N5 題目出現 N2 句型
    (M.gram || []).forEach(g => { if (g.ex && g.ex[0] && g.ex[1] && lvN(g.lv) >= 0 && lvN(g.lv) <= lvN(B.L)) pool.push([g.ex[0], g.ex[1]]); });
    B.allParas.forEach(p => { if (lvN(String(p.a.lv || '').toUpperCase()) <= lvN(B.L)) pool.push([p.jp, p.zh]); });
    const out = [];
    B.words.forEach(w => {
      const s = w.jp;
      if (s.length < 2 || (HIRA.test(s) && s.length < 3)) return;
      let n = 0;
      for (const [jp, zh] of pool) {
        const k = jp.indexOf(s);
        if (k < 0) continue;
        const a = jp[k - 1] || '', b = jp[k + s.length] || '';
        if (KJ.test(s[0]) && KJ.test(a)) continue;   // 是更長的漢字詞的一部分
        if (KJ.test(s[s.length - 1]) && KJ.test(b)) continue;
        if (HIRA.test(s[0]) && HIRA.test(a)) continue;
        if (/^[゠-ヿー]/.test(s) && /[゠-ヿー]/.test(a)) continue;
        if (/[゠-ヿー]$/.test(s) && /[゠-ヿー]/.test(b)) continue;
        out.push({ w, jp, zh, k });
        if (++n >= 2) break;
      }
    });
    return (B.ctx = out);
  }
  // 句子重組：依助詞切成小段，取連續 4 段打亂，問 ★ 位置
  function chunks(s) {
    const out = []; let cur = '';
    const isK = c => KJ.test(c) || /[゠-ヿ0-9０-９A-Za-z「]/.test(c);
    for (let i = 0; i < s.length; i++) {
      const c = s[i], nx = s[i + 1];
      cur += c;
      if (nx == null) break;
      let cut = false;
      if (c === '、' || c === 'を') cut = true;
      else if ('はがにでともへ'.includes(c) && isK(nx) && cur.length >= 2) cut = true;
      else if (/(から|まで|より|ので|のに|けど|ても|たら|れば)$/.test(cur) && cur.length > 2 && nx !== '。') cut = true;
      if (cut) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out;
  }
  function orderOf(x) {
    const s0 = x.ex[0], zh = x.ex[1];
    if (!s0 || !zh) return null;
    const m = s0.match(/^(.*?)([。！？!?]*)$/);
    const body = m[1], end = m[2];
    if (/[「」『』]/.test(body)) return null;
    let cs = chunks(body);
    // 不足 4 段時，在文法句型開頭再切一刀
    if (cs.length < 4 && x.p && x.p.length >= 2) {
      const k = body.indexOf(x.p);
      if (k > 0) {
        let pos = 0; const n = [];
        cs.forEach(c => { if (k > pos && k < pos + c.length) n.push(c.slice(0, k - pos), c.slice(k - pos)); else n.push(c); pos += c.length; });
        cs = n;
      }
    }
    cs = cs.filter(Boolean);
    if (cs.length < 4 || cs.some(c => c.length > 14)) return null;
    // 找含句型的段，取包含它的 4 段視窗；避免 4 段中有重複或「同助詞結尾」（順序可能可以互換）
    const pAt = x.p ? body.indexOf(x.p) : -1;
    let pk = -1;
    if (pAt >= 0) { let pos = 0; cs.forEach((c, i) => { if (pk < 0 && pAt < pos + c.length) pk = i; pos += c.length; }); }
    const wins = [];
    for (let a = 0; a + 4 <= cs.length; a++) wins.push(a);
    const ok = a => {
      const w = cs.slice(a, a + 4);
      if (new Set(w).size < 4) return false;
      const tails = w.slice(0, 3).map(c => c.slice(-1)).filter(t => 'はがにでともへを'.includes(t));
      return new Set(tails).size === tails.length;
    };
    const good = wins.filter(ok);
    if (!good.length) return null;
    const pref = pk >= 0 ? good.filter(a => pk >= a && pk < a + 4) : [];
    const a = (pref.length ? pref : good)[0];
    return { x, pre: cs.slice(0, a).join(''), parts: cs.slice(a, a + 4), post: cs.slice(a + 4).join('') + end, zh };
  }

  /* ---------------- 讀音干擾：長音／促音／濁音／拗音 變化 ---------------- */
  const DK = 'かがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどはばひびふぶへべほぼ';
  const HD = 'はぱひぴふぷへぺほぽ';
  const O_ROW = 'おこごそぞとどのほぼぽもよろょ', E_ROW = 'えけげせぜてでねへべぺめれ';
  function mutate(k) {
    const out = new Set(), a = [...k];
    a.forEach((c, i) => {
      const d = DK.indexOf(c);
      if (d >= 0) { const r = a.slice(); r[i] = DK[d % 2 ? d - 1 : d + 1]; out.add(r.join('')); }
      const h = HD.indexOf(c);
      if (h >= 0) { const r = a.slice(); r[i] = HD[h % 2 ? h - 1 : h + 1]; out.add(r.join('')); }
      if (c === 'う' && i > 0 && O_ROW.includes(a[i - 1])) out.add(a.slice(0, i).concat(a.slice(i + 1)).join(''));
      if (c === 'い' && i > 0 && E_ROW.includes(a[i - 1])) out.add(a.slice(0, i).concat(a.slice(i + 1)).join(''));
      if (O_ROW.includes(c) && a[i + 1] !== 'う' && i < a.length - 1) out.add(a.slice(0, i + 1).concat(['う'], a.slice(i + 1)).join(''));
      if (c === 'っ') out.add(a.slice(0, i).concat(a.slice(i + 1)).join(''));
      if (i > 0 && i < a.length - 1 && /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/.test(c) && a[i - 1] !== 'っ' && !/[っゃゅょ]/.test(a[i - 1])) out.add(a.slice(0, i).concat(['っ'], a.slice(i)).join(''));
      if (c === 'ゅ' || c === 'ょ') { const r = a.slice(); r[i] = c === 'ゅ' ? 'ょ' : 'ゅ'; out.add(r.join('')); }
    });
    out.delete(k);
    return [...out].filter(x => x.length >= 2 && !/^[っゃゅょー]/.test(x) && !/っ$/.test(x));
  }

  /* ---------------- 題目產生器 ---------------- */
  // 題目：{k, label, ask, body, opts, ans, explain, item, mk:[kind,i], say, col, key}
  const wordItem = (w, L) => ({ id: 'word:' + w.jp, jp: w.jp, kana: w.kana !== w.jp ? w.kana : '', romaji: '', zh: w.zh, hint: '', source: '🏆 挑戰 ' + L });
  const gramItem = x => ({ id: x.g.id, jp: x.g.pat, kana: '', romaji: '', zh: x.g.zh, hint: (x.ex[0] ? '例：' + x.ex[0] + '（' + (x.ex[1] || '') + '）' : '') + (x.g.conn ? '｜接續：' + x.g.conn : ''), source: '📐 文法' });
  const sentItem = (jp, zh, L) => ({ id: 'phrase:' + jp, jp, kana: '', romaji: '', zh, hint: '', source: '🏆 挑戰 ' + L });
  const wordExplain = w => `<b class="jp">${esc(w.jp)}</b>${w.kana !== w.jp ? `（<span class="jp">${esc(w.kana)}</span>）` : ''}＝${esc(w.zh)}`;
  const gramExplain = x => `<b class="jp">${esc(x.g.pat)}</b>＝${esc(x.g.zh)}${x.g.conn ? `<br><span class="muted">接續：${esc(x.g.conn)}</span>` : ''}${x.ex[0] ? `<br><span class="jp">${esc(x.ex[0])}</span><br><span class="muted">${esc(x.ex[1] || '')}</span>` : ''}${x.g.note ? `<br><span class="muted">💡 ${esc(x.g.note)}</span>` : ''}`;
  function build(q, ans, dis) {
    if (dis.length < 2) return null;
    const opts = shuf([ans].concat(dis.slice(0, 3)));
    return Object.assign(q, { opts, ans: opts.indexOf(ans) });
  }
  const FUNC = ['conj', 'adv', 'int', 'exp', 'part'];
  const posPools = (w, cand) => FUNC.includes(w.pos) ? [cand.filter(x => !FUNC.includes(x.pos))] : [cand.filter(x => x.pos === w.pos), cand];
  const overlap = (a, b) => a.includes(b) || b.includes(a);   // 紙／手紙 這種互相包含的寫法不能同時當選項
  const sameWordOK = (B, w) => x => x.jp !== w.jp && !w.alts.includes(x.kana) && !x.alts.includes(w.kana) && !zhClash(x.zh, w.zh);

  const GEN = {
    // 漢字讀音：畫線的字怎麼念
    kanji(B, used) {
      const w = unusedOf(B.words.filter(w => w.kj), used, w => 'w' + w.i); if (!w) return null;
      const bad = B.readings[w.jp] || new Set(w.alts);
      const fake = mutate(w.kana).filter(k => !bad.has(k));
      const real = B.words.filter(x => x.kj && x.pos === w.pos && !bad.has(x.kana) && Math.abs(x.kana.length - w.kana.length) <= 1).map(x => x.kana);
      const dis = [];
      const add = k => { if (dis.length < 3 && !dis.includes(k) && k !== w.kana && !bad.has(k)) dis.push(k); };
      shuf(fake).slice(0, 2).forEach(add);
      shuf(real).forEach(add);
      shuf(fake).forEach(add);
      return build({ k: 'kanji', key: 'w' + w.i, ask: '畫線的字怎麼念？', body: `<div class="ch-big jp"><u>${esc(w.jp)}</u></div>`, explain: wordExplain(w), item: wordItem(w, B.L), mk: ['w', w.i] }, w.kana, dis);
    },
    // 表記：假名寫成漢字
    spell(B, used) {
      const w = unusedOf(B.words.filter(w => w.kj), used, w => 'w' + w.i); if (!w) return null;
      const ok = sameWordOK(B, w);
      const cand = B.words.filter(x => x.kj && ok(x));
      const share = cand.filter(x => x.pos === w.pos && [...x.jp].some(c => KJ.test(c) && w.jp.includes(c)));
      const same = cand.filter(x => x.pos === w.pos && x.jp.length === w.jp.length);
      const dis = pick([share, same, cand], 3, (c, o) => !overlap(c.jp, w.jp) && !o.some(y => overlap(y.jp, c.jp))).map(x => x.jp);
      return build({ k: 'spell', key: 'w' + w.i, ask: '寫成漢字是哪一個？', body: `<div class="ch-big jp">${esc(w.kana)}</div>`, explain: wordExplain(w), item: wordItem(w, B.L), mk: ['w', w.i] }, w.jp, dis);
    },
    // 文脈規定：（　　）裡放哪個字
    ctx(B, used) {
      const c = unusedOf(ctxOf(B), used, c => 'w' + c.w.i); if (!c) return null;
      const w = c.w, ok = sameWordOK(B, w);
      const cand = B.words.filter(x => ok(x) && !c.jp.includes(x.jp));
      const near = cand.filter(x => x.pos === w.pos && Math.abs(x.jp.length - w.jp.length) <= 1 && KJ.test(x.jp) === KJ.test(w.jp));
      const dis = pick([near, cand.filter(x => x.pos === w.pos)], 3, (x, o) => !overlap(x.jp, w.jp) && !o.some(y => overlap(y.jp, x.jp) || zhClash(y.zh, x.zh))).map(x => x.jp);
      const s = esc(c.jp.slice(0, c.k)) + '<span class="ch-blank">（　　）</span>' + esc(c.jp.slice(c.k + w.jp.length));
      return build({ k: 'ctx', key: 'w' + w.i, ask: '（　　）裡放哪個字最適合？', body: `<div class="ch-sent jp">${s}</div>` + (zhOK(B.L) ? `<p class="muted center">${esc(c.zh)}</p>` : ''), explain: wordExplain(w) + `<br><span class="jp">${esc(c.jp)}</span><br><span class="muted">${esc(c.zh)}</span>`, item: wordItem(w, B.L), mk: ['w', w.i] }, w.jp, dis);
    },
    // 語意：單字的中文意思
    mean(B, used) {
      const w = unusedOf(B.words, used, w => 'w' + w.i); if (!w) return null;
      const ok = sameWordOK(B, w);
      const cand = B.words.filter(ok);
      const dis = pick(posPools(w, cand), 3, (x, o) => !o.some(y => zhClash(y.zh, x.zh))).map(x => x.zh);
      return build({ k: 'mean', key: 'w' + w.i, ask: '意思是哪一個？', body: `<div class="ch-big jp">${esc(w.jp)}</div>${w.kana !== w.jp ? `<p class="muted center jp">${esc(w.kana)}</p>` : ''}`, explain: wordExplain(w), item: wordItem(w, B.L), mk: ['w', w.i] }, w.zh, dis);
    },
    // 文法形式判斷：（　　）裡放哪個句型
    form(B, used) {
      const x = unusedOf(B.gform, used, x => 'g' + x.i); if (!x) return null;
      const g = x.g, head = c => String(c || '').split(/[＋+／]/)[0].slice(0, 2);
      const okD = y => y.p && y.i !== x.i && y.p !== x.p && !y.p.includes(x.p) && !x.p.includes(y.p) && y.g.zh !== g.zh
        && !(g.rel || []).includes(y.g.id) && !(g.pre || []).includes(y.g.id) && !(y.g.rel || []).includes(g.id) && !zhClash(y.g.zh, g.zh)
        && x.ex[0].replace(x.p, y.p) !== x.ex[0];
      const cand = B.grams.filter(okD);
      const p1 = cand.filter(y => y.g.cat !== g.cat && head(y.g.conn) === head(g.conn));
      const p2 = cand.filter(y => y.g.cat !== g.cat);
      const dis = pick([p1, p2, cand], 3, (y, o) => !o.some(z => z.p === y.p || z.p.includes(y.p) || y.p.includes(z.p))).map(y => y.p);
      const s = x.ex[0], k = s.indexOf(x.p);
      const body = `<div class="ch-sent jp">${esc(s.slice(0, k))}<span class="ch-blank">（　　）</span>${esc(s.slice(k + x.p.length))}</div>` + (zhOK(B.L) ? `<p class="muted center">${esc(x.ex[1])}</p>` : '');
      return build({ k: 'form', key: 'g' + x.i, ask: '（　　）裡放什麼最適合？', body, explain: gramExplain(x), item: gramItem(x), mk: ['g', x.i] }, x.p, dis);
    },
    // 句子重組：★ 放哪一段
    order(B, used) {
      const o = unusedOf(B.gorder, used, o => 'g' + o.x.i); if (!o) return null;
      // ★ 放在不能自由移動的段（不以 は/が/に/で/と/も/、 結尾的段，通常是述語），降低「換順序也通」的機會
      const fixed = [1, 2, 3].filter(i => !/[はがにでとも、]$/.test(o.parts[i]));
      const star = fixed.length ? fixed[Math.floor(Math.random() * fixed.length)] : 3;
      const slots = [0, 1, 2, 3].map(i => `<span class="ch-slot${i === star ? ' star' : ''}">${i === star ? '★' : ''}</span>`).join('');
      const ans = o.parts[star];
      const opts = shuf(o.parts);
      const body = `<div class="ch-sent jp ch-order">${esc(o.pre)}${slots}${esc(o.post)}</div>` + (zhOK(B.L) ? `<p class="muted center">${esc(o.zh)}</p>` : '');
      const full = esc(o.pre) + o.parts.map((p, i) => i === star ? `<b class="ch-ans">${esc(p)}</b>` : esc(p)).join('') + esc(o.post);
      return { k: 'order', key: 'g' + o.x.i, ask: '把四段排成正確的句子，★ 放哪一段？', body, opts, ans: opts.indexOf(ans), explain: `<span class="jp">${full}</span><br>` + gramExplain(o.x), item: gramItem(o.x), mk: ['g', o.x.i] };
    },
    // 短文讀解：每日短文＋題目
    daily(B, used) {
      const a = unusedOf(B.dailyQ, used, a => 'a' + a.id); if (!a) return null;
      const body = `<div class="ch-passage jp">${a.p.map(x => `<p>${esc(x[0])}</p>`).join('')}</div><p class="ch-qq">${esc(a.q[0])}</p>`;
      const opts = shuf(a.q.slice(1, 4)), ans = a.q[1];
      return { k: 'daily', key: 'a' + a.id, ask: '讀完短文，回答問題。', body, opts, ans: opts.indexOf(ans), col: true, explain: `<b>${esc(ans)}</b><br>` + a.p.map(x => `<span class="muted">${esc(x[1])}</span>`).join('<br>'), item: null };
    },
    // 短文讀解：段落意思
    para(B, used) {
      const p = unusedOf(B.paras, used, p => 'p' + p.id); if (!p) return null;
      const others = B.allParas.filter(y => y.zh !== p.zh && y.jp !== p.jp);
      const dis = pick([others.filter(y => y.a.lv === p.a.lv && y.a.id !== p.a.id), others], 3, (y, o) => !o.some(z => z.zh === y.zh)).map(y => y.zh);
      return build({ k: 'para', key: 'p' + p.id, ask: '這段文章的意思是？', body: `<div class="ch-passage jp"><p>${esc(p.jp)}</p></div>`, col: true, explain: `<span class="jp">${esc(p.jp)}</span><br><b>${esc(p.zh)}</b>`, item: p.jp.length <= 40 ? sentItem(p.jp, p.zh, B.L) : null }, p.zh, dis);
    },
    // 句意理解：例句意思
    sent(B, used) {
      const x = unusedOf(B.sents, used, x => 'g' + x.i); if (!x) return null;
      const dis = pick([B.sents.filter(y => y.i !== x.i && y.ex[1] !== x.ex[1] && y.ex[0] !== x.ex[0])], 3, (y, o) => !o.some(z => z.ex[1] === y.ex[1])).map(y => y.ex[1]);
      return build({ k: 'sent', key: 'g' + x.i, ask: '這句話的意思是？', body: `<div class="ch-sent jp">${esc(x.ex[0])}</div>`, col: true, explain: `<span class="jp">${esc(x.ex[0])}</span><br><b>${esc(x.ex[1])}</b><br>` + gramExplain(x), item: gramItem(x), mk: ['g', x.i] }, x.ex[1], dis);
    },
    // 聽解：聽單字選意思
    lword(B, used) {
      const w = unusedOf(B.words.filter(w => w.kn), used, w => 'w' + w.i); if (!w) return null;
      const bad = B.readings[w.jp] || new Set(w.alts);
      const homoZh = B.words.filter(y => y.alts.includes(w.kana)).map(y => y.zh);   // 同音字的意思都不能當干擾
      const ok = sameWordOK(B, w);
      const cand = B.words.filter(x => ok(x) && !bad.has(x.kana) && !homoZh.some(z => zhClash(z, x.zh)));
      const dis = pick(posPools(w, cand), 3, (x, o) => !o.some(y => zhClash(y.zh, x.zh))).map(x => x.zh);
      return build({ k: 'lword', key: 'w' + w.i, ask: '聽到的單字是什麼意思？', say: w.kana, body: '', explain: wordExplain(w), item: wordItem(w, B.L), mk: ['w', w.i] }, w.zh, dis);
    },
    // 聽解：聽單字選寫法
    ljp(B, used) {
      const w = unusedOf(B.words.filter(w => w.kn && w.kj), used, w => 'w' + w.i); if (!w) return null;
      const homo = new Set(B.words.filter(y => y.alts.includes(w.kana)).map(y => y.jp));   // 同音字都不能當干擾
      const cand = B.words.filter(x => x.kj && !homo.has(x.jp) && !x.alts.includes(w.kana) && sameWordOK(B, w)(x));
      const dis = pick([cand.filter(x => x.pos === w.pos && x.jp.length === w.jp.length), cand.filter(x => x.pos === w.pos), cand], 3, (x, o) => !overlap(x.jp, w.jp) && !o.some(y => overlap(y.jp, x.jp))).map(x => x.jp);
      return build({ k: 'ljp', key: 'w' + w.i, ask: '聽到的是哪一個字？', say: w.kana, body: '', explain: wordExplain(w), item: wordItem(w, B.L), mk: ['w', w.i] }, w.jp, dis);
    },
    // 聽解：聽句子選意思
    lsent(B, used) {
      const q = GEN.sent(B, used); if (!q) return null;
      return Object.assign(q, { k: 'lsent', ask: '聽到的句子是什麼意思？', say: B.sents.find(x => 'g' + x.i === q.key).ex[0], body: '' });
    },
    // 聽解：聽短文段落
    lpara(B, used) {
      const short = B.paras.filter(p => p.jp.length <= 70);
      const p = unusedOf(short, used, p => 'p' + p.id); if (!p) return null;
      const q = GEN.para(Object.assign({}, B, { paras: [p] }), used); if (!q) return null;
      return Object.assign(q, { k: 'lpara', ask: '聽完這段話，意思是？', say: p.jp, body: '' });
    }
  };
  /* ---------------- 題目自動檢查：選項唯一、不重疊、無疊字錯誤、N3 以上題幹無中文 ---------------- */
  const JPK = ['kanji', 'spell', 'ctx', 'form', 'ljp', 'order'], ZHK = ['mean', 'lword'];
  function problems(q, L) {
    const e = [], o = (q && q.opts) || [];
    if (!q) return ['null'];
    if (o.length < 3) e.push('選項不足');
    if (!(q.ans >= 0 && q.ans < o.length)) e.push('正解索引錯');
    if (o.some(x => !String(x).trim())) e.push('空選項');
    if (new Set(o.map(x => String(x).trim())).size !== o.length) e.push('選項重複');
    if (JPK.includes(q.k)) o.forEach((a, i) => o.forEach((b, j) => { if (i !== j && a.length && b.includes(a) && q.k !== 'order' && q.k !== 'kanji') e.push('選項包含：' + a + '⊂' + b); }));
    if (ZHK.includes(q.k)) o.forEach((a, i) => o.forEach((b, j) => { if (i < j && zhClash(a, b)) e.push('中文同義：' + a + '≈' + b); }));
    if (q.k === 'form') o.forEach(a => { if (/[〜～＋+／]/.test(a) || /^(.{2,})\1$/.test(a)) e.push('疊字或殘留符號：' + a); });
    if (!zhOK(L) && /<p class="muted center">/.test(q.body || '')) e.push('N3+ 題幹附中文');
    return [...new Set(e)];
  }
  function gen(k, B, used) {
    let q = null, kk = k, n = 0, tries = 0;
    while (!q && kk && n++ < 6) {
      try { q = GEN[kk](B, used); } catch (e) { console.warn('challenge gen', kk, e); q = null; }
      if (q && problems(q, B.L).length) { used.add(q.key); q = null; if (++tries < 4) { n--; continue; } }
      if (!q) kk = FALLBACK[kk];
    }
    if (q) { used.add(q.key); q.label = LABEL[q.k]; }
    return q;
  }
  function makeRound(L, t) {
    const B = bank(L), used = new Set(), qs = [];
    if (t === 'mock') {
      MOCK.forEach(([sec, plan]) => {
        const part = [];
        plan.forEach(([k, n]) => { for (let i = 0; i < n; i++) { const q = gen(k, B, used); if (q) { q.sec = sec; part.push(q); } } });
        qs.push(...shuf(part));
      });
    } else {
      (PLAN[t] || PLAN.vocab).forEach(([k, n]) => { for (let i = 0; i < n; i++) { const q = gen(k, B, used); if (q) { q.sec = t; qs.push(q); } } });
      return shuf(qs);
    }
    return qs;
  }

  /* ---------------- 等級選單 ---------------- */
  let selLv = null;
  function renderMenu(el) {
    el.innerHTML = '<p class="center muted" style="margin:48px 0">載入中…</p>';
    need(null).then(() => { if (el.isConnected) drawMenu(el); }).catch(() => { el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  function drawMenu(el) {
    const L = selLv || (selLv = lvKey());
    const c = rec(), st = (window.MIND && MIND.STATS) || { lex: {}, gram: {} };
    const sumStars = l => TYPES.reduce((s, t) => s + starsOf(l, t.id), 0);
    const tot = (st.lex[L] || 0) + (st.gram[L] || 0), got = masteredCount(L);
    const pct = tot ? Math.min(100, Math.round(got / tot * 100)) : 0;
    const passed = c.pass[L], mockBest = c.best[L + ':mock'];
    el.innerHTML = `<section class="ch">
      <h1 class="ch-h">🏆 N5–N1 挑戰<small>仿 JLPT 題型・10 題一輪・答對 70% 以上得星</small></h1>
      <div class="tabs ch-tabs" role="group" aria-label="選擇等級">${LVS.map(l => `<button type="button" data-lv="${l}" class="${l === L ? 'on' : ''}" aria-pressed="${l === L}">${l}<small>${sumStars(l) ? ` ⭐${sumStars(l)}` : ''}${c.pass[l] ? ' 🎓' : ''}</small></button>`).join('')}</div>
      <div class="panel ch-lv">
        <div class="ch-lvh"><span class="ch-badge" style="background:var(--${L.toLowerCase()})">${L}</span><b>${esc(LV_TIP[L])}</b></div>
        <div class="ch-row"><span>已掌握</span><b>${pct}%</b><small class="muted">${got}／${tot} 個單字與文法</small></div>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
        <div class="ch-row"><span>星數</span><b>⭐ ${sumStars(L)}／${TYPES.length * 3}</b><small class="muted">模擬考：${passed ? '🎓 合格' : mockBest != null ? `最佳 ${mockBest}%・未合格` : '尚未挑戰'}</small></div>
      </div>
      <div class="ch-list">${TYPES.map(t => {
        const s = starsOf(L, t.id), b = c.best[L + ':' + t.id];
        return `<button type="button" class="ch-item${t.id === 'mock' ? ' mock' : ''}" data-t="${t.id}">
          <span class="ic" aria-hidden="true">${t.ic}</span>
          <span class="tx"><b>${esc(t.name)}${t.id === 'mock' ? `<small> 合格線 ${PASS[L]}%</small>` : ''}</b><small>${esc(t.desc)}</small></span>
          <span class="rt"><span class="st" aria-label="${s} 星">${[0, 1, 2].map(i => i < s ? '⭐' : '☆').join('')}</span><small>${b != null ? `最佳 ${b}%` : '未挑戰'}</small></span>
        </button>`;
      }).join('')}</div>
      <div class="ch-opt"><button type="button" class="btn sm" id="ch-timer" aria-pressed="${!!c.timed}">⏱ 限時作答：${c.timed ? '開' : '關'}</button><small class="muted">開啟後每題有作答時間，時間到算答錯</small></div>
    </section>`;
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { selLv = b.dataset.lv; drawMenu(el); });
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => App.go('challenge-play', { lv: L, t: b.dataset.t }));
    el.querySelector('#ch-timer').onclick = () => { c.timed = !c.timed; App.save(); drawMenu(el); };
  }

  /* ---------------- 作答 ---------------- */
  let TIMER = null;
  const stopTimer = () => { if (TIMER) { clearInterval(TIMER); TIMER = null; } };
  function renderPlay(el, params) {
    stopTimer();
    const L = LVS.includes(params && params.lv) ? params.lv : lvKey();
    const t = typeOf(params && params.t) ? params.t : 'vocab';
    el.innerHTML = '<p class="center muted" style="margin:48px 0">出題中…</p>';
    need(L).then(() => {
      if (!el.isConnected) return;
      const qs = makeRound(L, t);
      if (!qs.length) { el.innerHTML = '<div class="panel center"><p>😵 這個等級暫時出不了題</p></div>'; return; }
      play(el, { L, t, qs, i: 0, ok: 0, wrong: [], sec: {}, timed: !!rec().timed });
    }).catch(() => { el.innerHTML = '<p class="center" style="margin:48px 0">😵 載入失敗，請檢查網路後再試一次</p>'; });
  }
  function voiceState() { try { return App.voiceOK ? App.voiceOK() : null; } catch (e) { return null; } }
  function play(el, G) {
    stopTimer();
    const q = G.qs[G.i], n = G.qs.length, T = typeOf(G.t);
    const listen = !!q.say, noVoice = listen && voiceState() === false;
    const secName = G.t === 'mock' ? SEC[q.sec] : G.t === 'mix' ? LABEL[q.k] || T.name : T.name;
    el.innerHTML = `<section class="ch ch-play">
      <div class="ch-top"><span class="pill">${G.L}・${esc(secName)}</span><span class="ch-n">${G.i + 1}／${n}</span><span class="ch-ok">✓ ${G.ok}</span></div>
      <div class="bar"><div style="width:${G.i / n * 100}%"></div></div>
      ${G.timed ? `<div class="ch-time" aria-hidden="true"><i id="ch-tm"></i></div>` : ''}
      <div class="panel ch-card">
        <p class="ch-lab">${esc(q.label)}</p>
        <p class="ch-ask">${esc(q.ask)}</p>
        ${listen ? `<div class="ch-say"><button type="button" class="btn primary" id="ch-say">🔊 再聽一次</button><button type="button" class="btn sm" id="ch-slow">🐢 慢速</button></div>${noVoice ? `<p class="ch-nov muted">🔇 這台裝置沒有日文語音，改看文字：<b class="jp">${esc(q.say)}</b></p>` : ''}` : ''}
        ${q.body || ''}
        <div class="choices${q.col ? ' ch-col' : ''}">${q.opts.map((o, i) => `<button type="button" class="choice${q.col ? ' ch-long' : ''}${/[぀-ヿ㐀-鿿]/.test(o) && !q.col ? ' jp' : ''}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="feedback" id="ch-fb" aria-live="polite"></div>
      </div>
    </section>`;
    const say = r => { if (q.say && voiceState() !== false) App.speak(q.say, r); };
    if (listen) {
      el.querySelector('#ch-say').onclick = () => say();
      el.querySelector('#ch-slow').onclick = () => say(0.6);
      setTimeout(() => { if (el.isConnected && G.qs[G.i] === q) say(); }, 250);
    }
    let done = false;
    const answer = k => {
      if (done) return; done = true; stopTimer();
      const ok = k === q.ans, bs = el.querySelectorAll('.choice');
      bs.forEach((b, i) => { b.disabled = true; if (i === q.ans) b.classList.add('ok'); else if (i === k) b.classList.add('ng'); });
      if (ok) G.ok++;
      const sec = G.sec[q.sec] || (G.sec[q.sec] = { ok: 0, n: 0 }); sec.n++; if (ok) sec.ok++;
      recordAns(q, G.L, ok);
      if (!ok && q.item && !G.wrong.some(w => w.id === q.item.id)) G.wrong.push(q.item);
      App.save();
      const last = G.i + 1 >= n;
      el.querySelector('#ch-fb').innerHTML = `<div class="ch-exp ${ok ? 'ok' : 'ng'}">
        <p class="ch-res">${ok ? '⭕ 答對了！' : k < 0 ? '⏰ 時間到' : '❌ 答錯了'}${ok ? '' : `　正解：<b>${esc(q.opts[q.ans])}</b>`}</p>
        <div class="ch-why">${q.explain || ''}</div>
        ${q.say ? `<p class="ch-script muted">聽到的內容：<span class="jp">${esc(q.say)}</span></p>` : ''}
        ${q.item ? `<div class="ch-tb">${App.trackBtn(q.item, true)}</div>` : ''}
      </div>
      <button type="button" class="btn primary block" id="ch-next">${last ? '看結果' : '下一題 ➜'}</button>`;
      const nx = el.querySelector('#ch-next');
      nx.onclick = () => { if (last) finish(el, G); else { G.i++; play(el, G); window.scrollTo(0, 0); } };
      try { nx.focus({ preventScroll: true }); } catch (e) { }
      setTimeout(() => { try { el.querySelector('#ch-fb').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }, 60);
    };
    el.querySelectorAll('.choice').forEach(b => b.onclick = () => answer(+b.dataset.i));
    if (G.timed) {
      const total = (SECS[q.k] || 30) * 1000, t0 = Date.now(), bar = el.querySelector('#ch-tm');
      TIMER = setInterval(() => {
        if (!el.isConnected || G.qs[G.i] !== q) { stopTimer(); return; }
        const left = Math.max(0, 1 - (Date.now() - t0) / total);
        if (bar) { bar.style.width = (left * 100) + '%'; bar.classList.toggle('low', left < 0.25); }
        if (left <= 0) answer(-1);
      }, 200);
    }
  }
  function finish(el, G) {
    stopTimer();
    const n = G.qs.length, pct = Math.round(G.ok / n * 100), c = rec(), key = G.L + ':' + G.t;
    let stars = pct >= 100 ? 3 : pct >= 85 ? 2 : pct >= 70 ? 1 : 0;
    let note = '', title = '';
    if (G.t === 'mock') {
      const secs = MOCK.map(([s]) => { const r = G.sec[s] || { ok: 0, n: 0 }; return { s, ok: r.ok, n: r.n, good: !r.n || r.ok / r.n >= 1 / 3 }; });
      const pass = pct >= PASS[G.L] && secs.every(x => x.good);
      if (!pass) stars = 0;
      else if (stars < 1) stars = 1;
      if (pass) c.pass[G.L] = 1;
      title = pass ? `🎓 ${G.L} 模擬考 合格！` : `${G.L} 模擬考 未合格`;
      note = `<b>${pass ? '合格' : '不合格'}</b>　總分 ${pct}%（合格線 ${PASS[G.L]}%）<br>` +
        secs.map(x => `${esc(SEC[x.s])} ${x.ok}／${x.n}${x.good ? '' : ' <span class="ch-low">未達基準</span>'}`).join('　') +
        '<br><small class="muted">每大題至少答對 1/3，且總分達合格線才算合格</small>';
    } else {
      title = stars ? `${G.L} ${typeOf(G.t).name} 過關！` : '再試一次';
      note = `答對率 ${pct}%${stars ? '' : '（70% 以上得星）'}`;
    }
    if (c.best[key] == null || pct > c.best[key]) { c.best[key] = pct; if (pct) note += '　🏅 新紀錄'; }
    if (!App.state.lastDone || typeof App.state.lastDone !== 'object') App.state.lastDone = {};
    App.state.lastDone.chal = App.today();   // 首頁「今日 3 件事」：做完一輪就算（不論得星）
    App.save();
    const r = App.reward('chal:' + key, stars, G.L + ' 挑戰');
    const nextLv = LVS[LVS.indexOf(G.L) + 1];
    selLv = G.L;   // N5→N4…；N1 沒有下一級
    App.showResult({
      title, stars, correct: G.ok, total: n, gained: r.gained, wrong: G.wrong, note,
      retry: () => App.go('challenge-play', { lv: G.L, t: G.t }),
      back: { label: nextLv ? '挑戰選單' : '換題型', route: G.t === 'mix' ? 'challenge' : undefined },
      next: stars && nextLv && G.t !== 'mock' && G.t !== 'mix' ? { label: `挑戰 ${nextLv} ➜`, route: 'challenge-play', params: { lv: nextLv, t: G.t } } : null
    });
  }

  App.register('challenge', { title: '挑戰', icon: '🏆', nav: false, navParent: 'home', render: renderMenu });
  App.register('challenge-play', { title: '挑戰', icon: '🏆', nav: false, navParent: 'home', render: renderPlay });
  // 自我檢查：每級每題型產生 n 題，回傳有問題的題目（開發用：Challenge.selfTest(200)）
  function selfTest(n) {
    const out = { total: 0, bad: [], perKind: {} };
    LVS.forEach(L => {
      const B = bank(L);
      Object.keys(GEN).forEach(k => {
        let made = 0;
        for (let i = 0; i < (n || 200); i++) {
          let q = null; try { q = GEN[k](B, new Set()); } catch (e) { out.bad.push([L, k, 'throw ' + e.message]); continue; }
          if (!q) continue;
          made++; out.total++;
          const p = problems(q, L);
          if (p.length) out.bad.push([L, k, p.join('；'), q.opts.join('｜')]);
        }
        out.perKind[L + ':' + k] = made;
      });
    });
    return out;
  }
  window.Challenge = { bank, makeRound, mutate, chunks, GEN, LVS, TYPES, problems, selfTest };
})();
