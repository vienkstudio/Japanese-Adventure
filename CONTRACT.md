# 日語冒險網站 — 模組介面契約（2026-11-16 重寫）

網站根目錄：`D:\Coding\日文講義\`，入口 `index.html`。純前端、無建置工具；外部只有 PWA service worker，不載入 CDN。
定位：**零基礎台灣學習者＋日本自由行（N5–N4 為主）**。說明文字用繁體中文；日文附讀音、中文，入門字附中文諧音。

## 載入順序（index.html，2026-11-18 起只同步載入外殼）
| 順序 | 檔案 | 內容 |
|---|---|---|
| 0 | `<head>` inline＋`css/tokens.css` → `css/app.css` | 先讀 localStorage `jpQuest.ui` 設 `data-theme/data-palette/data-fs`（避免閃爍）；其他 CSS 都隨路由載入 |
| 1 | `js/core.js` → `js/learn.js` → `js/game.js` → `js/home.js` | `App`、`Tracker`；`Learn`；音效／每日；「今天」首頁、今日課、設定、程度選擇、**延遲載入器 `Home.lazy`** |
| 2 | inline | `Home.lazy(...)` 登記全部其他路由 → `App.start()` → 註冊 `sw.js` |

首次載入（清空存檔）：9 個請求、約 173KB（未壓縮）。**不要再把模組或資料加回同步清單**；新功能一律用 `Home.lazy`。

### 延遲載入 `Home.lazy`
```js
Home.lazy([[route, {title, icon, nav?, navOrder?, navParent?, transient?}], …], [js 依序載入…], [css 並行載入…])
Home.need(route) -> Promise        // 先載入某路由需要的 js／css（例如今日課結算要拿 World.next()）
Home.needSrc([js…], [css…]) -> Promise / Home.loadCSS(href) -> Promise
```
- 先登記路由外殼（顯示「載入中…」）；第一次進入才載入，載完重畫。模組之後自己 `App.register` 同名路由時，home.js 會包一層：**render 前一定先確認該路由清單上的 js／css 都載完**（所以 `event` 由 world-quest.js 註冊，但清單另含 TravelData，進入時才補載）。
- 同一個 js 只載一次（`App.loadScript` 快取）；`kana-data.js` 用 `const` 宣告，不能重複載入。
- 依賴群組（index.html）：`K` kana-data、`SC` scenes-1/2＋scene-ext、`PH` phrase.js、`LO` loan.js、`TD` data/travel*.js。

| 路由 | js（依序） | css |
|---|---|---|
| `play`（nav 2） | PH、LO、SC、data/world/index.js、world-art、world、world-quest | world.css |
| `event` | 同 play ＋ TD | world.css |
| `review`（nav 5） | K、SC、PH、review.js | — |
| `cards` | K、SC、data/cards.js、PH、LO、practice.js | world.css |
| `phrasebook` | K、SC、PH、data/world/index.js、kana-lesson、phrasebook | kana.css |
| `boot`、`boot-play` | SC、data/drills.js、drill.js | — |
| `challenge`、`challenge-play` | data/mind/grammar.js、challenge.js | challenge.css |
| `kb`（nav 4）、`kb-page`、`mind` | PH、LO、data/mind/{taxonomy,conj,grammar,scripts}、kb.js | kb.css |
| `mind3d` | 同 kb ＋ SC、vendor/3d-force-graph、mind3d、mind-game | kb.css、mind.css |
| `read`（nav 3）、`read-article`、`songs`、`song` | PH、LO、SC、data/reading/daily.js、data/reading/biz.js、jp-text、link-import、reader、songs | reader.css |
| `biz`、`biz-unit`、`biz-read` | PH、data/biz/units-1..4、data/reading/biz.js、biz.js | biz.css（biz.js 也會自行插入） |
| `classic` 與全部舊路由（見下） | K、SC、cards、menus、TD、PH、LO、quest、practice、town、travel、classic.js | travel.css、world.css、kana.css |

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

## 學習進度 Learn（js/learn.js，2026-11-18 起唯一一份進度）
所有活動只呼叫 `Learn.record`；字卡、挑戰、知識庫、複習、冒險句卡讀同一份狀態，**不要再寫模組間的橋接**。
```js
// Item id（以內容為鍵，不用陣列索引）
'kana:<平假名>'  'v:<辭書形 jp>'  'p:<句子正規化：去空白與句尾。！？>'  'g:<句型 pat>'   // num:、cnt:、cj: 等其他前綴原樣保留
Learn.idOf(x, type?)        // 舊 id／來源物件 → 新 id：word:/adj: → v:；phrase:/idiom:/proverb: → p:；gram:（含 GALIAS）→ g:；
                            // 知識庫 'w:N5:12' 用「當下載入的」詞庫查回 jp（未載入回 null）；挑戰索引 idOf({L,kind:'w'|'g',i}, 'chal')
                            // 物件 {jp} 依 type 'kana'|'vocab'|'phrase'|'grammar'
