# 日語冒險網站 — 模組介面契約（2026-11-16 重寫）

網站根目錄：`D:\Coding\日文講義\`，入口 `index.html`。純前端、無建置工具；外部只有 PWA service worker，不載入 CDN。
定位：**零基礎台灣學習者＋日本自由行（N5–N4 為主）**。說明文字用繁體中文；日文附讀音、中文，入門字附中文諧音。

## 載入順序（index.html）
| 順序 | 檔案 | 內容 |
|---|---|---|
| 0 | `<head>` inline＋`css/tokens.css` → `app.css` → `travel.css`、`mind.css`、`world.css`、`kb.css`、`reader.css` | 先讀 localStorage `jpQuest.ui` 設 `data-theme/data-palette/data-fs`（避免閃爍）；色票與尺度 |
| 1 | `kana-data.js` | `KANA`（46 筆：[平,片,羅馬,諧音,emoji,平聯想,片聯想,平字源,片字源]）、`DAKU`、`YOON`、`GRID`、`ROW_NAMES`、`BY_HIRA` |
| 2 | `data/scenes-1.js`、`data/scenes-2.js` | `SCENES.push(...)`，13 個場景 |
| 3 | `data/scene-ext.js` | `SCENE_EXT`，載入時併入 SCENES（每場景單字 ≥30、會話句 ≥20） |
| 4 | `data/cards.js`、`data/menus.js` | 分級字卡、情境小遊戲菜單（`MENUS[sceneId]`） |
| 5 | `data/travel.js` → `travel-ext.js` → `travel-stops.js` | `TravelData`：難度、13 站、每站每級 5 題狀況題 |
| 7 | `js/core.js` → `js/game.js` | `App`、`Tracker`；音效、每日任務、頭像 |
| 8 | `js/home.js` | `home` 首頁、`settings` 設定頁、首次開啟程度選擇（`window.Home`） |
| 9 | `js/quest.js`、`practice.js`、`town.js`、`review.js`、`travel.js` | 功能模組 |
| 9b | `js/phrase.js` → `data/world/index.js` → `js/world.js` → `js/world-quest.js` | 冒險世界（地區資料 `data/world/<檔>.js` 進入該地區才載入） |
| 10 | inline | `App.lazy(...)` 登記延遲載入路由 → `App.start()` → 註冊 `sw.js` |
| 延遲 | `data/drills.js`＋`js/drill.js`（`boot`）、`js/phrasebook.js`（`phrasebook`） | 特訓、會話手冊 |
| 延遲 | `data/mind/{taxonomy,conj,grammar,scripts}.js`＋`js/kb.js`（`kb`、`kb-page`）；`mind3d` 另載 `vendor/3d-force-graph.min.js`、`js/mind3d.js`、`js/mind-game.js` | 知識庫（C） |
| 延遲 | `data/reading/daily.js`、`js/jp-text.js`、`js/reader.js`、`js/songs.js`（`read`、`read-article`、`songs`、`song`） | 閱讀、歌曲（D） |

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
App.reward(id, stars, reason) -> {stars, prevStars, gained, levelUp, firstClear}   // 依 XP 規則給獎勵，星數存 S.cleared[id]
App.showResult({title, stars, correct, total, gained, wrong, note, ok, retry, back:{label,route?,params}, next:{label,route,params}})
//  note：額外說明 HTML；ok：確定鈕文字（只關閉）；back 不給 route ＝ App.back()
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
// 單一程度（取代 world.lv、trip.level、L1–L4；程度不當鎖、不讓進度歸零）
App.profile() -> { lv:'zero'|'n5'|'n4'|'n3'|'n2'|'n1', goals:['travel'], assist:'full'|'some'|'none', placed }
App.setProfile(patch)               // 存檔＋ document 事件 'profilechange'（detail＝新 profile）；改 lv 會帶預設 assist
App.LV_IDS / App.LV_NAMES / App.LV_DESC   // 白話名稱：zero 完全沒學過、n5 會五十音、n4 會簡單句、n3 日常會話、n2 工作程度、n1 接近母語
// 外觀
App.setTheme(theme?, palette?, fs?) // theme 'system'|'light'|'dark'；palette 見 App.PALETTES；fs 'm'|'l'|'xl'；傳 null 表示不改
                                    // 存 App.state.ui、寫 localStorage 'jpQuest.ui'、更新 <meta theme-color>、發 document 事件 'themechange'
App.applyTheme()                    // 依 App.state.ui 套到 <html>（start／還原時自動呼叫）
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
| `world`（`lv`、`stamps`、`dex`、`zones`、`pos`、`spots`、`last`、`at`） | world.js／world-quest.js（`lv` 由 core 從 profile 同步，請改讀 `App.profile()`） |
| `profile`（`lv`、`goals`、`assist`、`placed`） | core.js（`App.setProfile`）；舊檔 migrate：冒險世界有進度用 `world.lv`，否則 `trip.level`（K0→zero） |
| `ui`（`theme`、`palette`、`fs`） | core.js（`App.setTheme`） |
| `sit`、`sceneDone`、`cardDiff`、`guide` | practice.js（town.js 也寫 `sceneDone`） |
| `drill`、`drillOpt` | drill.js |

`trip.level` 也由 profile 同步（zero→K0）；舊旅程不再有「新開始／切換難度」。

## 路由一覽
底部導覽 5 鈕：`home`(1) 首頁、`play`(2) 冒險、`read`(3) 閱讀、`kb`(4) 知識庫、`review`(5) 複習；其餘 `nav:false`，用 `navParent` 指定點亮哪一鈕（沒指定＝點亮首頁）。
| 路由 | 模組 | 說明 |
|---|---|---|
| `home`（nav 1） | home.js | 首頁：主按鈕「繼續」（lv=zero 時改去五十音）＋今日 3 件事（複習到期、今日短文、冒險一關）＋手冊／特訓／歌曲／五十音＋可展開日本地圖；可點元素 ≤10。未定位（`profile.placed` false）先顯示程度選擇／3 題定位 |
| `settings` | home.js | 設定頁：外觀（主題色、淺／深／跟隨系統、字級）、程度與提示、音效、頭像御朱印、備份、清除 |
| `play`（nav 2，B 設定） | world.js | 冒險世界：params `{r 地區, d 街區, s 店}`；首頁用 `World.next()`、`World.japan(el)`（皆防呆） |
| `event` | world-quest.js | 店家狀況題 |
| `read`（nav 3）、`read-article`、`songs`、`song` | D：reader.js、songs.js | 閱讀、歌曲（延遲載入） |
| `kb`（nav 4）、`kb-page`、`mind3d` | C：kb.js、mind3d.js | 知識庫；`mind3d`＝舊 3D 心智圖（實驗功能）；舊 `mind` 路由由 C 處理 |
| `review`（nav 5） | review.js | 複習（不會清單）：主按鈕「開始複習」，題型／範圍收在展開區 |
| `phrasebook` | phrasebook.js | 旅遊會話手冊（首頁進入） |
| `boot`、`boot-play` | drill.js | 實戰特訓（首頁進入） |
| `trip` | travel.js | 旅程：params `{kana:1}`＝五十音入門（首頁「五十音」）；否則依 profile 顯示舊東京 13 站（zero＝五十音） |
| `trip-stop`（transient）、`trip-event`、`trip-next`（transient） | travel.js | 站內流程、狀況題、下一站 |
| `menu` | practice.js | 情境小遊戲（無 `lv` 參數時提示多寡依 `profile.assist`） |
| `drill` | town.js | 單字測驗／對話演練／口說 |
| `practice-map`、`stage`、`cards`、`quest`、`town`、`scene` | 舊模組 | 仍可用，非主要入口；XP 等級不再當鎖 |
| `map`、`practice`（transient） | 轉址 | 導向 `play`／`practice-map` |

## 狀況題格式（data/travel*.js）
`stop.events[難度]` 每題可用物件 `{ scene, prompt, translation, answers:[正解, ...干擾], explanation, reading? }`，或舊的位置陣列 `[scene, prompt, translation, answers, explanation, reading?]`（travel.js 的 `evObj()` 會轉換）。新資料請用物件格式。

## 句型分級（情境小遊戲 practice.js `reg()`）
N5／N4：〜ください・〜お願いします；N3：請求（〜お願いできますか、〜か教えてもらえますか）；N2：敬語（〜いただけますか、恐れ入りますが〜でしょうか），並加入失禮說法當干擾；N1：委婉（差し支えなければ〜お願いできますでしょうか、〜いただけますでしょうか）。

## XP 規則（全站統一）
首次過關依星數 10／15／20，首次三星再 +10；重玩刷新最佳星數只補差額；重玩沒進步給 3 XP（仍算當天有練）。

## CSS 與主題
- 色票、字級、間距全在 `css/tokens.css`：`<html data-theme="light|dark"(未設＝跟隨系統) data-palette="coral|sakura|matcha|ocean|lavender|mono" data-fs="l|xl">`。
- 變數：`--bg --card --chip --text --muted --line --line2 --pri --pri-d --pri-t --acc --acc-d --acc-t --gold --on-gold --on-pri --on-acc --on-pri-2 --ok --warn --err --ok-t --err-t --warn-t --r --r-s/m/l/pill --shadow --shadow2 --shade --scrim --font --n5..--n1 --nx --on-n`；字級 `--fs-xs/sm/md/lg/xl/2xl`（13/14/16/18/22/28px，隨 data-fs 縮放）；間距 `--sp-1..6`（4/8/12/16/24/32）。
- 場景插畫：`--sc-sky --sc-ground --sc-water --sc-grass --sc-tree --sc-road --sc-bld…`（分淺深）；看板 `--sg-*`、彩帶 `--fx1..6`（固定色）。
- **CSS 與 JS 內 HTML 不得寫死色碼**（插畫 SVG 內部例外，底色／文字／框線仍用變數）。答對用 `--ok`、答錯用 `--err`，不要用主色當錯誤色；主色底上的字用 `--on-pri`。
- 舊別名（`--ink --shu --ai --matcha --paper`…）在 app.css 指向新變數，新程式請直接用上面的名稱。
- 需要 JS 取色：`getComputedStyle(document.documentElement).getPropertyValue('--pri')`，並監聽 `themechange` 重繪。
- class 前綴：`hm-`（首頁）、`st-`（設定）、`ob-`（程度選擇）、`trip-`、`kn-`、`tg-`、`dr-`、`pb-`、`pc-`、`rv-`、`q-`、`t-`、`m-`、`g-`、`h-`。
- 觸控目標 ≥44px；讀音／中文字 ≥13px（`--fs-xs`）。

## sw.js 快取規則
網路優先（4 秒逾時）、失敗才用快取；只快取同網域且 `r.ok` 的回應；只刪 `jpq-v` 開頭的舊快取；安裝時個別檔案失敗不影響整體。改版請把 `VERSION` 加 1，並把新檔加進 `FILES`。

## 自我檢核
1. `node -e "new Function(require('fs').readFileSync(檔案,'utf8'))"` 檢查語法。
2. node 載入資料檔確認筆數與欄位。
3. 瀏覽器跑（375px，6 主題×淺深色）：首頁 → 入門一局 → 地圖一站 → 結果 → 不會清單 → 手冊。

## 知識庫 kb ＋ 3D 心智圖 mind3d（C）
- 主介面 `kb`（js/kb.js、css/kb.css，前綴 `kb-`）；`App.go('kb-page', {id})`，id 可為 `w:N5:12`／`gram:〜ます`／`cj:te`。舊 `mind` 路由＝轉址（帶 focus/script → `mind3d`，其餘 → `kb`）。
- 3D 改路由 `mind3d`（nav:false, navParent:'kb'，實驗功能）。延遲載入順序：data/mind/{taxonomy,conj,grammar,scripts}.js → js/kb.js →（mind3d 另加）vendor/3d-force-graph.min.js → js/mind3d.js → js/mind-game.js；**kb.js 必須在 mind3d.js 之前**；lex-n5…n1 由 kb.js／mind3d.js 自行載入。
- 存檔 `jpq.mind.v1` 新增 `ing`、`fav`、`recent`；視圖設定 `jpq.kb.v1`；lex 列新增第 8 欄 core。以下為 3D 細節：
延遲載入：`vendor/3d-force-graph.min.js` → `data/mind/{taxonomy,conj,grammar,scripts}.js` → `js/mind3d.js` → `js/mind-game.js`；詞彙 `data/mind/lex-n{5..1}.js` 用到該等級才載入。樣式 `css/mind.css`（前綴 `mm-`、`route-mind3d`）。
- 全域 `MIND`：`LEVELS`、`WH`（人事時地物＋狀、虛）、`SCENES`（18 個生活場景）、`SUB`（旅遊場景 → 生活場景）、`POS`、`GRP`、`GCAT`、`CONJ`／`conjugate(動詞, 類別)`／`adjForms`、`gram[]`、`GROUPS`、`lex.N5…`。
- 詞彙列：`[jp, kana(同 jp 時空字串), zh, pos, grp, wh, 'sc1,sc2,…']`，第一個場景是主場景。加入不會清單用 `word:<jp>`。
- 文法：`{id:'gram:<句型>', pat, lv, ord, zh, conn, ex:[日,中], cat, wh, sc[], conj[], pre[], rel[], note?}`；`pre` 只指向 `ord` 較小的文法。
- 四種檢視：`map` 總覽（等級分層×人事時地物扇區×場景群）、`focus` 焦點、`tense` 時態網、`path` 學習路線（螺旋）。`App.go('mind3d', {focus:'節點id'})` 或 `{script:'任務id'}` 可直接進入。
- 存檔：localStorage `jpq.mind.v1` ＝ `{learned:{文法id:1}, done:{任務id:星數}, best:最高連擊, toured}`（不在 `jpQuest.v1` 內）。
- 任務腳本：`data/mind/scripts.js` 的 `MIND.SCRIPTS`（單一任務）與 `MIND.TEMPLATES`（`each` 展開），步驟 op 說明在該檔開頭；引擎在 `js/mind-game.js`（`MIND.game.start(id)`）。新增 op：在 `MIND.game.ops` 加一個 `async (step, run) => {}`。
- 3D 檢視對腳本開放的 API：`MIND.view`（`setMode`、`focus`、`expand`、`flyTo`、`apply`、`HL` 高亮、`intercept` 攔截節點點擊、`learn`…）。
- XP：任務完成依星數 10／15／20，規則同全站；答錯的單字自動進不會清單。
- 資料重建與來源：`docs/資料來源.md`。

## 冒險世界（路由 `play`、`event`；首頁改由 home.js，`World.home` 不再使用）
日本地圖（5 地區，蓋御朱印解鎖：東京 0、京都 4、大阪 8、北海道 12、沖繩 16）→ 街區格子地圖（點了自動走過去）→ 店內格子地圖。全部由資料驅動。
- 資料：`data/world/index.js`（`WORLD.LEVELS`、`WORLD.regions[{id,x,y,need,files,order}]`、`WORLD.pack(region,{districts,shops})`）；各地區檔 `data/world/*.js`。格式見 `docs/世界資料格式.md`，改完跑 `node tools/check-world.mjs`（0 錯誤才算完成）。
- 引擎：`js/world.js`（地圖、店內流程：store 拿商品→收銀台；eat 入座→菜單→叫店員→上菜→櫃台結帳；service 櫃台辦手續；自由對話組句）、`js/phrase.js`（`Phrase.make/check/count/yen/spoken/INTENTS`，依程度 N5–N1 換禮貌層級）、`js/world-quest.js`（委託板、問路、狀況題、日本地圖 `World.japan(el)`、首頁 `World.home(el)`、御朱印 `World.goshuin()`）。
- 對外：`window.World = { st, lv, li, showKana, showZh, loadRegion, loadEvents, regionOf, pickLevel, Q, tx, item, X, japan, goshuin, home, stampCount, missionsOf, progress }`。
- 存檔 `App.state.world`：`lv` 程度（N5–N1）、`stamps[店id]={r,i,n,t}` 御朱印、`dex[店id]=[商品索引]` 圖鑑、`zones[店id]='A,B'` 走過的區域、`pos[街區id]=[x,y]`、`spots['街區:key']=1` 打卡、`last[地區]=街區id`、`at={r,d,s,label}` 繼續冒險位置。
- 委託星數：`App.state.cleared['w:<店>:<委託>@<程度>']`、問路 `'w:<街區>:route@<程度>'`；獎勵一律走 `App.reward`。一間店完成 5 個委託蓋御朱印並掉落頭像。
- 樣式 `css/world.css`：前綴 `wd-`（地圖、面板）、`jp-`（首頁、日本地圖）、`ev-`（狀況題）。
- 舊旅程 `travel.js` 的路由改名為 `trip`，不再是入口。
