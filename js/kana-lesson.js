/* 五十音講義＋訓練：會話手冊的「🔤 五十音」分頁（由 phrasebook.js 呼叫）。
   內容來自根目錄舊頁《日文講義.html》《50音訓練表.html》（兩頁保留不刪）。
   window.KanaLesson = { render(box, {sub, ch}), open(sub, ch), search(q, norm) -> {n, html} }
   資料：kana-data.js 的 KANA／DAKU／YOON／GRID／ROW_NAMES。不會清單 id：'kana:<平假名>'。 */
(function () {
  'use strict';
  const esc = App.esc;
  const KA = typeof KANA !== 'undefined' ? KANA : [];
  const DK = typeof DAKU !== 'undefined' ? DAKU : [];
  const YO = typeof YOON !== 'undefined' ? YOON : [];
  const GR = typeof GRID !== 'undefined' ? GRID : [];
  const RN = typeof ROW_NAMES !== 'undefined' ? ROW_NAMES : [];
  const ALL = KA.concat(DK, YO);
  const BY = {}; ALL.forEach(k => { if (!BY[k[0]]) BY[k[0]] = k; });

  const ST = { sub: 'table', sc: 'h', view: 'grid', cover: false, open: {}, qt: 'listen', qp: 'seion', wr: 0 };
  const SUBS = [['table', '📋 50音'], ['daku', '゛濁音'], ['yoon', 'ゃ拗音'], ['lesson', '📘 講義'], ['quiz', '✏️ 練習']];

  const rn = r => String(r || '').replace(/\s*\(.*\)/, '');          // 'o (wo)' → 'o'
  const isKana = k => k && k.length >= 9;
  const other = (k, sc) => sc === 'k' ? k[0] : k[1];
  const glyph = (k, sc) => sc === 'k' ? k[1] : sc === 'h' ? k[0] : (Math.random() < .5 ? k[0] : k[1]);
  const has = id => !!(window.Tracker && Tracker.has(id));
  function itemOf(k) {
    if (isKana(k)) return App.kanaItem(k);
    return { id: 'kana:' + k[0], jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', hint: '', emoji: '', source: '五十音' };
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const kataRow = n => n.replace(/[あかさたなはまやらわん]/, c => BY[c] ? BY[c][1] : c);
  const seg = (attr, list, cur, cls) => `<div class="kn-seg${cls ? ' ' + cls : ''}" role="group">${list.map(([v, n]) => `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${n}</button>`).join('')}</div>`;

  /* ---------- 格子（50音／濁音／拗音共用）：點字發音＋在該列下方展開說明 ---------- */
  function cell(h) {
    if (!h) return '<div class="kn-cell nil" aria-hidden="true"></div>';
    const k = BY[h]; if (!k) return '<div class="kn-cell nil"></div>';
    const main = ST.sc === 'k' ? k[1] : k[0];
    const sm = ST.sc === 'm' ? `<small lang="ja">${esc(k[1])}</small>` : '';
    return `<button type="button" class="kn-cell${ST.cover ? ' cover' : ''}${has('kana:' + h) ? ' trk' : ''}" data-h="${esc(h)}">
      <span class="g" lang="ja">${esc(main)}${sm}</span><span class="r">${esc(rn(k[2]))}</span><span class="x">${esc(k[3])}</span></button>`;
  }
  function grid(rows, cols, head) {
    return `<div class="kn-grid c${cols}">${head ? head.map(x => `<div class="kn-hd">${x}</div>`).join('') : ''}${rows.map((r, i) =>
      r.map(cell).join('') + `<div class="kn-det" data-row="${i}" hidden></div>`).join('')}</div>`;
  }
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n).map(k => k[0])); return o; };
  function detail(k) {
    const kana = isKana(k);
    return `<div class="kn-dbox"><button type="button" class="kn-dbig" data-ks="${esc(k[0])}" aria-label="播放 ${esc(k[0])}"><span lang="ja">${esc(k[0])}</span><span lang="ja">${esc(k[1])}</span></button>
      <div class="kn-dinfo"><p><b class="kn-r">${esc(k[2])}</b> <span class="kn-x">諧音 ${esc(k[3])}</span> ${kana ? esc(k[4]) : ''}</p>
      ${kana ? `<p>平：${esc(k[5])}</p><p>片：${esc(k[6])}</p><p class="kn-src">字源：平「${esc(k[7])}」・片「${esc(k[8])}」</p>` : ''}
      <div class="kn-dact"><button type="button" class="kn-say" data-ks="${esc(k[0])}" aria-label="再聽一次">🔊</button>${App.trackBtn(itemOf(k), true)}</div></div></div>`;
  }

  /* ---------- 50 音表（表格／圖卡） ---------- */
  function cardsHTML() {
    return `<div class="kn-cards">${GR.map((row, i) => `<div class="kn-rl">${esc(ST.sc === 'k' ? kataRow(RN[i]) : RN[i])}</div>` + row.filter(Boolean).map(h => {
      const k = BY[h], kt = ST.sc === 'k';
      return `<div class="kn-card"><button type="button" class="kn-cb" data-ks="${esc(h)}"><span class="e">${esc(k[4])}</span><span class="g" lang="ja">${esc(kt ? k[1] : k[0])}</span><span class="o" lang="ja">${kt ? '平：' : '片：'}${esc(other(k, ST.sc))}</span>
        <span class="r">${esc(k[2])}</span> <span class="x">${esc(k[3])}</span><span class="m">${esc(kt ? k[6] : k[5])}</span><span class="s">字源：${esc(kt ? k[8] : k[7])}</span></button>${App.trackBtn(itemOf(k), true)}</div>`;
    }).join('')).join('')}</div>`;
  }
  function tableTab() {
    return `<p class="kn-lead">點字聽發音、看諧音和聯想；不熟的按「＋不會清單」。「五十音」其實只有 <b>46 個</b>基本音。</p>
      <div class="kn-bar">${seg('kview', [['grid', '表格'], ['card', '圖卡']], ST.view)}
      ${ST.view === 'grid' ? `<label class="kn-chk"><input type="checkbox" data-kcover ${ST.cover ? 'checked' : ''}> 🙈 遮住拼音</label>` : ''}</div>
      ${ST.view === 'grid' ? grid(GR, 5, ['a', 'i', 'u', 'e', 'o']) + `<p class="kn-note">${ST.cover ? '遮住模式：點一下翻開，再點一下看說明。' : '點字展開說明；有圓點的字已在不會清單。'}</p>` : cardsHTML()}`;
  }
  function dakuTab() {
    return `<div class="kn-key">🔑 <b>規則：</b>k→g、s→z、t→d、h→b（加兩點 ゛）；h→p（加小圈 ゜）。只有這 5 行會變！</div>
      <div class="kn-eq" lang="ja"><span>か</span><i>＋</i><span class="hl">゛</span><i>＝</i><span>が</span><span class="sp"></span><span>は</span><i>＋゜＝</i><span>ぱ</span></div>
      <p class="kn-eqn">ka 卡 ＋ 兩點＝聲音變「濁」→ ga 嘎　｜　ha 哈 → pa 趴</p>
      ${grid(chunk(DK, 5), 5)}
      <div class="kn-tip">💡 <span lang="ja">ぢ・づ</span> 發音同 <span lang="ja">じ・ず</span>，很少用，先認得就好。</div>`;
  }
  function yoonTab() {
    return `<div class="kn-key">🔑 <b>拗音：</b>「い段字＋小ゃゅょ」黏在一起，快速唸成<b>一拍</b>。</div>
      <div class="kn-eq" lang="ja"><span>き</span><i>＋</i><span class="hl sm">ゃ</span><i>＝</i><span>きゃ</span></div>
      <p class="kn-eqn">ki ＋ 小寫的 ya ＝ kya「卡呀」快速唸成一拍</p>
      ${grid(chunk(YO, 3), 3)}`;
  }

  /* ---------- 講義（原《日文講義.html》第 1–10 節＋訓練表的書寫練習） ---------- */
  const sayJ = (jp, label) => `<button type="button" class="kn-sj" data-ks="${esc(jp)}" lang="ja">${label || esc(jp)}</button>`;   // label 是本檔寫死的 HTML
  const face = (m, ch, ro, zh) => `<button type="button" class="kn-face" data-ks="${ch}"><svg viewBox="-60 -30 120 120" aria-hidden="true"><circle cx="0" cy="30" r="55" class="sk"/><circle cx="-18" cy="12" r="5" class="ey"/><circle cx="18" cy="12" r="5" class="ey"/>${m}</svg><b lang="ja">${ch} ${ro}</b><small>${zh}</small></button>`;
  const PHR = [
    ['こんにちは', 'konnichiwa', '摳你雞哇', '👋', '你好（白天）'], ['おはよう', 'ohayō', '歐哈腰', '🌅', '早安'],
    ['こんばんは', 'konbanwa', '摳棒哇', '🌙', '晚安（見面時）'], ['おやすみ', 'oyasumi', '歐呀斯咪', '😴', '晚安（睡前）'],
    ['ありがとう', 'arigatō', '阿哩嘎多', '🙏', '謝謝'], ['すみません', 'sumimasen', '斯咪媽線', '🙇', '不好意思／對不起'],
    ['はじめまして', 'hajimemashite', '哈基妹媽西貼', '🤝', '初次見面'], ['よろしく', 'yoroshiku', '喲囉西哭', '😊', '請多指教'],
    ['さようなら', 'sayōnara', '撒喲娜拉', '👋', '再見'], ['いただきます', 'itadakimasu', '衣塔搭ki媽斯', '🍱', '我開動了'],
    ['おいしい', 'oishii', '歐衣西～', '😋', '好吃'], ['かわいい', 'kawaii', '卡哇伊', '🥰', '可愛'],
    ['だいじょうぶ', 'daijōbu', '呆久不', '👌', '沒問題'], ['はい／いいえ', 'hai / iie', '嗨／衣～欸', '⭕❌', '是／不是'],
    ['いくらですか', 'ikura desu ka', '衣哭拉爹斯卡', '💴', '多少錢？'], ['トイレはどこですか', 'toire wa doko desu ka', '偷衣勒哇兜摳爹斯卡', '🚻', '廁所在哪裡？']
  ];
  const NUMS = [['いち', 'ichi', '衣七', '1'], ['に', 'ni', '你', '2'], ['さん', 'san', '桑', '3'], ['よん', 'yon', '腰', '4'], ['ご', 'go', '勾', '5'], ['ろく', 'roku', '摟哭', '6'], ['なな', 'nana', '那那', '7'], ['はち', 'hachi', '哈七', '8'], ['きゅう', 'kyū', 'Q', '9'], ['じゅう', 'jū', '啾', '10']];
  const CONF = [
    ['シ ／ ツ', '<b>シ shi</b>：三點「由下往上」挑，像笑臉 😊<br><b>ツ tsu</b>：三點「由上往下」，像海嘯 🌊落下'],
    ['ソ ／ ン', '<b>ソ so</b>：兩筆都「由上往下」，像針線往下縫<br><b>ン n</b>：最後一筆「由下往上」挑，像打勾 ✔'],
    ['ぬ ／ め', '<b>ぬ nu</b>：尾巴有「圈」→ 麵條捲起來 🍜<br><b>め me</b>：沒有圈 → 眼睛 👁️'],
    ['ね ／ れ ／ わ', '<b>ね ne</b>：尾巴打圈（貓尾巴）🐱<br><b>れ re</b>：尾巴往上翹（跪著的腳）<br><b>わ wa</b>：尾巴往內收（哇！嘴巴）'],
    ['る ／ ろ', '<b>る ru</b>：有圈 🌀　<b>ろ ro</b>：沒圈，平平的路 🛣️'],
    ['さ ／ ち', '方向相反！<b>さ</b>開口朝左下、<b>ち</b>開口朝右（像 5 反過來）'],
    ['は ／ ほ', '<b>ほ</b>右邊多一橫，像聖誕樹「Ho Ho Ho」🎄'],
    ['ク ／ タ ／ ケ', '<b>ク</b>：簡單鳥嘴　<b>タ</b>：多一點（夕）　<b>ケ</b>：右邊出頭像 K'],
    ['ウ ／ ワ ／ フ', '<b>ウ</b>有頭頂一點（屋頂煙囪）、<b>ワ</b>有左邊一豎、<b>フ</b>只有一筆']
  ];
  const PLAN = [
    ['Day 1', 'あ・か・さ 行（15字）', '看圖唸諧音 → 書寫練習每字寫 5 遍'], ['Day 2', 'た・な・は 行（15字）', '複習 Day1 → 新字 → 小練習測驗 1 次'],
    ['Day 3', 'ま・や・ら・わ・ん（16字）', '平假名全部完成！測驗正確率 > 80%'], ['Day 4', '濁音・半濁音・拗音', '只要記「加兩點、加圈圈」規則'],
    ['Day 5', '片假名 ア～ノ', '對照平假名學，特別注意易混淆字'], ['Day 6', '片假名 ハ～ン', '片假名測驗正確率 > 80%'], ['Day 7', '總複習＋生活用語', '平片混合測驗 → 唸出第 8 節所有句子']
  ];
  const tbl = (head, rows) => { const w = Math.max(...rows.map(r => r.length)); return `<div class="kn-tw"><table class="kn-tb">${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th>${c}</th>` : `<td${i === r.length - 1 && r.length < w ? ` colspan="${w - r.length + 1}"` : ''}>${c}</td>`).join('')}</tr>`).join('')}</table></div>`; };

  const CH = [
    ['s1', '1. 日文長什麼樣？三種文字', () => `<p>日文句子裡會混著<b>三種文字</b>，就像一個家裡住了三兄弟：</p>
      <div class="kn-3">
        <div class="kn-sb h"><span class="big" lang="ja">ひらがな</span><b>平假名</b>（大哥・圓圓的）<br>🧸 寫日本原生的字、文法助詞<br>例：${sayJ('ありがとう')}</div>
        <div class="kn-sb k"><span class="big" lang="ja">カタカナ</span><b>片假名</b>（二哥・方方的）<br>🍔 寫外來語、外國名字<br>例：${sayJ('コーヒー')}（coffee）</div>
        <div class="kn-sb j"><span class="big" lang="ja">漢字</span><b>漢字</b>（三弟・我們認識！）<br>📚 跟中文很像，台灣人超有優勢<br>例：${sayJ('学生')}（學生）</div>
      </div>
      <button type="button" class="kn-sent" data-ks="私はコーヒーが好きです。"><span lang="ja"><i class="j">私</i><i class="h">は</i><i class="k">コーヒー</i><i class="h">が</i><i class="j">好</i><i class="h">きです。</i></span><small>＝ 我喜歡咖啡。　<i class="j">■漢字</i> <i class="h">■平假名</i> <i class="k">■片假名</i></small></button>
      <div class="kn-key">🔑 <b>學習順序：</b>平假名 → 片假名 → 生活單字。假名就是日文的「注音符號」，一個假名＝一個音。</div>
      <div class="kn-tip">📌 「五十音」其實只有 <b>46 個</b>基本音（有些位置空掉了），每個音都有平假名和片假名兩種寫法。</div>`],
    ['s2', '2. 先學五個母音：あいうえお', () => `<p>日文只有 <b>5 個母音</b>，所有的音都是「子音＋這 5 個母音」組成。學會這 5 個，等於打通任督二脈！</p>
      <div class="kn-faces">${face('<ellipse cx="0" cy="48" rx="20" ry="18" class="mo"/>', 'あ', 'a', '嘴巴張大「啊」')}${face('<rect x="-24" y="42" width="48" height="8" rx="4" class="mo"/>', 'い', 'i', '嘴角往兩邊拉「衣」')}${face('<ellipse cx="0" cy="48" rx="8" ry="7" class="mo"/>', 'う', 'u', '嘴唇微嘟、不要太圓「屋」')}${face('<ellipse cx="0" cy="47" rx="20" ry="9" class="mo"/>', 'え', 'e', '半開、嘴角稍拉「欸」')}${face('<ellipse cx="0" cy="48" rx="13" ry="14" class="mo"/>', 'お', 'o', '嘴巴圓圓「喔」')}</div>
      <h4>🧩 拼音魔法：子音 × 母音</h4>
      ${tbl(['', 'a 啊', 'i 衣', 'u 屋', 'e 欸', 'o 喔'], [['（無）', 'あ', 'い', 'う', 'え', 'お'], ['k', 'か', 'き', 'く', 'け', 'こ'], ['s', 'さ', 'し', 'す', 'せ', 'そ']].map(r => r.map((c, i) => i ? sayJ(c, c + ' ' + (c === 'し' ? '<b class="kn-em">shi</b>' : rn(BY[c][2]))) : c)))}
      <div class="kn-tip">⚠️ 特例只有幾個要注意：<span lang="ja">し</span>＝shi、<span lang="ja">ち</span>＝chi、<span lang="ja">つ</span>＝tsu、<span lang="ja">ふ</span>＝fu、<span lang="ja">ん</span>＝n。其他都照規則拼！</div>
      <div class="kn-key">🎵 <b>口訣：</b>「<span lang="ja">あいうえお</span>」＝「啊～衣～屋～欸～喔」，把它當成一首歌，每天唸 10 遍。</div>`],
    ['s3', '3. 平假名圖解＋諧音（46 個）', () => `<p>每張卡片：<b>大字＝平假名</b>、<b class="kn-r">拼音</b>、<span class="kn-x">中文諧音</span>、下方＝圖像聯想、灰字＝來自哪個漢字。👆 點卡片聽發音。</p>
      <div class="kn-tip">💡 <b>背法：</b>看字 → 想圖 → 唸諧音 → 聽發音。平假名都是從漢字的「草書」變來的，看字源更好記！</div>
      <button type="button" class="kn-go" data-kopen="card:h">🃏 打開平假名圖卡（46 張）</button>`],
    ['s4', '4. 片假名圖解（46 個）', () => `<p>片假名<b>發音和平假名完全一樣</b>，只是寫法不同。它們大多是取漢字的「一部分」（偏旁），線條比較直、比較硬。</p>
      <div class="kn-eq" lang="ja"><span>加</span><i>→</i><span class="h">か</span><i>／</i><span class="k">カ</span></div>
      <p class="kn-eqn">漢字「加」→ 草書變成平假名「か」／取「力」變成片假名「カ」</p>
      <button type="button" class="kn-go" data-kopen="card:k">🃏 打開片假名圖卡（46 張）</button>`],
    ['s5', '5. 濁音・半濁音：加兩點、加小圈', () => `<div class="kn-eq" lang="ja"><span>か</span><i>＋</i><span class="hl">゛</span><i>＝</i><span>が</span><span class="sp"></span><span>は</span><i>＋゜＝</i><span>ぱ</span></div>
      <p class="kn-eqn">ka 卡 → 兩點＝聲音變「濁」→ ga 嘎；ha 哈 → pa 趴</p>
      <div class="kn-key">🔑 <b>規則：</b>k→g、s→z、t→d、h→b（加兩點 ゛）；h→p（加小圈 ゜）。只有這 5 行會變！</div>
      <div class="kn-tip">💡 <span lang="ja">ぢ・づ</span> 發音同 <span lang="ja">じ・ず</span>，很少用，先認得就好。</div>
      <button type="button" class="kn-go" data-kopen="daku">゛ 看濁音・半濁音表（25 個）</button>`],
    ['s6', '6. 拗音・促音・長音', () => `<h4>① 拗音：「い段字＋小ゃゅょ」黏在一起</h4>
      <div class="kn-eq" lang="ja"><span>き</span><i>＋</i><span class="hl sm">ゃ</span><i>＝</i><span>きゃ</span></div>
      <p class="kn-eqn">ki ＋ 小寫的 ya ＝ kya「卡呀」快速唸成一拍</p>
      <button type="button" class="kn-go" data-kopen="yoon">ゃ 看拗音表（27 個）</button>
      <h4>② 促音：小「っ」＝停一拍（憋氣）</h4>
      <div class="kn-2"><button type="button" class="kn-sb" data-ks="きって"><span class="big" lang="ja">きって</span>kitte 郵票<br>🛑「ki～(憋)～te」</button><button type="button" class="kn-sb" data-ks="きて"><span class="big" lang="ja">きて</span>kite 來<br>沒有停頓</button></div>
      <div class="kn-tip">💡 小「っ」本身不發音，像音樂的「休止符」，佔一拍時間。羅馬拼音寫成重複下一個子音（tt、kk、pp）。</div>
      <h4>③ 長音：拉長一拍</h4>
      ${tbl(null, [['平假名', sayJ('おばさん') + '（阿姨）', sayJ('おばあさん', 'おば<b class="kn-em">あ</b>さん') + '（奶奶）'], ['片假名', '用「ー」表示：' + sayJ('コーヒー', 'コ<b class="kn-em">ー</b>ヒ<b class="kn-em">ー</b>') + '（coffee）、' + sayJ('ケーキ', 'ケ<b class="kn-em">ー</b>キ') + '（cake）']])}
      <div class="kn-key">🔑 長短音會改變意思！<span lang="ja">おばさん</span>是阿姨、<span lang="ja">おばあさん</span>是奶奶，叫錯會被瞪 😅</div>`],
    ['s7', '7. 易混淆字大集合 ⚠️', () => tbl(['長得像', '分辨訣竅'], CONF.map(([a, b]) => [`<span class="kn-cf" lang="ja">${a}</span>`, b]))],
    ['s8', '8. 馬上能用的生活用語（諧音版）', () => `<p>👆 點一下聽標準發音，諧音只是幫助記憶，<b>實際請以發音為準</b>。</p>
      <div class="kn-phr">${PHR.map(p => `<div class="kn-pr"><button type="button" data-ks="${esc(p[0].split('／')[0])}"><span class="e">${p[3]}</span><b lang="ja">${esc(p[0])}</b><small>${esc(p[1])}</small><span class="kn-x">諧音：${esc(p[2])}</span><span>👉 ${esc(p[4])} 🔊</span></button>${App.trackBtn(App.wordItem({ jp: p[0].split('／')[0], kana: p[0].split('／')[0], romaji: p[1], zh: p[4], hint: '諧音：' + p[2] }, '五十音講義', 'phrase'), true)}</div>`).join('')}</div>`],
    ['s9', '9. 數字 1～10', () => `<div class="kn-nums">${NUMS.map(n => `<button type="button" data-ks="${n[0]}"><span class="n">${n[3]}</span><b lang="ja">${n[0]}</b><small>${n[1]}</small><span class="kn-x">${n[2]}</span></button>`).join('')}</div>
      <div class="kn-tip">🎵 口訣：「衣七・你・桑・腰・勾・摟哭・那那・哈七・Q・啾」，像繞口令一樣連續唸！</div>`],
    ['s10', '10. 7 天背完五十音計畫 📅', () => tbl(['天數', '內容', '任務'], PLAN.map(r => r.map(esc))) + `<div class="kn-key">🔑 <b>記憶秘訣：</b>每天 20 分鐘 > 一次 3 小時。睡前看一遍、起床再看一遍，記憶最牢！</div>
      <button type="button" class="kn-go" data-kopen="quiz">✏️ 開始小練習</button>`],
    ['s11', '✍️ 書寫練習（範字 → 描紅 → 自己寫）', () => `<p class="kn-note">選一行，照「範字 → 3 格描紅 → 空白格自己寫」在紙上或用手指跟著寫。上方「平／片」切換文字。</p>
      <div class="kn-wrows">${RN.map((n, i) => `<button type="button" data-kwr="${i}" class="${i === ST.wr ? 'on' : ''}">${esc(n)}</button>`).join('')}</div><div class="kn-write">${writeRows()}</div>`]
  ];
  function writeRows() {
    const row = (GR[ST.wr] || []).filter(Boolean).map(h => BY[h]);
    return row.map(k => (ST.sc === 'm' ? [k[0], k[1]] : [ST.sc === 'k' ? k[1] : k[0]]).map(c => `<div class="kn-wrow"><button type="button" class="kn-wl" data-ks="${esc(k[0])}"><b>${esc(k[2])}</b><span>${esc(k[3])}</span></button><span class="kn-wb m" lang="ja">${esc(c)}</span>${`<span class="kn-wb t" lang="ja">${esc(c)}</span>`.repeat(3)}<span class="kn-wb"></span><span class="kn-wb"></span></div>`).join('')).join('');
  }
  function lessonTab() {
    return `<p class="kn-lead">🎌 零基礎日文講義：圖解＋中文諧音，7 天背完五十音。點任何假名或句子就會唸給你聽。</p>
      ${CH.map(([id, t, f]) => `<details class="kn-ch" data-ch="${id}"${ST.open[id] ? ' open' : ''}><summary>${esc(t)}</summary><div class="kn-body">${ST.open[id] ? f() : ''}</div></details>`).join('')}
      <p class="kn-note">諧音僅供記憶輔助，正確發音以語音為準。</p>`;
  }

  /* ---------- 小練習：聽音選字、看字選音、平↔片（各 10 題）＋閃卡 ---------- */
  const POOLS = { seion: () => KA, daku: () => DK, yoon: () => YO, all: () => ALL };
  let Q = null, F = null;
  const noVoice = () => App.voiceOK && App.voiceOK() === false;
  function qStart() {
    const p = POOLS[ST.qp]();
    Q = { list: shuffle(p.slice()).slice(0, 10), i: 0, ok: 0, wrong: [], done: false };
    qMake();
  }
  function qMake() {
    const k = Q.list[Q.i], p = POOLS[ST.qp](), r0 = rn(k[2]);
    const used = new Set([r0]), opts = [k];
    shuffle(p.slice()).forEach(o => { if (opts.length < 4 && !used.has(rn(o[2]))) { used.add(rn(o[2])); opts.push(o); } });
    shuffle(opts);
    const sc = ST.sc === 'm' ? (Math.random() < .5 ? 'h' : 'k') : ST.sc;
    let prompt, show;
    if (ST.qt === 'listen') { prompt = 'listen'; show = o => sc === 'k' ? o[1] : o[0]; }
    else if (ST.qt === 'read') { prompt = sc === 'k' ? k[1] : k[0]; show = o => rn(o[2]); }
    else { const toK = sc === 'h'; prompt = toK ? k[0] : k[1]; show = o => toK ? o[1] : o[0]; }
    Q.cur = { k, opts, prompt, labels: opts.map(show), ans: null };
  }
  function quizStage() {
    if (!Q) return `<div class="kn-qstart"><p>每回 10 題，答錯的字自動加入 📌不會清單。</p><button type="button" class="btn primary" data-kq="start">▶ 開始</button></div>`;
    if (Q.done) return `<div class="kn-qstart"><p class="kn-big">${Q.ok >= 9 ? '🏆 太強了！' : Q.ok >= 7 ? '👍 不錯喔！' : '💪 再加油！'}</p><p>成績：${Q.ok} / 10</p>
      ${Q.wrong.length ? `<p class="kn-note">答錯的字，多看幾遍：</p><div class="kn-wrong">${Q.wrong.map(k => `<button type="button" data-ks="${esc(k[0])}" lang="ja">${esc(k[0])} ${esc(k[1])} <small>${esc(k[2])}・${esc(k[3])}</small></button>`).join('')}</div>` : '<p>全對！換下一個範圍挑戰吧！</p>'}
      <button type="button" class="btn primary" data-kq="start">🔄 再練 10 題</button></div>`;
    const c = Q.cur, k = c.k, a = c.ans;
    const pr = c.prompt === 'listen'
      ? (noVoice() ? `<div class="kn-qk sm">${esc(rn(k[2]))}</div><p class="kn-note">🔇 找不到日文語音，改看拼音選字</p>` : `<button type="button" class="kn-qplay" data-kq="play" aria-label="再聽一次">🔊</button><p class="kn-note">聽發音，選出正確的字</p>`)
      : `<div class="kn-qk" lang="ja">${esc(c.prompt)}</div>`;
    let fb = '';
    if (a != null) {
      fb = c.opts[a] === k ? `<p class="kn-fb ok">⭕ 正確！${esc(k[0])}／${esc(k[1])} = ${esc(k[2])}（${esc(k[3])}）</p>`
        : `<p class="kn-fb ng">❌ 答案是 ${esc(k[0])}／${esc(k[1])} = <b>${esc(k[2])}</b>（諧音「${esc(k[3])}」${isKana(k) ? esc(k[4]) : ''}）${isKana(k) ? `<br><small>${esc(k[5])}</small>` : ''}</p><button type="button" class="btn primary" data-kq="next">${Q.i >= 9 ? '看成績' : '下一題 ➜'}</button>`;
    }
    return `<div class="kn-qbar"><i style="width:${Q.i * 10}%"></i></div><p class="kn-qs">第 ${Q.i + 1} / 10 題　答對 ${Q.ok}</p>${pr}
      <div class="kn-qc">${c.labels.map((l, i) => `<button type="button" data-kqa="${i}" lang="ja" class="${a == null ? '' : c.opts[i] === k ? 'ok' : i === a ? 'ng' : ''}"${a != null ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>${fb}`;
  }
  function flashStage() {
    if (!F || F.qp !== ST.qp) F = { qp: ST.qp, list: POOLS[ST.qp]().slice(), i: 0, flip: false };
    const k = F.list[F.i], sc = ST.sc === 'm' ? (F.i % 2 ? 'k' : 'h') : ST.sc, kana = isKana(k);
    return `<button type="button" class="kn-flash${F.flip ? ' flip' : ''}" data-kf="flip">${F.flip
      ? `${kana ? `<span class="e">${esc(k[4])}</span>` : ''}<span class="r">${esc(k[2])}</span><span class="x">諧音：${esc(k[3])}</span>${kana ? `<span class="m">${esc(sc === 'k' ? k[6] : k[5])}</span>` : ''}<span class="s">平 ${esc(k[0])}・片 ${esc(k[1])}${kana ? '　字源：' + esc(sc === 'k' ? k[8] : k[7]) : ''}</span>`
      : `<span class="g" lang="ja">${esc(sc === 'k' ? k[1] : k[0])}</span><span class="s">點卡片翻面</span>`}</button>
      <div class="kn-fctl"><button type="button" class="btn sm" data-kf="prev">⬅ 上張</button><button type="button" class="btn sm" data-kf="say">🔊 發音</button><button type="button" class="btn sm" data-kf="shuf">🔀 洗牌</button><button type="button" class="btn sm" data-kf="next">下張 ➡</button></div>
      <p class="kn-qs">${F.i + 1} / ${F.list.length}</p><div class="center">${App.trackBtn(itemOf(k), true)}</div>`;
  }
  function quizTab() {
    return `<div class="kn-bar">${seg('kqt', [['listen', '🎧 聽音選字'], ['read', '👀 看字選音'], ['hk', '🔁 平↔片'], ['flash', '🃏 閃卡']], ST.qt, 'g2')}</div>
      <div class="kn-bar">${seg('kqp', [['seion', '清音 46'], ['daku', '濁音 25'], ['yoon', '拗音 27'], ['all', '全部']], ST.qp, 'g4')}</div>
      <div class="kn-stage">${ST.qt === 'flash' ? flashStage() : quizStage()}</div>`;
  }
  function qEnd(root) {
    Q.done = true;
    const ok = Q.ok, stars = ok >= 9 ? 3 : ok >= 7 ? 2 : ok >= 5 ? 1 : 0;
    const g = ok ? App.addXP(ok, '五十音小練習') : null;
    const seen = new Set(), wrong = Q.wrong.filter(k => !seen.has(k[0]) && seen.add(k[0])).map(itemOf);
    stage(root);
    App.showResult({ title: stars ? '練習完成！' : '再練一次', stars, correct: ok, total: 10, gained: g && g.gained, wrong, retry: () => { qStart(); stage(root); }, ok: '確定' });
  }
  const stage = root => { const s = root.querySelector('.kn-stage'); if (s) s.innerHTML = ST.qt === 'flash' ? flashStage() : quizStage(); };

  /* ---------- 主畫面 ---------- */
  function body() {
    return ST.sub === 'daku' ? dakuTab() : ST.sub === 'yoon' ? yoonTab() : ST.sub === 'lesson' ? lessonTab() : ST.sub === 'quiz' ? quizTab() : tableTab();
  }
  function draw(root) {
    root.innerHTML = `<div class="kn-subs">${SUBS.map(([id, n]) => `<button type="button" data-ksub="${id}" class="${id === ST.sub ? 'on' : ''}" aria-pressed="${id === ST.sub}">${n}</button>`).join('')}</div>
      <div class="kn-bar kn-scbar"><span class="kn-lb">文字</span>${seg('ksc', [['h', '平假名'], ['k', '片假名'], ['m', '平片混合']], ST.sc)}</div>
      <div class="kn-main">${body()}</div>`;
  }
  function onClick(root, e) {
    if (e.target.closest('.track-btn')) { setTimeout(() => root.querySelectorAll('.kn-cell[data-h]').forEach(c => c.classList.toggle('trk', has('kana:' + c.dataset.h))), 0); return; }
    const t = e.target.closest('button,input'); if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if (d.ksub) { ST.sub = d.ksub; draw(root); return; }
    if (d.ksc) { ST.sc = d.ksc; if (ST.sub === 'quiz' && ST.qt !== 'flash' && Q && !Q.done) Q = null; draw(root); return; }
    if (d.kview) { ST.view = d.kview; draw(root); return; }
    if (d.kopen) { const [s, sc] = d.kopen.split(':'); if (s === 'card') { ST.sub = 'table'; ST.view = 'card'; ST.sc = sc; } else ST.sub = s; draw(root); root.scrollIntoView({ block: 'start' }); return; }
    if (d.kwr != null) { ST.wr = +d.kwr; root.querySelectorAll('[data-kwr]').forEach(b => b.classList.toggle('on', +b.dataset.kwr === ST.wr)); const w = root.querySelector('.kn-write'); if (w) w.innerHTML = writeRows(); return; }
    if (t.classList.contains('kn-cell') && d.h) {
      const k = BY[d.h]; App.speak(k[0]);
      if (t.classList.contains('cover') && !t.classList.contains('show')) { t.classList.add('show'); return; }
      const slot = t.parentNode.querySelectorAll('.kn-det')[Math.floor([...t.parentNode.querySelectorAll('.kn-cell')].indexOf(t) / (t.parentNode.classList.contains('c3') ? 3 : 5))];
      const same = slot && !slot.hidden && slot.dataset.h === d.h;
      root.querySelectorAll('.kn-det').forEach(s => { s.hidden = true; s.innerHTML = ''; });
      root.querySelectorAll('.kn-cell.sel').forEach(c => c.classList.remove('sel'));
      if (slot && !same) { slot.dataset.h = d.h; slot.innerHTML = detail(k); slot.hidden = false; t.classList.add('sel'); }
      return;
    }
    if (d.ks) { App.speak(d.ks); return; }
    if (d.kqt) { ST.qt = d.kqt; Q = null; draw(root); return; }
    if (d.kqp) { ST.qp = d.kqp; Q = null; F = null; draw(root); return; }
    if (d.kq === 'start') { qStart(); stage(root); if (ST.qt === 'listen' && !noVoice()) App.speak(Q.cur.k[0]); return; }
    if (d.kq === 'play' && Q && Q.cur) { App.speak(Q.cur.k[0]); return; }
    if (d.kq === 'next' && Q) { qNext(root); return; }
    if (d.kqa != null && Q && Q.cur && Q.cur.ans == null) {
      const c = Q.cur, i = +d.kqa, right = c.opts[i] === c.k;
      c.ans = i; App.speak(c.k[0]);
      if (right) Q.ok++; else { Q.wrong.push(c.k); if (window.Tracker) Tracker.add(itemOf(c.k), true); }
      stage(root);
      if (right) { const q = Q; setTimeout(() => { if (Q === q && root.isConnected && q.cur === c) qNext(root); }, 900); }
      return;
    }
    if (d.kf && F) {
      const n = F.list.length;
      if (d.kf === 'flip') { F.flip = !F.flip; if (F.flip) App.speak(F.list[F.i][0]); }
      else if (d.kf === 'next') { F.i = (F.i + 1) % n; F.flip = false; }
      else if (d.kf === 'prev') { F.i = (F.i - 1 + n) % n; F.flip = false; }
      else if (d.kf === 'shuf') { shuffle(F.list); F.i = 0; F.flip = false; }
      else if (d.kf === 'say') App.speak(F.list[F.i][0]);
      stage(root);
    }
  }
  function qNext(root) {
    Q.i++;
    if (Q.i >= 10) { qEnd(root); return; }
    qMake(); stage(root);
    if (ST.qt === 'listen' && !noVoice()) App.speak(Q.cur.k[0]);
  }

  function render(box, opts) {
    opts = opts || {};
    if (opts.sub) open(opts.sub, opts.ch);
    const root = document.createElement('div');
    root.className = 'kn';
    box.innerHTML = ''; box.appendChild(root);
    draw(root);
    root.addEventListener('click', e => onClick(root, e));
    root.addEventListener('change', e => { if (e.target.matches('[data-kcover]')) { ST.cover = e.target.checked; draw(root); } });
    root.addEventListener('toggle', e => {
      const det = e.target; if (!det.classList || !det.classList.contains('kn-ch')) return;
      const id = det.dataset.ch, ch = CH.find(c => c[0] === id);
      ST.open[id] = det.open;
      const b = det.querySelector('.kn-body');
      if (det.open && b && !b.innerHTML.trim() && ch) b.innerHTML = ch[2]();
    }, true);
    if (opts.ch) { const d = root.querySelector(`[data-ch="${opts.ch}"]`); if (d) setTimeout(() => d.scrollIntoView({ block: 'start' }), 30); }
    return root;
  }
  function open(sub, ch) {
    if (SUBS.some(s => s[0] === sub)) ST.sub = sub;
    if (ch) { ST.sub = 'lesson'; ST.open[ch] = true; }
  }

  /* ---------- 手冊搜尋：假名（字、拼音、諧音、聯想）＋講義章節 ---------- */
  let CHTXT = null;
  const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  function search(q, norm) {
    norm = norm || (s => String(s || '').toLowerCase().replace(/\s/g, ''));
    const raw = String(q || '').trim(), n = norm(raw);
    if (!n) return { n: 0, html: '' };
    const ascii = /^[\x00-\x7f]+$/.test(n);
    const hits = ALL.filter(k => k[0] === raw || k[1] === raw || norm(rn(k[2])) === n ||
      (!ascii && (norm(k[3]) === n || (n.length >= 2 && isKana(k) && (norm(k[5]).includes(n) || norm(k[6]).includes(n))))));
    if (!CHTXT) CHTXT = CH.map(([id, t, f]) => ({ id, t, txt: strip(t + ' ' + f()) }));
    const chs = (ascii ? n.length >= 3 : n.length >= 2) ? CHTXT.filter(c => norm(c.txt).includes(n)) : [];
    const all = /^(五十音|50音|假名|kana|かな|カナ|平假名|片假名|ひらがな|カタカナ|gojuon)$/.test(n);
    const cnt = hits.length + chs.length + (all ? 1 : 0);
    if (!cnt) return { n: 0, html: '' };
    const snip = c => { const i = c.txt.indexOf(raw); return i < 0 ? '' : (i > 12 ? '…' : '') + c.txt.slice(Math.max(0, i - 12), i + raw.length + 24) + '…'; };
    return {
      n: cnt,
      html: `<h2>🔤 五十音（${cnt}）</h2>${all ? `<button type="button" class="kn-chhit" data-kgo="table">📋 打開五十音（表格、講義、小練習）</button>` : ''}
        ${hits.length ? `<div class="kn-hits">${hits.slice(0, 30).map(k => `<div class="kn-hit"><button type="button" data-ks="${esc(k[0])}"><b lang="ja">${esc(k[0])}・${esc(k[1])}</b><small>${esc(k[2])}・諧音 ${esc(k[3])}${isKana(k) ? ' ' + esc(k[4]) : ''}</small>${isKana(k) ? `<small>${esc(k[5])}</small>` : ''}</button>${App.trackBtn(itemOf(k), true)}</div>`).join('')}</div>` : ''}
        ${chs.map(c => `<button type="button" class="kn-chhit" data-kgo="lesson:${c.id}">📘 ${esc(c.t)}${snip(c) ? `<small>${esc(snip(c))}</small>` : ''}</button>`).join('')}`
    };
  }

  window.KanaLesson = { render, open, search };
})();
