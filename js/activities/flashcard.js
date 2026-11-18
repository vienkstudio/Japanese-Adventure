/* 活動 flashcard：正面日文（可切中文先）→ 翻面讀音／羅馬字／中文／例句／外來語原文、語音 → 自評 4 鍵（0 忘了、1 困難、2 記得、3 簡單）
   params：{zhFirst?:bool（預設讀 localStorage jpq.act.zhFirst）, speak?:bool（翻面自動念，預設 true）} */
(function () {
  'use strict';
  const PREF = 'jpq.act.zhFirst';
  const getPref = () => { try { return localStorage.getItem(PREF) === '1'; } catch (e) { return false; } };
  const setPref = v => { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch (e) { } };
  const KATA = /^[ァ-ヺー・]{2,}$/;
  const GRADES = [[0, '😵', '忘了'], [1, '😓', '困難'], [2, '🙂', '記得'], [3, '😊', '簡單']];

  function loanHTML(it, esc) {
    if (!window.Loan || it.type === 'kana') return '';
    try { const l = Loan.label(it.jp, 1); return l ? `<p class="ac-loan">${esc(l)}</p>` : ''; } catch (e) { return ''; }
  }
  function front(it, ctx, zhFirst) {
    const esc = ctx.esc;
    if (zhFirst) return `<p class="ac-zh-big">${esc(it.type === 'kana' ? ctx.romaji(it) : it.zh)}</p><p class="ac-ask">${it.type === 'kana' ? '是哪個假名？' : '日文怎麼說？'}</p>`;
    return `${it.emoji ? `<div class="ac-emo" aria-hidden="true">${esc(it.emoji)}</div>` : ''}<p class="ac-jp jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</p><p class="ac-ask">想一想：怎麼念？什麼意思？</p>`;
  }
  function back(it, ctx) {
    const esc = ctx.esc, kn = ctx.kana(it), ro = ctx.romaji(it), ex = (it.ex || []).slice(0, 2);
    return `${it.emoji ? `<div class="ac-emo" aria-hidden="true">${esc(it.emoji)}</div>` : ''}
      <p class="ac-jp jp" lang="ja">${esc(it.type === 'kana' ? (it.kana || it.jp) : it.jp)}</p>
      ${kn && it.type !== 'kana' ? `<p class="ac-kana jp" lang="ja">${esc(kn)}</p>` : ''}
      ${ro ? `<p class="ac-ro">${esc(ro)}</p>` : ''}
      <p class="ac-zh">${esc(it.zh)}</p>
      ${loanHTML(it, esc)}
      ${it.hint ? `<p class="ac-hint">${esc(it.hint)}</p>` : ''}
      ${ex.map(e => `<p class="ac-ex"><span class="jp" lang="ja">例：${esc(e.jp)}</span>${e.zh ? `<small>${esc(e.zh)}</small>` : ''}</p>`).join('')}`;
  }

  Activity.register('flashcard', {
    start(el, ctx) {
      const items = ctx.items.slice(), p = ctx.params;
      let zhFirst = p.zhFirst != null ? !!p.zhFirst : getPref();
      const autoSay = p.speak !== false;
      const pre = !window.Loan && items.some(it => KATA.test(it.jp)) ? App.loadScript('data/loan.js').catch(() => { }) : Promise.resolve();
      return pre.then(() => new Promise(resolve => {
        let i = 0;
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const it = items[i];
          if (!it) return resolve({ results: ctx.results, meta: { n: items.length } });
          ctx.progress(i, items.length);
          el.innerHTML = `<div class="ac-card" id="acCard">${front(it, ctx, zhFirst)}
              <button type="button" class="ac-say" aria-label="播放發音">🔊</button>
              ${it.source ? `<p class="ac-src">${ctx.esc(it.source)}</p>` : ''}</div>
            <div class="ac-act">
              <button type="button" class="btn primary block ac-flip">翻面看答案</button>
              <button type="button" class="ac-tog" aria-pressed="${zhFirst}">${zhFirst ? '✓ ' : ''}中文先</button>
            </div>`;
          const sayBtn = () => { el.querySelector('.ac-say').onclick = () => ctx.say(it); };
          sayBtn();
          if (!zhFirst && autoSay) ctx.say(it);
          el.querySelector('.ac-tog').onclick = () => { zhFirst = !zhFirst; setPref(zhFirst); show(); };
          el.querySelector('.ac-flip').onclick = () => {
            const card = el.querySelector('#acCard');
            card.innerHTML = back(it, ctx) + `<button type="button" class="ac-say" aria-label="播放發音">🔊</button>${it.source ? `<p class="ac-src">${ctx.esc(it.source)}</p>` : ''}`;
            card.classList.add('flip');
            sayBtn(); if (autoSay) ctx.say(it);
            el.querySelector('.ac-act').innerHTML = `<p class="ac-ask">你剛剛記得嗎？</p><div class="ac-grade">${GRADES.map(([g, e, t]) => `<button type="button" class="btn" data-g="${g}"><span aria-hidden="true">${e}</span>${t}</button>`).join('')}</div>`;
            el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { ctx.mark(it, +b.dataset.g); i++; show(); });
          };
        };
        show();
      }));
    }
  });
})();
