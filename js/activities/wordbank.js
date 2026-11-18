/* 活動 wordbank：看中文，把詞塊排成日文句子（沿用 Phrase.chunk 分詞）
   可接受多種詞序：item.accept（[[詞塊…]…]，例如 Phrase.make 的 accept）＋自動規則：
     述語（最後一塊）前、以助詞（は が を に で へ と も から まで）結尾的相鄰詞塊可以互換位置
   第一次排對 2、排錯 0（最後重排一次，排對 1）
   params：{retry?:bool（預設 true）, max?:詞塊上限（預設 6）} */
(function () {
  'use strict';
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const PART = /(?:[はがをにでへとも]|から|まで)$/;
  const strip = s => String(s || '').replace(/[\s　。．.！!？?]+$/g, '').replace(/[\s　]/g, '');
  const key = a => a.map(strip).join('');
  // 句子 → 詞塊（≤max 塊；太多就把相鄰的短塊合併）
  function chunks(jp, max) {
    max = max || 6;
    let c = [];
    try { c = window.Phrase && typeof Phrase.chunk === 'function' ? Phrase.chunk(jp) : []; } catch (e) { c = []; }
    if (!c.length) c = String(jp).replace(/[。！!]$/, '').split(/(?<=[、？?])/).map(s => s.trim()).filter(Boolean);
    while (c.length > max) {
      let best = 0, bl = Infinity;
      for (let i = 0; i < c.length - 1; i++) { const l = c[i].length + c[i + 1].length; if (l < bl) { bl = l; best = i; } }
      c.splice(best, 2, c[best] + c[best + 1]);
    }
    return c;
  }
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(p => [x].concat(p)));
  // 純函式：所有可接受的詞序（字串陣列的陣列，第一個＝原句）
  function orders(c, extra) {
    const out = [c.slice()], seen = new Set([key(c)]);
    const add = a => { const k = key(a); if (!seen.has(k)) { seen.add(k); out.push(a); } };
    (extra || []).forEach(a => Array.isArray(a) && add(a.slice()));
    // 找出述語前、連續的助詞結尾詞塊（最多 4 塊一起換）
    let i = 0;
    while (i < c.length - 1) {
      if (!PART.test(strip(c[i]))) { i++; continue; }
      let j = i; while (j + 1 < c.length - 1 && PART.test(strip(c[j + 1]))) j++;
      if (j > i && j - i < 4) {
        const run = c.slice(i, j + 1), bag = a => a.map(strip).sort().join('\u0001');
        out.slice().forEach(base => {
          if (base.length !== c.length || bag(base.slice(i, j + 1)) !== bag(run)) return;
          perms(run).forEach(p => add(base.slice(0, i).concat(p, base.slice(j + 1))));
        });
      }
      i = j + 1;
    }
    return out;
  }
  // 純函式：玩家排的詞塊 seq 對不對
  function judge(seq, accept) {
    const k = key(seq);
    return (accept || []).some(a => key(a) === k);
  }

  Activity.register('wordbank', {
    chunks, orders, judge,
    start(el, ctx) {
      const p = ctx.params, retry = p.retry !== false, max = p.max || 6;
      const ready = window.Phrase ? Promise.resolve() : App.loadScript('js/phrase.js').catch(() => { });
      return ready.then(() => new Promise(resolve => {
        const qs = [];
        ctx.items.forEach(it => {
          if (it.type === 'kana' || !it.jp) return;
          const c = it.accept && it.accept[0] ? it.accept[0].slice() : chunks(it.jp, max);
          if (c.length < 2) return;
          qs.push({ it, c, accept: orders(c, it.accept), second: false });
        });
        let n = 0;
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const q = qs[n];
          if (!q) return resolve({ results: ctx.results, meta: { n: qs.length } });
          ctx.progress(n, qs.length);
          const it = q.it, esc = ctx.esc;
          // 打亂：至少和原句不同（原句只有一種排法時盡量換）
          let bank = shuf(q.c.map((t, i) => ({ t, i })));
          for (let k = 0; k < 5 && judge(bank.map(b => b.t), q.accept); k++) bank = shuf(bank);
          const picked = [];
          el.innerHTML = `<div class="ac-card ac-wb-q"><p class="ac-zh-big">${esc(it.zh || '（排出這句日文）')}</p>
              <button type="button" class="ac-say" aria-label="聽整句">🔊</button></div>
            <p class="ac-ask">${q.second ? '再一次：' : ''}點詞塊，排成日文句子</p>
            <div class="ac-wb-ans" aria-label="你的句子" aria-live="polite"></div>
            <div class="ac-wb-bank"></div>
            <div class="ac-fb" aria-live="polite"></div>
            <div class="ac-act"><button type="button" class="btn primary block ac-check" disabled>檢查</button></div>`;
          el.querySelector('.ac-say').onclick = () => ctx.say(it);
          const ansEl = el.querySelector('.ac-wb-ans'), bankEl = el.querySelector('.ac-wb-bank'), chk = el.querySelector('.ac-check');
          const draw = () => {
            ansEl.innerHTML = picked.length ? picked.map((b, k) => `<button type="button" class="ac-chip on jp" lang="ja" data-a="${k}">${esc(b.t)}</button>`).join('') : '<span class="ac-ph">（點下面的詞塊）</span>';
            bankEl.innerHTML = bank.map((b, k) => `<button type="button" class="ac-chip jp" lang="ja" data-b="${k}"${picked.includes(b) ? ' disabled' : ''}>${esc(b.t)}</button>`).join('');
            ansEl.querySelectorAll('[data-a]').forEach(x => x.onclick = () => { picked.splice(+x.dataset.a, 1); draw(); });
            bankEl.querySelectorAll('[data-b]').forEach(x => x.onclick = () => { const b = bank[+x.dataset.b]; if (!picked.includes(b)) picked.push(b); draw(); });
            chk.disabled = picked.length !== bank.length;
          };
          draw();
          chk.onclick = () => {
            const ok = judge(picked.map(b => b.t), q.accept);
            ctx.sfx(ok); ctx.mark(it, ok ? (q.second ? 1 : 2) : 0);
            if (!ok && retry && !q.second) qs.push(Object.assign({}, q, { second: true }));
            ansEl.classList.add(ok ? 'ok' : 'ng');
            ansEl.querySelectorAll('button').forEach(x => x.disabled = true);
            bankEl.innerHTML = '';
            const ro = ctx.romaji(it), kn = ctx.kana(it);
            const fb = el.querySelector('.ac-fb');
            fb.className = 'ac-fb ' + (ok ? 'ok' : 'ng');
            fb.innerHTML = `<p>${ok ? '✓ 排對了！' : '✗ 正確的句子：'}</p><div class="ac-exp"><span class="jp" lang="ja">${esc(q.c.join(''))}</span>${kn ? `<small class="jp" lang="ja">${esc(kn)}</small>` : ''}${ro ? `<small>${esc(ro)}</small>` : ''}<span>${esc(it.zh)}</span></div>`;
            el.querySelector('.ac-act').innerHTML = '<button type="button" class="btn primary block ac-go">繼續 ▶</button>';
            ctx.say(it);
            try { el.querySelector('.ac-go').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
            el.querySelector('.ac-go').onclick = () => { n++; show(); };
          };
        };
        show();
      }));
    }
  });
})();