Learn.kbIdOf(id)            // 反查知識庫 id（g:→gram:；v:→w:Lv:i，需詞庫已載入）
Learn.record(id, grade, ctx)   // grade 0 忘了／答錯、1 困難、2 答對、3 簡單；ctx {src:'chal'|'card'|'kb'|'world'|'review'…, item:{jp,kana,romaji,zh,hint,emoji,source,lv}, lv, nosave}
                            // FSRS-lite：答對 stab×(1.2/2.5/3.5)，due＝now+stab 天；答錯 lapses+1、stab×0.3、due=0。stab≥2＝review、≥6＝mastered（約連對 3 次）
Learn.setStatus(id, 'new'|'learning'|'review'|'mastered', ctx)   // 手動設定（知識庫三態）
Learn.get(id) -> entry|null  /  Learn.status(id) -> 'new'|'learning'|'review'|'mastered'  /  Learn.atLeast(id, s)
Learn.star(id, on, ctx)     // 加入／移出不會清單（移出時 ack＝lapses）；Learn.fav(id, on) 知識庫收藏；Learn.inList(id)
Learn.due(n?) -> [id]       // 到期（s≠new、due≤now），最早到期在前
Learn.queue(goal?) -> { goal, due:[view ≤15], fresh:[item 5–8], apply:{route, params, label} }   // goal 預設 profile.goals[0]
                            // fresh 依目的與程度：travel→zero 先五十音，否則 SCENES 單字／會話句（n4 以上句子優先）＋已載入的世界品項；
                            // exam→當級 MIND 文法 ≤3＋詞庫（core 字優先）；fun→歌曲／閱讀收進來但還沒練過的；work→window.BIZ（未載入＝[]）
