/* 五十音出題與資料（v13：講義分頁已拿掉；五十音表在路線五十音分頁，由 js/classic.js 的 PathExtra.kanaTable 畫）。
   window.KanaLesson = {
     units() -> [{id:'k1'..'k10'、'k11-1..3'、'k12-1..3', title, chars}]（每課 ≤10 字）,
     unitInfo(id) -> {id, title, chars, items, intro(html), more:{title, html}|null}（路線頁五十音 12 單元）,
     quiz(box, {pool}) 50 音小考（聽音選字／看字選音／平↔片，各 10 題；PathExtra 的「50 音小考」路由 kana-quiz 用）,
     itemOf(k) }
   資料：kana-data.js 的 KANA／DAKU／YOON／GRID／ROW_NAMES。不會清單 id：'kana:<平假名>'。 */
(function () {
  'use strict';
  const esc = App.esc;
  const KA = typeof KANA !== 'undefined' ? KANA : [];
  const DK = typeof DAKU !== 'undefined' ? DAKU : [];
  const YO = typeof YOON !== 'undefined' ? YOON : [];
  const GR = typeof GRID !== 'undefined' ? GRID : [];
  const ALL = KA.concat(DK, YO);
  const BY = {}; ALL.forEach(k => { if (!BY[k[0]]) BY[k[0]] = k; });

  const ST = { sc: 'h', qt: 'listen', qp: 'seion' };

  const rn = r => String(r || '').replace(/\s*\(.*\)/, '');          // 'o (wo)' → 'o'
  const isKana = k => k && k.length >= 9;
  function itemOf(k) {
    if (isKana(k)) return App.kanaItem(k);
    return { id: 'kana:' + k[0], jp: k[0] + '・' + k[1], kana: k[0], romaji: k[2], zh: '讀音 ' + k[2] + '（諧音：' + k[3] + '）', hint: '', emoji: '', source: '五十音' };
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const seg = (attr, list, cur, cls) => `<div class="kn-seg${cls ? ' ' + cls : ''}" role="group">${list.map(([v, n]) => `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${n}</button>`).join('')}</div>`;

  /* ---------- 單元補充說明（路線五十音單元 more 用：s2 母音、s5 濁音、s6 拗音） ---------- */
  const sayJ = (jp, label) => `<button type="button" class="kn-sj" data-ks="${esc(jp)}" lang="ja">${label || esc(jp)}</button>`;   // label 是本檔寫死的 HTML
  const face = (m, ch, ro, zh) => `<button type="button" class="kn-face" data-ks="${ch}"><svg viewBox="-60 -30 120 120" aria-hidden="true"><circle cx="0" cy="30" r="55" class="sk"/><circle cx="-18" cy="12" r="5" class="ey"/><circle cx="18" cy="12" r="5" class="ey"/>${m}</svg><b lang="ja">${ch} ${ro}</b><small>${zh}</small></button>`;
  const tbl = (head, rows) => { const w = Math.max(...rows.map(r => r.length)); return `<div class="kn-tw"><table class="kn-tb">${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th>${c}</th>` : `<td${i === r.length - 1 && r.length < w ? ` colspan="${w - r.length + 1}"` : ''}>${c}</td>`).join('')}</tr>`).join('')}</table></div>`; };

  const CH = [
    ['s2', '2. 先學五個母音：あいうえお', () => `<p>日文只有 <b>5 個母音</b>，所有的音都是「子音＋這 5 個母音」組成。學會這 5 個，等於打通任督二脈！</p>
      <div class="kn-faces">${face('<ellipse cx="0" cy="48" rx="20" ry="18" class="mo"/>', 'あ', 'a', '嘴巴張大「啊」')}${face('<rect x="-24" y="42" width="48" height="8" rx="4" class="mo"/>', 'い', 'i', '嘴角往兩邊拉「衣」')}${face('<ellipse cx="0" cy="48" rx="8" ry="7" class="mo"/>', 'う', 'u', '嘴唇微嘟、不要太圓「屋」')}${face('<ellipse cx="0" cy="47" rx="20" ry="9" class="mo"/>', 'え', 'e', '半開、嘴角稍拉「欸」')}${face('<ellipse cx="0" cy="48" rx="13" ry="14" class="mo"/>', 'お', 'o', '嘴巴圓圓「喔」')}</div>
      <h4>🧩 組合魔法：子音 × 母音</h4>
      ${tbl(['', 'a 啊', 'i 衣', 'u 屋', 'e 欸', 'o 喔'], [['（無）', 'あ', 'い', 'う', 'え', 'お'], ['k', 'か', 'き', 'く', 'け', 'こ'], ['s', 'さ', 'し', 'す', 'せ', 'そ']].map(r => r.map((c, i) => i ? sayJ(c, c + ' ' + (c === 'し' ? '<b class="kn-em">shi</b>' : rn(BY[c][2]))) : c)))}
      <div class="kn-tip">⚠️ 特例只有幾個要注意：<span lang="ja">し</span>＝shi、<span lang="ja">ち</span>＝chi、<span lang="ja">つ</span>＝tsu、<span lang="ja">ふ</span>＝fu、<span lang="ja">ん</span>＝n。其他都照規則拼！</div>
      <div class="kn-key">🎵 <b>口訣：</b>「<span lang="ja">あいうえお</span>」＝「啊～衣～屋～欸～喔」，把它當成一首歌，每天唸 10 遍。</div>`],
    ['s5', '5. 濁音・半濁音：加兩點、加小圈', () => `<div class="kn-eq" lang="ja"><span>か</span><i>＋</i><span class="hl">゛</span><i>＝</i><span>が</span><span class="sp"></span><span>は</span><i>＋゜＝</i><span>ぱ</span></div>
      <p class="kn-eqn">ka 卡 → 兩點＝聲音變「濁」→ ga 嘎；ha 哈 → pa 趴</p>
      <div class="kn-key">🔑 <b>規則：</b>k→g、s→z、t→d、h→b（加兩點 ゛）；h→p（加小圈 ゜）。只有這 5 行會變！</div>
      <div class="kn-tip">💡 <span lang="ja">ぢ・づ</span> 發音同 <span lang="ja">じ・ず</span>，很少用，先認得就好。</div>
      <button type="button" class="kn-go" data-kopen="daku">゛ 看濁音・半濁音表（25 個）</button>`],
    ['s6', '6. 拗音・促音・長音', () => `<h4>① 拗音：「い段字＋小ゃゅょ」黏在一起</h4>
      <div class="kn-eq" lang="ja"><span>き</span><i>＋</i><span class="hl sm">ゃ</span><i>＝</i><span>きゃ</span></div>
      <p class="kn-eqn">ki ＋ 小寫的 ya ＝ kya「卡呀」快速唸成一拍</p>
      <button type="button" class="kn-go" data-kopen="yoon">ゃ 看拗音表（27 個）</button>
      <h4>② 促音：小「っ」＝停一拍（憋氣）</h4>
      <div class="kn-2"><button type="button" class="kn-sb" data-ks="きって"><span class="big" lang="ja">きって</span>kitte 郵票<br>🛑「ki～(憋)～te」</button><button type="button" class="kn-sb" data-ks="きて"><span class="big" lang="ja">きて</span>kite 來<br>沒有停頓</button></div>
      <div class="kn-tip">💡 小「っ」本身不發音，像音樂的「休止符」，佔一拍時間。羅馬字寫成重複下一個子音（tt、kk、pp）。</div>
      <h4>③ 長音：拉長一拍</h4>
      ${tbl(null, [['平假名', sayJ('おばさん') + '（阿姨）', sayJ('おばあさん', 'おば<b class="kn-em">あ</b>さん') + '（奶奶）'], ['片假名', '用「ー」表示：' + sayJ('コーヒー', 'コ<b class="kn-em">ー</b>ヒ<b class="kn-em">ー</b>') + '（coffee）、' + sayJ('ケーキ', 'ケ<b class="kn-em">ー</b>キ') + '（cake）']])}
      <div class="kn-key">🔑 長短音會改變意思！<span lang="ja">おばさん</span>是阿姨、<span lang="ja">おばあさん</span>是奶奶，叫錯會被瞪 😅</div>`],
  ];
  /* ---------- 小練習：聽音選字、看字選音、平↔片（各 10 題） ---------- */
  // 已學：與首頁同一個來源（Learn.kanaLearned）
  const learnedH = () => window.Learn && Learn.kanaLearned ? Learn.kanaLearned() : (((App.state.kanaL || {}).h) || []);
  const mine = () => { const s = new Set(learnedH()); const a = KA.filter(k => s.has(k[0])); return a.length ? a : KA.slice(0, 5); };
  const POOLS = { mine, seion: () => KA, daku: () => DK, yoon: () => YO, all: () => ALL };
  let Q = null;
  const noVoice = () => App.voiceOK && App.voiceOK() === false;
  function qStart() {
    const p = POOLS[ST.qp](); let list = [];
    while (list.length < 10) list = list.concat(shuffle(p.slice()));   // 已學不到 10 個字：同一批字輪流考
    Q = { list: list.slice(0, 10), i: 0, ok: 0, wrong: [], done: false };
    qMake();
  }
  function qMake() {
    const k = Q.list[Q.i], p = POOLS[ST.qp](), r0 = rn(k[2]);
    const used = new Set([r0]), opts = [k];
    shuffle(p.slice()).concat(ST.qp === 'mine' ? shuffle(KA.slice()) : []).forEach(o => { if (opts.length < 4 && !used.has(rn(o[2]))) { used.add(rn(o[2])); opts.push(o); } });
    shuffle(opts);
    const sc = ST.sc === 'm' ? (Math.random() < .5 ? 'h' : 'k') : ST.sc;
    let prompt, show;
    if (ST.qt === 'listen') { prompt = 'listen'; show = o => sc === 'k' ? o[1] : o[0]; }
    else if (ST.qt === 'read') { prompt = sc === 'k' ? k[1] : k[0]; show = o => rn(o[2]); }
    else { const toK = sc === 'h'; prompt = toK ? k[0] : k[1]; show = o => toK ? o[1] : o[0]; }
    Q.cur = { k, opts, prompt, labels: opts.map(show), ans: null };
  }
  function quizStage() {
    if (!Q) return `<div class="kn-qstart"><p>每回 10 題，答錯的字自動加入 📌不會清單。</p><button type="button" class="btn primary" data-kq="start">▶ 開始</button></div>`;
    if (Q.done) return `<div class="kn-qstart"><p class="kn-big">${Q.ok >= 9 ? '🏆 太強了！' : Q.ok >= 7 ? '👍 不錯喔！' : '💪 再加油！'}</p><p>成績：${Q.ok} / 10</p>
      ${Q.wrong.length ? `<p class="kn-note">答錯的字，多看幾遍：</p><div class="kn-wrong">${Q.wrong.map(k => `<button type="button" data-ks="${esc(k[0])}" lang="ja">${esc(k[0])} ${esc(k[1])} <small>${esc(k[2])}・${esc(k[3])}</small></button>`).join('')}</div>` : '<p>全對！換下一個範圍挑戰吧！</p>'}
      <button type="button" class="btn primary" data-kq="start">🔄 再練 10 題</button></div>`;
    const c = Q.cur, k = c.k, a = c.ans;
    const pr = c.prompt === 'listen'
      ? (noVoice() ? `<div class="kn-qk sm">${esc(rn(k[2]))}</div><p class="kn-note">🔇 找不到日文語音，改看羅馬字選字</p>` : `<button type="button" class="kn-qplay" data-kq="play" aria-label="再聽一次">🔊</button><p class="kn-note">聽發音，選出正確的字</p>`)
      : `<div class="kn-qk" lang="ja">${esc(c.prompt)}</div>`;
    let fb = '';
    if (a != null) {
      fb = c.opts[a] === k ? `<p class="kn-fb ok">⭕ 正確！${esc(k[0])}／${esc(k[1])} = ${esc(k[2])}（${esc(k[3])}）</p>`
        : `<p class="kn-fb ng">❌ 答案是 ${esc(k[0])}／${esc(k[1])} = <b>${esc(k[2])}</b>（諧音「${esc(k[3])}」${isKana(k) ? esc(k[4]) : ''}）${isKana(k) ? `<br><small>${esc(k[5])}</small>` : ''}</p><button type="button" class="btn primary" data-kq="next">${Q.i >= 9 ? '看成績' : '下一題 ➜'}</button>`;
    }
    return `<div class="kn-qbar"><i style="width:${Q.i * 10}%"></i></div><p class="kn-qs">第 ${Q.i + 1} / 10 題　答對 ${Q.ok}</p>${pr}
      <div class="kn-qc">${c.labels.map((l, i) => `<button type="button" data-kqa="${i}" lang="ja" class="${a == null ? '' : c.opts[i] === k ? 'ok' : i === a ? 'ng' : ''}"${a != null ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>${fb}`;
  }
  function quizTab() {
    return `<div class="kn-bar">${seg('kqt', [['listen', '🎧 聽音選字'], ['read', '👀 看字選音'], ['hk', '🔁 平↔片']], ST.qt, 'g2')}</div>
      <div class="kn-bar">${seg('kqp', [['mine', '已學 ' + learnedH().length], ['seion', '清音 46'], ['daku', '濁音 25'], ['yoon', '拗音 27'], ['all', '全部']], ST.qp, 'g5')}</div>
      <div class="kn-stage">${quizStage()}</div>`;
  }
  function qEnd(root) {
    Q.done = true;
    const ok = Q.ok, stars = ok >= 9 ? 3 : ok >= 7 ? 2 : ok >= 5 ? 1 : 0;
    const g = ok ? App.addXP(ok, '五十音小練習') : null;
    if (!App.state.lastDone || typeof App.state.lastDone !== 'object') App.state.lastDone = {};
    App.state.lastDone.kana = App.today(); App.state.lastDoneAt = Date.now(); App.save();
    const seen = new Set(), wrong = Q.wrong.filter(k => !seen.has(k[0]) && seen.add(k[0])).map(itemOf);
    stage(root);
    App.showResult({ title: stars ? '練習完成！' : '再練一次', stars, correct: ok, total: 10, gained: g && g.gained, wrong, retry: () => { qStart(); stage(root); }, back: { label: '回學習' } });
  }
  const stage = root => { const s = root.querySelector('.kn-stage'); if (s) s.innerHTML = quizStage(); };

  /* ---------- 50 音小考（獨立頁）：文字切換＋題型＋範圍＋舞台 ---------- */
  function draw(root) {
    root.innerHTML = `<div class="kn-bar kn-scbar"><span class="kn-lb">文字</span>${seg('ksc', [['h', '平假名'], ['k', '片假名'], ['m', '平片混合']], ST.sc)}</div>${quizTab()}`;
  }
  function onClick(root, e) {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if (d.ksc) { ST.sc = d.ksc; if (Q && !Q.done) Q = null; draw(root); return; }
    if (d.ks) { App.speak(d.ks); return; }
    if (d.kqt) { ST.qt = d.kqt; Q = null; draw(root); return; }
    if (d.kqp) { ST.qp = d.kqp; Q = null; draw(root); return; }
    if (d.kq === 'start') { qStart(); stage(root); if (ST.qt === 'listen' && !noVoice()) App.speak(Q.cur.k[0]); return; }
    if (d.kq === 'play' && Q && Q.cur) { App.speak(Q.cur.k[0]); return; }
    if (d.kq === 'next' && Q) { qNext(root); return; }
    if (d.kqa != null && Q && Q.cur && Q.cur.ans == null) {
      const c = Q.cur, i = +d.kqa, right = c.opts[i] === c.k;
      c.ans = i; App.speak(c.k[0]);
      if (right) Q.ok++; else { Q.wrong.push(c.k); if (window.Tracker) Tracker.add(itemOf(c.k), true); }
      stage(root);
      if (right) { const q = Q; setTimeout(() => { if (Q === q && root.isConnected && q.cur === c) qNext(root); }, 900); }
    }
  }
  function qNext(root) {
    Q.i++;
    if (Q.i >= 10) { qEnd(root); return; }
    qMake(); stage(root);
    if (ST.qt === 'listen' && !noVoice()) App.speak(Q.cur.k[0]);
  }
  function quiz(box, opts) {
    opts = opts || {};
    if (opts.pool && POOLS[opts.pool]) ST.qp = opts.pool;
    if (opts.qt) ST.qt = opts.qt;
    Q = null;
    const root = document.createElement('div');
    root.className = 'kn kn-quiz';
    box.innerHTML = ''; box.appendChild(root);
    draw(root);
    root.addEventListener('click', e => onClick(root, e));
    return root;
  }

  /* ---------- 五十音路線（js/path.js 用）：清音 10 行＋濁音＋拗音＝12 單元 ---------- */
  const SPECIAL = { し: 'shi', ち: 'chi', つ: 'tsu', ふ: 'fu', ん: 'n', を: 'o（wo）' };
  const UNITS = [
    ['k1', 'あ行：五個母音', [0], 's2'], ['k2', 'か行', [1]], ['k3', 'さ行', [2]], ['k4', 'た行', [3]], ['k5', 'な行', [4]],
    ['k6', 'は行', [5]], ['k7', 'ま行', [6]], ['k8', 'や行', [7]], ['k9', 'ら行', [8]], ['k10', 'わ行・ん', [9, 10]],
    ['k11', '濁音・半濁音', null, 's5'], ['k12', '拗音・促音・長音', null, 's6']
  ];
  const noGo = h => h.replace(/<button type="button" class="kn-go"[^>]*>[\s\S]*?<\/button>/g, '');
  function unitRows(u) {
    if (u[0] === 'k11') return DK;
    if (u[0] === 'k12') return YO;
    return [].concat(...u[2].map(i => (GR[i] || []).filter(Boolean).map(h => BY[h])));
  }
  // 一個單元 ≤10 個字：濁音（25）、拗音（27）拆成 3 課；舊 id k11／k12 仍可用（＝整組）
  const PART_T = { k11: ['が・ざ行', 'だ・ば行', 'ぱ行'], k12: ['きゃ・しゃ・ちゃ', 'にゃ・ひゃ・みゃ', 'りゃ・ぎゃ・じゃ…'] };
  function parts(u) {
    const ks = unitRows(u).filter(Boolean);
    if (ks.length <= 10) return [{ id: u[0], title: u[1], ks, first: true }];
    const n = u[0] === 'k12' ? 9 : 10, out = [];
    for (let i = 0; i * n < ks.length; i++) out.push({ id: u[0] + '-' + (i + 1), title: u[1].split('・')[0] + ' ' + (i + 1) + '：' + ((PART_T[u[0]] || [])[i] || ''), ks: ks.slice(i * n, i * n + n), first: i === 0 });
    return out;
  }
  function unitInfo(id) {
    id = String(id || '');
    const base = id.replace(/-\d+$/, ''), u = UNITS.find(x => x[0] === base); if (!u) return null;
    const p = id === base ? { id, title: u[1], ks: unitRows(u).filter(Boolean), first: true } : parts(u).find(x => x.id === id);
    if (!p) return null;
    const ks = p.ks;
    const items = ks.map(k => Object.assign(itemOf(k), { type: 'kana', lv: 'N5' }));
    const sp = ks.filter(k => SPECIAL[k[0]]).map(k => `<span lang="ja">${esc(k[0])}</span>＝${esc(SPECIAL[k[0]])}`);
    const kana = ks.length && isKana(ks[0]);
    const intro = kana
      ? `<div class="kn-unit">${ks.map(k => `<button type="button" class="kn-ub" data-ks="${esc(k[0])}"><span class="g" lang="ja">${esc(k[0])}<small>${esc(k[1])}</small></span><span class="r">${esc(rn(k[2]))}</span><span class="x">${esc(k[3])} ${esc(k[4])}</span></button>`).join('')}</div>
        <ul class="kn-umem">${ks.map(k => `<li><b lang="ja">${esc(k[0])}</b>：${esc(k[5])}</li>`).join('')}</ul>
        ${sp.length ? `<div class="kn-tip">⚠️ 特例：${sp.join('、')}</div>` : ''}`
      : `<div class="kn-unit">${ks.map(k => `<button type="button" class="kn-ub" data-ks="${esc(k[0])}"><span class="g" lang="ja">${esc(k[0])}<small>${esc(k[1])}</small></span><span class="r">${esc(k[2])}</span><span class="x">${esc(k[3])}</span></button>`).join('')}</div>`;
    const ch = p.first && u[3] && CH.find(c => c[0] === u[3]);
    return { id, title: p.title, chars: ks.map(k => k[0]), items, intro, more: ch ? { title: ch[1], html: noGo(ch[2]()) } : null };
  }
  const units = () => [].concat(...UNITS.map(u => parts(u).map(p => ({ id: p.id, title: p.title, chars: p.ks.map(k => k[0]) }))));

  window.KanaLesson = { unitInfo, units, quiz, itemOf };
})();
