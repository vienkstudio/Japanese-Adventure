/* 實戰特訓：店員問句聽解（多種說法）、看板閱讀、數字快打。
   路由：boot（特訓首頁）、boot-play（params {m:'clerk'|'sign'|'num', f:篩選}） */
(function () {
  'use strict';
  const D = window.DRILLS; if (!D) return;
  const esc = App.esc;
  const N = 10;
  (function css() {
    if (document.getElementById('css-drill')) return;
    const s = document.createElement('style'); s.id = 'css-drill';
    s.textContent = `
.dr{max-width:640px;margin:0 auto;padding:6px 16px 48px}
.dr-h{font-size:1.5em;margin:6px 0 0}
.dr-sub{margin:2px 0 8px;color:var(--muted);font-size:.92em}
.dr-set{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 4px;font-size:.9em}
.dr-set span{color:var(--muted);font-weight:700;margin-right:2px}
.dr-g{display:flex;align-items:center;gap:6px}
.dr-set .dr-tg{padding:7px 11px;min-width:44px}
.dr-tg,.dr-chip{border:none;border-radius:999px;background:var(--chip);padding:7px 14px;font:inherit;font-weight:700;cursor:pointer;color:var(--text)}
.dr-tg.on{background:var(--acc-t);color:var(--acc-d)}
.dr-card{background:var(--card);border-radius:var(--r);box-shadow:var(--shadow);padding:16px;margin:12px 0}
.dr-card h2{margin:0;font-size:1.15em;display:flex;justify-content:space-between;align-items:center;gap:8px}
.dr-card h2 small{font-size:.75em;color:var(--gold);white-space:nowrap}
.dr-card p{margin:4px 0 10px;color:var(--muted);font-size:.9em}
.dr-chips{display:flex;flex-wrap:wrap;gap:6px}
.dr-chip.go{background:var(--pri);color:var(--on-pri)}
.dr-chip:active,.dr-tg:active,.dr-next:active,.dr-pad button:active,.dr-sopt:active{transform:scale(.96)}
.dr-top{display:flex;align-items:center;gap:10px;margin:4px 0 12px}
.dr-top b{font-size:.85em;color:var(--muted);white-space:nowrap}
.dr-tg,.dr-chip,.dr-reveal{min-height:44px}
.dr-bar{flex:1;height:8px;background:var(--line);border-radius:99px;overflow:hidden}
.dr-bar i{display:block;height:100%;background:var(--acc);border-radius:99px;transition:width .3s}
.dr-npc{background:var(--card);border-radius:var(--r);box-shadow:var(--shadow);padding:16px;text-align:center}
.dr-tag{display:inline-block;background:var(--pri-t);color:var(--pri);border-radius:999px;padding:2px 12px;font-size:.8em;font-weight:800}
.dr-play{display:block;margin:12px auto 8px;width:72px;height:72px;border-radius:50%;border:none;background:var(--pri);color:var(--on-pri);font-size:1.8em;cursor:pointer;box-shadow:var(--shadow2)}
.dr-jp{font-size:1.25em;font-weight:700;margin:4px 0 0}
.dr-kana{color:var(--muted);font-size:.85em;margin:0}
.dr-reveal{border:none;background:var(--chip);border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer;color:var(--text)}
.dr-ask{font-weight:800;margin:18px 0 0;text-align:center}
.dr .choices{grid-template-columns:1fr 1fr;margin:10px 0}
.dr .choice{font-size:1em;min-height:52px;line-height:1.35}
.dr .choice small{display:block;font-weight:500;font-size:.78em;opacity:.8}
.dr-fb{margin:12px 0 0;padding:12px 14px;border-radius:14px;font-size:.95em}
.dr-fb.ok{background:var(--ok-t)}.dr-fb.ng{background:var(--err-t)}
.dr-fb p{margin:2px 0}
.dr-alt{list-style:none;padding:0;margin:6px 0 0}
.dr-alt button{display:block;width:100%;text-align:left;border:none;background:var(--card);border-radius:10px;padding:6px 10px;margin:4px 0;font:inherit;cursor:pointer;color:var(--text)}
.dr-alt small{color:var(--muted)}
.dr-next{display:block;margin:16px auto 0;border:none;border-radius:999px;background:var(--pri);color:var(--on-pri);font:inherit;font-weight:800;padding:12px 44px;cursor:pointer}
.dr-sign{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-width:120px;padding:12px 16px;border-radius:10px;line-height:1.2;font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",var(--font)}
.dr-sign b{font-size:1.45em;letter-spacing:.04em}
.dr-sign small{font-size:.72em;opacity:.85;margin-top:4px}
.dr-big{margin:6px 0}.dr-big .dr-sign{min-width:200px;padding:18px 26px}.dr-big .dr-sign b{font-size:2.3em}
.dr-s-y{background:var(--sg-y);color:var(--sg-ink)}.dr-s-g{background:var(--sg-g);color:var(--sg-w)}.dr-s-b{background:var(--sg-b);color:var(--sg-w)}
.dr-s-r{background:var(--sg-w);color:var(--sg-r);box-shadow:inset 0 0 0 3px var(--sg-r)}.dr-s-k{background:var(--sg-k);color:var(--sg-w)}
.dr-s-w{background:var(--sg-w);color:var(--sg-ink);box-shadow:inset 0 0 0 2px var(--sg-ink)}.dr-s-o{background:var(--sg-o);color:var(--sg-w)}.dr-s-p{background:var(--sg-p);color:var(--sg-w)}
.dr-need{font-size:1.1em;font-weight:800;margin:6px 0 0}
.dr-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.dr-sopt{border:3px solid transparent;border-radius:16px;background:var(--chip);padding:10px;cursor:pointer;font:inherit}
.dr-sopt .dr-sign{width:100%}
.dr-sopt.ok{border-color:var(--ok);background:var(--ok-t)}.dr-sopt.ng{border-color:var(--err);background:var(--err-t)}
.dr-sopt:disabled{cursor:default}
.dr-input{display:flex;align-items:baseline;justify-content:center;gap:6px;font-size:2em;font-weight:800;margin:14px 0 10px;min-height:1.6em}
.dr-val{min-width:4ch;border-bottom:3px solid var(--line2);text-align:center}
.dr-val.ok{color:var(--ok);border-color:var(--ok)}.dr-val.ng{color:var(--err);border-color:var(--err)}
.dr-unit{font-size:.5em;color:var(--muted)}
.dr-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:320px;margin:0 auto}
.dr-pad button{border:none;border-radius:16px;background:var(--card);box-shadow:var(--shadow);font:inherit;font-size:1.35em;font-weight:800;padding:12px 0;cursor:pointer;color:var(--text)}
.dr-pad .go{background:var(--pri);color:var(--on-pri)}
.dr-pad button:disabled{opacity:.45;cursor:default}
.dr-line{display:flex;flex-wrap:wrap;gap:6px;min-height:58px;align-items:center;justify-content:center;margin:14px 0 8px;padding:10px;border-radius:16px;border:2px dashed var(--line2);background:var(--card)}
.dr-line.ok{border-style:solid;border-color:var(--ok)}.dr-line.ng{border-style:solid;border-color:var(--err)}
.dr-tiles{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0}
.dr-tile{border:none;border-radius:12px;background:var(--card);box-shadow:var(--shadow);font:inherit;font-size:1.1em;font-weight:700;padding:10px 14px;min-height:44px;cursor:pointer;color:var(--text);font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",var(--font)}
.dr-tile.on{background:var(--pri-t);color:var(--pri)}
.dr-tile.ghost{opacity:.25;box-shadow:none;background:var(--chip);cursor:default}
@media (max-width:420px){.dr-sign{min-width:0}.dr-sign b{font-size:1.2em}.dr-big .dr-sign b{font-size:1.9em}}`;
    document.head.appendChild(s);
  })();

  /* ---------- 小工具 ---------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const OPT = () => { const o = App.state.drillOpt || (App.state.drillOpt = {}); if (!o.rate) o.rate = 0.85; if (o.hint == null) o.hint = App.profile().assist !== 'none'; return o; };
  const speak = t => App.speak(t, OPT().rate);
  const hintOn = () => OPT().hint || (App.voiceOK && App.voiceOK() === false);   // 沒有日文語音：一律顯示文字
  const starsOf = r => r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
  function queue(pool, n) {   // 抽 n 題，不夠就重複洗牌
    let out = [];
    while (out.length < n && pool.length) out = out.concat(App.shuffle(pool.slice()));
    return out.slice(0, n);
  }
  function distinct(pool, n, key, avoid) {   // 抽 n 個 key 不重複、也不等於 avoid 的
    const seen = new Set([avoid]), out = [];
    for (const x of App.shuffle(pool.slice())) { const k = key(x); if (seen.has(k)) continue; seen.add(k); out.push(x); if (out.length >= n) break; }
    return out;
  }

  /* ---------- 數字讀音 ---------- */
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
  const hourK = h => ({ 4: 'よじ', 7: 'しちじ', 9: 'くじ', 14: 'じゅうよじ', 17: 'じゅうしちじ', 19: 'じゅうくじ' })[h] || numKana(h) + 'じ';
  const MIN_K = { 0: '', 5: 'ごふん', 10: 'じゅっぷん', 15: 'じゅうごふん', 20: 'にじゅっぷん', 25: 'にじゅうごふん', 30: 'さんじゅっぷん', 35: 'さんじゅうごふん', 40: 'よんじゅっぷん', 45: 'よんじゅうごふん', 50: 'ごじゅっぷん', 55: 'ごじゅうごふん' };
  const monthK = m => ({ 4: 'しがつ', 7: 'しちがつ', 9: 'くがつ' })[m] || numKana(m) + 'がつ';
  const DAY_K = { 1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか' };
  const dayK = d => DAY_K[d] || numKana(d).replace(/なな$/, 'しち').replace(/きゅう$/, 'く') + 'にち';
  const floorK = n => ({ 1: 'いっかい', 3: 'さんがい', 6: 'ろっかい', 8: 'はっかい', 10: 'じゅっかい', 11: 'じゅういっかい' })[n] || numKana(n) + 'かい';
  const pad2 = n => String(n).padStart(2, '0');
  const SIMILAR_H = { 1: [7, 11], 4: [7, 9, 14], 7: [4, 1, 9], 9: [4, 7, 19], 11: [1, 7, 17], 14: [4, 17, 19], 17: [14, 7, 19], 19: [9, 17, 14] };
  const SIMILAR_M = { 0: [10, 30, 5], 5: [15, 50, 55], 15: [50, 5, 45], 50: [15, 55, 5], 45: [15, 40, 55], 40: [45, 50, 10], 20: [25, 30, 10], 30: [35, 0, 40], 10: [20, 15, 0], 25: [20, 55, 35], 35: [30, 25, 55], 55: [50, 5, 45] };
  const SIMILAR_D = { 1: [7, 10, 11], 2: [20, 12, 22], 3: [13, 23, 6], 4: [8, 14, 24], 5: [9, 15, 25], 6: [7, 16, 26], 7: [6, 1, 17], 8: [4, 18, 28], 9: [5, 19, 25], 10: [1, 20, 11], 14: [4, 24, 17], 20: [2, 10, 12], 24: [14, 4, 20] };
  const near = (map, v, lo, hi) => (map[v] || [v - 1, v + 1, v + 2]).filter(x => x >= lo && x <= hi && x !== v);

  /* ---------- 數字題型 ---------- */
  const lineOf = (arr, x) => pick(arr).replace(/\{x\}/g, x);
  const NUM = {
    price: {
      lb: '💴 價格', unit: '円', gen() {
        const r = Math.random();
        const n = r < 0.35 ? rnd(10, 99) * 10 : r < 0.85 ? rnd(100, 998) * 10 : rnd(100, 398) * 100;
        const line = lineOf(['合計{x}円です。', 'お会計、{x}円になります。', '{x}円のお返しです。', 'こちら{x}円でございます。'], n);
        return { line, ans: String(n), show: '¥' + n.toLocaleString('en-US'), kana: numKana(n) + 'えん', mask: String(n) };
      }
    },
    floor: {
      lb: '🏢 樓層', unit: '階', gen() {
        const n = rnd(1, 12);
        return { line: lineOf(['{x}階でございます。', '朝食会場は{x}階です。', 'お手洗いは{x}階にございます。', '{x}階へどうぞ。'], n), ans: String(n), show: n + ' 樓', kana: floorK(n), mask: String(n) };
      }
    },
    track: {
      lb: '🚉 月台', unit: '番線', gen() {
        const n = rnd(1, 15);
        return { line: lineOf(['まもなく{x}番線に電車がまいります。', '{x}番線から発車いたします。', '{x}番線へお回りください。'], n), ans: String(n), show: '第 ' + n + ' 月台', kana: numKana(n) + 'ばんせん', mask: String(n) };
      }
    },
    car: {
      lb: '🚄 車廂', unit: '号車', gen() {
        const n = rnd(1, 16);
        return { line: lineOf(['{x}号車です。', 'グリーン車は{x}号車です。', 'お客様のお席は{x}号車です。'], n), ans: String(n), show: '第 ' + n + ' 節車廂', kana: numKana(n) + 'ごうしゃ', mask: String(n) };
      }
    },
    people: {
      lb: '👥 人數', unit: '名様', gen() {
        const n = rnd(1, 8);
        return { line: lineOf(['{x}名様ですね。', '{x}名様、ご案内いたします。', '{x}名様でお待ちのお客様、どうぞ。'], n), ans: String(n), show: n + ' 位', kana: numKana(n) + 'めいさま', mask: String(n) };
      }
    },
    time: {
      lb: '🕒 時間', choice: true, gen() {
        const h = rnd(5, 23), m = rnd(0, 11) * 5;
        const fmt = (a, b) => `${a}:${pad2(b)}`;
        const say = (a, b) => `${a}時${b ? b + '分' : ''}`;
        const line = pick(['{x}発の電車です。', 'ラストオーダーは{x}です。', 'チェックアウトは{x}です。', '開店は{x}からです。', '次の電車は{x}です。']).replace('{x}', say(h, m));
        const set = new Set([fmt(h, m)]);
        const hs = near(SIMILAR_H, h, 1, 23), ms = near(SIMILAR_M, m, 0, 59);
        const cand = App.shuffle([...hs.map(x => fmt(x, m)), ...ms.map(x => fmt(h, x)), fmt(pick(hs.length ? hs : [h + 1]), pick(ms.length ? ms : [m]))]);
        for (const c of cand) { if (set.size >= 4) break; set.add(c); }
        while (set.size < 4) set.add(fmt(rnd(5, 23), rnd(0, 11) * 5));
        return { line, ans: fmt(h, m), opts: App.shuffle([...set]), show: fmt(h, m), kana: hourK(h) + MIN_K[m], mask: say(h, m) };
      }
    },
    date: {
      lb: '📅 日期', choice: true, gen() {
        const mo = rnd(1, 12), d = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24, rnd(11, 28)]);
        const fmt = (a, b) => `${a}月${b}日`;
        const line = pick(['ご予約は{x}ですね。', 'こちらは{x}まで有効です。', '{x}はお休みです。', '{x}からセールです。']).replace('{x}', fmt(mo, d));
        const set = new Set([fmt(mo, d)]);
        const ds = near(SIMILAR_D, d, 1, 28), ms = near(SIMILAR_H, mo, 1, 12);
        for (const c of App.shuffle([...ds.map(x => fmt(mo, x)), ...ms.map(x => fmt(x, d))])) { if (set.size >= 4) break; set.add(c); }
        while (set.size < 4) set.add(fmt(rnd(1, 12), rnd(1, 28)));
        return { line, ans: fmt(mo, d), opts: App.shuffle([...set]), show: fmt(mo, d), kana: monthK(mo) + dayK(d), mask: fmt(mo, d) };
      }
    },
    counter: { lb: '🧮 量詞', counter: true }
  };

  /* ---------- 三種模式 ---------- */
  const MODES = {
    clerk: {
      icon: '🗣️', name: '店員問句聽解', desc: '同一件事店員有 3～5 種講法，先聽懂他在問什麼，再選怎麼回。',
      filters: () => [['', '全部']].concat(Object.keys(D.SCENE_NAMES).map(k => [k, D.SCENE_NAMES[k]])),
      size: () => `${D.CLERK.length} 種問題・${D.CLERK.reduce((a, x) => a + x.v.length, 0)} 種說法`,
      build: f => queue(D.CLERK.filter(x => !f || x.s === f), N),
      ask: askClerk
    },
    sign: {
      icon: '🪧', name: '看板閱讀', desc: '車站、廁所、店門口、菜單上的標示：找到你要的那塊牌子。',
      filters: () => [['', '全部']].concat(Object.keys(D.SIGN_CATS).map(k => [k, D.SIGN_CATS[k]])),
      size: () => `${D.SIGNS.length} 個標示`,
      build: f => queue(D.SIGNS.filter(x => !f || x[5] === f), N),
      ask: askSign
    },
    num: {
      icon: '🔢', name: '數字快打', desc: '聽價格、時間、日期、樓層、月台、車廂、人數，打出數字；再加上量詞。',
      filters: () => [['', '全部']].concat(Object.keys(NUM).map(k => [k, NUM[k].lb])),
      size: () => `${Object.keys(NUM).length} 類・${Object.keys(D.COUNTERS).length} 個量詞`,
      build: f => Array.from({ length: N }, () => f || pick(Object.keys(NUM))),
      ask: askNum
    },
    build: {
      icon: '🧩', name: '組句子', desc: '看中文，把詞塊排成正確的日文句子。不只是選，要自己組出來。',
      filters: () => [['', '全部']].concat(buildScenes().map(sc => [sc.id, `${sc.icon || ''} ${sc.name}`])),
      size: () => `${buildPool('').length} 句`,
      build: f => queue(buildPool(f), N),
      ask: askBuild
    }
  };

  /* ---------- 特訓首頁 ---------- */
  function renderHub(el) {
    const o = OPT(), best = App.state.drill || {};
    const rates = [[0.7, '慢'], [0.85, '正常'], [1.05, '快']];
    el.innerHTML = `<section class="dr">
      <h1 class="dr-h">🎧 實戰特訓</h1>
      <p class="dr-sub">旅行時最難的是：聽懂店員、看懂看板、抓住數字</p>${App.voiceHTML ? App.voiceHTML() : ""}
      <div class="dr-set"><div class="dr-g"><span>提示</span><button type="button" class="dr-tg${o.hint ? ' on' : ''}" id="dr-hint">${o.hint ? '👀 顯示文字' : '🙈 只聽聲音'}</button>
        </div><div class="dr-g"><span>語速</span>${rates.map(([r, n]) => `<button type="button" class="dr-tg${o.rate === r ? ' on' : ''}" data-rate="${r}">${n}</button>`).join('')}</div></div>
      ${Object.keys(MODES).map(k => { const M = MODES[k]; const b = best[k] || 0; return `<div class="dr-card">
        <h2>${M.icon} ${esc(M.name)}<small>${b ? '★'.repeat(b) + '☆'.repeat(3 - b) : ''}</small></h2>
        <p>${esc(M.desc)}<br><small>${esc(M.size())}</small></p>
        <div class="dr-chips">${M.filters().map(([f, n], i) => `<button type="button" class="dr-chip${i ? '' : ' go'}" data-m="${k}" data-f="${f}">${i ? '' : '▶ '}${esc(n)}</button>`).join('')}</div>
      </div>`; }).join('')}
    </section>`;
    el.querySelector('#dr-hint').onclick = () => { o.hint = !o.hint; App.save(); renderHub(el); };
    el.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { o.rate = +b.dataset.rate; App.save(); speak('いらっしゃいませ'); renderHub(el); });
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => App.go('boot-play', { m: b.dataset.m, f: b.dataset.f }));
  }

  /* ---------- 一輪 10 題 ---------- */
  function renderPlay(el, params) {
    const mode = (params && params.m) || 'clerk', f = (params && params.f) || '';
    const M = MODES[mode]; if (!M) { App.go('boot'); return; }
    const qs = M.build(f);
    if (!qs.length) { App.go('boot'); return; }
    const R = { i: 0, pts: 0, max: 0, wrong: [] };
    const G = window.Game || { sfx() { } };
    function show() {
      el.innerHTML = `<section class="dr">
        <div class="dr-top"><b>${M.icon} ${R.i + 1}／${qs.length}</b><div class="dr-bar"><i style="width:${R.i / qs.length * 100}%"></i></div><b>${R.pts} 分</b></div>
        <div id="dr-q"></div><div id="dr-after"></div></section>`;
      const body = el.querySelector('#dr-q');
      M.ask(body, qs[R.i], (got, max, item) => {
        R.pts += got; R.max += max;
        if (got < max && item) { Tracker.add(item, true); if (!R.wrong.some(w => w.id === item.id)) R.wrong.push(item); }
        try { G.sfx(got === max ? 'ok' : 'hurt'); } catch (e) { }
        const after = el.querySelector('#dr-after');
        after.innerHTML = `<button type="button" class="dr-next">${R.i + 1 >= qs.length ? '看結果' : '下一題 ➜'}</button>`;
        const nb = after.querySelector('.dr-next');
        nb.onclick = () => { if (++R.i < qs.length) show(); else finish(); };
        nb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
    function finish() {
      const stars = starsOf(R.max ? R.pts / R.max : 0);
      const best = App.state.drill || (App.state.drill = {});
      if (stars > (best[mode] || 0)) best[mode] = stars;
      App.save();
      // 全站 XP 規則：首次依星數、刷新星數補差額、重玩沒進步只給 3 XP
      const gained = App.reward('boot:' + mode + ':' + f, stars, '實戰特訓・' + M.name).gained;
      App.showResult({
        title: stars ? `${M.icon} ${M.name} 完成！` : '再練一次',
        stars, correct: R.pts, total: R.max, gained, wrong: R.wrong,
        retry: () => App.go('boot-play', { m: mode, f }),
        back: { label: '回特訓', route: 'boot' }
      });
    }
    show();
  }

  /* ---------- 店員問句：先聽懂意思，再選回應 ---------- */
  function askClerk(body, it, report) {
    const v = pick(it.v), hint = hintOn();
    const same = D.CLERK.filter(x => x.s === it.s && x !== it);
    const zhOpts = App.shuffle([it.zh].concat(distinct(same, 3, x => x.zh, it.zh).map(x => x.zh)));
    const txt = `<p class="jp dr-jp" lang="ja">${esc(v[0])}</p><p class="dr-kana" lang="ja">${esc(v[1])}</p>`;
    body.innerHTML = `<div class="dr-npc"><span class="dr-tag">${esc(D.SCENE_NAMES[it.s] || '')}・店員</span>
        <button type="button" class="dr-play" aria-label="再聽一次">🔊</button>
        <div class="dr-say">${hint ? txt : '<button type="button" class="dr-reveal">👀 看文字</button>'}</div></div>
      <p class="dr-ask">店員在說什麼？</p>
      <div class="choices" id="dr-c1">${zhOpts.map((z, i) => `<button type="button" class="choice" data-i="${i}">${esc(z)}</button>`).join('')}</div>
      <div id="dr-s2"></div>`;
    const say = body.querySelector('.dr-say');
    body.querySelector('.dr-play').onclick = () => speak(v[0]);
    const rv = body.querySelector('.dr-reveal'); if (rv) rv.onclick = () => { say.innerHTML = txt; };
    setTimeout(() => { if (body.isConnected) speak(v[0]); }, 250);
    let got1 = 0;
    const item = App.wordItem({ jp: v[0], kana: v[1], zh: `店員：${it.zh}｜回：${it.a[0]}` }, '店員問句', 'phrase');
    const c1 = body.querySelectorAll('#dr-c1 .choice');
    c1.forEach(b => b.onclick = () => {
      const ok = zhOpts[+b.dataset.i] === it.zh; got1 = ok ? 1 : 0;
      c1.forEach(x => { x.disabled = true; if (zhOpts[+x.dataset.i] === it.zh) x.classList.add('ok'); });
      if (!ok) b.classList.add('ng');
      say.innerHTML = txt;
      step2();
    });
    function step2() {
      const others = D.CLERK.filter(x => x.s !== it.s && !x.g && x.a[0] !== it.a[0]);
      const reps = App.shuffle([it.a].concat(distinct(others, 2, x => x.a[0], it.a[0]).map(x => x.a)));
      const alts = it.v.filter(x => x !== v);
      const s2 = body.querySelector('#dr-s2');
      s2.innerHTML = `<div class="dr-fb ${got1 ? 'ok' : 'ng'}"><p><b>${got1 ? '✅ 聽懂了' : '❌ 他是在問'}：${esc(it.zh)}</b></p>
          <p class="dr-kana">同一個意思，店員也可能這樣說（點一下聽）：</p>
          ${App.trackBtn(item)}<ul class="dr-alt">${alts.map((x, i) => `<li><button type="button" data-a="${i}" lang="ja">🔈 ${esc(x[0])} <small>${esc(x[1])}</small></button></li>`).join('')}</ul></div>
        <p class="dr-ask">你要怎麼回？</p>
        <div class="choices" id="dr-c2">${reps.map((r, i) => `<button type="button" class="choice jp" lang="ja" data-i="${i}">${esc(r[0])}</button>`).join('')}</div>`;
      s2.querySelectorAll('[data-a]').forEach(b => b.onclick = () => speak(alts[+b.dataset.a][0]));
      const c2 = s2.querySelectorAll('#dr-c2 .choice');
      c2.forEach(b => b.onclick = () => {
        const ok = reps[+b.dataset.i] === it.a;
        c2.forEach(x => { x.disabled = true; const r = reps[+x.dataset.i]; x.innerHTML = `${esc(r[0])}<small>${esc(r[1])}</small>`; if (r === it.a) x.classList.add('ok'); });
        if (!ok) b.classList.add('ng');
        speak(it.a[0]);
        report(got1 + (ok ? 1 : 0), 2, item);
      });
    }
  }

  /* ---------- 看板：找牌子／看牌子選意思 ---------- */
  const plate = (s, kana) => `<span class="dr-sign dr-s-${s[3]}"><b lang="ja">${esc(s[0])}</b>${kana ? `<small lang="ja">${esc(s[1])}</small>` : ''}</span>`;
  function askSign(body, s, report) {
    const hint = hintOn();
    const pool = D.SIGNS.filter(x => x !== s && x[2] !== s[2] && x[4] !== s[4]);
    const same = pool.filter(x => x[5] === s[5]);
    let dis = distinct(same, 3, x => x[2], s[2]);
    if (dis.length < 3) dis = dis.concat(distinct(pool.filter(x => !dis.includes(x)), 3 - dis.length, x => x[2], s[2]));
    const opts = App.shuffle([s].concat(dis));
    const item = App.wordItem({ jp: s[0], kana: s[1], zh: s[2] }, '看板', 'word');
    const findMode = Math.random() < 0.5;
    if (findMode) {
      body.innerHTML = `<div class="dr-npc"><span class="dr-tag">${esc(D.SIGN_CATS[s[5]] || '')}</span><p class="dr-need">📍 ${esc(s[4])}</p><p class="dr-kana">要找哪一塊牌子？</p></div>
        <div class="dr-sgrid">${opts.map((x, i) => `<button type="button" class="dr-sopt" data-i="${i}">${plate(x, hint)}</button>`).join('')}</div><div id="dr-fb"></div>`;
    } else {
      body.innerHTML = `<div class="dr-npc"><span class="dr-tag">${esc(D.SIGN_CATS[s[5]] || '')}</span><div class="dr-big">${plate(s, hint)}</div><p class="dr-kana">這塊牌子是什麼意思？</p></div>
        <div class="choices">${opts.map((x, i) => `<button type="button" class="choice" data-i="${i}">${esc(x[2])}</button>`).join('')}</div><div id="dr-fb"></div>`;
    }
    const btns = body.querySelectorAll('[data-i]');
    btns.forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.i] === s;
      btns.forEach(x => { x.disabled = true; if (opts[+x.dataset.i] === s) x.classList.add('ok'); });
      if (!ok) b.classList.add('ng');
      if (findMode) body.querySelectorAll('.dr-sopt').forEach((x, i) => { x.innerHTML = plate(opts[i], true) + `<div class="dr-kana" style="margin-top:4px">${esc(opts[i][2])}</div>`; });
      speak(s[1]);
      body.querySelector('#dr-fb').innerHTML = `<div class="dr-fb ${ok ? 'ok' : 'ng'}"><p><b>${ok ? '✅ 對了' : '❌ 正確是'}：<span lang="ja">${esc(s[0])}</span>（${esc(s[1])}）＝${esc(s[2])}</b></p>${App.trackBtn(item)}</div>`;
      report(ok ? 1 : 0, 1, item);
    });
  }

  /* ---------- 數字：聽了打數字／選時間日期／選量詞 ---------- */
  function askNum(body, type, report) {
    const T = NUM[type] || NUM.price;
    if (T.counter) return askCounter(body, report);
    const q = T.gen(), hint = hintOn();
    const masked = q.line.replace(q.mask, '＿＿');
    body.innerHTML = `<div class="dr-npc"><span class="dr-tag">${esc(T.lb)}</span>
        <button type="button" class="dr-play" aria-label="再聽一次">🔊</button>
        <div class="dr-say">${hint ? `<p class="jp dr-jp" lang="ja">${esc(masked)}</p>` : '<p class="dr-kana">只聽聲音，抓出數字</p>'}</div></div>
      ${T.choice ? `<div class="choices">${q.opts.map((o, i) => `<button type="button" class="choice" data-i="${i}">${esc(o)}</button>`).join('')}</div>`
        : `<div class="dr-input"><span class="dr-val">&nbsp;</span><span class="dr-unit">${esc(T.unit)}</span></div>
           <div class="dr-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="del">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" class="go">✓</button></div>`}
      <div id="dr-fb"></div>`;
    body.querySelector('.dr-play').onclick = () => speak(q.line);
    setTimeout(() => { if (body.isConnected) speak(q.line); }, 250);
    const item = { id: 'num:' + type + ':' + q.ans, jp: q.line, kana: q.kana, zh: `${T.lb.replace(/^\S+\s/, '')}：${q.show}`, source: '數字快打' };
    let done = false;
    function judge(ok, btn) {
      if (done) return; done = true;
      body.querySelector('.dr-say').innerHTML = `<p class="jp dr-jp" lang="ja">${esc(q.line)}</p>`;
      body.querySelector('#dr-fb').innerHTML = `<div class="dr-fb ${ok ? 'ok' : 'ng'}"><p><b>${ok ? '✅ 對了' : '❌ 正確是'}：${esc(q.show)}</b></p><p class="dr-kana" lang="ja">${esc(q.kana)}</p>${App.trackBtn(item)}</div>`;
      report(ok ? 1 : 0, 1, item);
    }
    if (T.choice) {
      const bs = body.querySelectorAll('.choice');
      bs.forEach(b => b.onclick = () => {
        const ok = q.opts[+b.dataset.i] === q.ans;
        bs.forEach(x => { x.disabled = true; if (q.opts[+x.dataset.i] === q.ans) x.classList.add('ok'); });
        if (!ok) b.classList.add('ng');
        judge(ok);
      });
      return;
    }
    const val = body.querySelector('.dr-val');
    let s = '';
    const paint = () => { val.textContent = s || ' '; };
    function key(k) {
      if (done || !body.isConnected) return;
      if (k === 'del') s = s.slice(0, -1);
      else if (k === 'ok') {
        if (!s) return;
        const ok = s === q.ans;
        val.classList.add(ok ? 'ok' : 'ng');
        if (!ok) val.textContent = `${s} → ${q.ans}`;
        body.querySelectorAll('.dr-pad button').forEach(b => { b.disabled = true; });
        judge(ok); return;
      } else if (s.length < 6) s = (s === '0' ? '' : s) + k;
      paint();
    }
    body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => key(b.dataset.k));
    const onKey = e => {
      if (!body.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (done) return;
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === 'Backspace') key('del');
      else if (e.key === 'Enter') { e.preventDefault(); key('ok'); }
    };
    document.addEventListener('keydown', onKey);
  }

  /* ---------- 組句子：把句子切成詞塊（助詞、句尾、逗號為界），排回原句 ---------- */
  const STRONG = /[一-鿿ァ-ヺー0-9A-Za-z々]/;
  const NO_SPLIT = ['です', 'でし', 'でき', 'がり', 'にな', 'にし', 'とう', 'でご', 'がっ', 'にく'];
  const ENDS = ['ください', 'お願いします', 'ですか', 'でしょうか'];
  const NEAR = ['これ', 'それ', 'あれ', 'どこ', 'ここ', 'そこ', 'どれ'];
  function chunk(jp) {
    jp = String(jp).replace(/[。！!]$/, '');
    const out = []; let cur = '';
    for (let i = 0; i < jp.length; i++) {
      const c = jp[i], prev = jp[i - 1] || '', prev2 = jp.slice(Math.max(0, i - 2), i), nx = jp[i + 1] || '';
      cur += c;
      if ('、？?'.includes(c)) { out.push(cur); cur = ''; continue; }
      if ('をはがにでへとも'.includes(c) && cur.length > 1 && (STRONG.test(prev) || NEAR.includes(prev2)) && nx && nx !== '、' && !NO_SPLIT.includes(c + nx)) { out.push(cur); cur = ''; continue; }
      const two = jp.slice(i - 1, i + 1);
      if ((two === 'から' || two === 'まで') && cur.length > 2 && nx) { out.push(cur); cur = ''; continue; }
      if (cur && ENDS.includes(jp.slice(i + 1))) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out.map(x => x.trim()).filter(Boolean);
  }
  const buildScenes = () => (window.SCENES || []).filter(sc => sc && sc.id && (sc.phrases || []).some(p => { const n = chunk(p.jp).length; return n >= 3 && n <= 6; }));
  const buildPool = f => (window.SCENES || []).filter(sc => !f || sc.id === f).flatMap(sc => (sc.phrases || []).map(p => ({ p, sc, parts: chunk(p.jp) }))).filter(x => x.parts.length >= 3 && x.parts.length <= 6);
  function askBuild(body, q, report) {
    const { p, sc, parts } = q, hint = hintOn();
    let tiles = App.shuffle(parts.map((t, i) => ({ t, i })));
    if (tiles.every((x, k) => x.i === k)) tiles = tiles.reverse();
    const picked = [];
    const item = App.wordItem(p, sc.name, 'phrase');
    body.innerHTML = `<div class="dr-npc"><span class="dr-tag">${esc(sc.icon || '')} ${esc(sc.name)}</span>
        <p class="dr-need">💬 ${esc(p.zh)}</p>${p.use ? `<p class="dr-kana">🕒 ${esc(p.use)}</p>` : ''}
        ${hint ? `<button type="button" class="dr-reveal" id="dr-hear">🔊 聽一次</button>` : ''}</div>
      <div class="dr-line" id="dr-line" aria-label="你組的句子"></div>
      <div class="dr-tiles" id="dr-tiles"></div>
      <button type="button" class="dr-next" id="dr-check" disabled>✅ 確認</button>
      <div id="dr-fb"></div>`;
    const line = body.querySelector('#dr-line'), box = body.querySelector('#dr-tiles'), chk = body.querySelector('#dr-check');
    const hear = body.querySelector('#dr-hear'); if (hear) hear.onclick = () => speak(p.kana || p.jp);
    let done = false;
    const paint = () => {
      line.innerHTML = picked.length ? picked.map((x, k) => `<button type="button" class="dr-tile on" data-k="${k}" lang="ja">${esc(x.t)}</button>`).join('') : '<span class="dr-kana">點下面的詞塊，依順序排成句子</span>';
      box.innerHTML = tiles.map((x, k) => picked.includes(x) ? `<span class="dr-tile ghost">${esc(x.t)}</span>` : `<button type="button" class="dr-tile" data-t="${k}" lang="ja">${esc(x.t)}</button>`).join('');
      chk.disabled = picked.length !== parts.length || done;
      line.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { if (done) return; picked.splice(+b.dataset.k, 1); paint(); });
      box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (done) return; picked.push(tiles[+b.dataset.t]); App.speak(tiles[+b.dataset.t].t); paint(); });
    };
    paint();
    chk.onclick = () => {
      if (done) return; done = true;
      const ok = picked.map(x => x.t).join('') === parts.join('');
      line.classList.add(ok ? 'ok' : 'ng'); chk.disabled = true;
      speak(p.kana || p.jp);
      body.querySelector('#dr-fb').innerHTML = `<div class="dr-fb ${ok ? 'ok' : 'ng'}"><p><b>${ok ? '✅ 組對了' : '❌ 正確順序'}：</b><span lang="ja">${esc(parts.join(' ／ '))}</span></p><p class="dr-kana" lang="ja">${esc(p.kana || '')}</p>${App.trackBtn(item)}</div>`;
      report(ok ? 1 : 0, 1, item);
    };
  }

  function askCounter(body, report) {
    const it = pick(D.COUNT_ITEMS), n = rnd(1, 5);
    const form = c => [D.COUNTERS[c][(n - 1) * 2], D.COUNTERS[c][(n - 1) * 2 + 1]];
    const bad = Object.keys(D.COUNTERS).filter(c => c !== it[2] && c !== it[3]);
    const cs = App.shuffle([it[2]].concat(App.sample(bad, 3)));
    const ans = form(it[2]);
    body.innerHTML = `<div class="dr-npc"><span class="dr-tag">🧮 量詞</span>
        <p class="dr-need">🧾 ${esc(it[1])} × ${n}</p><p class="dr-kana" lang="ja">${esc(it[0])}を……</p></div>
      <p class="dr-ask">數量要怎麼說？</p>
      <div class="choices">${cs.map((c, i) => { const f = form(c); return `<button type="button" class="choice jp" lang="ja" data-i="${i}">${esc(f[0])}<small>${esc(f[1])}</small></button>`; }).join('')}</div>
      <div id="dr-fb"></div>`;
    const item = { id: 'cnt:' + it[0] + ':' + n, jp: `${it[0]} ${ans[0]}`, kana: ans[1], zh: `${it[1]} × ${n}（${it[4]}）`, source: '量詞' };
    const bs = body.querySelectorAll('.choice');
    bs.forEach(b => b.onclick = () => {
      const ok = cs[+b.dataset.i] === it[2];
      bs.forEach(x => { x.disabled = true; if (cs[+x.dataset.i] === it[2]) x.classList.add('ok'); });
      if (!ok) b.classList.add('ng');
      speak(`${it[0]}、${ans[1]}`);
      body.querySelector('#dr-fb').innerHTML = `<div class="dr-fb ${ok ? 'ok' : 'ng'}"><p><b>${ok ? '✅ 對了' : '❌ 正確是'}：<span lang="ja">${esc(it[0])} ${esc(ans[0])}（${esc(ans[1])}）</span></b></p><p>${esc(it[4])}</p>${App.trackBtn(item)}</div>`;
      report(ok ? 1 : 0, 1, item);
    });
  }

  App.register('boot', { title: '特訓', icon: '🎧', nav: false, navParent: 'home', render: renderHub });
  App.register('boot-play', { title: '特訓', icon: '🎧', nav: false, navParent: 'home', render: renderPlay });
  window.DrillAPI = { numKana, hourK, dayK, monthK, floorK, MODES, NUM };
})();
