/* =========================================================
   日語冒險 — 自由練習 practice.js
   路由：practice（nav：🎯 練習）
     分頁「🧭 現在要去哪？」：選目的地 → 細分情境（互動菜單／各段對話／口說／單字／句子）
     分頁「🎚️ 自選等級」：先選等級＋類別＋模式，直接開打（不受地圖解鎖限制）
     分頁「🎴 分級字卡」：單字／會話句／形容詞／片語／諺語，JLPT 參考分級底線，自評難度可儲存
   路由：menu（互動菜單小遊戲，params {id}）
   依賴：App、Tracker、QuestAPI（quest.js）、TownAPI（town.js，render 時才取用）、MENUS、CARDS
   ========================================================= */
(function () {
  'use strict';
  const esc = App.esc;
  (function css() {
    if (document.getElementById('css-practice')) return;
    const st = document.createElement('style'); st.id = 'css-practice';
    st.textContent = `
/* 首頁 */
.h-me{display:flex;align-items:center;gap:12px;padding:14px;border-radius:22px;color:#fff;background:var(--pri)}
.h-av{font-size:2.3em;width:60px;height:60px;flex:none;border-radius:50%;background:#fff;border:none;cursor:pointer;animation:float 3s ease-in-out infinite;padding:0}
.h-inf{flex:1;min-width:0}
.h-inf b{font-size:1.1em;color:#fff}
.h-inf .bar{margin:6px 0;background:rgba(255,255,255,.35)}
.h-inf .bar>div{background:#fff}
.h-inf small{font-size:.78em;opacity:.92}
.h-next{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0 4px;padding:12px 14px;border:none;border-radius:20px;background:#fff;color:var(--text);cursor:pointer;font-family:inherit;text-align:left;box-shadow:var(--shadow);transition:transform .1s}
.h-next:active{transform:scale(.97)}
.h-next .i{font-size:2em;width:52px;height:52px;flex:none;border-radius:50%;background:var(--pri-t);display:flex;align-items:center;justify-content:center}
.h-next .t{flex:1;min-width:0;line-height:1.3}
.h-next small{color:var(--muted);font-size:.78em;display:block}
.h-next b{font-size:1.15em}
.h-next .go{width:40px;height:40px;border-radius:50%;background:var(--pri);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1em;flex:none}
@keyframes hpulse{0%,100%{transform:none}50%{transform:scale(1.015)}}
.h-daily{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 0}
.h-daily>div{position:relative;overflow:hidden;background:#fff;border:none;border-radius:14px;padding:6px 8px;font-size:.72em;line-height:1.25;display:flex;gap:4px;align-items:center;box-shadow:var(--shadow)}
.h-daily>div span{font-size:1.3em}
.h-daily i{position:absolute;left:0;bottom:0;height:3px;background:var(--acc)}
.h-daily .ok{background:var(--acc-t)}
.h-lv{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.h-lv button{border:none;border-radius:16px;background:#fff;padding:8px 2px;cursor:pointer;font-family:inherit;color:var(--text);box-shadow:var(--shadow);line-height:1.25;transition:transform .1s}
.h-lv button:active{transform:scale(.95)}
.h-lv button b{display:block;font-size:1em}
.h-lv button small{display:block;font-size:.68em;color:var(--muted)}
.h-lv button i{font-style:normal;font-size:.66em;color:var(--muted)}
.h-lv button.on{background:var(--pri);color:#fff}
.h-lv button.on small,.h-lv button.on i{color:rgba(255,255,255,.88)}
.h-worlds{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.h-w{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:14px 8px 12px;border:none;border-radius:20px;background:#fff;cursor:pointer;font-family:inherit;color:var(--text);box-shadow:var(--shadow);transition:transform .1s}
.h-w:active{transform:scale(.96)}
.h-w .ic{font-size:2.2em;line-height:1.1;width:56px;height:56px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center}
.h-w b{font-size:.98em}
.h-w small{font-size:.72em;color:var(--muted)}
.h-w .pg{width:76%;height:5px;background:var(--line);border-radius:3px;overflow:hidden}
.h-w .pg i{display:block;height:100%;background:var(--acc);border-radius:3px}
.h-w .md{position:absolute;top:6px;right:8px;font-size:1.2em}
/* 場景關卡地圖 */
.p-stage{position:relative;overflow:hidden;border-radius:22px;padding:16px;color:var(--text);margin-bottom:8px;background:#fff;box-shadow:var(--shadow)}
.p-sbig{position:absolute;right:14px;top:12px;font-size:3em;width:72px;height:72px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center}
.p-stt small{color:var(--muted)}
.p-stt h2{margin:0;color:var(--text);font-size:1.5em}
.p-sdesc{font-size:.8em;color:var(--muted);max-width:70%;line-height:1.4}
.p-sbar{display:flex;align-items:center;gap:8px;margin:12px 0 8px;font-weight:700;font-size:.9em}
.p-sbar .bar{flex:1}
.p-sbtn{display:flex;gap:6px;flex-wrap:wrap}
.p-sbtn .btn{margin:0}
.p-nsub{font-size:.66em;color:var(--muted);margin-top:1px}
.q-nd.todo .q-circ{background:#ededea}
/* 情境遊戲 HUD */
.g-hud{display:flex;align-items:center;gap:8px}
.g-hud .btn{margin:0;min-width:40px;padding:5px 10px}
.g-ttl{flex:1;min-width:0;line-height:1.25}
.g-ttl b{display:block;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-ttl small{color:var(--muted);font-size:.75em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.g-st{display:flex;flex-direction:column;align-items:flex-end;font-weight:800;font-size:.88em;line-height:1.3}
.g-hit{animation:qshake .4s}
.g-queue{display:flex;gap:4px;justify-content:space-between;margin:10px 0 6px;padding:8px 6px;background:#fff;border-radius:18px;box-shadow:var(--shadow)}
.g-f{flex:1;text-align:center;color:var(--muted);opacity:.45;line-height:1.1}
.g-f span{font-size:1.45em;display:block}
.g-f small{font-size:.66em}
.g-f.cur{opacity:1;color:var(--text)}
.g-f.cur span{animation:float 1.2s ease-in-out infinite}
.g-f.done{opacity:.9}
.g-f.done small{color:var(--acc-d);font-weight:800}
.g-pat{display:flex;align-items:center;gap:6px;font-weight:800}
.g-patb{flex:1;height:8px;border:none;border-radius:4px;background:var(--line);overflow:hidden}
.g-patb div{height:100%;background:var(--acc);border-radius:4px;transition:width .2s linear}
.g-patb div.mid{background:var(--gold)}
.g-patb div.low{background:var(--pri);animation:fade .5s infinite alternate}
.g-patb div.relax{background:#d8d8d4}
.g-combo{background:var(--pri);color:#fff;border-radius:999px;padding:0 8px;font-size:.85em;animation:pop .25s}
.g-opt{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.g-ask{display:flex;gap:10px;align-items:center;background:var(--pri-t);border:none;border-radius:18px;padding:10px 12px}
.g-av{font-size:2.1em;line-height:1;animation:float 2s ease-in-out infinite}
.g-say{flex:1;font-size:.95em}
.g-say small{color:var(--muted);display:block}
.g-react{margin-top:6px;font-size:.9em;font-weight:700}
/* 看板（ask／pref） */
.m-board{border:none;border-radius:18px;background:var(--paper);padding:10px;margin-top:8px}
.m-board h3{margin:2px 0 8px;color:var(--text);text-align:center;font-size:.95em}
.m-items{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.m-it{position:relative;background:#fff;border:none;border-radius:14px;padding:10px 6px;cursor:pointer;text-align:center;font-family:inherit;color:var(--text);box-shadow:var(--shadow);transition:transform .1s}
.m-it:active{transform:scale(.96)}
.m-it .e{font-size:1.4em;line-height:1}
.m-it .j{font-weight:800;font-size:1.02em;line-height:1.3}
.m-it .k{font-size:.72em;color:var(--muted)}
.m-it .z{font-size:.75em;color:var(--acc-d)}
.m-it.sel{box-shadow:0 0 0 2px var(--pri)}
.m-noz .z{display:none}
/* QR 點餐（像點餐 App：白底列表，左品名、右價格與 − 數量 ＋） */
.m-list{margin:4px 0 0;padding-left:1.1em;line-height:1.5}
.m-list b{font-size:1.06em}
.g-first{position:relative}
.g-arrow{position:absolute;right:10px;top:-10px;background:var(--pri);color:#fff;font-size:.72em;font-weight:800;border-radius:999px;padding:1px 10px;animation:float 1.2s ease-in-out infinite}
.m-situ{margin:8px 0 0;padding:8px 12px;border-radius:14px;background:var(--paper);font-size:.9em}
.m-menu{margin-top:10px;border:none;border-radius:18px;background:#fff;box-shadow:var(--shadow);overflow:hidden}
.m-head{background:#fff;color:var(--text);text-align:left;font-weight:800;padding:12px 14px 6px;font-size:1em}
.m-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 12px 8px;border-bottom:1px solid var(--line);scrollbar-width:none}
.m-tabs::-webkit-scrollbar{display:none}
.m-tabs button{flex:none;border:none;border-radius:999px;background:var(--paper);padding:6px 14px;font-weight:700;color:var(--muted);cursor:pointer;min-height:34px;font-family:inherit}
.m-tabs button.on{background:var(--pri);color:#fff}
.m-rows{max-height:52vh;overflow:auto}
.m-row{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f2f2f0}
.m-row.sel{background:var(--pri-t)}
.m-nm{flex:1;min-width:0;line-height:1.25}
.m-nm b{display:block;font-size:1em;font-weight:700}
.m-nm small{display:block;font-size:.72em;color:var(--muted)}
.m-nm small.z{color:var(--acc-d)}
.m-e{float:left;font-size:1.3em;margin-right:6px}
.m-pr{font-weight:700;color:var(--text);white-space:nowrap;font-size:.95em;text-align:right;line-height:1.2}
.m-pr small{display:block;font-size:.66em;font-weight:400;color:var(--muted)}
.m-q{display:flex;align-items:center;gap:4px;flex:none}
.m-q button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line2);background:#fff;font-size:1.15em;font-weight:700;cursor:pointer;color:var(--text);line-height:1;padding:0;transition:transform .1s}
.m-q button[data-d="1"]{background:var(--pri);border-color:var(--pri);color:#fff}
.m-q button:active{transform:scale(.88)}
.m-q span{min-width:22px;text-align:center;font-weight:800;font-size:1.05em}
.m-cart{position:sticky;bottom:calc(var(--navH, 64px) + 8px);z-index:5;margin-top:10px;padding:10px 12px;border:none;border-radius:20px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.12)}
.m-cl{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.m-cb{display:flex;align-items:center;justify-content:space-between;gap:8px}
.m-cb b{color:var(--text);font-size:1.1em}
.m-cb .btn{margin:0}
/* 券売機 */
.k-mac{margin-top:10px;border:none;border-radius:20px;background:#fff;padding:12px;box-shadow:var(--shadow)}
.k-top{text-align:center;font-weight:800;color:var(--muted);font-size:.85em}
.k-disp{background:#222;color:#7cf5d8;font-family:ui-monospace,monospace;text-align:right;padding:8px 12px;border-radius:12px;margin:8px 0;font-size:1.1em}
.k-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.k-b{border:none;border-radius:14px;background:#f2f2ef;padding:8px 2px;font-family:inherit;color:#aaa;cursor:pointer;line-height:1.2;min-height:70px;transition:transform .1s}
.k-b:active{transform:scale(.95)}
.k-b small{display:block;font-size:.64em}
.k-b b{display:block;font-size:.88em}
.k-b.lit{background:var(--pri-t);color:var(--text);box-shadow:0 0 0 2px var(--pri)}
.k-money{display:flex;gap:6px;margin:10px 0}
.k-money button{flex:1;border:1px solid var(--line2);border-radius:999px;background:#fff;padding:9px 0;font-weight:700;cursor:pointer;font-family:inherit;transition:transform .1s}
.k-money button:active{transform:scale(.95)}
.k-tix{min-height:28px;margin-bottom:6px}
/* 家系客製 */
.o-board{margin-top:10px;border:none;border-radius:20px;background:#fff;padding:12px;box-shadow:var(--shadow)}
.o-row{margin-bottom:10px}
.o-name{font-weight:800;margin-bottom:6px;font-size:.92em}
.o-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.o-opts button{border:none;border-radius:999px;background:#f2f2ef;padding:9px 2px;font-size:1em;font-weight:700;cursor:pointer;line-height:1.2;color:var(--text);transition:transform .1s}
.o-opts button:active{transform:scale(.95)}
.o-opts button small{display:block;font-size:.62em;font-weight:400;color:var(--muted)}
.o-opts button.on{background:var(--pri);color:#fff}
.o-opts button.on small{color:rgba(255,255,255,.88)}
.g-steps{text-align:left;padding-left:1.3em;line-height:1.8}
.g-note{text-align:left;font-size:.85em;background:var(--acc-t);border-radius:14px;padding:8px 12px}
/* 字卡 */
.c-card{perspective:1000px;max-width:440px;margin:8px auto;height:300px;cursor:pointer}
.c-in{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.c-card.flip .c-in{transform:rotateY(180deg)}
.c-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:none;border-radius:24px;background:#fff;box-shadow:var(--shadow2);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.c-back{transform:rotateY(180deg);background:#fff}
.c-face .c-jp{font-size:2.3em;font-weight:800;line-height:1.35;word-break:break-all}
.c-face .c-top{position:absolute;top:12px;left:14px;right:14px;display:flex;justify-content:space-between;font-size:.8em;color:var(--muted)}
.c-ex{margin-top:8px;font-size:.9em;background:var(--paper);border:none;border-radius:12px;padding:6px 10px}
.c-rate{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:440px;margin:10px auto}
.c-rate .btn{margin:0;flex-direction:column;line-height:1.2;font-size:.88em;border-radius:18px}
.c-rate .btn.on{background:var(--pri);color:#fff;border-color:var(--pri)}
.c-nav{display:flex;justify-content:space-between;align-items:center;max-width:440px;margin:4px auto}
@media(max-width:640px){.c-card{height:230px}.c-face .c-jp{font-size:2em}}
@media(min-width:769px){.h-worlds{grid-template-columns:repeat(4,1fr)}}
.h-save{margin:8px 2px 0;font-size:.78em;color:var(--muted);text-align:center}
.h-save a{color:var(--pri);font-weight:700}
.h-gsb{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin:10px 0 0;padding:10px;border:none;border-radius:999px;background:#fff;color:var(--text);cursor:pointer;box-shadow:var(--shadow);font-family:inherit;font-weight:700;transition:transform .1s}
.h-gsb:active{transform:scale(.97)}
.h-gsb b{color:var(--pri)}
.gs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0;padding:4px}
.gs-cell{display:flex;flex-direction:column;align-items:center;gap:4px}
.gs-seal{width:72px;height:72px;border-radius:50%;background:#f2f2ef;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.6;filter:grayscale(1)}
.gs-cell.ok .gs-seal{opacity:1;filter:none;background:var(--pri);color:#fff;transform:rotate(-6deg);box-shadow:0 4px 12px rgba(255,107,91,.35)}
.gs-ic{font-size:1.6em;line-height:1}
.gs-nm{font-weight:800;font-size:.6em;line-height:1.1;text-align:center;max-width:62px}
.gs-cell small{font-size:.66em;color:var(--muted)}
.gs-cell.ok small{color:var(--pri);font-weight:800}
#playerChip .sv{font-size:1em;cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:50%;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center}
`;
    document.head.appendChild(st);
  })();

  const arr = a => (Array.isArray(a) ? a : []);
  const scenes = () => arr(window.SCENES).filter(s => s && s.id);
  const findScene = id => scenes().find(s => s.id === id) || null;
  const starsOf = r => r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
  const lvBadge = lv => (window.CARDS ? CARDS.badge(lv) : '');
  const lvCls = lv => (lv || 'x').toLowerCase();
  const T = () => window.TownAPI || {};

  // 等級 → 世界（地點）。入門/初級＝假名世界（冒險地圖的章節），中級/高級＝日本場景
  const LEVELS = [
    { id: 'L1', name: '入門', sub: '五十音', worlds: ['ch1', 'ch2'] },
    { id: 'L2', name: '初級', sub: '濁音拗音', worlds: ['ch3'] },
    { id: 'L3', name: '中級', sub: '生活場景', worlds: ['konbini', 'ramen', 'yakiniku', 'directions', 'cafe', 'station', 'drugstore', 'hotel'] },
    { id: 'L4', name: '高級', sub: '旅遊進階', worlds: ['izakaya', 'clothes', 'shrine', 'airport', 'emergency'] }
  ];
  const UI = { lv: '', deck: 'word', lvF: 'all', dF: 'all', ci: 0 };
  const chapOf = id => /^ch\d$/.test(id) ? (window.QUEST_CHAPTERS || []).find(c => 'ch' + c.n === id) || null : null;
  function worldInfo(id) {
    const c = chapOf(id);
    if (c) return { id, icon: c.icon, name: c.name, desc: c.desc, color: c.color };
    const s = findScene(id);
    return s ? { id, icon: s.icon, name: s.name, desc: s.desc, color: s.color } : null;
  }

  // 備份碼：複製一段文字保存，之後貼回即可還原（任何環境都能用）
  // 備份：分享到手機（存到 iCloud 雲碟／Google 雲端硬碟／LINE…）、存成檔案（自選位置）、複製備份碼；還原：選檔案或貼備份碼
  function parseBackup(txt) {
    txt = String(txt || '').trim();
    let o = null;
    try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { } }
    if (o && o.state) o = o.state;
    if (!o || typeof o.xp !== 'number') throw new Error('bad');
    return o;
  }
  function backup() {
    const st = App.state, code = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
    const d = new Date(), stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const fname = '日語冒險備份-' + stamp + '.json';
    const json = JSON.stringify({ app: '日語冒險', v: 1, t: Date.now(), state: st });
    App.modal(`<h2>💾 備份／還原進度</h2>
      <p class="muted" style="font-size:.85em;margin:.3em 0">目前：Lv.${App.level}・${st.xp} XP・不會清單 ${Tracker.count()} 個</p>
      <div class="sec-t" style="margin:10px 0 6px">備份</div>
      <div class="bk-g">
        <button class="btn primary" id="bkShare">📤 分享備份<small>選 iCloud 雲碟、Google 雲端、LINE…</small></button>
        <button class="btn" id="bkSave">📁 存成檔案<small>自己選要放的位置</small></button>
        <button class="btn" id="bkCopy">📋 複製備份碼<small>貼到備忘錄／Keep</small></button>
      </div>
      <textarea id="bkOut" readonly style="width:100%;height:46px;font-size:.65em;margin-top:6px">${code}</textarea>
      <div class="sec-t" style="margin:10px 0 6px">還原</div>
      <div class="bk-g">
        <label class="btn" style="margin:0">📂 從檔案還原<small>選先前存的 .json</small><input type="file" id="bkFile" accept=".json,.txt,application/json,text/plain" style="display:none"></label>
      </div>
      <textarea id="bkIn" placeholder="或在這裡貼上備份碼，再按「還原」" style="width:100%;height:46px;font-size:.65em;margin-top:6px"></textarea>
      <style>.bk-g{display:grid;gap:6px}.bk-g .btn{margin:0;flex-direction:column;line-height:1.25;min-height:50px}.bk-g .btn small{font-weight:normal;font-size:.75em;opacity:.85}</style>`,
      [{ label: '關閉' }, { label: '還原', cls: 'primary' }]);
    const bg = [...document.querySelectorAll('.modal-bg')].pop(), $ = q => bg.querySelector(q);
    const copy = () => {
      const out = $('#bkOut'); out.focus(); out.select(); let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { }
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(code).then(() => App.toast('📋 已複製備份碼', 'ok')).catch(() => App.toast('請長按上方文字框，手動全選複製'));
      else App.toast(ok ? '📋 已複製備份碼，貼到備忘錄或 Keep 保存' : '請長按上方文字框，手動全選複製');
    };
    const download = () => {
      try {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const aEl = document.createElement('a'); aEl.href = url; aEl.download = fname; document.body.appendChild(aEl); aEl.click(); aEl.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        App.toast('📁 已送出下載（若沒反應，請改用「複製備份碼」）');
      } catch (e) { copy(); }
    };
    $('#bkShare').onclick = async () => {
      try {
        const file = typeof File === 'function' ? new File([json], fname, { type: 'application/json' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '日語冒險備份' }); App.toast('✅ 已分享備份', 'ok'); return; }
        if (navigator.share) { await navigator.share({ title: '日語冒險備份碼', text: code }); App.toast('✅ 已分享備份碼', 'ok'); return; }
        App.toast('這裡不支援分享，已改用複製'); copy();
      } catch (e) {
        if (e && e.name === 'AbortError') return;     // 使用者自己取消
        App.toast('分享被瀏覽器擋住，已改用複製'); copy();
      }
    };
    $('#bkSave').onclick = async () => {
      if (window.showSaveFilePicker) {
        try {
          const h = await showSaveFilePicker({ suggestedName: fname, types: [{ description: '日語冒險備份', accept: { 'application/json': ['.json'] } }] });
          const w = await h.createWritable(); await w.write(json); await w.close();
          App.toast('✅ 已存到你選的位置', 'ok'); return;
        } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      download();
    };
    $('#bkCopy').onclick = copy;
    const restore = txt => {
      try { const o = parseBackup(txt); bg.remove(); App.loadState(o); App.toast(`✅ 已還原：Lv.${App.level}・${o.xp} XP`, 'ok'); }
      catch (e) { App.toast('❌ 備份內容不正確'); }
    };
    $('#bkFile').onchange = e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => restore(r.result); r.onerror = () => App.toast('❌ 讀不到這個檔案'); r.readAsText(f);
    };
    [...bg.querySelectorAll('.modal-btns .btn')].pop().onclick = () => restore($('#bkIn').value);
  }

  /* ---------------- 御朱印帳：地點全部節點三星即可得 ---------------- */
  const allWorlds = () => LEVELS.flatMap(L => L.worlds).filter(w => worldInfo(w));
  const hasGoshuin = w => { const s = stageStars(w); return s.max > 0 && s.got >= s.max; };
  const goshuinGot = () => allWorlds().filter(hasGoshuin).length;
  function goshuin() {
    const ws = allWorlds();
    App.modal(`<h2 style="margin:.2em 0">⛩️ 御朱印帳</h2><p class="muted" style="font-size:.82em;margin:.2em 0">把一個地點的所有關卡都拿到 ⭐⭐⭐，就能蓋上朱印</p>
      <div class="gs-grid">${ws.map(w => { const i = worldInfo(w), ok = hasGoshuin(w), st = stageStars(w);
        return `<div class="gs-cell${ok ? ' ok' : ''}"><div class="gs-seal">${ok ? `<span class="gs-ic">${esc(i.icon)}</span><span class="gs-nm">${esc(i.name)}</span>` : `<span class="gs-ic">${esc(i.icon)}</span>`}</div><small>${ok ? '奉拝' : `⭐${st.got}/${st.max}`}</small></div>`; }).join('')}</div>
      <p style="margin:.4em 0">已得 <b style="color:var(--shu)">${goshuinGot()}</b> / ${ws.length}</p>`, [{ label: '閉じる 關閉', cls: 'primary' }]);
  }

  /* ---------------- 首頁：選等級 → 選地點 ---------------- */
  function renderHome(el) {
    const S = App.state, lv = App.level, lo = App.LEVELS[lv - 1], hi = App.LEVELS[lv] || lo + 1000;
    if (!UI.lv) { const firstOpen = LEVELS.find(L => L.worlds.some(w => { const s = stageStars(w); return s.got < s.max; })); UI.lv = (firstOpen || LEVELS[0]).id; }
    const L = LEVELS.find(x => x.id === UI.lv);
    // 下一關：目前等級第一個還沒拿星的節點
    let nextW = null, nextN = null;
    const lvOrder = [L].concat(LEVELS.filter(x => x !== L));
    for (const Lx of lvOrder) { for (const w of Lx.worlds) { const n = stageNodes(w).find(x => sitStars(x.key) === 0); if (n) { nextW = w; nextN = n; break; } } if (nextN) break; }
    const d = window.Game ? Game.daily() : null;
    const ss = App.saveStatus;
    el.innerHTML = `
      <div class="h-me">
        <button class="h-av" id="avBtn" title="換角色">${window.Game ? Game.avatar() : '🧳'}</button>
        <div class="h-inf"><b>Lv.${lv} ${esc(App.TITLES[lv - 1] || '')}</b>
          <div class="bar"><div style="width:${Math.min(100, (S.xp - lo) / (hi - lo) * 100)}%"></div></div>
          <small>${S.xp} XP・🔥 ${S.streak.days} 天・${ss === 'cloud' ? '☁️ 雲端存檔' : ss === 'local' ? '💾 本機存檔' : '⚠️ 無法存檔'}</small></div>
      </div>
      ${ss !== 'cloud' ? `<div class="h-save">${ss === 'none' ? '⚠️ 無法自動存檔' : '📱 進度只存在這台裝置'}，<a href="#" id="hBk">點 💾 備份</a></div>` : ''}
      ${nextN ? `<button class="h-next" id="hNext"><span class="i">${esc(nextN.icon)}</span><span class="t"><small>繼續冒險・${esc(worldInfo(nextW).name)}</small><b>${esc(nextN.name)}</b></span><span class="go">▶</span></button>` : '<div class="panel center">🏆 全部制霸！</div>'}
      ${d ? `<div class="h-daily">${Game.DAILY.map(m => { const v = Math.min(m.goal, d[m.id] || 0); return `<div class="${d.claimed[m.id] ? 'ok' : ''}"><span>${d.claimed[m.id] ? '✅' : m.icon}</span><small>${esc(m.label)}</small><i style="width:${v / m.goal * 100}%"></i></div>`; }).join('')}</div>` : ''}
      <button class="h-gsb" id="hGos">⛩️ 御朱印帳 <b>${goshuinGot()}/${allWorlds().length}</b></button>
      <div class="sec-t">① 選練習類型</div>
      <div class="h-lv">${LEVELS.map(x => { const st = x.worlds.reduce((a, w) => { const s = stageStars(w); return [a[0] + s.got, a[1] + s.max]; }, [0, 0]);
        return `<button data-lv="${x.id}" class="${x.id === UI.lv ? 'on' : ''}"><b>${x.name}</b><small>${x.sub}</small><i>⭐${st[0]}/${st[1]}</i></button>`; }).join('')}</div>
      <div class="sec-t">② 選地點</div>
      <div class="h-worlds">${L.worlds.map(w => { const info = worldInfo(w); if (!info) return ''; const st = stageStars(w), pct = st.max ? st.got / st.max * 100 : 0;
        return `<button class="h-w" data-w="${w}" style="--tc:${esc(/^#/.test(info.color || '') ? info.color : '#24365c')}">${pct >= 100 ? '<span class="md">🏅</span>' : ''}<span class="ic">${esc(info.icon)}</span><b>${esc(info.name)}</b>
          <span class="pg"><i style="width:${pct}%"></i></span><small>⭐ ${st.got}/${st.max}・${st.n} 關</small></button>`; }).join('')}</div>
      <p class="center muted" style="font-size:.8em;margin-top:18px"><a href="日文講義.html">📖 入門講義</a>・<a href="50音訓練表.html">🎯 50音表</a>・<a href="#" id="bk">💾 備份／分享／還原進度</a>・<a href="#" id="reset">重置</a></p>`;
    el.querySelector('#avBtn').onclick = () => window.Game && Game.pickAvatar(() => App.render());
    const hn = el.querySelector('#hNext'); if (hn) hn.onclick = () => nextN.go();
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { UI.lv = b.dataset.lv; renderHome(el); });
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => App.go('stage', { id: b.dataset.w }));
    el.querySelector('#bk').onclick = e => { e.preventDefault(); backup(); };
    const hb = el.querySelector('#hBk'); if (hb) hb.onclick = e => { e.preventDefault(); backup(); };
    el.querySelector('#hGos').onclick = goshuin;
    if (ss === 'none' && !UI.warned) { UI.warned = true; App.toast('⚠️ 這個環境無法自動存檔，請用「💾 備份進度」保存'); }
    el.querySelector('#reset').onclick = e => { e.preventDefault(); App.modal('<h2>確定重置？</h2><p>經驗值、星星、不會清單都會清空。</p>', [{ label: '取消' }, { label: '重置', cls: 'primary', onClick: App.resetAll }]); };
  }

  /* ---- 情境星數（存檔：App.state.sit） ---- */
  App.register('practice-map', { title: '原版練習', icon: '🎯', nav: false, render: renderHome });

  const sitStars = key => /^q:/.test(key) ? App.stars(key.slice(2)) : ((App.state.sit || {})[key] || 0);
  function setSit(key, stars) {
    if (!key) return;
    if (!App.state.sit) App.state.sit = {};
    const prev = App.state.sit[key] || 0;
    if ((stars | 0) > prev) { App.state.sit[key] = stars | 0; App.save(); if (!prev && App.noteClear) App.noteClear(); }
  }
  const menusOf = id => { const m = (window.MENUS || {})[id]; return Array.isArray(m) ? m : m ? [m] : []; };
  const TYPE_LB = { order: '點餐購物', ticket: '買票', ask: '詢問', request: '索取', pref: '說明需求', qa: '對答', kenbaiki: '券売機', okonomi: '說喜好' };
  // 場景的所有細分關卡
  // 各場景依實際到店流程排序（m＝情境遊戲、d＝對話）
  const TIMELINE = {
    konbini: ['d1', 'm0', 'm1', 'm2', 'd0'], ramen: ['d0', 'm0', 'm1', 'd1', 'm2'], cafe: ['m0', 'm1', 'm2', 'd0', 'd1'],
    drugstore: ['m2', 'd0', 'm0', 'd1', 'm1', 'd2'], izakaya: ['m0', 'd0', 'm1', 'd1', 'm2', 'm3', 'd2'], clothes: ['m0', 'm2', 'd0', 'm1', 'd1'],
    directions: ['m0', 'd0', 'm1', 'd1', 'm2'], station: ['m0', 'm1', 'd0', 'm2', 'd1'], hotel: ['d0', 'm1', 'm0', 'm2', 'd1'],
    shrine: ['m2', 'm0', 'm1', 'd0', 'd1'], airport: ['m0', 'd0', 'm1', 'm2', 'd1'], emergency: ['m2', 'd1', 'm1', 'm0', 'd0', 'd2'],
    yakiniku: ['m0', 'd0', 'm1', 'm2', 'm3', 'm4', 'd1', 'm5']
  };
  function stageNodes(id) {
    const ch = chapOf(id);
    if (ch) return (window.QUESTS || []).filter(q => q.chapter === ch.n && q.type === 'kana').map(q => ({ key: 'q:' + q.id, icon: q.icon, name: q.title.replace(/^BOSS：/, '').replace(/：.*/, ''), sub: q.boss ? '👑 BOSS' : '⚔️ 假名戰鬥', boss: q.boss, go: () => App.go('quest', { id: q.id, free: true }) }));
    const s = findScene(id); if (!s) return [];
    const ms = menusOf(id), ds = arr(s.dialogues), out = [];
    const mNode = i => ({ key: id + ':m' + i, icon: ms[i].icon || '🧾', name: ms[i].name, sub: '🧾 ' + (TYPE_LB[ms[i].type] || '互動'), go: () => App.go('menu', { id, m: i }) });
    const dNode = i => ({ key: id + ':d' + i, icon: '🎭', name: ds[i].title || '對話 ' + (i + 1), sub: '🎭 對話', go: () => App.go('drill', { scenes: [id], kind: 'dialog', dialog: i, sit: id + ':d' + i }) });
    let seq = TIMELINE[id];
    if (!seq) { seq = []; for (let i = 0; i < Math.max(ms.length, ds.length); i++) { if (ms[i]) seq.push('m' + i); if (ds[i]) seq.push('d' + i); } }
    const seen = new Set();
    seq.concat(ms.map((_, i) => 'm' + i), ds.map((_, i) => 'd' + i)).forEach(k => {
      if (seen.has(k)) return; seen.add(k);
      const i = +k.slice(1);
      if (k[0] === 'm' && ms[i]) out.push(mNode(i)); else if (k[0] === 'd' && ds[i]) out.push(dNode(i));
    });
    out.push({ key: id + ':word', icon: '📚', name: '單字特訓', sub: '📚 測驗', go: () => App.go('drill', { scenes: [id], kind: 'word', count: 10, sit: id + ':word' }) });
    if (T().hasSR) out.push({ key: id + ':speak', icon: '🎤', name: '口說挑戰', sub: '🎤 用說的', go: () => App.go('drill', { scenes: [id], kind: 'speak', count: ds.length, sit: id + ':speak' }) });
    else out.push({ key: id + ':speak', icon: '🔁', name: '跟讀練習', sub: '🔁 先聽再選', go: () => App.go('drill', { scenes: [id], kind: 'shadow', count: ds.length, sit: id + ':speak' }) });
    out.push({ key: id + ':boss', icon: '👑', name: '店長考驗', sub: '👑 BOSS', boss: true, go: () => App.go('drill', { scenes: [id], kind: 'mix', count: 15, sit: id + ':boss', title: s.name + '・店長考驗' }) });
    return out;
  }
  const stageStars = id => { const n = stageNodes(id); return { got: n.reduce((a, x) => a + sitStars(x.key), 0), max: n.length * 3, n: n.length }; };

  function situations(id) { App.go('stage', { id }); }

  /* ---- 路由：stage（場景關卡地圖） ---- */
  function renderStage(el, params) {
    const id = (params || {}).id, s = worldInfo(id);
    if (!s) { App.go('practice-map'); return; }
    const nodes = stageNodes(id), st = stageStars(id);
    const cur = nodes.find(n => sitStars(n.key) === 0) || null;
    const X = [50, 76, 70, 42, 22, 30, 58, 78, 50];
    const H = 126;
    el.innerHTML = `<div class="p-stage" style="--tc:${esc(s.color || '#c73e2e')}">
        <div class="p-sbig">${esc(s.icon)}</div>
        <div class="p-stt"><small>現在去</small><h2>${esc(s.name)}</h2><div class="p-sdesc">${esc(s.desc || '')}</div></div>
        <div class="p-sbar"><div class="bar"><div style="width:${st.max ? st.got / st.max * 100 : 0}%"></div></div><span>⭐ ${st.got}/${st.max}</span></div>
        <div class="p-sbtn"><button class="btn sm" id="sBack">↩ 選地點</button>${chapOf(id) ? '' : '<button class="btn sm" id="sLearn">📖 單字・小知識</button>'}${cur ? '<button class="btn sm primary" id="sGo">▶ 下一關</button>' : '<span class="pill">🏅 全制霸</span>'}</div>
      </div>
      <div class="q-path" style="height:${nodes.length * H + 30}px">
        <svg class="q-svg" preserveAspectRatio="none" viewBox="0 0 100 ${nodes.length * H + 30}"><path d="${nodes.map((n, i) => `${i ? 'L' : 'M'}${X[i % X.length]} ${i * H + 46}`).join(' ')}" fill="none" stroke="#e2e2e2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
        ${nodes.map((n, i) => {
          const k = sitStars(n.key), isCur = cur && cur.key === n.key;
          return `<div class="q-nd ${k ? 'cl' : isCur ? 'open' : 'todo'}${n.boss ? ' boss' : ''}${isCur ? ' cur' : ''}" data-i="${i}" style="left:${X[i % X.length]}%;top:${i * H + (n.boss ? 0 : 8)}px">
            ${isCur ? `<div class="q-me">${window.Game ? Game.avatar() : '🧳'}</div>` : ''}
            <div class="q-circ">${esc(n.icon)}</div><div class="q-s">${'★'.repeat(k)}${'☆'.repeat(3 - k)}</div>
            <div class="q-lbl">${esc(n.name)}</div><div class="p-nsub">${esc(n.sub)}</div></div>`; }).join('')}
      </div>`;
    el.querySelector('#sBack').onclick = () => App.go('practice-map');
    const sl = el.querySelector('#sLearn'); if (sl) sl.onclick = () => App.go('scene', { id, free: true });
    const g = el.querySelector('#sGo'); if (g) g.onclick = () => cur.go();
    el.querySelectorAll('.q-nd[data-i]').forEach(d => d.onclick = () => {
      const n = nodes[+d.dataset.i], k = sitStars(n.key);
      App.modal(`<div style="font-size:3em;line-height:1">${esc(n.icon)}</div><h2 style="margin:.2em 0">${esc(n.name)}</h2>
        <p><span class="chip">${esc(n.sub)}</span> <span class="chip">${esc(s.name)}</span></p>${/^q:/.test(n.key) ? '<p class="muted" style="font-size:.88em">答對＝攻擊，答錯被反擊扣 ❤️，剩幾顆心拿幾顆星</p>' : ''}<p style="font-size:1.6em;color:var(--kin);margin:.2em">${'★'.repeat(k)}${'☆'.repeat(3 - k)}</p>`,
        [{ label: '取消' }, { label: '⚔️ 開始', cls: 'primary', onClick: n.go }]);
    });
    const c = el.querySelector('.q-nd.cur');
    if (c && c.scrollIntoView && nodes.indexOf(cur) > 2) setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  }
  App.register('stage', { title: '場景關卡', icon: '🗺️', nav: false, render: renderStage });

  /* ---- 🎴 分級字卡 ---- */
  const DECKS = [['word', '📚', '場景單字'], ['phrase', '💬', '會話句'], ['adj', '🎨', '形容詞'], ['idiom', '🧩', '片語'], ['proverb', '📜', '諺語']];
  function deckCards(k) {
    if (window.CARDS && CARDS.decks[k]) return CARDS.decks[k].cards;
    const seen = new Set(), out = [];
    scenes().forEach(s => arr(k === 'word' ? s.vocab : s.phrases).forEach(w => {
      if (!w || !w.jp || seen.has(w.jp)) return; seen.add(w.jp);
      out.push({ id: k + ':' + w.jp, kind: k, jp: w.jp, kana: w.kana, romaji: w.romaji, zh: w.zh, hint: w.hint || '', ex: w.use ? '使用時機：' + w.use : '', exzh: '', emoji: w.emoji || '', lv: window.CARDS ? CARDS.levelOf(w.jp, k) : 'x', source: s.name });
    }));
    return out;
  }
  const diffOf = id => ((App.state.cardDiff || {})[id] || 0);
  function cardsView(body) {
    const all = deckCards(UI.deck);
    const list = all.filter(c => (UI.lvF === 'all' || c.lv === UI.lvF) && (UI.dF === 'all' || diffOf(c.id) === +UI.dF));
    if (UI.ci >= list.length) UI.ci = 0;
    const cnt = lv => all.filter(c => c.lv === lv).length;
    const c = list[UI.ci];
    const LVS = ['N5', 'N4', 'N3', 'N2', 'N1', 'x'];
    body.innerHTML = `<div class="tabs">${DECKS.map(([k, i, n]) => `<button data-dk="${k}" class="${UI.deck === k ? 'on' : ''}">${i} ${n}</button>`).join('')}</div>
      <div class="tabs" style="margin-top:0"><button data-lf="all" class="${UI.lvF === 'all' ? 'on' : ''}">全部級 ${all.length}</button>${LVS.filter(cnt).map(l => `<button data-lf="${l}" class="${UI.lvF === l ? 'on' : ''}">${CARDS.LV_NAME[l]} ${cnt(l)}</button>`).join('')}</div>
      <div class="tabs" style="margin-top:0">${[['all', '全部'], ['3', '😵 困難'], ['2', '🤔 普通'], ['1', '😊 簡單'], ['0', '未評']].map(([k, n]) => `<button data-df="${k}" class="${UI.dF === k ? 'on' : ''}">${n} ${k === 'all' ? '' : all.filter(x => diffOf(x.id) === +k).length}</button>`).join('')}</div>
      ${c ? `<div class="c-card" id="cCard"><div class="c-in">
          <div class="c-face"><div class="c-top"><span>${UI.ci + 1} / ${list.length}</span>${lvBadge(c.lv)}</div>
            ${c.emoji ? `<div style="font-size:2em">${esc(c.emoji)}</div>` : ''}
            <div class="c-jp jp"><span class="lv-u ${lvCls(c.lv)}">${esc(c.jp)}</span></div>
            <div class="muted" style="margin-top:12px;font-size:.85em">👆 點卡片翻面・🔊 自動發音</div></div>
          <div class="c-face c-back"><div class="c-top"><span>${esc(c.source || '')}</span>${lvBadge(c.lv)}</div>
            ${c.kana && c.kana !== c.jp ? `<div class="jp" style="font-size:1.4em">${esc(c.kana)}</div>` : ''}
            <div class="muted">${esc(c.romaji || '')}</div>
            <div style="font-size:1.3em;font-weight:900;margin:4px 0">${esc(c.zh)}</div>
            ${c.hint ? `<div style="font-size:.85em;color:#7a4a1a">${esc(c.hint)}</div>` : ''}
            ${c.ex ? `<div class="c-ex"><span class="jp">${esc(c.ex)}</span>${c.exzh ? `<br><small class="muted">${esc(c.exzh)}</small>` : ''}</div>` : ''}
          </div></div></div>
        <div class="c-rate">${[[3, '😵', '困難'], [2, '🤔', '普通'], [1, '😊', '簡單']].map(([v, e, n]) => `<button class="btn${diffOf(c.id) === v ? ' on' : ''}" data-rate="${v}"><span style="font-size:1.4em">${e}</span>${n}</button>`).join('')}</div>
        <div class="c-nav"><button class="btn sm" id="cPrev">◀ 上一張</button>
          <span><button class="btn sm ghost" id="cSay">🔊</button><button class="track-btn${Tracker.has(c.id) ? ' on' : ''}" id="cTrack">${Tracker.has(c.id) ? '✓ 已在清單' : '＋ 不會清單'}</button></span>
          <button class="btn sm" id="cNext">下一張 ▶</button></div>`
        : `<div class="panel center muted">這個條件下沒有字卡，換個篩選吧！</div>`}
      <div class="panel" style="font-size:.82em"><div class="lv-legend">底線顏色：${LVS.map(lvBadge).join('')}</div><div class="muted" style="margin-top:6px">${esc(window.CARDS ? CARDS.NOTE : '')}</div>
        <div class="muted">自評難度會自動儲存在本機，可用上方「困難」篩選集中複習。</div></div>`;
    const re = () => cardsView(body);
    body.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { UI.deck = b.dataset.dk; UI.lvF = 'all'; UI.ci = 0; re(); });
    body.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { UI.lvF = b.dataset.lf; UI.ci = 0; re(); });
    body.querySelectorAll('[data-df]').forEach(b => b.onclick = () => { UI.dF = b.dataset.df; UI.ci = 0; re(); });
    if (!c) return;
    const say = () => App.speak(c.kana || c.jp);
    body.querySelector('#cCard').onclick = () => { const cc = body.querySelector('#cCard'); cc.classList.toggle('flip'); if (cc.classList.contains('flip')) say(); };
    body.querySelector('#cSay').onclick = say;
    body.querySelector('#cPrev').onclick = () => { UI.ci = (UI.ci - 1 + list.length) % list.length; re(); };
    body.querySelector('#cNext').onclick = () => { UI.ci = (UI.ci + 1) % list.length; re(); };
    body.querySelector('#cTrack').onclick = () => {
      if (Tracker.has(c.id)) Tracker.remove(c.id);
      else Tracker.add({ id: c.id, jp: c.jp, kana: c.kana, romaji: c.romaji, zh: c.zh, hint: c.hint, emoji: c.emoji || '', source: c.source || '字卡' });
      re();
    };
    body.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => {
      if (!App.state.cardDiff) App.state.cardDiff = {};
      App.state.cardDiff[c.id] = +b.dataset.rate; App.save();
      App.toast(`已標記「${b.textContent.trim()}」`);
      const stillIn = UI.dF === 'all' || +UI.dF === +b.dataset.rate;
      if (stillIn) UI.ci = (UI.ci + 1) % Math.max(1, list.length);
      re();
    });
  }

  App.register('cards', { title: '字卡', icon: '🎴', nav: true, render(el) { el.innerHTML = '<div class="sec-t" style="margin-top:4px">🎴 分級字卡</div><div id="pBody"></div>'; cardsView(el.querySelector('#pBody')); } });
  App.register('practice', { title: '練習', icon: '🎯', nav: false, render() { setTimeout(() => App.go('practice-map'), 0); } });

  /* =========================================================
     路由：menu — 互動情境遊戲（params {id, m}）
     玩法：旅伴一個個拜託你用日文幫忙 → ①看日文菜單/看板選對 ②選或說出日文 ③聽懂對方回答
     ❤️ 3 顆（答錯或旅伴等太久會扣）、⏳ 耐心條、🔥 連擊加分、💯 分數；5 位旅伴＝1 關
     ========================================================= */
  const CNT = {
    tsu: { jp: ['', '一つ', '二つ', '三つ'], k: ['', 'ひとつ', 'ふたつ', 'みっつ'] },
    mai: { jp: ['', '一枚', '二枚', '三枚'], k: ['', 'いちまい', 'にまい', 'さんまい'] },
    hon: { jp: ['', '一本', '二本', '三本'], k: ['', 'いっぽん', 'にほん', 'さんぼん'] },
    zen: { jp: ['', '一膳', '二膳', '三膳'], k: ['', 'いちぜん', 'にぜん', 'さんぜん'] },
    soku: { jp: ['', '一足', '二足', '三足'], k: ['', 'いっそく', 'にそく', 'さんぞく'] },
    nin: { jp: ['', '一人前', '二人前', '三人前'], k: ['', 'いちにんまえ', 'ににんまえ', 'さんにんまえ'] }
  };
  function yomi(n) {
    const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
    let s = '';
    const man = Math.floor(n / 10000), sen = Math.floor(n / 1000) % 10, hy = Math.floor(n / 100) % 10, ju = Math.floor(n / 10) % 10, ic = n % 10;
    if (man) s += D[man] + 'まん';
    if (sen) s += sen === 1 ? 'せん' : sen === 3 ? 'さんぜん' : sen === 8 ? 'はっせん' : D[sen] + 'せん';
    if (hy) s += hy === 1 ? 'ひゃく' : hy === 3 ? 'さんびゃく' : hy === 6 ? 'ろっぴゃく' : hy === 8 ? 'はっぴゃく' : D[hy] + 'ひゃく';
    if (ju) s += ju === 1 ? 'じゅう' : D[ju] + 'じゅう';
    if (ic) s += ic === 4 ? 'よ' : D[ic];
    return (s || 'ぜろ') + 'えん';
  }
  const yen = n => '¥' + n.toLocaleString('en-US');
  const cOf = (m, it) => it.c || m.c || 'tsu';
  const hasQty = m => m.type === 'order' || m.type === 'ticket' || m.type === 'request';
  const ASK_TAILS = [
    { jp: 'はどこですか', kana: 'はどこですか', fb: '「どこですか」是問在哪裡' },
    { jp: 'は何ですか', kana: 'はなんですか', fb: '「何ですか」是問「這是什麼」' },
    { jp: 'をください', kana: 'をください', fb: '「ください」是「請給我」，這裡是要詢問' },
    { jp: 'はいくらですか', kana: 'はいくらですか', fb: '「いくらですか」是問價錢' }
  ];
  const PREF_WRONG = [
    { jp: 'をください', kana: 'をください', fb: '說明做法／需求要用「〜でお願いします」' },
    { jp: 'はどこですか', kana: 'はどこですか', fb: '這是問在哪裡' },
    { jp: 'はいくらですか', kana: 'はいくらですか', fb: '這是問價錢' }
  ];

  // 產生正確句與干擾句
  // 說出口的品名：去掉括號註記（例：生ビール（中）→ 生ビール），或用資料裡的 sp／spk
  const spJ = it => it.sp || String(it.jp).replace(/（[^）]*）/g, '');
  const spK = it => it.spk || String(it.kana).replace(/（[^）]*）/g, '').replace(/\s.*$/, '');
  function build(m, t, o) {
    o = o || {};
    const x = Object.assign({}, t[0], o.item ? { it: o.item } : {}, o.qty ? { n: o.qty } : {});
    const tt = [x].concat(t.slice(1));
    const q = (y, f) => CNT[cOf(m, y.it)][f][y.n];
    if (m.type === 'ticket') return { jp: `${x.it.jp}${o.kara ? 'から' : 'まで'}、大人${q(x, 'jp')}ください`, kana: `${x.it.kana}${o.kara ? 'から' : 'まで'}、おとな${q(x, 'k')}ください` };
    if (m.type === 'ask') { const tl = o.tail || m.tail || ASK_TAILS[0]; return { jp: `すみません、${x.it.jp}${tl.jp}`, kana: `すみません、${x.it.kana}${tl.kana}` }; }
    if (m.type === 'pref') { const tl = o.tail || m.tpl || { jp: 'でお願いします', kana: 'でおねがいします' }; return { jp: `${x.it.jp}${tl.jp}`, kana: `${x.it.kana}${tl.kana}` }; }
    const pre = m.pre || '', end = o.give ? 'あげます' : m.type === 'request' ? 'お願いします' : 'ください', endK = o.give ? 'あげます' : m.type === 'request' ? 'おねがいします' : 'ください';
    const pr = y => (y.it.np ? '' : pre);
    const sm = m.type === 'request' ? 'すみません、' : '';   // 主動拜託店員時先說「すみません」   // np：不加「もう」（例：充電器是借，不是「再一個」）
    return { jp: sm + tt.map(y => `${spJ(y.it)}を${pr(y)}${q(y, 'jp')}`).join('と、') + end, kana: sm + tt.map(y => `${spK(y.it)}を${pr(y)}${q(y, 'k')}`).join('と、') + endK };
  }
  function sayChoices(m, t) {
    const out = [Object.assign(build(m, t), { correct: true })];
    const other = App.shuffle(m.items.filter(i => !t.some(x => x.it === i)))[0];
    const add = (o, fb) => { const s = build(m, t, o); if (!out.some(z => z.jp === s.jp)) out.push(Object.assign(s, { fb })); };
    if (m.type === 'ask') {
      // 有自訂句尾（問月台、問時間）時，「〜はどこですか」也說得通，不能當錯誤選項
      const pool = m.tail ? App.sample(ASK_TAILS.filter(a => a.jp !== 'はどこですか'), 2) : ASK_TAILS.filter(a => a.jp !== ASK_TAILS[0].jp);
      pool.forEach(a => add({ tail: a }, a.fb));
      if (m.tail && other) add({ item: other }, `問錯地方了：${other.jp} 是「${other.zh}」`);
    } else if (m.type === 'pref') {
      (m.wrong || PREF_WRONG).forEach(w => add({ tail: w }, w.fb));
      if (other) add({ item: other }, `說錯了：${other.jp} 是「${other.zh}」`);
    } else {
      const n0 = t[0].n;
      add({ qty: n0 === 1 ? 2 : n0 - 1 }, `數量不對，要的是 ${CNT[cOf(m, t[0].it)].jp[n0]}`);
      if (m.type === 'ticket') add({ kara: true }, '「から」是「從…出發」，到某地要用「まで」');
      else add({ give: true }, '「あげます」是「我給你」，要東西要說「ください／お願いします」');
      if (other) add({ item: other }, `品項錯了：${other.jp} 是「${other.zh}」`);
    }
    return App.shuffle(out.slice(0, 4));
  }

  const FRIENDS = [['🧑', '阿哲'], ['👩', '小美'], ['👴', '阿公'], ['👧', '妹妹'], ['🧔', '大雄'], ['👩‍🦰', '小琪'], ['👵', '阿嬤'], ['🧑‍🦱', '阿凱']];
  const GOPT = { relax: false, zh: false };
  const hasKanji = s => /[一-鿿]/.test(s || '');
  const QRT = t => t === 'order' || t === 'ticket' || t === 'request';
  const GUIDE = {
    qr: ['👀 看旅伴的點單：上面是<b>菜單上的日文品名 ×數量</b>', '👆 在菜單找到品項，用 <b>＋／−</b> 調數量，確認底部購物車後按「注文する」', '🗣️ 再選（或說）出正確的日文，最後聽懂店員的回答'],
    qa: ['👂 先聽店員問什麼（點 🔊 可以重聽）', '👀 看旅伴想怎麼做', '🗣️ 選出正確的日文回答，再聽店員怎麼回'],
    kenbaiki: ['💴 先投錢：按 ¥1000／¥500／¥100', '🎫 錢夠的按鈕會亮，照旅伴的點單按下去買餐券', '💰 買完按「おつり」找零，答出找回多少錢'],
    okonomi: ['👀 看旅伴要的「麵硬度・湯濃度・雞油量」', '👆 三排各選一個，按「決定」', '🗣️ 用日文一口氣說出來，再聽師傅確認'],
    pick: ['👀 看旅伴想做什麼', '👆 在看板上點對的項目，按「就是這個」', '🗣️ 選出正確的日文，再聽對方回答']
  };
  const gKind = m => QRT(m.type) ? 'qr' : GUIDE[m.type] ? m.type : 'pick';

  function renderMenu(el, params) {
    params = params || {};
    { const host = el; el = document.createElement('div'); host.appendChild(el); }   // 換頁時舊計時器能偵測到自己已脫離畫面
    const id = params.id, mi = +params.m || 0, ms = menusOf(id), m = ms[mi], sc = findScene(id);
    if (!m || !sc) { el.innerHTML = `<div class="panel center"><h2>🧭 找不到這個情境</h2><button class="btn primary" id="mB">回首頁</button></div>`; el.querySelector('#mB').onclick = () => App.go('practice-map'); return; }
    const LV = params.lv || '', TRIP = !!params.trip;
    // 依程度調整：耐心秒數、中文看板、讀音提示、小意外次數
    const DIFF = { N5: { pat: 60, zh: true, aid: true, inc: 1 }, N4: { pat: 50, zh: false, aid: true, inc: 1 }, N3: { pat: 40, zh: false, aid: false, inc: 2 }, N2: { pat: 32, zh: false, aid: false, inc: 2 }, N1: { pat: 26, zh: false, aid: false, inc: 3 } }[LV] || { pat: 45, zh: GOPT.zh, aid: true, inc: 1 };
    if (LV) GOPT.zh = DIFF.zh;
    const back = TRIP ? { label: '📍 回站內流程', route: 'trip-stop' } : { label: '🗺️ 關卡地圖', route: 'stage', params: { id } };
    const key = id + ':m' + mi + (LV ? '@' + LV : ''), G_ = window.Game || { sfx() { }, floatText() { }, burst() { }, vibrate() { } };
    const N = m.type === 'qa' && m.seq ? Math.min(8, m.qs.length) : 5, PAT = DIFF.pat;   // 旅伴人數；依序對答的情境＝每個流程一位
    // 真實小意外：每局必出一次（店員講太快要請他重說／品項賣完）
    const INCS = App.sample([...Array(N).keys()], Math.min(N, DIFF.inc)).map(r => ({ r, type: m.type === 'order' && Math.random() < 0.5 ? 'soldout' : 'fast', done: false }));
    const CONF = [{ jp: 'え？', kana: 'え？', zh: '咦？' }, { jp: 'すみません、もう一度お願いできますか。', kana: 'すみません、もういちどおねがいできますか', zh: '不好意思，可以再說一次嗎？' }, { jp: '…はい？', kana: 'はい？', zh: '……什麼？' }];
    const isInc = t => INCS.find(x => !x.done && x.r === S.r && x.type === t) || null;
    const S = { r: 0, hearts: 3, score: 0, combo: 0, best: 0, ok: 0, tot: 0, wrong: [], pat: PAT, timer: null, busy: false };
    const friends = App.sample(FRIENDS, N);
    el.innerHTML = `<div class="g-hud">
        <button class="btn sm" id="gX">✕</button>
        <div class="g-ttl"><b>${esc(m.icon || '')} ${esc(m.name)}</b><small>${esc(sc.name)}・${esc(m.board)}</small></div>
        <button class="btn sm" id="gHelp" title="怎麼玩">❓</button>
        <div class="g-st"><span id="gH"></span><span id="gS">💯 0</span></div></div>
      <div class="g-queue" id="gQ"></div>
      <div class="g-pat"><span>⏳</span><div class="g-patb"><div id="gP"></div></div><span id="gC"></span></div>
      <div class="g-opt"><label class="t-aidsw"><input type="checkbox" id="gRelax"${GOPT.relax ? ' checked' : ''}> 🐢 慢慢來（不計時）</label><label class="t-aidsw"><input type="checkbox" id="gZh"${GOPT.zh ? ' checked' : ''}> 看板顯示中文</label></div>
      <div class="panel${GOPT.zh ? '' : ' m-noz'}${DIFF.aid ? '' : ' t-noaid'}" id="mPane" style="margin-top:6px"></div>`;
    const $ = s => el.querySelector(s), pane = $('#mPane');
    $('#gX').onclick = () => App.modal('<h2>要離開嗎？</h2><p>這一關的進度不會保存。</p>', [{ label: '繼續玩', cls: 'primary' }, { label: '離開', onClick: () => App.go(back.route, back.params) }]);
    $('#gRelax').onchange = e => { GOPT.relax = e.target.checked; hud(); };
    $('#gZh').onchange = e => { GOPT.zh = e.target.checked; pane.classList.toggle('m-noz', !GOPT.zh); };
    $('#gHelp').onclick = () => guide(true);
    function guide(force) {
      if (!App.state.guide) App.state.guide = {};
      if (!force && App.state.guide[key]) return;
      App.state.guide[key] = 1; App.save();
      App.modal(`<h2 style="margin:.2em 0">❓ 怎麼玩：${esc(m.name)}</h2><ol class="g-steps">${GUIDE[gKind(m)].map(s => `<li>${s}</li>`).join('')}</ol>${m.note ? `<p class="g-note">💡 ${esc(m.note)}</p>` : ''}`, [{ label: '開始！', cls: 'primary' }]);
    }
    function hud() {
      $('#gH').innerHTML = '❤️'.repeat(S.hearts) + '🖤'.repeat(3 - S.hearts);
      $('#gS').textContent = '💯 ' + S.score;
      $('#gC').innerHTML = S.combo >= 2 ? `<span class="g-combo">🔥${S.combo}</span>` : '';
      const p = Math.max(0, S.pat / PAT * 100), pb = $('#gP');
      pb.style.width = (GOPT.relax ? 100 : p) + '%'; pb.className = GOPT.relax ? 'relax' : p < 25 ? 'low' : p < 55 ? 'mid' : '';
      $('#gQ').innerHTML = friends.map((f, i) => `<div class="g-f${i === S.r ? ' cur' : i < S.r ? ' done' : ''}"><span>${f[0]}</span><small>${i < S.r ? '✓' : f[1]}</small></div>`).join('');
    }
    const stopT = () => { clearInterval(S.timer); S.timer = null; };
    const startT = () => {
      stopT();
      S.timer = setInterval(() => {
        if (!el.isConnected) return stopT();
        if (GOPT.relax || S.busy || document.querySelector('.modal-bg')) return;
        S.pat -= 0.2; hud();
        if (S.pat <= 0) { stopT(); timeout(); }
      }, 200);
    };
    const addWrong = it => { Tracker.add(it, true); if (!S.wrong.some(w => w.id === it.id)) S.wrong.push(it); };
    const gain = (anchor, base) => {
      S.combo++; S.best = Math.max(S.best, S.combo); S.ok++; S.tot++;
      const pts = Math.round(base * (1 + Math.min(S.combo - 1, 5) * 0.2));
      S.score += pts; hud();
      if (anchor) { G_.floatText(anchor, `+${pts}${S.combo >= 3 ? ' 🔥' : ''}`); G_.burst(anchor, 10); }
      if (S.combo >= 3 && S.combo % 3 === 0) { App.toast(`🔥 ${S.combo} 連擊！`, 'ok'); G_.sfx('combo'); }
    };
    const soso = () => { S.tot++; S.combo = 0; hud(); };
    const miss = anchor => {
      S.combo = 0; S.tot++; S.hearts--; hud();
      const h = $('#gH'); h.classList.remove('g-hit'); void h.offsetWidth; h.classList.add('g-hit');
      if (anchor) G_.floatText(anchor, '💔', true);
      G_.sfx('hurt');
      if (S.hearts <= 0) { stopT(); setTimeout(() => finish(false), 600); return true; }
      return false;
    };
    const npc = (host, line, blur) => {
      const b = document.createElement('div'); b.className = 'bubble npc';
      b.innerHTML = `<div class="who">${esc(m.npc.emoji)} ${esc(m.npc.who)}</div><div class="j jp" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span>${esc(line.jp)}</span><button class="speak">🔊</button></div>${line.kana && line.kana !== line.jp ? `<div class="t-aid jp">${esc(line.kana)}</div>` : ''}${line.zh && !blur ? `<div class="t-aid">🀄 ${esc(line.zh)}</div>` : ''}`;
      b.querySelector('.speak').onclick = () => App.speak(line.kana || line.jp);
      if (blur) b.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = 'blur(7px)');
      host.appendChild(b); App.speak(line.kana || line.jp); return b;
    };
    const meSay = (jp) => { const me = document.createElement('div'); me.className = 'bubble me'; me.innerHTML = `<div class="who">🧳 我</div><div class="j jp">${esc(jp)}</div>`; pane.querySelector('#mChat').appendChild(me); };
    const react = (txt, ok) => { const a = pane.querySelector('.g-ask'); if (!a) return; let r = a.querySelector('.g-react'); if (!r) { r = document.createElement('div'); r.className = 'g-react'; a.querySelector('.g-say').appendChild(r); } r.style.color = ok ? 'var(--acc-d)' : 'var(--pri)'; r.textContent = `💬 ${friends[S.r][1]}：「${txt}」`; };
    const YAY = ['讚啦！', '謝啦！', '好耶～', '你好強！'];
    const friendBox = inner => `<div class="g-ask${S.r === 0 ? ' g-first' : ''}"><div class="g-av">${friends[S.r][0]}</div><div class="g-say"><small>${esc(friends[S.r][1])}：</small>${inner}</div>${S.r === 0 ? '<span class="g-arrow">⬅ 先看這裡</span>' : ''}</div>`;
    const nextBtn = fb => { fb.innerHTML += `<button class="btn primary" id="mNx">${S.r + 1 >= N ? '看結果 🏁' : '下一位旅伴 ➜'}</button>`; fb.querySelector('#mNx').onclick = next; };
    function timeout() {
      App.toast(`😩 ${friends[S.r][1]}：「好餓喔…我先走了」`);
      if (miss($('#gQ .g-f.cur'))) return;
      setTimeout(next, 900);
    }
    function next() { S.r++; round(); }

    function round() {
      if (S.r >= N) return finish(true);
      S.pat = PAT; S.busy = false; hud();
      if (m.type === 'qa') qaRound();
      else if (m.type === 'kenbaiki') kenRound();
      else if (m.type === 'okonomi') okoRound();
      else if (QRT(m.type)) qrRound();
      else pickRound();
      startT();
    }

    /* ---- QR 平板點餐（order／ticket／request）：＋／− 數量、購物車、注文する ---- */
    function qrRound() {
      const nItems = m.type === 'order' ? Math.min(m.items.length, (S.r >= 2 ? 2 : 1) + (m.tabs && S.r >= 3 ? 1 : 0)) : 1;
      const maxN = m.type === 'request' ? 2 : 3;
      const task = App.sample(m.items, nItems).map(it => ({ it, n: Math.max(it.min || 1, 1 + (Math.random() * maxN | 0)) }));
      const single = m.type !== 'order';
      const qty = {};
      let tab = m.tabs ? m.tabs[0] : null, tries = 0;
      pane.innerHTML = friendBox(`「${esc(m.verb || '幫我點')}」<ul class="m-list">${task.map(t => `<li><b class="jp">${esc(t.it.jp)}</b> ×${t.n}<span class="z">（${esc(t.it.zh)}）</span></li>`).join('')}</ul>`)
        + `<div class="chat" id="mChat"></div><div class="m-menu" id="mMenu"></div><div class="m-cart" id="mCart"></div><div class="feedback" id="mFb"></div>`;
      if (S.r === 0 && m.greet) npc(pane.querySelector('#mChat'), m.greet);
      const menu = pane.querySelector('#mMenu'), cart = pane.querySelector('#mCart'), fb = pane.querySelector('#mFb');
      const sel = () => Object.keys(qty).filter(k => qty[k]).map(k => ({ it: m.items[k], n: qty[k] }));
      function drawMenu() {
        const list = m.items.map((it, i) => ({ it, i })).filter(x => !tab || x.it.cat === tab);
        menu.innerHTML = `<div class="m-head">${esc(m.board)}</div>
          ${m.tabs ? `<div class="m-tabs">${m.tabs.map(t => `<button data-t="${esc(t)}" class="${t === tab ? 'on' : ''}">${esc(t)}${m.items.some((it, i) => it.cat === t && qty[i]) ? ' •' : ''}</button>`).join('')}</div>` : ''}
          <div class="m-rows">${list.map(({ it, i }) => `<div class="m-row${qty[i] ? ' sel' : ''}">
            <div class="m-nm">${m.type === 'request' && it.emoji ? `<span class="m-e">${esc(it.emoji)}</span>` : ''}<b class="jp">${esc(it.jp)}</b>${hasKanji(it.jp) ? `<small class="jp">${esc(it.kana)}</small>` : ''}<small class="z">${esc(it.zh)}</small></div>
            ${it.price ? `<div class="m-pr">${it.tx ? `${yen(it.tx)}<small>（税込${yen(it.price)}）</small>` : yen(it.price)}${(it.min || 1) > 1 ? '<small>二本から</small>' : m.items.some(x => x.min > 1) ? '<small>一本OK</small>' : ''}</div>` : ''}
            <div class="m-q"><button data-d="-1" data-i="${i}" aria-label="減少">−</button><span>${qty[i] || 0}</span><button data-d="1" data-i="${i}" aria-label="增加">＋</button></div></div>`).join('')}</div>`;
        menu.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; drawMenu(); });
        menu.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
          const i = +b.dataset.i, d = +b.dataset.d;
          if (single && d > 0) Object.keys(qty).forEach(k => { if (+k !== i) qty[k] = 0; });
          qty[i] = Math.max(0, Math.min(5, (qty[i] || 0) + d));
          if (d > 0) App.speak(m.items[i].kana || m.items[i].jp);
          drawMenu(); drawCart();
        });
      }
      function drawCart() {
        const s = sel(), sub = s.reduce((a, x) => a + (x.it.price || 0) * x.n, 0);
        cart.innerHTML = s.length
          ? `<div class="m-cl">${s.map(x => `<span class="chip jp">${esc(x.it.jp)} ×${x.n}</span>`).join('')}</div><div class="m-cb">${sub ? `<span>小計 <b>${yen(sub)}</b></span>` : '<span></span>'}<button class="btn primary" id="mOk">${m.type === 'order' ? '注文する' : m.type === 'ticket' ? '購入する' : '決定'}</button></div>`
          : '<div class="muted center" style="font-size:.85em">🛒 用 ＋／− 選品項和數量</div>';
        const ok = cart.querySelector('#mOk'); if (ok) ok.onclick = () => submit(ok);
      }
      function submit(btn) {
        const s = sel();
        const under = s.find(x => x.n < (x.it.min || 1));
        if (under) {   // 店家規定：各種二本から
          npc(pane.querySelector('#mChat'), { jp: `すみません、${under.it.jp}は二本からになります。`, kana: `すみません、${under.it.kana}はにほんからになります`, zh: `不好意思，${under.it.zh}要兩串起點。` });
          react('啊，這家每種要點兩串起跳'); fb.innerHTML = ''; return;
        }
        const same = s.length === task.length && task.every(t => s.some(x => x.it === t.it));
        if (same && task.every(t => s.some(x => x.it === t.it && x.n === t.n))) {
          G_.sfx('ok');
          if (!tries) gain(btn, 100); else soso();
          react(App.sample(YAY, 1)[0], true);
          menu.remove(); cart.remove(); fb.innerHTML = '';
          return say(task);
        }
        if (same) { react('欸，數量不對啦～'); fb.innerHTML = ''; G_.sfx('ng'); return; }
        tries++;
        task.forEach(t => addWrong(App.wordItem(t.it, sc.name, 'word')));
        if (tries === 1 && miss(btn)) return;   // 每一步只在第一次錯時扣心
        react(tries >= 2 ? `欸我要的是 ${task.map(t => t.it.jp + (m.tabs ? `（在「${t.it.cat}」）` : '')).join('、')} 啦` : '欸，不是這個啦…');
        fb.innerHTML = '';
      }
      drawMenu(); drawCart();
    }

    /* ---- 看板單選（ask／pref） ---- */
    function pickRound() {
      const task = App.sample(m.items, 1).map(it => ({ it, n: 1 }));
      const verb = m.verb || { ask: '幫我問', pref: '幫我說要' }[m.type] || '幫我';
      let pick = null, tries = 0;
      pane.innerHTML = friendBox(`「${esc(verb)} <b>${esc(task[0].it.zh)}</b>！」`)
        + `<div class="chat" id="mChat"></div><div class="m-board"><h3>${esc(m.board)}</h3><div class="m-items">${m.items.map((it, i) => `<button class="m-it" data-i="${i}">
          <div class="e">${esc(it.emoji || '')}</div><div class="j jp">${esc(it.jp)}</div>${it.kana !== it.jp ? `<div class="k jp">${esc(it.kana)}</div>` : ''}<div class="z">${esc(it.zh)}</div></button>`).join('')}</div></div>
        <div class="feedback" id="mFb"></div><button class="btn primary block" id="mOk">✅ 就是這個！</button>`;
      npc(pane.querySelector('#mChat'), m.greet);
      pane.querySelectorAll('.m-it').forEach(b => b.onclick = () => {
        pick = +b.dataset.i; pane.querySelectorAll('.m-it').forEach(x => x.classList.toggle('sel', x === b));
        App.speak(m.items[pick].kana || m.items[pick].jp);
      });
      pane.querySelector('#mOk').onclick = () => {
        const btn = pane.querySelector('#mOk'), fb = pane.querySelector('#mFb');
        if (pick == null) return App.toast('先點看板上的項目喔！');
        if (m.items[pick] !== task[0].it) {
          tries++; addWrong(App.wordItem(task[0].it, sc.name, 'word'));
          if (tries === 1 && miss(btn)) return;
          react(tries >= 2 ? `欸我要的是「${task[0].it.jp}」啦` : '欸，不是這個啦…'); fb.innerHTML = '';
          return;
        }
        G_.sfx('ok'); if (!tries) gain(btn, 100); else soso(); react(App.sample(YAY, 1)[0], true);
        pane.querySelectorAll('.m-board,#mOk').forEach(x => x.remove()); fb.innerHTML = '';
        say(task);
      };
    }

    /* ---- 共用：選出（或說出）正確的日文 ---- */
    function sayStep(cs, trackIt, after, repeatLine) {
      const fb = pane.querySelector('#mFb'); fb.innerHTML = '';
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">用日文跟${esc(m.npc.who)}說：</div>${repeatLine ? '<button class="btn sm primary g-rep">🙏 もう一度お願いします（請再說一次）</button>' : ''}<div class="t-micbox"></div><div class="choices t-opts"></div>`;
      pane.insertBefore(box, fb);
      const rep = box.querySelector('.g-rep');
      if (rep) rep.onclick = () => {
        rep.remove(); meSay('もう一度お願いします'); App.speak('もういちどおねがいします'); S.score += 30; hud();
        setTimeout(() => { if (!el.isConnected) return; const b = npc(pane.querySelector('#mChat'), repeatLine); b.querySelector('.speak').onclick = () => App.speak(repeatLine.kana || repeatLine.jp, 0.7); App.speak(repeatLine.kana || repeatLine.jp, 0.7); App.toast('👍 聽不清楚就這樣說，店員會放慢再講一次'); }, 900);
      };
      const opBox = box.querySelector('.t-opts');
      let missed = false, done = false;
      cs.forEach(c => {
        const b = document.createElement('button'); b.className = 'choice';
        b.innerHTML = `<span class="jp">${esc(c.jp)}</span>${c.kana && c.kana !== c.jp ? `<span class="t-aid jp" style="display:block">${esc(c.kana)}</span>` : ''}`;
        c._btn = b;
        b.onclick = () => {
          if (done || b.disabled) return;
          if (c.correct) {
            done = true; S.busy = true; b.classList.add('ok'); opBox.querySelectorAll('.choice').forEach(x => x.disabled = true);
            fb.innerHTML = '';
            react(missed ? '這樣就通了！' : App.sample(YAY, 1)[0], true);
            if (!missed) gain(b, 150); else soso();
            meSay(c.jp); App.speak(c.kana || c.jp);
            setTimeout(() => { if (el.isConnected) { S.busy = false; box.remove(); after(); } }, 1000);
          } else {
            b.classList.add('ng'); b.disabled = true;
            npc(pane.querySelector('#mChat'), App.sample(CONF, 1)[0]);   // 店員的真實反應：疑惑、請你再說一次
            fb.innerHTML = `<span class="t-fb-ng">🤔</span> ${esc(c.fb || '換個說法試試')}`;
            if (!missed) { missed = true; addWrong(trackIt()); if (miss(b)) return; }
          }
        };
        opBox.appendChild(b);
      });
      const TA = T(), micBox = box.querySelector('.t-micbox');
      if (!TA.hasSR) { micBox.remove(); return; }
      micBox.innerHTML = `<div class="t-mic"><button class="t-micbtn">🎤</button><div style="text-align:left;font-size:.85em">直接用日文說出來<br><span class="muted">或點選下方句子</span></div></div><div class="t-heard muted"></div>`;
      const mb = micBox.querySelector('.t-micbtn'), heard = micBox.querySelector('.t-heard');
      mb.onclick = () => {
        if (done || !TA.listenJP || mb.classList.contains('on')) return;
        mb.classList.add('on'); heard.textContent = '🎙️ 聆聽中…'; S.busy = true;
        TA.listenJP(alts => {
          mb.classList.remove('on'); S.busy = false;
          const { best, score } = TA.bestMatch(alts, cs.filter(c => !c._btn.disabled));
          heard.innerHTML = `聽到：「<span class="jp">${esc(alts[0] || '')}</span>」${best ? `（${Math.round(score * 100)}%）` : ''}`;
          if (best && score >= 0.5) { if (best.correct) S.score += 50; best._btn.click(); } else heard.innerHTML += '<br><b style="color:var(--shu)">沒對上，再說一次或直接點選</b>';
        }, code => { mb.classList.remove('on'); S.busy = false; if (!T().hasSR) { micBox.remove(); App.toast(TA.micErr(code)); } else heard.textContent = TA.micErr(code); });
      };
    }
    function say(task) {
      const r0 = build(m, task);
      sayStep(sayChoices(m, task), () => App.wordItem({ jp: r0.jp, kana: r0.kana, zh: sc.name + '：' + task.map(t => t.it.zh + (hasQty(m) ? '×' + t.n : '')).join('、'), hint: '情境：' + m.name }, sc.name, 'phrase'), () => { const so = isInc('soldout'); if (so) { so.done = true; soldOut(task); } else answer(task); });
    }
    // 小意外：品項賣完
    function soldOut(task) {
      const x = App.sample(task, 1)[0], rest = task.filter(t => t !== x);
      npc(pane.querySelector('#mChat'), { jp: `申し訳ございません、${spJ(x.it)}は本日売り切れです。`, kana: `もうしわけございません、${spK(x.it)}はほんじつうりきれです`, zh: `非常抱歉，${x.it.zh}今天賣完了。` });
      react(`蛤～${x.it.jp}賣完了？那算了`);
      const ok = rest.length ? { jp: 'そうですか。じゃあ、それ以外でお願いします', kana: 'そうですか。じゃあ、それいがいでおねがいします' } : { jp: 'そうですか。じゃあ、大丈夫です', kana: 'そうですか。じゃあ、だいじょうぶです' };
      const cs = [Object.assign(ok, { correct: true }),
        { jp: 'じゃあ、売り切れをください', kana: 'じゃあ、うりきれをください', fb: '「売り切れ」是「賣完了」，沒辦法點喔' },
        { jp: 'いただきます', kana: 'いただきます', fb: '開動前才說這句' },
        { jp: 'いらっしゃいませ', kana: 'いらっしゃいませ', fb: '這是店員迎客說的' }];
      sayStep(App.shuffle(cs), () => App.wordItem({ jp: ok.jp, kana: ok.kana, zh: '店員說賣完了 → ' + (rest.length ? '那其他的就好' : '那就不用了'), hint: '小意外：賣完了' }, sc.name, 'phrase'), () => {
        if (rest.length) return answer(rest);
        npc(pane.querySelector('#mChat'), { jp: '申し訳ございません。またお願いします。', kana: 'もうしわけございません。またおねがいします', zh: '真的很抱歉，請再光臨。' });
        stopT(); const fb = pane.querySelector('#mFb'); fb.innerHTML = ''; nextBtn(fb);
      });
    }
    // 聽力：聽懂店員的回答
    function listenStep(line, opts, right, title) {
      const fb = pane.querySelector('#mFb');
      const fi = isInc('fast'), fast = !!fi; if (fi) fi.done = true;
      const bub = npc(pane.querySelector('#mChat'), line, true);
      if (fast) { App.speak(line.kana || line.jp, 1.45); App.toast('💨 店員講好快！'); }
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">🎧 ${esc(title)}</div>
        <div class="center">${fast ? '<button class="btn sm primary" id="mRep">🙏 もう一度お願いします</button>' : '<button class="btn sm" id="mRe">🔊 再聽一次</button>'}</div><div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}" style="font-size:1em">${esc(o)}</button>`).join('')}</div>`;
      pane.insertBefore(box, fb);
      const re = box.querySelector('#mRe'); if (re) re.onclick = () => App.speak(line.kana || line.jp);
      const rp = box.querySelector('#mRep');
      if (rp) rp.onclick = () => {
        meSay('もう一度お願いします'); S.score += 30; hud();
        rp.outerHTML = '<button class="btn sm" id="mRe2">🔊 再聽一次</button>';
        box.querySelector('#mRe2').onclick = () => App.speak(line.kana || line.jp, 0.7);
        setTimeout(() => { if (el.isConnected) { npc(pane.querySelector('#mChat'), { jp: 'はい、' + line.jp, kana: 'はい、' + (line.kana || line.jp) }, true); App.speak('はい、' + (line.kana || line.jp), 0.7); } }, 700);
      };
      box.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.k] === right;
        box.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (opts[+x.dataset.k] === right) x.classList.add('ok'); });
        bub.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = '');
        stopT();
        let over = false;
        if (ok) { gain(b, 120); const tb = Math.round(Math.max(0, S.pat) * (GOPT.relax ? 0 : 4)); if (tb) { S.score += tb; hud(); App.toast(`⏱️ 速度獎勵 +${tb}`, 'xp'); } fb.innerHTML = ''; react('謝啦！', true); }
        else { b.classList.add('ng'); addWrong(App.wordItem({ jp: line.jp, kana: line.kana, zh: right, hint: '聽力：' + m.name }, sc.name, 'phrase')); over = miss(b); react('嗯…好像不是這樣？'); fb.innerHTML = `<span class="t-fb-ng">店員說的是：${esc(right)}</span>`; }
        if (over) return;
        fb.innerHTML += `<div class="jp muted">${esc(line.jp)}${line.kana && line.kana !== line.jp ? `（${esc(line.kana)}）` : ''}</div>`;
        nextBtn(fb);
      });
    }
    const yenOpts = (total, ds) => { const set = new Set([total]); App.shuffle(ds).forEach(d => { if (set.size < 4 && total + d >= 0) set.add(total + d); }); return App.shuffle([...set].map(yen)); };
    function answer(task) {
      if (m.type === 'order' || m.type === 'ticket') {
        const total = task.reduce((s, t) => s + (t.it.price || 0) * t.n, 0);
        return listenStep({ jp: `全部で${total.toLocaleString('ja-JP')}円です。`, kana: `ぜんぶで${yomi(total)}です` }, yenOpts(total, [100, -100, 1000, -10, 10, 200, -200, 500]), yen(total), '總共多少錢？');
      }
      const rep = App.sample(m.replies || OKR, 1)[0];
      const pool = (m.replies || []).filter(r => r !== rep).map(r => r.zh).concat(['我不知道。', '今天公休。', '請再說一次。']);
      listenStep(rep, App.shuffle([rep.zh].concat(App.sample([...new Set(pool)].filter(z => z !== rep.zh), 3))), rep.zh, esc(m.npc.who) + '說了什麼？');
    }

    /* ---- 對答（qa）：店員先問，或依情境主動開口 ---- */
    function qaRound() {
      const q = m.seq ? m.qs[S.r % m.qs.length] : App.sample(m.qs, 1)[0], w = App.sample(q.wants, 1)[0];
      const line = q.npc ? App.sample(q.npc, 1)[0] : null;
      const fi = line ? isInc('fast') : null, fast = !!fi; if (fi) fi.done = true;
      pane.innerHTML = friendBox(`「${esc(w.zh)}」`) + (q.situ ? `<div class="m-situ">📍 ${esc(q.situ)}</div>` : '') + `<div class="chat" id="mChat"></div><div class="feedback" id="mFb"></div>`;
      if (line) { npc(pane.querySelector('#mChat'), line, fast); if (fast) { App.speak(line.kana || line.jp, 1.45); App.toast('💨 店員講好快！聽不清楚可以請他再說一次'); } }
      const cs = [Object.assign({}, w.ok, { correct: true })];
      const add = c => { if (!cs.some(x => x.jp === c.jp)) cs.push(c); };
      q.wants.filter(x => x !== w && x.ok.jp !== w.ok.jp).forEach(x => add(Object.assign({}, x.ok, { fb: `這是「${x.zh}」的說法` })));
      App.shuffle(q.wrong || []).forEach(add);
      // 選項不足 4 個時，補上常見但用錯場合的句子
      App.shuffle([{ jp: 'いらっしゃいませ', kana: 'いらっしゃいませ', fb: '這是店員迎客時說的' }, { jp: 'いただきます', kana: 'いただきます', fb: '開動前才說這句' },
        { jp: 'ごちそうさまでした', kana: 'ごちそうさまでした', fb: '吃完要走時才說' }, { jp: 'おやすみなさい', kana: 'おやすみなさい', fb: '這是「晚安」' }]).forEach(c => { if (cs.length < 4) add(c); });
      sayStep(App.shuffle(cs.slice(0, 4)), () => App.wordItem({ jp: w.ok.jp, kana: w.ok.kana, zh: (line ? `店員問「${line.zh}」→ ` : '') + w.zh, hint: '情境：' + m.name }, sc.name, 'phrase'), () => {
        const fb = pane.querySelector('#mFb');
        npc(pane.querySelector('#mChat'), w.reply || OKR[0]);
        stopT(); fb.innerHTML = ''; nextBtn(fb);
      }, fast ? line : null);
    }

    /* ---- 券売機：投錢 → 按按鈕買餐券 → おつり ---- */
    function kenRound() {
      const mains = m.items.filter(x => x.cat === 'main'), tops = m.items.filter(x => x.cat === 'top');
      const task = [{ it: App.sample(mains, 1)[0], n: 1 }].concat(S.r >= 1 && Math.random() < 0.7 ? [{ it: App.sample(tops, 1)[0], n: 1 }] : []);
      let bal = 0, tix = [], tries = 0;
      pane.innerHTML = friendBox(`「幫我買」<ul class="m-list">${task.map(t => `<li><b class="jp">${esc(t.it.jp)}</b> ×1<span class="z">（${esc(t.it.zh)}）</span></li>`).join('')}</ul>`)
        + `<div class="k-mac" id="kMac"><div class="k-top">券売機</div><div class="k-disp">投入金額 <b id="kBal">¥0</b></div>
          <div class="k-btns">${m.items.map((it, i) => `<button class="k-b${it.cat === 'main' ? ' main' : ''}" data-i="${i}"><span class="jp">${esc(it.jp)}</span><small class="jp">${hasKanji(it.jp) ? esc(it.kana) : ''}</small><small class="z">${esc(it.zh)}</small><b>${yen(it.price)}</b></button>`).join('')}</div>
          <div class="k-money"><button data-y="1000">💴 ¥1000</button><button data-y="500">¥500 硬幣</button><button data-y="100">¥100 硬幣</button></div>
          <div class="k-tix" id="kTix"></div><button class="btn primary block" id="kRet">💰 おつり（找零・結束購買）</button></div>
        <div class="chat" id="mChat"></div><div class="feedback" id="mFb"></div>`;
      const mac = pane.querySelector('#kMac'), fb = pane.querySelector('#mFb');
      const paint = () => {
        mac.querySelector('#kBal').textContent = yen(bal);
        mac.querySelectorAll('.k-b').forEach(b => b.classList.toggle('lit', bal >= m.items[+b.dataset.i].price));
        mac.querySelector('#kTix').innerHTML = tix.length ? '🎫 ' + tix.map(i => `<span class="chip jp">${esc(m.items[i].jp)}</span>`).join('') : '<span class="muted" style="font-size:.85em">先投錢，按鈕會亮</span>';
      };
      mac.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { bal += +b.dataset.y; G_.sfx('coin'); paint(); });
      mac.querySelectorAll('.k-b').forEach(b => b.onclick = () => {
        const it = m.items[+b.dataset.i];
        if (bal < it.price) { App.toast('💴 錢不夠，先投錢！'); return; }
        bal -= it.price; tix.push(+b.dataset.i); G_.sfx('tap'); paint();
      });
      mac.querySelector('#kRet').onclick = () => {
        const btn = mac.querySelector('#kRet');
        if (!tix.length) { if (bal) App.toast(`💰 退回 ${yen(bal)}`); bal = 0; paint(); return; }
        const got = tix.map(i => m.items[i]);
        const ok = got.length === task.length && task.every(t => got.includes(t.it));
        if (!ok) {
          tries++; task.forEach(t => addWrong(App.wordItem(t.it, sc.name, 'word')));
          bal = 0; tix = []; paint();
          if (tries === 1 && miss(btn)) return;
          react(tries >= 2 ? `欸我要的是 ${task.map(t => t.it.jp).join('＋')} 啦` : '欸，買錯了啦…');
          fb.innerHTML = '<span class="muted">🎫 按退回鈕，餐券和錢都退回來了</span>';
          return;
        }
        const change = bal;
        G_.sfx('ok'); if (!tries) gain(btn, 100); else soso(); react(App.sample(YAY, 1)[0], true);
        mac.remove(); fb.innerHTML = '';
        const box = document.createElement('div');
        box.innerHTML = `<div class="sec-t" style="margin-top:6px">💰 找回多少錢？</div><p class="center" style="margin:.2em">🎫 ${got.map(x => `<span class="chip jp">${esc(x.jp)}</span>`).join('')}</p><div class="choices">${yenOpts(change, [100, -100, 200, 500, -20, 50]).map(o => `<button class="choice" data-v="${o}">${o}</button>`).join('')}</div>`;
        pane.insertBefore(box, fb);
        box.querySelectorAll('.choice').forEach(b => b.onclick = () => {
          const right = yen(change), good = b.dataset.v === right;
          box.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (x.dataset.v === right) x.classList.add('ok'); });
          if (good) gain(b, 80); else { b.classList.add('ng'); if (miss(b)) return; }
          stopT();
          npc(pane.querySelector('#mChat'), { jp: '食券お預かりします。少々お待ちください。', kana: 'しょっけんおあずかりします。しょうしょうおまちください', zh: '收您的餐券，請稍等。' });
          fb.innerHTML = good ? '<span class="t-fb-ok">⭕ 找零正確！把餐券交給店員</span>' : `<span class="t-fb-ng">❌ 應找回 ${right}</span>`;
          nextBtn(fb);
        });
      };
      paint();
    }

    /* ---- 家系拉麵客製：麺の硬さ・味の濃さ・油の量 ---- */
    // 家系的說法：全部普通→「全部ふつう」；三項都指定→「かため、こいめ、おおめ」；只改部分→「麺かため、油おおめ」
    const combo = (p, k) => {
      const f = x => x.jp === 'ふつう';
      if (p.every(f)) return k ? 'ぜんぶふつう' : '全部ふつう';
      if (!p.some(f)) return p.map(x => k ? x.kana : x.jp).join('、');
      return p.map((x, a) => f(x) ? '' : (k ? m.axes[a].kk + x.kana : m.axes[a].key + x.jp)).filter(Boolean).join('、');
    };
    const comboJP = p => combo(p, false);
    function okoRound() {
      // 以最常見的「かため・こいめ・おおめ」為主，其餘隨機組合
      const want = Math.random() < 0.6 ? m.axes.map(ax => ax.opts[0]) : m.axes.map(ax => App.sample(ax.opts, 1)[0]);
      const chosen = m.axes.map(() => null);
      let tries = 0;
      pane.innerHTML = friendBox(`「我要 <b class="jp">${want.map((x, a) => m.axes[a].key + x.jp).join('・')}</b>」<span class="z">（${want.map(x => x.zh).join('、')}）</span>`)
        + `<div class="chat" id="mChat"></div><div class="o-board" id="oB">${m.axes.map((ax, a) => `<div class="o-row"><div class="o-name jp">${esc(ax.name)}</div><div class="o-opts">${ax.opts.map((o, j) => `<button data-a="${a}" data-j="${j}" class="jp">${esc(o.jp)}<small class="z">${esc(o.zh)}</small></button>`).join('')}</div></div>`).join('')}
          <button class="btn primary block" id="oOk">✅ 決定</button></div><div class="feedback" id="mFb"></div>`;
      npc(pane.querySelector('#mChat'), m.greet);
      const board = pane.querySelector('#oB'), fb = pane.querySelector('#mFb');
      board.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = +b.dataset.a, j = +b.dataset.j; chosen[a] = m.axes[a].opts[j];
        board.querySelectorAll(`[data-a="${a}"]`).forEach(x => x.classList.toggle('on', x === b));
        App.speak(chosen[a].kana || chosen[a].jp);
      });
      board.querySelector('#oOk').onclick = () => {
        const btn = board.querySelector('#oOk');
        if (chosen.some(x => !x)) return App.toast('三排都要選一個喔！');
        const bad = m.axes.filter((ax, a) => chosen[a] !== want[a]);
        if (bad.length) {
          tries++; addWrong(App.wordItem({ jp: comboJP(want), kana: combo(want, true), zh: want.map(x => x.zh).join('、'), hint: '家系拉麵：' + m.axes.map(a => a.name).join('・') }, sc.name, 'phrase'));
          if (tries === 1 && miss(btn)) return;
          react(`欸，${bad.map(a => a.name).join('、')}不是這個啦`); fb.innerHTML = '';
          return;
        }
        G_.sfx('ok'); if (!tries) gain(btn, 100); else soso(); react(App.sample(YAY, 1)[0], true);
        board.remove(); fb.innerHTML = '';
        // 說出來：正確句＋各換掉一項的錯誤句
        const sent = p => ({ jp: comboJP(p) + 'でお願いします', kana: combo(p, true) + 'でおねがいします' });
        const cs = [Object.assign(sent(want), { correct: true })];
        App.shuffle(m.axes.map((ax, a) => a)).forEach(a => {
          const alt = want.slice(); alt[a] = App.sample(m.axes[a].opts.filter(o => o !== want[a]), 1)[0];
          const s = sent(alt); if (!cs.some(x => x.jp === s.jp)) cs.push(Object.assign(s, { fb: `${m.axes[a].name}不對：要「${want[a].jp}」` }));
        });
        sayStep(App.shuffle(cs.slice(0, 4)), () => App.wordItem({ jp: cs[0].jp, kana: cs[0].kana, zh: want.map(x => x.zh).join('、'), hint: '家系拉麵：說出喜好' }, sc.name, 'phrase'), () => {
          const conf = p => ({ jp: `はい、${m.axes.map((ax, a) => ax.key + p[a].jp).join('、')}ですね。`, kana: `はい、${m.axes.map((ax, a) => ax.kk + p[a].kana).join('、')}ですね` });
          const zhOf = p => p.map(x => x.zh).join('、');
          const others = [];
          while (others.length < 3) { const p = m.axes.map(ax => App.sample(ax.opts, 1)[0]); const z = zhOf(p); if (z !== zhOf(want) && !others.includes(z)) others.push(z); }
          listenStep(conf(want), App.shuffle([zhOf(want)].concat(others)), zhOf(want), '師傅確認的是哪一種？');
        });
      };
    }

    function finish(alive) {
      stopT();
      const acc = S.tot ? S.ok / S.tot : 0;
      const stars = alive ? Math.max(1, Math.min(S.hearts, acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1)) : 0;
      const prevSt = sitStars(key);
      setSit(key, stars);
      const xp = stars ? [0, 10, 15, 20][stars] + (stars === 3 && prevSt < 3 ? 10 : 0) : 0;   // 依星數固定 XP；首次三星 +10
      const r = xp ? App.addXP(xp, stars === 3 && prevSt < 3 ? '情境挑戰・首次三星' : '情境挑戰') : { gained: 0 };
      if (stars) { if (!App.state.sceneDone) App.state.sceneDone = {}; App.state.sceneDone[id] = true; App.save(); }
      const nx = TRIP ? back : mi + 1 < ms.length ? { label: '下一個情境 ➜', route: 'menu', params: { id, m: mi + 1 } } : back;
      pane.innerHTML = `<div class="t-sum"><div class="t-big">${stars ? '🎉' : '💀'}</div><h3>${stars ? '任務完成！' : '旅伴們生氣了…'}</h3><p>💯 ${S.score} 分・最高 🔥${S.best} 連擊</p>
        <button class="btn" id="mAg">🔄 再玩一次</button><button class="btn primary" id="mSt">${back.label}</button></div>`;
      pane.querySelector('#mAg').onclick = () => App.go('menu', params);
      pane.querySelector('#mSt').onclick = () => App.go(back.route, back.params);
      App.showResult({
        title: (stars ? `${m.name} 完成！` : '挑戰失敗，再試一次！') + `（💯 ${S.score}）`, stars, correct: S.ok, total: S.tot, gained: r.gained, wrong: S.wrong,
        retry: () => App.go('menu', params), back: TRIP ? { label: '🗺️ 回東京地圖', route: 'home' } : back, next: stars ? nx : (TRIP ? back : null)
      });
    }
    hud(); guide(false); round();
  }
  const OKR = [{ jp: 'かしこまりました。', kana: 'かしこまりました', zh: '好的。' }];
  App.register('menu', { title: '情境挑戰', icon: '🧾', nav: false, render: renderMenu });
  window.PracticeAPI = { situations, yomi, setSit, sitStars, stageNodes, menusOf, renderHome, LEVELS, backup };
})();
