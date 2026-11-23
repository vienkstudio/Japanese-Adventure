// 日文斷詞＋離線字典（D 組）：全域 JPText
// 字典：data/mind/lex-n5…n1（MIND.lex）＋ conj.js 活用表 ＋ 本檔補充字典（助詞、助動詞、地名、旅遊詞）＋ SCENES 單字
// 斷詞：格子圖最小成本（最長匹配的全域版），查不到時依字種切段；活用形反查辭書形。
(function () {
  'use strict';
  const MIND_SRC = 'data/mind/', EXT_SRC = 'data/reading/dict-news.js';
  const BASE_LV = ['N5', 'N4', 'N3'], ALL_LV = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const MAXL = 12;
  const POS_ZH = { v: '動詞', n: '名詞', i: 'い形容詞', na: 'な形容詞', adv: '副詞', pron: '代名詞', pre: '連體詞', int: '感嘆詞', ctr: '量詞', suf: '接尾詞', exp: '慣用語', conj: '連接詞', part: '助詞', aux: '助動詞', cop: '斷定', num: '數字', name: '專有名詞', sym: '符號', unk: '未知' };

  /* ---------------- 假名工具 ---------------- */
  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const isKanji = c => /[㐀-鿿々〆ヶ]/.test(c);
  const hasKanji = s => /[㐀-鿿々]/.test(s || '');
  const isHira = c => /[ぁ-ゟ]/.test(c);
  const isKata = c => /[ァ-ヺーヽヾ]/.test(c);
  const isKanaStr = s => /^[ぁ-ゟァ-ー]+$/.test(s);
  const R1 = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o', 'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko', 'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to', 'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no', 'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo', 'や': 'ya', 'ゆ': 'yu', 'よ': 'yo', 'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro', 'わ': 'wa', 'ゐ': 'i', 'ゑ': 'e', 'を': 'o', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go', 'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo', 'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo', 'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po', 'ゔ': 'vu',
    'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o', 'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 'ゎ': 'wa'
  };
  const SPECIAL2 = { 'てぃ': 'ti', 'でぃ': 'di', 'とぅ': 'tu', 'どぅ': 'du', 'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo', 'うぃ': 'wi', 'うぇ': 'we', 'うぉ': 'wo', 'ゔぁ': 'va', 'ゔぃ': 'vi', 'ゔぇ': 've', 'ゔぉ': 'vo', 'しぇ': 'she', 'じぇ': 'je', 'ちぇ': 'che', 'つぁ': 'tsa', 'いぇ': 'ye' };
  function romaji(kana) {
    const s = toHira(kana);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i], n = s[i + 1];
      if (c === 'っ') {
        const nx = romajiAt(s, i + 1);
        out += nx.r ? (nx.r.startsWith('ch') ? 't' : nx.r[0]) : '';
        continue;
      }
      if (c === 'ー') { const m = out.match(/[aiueo]$/); out += m ? m[0] : '-'; continue; }
      if (c === 'ん') { out += 'n'; if (n && /[あいうえおやゆよ]/.test(n)) out += "'"; continue; }
      const r = romajiAt(s, i);
      if (r.r == null) { out += c; continue; }
      out += r.r; i += r.len - 1;
    }
    return out;
  }
  // 全站統一：有 Phrase.romaji（js/phrase.js）就用它，否則退回本檔的逐字轉法
  function R2(kana, jp) { try { if (window.Phrase && Phrase.romaji) { const r = Phrase.romaji(kana, jp || kana); if (r) return r; } } catch (e) { } return romaji(kana); }
  function romajiAt(s, i) {
    const c = s[i], n = s[i + 1];
    if (c == null) return { r: '', len: 0 };
    if (n && SPECIAL2[c + n]) return { r: SPECIAL2[c + n], len: 2 };
    if (n && /[ゃゅょ]/.test(n) && R1[c] && /i$/.test(R1[c]) && c !== 'い') {
      const base = R1[c].slice(0, -1), y = R1[n];
      if (/^(sh|ch|j)$/.test(base)) return { r: base + y.slice(1), len: 2 };
      return { r: base + y, len: 2 };
    }
    if (R1[c] != null) return { r: R1[c], len: 1 };
    return { r: null, len: 1 };
  }

  /* ---------------- 補充字典（助詞、助動詞、常見功能詞、地名、旅遊詞） ---------------- */
  // [表層, 讀音(同表層時空), 中文, 詞性, 成本(越小越優先)]
  const SUP = [
    ['は', '', '（主題）', 'part', .6], ['が', '', '（主語）', 'part', .6], ['を', '', '（受詞）', 'part', .6], ['に', '', '在／往／給（時間、地點、對象）', 'part', .6],
    ['で', '', '在（地點）／用（手段）', 'part', .6], ['と', '', '和；跟；（引用）', 'part', .6], ['も', '', '也', 'part', .6], ['へ', '', '往', 'part', .6], ['の', '', '的；（名詞化）', 'part', .6],
    ['から', '', '從；因為', 'part', .7], ['まで', '', '到', 'part', .7], ['より', '', '比；從', 'part', .8], ['や', '', '和（列舉）', 'part', .7], ['か', '', '嗎（疑問）', 'part', .7],
    ['ね', '', '呢；對吧', 'part', .7], ['よ', '', '喔（告知）', 'part', .7], ['な', '', '（連體）；啊', 'part', .9], ['わ', '', '（語氣）', 'part', 1.2], ['ので', '', '因為', 'part', .7], ['のに', '', '明明…卻', 'part', .8],
    ['けど', '', '但是', 'part', .7], ['けれど', '', '但是', 'part', .7], ['けれども', '', '但是', 'part', .7], ['が', '', '但是', 'part', .9], ['でも', '', '但是；即使', 'part', .8],
    ['って', '', '（引用）；聽說', 'part', .8], ['し', '', '而且', 'part', 1.1], ['だけ', '', '只', 'part', .7], ['しか', '', '只（後接否定）', 'part', .8], ['など', '', '等等', 'part', .7],
    ['ほど', '', '程度；越…越', 'part', .8], ['くらい', '', '大約', 'part', .8], ['ぐらい', '', '大約', 'part', .8], ['ごろ', '', '左右（時間）', 'part', .8], ['ばかり', '', '光是；剛剛', 'part', .8],
    ['ずつ', '', '各；每', 'part', .8], ['とか', '', '之類的', 'part', .8], ['なら', '', '如果是', 'part', .8], ['ながら', '', '一邊…', 'part', .9], ['たり', '', '又…又…', 'part', .9],
    ['です', '', '是（禮貌）', 'cop', .6], ['でした', '', '是（過去、禮貌）', 'cop', .6], ['でしょう', '', '…吧', 'cop', .6], ['でしょうか', '', '…呢？（禮貌疑問）', 'cop', .6], ['だ', '', '是', 'cop', .7], ['だった', '', '是（過去）', 'cop', .7],
    ['だろう', '', '…吧', 'cop', .7], ['だから', '', '所以', 'conj', .8], ['ではありません', '', '不是', 'cop', .5], ['じゃありません', '', '不是', 'cop', .5], ['ではない', '', '不是', 'cop', .6], ['じゃない', '', '不是', 'cop', .6],
    ['ではなかった', '', '不是（過去）', 'cop', .6], ['じゃなかった', '', '不是（過去）', 'cop', .6], ['でございます', '', '是（鄭重）', 'cop', .5], ['である', '', '是（書面）', 'cop', .6], ['であり', '', '是…而且', 'cop', .6],
    ['ます', '', '（禮貌）', 'aux', 1.4], ['ました', '', '（禮貌過去）', 'aux', 1.4], ['ません', '', '（禮貌否定）', 'aux', 1.4], ['ましょう', '', '…吧（邀請）', 'aux', 1.4],
    ['たい', '', '想要…', 'aux', 1.2], ['ない', '', '不；沒有', 'aux', 1.1], ['なかった', '', '沒有（過去）', 'aux', 1.1], ['らしい', '', '好像；聽說', 'aux', 1], ['みたい', '', '好像', 'aux', 1], ['そう', '', '好像；聽說', 'aux', 1.1],
    ['ください', '', '請…', 'aux', .6], ['ございます', '', '有；是（鄭重）', 'aux', .6], ['いらっしゃいませ', '', '歡迎光臨', 'exp', .5], ['ありがとう', '', '謝謝', 'exp', .6], ['ありがとうございます', '', '非常感謝', 'exp', .4],
    ['すみません', '', '不好意思；對不起', 'exp', .5], ['ごめんなさい', '', '對不起', 'exp', .5], ['おはよう', '', '早安', 'exp', .6], ['おはようございます', '', '早安（禮貌）', 'exp', .4], ['こんにちは', '', '你好', 'exp', .5], ['こんばんは', '', '晚上好', 'exp', .5],
    ['さようなら', '', '再見', 'exp', .5], ['おやすみなさい', '', '晚安', 'exp', .5], ['いただきます', '', '開動了', 'exp', .5], ['ごちそうさまでした', '', '謝謝招待（吃飽了）', 'exp', .4], ['お願いします', 'おねがいします', '麻煩你；拜託', 'exp', .5],
    ['よろしく', '', '請多指教', 'exp', .6], ['はい', '', '是；好', 'int', .8], ['いいえ', '', '不；不是', 'int', .8], ['ええ', '', '嗯；是的', 'int', 1], ['あの', '', '那個…；嗯', 'int', 1], ['えっと', '', '嗯…', 'int', .8],
    ['こと', '', '事情；（名詞化）', 'n', .9], ['もの', '', '東西；（理由）', 'n', .9], ['ところ', '', '地方；正要', 'n', .9], ['とき', '', '…的時候', 'n', .9], ['ため', '', '為了；因為', 'n', .9], ['よう', '', '樣子；為了', 'n', 1],
    ['たち', '', '們', 'suf', .9], ['さん', '', '先生／小姐', 'suf', .8], ['さま', '', '（敬稱）', 'suf', .8], ['様', 'さま', '（敬稱）', 'suf', .8], ['くん', '', '（男生暱稱）', 'suf', .9], ['ちゃん', '', '（暱稱）', 'suf', .9],
    ['お', '', '（美化接頭語）', 'suf', 1.6], ['ご', '', '（美化接頭語）', 'suf', 1.6], ['方', 'かた', '（敬稱）位；方法', 'suf', 1.3], ['中', 'ちゅう', '正在…中', 'suf', 1.3], ['屋', 'や', '…店', 'suf', 1.2], ['駅', 'えき', '車站', 'n', .9],
    ['東京', 'とうきょう', '東京', 'name', .8], ['京都', 'きょうと', '京都', 'name', .8], ['大阪', 'おおさか', '大阪', 'name', .8], ['北海道', 'ほっかいどう', '北海道', 'name', .8], ['沖縄', 'おきなわ', '沖繩', 'name', .8], ['日本', 'にほん', '日本', 'name', .8],
    ['台湾', 'たいわん', '台灣', 'name', .8], ['台北', 'たいぺい', '台北', 'name', .8], ['新宿', 'しんじゅく', '新宿', 'name', .8], ['渋谷', 'しぶや', '澀谷', 'name', .8], ['浅草', 'あさくさ', '淺草', 'name', .8], ['上野', 'うえの', '上野', 'name', .8],
    ['銀座', 'ぎんざ', '銀座', 'name', .8], ['原宿', 'はらじゅく', '原宿', 'name', .8], ['秋葉原', 'あきはばら', '秋葉原', 'name', .8], ['札幌', 'さっぽろ', '札幌', 'name', .8], ['那覇', 'なは', '那霸', 'name', .8], ['奈良', 'なら', '奈良', 'name', .8],
    ['富士山', 'ふじさん', '富士山', 'name', .8], ['浅草寺', 'せんそうじ', '淺草寺', 'name', .7], ['清水寺', 'きよみずでら', '清水寺', 'name', .7], ['金閣寺', 'きんかくじ', '金閣寺', 'name', .7], ['道頓堀', 'どうとんぼり', '道頓堀', 'name', .7],
    ['伏見稲荷', 'ふしみいなり', '伏見稻荷', 'name', .7], ['嵐山', 'あらしやま', '嵐山', 'name', .7], ['小樽', 'おたる', '小樽', 'name', .7], ['首里城', 'しゅりじょう', '首里城', 'name', .7], ['山手線', 'やまのてせん', '山手線', 'name', .7], ['新幹線', 'しんかんせん', '新幹線', 'n', .7],
    ['コンビニ', '', '便利商店', 'n', .8], ['スーパー', '', '超市', 'n', .8], ['ラーメン', '', '拉麵', 'n', .8], ['寿司', 'すし', '壽司', 'n', .8], ['すし', '', '壽司', 'n', 1], ['お寿司', 'おすし', '壽司', 'n', .8], ['ご飯', 'ごはん', '飯；餐', 'n', .8],
    ['おにぎり', '', '飯糰', 'n', .8], ['お弁当', 'おべんとう', '便當', 'n', .8], ['弁当', 'べんとう', '便當', 'n', .8], ['お土産', 'おみやげ', '伴手禮', 'n', .8], ['お店', 'おみせ', '店', 'n', .8], ['お客様', 'おきゃくさま', '客人（敬稱）', 'n', .8],
    ['温泉', 'おんせん', '溫泉', 'n', .8], ['旅館', 'りょかん', '日式旅館', 'n', .8], ['神社', 'じんじゃ', '神社', 'n', .8], ['お寺', 'おてら', '寺廟', 'n', .8], ['観光', 'かんこう', '觀光', 'n', .8], ['観光客', 'かんこうきゃく', '觀光客', 'n', .8],
    ['切符', 'きっぷ', '車票', 'n', .8], ['改札', 'かいさつ', '剪票口', 'n', .8], ['改札口', 'かいさつぐち', '剪票口', 'n', .8], ['乗り換え', 'のりかえ', '轉乘', 'n', .8], ['ホーム', '', '月台', 'n', .9], ['Suica', 'スイカ', '西瓜卡（交通IC卡）', 'n', .8],
    ['交通系IC', 'こうつうけいアイシー', '交通IC卡', 'n', .8], ['ICカード', 'アイシーカード', 'IC卡', 'n', .8], ['抹茶', 'まっちゃ', '抹茶', 'n', .8], ['桜', 'さくら', '櫻花', 'n', .8], ['花見', 'はなみ', '賞花', 'n', .8], ['お花見', 'おはなみ', '賞花', 'n', .8],
    ['紅葉', 'こうよう', '紅葉；楓紅', 'n', .8], ['浴衣', 'ゆかた', '浴衣', 'n', .8], ['着物', 'きもの', '和服', 'n', .8], ['屋台', 'やたい', '路邊攤', 'n', .8], ['祭り', 'まつり', '祭典', 'n', .8], ['お祭り', 'おまつり', '祭典', 'n', .8],
    ['花火', 'はなび', '煙火', 'n', .8], ['花火大会', 'はなびたいかい', '煙火大會', 'n', .7], ['鹿', 'しか', '鹿', 'n', .9], ['自販機', 'じはんき', '自動販賣機', 'n', .8], ['自動販売機', 'じどうはんばいき', '自動販賣機', 'n', .7], ['券売機', 'けんばいき', '售票機', 'n', .8],
    ['食券', 'しょっけん', '餐券', 'n', .8], ['店員', 'てんいん', '店員', 'n', .8], ['店員さん', 'てんいんさん', '店員', 'n', .8], ['駅員', 'えきいん', '站務員', 'n', .8], ['駅員さん', 'えきいんさん', '站務員', 'n', .8], ['免税', 'めんぜい', '免稅', 'n', .8],
    ['予約', 'よやく', '預約', 'n', .8], ['朝ごはん', 'あさごはん', '早餐', 'n', .8], ['晩ごはん', 'ばんごはん', '晚餐', 'n', .8], ['昼ごはん', 'ひるごはん', '午餐', 'n', .8], ['朝ご飯', 'あさごはん', '早餐', 'n', .8], ['晩ご飯', 'ばんごはん', '晚餐', 'n', .8],
    ['今日', 'きょう', '今天', 'n', .8], ['明日', 'あした', '明天', 'n', .8], ['昨日', 'きのう', '昨天', 'n', .8], ['一人', 'ひとり', '一個人', 'n', .8], ['二人', 'ふたり', '兩個人', 'n', .8], ['一つ', 'ひとつ', '一個', 'n', .8], ['二つ', 'ふたつ', '兩個', 'n', .8],
    ['三つ', 'みっつ', '三個', 'n', .8], ['一緒', 'いっしょ', '一起', 'n', .8], ['一緒に', 'いっしょに', '一起', 'adv', .7], ['大好き', 'だいすき', '非常喜歡', 'na', .8], ['好き', 'すき', '喜歡', 'na', .8], ['大丈夫', 'だいじょうぶ', '沒問題；不要緊', 'na', .8],
    ['私', 'わたし', '我', 'pron', .8], ['僕', 'ぼく', '我（男生）', 'pron', .8], ['何', 'なに', '什麼', 'pron', .9], ['何時', 'なんじ', '幾點', 'n', .8], ['何人', 'なんにん', '幾個人', 'n', .8], ['何名様', 'なんめいさま', '幾位', 'n', .7],
    ['いくら', '', '多少錢', 'adv', .8], ['どこ', '', '哪裡', 'pron', .8], ['どれ', '', '哪個', 'pron', .8], ['だれ', '', '誰', 'pron', .8], ['いつ', '', '什麼時候', 'pron', .8], ['どう', '', '怎樣', 'adv', .8], ['どうぞ', '', '請', 'adv', .8],
    ['ちょっと', '', '有點；稍微', 'adv', .8], ['とても', '', '非常', 'adv', .8], ['すごく', '', '非常', 'adv', .8], ['少し', 'すこし', '一點點', 'adv', .8], ['たくさん', '', '很多', 'adv', .8], ['もう', '', '已經；再', 'adv', .8], ['まだ', '', '還；尚未', 'adv', .8],
    ['いつも', '', '總是', 'adv', .8], ['ぜひ', '', '務必', 'adv', .8], ['ゆっくり', '', '慢慢地', 'adv', .8], ['ちょうど', '', '剛好', 'adv', .8], ['やっぱり', '', '果然', 'adv', .8], ['とにかく', '', '總之', 'adv', .8], ['なかなか', '', '相當；（不）容易', 'adv', .8],
    ['こちら', '', '這邊；這位', 'pron', .8], ['そちら', '', '那邊', 'pron', .8], ['あちら', '', '那邊（遠）', 'pron', .8], ['これ', '', '這個', 'pron', .8], ['それ', '', '那個', 'pron', .8], ['あれ', '', '那個（遠）', 'pron', .8], ['ここ', '', '這裡', 'pron', .8], ['そこ', '', '那裡', 'pron', .8], ['あそこ', '', '那裡（遠）', 'pron', .8],
    ['この', '', '這個（＋名詞）', 'pre', .8], ['その', '', '那個（＋名詞）', 'pre', .8], ['あの', '', '那個（遠，＋名詞）', 'pre', .9], ['どの', '', '哪個（＋名詞）', 'pre', .8], ['そして', '', '然後', 'conj', .7], ['それから', '', '接著', 'conj', .7], ['でも', '', '但是', 'conj', .9],
    ['しかし', '', '然而', 'conj', .7], ['だけど', '', '但是', 'conj', .8], ['ところが', '', '沒想到', 'conj', .7], ['ところで', '', '對了', 'conj', .7], ['つまり', '', '也就是說', 'conj', .7], ['また', '', '又；另外', 'adv', .8]
  ];
  // 補充動詞（假名常寫、或輔助動詞）：[辭書形, 讀音, 中文, 類別]
  const SUPV = [
    ['ある', '', '有；在（無生命）', '1'], ['いる', '', '在；有（有生命）；（正在）', '2'], ['する', '', '做', '3'], ['くる', '', '來', '3'], ['来る', 'くる', '來', '3'], ['なる', '', '變成', '1'], ['いく', '', '去；（…下去）', '1'],
    ['みる', '', '看；（試著…）', '2'], ['しまう', '', '（…完、不小心…）', '1'], ['おく', '', '（事先…）；放', '1'], ['くれる', '', '（別人）給我', '2'], ['もらう', '', '得到；（請別人…）', '1'], ['あげる', '', '給', '2'],
    ['くださる', '', '給我（敬語）', '1'], ['いただく', '', '收下；吃（謙讓）', '1'], ['できる', '', '能；會；完成', '2'], ['出来る', 'できる', '能；會；完成', '2'], ['わかる', '', '懂', '1'], ['いらっしゃる', '', '在；來；去（尊敬）', '1'],
    ['おっしゃる', '', '說（尊敬）', '1'], ['なさる', '', '做（尊敬）', '1'], ['ござる', '', '有；是（鄭重）', '1'], ['いたす', '', '做（謙讓）', '1'], ['致す', 'いたす', '做（謙讓）', '1'], ['申す', 'もうす', '說；叫做（謙讓）', '1'],
    ['参る', 'まいる', '去；來（謙讓）', '1'], ['伺う', 'うかがう', '拜訪；請教（謙讓）', '1'], ['召し上がる', 'めしあがる', '吃；喝（尊敬）', '1'], ['乗り換える', 'のりかえる', '轉乘', '2'], ['並ぶ', 'ならぶ', '排隊；排列', '1'], ['払う', 'はらう', '付（錢）', '1'],
    ['泊まる', 'とまる', '住宿', '1'], ['着く', 'つく', '到達', '1'], ['降りる', 'おりる', '下（車）', '2'], ['込む', 'こむ', '擁擠', '1'], ['混む', 'こむ', '擁擠', '1'], ['楽しむ', 'たのしむ', '享受', '1'], ['迷う', 'まよう', '迷路；猶豫', '1'],
    ['頼む', 'たのむ', '點（餐）；拜託', '1'], ['選ぶ', 'えらぶ', '選擇', '1'], ['温まる', 'あたたまる', '暖和起來', '1'], ['見える', 'みえる', '看得見', '2'], ['聞こえる', 'きこえる', '聽得見', '2'], ['決める', 'きめる', '決定', '2'], ['過ごす', 'すごす', '度過', '1']
  ];

  // 常用詞補充（mind 詞庫沒收、或假名常寫的詞）：每行 表層|讀音|中文|詞性|類別
  const SUP2 = `
終わる|おわる|結束|v|1
始まる|はじまる|開始|v|1
始める|はじめる|開始（做）|v|2
すぐ||馬上|adv|
すぐに||馬上|adv|
こそ||正是；才|part|
日本語|にほんご|日文|n|
英語|えいご|英文|n|
中国語|ちゅうごくご|中文|n|
語|ご|…語|suf|
旅行者|りょこうしゃ|旅客|n|
近年|きんねん|近年|n|
若者|わかもの|年輕人|n|
側|がわ|…側；…方|n|
お湯|おゆ|熱水|n|
ごみ箱|ごみばこ|垃圾桶|n|
箱根|はこね|箱根|name|
四人|よにん|四個人|n|
よにん||四個人|n|
何分|なんぷん|幾分鐘|n|
何回|なんかい|幾次|n|
何階|なんがい|幾樓|n|
何日|なんにち|幾號；幾天|n|
何月|なんがつ|幾月|n|
何歳|なんさい|幾歲|n|
訪日|ほうにち|訪問日本|n|
一部|いちぶ|一部分|n|
食文化|しょくぶんか|飲食文化|n|
昭和|しょうわ|昭和（年號）|name|
明治|めいじ|明治（年號）|name|
開店|かいてん|開店|n|s
再考|さいこう|重新思考|n|s
接客|せっきゃく|接待客人|n|s
美徳|びとく|美德|n|
感銘|かんめい|感動；銘記在心|n|
過度|かど|過度|na|
称賛|しょうさん|稱讚|n|s
理不尽|りふじん|不講理|na|
真|しん|真正的|pre|
表れ|あらわれ|表現；體現|n|
駅弁|えきべん|鐵路便當|n|
真価|しんか|真正價值|n|
赴く|おもむく|前往|v|1
現地|げんち|當地|n|
カタカナ||片假名|n|
ひらがな||平假名|n|
アプリ||App；應用程式|n|
チケット||票|n|
マナー||禮儀|n|
タブレット||平板|n|
レトロ||復古|na|
チェーン||連鎖|n|
チェーン店|チェーンてん|連鎖店|n|
レーン||軌道；車道|n|
セルフレジ||自助結帳機|n|
ターミナル||總站；轉運站|n|
オーバーツーリズム||過度觀光|n|
モーニング||早餐套餐|n|
クリームソーダ||奶油蘇打|n|
ナポリタン||拿坡里義大利麵|n|
チェックイン||入住手續|n|s
チェックアウト||退房|n|s
トイレ||廁所|n|
ホット||熱的|n|
アイス||冰的；冰淇淋|n|
カード||卡；信用卡|n|
コーヒー||咖啡|n|
デパート||百貨公司|n|
シャツ||襯衫|n|
ケーキ||蛋糕|n|
ビール||啤酒|n|
パン||麵包|n|
カフェ||咖啡廳|n|
ドラッグストア||藥妝店|n|
タオル||毛巾|n|
エレベーター||電梯|n|
エスカレーター||手扶梯|n|
レジ||收銀台|n|
メニュー||菜單|n|
トースト||吐司|n|
マイナス||負；零下|n|
コンサート||演唱會|n|
ルール||規則|n|
パスポート||護照|n|
スマホ||智慧型手機|n|
ネット||網路|n|
レストラン||餐廳|n|
タクシー||計程車|n|
バス||公車|n|
ドア||門|n|
焼き鳥|やきとり|烤雞串|n|
枝豆|えだまめ|毛豆|n|
刺身|さしみ|生魚片|n|
焼き魚|やきざかな|烤魚|n|
乾杯|かんぱい|乾杯|n|s
回転寿司|かいてんずし|迴轉壽司|n|
薬剤師|やくざいし|藥劑師|n|
頭痛|ずつう|頭痛|n|
雪まつり|ゆきまつり|雪祭|n|
雪道|ゆきみち|雪路|n|
避難|ひなん|避難|n|s
避難経路|ひなんけいろ|避難路線|n|
経路|けいろ|路線|n|
石畳|いしだたみ|石板路|n|
坂道|さかみち|坡道|n|
終点|しゅうてん|終點站|n|
忘れ物|わすれもの|遺失物；忘了帶的東西|n|
気がつく|きがつく|注意到；發覺|v|1
気が付く|きがつく|注意到；發覺|v|1
持ち帰る|もちかえる|帶回去|v|1
受け取る|うけとる|收取；領取|v|1
食べ終わる|たべおわる|吃完|v|1
見つかる|みつかる|找到|v|1
戻る|もどる|回來；返回|v|1
慌てる|あわてる|慌張|v|2
揺れ|ゆれ|搖晃|n|
揺れる|ゆれる|搖晃|v|2
地震|じしん|地震|n|
机|つくえ|桌子|n|
守る|まもる|保護；遵守|v|1
滑る|すべる|滑|v|1
温まる|あたたまる|暖和起來|v|1
散る|ちる|凋謝；散落|v|1
咲く|さく|開（花）|v|1
数える|かぞえる|數|v|2
回る|まわる|轉；繞|v|1
値段|ねだん|價格|n|
無料|むりょう|免費|n|
注文|ちゅうもん|點餐；訂購|n|s
皿|さら|盤子|n|
お皿|おさら|盤子|n|
畳|たたみ|榻榻米|n|
においがする||有…的味道|exp|
冬休み|ふゆやすみ|寒假|n|
夏休み|なつやすみ|暑假|n|
空港|くうこう|機場|n|
公共料金|こうきょうりょうきん|公共事業費（水電等）|n|
荷物|にもつ|行李；包裹|n|
会計|かいけい|結帳|n|s
深夜|しんや|深夜|n|
努力|どりょく|努力|n|s
便利さ|べんりさ|便利性|n|
一方|いっぽう|另一方面|n|
話題|わだい|話題|n|
失礼|しつれい|失禮|na|
外国人|がいこくじん|外國人|n|
住民|じゅうみん|居民|n|
地元|じもと|當地|n|
集中|しゅうちゅう|集中|n|s
指摘|してき|指出|n|s
対策|たいさく|對策|n|
自治体|じちたい|地方自治體|n|
分散|ぶんさん|分散|n|s
地方|ちほう|地方|n|
都市|とし|都市|n|
独自|どくじ|獨特；獨自|na|
混雑|こんざつ|擁擠|n|s
地域|ちいき|地區|n|
魅力|みりょく|魅力|n|
利点|りてん|優點|n|
喫茶店|きっさてん|喫茶店；咖啡館|n|
雰囲気|ふんいき|氣氛|n|
当時|とうじ|當時|n|
分厚い|ぶあつい|厚的|i|
旅先|たびさき|旅途中；旅行地|n|
触れる|ふれる|接觸|v|2
働き手|はたらきて|勞動者|n|
負担|ふたん|負擔|n|s
強いる|しいる|強迫|v|2
手放し|てばなし|毫無保留|n|
見直す|みなおす|重新檢討|v|1
営業|えいぎょう|營業|n|s
従業員|じゅうぎょういん|員工|n|
乗り出す|のりだす|著手；積極投入|v|1
相次ぐ|あいつぐ|相繼|v|1
企業|きぎょう|企業|n|
要求|ようきゅう|要求|n|s
尊重|そんちょう|尊重|n|s
成り立つ|なりたつ|成立|v|1
先回り|さきまわり|搶先；預先|n|s
察する|さっする|察覺|v|3
応じる|おうじる|回應|v|2
姿勢|しせい|姿態；態度|n|
迎える|むかえる|迎接|v|2
互い|たがい|彼此|n|
お互い|おたがい|彼此|n|
鉄道|てつどう|鐵路|n|
挙げる|あげる|舉出|v|2
誕生|たんじょう|誕生|n|s
各地|かくち|各地|n|
名産|めいさん|名產|n|
詰め込む|つめこむ|塞滿|v|1
生み出す|うみだす|創造出|v|1
冷める|さめる|變涼|v|2
味付け|あじつけ|調味|n|
炊く|たく|煮（飯）|v|1
工夫|くふう|下工夫|n|s
凝らす|こらす|費盡（心思）|v|1
見逃す|みのがす|錯過；忽略|v|1
手に入る|てにはいる|得到|v|1
全国|ぜんこく|全國|n|
現地|げんち|當地|n|
車窓|しゃそう|車窗|n|
景色|けしき|景色|n|
味わう|あじわう|品嚐|v|1
訪れる|おとずれる|造訪|v|2
増える|ふえる|增加|v|2
耳にする|みみにする|聽到|v|3
例えば|たとえば|例如|adv|
驚く|おどろく|驚訝|v|1
わざと||故意|adv|
調べる|しらべる|查|v|2
過ごす|すごす|度過|v|1
おすすめ||推薦|n|s
昼間|ひるま|白天|n|
周り|まわり|周圍|n|
掃除|そうじ|打掃|n|s
姿|すがた|身影|n|
大切|たいせつ|重要；珍惜|na|
場所|ばしょ|地方；位置|n|
気持ち|きもち|心情；感覺|n|
気持ちいい|きもちいい|舒服|i|
浴衣|ゆかた|浴衣|n|
料理|りょうり|料理；菜|n|
家族|かぞく|家人|n|
先週|せんしゅう|上週|n|
説明|せつめい|說明|n|s
食事|しょくじ|用餐|n|s
薬|くすり|藥|n|
旅行中|りょこうちゅう|旅行中|n|
友だち|ともだち|朋友|n|
地下|ちか|地下|n|
一日|いちにち|一天|n|
毎朝|まいあさ|每天早上|n|
顔|かお|臉|n|
卵|たまご|蛋|n|
混む|こむ|擁擠|v|1
がんばる||加油；努力|v|1
頑張る|がんばる|加油；努力|v|1
郵便局|ゆうびんきょく|郵局|n|
銀行|ぎんこう|銀行|n|
散歩|さんぽ|散步|n|s
居酒屋|いざかや|居酒屋|n|
会社|かいしゃ|公司|n|
言葉|ことば|話語；單字|n|
来年|らいねん|明年|n|
銀座線|ぎんざせん|銀座線|name|
階段|かいだん|樓梯|n|
下りる|おりる|下（樓梯）|v|2
晴れる|はれる|放晴|v|2
傘|かさ|傘|n|
温かい|あたたかい|溫暖的；熱的|i|
おいしい||好吃的|i|
いい||好的|i|
かわいい||可愛的|i|
すごい||厲害的|i|
なまえ||名字|n|
おへや||房間|n|
かぎ||鑰匙|n|
ひるごはん||午餐|n|
てんき||天氣|n|
そら||天空|n|
あめ||雨|n|
かさ||傘|n|
ちち||爸爸|n|
はは||媽媽|n|
いもうと||妹妹|n|
ねこ||貓|n|
いぬ||狗|n|
かぞく||家人|n|
えき||車站|n|
でんしゃ||電車|n|
ふくろ||袋子|n|
おちゃ||茶|n|
ぜんぶ||全部|n|
えん||日圓|ctr|
たいわん||台灣|name|
にほん||日本|name|
にほんご||日文|n|
べんきょう||學習|n|s
かう||買|v|1
もつ||拿；帶|v|1
つく||到達|v|1
`;

  /* ---------------- 字典 ---------------- */
  const DICT = new Map();          // 表層形 → [cand]
  const BYBASE = new Map();        // 辭書形 → entry
  const builtLv = new Set();
  const LVOF = new Map();         // 辭書形 → 最低等級（補充字典條目借用）
  let supBuilt = false;
  const UKEY = 'jpq.read.udict';
  let USER = {};
  try { USER = JSON.parse(localStorage.getItem(UKEY) || '{}') || {}; } catch (e) { USER = {}; }

  const clean = s => String(s || '').replace(/\s*[（(][^）)]*[）)]/g, '').split(/\s*[;；]\s*/)[0].trim();
  const variants = s => String(s || '').replace(/\s*[（(][^）)]*[）)]/g, '').split(/\s*[;；]\s*/).map(x => x.trim()).filter(Boolean);

  function addKey(surface, cand) {
    if (!surface || surface.length > MAXL) return;
    // 單一平假名（け、こ、ゆ、さ…）只收助詞等補充字典條目，避免把「だらけ」「こわばる」拆成「毛」「孩子」
    if (surface.length === 1 && isHira(surface) && !((cand.e.sup || cand.e.ext) && cand.e.jp === surface)) return;
    let a = DICT.get(surface);
    if (!a) DICT.set(surface, a = []);
    if (a.length >= 6) return;
    if (a.some(c => c.e === cand.e && c.form === cand.form)) return;
    a.push(cand);
  }
  // 一個字典條目 → 登記所有表層形（含活用）
  function addEntry(e, baseCost) {
    if (!BYBASE.has(e.jp)) BYBASE.set(e.jp, e);
    const surfaces = variants(e.raw || e.jp);
    const kana = e.kana || '';
    surfaces.forEach(sf => {
      const kanji = hasKanji(sf);
      register(e, sf, kana || sf, baseCost);
      // 漢字詞的假名寫法：較低優先（避免把助詞串誤認為詞）
      if (kanji && kana && kana !== sf) {
        const soft = /^(adv|int|conj|pron|i|na|pre)$/.test(e.pos);
        register(e, kana, kana, baseCost + (soft ? .3 : 1.2) + (kana.length <= 2 ? 1.6 : 0), true);
      }
    });
  }
  function register(e, sf, rd, cost, viaKana) {
    const add = (s, r, form, c) => addKey(s, { e, form, r, cost: c + (form === 'stem' ? .15 : form && form !== 'dict' ? .05 : 0), kana: !!viaKana });
    add(sf, rd, 'dict', cost);
    if (e.pos === 'v' && window.MIND && MIND.conjugate) {
      verbForms(sf, e.grp, rd).forEach(([s, r, form]) => add(s, r, form, cost));
    } else if (e.pos === 'i') {
      adjForms(sf, rd).forEach(([s, r, form]) => add(s, r, form, cost));
    } else if (e.grp === 's' && window.MIND && MIND.conjugate) {
      verbForms(sf + 'する', 3, rd + 'する').forEach(([s, r, form]) => add(s, r, 'suru:' + form, cost));
    }
  }
  const FORM_ZH = { masu: 'ます形', te: 'て形', ta: '過去', nai: '否定', pot: '可能', pass: '被動', caus: '使役', cpass: '使役被動', vol: '意向', imp: '命令', ba: '假定', tara: 'たら', stem: '連用形', masen: '否定（禮貌）', mashita: '過去（禮貌）', maseNdeshita: '過去否定（禮貌）', mashou: '邀請', tai: '想要', nakatta: '過去否定', nakute: '否定て形', naide: '不要…', nakereba: '如果不', teru: '正在', tari: '又…又', chau: '〜てしまう（口語）', cha: '〜ては（口語）', toku: '〜ておく（口語）' };
  function verbForms(w, grp, rd) {
    const f = MIND.conjugate(w, grp), fr = rd && rd !== w ? MIND.conjugate(rd, grp) : f;
    if (!f || !fr) return [];
    const out = [];
    // ある的否定形是「ない」（助動詞），不登記成「有」
    const P = (k, s, r) => { if (s && s !== w && !(/^(ある|有る)$/.test(w) && /^な/.test(s))) out.push([s, r || s, k]); };
    ['masu', 'te', 'ta', 'nai', 'pot', 'pass', 'caus', 'cpass', 'vol', 'imp', 'ba', 'tara'].forEach(k => P(k, f[k], fr[k]));
    const st = f.masu.slice(0, -2), sr = fr.masu.slice(0, -2);
    if (st.length > 1 || hasKanji(st)) P('stem', st, sr);
    [['masen', 'ません'], ['mashita', 'ました'], ['maseNdeshita', 'ませんでした'], ['mashou', 'ましょう'], ['tai', 'たい'], ['tai', 'たく'], ['tai', 'たかった'], ['tai', 'たくない'], ['tai', 'たくて'], ['stem', 'ながら'], ['stem', 'すぎる'], ['stem', 'すぎ'], ['stem', 'やすい'], ['stem', 'にくい'], ['stem', 'なさい'], ['stem', 'かた'], ['stem', '方']]
      .forEach(([k, x]) => P(k, st + x, sr + (x === '方' ? 'かた' : x)));
    const nb = f.nai.slice(0, -1), nr = fr.nai.slice(0, -1);
    const zb = f.nai.slice(0, -2), zr = fr.nai.slice(0, -2);
    if (f.nai !== 'ない') { P('nai', zb + 'ず', zr + 'ず'); P('nai', zb + 'ずに', zr + 'ずに'); }
    [['nakatta', 'かった'], ['nakute', 'くて'], ['naide', 'いで'], ['nakereba', 'ければ'], ['nakereba', 'きゃ'], ['nakereba', 'くちゃ'], ['nai', 'くても']].forEach(([k, x]) => P(k, nb + x, nr + x));
    [['teru', 'る'], ['teru', 'た'], ['teru', 'ます'], ['te', 'も'], ['te', 'は']].forEach(([k, x]) => P(k, f.te + x, fr.te + x));
    P('tari', f.ta + 'り', fr.ta + 'り');
    // 口語縮約：〜ちゃう／〜ちゃ（てしまう、ては）、〜とく（ておく）、〜らんない（られない）
    const tb = f.te.slice(0, -1), trb = fr.te.slice(0, -1), dz = /で$/.test(f.te);
    const CH = dz ? 'じゃ' : 'ちゃ', TO = dz ? 'ど' : 'と';
    ['う', 'った', 'って', 'います', 'いました', ''].forEach(x => P(x ? 'chau' : 'cha', tb + CH + x, trb + CH + x));
    ['く', 'いて', 'いた', 'きます'].forEach(x => P('toku', tb + TO + x, trb + TO + x));
    if (String(grp) === '2') { P('pot', st + 'らんない', sr + 'らんない'); P('pot', st + 'らんねえ', sr + 'らんねえ'); }
    // 可能／被動／使役形本身是二類動詞，再展開常用形
    ['pot', 'pass', 'caus'].forEach(k => {
      const g = MIND.conjugate(f[k], 2), gr = MIND.conjugate(fr[k], 2); if (!g || !gr) return;
      ['masu', 'te', 'ta', 'nai', 'vol'].forEach(x => P(k, g[x], gr[x]));
      P(k, g.masu.replace(/ます$/, 'ません'), gr.masu.replace(/ます$/, 'ません'));
      P(k, g.masu.replace(/ます$/, 'ました'), gr.masu.replace(/ます$/, 'ました'));
      P(k, g.nai.replace(/い$/, 'かった'), gr.nai.replace(/い$/, 'かった'));
    });
    return out;
  }
  function adjForms(w, rd) {
    const st = /(いい|良い)$/.test(w) ? w.slice(0, -2) + (w.endsWith('良い') ? '良' : 'よ') : w.slice(0, -1);
    const sr = /(いい|よい)$/.test(rd) ? rd.slice(0, -2) + 'よ' : rd.slice(0, -1);
    return ['くない', 'かった', 'くなかった', 'くて', 'ければ', 'く', 'くなる', 'くなった', 'くなります', 'くなりました', 'くありません', 'くても', 'さ', 'そう', 'すぎる', 'すぎ', 'くないです', 'かったです']
      .map(x => [st + x, sr + x, 'adj']);
  }

  function buildSup() {
    if (supBuilt) return; supBuilt = true;
    SUP.forEach(([s, k, zh, pos, c]) => addEntry({ jp: s, raw: s, kana: k || '', zh, pos, lv: 'x', sup: 1 }, c));
    SUP2.trim().split(/\r?\n/).forEach(l => {
      const [jp, k, zh, pos, g] = l.split('|');
      if (!jp || (pos === 'v' && !(window.MIND && MIND.conjugate))) return;
      addEntry({ jp, raw: jp, kana: k || '', zh, pos, grp: g || '', lv: 'x', sup: 1 }, pos === 'part' ? .6 : .85);
    });
    if (window.MIND && MIND.conjugate) SUPV.forEach(([s, k, zh, g]) => addEntry({ jp: s, raw: s, kana: k || '', zh, pos: 'v', grp: g, lv: 'x', sup: 1 }, .9));
    // 場景單字（13 場景）
    (window.SCENES || []).forEach(sc => (sc.vocab || []).forEach(w => {
      if (!w || !w.jp || w.jp.length > MAXL || /[ 　/／〜]/.test(w.jp)) return;
      addEntry({ jp: w.jp, raw: w.jp, kana: w.kana && w.kana !== w.jp ? w.kana : '', zh: w.zh, pos: 'n', lv: 'x', romaji: w.romaji, from: sc.name }, 1);
    }));
  }
  function buildLv(lv) {
    if (builtLv.has(lv) || !(window.MIND && MIND.lex && MIND.lex[lv])) return;
    builtLv.add(lv);
    MIND.lex[lv].forEach(r => {
      const raw = r[0];
      let k = clean(r[1]);
      // 詞庫裡サ變名詞的讀音有些多了「する」（輸出→ゆしゅつする），去掉
      if (r[4] === 's' && /する$/.test(k) && !/する$/.test(clean(raw))) k = k.slice(0, -2);
      const e = { jp: clean(raw), raw, kana: k, zh: r[2], pos: r[3], grp: r[4], lv };
      variants(raw).forEach(v => { if (!LVOF.has(v)) LVOF.set(v, lv); });
      addEntry(e, 1 + (r[3] === 'suf' || r[3] === 'ctr' ? .6 : 0) + (r[7] === 0 ? .05 : 0));
    });
  }
  // 新聞／歌詞補充字典（data/reading/dict-news.js）：複合詞成本低於拆開，長詞優先
  let extBuilt = false;
  function buildExt() {
    if (extBuilt || !window.JP_DICT_EXT || !(window.MIND && MIND.conjugate)) return; extBuilt = true;
    String(window.JP_DICT_EXT).split(/\r?\n/).forEach(l => {
      const [jp, k, zh, pos, g, lv] = l.split('|');
      if (!jp || !zh || jp.length > MAXL) return;
      // 詞庫已有的詞維持原成本（不改變既有斷詞），新詞才給低成本
      const cost = pos === 'exp' ? .7 : pos === 'suf' ? 1.2 : LVOF.has(jp) || BYBASE.has(jp) ? 1 : jp.length >= 3 ? .75 : .8;
      addEntry({ jp, raw: jp, kana: k || '', zh, pos: pos || 'n', grp: g || '', lv: /^N[1-5]$/.test(lv) ? lv : 'x', ext: 1 }, cost);
    });
  }
  function build() {
    if (window.MIND && MIND.conjugate) buildSup();
    ALL_LV.forEach(buildLv);
    buildExt();
  }

  let readyP = null, fullP = null, gramP = null;
  function ready(full) {
    if (!readyP) {
      const L = (typeof App !== 'undefined' && App.loadScript) ? App.loadScript : (() => Promise.resolve());
      readyP = [MIND_SRC + 'conj.js'].concat(BASE_LV.map(l => MIND_SRC + 'lex-' + l.toLowerCase() + '.js'), [EXT_SRC])
        .reduce((p, s) => p.then(() => L(s).catch(() => { })), Promise.resolve())
        .then(() => { build(); });
    }
    if (!full) return readyP;
    return fullP || (fullP = readyP.then(() => ['N2', 'N1'].reduce((p, l) => p.then(() => App.loadScript(MIND_SRC + 'lex-' + l.toLowerCase() + '.js').catch(() => { })), Promise.resolve())).then(build));
  }
  function ensureGrammar() {
    return gramP || (gramP = (window.MIND && MIND.gram && MIND.gram.length ? Promise.resolve() : App.loadScript(MIND_SRC + 'grammar.js')).then(buildGram).catch(() => { gramP = null; }));
  }

  /* ---------------- 數字＋量詞 ---------------- */
  const DIG = '０１２３４５６７８９';
  const toAsciiNum = s => s.replace(/[０-９]/g, c => DIG.indexOf(c)).replace(/[，,]/g, '');
  const KNUM = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000, '万': 10000 };
  function numRead(n) {
    if (!(n >= 0) || n > 99999999 || n % 1) return '';
    if (n === 0) return 'ゼロ';
    const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
    let out = '';
    const man = Math.floor(n / 10000); if (man) { out += numRead(man) + 'まん'; n %= 10000; }
    const th = Math.floor(n / 1000); if (th) out += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : D[th] + 'せん';
    n %= 1000; const h = Math.floor(n / 100); if (h) out += h === 1 ? 'ひゃく' : h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : D[h] + 'ひゃく';
    n %= 100; const t = Math.floor(n / 10); if (t) out += (t === 1 ? '' : D[t]) + 'じゅう';
    n %= 10; if (n) out += D[n];
    return out;
  }
  const CTR = {
    '円': ['えん', '日圓'], '時': ['じ', '點（時刻）'], '分': ['ふん', '分鐘'], '人': ['にん', '人'], '個': ['こ', '個'], '枚': ['まい', '張'], '本': ['ほん', '支；瓶'], '回': ['かい', '次'], '階': ['かい', '樓'],
    '番': ['ばん', '號'], '泊': ['はく', '晚（住宿）'], '日': ['にち', '日；天'], '月': ['がつ', '月'], '年': ['ねん', '年'], '歳': ['さい', '歲'], '杯': ['はい', '杯；碗'], '名': ['めい', '位'], '号車': ['ごうしゃ', '號車廂'],
    '番線': ['ばんせん', '號月台'], '分間': ['ふんかん', '分鐘'], '時間': ['じかん', '小時'], '日間': ['にちかん', '天'], '週間': ['しゅうかん', '週'], 'か月': ['かげつ', '個月'], 'ヶ月': ['かげつ', '個月'], '度': ['ど', '度；次'], '番目': ['ばんめ', '第…個'], '冊': ['さつ', '本（書）'], '台': ['だい', '台'], '匹': ['ひき', '隻'], '着': ['ちゃく', '件（衣服）'], '品': ['ひん', '道（菜）'], '倍': ['ばい', '倍'], '割': ['わり', '成'], '駅': ['えき', '站'], 'つ': ['つ', '個'], 'えん': ['えん', '日圓'],
    'カ月': ['かげつ', '個月'], 'ヵ月': ['かげつ', '個月'], 'ケ月': ['かげつ', '個月'], 'か国': ['かこく', '國'], 'カ国': ['かこく', '國'], 'ヵ国': ['かこく', '國'], 'ヶ国': ['かこく', '國'], 'か所': ['かしょ', '處'], 'カ所': ['かしょ', '處'], 'ヶ所': ['かしょ', '處'],
    '万': ['まん', '萬'], '億': ['おく', '億'], '兆': ['ちょう', '兆'], '万円': ['まんえん', '萬日圓'], '億円': ['おくえん', '億日圓'], '兆円': ['ちょうえん', '兆日圓'], '万人': ['まんにん', '萬人'], '千円': ['せんえん', '千日圓'],
    '件': ['けん', '件'], '人目': ['にんめ', '第…人'], '回目': ['かいめ', '第…次'], '度目': ['どめ', '第…次'], '秒': ['びょう', '秒'], '位': ['い', '名（名次）'], '点': ['てん', '分；件'], '議席': ['ぎせき', '席'],
    '％': ['パーセント', '%'], '%': ['パーセント', '%'], '年ぶり': ['ねんぶり', '年來首次'], '年前': ['ねんまえ', '年前'], '日前': ['にちまえ', '天前'], '年代': ['ねんだい', '年代'], '年度': ['ねんど', '年度'], '代': ['だい', '多歲；代'], 'ドル': ['ドル', '美元'], 'キロ': ['キロ', '公里；公斤'], 'メートル': ['メートル', '公尺']
  };
  const CTR_KEYS = Object.keys(CTR).sort((a, b) => b.length - a.length);
  const DAY = { 1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか' };
  function ctrRead(n, c) {
    const nr = numRead(n), last = n % 10, ten = n % 100 === 10 || (n >= 10 && last === 0 && n < 100);
    const swap = (from, to) => nr.replace(new RegExp(from + '$'), to);
    switch (c) {
      case '時': return n === 4 ? 'よじ' : n === 7 ? 'しちじ' : n === 9 ? 'くじ' : nr.replace(/よん$/, 'よ').replace(/なな$/, 'しち').replace(/きゅう$/, 'く') + 'じ';
      case '分': case '分間': { const tail = c === '分間' ? 'かん' : ''; if (last === 1) return swap('いち', 'いっ') + 'ぷん' + tail; if (last === 3 || last === 4) return nr + 'ぷん' + tail; if (last === 6) return swap('ろく', 'ろっ') + 'ぷん' + tail; if (last === 8) return swap('はち', 'はっ') + 'ぷん' + tail; if (ten) return swap('じゅう', 'じゅっ') + 'ぷん' + tail; return nr + 'ふん' + tail; }
      case '人': return n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : n === 4 ? 'よにん' : nr + 'にん';
      case '日': return DAY[n] || nr + 'にち';
      case '月': return n === 4 ? 'しがつ' : n === 7 ? 'しちがつ' : n === 9 ? 'くがつ' : nr + 'がつ';
      case '本': case '杯': case '泊': {
        const h = { '本': ['ほん', 'ぼん', 'ぽん'], '杯': ['はい', 'ばい', 'ぱい'], '泊': ['はく', 'ぱく', 'ぱく'] }[c];
        if (last === 1) return swap('いち', 'いっ') + h[2]; if (last === 3) return nr + h[1]; if (last === 6) return swap('ろく', 'ろっ') + h[2]; if (last === 8) return swap('はち', 'はっ') + h[2]; if (ten) return swap('じゅう', 'じゅっ') + h[2]; return nr + h[0];
      }
      case '兆': case '兆円': return (last === 1 && n < 10 ? swap('いち', 'いっ') : last === 8 ? swap('はち', 'はっ') : ten ? swap('じゅう', 'じゅっ') : nr) + CTR[c][0];
      case '個': case '回': case '階': case 'か月': case 'ヶ月': case 'カ月': case 'ヵ月': case 'ケ月': case 'か国': case 'カ国': case 'ヵ国': case 'ヶ国': case 'か所': case 'カ所': case 'ヶ所': case '件': case '回目': {
        const k = CTR[c][0];
        if (last === 1) return swap('いち', 'いっ') + k; if (last === 6) return swap('ろく', 'ろっ') + k; if (last === 8) return swap('はち', 'はっ') + k; if (ten) return swap('じゅう', 'じゅっ') + k;
        if (c === '階' && last === 3) return nr + 'がい'; return nr + k;
      }
      case '歳': if (n === 20) return 'はたち'; if (last === 1) return swap('いち', 'いっ') + 'さい'; if (last === 8) return swap('はち', 'はっ') + 'さい'; if (ten) return swap('じゅう', 'じゅっ') + 'さい'; return nr + 'さい';
      case 'つ': return ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお'][n] || nr;
      default: return nr + CTR[c][0];
    }
  }

  /* ---------------- 斷詞 ---------------- */
  const SYM = /[\s　、。，．！？!?「」『』（）()【】［］\[\]・…：:；;〜~ー―\-／/"'”“’‘《》〈〉♪☆★※→←↑↓・,.]/;
  function scriptOf(c) { if (isKanji(c)) return 'k'; if (isHira(c)) return 'h'; if (isKata(c)) return 't'; if (/[0-9０-９]/.test(c)) return 'd'; if (SYM.test(c)) return 's'; if (/[A-Za-zＡ-Ｚａ-ｚ]/.test(c)) return 'a'; return 'o'; }
  function runEnd(text, i, sc) { let j = i + 1; while (j < text.length && scriptOf(text[j]) === sc) j++; return j; }

  function tokenize(text) {
    text = String(text || '');
    const N = text.length;
    if (!N) return [];
    const best = new Float64Array(N + 1).fill(Infinity), prev = new Int32Array(N + 1), pick = new Array(N + 1);
    best[0] = 0;
    const relax = (i, j, c, info) => { const v = best[i] + c; if (v < best[j] - 1e-9) { best[j] = v; prev[j] = i; pick[j] = info; } };
    for (let i = 0; i < N; i++) {
      if (best[i] === Infinity) continue;
      const ch = text[i], sc = scriptOf(ch);
      if (sc === 's') {
        if (ch === 'ー' && i > 0 && isKata(text[i - 1])) { /* 長音屬於片假名 */ } else { relax(i, i + 1, 0, { t: 'sym' }); continue; }
      }
      if (sc === 'd' || (sc === 'k' && KNUM[ch] != null)) {
        // 數字＋量詞
        let j = i;
        if (sc === 'd') { while (j < N && /[0-9０-９,，.]/.test(text[j])) j++; }
        else { while (j < N && KNUM[text[j]] != null) j++; }
        const numS = text.slice(i, j);
        const n = sc === 'd' ? Number(toAsciiNum(numS)) : kanjiNum(numS);
        if (j > i) {
          relax(i, j, sc === 'd' ? .5 : 2.2, { t: 'num', n });
          for (const c of CTR_KEYS) if (text.startsWith(c, j)) { relax(i, j + c.length, sc === 'd' ? .4 : 1.6, { t: 'num', n, ctr: c }); break; }
        }
      }
      if (USER_KEYS.size) for (let L = Math.min(MAXL, N - i); L >= 1; L--) { const k = text.substr(i, L); if (USER[k]) { relax(i, i + L, .7, { t: 'user', s: k }); break; } }
      // 漢字連續段：單一漢字詞夾在漢字之間（米国→米＋国、半導体→…体）多半是拆錯，加成本；
      // 段長 ≥3 時，常見前後綴（〜人、〜的、全〜、新〜…）不加
      // 人名＋敬稱（田中様、山田さん、佐藤氏）：整組不拆、不入單字表
      if (sc === 'k' && !(i > 0 && (isKanji(text[i - 1]) || /[おご]/.test(text[i - 1])))) {
        let b = i; while (b < N && isKanji(text[b]) && KNUM[text[b]] == null) b++;
        let run = text.slice(i, b), hon = '';
        const tail = text.slice(b).match(/^(さま|さん|くん|ちゃん|先生)/);
        if (tail) hon = tail[1];
        else if (run.length >= 3 && /[様氏君殿]$/.test(run)) { hon = run.slice(-1); run = run.slice(0, -1); }
        if (hon && run.length >= 2 && run.length <= 4) {
          const dc = DICT.get(run);
          if (!(dc && dc.some(c => c.e.pos !== 'name'))) relax(i, i + run.length + hon.length, .6, { t: 'hon', hon });
        }
      }
      let kRun = 0, kPos = 0;
      if (sc === 'k') { let a = i; while (a > 0 && isKanji(text[a - 1]) && KNUM[text[a - 1]] == null) a--; let b = i; while (b < N && isKanji(text[b]) && KNUM[text[b]] == null) b++; kRun = b - a; kPos = i - a; }
      for (let L = 1; L <= MAXL && i + L <= N; L++) {
        const cands = DICT.get(text.substr(i, L));
        if (!cands) continue;
        let b = cands[0];
        for (const c of cands) if (c.cost < b.cost - 1e-9 || (Math.abs(c.cost - b.cost) < 1e-9 && c.form === 'dict' && b.form === 'stem')) b = c;
        let cost = b.cost;
        if (L === 1 && kRun >= 2 && KNUM[ch] == null && !(kRun >= 3 && AFFIX.test(ch)) && !/^(suf|ctr)$/.test(b.e.pos)) cost += 2.2;
        relax(i, i + L, cost, { t: 'w', c: b, all: cands });
      }
      if (sc === 't' || sc === 'a' || sc === 'o') { const j = runEnd(text, i, sc); relax(i, j, sc === 't' ? 2.4 : 1, { t: 'unk', sc }); }
      else if (sc === 'k') { const j = runEnd(text, i, 'k'); relax(i, i + 1, 4, { t: 'unk', sc }); for (let e = i + 2; e <= j; e++) relax(i, e, 3 + (e - i), { t: 'unk', sc }); }
      else relax(i, i + 1, sc === 'h' ? 5 : 3, { t: 'unk', sc });
    }
    // 回溯
    const segs = [];
    for (let j = N; j > 0; j = prev[j]) segs.push([prev[j], j, pick[j]]);
    segs.reverse();
    const out = [];
    for (let [i, j, info] of segs) {
      const s = text.slice(i, j);
      const last = out[out.length - 1];
      // 連續未知漢字合併
      if (info.t === 'unk' && last && last.pos === 'unk' && info.sc === 'k' && last.sc === 'k') { last.s += s; last.base = last.s; continue; }
      if (info.t === 'w' && info.all && info.all.length > 1) info = ctxPick(info, s, out, text, j);
      const tk = mkToken(s, i, info);
      ctxFix(tk, out, text, j);
      // 動詞／形容詞後面黏著的 1–2 個假名（ちゃ、くら、らん…）多半是活用或口語殘片，不給字典意思
      if (last && tk.known && tk.viaKana && isKanaStr(s) && s.length <= 2 && !/^(part|aux|cop|suf|int|conj)$/.test(tk.pos) && !FORMAL.test(s) && (/^(v|i)$/.test(last.pos) || last.form)) {
        Object.assign(tk, { zh: '', pos: 'unk', known: false, unreg: false, frag: true, alts: [] });
      }
      // 〜ていただく／ご〜いただく：補助動詞（請您…、承蒙…），不是「開動了／收下」
      if (last && /^(いただく|頂く)$/.test(tk.base) || last && /^いただ/.test(s) && tk.pos === 'exp') {
        if ((last.form && /[てで]$/.test(last.s)) || /[てで]$/.test(last.s) && /^(v|aux)$/.test(last.pos) || (/^(n|na)$/.test(last.pos) && (/^[ごお御]/.test(last.s) || /^[ごお御]$/.test((out[out.length - 2] || {}).s || '')))) {
          Object.assign(tk, { base: 'いただく', bkana: 'いただく', pos: 'v', zh: '（謙讓補助動詞）請您…；承蒙您…', aux2: true });
        }
      }
      out.push(tk);
    }
    return postFix(out, text);
  }
  // 斷詞後修正（評審 v16 P0）：名詞＋がい…（君がいなくなった）是「が＋いる」，不是「がい＝害處」；と＋思う／言う 的と是引用
  function postFix(out, text) {
    for (let k = 1; k < out.length; k++) {
      const t = out[k], p = out[k - 1];
      if (t.s === 'がい' && /^(n|pron|name|unk)$/.test(p.pos || '') && !/^(v|i)$/.test(p.pos || '')) {
        const nx = out[k + 1], end = nx ? nx.i + nx.s.length : t.i + 2;
        const ga = tokenize('が')[0]; ga.i = t.i;
        const sub = tokenize(text.slice(t.i + 1, end)).map(x => Object.assign(x, { i: x.i + t.i + 1 }));
        out.splice(k, nx ? 2 : 1, ga, ...sub);
      }
      // 動詞／形容詞＋ことに（行くことにした、食べたことに気づいた）是「こと＋に」，不是副詞「尤其」
      if (t.s === 'ことに' && t.pos === 'adv' && (/^(v|i|aux|na)$/.test(p.pos || '') || p.s === 'な')) {   // な形容詞＋な＋ことに（好きなことに）也是
        const a = tokenize('こと')[0], b = tokenize('に')[0]; a.i = t.i; b.i = t.i + 2;
        out.splice(k, 1, a, b);
      }
      // 〜なければならない／〜なくてはならない／〜ないといけない：文法「必須」，不是「變成」
      if (t.base === 'なる' && /^ならな|^なりません/.test(t.s) && /(なければ|なくては|なくちゃ|なきゃ|ねば)$/.test(p.s)) Object.assign(t, { zh: '（文法）必須…（〜なければならない）', pos: 'aux', gram: true });
      // 名詞＋だと＋思う／言う：だ＋と（引用），不是接續詞「若是那樣」
      if (t.s === 'だと' && out[k + 1] && /^(思う|言う|いう|考える|感じる|聞く|話す|信じる|わかる|分かる|知る|気づく|聞こえる)$/.test(out[k + 1].base || '') && /^(n|na|pron|name|unk)$/.test(p.pos || '')) {
        const a = tokenize('だ')[0], b = tokenize('と')[0]; a.i = t.i; b.i = t.i + 1;
        out.splice(k, 1, a, b); continue;
      }
      // 動詞＋たほうがいい：た＋ほう（最好…），不是「他方＝另一方面」
      if (t.s === 'たほう' && /^(v|aux)$/.test(p.pos || '')) {
        const a = tokenize('た')[0], b = tokenize('ほう')[0]; a.i = t.i; b.i = t.i + 1;
        Object.assign(b, { zh: '（〜たほうがいい）最好…', gram: true });
        out.splice(k, 1, a, b); continue;
      }
      if ((t.s === 'ほう' || t.s === '方') && /^(v|aux)$/.test(p.pos || '') && /[ただ]$/.test(p.s) && out[k + 1] && /^が/.test(out[k + 1].s)) Object.assign(t, { kana: 'ほう', bkana: 'ほう', zh: '（〜たほうがいい）最好…', gram: true });
      // 〜のせい：都怪…（不是「身高」）
      if (t.s === 'せい' && p.s === 'の') Object.assign(t, { zh: '（〜のせい）都怪…；因為…（不好的原因）', pos: 'n' });
      // 〜ごとに：每…（一日ごとに、国ごとに）；丸ごと、街ごと 才是「連同整個」
      if (t.s === 'ごと' && out[k + 1] && out[k + 1].s === 'に') Object.assign(t, { zh: '（〜ごとに）每…；各…' });
      // 數量詞＋目：第…（二日目、三回目、一つ目）
      if (t.s === '目' && (p.pos === 'num' || /[日回人番年つ度杯個軒本枚週]$/.test(p.s))) Object.assign(t, { kana: 'め', bkana: 'め', zh: '（接尾）第…', pos: 'suf' });
      if (t.s === 'と' && t.pos === 'part' && out[k + 1] && /^(思う|言う|いう|考える|感じる|聞く|話す|書く|答える|叫ぶ|わかる|分かる|知る)$/.test(out[k + 1].base || '')) Object.assign(t, { zh: '（引用）表示說／想的內容' });
    }
    return out;
  }
  /* ---------- 上下文讀音（評審 v15）：第一候選選錯、正解在同一字面的其他候選 ---------- */
  const PRON = /^(こっち|そっち|あっち|どっち|こちら|そちら|あちら|どちら|右|左|前|後ろ|東|西|南|北|上|下|ほか|他|外|内|奥|手前|向こう)$/;
  const FOOD = /(カレー|ラーメン|料理|味|スープ|ソース|唐辛子|キムチ|わさび|麻婆|担々|辛口|この|これ|それ|あれ|食べ物|ご飯|鍋)/;
  const HARD = /(別れ|仕事|生活|毎日|気持ち|人生|練習|勉強|失恋|思い|現実|立場|経験|日々|朝|離れ|一人)/;
  const OPEN = /(会議|会|パーティー|式|大会|展|店|口座|本|ページ|ファイル|窓口|扉|心|花|祭り|セミナー|講座|教室)/;
  const prevS = (out, n) => out.slice(-n).map(t => t.s).join('');
  function want(info, kana) {
    const k = toHira(kana), hit = info.all.filter(c => toHira(c.e.kana || c.e.jp) === k);
    if (!hit.length) return info;
    let b = hit[0]; for (const c of hit) if (c.cost < b.cost) b = c;
    return Object.assign({}, info, { c: b });
  }
  function ctxPick(info, s, out, text, j) {
    const e = info.c.e, base = e.jp, p1 = out[out.length - 1] || {}, p2 = out[out.length - 2] || {}, nx = text.slice(j, j + 8);
    // 可能形只是另一個動詞的活用撞形（開けて＝開ける，不是「開く」的可能形）
    if (/^pot/.test(info.c.form || '') && p1.s === 'を') { const o = info.all.filter(c => !/^pot/.test(c.form || '')); if (o.length) { let b = o[0]; for (const c of o) if (c.cost < b.cost) b = c; info = Object.assign({}, info, { c: b }); } }
    if (base === '方' || s === '方') {
      if (/^(v|i|aux)$/.test(p1.pos || '') || (p1.s === 'の' && PRON.test(p2.s || '')) || /^(がいい|がよい|がまし|が好き|がずっと|が上手|が安|が高|が早|が楽|よりも?|へ|に向)/.test(nx)) return want(info, 'ほう');
      return info;
    }
    if (/^(空く)$/.test(base) && /(お?腹|おなか|道|道路|電車|バス|車内|店内|お店|会場|館内)が?$/.test(prevS(out, 2))) return want(info, 'すく');   // 肚子餓、路上／車上人少
    if (/^(降りる)$/.test(base) && /(雨|雪|雹|霜)が?$/.test(prevS(out, 2))) return want(info, 'ふる');
    if (info.c.e.jp === '開く' && base === '開く') {
      if (p1.s === 'を') return want(info, 'ひらく');   // 他動詞：口を開く、店を開く、本を開く
      if (/(ドア|窓|戸|箱|蓋|ふた|席|部屋|口|鍵)が?$/.test(prevS(out, 2))) return info;
      if (/^開か(れ|せ)/.test(s) || OPEN.test(prevS(out, 5))) return want(info, 'ひらく');
      return info;
    }
    if (base === '一日' && /月$/.test(prevS(out, 1))) return want(info, 'ついたち');
    if (base === '生' && /^[ァ-ヶー]/.test(nx)) return want(info, 'なま');   // 生＋外來語（生ビール、生クリーム）
    if (base === '辛い') return (HARD.test(prevS(out, 3)) && !FOOD.test(prevS(out, 3))) || /^(思い出|経験|思い|気持ち|日々|時期|過去|別れ|仕事|立場)/.test(nx) ? want(info, 'つらい') : info;
    if (base === '何' && /^(曜日|時|人|回|歳|階|日|月|年|本|枚|個|分|円|番|度|語|色|冊|匹|杯|台|でも|か所)/.test(nx)) return want(info, 'なん');
    return info;
  }
  // 候選裡沒有的讀音／用法：直接改 token
  function ctxFix(tk, out, text, j) {
    const p1 = out[out.length - 1] || {};
    const set = (kana, zh, extra) => Object.assign(tk, { kana, bkana: kana, romaji: R2(kana, tk.s), zh }, extra || {});
    // 〜中（じゅう）：一日中、一年中、世界中；〜中（ちゅう）：会議中、仕事中
    if (tk.s === '中' && p1.s) {
      if (/(一日|一年|一晩|一晩|年|世界|日本|町|家|学校|今日|午前|午後|夜|体)$/.test(p1.s)) return set('じゅう', '（接尾）整個…、…期間一直');
      if (/(会議|授業|仕事|電話|食事|工事|営業|準備|運転|勉強|使用|外出|休憩|今週|今月|来週|来月|今学期|期間|午前)$/.test(p1.s)) return set('ちゅう', '（接尾）…之內；正在…中');
    }
    // 気をつける：小心、注意（不是「開燈」）
    if (/^(付ける|点ける|着ける|つける)$/.test(tk.base) && /気を$/.test(prevS(out, 2))) return Object.assign(tk, { bkana: 'つける', zh: '（気をつける）小心、注意', base: '気をつける' });
    // 名詞＋用（プレゼント用、子供用）：〜用的
    if (tk.s === '用' && /^(n|unk)$/.test(p1.pos || '') && !/[はがをに]$/.test(p1.s)) return set('よう', '（接尾）…用的、供…使用', { pos: 'suf', gram: true });
    // そう：動詞連用形／形容詞語幹＋そう＝樣態；常體＋そうだ＝傳聞（不是「是的」）
    if (/^そう(です|だ|な)?$/.test(tk.s) && p1.s) {
      if (p1.pos === 'v' && (/^(stem|masu)$/.test(p1.form || '') || /[いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ]$/.test(p1.s) && !/^(nai|ta)$/.test(p1.form || '') && p1.form !== '' ) || (p1.pos === 'i' && !/い$/.test(p1.s)) || p1.pos === 'na')
        return set('そう', '（文法：樣態）看起來好像…、快要…', { pos: 'aux', gram: true });
      if (/^(v|i|aux|cop)$/.test(p1.pos || '') || /[るたいだ]$/.test(p1.s)) return set('そう', '（文法：傳聞）聽說…', { pos: 'aux', gram: true });
    }
    // 動詞＋ように：目的／樣態（文法），不當單字
    if (/^よう/.test(tk.s) && /^(v|aux)$/.test(p1.pos || '') && /^ように?/.test(text.slice(j - tk.s.length, j + 2))) return set(tk.kana || 'よう', '（文法）為了…、像…一樣', { pos: 'aux', gram: true });
  }
  const FORMAL = /^(ほう|こと|もの|とき|ため|よう|まま|うち|わけ|はず|ところ|とこ|つもり|ごろ|ころ|ほど|だけ|くらい|ぐらい|さえ|すら|あと|まえ|なか|ため|せい|おかげ|かた|ばかり)$/;
  const HON_ZH = { '様': '敬稱：先生／女士', 'さま': '敬稱：先生／女士', 'さん': '先生／小姐', '氏': '書面敬稱：先生', 'くん': '對男性晚輩', '君': '對男性晚輩', 'ちゃん': '親暱稱呼', '殿': '公文敬稱', '先生': '老師／醫生' };
  const USER_KEYS = new Set(Object.keys(USER));
  const AFFIX = /[人的性化者家店屋円年月日時分秒中内外前後間用型製式率費代料長都道府県市区町村線駅港社省庁局部課室所場館院会員生君様氏側権法案制界産品物類語版号便系層隊団党派州島山川湖寺宮城園橋口目回度位件点歳倍割名台本枚個杯匹冊階番各全新旧元現再非不無未第約総両超大小高低同当毎来今昨翌初最副主諸対反準真半]/;
  function kanjiNum(s) {
    let total = 0, cur = 0, sec = 0;
    for (const c of s) {
      const v = KNUM[c];
      if (v === 10000) { total += ((sec + cur) || 1) * 10000; sec = 0; cur = 0; }
      else if (v >= 10) { sec += (cur || 1) * v; cur = 0; }
      else cur = cur * 10 + v;
    }
    return total + sec + cur;
  }
  function mkToken(s, i, info) {
    if (info.t === 'sym') return { s, base: s, kana: '', romaji: '', zh: '', pos: 'sym', lv: null, i, sym: true };
    if (info.t === 'num') {
      const r = info.ctr ? ctrRead(info.n, info.ctr) : numRead(info.n);
      const zh = info.ctr ? info.n + ' ' + CTR[info.ctr][1] : String(info.n);
      return { s, base: s, kana: r, bkana: r, romaji: R2(r, s), zh, pos: 'num', lv: 'N5', i, known: true };
    }
    if (info.t === 'hon') return { s, base: s, kana: '', bkana: '', romaji: '', zh: `人名＋${info.hon}（${HON_ZH[info.hon] || '敬稱'}）`, pos: 'name', lv: null, i, known: true, hon: info.hon };
    if (info.t === 'user') return { s, base: s, kana: '', bkana: '', romaji: '', zh: USER[s], pos: 'n', lv: null, i, known: true, user: true };
    if (info.t === 'w') {
      const c = info.c, e = c.e;
      const tk = {
        s, base: e.jp, kana: isKanaStr(s) ? s : toHira(c.r), bkana: toHira(e.kana || e.jp), romaji: '', zh: e.zh, pos: e.pos, lv: e.lv === 'x' ? (LVOF.get(e.jp) || null) : e.lv, i, known: true, viaKana: !!c.kana || (hasKanji(e.jp) && !hasKanji(s)),
        form: c.form && c.form !== 'dict' ? c.form : '', alts: info.all.filter(x => x.e !== e).map(x => ({ jp: x.e.jp, kana: x.e.kana, zh: x.e.zh, lv: x.e.lv })).slice(0, 3)
      };
      if (/^suru:/.test(tk.form)) { tk.base = e.jp + 'する'; tk.bkana = toHira(e.kana || e.jp) + 'する'; tk.pos = 'v'; tk.form = tk.form.slice(5); }
      if (e.ext && LVOF.has(e.jp)) tk.lv = LVOF.get(e.jp);
      if (/^(nai|nakatta|nakute|naide|nakereba|masen|maseNdeshita)$/.test(tk.form)) tk.neg = true;
      tk.romaji = tk.pos === 'part' && /^[はへを]$/.test(s) ? { 'は': 'wa', 'へ': 'e', 'を': 'o' }[s] : R2(tk.kana, s);
      return tk;
    }
    const kana = isKanaStr(s) ? s : '';
    // 字典沒有的漢字詞：保留整詞、標「未收錄」（讀音可由原文振假名補上）
    return { s, base: s, kana, bkana: kana, romaji: kana ? R2(s) : '', zh: '', pos: 'unk', lv: null, i, known: false, sc: info.sc, unreg: info.sc === 'k' || hasKanji(s) };
  }

  /* ---------------- 讀音標註 ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 依送假名對齊：只在漢字部分加 <rt>
  function ruby(surface, reading) {
    if (!reading || !hasKanji(surface)) return esc(surface);
    const S = surface, R = toHira(reading), Sh = toHira(S);
    let a = 0, b = 0;
    while (a < S.length && a < R.length && !isKanji(S[a]) && Sh[a] === R[a]) a++;
    while (b < S.length - a && b < R.length - a && !isKanji(S[S.length - 1 - b]) && Sh[S.length - 1 - b] === R[R.length - 1 - b]) b++;
    const mid = S.slice(a, S.length - b), mr = R.slice(a, R.length - b);
    if (!mid || !mr) return esc(S);
    // 中間還有送假名（例：乗り換え）→ 再切一次
    const m = mid.match(/^([㐀-鿿々]+)([ぁ-ゟ]+)([㐀-鿿々]+)$/);
    if (m) { const k = mr.indexOf(m[2], 1); if (k > 0 && mr.length - k - m[2].length > 0) return esc(S.slice(0, a)) + `<ruby>${esc(m[1])}<rt>${esc(mr.slice(0, k))}</rt></ruby>${esc(m[2])}<ruby>${esc(m[3])}<rt>${esc(mr.slice(k + m[2].length))}</rt></ruby>` + esc(S.slice(S.length - b)); }
    return esc(S.slice(0, a)) + `<ruby>${esc(mid)}<rt>${esc(mr)}</rt></ruby>` + esc(S.slice(S.length - b));
  }
  // 整句加讀音（給標題、歌詞用）
  function rubyText(text, on) {
    const tk = tokenize(text);
    return tk.map(t => on ? ruby(t.s, t.kana) : esc(t.s)).join('');
  }
  function lookup(w) {
    w = String(w || '').trim(); if (!w) return null;
    const e = BYBASE.get(w);
    if (e) return { jp: e.jp, kana: e.kana || '', zh: e.zh, pos: e.pos, lv: e.lv === 'x' ? null : e.lv };
    const c = DICT.get(w);
    if (c && c[0]) { const x = c[0].e; return { jp: x.jp, kana: x.kana || '', zh: x.zh, pos: x.pos, lv: x.lv === 'x' ? null : x.lv }; }
    if (USER[w]) return { jp: w, kana: '', zh: USER[w], pos: 'n', lv: null, user: true };
    return null;
  }
  function setUser(w, zh) {
    w = String(w || '').trim(); if (!w) return;
    if (zh) { USER[w] = String(zh).slice(0, 80); USER_KEYS.add(w); } else { delete USER[w]; USER_KEYS.delete(w); }
    try { localStorage.setItem(UKEY, JSON.stringify(USER)); } catch (e) { }
  }

  /* ---------------- 句子 ---------------- */
  function sentences(text) {
    const out = []; let cur = '', start = 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      cur += s[i];
      if (/[。！？!?\n]/.test(s[i]) && !/[」』）]/.test(s[i + 1] || '')) { if (cur.trim()) out.push({ s: cur, i: start }); cur = ''; start = i + 1; }
      else if (/[」』]/.test(s[i]) && /[。！？]/.test(s[i - 1] || '')) { if (cur.trim()) out.push({ s: cur, i: start }); cur = ''; start = i + 1; }
    }
    if (cur.trim()) out.push({ s: cur, i: start });
    return out;
  }

  /* ---------------- 文法偵測 ---------------- */
  let GRAM = null;
  // 句型的其他寫法（斷詞成一個詞的敬體／書面形）
  // 字串＝整個 token；陣列＝依序的片段（可從活用形詞中間開始，例：延期させて＋いただきます）
  const IDK = ['いただきます', 'いただけます', 'いただけません', 'いただけませんか', 'いただきたい', 'いただきたく', 'いただいて', 'いただいた', 'いただければ', 'いただけない', 'いただく', 'いただき'];
  const GRAM_ALIAS = {
    'gram:〜によると／〜によれば': ['によりますと', 'によれば'],
    'gram:〜について': ['につきまして', 'につきましては'],
    'gram:〜させていただく': IDK.map(x => ['させて', x]),
    'gram:〜ていただく': IDK.map(x => ['て', x]).concat(IDK.map(x => ['で', x])),
    'gram:〜わけではない': [['わけ', 'ではありません'], ['わけ', 'ではない'], ['わけ', 'じゃない'], ['わけ', 'ではなく']]
  };
  function buildGram() {
    if (GRAM || !(window.MIND && MIND.gram)) return;
    const seen = new Set(), LVO = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
    GRAM = [];
    MIND.gram.forEach(g => {
      const alts = [];
      String(g.pat).replace(/（[^）]*）/g, '').split(/[／・]/).forEach(a => {
        a = a.trim(); if (!a) return;
        if (/[＋+A-Za-zＡ-Ｚ形詞]/.test(a)) return;
        // (ら) 這種可省略字
        const opt = a.match(/\(([^)]*)\)/);
        const vs = opt ? [a.replace(/\([^)]*\)/, ''), a.replace(/\(([^)]*)\)/, '$1')] : [a];
        vs.forEach(v => {
          const lead = /^[〜~]/.test(v);
          const segs = v.split(/[〜~…]+/).map(x => x.trim()).filter(Boolean);
          const len = segs.join('').length;
          if (!segs.length || len < 2) return;
          if (segs.some(x => /[^ぁ-ゟァ-ー㐀-鿿々]/.test(x))) return;
          // 開頭是助詞（って、から、けど…）時，必須從 token 開頭算起，避免把「乗って」誤判成引用的って
          const c0 = DICT.get(segs[0]);
          alts.push({ segs, lead, p: !!(c0 && c0.some(x => /^(part|cop)$/.test(x.e.pos))) });
        });
      });
      (GRAM_ALIAS[g.id] || []).forEach(x => alts.push(Array.isArray(x) ? { segs: x, lead: true, p: false } : { segs: [x], lead: true, p: true }));
      if (!alts.length) return;
      const sig = alts.map(a => (a.lead ? '~' : '') + a.segs.join('~')).sort().join('|');
      if (seen.has(sig)) return; seen.add(sig);
      GRAM.push({ g, alts, o: (LVO[g.lv] || 0) * 1000 + (g.ord || 0) });
    });
    GRAM.sort((a, b) => a.o - b.o);
  }
  // 誤判排除表：檢查句型前一個 token（prev）是否符合接續；不符合就不算
  const NOUNISH = /^(n|name|pron|num|unk|suf|ctr)$/;
  const PREDISH = /^(v|i|aux|cop)$/;
  const GRAM_EXCL = {
    // 〜から（理由）：前面要是述語（動詞、形容詞、だ／です／ます…），「輸出から」「駅から」是起點
    'gram:〜から（理由）': p => !!p && (PREDISH.test(p.pos) || !!p.form || /[たいだすぬう]$/.test(p.s) && !NOUNISH.test(p.pos)),
    // 〜より（比較）：前面是名詞；「によりますと」「により」是依據
    'gram:〜より': p => !!p && p.s !== 'に' && !/に$/.test(p.s),
    // 〜には（目的）：前面要是動詞辭書形；「駅には」是場所に＋は
    'gram:〜には（目的）': p => !!p && p.pos === 'v' && !p.form,
    // 數量詞＋からの／からある／からする（多達）：前面要是數量
    'gram:〜からの': p => !!p && p.pos === 'num',
    'gram:〜からある': p => !!p && p.pos === 'num',
    'gram:〜からする': p => !!p && p.pos === 'num',
    'gram:〜も（數量強調）': p => !!p && p.pos === 'num',
    // 〜まで（甚至）：「から…まで」「までに（期限）」的まで不算
    'gram:〜まで（甚至）': (p, sn, idx) => !!p && NOUNISH.test(p.pos) && sn.lastIndexOf('から', idx) < 0 && sn[idx + 2] !== 'に',
    'gram:〜まで（極端）': (p, sn, idx) => !!p && NOUNISH.test(p.pos) && sn.lastIndexOf('から', idx) < 0 && sn[idx + 2] !== 'に',
    // 〜(よ)うと（不管）：後面接 する／思う／考える…是「〜ようとする」「〜ようと思う」
    'gram:〜(よ)うと': (p, sn, idx, ct, x) => !/^(する|した|して|し[てたなま]|せず|思|おも|考|決|努|試)/.test(sn.slice(idx + x.seg.length)),
    // 〜として（作為）：「守ろうとして」是〜ようとする
    'gram:〜として': p => !(p && p.form === 'vol'),
    // 〜につき：「につきまして」＝について的敬語
    'gram:〜につき': (p, sn, idx, ct, x) => !/^まし/.test(sn.slice(idx + x.seg.length)),
    // 〜もの（理由）／〜もの・もん：「ものの」「というもの」不算
    'gram:〜もの（理由）': (p, sn, idx, ct, x) => !/^の/.test(sn.slice(idx + x.seg.length)),
    'gram:〜もの／〜もん': (p, sn, idx, ct, x) => !/^の/.test(sn.slice(idx + x.seg.length)),
    // 〜によって（行為者）：同一句後面要有被動形；「見直しによって減った」「観光によって生まれる」是原因／手段
    'gram:〜によって（行為者）': (p, sn, idx, ct, x) => { for (let k = x.end; k < x.sEnd; k++) { const t = x.cov[k]; if (!t) continue; if (/[。！？]/.test(t.s)) break; if (/^(pass|cpass)$/.test(t.form || '')) return true; } return false; },
    // 〜(ら)れる：所在的詞要真的是被動／可能形（「訪れる」「流れる」不算）；自發只限 思う、感じる 這類動詞
    'gram:〜（ら）れる（可能）': RARE, 'gram:〜（ら）れる（被動）': RARE, 'gram:〜（ら）れる（受害被動）': RARE, 'gram:〜（ら）れる（尊敬）': RARE,
    'gram:〜(ら)れる（自發）': (p, sn, idx, ct) => RARE(p, sn, idx, ct) && /^(思う|感じる|思い出す|考える|案じる|偲ぶ|待つ|悔やむ|感ずる)$/.test(ct.base)
  };
  function RARE(p, sn, idx, ct) { return !!ct && /^(pass|pot)$/.test(ct.form || ''); }
  const LVN = { zero: 0, n5: 0, n4: 1, n3: 2, n2: 3, n1: 4 }, GLV = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
  function userLv(opts) {
    let lv = opts && opts.lv;
    if (!lv) try { lv = (typeof App !== 'undefined' && App.profile && App.profile().lv) || 'zero'; } catch (e) { lv = 'zero'; }
    return LVN[String(lv).toLowerCase()] || 0;
  }
  // 依使用者程度：N3 以上不列 N5／N4；排序＝自己的等級→更難→（較簡單的放最後）
  function lvRank(glv, u) { const L = GLV[glv]; if (L == null) return 20; return L >= u ? L - u : 10 + (u - L); }
  function lvKeep(glv, u) { const L = GLV[glv]; return u < 2 || L == null || L >= 2; }
  // 依 token 邊界確認：片段結尾要落在 token 結尾；開頭不是 〜 的句型，起點要落在 token 開頭
  // opts：{lv:'n3'}（不給就讀 App.profile()）
  function findGrammar(text, tokens, max, opts) {
    buildGram();
    if (!GRAM) return [];
    const u = userLv(opts);
    tokens = tokens || tokenize(text);
    const starts = new Set(), ends = new Set(), cov = [];
    tokens.forEach(t => { starts.add(t.i); ends.add(t.i + t.s.length); for (let k = t.i; k < t.i + t.s.length; k++) cov[k] = t; });
    // 從詞中間開始的句型（〜ました、〜ている），該詞必須是活用形
    const midOK = abs => { const t = cov[abs]; return !!(t && (t.form || /^(v|i|aux|cop)$/.test(t.pos)) && !hasKanji(t.s.slice(abs - t.i))); };
    const sents = sentences(text);
    const hits = [];
    for (const G of GRAM) {
      if (!lvKeep(G.g.lv, u)) continue;
      const EX = GRAM_EXCL[G.g.id];
      let found = null, count = 0;
      const spans = [];
      for (const sn of sents) {
        for (const a of G.alts) {
          let from = 0, ok = true, first = -1, lastEnd = -1;
          for (let k = 0; k < a.segs.length; k++) {
            const seg = a.segs[k];
            let idx = sn.s.indexOf(seg, from), good = -1;
            while (idx >= 0) {
              const abs = sn.i + idx, end = abs + seg.length;
              let startOK = k > 0 ? true : a.lead ? idx > 0 && (starts.has(abs) || (!a.p && midOK(abs))) : starts.has(abs);
              if (startOK && k === 0 && EX) { const pv = starts.has(abs) ? cov[abs - 1] : null; startOK = !!EX(pv && pv.sym ? null : pv, sn.s, idx, cov[abs], { seg, cov, abs, end, sEnd: sn.i + sn.s.length }); }
              if (startOK && ends.has(end) && (k === 0 || idx - from <= 14)) { good = idx; break; }
              idx = sn.s.indexOf(seg, idx + 1);
            }
            if (good < 0) { ok = false; break; }
            if (k === 0) first = good;
            lastEnd = good + seg.length; from = lastEnd;
          }
          if (ok) { count++; spans.push([sn.i + first, sn.i + lastEnd, lastEnd - first === a.segs.join('').length]); if (!found) found = { sent: sn.s.trim(), at: sn.i + first, a: first, b: lastEnd, raw: sn.s }; break; }
        }
      }
      if (found) {
        const lead = found.raw.length - found.raw.trimStart().length;
        hits.push({ id: G.g.id, pat: G.g.pat, lv: G.g.lv, zh: G.g.zh, conn: G.g.conn, ex: G.g.ex, note: G.g.note, sent: found.sent, hl: [found.a - lead, found.b - lead], count, at: found.at, o: G.o, spans });
      }
    }
    // 長句型優先：短句型每次出現都落在某個較長（連續）句型裡面，就不列（とはいうものの → 不再算 ものの／もの）
    const inside = (s, h) => h.spans.some(y => y[2] && y[0] <= s[0] && s[1] <= y[1] && (y[1] - y[0]) > (s[1] - s[0]));
    for (let k = hits.length - 1; k >= 0; k--) { const x = hits[k]; if (x.spans.every(s => hits.some(h => h !== x && inside(s, h)))) hits.splice(k, 1); }
    hits.forEach(h => delete h.spans);
    hits.sort((x, y) => lvRank(x.lv, u) - lvRank(y.lv, u) || x.o - y.o);
    return hits.slice(0, max || 12);
  }

  /* ---------------- 片語偵測 ---------------- */
  // 常見搭配（補充）：[片語, 讀音, 中文, 比對用表層(可多個，以 | 分隔)]
  const COLLOC = [
    ['気をつける', 'きをつける', '小心；注意', '気をつけ|気を付け'], ['写真を撮る', 'しゃしんをとる', '拍照', '写真を撮'], ['電車に乗る', 'でんしゃにのる', '搭電車', '電車に乗'], ['バスに乗る', 'ばすにのる', '搭公車', 'バスに乗'],
    ['お風呂に入る', 'おふろにはいる', '泡澡', 'お風呂に入|風呂に入'], ['温泉に入る', 'おんせんにはいる', '泡溫泉', '温泉に入'], ['列に並ぶ', 'れつにならぶ', '排隊', '列に並|に並ん'], ['道に迷う', 'みちにまよう', '迷路', '道に迷'],
    ['時間がかかる', 'じかんがかかる', '花時間', '時間がかか|分かか|時間かか'], ['お腹が空く', 'おなかがすく', '肚子餓', 'お腹が空|おなかがす|お腹がす'], ['予約を取る', 'よやくをとる', '訂位；預約', '予約を取|予約をと'], ['席が空く', 'せきがあく', '有空位', '席が空|席があ'],
    ['お金を払う', 'おかねをはらう', '付錢', 'お金を払|を払'], ['カードで払う', 'かーどではらう', '刷卡付款', 'カードで払|カードでお願い'], ['手を洗う', 'てをあらう', '洗手', '手を洗'], ['靴を脱ぐ', 'くつをぬぐ', '脫鞋', '靴を脱'],
    ['雨が降る', 'あめがふる', '下雨', '雨が降'], ['雪が降る', 'ゆきがふる', '下雪', '雪が降'], ['風邪をひく', 'かぜをひく', '感冒', '風邪をひ|風邪を引'], ['熱がある', 'ねつがある', '發燒', '熱があ'],
    ['目が覚める', 'めがさめる', '醒來', '目が覚'], ['楽しみにする', 'たのしみにする', '期待', '楽しみにし|楽しみです'], ['仕方がない', 'しかたがない', '沒辦法', '仕方がな|仕方な|しかたがな'], ['気に入る', 'きにいる', '中意', '気に入'],
    ['役に立つ', 'やくにたつ', '有用', '役に立'], ['間に合う', 'まにあう', '來得及', '間に合'], ['お世話になる', 'おせわになる', '受照顧', 'お世話にな'], ['よろしくお願いします', 'よろしくおねがいします', '請多指教；麻煩了', 'よろしくお願いします'],
    ['ご飯を食べる', 'ごはんをたべる', '吃飯', 'ご飯を食べ|ごはんを食べ'], ['人気がある', 'にんきがある', '受歡迎', '人気があ|人気の'], ['声をかける', 'こえをかける', '搭話；叫住', '声をかけ|声を掛け'], ['一休みする', 'ひとやすみする', '休息一下', '一休み']
  ];
  let PH = null;
  function buildPhrases() {
    if (PH) return;
    PH = [];
    const add = (jp, kana, zh, keys, src, extra) => { keys.forEach(k => { k = k.replace(/[。！？!?]$/, ''); if (k.length >= 3) PH.push(Object.assign({ jp, kana, zh, key: k, src }, extra || {})); }); };
    COLLOC.forEach(([jp, kana, zh, ks]) => add(jp, kana, zh, ks.split('|'), '片語'));
    try { (window.CARDS && CARDS.decks && CARDS.decks.idiom ? CARDS.decks.idiom.cards : []).forEach(c => add(c.jp, c.kana, c.zh, [c.jp], '慣用句', { romaji: c.romaji, lv: c.lv })); } catch (e) { }
    (window.SCENES || []).forEach(sc => (sc.phrases || []).forEach(p => { if (p && p.jp && p.jp.length <= 24) add(p.jp, p.kana, p.zh, [p.jp], sc.name, { romaji: p.romaji }); }));
    PH.sort((a, b) => b.key.length - a.key.length);
  }
  function findPhrases(text, tokens, max) {
    buildPhrases();
    max = max || 10;
    text = String(text || '');
    tokens = tokens || tokenize(text);
    const out = [], seen = new Set(), sents = sentences(text);
    const sentOf = i => { const s = sents.find(x => i >= x.i && i < x.i + x.s.length); return s ? s.s.trim() : ''; };
    const starts = new Set(tokens.map(t => t.i)), cover = new Set();
    for (const p of PH) {
      if (seen.has(p.jp)) continue;
      let k = text.indexOf(p.key);
      while (k >= 0 && !starts.has(k)) k = text.indexOf(p.key, k + 1);
      if (k < 0 || cover.has(k)) continue;
      // 補助動詞（〜ていただきます、〜てください）不當成獨立片語
      if (isKanaStr(p.key) && k > 0 && /[てで]/.test(text[k - 1])) { const pt = tokens.find(t => t.i < k && t.i + t.s.length === k); if (pt && (pt.form || /^(v|aux)$/.test(pt.pos))) continue; }
      seen.add(p.jp);
      tokens.forEach(t => { if (t.i >= k && t.i < k + p.key.length) cover.add(t.i); });
      out.push({ jp: p.jp, kana: p.kana || '', romaji: p.romaji || R2(p.kana || p.jp, p.jp), zh: p.zh, src: p.src, sent: sentOf(k), key: p.key });
      if (out.length >= max) return out;
    }
    // 名詞＋を／に／が／で＋動詞 → 搭配
    for (let i = 0; i + 2 < tokens.length && out.length < max; i++) {
      const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2];
      if (!(a.known && /^(n|name)$/.test(a.pos) && b.pos === 'part' && /^[をにがで]$/.test(b.s) && c.known && c.pos === 'v')) continue;
      if (/^(こと|もの|ところ|とき|ため|よう|前|後|中|上|下|時|方|ほう|うち|間)$/.test(a.s) || cover.has(a.i) || /^(いる|ある|する|なる|くる|来る)$/.test(c.base)) continue;
      // 複合助詞（における、について、によって、に対して…）不是「に＋動詞」；被動形不還原成「X が Y」
      if (b.s === 'に' && /^(おけ|おい|つい|つき|とっ|とり|よっ|よる|より|よれ|よら|対|関|際|伴|向|沿|基|わた|かけ|当た|応じ|先立)/.test(c.s)) continue;
      if ((/^(pass|cpass)$/.test(c.form || '') && /^[がに]$/.test(b.s)) || (c.form === 'pot' && /られ/.test(c.s) && b.s === 'が')) continue;
      const jp = a.base + b.s + c.base;
      if (seen.has(jp)) continue; seen.add(jp);
      const kana = (a.bkana || a.kana || a.s) + b.s + (c.bkana || c.base);
      out.push({ jp, kana, romaji: R2(kana, jp), zh: `${short(a.zh)}＋${b.s}＋${short(c.zh)}`, src: '搭配', sent: sentOf(a.i), key: a.s + b.s + c.s });
    }
    return out;
  }
  const short = z => String(z || '').split(/[；;，,]/)[0];

  // 函式詞（不當「單字」出題或列入本文單字；評審 v16 P1）：樣態／傳聞そう、形式名詞、て形後的補助動詞（いる、しまう…）、連用形後的すぎる／やすい
  const FUNC_W = /^(そう|よう|こと|もの|ところ|わけ|はず|ため|まま|ほど|くらい|ぐらい|だけ|ばかり|つもり|みたい|らしい|いる|ある|する|なる|いう|できる)$/;
  function isFunc(t, prev) {
    if (!t) return false;
    if (t.gram || /^(part|aux|cop)$/.test(t.pos || '') || FUNC_W.test(t.base || t.s)) return true;
    if (!prev) return false;
    if (/^(しまう|おく|みる|くる|いく|あげる|くれる|もらう|ほしい)$/.test(t.base) && /[てで]$/.test(prev.s)) return true;
    if (/^(すぎる|やすい|にくい|始める|出す|続ける|終わる|合う)$/.test(t.base) && /^(v|i)$/.test(prev.pos || '')) return true;
    return false;
  }
  window.JPText = {
    isFunc,
    ready, ensureGrammar, tokenize, ruby, rubyText, lookup, romaji: R2, toHira, hasKanji, sentences, findGrammar, findPhrases, setUser, userLv, lvRank, lvKeep,
    POS_ZH, FORM_ZH, esc, numRead,
    get size() { return DICT.size; },
    get levels() { return [...builtLv]; },
    hasUnknown(tokens) { return (tokens || []).some(t => t.pos === 'unk' && t.sc === 'k'); },
    _build: build
  };
})();