Learn.prepare(goal?) -> Promise<queue>   // 先載入需要的內容（exam：grammar.js＋當級 lex）再回傳 queue；首頁「今日課」請用這個
Learn.stats({lv?, type?:'v'|'g'|'p'|'kana'}) -> { total, new, learning, review, mastered, due, list, known(≥review) }
Learn.view(id) / Learn.views(filter(e,id)) // Tracker 相容的顯示物件 {id, jp, kana, romaji, zh, hint, emoji, source, lv, added, seen, right, wrong, streak, mastered, due, s, inList, star}
Learn.mindST()              // 知識庫／3D 舊 ST 形狀：learned／ing／fav 由 Learn 計算；done／best／toured／recent 存 App.state.mind
document 事件 'learnchange'（detail {id, e}）
```
- 存檔 `App.state.learn = {<id>: {s, due, stab, diff, reps, lapses, last, src, star?, fav?, ack?, str?, g?, m?}}`（`g` 最後評分＝字卡自評；`m` 顯示用資料），跟著備份、雲端、IndexedDB。
- **遷移（一次，`App.state.learnV`=1）**：`tracked`（star＋排程）、`cardDiff`（3→答錯、2→答對、1→簡單）、`world.cards`（句卡保留當收藏冊，另建 p: 進度）→ `learn`，舊欄位 `tracked`、`cardDiff`、`chal.m` 刪除；`chal.m` 與 `jpq.mind.v1` 的 `w:Lv:i` 是索引，先放 `learnPend`，閒置時載入詞庫再轉（`Learn.resolvePending()`）。localStorage `jpq.mind.v1` 只讀不刪；`App.store.set('jpq.mind.v1', …)` 改為 `App.save()`。XP、星星（cleared）不動。還原舊備份（無 learnV）會再跑一次遷移。
- 狀態對應：知識庫 ○未學＝new、◐學習中＝learning、●已掌握＝review 以上；挑戰「已掌握 %」＝該級 v:＋g: 中 known 的數量（依 entry.m.lv）；字卡自評篩選讀 `g`。

## Tracker（不會清單＝Learn 的檢視）
```js
Tracker.add(item, silent?) / remove(id) / has(id) / get(id) / list(includeMastered?) / count()
Tracker.mark(id, correct)   // ＝ Learn.record(id, correct ? 2 : 0, {src:'review'})
Tracker.dueList() / dueCount()   // 今日該複習：所有到期的學習項目（不限不會清單）
```
介面不變，舊 id 照用（內部轉成新 id；`list()`／`get()` 回傳的 `id` 是新 id）。清單＝`star` 或 `lapses>ack`；`has` 不含已掌握；`get` 任何有進度的項目都回傳。
規則：答錯一律 `Tracker.add(item, true)`（新程式請改 `Learn.record(id, 0, {item})`）；每個單字／句子／假名旁都用 `App.trackBtn(item)`。第一次加入時 core 會跳出說明 toast。

### id 前綴（Tracker 舊格式，仍可傳入）
| 前綴 | 來源 | Learn id |
|---|---|---|
| `kana:<平假名>` | 五十音 | 同 |
| `word:<jp>`、`phrase:<jp>` | 場景單字、句子、狀況題、店員問句、看板 | `v:`、`p:` |
| `gram:<句型>` | 文法 | `g:` |
| `num:<類型>:<答案>` | 數字快打 | 同 |
| `cnt:<品項>:<數量>` | 量詞 | 同 |

## 存檔（localStorage `jpQuest.v1`，可同步雲端）
`v`（schemaVersion，目前 2；舊檔由 `migrate()` 補齊欄位）。每次 `save()` 也會寫一份到 IndexedDB（`jpQuest/kv/save`）；localStorage 被清掉時開啟會自動還原。欄位擁有者：

| 欄位 | 擁有者 |
|---|---|
| `xp`、`cleared`、`log`、`streak`、`trackHelp`、`clearN`、`v` | core.js |
| `learn`、`learnV`、`learnPend`、`mind`（`done best toured recent`） | learn.js（Learn）；`mind` 由知識庫／3D 透過 `Learn.mindST()` 讀寫 |
| `daily`（`date ok quests clear review claimed`；`quests`＝冒險世界店內完成目標，由 world 組呼叫 `Game.bump('quests')`；`clear`＝其他模組過關，game.js 自動計；每日任務「完成 1 個關卡或任務」＝兩者合計，見 `Game.prog(id)`）、`avatar` | game.js |
| `avatarsOwned` | travel.js 寫入（掉落）、game.js 讀取 |
| `trip`（`level`、`runs[難度]`、`stamps`）、`kanaL`、`kanaDay`（最後完成一組五十音的日期，首頁用） | travel.js |
| `read`（`done{id:星}`、`pref`、`lastDay`＝最後讀完每日短文的日期，首頁「今日短文」直接讀這裡，不依賴延遲載入的 reader.js） | reader.js |
| `world`（`lv`、`stamps`、`dex`、`zones`、`pos`、`spots`、`last`、`at`） | world.js／world-quest.js（`lv` 由 core 從 profile 同步，請改讀 `App.profile()`） |
| `profile`（`lv`、`goals`、`assist`、`placed`） | core.js（`App.setProfile`）；舊檔 migrate：冒險世界有進度用 `world.lv`，否則 `trip.level`（K0→zero）；`xp>0` 的舊玩家一律 `placed:true` |
| `ui`（`theme`、`palette`、`fs`） | core.js（`App.setTheme`） |
| `sit`、`sceneDone`、`guide`、`cardDay` | practice.js（town.js 也寫 `sceneDone`；字卡自評改走 Learn） |
| `drill`、`drillOpt` | drill.js |
| `today`（`date goal done learned reviewed applied`：今日課紀錄；`goal`＝多目的的人今天選的目的，隔天重設） | home.js |
| `cleared['biz:<單元id>']`（單元星數）、`cleared['biz:r:<文章id>']`（商務閱讀星數） | biz.js（C） |

`trip.level` 也由 profile 同步（zero→K0）；舊旅程不再有「新開始／切換難度」。
migrate 也會修正型別：`xp` 非有限數字→0（負數→0）、`cleared` 是陣列→`{}`。

## 返回鍵
頂列 `#backBtn` 是全站**唯一**返回鍵（首頁不顯示、不佔位）；各頁內容區不要再放 ← 按鈕。

