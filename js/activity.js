/* =========================================================
   統一活動框架 activity.js（window.Activity）＋路由 act
   Activity.register(type, { start(el, ctx) -> Promise<{results:[{id, grade}], meta?}>, available?() })
     grade：0 忘了／答錯、1 困難、2 記得／答對、3 簡單
   Activity.run(el, { type, items|ids, params, title, back:{route, params}, next:{label, route, params}, reward?, end? }) -> Promise<summary>
   Activity.session(el?, steps, opts?) -> 依序跑多個活動，最後只顯示一次結算（el 省略＝#main）
   summary：{ title, results:[{id, grade, type}], total, correct, rate, learned, wrong:[item], due, streak, xp, stars, quit, meta:[] }
   規則：
   - 一題一屏、頂部進度條；離開鍵只有頂列 ←（App.guardBack 攔截：作答過才問「要離開嗎？」）；活動不得呼叫 Learn.record，一律 ctx.mark(item, grade)（或回傳 results）由 runner 記錄
   - promise 在結算畫面出現時（或離開／換頁時，quit:true）resolve；runner 不自己跳頁，只有使用者按「完成」／確認離開才走 back
   - opts.back：{route, params, label} 回到該頁（上一頁就是它 → history.back，否則換掉目前這筆）；false＝不跳頁（呼叫端自己處理）；省略＝App.back()
   - 結算後（act 路由）目前這筆歷史換成 back 頁：之後按 ← 或從下一頁回來都不會重開剛做完的活動
   - Activity.card(item, {face:'front'|'back', zhFirst, ex, isNew, say, src}) → 全站統一卡片 HTML（.ac-card；🔊 是 .ac-say，呼叫端自己綁 Activity.say(item)）
   - Item 格式＝Learn.view：{id, type:'kana'|'vocab'|'phrase'|'grammar', jp, kana, zh, romaji?, ex?:[{jp,zh}], lv, source}
   依賴：App、Learn；選用 Phrase、JPText、Loan、KANA、SCENES、MIND、World、Game、Home
   ========================================================= */
