/* 旅遊會話手冊：依情境分類、中日文／羅馬字搜尋（含同義詞）、每句語音、全螢幕「給店員看」。
   路由：phrasebook（nav:false，從首頁或店內 📖 進入）。參數：App.go('phrasebook', {q:'關鍵字'}) 或 {cat:'eat'}（cat 也可給場景 id，如 'konbini'）。
   資料：⭐ 必備句（本檔 MUST）＋ SCENES 的 phrases / vocab ＋ 冒險世界 WORLD 各店（搜尋時才載入全部地區）。
   零基礎或提示「全部顯示」時，每句加羅馬字；kana 欄保留片假名。 */
(function () {
  'use strict';
  const esc = App.esc;
  const CATS = [
    ['must', '⭐ 必備', []],
    ['emer', '🆘 緊急', ['emergency']],
    ['move', '🚃 交通', ['airport', 'station', 'directions']],
    ['eat', '🍜 點餐', ['ramen', 'izakaya', 'yakiniku', 'cafe']],
    ['shop', '🛍️ 購物', ['konbini', 'drugstore', 'clothes']],
    ['stay', '🏨 住宿', ['hotel']],
    ['see', '⛩️ 觀光', ['shrine']]
  ];
  const UI = { cat: 'must', q: '' };

  /* ---------- ⭐ 必備句（旅遊最常用；romaji 用長音符號） ---------- */
  const MUST = [
    ['shop', 'これはいくらですか。', 'これはいくらですか', 'kore wa ikura desu ka', '這個多少錢？', '指著商品問價錢'],
    ['shop', '全部でいくらですか。', 'ぜんぶでいくらですか', 'zenbu de ikura desu ka', '全部多少錢？', '結帳前確認總金額'],
    ['shop', 'カードで払えますか。', 'カードではらえますか', 'kādo de haraemasu ka', '可以刷卡嗎？', '結帳前先問能不能刷信用卡'],
    ['shop', 'カードでお願いします。', 'カードでおねがいします', 'kādo de onegai shimasu', '我要刷卡。', '店員問「お支払いは？」時'],
    ['shop', '現金でお願いします。', 'げんきんでおねがいします', 'genkin de onegai shimasu', '我付現金。', '店員問付款方式時'],
    ['shop', '免税できますか。', 'めんぜいできますか', 'menzei dekimasu ka', '可以免稅（退稅）嗎？', '藥妝店、百貨公司；通常同一天同一店滿 5,000 日圓（未稅），要出示護照'],
    ['shop', 'パスポートはこれです。', 'パスポートはこれです', 'pasupōto wa kore desu', '這是我的護照。', '辦免稅、飯店入住時'],
    ['shop', '袋はいりません。', 'ふくろはいりません', 'fukuro wa irimasen', '不用袋子。', '塑膠袋要付費，不需要就這樣說'],
    ['shop', '領収書をください。', 'りょうしゅうしょをください', 'ryōshūsho o kudasai', '請給我收據（發票）。', '要報帳用的正式收據'],
    ['shop', 'レシートをください。', 'レシートをください', 'reshīto o kudasai', '請給我明細（收據）。', '一般購物明細'],
    ['shop', '試着してもいいですか。', 'しちゃくしてもいいですか', 'shichaku shite mo ii desu ka', '可以試穿嗎？', '服飾店'],
    ['eat', '一人です。', 'ひとりです', 'hitori desu', '一位（一個人）。', '進餐廳店員問「何名様ですか」時'],
    ['eat', '二人です。', 'ふたりです', 'futari desu', '兩位。', '進餐廳店員問人數時'],
    ['eat', '持ち帰りでお願いします。', 'もちかえりでおねがいします', 'mochikaeri de onegai shimasu', '外帶（打包帶走）。', '店員問「店内でお召し上がりですか」時'],
    ['eat', '店内で食べます。', 'てんないでたべます', 'tennai de tabemasu', '內用。', '速食、咖啡店點餐時'],
    ['eat', '残りを持ち帰ってもいいですか。', 'のこりをもちかえってもいいですか', 'nokori o mochikaette mo ii desu ka', '剩下的可以打包嗎？', '吃不完時（有些店不提供）'],
    ['eat', 'ベジタリアンです。', 'ベジタリアンです', 'bejitarian desu', '我吃素（素食者）。', '點餐前先告訴店員'],
    ['eat', '肉は食べられません。', 'にくはたべられません', 'niku wa taberaremasen', '我不能吃肉。', '素食、宗教或飲食限制'],
    ['eat', 'アレルギーがあります。', 'アレルギーがあります', 'arerugī ga arimasu', '我會過敏。', '接著說食物名，例：えびアレルギーです（蝦子過敏）'],
    ['eat', '辛くしないでください。', 'からくしないでください', 'karaku shinaide kudasai', '請不要做辣的（不要辣）。', '點拉麵、咖哩、韓式料理時'],
    ['eat', '中国語のメニューはありますか。', 'ちゅうごくごのメニューはありますか', 'chūgokugo no menyū wa arimasu ka', '有中文菜單嗎？', '入座後問'],
    ['eat', '英語のメニューはありますか。', 'えいごのメニューはありますか', 'eigo no menyū wa arimasu ka', '有英文菜單嗎？', '沒有中文菜單時'],
    ['eat', 'おすすめは何ですか。', 'おすすめはなんですか', 'osusume wa nan desu ka', '推薦什麼？', '不知道點什麼時'],
    ['eat', 'これをください。', 'これをください', 'kore o kudasai', '請給我這個。', '指著菜單或商品'],
    ['eat', 'お会計をお願いします。', 'おかいけいをおねがいします', 'okaikei o onegai shimasu', '麻煩結帳（買單）。', '吃完要付錢時'],
    ['move', '〜へはどう行けばいいですか。', '〜へはどういけばいいですか', '~ e wa dō ikeba ii desu ka', '請問〜怎麼去？', '把〜換成地名，例：駅へはどう行けばいいですか'],
    ['move', '駅はどこですか。', 'えきはどこですか', 'eki wa doko desu ka', '車站在哪裡？', '問路'],
    ['move', 'この電車は〜に行きますか。', 'このでんしゃは〜にいきますか', 'kono densha wa ~ ni ikimasu ka', '這班電車有到〜嗎？', '上車前確認'],
    ['move', 'チャージしたいです。', 'チャージしたいです', 'chāji shitai desu', '我想儲值（加值）。', 'Suica、ICOCA 等交通卡；售票機或便利商店收銀台都能儲值'],
    ['move', '〜までお願いします。', '〜までおねがいします', '~ made onegai shimasu', '請到〜。', '搭計程車時說目的地'],
    ['stay', 'チェックインをお願いします。', 'チェックインをおねがいします', 'chekkuin o onegai shimasu', '我要辦入住。', '飯店櫃台'],
    ['stay', '荷物を預けられますか。', 'にもつをあずけられますか', 'nimotsu o azukeraremasu ka', '可以寄放行李嗎？', '入住前、退房後'],
    ['stay', 'Wi-Fiのパスワードは何ですか。', 'ワイファイのパスワードはなんですか', 'waifai no pasuwādo wa nan desu ka', 'Wi-Fi 密碼是什麼？', '飯店、咖啡店'],
    ['see', '写真を撮ってもいいですか。', 'しゃしんをとってもいいですか', 'shashin o totte mo ii desu ka', '可以拍照嗎？', '寺廟、店內拍照前先問'],
    ['emer', 'トイレはどこですか。', 'トイレはどこですか', 'toire wa doko desu ka', '廁所在哪裡？', '任何地方'],
    ['emer', '日本語が分かりません。', 'にほんごがわかりません', 'nihongo ga wakarimasen', '我不懂日文。', '聽不懂時'],
    ['emer', 'もう一度お願いします。', 'もういちどおねがいします', 'mō ichido onegai shimasu', '請再說一次。', '沒聽清楚時'],
    ['emer', 'ゆっくり話してください。', 'ゆっくりはなしてください', 'yukkuri hanashite kudasai', '請說慢一點。', '對方說太快時'],
    ['emer', 'ここに書いてください。', 'ここにかいてください', 'koko ni kaite kudasai', '請寫在這裡。', '聽不懂時請對方寫下來（漢字常看得懂）']
  ].map(([cat, jp, kana, romaji, zh, use]) => ({ cat, jp, kana, romaji, zh, use, src: '⭐ 必備' }));

  /* ---------- 同義詞：查其中一個，其他也一起找 ---------- */
  const SYN = [
    ['儲值', '加值', '充值', 'チャージ', 'charge', 'chaji', 'chāji'],
    ['退稅', '免稅', '免税', 'めんぜい', 'menzei', 'tax free', 'taxfree'],
    ['外帶', '打包', '帶走', '持ち帰り', '持ち帰', 'もちかえり', 'テイクアウト', 'mochikaeri', 'takeout'],
    ['刷卡', '信用卡', 'カード', 'クレジット', 'kado', 'kādo', 'credit'],
    ['發票', '收據', '收執聯', '領収書', 'りょうしゅうしょ', 'レシート', 'ryoshusho', 'ryōshūsho', 'receipt'],
    ['多少錢', '價錢', '價格', '幾錢', 'いくら', 'ikura', '値段'],
    ['素食', '吃素', '素食者', 'ベジタリアン', 'vegetarian', '肉は食べられません'],
    ['不要辣', '不辣', '辣', '辛く', '辛い', 'からい', 'karai'],
    ['怎麼去', '怎麼走', '怎麼到', 'どう行けば', '行き方', 'ikeba'],
    ['中文', '中文菜單', '中國語', '中国語', 'ちゅうごくご', 'chugokugo'],
    ['一位', '一個人', '一人', 'ひとり', 'hitori'],
    ['兩位', '兩個人', '二人', 'ふたり', 'futari'],
    ['廁所', '洗手間', '化妝室', 'トイレ', 'お手洗い', 'toire'],
    ['wifi', 'wi-fi', '網路', 'ワイファイ', 'パスワード'],
    ['塑膠袋', '袋子', 'レジ袋', '袋', 'ふくろ', 'fukuro'],
    ['過敏', 'アレルギー', 'arerugi'],
    ['寄物', '寄放', '行李', '荷物', 'コインロッカー', '預け'],
    ['結帳', '買單', '會計', '会計', 'お会計', 'kaikei'],
    ['付現', '現金', 'げんきん', 'genkin'],
    ['菜單', 'メニュー', 'menyu'],
    ['推薦', 'おすすめ', 'osusume'],
    ['拍照', '照相', '写真', 'しゃしん', 'shashin'],
    ['入住', 'チェックイン', 'checkin'],
    ['退房', 'チェックアウト', 'checkout']
  ];
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'’\-・]/g, '');
  const SYN_N = SYN.map(g => g.map(norm));
  function terms(q) {
    const n = norm(q), out = new Set([n]);
    if (!n) return [];
    const minPart = /^[\x00-\x7f]+$/.test(n) ? 4 : 2;   // 羅馬字要打夠長才用「部分符合」展開，避免 ka 帶出一堆
    SYN_N.forEach(g => { if (g.some(t => t.length >= 2 && (n.includes(t) || (n.length >= minPart && t.includes(n))))) g.forEach(t => out.add(t)); });
    return [...out].filter(Boolean);
  }

  /* ---------- 讀音：片假名保留、羅馬字 ---------- */
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  // 資料的 kana 欄常把片假名寫成平假名（かーど）：依 jp 的片假名段落還原
  function kataKana(jp, kana) {
    if (!kana) return '';
    let out = String(kana), pos = 0;
    (String(jp || '').match(/[ァ-ヺー]+/g) || []).forEach(run => {
      if (/^ー+$/.test(run)) return;
      const h = toHira(run), i = out.indexOf(h, pos);
      if (i >= 0) { out = out.slice(0, i) + run + out.slice(i + h.length); pos = i + run.length; }
    });
    return out;
  }
  const bare = s => String(s || '').replace(/[、。！？!?\s「」]/g, '');
  const kanaOf = w => { const k = kataKana(w.jp, w.kana); return k && bare(k) !== bare(w.jp) ? k : ''; };
  // 助詞讀音與斷詞（簡易）：を→o、常見位置的は→wa／へ→e，句尾「です・ください」前加空格，讓羅馬字好念
  function particles(k) {
    return String(k)
      .replace(/を/g, ' お ')
      .replace(/(.)は(?=あり|ない|どこ|いくら|なん|なに|おもち|つかえ|ごりよう|いりません|だいじょうぶ|できます|こちら|これ|ここ|、|どう|いつ|もう|すこし|ちょっと)/g, '$1 わ ')
      .replace(/(.)へ(?=は|いき|の|どう)/g, '$1 え ')
      .replace(/(.)(ください|ですか|です|ありますか|ありません|ますか|でしょうか)(?=[、。！？\s]|$)/g, '$1 $2')
      .replace(/(です|ます)か(?=[、。！？\s]|$)/g, '$1 か')
      .replace(/(.)もいい/g, '$1 も いい')
      .replace(/([でにが])(?=お[ねかしもま])/g, '$1 ')
      .replace(/([ァ-ヺー])(?=[ぁ-ゖ])/g, '$1 ')     // 片假名→平假名交界（外來語＋助詞）
      .replace(/([ぁ-ゖ])(?=[ァ-ヺ])/g, '$1 ');
  }
  function romOf(w) {
    if (w.romaji) return w.romaji;
    if (w._r != null) return w._r;
    let r = '';
    try {
      const K = window.ReviewAPI && ReviewAPI.kanaToRomaji;
      const src = w.kana || (/^[぀-ヿー、。！？\s〜]+$/.test(w.jp || '') ? w.jp : '');
      if (K && src) r = particles(src).split('〜').map(x => K(x)).join(' ~ ');
    } catch (e) { r = ''; }
    return (w._r = r.replace(/\s+/g, ' ').trim());
  }
  const showRom = () => { const p = App.profile(); return p.lv === 'zero' || p.assist === 'full'; };

  (function css() {
    if (document.getElementById('css-pb')) return;
    const s = document.createElement('style'); s.id = 'css-pb';
    s.textContent = `
.pb{max-width:720px;margin:0 auto;padding:6px 4px 48px}
.pb h1{font-size:var(--fs-xl);margin:6px 0 10px}
.pb-search{width:100%;font:inherit;font-size:var(--fs-md);padding:12px 16px;border-radius:var(--r-pill);border:1px solid var(--line2);background:var(--card);color:var(--text);min-height:48px}
.pb-cats{display:flex;gap:6px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.pb-cats::-webkit-scrollbar{display:none}
.pb-cats button{flex:none;border:1px solid var(--line2);border-radius:var(--r-pill);background:var(--card);color:var(--text);font:inherit;font-weight:800;padding:8px 16px;min-height:44px;cursor:pointer}
.pb-cats button.on{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}
.pb-cats button.emer:not(.on){background:var(--pri-t);color:var(--pri-d)}
.pb h2{font-size:var(--fs-md);margin:18px 0 6px}
.pb-row{display:flex;gap:10px;align-items:flex-start;background:var(--card);border-radius:var(--r-m);box-shadow:var(--shadow);padding:10px 12px;margin:8px 0}
.pb-say,.pb-show{flex:none;border:none;border-radius:50%;width:44px;height:44px;font-size:1.15em;cursor:pointer;background:var(--pri-t);color:var(--pri)}
.pb-t{flex:1;min-width:0}
.pb-t p{margin:0}
.pb-t .jp{font-size:var(--fs-lg);font-weight:700;word-break:keep-all;overflow-wrap:anywhere}
.pb-t .k{color:var(--muted);font-size:var(--fs-sm)}
.pb-t .rm{color:var(--acc-d);font-size:var(--fs-sm);font-weight:700}
.pb-t .zh{font-size:var(--fs-md)}
.pb-t .use,.pb-t .src{color:var(--muted);font-size:var(--fs-xs)}
.pb-act{display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.pb-act .track-btn{font-size:var(--fs-xs);padding:2px 10px}
.pb details{margin:10px 0}
.pb summary{cursor:pointer;font-weight:800;min-height:44px;display:flex;align-items:center}
.pb-voc{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.pb-voc button{border:none;background:var(--card);box-shadow:var(--shadow);border-radius:var(--r-m);padding:8px 10px;text-align:left;font:inherit;color:var(--text);cursor:pointer;min-height:44px}
.pb-voc b{display:block}.pb-voc small{display:block;color:var(--muted);font-size:var(--fs-xs)}
.pb-empty,.pb-load{color:var(--muted);text-align:center;margin:20px 0}
.pb-more{color:var(--muted);font-size:var(--fs-sm);text-align:center}
.pb-full{position:fixed;inset:0;z-index:300;background:var(--card);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;cursor:pointer}
.pb-full .big{font-size:var(--pbz,clamp(2.8rem,15vw,7rem));font-weight:800;line-height:1.25;word-break:keep-all;overflow-wrap:anywhere;font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif}
.pb-full .kk{font-size:1.5rem;color:var(--muted);margin-top:12px}
.pb-full .rr{font-size:1.3rem;color:var(--acc-d);font-weight:700;margin-top:6px}
.pb-full .zz{font-size:1.3rem;color:var(--muted);margin-top:18px}
.pb-full .x{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;width:48px;height:48px;border-radius:50%;border:1px solid var(--line2);background:var(--card);color:var(--text);font-size:1.3em;cursor:pointer}
.pb-full .tip{position:absolute;bottom:calc(20px + env(safe-area-inset-bottom,0px));font-size:var(--fs-sm);color:var(--muted)}`;
    document.head.appendChild(s);
  })();

  const scenes = () => (window.SCENES || []).filter(s => s && s.id);
  const sceneOf = id => scenes().find(s => s.id === id);

  /* ---------- 冒險世界：各店的回答、請求、詢問、品項 → 可搜尋的句子 ---------- */
  let WIDX = null, WN = -1, wLoad = null, wDone = false;
  function worldIdx() {
    const W = window.WORLD;
    if (!W || !W.shops) return [];
    const ids = Object.keys(W.shops);
    if (WIDX && WN === ids.length) return WIDX;
    WIDX = []; WN = ids.length;
    const seen = new Set(MUST.map(w => bare(w.jp)));
    const regName = id => { const r = (W.regions || []).find(x => x.id === id); return r ? r.name : ''; };
    ids.forEach(id => {
      const s = W.shops[id]; if (!s) return;
      const src = '📍 ' + [regName(s.region), s.name].filter(Boolean).join('・');
      const add = (jp, kana, zh, use, kind) => {
        if (!jp) return; const k = bare(jp); if (seen.has(k)) return; seen.add(k);
        WIDX.push({ jp, kana: kana || '', zh: zh || '', use, src, kind });
      };
      (s.asks || []).forEach(a => (a.a || []).forEach(x => x && add(x.jp, x.kana, x.zh, a.zh ? `店員問「${a.zh}」時回答` : '回答店員', 'a')));
      (s.acts || []).forEach(x => x && x.jp && add(x.jp + 'ください。', x.kana ? x.kana + 'ください' : '', '請' + (x.zh || ''), '請店員幫忙', 'act'));
      (s.may || []).forEach(x => x && x.jp && add(x.jp + 'もいいですか。', x.kana ? x.kana + 'もいいですか' : '', '可以' + (x.zh || '') + '嗎？', '先問可不可以', 'may'));
      (s.info || []).forEach(x => x && x.q && add(x.q.jp, x.q.kana, x.q.zh, '問店家', 'info'));
      (s.items || []).forEach(x => {
        if (!x || !x.jp) return;
        const kn = x.kana || '', price = x.price ? `（約 ${x.price} 日圓）` : '';
        if ((x.tags || []).includes('dest')) { add(x.jp + 'へ行きたいです。', kn && kn + 'へいきたいです', '我想去' + (x.zh || ''), '說目的地', 'item'); return; }
        add(x.jp + 'をください。', kn && kn + 'をください', '請給我' + (x.zh || ''), '點餐・購物' + price, 'item');
        add(x.jp + 'はありますか。', kn && kn + 'はありますか', '有' + (x.zh || '') + '嗎？', '找東西', 'item');
      });
    });
    return WIDX;
  }
  // 搜尋時才載入全部地區的資料（約 1.5MB，只載一次；World.loadRegion 會去重）
  function loadWorld() {
    if (wLoad) return wLoad;
    const W = window.WORLD;
    if (!W || !W.regions) { wDone = true; return (wLoad = Promise.resolve()); }
    const one = r => (window.World && typeof World.loadRegion === 'function')
      ? Promise.resolve(World.loadRegion(r.id)).catch(() => { })
      : (r.files || []).reduce((p, f) => p.then(() => App.loadScript('data/world/' + f + '.js').catch(() => { })), Promise.resolve());
    return (wLoad = Promise.all(W.regions.map(one)).then(() => { wDone = true; WIDX = null; }));
  }

  /* ---------- 列表 ---------- */
  let KEYS = [];
  const key = w => { KEYS.push(w); return KEYS.length - 1; };
  function row(w, srcName) {
    const k = key(w), kn = kanaOf(w), rm = showRom() ? romOf(w) : '';
    const it = App.wordItem({ jp: w.jp, kana: kn || w.kana, romaji: romOf(w), zh: w.zh, hint: w.hint }, srcName || w.src || '手冊', 'phrase');
    return `<div class="pb-row"><button type="button" class="pb-say" data-say="${k}" aria-label="播放">🔊</button>
      <div class="pb-t"><p class="jp" lang="ja">${esc(w.jp)}</p>${kn ? `<p class="k" lang="ja">${esc(kn)}</p>` : ''}${rm ? `<p class="rm">${esc(rm)}</p>` : ''}<p class="zh">${esc(w.zh)}</p>${w.use ? `<p class="use">🕒 ${esc(w.use)}</p>` : ''}${w.src && !srcName ? `<p class="src">${esc(w.src)}</p>` : ''}</div>
      <div class="pb-act"><button type="button" class="pb-show" data-show="${k}" aria-label="放大給店員看">📢</button>${App.trackBtn(it, true)}</div></div>`;
  }
  const vocab = w => { const k = key(w), kn = kanaOf(w), rm = showRom() ? romOf(w) : ''; return `<button type="button" data-say="${k}"><b lang="ja">${esc(w.jp)}</b><small>${esc([kn, rm].filter(Boolean).join('・'))}</small><small>${esc(w.zh)}</small></button>`; };

  function search(q) {
    const T = terms(q);
    const hay = w => [w.jp, kataKana(w.jp, w.kana), w.kana, romOf(w), w.zh, w.use].map(norm).join('\n');
    const hit = w => { const h = hay(w); return T.some(t => h.includes(t)); };
    const seen = new Set(), ph = [], vo = [];
    const add = (arr, w, src) => { const id = bare(w.jp); if (!id || seen.has(id)) return; seen.add(id); arr.push(src ? Object.assign({}, w, { src: w.src || src }) : w); };
    MUST.filter(hit).forEach(w => add(ph, w));
    scenes().forEach(sc => (sc.phrases || []).filter(hit).forEach(w => add(ph, w, '💬 ' + sc.name)));
    worldIdx().filter(w => w.kind !== 'item').filter(hit).forEach(w => add(ph, w));
    worldIdx().filter(w => w.kind === 'item').filter(hit).forEach(w => add(ph, w));
    const sv = new Set();
    scenes().forEach(sc => (sc.vocab || []).filter(hit).forEach(w => { const id = bare(w.jp); if (sv.has(id)) return; sv.add(id); vo.push(w); }));
    return { ph, vo };
  }

  function list() {
    KEYS = [];
    const q = String(UI.q || '').trim();
    if (q) {
      const { ph, vo } = search(q);
      const loading = !wDone ? `<p class="pb-load">⏳ 正在載入冒險世界各店的句子…</p>` : '';
      if (!ph.length && !vo.length) return loading || `<p class="pb-empty">找不到「${esc(q)}」，換個關鍵字試試（中文、日文、羅馬拼音都可以）</p>`;
      return (ph.length ? `<h2>💬 句子（${ph.length}）</h2>` + ph.slice(0, 60).map(w => row(w)).join('') + (ph.length > 60 ? `<p class="pb-more">只列前 60 句，再多打幾個字縮小範圍</p>` : '') : '') +
        (vo.length ? `<h2>📚 單字（${vo.length}）</h2><div class="pb-voc">${vo.slice(0, 60).map(vocab).join('')}</div>` : '') + loading;
    }
    const cat = CATS.find(c => c[0] === UI.cat) || CATS[0];
    const must = MUST.filter(w => cat[0] === 'must' || w.cat === cat[0]);
    return (must.length ? `<h2>⭐ 必備句</h2>${must.map(w => row(w, '⭐ 必備')).join('')}` : '') +
      cat[2].map(sceneOf).filter(Boolean).map(sc => `<h2>${esc(sc.icon || '')} ${esc(sc.name)}</h2>
      ${(sc.phrases || []).map(w => row(w, sc.name)).join('')}
      <details><summary>📚 常用單字 ${(sc.vocab || []).length} 個</summary><div class="pb-voc">${(sc.vocab || []).map(vocab).join('')}</div></details>`).join('');
  }

  function showBig(w) {
    const d = document.createElement('div');
    d.className = 'pb-full';
    // 字數少就放到最大：依字數算字級（手機橫寬約可放 6～7 字一行）
    const len = String(w.jp).length, kn = kanaOf(w), rm = showRom() ? romOf(w) : '';
    d.style.setProperty('--pbz', `min(${len <= 4 ? 22 : len <= 8 ? 15 : len <= 14 ? 11 : 8.5}vw, ${len <= 4 ? 9 : 6}rem)`);
    d.innerHTML = `<button type="button" class="x" aria-label="關閉">✕</button><div class="big" lang="ja">${esc(w.jp)}</div>${kn ? `<div class="kk" lang="ja">${esc(kn)}</div>` : ''}${rm ? `<div class="rr">${esc(rm)}</div>` : ''}<div class="zz">${esc(w.zh)}</div><div class="tip">點一下或按返回鍵關閉${App.voiceOK && App.voiceOK() === false ? '' : '・🔊 已播放'}</div>`;
    const close = App.layer ? App.layer(d) : (document.body.appendChild(d), () => d.remove());
    d.onclick = () => close();
    App.speak(String(w.kana || w.jp).replace(/〜/g, ''));
  }

  // 參數 cat 可以是分類 id，也可以是場景 id（如 konbini）
  function catOf(c) {
    if (!c) return null;
    if (CATS.some(x => x[0] === c)) return c;
    const hit = CATS.find(x => x[2].includes(c));
    return hit ? hit[0] : null;
  }

  function render(el, params) {
    params = params || {};
    if (params.q != null && String(params.q).trim()) { UI.q = String(params.q); }
    else if (params.cat) { const c = catOf(params.cat); if (c) { UI.cat = c; UI.q = ''; } }
    el.innerHTML = `<section class="pb">
      <h1>📖 旅遊會話手冊</h1>
      <input class="pb-search" type="search" placeholder="搜尋：多少錢、退稅、儲值、ikura、toire…" value="${esc(UI.q)}" aria-label="搜尋會話">
      <div class="pb-cats">${CATS.map(([id, n]) => `<button type="button" data-cat="${id}" class="${id === 'emer' ? 'emer ' : ''}${!UI.q && UI.cat === id ? 'on' : ''}" aria-pressed="${!UI.q && UI.cat === id}">${n}</button>`).join('')}</div>
      <div id="pb-list"></div>${App.voiceHTML ? App.voiceHTML() : ''}</section>`;
    const box = el.querySelector('#pb-list');
    const paint = () => {
      box.innerHTML = list();
      el.querySelectorAll('[data-cat]').forEach(b => { const on = !UI.q && b.dataset.cat === UI.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    };
    const ensureWorld = () => {
      if (wDone || !String(UI.q || '').trim()) return;
      loadWorld().then(() => { if (box.isConnected && String(UI.q || '').trim()) paint(); });
    };
    box.onclick = e => {
      const s = e.target.closest('[data-say]'), b = e.target.closest('[data-show]');
      if (s) { const w = KEYS[+s.dataset.say]; if (w) App.speak(String(w.kana || w.jp).replace(/〜/g, '')); }
      if (b) { const w = KEYS[+b.dataset.show]; if (w) showBig(w); }
    };
    const inp = el.querySelector('.pb-search');
    let t = null;
    inp.oninput = () => { UI.q = inp.value; clearTimeout(t); t = setTimeout(() => { paint(); ensureWorld(); }, 120); };
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { UI.cat = b.dataset.cat; UI.q = ''; inp.value = ''; paint(); window.scrollTo(0, 0); });
    paint(); ensureWorld();
  }

  App.register('phrasebook', { title: '手冊', icon: '📖', nav: false, navParent: 'home', render });
  window.Phrasebook = { MUST, SYN, terms, search: q => search(q).ph, loadWorld, kataKana };
})();
