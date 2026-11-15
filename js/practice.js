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
.h-me{display:flex;align-items:center;gap:12px;padding:10px 12px;border:2px solid var(--ink);border-radius:14px;color:#f5eedc;background-color:var(--ai);background-image:var(--sgd);background-size:40px 20px;box-shadow:inset 0 0 0 3px var(--ai),inset 0 0 0 4.5px var(--kin),var(--shadow)}
.h-av{font-size:2.4em;width:62px;height:62px;flex:none;border-radius:50%;background:var(--paper);border:3px solid var(--shu);box-shadow:0 0 0 2px var(--paper);cursor:pointer;animation:float 3s ease-in-out infinite;padding:0}
.h-inf{flex:1;min-width:0}
.h-inf b{font-family:var(--serif);font-size:1.1em;color:#fff}
.h-inf .bar{margin:5px 0;border-color:var(--kin);background:rgba(0,0,0,.35)}
.h-inf small{font-size:.78em;opacity:.9}
.h-next{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0 4px;padding:12px 14px;border:2px solid #5e1c13;border-radius:14px;background:var(--shu);color:#fff;cursor:pointer;font-family:inherit;text-align:left;box-shadow:0 5px 0 #5e1c13;animation:hpulse 2s ease-in-out infinite}
.h-next:active{transform:translateY(4px);box-shadow:0 1px 0 #5e1c13}
.h-next .i{font-size:2.2em;width:54px;height:54px;flex:none;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;border:2px solid #5e1c13}
.h-next .t{flex:1;min-width:0;line-height:1.3}
.h-next small{opacity:.88;font-size:.78em;display:block}
.h-next b{font-family:var(--serif);font-size:1.2em}
.h-next .go{font-size:1.6em}
@keyframes hpulse{0%,100%{transform:none}50%{transform:scale(1.015)}}
.h-daily{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 0}
.h-daily>div{position:relative;overflow:hidden;background:var(--card);border:1.5px solid var(--ink);border-radius:8px;padding:4px 6px;font-size:.72em;line-height:1.25;display:flex;gap:4px;align-items:center}
.h-daily>div span{font-size:1.4em}
.h-daily i{position:absolute;left:0;bottom:0;height:3px;background:var(--matcha)}
.h-daily .ok{background:#e4ecd4}
.h-lv{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.h-lv button{border:2px solid var(--ink);border-radius:10px;background:var(--card);padding:6px 2px;cursor:pointer;font-family:inherit;color:var(--ink);box-shadow:0 3px 0 var(--ink);line-height:1.25}
.h-lv button b{display:block;font-family:var(--serif);font-size:1.05em}
.h-lv button small{display:block;font-size:.7em;color:var(--muted)}
.h-lv button i{font-style:normal;font-size:.68em}
.h-lv button.on{background:var(--ai);color:#f5eedc}
.h-lv button.on small{color:rgba(245,238,220,.8)}
.h-worlds{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.h-w{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 8px 10px;border:2px solid var(--ink);border-top:8px solid var(--tc);border-radius:12px;background:var(--card);cursor:pointer;font-family:inherit;color:var(--ink);box-shadow:var(--frame),3px 3px 0 var(--ink)}
.h-w:active{transform:translate(2px,2px);box-shadow:var(--frame),1px 1px 0 var(--ink)}
.h-w .ic{font-size:2.4em;line-height:1.1}
.h-w b{font-family:var(--serif);font-size:1em}
.h-w small{font-size:.72em;color:var(--muted)}
.h-w .pg{width:80%;height:6px;background:var(--paper2);border:1px solid var(--line);border-radius:3px;overflow:hidden}
.h-w .pg i{display:block;height:100%;background:var(--kin)}
.h-w .md{position:absolute;top:2px;right:4px;font-size:1.3em}
/* 場景關卡地圖 */
.p-stage{position:relative;overflow:hidden;border:2px solid var(--ink);border-radius:14px;padding:14px;color:#f5eedc;margin-bottom:8px;
  background-color:var(--tc);background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.45)),var(--sgd);background-size:auto,40px 20px;box-shadow:inset 0 0 0 3px rgba(0,0,0,0),inset 0 0 0 4.5px var(--kin),var(--shadow)}
.p-sbig{position:absolute;right:8px;top:2px;font-size:4.4em;opacity:.9;filter:drop-shadow(3px 3px 0 rgba(0,0,0,.35))}
.p-stt small{font-family:var(--serif);opacity:.85}
.p-stt h2{margin:0;color:#fff;font-size:1.6em;text-shadow:2px 2px 0 var(--ink)}
.p-sdesc{font-size:.8em;opacity:.9;max-width:72%;line-height:1.4}
.p-sbar{display:flex;align-items:center;gap:8px;margin:10px 0 6px;font-weight:900;font-family:var(--serif)}
.p-sbar .bar{flex:1;border-color:var(--kin);background:rgba(0,0,0,.35)}
.p-sbtn{display:flex;gap:4px;flex-wrap:wrap}
.p-sbtn .btn{margin:0}
.p-nsub{font-size:.66em;color:var(--muted);margin-top:1px}
/* 情境遊戲 HUD */
.g-hud{display:flex;align-items:center;gap:8px}
.g-hud .btn{margin:0}
.g-ttl{flex:1;min-width:0;line-height:1.25}
.g-ttl b{display:block;font-family:var(--serif);color:var(--ai);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-ttl small{color:var(--muted);font-size:.75em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.g-st{display:flex;flex-direction:column;align-items:flex-end;font-weight:900;font-family:var(--serif);font-size:.9em;line-height:1.3}
.g-hit{animation:qshake .4s}
.g-queue{display:flex;gap:4px;justify-content:space-between;margin:8px 0 4px;padding:6px;background:var(--ai);background-image:var(--sgd);background-size:40px 20px;border:2px solid var(--ink);border-radius:10px}
.g-f{flex:1;text-align:center;color:#f5eedc;opacity:.55;line-height:1.1}
.g-f span{font-size:1.5em;display:block}
.g-f small{font-size:.66em}
.g-f.cur{opacity:1}
.g-f.cur span{animation:float 1.2s ease-in-out infinite}
.g-f.done{opacity:.9}
.g-f.done small{color:#b9e08a;font-weight:900}
.g-pat{display:flex;align-items:center;gap:6px;font-weight:900}
.g-patb{flex:1;height:12px;border:2px solid var(--ink);border-radius:7px;background:var(--paper2);overflow:hidden}
.g-patb div{height:100%;background:var(--matcha);transition:width .2s linear}
.g-patb div.mid{background:var(--gold)}
.g-patb div.low{background:var(--shu);animation:fade .5s infinite alternate}
.g-patb div.relax{background:repeating-linear-gradient(135deg,#b9ae99 0 6px,#d6c6a2 6px 12px)}
.g-combo{background:var(--shu);color:#fff;border-radius:6px;padding:0 6px;font-size:.85em;animation:pop .25s}
.g-opt{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.g-ask{display:flex;gap:10px;align-items:center;background:var(--soft);border:2px dashed var(--shu);border-radius:12px;padding:8px 10px}
.g-av{font-size:2.2em;line-height:1;animation:float 2s ease-in-out infinite}
.g-say{flex:1;font-size:.95em}
.g-say small{color:var(--muted);display:block}
/* 菜單遊戲 */
.m-task{background:var(--soft);border:2px dashed var(--shu);border-radius:10px;padding:8px 12px;font-weight:bold}
.m-board{border:3px solid var(--ink);border-radius:10px;background:#2a1c14;padding:10px;box-shadow:inset 0 0 0 2px #6b4a2a,var(--shadow)}
.m-board h3{margin:0 0 8px;color:#f0cf73;text-align:center;font-size:1em}
.m-items{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.m-it{position:relative;background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 6px;cursor:pointer;text-align:center;font-family:inherit;color:var(--ink);box-shadow:0 3px 0 #000}
.m-it:active{transform:translateY(2px);box-shadow:0 1px 0 #000}
.m-it .e{font-size:1.5em;line-height:1}
.m-it .j{font-weight:900;font-size:1.02em;line-height:1.3}
.m-it .k{font-size:.72em;color:var(--muted)}
.m-it .z{font-size:.75em;color:var(--ai2)}
.m-it .p{font-family:var(--serif);color:var(--shu);font-weight:900;font-size:.9em}
.m-it .q{position:absolute;top:-8px;right:-6px;background:var(--shu);color:#fff;border:2px solid var(--paper);border-radius:50%;width:28px;height:28px;font-weight:900;display:flex;align-items:center;justify-content:center}
.m-it.sel{background:#fff3c4}
.m-noz .z{display:none}
.m-tray{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;min-height:30px}
/* 字卡 */
.c-card{perspective:1000px;max-width:440px;margin:8px auto;height:300px;cursor:pointer}
.c-in{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}
.c-card.flip .c-in{transform:rotateY(180deg)}
.c-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:2px solid var(--ink);border-radius:14px;background:var(--card);box-shadow:var(--frame),4px 5px 0 var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.c-back{transform:rotateY(180deg);background:var(--soft)}
.c-face .c-jp{font-size:2.3em;font-weight:900;line-height:1.35;word-break:break-all}
.c-face .c-top{position:absolute;top:10px;left:12px;right:12px;display:flex;justify-content:space-between;font-size:.8em;color:var(--muted)}
.c-ex{margin-top:8px;font-size:.9em;background:var(--card);border:1.5px solid var(--line);border-radius:8px;padding:6px 10px}
.c-rate{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:440px;margin:8px auto}
.c-rate .btn{margin:0;flex-direction:column;line-height:1.2;font-size:.9em}
.c-rate .btn.on{background:var(--ai);color:#f5eedc}
.c-nav{display:flex;justify-content:space-between;align-items:center;max-width:440px;margin:4px auto}
.c-stat{display:flex;gap:4px;flex-wrap:wrap;font-size:.8em}
@media(max-width:640px){.c-card{height:230px}.c-face .c-jp{font-size:2em}}
@media(min-width:769px){.h-worlds{grid-template-columns:repeat(4,1fr)}}
#playerChip .sv{font-size:1.05em;cursor:pointer;border:1.5px solid rgba(245,238,220,.5);border-radius:50%;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center}
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
    { id: 'L3', name: '中級', sub: '生活場景', worlds: ['konbini', 'ramen', 'directions', 'cafe', 'station', 'drugstore', 'hotel'] },
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

  /* ---------------- 首頁：選等級 → 選地點 ---------------- */
  function renderHome(el) {
    const S = App.state, lv = App.level, lo = App.LEVELS[lv - 1], hi = App.LEVELS[lv] || lo + 1000;
    if (!UI.lv) { const firstOpen = LEVELS.find(L => L.worlds.some(w => { const s = stageStars(w); return s.got < s.max; })); UI.lv = (firstOpen || LEVELS[0]).id; }
    const L = LEVELS.find(x => x.id === UI.lv);
    // 下一關：目前等級第一個還沒拿星的節點
    let nextW = null, nextN = null;
    for (const Lx of LEVELS) { for (const w of Lx.worlds) { const n = stageNodes(w).find(x => sitStars(x.key) === 0); if (n) { nextW = w; nextN = n; break; } } if (nextN) break; }
    const d = window.Game ? Game.daily() : null;
    const ss = App.saveStatus;
    el.innerHTML = `
      <div class="h-me">
        <button class="h-av" id="avBtn" title="換角色">${window.Game ? Game.avatar() : '🧳'}</button>
        <div class="h-inf"><b>Lv.${lv} ${esc(App.TITLES[lv - 1] || '')}</b>
          <div class="bar"><div style="width:${Math.min(100, (S.xp - lo) / (hi - lo) * 100)}%"></div></div>
          <small>${S.xp} XP・🔥 ${S.streak.days} 天・${ss === 'cloud' ? '☁️ 雲端存檔' : ss === 'local' ? '💾 本機存檔' : '⚠️ 無法存檔'}</small></div>
      </div>
      ${nextN ? `<button class="h-next" id="hNext"><span class="i">${esc(nextN.icon)}</span><span class="t"><small>繼續冒險・${esc(worldInfo(nextW).name)}</small><b>${esc(nextN.name)}</b></span><span class="go">▶</span></button>` : '<div class="panel center">🏆 全部制霸！</div>'}
      ${d ? `<div class="h-daily">${Game.DAILY.map(m => { const v = Math.min(m.goal, d[m.id] || 0); return `<div class="${d.claimed[m.id] ? 'ok' : ''}"><span>${d.claimed[m.id] ? '✅' : m.icon}</span><small>${esc(m.label)}</small><i style="width:${v / m.goal * 100}%"></i></div>`; }).join('')}</div>` : ''}
      <div class="sec-t">① 選等級</div>
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
    if (ss === 'none' && !UI.warned) { UI.warned = true; App.toast('⚠️ 這個環境無法自動存檔，請用「💾 備份進度」保存'); }
    el.querySelector('#reset').onclick = e => { e.preventDefault(); App.modal('<h2>確定重置？</h2><p>經驗值、星星、不會清單都會清空。</p>', [{ label: '取消' }, { label: '重置', cls: 'primary', onClick: App.resetAll }]); };
  }

  /* ---- 情境星數（存檔：App.state.sit） ---- */
  const sitStars = key => /^q:/.test(key) ? App.stars(key.slice(2)) : ((App.state.sit || {})[key] || 0);
  function setSit(key, stars) {
    if (!key) return;
    if (!App.state.sit) App.state.sit = {};
    if ((stars | 0) > (App.state.sit[key] || 0)) { App.state.sit[key] = stars | 0; App.save(); }
  }
  const menusOf = id => { const m = (window.MENUS || {})[id]; return Array.isArray(m) ? m : m ? [m] : []; };
  const TYPE_LB = { order: '點餐購物', ticket: '買票', ask: '詢問', request: '索取', pref: '說明需求' };
  // 場景的所有細分關卡
  function stageNodes(id) {
    const ch = chapOf(id);
    if (ch) return (window.QUESTS || []).filter(q => q.chapter === ch.n && q.type === 'kana').map(q => ({ key: 'q:' + q.id, icon: q.icon, name: q.title.replace(/^BOSS：/, '').replace(/：.*/, ''), sub: q.boss ? '👑 BOSS' : '⚔️ 假名戰鬥', boss: q.boss, go: () => App.go('quest', { id: q.id, free: true }) }));
    const s = findScene(id); if (!s) return [];
    const ms = menusOf(id), ds = arr(s.dialogues), out = [];
    for (let i = 0; i < Math.max(ms.length, ds.length); i++) {
      if (ms[i]) out.push({ key: id + ':m' + i, icon: ms[i].icon || '🧾', name: ms[i].name, sub: '🧾 ' + (TYPE_LB[ms[i].type] || '互動'), go: () => App.go('menu', { id, m: i }) });
      if (ds[i]) out.push({ key: id + ':d' + i, icon: '🎭', name: ds[i].title || '對話 ' + (i + 1), sub: '🎭 對話', go: () => App.go('drill', { scenes: [id], kind: 'dialog', dialog: i, sit: id + ':d' + i }) });
    }
    out.push({ key: id + ':word', icon: '📚', name: '單字特訓', sub: '📚 測驗', go: () => App.go('drill', { scenes: [id], kind: 'word', count: 10, sit: id + ':word' }) });
    out.push({ key: id + ':speak', icon: '🎤', name: '口說挑戰', sub: '🎤 用說的', go: () => App.go('drill', { scenes: [id], kind: 'speak', count: ds.length, sit: id + ':speak' }) });
    out.push({ key: id + ':boss', icon: '👑', name: '店長考驗', sub: '👑 BOSS', boss: true, go: () => App.go('drill', { scenes: [id], kind: 'mix', count: 15, sit: id + ':boss', title: s.name + '・店長考驗' }) });
    return out;
  }
  const stageStars = id => { const n = stageNodes(id); return { got: n.reduce((a, x) => a + sitStars(x.key), 0), max: n.length * 3, n: n.length }; };

  function situations(id) { App.go('stage', { id }); }

  /* ---- 路由：stage（場景關卡地圖） ---- */
  function renderStage(el, params) {
    const id = (params || {}).id, s = worldInfo(id);
    if (!s) { App.go('home'); return; }
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
        <svg class="q-svg" preserveAspectRatio="none" viewBox="0 0 100 ${nodes.length * H + 30}"><path d="${nodes.map((n, i) => `${i ? 'L' : 'M'}${X[i % X.length]} ${i * H + 46}`).join(' ')}" fill="none" stroke="#a8926a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-dasharray="2 14"/></svg>
        ${nodes.map((n, i) => {
          const k = sitStars(n.key), isCur = cur && cur.key === n.key;
          return `<div class="q-nd ${k ? 'cl' : 'open'}${n.boss ? ' boss' : ''}${isCur ? ' cur' : ''}" data-i="${i}" style="left:${X[i % X.length]}%;top:${i * H + (n.boss ? 0 : 8)}px">
            ${isCur ? `<div class="q-me">${window.Game ? Game.avatar() : '🧳'}</div>` : ''}
            <div class="q-circ">${esc(n.icon)}</div><div class="q-s">${'★'.repeat(k)}${'☆'.repeat(3 - k)}</div>
            <div class="q-lbl">${esc(n.name)}</div><div class="p-nsub">${esc(n.sub)}</div></div>`; }).join('')}
      </div>`;
    el.querySelector('#sBack').onclick = () => App.go('home');
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
  App.register('practice', { title: '練習', icon: '🎯', nav: false, render() { setTimeout(() => App.go('home'), 0); } });

  /* =========================================================
     路由：menu — 互動情境遊戲（params {id, m}）
     玩法：旅伴一個個拜託你用日文幫忙 → ①看日文菜單/看板選對 ②選或說出日文 ③聽懂對方回答
     ❤️ 3 顆（答錯或旅伴等太久會扣）、⏳ 耐心條、🔥 連擊加分、💯 分數；5 位旅伴＝1 關
     ========================================================= */
  const CNT = {
    tsu: { jp: ['', '一つ', '二つ', '三つ'], k: ['', 'ひとつ', 'ふたつ', 'みっつ'] },
    mai: { jp: ['', '一枚', '二枚', '三枚'], k: ['', 'いちまい', 'にまい', 'さんまい'] },
    hon: { jp: ['', '一本', '二本', '三本'], k: ['', 'いっぽん', 'にほん', 'さんぼん'] },
    zen: { jp: ['', '一膳', '二膳', '三膳'], k: ['', 'いちぜん', 'にぜん', 'さんぜん'] }
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
  function build(m, t, o) {
    o = o || {};
    const x = Object.assign({}, t[0], o.item ? { it: o.item } : {}, o.qty ? { n: o.qty } : {});
    const tt = [x].concat(t.slice(1));
    const q = (y, f) => CNT[cOf(m, y.it)][f][y.n];
    if (m.type === 'ticket') return { jp: `${x.it.jp}${o.kara ? 'から' : 'まで'}、大人${q(x, 'jp')}ください`, kana: `${x.it.kana}${o.kara ? 'から' : 'まで'}、おとな${q(x, 'k')}ください` };
    if (m.type === 'ask') { const tl = o.tail || m.tail || ASK_TAILS[0]; return { jp: `すみません、${x.it.jp}${tl.jp}`, kana: `すみません、${x.it.kana}${tl.kana}` }; }
    if (m.type === 'pref') { const tl = o.tail || m.tpl || { jp: 'でお願いします', kana: 'でおねがいします' }; return { jp: `${x.it.jp}${tl.jp}`, kana: `${x.it.kana}${tl.kana}` }; }
    const pre = m.pre || '', end = o.give ? 'あげます' : m.type === 'request' ? 'お願いします' : 'ください', endK = o.give ? 'あげます' : m.type === 'request' ? 'おねがいします' : 'ください';
    return { jp: tt.map(y => `${y.it.jp}を${pre}${q(y, 'jp')}`).join('と、') + end, kana: tt.map(y => `${y.it.kana}を${pre}${q(y, 'k')}`).join('と、') + endK };
  }
  function sayChoices(m, t) {
    const out = [Object.assign(build(m, t), { correct: true })];
    const other = App.shuffle(m.items.filter(i => !t.some(x => x.it === i)))[0];
    const add = (o, fb) => { const s = build(m, t, o); if (!out.some(z => z.jp === s.jp)) out.push(Object.assign(s, { fb })); };
    if (m.type === 'ask') {
      const mine = (m.tail || ASK_TAILS[0]).jp;
      ASK_TAILS.filter(a => a.jp !== mine).forEach(a => add({ tail: a }, a.fb));
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

  function renderMenu(el, params) {
    params = params || {};
    { const host = el; el = document.createElement('div'); host.appendChild(el); }   // 換頁時舊計時器能偵測到自己已脫離畫面
    const id = params.id, mi = +params.m || 0, ms = menusOf(id), m = ms[mi], sc = findScene(id);
    if (!m || !sc) { el.innerHTML = `<div class="panel center"><h2>🧭 找不到這個情境</h2><button class="btn primary" id="mB">回練習</button></div>`; el.querySelector('#mB').onclick = () => App.go('practice'); return; }
    const key = id + ':m' + mi, G_ = window.Game || { sfx() { }, floatText() { }, burst() { }, vibrate() { } };
    const N = 5, PAT = 45;   // 5 位旅伴、每位耐心 45 秒
    const S = { r: 0, hearts: 3, score: 0, combo: 0, best: 0, ok: 0, tot: 0, wrong: [], pat: PAT, timer: null, busy: false };
    const friends = App.sample(FRIENDS, N);
    el.innerHTML = `<div class="g-hud">
        <button class="btn sm" id="gX">✕</button>
        <div class="g-ttl"><b>${esc(m.icon || '')} ${esc(m.name)}</b><small>${esc(sc.name)}・${esc(m.board.replace(/^\S+\s/, ''))}</small></div>
        <div class="g-st"><span id="gH"></span><span id="gS">💯 0</span></div></div>
      <div class="g-queue" id="gQ"></div>
      <div class="g-pat"><span>⏳</span><div class="g-patb"><div id="gP"></div></div><span id="gC"></span></div>
      <div class="g-opt"><label class="t-aidsw"><input type="checkbox" id="gRelax"${GOPT.relax ? ' checked' : ''}> 🐢 慢慢來（不計時）</label><label class="t-aidsw"><input type="checkbox" id="gZh"${GOPT.zh ? ' checked' : ''}> 看板顯示中文</label></div>
      <div class="panel" id="mPane" style="margin-top:6px"></div>`;
    const $ = s => el.querySelector(s), pane = $('#mPane');
    $('#gX').onclick = () => App.modal('<h2>要離開嗎？</h2><p>這一關的進度不會保存。</p>', [{ label: '繼續玩', cls: 'primary' }, { label: '離開', onClick: () => App.go('stage', { id }) }]);
    $('#gRelax').onchange = e => { GOPT.relax = e.target.checked; hud(); };
    $('#gZh').onchange = e => { GOPT.zh = e.target.checked; const b = pane.querySelector('.m-board'); if (b) b.classList.toggle('m-noz', !GOPT.zh); };
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
      b.innerHTML = `<div class="who">${esc(m.npc.emoji)} ${esc(m.npc.who)}</div><div class="j jp" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span>${esc(line.jp)}</span><button class="speak">🔊</button></div><div class="t-aid jp">${esc(line.kana)}</div>${line.zh && !blur ? `<div class="t-aid">🀄 ${esc(line.zh)}</div>` : ''}`;
      b.querySelector('.speak').onclick = () => App.speak(line.kana || line.jp);
      if (blur) b.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = 'blur(7px)');
      host.appendChild(b); App.speak(line.kana || line.jp); return b;
    };
    function timeout() {
      App.toast(`😤 ${friends[S.r][1]} 等太久，自己走掉了…`);
      if (miss($('#gQ .g-f.cur'))) return;
      setTimeout(next, 900);
    }
    function next() { S.r++; round(); }

    function round() {
      if (S.r >= N) return finish(true);
      S.pat = PAT; S.busy = false; hud();
      const f = friends[S.r];
      const nItems = m.type === 'order' && S.r >= 2 ? 2 : 1;
      const task = App.sample(m.items, nItems).map(it => ({ it, n: hasQty(m) ? 1 + (Math.random() * (m.type === 'request' ? 2 : 3) | 0) : 1 }));
      const qty = {};
      const verb = m.verb || { order: '幫我點／買', ticket: '幫我買車票到', ask: '幫我問', request: '幫我要', pref: '幫我說要' }[m.type];
      pane.innerHTML = `<div class="g-ask"><div class="g-av">${f[0]}</div><div class="g-say"><small>${esc(f[1])}：</small>「${esc(verb)} ${task.map(t => `<b>${esc(t.it.zh)}</b>${hasQty(m) ? ' ×' + t.n : ''}`).join('、')}！」</div></div>
        <div class="chat" id="mChat"></div>
        <div class="m-board${GOPT.zh ? '' : ' m-noz'}"><h3>${esc(m.board)}</h3><div class="m-items">${m.items.map((it, i) => `<button class="m-it" data-i="${i}">
          <div class="e">${esc(it.emoji || '')}</div><div class="j jp">${esc(it.jp)}</div>${it.kana !== it.jp ? `<div class="k jp">${esc(it.kana)}</div>` : ''}<div class="z">${esc(it.zh)}</div>
          ${it.price ? `<div class="p">${yen(it.price)}</div>` : ''}<span class="q" style="display:none"></span></button>`).join('')}</div></div>
        <div class="m-tray" id="mTray"></div><div class="feedback" id="mFb"></div>
        <button class="btn primary block" id="mOk">✅ 就是這個！</button>`;
      if (S.r === 0 || m.type !== 'order') npc(pane.querySelector('#mChat'), m.greet);
      const tray = pane.querySelector('#mTray');
      const paint = () => {
        pane.querySelectorAll('.m-it').forEach(b => { const n = qty[b.dataset.i] || 0, q = b.querySelector('.q'); q.style.display = n ? '' : 'none'; q.textContent = hasQty(m) ? n : '✓'; b.classList.toggle('sel', !!n); });
        const sel = Object.keys(qty).filter(k => qty[k]);
        tray.innerHTML = sel.length ? '🧺 ' + sel.map(k => `<span class="chip jp">${esc(m.items[k].jp)}${hasQty(m) ? ' ×' + qty[k] : ''}</span>`).join('') : `<span class="muted">👆 點看板上的日文${hasQty(m) ? '（再點加數量）' : ''}</span>`;
      };
      const single = !(m.type === 'order');
      pane.querySelectorAll('.m-it').forEach(b => b.onclick = () => {
        const i = b.dataset.i;
        if (single) Object.keys(qty).forEach(k => { if (k !== i) qty[k] = 0; });
        const max = hasQty(m) ? 3 : 1;
        qty[i] = ((qty[i] || 0) + 1) % (max + 1);
        App.speak(m.items[i].kana || m.items[i].jp); paint();
      });
      paint(); startT();
      let tries = 0;
      pane.querySelector('#mOk').onclick = () => {
        const sel = Object.keys(qty).filter(k => qty[k]).map(k => ({ it: m.items[k], n: qty[k] }));
        if (!sel.length) return App.toast('先點看板上的項目喔！');
        const ok = sel.length === task.length && task.every(t => sel.some(s => s.it === t.it && s.n === t.n));
        const fb = pane.querySelector('#mFb'), btn = pane.querySelector('#mOk');
        if (!ok) {
          tries++;
          task.forEach(t => addWrong(App.wordItem(t.it, sc.name, 'word')));
          if (miss(btn)) return;
          fb.innerHTML = `<span class="t-fb-ng">❌ ${esc(f[1])}：「不是這個啦！」</span> ${tries >= 2 ? '提示：' + task.map(t => `<span class="jp">${esc(t.it.jp)}</span>${hasQty(m) ? '×' + t.n : ''}`).join('、') : '再看清楚看板上的日文' + (hasQty(m) ? '和數量' : '') + '！'}`;
          return;
        }
        G_.sfx('ok');
        if (!tries) gain(btn, 100); else { S.tot++; S.combo = 0; hud(); }
        say(task);
      };
    }
    function say(task) {
      const cs = sayChoices(m, task);
      pane.querySelector('.m-board').remove(); pane.querySelector('#mTray').remove(); pane.querySelector('#mOk').remove();
      const fb = pane.querySelector('#mFb'); fb.innerHTML = '';
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">用日文跟${esc(m.npc.who)}說：</div><div class="t-micbox"></div><div class="choices t-opts"></div>`;
      pane.insertBefore(box, fb);
      const opBox = box.querySelector('.t-opts');
      let missed = false, done = false;
      cs.forEach(c => {
        const b = document.createElement('button'); b.className = 'choice';
        b.innerHTML = `<span class="jp">${esc(c.jp)}</span><span class="t-aid jp" style="display:block">${esc(c.kana)}</span>`;
        c._btn = b;
        b.onclick = () => {
          if (done || b.disabled) return;
          if (c.correct) {
            done = true; S.busy = true; b.classList.add('ok'); opBox.querySelectorAll('.choice').forEach(x => x.disabled = true);
            fb.innerHTML = `<span class="t-fb-ok">⭕ ${missed ? '說對了！' : '完美！'}</span>`;
            if (!missed) gain(b, 150); else { S.tot++; hud(); }
            const me = document.createElement('div'); me.className = 'bubble me';
            me.innerHTML = `<div class="who">🧳 我</div><div class="j jp">${esc(c.jp)}</div>`;
            pane.querySelector('#mChat').appendChild(me); App.speak(c.kana);
            setTimeout(() => { if (el.isConnected) { S.busy = false; answer(task); } }, 1000);
          } else {
            b.classList.add('ng'); b.disabled = true;
            fb.innerHTML = `<span class="t-fb-ng">❌</span> ${esc(c.fb || '')}`;
            if (!missed) { missed = true; const r = cs.find(x => x.correct); addWrong(App.wordItem({ jp: r.jp, kana: r.kana, zh: sc.name + '：' + task.map(t => t.it.zh + (hasQty(m) ? '×' + t.n : '')).join('、'), hint: '情境：' + m.name }, sc.name, 'phrase')); if (miss(b)) return; }
          }
        };
        opBox.appendChild(b);
      });
      const TA = T(), micBox = box.querySelector('.t-micbox');
      micBox.innerHTML = `<div class="t-mic"><button class="t-micbtn"${TA.hasSR ? '' : ' disabled'}>🎤</button><div style="text-align:left;font-size:.85em">直接用日文說出來<br><span class="muted">或點選下方句子</span></div></div><div class="t-heard muted">${TA.hasSR ? '' : esc(TA.micErr ? TA.micErr('unsupported') : '')}</div>`;
      const mb = micBox.querySelector('.t-micbtn'), heard = micBox.querySelector('.t-heard');
      mb.onclick = () => {
        if (done || !TA.listenJP || mb.classList.contains('on')) return;
        mb.classList.add('on'); heard.textContent = '🎙️ 聆聽中…'; S.busy = true;
        TA.listenJP(alts => {
          mb.classList.remove('on'); S.busy = false;
          const { best, score } = TA.bestMatch(alts, cs.filter(c => !c._btn.disabled));
          heard.innerHTML = `聽到：「<span class="jp">${esc(alts[0] || '')}</span>」${best ? `（${Math.round(score * 100)}%）` : ''}`;
          if (best && score >= 0.5) { if (best.correct) S.score += 50; best._btn.click(); } else heard.innerHTML += '<br><b style="color:var(--shu)">沒對上，再說一次或直接點選</b>';
        }, code => { mb.classList.remove('on'); S.busy = false; heard.textContent = TA.micErr(code); });
      };
    }
    function answer(task) {
      const fb = pane.querySelector('#mFb');
      pane.querySelectorAll('.sec-t,.t-micbox,.t-opts').forEach(x => x.remove()); fb.innerHTML = '';
      let line, opts, right;
      if (m.type === 'order' || m.type === 'ticket') {
        const total = task.reduce((s, t) => s + (t.it.price || 0) * t.n, 0);
        line = { jp: `全部で${total.toLocaleString('ja-JP')}円です。`, kana: `ぜんぶで${yomi(total)}です` };
        const set = new Set([total]);
        App.shuffle([100, -100, 1000, -10, 10, 200, -200, 500]).forEach(d => { if (set.size < 4 && total + d > 0) set.add(total + d); });
        right = yen(total); opts = App.shuffle([...set].map(yen));
      } else {
        const rep = App.sample(m.replies || OKR, 1)[0];
        line = rep; right = rep.zh;
        const pool = (m.replies || []).filter(r => r !== rep).map(r => r.zh).concat(['我不知道。', '今天公休。', '請再說一次。']);
        opts = App.shuffle([rep.zh].concat(App.sample([...new Set(pool)].filter(z => z !== rep.zh), 3)));
      }
      const bub = npc(pane.querySelector('#mChat'), line, true);
      const box = document.createElement('div');
      box.innerHTML = `<div class="sec-t" style="margin-top:6px">🎧 ${m.type === 'order' || m.type === 'ticket' ? '總共多少錢？' : esc(m.npc.who) + '說了什麼？'}</div>
        <div class="center"><button class="btn sm" id="mRe">🔊 再聽一次</button></div><div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}" style="font-size:1em">${esc(o)}</button>`).join('')}</div>`;
      pane.insertBefore(box, fb);
      box.querySelector('#mRe').onclick = () => App.speak(line.kana);
      box.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.k] === right;
        box.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (opts[+x.dataset.k] === right) x.classList.add('ok'); });
        bub.querySelectorAll('.j span,.t-aid').forEach(x => x.style.filter = '');
        stopT();
        let over = false;
        if (ok) { gain(b, 120); const tb = Math.round(Math.max(0, S.pat) * (GOPT.relax ? 0 : 4)); if (tb) { S.score += tb; hud(); App.toast(`⏱️ 速度獎勵 +${tb}`, 'xp'); } fb.innerHTML = `<span class="t-fb-ok">⭕ 聽懂了！${esc(friends[S.r][1])}：「謝啦！」</span>`; }
        else { b.classList.add('ng'); addWrong(App.wordItem({ jp: line.jp, kana: line.kana, zh: right, hint: '聽力：' + m.name }, sc.name, 'phrase')); over = miss(b); fb.innerHTML = `<span class="t-fb-ng">❌ 正確是 ${esc(right)}</span>`; }
        if (over) return;
        fb.innerHTML += `<div class="jp muted">${esc(line.jp)}（${esc(line.kana)}）</div><button class="btn primary" id="mNx">${S.r + 1 >= N ? '看結果 🏁' : '下一位旅伴 ➜'}</button>`;
        fb.querySelector('#mNx').onclick = next;
      });
    }
    function finish(alive) {
      stopT();
      const acc = S.tot ? S.ok / S.tot : 0;
      const stars = alive ? Math.max(1, Math.min(S.hearts, acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1)) : 0;
      setSit(key, stars);
      const r = S.score ? App.addXP(Math.max(5, Math.round(S.score / 60)), '情境挑戰') : { gained: 0 };
      if (stars) { if (!App.state.sceneDone) App.state.sceneDone = {}; App.state.sceneDone[id] = true; App.save(); }
      const nx = mi + 1 < ms.length ? { label: '下一個情境 ➜', route: 'menu', params: { id, m: mi + 1 } } : { label: '🗺️ 關卡地圖', route: 'stage', params: { id } };
      pane.innerHTML = `<div class="t-sum"><div class="t-big">${stars ? '🎉' : '💀'}</div><h3>${stars ? '任務完成！' : '旅伴們生氣了…'}</h3><p>💯 ${S.score} 分・最高 🔥${S.best} 連擊</p>
        <button class="btn" id="mAg">🔄 再玩一次</button><button class="btn primary" id="mSt">🗺️ 關卡地圖</button></div>`;
      pane.querySelector('#mAg').onclick = () => App.go('menu', { id, m: mi });
      pane.querySelector('#mSt').onclick = () => App.go('stage', { id });
      App.showResult({
        title: (stars ? `${m.name} 完成！` : '挑戰失敗，再試一次！') + `（💯 ${S.score}）`, stars, correct: S.ok, total: S.tot, gained: r.gained, wrong: S.wrong,
        retry: () => App.go('menu', { id, m: mi }), back: { label: '🗺️ 關卡地圖', route: 'stage', params: { id } }, next: stars ? nx : null
      });
    }
    round();
  }
  const OKR = [{ jp: 'かしこまりました。', kana: 'かしこまりました', zh: '好的。' }];
  App.register('menu', { title: '情境挑戰', icon: '🧾', nav: false, render: renderMenu });
  window.PracticeAPI = { situations, yomi, setSit, sitStars, stageNodes, menusOf, renderHome, LEVELS, backup };
})();
