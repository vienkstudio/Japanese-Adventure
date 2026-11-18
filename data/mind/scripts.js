// 3D 心智圖：任務腳本（資料驅動，由 js/mind-game.js 的引擎執行）
// ───────────────────────────────────────────────────────────────
// 任務不分等級：依「人事時地物」「場景」或「文法類別」分；出題時引擎自動優先挑接近使用者程度的詞（不是結構）。
// 新增任務：在 MIND.SCRIPTS 加一筆，或在 MIND.TEMPLATES 加一個樣板（each 的每種組合各展開成一個任務）。
// 任務：{ id, cat 分類, icon, title, desc, steps: [步驟…] 或 (vars, MIND) => [步驟…] }
// 字串可用 {變數}／{變數.欄位} 代入（單字：jp0 kana zh wh sc0 scName；文法：pat zh id；詞群：id name）。
// 步驟 op：
//   say    {text, speak?}                    旁白，按「繼續」前進
//   mode   {mode:'map'|'tense'|'path'} 或 {focus:'節點id'}   切換 3D 檢視
//   filter {wh?, sc?}                        設定篩選（任務結束自動還原）
//   cam    {to:'節點id', dist?}              鏡頭飛到節點
//   mark   {ids:[…]}                         高亮節點（空陣列＝清除）
//   expand {grp:'grp:物|food'}               總覽中展開詞群（人事時地物|場景）
//   pick   {as, sel:{type:'word'|'gram'|'grp', wh, sc, sc0, pos, verb, cat, conj, unlearned, order:'ord', min, max, n, lv?}}
//          （lv 只是可選的搜尋條件；不給時從全部詞挑，優先接近使用者程度）
//   set    {as, rand:[…]} | {as, conj:['動詞變數','形變數']} | {as, value}
//   each   {in, as, steps:[…]}               迴圈（可巢狀）
//   arena  {hubs:'wh'|'sc'|'words', from?}   建立 3D 作答場：以節點當選項
//   verb   {of, hide?}                       時態網換成該動詞（hide＝不顯示答案）
//   ask3d  {text, answer:'節點id', accept?, q?, speak?, track?}   點 3D 節點作答（計分）
//   find   {text, target:'節點id', scored?}  找到並點擊節點
//   quiz   {gen:'zh'|'jp'|'kana'|'mix'|'form'|'gzh', of, form?, track?} 或 {text, options, answer}   選擇題
//   cloze  {of}                              文法例句填空（找不到可挖空處時改考意思）
//   card   {of}                              顯示單字／文法說明卡
//   attach {of, to:'節點id'} / reveal {of}   作答場的視覺回饋：把單字掛到節點／點亮
//   learn  {gram:'文法id'}                   上一題答對才標記已學
// 舊存檔（含等級的任務 id）由 js/mind-game.js 的 LEGACY 對應到新 id。
// ───────────────────────────────────────────────────────────────
(function () {
  const M = window.MIND;
  const FORMS = ['masu', 'te', 'ta', 'nai', 'pot', 'pass', 'caus', 'cpass', 'vol', 'imp', 'ba'];
  const scCount = sc => M.LEVELS.reduce((a, lv) => a + M.WH.reduce((b, w) => b + ((M.GROUPS[lv] || {})[w.id + '|' + sc] || 0), 0), 0);
  const scInfo = id => M.SCENES.find(s => s.id === id);

  // 可重複使用的步驟片段
  const FR = M.FRAGMENTS = {
    classify: n => [
      { op: 'pick', as: 'ws', sel: { type: 'word', n } },
      { op: 'arena', hubs: 'wh' },
      { op: 'each', in: 'ws', as: 'w', steps: [
        { op: 'ask3d', q: '{w.jp0}', text: '「{w.jp0}」（{w.zh}）屬於人事時地物的哪一類？', answer: 'wh:{w.wh}', speak: '{w.jp0}', track: 'w', explain: '{w.wh}：{w.whDesc}' },
        { op: 'attach', of: 'w', to: 'wh:{w.wh}' }] }],
    sceneSort: n => [
      { op: 'pick', as: 'ws', sel: { type: 'word', n } },
      { op: 'arena', hubs: 'sc', from: 'ws' },
      { op: 'each', in: 'ws', as: 'w', steps: [
        { op: 'ask3d', q: '{w.jp0}', text: '「{w.jp0}」（{w.zh}）最常出現在哪個場景？', answer: 'sc:{w.sc0}', speak: '{w.jp0}', track: 'w', explain: '{w.scName}' },
        { op: 'attach', of: 'w', to: 'sc:{w.sc0}' }] }],
    constellation: (sc, n) => [
      { op: 'pick', as: 'ws', sel: { type: 'word', sc0: sc, n } },
      { op: 'arena', hubs: 'words', from: 'ws', center: 'sc:' + sc },
      { op: 'say', text: '點亮這個場景的 ' + n + ' 顆星：先答對意思，再從星圖中把它找出來。' },
      { op: 'each', in: 'ws', as: 'w', steps: [
        { op: 'mark', ids: ['a:{w.id}'] },
        { op: 'quiz', gen: 'mix', of: 'w', track: 'w' },
        { op: 'reveal', of: 'w' }] },
      { op: 'mark', ids: [] },
      { op: 'pick', as: 'ws2', sel: { type: 'var', from: 'ws', n: Math.min(4, n) } },
      { op: 'each', in: 'ws2', as: 'w', steps: [
        { op: 'ask3d', text: '點出「{w.zh}」', answer: 'a:{w.id}', track: 'w' }] }],
    hunt: (groups, n) => [
      { op: 'mode', mode: 'map' },
      { op: 'pick', as: 'gs', sel: { type: 'grp', min: 8, max: 60, n: groups } },
      { op: 'each', in: 'gs', as: 'g', steps: [
        { op: 'expand', grp: '{g.id}' },
        { op: 'pick', as: 'ws', sel: { type: 'word', wh: '{g.wh}', sc0: '{g.sc}', n } },
        { op: 'each', in: 'ws', as: 'w', steps: [
          { op: 'find', scored: true, text: '在「{g.name}」裡找出「{w.zh}」', target: '{w.id}', track: 'w' }] }] }],
    conj: (form, n) => [
      { op: 'pick', as: 'vs', sel: { type: 'word', verb: true, n } },
      { op: 'each', in: 'vs', as: 'v', steps: [
        { op: 'verb', of: 'v', hide: true },
        { op: 'mark', ids: ['cj:' + form] },
        { op: 'cam', to: 'cj:' + form, dist: 170, ms: 400 },
        { op: 'quiz', gen: 'form', of: 'v', form, track: 'v' }] }],
    identify: n => [
      { op: 'pick', as: 'vs', sel: { type: 'word', verb: true, n } },
      { op: 'each', in: 'vs', as: 'v', steps: [
        { op: 'set', as: 'f', rand: FORMS },
        { op: 'set', as: 'x', conj: ['v', 'f'] },
        { op: 'verb', of: 'v', hide: true },
        { op: 'ask3d', text: '「{v.jp0}」→「{x}」是哪一種變化？', answer: 'cj:{f}', accept: '{x_ids}', track: 'v' }] }],
    grammar: sel => [
      { op: 'pick', as: 'gs', sel },
      { op: 'each', in: 'gs', as: 'g', steps: [
        { op: 'mark', ids: ['{g.id}'] },
        { op: 'cam', to: '{g.id}', dist: 130, ms: 500 },
        { op: 'card', of: 'g' },
        { op: 'cloze', of: 'g' },
        { op: 'learn', gram: '{g.id}' }] }]
  };

  M.SCRIPTS = [
    { id: 'tour', cat: '導覽', icon: '🧭', title: '星圖導覽', desc: '一分鐘認識整張 3D 心智圖', steps: [
      { op: 'mode', mode: 'map' },
      { op: 'say', text: '歡迎來到日語星圖！下層是詞彙、上層是文法。可以拖曳旋轉、滾輪或雙指縮放。' },
      { op: 'say', text: '詞彙層分成七區：人・事・時・地・物・狀・虛，用顏色區分；外圈是依「生活場景」分群的單字。' },
      { op: 'find', text: '找到「物」並點它', target: 'wh:物' },
      { op: 'expand', grp: 'grp:物|food' },
      { op: 'say', text: '這是「飲食料理」裡的物品單字。每個場景群點一下就會展開。' },
      { op: 'pick', as: 'ws', sel: { type: 'word', wh: '物', sc0: 'food', n: 1 } },
      { op: 'each', in: 'ws', as: 'w', steps: [{ op: 'find', text: '試試看：找出「{w.zh}」', target: '{w.id}', speak: '{w.jp0}' }] },
      { op: 'say', text: '上層是文法，依類別聚成一團一團，例如助詞、時態、條件假設。' },
      { op: 'find', text: '點一下「〔助詞〕」這一類', target: 'cat:助詞' },
      { op: 'mode', mode: 'tense' },
      { op: 'say', text: '這是「時態網」：一個動詞的所有變化形、時態，以及用到每種變化的文法。' },
      { op: 'find', text: '點一下「て形」', target: 'cj:te' },
      { op: 'mode', mode: 'path' },
      { op: 'say', text: '最後是「學習路線」：由下往上是先修→後續，同一方位是同一類文法，金色是你的下一步。' },
      { op: 'say', text: '導覽完成！按 🎮 開啟任務板，用玩的把整張圖點亮吧。' }] },
    { id: 'daily', cat: '推薦', icon: '🎲', title: '今日混合挑戰', desc: '分類＋動詞變化＋文法，各來幾題', steps: () => {
      const form = FORMS[new Date().getDate() % FORMS.length];
      return [].concat(FR.classify(4), FR.conj(form, 3), [{ op: 'mode', mode: 'path' }], FR.grammar({ type: 'gram', unlearned: true, order: 'ord', n: 2 }));
    } },
    { id: 'path-next', cat: '文法', icon: '🚀', title: '路線推進 ×5', desc: '沿學習路線學會接下來的 5 條文法', steps: [
      { op: 'mode', mode: 'path' }].concat(FR.grammar({ type: 'gram', unlearned: true, order: 'ord', n: 5 })) },
    { id: 'classify', cat: '分類', icon: '🧲', title: '人事時地物分類', desc: '把 8 個單字送回所屬的類別星球（點星球作答）', steps: FR.classify(8) },
    { id: 'scenesort', cat: '場景', icon: '🏙️', title: '場景歸位', desc: '這個字最常出現在哪個場景？', steps: FR.sceneSort(8) },
    { id: 'hunt', cat: '尋寶', icon: '🔎', title: '星圖尋寶', desc: '在展開的詞群裡找出指定單字', steps: FR.hunt(2, 3) },
    { id: 'conj-identify', cat: '變化', icon: '🕸️', title: '變化辨識', desc: '看到變化後的動詞，在時態網上點出它是哪一形', steps: FR.identify(8) }
  ];

  M.TEMPLATES = [
    { id: 'star-{sc}', cat: '單字', icon: '{scIcon}', title: '{scName} 星座', desc: '點亮 6 顆單字星', each: { sc: M.SCENES.map(s => s.id) },
      vars: v => ({ scName: scInfo(v.sc).name, scIcon: scInfo(v.sc).icon }), when: v => scCount(v.sc) >= 10, steps: v => FR.constellation(v.sc, 6) },
    { id: 'conj-{form}', cat: '變化', icon: '⏳', title: '{formName}特訓', desc: '6 個動詞的{formName}', each: { form: FORMS },
      vars: v => ({ formName: M.CONJ_BY[v.form].name }), steps: v => FR.conj(v.form, 6) },
    { id: 'gram-{cat}', cat: '文法', icon: '📘', title: '{cat}', desc: '讀說明卡 → 例句填空 → 點亮文法', each: { cat: M.GCAT },
      when: v => M.gram.filter(g => g.cat === v.cat).length >= 4,
      steps: v => [{ op: 'mode', focus: 'cat:' + v.cat }].concat(FR.grammar({ type: 'gram', cat: v.cat, order: 'ord', n: 5 })) }
  ];
})();
