# 評審 v7 修正 — R 組（羅馬字、手冊、冒險）

改動檔案：`js/phrase.js`、`js/phrasebook.js`、`js/review.js`、`js/world.js`；新增 `tools/test-romaji.mjs`。未動 `js/world-quest.js`、`css/world.css`、`data/world/*`。
實測：本機 `python -m http.server 8795` 搭配無頭 Chrome（CDP 9795），畫面 375×812，console 0 錯誤。截圖在 `D:\reviewtmp\v7fix-R\`，驅動腳本在 `D:\reviewtmp\v7fix-R\drv\`。

## P0-2 羅馬字：已修

全站只用一個 `Phrase.romaji(kana, jp)`。引數順序寫成 `(jp, kana)` 也可以：第一個引數有漢字或數字、第二個沒有時，會自動對調。

- **長音寫法**：統一用 ou／uu／aa，片假名「ー」寫成重複母音（kaado、pasupooto），全站不再出現 ā、ō。手冊必備句原本手寫的長音符號羅馬字不再使用，改成即時計算。
- **阿拉伯數字**：對齊前先把 `1,370` 這類數字轉成漢字數字（千三百七十），讀音就對得上。
- **金額分段**：例如 `sen nanahyaku hachijuu en`、`hyaku gojuu en`、`yonhyaku kyuujuu en`。
- **數字＋量詞自成一詞**：例如 otona hitori、nankai norimasu、ichimai kattekite、gozen juuji。
  - 一緒、均一、二条城這類詞不會被拆開。
  - 對齊時會檢查數字讀音的開頭和量詞讀音，避免切成 `chikai kkai`、`kabukichoui chiban` 這種錯誤。
- **整句對不齊時不再整句逐字轉**：先逐句、逐段重新對齊；還是對不齊的那一段，改用「假名＋助詞規則」，は／へ／を 照樣念 wa／e／o。
- **外來音**：補上チェ→che、ジェ→je、ツァ→tsa、トゥ→tu、ウィ→wi（ティ→ti、ディ→di 原本就對）。
- **其他分詞修正**：
  - 片假名前的「ご」不當成接頭詞：tamago sando。
  - 漢字後接「お〜」另成一詞：shake onigiri。
  - 弁当、定食另成一詞，「幕の内」不拆：makunouchi bentou。
  - 〜ばいい 斷成 ikeba ii；おまたせ 斷成 omatase shimashita；ごゆっくり 斷成 goyukkuri douzo。
  - 「〜」當作名詞處理：`~ e wa dou ikeba ii desu ka`。
- **改用 Phrase.romaji 的地方**：
  - `phrasebook.js` 的 romOf（舊的 particles＋kanaToRomaji 已刪除）。
  - `review.js` 的 romajiOf：五十音卡維持卡上原本的讀音。
  - `world.js`：原本就用 Phrase.romaji，這次在零基礎時另外補上貨架商品與數量（一本 → ippon）的羅馬字（12-qty）。
- **複習打字比對**：整句（含逗號）可以直接比對；助詞照字面打 ha／he／wo 也算對。
- **回歸測試**：`node tools/test-romaji.mjs` 27/27 通過（`-v` 會列出全部結果）。評審錯例修正前後：

| 評審錯例 | 現在 |
|---|---|
| okaikei wa hyakugojuuen desu | okaikei wa hyaku gojuu en desu |
| okaikei wa nisengo hyakuhachijuuen | okaikei wa nisen gohyaku hachijuu en desu |
| （1,780円） | okaikei wa sen nanahyaku hachijuu en desu |
| tama gosando | tamago sando |
| maku no uchibentou | makunouchi bentou |
| shakeonigiri | shake onigiri |
| dochiramadedesuka（複習卡） | dochira made desu ka |
| yonhyakukyuujuuen（複習卡） | yonhyaku kyuujuu en |
| otonahitori | otona hitori desu |
| nankainorimasu | nankai norimasu ka |
| asakusa made ha sensan byakunanajuuen | asakusa made wa sen sanbyaku nanajuu en desu |
| chiekkuin／chiekkuauto | chekkuin wa nanji kara desu ka／chekkuauto wa juuji desu |
| kiyomizuderaniikitai desu（手冊搜尋） | kiyomizudera ni ikitai desu |
| basu haaishiikaado（手冊搜尋） | basu wa aishii kaado de noremasu ka |
| omataseshimashita. goyukkuridouzo | omatase shimashita. goyukkuri douzo |
| mō／kyūkyū／kādo（長音不一致） | mou／kyuukyuusha／kaado |

- **全資料比對**：把 data/world 裡全部 5,422 組 jp／kana 句子用新舊引擎各跑一次，有 592 句結果不同，已逐批人工抽看。主要差異是數字分段、量詞斷詞、chie→che、ha→wa，沒有看到變差的。
- **仍不完美的邊角例子**：
  - `17:30` 這種時刻寫法。
  - 促音結尾的數字，例如 百二十センチ（hyakuniju senchi）。
  - 「七〇五」念成 nanamaru go。

實測：
- 手冊搜尋「清水寺」顯示 `kiyomizudera ni ikitai desu`，搜尋「巴士」顯示 `basu wa aishii kaado de haratte mo ii desu ka`（06-search-bus）。
- 必備句全部是 ou／aa 寫法。
- 複習頁顯示 `dochira made desu ka`、`yonhyaku kyuujuu en`（20-review）。
- 冒險的 `World.romaOf` 對含阿拉伯數字的句子也正確。

## P1-7（手冊部分）：已修

- **緊急分類置頂**：選「🆘 緊急」時，最上方依序是：
  - 「🆘 緊急電話」號碼卡：110 警察、119 救護車・消防，兩張都是紅色大卡（131px 高），點了就用 `tel:` 撥號。
  - Japan Visitor Hotline 050-3816-2787（也可點撥），以及撥通後該說什麼的提示。
  - 「🆘 求救」10 句：警察を呼んでください、救急車を呼んでください、助けてください、病院に連れて行ってください、〜が痛いです、〜をなくしました、〜を盗まれました、交番はどこですか、道に迷いました、中国語を話せる人はいますか。
  - 接著是場景句；「⭐ 必備句」移到最後（01-emer-top、02）。
- **搜尋**：搜「110」「119」「警察」「救護車」會找到這些求救句（新增同義詞組）。
- **「〜」句放大後可填字**：按 📢 放大後，上方有輸入框。
  - 輸入地名、品名或部位，大字、假名與語音會跟著更新；填入的是假名時，羅馬字也會更新。
  - 這種句子要按 ✕ 才關閉，點畫面不會誤關；另有「🔊 唸給對方聽」按鈕（03-fill-saifu）。
- **首頁快查入口**：`App.go('phrasebook',{cat:'emer'})` 可以直接進緊急分類，選中的分類會自動捲進畫面（評審：「選中的分類捲在畫面外」）。
- **大字級**：設 data-fs=xl 時，375px 寬 scrollWidth=375，沒有橫向捲動，按鈕會換到下一行（04、05-emer-xl）。

## 冒險羅馬字相關：已檢查

- `world.js` 的 tx、詞塊、⚡快說句原本就用 Phrase.romaji，跟著引擎一起修好。
- 零基礎時，貨架商品與數量選擇也補上羅馬字（12-qty）。
- `world-quest.js` 沒有自己的羅馬字邏輯，不需要改。

## 交接

- **其他組／協調者**：
  - `js/kb.js`（知識庫）還在用 `ReviewAPI.kanaToRomaji`，會整串黏在一起；`js/jp-text.js`、`reader.js`、`songs.js` 用的是 `JPText.romaji`。若要全站統一，改呼叫 `Phrase.romaji(kana, jp)` 即可（phrase.js 在 index.html 有載入）。
  - 「🎧 特訓・數字」（route `boot`，不在本組檔案）的答案沒有羅馬字，可用 `Phrase.romaji(kana)`。
  - `sw.js` 的快取版本要調高，使用者才會拿到新的 js。
- **H 組**：首頁「📖 旅遊快查」呼叫 `App.go('phrasebook',{cat:'emer'})` 已確認會直接顯示號碼卡與求救句，不是必備句。大字級版面已在 375px、data-fs=xl 下實測，沒有破版。
