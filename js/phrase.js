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
    ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
    が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
    ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu',
    ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa'
  };
  const PUNC = { '、': ', ', '。': '. ', '？': '? ', '！': '! ', '・': ' ', '「': '"', '」': '"', '〜': '~', '　': ' ', ' ': ' ' };
  /* ---- 分詞羅馬字：用 jp（漢字／片假名）對齊 kana 找詞界，助詞 は／へ／を 念 wa／e／o（與會話手冊一致：kore wa ikura desu ka） ---- */
  const isA = c => /[A-Za-zＡ-Ｚａ-ｚ-]/.test(c), isK = c => /[一-鿿㐀-䶿々〆ヶ0-9０-９]/.test(c), isT = c => /[ァ-ヺー]/.test(c), isH = c => /[ぁ-ゖ]/.test(c);
  const toH = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const PARTS = ['ぐらい', 'くらい', 'ほど', 'ずつ', 'から', 'まで', 'より', 'など', 'だけ', 'しか', 'なら', 'は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'や'];
  const P_RO = { は: 'wa', へ: 'e', を: 'o' };
  const LEX = ['あそこ', 'こちら', 'そちら', 'あちら', 'どちら', 'わたし', 'あなた', 'みなさん', 'ぜんぶ', 'みんな', 'いくら', 'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'どこ', 'だれ', 'ひとつ', 'ふたつ', 'ひとり', 'ふたり', 'きょう', 'あした', 'おかいけい', 'あと', 'また', 'もう', 'よく', 'ちょっと', 'どのくらい', 'どのぐらい', 'いかが', 'すぐ', 'とても', 'うち', 'かかります', 'かかる', 'どうぞ', 'どう', 'まっすぐ', 'すみません', 'ごゆっくり', 'ゆっくり', 'それぞれ'];
  const STARTS = ['ください', 'くださ', 'ございま', 'おねがい', 'もらえ', 'もらい', 'もらっ', 'いただけ', 'いただき', 'いただい', 'でしょう', 'でしょ', 'でしたら', 'でした', 'です'];
  const WHOLE = ['でしょう', 'でしょ', 'でしたら', 'でした', 'です'];
  const AFTER_TE = ['います', 'いる', 'いま', 'いた', 'ない', 'ある', 'あり', 'みて', 'みま', 'おき', 'おり', 'くれ', 'しま'];
  const CONJ = ['から', 'けど', 'ので', 'のに', 'なら', 'と'];
  const OKURI_EX = { が: /^[るりれろっらう]/, と: /^[すさしせそ]/, や: /^[すさしせそか]/, も: /^[っう]/, の: /^[せっ]/, に: /^[ぎ]/, で: /^[きくけ]/, しか: /^[っ]/, なら: /^[べぶび]/, から: /^[いかくけ]/ };
  // 阿拉伯數字 → 漢字數字（1,370 → 千三百七十），讓讀音對得齊
  const KD = '〇一二三四五六七八九';
  function kanjiNum(n) {
    if (!n) return '〇';
    const four = x => { let s = ''; [[1000, '千'], [100, '百'], [10, '十']].forEach(([u, c]) => { const d = Math.floor(x / u) % 10; if (d) s += (d > 1 ? KD[d] : '') + c; }); return s + (x % 10 ? KD[x % 10] : ''); };
    const man = Math.floor(n / 10000), rest = n % 10000;
    return (man ? (man >= 10000 ? four(Math.floor(man / 10000)) + '億' + (man % 10000 ? four(man % 10000) + '万' : '') : four(man) + '万') : '') + (rest ? four(rest) : '');
  }
  const arabic = (jp, kana) => jp.normalize('NFKC')
    .replace(/(\d{1,2}):(\d{2})/g, (m, h, mi) => kanjiNum(+h) + '時' + (+mi === 0 ? '' : +mi === 30 && /じはん/.test(kana || '') ? '半' : kanjiNum(+mi) + '分'))
    .replace(/\d{1,3}(?:,\d{3})+|\d+/g, m => { const n = +m.replace(/,/g, ''); return n < 1e12 ? kanjiNum(n) : m; });
  // 數量詞：數字＋量詞自成一詞（大人一人 → otona hitori、何回乗る → nankai noru）
  const NUMC = '何〇一二三四五六七八九十百千万億';
  const COUNTER = '号車|号室|時半|時間|日間|週間|年間|分間|ヶ月|か月|カ月|番線|番目|人前|円|人|回|分|時|階|名|泊|個|杯|枚|本|番|歳|日|品|度|足|着|箱|袋|皿|台(?!湾)|冊|組|号|両|週|秒|匹|頭|軒|駅|件|割';
  const NUM_RE = new RegExp('第?[' + NUMC + ']+(?:' + COUNTER + ')?(?:様)?', 'g');
  const SUFFIX_N = /^(.+?)(弁当|定食)$/, SUFFIX_RD = { 弁当: 'べんとう', 定食: 'ていしょく' };   // 長複合名詞尾巴另成一詞（幕の内弁当 → makunouchi bentou）
  function splitK(s) {
    const out = []; let last = 0;
    s.replace(NUM_RE, (m, at) => {
      const hasC = m.length > (m.match(new RegExp('^第?[' + NUMC + ']+'))[0].length);
      if (!hasC && (at + m.length < s.length || (at > 0 && m.replace(/^第/, '').length < 2))) return m;   // 一緒、二条城、均一：不是數量詞
      if (at > last) out.push({ t: 'K', s: s.slice(last, at) });
      out.push({ t: 'N', s: m }); last = at + m.length; return m;
    });
    if (last < s.length) out.push({ t: 'K', s: s.slice(last) });
    return out.flatMap(r => { const m = r.t === 'K' && r.s.match(SUFFIX_N); return m ? [{ t: 'K', s: m[1] }, { t: 'K', s: m[2], rd: SUFFIX_RD[m[2]] }] : [r]; });
  }
  // jp 切成段：K 漢字、N 數字＋量詞、T 片假名、H 平假名、P 其他
  function runs(jp) {
    const out = [];
    for (const c of jp) { const t = isA(c) ? 'A' : isK(c) ? 'K' : isT(c) ? 'T' : isH(c) ? 'H' : 'P'; const l = out[out.length - 1]; if (l && l.t === t) l.s += c; else out.push({ t, s: c }); }
    const o = out.flatMap(r => r.t === 'K' ? splitK(r.s) : [r]);
    for (let i = 0; i < o.length - 1; i++) { const r = o[i]; if (r.t === 'K' && r.s.length > 1 && /申$/.test(r.s) && o[i + 1].t === 'H' && /^し/.test(o[i + 1].s)) { o.splice(i, 1, { t: 'K', s: r.s.slice(0, -1) }, { t: 'K', s: '申' }); i++; } }
    return o;
  }
  // 數字讀音分段：せんななひゃくはちじゅうえん → sen nanahyaku hachijuu en
  const ND = 'いち|に|さん|よん|ご|ろく|なな|はち|きゅう';
  const NUM_TOK = new RegExp('(?:いっ|ろっ|はっ|' + ND + ')?(?:まん|せん|ぜん|ひゃく|びゃく|ぴゃく)|(?:' + ND + ')?じゅう(?:' + ND + ')?|' + ND, 'y');
  function numRoma(s, k) {
    const kh = toH(k), yen = /円$/.test(s) && /えん$/.test(kh), core = yen ? kh.slice(0, -2) : kh;
    if (!yen) return conv(kh);
    const pre = (core.match(/^[おご]/) && /^[おご]/.test(s)) ? core[0] : '';
    const toks = []; NUM_TOK.lastIndex = pre.length;
    let m; while (NUM_TOK.lastIndex < core.length && (m = NUM_TOK.exec(core))) toks.push(m[0]);
    if (!toks.length || toks.join('').length !== core.length - pre.length) return conv(kh);
    return conv(pre) + toks.map(conv).join(' ') + (yen ? ' en' : '');
  }
  // 對齊：動態規劃找 K 段讀音（每字約 2 個假名的切法最優先）；失敗回傳 null
  const PUN = /[、。！？!?s・「」…（）〜~,.]/;
  // 英文字母讀音（IC＝あいしー、JR＝じぇいあーる）；常見英文詞照念
  const ABC = 'えー|えい,びー,しー,でぃー,いー,えふ,じー,えっち|えいち,あい,じぇー|じぇい,けー|けい,える,えむ,えぬ,おー,ぴー,きゅー,あーる,えす,てぃー,ゆー,ぶい,だぶりゅー|だぶる,えっくす,わい,ぜっと'.split(',');
  const ABW = { sim: 'しむ', wi: 'わい', fi: 'ふぁい', suica: 'すいか', pasmo: 'ぱすも', icoca: 'いこか', free: 'ふりー', 'wi-fi': 'わいふぁい' };
  const abRe = w => new RegExp('^(?:' + [ABW[w.toLowerCase()], [...w.toUpperCase()].map(c => { const i = c.charCodeAt(0) - 65; return i >= 0 && i < 26 ? '(?:' + ABC[i] + ')' : ''; }).join('')].filter(Boolean).join('|') + ')');
  // 量詞讀音對不上就加分（何回＝なんかい，不是なんか＋い）
  // 數字讀音開頭（一番＝いちばん，不會是ちばん）
  const NUM_ST = { 一: 'いち|いっ|ひと|つい', 二: 'に|ふた|ふつ|はつ|はた', 三: 'さん|み', 四: 'よん|よ|し|よっ', 五: 'ご|いつ', 六: 'ろく|ろっ|む', 七: 'なな|しち|なの', 八: 'はち|はっ|や|よう', 九: 'きゅう|く|ここの', 十: 'じゅう|じゅっ|じっ|とお|と', 百: 'ひゃく', 千: 'せん', 万: 'まん|いちまん', 何: 'なん|なに|いく', 〇: 'ぜろ|れい|まる' };
  const CNT_K = { 台: 'だい', 号: 'ごう', 車: 'しゃ', 室: 'しつ', 半: 'はん', 冊: 'さつ', 足: 'そく|ぞく', 着: 'ちゃく', 箱: 'はこ|ばこ', 袋: 'ふくろ|ぶくろ', 皿: 'さら|ざら', 組: 'くみ|ぐみ', 両: 'りょう', 週: 'しゅう', 秒: 'びょう', 匹: 'ひき|びき|ぴき', 頭: 'とう', 軒: 'けん|げん', 駅: 'えき', 件: 'けん', 割: 'わり', 目: 'め', 線: 'せん', 前: 'まえ', 間: 'かん', 月: 'げつ|がつ', 回: 'かい|がい', 人: 'にん|り', 円: 'えん', 分: 'ふん|ぷん', 時: 'じ', 階: 'かい|がい', 名: 'めい', 泊: 'はく|ぱく', 個: 'こ', 杯: 'はい|ばい|ぱい', 枚: 'まい', 本: 'ほん|ぼん|ぽん', 番: 'ばん', 歳: 'さい', 日: 'にち|か', 度: 'ど', 品: 'ひん|ぴん', 様: 'さま' };
  function cntCost(s, k) {
    const c = s.replace(/様$/, '').slice(-1), r = CNT_K[c];
    const st = NUM_ST[s.replace(/^第/, '')[0]], bad = st && !new RegExp('^(?:' + st + ')').test(k) ? 8 : 0;
    return bad + (!r || new RegExp('(?:' + r + ')$').test(k) ? 0 : 3);
  }
  function align(kana, jp) {
    const rs = runs(jp), K = toH(kana), N = K.length, memo = new Map();
    function go(ri, pos) {
      const key = ri * 1000 + pos; if (memo.has(key)) return memo.get(key);
      let best = null;
      if (ri === rs.length) best = [...K.slice(pos)].every(c => PUN.test(c)) ? { sc: 0, ks: [] } : null;
      else {
        const r = rs[ri], tryAt = (len, sc) => { const nx = go(ri + 1, pos + len); if (nx && (!best || nx.sc + sc < best.sc)) best = { sc: nx.sc + sc, ks: [kana.slice(pos, pos + len)].concat(nx.ks) }; };
        if (r.rd && K.startsWith(r.rd, pos)) tryAt(r.rd.length, 0);
        else if (r.t === 'K' || r.t === 'N' || r.t === 'A') {
          const am = r.t === 'A' ? (K.slice(pos).match(abRe(r.s.normalize('NFKC'))) || [''])[0].length : 0;
          for (let l = 1; l <= Math.min(N - pos, r.s.length * 4 + 2); l++) { if (PUN.test(K[pos + l - 1])) break; tryAt(l, r.t === 'A' ? (l === am ? 0 : 6) : Math.pow(l - 2 * r.s.length, 2) + (r.t === 'N' ? cntCost(r.s, K.slice(pos, pos + l)) : 0) + (/^[っゃゅょぁぃぅぇぉんー]/.test(K[pos]) ? 10 : 0)); }
        }
        else if (r.t === 'P') { let l = 0; while (pos + l < N && PUN.test(K[pos + l])) l++; for (; l >= 0; l--) tryAt(l, 0); }
        else { const h = toH(r.s); if (K.startsWith(h, pos)) tryAt(h.length, 0); }
      }
      memo.set(key, best); return best;
    }
    const b = rs.length <= 60 && N < 1000 ? go(0, 0) : null;
    return b ? rs.map((r, i) => ({ t: r.t === 'A' ? 'K' : r.t, k: b.ks[i], n: r.s.length, s: r.s })) : null;
  }
  // 平假名段切詞：after＝前面是內容詞（漢字／片假名）；nextK＝後面接漢字／片假名；kLen＝前一個漢字段長度
  function splitH(h, after, nextK, kLen, prevT, nextKanji) {
    const out = [];
    let cur = '', curSp = !after, can = after;
    const flush = () => { if (cur) out.push({ k: cur, sp: curSp }); cur = ''; curSp = true; };
    const unit = (k, part, extra) => { flush(); out.push(Object.assign({ k, sp: true, part: !!part }, extra || {})); };
    const begin = w => { flush(); cur = w; curSp = true; };
    for (let i = 0; i < h.length;) {
      const rest = h.slice(i), last = i === h.length - 1;
      const st = STARTS.find(x => rest.startsWith(x));
      // 1. 內容詞後的助詞（で＋は、に＋も…可連兩個）
      if (can && !cur && !st) {
        const okOne = can !== 'two';
        const p = okOne ? PARTS.find(x => rest.startsWith(x) && !(OKURI_EX[x] && OKURI_EX[x].test(rest.slice(x.length))))
          : (/^[はものでに]/.test(rest) && (rest.length > 1 || nextK) && !(OKURI_EX[rest[0]] && OKURI_EX[rest[0]].test(rest.slice(1))) ? rest[0] : null);
        if (p) { unit(p, true); i += p.length; can = okOne && !/^[はがをもや]$/.test(p) ? 'two' : false; continue; }
      }
      can = false;
      // 2. 已知平假名詞（て形之後也可：入ってすぐ）
      if (!cur || (/[てで]$/.test(cur) && cur.length > 1)) {
        // 已知詞後面接小字（うちゅう）不算；うち 只在後面是助詞或結尾時才算（うちあげ 是一個詞）
        const w = LEX.find(x => rest.startsWith(x) && !/^[ゃゅょぁぃぅぇぉっー]/.test(rest.slice(x.length)) && (x !== 'うち' || /^(?:[のにではもがをへ、。！？\s]|$)/.test(rest.slice(x.length))));
        if (w) { begin(w); i += w.length; flush(); out[out.length - 1].lex = true; can = true; continue; }
      }
      // 3. 句尾、補助動詞前切開
      const te = /[てで]$/.test(cur) && AFTER_TE.find(x => rest.startsWith(x));
      const suru = (/^し(ます|ました|ません|て|た|ない)/.test(rest) && ((!cur && i === 0 && after && (kLen >= 2 || prevT)) || /い$/.test(cur) || (/せ$/.test(cur) && (cur.length >= 3 || after)))) ? 'し' : /^でき(ます|ません|る|ない)/.test(rest) && /(^|おねが)い$/.test(cur) ? 'でき' : '';
      if (st && (cur || (i === 0 && after) || out.length)) { begin(st); i += st.length; if (WHOLE.includes(st)) flush(); continue; }
      if (!cur && i === 0 && after && kLen >= 2 && /^でき(ます|ません|る|ない)/.test(rest)) { begin('でき'); i += 2; continue; }
      // 送假名後的助詞（お支払いは、違いが）
      if (after && cur && cur.length <= 2 && out.length === 0 && /[いりちきしみえけべれぎじびひげせねめ]$/.test(cur) && /^[はをがもに]./.test(rest) && !/^が[るりれろっ]/.test(rest) && !/^も[のっ]/.test(rest)) { unit(rest[0], true); i++; can = false; continue; }
      if (te || suru) { begin(te || suru); i += (te || suru).length; continue; }
      // 〜ばいい／〜ばよろしい
      const ba = /ば$/.test(cur) && (rest.match(/^(いい|よろしい)/) || [])[0];
      if (ba) { begin(ba); i += ba.length; continue; }
      // ても＋いい
      if (/[てで]$/.test(cur) && /^も(いい|よろし|かまい|だいじょうぶ)/.test(rest)) { unit('も', true); i++; continue; }
      // 句尾 か／よ／ね
      const lw = cur || (out.length ? out[out.length - 1].k : '') || (after && i === 0 ? 'す' : ''), f = lw && !nextK && (rest.match(/^(か|よね|よ|ね)$/) || [])[0];
      if (f && /[すうんたるいだて]$/.test(lw)) { unit(f); i += f.length; continue; }
      // 段尾：動詞後的接續助詞（〜から、〜と）
      const cj = cur && CONJ.find(x => rest === x || (nextK && /^[おご]$/.test(rest.slice(x.length)) && rest.startsWith(x)));
      if (cj && /[うくすつぬふむるぐぶいただ]$/.test(cur)) { unit(cj, true); i += cj.length; continue; }
      // 段尾單字助詞（お待ちの、使い方を…）
      const pre1 = nextK && rest.length === 2 && /[おご]$/.test(rest) ? rest[0] : rest;
      if (!after && nextK && last && (cur.length >= 2 && 'はをがも'.includes(rest) || cur.length >= 3 && rest === 'の')) { unit(rest, true); i++; continue; }
      if (after && cur && ((last || pre1.length === 1) && 'のをはがにでへとやも'.includes(pre1) || ['だけ', 'まで', 'など', 'しか'].includes(rest)) && !(pre1 === 'で' && /[んい]$/.test(cur)) && !(pre1 === 'も' && !/[いきしちにひみりぎじびえけせてねべめれ]$/.test(cur)) && !/っ$/.test(cur)) { unit(pre1, true); i += pre1.length; continue; }
      // 漢字前的 お／ご 接頭
      if (nextKanji && last && /[おご]/.test(rest)) { unit(rest, false, { pre: true }); i++; continue; }
      // 漢字後接「お〜」：是另一個詞（鮭おにぎり），不是送假名
      if (!cur) curSp = !(i === 0 && after && !(h[0] === 'お' && h.length >= 3));
      cur += h[i]; i++;
    }
    flush();
    return out;
  }
  // 4 字以上的漢字串：有載入 JPText（斷詞）時切成詞（夜間｜特別｜拝観 → yakan tokubetsu haikan）；讀音要能完全對上才切
  function splitCompound(jp, kana) {
    const J = typeof window !== 'undefined' && window.JPText;
    if (!jp || jp.length < 4 || !J || !J.size || typeof J.tokenize !== 'function') return null;
    try {
      const tk = J.tokenize(jp); if (tk.length < 2 || tk.filter(t => !t.known).length > 1) return null;
      const K = toH(kana), out = []; let pos = 0;
      for (let i = 0; i < tk.length; i++) {
        const t = tk[i], k = t.known ? toH(t.kana || t.bkana || '') : '';
        if (t.known && k && K.startsWith(k, pos)) { out.push(k); pos += k.length; continue; }
        if (t.known && i < tk.length - 1) return null;   // 讀音對不上：只有最後一個詞可以改用剩下的讀音（北海道限定生 → なま）
        // 字典沒有的詞（拝観）：讀音＝到下一個已知詞之前的部分
        const nx = tk[i + 1], nk = nx ? toH(nx.kana || nx.bkana || '') : '';
        const end = nx ? K.indexOf(nk, pos + 1) : K.length;
        if (end <= pos) return null;
        out.push(K.slice(pos, end)); pos = end;
      }
      return pos === K.length ? out : null;
    } catch (e) { return null; }
  }
  function romajiJP(kana, jp) {
    // 〜（填空處）當作一個名詞：〜へは → ~ e wa
    const T = s => s.replace(/[〜~～]/g, 'ヴヴ');
    kana = T(String(kana || '')); jp = T(arabic(String(jp || ''), String(kana || '')));
    let segs = jp ? align(kana, jp) : null;
    // 整句對不齊：逐句／逐段再對；某段還是對不齊就用假名＋助詞規則（不整句黏成一串）
    if (!segs && jp) {
      const cut = t => t.split(/(?<=[、。！？!?])/).filter(Boolean), js = cut(jp), ks = cut(kana);
      if (js.length === ks.length && js.length > 1) segs = js.flatMap((x, i) => align(ks[i], x) || [{ t: 'F', k: ks[i] }]);
    }
    if (!segs) segs = [{ t: 'F', k: kana }];
    segs = segs.map(s => s.t === 'N' && /^[何]$/.test(s.s) ? Object.assign({}, s, { t: 'K' }) : s);
    // 〜用（お土産用、子供用）：用字獨立一段，羅馬字寫成 omiyage you
    segs = segs.flatMap(s => s.t === 'K' && /^.+用$/.test(s.s || '') && /よう$/.test(toH(s.k)) ? [Object.assign({}, s, { s: s.s.slice(0, -1), k: s.k.slice(0, -2), n: (s.n || s.s.length) - 1 }), { t: 'K', s: '用', k: s.k.slice(-2), n: 1 }] : [s]);
    const isKN = t => t === 'K' || t === 'N';
    const units = [];
    segs.forEach((s, i) => {
      const prev = segs[i - 1], next = segs[i + 1];
      if (s.t === 'P') { units.push({ k: s.k, p: true }); return; }
      if (s.t === 'F') { units.push({ raw: kanaRoma(s.k) }); return; }
      if (s.t === 'K' || s.t === 'N' || s.t === 'T') {
        const pu = units[units.length - 1];
        // 平假名名詞＋單一漢字（わらび餅、うに丼、たこ焼き）：視為一個詞
        const nx = segs[i + 1], tail = !nx || nx.t === 'P' || (nx.t === 'H' && /^[はがをにでともの、。きけ]/.test(nx.k));
        const noun = pu && pu.whole && !pu.lex && !pu.part && pu.k.length >= 2 && s.t === 'K' && s.n === 1 && tail;
        const sp0 = s.s === '用' || !(pu && !pu.p && (pu.pre || pu.glue || noun));   // 〜用（お土産用）斷開
        const cp = s.t === 'K' ? splitCompound(s.s, s.k) : null;   // 複合漢語（夜間特別拝観）用斷詞切開
        if (cp) { cp.forEach((k, j) => units.push({ k, num: '', sp: j ? true : sp0 })); return; }
        units.push({ k: s.k, num: s.t === 'N' ? s.s : '', sp: sp0 });
        return;
      }
      const after = !!(prev && (isKN(prev.t) || prev.t === 'T')) && !(prev && prev.t === 'N' && /^(います|いる|いた|あります|ある|ください|です|でした|だ|で|も|と|が|は|を|に|しか|だけ|ずつ|お願い)/.test(toH(s.k))), nextK = !!(next && (isKN(next.t) || next.t === 'T'));
      const hs = toH(s.k).replace(/(?<=[ぁ-ゖー])を(?=[ぁ-ゖ])/g, ' を ').split(/([、。！？!?\s]+)/);
      // 平假名段若原本是片假名讀音（對齊失敗時）照原字
      hs.forEach((h, j) => {
        if (!h) return;
        if (j % 2) { units.push({ k: h, p: true }); return; }
        const a = after && j === 0, nk = nextK && j === hs.length - 1;
        // 單一送假名夾在兩個漢字間（乗り場、焼き鳥）：不斷開
        if (a && nk && h.length === 1 && /^[きしちひみりけべめれぎじびえ]$/.test(h) && !/^[一二三四五六七八九十百千0-9０-９申]/.test(segs[i + 1].s || '')) { units.push({ k: h, sp: false, glue: true }); return; }
        const us = splitH(h, a, nk, prev && isKN(prev.t) ? prev.n : 0, prev && prev.t === 'T', nk && isKN(next.t));
        const lu = us[us.length - 1];
        if (nk && lu && (us.length > 1 || !a) && !lu.part && !lu.lex && !/[いなたるうすくてだ]$/.test(lu.k)) lu.whole = true;
        us.forEach(u => units.push(u));
      });
    });
    let out = '';
    units.forEach(u => {
      if (u.p) { out += conv(u.k); return; }
      if (u.raw != null) { out += (out && !/\s$/.test(out) ? ' ' : '') + u.raw; return; }
      const r = u.part && P_RO[u.k] ? P_RO[u.k] : u.num ? numRoma(u.num, u.k) : conv(u.k);
      if (!r) return;
      out += (u.sp && out && !/\s$/.test(out) ? ' ' : '') + r;
    });
    out = out.replace(/\s+([,.?!])/g, '$1').replace(/\s+/g, ' ').trim();
    GLUE.forEach(([a, b]) => { out = out.replace(a, b); });
    out = out.replace(/vuvu/g, '~');
    out = out.replace(/([a-z]{3,}?)(nai|eru|iru|aru|uru)you ni\b/g, '$1$2 you ni').replace(/\s+/g, ' ');
    out = out.replace(/([a-z])jihan(?![a-z])/g, '$1ji han');
    return out;
  }
  // 固定說法（專有名詞）不拆
  const GLUE = [[/\bmaku no uchi\b/g, 'makunouchi'], [/\bocha no mizu\b/g, 'ochanomizu']];
  // 對不齊時的備援：只有假名，用助詞規則斷詞（は／へ／を → wa／e／o）
  function kanaRoma(k) {
    const t = toH(String(k || ''))
      .replace(/を/g, ' を ')
      .replace(/(.)は(?=あり|ない|どこ|いくら|なん|なに|つかえ|いりません|だいじょうぶ|できます|こちら|これ|ここ|、|どう|いつ|もう|すこし|ちょっと|[一-龯])/g, '$1 は ')
      .replace(/(.)へ(?=は|いき|の|どう)/g, '$1 へ ')
      .replace(/(.)(ください|でしょうか|ですか|です|ありますか|ありません|ますか)(?=[、。！？\s]|$)/g, '$1 $2')
      .replace(/(です|ます)か(?=[、。！？\s]|$)/g, '$1 か')
      .replace(/(まで|から)(?=[^、。！？\s])/g, '$1 ');
    return t.split(/\s+/).filter(Boolean).map(w => w === 'は' ? 'wa' : w === 'へ' ? 'e' : w === 'を' ? 'o' : conv(w)).join(' ');
  }
  // 全站唯一的羅馬字：romaji(kana, jp)；也接受 (jp, kana)（第一個參數有漢字或數字、第二個沒有時自動對調）
  // 平假名寫的外來語（かーど、こーひー）先轉成片假名，長音符才不會在分詞時被吃掉
  // 評審 v18：平假名寫的外來語（ぷろじぇくと、ふぁいる）含 ぁぃぇぉゔ 小字，也當外來語整詞，免得 と 被切成助詞
  const toKataRun = m => m.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const hiraLong = t => String(t).replace(/[ぁ-ゖ]+ー[ぁ-ゖー]*/g, toKataRun).replace(/^[ぁ-ゖ]*[ぁぃぇぉゔ][ぁ-ゖ]*$/, toKataRun);
  function romaji(s, jp) {
    s = hiraLong(s == null ? '' : s);
    if (jp != null) jp = hiraLong(jp);
    if (jp != null && jp !== '') {
      jp = String(jp);
      if (/[一-鿿々0-9０-９]/.test(s) && !/[一-鿿々]/.test(jp)) [s, jp] = [jp, s];
      return romajiJP(s, jp);
    }
    return /[一-鿿々]/.test(s) ? '' : romajiJP(s, s);
  }
  function conv(s) {
    s = String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
    let out = '', geminate = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i], nx = s[i + 1] || '';
      if (c === 'っ') { geminate = true; continue; }
      if (c === 'ー') { const v = out.match(/[aiueo]$/); if (v) out += v[0]; continue; }
      let r = RO[c];
      if (r == null) { out += PUNC[c] != null ? PUNC[c] : c; geminate = false; continue; }
      if (nx && 'ゃゅょ'.includes(nx) && /[きぎしじちぢにひびぴみり]/.test(c)) { r = (/[しじち]/.test(c) ? r.slice(0, -1) : r.slice(0, -1)) + ({ ゃ: 'ya', ゅ: 'yu', ょ: 'yo' })[nx]; if (/^(sh|ch|j)y/.test(r)) r = r.replace('y', ''); i++; }
      else if (nx && 'ぁぃぅぇぉ'.includes(nx) && /[ふゔてでうしちじつと]/.test(c)) { r = (c === 'う' ? 'w' : r.replace(/[aiueo]$/, '')) + RO[nx]; i++; }
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

  window.Phrase = { CNT, count, yen, yenKana, REG, STYLES, make, check, chunk, INTENTS, spoken, romaji, conv, GLOSS };
})();
