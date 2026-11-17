# H 組（核心與首頁）修正報告（2026-11-17）

改動檔案：`js/core.js`、`js/home.js`、`js/game.js`、`js/phrasebook.js`、`js/travel.js`（1 行）、`js/reader.js`（返回鍵、lastDay）、`js/songs.js`（返回鍵、navParent）、`index.html`、`css/app.css`、`css/reader.css`、`CONTRACT.md`。未 commit。
自測：375×812 無頭 Chrome（CDP），截圖與腳本在 `D:\reviewtmp\fixH\`（`t1.json`～`t3.json`、`out*.json`），console 0 錯誤，伺服器 8792 已關。

## 1. 首頁「今日 3 件事」— 已修
- 零基礎且平假名未學完：第 3 件改「五十音一組」，完成小考（≥1 星）時 travel.js 寫 `App.state.kanaDay=App.today()`。
- 複習：不會清單空時改「練習任一題」，`Game.daily()` 的 ok／review／quests／clear 任一 >0 就打勾；清單有字時維持「到期數＝0 打勾」。
- 今日短文：reader.js 讀完每日短文寫 `App.state.read.lastDay`；home.js 直接讀存檔（READING 已載入時另比對今天篇目）。實測重新整理後仍 3／3（07-home-reload.png）。
- 冒險：文案改「在任一間店完成 1 件事」，判斷 `Game.daily().quests>0`。
- game.js：其他模組過關（閱讀、五十音、特訓的 `App.reward`／結果彈窗）改計入新的 `clear`，不再誤勾冒險；每日任務「完成 1 個關卡或任務」用 `Game.prog('quests')`＝quests＋clear。
- 主按鈕與第 3 件副標用 `nx.sub || nx.label`；label 是「繼續冒險…」且沒有 sub 時改顯示「從上次的位置繼續」。
- 實測：選零基礎 → 0／3 → 五十音一組 → 2／3 → 讀短文 → 3／3 → 重新整理仍 3／3。

## 3. 返回鍵 — 已修（world 由冒險組處理）
- 移除 songs.js（列表、編輯、歌曲頁）和 reader.js（貼上、網址、文章頁）頁內的 ←。實測 songs／song／read-article 只剩 `#backBtn`。
- songs／song 的 navParent 改成 `read`（index.html 和 songs.js 都改），底部點亮「閱讀」。
- 首次程度選擇：body 加 `.ob-mode`，隱藏 `#nav`、`#playerChip`、`#backBtn`，logo 不能點；換頁時 core.render 自動移除。「不確定？3 題」完整露出（bottom 758／812）。
- 首頁 `#backBtn` 改成 `hidden`（不佔位），logo 左緣 12px，和內容對齊。

## 9. 手冊 — 已修
- 搜尋索引加入冒險世界：asks 的回答（a）、acts＋「ください」、may＋「もいいですか」、info 的 q、items＋「をください／はありますか」（dest 類改「〜へ行きたいです」），都標示「📍 地區・店名」。有搜尋字時才用 `World.loadRegion` 載入全部地區（約 1.5MB，只載一次），載入中顯示提示，載完自動重畫。
- 新增 39 句 ⭐ 必備句（jp、kana、romaji、zh、use），含題目列的 11 句和免稅護照、買單、推薦、入住、寄行李、請寫下來等，並新增「⭐ 必備」分類（預設分類）。
- 同義詞 24 組：儲值＝加值＝チャージ、退稅＝免稅、外帶＝打包＝持ち帰り、刷卡＝信用卡＝カード、發票＝收據＝領収書、多少錢＝いくら、素食、不要辣、怎麼去、中文、一位、廁所等。
- 實測筆數：退稅 13、儲值 10、多少錢 28、ikura 28、刷卡 43、打包 20、發票 6、素食 4、不要辣 19、怎麼去 3、中文菜單 25、一位 12。
- 零基礎或 `assist==='full'` 時每句顯示羅馬字：資料有 romaji 就用；沒有就用 `ReviewAPI.kanaToRomaji`，再用簡易斷詞處理助詞（を→o、常見的は→wa、片假名與平假名交界加空格）。📢 全螢幕也顯示。n3 實測不顯示。
- kana 欄保留片假名：依 jp 的片假名段落，把資料中被寫成平假名的部分還原（例：かーど→カード）。
- 支援 `App.go('phrasebook',{q})`、`{cat}`（cat 也接受場景 id，例如 `konbini` 對應「購物」）。

## 14. 觸控與字級 — 已修（我負責的檔案）
- 底部導覽標籤、頂列 🔥／Lv、`.lv-b`、`.badge`、`.track-btn`、`.chip`、`.pill`、文章「出現 N 次」最小 13px。實測導覽、Lv、🔥 都是 13px。
- `.tabs button` 的 min-height 44；歌曲 0.5×／0.75×／1× 高 44（實測 44）；設定分段鈕 44。
- 開關按鈕：`.rd-tg`（讀音、羅馬字、中文、自動捲動）開＝實心主色＋「✓」，關＝白底虛線框；`.st-seg` 開＝實心主色＋✓；歌曲速度選中改實心主色；`.sg-b.on` 改實心副色。
- 頂列 logo 觸控 44×44；首頁不留返回鍵空位。

## 架構低成本修 — 已修
- migrate：`xp` 非有限數字→0（負數→0）；`cleared` 是陣列→`{}`。實測 `xp:'abc'`→0（number）。
- 舊玩家有 xp：無 profile 時 `placed = 有舊程度 || xp>0`；已有 profile 但 `placed:false` 且 xp>0 也補成 true。實測 `{xp:500}` 直接進首頁。
- 刪除 core.js 綁定 `.sv`、`#sfxBtn` 的死碼。

## 未修／部分
- 部分：羅馬字斷詞是規則式的，沒有字典斷詞的資料（例如 `konoshimu kaado dedenwa`）仍會黏在一起；は 的助詞判斷只涵蓋常見句尾。
- 未做：world.js 頁內 ← 和店內 📖 快查按鈕（冒險組的檔案）。
- 未看：6 套主題逐一檢查（只看了珊瑚主題的淺色和深色）。

## 交接給冒險組
- 店內完成目標時請呼叫 `Game.bump('quests')`。`App.reward` 的自動計數現在記在 `clear`，不會算進首頁「在任一間店完成 1 件事」。
- 📖 快查：`App.go('phrasebook', {cat: shop.scene})`（場景 id 會自動對應分類）或 `{q:'關鍵字'}`。
- `World.next()` 可回傳 `sub`（例如「下一站：上野・定食屋」），首頁會優先顯示。
