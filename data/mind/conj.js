// 3D 心智圖：動詞變化形／時態體貌網路 ＋ 變化產生器
(function () {
  const M = window.MIND = window.MIND || { lex: {}, gram: [] };
  // kind: form 變化形、tense 時態、aspect 體貌；from: 由哪一形變來（圖上的邊）
  M.CONJ = [
    { id: 'dict', name: '辭書形', kind: 'form', ex: '書く', rule: '字典上的原形；普通體非過去' },
    { id: 'masu', name: 'ます形', kind: 'form', from: 'dict', ex: '書きます', rule: '一類：う段→い段＋ます；二類：去る＋ます；する→します、来る→来ます' },
    { id: 'te', name: 'て形', kind: 'form', from: 'dict', ex: '書いて', rule: '一類音便：う・つ・る→って、む・ぶ・ぬ→んで、く→いて、ぐ→いで、す→して（行く→行って）；二類：去る＋て' },
    { id: 'ta', name: 'た形', kind: 'form', from: 'te', ex: '書いた', rule: 'て形的て→た、で→だ' },
    { id: 'nai', name: 'ない形', kind: 'form', from: 'dict', ex: '書かない', rule: '一類：う段→あ段＋ない（う→わ）；二類：去る＋ない；ある→ない' },
    { id: 'pot', name: '可能形', kind: 'form', from: 'dict', ex: '書ける', rule: '一類：う段→え段＋る；二類：去る＋られる；する→できる' },
    { id: 'pass', name: '被動形', kind: 'form', from: 'nai', ex: '書かれる', rule: '一類：あ段＋れる；二類：去る＋られる；する→される' },
    { id: 'caus', name: '使役形', kind: 'form', from: 'nai', ex: '書かせる', rule: '一類：あ段＋せる；二類：去る＋させる；する→させる' },
    { id: 'cpass', name: '使役被動形', kind: 'form', from: 'caus', ex: '書かされる', rule: '一類：あ段＋される（す結尾用させられる）；二類：させられる' },
    { id: 'vol', name: '意向形', kind: 'form', from: 'dict', ex: '書こう', rule: '一類：う段→お段＋う；二類：去る＋よう；する→しよう' },
    { id: 'imp', name: '命令形', kind: 'form', from: 'dict', ex: '書け', rule: '一類：う段→え段；二類：去る＋ろ；する→しろ、来る→来い' },
    { id: 'proh', name: '禁止形', kind: 'form', from: 'dict', ex: '書くな', rule: '辭書形＋な' },
    { id: 'ba', name: 'ば形', kind: 'form', from: 'dict', ex: '書けば', rule: '一類：う段→え段＋ば；二類：去る＋れば' },
    { id: 'tara', name: 'たら形', kind: 'form', from: 'ta', ex: '書いたら', rule: 'た形＋ら' },
    { id: 't-npast', name: '非過去（現在・未來）', kind: 'tense', from: 'dict', ex: '書く／書きます', rule: '辭書形或ます形；表習慣、未來、真理' },
    { id: 't-past', name: '過去', kind: 'tense', from: 'ta', ex: '書いた／書きました', rule: 'た形或ました' },
    { id: 'a-prog', name: '進行・狀態（ている）', kind: 'aspect', from: 'te', ex: '書いている', rule: 'て形＋いる；動作進行或結果持續' },
    { id: 'a-res', name: '結果狀態（てある）', kind: 'aspect', from: 'te', ex: '書いてある', rule: '他動詞て形＋ある；有人刻意做好的狀態' },
    { id: 'a-perf', name: '完了・遺憾（てしまう）', kind: 'aspect', from: 'te', ex: '書いてしまう', rule: 'て形＋しまう（口語ちゃう）' },
    { id: 'a-prep', name: '準備・放置（ておく）', kind: 'aspect', from: 'te', ex: '書いておく', rule: 'て形＋おく（口語とく）' },
    { id: 'a-chg', name: '變化・趨向（ていく／てくる）', kind: 'aspect', from: 'te', ex: '増えていく', rule: 'て形＋いく（往後）／くる（至今）' },
    { id: 'a-exp', name: '經驗（たことがある）', kind: 'aspect', from: 'ta', ex: '書いたことがある', rule: 'た形＋ことがある' },
    { id: 'a-just', name: '剛剛（たばかり）', kind: 'aspect', from: 'ta', ex: '書いたばかり', rule: 'た形＋ばかり' },
    { id: 'a-about', name: '時間點（ところ）', kind: 'aspect', from: 'dict', ex: '書くところ／書いているところ／書いたところ', rule: '辭書形＋ところ＝正要；ている＋ところ＝正在；た＋ところ＝剛' }
  ];
  M.CONJ_BY = Object.fromEntries(M.CONJ.map(c => [c.id, c]));

  // 五段：う段 → 各段
  const ROW = {
    'う': 'わいうえお', 'く': 'かきくけこ', 'ぐ': 'がぎぐげご', 'す': 'さしすせそ', 'つ': 'たちつてと',
    'ぬ': 'なにぬねの', 'ぶ': 'ばびぶべぼ', 'む': 'まみむめも', 'る': 'らりるれろ'
  };
  const TE1 = { 'う': 'って', 'つ': 'って', 'る': 'って', 'む': 'んで', 'ぶ': 'んで', 'ぬ': 'んで', 'く': 'いて', 'ぐ': 'いで', 'す': 'して' };
  const HON = /(いらっしゃ|おっしゃ|くださ|なさ|ござ)る$/;
  function g1(w) {
    const st = w.slice(0, -1), u = w.slice(-1), r = ROW[u];
    if (!r) return null;
    const a = st + r[0], i = st + r[1], e = st + r[3], o = st + r[4];
    let te = st + TE1[u];
    if (/(行|い|往)く$/.test(w) && !/(歩|置|書|聞|引|開|解|弾|焼|吹|拭|好)く$/.test(w) && (w.endsWith('行く') || w === 'いく')) te = st + 'って';
    const isAru = w === 'ある' || w.endsWith('在る');
    const masuStem = HON.test(w) ? st + 'い' : i;
    return {
      dict: w, masu: masuStem + 'ます', te, nai: isAru ? 'ない' : a + 'ない', pot: e + 'る',
      pass: a + 'れる', caus: a + 'せる', cpass: u === 'す' ? a + 'せられる' : a + 'される',
      vol: o + 'う', imp: HON.test(w) ? st + 'い' : e, ba: e + 'ば'
    };
  }
  function g2(w) {
    const s = w.slice(0, -1);
    return { dict: w, masu: s + 'ます', te: s + 'て', nai: s + 'ない', pot: s + 'られる', pass: s + 'られる', caus: s + 'させる', cpass: s + 'させられる', vol: s + 'よう', imp: s + 'ろ', ba: s + 'れば' };
  }
  function g3(w) {
    let m;
    if ((m = w.match(/^(.*)(来る|くる)$/))) {
      const p = m[1], k = m[2] === '来る';
      const K = (kana, kanji) => p + (k ? kanji : kana);
      return { dict: w, masu: K('きます', '来ます'), te: K('きて', '来て'), nai: K('こない', '来ない'), pot: K('こられる', '来られる'), pass: K('こられる', '来られる'), caus: K('こさせる', '来させる'), cpass: K('こさせられる', '来させられる'), vol: K('こよう', '来よう'), imp: K('こい', '来い'), ba: K('くれば', '来れば') };
    }
    const p = w.replace(/(する|ずる)$/, '');
    if (/ずる$/.test(w)) return { dict: w, masu: p + 'じます', te: p + 'じて', nai: p + 'じない', pot: p + 'じられる', pass: p + 'じられる', caus: p + 'じさせる', cpass: p + 'じさせられる', vol: p + 'じよう', imp: p + 'じろ', ba: p + 'ずれば' };
    return { dict: p + 'する', masu: p + 'します', te: p + 'して', nai: p + 'しない', pot: p + 'できる', pass: p + 'される', caus: p + 'させる', cpass: p + 'させられる', vol: p + 'しよう', imp: p + 'しろ', ba: p + 'すれば' };
  }
  function addDerived(f) {
    if (!f) return null;
    f.ta = f.te.replace(/て$/, 'た').replace(/で$/, 'だ');
    f.tara = f.ta + 'ら';
    f.proh = f.dict + 'な';
    f['t-npast'] = f.dict + '／' + f.masu;
    f['t-past'] = f.ta + '／' + f.masu.replace(/ます$/, 'ました');
    f['a-prog'] = f.te + 'いる';
    f['a-res'] = f.te + 'ある';
    f['a-perf'] = f.te + 'しまう';
    f['a-prep'] = f.te + 'おく';
    f['a-chg'] = f.te + 'いく／' + f.te + 'くる';
    f['a-exp'] = f.ta + 'ことがある';
    f['a-just'] = f.ta + 'ばかり';
    f['a-about'] = f.dict + 'ところ';
    return f;
  }
  // 動詞變化：w＝辭書形（漢字或假名皆可）、grp＝1/2/3/s
  M.conjugate = function (w, grp) {
    if (!w) return null;
    w = String(w).split(/[;；、,]/)[0].trim();
    if (grp === 's') return addDerived(g3(w + 'する'));
    if (grp == 3 || /(する|来る|くる|ずる)$/.test(w) && grp != 1 && grp != 2) return addDerived(g3(w));
    if (grp == 2) return addDerived(g2(w));
    return addDerived(g1(w));
  };
  // 形容詞變化
  M.adjForms = function (w, pos) {
    w = String(w).split(/[;；、,]/)[0].trim();
    if (pos === 'i') {
      const s = /(いい|良い)$/.test(w) ? w.slice(0, -2) + (w.endsWith('良い') ? '良' : 'よ') : w.slice(0, -1);
      return { '現在': w, '否定': s + 'くない', '過去': s + 'かった', '過去否定': s + 'くなかった', 'て形': s + 'くて', '條件': s + 'ければ', '副詞': s + 'く', '變成': s + 'くなる' };
    }
    if (pos === 'na') return { '現在': w + 'だ', '否定': w + 'じゃない', '過去': w + 'だった', '過去否定': w + 'じゃなかった', 'て形': w + 'で', '條件': w + 'なら', '副詞': w + 'に', '連體': w + 'な', '變成': w + 'になる' };
    return null;
  };
})();
