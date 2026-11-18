# P1-C 商務內容（工作・商務目的）

## 已做
- `data/biz/units-1..4.js`：`window.BIZ.units` 8 個單元，由淺到深：
  intro 自我介紹與名片交換(N4)、phone 打電話(N4)、email 商務 Email(N3)、meeting 開會(N3)、visit 拜訪與接待(N3)、request 請求與委婉拒絕(N2)、hourensou 報連相(N2)、apology 道歉與客訴(N1)。
  每單元：vocab 16–17、phrases 13–14（使用時機＋禮貌層級 普通/丁寧/尊敬謙讓）、grammar 3–4（共 26 條，19 條有 `gid:'gram:<pat>'` 對上 data/mind/grammar.js）、dialogue 8 輪（每輪 3 選項＋回饋，格式同 data/world）、email 範本 1 封（4 格填空＋逐行中文）、quiz 8 題（選擇／重組／敬語轉換）。
- `BIZ.items`（getter，273 筆）：攤平 vocab/phrases/grammar，`{id:'v:|p:|g:', type:'vocab'|'phrase'|'grammar', jp, kana, zh, lv, unit}`，給 `Learn.queue('work')`。
- `data/reading/biz.js`：`window.BIZ_READING` 6 篇商務短文（n4、n3×2、n2×2、n1），格式比照 daily.js（`tag:'biz'`、`q`）＋`qs` 追加題（每篇 3 題，N3 以上題目日文）＋`w` 生詞。不併入 READING.daily（避免進每日短文輪替）。
- `js/biz.js`：路由 `biz`（單元列表、完成度、適合你標記、商務閱讀列表）、`biz-unit`（介紹 → 單字/句子/句型卡片（記住了/還不熟）→ 對話 8 輪 → Email 填空 → 小測驗 → `App.reward('biz:'+id)`＋`App.showResult`）、`biz-read`（讀文章 → 一題一屏 → `App.reward('biz:r:'+id)`）。一題一屏、答錯可重選（只計第一次）。
  - 紀錄：`Learn.record(id, 0–3, {src:'biz', unit, item})`（卡片 記住了=2／還不熟=1；作答 對=3／錯=0）；無 Learn 時答錯 `Tracker.add`。
  - 讀音／羅馬字／中文依 `App.profile().assist`（full 全顯示；some 只讀音；none 收進「💡 提示」）；羅馬字用 `Phrase.romaji` 執行時產生。對話選項的中文在選過後才顯示。
  - 句型卡片有 gid 時可跳 `kb-page`。
  - `BIZ.next()` → `{label, sub, route:'biz-unit', params:{id}, icon}`；全部完成時回低星單元或 `biz`。只載 js/biz.js 也能用（內建單元目錄）。另有 `BIZ.load()`、`BIZ.stars(id)`、`BIZ.progress()`。
  - 進路由時若資料未載入會自行 `App.loadScript` data/biz/*.js、data/reading/biz.js，並自動插入 css/biz.css。
- `css/biz.css`：前綴 `bz-`，只用 tokens 變數，觸控 ≥44px、字 ≥13px。

## 未做
- 沒有音檔，發音用 App.speak（TTS）。
- 6 篇閱讀未併入 reader.js 的閱讀列表（由 biz 路由自己呈現）。

## 交接（主對話）
- index.html：`App.lazy([['biz',{title:'商務日語',icon:'💼'}],['biz-unit',{…}],['biz-read',{…}]], ['data/biz/units-1.js','data/biz/units-2.js','data/biz/units-3.js','data/biz/units-4.js','data/reading/biz.js','js/biz.js'])`；`<link rel="stylesheet" href="css/biz.css">`（不加也會自動插入）。
- sw.js：新增檔案加進快取清單、VERSION+1。
- 首頁今日課（work 目的）：需要 `BIZ.next()` 時先 `App.loadScript('js/biz.js')`；需要 `BIZ.items` 時要載 data/biz/units-*.js（或 `BIZ.load()`）。
- CONTRACT.md：存檔 `cleared['biz:<單元>']`、`cleared['biz:r:<文章>']`；路由 `biz`/`biz-unit`/`biz-read`（navParent:'home'）。
- D 組（可選）：若要在閱讀頁列出商務短文，讀 `window.BIZ_READING`（tag:'biz'）。

## 驗收數據
- `node --check` js/biz.js、data/biz/*.js、data/reading/biz.js 通過；資料檢查腳本 0 錯誤（筆數、gid 存在、每輪有正解、填空數＝［n］數、quiz ref 全在 BIZ.items、羅馬字可產生）。
- `node tools/test-romaji.mjs` 27/27、`node tools/test-jptext.mjs` 27/27。
- 無頭 Chrome 375×812（埠 8803／9803）：intro(full)、apology(none)、email(some＋dark) 各走完 58 步到結算，biz-read 走完 3 題；console 0 錯誤、無橫向捲動；`BIZ.next()` 依完成度前進。截圖與腳本：D:\reviewtmp\p1-C\。
