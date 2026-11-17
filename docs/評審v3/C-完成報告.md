# C 組「知識庫」完成報告

## 已做
- **js/kb.js（新）**：路由 `kb`（nav:true, navOrder:4, 📚）、`kb-page`（nav:false, navParent:'kb'）；舊 `mind` 註冊為 transient 轉址（帶 `focus`/`script` → `mind3d`，其餘 → `kb`）。
  - 版面：桌機 ≥960px 左側樹（260px）＋主區＋右側 peek（420px，可「⤢ 開成整頁」）；手機為 ☰ 抽屜＋sticky 麵包屑，點項目直接全頁，返回保留捲動位置。
  - 樹：🏠 學習首頁／N5–N1（各含 📘單字、📗文法，已學數）／🔁 動詞變化／⭐ 收藏／🕘 最近開啟／🌐 3D 實驗。預設只展開 `App.profile().lv`（zero 或缺→N5），展開狀態記憶。
  - 首頁：「▶ 下一步該學什麼」置頂（最小 ord 未學文法＋6 個核心旅遊優先未學單字）、5 張等級進度卡（只展開自己那級，≥80% 提示可挑戰下一級）、快速開啟。
  - 資料庫頁：清單／表格／看板／畫廊四視圖；chip 篩選（等級、狀態、詞類、場景／文法類別）＋快速 chip（只看未學、核心常用、旅遊必備、收藏）；排序（學習順序／五十音／最近開啟／狀態，表格欄頭可點）；分組（場景／詞類／狀態／等級／無；文法為類別）；搜尋（日文、讀音、中文、羅馬字）。
  - 效能：清單每組 20 列＋「顯示更多」、表格每頁 50 列、看板每欄 30、畫廊 24；詞彙 `lex-n*.js` 依需要才 `App.loadScript`。全 8,034 字篩選在 375px 正常。
  - 項目頁：大字＋🔊＋⭐、屬性列、三態狀態（未學／學習中／已掌握）、讀音（≥13px）、羅馬字（`ReviewAPI.kanaToRomaji`）、中文、例句（單字從文法例句中找）、toggle（動詞／形容詞變化表、相近對比、用到的變化）、關聯 chip（先學、學完可接、同漢字、同場景）、`App.trackBtn`、「在 3D 中看」。
  - 狀態沿用 `jpq.mind.v1`（`learned`＝已掌握，新增 `ing`、`fav`、`recent`），與 3D 共用同一物件 `MIND.ST`；視圖設定存 `jpq.kb.v1`。對外 `MIND.kb`。監聽 `profilechange` 重畫。
- **css/kb.css（新）**：前綴 `kb-`，只用 tokens 變數；觸控 ≥44px（已自動檢查）；手機看板改橫向滑動欄。
- **js/mind3d.js**：路由改 `mind3d`（nav:false, navParent:'kb'）；預設只顯示目前等級，鏡頭框住勾選的層；層距 240→380、視角放平；標籤改用矩形碰撞＋全形／半形字寬估算（各類字級）＋已顯示標籤優先（減少閃爍），手機上限 32；隱藏等級的連線不再殘留；節點顏色改讀 `--n5…--n1/--ok/--err/--gold`；詳情面板加「📖 開成頁面」；工具列加 📚 回知識庫（手機隱藏）；無 WebGL 時改為導向知識庫。
- **css/mind.css**：`route-mind3d`；寫死色碼改變數；手機顯示圖例（在底部按鈕上方）；搜尋展開時隱藏 sub／hint，避免重疊。
- **資料（tools/build-mind.mjs 腳本處理，已重新產生 data/mind/*）**：
  - 「思考抽象 abs」雜物堆：新增場景 `desc` 顏色形容 🎨、`act` 基本動作 ✋、`func` 指示功能詞 🧩，依詞性／中文重新分類；abs 改名「其他」並排在最後。各級 abs 比例從 18–22% 降到 2.5–3.9%（顏色詞全部進 desc）。
  - 文法「其他」52 條重新分類（新增 助詞、基本句型、指示詞、可能能力、主題提示、複合動詞、附帶同時、手段根據、代替交換、建議勸誘、語氣態度），N5 單一助詞獨立成「助詞」類；剩 0 條「其他」。
  - 詞彙加第 8 欄 `core`：在本站內容（冒險世界、場景、特訓、旅程、字卡、手冊）或文法例句出現過＝1。N3 2,140 字中 730 字為核心，UI 顯示「核心」標記與篩選。
  - `lex-n3` 新興：中文改「新興；新近興起」、wh 改「事」（以 `LEX_FIX` 修正，不改 annot 原檔）。
  - `M.TRAVEL`（旅遊必備場景清單）加入 taxonomy。
- 自測：無頭 Chrome 375×812、1280×860，淺色／深色、matcha/lavender/mono 主題；kb、四種視圖、篩選、peek、kb-page、返回捲動、mind 轉址、mind3d（總覽／路線）可見標籤重疊數 0；console 無錯誤（只有 A 的 `css/reader.css` 404，非 C 檔）。

## 未做
- N5 旅遊場景補到每場景 ≥25 詞（需新增內容，未補）。
- 「出現在哪些冒險世界店家」反向連結、首頁「今日任務」卡片版（任務仍在 3D 任務板）。
- 表格用分頁而非真正的虛擬捲動；看板只有桌機可拖曳（手機用卡片上的按鈕改狀態）。
- zh 與 jp 字面相同的詞（多數本來就同形，如 雨、銀行；約 1,400 筆，其中 N2 的「～園」等接尾詞沒有中文說明）未逐筆檢查。
- 03 報告中「新興一般列 N1」的等級問題未改（沿用來源清單）。

## 交接
- **A（index.html）**：目前登記已可用（kb/kb-page：taxonomy、conj、grammar、scripts → js/kb.js；mind3d：同資料 → js/kb.js → vendor/3d-force-graph.min.js → js/mind3d.js → js/mind-game.js）。順序必須是 **kb.js 在 mind3d.js 之前**。`lex-n5…n1.js` 由 kb.js／mind3d.js 自行載入，不必登記。
  - 請把舊路由 `mind` 也放進 kb 的 lazy 清單：`['mind', { title: '知識庫', nav: false, navParent: 'kb' }]`，舊連結才能在 kb.js 載入前就轉址（kb.js 載入後會改成 transient）。
  - `CONTRACT.md` 的「3D 心智圖」章節請改成：主介面 `kb`（js/kb.js、css/kb.css，前綴 `kb-`）、3D 改 `mind3d`；`App.go('kb-page',{id})`，id 可為 `w:N5:12`／`gram:〜ます`／`cj:te`；`jpq.mind.v1` 新增 `ing/fav/recent`；lex 新增第 8 欄 core。
- **B**：`build-mind.mjs` 的 core 標記會讀 `data/world/*`；B 改完世界資料後，執行 `node tools/build-mind.mjs` 更新即可。
- 測試暫存檔在 `D:\kbtest`（測試腳本與截圖，不屬於專案），可整個刪除。
