/* =========================================================
   統一活動框架 activity.js（window.Activity）＋路由 act
   Activity.register(type, { start(el, ctx) -> Promise<{results:[{id, grade}], meta?}>, available?() })
     grade：0 忘了／答錯、1 困難、2 記得／答對、3 簡單
   Activity.run(el, { type, items|ids, params, title, back:{route, params}, next:{label, route, params}, reward?, end? }) -> Promise<summary>
   Activity.session(el?, steps, opts?) -> 依序跑多個活動，最後只顯示一次結算（el 省略＝#main）
   summary：{ title, results:[{id, grade, type}], total, correct, rate, learned, wrong:[item], due, streak, xp, stars, quit, meta:[] }
   規則：
   - 一題一屏、頂部「✕ 離開」＋進度條；活動不得呼叫 Learn.record，一律 ctx.mark(item, grade)（或回傳 results）由 runner 記錄
   - promise 在結算畫面出現時（或按 ✕ 離開時，quit:true）resolve；runner 不自己跳頁，只有使用者按「完成」／「✕ 離開」才走 back
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
    if (Array.isArray(ex)) return ex.map(x => Array.isArray(x) ? { jp: x[0], zh: x[1] || '' } : x && x.jp ? { jp: x.jp, zh: x.zh || '' } : null).filter(Boolean);
    if (typeof ex === 'string') return [{ jp: ex, zh: '' }];
    return ex.jp ? [{ jp: ex.jp, zh: ex.zh || '' }] : [];
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
      emoji: x.emoji || '', lv: LVS.includes(lv) ? lv : '', source: x.source || '', ex: exNorm(x.ex),
      accept: Array.isArray(x.accept) ? x.accept : null, say: x.say || ''
    };
  }
  const lexKana = r => String(r[1] || '').split(/;\s*/)[0].replace(/\s*[（(].*?[）)]/g, '').trim();
  // 從已載入的資料找回 id 的內容
  function resolve(id) {
    id = Learn.idOf(id); if (!id) return null;
    const t = typeOfId(id), rest = id.slice(id.indexOf(':') + 1);
    const v = Learn.view(id);
    let base = v && v.jp ? { id, type: t, jp: v.jp, kana: v.kana, zh: v.zh, romaji: v.romaji, hint: v.hint, emoji: v.emoji, lv: v.lv, source: v.source } : null;
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
          const k = JPText.tokenize(it.jp).map(t => { if (t.sym) return t.s; if (t.kana && !KJ.test(t.kana)) return t.kana; if (!KJ.test(t.s)) return t.s; ok = false; return t.s; }).join('');
          if (ok && k && k !== it.jp) it.kana = k;
        } catch (e) { }
      });
    }).catch(() => { });
  }
  const kanaOf = it => it.type === 'kana' ? (it.kana || it.jp) : (it.kana && it.kana !== it.jp ? it.kana : '');
  function romaji(it) {
    if (!it) return '';
    if (it.romaji) return it.romaji;
    const k = it.kana || (isKanaStr(it.jp) ? it.jp : '');
    if (!k || !isKanaStr(k)) return '';
    try { return window.Phrase && has(Phrase, 'romaji') ? Phrase.romaji(k, it.jp) || '' : ''; } catch (e) { return ''; }
  }
  const sayText = it => typeof it === 'string' ? it : it.say || (it.type === 'kana' ? (it.kana || it.jp) : it.kana && isKanaStr(it.kana) ? it.kana : it.jp);
  const say = it => { try { App.speak(sayText(it)); } catch (e) { } };
  const sfx = ok => { if (window.Game && has(Game, 'sfx')) try { Game.sfx(ok ? 'ok' : 'ng'); } catch (e) { } };
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
    const end = new Date(); end.setHours(0, 0, 0, 0); const tmr = end.getTime() + 2 * 864e5;
    const L = App.state.learn || {}; let m = 0;
    for (const id in L) { const e = L[id]; if (e.s !== 'new' && (e.reps || e.star || e.lapses) && (e.due || 0) < tmr) m++; }
    return m;
  }
  // 純計算：results（依作答順序）→ 統計；第一次作答 ≥1 算答對、最後一次 ≥1 算學會
  function summarize(results, items) {
    const first = new Map(), last = new Map();
    (results || []).forEach(r => { if (!r || !r.id) return; if (!first.has(r.id)) first.set(r.id, r.grade); last.set(r.id, r.grade); });
    const total = first.size;
    let correct = 0, learned = 0; const wrong = [];
    first.forEach((g, id) => { if (g >= 1) correct++; else { const it = items && items[id]; if (it) wrong.push(it); } });
    last.forEach(g => { if (g >= 1) learned++; });
    const rate = total ? Math.round(correct / total * 100) : 0;
    const stars = !total ? 0 : rate >= 90 ? 3 : rate >= 70 ? 2 : 1;
    return { results: (results || []).map(r => ({ id: r.id, grade: r.grade, type: r.type || typeOfId(r.id) })), total, correct, rate, learned, wrong, stars };
  }

  /* ---------------- runner ---------------- */
  function frameHTML(title) {
    return `<section class="ac" aria-label="${esc(title)}">
      <div class="ac-top"><button type="button" class="ac-x" aria-label="離開練習">✕ 離開</button>
        <div class="ac-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div></div></div><span class="ac-n" aria-live="polite"></span></div>
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
      el.innerHTML = frameHTML(title);
      const root = el.querySelector('.ac'), bar = el.querySelector('.ac-bar'), stage = el.querySelector('.ac-stage');
      const setBar = (k, i, n) => {
        const f = steps.length ? (k + (n ? Math.min(i, n) / n : 0)) / steps.length : 1;
        bar.firstElementChild.style.width = Math.round(f * 100) + '%'; bar.setAttribute('aria-valuenow', Math.round(f * 100));
        el.querySelector('.ac-n').textContent = n ? (steps.length > 1 ? `${k + 1}／${steps.length}・` : '') + `${Math.min(i + 1, n)}／${n}` : '';
      };
      const finish = quit => {
        if (closed) return null; closed = true;
        const s = Object.assign(summarize(all, byId), { title, quit: !!quit, meta: metas, due: dueTomorrow(), xp: 0 });
        if (!quit && s.total) {
          if (opts.reward) { try { const r = App.reward(opts.reward, s.stars, title); s.xp = r.gained || 0; } catch (e) { console.warn(e); } }
          else { s.xp = 3 + s.correct * 2; App.addXP(s.xp, title); }
        }
        s.streak = (App.streakInfo ? App.streakInfo() : { days: 0 }).days || 0;
        return s;
      };
      const leave = () => { const b = opts.back; if (b && b.route) App.go(b.route, b.params || {}); else App.back(); };
      el.querySelector('.ac-x').onclick = () => {
        const out = () => { const s = finish(true); if (s) done(s); leave(); };
        if (!all.length || closed) return out();
        App.modal('<h3>要離開嗎？</h3><p>已作答的進度會保存。</p>', [{ label: '繼續練習', cls: 'primary' }, { label: '離開', onClick: out }]);
      };
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
      let k = 0;
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
              const r = Object.assign({ id, grade }, extra || {});
              local.push(r); record(r, it && it.jp ? it : null, src);
              return r;
            },
            progress: (i, n) => setBar(k, i, n),
            say, sayText, romaji, kana: kanaOf, hideZh, sfx, item, itemsOf,
            alive: () => !closed && root.isConnected
          };
          return Promise.resolve().then(() => def.start(stage, ctx)).then(r => {
            (r && Array.isArray(r.results) ? r.results : []).forEach(x => { const it = x && x.item && typeof x.item === 'object' ? item(Object.assign({ id: x.id }, x.item)) : null; if (x) delete x.item; record(x, it, src); });
            if (r && r.meta) metas.push(Object.assign({ type: st.type }, r.meta));
          });
        }).catch(e => { console.warn('activity', st.type, e); }).then(() => { k++; next(); });
      };
      const end = () => {
        const s = finish(false); if (!s) return;
        setBar(steps.length, 0, 0);
        if (opts.end === false) { done(s); return; }
        endScreen(root, s, opts, leave);
        done(s);
      };
      next();
    });
  }
  function endScreen(root, s, opts, leave) {
    const nx = opts.next;
    root.className = 'ac ac-end';
    root.innerHTML = `<p class="ac-big" aria-hidden="true">${!s.total ? '🙂' : s.rate >= 70 ? '🎉' : '💪'}</p>
      <h1>${esc(s.total ? (s.rate >= 70 ? '完成了！' : '完成！再複習一次會更熟') : '這一組沒有題目')}</h1>
      <div class="ac-sum">
        <div><b>${s.learned}</b><small>學會</small></div>
        <div><b>${s.rate}%</b><small>答對率</small></div>
        <div><b>${s.due}</b><small>明天到期</small></div>
        <div><b>🔥${s.streak}</b><small>連勝天數</small></div>
      </div>
      ${s.xp ? `<p class="ac-xp">+${s.xp} XP</p>` : ''}
      ${s.wrong.length ? `<div class="ac-wrong"><p>要再記一下（已排進複習）</p><ul>${s.wrong.slice(0, 6).map(w => `<li><span class="jp" lang="ja">${esc(w.type === 'kana' ? (w.kana || w.jp) : w.jp)}</span><small>${esc(w.type === 'kana' ? romaji(w) : w.zh)}</small></li>`).join('')}</ul></div>` : ''}
      <div class="ac-btns">
        ${nx && nx.route ? `<button type="button" class="btn primary block" id="acNext">${esc(nx.label || '下一步 ▶')}</button>` : ''}
        <button type="button" class="btn ${nx && nx.route ? '' : 'primary'} block" id="acDone">${esc((opts.back && opts.back.label) || '完成')}</button>
      </div>`;
    const b = root.querySelector('#acNext'); if (b) b.onclick = () => App.go(nx.route, nx.params || {});
    root.querySelector('#acDone').onclick = leave;
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
      const opts = { title: p.title, back: p.back, next: p.next, reward: p.reward, lv: p.lv };
      Promise.all([needCSS(), load('js/phrase.js')]).then(() => session(el, steps, opts)).catch(e => { console.warn(e); el.innerHTML = '<p class="ac-load">😵 載入失敗，請檢查網路後再試一次</p>'; });
    }
  });

  window.Activity = {
    register, run, session, need, get: t => DEFS[t] || null, types: () => Object.keys(DEFS),
    item, items: itemsOf, resolve, loadCSS, romaji, kanaOf, say, summarize, hideZh, isKanaStr,
    _test: { typeOfId, exNorm }
  };
})();
