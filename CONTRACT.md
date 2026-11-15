# 日語冒險網站 — 模組介面契約（所有角色必讀）

網站根目錄：`D:\Coding\日文講義\`，入口 `index.html`（純前端、無建置工具、無外部 CDN，可直接雙擊開啟或用 `python -m http.server` 服務）。
目標使用者：**完全零基礎的台灣學習者**。所有說明文字用**繁體中文**；日文一律附平假名讀音、羅馬拼音、中文意思、**中文諧音**（幫助記憶）。

## 載入順序（index.html 已寫好，勿改）
1. `kana-data.js`：全域 `KANA`（46 筆：[平,片,羅馬,諧音,emoji,平聯想,片聯想,平字源,片字源]）、`DAKU`、`YOON`（[平,片,羅馬,諧音]）、`GRID`（五十音表排列，含 null）、`ROW_NAMES`、`BY_HIRA`（平假名→KANA 列）
2. `window.SCENES = []`，然後 `data/scenes-1.js`、`data/scenes-2.js` 各自 `SCENES.push(...)`
3. `js/core.js`：`App`、`Tracker`
4. 首頁（inline）
5. `js/quest.js` → `js/town.js` → `js/review.js`
6. `App.start()`

## 檔案分工（每個角色只能建立/修改自己的檔案）
| 角色 | 檔案 |
|---|---|
| 日語內容編輯 A | `data/scenes-1.js` |
| 日語內容編輯 B | `data/scenes-2.js` |
| 關卡設計工程師 | `js/quest.js` |
| 場景互動工程師 | `js/town.js` |
| 複習系統工程師 | `js/review.js` |
| 主編（彙整） | `index.html`、`css/app.css`、`js/core.js`、本文件 |

需要額外樣式：在自己的 JS 檔內用 `App.injectCSS`… 不存在 → 請自行在檔案開頭用一段程式插入 `<style id="css-模組名">`，class 名稱加模組前綴（`q-`、`t-`、`rv-`）避免衝突。優先使用 `css/app.css` 現有 class：
`panel card card.click card.locked grid grid.sm btn btn.primary btn.sm btn.ghost tabs chips chip chip.red chip.green pill bar q-big q-mid choices choice choice.ok choice.ng feedback chat bubble bubble.npc bubble.me track-btn track-btn.on h-title muted center jp`

## core.js API
```js
App.register(name, {title, icon, nav:bool, render(el, params)})  // 註冊路由，hash 為 #/name?k=v
App.go(name, params)            // 換頁
App.state                       // 存檔物件 {xp, cleared:{questId:stars}, tracked, streak, sceneDone:{}}；改完要 App.save()
App.level / App.levelOf(xp) / App.LEVELS / App.TITLES
App.addXP(n, reason)            // 自動提示＋升級彈窗
App.completeQuest(id, stars0to3, baseXP) -> {stars, prevStars, gained, levelUp, firstClear}
App.showResult({title, stars, correct, total, gained, wrong:[trackerItem], retry:fn, next:{label,route,params}, back:{label,route,params}})
App.modal(html, [{label, cls, onClick}]) -> close()
App.toast(html, 'xp'|'ok'|'')
App.speak(jpText)               // 日語 TTS
App.esc(str) / App.shuffle(arr) / App.sample(arr,n)
App.isCleared(id) / App.stars(id)
App.kanaItem(KANA列) -> trackerItem        // id = 'kana:<平假名>'
App.wordItem(word, sceneName, 'word'|'phrase') -> trackerItem   // id = 'word:<jp>' / 'phrase:<jp>'
```

## Tracker（不會清單）API
```js
Tracker.add(item, silent?) -> bool   // item: {id, jp, kana?, romaji?, zh, hint?, emoji?, source}
Tracker.remove(id) / Tracker.has(id) / Tracker.get(id)
Tracker.list(includeMastered?) / Tracker.count()
Tracker.mark(id, correct)            // 連對 3 次自動 mastered
Tracker.clearMastered() / Tracker.exportJSON() / Tracker.importJSON(txt)
```
規則：**答錯的題目一律 `Tracker.add(item, true)` 自動加入**（silent，結果畫面統一列出）；每個單字/句子/假名旁都要有「＋ 加入不會清單」按鈕（`.track-btn`，已加入時加 `.on` 並顯示「✓ 已在清單」，再按可移除）。

## SCENES 資料格式（data/scenes-*.js）
```js
SCENES.push({
  id: 'konbini', name: '便利商店', icon: '🏪', color: '#2e8b57',
  unlockLevel: 1,                // 需要的等級
  desc: '一句話介紹這個場景',
  tips: ['文化小知識（繁中）', ...],          // 2–3 則
  vocab: [ { jp:'レジ袋', kana:'れじぶくろ', romaji:'rejibukuro', zh:'塑膠袋', hint:'諧音：勒基布哭囉', emoji:'🛍️' }, ... ],  // 12–15 個
  phrases: [ { jp:'これください', kana:'これください', romaji:'kore kudasai', zh:'我要這個', hint:'諧音：摳勒哭搭賽', use:'指著商品時說' }, ... ], // 6–8 句
  dialogues: [   // 2–3 段，每段 3–5 步
    { title:'結帳', steps:[
      { speaker:'店員', emoji:'🧑‍💼', jp:'温めますか？', kana:'あたためますか', romaji:'atatamemasu ka', zh:'要幫您加熱嗎？',
        choices:[
          { jp:'はい、お願いします', kana:'はい、おねがいします', zh:'好，麻煩你', correct:true, feedback:'「お願いします」是萬用的「麻煩了」' },
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'禮貌地拒絕' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的' }
        ] }
    ]}
  ]
});
```
- `jp` 用自然的日文（可含漢字），`kana` 為全平假名/片假名讀音，`hint` 以「諧音：」開頭。
- 每步 3 個選項，至少 1 個 correct；錯誤選項要「看起來合理但用錯場合」，feedback 解釋原因（繁中）。
- 內容必須正確、實用、符合日本真實情境。

## 場景 id 與解鎖等級（固定，quest.js 依此建立任務）
scenes-1.js：`konbini` 便利商店 Lv1、`ramen` 拉麵店 Lv2、`cafe` 咖啡廳 Lv3、`drugstore` 藥妝店 Lv4、`izakaya` 居酒屋・餐廳 Lv5、`clothes` 服飾店 Lv6
scenes-2.js：`directions` 問路 Lv2、`station` 車站・電車 Lv3、`hotel` 飯店入住 Lv4、`shrine` 神社・觀光 Lv5、`airport` 機場 Lv6、`emergency` 緊急求助・藥局 Lv7

## 路由與跨模組 API
- quest.js：路由 `map`（nav:true，icon 🗺️，title「冒險地圖」）、`quest`（nav:false，params `{id}`）。
  公開 `window.QUESTS = [{id, chapter, title, icon, type:'kana'|'scene'|..., requires:[questId], minLevel, xp, sceneId?, ...}]`
  公開 `window.QuestAPI = { isUnlocked(id), nextQuest() -> quest|null, play(id) }`
  `type:'scene'` 的任務：`play()` 要 `App.go('scene', {id: sceneId, mission: questId})`。
- town.js：路由 `town`（nav:true，icon 🏙️，title「日本街道」）、`scene`（nav:false，params `{id, mission?}`）。
  有 `mission` 時進入「任務模式」：依序完成該場景所有 dialogues 計分，結束呼叫
  `App.completeQuest(mission, stars, (QUESTS.find(q=>q.id===mission)||{}).xp || 40)` 再 `App.showResult(...)`，next 回 `map`。
  非任務模式自由練習完成一段對話：`App.addXP(10,'場景練習')`，並設 `App.state.sceneDone[id]=true; App.save()`。
  場景解鎖：`scene.unlockLevel <= App.level`。
- review.js：路由 `review`（nav:true，icon 📌，title「不會清單」）。

## 自我檢核（每個角色交件前必做）
1. `node -e` 檢查語法（可用 `new Function(code)`）。
2. 以 node 模擬：載入 kana-data.js（+ 你需要的檔案），確認資料筆數/欄位齊全。
3. 不得修改他人檔案；回報：檔案路徑、內容摘要、已知限制。
