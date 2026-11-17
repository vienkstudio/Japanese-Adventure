/* 冒險世界索引：地區清單。街區與店家在各地區的資料包（WORLD.pack），進入該地區才載入。
   格式說明：docs/世界資料格式.md；檢查：node tools/check-world.mjs */
window.WORLD = {
  // 難度（等級）：影響標示語言、句型禮貌程度、店員說法、任務複雜度
  LEVELS: [
    { id: 'N5', label: '基礎會話', detail: '品名附讀音與中文；照著範例排句子' },
    { id: 'N4', label: '自助旅行', detail: '只附讀音；自己排出句子' },
    { id: 'N3', label: '應對變化', detail: '沒有讀音；會遇到賣完、要改點' },
    { id: 'N2', label: '交涉與敬語', detail: '店員用敬語；你也要用禮貌說法' },
    { id: 'N1', label: '語意與言外之意', detail: '最委婉的說法；任務單只有日文' }
  ],
  // x,y：日本地圖上的位置（0–100，地名所在的點）；nx,ny：地圖上卡片的位置（不互相重疊）；need：需要幾個御朱印才開放
  // shops：推薦順序的店家清單 [街區id, 店id, 顯示名稱]（首頁「下一間店」在地區資料還沒載入時就用這份）
  regions: [
    { id: 'tokyo', name: '東京', jp: '東京', kana: 'とうきょう', icon: '🗼', x: 63, y: 58, nx: 83, ny: 60, need: 0, files: ['tokyo-1', 'tokyo-2', 'tokyo-3', 'tokyo-3b', 'tokyo-4', 'tokyo-4b', 'tokyo-5', 'tokyo-6', 'tokyo-7', 'tokyo-8'], order: ['narita', 'ueno', 'asakusa', 'harajuku', 'ginza', 'shinjuku', 'yokohama'], desc: '第一次去日本的經典路線：機場、車站、飯店、便利商店、神社、藥妝、燒肉、居酒屋。',
      shops: [['ueno', 'ueno-konbini', '🐼 上野・🏪 便利商店'], ['ueno', 'ueno-shokudo', '🐼 上野・🍱 定食屋'], ['ueno', 'ueno-station', '🐼 上野・🚉 上野站'], ['ueno', 'ueno-hotel', '🐼 上野・🏨 商務飯店'],
        ['asakusa', 'asakusa-sensoji', '🏮 淺草・⛩️ 淺草寺'], ['asakusa', 'asakusa-nakamise', '🏮 淺草・🍡 仲見世通'], ['asakusa', 'asakusa-kimono', '🏮 淺草・👘 和服租借店'], ['asakusa', 'asakusa-kanko', '🏮 淺草・ℹ️ 淺草文化觀光中心'],
        ['harajuku', 'harajuku-cafe', '🎀 原宿・☕ 咖啡廳'], ['harajuku', 'harajuku-clothes', '🎀 原宿・👕 服飾店'], ['harajuku', 'harajuku-sushi', '🎀 原宿・🍣 迴轉壽司'],
        ['ginza', 'ginza-drugstore', '🕰️ 銀座・💊 藥妝店'], ['ginza', 'ginza-depachika', '🕰️ 銀座・🍡 百貨地下美食街'], ['ginza', 'ginza-bungu', '🕰️ 銀座・🖋️ 老牌文具店'],
        ['shinjuku', 'shinjuku-yakiniku', '🌃 新宿・🥩 燒肉店'], ['shinjuku', 'shinjuku-denki', '🌃 新宿・🔌 電器行'], ['shinjuku', 'shinjuku-clinic', '🌃 新宿・🏥 內科診所'], ['shinjuku', 'shinjuku-karaoke', '🌃 新宿・🎤 卡拉OK'],
        ['yokohama', 'yokohama-ramen', '🎡 橫濱・🍜 家系拉麵'], ['yokohama', 'yokohama-chukagai', '🎡 橫濱・🥟 中華街點心店'], ['yokohama', 'yokohama-izakaya', '🎡 橫濱・🏮 居酒屋'], ['yokohama', 'yokohama-cosmo', '🎡 橫濱・🎡 摩天輪售票處'],
        ['narita', 'narita-airport', '✈️ 成田機場・🛬 機場航廈'], ['narita', 'narita-sim', '✈️ 成田機場・📶 上網・換匯櫃台'], ['narita', 'narita-skyliner', '✈️ 成田機場・🚄 機場電車售票處']] },
    { id: 'kyoto', name: '京都', jp: '京都', kana: 'きょうと', icon: '⛩️', x: 45, y: 59, nx: 50, ny: 40, need: 4, files: ['kyoto', 'kyoto-2', 'kyoto-3'], order: [], desc: '古都：旅館、寺院參拜、抹茶甜點、市巴士、錦市場。',
      shops: [['higashiyama', 'kyoto-kiyomizu', '🏯 東山・🛕 清水寺'], ['higashiyama', 'kyoto-kanmi', '🏯 東山・🍵 甘味處'], ['higashiyama', 'kyoto-ryokan', '🏯 東山・🏮 日式旅館'], ['kawaramachi', 'kyoto-nishiki', '🏮 四條河原町・🏮 錦市場'], ['kawaramachi', 'kyoto-bus', '🏮 四條河原町・🚌 市巴士・地鐵案內所'], ['kawaramachi', 'kyoto-yudofu', '🏮 四條河原町・🍲 湯豆腐料亭']] },
    { id: 'osaka', name: '大阪', jp: '大阪', kana: 'おおさか', icon: '🐙', x: 41, y: 63, nx: 57, ny: 80, need: 8, files: ['osaka', 'osaka-2', 'osaka-3'], order: [], desc: '天下的廚房：章魚燒、大阪燒、串炸、黑門市場、百圓商店。',
      shops: [['dotonbori', 'osaka-takoyaki', '🐙 道頓堀・🐙 章魚燒外帶攤'], ['dotonbori', 'osaka-okonomiyaki', '🐙 道頓堀・🥞 大阪燒店'], ['dotonbori', 'osaka-kuromon', '🐙 道頓堀・🦀 黑門市場'], ['shinsekai', 'osaka-kushikatsu', '🏯 新世界・🍢 串炸店'], ['shinsekai', 'osaka-hyakkin', '🏯 新世界・🛍️ 百圓商店'], ['shinsekai', 'osaka-castle', '🏯 新世界・🏯 大阪城天守閣']] },
    { id: 'hokkaido', name: '北海道', jp: '北海道', kana: 'ほっかいどう', icon: '⛄', x: 76, y: 14, nx: 84, ny: 33, need: 12, files: ['hokkaido', 'hokkaido-2', 'hokkaido-3'], order: [], desc: '札幌與小樽：海鮮市場、湯咖哩、溫泉、滑雪場租借、伴手禮。',
      shops: [['sapporo', 'sapporo-soupcurry', '🕰️ 札幌・🍛 湯咖哩店'], ['sapporo', 'sapporo-ichiba', '🕰️ 札幌・🦀 二條市場海鮮丼'], ['sapporo', 'sapporo-genghis', '🕰️ 札幌・🐑 成吉思汗烤羊肉'], ['niseko', 'niseko-rental', '🎿 新雪谷・🎿 雪具租借'], ['niseko', 'niseko-onsen', '🎿 新雪谷・♨️ 日歸溫泉'], ['niseko', 'sapporo-omiyage', '🎿 新雪谷・🎁 伴手禮店']] },
    { id: 'okinawa', name: '沖繩', jp: '沖縄', kana: 'おきなわ', icon: '🌺', x: 31, y: 89, nx: 13, ny: 88, need: 16, files: ['okinawa', 'okinawa-2'], order: [], desc: '南國自駕：租車、沖繩麵、浮潛、水族館、公設市場。',
      shops: [['naha', 'naha-soba', '🌺 那霸・🍜 沖繩麵食堂'], ['naha', 'naha-makishi', '🌺 那霸・🐟 牧志公設市場'], ['naha', 'naha-rentacar', '🌺 那霸・🚗 租車櫃台'], ['motobu', 'motobu-aquarium', '🐋 本部・🐋 水族館售票處'], ['motobu', 'motobu-marine', '🐋 本部・🤿 浮潛・潛水店'], ['motobu', 'motobu-michinoeki', '🐋 本部・🥭 公路休息站物產店']] }
  ],
  districts: {}, shops: {}, packed: {},
  pack(region, data) {
    const R = this.regions.find(r => r.id === region);
    if (!R) throw new Error('未知地區 ' + region);
    (data.districts || []).forEach(d => { d.region = region; this.districts[d.id] = d; if (!R.order.includes(d.id)) R.order.push(d.id); });
    (data.shops || []).forEach(s => { s.region = region; this.shops[s.id] = s; });
    (this.packed[region] = this.packed[region] || []).push(data);
  }
};
