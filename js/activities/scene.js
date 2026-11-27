/* 活動 scene：場景對話（旅遊場景包的課；取代字卡自評）
   資料：SCENES[].dialogues[].steps[{speaker, emoji, jp, kana, romaji, zh, choices:[{jp, kana, zh, correct, feedback}]}]
   流程（一個活動內）：
     ① 看對話：店員與你的完整對話（每句可點 🔊），按「開始練習」
     ② 聽力：只播店員的話（看不到字），選意思（4 選 1）
     ③ 完成對話：照對話順序，店員說一句 → 你從選項挑回應；選錯顯示原因，再選一次（該句記為答錯）
   params：{ scenes:[場景 id], n?: 聽力題數（預設 4）, dialogs?: 用幾段對話（預設 1） }
   計分：每句（聽力、回應）各記一次：一次答對 2、答錯 0（Learn 進不會清單） */
(function () {
  'use strict';
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const arr = a => Array.isArray(a) ? a : [];
  const SC = ['data/scenes-1.js', 'data/scenes-2.js', 'data/scene-ext.js'];
  const loadSC = () => window.SCENES ? Promise.resolve() : SC.reduce((p, s) => p.then(() => App.loadScript(s).catch(() => { })), Promise.resolve());
  const goodOf = st => arr(st.choices).find(c => c.correct) || null;

  Activity.register('scene', {
    needItems: false,
    available: st => arr(st.params && st.params.scenes).length > 0,
    start(el, ctx) {
      const p = ctx.params, esc = ctx.esc, noVoice = ctx.voice === false;
      return loadSC().then(() => new Promise(resolve => {
        const all = arr(window.SCENES), scs = arr(p.scenes).map(id => all.find(s => s.id === id)).filter(Boolean);
        const ds = shuf(scs.flatMap(sc => arr(sc.dialogues).filter(d => arr(d.steps).some(goodOf)).map(d => ({ sc, d })))).slice(0, p.dialogs || 1);
        if (!ds.length) return resolve({ results: [] });
        const steps = ds.flatMap(({ sc, d }) => d.steps.filter(goodOf).map(s => Object.assign({ sc: sc.name, title: d.title }, s)));
        const it = (x, src) => ctx.item({ jp: x.jp, kana: x.kana, zh: x.zh, romaji: x.romaji, source: src }, 'phrase');
        const aid = ctx.assist().kana;
        const line = (who, ic, x, me) => `<div class="sc-l${me ? ' me' : ''}"><span class="sc-who" aria-hidden="true">${esc(ic)}</span><div class="sc-b"><small>${esc(who)}</small>
          <b class="jp" lang="ja">${esc(x.jp)}</b>${aid && x.kana && x.kana !== x.jp ? `<i class="jp" lang="ja">${esc(x.kana)}</i>` : ''}${aid ? `<em>${esc(x.zh || '')}</em>` : ''}</div>
          <button type="button" class="sc-say" data-say="${esc(x.kana || x.jp)}" aria-label="聽">🔊</button></div>`;
        const bindSay = host => host.querySelectorAll('[data-say]').forEach(b => b.onclick = () => ctx.say(b.dataset.say));

        // ① 看對話
        const intro = () => {
          ctx.progress(0, 1);
          el.innerHTML = `<p class="ac-ask">${esc(ds.map(x => x.sc.icon + ' ' + x.sc.name + '・' + (x.d.title || '對話')).join('、'))}：先聽一遍</p>
            <div class="sc-chat">${steps.map(s => line(s.speaker || '店員', s.emoji || '🧑‍💼', s) + line('你', '🙋', goodOf(s), true)).join('')}</div>
            <div class="ac-act"><button type="button" class="btn primary block" id="sc-go">▶ 開始練習</button></div>`;
          bindSay(el);
          el.querySelector('#sc-go').onclick = listen;
        };

        // ② 聽力：聽店員的話選意思
        const clerk = shuf(steps).slice(0, Math.min(p.n || 4, steps.length));
        const zhPool = all.flatMap(sc => arr(sc.dialogues).flatMap(d => arr(d.steps).map(s => s.zh))).filter(Boolean);
        let k = 0;
        const listen = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const s = clerk[k]; if (!s) { k = 0; return talk(); }
          ctx.progress(k, clerk.length + steps.length);
          const dis = shuf(zhPool.filter(z => z !== s.zh && !steps.some(x => x.zh === z))).filter((z, i, a) => a.indexOf(z) === i).slice(0, 3);
          const opts = shuf([s.zh].concat(dis));
          el.innerHTML = `<div class="ac-card">${noVoice ? `<p class="ac-jp jp long" lang="ja">${esc(s.jp)}</p><p class="ac-note">🔇 看字作答</p>` : '<button type="button" class="ac-play" aria-label="再聽一次">🔊</button>'}</div>
            <p class="ac-ask">${esc(s.speaker || '店員')}說了什麼？</p>
            <div class="ac-opts">${opts.map((o, i) => `<button type="button" class="btn block" data-o="${i}">${esc(o)}</button>`).join('')}</div><div class="ac-fb" aria-live="polite"></div>`;
          const say = () => ctx.say(s.kana || s.jp);
          const pl = el.querySelector('.ac-play'); if (pl) pl.onclick = say;
          if (!noVoice) say();
          el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
            const ok = opts[+b.dataset.o] === s.zh;
            el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (opts[+x.dataset.o] === s.zh) x.classList.add('ok'); });
            if (!ok) b.classList.add('ng');
            ctx.sfx(ok, b); ctx.mark(it(s, s.sc), ok ? 2 : 0);
            const fb = el.querySelector('.ac-fb');
            fb.className = 'ac-fb ' + (ok ? 'ok' : 'ng');
            fb.innerHTML = `<p>${ok ? '✓ 答對了！' : '✗ 正確答案：' + esc(s.zh)}</p><div class="ac-exp"><span class="jp" lang="ja">${esc(s.jp)}</span></div>`;
            ctx.advance(ok, el, () => { k++; listen(); }, 900);
          });
        };

        // ③ 完成對話：逐句選回應
        const said = [];
        const talk = () => {
          if (!ctx.alive()) return resolve({ results: ctx.results });
          const s = steps[k];
          if (!s) return resolve({ results: ctx.results, meta: { dialogs: ds.length, lines: steps.length } });
          ctx.progress(clerk.length + k, clerk.length + steps.length);
          const opts = shuf(arr(s.choices));
          let miss = false;
          el.innerHTML = `<p class="ac-ask">完成對話：選你要說的話</p>
            <div class="sc-chat">${said.join('')}${line(s.speaker || '店員', s.emoji || '🧑‍💼', s)}</div>
            <div class="ac-opts">${opts.map((o, i) => `<button type="button" class="btn block jp" lang="ja" data-o="${i}">${esc(o.jp)}${aid ? `<span class="sc-oz">${esc(o.zh || '')}</span>` : ''}</button>`).join('')}</div><div class="ac-fb" aria-live="polite"></div>`;
          bindSay(el);
          if (!noVoice) ctx.say(s.kana || s.jp);
          const chat = el.querySelector('.sc-chat'); chat.scrollTop = chat.scrollHeight;
          el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
            const o = opts[+b.dataset.o], fb = el.querySelector('.ac-fb');
            if (!o.correct) {
              miss = true; b.disabled = true; b.classList.add('ng'); ctx.sfx(false, b);
              fb.className = 'ac-fb ng'; fb.innerHTML = `<p>✗ ${esc(o.feedback || '這樣回不太對，再選一次')}</p>`;
              return;
            }
            el.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; });
            b.classList.add('ok'); ctx.sfx(true, b);
            ctx.mark(it(o, s.sc), miss ? 0 : 2);
            if (!noVoice) ctx.say(o.kana || o.jp);
            fb.className = 'ac-fb ok'; fb.innerHTML = `<p>✓ ${esc(o.feedback || '答對了！')}</p>`;
            said.push(line(s.speaker || '店員', s.emoji || '🧑‍💼', s) + line('你', '🙋', o, true));
            ctx.advance(false, el, () => { k++; talk(); });
          });
        };
        intro();
      }));
    }
  });
})();
