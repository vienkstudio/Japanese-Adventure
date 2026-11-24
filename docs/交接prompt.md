# 交接 Prompt（換帳號續作用，直接整段貼給新對話）

---

你接手 D:\Coding\日文講義（branch main，不開新分支），工作目錄設在這裡。
- 回覆一律繁體中文、極簡，只說「錯誤」和「成果」，不敘述過程。
- 任務進度工具：
  - 開工：`python D:/勇ㄉ/Coding/00_Codex/00_任務進度/progress.py take a6bae2e2`
  - 收工：`set a6bae2e2 --status <完成|進行中> --progress <0-100> --note "結果"`

## 專案
「日語冒險」：純前端 PWA，入口 index.html，沒有建置工具、不用外部 CDN。
- **使用者**：台灣學習者，程度從零基礎到 N1。
- **4 種目的**：旅遊、日檢、工作商務、歌曲動漫新聞，首次開啟可複選。
- **必讀文件**：
  - CONTRACT.md：模組契約，含 Learn API、路由依賴表、載入規則。
  - docs/評審v8/00-總指揮架構分析.md：目標架構與 3 階段重構路線圖，**這是主計畫**。
  - docs/評審v8/P1-A/B/C/D.md：第一階段各組完成報告。

## 使用者已拍板的決定（以此為準）
1. 「工作商務」不標「即將推出」，要把內容做出來（已有 8 單元）。
2. 3D 心智圖保留，但不分 N1–N5 分級分層（已完成）。
3. 舊模組不刪，收進「🏯 經典練習」（路由 classic，已完成）。
4. 停損：
   - 不新增地區、店家、3D 功能。
   - 不再擴充手寫斷詞字典與文法排除表。
   - 不在首頁加按鈕或條件分支。
   - 不寫模組間的同步橋，一律走 `Learn.record`。

## 目前狀態（V3.4.0，提交 c6e8fbe，2026-11-24）
- 版本編號 VX.X.X：`js/core.js` 的 `APP_VERSION` 是唯一來源，`sw.js` 的 VERSION＝'jpq-v'+版本，`node tools/check-version.mjs` 檢查。
- **架構**（第二階段完成）：
  - 底部導覽＝側邊樹（寬螢幕常駐）：首頁／學習（path）／查（lookup）／我的（me）；導引與工具清單在 `js/nav.js`（工具 16 個，子入口取代重複工具）。
  - 首頁：「開始今天的課」＋繼續上次＋全部內容。
  - 活動框架 `js/activity.js`＋`js/activities/*`（字卡、選擇、組句、聽力、店內 shop），runner 統一 `Learn.record`。
  - 學習路線 `js/path.js`：旅遊 14 包（上課／實戰）、日檢 N5–N3 單元＋模擬考、五十音（入門講義、50 音訓練表收進 App：`js/kana-guide.js`）、商務 8 單元、歌曲閱讀。
  - 經典練習已拆進路線；3D 心智圖保留、不分級。
- **內容與資料**：
  - 只用開放資料（`docs/資料來源.md`；`node tools/check-sources.mjs`）：維基百科「最近の出来事」、維基新聞、維基文庫公有領域唱歌；YouTube 嵌入＋標題為指定例外。已移除 Yahoo／NHK／MATCHA、LRCLIB、jina 代讀、內建流行歌。
  - 詞庫：Tomoshi／JMdict（CC BY-SA 4.0）補詞＋完整模式大詞庫約 2 萬詞、多義 4,564 詞、漢字音訓 2,999 字。
- **測試**（12 支，V3.4.0 全過）：test-activity 76、test-cover 72、test-gloss 34、test-jptext 27、test-lexid、test-nav 240、test-quiz、test-reading 140、test-romaji 38、check-sources、check-version、check-world。
- **瀏覽器驗收（2026-11-24，V3.4.0，375px 全新存檔）**：導覽 34 項全部能開、無橫向溢出、console 0 錯誤；旅遊包字卡寫入 Learn（8 筆）；查：袋／清水寺／トイレ／食べる／ので 都有結果；載入全部詞庫＋完整斷詞後 JS heap 約 89→185MB（低階手機可能吃力，留意）。腳本：`D:\reviewtmp\accept\run.mjs`、`run2.mjs`。
- **歷次評審**（簡單明瞭／想玩下去）：v7 5.7／6.2 → v9 7.1／6.4 → v15 7.50／6.89 → v16 7.72／7.22 → **v17 8.00／7.33**（9 位角色，V3.2.3）。V3.3.0、V3.4.0 之後尚未重測。

## 待辦（依序）
1. **評審 v17 P2**（`docs/評審v17/00-彙整.md` P2 段，V3.3.0 已修部分，請先逐項確認）：
   - 寬螢幕主內容多 15px 橫捲；onboarding 時側邊樹要 inert。
   - 今日課結算先顯示 +0 XP。
   - 清水寺「辦手續」任務說明；N1 讀音干擾項用加刪「っ」產生假字（`challenge.js:253–254`）。
   - 我的「已學會 n/46」與「全部共學會 0 個」矛盾。
   - 各駅停車、指定席整詞與羅馬字切法一致。
   - 五十音分頁頁高（只顯示下一課，其他收進「全部分行 ▸」）。
2. **評審 v18 重測 V3.4.0**：9 位角色照 `docs/評審v17` 方式（零基礎長輩、N5 大學生、N3 上班族、J-pop 迷、一週後出發旅客、N1 考生、商務、完全零基礎首次開啟、只想跟唱 cover），報告寫到 `docs/評審v18/`；重點驗證開放資料替換後的新聞與歌曲是否仍好用、大詞庫記憶體。
3. **第三階段**（`docs/評審v8/00-總指揮架構分析.md` §5 階段 3）：內容管線 content-src/＋tools/build.mjs、精選閱讀與歌詞離線斷詞＋人工校對、N2／N1 題庫（日文題幹長文讀解、會話聽解）。目標：簡單明瞭 8、想玩下去 7.5、真的學到 7。

## 工作方式與注意
- **測試環境**：
  - 用 `.claude/launch.json` 的 `jp-test`（埠 8779，獨立 origin）。不要用 8765，那是使用者的伺服器，裡面是真實存檔。
  - 子代理實測用 `python -m http.server <自己的埠>` 加本機無頭 Chrome（CDP），可參考 D:\reviewtmp\r2p4drv.mjs。
  - 截圖、腳本放 D:\reviewtmp\<組>\，測完關掉伺服器和 Chrome。
- **快取與腳本**：
  - 改檔後瀏覽器會吃舊快取。先註銷 SW、清 caches，或 `fetch(檔,{cache:'reload'})`。
  - Bash heredoc 常失敗，多行腳本用 Write 寫好再執行。
- **平行分工**：依檔案擁有權分組，報告寫「交接」段，由主對話統一 commit。
- **新路由**：在 index.html 用 `Home.lazy` 登記，不要加回同步載入；sw.js 預快取只放外殼，發布時依 CONTRACT.md「版本編號」更新 js/core.js 的 APP_VERSION 與 sw.js 的 VERSION（node tools/check-version.mjs 檢查）。
- **commit**：訊息用中文，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- 不要動 `99-參考資料/`、`docs/驗收報告-v2.md`。
