/* 活動 flashcard（全站唯一字卡：今日課、路線單元、複習共用；定案 2 鈕）
   - 第一次看到（Learn 沒有紀錄）：直接顯示答案（先教再考）→「✓ 記住了」（grade 1）或「😊 早就會了」（grade 3），1 下
   - 看過的：正面 →「😊 記得」直接下一張（grade 2，免翻面），或「👀 看答案」→「😵 忘了」（0）／「🙂 想起來了」（1），1–2 下
   - 自評結果帶 self:true：不佔答對率（runner summarize）
   params：{zhFirst?:bool（預設讀 localStorage jpq.act.zhFirst）, speak?:bool（自動念，預設 true）,
            teach?:'auto'|true|false（auto＝依 Learn 紀錄；true 全部先教；false 全部先考，複習用）} */
(function () {
  'use strict';
  const PREF = 'jpq.act.zhFirst';
  const getPref = () => { try { return localStorage.getItem(PREF) === '1'; } catch (e) { return false; } };
  const setPref = v => { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch (e) { } };
  const KATA = /^[ァ-ヺー・]{2,}$/;

  function loanHTML(it, esc) {
    if (!window.Loan || it.type === 'kana') return '';
    try { const l = Loan.label(it.jp, 1); return l ? `<p class="ac-loan">${esc(l)}</p>` : ''; } catch (e) { return ''; }
  }
  const jpOf = it => it.type === 'kana' ? (it.kana || it.jp) : it.jp;
  function front(it, ctx, zhFirst) {
    const esc = ctx.esc;
    if (zhFirst) return `<p class="ac-zh-big">${esc(it.type === 'kana' ? ctx.romaji(it) : it.zh)}</p><p class="ac-ask">${it.type === 'kana' ? '是哪個假名？' : '日文怎麼說？'}</p>`;
    return `${it.emoji ? `<div class="ac-emo" aria-hidden="true">${esc(it.emoji)}</div>` : ''}<p class="ac-jp jp${String(jpOf(it)).length > 8 ? ' long' : ''}" lang="ja">${esc(jpOf(it))}</p><p class="ac-ask">${it.type === 'kana' ? '怎麼念？' : '還記得意思嗎？'}</p>`;
  }
  // 例句：同一 session 用過的換下一句；都用過就不顯示
  function pickEx(it, ctx) {
    const ex = (it.ex || []).filter(e => e && e.jp && !(ctx.exUsed && ctx.exUsed(e.jp)));
    const e = ex[0] || null;
    if (e && ctx.useEx) ctx.useEx(e.jp);
    return e;
  }
  function back(it, ctx, ex) {
    const esc = ctx.esc, kn = ctx.kana(it), ro = ctx.showRo(it) ? ctx.romaji(it) : '';
    return `${it.emoji ? `<div class="ac-emo" aria-hidden="true">${esc(it.emoji)}</div>` : ''}
      <p class="ac-jp jp${String(jpOf(it)).length > 8 ? ' long' : ''}" lang="ja">${esc(jpOf(it))}</p>
      ${kn && it.type !== 'kana' && ctx.showKana() ? `<p class="ac-kana jp" lang="ja">${esc(kn)}</p>` : ''}
      ${ro ? `<p class="ac-ro">${esc(ro)}</p>` : ''}
      <p class="ac-zh">${esc(it.zh)}</p>
      ${loanHTML(it, esc)}
      ${it.hint ? `<p class="ac-hint">${esc(it.hint)}</p>` : ''}
      ${ex ? `<p class="ac-ex"><span class="jp" lang="ja">例：${esc(ex.jp)}</span>${ex.zh ? `<small>${esc(ex.zh)}</small>` : ''}</p>` : ''}`;
  }
  const seen = id => { try { const e = Learn.get(id); return !!(e && (e.reps || e.s !== 'new')); } catch (e) { return false; } };
  const btn = (g, emo, t, pri) => `<button type="button" class="btn${pri ? ' primary' : ''}" data-g="${g}"><span aria-hidden="true">${emo}</span>${t}</button>`;

  Activity.register('flashcard', {
    start(el, ctx) {
      const items = ctx.items.slice(), p = ctx.params;
      let zhFirst = p.zhFirst != null ? !!p.zhFirst : getPref();
      const autoSay = p.speak !== false;
      // 進活動前就決定哪些是第一次看到（活動中記錄後不會變）
      const teach = {};
      items.forEach(it => { teach[it.id] = p.teach === true ? true : p.teach === false ? false : !seen(it.id); });
      const pre = !window.Loan && items.some(it => KATA.test(it.jp)) ? App.loadScript('data/loan.js').catch(() => { }) : Promise.resolve();
      return pre.then(() => new Promise(resolve => {
        let i = 0;
        const src = it => it.source ? `<p class="ac-src">${ctx.esc(it.source)}</p>` : '';
        const say = '<button type="button" class="ac-say" aria-label="播放發音">🔊</button>';
        const bind = it => {
          const b = el.querySelector('.ac-say'); if (b) b.onclick = () => ctx.say(it);
          el.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { ctx.mark(it, +x.dataset.g, { self: true }); i++; show(); });
        };
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const it = items[i];
          if (!it) return resolve({ results: ctx.results, meta: { n: items.length } });
          ctx.progress(i, items.length);
          if (teach[it.id]) {
            // 先教：直接看答案
            el.innerHTML = `<div class="ac-card flip"><p class="ac-new">新的</p>${back(it, ctx, pickEx(it, ctx))}${say}${src(it)}</div>
              <div class="ac-act ac-dock"><div class="ac-grade two">${btn(3, '😊', '早就會了')}${btn(1, '✓', '記住了，下一張', true)}</div></div>`;
            bind(it); if (autoSay) ctx.say(it);
            return;
          }
          el.innerHTML = `<div class="ac-card">${front(it, ctx, zhFirst)}${say}${src(it)}</div>
            <div class="ac-act ac-dock">
              <div class="ac-grade two"><button type="button" class="btn ac-flip"><span aria-hidden="true">👀</span>看答案</button>${btn(2, '😊', '記得', true)}</div>
            </div>
            <button type="button" class="ac-tog" aria-pressed="${zhFirst}">${zhFirst ? '✓ ' : ''}中文先</button>`;
          bind(it);
          if (!zhFirst && autoSay) ctx.say(it);
          el.querySelector('.ac-tog').onclick = () => { zhFirst = !zhFirst; setPref(zhFirst); show(); };
          el.querySelector('.ac-flip').onclick = () => {
            el.innerHTML = `<div class="ac-card flip">${back(it, ctx, pickEx(it, ctx))}${say}${src(it)}</div>
              <div class="ac-act ac-dock"><div class="ac-grade two">${btn(0, '😵', '忘了')}${btn(1, '🙂', '想起來了', true)}</div></div>`;
            bind(it); if (autoSay) ctx.say(it);
          };
        };
        show();
      }));
    }
  });
})();
