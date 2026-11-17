// 3D 心智圖：分類體系（人事時地物、場景、詞性、文法類別、等級）
(function () {
  const M = window.MIND = window.MIND || { lex: {}, gram: [] };
  M.LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  M.LV_COLOR = { N5: '#2ec4a6', N4: '#4a8cff', N3: '#ffb703', N2: '#ff8a3d', N1: '#ff6b5b' };
  // 人事時地物（＋狀、虛）
  M.WH = [
    { id: '人', name: '人', desc: '人物、身分、職業、稱謂、代名詞', color: '#ff6b8a' },
    { id: '事', name: '事', desc: '動作、事件、活動、行為（多數動詞、動作名詞）', color: '#4a8cff' },
    { id: '時', name: '時', desc: '時間、日期、季節、頻率、時間副詞', color: '#ffb703' },
    { id: '地', name: '地', desc: '地點、場所、方位、設施、國家地名', color: '#2ec4a6' },
    { id: '物', name: '物', desc: '具體物品、食物、動植物、身體部位', color: '#a77bff' },
    { id: '狀', name: '狀', desc: '性質、狀態、感受、程度（形容詞、副詞、抽象概念）', color: '#ff8a3d' },
    { id: '虛', name: '虛', desc: '助詞、接續詞、感嘆詞、功能語', color: '#8a94a6' }
  ];
  // 生活大場景（sc），旅遊子場景掛在 parent 底下
  M.SCENES = [
    { id: 'fam', name: '家庭生活', icon: '🏠' },
    { id: 'body', name: '身體健康', icon: '💪' },
    { id: 'med', name: '醫療急難', icon: '🏥' },
    { id: 'food', name: '飲食料理', icon: '🍱' },
    { id: 'shop', name: '購物金錢', icon: '🛍️' },
    { id: 'trans', name: '交通移動', icon: '🚃' },
    { id: 'travel', name: '旅遊住宿', icon: '🧳' },
    { id: 'sch', name: '學校學習', icon: '🏫' },
    { id: 'work', name: '職場商務', icon: '💼' },
    { id: 'comm', name: '溝通社交', icon: '💬' },
    { id: 'emo', name: '情感心理', icon: '❤️' },
    { id: 'nat', name: '天氣自然', icon: '🌤️' },
    { id: 'time', name: '時間日期', icon: '⏰' },
    { id: 'num', name: '數量單位', icon: '🔢' },
    { id: 'city', name: '城市設施', icon: '🏙️' },
    { id: 'hobby', name: '娛樂興趣', icon: '🎮' },
    { id: 'soc', name: '社會新聞', icon: '📰' },
    { id: 'desc', name: '顏色形容', icon: '🎨' },
    { id: 'act', name: '基本動作', icon: '✋' },
    { id: 'func', name: '指示功能詞', icon: '🧩' },
    { id: 'pos', name: '方位位置', icon: '🧭' },
    { id: 'abs', name: '抽象概念', icon: '💭' }
  ];
  // 現有旅遊場景（data/scenes-*.js 的 id）→ 大場景
  M.SUB = {
    konbini: 'shop', clothes: 'shop', drugstore: 'shop',
    ramen: 'food', cafe: 'food', izakaya: 'food', yakiniku: 'food',
    directions: 'trans', station: 'trans', airport: 'trans',
    hotel: 'travel', shrine: 'travel', emergency: 'med'
  };
  M.POS = {
    n: '名詞', v: '動詞', i: 'い形容詞', na: 'な形容詞', adv: '副詞', pron: '代名詞',
    part: '助詞', conj: '接續詞', int: '感嘆詞', ctr: '數量詞', pre: '接頭語', suf: '接尾語', exp: '慣用語'
  };
  // 動詞類別：1 五段、2 一段、3 不規則（来る・する）、s サ變名詞（＋する）
  M.GRP = { 1: '第一類（五段）', 2: '第二類（一段）', 3: '第三類（不規則）', s: 'サ變（＋する）' };
  // 文法類別
  M.GCAT = ['時態', '時間先後', '條件假設', '原因理由', '目的', '逆接讓步', '推測判斷', '意志願望', '義務許可禁止',
    '授受', '敬語', '被動使役', '比較程度', '列舉舉例', '引用傳聞', '名詞化形式', '強調限定', '變化狀態', '樣態', '對象範圍', '疑問否定',
    '助詞', '基本句型', '指示詞', '可能能力', '主題提示', '複合動詞', '附帶同時', '手段根據', '代替交換', '建議勸誘', '語氣態度', '其他'];
  // 旅遊必備場景（知識庫快速篩選用）
  M.TRAVEL = ['trans', 'travel', 'food', 'shop', 'med'];
})();