(function () {
  'use strict';
  const esc = s => App.esc(s == null ? '' : String(s));
  const has = (o, k) => !!(o && typeof o[k] === 'function');
  const G = n => { try { return window[n] !== undefined ? window[n] : (0, eval)('typeof ' + n + '!=="undefined"?' + n + ':undefined'); } catch (e) { return undefined; } };
  const DEFS = {};
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  // shop 步驟需要的冒險腳本（同 index.html 的 WD 組）
  const WD = ['js/phrase.js', 'data/loan.js'].concat(SC, ['data/world/index.js', 'js/world-art.js', 'js/world.js', 'js/world-quest.js']);
  const load = src => App.loadScript(src).catch(e => { console.warn('activity load', src, e); });
  const loadAll = list => list.reduce((p, s) => p.then(() => load(s)), Promise.resolve());

  /* ---------------- Item ---------------- */
  const KJ = /[一-鿿々〆ヶ]/;
  const isKanaStr = s => /^[぀-ヿー・\s、。，！？!?「」〜～]+$/.test(s || '');
  const typeOfId = id => /^kana:/.test(id) ? 'kana' : /^p:/.test(id) ? 'phrase' : /^g:/.test(id) ? 'grammar' : 'vocab';
  const exNorm = ex => {
    if (!ex) return [];
    if (Array.isArray(ex) && typeof ex[0] === 'string') return ex[0] ? [{ jp: ex[0], zh: ex[1] || '' }] : [];
    if (Array.isArray(ex)) return ex.map(x => Array.isArray(x) ? { jp: x[0], zh: x[1] || '' } : x && x.jp ? Object.assign({ jp: x.jp, zh: x.zh || '' }, x.w ? { w: x.w } : {}, x.from ? { from: x.from } : {}, x.own ? { own: true } : {}) : null).filter(Boolean);
    if (typeof ex === 'string') return [{ jp: ex, zh: '' }];
    return ex.jp ? [Object.assign({ jp: ex.jp, zh: ex.zh || '' }, ex.w ? { w: ex.w } : {}, ex.from ? { from: ex.from } : {})] : [];
  };
  // 任何來源物件 → 統一 item
  function item(x, type) {
    if (!x) return null;
    if (typeof x === 'string') return resolve(x);
    const t = x.type && ['kana', 'vocab', 'phrase', 'grammar'].includes(x.type) ? x.type : type || (x.id ? typeOfId(Learn.idOf(x.id) || '') : x.pat ? 'grammar' : String(x.jp || '').length > 8 ? 'phrase' : 'vocab');
    const jp = String(x.jp || x.pat || '');
    if (!jp) return null;
    const id = (x.id && Learn.idOf(x.id)) || Learn.idOf({ jp, kana: x.kana }, t);
    if (!id) return null;
    const lv = String(x.lv || '').toUpperCase();
    return {
      id, type: t, jp, kana: x.kana || '', zh: x.zh || '', romaji: x.romaji || '', hint: x.hint || x.use || x.note || '',
      emoji: x.emoji || '', lv: LVS.includes(lv) ? lv : '', source: x.source || '', ex: ownEx(x).concat(exNorm(typeof x.ex === 'string' ? x.ex2 : x.ex)),
      accept: Array.isArray(x.accept) ? x.accept : null, say: x.say || ''
    };
  }
  // 使用者在閱讀／歌曲裡遇到這個詞的原句（Learn meta：ex、exz、exw、from）
  const ownEx = x => typeof x.ex === 'string' && x.ex.trim() ? [Object.assign({ jp: x.ex.trim(), zh: x.exz || '', own: true }, x.exw ? { w: x.exw } : {}, x.from ? { from: x.from } : {})] : [];
  const lexKana = r => String(r[1] || '').split(/;\s*/)[0].replace(/\s*[（(].*?[）)]/g, '').trim();
  // 從已載入的資料找回 id 的內容
  function resolve(id) {
    id = Learn.idOf(id); if (!id) return null;
    const t = typeOfId(id), rest = id.slice(id.indexOf(':') + 1);
    const v = Learn.view(id);
    let base = v && v.jp ? Object.assign({ id, type: t, jp: v.jp, kana: v.kana, zh: v.zh, romaji: v.romaji, hint: v.hint, emoji: v.emoji, lv: v.lv, source: v.source }, v.ex ? { ex: v.ex, exz: v.exz, exw: v.exw, from: v.from } : {}) : null;
    let found = null;
    if (t === 'kana') {
      const B = G('BY_HIRA'), k = B && B[rest];
      if (k) found = { id, type: 'kana', jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', emoji: k[4], source: '五十音' };
    } else if (t === 'grammar') {
      const g = window.MIND && Array.isArray(MIND.gram) ? MIND.gram.find(x => x.id === 'gram:' + rest) : null;
      if (g) found = { id, type: 'grammar', jp: g.pat, kana: '', zh: g.zh, hint: g.conn ? '接續：' + g.conn : '', lv: g.lv, ex: g.ex, source: '📐 文法 ' + g.lv };
    } else {
      const lex = (window.MIND && MIND.lex) || {};
      if (t === 'vocab') for (const lv of LVS) {
        const r = (lex[lv] || []).find(r => Learn.jp0(r[0]) === rest);
        if (r) { found = { id, type: 'vocab', jp: Learn.jp0(r[0]), kana: lexKana(r) || Learn.jp0(r[0]), zh: r[2] || '', lv, source: 'JLPT ' + lv }; break; }
      }
      if (!found) for (const s of (G('SCENES') || [])) {
        for (const k of ['vocab', 'phrases']) for (const w of (s[k] || [])) {
          if (found || !w || !w.jp) continue;
          if (Learn.idOf(w, k === 'vocab' ? 'vocab' : 'phrase') === id) found = { id, type: t, jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh || '', hint: w.use || w.hint || '', emoji: w.emoji || '', source: s.name || '' };
        }
        if (found) break;
      }
    }
    if (!found && !base) return null;
    const o = Object.assign({}, found || {}, base || {});
    if (typeof o.ex === 'string' && found && found.ex) o.ex2 = found.ex;
    if (found) for (const k in found) if (o[k] === '' || o[k] == null) o[k] = found[k];
    return item(o, t);
  }
  // ids → items（先載入需要的資料）；opt.lv：詞彙可能在哪一級詞庫
  function itemsOf(list, opt) {
    opt = opt || {};
    list = (Array.isArray(list) ? list : []).filter(Boolean);
    const ids = list.filter(x => typeof x === 'string').map(x => Learn.idOf(x)).filter(Boolean);
    const need = [];
    if (ids.some(i => /^kana:/.test(i)) && !G('BY_HIRA')) need.push('kana-data.js');
    if (ids.some(i => /^g:/.test(i)) && !(window.MIND && MIND.gram)) need.push('data/mind/grammar.js');
    const lv = String(opt.lv || '').toUpperCase();
    if (LVS.includes(lv) && ids.some(i => /^v:/.test(i)) && !(window.MIND && MIND.lex && MIND.lex[lv])) need.push('data/mind/lex-' + lv.toLowerCase() + '.js');
    return loadAll(need).then(() => {
      let miss = list.map(x => typeof x === 'string' ? resolve(x) : item(x));
      if (miss.some(x => !x) && ids.some(i => /^[vp]:/.test(i)) && !(G('SCENES') || []).length) return loadAll(SC).then(() => list.map(x => typeof x === 'string' ? resolve(x) : item(x)));
      return miss;
    }).then(a => {
      const seen = new Set();
      return a.filter(x => x && !seen.has(x.id) && seen.add(x.id));
    }).then(a => fillReading(a).then(() => a));
  }
  // 讀音：有漢字又沒讀音 → JPText 斷詞補（有未收錄漢字就不補）
  function fillReading(list) {
    const need = list.filter(it => it.type !== 'kana' && it.type !== 'grammar' && KJ.test(it.jp) && (!it.kana || KJ.test(it.kana)));
    if (!need.length) return Promise.resolve();
    return load('js/jp-text.js').then(() => window.JPText && has(JPText, 'ready') ? JPText.ready() : 0).then(() => {
      if (!window.JPText || !has(JPText, 'tokenize')) return;
      need.forEach(it => {
        try {
          let ok = true;
          const k = JPText.tokenize(it.jp).map(t => { if (t.sym || !KJ.test(t.s)) return t.s; if (t.kana && !KJ.test(t.kana)) return t.kana; ok = false; return t.s; }).join('');
          if (ok && k && k !== it.jp) it.kana = k;
        } catch (e) { }
      });
    }).catch(() => { });
  }
  const kanaOf = it => it.type === 'kana' ? (it.kana || it.jp) : (it.kana && it.kana !== it.jp ? it.kana : '');
  // 長音一律雙寫（kaado、toukyou、suuji）：資料裡的長音符號 ā ī ū ē ō 轉成 aa ii uu ee ou
  const MAC = { 'ā': 'aa', 'ī': 'ii', 'ū': 'uu', 'ē': 'ee', 'ō': 'ou', 'â': 'aa', 'î': 'ii', 'û': 'uu', 'ê': 'ee', 'ô': 'ou', 'Ā': 'Aa', 'Ī': 'Ii', 'Ū': 'Uu', 'Ē': 'Ee', 'Ō': 'Ou' };
  const unMacron = s => String(s || '').replace(/[āīūēōâîûêôĀĪŪĒŌ]/g, c => MAC[c]);
  // 全站同一套羅馬字：有讀音就用 Phrase.romaji（同店內、手冊），沒有才用資料的 romaji
  function romaji(it) {
    if (!it) return '';
    const k = it.kana || (isKanaStr(it.jp) ? it.jp : '');
    if (k && isKanaStr(k)) { try { const r = window.Phrase && has(Phrase, 'romaji') ? Phrase.romaji(k, it.type === 'kana' ? k : it.jp) : ''; if (r) return r; } catch (e) { } }
    return unMacron(it.romaji);
  }
  // 提示依 App.profile().assist（同 biz／手冊）：讀音 assist≠none；羅馬字 full 或零基礎；假名卡永遠給羅馬字
  const assist = () => { try { const p = App.profile(); return { kana: p.assist !== 'none' || p.lv === 'zero', ro: p.assist === 'full' || p.lv === 'zero' || !p.assist }; } catch (e) { return { kana: true, ro: true }; } };
  const showRo = it => (it && it.type === 'kana') || assist().ro;
  const showKana = () => assist().kana;
  const sayText = it => typeof it === 'string' ? it : it.say || (it.type === 'kana' ? (it.kana || it.jp) : it.kana && isKanaStr(it.kana) ? it.kana : it.jp);
  const say = it => { try { App.speak(sayText(it)); } catch (e) { } };
  const sfx = ok => { if (window.Game && has(Game, 'sfx')) try { Game.sfx(ok ? 'ok' : 'ng'); } catch (e) { } };

  /* ---------------- 打擊感（每個 session 一份；音效／震動交給 Game，尊重 Game.sfxOn 與 prefers-reduced-motion） ----------------
     hit(ok, target, opt)：答對＝音效（3 連起 combo 升調）＋輕震＋按鈕彈跳綠光＋粒子＋浮字 +1／🔥n＋上方連擊計數
                          答錯＝錯誤音＋雙震＋按鈕搖晃紅框＋整卡輕晃＋正解高亮，連擊歸零
     self(good, target)：字卡自評（記得＝小音效＋彈跳；忘了＝溫和的點擊音，不扣連擊） */
  const reducedMotion = () => { try { if (window.Game && has(Game, 'reduced')) return Game.reduced(); return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const gcall = (n, ...a) => { if (window.Game && has(Game, n)) try { return Game[n](...a); } catch (e) { } return undefined; };
  const later = (f, ms) => { try { return setTimeout(f, ms); } catch (e) { return 0; } };
  function bounce(el, cls) {
    if (!el || !el.classList) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    later(() => { try { el.classList.remove(cls); } catch (e) { } }, 700);
  }
  function makeFX(root) {
    let combo = 0, best = 0, hideT = 0;
    const hud = () => root && root.querySelector ? root.querySelector('.ac-combo') : null;
    const showHud = () => {
      const h = hud(); if (!h) return;
      clearTimeout(hideT);
      if (combo >= 2) {
        h.textContent = '🔥 ' + combo + ' 連擊'; h.hidden = false; h.classList.remove('out');
        bounce(h, 'pop');
      } else if (!h.hidden) {
        h.classList.add('out');
        hideT = later(() => { h.hidden = true; h.classList.remove('out'); }, 450);
      }
    };
    const cardOf = t => (t && t.closest && t.closest('.ac-stage') ? t.closest('.ac-stage').querySelector('.ac-card') : null) || (root && root.querySelector ? root.querySelector('.ac-stage .ac-card') : null);
    return {
      get combo() { return combo; }, get best() { return best; },
      hit(ok, target, opt) {
        opt = opt || {};
        if (ok) {
          combo++; if (combo > best) best = combo;
          gcall('sfx', combo >= 3 ? 'combo' : 'ok', combo); gcall('vibrate', 15);
          if (target) {
            bounce(target, 'ac-pop');
            gcall('burst', target, opt.big ? 20 : 12);
            gcall('floatText', target, combo >= 3 ? '🔥' + combo : '+1');
          }
          gcall('bump', 'ok');   // 每日任務「答對 20 題」
        } else {
          combo = 0;
          gcall('sfx', 'ng'); gcall('vibrate', [60, 40, 60]);
          if (target) { bounce(target, 'ac-wob'); gcall('floatText', target, '✗', true); }
          if (!reducedMotion()) bounce(cardOf(target), 'ac-shk');
          const right = root && root.querySelectorAll ? [...root.querySelectorAll('.ac-opts .btn.ok')] : [];
          right.forEach(b => bounce(b, 'ac-glow'));
        }
        showHud();
      },
      self(good, target) {
        if (good) { gcall('sfx', 'soft'); gcall('vibrate', 10); if (target) { bounce(target, 'ac-pop'); gcall('floatText', target, '✓'); } }
        else gcall('sfx', 'tap');
      }
    };
  }
  const profLv = () => { try { return App.profile().lv || 'zero'; } catch (e) { return 'zero'; } };
  // N3 以上：作答前不附中文
  const hideZh = it => { const l = (it && it.lv) || String(profLv()).toUpperCase(); return ['N3', 'N2', 'N1'].includes(String(l).toUpperCase()); };
  const voice = () => { try { return App.voiceOK ? App.voiceOK() : null; } catch (e) { return null; } };

  /* ---------------- 註冊 ---------------- */
  function register(type, def) { DEFS[type] = Object.assign({ type }, def); return DEFS[type]; }
  function need(type) {
    if (DEFS[type] || !/^[a-z0-9-]+$/.test(type)) return Promise.resolve(DEFS[type] || null);
    return load('js/activities/' + type + '.js').then(() => DEFS[type] || null);
  }
  function loadCSS(href) {
    if (document.querySelector('link[href$="' + href + '"]')) return Promise.resolve();
    if (window.Home && has(Home, 'loadCSS')) return Home.loadCSS(href).catch(() => { });
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
    return Promise.resolve();
  }
  const needCSS = () => loadCSS('css/activity.css');

  /* ---------------- 結算 ---------------- */
  const tomorrow = () => { const t = new Date(); t.setHours(24, 0, 0, 0); return t.getTime(); };
  function dueTomorrow() {
    if (window.Learn && Learn.dueTomorrow) return Learn.dueTomorrow();   // 全站同一個算法
    const end = new Date(); end.setHours(0, 0, 0, 0); const tmr = end.getTime() + 2 * 864e5;
    const L = App.state.learn || {}; let m = 0;
    for (const id in L) { const e = L[id]; if (e.s !== 'new' && (e.reps || e.star || e.lapses) && (e.due || 0) < tmr) m++; }
    return m;
  }
  // 純計算：results（依作答順序）→ 統計
  //   答對率：每個項目取「最後一個正式作答的活動」裡的第一次作答（同活動內重考不洗白；小考答錯就是錯）
  //   字卡自評（r.self）不佔答對；整組只有自評時（例：複習字卡）才用自評算
  //   學會：最後一次 ≥1
  function summarize(results, items) {
    const last = new Map(), formal = new Map(), self = new Map();
    (results || []).forEach(r => {
      if (!r || !r.id) return;
      last.set(r.id, r.grade);
      const st = r.step == null ? 0 : r.step;
      if (r.self) { if (!self.has(r.id)) self.set(r.id, r.grade); return; }
      const f = formal.get(r.id);
      if (!f || f.step !== st) formal.set(r.id, { step: st, g: r.grade });
    });
    const scored = formal.size ? [...formal].map(([id, f]) => [id, f.g]) : [...self];
    const total = scored.length;
    let correct = 0, learned = 0; const wrong = [];
    scored.forEach(([id, g]) => { if (g >= 1) correct++; else { const it = items && items[id]; if (it) wrong.push(it); } });
    last.forEach(g => { if (g >= 1) learned++; });
    const rate = total ? Math.round(correct / total * 100) : 0;
    const stars = !total ? 0 : rate >= 90 ? 3 : rate >= 70 ? 2 : 1;
    return { results: (results || []).map(r => Object.assign({ id: r.id, grade: r.grade, type: r.type || typeOfId(r.id) }, r.self ? { self: true } : {})), total, correct, rate, learned, wrong, stars };
  }

  /* ---------------- runner ---------------- */
  function frameHTML(title) {
    return `<section class="ac" aria-label="${esc(title)}">
      <div class="ac-top"><div class="ac-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div></div></div><span class="ac-combo" aria-hidden="true" hidden></span><span class="ac-n" aria-live="polite"></span></div>
      <p class="ac-t"></p>
      <div class="ac-stage"></div>
    </section>`;
  }
  function runSteps(el, steps, opts) {
    opts = opts || {};
    steps = (Array.isArray(steps) ? steps : []).filter(s => s && s.type);
    const title = opts.title || (steps[0] && steps[0].title) || '練習';
    return new Promise(done => {
      let closed = false;
      const all = [], recorded = new Set(), byId = {}, metas = [];
      // 同一 session 的例句只出現一次（新學卡、選選看、排句子、小考共用）
      const exUsed = new Set(), exRaw = [];
      const exKey = s => String(s || '').replace(/<[^>]*>/g, '').replace(/[\s　。．.！!？?、，,「」『』（）()〜～_＿]/g, '');
      el.innerHTML = frameHTML(title);
      const root = el.querySelector('.ac'), bar = el.querySelector('.ac-bar'), stage = el.querySelector('.ac-stage');
      const fx = makeFX(root);
      const setBar = (k, i, n) => {
        const f = steps.length ? (k + (n ? Math.min(i, n) / n : 0)) / steps.length : 1;
        bar.firstElementChild.style.width = Math.round(f * 100) + '%'; bar.setAttribute('aria-valuenow', Math.round(f * 100));
        el.querySelector('.ac-n').textContent = n ? `${Math.min(i + 1, n)}／${n}` : '';
      };
      const finish = quit => {
        if (closed) return null; closed = true;
        const s = Object.assign(summarize(all, byId), { title, quit: !!quit, meta: metas, due: dueTomorrow(), xp: 0, unfinished: unfinished || '', combo: fx.best });
        // 已學會（隔天以上還記得）用 Learn 的判定，不用本次答對數
        try { if (has(Learn, 'isLearned')) s.learned = [...new Set(all.map(r => r.id))].filter(id => Learn.isLearned(id)).length; } catch (e) { }
        if (unfinished) s.stars = 0;
        if (!quit && !unfinished && s.total) {
          if (opts.reward) { try { const r = App.reward(opts.reward, s.stars, title); s.xp = r.gained || 0; } catch (e) { console.warn(e); } }
          else {
            s.xp = 3 + s.correct * 2; App.addXP(s.xp, title);
            // 沒有 reward（五十音、複習…）也算「做完一次」：首頁應用判斷看 lastDoneAt（同 App.reward／kana-lesson）
            try { const S = App.state; if (!S.lastDone || typeof S.lastDone !== 'object') S.lastDone = {}; S.lastDone.act = App.today ? App.today() : ''; S.lastDoneAt = Date.now(); App.save(); } catch (e) { }
          }
          s.done = true; s.doneAt = Date.now();
          try { document.dispatchEvent(new CustomEvent('activitydone', { detail: { title, rate: s.rate, total: s.total } })); } catch (e) { }
        }
        s.streak = (App.streakInfo ? App.streakInfo() : { days: 0 }).days || 0;
        return s;
      };
      // 離開／完成後回到呼叫來源；上一頁就是來源 → history.back（不重複堆疊、返回不會回到活動）
      const leave = () => {
        release();
        const b = opts.back;
        if (b === false) return;
        if (b && b.route) { if (has(App, 'backTo')) App.backTo(b.route, b.params || {}); else App.go(b.route, b.params || {}); }
        else App.back();
      };
      // 頂列 ← 與手機返回鍵＝唯一離開鍵：作答過才問；換頁（onDrop）＝以未完成結束，呼叫端的 promise 一定會 resolve
      const out = () => { release(); const s = finish(true); if (s) done(s); leave(); };
      const onBack = () => {
        const q = document.querySelector('.ac-leave-q');
        if (q) { const m = q.closest('.modal-bg'); if (m) m.remove(); return; }   // 確認窗開著時再按返回＝繼續練習
        if (closed || !root.isConnected || !all.length) return out();
        App.modal('<h3 class="ac-leave-q">要離開嗎？</h3><p>已作答的進度會保存，下次可以接著練。</p>', [{ label: '繼續練習', cls: 'primary' }, { label: '離開', onClick: out }]);
      };
      const release = has(App, 'guardBack') ? App.guardBack(onBack, () => { const s = finish(true); if (s) done(s); }) : () => { };
      const record = (r, it, src) => {
        if (!r || !r.id || recorded.has(r)) return;
        recorded.add(r);
        const id = Learn.idOf(r.id) || r.id, g = Math.max(0, Math.min(3, Math.round(+r.grade || 0)));
        r.id = id; r.grade = g;
        it = it || byId[id];
        if (it) { byId[id] = it; r.type = r.type || it.type; }
        all.push(r);
        try {
          const m = it ? { jp: it.jp, kana: it.kana, romaji: it.romaji || romaji(it), zh: it.zh, hint: it.hint, emoji: it.emoji, source: it.source, lv: it.lv } : null;
          Learn.record(id, g, { src, item: m, type: it && it.type, retryAt: g ? 0 : tomorrow() });
        } catch (e) { console.warn('Learn.record', e); }
      };
      let k = 0, unfinished = '';
      const next = () => {
        if (closed || !root.isConnected) return;
        if (k >= steps.length) return end();
        const st = steps[k], src = st.title || title;
        el.querySelector('.ac-t').textContent = st.title && steps.length > 1 ? st.title : title;
        stage.innerHTML = '<p class="ac-load">載入中…</p>';
        setBar(k, 0, 0);
        Promise.all([need(st.type), st.items || st.ids ? itemsOf((st.items || []).concat(st.ids || []), Object.assign({}, st.params, { lv: (st.params && st.params.lv) || opts.lv })) : Promise.resolve([])]).then(([def, items]) => {
          if (closed || !root.isConnected) return null;
          if (!def || (has(def, 'available') && !def.available(st))) { if (def || st.type) console.info('activity skip', st.type); return null; }
          if (!items.length && def.needItems !== false) return null;
          items.forEach(it => { byId[it.id] = it; });
          const local = [];
          const ctx = {
            type: st.type, items, params: st.params || {}, title: src, root, esc,
            results: local, voice: voice(), lv: profLv(),
            mark(x, grade, extra) {
              const it = typeof x === 'string' ? (byId[Learn.idOf(x)] || null) : x;
              const id = typeof x === 'string' ? x : x && x.id;
              if (!id) return null;
              const r = Object.assign({ id, grade, step: k }, extra || {});
              local.push(r); record(r, it && it.jp ? it : null, src);
              return r;
            },
            progress: (i, n) => setBar(k, i, n),
            say, sayText, romaji, kana: kanaOf, hideZh, item, itemsOf, showRo, showKana, assist,
            // 作答回饋：sfx(ok, 按到的元素, {big}) ＝ 全套打擊感；self(good, 元素) ＝ 字卡自評的小回饋
            sfx: (ok, target, o) => fx.hit(!!ok, target, o), hit: (ok, target, o) => fx.hit(!!ok, target, o), self: (good, target) => fx.self(good, target),
            reduced: reducedMotion,
            // 例句去重：useEx(jp) 登記；exUsed(jp) 是否已出現過；dupText(text) 題目文字（含挖空）是否和已出現的例句重複
            useEx: jp => { const x = exKey(jp); if (x.length >= 4 && !exUsed.has(x)) { exUsed.add(x); exRaw.push(String(jp)); } },
            usedEx: () => exRaw.slice(),
            exUsed: jp => { const x = exKey(jp); return x.length >= 4 && exUsed.has(x); },
            dupText: text => {
              const t = String(text || '').replace(/<[^>]*>/g, ''), parts = t.split(/[（(][\s　]*[）)]|_{2,}|＿+/).map(exKey).filter(p => p.length >= 3);
              if (!parts.length) return false;
              const len = parts.join('').length;
              for (const s of exUsed) if (parts.every(p => s.includes(p)) && len >= Math.min(6, s.length * 0.5)) return true;
              return false;
            },
            alive: () => !closed && root.isConnected,
            // 作答後：答對 ms 毫秒（預設 600）自動下一題；答錯停下，在 host 底部放固定的「繼續 ▶」
            advance(ok, host, go, ms) {
              let gone = false;
              const g = () => { if (gone || closed || !root.isConnected) return; gone = true; go(); };
              if (ok) { setTimeout(g, ms || 600); return; }
              const d = document.createElement('div'); d.className = 'ac-act ac-dock';
              d.innerHTML = '<button type="button" class="btn primary block ac-go">繼續 ▶</button>';
              host.appendChild(d);
              const b = d.querySelector('.ac-go'); b.onclick = g;
              try { b.focus({ preventScroll: true }); } catch (e) { }
            }
          };
          return Promise.resolve().then(() => def.start(stage, ctx)).then(r => {
            (r && Array.isArray(r.results) ? r.results : []).forEach(x => { if (x && x.step == null) x.step = k; const it = x && x.item && typeof x.item === 'object' ? item(Object.assign({ id: x.id }, x.item)) : null; if (x) delete x.item; record(x, it, src); });
            if (r && r.meta) metas.push(Object.assign({ type: st.type }, r.meta));
            // 店家練習沒做完（done:false 或還有 meta.left）：這一步不算完成，後面的步驟不跑、不給完成星
            if (r && st.type === 'shop' && (r.done === false || (r.meta && (r.meta.done === false || (+r.meta.left || (Array.isArray(r.meta.left) && r.meta.left.length)))))) unfinished = st.title || '店家練習';
          });
        }).catch(e => { console.warn('activity', st.type, e); }).then(() => { if (unfinished) return end(); k++; next(); });
      };
      const end = () => {
        const s = finish(false); if (!s) return;
        release();
        setBar(steps.length, 0, 0);
        if (opts.route && opts.back && opts.back.route && has(App, 'replaceEntry')) App.replaceEntry(opts.back.route, opts.back.params || {});
        if (opts.end === false) { done(s); return; }
        endScreen(root, s, opts, leave);
        done(s);
      };
      next();
    });
  }
  function endScreen(root, s, opts, leave) {
    const nx = s.unfinished ? null : opts.next;
    const showStars = !s.unfinished && s.total > 0;
    root.className = 'ac ac-end' + (showStars && s.stars >= 3 ? ' ac-gold' : '');
    root.innerHTML = `<p class="ac-big" aria-hidden="true">${s.unfinished ? '🏪' : !s.total ? '🙂' : s.rate >= 70 ? '🎉' : '💪'}</p>
      <h1>${esc(s.unfinished ? `「${s.unfinished}」還沒完成，下次從這裡繼續` : s.total ? (s.rate >= 70 ? '完成了！' : '完成！再複習一次會更熟') : '這一組沒有題目')}</h1>
      <div class="ac-sum">
        <div><b>${s.correct}／${s.total}</b><small>答對</small></div>
        <div><b>${s.rate}%</b><small>答對率</small></div>
        <div><b>${s.due}</b><small>明天到期</small></div>
        <div><b>🔥${s.streak}</b><small>連勝天數</small></div>
      </div>
      ${showStars ? starsHTML(s) : ''}
      ${s.xp ? `<p class="ac-xp">+<span class="ac-xpn">${s.xp}</span> XP</p>` : ''}
      ${s.wrong.length ? `<div class="ac-wrong"><p>要再記一下（已排進複習）</p><ul>${s.wrong.slice(0, 6).map(w => `<li><span class="jp" lang="ja">${esc(w.type === 'kana' ? (w.kana || w.jp) : w.jp)}</span><small>${esc(w.type === 'kana' ? romaji(w) : w.zh)}</small></li>`).join('')}</ul></div>` : ''}
      <div class="ac-btns">
        ${nx && nx.route ? `<button type="button" class="btn primary block" id="acNext">${esc(nx.label || '下一步 ▶')}</button>` : ''}
        <button type="button" class="btn ${nx && nx.route ? '' : 'primary'} block" id="acDone">${esc((opts.back && opts.back.label) || '完成')}</button>
      </div>`;
    const b = root.querySelector('#acNext'); if (b) b.onclick = () => App.go(nx.route, nx.params || {});
    root.querySelector('#acDone').onclick = leave;
    if (showStars) endFX(root, s);
  }
  const starsHTML = s => `<div class="ac-stars" role="img" aria-label="${s.stars || 0} 顆星">${[0, 1, 2].map(i => `<span class="ac-star${i < s.stars ? ' on' : ''}" style="--i:${i}" aria-hidden="true">${i < s.stars ? '⭐' : '☆'}</span>`).join('')}</div>
      ${s.combo >= 2 && s.total ? `<p class="ac-best">🔥 最佳連擊 <b>${s.combo}</b></p>` : ''}`;
  // 給自己畫結算的頁面（例：今日課 end:false）：在 host 開頭插入星星＋最佳連擊並播放同一套演出；xpEl 給了就做 XP 跳數
  function celebrate(host, s, xpEl) {
    if (!host || !s || !s.total || s.unfinished) return;
    if (host.classList && s.stars >= 3) host.classList.add('ac-gold');
    try { host.insertAdjacentHTML('afterbegin', starsHTML(s)); } catch (e) { return; }
    if (xpEl && s.xp && !(xpEl.querySelector && xpEl.querySelector('.ac-xpn'))) xpEl.innerHTML = `+<span class="ac-xpn">${+s.xp}</span> XP`;
    endFX(host, s);
  }
  // 結算演出：星星逐顆落下＋音效 → ≥2 星煙火（3 星加金色光暈＝CSS .gold）→ XP 數字往上跳
  function endFX(root, s) {
    const red = reducedMotion(), n = s.stars || 0, gap = red ? 0 : 380;
    for (let i = 0; i < n; i++) later(() => gcall('sfx', 'star', i), 250 + i * gap);
    later(() => {
      if (n >= 2) { gcall('sfx', 'win'); gcall('vibrate', [30, 50, 30]); gcall('confetti', 30 + n * 20); }
      else if (n === 1) gcall('sfx', 'coin');
    }, 250 + n * gap);
    const x = root.querySelector ? root.querySelector('.ac-xpn') : null, to = +s.xp || 0;
    if (!x || !to || red || typeof requestAnimationFrame !== 'function') return;
    x.textContent = '0';
    const t0 = Date.now() + 250 + n * gap, dur = Math.min(900, 300 + to * 15);
    const step = () => {
      if (!x.isConnected) return;
      const f = Math.max(0, Math.min(1, (Date.now() - t0) / dur));
      x.textContent = String(Math.round(to * (1 - Math.pow(1 - f, 3))));
      if (f < 1) requestAnimationFrame(step); else { gcall('sfx', 'coin'); bounce(x.parentNode, 'pop'); }
    };
    requestAnimationFrame(step);
  }
  function run(el, opts) {
    opts = opts || {};
    return needCSS().then(() => runSteps(el, [{ type: opts.type, items: opts.items, ids: opts.ids, params: opts.params, title: opts.title }], opts));
  }
  function session(el, steps, opts) {
    if (!(el && el.nodeType === 1)) { opts = steps; steps = el; el = document.getElementById('main'); }
    return needCSS().then(() => runSteps(el, steps, opts || {}));
  }

  /* ---------------- shop：交給冒險引擎（G4 World.shopSim） ---------------- */
  register('shop', {
    needItems: false,
    start(el, ctx) {
      const go = () => window.World && has(World, 'shopSim')
        ? World.shopSim(el, { shop: ctx.params.shop, goal: ctx.params.goal, items: ctx.items })
        : null;
      const p = window.World && has(World, 'shopSim') ? Promise.resolve() : Promise.all([loadAll(WD), loadCSS('css/world.css')]);
      return p.then(() => {
        if (!ctx.alive()) return null;
        const r = go();
        if (!r) { App.toast('🏪 店家練習還沒準備好，先跳過這一步'); return null; }
        return Promise.resolve(r).then(x => Array.isArray(x) ? { results: x } : x);
      });
    }
  });

  /* ---------------- 路由 act ---------------- */
  // params：{type, ids|items, params?, title?, lv?, back?, next?, reward?} 或 {steps:[{type, ids|items, params, title}], title?, back?, next?, reward?}
  App.register('act', {
    title: '練習', icon: '▶', nav: false, navParent: 'path',
    render(el, p) {
      p = p || {};
      el.innerHTML = '<p class="ac-load">載入中…</p>';
      const steps = Array.isArray(p.steps) && p.steps.length ? p.steps : p.type ? [{ type: p.type, ids: p.ids, items: p.items, params: p.params, title: p.title }] : [];
      if (!steps.length) { el.innerHTML = '<p class="ac-load">沒有要練習的內容</p>'; return; }
      const opts = { title: p.title, back: p.back, next: p.next, reward: p.reward, lv: p.lv, route: true };
      Promise.all([needCSS(), load('js/phrase.js')]).then(() => session(el, steps, opts)).catch(e => { console.warn(e); el.innerHTML = '<p class="ac-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
    }
  });

  /* ---------------- 統一卡片（字卡、今日課、複習共用同一個樣式） ---------------- */
  // face：'front' 只看題目（問句依型別：假名「怎麼念？」、文法「什麼意思？怎麼接？」、其他「還記得意思嗎？」）；'back' 答案面
  // 答案面一律顯示讀音（「不要提示」也顯示，只在題目面隱藏）；羅馬字依 showRo；ex：例句物件／false 不顯示／省略取第一句
  const jpOfCard = it => it.type === 'kana' ? (it.kana || it.jp) : it.jp;
  function askOf(it, zhFirst) {
    if (zhFirst) return it.type === 'kana' ? '是哪個假名？' : it.type === 'grammar' ? '是哪個文法？' : '日文怎麼說？';
    return it.type === 'kana' ? '怎麼念？' : it.type === 'grammar' ? '什麼意思？怎麼接？' : '還記得意思嗎？';
  }
  function loanOf(it) {
    if (!window.Loan || it.type === 'kana' || !has(Loan, 'label')) return '';
    try { const l = Loan.label(it.jp, 1); return l ? `<p class="ac-loan">${esc(l)}</p>` : ''; } catch (e) { return ''; }
  }
  // 例句：原句裡的這個詞標粗體；使用者自己讀到的原句附出處
  function exHTML(ex, it, front) {
    const s = String(ex.jp || ''), w = [ex.w, it.jp, it.kana].find(k => k && s.indexOf(k) >= 0) || '';
    const k = w ? s.indexOf(w) : -1;
    const body = k >= 0 ? esc(s.slice(0, k)) + '<b>' + esc(w) + '</b>' + esc(s.slice(k + w.length)) : esc(s);
    const src = ex.own && ex.from ? '<small class="ac-exsrc">出自《' + esc(ex.from) + '》</small>' : '';
    if (front) return '<p class="ac-ex ac-exf"><span class="jp" lang="ja">「' + body + '」</span>' + src + '</p>';
    return '<p class="ac-ex"><span class="jp" lang="ja">' + (ex.own ? '原句：' : '例：') + body + '</span>' + (ex.zh ? '<small>' + esc(ex.zh) + '</small>' : '') + src + '</p>';
  }
  function card(x, o) {
    o = o || {};
    const it = x && x.id && x.type ? x : item(x);
    if (!it) return '';
    const face = o.face === 'front' ? 'front' : 'back', jp = jpOfCard(it), long = String(jp).length > 8 ? ' long' : '';
    const emo = it.emoji ? `<div class="ac-emo" aria-hidden="true">${esc(it.emoji)}</div>` : '';
    let body;
    if (face === 'front' && o.zhFirst) body = `<p class="ac-zh-big">${esc(it.type === 'kana' ? romaji(it) : it.zh)}</p><p class="ac-ask">${esc(o.ask || askOf(it, true))}</p>`;
    else if (face === 'front') { const own = (it.ex || []).find(e => e.own); body = `${emo}<p class="ac-jp jp${long}" lang="ja">${esc(jp)}</p>${own ? exHTML(own, it, true) : ''}<p class="ac-ask">${esc(o.ask || askOf(it, false))}</p>`; }
    else {
      const kn = it.type === 'kana' ? '' : kanaOf(it), ro = showRo(it) ? romaji(it) : '';
      const ex = o.ex === false ? (it.ex || []).find(e => e.own) || null : o.ex && o.ex.jp ? o.ex : (it.ex || [])[0] || null;
      const hint = it.hint && !(ex && ex.own && it.hint.indexOf(ex.jp) >= 0) ? it.hint : '';
      body = `${emo}<p class="ac-jp jp${long}" lang="ja">${esc(jp)}</p>
        ${kn ? `<p class="ac-kana jp" lang="ja">${esc(kn)}</p>` : ''}
        ${ro ? `<p class="ac-ro">${esc(ro)}</p>` : ''}
        <p class="ac-zh">${esc(it.zh)}</p>
        ${loanOf(it)}
        ${hint ? `<p class="ac-hint">${esc(hint)}</p>` : ''}
        ${ex ? exHTML(ex, it) : ''}`;
    }
    return `<div class="ac-card${face === 'back' ? ' flip' : ''}">${o.isNew ? '<p class="ac-new">新的</p>' : ''}${body}${o.say === false ? '' : '<button type="button" class="ac-say" aria-label="播放發音">🔊</button>'}${o.src !== false && it.source ? `<p class="ac-src">${esc(it.source)}</p>` : ''}</div>`;
  }

  window.Activity = {
    register, run, session, need, get: t => DEFS[t] || null, types: () => Object.keys(DEFS), card, celebrate,
    item, items: itemsOf, resolve, loadCSS, romaji, kanaOf, say, summarize, hideZh, isKanaStr, showRo, showKana, unMacron,
    _test: { typeOfId, exNorm }
  };
})();
