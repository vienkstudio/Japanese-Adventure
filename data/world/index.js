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
  // x,y：日本地圖上的位置（0–100）；need：需要幾個御朱印才開放
  regions: [
    { id: 'tokyo', name: '東京', jp: '東京', kana: 'とうきょう', icon: '🗼', x: 66, y: 59, need: 0, files: ['tokyo-1', 'tokyo-2', 'tokyo-3', 'tokyo-3b', 'tokyo-4', 'tokyo-4b', 'tokyo-5', 'tokyo-6', 'tokyo-7', 'tokyo-8'], order: ['narita', 'ueno', 'asakusa', 'harajuku', 'ginza', 'shinjuku', 'yokohama'], desc: '第一次去日本的經典路線：機場、車站、飯店、便利商店、神社、藥妝、燒肉、居酒屋。' },
    { id: 'kyoto', name: '京都', jp: '京都', kana: 'きょうと', icon: '⛩️', x: 50, y: 68, need: 4, files: ['kyoto', 'kyoto-2', 'kyoto-3'], order: [], desc: '古都：旅館、寺院參拜、抹茶甜點、市巴士、錦市場。' },
    { id: 'osaka', name: '大阪', jp: '大阪', kana: 'おおさか', icon: '🐙', x: 33, y: 80, need: 8, files: ['osaka', 'osaka-2', 'osaka-3'], order: [], desc: '天下的廚房：章魚燒、大阪燒、串炸、黑門市場、百圓商店。' },
    { id: 'hokkaido', name: '北海道', jp: '北海道', kana: 'ほっかいどう', icon: '⛄', x: 76, y: 17, need: 12, files: ['hokkaido', 'hokkaido-2', 'hokkaido-3'], order: [], desc: '札幌與小樽：海鮮市場、湯咖哩、溫泉、滑雪場租借、伴手禮。' },
    { id: 'okinawa', name: '沖繩', jp: '沖縄', kana: 'おきなわ', icon: '🌺', x: 12, y: 92, need: 16, files: ['okinawa', 'okinawa-2'], order: [], desc: '南國自駕：租車、沖繩麵、浮潛、水族館、公設市場。' }
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
