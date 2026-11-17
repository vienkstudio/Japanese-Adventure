/* =========================================================
   日語冒險 — 句型引擎 phrase.js
   把「意圖＋詞彙」組成句子：同一個句型可以換任何商品、數量、設施，
   禮貌層級是「說法」不是程度：plain 普通（對朋友）／polite です・ます（旅遊夠用）／keigo 敬語（更客氣）。
   Phrase.make(intent, slots, opt) → { parts:[{jp,kana}], accept:[[jp…]], jp, kana, zh, extra:[{jp,kana,fb}], style, styles }
   opt：{ style:'plain'|'polite'|'keigo', lv:'zero'|'n5'…'n1' }；相容舊寫法字串 'N5'…'N1' 或 'plain'／'polite'／'keigo'。
   lv 只影響詞塊切法（zero／n5 助詞併入名詞），不影響句子內容。
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
    hako: { u: '箱', k: ['', 'ひとはこ', 'ふたはこ', 'さんはこ', 'よんはこ', 'ごはこ'], zh: '盒' },
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

  /* ---- 說法（禮貌層級） ---- */
  const STYLES = [{ id: 'plain', zh: '普通', note: '對朋友、家人說' }, { id: 'polite', zh: 'です・ます', note: '旅遊時對店員用這個就好' }, { id: 'keigo', zh: '敬語', note: '更客氣（飯店、正式場合）' }];
  const REG = lv => ({ N3: 1, N2: 2, N1: 3 }[lv] || 0);
  // opt → { L:禮貌索引 0–3, plain:是否普通體, easy:助詞是否併入詞塊, style }
  function regOf(opt) {
    if (typeof opt === 'string') opt = /^N[1-5]$/.test(opt) ? { legacy: opt } : { style: opt };
    opt = opt || {};
    if (opt.legacy) return { L: REG(opt.legacy), plain: false, easy: opt.legacy === 'N5', style: REG(opt.legacy) >= 2 ? 'keigo' : 'polite' };
    const style = STYLES.some(s => s.id === opt.style) ? opt.style : 'polite';
    return { L: style === 'keigo' ? 2 : 0, plain: style === 'plain', easy: !opt.lv || opt.lv === 'zero' || opt.lv === 'n5', style };
  }
  // 詞塊：jp、kana、zh（零基礎時顯示在詞塊下的中文）
  const GLOSS = {
    'すみません、': '不好意思', 'すみません！': '不好意思！', '恐れ入りますが、': '不好意思（很客氣）', 'じゃあ、': '那麼', 'では、': '那麼', 'と、': '和',
    'ください': '請給我', 'もらえますか': '可以給我嗎', 'いただけますか': '可以給我嗎（客氣）', 'いただけますでしょうか': '可以給我嗎（很客氣）',
    'お願いします': '麻煩了', 'お願いできますか': '可以麻煩嗎', 'お願いできますでしょうか': '可以麻煩嗎（很客氣）', 'お願い': '拜託',
    'どこですか': '在哪裡', 'どこにありますか': '在哪裡', 'どちらでしょうか': '在哪裡（客氣）', 'どちらにございますか': '在哪裡（很客氣）', 'どこ？': '在哪？',
    'ありますか': '有嗎', 'ございますか': '有嗎（客氣）', 'ございますでしょうか': '有嗎（很客氣）', 'ある？': '有嗎？',
    'いくらですか': '多少錢', 'おいくらでしょうか': '多少錢（客氣）', 'いくら？': '多少？',
    'いいですか': '可以嗎', 'よろしいですか': '可以嗎（客氣）', 'よろしいでしょうか': '可以嗎（很客氣）', 'いい？': '可以嗎？', 'くれる？': '幫我好嗎？',
    'も': '也（〜ても＝就算…也）', 'は': '（主題）', 'を': '（受詞）', 'まで': '到', 'から': '從', 'くれ': '給我（命令）', 'あげます': '給你',
    '行きたいです': '想去', '行きたいのですが': '想去（客氣）', '行きたい': '想去', 'これを': '這個', 'これ': '這個', 'お会計': '結帳', 'お会計を': '結帳', '注文': '點餐'
  };
  const P = (jp, kana, zh) => ({ jp, kana: kana == null ? jp : kana, zh: zh != null ? zh : (GLOSS[jp] || '') });

  /* ---- 假名 → 羅馬字（零基礎提示用；平假名、片假名都可） ---- */
  const RO = {
    あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
    た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
    ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'wo', ん: 'n',
    が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
    ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu',
    ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa'
  };
  const PUNC = { '、': ', ', '。': '. ', '？': '? ', '！': '! ', '・': ' ', '「': '"', '」': '"', '〜': '~', '　': ' ', ' ': ' ' };
  function romaji(s) {
    s = String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
    let out = '', geminate = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i], nx = s[i + 1] || '';
      if (c === 'っ') { geminate = true; continue; }
      if (c === 'ー') { const v = out.match(/[aiueo]$/); if (v) out += v[0]; continue; }
      let r = RO[c];
      if (r == null) { out += PUNC[c] != null ? PUNC[c] : c; geminate = false; continue; }
      if (nx && 'ゃゅょ'.includes(nx) && /[きぎしじちぢにひびぴみり]/.test(c)) { r = (/[しじち]/.test(c) ? r.slice(0, -1) : r.slice(0, -1)) + ({ ゃ: 'ya', ゅ: 'yu', ょ: 'yo' })[nx]; if (/^(sh|ch|j)y/.test(r)) r = r.replace('y', ''); i++; }
      else if (nx && 'ぁぃぅぇぉ'.includes(nx) && /[ふゔてでうし]/.test(c)) { r = r.replace(/[aiueo]$/, '') + RO[nx]; i++; }
      if (geminate) { r = (r.startsWith('ch') ? 't' : r[0]) + r; geminate = false; }
      if (c === 'ん' && /^[aiueoy]/.test(RO[nx] || '')) r = "n'";
      if ((c === 'は' || c === 'へ') && (i === s.length - 1 || /[、。？！\s]/.test(nx)) && i > 0 && /[ぁ-ゖ]/.test(s[i - 1])) r = c === 'は' ? 'wa' : 'e';
      out += r;
    }
    return out.replace(/\s+/g, ' ').trim();
  }
  // 普通體（對朋友說的口氣）
  const PL = { req: P('お願い', 'おねがい'), where: P('どこ？'), have: P('ある？'), price: P('いくら？'), act: P('くれる？'), may: P('いい？') };
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
  // hint：句型（給有基礎的人）；hz：白話說明（零基礎顯示這個）
  const INTENTS = [
    { id: 'want', icon: '🛒', zh: '我要…', hint: '〜を〇つください', hz: '跟店員要東西' },
    { id: 'go', icon: '🚉', zh: '想去…', hint: '〜まで行きたいです', hz: '問怎麼去、票價多少' },
    { id: 'where', icon: '📍', zh: '…在哪裡？', hint: '〜はどこですか', hz: '問東西、設施的位置' },
    { id: 'have', icon: '📦', zh: '有沒有…？', hint: '〜はありますか', hz: '問有沒有賣' },
    { id: 'price', icon: '💴', zh: '…多少錢？', hint: '〜はいくらですか', hz: '問價錢' },
    { id: 'act', icon: '🙏', zh: '請幫我…', hint: '〜てください', hz: '請店員幫忙做一件事' },
    { id: 'may', icon: '✋', zh: '可以…嗎？', hint: '〜てもいいですか', hz: '問「我可以…嗎」' },
    { id: 'info', icon: 'ℹ️', zh: '想問…', hint: '營業時間、Wi-Fi、推薦…', hz: '營業時間、Wi-Fi、推薦…' }
  ];
  const GO = [P('行きたいです', 'いきたいです'), P('行きたいです', 'いきたいです'), P('行きたいのですが', 'いきたいのですが'), P('行きたいのですが', 'いきたいのですが')];
  // 句首「すみません、」可以省略：把它拿掉的排法也算對
  const dropSumi = list => list.concat(list.filter(a => a[0] === SUMI.jp).map(a => a.slice(1)));
  function make(intent, s, opt) {
    s = s || {};
    const R = regOf(opt), L = R.L, easy = R.easy, pl = R.plain;
    let parts = [], accept = null, zh = '', extra = [];
    if (intent === 'want' || intent === 'instead') {
      const items = s.items || [], ticket = items.some(x => isDest(x.it));
      const groups = items.map(({ it, n }) => {
        const sp = Object.assign(spoken(it), { zh: it.zh }), q = count(it.c, n), pa = P(ticket ? 'まで' : 'を');
        return easy ? [P(sp.jp + pa.jp, sp.kana + pa.kana, (ticket ? '到' : '') + it.zh), q] : [sp, pa, q];
      });
      const tail = pl ? PL.req : ticket ? ONEGAI[L] : intent === 'instead' && L ? ONEGAI[Math.max(0, L - 1)] : REQ[L];
      const head = intent === 'instead' ? [P(L ? 'では、' : 'じゃあ、')] : L >= 3 ? [PRE[3]] : [];
      const join = gs => gs.reduce((a, g, i) => a.concat(i ? [P('と、')] : [], g), []);
      parts = head.concat(join(groups), [tail]);
      // 可接受的詞序：品項順序任意；數量可放在品名前（二枚、軽井沢まで、お願いします）
      const qFirst = g => [g[g.length - 1]].concat(g.slice(0, -1));
      const seen = new Set();
      accept = [];
      perms(groups).forEach(gs => [gs, gs.map(qFirst)].forEach(v => { const a = head.concat(join(v), [tail]).map(p => p.jp), k = a.join('\u0001'); if (!seen.has(k)) { seen.add(k); accept.push(a); } }));
      zh = (intent === 'instead' ? '那改成' : ticket ? '到' : '請給我') + items.map(({ it, n }) => ticket ? `${it.zh} ${count(it.c, n).zh}` : `${count(it.c, n).zh}${it.zh}`).join('、') + (ticket ? '，麻煩了' : '');
      extra = [X.ageru]; if (!easy) extra.push(X.wa);
    } else if (intent === 'where' || intent === 'have' || intent === 'price') {
      const x = s.x, sp = x.say ? P(x.say.jp, x.say.kana) : P(x.jp, x.kana);
      const tail = pl ? PL[intent] : (intent === 'where' ? WHERE : intent === 'have' ? HAVE : PRICE)[L];
      sp.zh = x.zh;
      parts = (pl ? [] : [PRE[L]]).concat(easy ? [P(sp.jp + 'は', sp.kana + 'は', x.zh)] : [sp, P('は')], [tail]);
      zh = (pl ? '' : '不好意思，') +({ where: `${x.zh}在哪裡？`, have: `有${x.zh}嗎？`, price: `${x.zh}多少錢？` })[intent];
      const others = { where: PRICE[0], have: WHERE[0], price: WHERE[0] }[intent];
      extra = [{ jp: others.jp, kana: others.kana, fb: intent === 'where' ? '「いくらですか」是問價錢' : '「どこですか」是問位置' }];
      if (!easy) extra.push(X.wo);
    } else if (intent === 'go') {   // 目的地：〜まで行きたいです
      const x = s.x, sp = x.say ? P(x.say.jp, x.say.kana, x.zh) : P(x.jp, x.kana, x.zh);
      parts = (pl ? [] : [PRE[L]]).concat(easy ? [P(sp.jp + 'まで', sp.kana + 'まで', '到' + x.zh)] : [sp, P('まで')], [pl ? P('行きたい', 'いきたい') : GO[L]]);
      zh = (pl ? '' : '不好意思，') + `我想去${x.zh}`;
      extra = [{ jp: 'ありますか', kana: 'ありますか', fb: '「ありますか」是問有沒有；想去某地說「〜まで行きたいです」' }];
      if (!easy) extra.push({ jp: 'から', kana: 'から', fb: '「から」是「從」；目的地用「まで」' });
    } else if (intent === 'this') {   // 結帳：把籃子放上櫃台說一句
      parts = pl ? [P('これ'), PL.req] : L ? [SUMI, P('これを'), ONEGAI[L]] : easy ? [P('これを'), P('お願いします', 'おねがいします')] : [P('これ'), P('を'), P('お願いします', 'おねがいします')];
      zh = '這些麻煩你（結帳）';
      extra = [X.ageru];
    } else if (intent === 'bill') {
      parts = pl ? [P('お会計', 'おかいけい'), PL.req] : L ? [SUMI, P('お会計を', 'おかいけいを'), ONEGAI[L]] : [SUMI, P('お会計', 'おかいけい'), ONEGAI[0]];
      zh = '不好意思，麻煩結帳';
      extra = [{ jp: 'メニュー', kana: 'メニュー', fb: '「メニュー」是菜單；結帳是「お会計」' }, { jp: 'いただきます', kana: 'いただきます', fb: '這是開動前說的' }];
    } else if (intent === 'call') {
      parts = [P('すみません！'), P('注文', 'ちゅうもん'), pl ? PL.req : ONEGAI[L]];
      zh = '不好意思！麻煩點餐';
      extra = [{ jp: 'お会計', kana: 'おかいけい', fb: '「お会計」是結帳；點餐是「注文」' }];
    } else if (intent === 'act') {
      const a = s.a;
      parts = (L >= 2 ? [PRE[L]] : []).concat([P(a.jp, a.kana), pl ? PL.act : REQ[L]]);
      zh = `請幫我${a.zh}`;
      extra = [{ jp: 'あげます', kana: 'あげます', fb: '「〜てあげます」是「我幫你做」，意思反了' }, { jp: 'もいいですか', kana: 'もいいですか', fb: '「〜てもいいですか」是問「我可以…嗎」；拜託對方做要用「〜てください」' }];
    } else if (intent === 'may') {
      const a = s.a;
      parts = (L >= 2 ? [PRE[L]] : []).concat([P(a.jp, a.kana), P('も'), pl ? PL.may : MAY[L]]);
      zh = `可以${a.zh}嗎？`;
      extra = [{ jp: 'ください', kana: 'ください', fb: '「〜てください」是請對方做；問自己能不能做要用「〜てもいいですか」' }];
    } else if (intent === 'info') {
      const q = s.q;
      parts = chunk(q.jp).map(t => P(t, ''));
      if (parts.length < 2) parts = [P(q.jp.replace(/。$/, ''), '')];
      zh = q.zh;
      return { parts, accept: [parts.map(p => p.jp)], jp: q.jp, kana: q.kana, zh, extra: [], style: R.style, styles: false };
    }
    if (L >= 2 && ['want', 'act', 'instead'].includes(intent)) extra.push(RUDE);
    if (!accept) accept = [parts.map(p => p.jp)];
    accept = dropSumi(accept);
    const strip = t => t.replace(/[、！]$/, '');
    let jp = parts.map(p => p.jp).join(''); const kana = parts.map(p => p.kana).join('');
    if (!/[？?！!]$/.test(jp)) jp += '。';
    return { parts, accept, jp, kana, zh, extra, strip, style: R.style, styles: true };
  }
  // 檢查玩家排出的詞塊順序
  function check(model, seq) {
    const key = a => a.join('\u0001');
    if (model.accept.some(a => key(a) === key(seq))) return { ok: true };
    const bad = (model.extra || []).find(e => seq.includes(e.jp));
    if (bad) return { ok: false, fb: bad.fb };
    const min = Math.min(...model.accept.map(a => a.length));
    // 還沒排完：只是提示，不算失誤
    if (seq.length < min) return { ok: false, short: true, fb: '句子還沒排完，把詞塊排完再說' };
    return { ok: false, fb: '順序不對，再看一次句型' };
  }

  window.Phrase = { CNT, count, yen, yenKana, REG, STYLES, make, check, chunk, INTENTS, spoken, romaji, GLOSS };
})();
