# 日語冒險網站 — 模組介面契約（2026-11-16 重寫）

網站根目錄：`D:\Coding\日文講義\`，入口 `index.html`。純前端、無建置工具；外部只有 PWA service worker，不載入 CDN。
定位：**零基礎台灣學習者＋日本自由行（N5–N4 為主）**。說明文字用繁體中文；日文附讀音、中文，入門字附中文諧音。

## 載入順序（index.html）
| 順序 | 檔案 | 內容 |
|---|---|---|
| 1 | `kana-data.js` | `KANA`（46 筆：[平,片,羅馬,諧音,emoji,平聯想,片聯想,平字源,片字源]）、`DAKU`、`YOON`、`GRID`、`ROW_NAMES`、`BY_HIRA` |
| 2 | `data/scenes-1.js`、`data/scenes-2.js` | `SCENES.push(...)`，13 個場景 |
| 3 | `data/scene-ext.js` | `SCENE_EXT`，載入時併入 SCENES（每場景單字 ≥30、會話句 ≥20） |
| 4 | `data/cards.js`、`data/menus.js` | 分級字卡、情境小遊戲菜單（`MENUS[sceneId]`） |
| 5 | `data/travel.js` → `travel-ext.js` → `travel-stops.js` | `TravelData`：難度、13 站、每站每級 5 題狀況題 |
| 7 | `js/core.js` → `js/game.js` | `App`、`Tracker`；音效、每日任務、頭像 |
| 8 | inline | `home` 路由（交給 `Travel.renderTitle`） |
| 9 | `js/quest.js`、`practice.js`、`town.js`、`review.js`、`travel.js` | 功能模組 |
| 10 | inline | `App.lazy(...)` 登記延遲載入路由 → `App.start()` → 註冊 `sw.js` |
| 延遲 | `data/drills.js`＋`js/drill.js`（第一次進 `boot`）、`js/phrasebook.js`（第一次進 `phrasebook`） | 特訓、會話手冊 |

## core.js API
```js
App.register(name, { title, icon, nav, navOrder?, navParent?, transient?, render(el, params) })
//  nav:true 顯示在底部導覽（依 navOrder 排）；navParent：子頁點亮哪個導覽；transient:true：只負責轉址，不留歷史紀錄
App.go(name, params) / App.back()   // 路由狀態存 history.state（不改網址），手機返回鍵＝上一頁
App.state / App.save()              // 存檔；改完要 save()
App.level / App.levelOf(xp) / App.LEVELS / App.TITLES
App.addXP(n, reason)                // 拿到 XP 才記連勝（本地日期，每週 1 次斷一天自動保護）
App.streakInfo() -> {days, done, risk}
App.today() -> 'YYYY-MM-DD'（本地）
App.addUnlock(fn(lv) -> ['解鎖項目'])   // 升級彈窗列出真的解鎖的內容
App.completeQuest(id, stars, baseXP) / App.noteClear()
App.showResult({title, stars, correct, total, gained, wrong, retry, back:{label,route,params}, next:{label,route,params}})
App.modal(html, [{label, cls, onClick}]) / App.toast(html, 'xp'|'ok'|'')
App.speak(jp, rate?) / App.esc / App.shuffle / App.sample
App.kanaItem(KANA列) / App.wordItem(word, sceneName, 'word'|'phrase')
App.trackBtn(item, small?)          // 共用「＋不會清單」按鈕 HTML；點擊由 core 統一處理，不需另外綁定
App.backup()                        // 備份／還原彈窗
App.resetAll()                      // 清除全部（只在設定「清除全部進度」使用）
App.lazy([[route, def], ...], [scripts])   // 延遲載入：先登記路由外殼，第一次進入才依序載入 scripts
App.loadScript(src) -> Promise
App.idb.get(key) / set(key, value) / del(key)   // IndexedDB key-value（大型資料、存檔備援）
App.loadState(o)                    // 還原時會經過 migrate()
```

## Tracker（不會清單）
```js
Tracker.add(item, silent?) / remove(id) / has(id) / get(id) / list(includeMastered?) / count()
Tracker.mark(id, correct)   // 間隔排程：答對後 1→3→7 天再出現；答錯 due=0；連對 3 次 mastered
Tracker.dueList() / dueCount()   // 今日該複習
```
規則：答錯一律 `Tracker.add(item, true)`；每個單字／句子／假名旁都用 `App.trackBtn(item)`。第一次加入時 core 會跳出說明 toast。

### id 前綴
| 前綴 | 來源 |
|---|---|
| `kana:<平假名>` | 五十音 |
| `word:<jp>`、`phrase:<jp>` | 場景單字、句子、狀況題、店員問句、看板 |
| `num:<類型>:<答案>` | 數字快打 |
| `cnt:<品項>:<數量>` | 量詞 |

## 存檔（localStorage `jpQuest.v1`，可同步雲端）
`v`（schemaVersion，目前 2；舊檔由 `migrate()` 補齊欄位）。每次 `save()` 也會寫一份到 IndexedDB（`jpQuest/kv/save`）；localStorage 被清掉時開啟會自動還原。欄位擁有者：

| 欄位 | 擁有者 |
|---|---|
| `xp`、`cleared`、`tracked`、`log`、`streak`、`trackHelp`、`clearN`、`v` | core.js |
| `daily`、`avatar` | game.js |
| `avatarsOwned` | travel.js 寫入（掉落）、game.js 讀取 |
| `trip`（`level`、`runs[難度]`、`stamps`）、`kanaL` | travel.js |
| `sit`、`sceneDone`、`cardDiff`、`guide` | practice.js（town.js 也寫 `sceneDone`） |
| `drill`、`drillOpt` | drill.js |

「新開始」只重設 `trip.runs[該難度]`；XP、不會清單、其他難度保留。

## 路由一覽
| 路由 | 模組 | 說明 |
|---|---|---|
| `home`（nav 1） | inline → travel.js | 首頁：繼續、新開始、每日任務、今日複習、手冊、特訓、設定 |
| `phrasebook`（nav 2） | phrasebook.js | 旅遊會話手冊：分類、搜尋、語音、全螢幕給店員看 |
| `boot`（nav 3）、`boot-play` | drill.js | 實戰特訓：店員問句、看板、數字、🧩 組句子（把詞塊排成句子） |
| `review`（nav 4） | review.js | 不會清單 |
| `play` | travel.js | 入門＝教 5 字→小考 10 題；N5–N1＝東京地圖（13 站，4 站依等級解鎖） |
| `trip-stop`（transient） | travel.js | 站內流程：本站單字→情境小遊戲→對話／口說→狀況題 |
| `trip-event` | travel.js | 狀況題（5 題、3 顆愛心，歸零結束） |
| `trip-next`（transient） | travel.js | 走到最近一個未通過的店 |
| `menu` | practice.js | 情境小遊戲（`trip:1` 時回站內流程） |
| `drill` | town.js | 單字測驗／對話演練／口說（`trip:1` 時回站內流程） |
| `practice-map`、`stage`、`cards`、`quest`、`town`、`scene` | 舊模組 | 仍可用，非主要入口 |
| `map`、`practice`（transient） | 轉址 | 導向 `play`／`practice-map` |

## 狀況題格式（data/travel*.js）
`stop.events[難度]` 每題可用物件 `{ scene, prompt, translation, answers:[正解, ...干擾], explanation, reading? }`，或舊的位置陣列 `[scene, prompt, translation, answers, explanation, reading?]`（travel.js 的 `evObj()` 會轉換）。新資料請用物件格式。

## 句型分級（情境小遊戲 practice.js `reg()`）
N5／N4：〜ください・〜お願いします；N3：請求（〜お願いできますか、〜か教えてもらえますか）；N2：敬語（〜いただけますか、恐れ入りますが〜でしょうか），並加入失禮說法當干擾；N1：委婉（差し支えなければ〜お願いできますでしょうか、〜いただけますでしょうか）。

## XP 規則（全站統一）
首次過關依星數 10／15／20，首次三星再 +10；重玩刷新最佳星數只補差額；重玩沒進步給 3 XP（仍算當天有練）。

## CSS
全站色票在 `css/app.css :root`（`--pri` 珊瑚紅、`--acc` 薄荷、`--card`、`--chip`、`--text`、`--muted`），含深色模式；模組樣式不要寫死 `#fff`／`#222`。
class 前綴：`trip-`（旅程地圖）、`tt-`（首頁）、`kn-`（入門）、`tg-`（御朱印）、`dr-`（特訓）、`pb-`（手冊）、`pc-`（頂列）、`q-`、`t-`、`rv-`、`m-`、`g-`、`h-`（舊模組）。
觸控目標 ≥44px；讀音／中文字 ≥13px。

## sw.js 快取規則
網路優先（4 秒逾時）、失敗才用快取；只快取同網域且 `r.ok` 的回應；只刪 `jpq-v` 開頭的舊快取。改版請把 `VERSION` 加 1，並把新檔加進 `FILES`。

## 自我檢核
1. `node -e "new Function(require('fs').readFileSync(檔案,'utf8'))"` 檢查語法。
2. node 載入資料檔確認筆數與欄位。
3. 瀏覽器跑：首頁 → 入門一局 → 地圖一站 → 結果 → 不會清單 → 手冊。
