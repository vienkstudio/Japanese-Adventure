# D 組（閱讀歌曲）完成報告

## 已做
- **css/reader.css（新）**：reader.js 的 `rd-*` 和 songs.js 的 `sg-*` class 全部都有樣式，只用 tokens.css 變數，0 個寫死色碼。手機 375px 優先，觸控目標 ≥44px，讀音 ≥13px（`--fs-xs`）。手機的播放控制列固定在底部導覽列上方。句讀、右括號會黏在前一個詞後面，不會出現在行首。ruby 改用 `ruby-align:center`，漢字不會被讀音撐開。
- **js/songs.js（新）**：
  - `songs` 路由（nav:false, navParent:'home'）：歌曲清單、新增與編輯（`{mode:'new'}`／`{edit:id}`）、刪除。
  - `song` 路由（`{id}`）：跟唱頁。
  - 音源三選一：
    - YouTube：用 `youtube-nocookie` iframe 嵌入，靠 postMessage 取播放時間與控制，不載入外部 API 程式。離線、連不上或影片禁止嵌入時會顯示說明，歌詞、查詞、填空照常可用。
    - 本機音檔：`<input type=file>` 選檔後用 `<audio>` 播放，檔案以 ArrayBuffer 存進 IDB，上限 60MB，可離線播放。
    - 語音朗讀（TTS）：一句一句念。
  - 跟唱：
    - 逐句高亮、自動捲動。
    - 「⏱ 對時」模式：播放中按大按鈕標記每句開始時間，每句可 ±0.2 秒微調，自動存檔。
    - A／B 循環與單句循環。
    - 速度 0.5／0.75／1。
    - 🎤 錄音：MediaRecorder 錄目前這句（有對時就自動播原句並在句尾停止），錄完可和原句比對回放。錄音只存記憶體，最多 10 段，離開頁面就清掉。
  - 顯示切換：讀音、羅馬字、中文、自動捲動；設定存 localStorage `jpq.song.pref`。
  - 點詞：重用 `Reader.wordCard`（source `🎵 歌曲`）與 `App.trackBtn`。
  - ✍️ 填空：依程度挖空（zero／n5 每句 1 個、優先 N5–N4 詞；其他程度每句 2 個），輸入假名後對答案，錯的詞自動加入不會清單。可按「換一組」。
  - ✔ 練完：星數＝1＋有錄音＋填空答對 ≥70%，呼叫 `App.reward('song:'+id, stars, '歌曲跟唱')`。
  - 存放：`App.idb` 的 `songs:index`、`song:<id>`，不進 App.state。
  - 內建 1 首自編示範曲〈朝の歌〉（7 句，語音朗讀），沒有任何受版權保護的歌詞。
  - 離開頁面時會停止播放、輪詢、錄音，並釋放 objectURL。
- **js/reader.js**：
  - 新增 `Reader.todayDone()`：今日每日短文（依 profile 程度與 `App.today()`）已讀完回 true。
  - `tokensHTML` 加上標點黏附處理。

## 自測
- `node --check`：js/songs.js、js/reader.js、js/jp-text.js、data/reading/daily.js 全部通過。
- 用無頭 Chrome（CDP）開 `localhost:8774` 新 origin 測試，沒有寫入真實存檔。375／1280 寬 × 淺／深色都測過 read、read-article、songs、song：沒有橫向捲動，console 0 錯誤。
- 375px 淺色另外測了：
  - 點詞開查詞卡、加入不會清單。
  - 填空對答案，錯的詞加入清單。
  - 單句循環、TTS 播放、練完拿到 reward（+10 XP）。
  - 新增本機音檔歌曲（wav）、對時 3 句、跳句後高亮正確、0.5× 慢速、錄音（假麥克風）1 段、`songs:index` 正確寫入。
  - YouTube iframe 正常產生。

## 未做／限制
- YouTube 的播放時間、對時、高亮必須能連上 youtube 播放器，無頭測試環境沒有實際播放影片。
- 錄音沒有接 SpeechRecognition 假名比對評分。
- 規格 3.0 提到的「公有領域童謠 3 首」改成 1 首自編示範曲（不需查證版權）。
- 填空只有輸入題，沒有選項題。
- 歌詞的斷詞遇到擬聲詞（例如「にこにこ」）不準，所以示範曲改用片假名「チュン」。

## 交接
- **A**：首頁可以直接呼叫 `Reader.todayDone()`（需要已載入 READ_JS；沒載入時 home.js 已有防呆，會回 false）。song／songs／read-article 頁內都有自己的「←」，和頂列的返回鍵重複；如果 A 希望只保留頂列返回鍵，請告知，由 D 移除。
- **A**：sw.js 的 FILES 請確認包含 `js/songs.js`、`css/reader.css`。
