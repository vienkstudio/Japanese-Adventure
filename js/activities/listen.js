/* 活動 listen：聽語音作答（取代特訓 drill 的出題形式；題庫 data/drills.js）
   mode（params.mode）：
     mean  聽 item 選中文意思（預設；假名預設 word）
     word  聽 item 選寫法（假名＝選假名、單字＝選漢字寫法）
     num   數字快打：聽價錢／時間選數字（不需要 items，params.n 題，params.kind 'price'|'time'|'mix'）
     clerk 店員問句：聽店員說的話選意思（DRILLS.CLERK，params.scene 篩場景，params.n 題）
   沒有日文語音：上方提示安裝方法，題目改成看字（讀音）作答
   答錯在最後重考一次：第一次答對 2、答錯 0；重考答對 1；答對 0.6 秒自動下一題，答錯才停下顯示正解 */
(function () {
  'use strict';
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const KJ = /[一-鿿々〆ヶ]/;

  /* ---- 數字讀音（無語音時顯示） ---- */
  const DG = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  function numKana(n) {
    if (n === 0) return 'ぜろ';
    let s = '';
    if (n >= 10000) { s += numKana(Math.floor(n / 10000)) + 'まん'; n %= 10000; }
    const th = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), t = Math.floor(n % 100 / 10), o = n % 10;
    if (th) s += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : DG[th] + 'せん';
    if (h) s += h === 1 ? 'ひゃく' : h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : DG[h] + 'ひゃく';
    if (t) s += (t === 1 ? '' : DG[t]) + 'じゅう';
    if (o) s += DG[o];
    return s;
  }
  const hourK = h => ({ 4: 'よじ', 7: 'しちじ', 9: 'くじ' })[h] || numKana(h) + 'じ';
  const MIN_K = { 0: '', 5: 'ごふん', 10: 'じゅっぷん', 15: 'じゅうごふん', 20: 'にじゅっぷん', 25: 'にじゅうごふん', 30: 'さんじゅっぷん', 35: 'さんじゅうごふん', 40: 'よんじゅっぷん', 45: 'よんじゅうごふん', 50: 'ごじゅっぷん', 55: 'ごじゅうごふん' };
  const NEAR_H = { 1: [7, 11], 4: [7, 9], 7: [4, 1, 9], 9: [4, 7], 11: [1, 7] };
  // 數字題：{id, ans, opts, say, kana, zh}
  function numQ(kind) {
    if (kind === 'time') {
      const h = rnd(1, 12), m = rnd(0, 11) * 5;
      const fmt = (a, b) => a + ':' + String(b).padStart(2, '0');
      const ans = fmt(h, m), set = new Set([ans]);
      const hs = (NEAR_H[h] || [h - 1, h + 1]).filter(x => x >= 1 && x <= 12), ms = [m, (m + 10) % 60, (m + 50) % 60, m === 0 ? 30 : 0];
      for (const x of shuf(hs.map(a => fmt(a, m)).concat(ms.map(b => fmt(h, b))))) { if (set.size >= 4) break; set.add(x); }
      while (set.size < 4) set.add(fmt(rnd(1, 12), rnd(0, 11) * 5));
      return { id: 'num:time:' + ans, ans, opts: shuf([...set]), say: h + '時' + (m ? m + '分' : ''), kana: hourK(h) + (MIN_K[m] || ''), zh: h + ' 點' + (m ? ' ' + m + ' 分' : ''), unit: '' };
    }
    const r = Math.random(), n = r < 0.35 ? rnd(10, 99) * 10 : r < 0.85 ? rnd(100, 998) * 10 : rnd(100, 398) * 100;
    const set = new Set([n]);
    const s = String(n), cand = [];
    for (let i = 0; i < s.length - 1; i++) for (const d of [1, -1, 2]) { const k = +s[i] + d; if (k < 0 || k > 9 || (i === 0 && k === 0)) continue; cand.push(+(s.slice(0, i) + k + s.slice(i + 1))); }
    cand.push(n * 10, Math.round(n / 10 / 10) * 10 || n + 100);
    for (const x of shuf(cand)) { if (set.size >= 4) break; if (x > 0) set.add(x); }
    while (set.size < 4) set.add(n + rnd(1, 9) * 10);
    const fmt = x => x.toLocaleString('en-US') + ' 円';
    return { id: 'num:price:' + n, ans: fmt(n), opts: shuf([...set]).map(fmt), say: n + '円', kana: numKana(n) + 'えん', zh: n + ' 日圓', unit: '円' };
  }
  // 店員問句題
  function clerkQs(n, scene) {
    const D = window.DRILLS; if (!D || !Array.isArray(D.CLERK)) return [];
    const zc = (Activity.get('choice') || {}).zhClash || ((a, b) => a === b);
    const all = D.CLERK.filter(c => c && c.zh && Array.isArray(c.v) && c.v.length);
    const pool = scene ? all.filter(c => c.s === scene) : all;
    return shuf(pool).slice(0, n).map(c => {
      const v = c.v[Math.floor(Math.random() * c.v.length)];
      const same = all.filter(x => x !== c && x.s === c.s), other = all.filter(x => x !== c && x.s !== c.s);
      const dis = [];
      for (const x of shuf(same).concat(shuf(other))) { if (dis.length >= 3) break; if (!zc(x.zh, c.zh) && !dis.some(d => zc(d, x.zh))) dis.push(x.zh); }
      const it = { id: Learn.idOf({ jp: v[0] }, 'phrase'), type: 'phrase', jp: v[0], kana: v[1] || '', zh: c.zh, hint: c.a ? '回答：' + c.a[0] + '（' + c.a[1] + '）' : '', source: (D.SCENE_NAMES && D.SCENE_NAMES[c.s]) || '店員問句' };
      const opts = shuf([c.zh].concat(dis));
      return { it, ans: c.zh, opts, jpOpt: false, ask: '店員在問什麼？' };
    }).filter(q => q.opts.length >= 3);
  }

  Activity.register('listen', {
    needItems: false, numQ, numKana,
    start(el, ctx) {
      const p = ctx.params, n = Math.max(1, Math.min(20, p.n || 8));
      const want = p.mode || (ctx.items.length ? '' : 'num');
      const noVoice = ctx.voice === false;
      const pre = want === 'clerk' && !window.DRILLS ? App.loadScript('data/drills.js').catch(() => { }) : Promise.resolve();
      return Promise.all([pre, Activity.need('choice')]).then(() => new Promise(resolve => {
        const C = Activity.get('choice');
        let qs = [];
        if (want === 'num') for (let i = 0; i < n; i++) { const k = p.kind && p.kind !== 'mix' ? p.kind : i % 2 ? 'time' : 'price'; const q = numQ(k); qs.push({ it: { id: q.id, type: 'vocab', jp: q.say, kana: q.kana, zh: q.zh, source: '🔢 數字快打' }, ans: q.ans, opts: q.opts, jpOpt: false, ask: noVoice ? '這是多少？' : '聽到的是多少？', num: 1 }); }
        else if (want === 'clerk') qs = clerkQs(n, p.scene);
        else {
          const pool = ctx.items.slice();
          ctx.items.forEach(it => {
            let m = want || (it.type === 'kana' ? 'word' : 'mean');
            if (m === 'word' && it.type !== 'kana' && !KJ.test(it.jp)) m = 'mean';
            const cm = m === 'word' ? 'listen' : 'jp2zh';
            const q = C && C.question(it, cm, pool);
            if (q) qs.push({ it, ans: q.ans, opts: q.opts, jpOpt: m === 'word', ask: m === 'word' ? (noVoice ? '是哪一個寫法？' : '聽到的是哪一個？') : (noVoice ? '是什麼意思？' : '聽到的是什麼意思？'), word: m === 'word' });
          });
        }
        let k = 0;
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const q = qs[k];
          if (!q) return resolve({ results: ctx.results, meta: { n: qs.length, mode: want || 'mean', noVoice } });
          ctx.progress(k, qs.length);
          const it = q.it, esc = ctx.esc;
          // 看字題：數字→讀音；假名→羅馬字；單字選寫法→讀音；選意思→日文
          const look = q.num ? it.kana : q.word ? (it.type === 'kana' ? ctx.romaji(it) : (it.kana || it.jp)) : it.jp;
          el.innerHTML = `${noVoice && k === 0 ? (App.voiceHTML ? App.voiceHTML() : '<p class="ac-note">🔇 沒有日文語音，改成看字作答</p>') : ''}
            <div class="ac-card">${noVoice ? `<p class="ac-jp jp${String(look).length > 10 ? ' long' : ''}" lang="ja">${esc(look)}</p><p class="ac-note">🔇 看字作答</p>` : `<button type="button" class="ac-play" aria-label="再聽一次">🔊</button><p class="ac-note">點喇叭可再聽一次</p>`}</div>
            <p class="ac-ask">${q.second ? '再一次：' : ''}${esc(q.ask)}</p>
            <div class="ac-opts${q.num ? ' grid' : ''}">${q.opts.map((o, i) => `<button type="button" class="btn block${q.jpOpt ? ' jp' : ''}" data-o="${i}"${q.jpOpt ? ' lang="ja"' : ''}>${esc(o)}</button>`).join('')}</div>
            <div class="ac-fb" aria-live="polite"></div>`;
          const sayIt = () => ctx.say(q.num ? it.jp : it);
          const pl = el.querySelector('.ac-play'); if (pl) pl.onclick = sayIt;
          if (!noVoice) sayIt();
          el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
            const ok = q.opts[+b.dataset.o] === q.ans;
            el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (q.opts[+x.dataset.o] === q.ans) x.classList.add('ok'); });
            if (!ok) b.classList.add('ng');
            ctx.sfx(ok);
            ctx.mark(it, ok ? (q.second ? 1 : 2) : 0);
            if (!ok && !q.second && p.retry !== false) qs.push(Object.assign({}, q, { second: true, opts: shuf(q.opts) }));
            const ro = ctx.showRo(it) ? ctx.romaji(it) : '', kn = q.num ? it.kana : ctx.showKana() ? ctx.kana(it) : '';
            const fb = el.querySelector('.ac-fb');
            fb.className = 'ac-fb ' + (ok ? 'ok' : 'ng');
            fb.innerHTML = `<p>${ok ? '✓ 答對了！' : '✗ 正確答案：' + esc(q.ans)}</p><div class="ac-exp"><span class="jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</span>${kn && kn !== it.jp ? `<small class="jp" lang="ja">${esc(kn)}</small>` : ''}${ro && !q.num ? `<small>${esc(ro)}</small>` : ''}<span>${esc(it.zh)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div>`;
            if (ok) fb.innerHTML = '<p>✓ 答對了！</p>';
            ctx.advance(ok, el, () => { k++; show(); });
          });
        };
        show();
      }));
    }
  });
})();
