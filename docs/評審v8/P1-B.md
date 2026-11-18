# P1-B：「今天」首頁、載入瘦身、舊模組納入經典練習

範圍：報告 §5 階段 1 第 3–6 點，以及使用者決定 3（舊模組不刪、收進經典練習）。另處理 C、D 組轉來的交接。
實測環境：埠 8802、無頭 Chrome（CDP 9802）、375×812，略過 Service Worker、停用快取、每輪先清空存檔。
腳本與截圖：`D:\reviewtmp\p1-B\`（`lib.mjs`、`t1.mjs` 首次載入＋4 種目的、`t3.mjs` 經典練習與全部路由、`t4.mjs` 狀況題、`t7.mjs` SW 快取）。

## 已做
1. **首頁改成「今天」**（js/home.js）
   - 唯一主按鈕「▶ 開始今天的課（約 8 分鐘）」，副標寫出要複習幾個、新學幾個、要做哪個應用。完成後主按鈕改成「▶ 再上一課」。
   - 主按鈕之外只留：今日進度（複習／新學／應用，不能點）和連勝。捷徑列、今日 3 件事、旅遊快查、日本地圖都拿掉了。
   - 多目的的人，主按鈕下面多一顆「今天練：🧳 旅遊 ⇄ 換」，可切換今天用哪個目的（存在 `today.goal`，隔天重設）。
   - 零基礎、平假名還沒學完 46 個時，主按鈕不分目的，一律走五十音今日課。首頁不再有其他五十音入口。
   - 首頁數字一律讀 `Learn.stats().due`，不讀 Tracker。
2. **今日課（路由 `today`）**
   - 先載入需要的資料，再呼叫 `Learn.prepare(goal)`。
   - 流程：
     1. 到期複習（最多 15 個）：看答案，再選 😵忘了 0／🙂記得 2／😊很簡單 3。
     2. 新學 5–8 張卡：日文、讀音、羅馬字（`Phrase.romaji`）、中文、🔊，會自動播音。
     3. 小測驗：第一次答對記 2，答錯記 0，最後再考一次，重考答對記 1。
     4. 結算：學會 N、複習數、明天到期 M、連勝、+XP。
   - 每題都呼叫 `Learn.record(id, grade, {src:'today'})`。
   - 結算頁的「▶ 用出來」依目的進到應用：
     - travel：`World.next()`，下一間店。
     - exam：`challenge-play {lv, t:'mix'}`。
     - fun：`read-article {daily}`，今日短文。
     - work：`BIZ.next()`，進 `biz-unit`。
     - kana：五十音小考。
   - fun 的新學不夠時，用今日短文的段落補（再不夠就用場景單字）。work 先 `BIZ.load()`，不夠時用 `BIZ.units` 的 vocab／phrases 補。
   - 離開今日課再回來，可以從原處接著上（同一天、同一個目的）。
3. **index.html 只同步載入外殼**：tokens.css、app.css、core、learn、game、home。
   - 其他路由全部改用新的 `Home.lazy(defs, js, css)`，CSS 也跟著路由載入。原本的 `App.lazy` 不能載 CSS，也不能替「模組自己註冊的路由」補依賴，所以另外做了這支。
   - `Home.lazy` 會包住之後的 `App.register`：路由清單上的 js／css 都載完才會 render。所以 `event` 進入時才補載 TravelData。
   - 登記的路由：冒險、狀況題、複習、字卡、手冊、特訓、挑戰、知識庫、3D、閱讀／歌曲、商務 biz／biz-unit／biz-read，以及經典練習全部舊路由。
4. **🏯 經典練習（新檔 js/classic.js，路由 `classic`）**
   - 入口：冒險地圖頁底部按鈕（home.js 附加，只在地圖層顯示），以及設定 →「🏯 經典練習」。首頁沒有入口。
   - 收進來的舊模組：
     - 東京 13 站（trip／trip-stop／trip-event／trip-next）
     - 練習地圖（practice-map／stage）
     - 情境小遊戲（menu，13 個場景）
     - 單字測驗・對話・口說（scene／drill）
     - 假名關卡（quest）
     - 特訓（boot）
   - 舊模組和資料（quest、practice、town、travel、menus、travel*.js、scenes*、cards、loan、kana-data）都已從同步清單移除，進 classic 時一起載入，彼此路由互通。
   - 舊模組答錯時的 `Tracker.add(item, true)` 都改成 `Learn.record(item.id, 0, {src, item})`：
     - quest 1 處、town 2 處、practice（menu）1 處、travel 2 處、drill 1 處
     - world-quest 3 處
   - practice.js 字卡段落的手動「＋不會清單」沒動。
5. **sw.js v38**：預快取只放外殼 12 檔（index、tokens/app.css、core/learn/game/home.js、manifest、3 個 icon）。其他檔案靠 fetch 的執行期快取。
6. **C、D 組交接**
   - 商務三路由已用 lazy 登記。今日課 work 的順序是：先載 biz.js，再 `BIZ.load()`，再 `Learn.prepare('work')`／`BIZ.next()`。
   - 閱讀頁「文章」分頁加了「💼 商務」一節，列出 `BIZ_READING` 6 篇，點了進 `biz-read`。這是對 reader.js 的最小改動：列表加 1 段、1 行事件。
   - CONTRACT 已補上：`cleared['biz:<單元>']`、`cleared['biz:r:<文章>']`；路由 biz／biz-unit／biz-read；3D 不分 N 級（`M.kb.gramPath(null,n)`）、任務 66 個。
7. **CONTRACT.md** 重寫了這幾節：載入順序（含 `Home.lazy` 與各路由依賴表）、路由一覽、存檔欄位 `today`、SW 規則、class 前綴 `td-`／`cl-`。
8. css/app.css 新增今日課（`td-`）、首頁進度（`hm-goal`、`hm-prog`）、經典練習（`cl-`）的樣式，只用 tokens 變數，觸控目標 ≥44px。

## 驗收數據（清空存檔、375×812）
| 項目 | 目標 | 實測 |
|---|---|---|
| 首次載入 | ≤350KB、≤15 請求 | **9 個請求、172.9KB**（html 6.8K、tokens 5.9K、app.css 31.5K、core 44.9K、learn 28.6K、game 11.9K、home 34.9K、manifest、logo.svg、icon-192）。原本 36 個、1.36MB。走完程度、字級、目的選擇後仍是 9 個 |
| SW 預快取 | ≤400KB | 快取 `jpq-v38`：12 檔、198.6KB（原本 84 檔、5.85MB） |
| 首頁可點元素（含頂列與導覽） | ≤10 | 多目的：**10**（logo、導覽 5、Lv、⚙️、主按鈕、目的切換）；單目的：9 |
| travel／n5 | 今日課＋應用 | 新學 6（便利商店單字）→ 小測驗 → 結算 → 「到冒險店家用一次」→ `play` 上野便利商店店內 |
| exam／n4 | 同上 | 複習 4 → 新學（N4 文法＋詞）→ 結算 → `challenge-play` N4 綜合 10 題 |
| fun／n4 | 同上 | 新學取自今日短文「お花見」→ 結算 → `read-article` お花見 |
| work／n3 | 同上 | 新學取自 BIZ 單元單字 → 結算 → `biz-unit` 自我介紹與名片交換 |
| zero（旅遊） | 五十音單一入口 | 主按鈕「あ」→ 新學 5 個平假名（測驗問讀音）→ 結算 → 五十音小考（手冊五十音分頁） |
| 經典練習 | 每個舊模組進得去並玩一步 | 都有截圖 `10-*.png`：<br>• trip：13 站地圖 → 車站 → 單字測驗作答到第 2 題<br>• trip kana：五十音入門<br>• practice-map：進濁音關 quest，答了一題（扣一顆心）<br>• menu：收銀台熱食小遊戲開始<br>• scene：便利商店場景頁<br>• drill：綜合測驗作答<br>• quest：あ行關作答<br>• boot：特訓首頁 |
| 其他路由 | 都能進入 | 都正常顯示：play（地圖底部有經典練習入口）、event（TravelData 延遲載入，作答一題，`11-event.png`）、cards、review、phrasebook 五十音小考、challenge-play、kb、read（商務 6 篇）、biz-read、songs、biz、mind3d、settings → classic |
| console | 0 錯誤 | t1、t3、t4、t7 全部 **0 錯誤**。只有一筆無頭 Chrome 自己去抓 `/favicon.ico` 的 404，不是網站錯誤 |
- `node --check`：js/*.js 與 sw.js 全過。test-romaji 27/27、test-jptext 27/27。沒有動 data/world。

## 未做／限制
- 底部導覽仍是 5 鈕（今天／冒險／閱讀／知識庫／複習）。報告目標「今天／路線／查／我的」屬於階段 2。
- 應用在結算畫面之後才做：按「▶ 用出來」就記為「應用 ✓」，沒有回頭偵測應用是否真的完成。
- 「學會 N」＝本課小測驗答對（含重考）的新項目數，不等於 Learn 的 mastered。
- 經典練習只是一個入口，舊模組沒有重新設計，彼此的舊連結照舊。字卡（cards）仍在 practice.js 裡，所以它的延遲清單要另外載 cards／loan 等資料。
- 測試中發現：在冒險店內頁面同一時刻改 profile 又換頁，world.js 的 `profilechange` 會把畫面重畫回店內。這不是 B 組的檔案，正常操作（在設定頁改程度）不會遇到。
- `daily.tasks`（舊「今日 3 件事」）已不再寫入，舊存檔裡的欄位留著沒有清。

## 交接
- **A 組（learn.js）**：`Learn.queue('work')` 的 `bizList()` 會把 `window.BIZ.units` 整個單元物件當成 item（單元沒有 jp），所以 `workFresh` 回傳空陣列。C 組說現在另有 `BIZ.items`（273 筆，id 已是 v:/p:/g:）。建議 `bizList` 優先讀 `B.items`。首頁目前自己用 `BIZ.units` 補新學。
- **A 組**：`funFresh` 對新使用者永遠是空的，首頁用今日短文段落補。若要改成共用規則，建議搬進 Learn。
- **world 擁有者**：`World.next()` 給今日課 travel 應用使用。冒險地圖頁底部的「🏯 經典練習」按鈕由 home.js 附加；若 world 改了地圖頁結構，請保留 `params` 沒有 d／s 時的地圖層。
- **D 組（reader.js）**：閱讀「文章」分頁新增「💼 商務」一節（`data-biz` → `biz-read`），如要調整位置或樣式請自行接手。
- **各組**：新路由請在 index.html 用 `Home.lazy([[route, def]], [js], [css])` 登記，不要加回同步 `<script>`／`<link>`。sw.js 的 `FILES` 不用再加新檔。
