# v13 修正－A 組（打擊感，使用者要求 #3）

改動檔：js/activity.js、js/activities/{choice,listen,wordbank,flashcard}.js、css/activity.css、js/game.js

## 逐項
| 項目 | 狀態 | 證據（D:\reviewtmp\v13fix-A\log.txt、截圖） |
|---|---|---|
| 答對：ok 音、3 連起 combo 升調（每連升半音）、輕震 15ms、按鈕彈跳＋綠光、burst 12 粒、浮字 +1／🔥n | 已修 | log「OK 暑い → sfx:combo … floatText:🔥3、12spark」；c1-ok.png、c3-combo.png |
| 上方連擊計數（≥2 顯示、中斷淡出） | 已修 | 頂列進度條旁 `.ac-combo`「🔥 3 連擊」；答錯後 `(out)` 淡出再隱藏 |
| 答錯：ng 音、雙震 [60,40,60]、按鈕搖晃＋紅框、整卡 shake、正解高亮（ac-glow）、連擊歸零 | 已修 | log「NG 熱い → ng ac-wob / ok ac-glow / ac-card ac-shk」；c4-ng.png |
| 字卡「記得」小回饋（soft 音＋彈跳＋✓ 浮字，停 0.2 秒）；「忘了」只有輕點擊音、不扣連擊不搖晃 | 已修 | log「fc 記得 sfx:soft pop:true」「fc 忘了 sfx:tap shk:false」 |
| wordbank 排完自動檢查的完成特效（粒子 20） | 已修 | log「wb ac-wb-ans ok ac-pop spark:20」；w1-ok.png |
| listen 同 choice | 已修 | log「listen ng ac-wob / ok ac-glow」 |
| 日檢題型（choice kind/quiz）同一套 | 已修 | chalStart 也改 `ctx.sfx(ok, b)` |
| 結算：星星逐顆落下＋star 音、≥2 星 win＋confetti、最佳連擊、XP 從 0 往上跳、3 星金色光暈（.ac-gold） | 已修 | e2-final.png；log「sfx:star ×2 → win → confetti:70 → coin」、XP「+0→+13」 |
| 尊重 Game.sfxOn | 已修 | 音效／震動全走 Game.sfx／vibrate（內部已判斷 sfxOn） |
| prefers-reduced-motion | 已修 | Game.reduced()：burst／confetti／shake 不放；CSS 關掉彈跳、搖晃、星星動畫；字卡不延遲；XP 直接顯示。red-log.txt：0 spark、無 ac-shk |
| 答對 0.6 秒自動下一題節奏不變 | 已修 | ctx.advance 未動；答錯仍停下顯示「繼續 ▶」（wrong-stay true） |
| 今日課、路線單元、複習、店內活動 | 部分 | 路線單元（path→act）、複習（review→act）、首頁應用（act）都走 runner，全套套用；今日課作答也套用（走 Activity.session），但結算畫面由 home.js 自畫（end:false）→ 見交接；店內活動（shop）是 World.shopSim 自己的 UI，原本就呼叫 Game.sfx／burst |

其他：答對（非自評）會 `Game.bump('ok')`，活動框架答題也算進每日任務「答對 20 題」（以前只算舊 .choice）。summary 多一欄 `combo`（最佳連擊）。

## 自測
- node --check 全過；test-romaji 31/31、test-jptext 27/27、test-activity 76/0、test-quiz 0 問題。
- 375×812 無頭 Chrome（埠 8861／9861，已關）：console 0 錯誤、scrollWidth=375（一般與 reduced 各跑一次）。

## 交接（home.js 負責組）
今日課結算畫面要有同一套星星／煙火：在 `endView(el)` 畫完 innerHTML 後加
`const h = document.createElement('div'); const ts = el.querySelector('.td-sum'); if (ts && window.Activity && Activity.celebrate && R.sm) { ts.after(h); Activity.celebrate(h, R.sm, el.querySelector('.xpgain')); }`
（`Activity.celebrate(host, summary, xpEl)`：在 host 開頭插入星星＋最佳連擊、3 星 host 加 .ac-gold、播星星音／煙火、XP 跳數；host 不要用 .td-sum 本身，會破壞 4 欄格線）。
