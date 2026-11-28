/* 活動 flashcard（全站唯一字卡：今日課、路線單元、複習共用；定案 2 鈕；卡面＝Activity.card）
   - 第一次看到（Learn 沒有紀錄）：直接顯示答案（先教再考）→「✓ 記住了」（grade 1）或「😊 早就會了」（grade 3），1 下
   - 看過的：正面 →「😊 記得」直接下一張（grade 2，免翻面），或「👀 看答案」→「😵 忘了」（0）／「🙂 想起來了」（1），1–2 下
   - 自評結果帶 self:true：不佔答對率（runner summarize）
   - 文法卡正面問「什麼意思？怎麼接？」；答案面一律顯示讀音（「不要提示」也顯示）
   params：{zhFirst?:bool（預設讀 localStorage jpq.act.zhFirst）, speak?:bool（自動念，預設 true）,
            teach?:'auto'|true|false（auto＝依 Learn 紀錄；true 全部先教（今日課新學）；false 全部先考（複習、今日課到期））,
            tog?:bool（顯示「中文先」切換，預設 true）,
            teachOnly?:bool（單元先教：只看答案按「下一張」，不自評、不記進度；學會與否由後面的小考決定）} */
(function () {
  'use strict';
  const PREF = 'jpq.act.zhFirst';
  const getPref = () => { try { return localStorage.getItem(PREF) === '1'; } catch (e) { return false; } };
  const setPref = v => { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch (e) { } };
  const KATA = /^[ァ-ヺー・]{2,}$/;

  // 例句：同一 session 用過的換下一句；都用過就不顯示
  function pickEx(it, ctx) {
    const ex = (it.ex || []).filter(e => e && e.jp && !(ctx.exUsed && ctx.exUsed(e.jp)));
    const e = ex[0] || null;
    if (e && ctx.useEx) ctx.useEx(e.jp);
    return e || false;
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
        const bind = it => {
          const b = el.querySelector('.ac-say'); if (b) b.onclick = () => ctx.say(it);
          // 自評：記得（≥1）＝小音效＋彈跳，停 0.2 秒讓彈跳看得到；忘了＝溫和、不懲罰
          let busy = false;
          el.querySelectorAll('[data-g]').forEach(x => x.onclick = () => {
            if (busy) return; busy = true;
            const g = +x.dataset.g;
            ctx.mark(it, g, { self: true });
            if (ctx.self) ctx.self(g >= 1, x);
            const go = () => { i++; show(); };
            if (g >= 1 && !(ctx.reduced && ctx.reduced())) setTimeout(go, 200); else go();
          });
        };
        const show = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const it = items[i];
          if (!it) return resolve({ results: ctx.results, meta: { n: items.length } });
          ctx.progress(i, items.length);
          if (p.teachOnly) {
            const last = i === items.length - 1;
            el.innerHTML = `${Activity.card(it, { face: 'back', isNew: !seen(it.id), ex: pickEx(it, ctx) })}
              <div class="ac-act ac-dock"><button type="button" class="btn primary block" id="acNext">${last ? '看完了，開始小考 ›' : '下一張 ›'}</button></div>`;
            const b = el.querySelector('.ac-say'); if (b) b.onclick = () => ctx.say(it);
            el.querySelector('#acNext').onclick = () => { i++; show(); };
            if (autoSay) ctx.say(it);
            return;
          }
          if (teach[it.id]) {
            // 先教：直接看答案
            el.innerHTML = `${Activity.card(it, { face: 'back', isNew: true, ex: pickEx(it, ctx) })}
              <div class="ac-act ac-dock"><div class="ac-grade two">${btn(3, '😊', '早就會了')}${btn(1, '✓', '記住了，下一張', true)}</div></div>`;
            bind(it); if (autoSay) ctx.say(it);
            return;
          }
          el.innerHTML = `${Activity.card(it, { face: 'front', zhFirst })}
            <div class="ac-act ac-dock">
              <div class="ac-grade two"><button type="button" class="btn ac-flip"><span aria-hidden="true">👀</span>看答案</button>${btn(2, '😊', '記得', true)}</div>
            </div>
            ${p.tog === false ? '' : `<button type="button" class="ac-tog" aria-pressed="${zhFirst}">${zhFirst ? '✓ ' : ''}中文先</button>`}`;
          bind(it);
          if (!zhFirst && autoSay) ctx.say(it);
          const tg = el.querySelector('.ac-tog'); if (tg) tg.onclick = () => { zhFirst = !zhFirst; setPref(zhFirst); show(); };
          el.querySelector('.ac-flip').onclick = () => {
            el.innerHTML = `${Activity.card(it, { face: 'back', ex: pickEx(it, ctx) })}
              <div class="ac-act ac-dock"><div class="ac-grade two">${btn(0, '😵', '忘了')}${btn(1, '🙂', '想起來了', true)}</div></div>`;
            bind(it); if (autoSay) ctx.say(it);
          };
        };
        show();
      }));
    }
  });
})();
