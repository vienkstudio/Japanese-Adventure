# A 組（基礎介面）完成報告

## 已做
- **css/tokens.css（新）**：6 套主題 coral／sakura／matcha／ocean／lavender／mono × 淺深色（`data-theme` 未設＝跟隨系統）；字級 `--fs-xs..2xl`（隨 `data-fs` 標準／大／特大）、間距 `--sp-1..6`、圓角；新增 `--ok --warn --err --on-pri --on-acc --on-gold --ok-t/--err-t/--warn-t --shade --scrim --toast-*`、場景色 `--sc-*`、看板 `--sg-*`、彩帶 `--fx1..6`。實測 12 組合：主按鈕字對底 ≥4.7、內文 ≥14.8、次要字 ≥6.6。
- **寫死色碼清零**：app.css、travel.css 0 個；A 的 js（core/game/travel/review/phrasebook/drill/town/practice/quest）內 HTML 0 個（看板／場景插畫改用 token）。答對改 `--ok`、答錯改 `--err`（不再用主色當錯誤色）。LOGO SVG 也吃主題色。
- **App.state.ui＋App.setTheme(theme,palette,fs)**、`App.applyTheme()`、`themechange` 事件、同步 `<meta theme-color>`；`index.html <head>` inline script 讀 `jpQuest.ui` 先設屬性避免閃爍。
- **單一程度**：`App.profile()`／`App.setProfile()`（`profilechange` 事件）、`App.LV_IDS/LV_NAMES/LV_DESC`；migrate：冒險世界有進度用 `world.lv`，否則 `trip.level`（K0→zero），都沒有＝新玩家要定位。`world.lv`、`trip.level` 由 core 從 profile 單向同步（B 改讀 profile 前舊碼仍正確）。
- 改讀 profile：travel.js（難度＝profile、移除「新開始／切換難度」與店家等級鎖）、practice.js（預設分頁、提示）、drill.js（提示預設）、town.js（提示預設、移除等級鎖）、quest.js（移除 XP 等級鎖）。
- **首次開啟**：6 個白話程度直接選，或「3 題幫你判斷」（假名→簡單句→N4 條件句）。
- **js/home.js（新）**：首頁＝問候＋程度＋連勝、主按鈕「繼續冒險」（zero 時改「從五十音開始」→ `trip {kana:1}`）、今日 3 件事（複習到期、今日短文、冒險一關）、手冊／特訓／歌曲／五十音、可展開日本地圖；可點元素 9 個。`World.next()`／`World.japan()`／`Reader.todayDone()` 皆防呆。
- **設定改成頁面路由 `settings`**（不再是被底部導覽蓋住的彈窗）：外觀（色票預覽圓點、跟隨系統／淺／深、字級）、程度（白話）＋提示（全部／只給讀音／不要）、重新定位、音效、頭像御朱印、備份、危險區（紅框、需點兩次）。`Travel.openSettings()` 轉到此頁。
- **導覽**：底部 home1、read3、kb4、review5（play2 待 B）；線條 SVG 圖示跟主題變色；手冊、特訓、歌曲 `nav:false`；未指定 navParent 的子頁點亮首頁；頂列合併為「🔥連勝＋Lv」一鈕＋⚙️；首頁不再重複 LOGO。
- **index.html**：登記 tokens/kb/reader css；lazy：`kb`、`kb-page`、`mind`（C 交接，轉址）、`mind3d`（kb.js 在 mind3d.js 之前）、`read`、`read-article`、`songs`、`song`。
- **sw.js**：v24，加入所有新檔；安裝改成個別檔案失敗不影響整體（新檔未上線也能裝）。
- **CONTRACT.md**：載入順序、profile／setTheme API、存檔欄位、路由表、CSS 與主題、知識庫章節（依 C 報告）。
- 04 其他：不會清單主按鈕「開始複習」置頂、題型範圍收進展開區；手冊語音警告移到清單下；特訓設定列不再擠換行、移除 inline style；`.lv-b`、徽章等字級／對比調整；首頁觸控目標全部 ≥44px。
- 自測：無頭 Chrome 375×812，onboarding→定位→首頁、設定、trip（五十音／地圖）、practice-map、boot、phrasebook、review、play、kb、mind 轉址；12 組主題；console 無錯誤（只有 D 未上線的 `css/reader.css`、`data/reading/daily.js`、`js/reader.js` 404）。

## 未做與原因
- 04 建議的元件合併（Button/Chip/Tabs 各一套、移除 wd-/tt-/dr-/pb- 重複類）與全站 font-size ≤8 種：牽動 B/C/D 檔案，本輪只在 A 的新畫面用 token。
- 舊模組 practice/town/quest 的大量 inline style 與 em 字級未全面清掉（非主要入口）。
- 定位只做 3 題（03 建議 10 題＋升級考），升級考需內容分級，非本組範圍。
- travel.css 的 `tt-*` 舊首頁樣式與 `World.home` 已不使用，未刪（留待確認無引用後清理）。

## 交接
- **B**：`js/world.js` 的 `play` 請改 `nav:true, navOrder:2`（icon 🗾，SVG 圖示 core 已備）；改讀 `App.profile().lv/assist`（`world.lv` 之後只是 core 同步的鏡像，B 的 `pickLevel` 請改用 `App.setProfile` 或導向 `App.go('settings')`）；地區鎖請移除（程度不當鎖）；`World.home` 可刪；請提供 `World.next()`；world.css 寫死色碼請改 token（`--sc-*`、`--ok/--err`）。
- **C**：已依報告登記；`mind` 轉址已放入 lazy。
- **D**：請建立 `css/reader.css`、`data/reading/daily.js`、`js/reader.js`、`js/jp-text.js`、`js/songs.js`（目前 404）；可選提供 `Reader.todayDone()` 讓首頁「今日短文」打勾；路由 `read`/`read-article`/`songs`/`song` 已 lazy 登記（同一組 scripts）。
- **全體**：主色底上的字用 `--on-pri`（深色模式是深字），答對答錯用 `--ok/--err`；JS 取色監聽 `themechange`、程度監聽 `profilechange`。
