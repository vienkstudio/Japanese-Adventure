/* 活動 choice：四選一
   mode（params.mode，預設 'mix'）：
     jp2zh 看日文選中文／zh2jp 看中文選日文／listen 聽音選字（無日文語音改看讀音選字）／kana 假名選讀音／form JLPT 文法形式（例句挖空選句型）
     mix：假名→kana、文法→form（不能挖空→jp2zh）、其他輪流 jp2zh／zh2jp
   干擾項：同型別同等級（再放寬到同型別）、唯一正解（中文不同義、日文不互相包含、不同音）；N3 以上作答前不附中文
   答錯的在最後重考一次：第一次答對 2、答錯 0；重考答對 1
   答對 0.6 秒自動下一題；答錯才停下、顯示正解與「繼續 ▶」（固定在底部導覽之上）
   例句去重：同一 session 已出現的例句（字卡、其他題）不再拿來挖空／出句意題
   params：{mode?, pool?:[item…] 額外干擾來源, retry?:bool（預設 true）} */
(function () {
  'use strict';
  const LVS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const G = n => { try { return window[n] !== undefined ? window[n] : (0, eval)('typeof ' + n + '!=="undefined"?' + n + ':undefined'); } catch (e) { return undefined; } };
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const jp0 = s => (String(s || '').split(/[;；]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～]/g, '').trim()) || String(s || '');

  /* ---- 同義／重疊判斷（同挑戰） ---- */
  const segs = z => String(z || '').replace(/（[^）]*）|\([^)]*\)/g, '').split(/[；;，,、／/・。？?！!]/).map(s => s.trim()).filter(Boolean);
  function zhClash(a, b) {
    const A = segs(a), B = segs(b);
    if (!A.length || !B.length) return String(a).trim() === String(b).trim();
    return A.some(x => B.some(y => x === y || (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x)))));
  }
  const norm = s => String(s || '').replace(/[\s　。．.！!？?、]/g, '');
  const overlap = (a, b) => { a = norm(a); b = norm(b); return !a || !b || a.includes(b) || b.includes(a); };
  function stripPat(pat) {
    if (/[〜～]/.test(String(pat || '').replace(/^\s*[〜～]/, ''))) return null;
    const p = String(pat || '').replace(/[〜～]/g, '').replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    if (!p || /[＋+／/…・A-Za-z\s]/.test(p)) return null;
    return p;
  }
  const exOf = it => (it.ex && it.ex[0]) || null;
  // 文法形式題可用：例句含句型（單一假名只出現一次）
  function formable(it) {
    const p = stripPat(it.jp), e = exOf(it);
    if (!p || !e || !e.jp) return null;
    const k = e.jp.indexOf(p); if (k < 0) return null;
    if (p.length === 1 && e.jp.indexOf(p, k + 1) >= 0) return null;
    return { p, s: e.jp, k, zh: e.zh || '' };
  }
  const rk = r => String(r || '').trim().split(/[\s(（]/)[0];   // 'o (wo)' → 'o'：お／を同音不能同時出現
  const kanaOf = it => it.type === 'kana' ? (it.kana || it.jp) : (it.kana || it.jp);
  function ansOf(it, mode) {
    if (mode === 'kana') return Activity.romaji(it);
    if (mode === 'jp2zh') return it.zh || '';
    if (mode === 'form') return stripPat(it.jp) || '';
    return it.type === 'kana' ? (it.kana || it.jp) : it.jp;   // zh2jp、listen
  }
  // 候選是否可當干擾（與正解、與已選的都不衝突）
  function okWith(it, c, mode, f) {
    if (!c || c.id === it.id || !c.jp) return false;
    const a = ansOf(it, mode), b = ansOf(c, mode);
    if (!b || !a || b === a) return false;
    if (norm(c.jp) === norm(it.jp)) return false;
    if (mode === 'kana') return kanaOf(c) !== kanaOf(it) && rk(a) !== rk(b);
    if (mode === 'jp2zh') return !zhClash(a, b);
    if (mode === 'form') return !overlap(a, b) && f.s.replace(f.p, b) !== f.s && !zhClash(c.zh, it.zh);
    // zh2jp、listen：日文不互相包含、不同音、中文不同義
    if (overlap(a, b)) return false;
    if (it.kana && c.kana && norm(c.kana) === norm(it.kana)) return false;
    return !zhClash(c.zh, it.zh);
  }
  // 兩個干擾項之間：答案不同、不重疊
  function mutualOK(o, c, mode) {
    const a = ansOf(o, mode), b = ansOf(c, mode);
    if (!a || !b || a === b || o.id === c.id) return false;
    if (mode === 'jp2zh') return !zhClash(a, b);
    if (mode === 'kana') return rk(a) !== rk(b);
    if (mode === 'form') return !overlap(a, b);
    return !overlap(a, b) && !(o.kana && c.kana && norm(o.kana) === norm(c.kana));
  }
  const lvOf = it => LVS.includes(String(it.lv || '').toUpperCase()) ? String(it.lv).toUpperCase() : '';
  const tkind = it => it.type === 'phrase' || /^p:/.test(it.id) ? 'phrase' : it.type;
  // 純函式：從 pool 選 n 個干擾項的答案字串（同型別同等級 → 同型別 → 同型別不同詞性）
  function distractors(it, mode, pool, n) {
    n = n || 3;
    const f = mode === 'form' ? formable(it) : null;
    if (mode === 'form' && !f) return [];
    const lv = lvOf(it), t = tkind(it);
    if (!it.pos) { const m = (pool || []).find(c => c && c.id === it.id && c.pos); if (m) it = Object.assign({}, it, { pos: m.pos }); }
    const same = (pool || []).filter(c => c && tkind(c) === t);
    const tiers = [];
    if (it.pos) { const FUNC = ['conj', 'adv', 'int', 'exp', 'part']; tiers.push(same.filter(c => lvOf(c) === lv && (FUNC.includes(it.pos) ? !FUNC.includes(c.pos) : c.pos === it.pos))); }
    tiers.push(same.filter(c => lvOf(c) === lv));
    if (lv) tiers.push(same.filter(c => !lvOf(c) || Math.abs(LVS.indexOf(lvOf(c)) - LVS.indexOf(lv)) <= 1));
    if (!lv) tiers.push(same);
    const out = [], chosen = [];
    for (const tier of tiers) for (const c of shuf(tier)) {
      if (out.length >= n) break;
      if (!okWith(it, c, mode, f)) continue;
      // 干擾項彼此也不能撞
      if (chosen.some(o => !mutualOK(o, c, mode))) continue;
      chosen.push(c); out.push(ansOf(c, mode));
    }
    return out;
  }
  function pickMode(it, i, want, voiceOK) {
    if (want && want !== 'mix') {
      if (want === 'form' && !formable(it)) return 'jp2zh';
      if (want === 'listen' && voiceOK === false) return it.type === 'kana' ? 'kana' : 'jp2zh';
      if (want === 'kana' && it.type !== 'kana') return 'jp2zh';
      return want;
    }
    if (it.type === 'kana') return 'kana';
    if (it.type === 'grammar') return formable(it) ? 'form' : 'jp2zh';
    return i % 3 === 2 && it.zh ? 'zh2jp' : 'jp2zh';
  }
  // 純函式：出一題 → {mode, ans, opts, ansI} 或 null（干擾項不足）
  function question(it, mode, pool) {
    const ans = ansOf(it, mode); if (!ans) return null;
    const dis = distractors(it, mode, pool, 3);
    if (dis.length < 2) return null;
    const opts = shuf([ans].concat(dis));
    return { mode, ans, opts, ansI: opts.indexOf(ans) };
  }

  /* ---- 額外干擾來源（已載入的資料） ---- */
  const CACHE = {};
  function extraPool(items) {
    const out = [];
    const types = new Set(items.map(tkind)), lvs = new Set(items.map(lvOf).filter(Boolean));
    if (types.has('kana')) {
      const K = G('KANA') || [];
      if (!CACHE.kana) CACHE.kana = K.map(k => ({ id: 'kana:' + k[0], type: 'kana', jp: k[0], kana: k[0], romaji: k[2], zh: '' }));
      out.push(...CACHE.kana);
    }
    const lex = (window.MIND && MIND.lex) || {};
    if (types.has('vocab')) lvs.forEach(lv => {
      const a = lex[lv]; if (!a) return;
      const key = 'v' + lv + a.length;
      if (!CACHE[key]) CACHE[key] = a.filter(r => r[0] && r[2]).map(r => { const jp = jp0(r[0]); return { id: 'v:' + jp, type: 'vocab', jp, kana: String(r[1] || '').split(/;\s*/)[0].replace(/\s*[（(].*?[）)]/g, '').trim() || jp, zh: String(r[2]), lv, pos: r[3] || '' }; });
      out.push(...CACHE[key]);
    });
    if (types.has('grammar') && window.MIND && Array.isArray(MIND.gram)) {
      if (!CACHE.g) CACHE.g = MIND.gram.map(g => ({ id: 'g:' + String(g.id).replace(/^gram:/, ''), type: 'grammar', jp: g.pat, kana: '', zh: g.zh, lv: g.lv, ex: Array.isArray(g.ex) && g.ex[0] ? [{ jp: g.ex[0], zh: g.ex[1] || '' }] : [] }));
      out.push(...CACHE.g);
    }
    if (types.has('vocab') || types.has('phrase')) {
      const S = G('SCENES') || [];
      const key = 'sc' + S.length;
      if (!CACHE[key]) { CACHE[key] = []; S.forEach(s => { (s.vocab || []).forEach(w => w && w.jp && CACHE[key].push({ id: 'v:' + jp0(w.jp), type: 'vocab', jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh || '' })); (s.phrases || []).forEach(w => w && w.jp && CACHE[key].push({ id: 'p:' + norm(w.jp), type: 'phrase', jp: w.jp, kana: w.kana || '', romaji: w.romaji || '', zh: w.zh || '' })); }); }
      out.push(...CACHE[key]);
    }
    return out;
  }
  function prepare(items) {
    const src = [], lvs = new Set(items.filter(it => it.type === 'vocab').map(lvOf).filter(Boolean));
    lvs.forEach(lv => { if (!(window.MIND && MIND.lex && MIND.lex[lv])) src.push('data/mind/lex-' + lv.toLowerCase() + '.js'); });
    if (items.some(it => it.type === 'grammar') && !(window.MIND && MIND.gram)) src.push('data/mind/grammar.js');
    if (items.some(it => it.type === 'kana') && !G('KANA')) src.push('kana-data.js');
    const noLv = items.filter(it => (it.type === 'vocab' || it.type === 'phrase') && !lvOf(it));
    if (noLv.length && noLv.length < 8 && !(G('SCENES') || []).length) src.push(...SC);
    return src.reduce((p, s) => p.then(() => App.loadScript(s).catch(() => { })), Promise.resolve());
  }

  const ASK = { jp2zh: '是什麼意思？', zh2jp: '日文是哪一個？', listen: '聽到的是哪一個？', kana: '怎麼念？', form: '（　　）裡放什麼最適合？' };
  function stemHTML(it, q, ctx, noVoice) {
    const esc = ctx.esc, hz = ctx.hideZh(it);
    if (q.mode === 'zh2jp') return `<p class="ac-zh-big">${esc(it.zh)}</p>`;
    if (q.mode === 'listen') return noVoice ? `<p class="ac-jp jp" lang="ja">${esc(it.kana || it.jp)}</p><p class="ac-note">🔇 沒有日文語音，改看讀音選字</p>` : `<button type="button" class="ac-play" aria-label="再聽一次">🔊</button><p class="ac-note">點喇叭可再聽一次</p>`;
    if (q.mode === 'form') { const f = formable(it); return `<p class="ac-sent jp" lang="ja">${esc(f.s.slice(0, f.k))}<span class="ac-blank">（　　）</span>${esc(f.s.slice(f.k + f.p.length))}</p>${!hz && f.zh ? `<p class="ac-note">${esc(f.zh)}</p>` : ''}`; }
    const kn = it.type !== 'kana' && it.kana && it.kana !== it.jp && q.mode === 'jp2zh' ? `<p class="ac-kana jp" lang="ja">${esc(it.kana)}</p>` : '';
    return `<p class="ac-jp jp${String(it.jp).length > 10 ? ' long' : ''}" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</p>${kn}`;
  }
  function explainHTML(it, ctx) {
    const esc = ctx.esc, ro = ctx.showRo(it) ? ctx.romaji(it) : '', kn = ctx.showKana() ? ctx.kana(it) : '';
    return `<div class="ac-exp"><span class="jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</span>${kn && it.type !== 'kana' ? `<small class="jp" lang="ja">${esc(kn)}</small>` : ''}${ro ? `<small>${esc(ro)}</small>` : ''}<span>${esc(it.zh)}</span></div>`;
  }

  /* ---- 日檢題型：交給 Challenge.makeQuestions(lv, kind|[kinds], n, {ids})（params.kind 或 params.quiz 時） ---- */
  function chalStart(el, ctx) {
    const p = ctx.params, LV = String(p.lv || (ctx.items.find(lvOf) || {}).lv || 'N5').toUpperCase();
    const ids = Array.isArray(p.ids) && p.ids.length ? p.ids : ctx.items.length ? ctx.items.map(it => it.id) : null;
    const retry = p.retry != null ? !!p.retry : !p.quiz;
    const pre = (window.Challenge ? Promise.resolve() : App.loadScript('js/challenge.js'))
      .then(() => Promise.all([window.Challenge && typeof Challenge.need === 'function' ? Challenge.need(LV) : 0, Activity.loadCSS ? Activity.loadCSS('css/challenge.css') : 0]));
    return pre.then(() => new Promise(resolve => {
      let qs = [];
      const N = p.n || (ids ? ids.length : 10);
      const avoid = (Array.isArray(p.avoid) ? p.avoid : []).concat(ctx.usedEx ? ctx.usedEx() : []);
      const mk = () => { try { return (Challenge.makeQuestions(LV, p.kind || 'mix', N, ids ? { ids, avoid } : { avoid }) || []).filter(q => q && Array.isArray(q.opts) && q.ans >= 0); } catch (e) { console.warn('makeQuestions', e); return []; } };
      // 和本 session 已出現的例句重複的題目：再出一輪換題（題型隨機），還是重複就拿掉；全部重複才保留原題
      // 只看題目裡的日文句子（.ch-sent／.ch-passage），不含下方中文翻譯
      const jpOf = b => { const m = String(b || '').match(/class="ch-(?:sent|passage)[^"]*">([\s\S]*?)<\/div>/); return m ? m[1] : String(b || '').replace(/<p[^>]*>[\s\S]*?<\/p>/g, ''); };
      const dup = q => ctx.dupText && (ctx.dupText(jpOf(q.body)) || (q.say && ctx.dupText(q.say)));
      const first = mk(), fresh = first.filter(q => !dup(q));
      if (fresh.length < first.length) {
        const have = new Set(fresh.map(q => q.k + '|' + q.key));
        for (const q of mk()) { if (fresh.length >= N) break; if (!dup(q) && !have.has(q.k + '|' + q.key) && !fresh.some(x => x.id && x.id === q.id)) { have.add(q.k + '|' + q.key); fresh.push(q); } }
      }
      qs = (fresh.length ? fresh : first).slice(0, N);
      qs.forEach(q => { if (ctx.useEx) { const t = jpOf(q.body).replace(/<[^>]*>/g, ''); if (!/（\s*）|（　+）/.test(t)) ctx.useEx(t); if (q.say) ctx.useEx(q.say); } });
      qs = qs.map(q => ({ q, second: false }));
      let n = 0;
      const show = () => {
        if (!ctx.alive()) return resolve({ results: ctx.results });
        const cur = qs[n];
        if (!cur) return resolve({ results: ctx.results, meta: { n: qs.length, lv: LV, kind: p.kind || 'mix', quiz: !!p.quiz } });
        ctx.progress(n, qs.length);
        const q = cur.q, esc = ctx.esc, noVoice = q.say && ctx.voice === false;
        const it = q.id && q.item ? Object.assign({}, q.item, { id: q.id, lv: LV }) : null;
        const jpOpt = !/^(mean|lword|sent|lsent|para|lpara|daily)$/.test(q.k);
        el.innerHTML = `<div class="ac-card ac-chal">${q.label ? `<p class="ac-note">${esc(q.label)}</p>` : ''}${q.say ? (noVoice ? `<p class="ac-jp jp long" lang="ja">${esc(q.say)}</p><p class="ac-note">🔇 沒有日文語音，改成看字</p>` : '<button type="button" class="ac-play" aria-label="再聽一次">🔊</button>') : ''}${q.body || ''}</div>
          <p class="ac-ask">${cur.second ? '再一次：' : ''}${esc(q.ask || '')}</p>
          <div class="ac-opts">${q.opts.map((o, k) => `<button type="button" class="btn block${jpOpt ? ' jp' : ''}" data-o="${k}"${jpOpt ? ' lang="ja"' : ''}>${esc(o)}</button>`).join('')}</div>
          <div class="ac-fb" aria-live="polite"></div>`;
        const pl = el.querySelector('.ac-play'); if (pl) pl.onclick = () => ctx.say(q.say);
        if (q.say && !noVoice) ctx.say(q.say);
        el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
          const ok = +b.dataset.o === q.ans;
          el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (+x.dataset.o === q.ans) x.classList.add('ok'); });
          if (!ok) b.classList.add('ng');
          ctx.sfx(ok);
          if (it) ctx.mark(it, ok ? (cur.second ? 1 : 2) : 0);
          if (!ok && retry && !cur.second) qs.push({ q: Object.assign({}, q), second: true });
          const fb = el.querySelector('.ac-fb');
          fb.className = 'ac-fb ' + (ok ? 'ok' : 'ng');
          fb.innerHTML = `<p>${ok ? '✓ 答對了！' : '✗ 正確答案：' + esc(q.opts[q.ans])}</p>${!ok && q.explain ? `<div class="ac-exp ac-chal-exp">${q.explain}</div>` : ''}`;
          ctx.advance(ok, el, () => { n++; show(); });
        });
      };
      show();
    }));
  }

  Activity.register('choice', {
    distractors, question, zhClash, formable, ansOf, pickMode, needItems: false,
    start(el, ctx) {
      if (ctx.params.kind || ctx.params.quiz || (!ctx.items.length && Array.isArray(ctx.params.ids))) return chalStart(el, ctx);
      if (!ctx.items.length) return Promise.resolve({ results: [] });
      const p = ctx.params, want = p.mode || 'mix', retry = p.retry !== false;
      // 例句去重：用過的例句往後排；全部用過就不出挖空題（改看日文選中文）
      const items = ctx.items.map(it => {
        if (!it.ex || !it.ex.length || !ctx.exUsed) return it;
        const ex = it.ex.filter(e => e && e.jp && !ctx.exUsed(e.jp));
        return ex.length === it.ex.length ? it : Object.assign({}, it, { ex });
      });
      return prepare(items).then(() => new Promise(resolve => {
        const extra = (Array.isArray(p.pool) ? p.pool.map(x => ctx.item(x)).filter(Boolean) : []).concat(extraPool(items));
        const pool = items.concat(extra);
        const queue = items.map((it, i) => ({ it, i, second: false }));
        let n = 0;
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const cur = queue[n];
          if (!cur) return resolve({ results: ctx.results, meta: { n: items.length } });
          ctx.progress(n, queue.length);
          const it = cur.it, voiceOK = ctx.voice;
          const mode = cur.mode || (cur.mode = pickMode(it, cur.i, want, voiceOK));
          const q = question(it, mode, pool) || (mode !== 'jp2zh' ? question(it, 'jp2zh', pool) : null);
          if (!q) { n++; return show(); }   // 干擾項不足：跳過，不記錄
          const noVoice = q.mode === 'listen' && voiceOK === false;
          const jpOpt = q.mode === 'zh2jp' || q.mode === 'listen' || q.mode === 'form';
          el.innerHTML = `<div class="ac-card">${stemHTML(it, q, ctx, noVoice)}${q.mode !== 'listen' && q.mode !== 'zh2jp' ? '<button type="button" class="ac-say" aria-label="播放發音">🔊</button>' : ''}</div>
            <p class="ac-ask">${cur.second ? '再一次：' : ''}${ASK[q.mode]}</p>
            <div class="ac-opts">${q.opts.map((o, k) => `<button type="button" class="btn block${jpOpt ? ' jp' : ''}" data-o="${k}"${jpOpt ? ' lang="ja"' : ''}>${ctx.esc(o)}</button>`).join('')}</div>
            <div class="ac-fb" aria-live="polite"></div>`;
          const play = el.querySelector('.ac-play'); if (play) play.onclick = () => ctx.say(it);
          const sb = el.querySelector('.ac-say'); if (sb) sb.onclick = () => ctx.say(it);
          if (q.mode === 'listen' && !noVoice) ctx.say(it);
          if (q.mode === 'form' && ctx.useEx) { const f = formable(it); if (f) ctx.useEx(f.s); }
          el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
            const ok = +b.dataset.o === q.ansI;
            el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (+x.dataset.o === q.ansI) x.classList.add('ok'); });
            if (!ok) b.classList.add('ng');
            ctx.sfx(ok);
            ctx.mark(it, ok ? (cur.second ? 1 : 2) : 0);
            if (!ok && retry && !cur.second) queue.push({ it, i: cur.i, second: true, mode: q.mode });
            const fb = el.querySelector('.ac-fb');
            fb.className = 'ac-fb ' + (ok ? 'ok' : 'ng');
            fb.innerHTML = `<p>${ok ? '✓ 答對了！' : '✗ 正確答案：' + ctx.esc(q.ans)}</p>${ok ? '' : explainHTML(it, ctx)}`;
            if (q.mode !== 'form' && !ok) ctx.say(it);
            ctx.advance(ok, el, () => { n++; show(); });
          });
        };
        show();
      }));
    }
  });
})();
