# 評審 v7 修正報告 — H 組（首頁、挑戰、知識庫、設定）

測試：本機 `python -m http.server 8796`，加上無頭 Chrome（CDP 9796），畫面 375×812，略過 Service Worker。每項實測後 console 都是 0 錯誤。截圖在 `D:\reviewtmp\v7fix-H\`。`node --check` 檢查 js/home.js、js/challenge.js 都通過。

| 編號 | 狀態 | 改了什麼 | 證據 |
|---|---|---|---|
| P0-1 挑戰過關推下一級 | 已修 | `js/challenge.js` finish：`LVS[indexOf+1]`。N1 沒有下一級，結果視窗的按鈕改成「🔄 再玩一次／換題型」 | 測 N5 單字全對時，按鈕是「再玩一次／挑戰選單／挑戰 N4 ➜」。測 N1 時是「再玩一次／換題型」（12-chal-N1-pass） |
| P1-5 今日 3 件事固定 | 已修 | `home.js` 的 `todayTasks()`：當天第一次決定的任務 id 存在 `Game.daily().tasks`（加上 `tasksLv`，改程度時才重算）。複習任務在到期數歸零時打勾，顯示「複習完成」。五十音任務在 `lastDone.kana` 或 `kanaDay`（課程小考）任一是今天時就算完成。字卡任務固定後不會被換掉，自評原本就會計數（practice.js 不用改），進度會保留 | 先有字卡任務，再加 1 個到期字，任務仍是 cards/read/chal。當天新決定時，有到期字會排 rev，複習清空後 ✓、顯示 1／3（06、07）。在零基礎程度設 kanaDay 為今天後，五十音小練習 ✓ |
| P1-6 首次「繼續冒險」 | 已修 | 主按鈕標題用 `World.next().label`，副標用 `sub`。World 不存在時的備援改成「開始冒險」 | 新存檔首頁顯示「開始冒險／🐼 上野・🏪 便利商店」（03-home-xl） |
| P1-7 首頁入口（首頁部分） | 已修 | n3、n2、n1 隱藏「五十音」捷徑。`goals` 含 travel 時，主按鈕下方加「📖 旅遊快查」（`App.go('phrasebook',{cat:'emer'})`），並取代底下的「手冊」捷徑，避免重複。`.hm-more` 改成自動欄數 | n3 程度的捷徑只剩字卡、挑戰、歌曲（08-home-n3） |
| P1-8 字級 | 已修 | `tokens.css`：大＝125%、特大＝150%。首次選完程度（含定位測驗結果）後，多一題「字要大一點嗎？標準／大／特大」（每個選項以該字級預覽），存到 `App.state.ui.fs`。大字級時手冊句卡的按鈕排到下一行（app.css） | 02-fontask。特大時首頁與手冊 scrollWidth 都是 375、不破版（03、04、05-phrasebook-xl） |
| P1-10 挑戰回寫知識庫、首頁直接開始 | 已修 | `challenge.js`：每題 `setMastery` 同時寫入 `jpq.mind.v1`／`MIND.ST`，答對設為 learned，答錯設為 ing。開挑戰選單或開始作答時，會把舊存檔中已掌握的項目補進知識庫（`kbSync`）。新增隱藏題型 `mix`（綜合 10 題：漢字 2、語意 2、文法形式 2、重組 1、句意 2、短文 1）。首頁任務改成直接 `challenge-play {lv, t:'mix'}`。做完一輪不論是否得星，都寫入 `lastDone.chal` 讓任務打勾 | 首頁點「N3 挑戰一輪」直接出題（09）。答對 4 題後，chal.m.N3 共 4 項，知識庫 N3 顯示 4/2307，與挑戰的已掌握一致（10、11） |

## 交接
- **R 組（phrasebook.js）**：首頁「旅遊快查」會呼叫 `App.go('phrasebook',{cat:'emer'})`。目前 tab 會亮，但列表仍顯示「必備句」，需要 R 組實作 emer 分類。另外，phrasebook.js 內嵌的 `.pb-row` 在大字級時三欄太擠；我在 app.css 用 `:root[data-fs=l|xl] .pb-row` 覆寫成換行，R 組若重寫可以併回自己的檔案。
- **注意（core.js 未改）**：`normProfile` 把 `goals` 預設成 `['travel']`，全站也沒有設定 goals 的介面，所以目前每個人都會看到「旅遊快查」。若要只給旅客，需要在首次開啟或設定頁加一題目標（之後再做）。
- kb.js 不需要改，它共用 `MIND.ST`。
