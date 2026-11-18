# P1-D：3D 心智圖拿掉 N1–N5 分級分層

改動檔案：`js/mind3d.js`、`js/mind-game.js`、`css/mind.css`、`data/mind/scripts.js`（詞庫、文法資料、kb.js 未動）。

## 已做
- **總覽**：取消 5 個等級層、等級節點、分級篩選、「只看我的程度」、「依等級著色」。新結構：
  - 下層「📚 詞彙」：中心 → 7 個人事時地物扇區 → 115 個「人事時地物 × 場景」詞群（各級合併，id `grp:物|food`）；展開時依等級由易到難排序，最多 300 詞。
  - 上層「📘 文法」：中心 → 32 個文法類別 → 727 條文法（依學習順序由內往外）。
  - 「路線」圖層改成全部文法依 ord 串一條，不分級。
- **焦點**：移除等級節點；文法的同類兄弟改取學習順序最接近的 10 條；詞群／人事時地物／場景焦點都用合併後的詞群。新增 hub 節點（詞彙／文法總覽）的資訊卡與麵包屑（⌂ › 📚 詞彙 › 物 › 飲食料理 詞群）。
- **時態網**：不再依等級篩文法。
- **路線**：改成「高度＝先修深度（0–10）、方位＝文法類別」，底部一圈類別標籤；已學用類別色、未學淡色、下一步金色；先修線預設隱藏，點節點或「下一步」才顯示。下一步改用 `gramPath(null, 1)`（不分級）。
- 等級只剩節點資訊卡、搜尋結果上的小標籤 `lv-b`。
- 舊 id 相容：`norm()` 把 `grp:N5|物|food`→`grp:物|food`、`wh:N5物`→`wh:物`、`lv:*`→`hub:w`（kb.js 傳來的 focus 參數、舊歷史都能用）。
- **任務**（66 個，原 202 個）：`classify`、`scenesort`、`hunt`、`conj-identify` 各 1 個；`star-{場景}` 22 個；`gram-{類別}` 26 個；`conj-{形}` 11 個；`tour`／`daily`／`path-next`。出題不分級，但會優先挑接近使用者程度（`App.profile().lv`）的詞，只影響難易度。任務板拿掉等級列；推薦會帶出「下一步」那條文法所屬類別的任務。
- **舊存檔遷移**（mind-game.js `LEGACY`）：`classify-N*`→`classify`、`scenesort-N*`→`scenesort`、`hunt-N*`→`hunt`、`star-N*-sc`→`star-sc`、`gram-N*-cat`→`gram-cat`、`conj-identify-n3`→`conj-identify`，取最高星數，舊 key 刪除；星數總計只算現有任務。
- 狀態依 A 組要求改成 `M.ST || Learn.mindST()`，`saveST` 改呼叫 `App.save()`，不再直接寫 `jpq.mind.v1`。
- 導覽（tour）與首次說明文字改寫；CSS 的 `.mm-l-lv` 改成 `.mm-l-hub`，刪掉沒用的 `.mm-me`、`.mm-ck.two`。

## 未做
- 沒有新增 3D 功能（停損）。
- 搜尋還不能用等級當條件（目前只顯示等級小標籤）。

## 交接
- A 組：mind3d 呼叫 `M.kb.gramPath(null, n)`（lvs 傳 null＝不分級），請保留這個用法。
- 總指揮：sw.js 版本號由負責 sw.js 的組一起升版（本組沒改 sw.js）。

## 驗收數據（無頭 Chrome，CDP，埠 8804／9804；舊版 HEAD 在 8805 對照）
| 檢視 | 375 新 | 375 舊 | 1280 新 | 1280 舊 |
|---|---|---|---|---|
| 總覽 標籤／重疊 | 14／0 | 8／0 | 61／0 | 38／0 |
| 焦點 | 12／0 | 10／0 | 29／0 | 13／0 |
| 時態 | 8／0 | 10／0 | 21／0 | 22／0 |
| 路線 | 32／0 | 9／0 | 59／0 | 30／0 |

- 4 種檢視的節點類型都沒有等級節點（總覽：hub 2、wh 7、grp 115、cat 32、gram 727；路線：cat 32、gram 727）；畫面文字沒有出現 N1–N5。
- 完整玩完的任務：classify、gram-助詞、star-food（375）；hunt、tour、daily（1280），都有出結算畫面。
- 舊存檔遷移實測：`{classify-N5:2, classify-N3:3, star-N4-food:3, gram-N5-助詞:1, hunt-N3:1, conj-identify-n3:2}` → `{classify:3, star-food:3, gram-助詞:1, hunt:1, conj-identify:2}`。
- console 0 錯誤；`node --check` 3 個 js 檔通過；test-romaji 27/27、test-jptext 27/27 通過。
- 截圖與驅動腳本：`D:\reviewtmp\p1-D\`（fin-*.png、play-*.png、d.mjs、play.mjs）。