## 路由一覽
底部導覽 4 鈕（第二階段，2026-11-19）：`home`(1) 今天、`path`(2) 路線、`lookup`(3) 查、`me`(4) 我的；`play`／`challenge*`／`boot*`／`biz*`／`act` 歸路線，`read*`／`songs`／`song`／`kb*`／`mind3d`／`phrasebook` 歸查，`review`／`cards`／`settings`／`classic` 歸我的；其餘 `nav:false`，用 `navParent` 指定點亮哪一鈕（沒指定＝點亮首頁）。
| 路由 | 模組 | 說明 |
|---|---|---|
| `home`（nav 1） | home.js | 「今天」：唯一主按鈕「▶ 開始今天的課（約 8 分鐘）」→ `today`；多目的的人主按鈕下有 1 顆「今天練：⇄ 換」切換今天的目的；連勝與今日進度（複習／新學／應用，不可點）。v48 起（使用者決定）首頁＝主按鈕＋「⏯ 繼續上次」＋「全部內容」7 張分類卡（自己的目的排前面）；頂列 ☰ 開側邊樹（≥1024px 常駐左側）、內頁顯示麵包屑（js/nav.js）。未定位（`profile.placed` false）先顯示程度選擇→字級→目的，body 加 `.ob-mode` |
| `today` | home.js | 今日課 params `{goal:'travel'|'exam'|'fun'|'work'|'kana'}`。零基礎且平假名未學完（Learn 的 `kana:` 項目＜46）＝`kana`，不分目的。流程：`Learn.prepare` → ① 到期複習 ≤15（看答案→忘了 0／記得 2／很簡單 3）→ ② 新學 5–8 張卡（日文、讀音、羅馬字 `Phrase.romaji`、中文、🔊）→ ③ 小測驗（第一次答對 2、答錯 0 並在最後重考一次、重考答對 1）→ 結算（學會 N、複習、明天到期 M、連勝；+XP）＋「▶ 用出來」應用：travel＝`World.next()` 下一間店；exam＝`challenge-play {lv, t:'mix'}`；fun＝`read-article {daily}` 今日短文；work＝`BIZ.next()`（`biz-unit`）；kana＝`phrasebook {tab:'kana', sub:'quiz'}`。每題都 `Learn.record(id, grade, {src:'today'})`。fun 的新學不足時用今日短文段落補、work 用 `BIZ.units` 的 vocab／phrases 補 |
| `settings` | home.js | 設定頁：程度、目的、外觀、語音、其他（音效、頭像、備份）、清除 |
| `play`（nav 2） | world.js | 冒險世界：params `{r, d, s}`；地圖頁（無 d/s）底部有「🏯 經典練習」入口（home.js 附加） |
| `event` | world-quest.js | 店家狀況題（需 TravelData，延遲載入） |
| `read`（nav 3）、`read-article`、`songs`、`song` | reader.js、songs.js | 閱讀、歌曲；文章分頁另有「💼 商務」一節（`BIZ_READING`，點了到 `biz-read`） |
| `kb`（nav 4）、`kb-page`、`mind3d` | kb.js、mind3d.js | 知識庫；`mind3d`＝3D 心智圖（實驗功能，**不分 N 級**：學習路線用 `M.kb.gramPath(null, n)`；任務 66 個） |
| `review`（nav 5）、`cards` | review.js、practice.js | 複習（單一 SRS）、字卡 |
| `phrasebook` | phrasebook.js | 會話手冊＋五十音講義與小考。params `{q}`、`{cat}`、`{tab:'kana', sub:'quiz'}` |
| `challenge`、`challenge-play` | challenge.js | JLPT 題型挑戰 |
| `biz`、`biz-unit`、`biz-read` | biz.js（C） | 商務日語：單元列表、單元流程 `{id}`、商務短文 `{id}`；`BIZ.next()` → `{label, sub, route:'biz-unit', params:{id}, icon}`；`BIZ.load()` 載入 data/biz/* |
| `boot`、`boot-play` | drill.js | 實戰特訓（經典練習內） |
| `classic` | classic.js | 🏯 經典練習：收納舊模組的單一入口（從冒險地圖頁或設定進入，不在首頁） |
| `trip`、`trip-stop`（transient）、`trip-event`、`trip-next`（transient） | travel.js | 舊旅程東京 13 站（`{kana:1}`＝舊五十音入門） |
| `practice-map`、`stage`、`practice`（transient）、`menu` | practice.js | 舊練習地圖、場景關卡、情境小遊戲 `menu {id}` |
| `town`（transient）、`scene`、`drill` | town.js | 舊單字測驗／對話／口說：`scene {id}`、`drill {scenes:[id]}` |
| `map`（transient）、`quest` | quest.js | 舊關卡 `quest {id, free}` |

舊模組答錯一律 `Learn.record(item.id, 0, {src:'quest'|'town'|'menu'|'trip'|'boot'|'world', item})`（會進不會清單，與 `Tracker.add` 效果相同）。

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
- class 前綴：`hm-`（首頁）、`td-`（今日課）、`cl-`（經典練習）、`st-`（設定）、`ob-`（程度選擇）、`trip-`、`kn-`、`tg-`、`dr-`、`pb-`、`pc-`、`rv-`、`q-`、`t-`、`m-`、`g-`、`h-`。
- 觸控目標 ≥44px（pill、切換鈕、分頁鈕 min-height 44px）；最小字級 13px（`--fs-xs`，含底部導覽標籤、頂列 🔥/Lv、`.lv-b`、`.track-btn`）。
- 開關型按鈕（`aria-pressed`）：開＝實心主色 `--pri`＋「✓」，關＝外框（虛線），兩者要一眼分得出。

## sw.js 快取規則
網路優先（4 秒逾時）、失敗才用快取；只快取同網域且 `r.ok` 的回應；只刪 `jpq-v` 開頭的舊快取；安裝時個別檔案失敗不影響整體。改版請依下方「版本編號」更新 `VERSION`。**`FILES` 只放外殼**（index.html、tokens/app.css、core/learn/game/home.js、manifest、icons，約 160KB）；其他檔案第一次用到時由 fetch 執行期快取（`put`），新檔不必加進 `FILES`。

## 版本編號（2026-11-22 起，格式 VX.X.X）
- 唯一來源：`js/core.js` 的 `APP_VERSION`（例 `'3.2.3'`，`App.VERSION` 讀取）；`sw.js` 的 `VERSION` 寫成 `'jpq-v' + 同一版本`。`node tools/check-version.mjs` 檢查兩邊一致、格式正確。
- 顯示：設定頁最下方「日語冒險・版本 V3.2.3」。
- 每次**發布（推送上線）**才升版，同一次發布只升一次：
  - **主版號 X.0.0**：導覽或整體架構大改（V1＝第一階段，V2＝第二階段 4 鈕導覽，V3＝樹狀導覽）。
  - **次版號 X.Y.0**：新功能、新頁面、整批評審修正（P0／P1）。
  - **修訂號 X.Y.Z**：小修、文字、樣式、複測小問題（P2）。
- 舊快取名稱 `jpq-v54` 以前的流水號對照：v48＝V3.0.0、v49＝V3.0.1、v50＝V3.1.0、v51＝V3.1.1、v52＝V3.2.0、v53＝V3.2.1、v54＝V3.2.2。

## 自我檢核
1. `node -e "new Function(require('fs').readFileSync(檔案,'utf8'))"` 檢查語法。
2. node 載入資料檔確認筆數與欄位。
3. 瀏覽器跑（375px，6 主題×淺深色）：首頁 → 入門一局 → 地圖一站 → 結果 → 不會清單 → 手冊。

## 知識庫 kb ＋ 3D 心智圖 mind3d（C）
- 主介面 `kb`（js/kb.js、css/kb.css，前綴 `kb-`）；`App.go('kb-page', {id})`，id 可為 `w:N5:12`／`gram:〜ます`／`cj:te`。舊 `mind` 路由＝轉址（帶 focus/script → `mind3d`，其餘 → `kb`）。
- 3D 改路由 `mind3d`（nav:false, navParent:'kb'，實驗功能）。延遲載入順序：data/mind/{taxonomy,conj,grammar,scripts}.js → js/kb.js →（mind3d 另加）vendor/3d-force-graph.min.js → js/mind3d.js → js/mind-game.js；**kb.js 必須在 mind3d.js 之前**；lex-n5…n1 由 kb.js／mind3d.js 自行載入。
- 狀態改走 Learn（見「學習進度 Learn」）：`M.ST = Learn.mindST()`；`jpq.mind.v1` 不再寫入。視圖設定 `jpq.kb.v1`；lex 列新增第 8 欄 core。以下為 3D 細節：
延遲載入：`vendor/3d-force-graph.min.js` → `data/mind/{taxonomy,conj,grammar,scripts}.js` → `js/mind3d.js` → `js/mind-game.js`；詞彙 `data/mind/lex-n{5..1}.js` 用到該等級才載入。樣式 `css/mind.css`（前綴 `mm-`、`route-mind3d`）。
- 全域 `MIND`：`LEVELS`、`WH`（人事時地物＋狀、虛）、`SCENES`（18 個生活場景）、`SUB`（旅遊場景 → 生活場景）、`POS`、`GRP`、`GCAT`、`CONJ`／`conjugate(動詞, 類別)`／`adjForms`、`gram[]`、`GROUPS`、`lex.N5…`。
- 詞彙列：`[jp, kana(同 jp 時空字串), zh, pos, grp, wh, 'sc1,sc2,…']`，第一個場景是主場景。加入不會清單用 `word:<jp>`。
- 文法：`{id:'gram:<句型>', pat, lv, ord, zh, conn, ex:[日,中], cat, wh, sc[], conj[], pre[], rel[], note?}`；`pre` 只指向 `ord` 較小的文法。
- 四種檢視：`map` 總覽（等級分層×人事時地物扇區×場景群）、`focus` 焦點、`tense` 時態網、`path` 學習路線（螺旋）。`App.go('mind3d', {focus:'節點id'})` 或 `{script:'任務id'}` 可直接進入。
- 存檔：`M.ST`（＝`Learn.mindST()`）＝ `{learned, ing, fav（Learn 計算）, done:{任務id:星數}, best:最高連擊, toured, recent}`，在 `jpQuest.v1` 的 `learn`／`mind` 內（舊 localStorage `jpq.mind.v1` 只在遷移時讀）。
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


## 第二階段：路線、活動框架、查／我的（2026-11-19）
完整規格見 `docs/評審v10/00-第二階段契約.md`。
- `js/activity.js`＋`js/activities/{flashcard,choice,wordbank,listen}.js`：`Activity.run/session/register`，活動只呼叫 `ctx.mark(item, grade)`，由 runner 統一 `Learn.record(id, grade, {src, item, type})`；路由 `act`（參數 `{type, ids|items, params}` 或 `{steps, title, back, next, lv}`）。shop 步驟用 `World.shopSim`。
- `js/path.js`：`Path.units(goal,{lv})`、`Path.unit(id)`、`Path.loadUnit(id)`、`Path.nextUnit(goal)`、`Path.prepare(goal)`；路由 `path`（參數 `{tab}` 或 `{goal}`）、`path-unit`。旅遊 14 場景包、日檢 N5–N3 單元＋模擬考、五十音 12 單元（唯一五十音入口）、商務 8 單元、歌曲新聞入口卡。
- `Learn.queue`：非歌曲／五十音目的的新學優先取 `Path.nextUnit(goal)`；`Learn.prepare` 先 `Path.prepare`。
- `js/lookup.js`（查：單一搜尋＋依目的工具卡，3D 與匯入網址為實驗入口）、`js/me.js`（我的：複習、統計、成就、御朱印、設定、經典練習、備份）。
- `World.shopSim(el,{shop,goal,items})`、`World.shopsByType()`、`World.shopPhrases(id)`、`World.loadShop(id)`。
- 回歸測試：`node tools/test-romaji.mjs`、`node tools/test-jptext.mjs`、`node tools/test-activity.mjs`、`node tools/check-world.mjs`。
