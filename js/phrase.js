/* =========================================================
   日語冒險 — 句型引擎 phrase.js
   把「意圖＋詞彙」組成句子：同一個句型可以換任何商品、數量、設施，
   並依程度換禮貌層級（N5／N4 ください → N3 もらえますか → N2 いただけますか → N1 いただけますでしょうか）。
   Phrase.make(intent, slots, lv) → { parts:[{jp,kana}], accept:[[jp…]], jp, kana, zh, extra:[{jp,kana,fb}] }
   冒險（world.js）與會話手冊（phrasebook.js）共用。
   ========================================================= */
(function () {
  'use strict';
  const NUM = ['', '一', '二', '三', '四', '五'];
  // 量詞 1–5 的讀音
  const CNT = {
    tsu: { u: 'つ', k: ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'], zh: '個' },
    ko: { u: '個', k: ['', 'いっこ', 'にこ', 'さんこ', 'よんこ', 'ごこ'], zh: '個' },
    mai: { u: '枚', k: ['', 'いちまい', 'にまい', 'さんまい', 'よんまい', 'ごまい'], zh: '張' },
    hon: { u: '本', k: ['', 'いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ごほん'], zh: '瓶／支' },
    hai: { u: '杯', k: ['', 'いっぱい', 'にはい', 'さんばい', 'よんはい', 'ごはい'], zh: '杯' },
    satsu: { u: '冊', k: ['', 'いっさつ', 'にさつ', 'さんさつ', 'よんさつ', 'ごさつ'], zh: '本' },
    nin: { u: '人前', k: ['', 'いちにんまえ', 'ににんまえ', 'さんにんまえ', 'よにんまえ', 'ごにんまえ'], zh: '人份' },
    soku: { u: '足', k: ['', 'いっそく', 'にそく', 'さんぞく', 'よんそく', 'ごそく'], zh: '雙' },
    chaku: { u: '着', k: ['', 'いっちゃく', 'にちゃく', 'さんちゃく', 'よんちゃく', 'ごちゃく'], zh: '件' },
    hako: { u: '箱', k: ['', 'ひとはこ', 'ふたはこ', 'さんぱこ', 'よんはこ', 'ごはこ'], zh: '盒' },
    fukuro: { u: '袋', k: ['', 'ひとふくろ', 'ふたふくろ', 'さんふくろ', 'よんふくろ', 'ごふくろ'], zh: '包' },
    sara: { u: '皿', k: ['', 'ひとさら', 'ふたさら', 'さんさら', 'よんさら', 'ごさら'], zh: '盤' },
    dai: { u: '台', k: ['', 'いちだい', 'にだい', 'さんだい', 'よんだい', 'ごだい'], zh: '台' },
    haku: { u: '泊', k: ['', 'いっぱく', 'にはく', 'さんぱく', 'よんはく', 'ごはく'], zh: '晚' },
    kai: { u: '回', k: ['', 'いっかい', 'にかい', 'さんかい', 'よんかい', 'ごかい'], zh: '次' },
    mei: { u: '名', k: ['', 'いちめい', 'にめい', 'さんめい', 'よんめい', 'ごめい'], zh: '位' }
  };
  const clampN = n => Math.max(1, Math.min(5, n | 0 || 1));
  function count(c, n) { const t = CNT[c] || CNT.tsu; n = clampN(n); return { jp: NUM[n] + t.u, kana: t.k[n], zh: n + ' ' + t.zh }; }

  // 金額讀音：1980 → せんきゅうひゃくはちじゅうえん
  function yenKana(n) {
    const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
    let s = '';
    const man = Math.floor(n / 10000), sen = Math.floor(n / 1000) % 10, hy = Math.floor(n / 100) % 10, ju = Math.floor(n / 10) % 10, ic = n % 10;
    if (man) s += (man >= 10 ? (Math.floor(man / 10) > 1 ? D[Math.floor(man / 10)] : '') + 'じゅう' + D[man % 10] : D[man]) + 'まん';
    if (sen) s += sen === 1 ? 'せん' : sen === 3 ? 'さんぜん' : sen === 8 ? 'はっせん' : D[sen] + 'せん';
    if (hy) s += hy === 1 ? 'ひゃく' : hy === 3 ? 'さんびゃく' : hy === 6 ? 'ろっぴゃく' : hy === 8 ? 'はっぴゃく' : D[hy] + 'ひゃく';
    if (ju) s += ju === 1 ? 'じゅう' : D[ju] + 'じゅう';
    if (ic) s += D[ic];
    return (s || 'ぜろ') + 'えん';
  }
  const yen = n => ({ jp: n.toLocaleString('en-US') + '円', kana: yenKana(n), zh: n.toLocaleString('en-US') + ' 日圓' });

  /* ---- 禮貌層級 ---- */
  const REG = lv => ({ N3: 1, N2: 2, N1: 3 }[lv] || 0);
  const P = (jp, kana) => ({ jp, kana: kana == null ? jp : kana });
  const REQ = [P('ください'), P('もらえますか'), P('いただけますか'), P('いただけますでしょうか')];
  const ONEGAI = [P('お願いします', 'おねがいします'), P('お願いできますか', 'おねがいできますか'), P('お願いできますでしょうか', 'おねがいできますでしょうか'), P('お願いできますでしょうか', 'おねがいできますでしょうか')];
  const SUMI = P('すみません、');
  const PRE = [SUMI, SUMI, SUMI, P('恐れ入りますが、', 'おそれいりますが、')];
  const WHERE = [P('どこですか'), P('どこにありますか'), P('どちらでしょうか'), P('どちらにございますか')];
  const HAVE = [P('ありますか'), P('ありますか'), P('ございますか'), P('ございますでしょうか')];
  const PRICE = [P('いくらですか'), P('いくらですか'), P('おいくらでしょうか'), P('おいくらでしょうか')];
  const MAY = [P('いいですか'), P('いいですか'), P('よろしいですか'), P('よろしいでしょうか')];
  const RUDE = { jp: 'くれ', kana: 'くれ', fb: '「くれ」是命令口氣，對店員很失禮' };
  const X = { ageru: { jp: 'あげます', kana: 'あげます', fb: '「あげます」是「我給你」；要東西說「ください」' }, wa: { jp: 'は', kana: 'は', fb: '要東西時，東西後面用「を」' }, wo: { jp: 'を', kana: 'を', fb: '問「在哪裡／多少錢／有沒有」時，主題後面用「は」' } };

  // 說出口的品名（商品可用 say 指定口語說法）
  const spoken = it => it.say ? P(it.say.jp, it.say.kana) : P(it.jp, it.kana);
  const isDest = it => (it.tags || []).includes('dest');
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(p => [x].concat(p)));

  /* ---- 把完整句子切成詞塊（助詞、句尾、逗號為界） ---- */
  const STRONG = /[一-鿿ァ-ヺー0-9A-Za-z々]/;
  const NO_SPLIT = ['です', 'でし', 'でき', 'がり', 'にな', 'にし', 'とう', 'でご', 'がっ', 'にく', 'はい', 'もら', 'もう', 'でお'];
  const ENDS = ['ください', 'お願いします', 'ですか', 'でしょうか', 'ますか', 'ありますか', 'できますか'];
  function chunk(jp) {
    jp = String(jp).replace(/[。！!]$/, '');
    const out = []; let cur = '';
    for (let i = 0; i < jp.length; i++) {
      const c = jp[i], prev = jp[i - 1] || '', nx = jp[i + 1] || '';
      cur += c;
      if ('、？?'.includes(c)) { out.push(cur); cur = ''; continue; }
      if ('をはがにでへとも'.includes(c) && cur.length > 1 && STRONG.test(prev) && nx && nx !== '、' && !NO_SPLIT.includes(c + nx)) { out.push(cur); cur = ''; continue; }
      const two = jp.slice(i - 1, i + 1);
      if ((two === 'から' || two === 'まで') && cur.length > 2 && nx) { out.push(cur); cur = ''; continue; }
      if (cur && ENDS.includes(jp.slice(i + 1))) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out.map(x => x.trim()).filter(Boolean);
  }

  /* ---- 意圖 → 句子 ---- */
  const INTENTS = [
    { id: 'want', icon: '🛒', zh: '我要…', hint: '〜を〇つください' },
    { id: 'where', icon: '📍', zh: '…在哪裡？', hint: '〜はどこですか' },
    { id: 'have', icon: '📦', zh: '有沒有…？', hint: '〜はありますか' },
    { id: 'price', icon: '💴', zh: '…多少錢？', hint: '〜はいくらですか' },
    { id: 'act', icon: '🙏', zh: '請幫我…', hint: '〜てください' },
    { id: 'may', icon: '✋', zh: '可以…嗎？', hint: '〜てもいいですか' },
    { id: 'info', icon: 'ℹ️', zh: '想問…', hint: '營業時間、Wi-Fi、推薦…' }
  ];
  function make(intent, s, lv) {
    s = s || {};
    const L = REG(lv), easy = lv === 'N5';
    let parts = [], accept = null, zh = '', extra = [];
    const end = '。';
    if (intent === 'want' || intent === 'instead') {
      const items = s.items || [], ticket = items.some(x => isDest(x.it));
      const groups = items.map(({ it, n }) => {
        const sp = spoken(it), q = count(it.c, n), pa = P(ticket ? 'まで' : 'を');
        return easy ? [P(sp.jp + pa.jp, sp.kana + pa.kana), q] : [sp, pa, q];
      });
      const tail = ticket ? ONEGAI[L] : intent === 'instead' && L ? ONEGAI[Math.max(0, L - 1)] : REQ[L];
      const head = intent === 'instead' ? [P(L ? 'では、' : 'じゃあ、')] : L >= 3 ? [PRE[3]] : [];
      const join = gs => gs.reduce((a, g, i) => a.concat(i ? [P('と、')] : [], g), []);
      parts = head.concat(join(groups), [tail]);
      accept = perms(groups).map(gs => head.concat(join(gs), [tail]).map(p => p.jp));
      zh = (intent === 'instead' ? '那改成' : ticket ? '到' : '請給我') + items.map(({ it, n }) => ticket ? `${it.zh} ${count(it.c, n).zh}` : `${count(it.c, n).zh}${it.zh}`).join('、') + (ticket ? '，麻煩了' : '');
      extra = [X.ageru]; if (!easy) extra.push(X.wa);
    } else if (intent === 'where' || intent === 'have' || intent === 'price') {
      const x = s.x, sp = x.say ? P(x.say.jp, x.say.kana) : P(x.jp, x.kana);
      const tail = (intent === 'where' ? WHERE : intent === 'have' ? HAVE : PRICE)[L];
      parts = [PRE[L]].concat(easy ? [P(sp.jp + 'は', sp.kana + 'は')] : [sp, P('は')], [tail]);
      zh = '不好意思，' + ({ where: `${x.zh}在哪裡？`, have: `有${x.zh}嗎？`, price: `${x.zh}多少錢？` })[intent];
      const others = { where: PRICE[0], have: WHERE[0], price: WHERE[0] }[intent];
      extra = [{ jp: others.jp, kana: others.kana, fb: intent === 'where' ? '「いくらですか」是問價錢' : '「どこですか」是問位置' }];
      if (!easy) extra.push(X.wo);
    } else if (intent === 'bill') {
      parts = L ? [SUMI, P('お会計を', 'おかいけいを'), ONEGAI[L]] : [SUMI, P('お会計', 'おかいけい'), ONEGAI[0]];
      zh = '不好意思，麻煩結帳';
      extra = [{ jp: 'メニュー', kana: 'めにゅー', fb: '「メニュー」是菜單；結帳是「お会計」' }, { jp: 'いただきます', kana: 'いただきます', fb: '這是開動前說的' }];
    } else if (intent === 'call') {
      parts = [P('すみません！'), P('注文', 'ちゅうもん'), ONEGAI[L]];
      zh = '不好意思！麻煩點餐';
      extra = [{ jp: 'お会計', kana: 'おかいけい', fb: '「お会計」是結帳；點餐是「注文」' }];
    } else if (intent === 'act') {
      const a = s.a;
      parts = (L >= 2 ? [PRE[L]] : []).concat([P(a.jp, a.kana), REQ[L]]);
      zh = `請幫我${a.zh}`;
      extra = [{ jp: 'あげます', kana: 'あげます', fb: '「〜てあげます」是「我幫你做」，意思反了' }, { jp: 'もいいですか', kana: 'もいいですか', fb: '「〜てもいいですか」是問「我可以…嗎」；拜託對方做要用「〜てください」' }];
    } else if (intent === 'may') {
      const a = s.a;
      parts = (L >= 2 ? [PRE[L]] : []).concat([P(a.jp, a.kana), P('も'), MAY[L]]);
      zh = `可以${a.zh}嗎？`;
      extra = [{ jp: 'ください', kana: 'ください', fb: '「〜てください」是請對方做；問自己能不能做要用「〜てもいいですか」' }];
    } else if (intent === 'info') {
      const q = s.q;
      parts = chunk(q.jp).map(t => P(t, ''));
      if (parts.length < 2) parts = [P(q.jp.replace(/。$/, ''), '')];
      zh = q.zh;
      const out = { parts, accept: [parts.map(p => p.jp)], jp: q.jp, kana: q.kana, zh, extra: [] };
      return out;
    }
    if (L >= 2 && ['want', 'act', 'instead'].includes(intent)) extra.push(RUDE);
    if (!accept) accept = [parts.map(p => p.jp)];
    const strip = t => t.replace(/[、！]$/, '');
    const jp = parts.map(p => p.jp).join('') + end, kana = parts.map(p => p.kana).join('');
    return { parts, accept, jp, kana, zh, extra, strip };
  }
  // 檢查玩家排出的詞塊順序
  function check(model, seq) {
    const key = a => a.join('\u0001');
    if (model.accept.some(a => key(a) === key(seq))) return { ok: true };
    const bad = (model.extra || []).find(e => seq.includes(e.jp));
    if (bad) return { ok: false, fb: bad.fb };
    const base = model.accept[0];
    if (seq.length < base.length) return { ok: false, fb: '句子還沒排完' };
    return { ok: false, fb: '順序不對，再看一次句型' };
  }

  window.Phrase = { CNT, count, yen, yenKana, REG, make, check, chunk, INTENTS, spoken };
})();
