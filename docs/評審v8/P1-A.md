# P1-A：統一學習進度（Learn）

範圍：報告 §4.3、§5 階段 1 第 1–2 點。實測環境：埠 8801、無頭 Chrome（CDP 9801）、375×812。截圖與腳本在 `D:\reviewtmp\p1-A\`。

## 已做
1. **新檔 `js/learn.js`（`window.Learn`）**，index.html 在 core.js 之後同步載入。
   - Item id 以內容為鍵：`kana:<平假名>`、`v:<辭書形>`、`p:<句子正規化>`、`g:<句型>`。
   - 轉接層 `Learn.idOf()`：`word:`/`adj:`→`v:`；`phrase:`/`idiom:`/`proverb:`→`p:`；`gram:`（含 GALIAS）→`g:`；知識庫 `w:N5:12`、挑戰索引 `{L,kind,i}` 都用「當下載入的」詞庫查回 jp。
   - 單一進度存在 `App.state.learn`，跟著備份、雲端、IndexedDB。
   - 排程用 FSRS-lite：答對拉長間隔，約連對 3 次就是 mastered；答錯 lapses+1、due=0。
   - API：`record`、`setStatus`、`get`、`status`、`star`、`fav`、`due`、`queue`、`prepare`、`stats`、`view(s)`、`mindST`。
2. **遷移（只做一次，`learnV`=1）**：`tracked`、`cardDiff`、`world.cards`、`jpq.mind.v1`（learned／ing／fav／done／best／recent）、`chal.m` 都併進 `learn`。
   - 用索引記錄的（`chal.m`、`w:Lv:i`）先放進 `learnPend`，閒置時載入詞庫再轉。
   - 刪掉舊欄位 `tracked`、`cardDiff`、`chal.m`；`world.cards` 留著當句卡收藏冊。
   - XP、cleared（星星）不動。
3. **舊 API 改走 Learn**
   - `Tracker`（core.js）改成 Learn 的檢視，介面不變。「不會清單」＝ star 或 lapses>ack。`dueList` 改成所有到期的項目。
   - 字卡自評改用 `Learn.record`（😵→0、🤔→2、😊→3），篩選讀最後一次評分。
   - 挑戰答題改用 `Learn.record`（第一次就答對算 3、之後答對 2、答錯 0）。「已掌握 %」改用 Learn 統計。
   - 知識庫三態改用 `Learn.status`／`setStatus`。`M.ST = Learn.mindST()`，3D／任務照舊讀寫，資料改存在 App.state。
   - 冒險句卡在 `addCard` 呼叫 `Learn.record`。
   - 複習頁的統計改讀 Learn（全站同一份），新增「全部學過的」勾選。
   - 已刪除的橋接：practice.js 字卡→Tracker 的那段、challenge.js 的 kbState／kbMark／kbSync（挑戰→知識庫同步）。
   - `App.store.set('jpq.mind.v1')` 改成呼叫 `App.save()`。
   - core 新增 `App.onMigrate(fn)`：還原、雲端、IDB 換存檔時都會跑遷移。
4. CONTRACT.md 新增「學習進度 Learn」章節，並更新 Tracker、存檔欄位表、知識庫存檔說明。

## 驗收數據
- **同一狀態**：N5 單字「さ来年」在挑戰答對後，Learn＝review、知識庫＝●已掌握（`w:N5:285`）、複習 view＝review，三處一致。答錯的「あそこ」：Learn＝learning、知識庫＝◐學習中、在不會清單、在今日到期。
  - 在知識庫頁點「學習中」，Learn 與 Tracker 同步變成 learning。
  - 字卡點「😵 困難」，Learn 記 lapses 1，並進入不會清單。
- **舊存檔遷移**：測試檔含 tracked 3、cardDiff 3、chal.m（w[10]、g[2]）、jpq.mind.v1（learned 2、ing 1、fav 1、done、best、recent）、world.cards 1，xp=345。
  - 遷移後 xp=345、星數不變。learn 一開始 9 筆，`learnPend` 4 筆；5 秒內轉完，共 13 筆。
  - 對照：「上げる」（chal w[10]）、「〜ではありません」（chal g[2]）、「会う」（w:N5:1）都是 review；「赤い」（w:N5:5）是 learning。
  - 舊欄位已刪，`mind` 已搬進 App.state。
- 用 `App.loadState` 還原無 learnV 的舊備份，同樣會遷移。
- **備份**：備份碼 JSON 含 `learn`（16 筆）、`learnV`、`mind`。
- `Learn.queue`：travel 回 due 7 筆＋fresh 6 筆（SCENES 單字）。`prepare('exam')` 回 N5 文法 3 筆＋core 單字 3 筆，apply＝`challenge-play {lv:'N5', t:'mix'}`。work、fun 目前沒有內容，回空陣列。
- 走過的頁面 console 0 錯誤：首頁、挑戰、知識庫、kb-page、複習（含閃卡一輪）、字卡、備份、mind3d。
- `node --check` 改過的 7 個 js 都通過；test-romaji 27/27、test-jptext 27/27。

## 未做／限制
- world-quest.js 的句卡只負責顯示，沒有寫入點，所以沒改。
- 冒險店內其他答錯的地方仍呼叫 `Tracker.add`（等於加星號），沒有逐一改成 `Learn.record(…,0)`：不在可改範圍，介面相容。
- 其他模組仍呼叫 `Tracker.add`：drill、quest、town、travel、reader、songs、mind-game、kana-lesson。
- 舊 localStorage `jpq.mind.v1` 只讀、不刪（留著可回復）。還原舊備份時，會把本機這份知識庫資料也合併進去。
- 挑戰「已掌握 %」依 entry 的 `m.lv` 計算。在其他地方學會、沒帶等級的字（例如場景單字）不算進該級。
- 冒險 addCard 的實際店內流程沒跑 UI，只驗證語法與 id 一致：`p:` 正規化和遷移相同。

## 交接
- **B 組（首頁「今日課」）**：用 `Learn.prepare(goal)`，它回傳 Promise<{goal, due, fresh, apply}>。
  - `due` 是 view 物件（jp/kana/zh/…），`fresh` 是 item（id/type/jp/kana/zh/source/lv）。
  - 作答後呼叫 `Learn.record(item.id, grade, {src:'today', item})`，grade 為 0–3。
  - 首頁數字：到期數用 `Learn.stats().due` 或 `Tracker.dueCount()`，現在是全部到期、不限不會清單；清單數用 `Tracker.count()`。
  - apply 的 route：travel→`play`、exam→`challenge-play`、fun→`songs`、work→`biz`。work 的路由名稱請 C 組確認。
- **B 組（sw.js／載入清單）**：`js/learn.js` 必須同步載入、緊接 core.js 之後，請加進 SW 外殼預快取。
- **C 組（data/biz）**：`Learn.queue('work')` 會讀 `window.BIZ`，接受三種形狀：陣列、`{items:[…]}`、`{分類:[…]}`。
  - 每筆需要 `{jp, kana?, zh, type?:'vocab'|'phrase'|'grammar', lv?, id?}`。
  - 可以直接給新 id（`v:`/`p:`/`g:`），沒給就用 jp 自動產生。
- **D 組（mind3d／mind-game）**：`M.ST` 現在是 `Learn.mindST()`（Proxy）。
  - `ST.learned[gramId] = 1`、`delete` 照舊可用，背後改走 Learn。
  - `saveST()` 呼叫 `App.store.set('jpq.mind.v1')`，會自動改成 `App.save()`。
  - mind3d 自己的 `M.ST || JSON.parse(localStorage)` 備援只在沒先載 kb.js 時才會用到，建議改成 `M.ST || Learn.mindST()`。
- **各組**：新程式請直接用 `Learn.record`，不要再寫模組間的橋接。
