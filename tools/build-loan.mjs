// 產生 data/loan.js：片假名外來語 → 原文語源。
// 用法：node tools/build-loan.mjs tools/loan-src/ext-1.tsv tools/loan-src/ext-2.tsv tools/loan-src/part-0*.tsv（後面的檔覆蓋前面）（每行：片假名<TAB>語言<TAB>原文<TAB>備註）
import fs from 'fs';
const files = process.argv.slice(2);
const map = {};
let bad = 0;
for (const f of files) {
  for (const line of fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [w, l, src = '', note = ''] = line.split('\t').map(x => (x || '').trim());
    if (!w || !l || !/^[ァ-ヺー・]+$/.test(w)) { bad++; continue; }
    map[w] = note ? [l, src, note] : [l, src];
  }
}
const body = JSON.stringify(map).replace(/\],"/g, '],\n"');
const code = `// 自動產生（tools/build-loan.mjs），勿手改。片假名外來語語源：{片假名:[語言, 原文, 備註?]}
// 語言：en fr de pt nl it es la el ru zh ko ar other wasei(和製) abbr(省略) ja(非外來語)
window.LOAN = ${body};
(function () {
  const L = window.LOAN;
  const NAME = { en: '英語', fr: '法語', de: '德語', pt: '葡萄牙語', nl: '荷蘭語', it: '義大利語', es: '西班牙語', la: '拉丁語', el: '希臘語', ru: '俄語', zh: '漢語', ko: '韓語', ar: '阿拉伯語', other: '外語', wasei: '和製外來語', abbr: '省略語' };
  const KATA = /^[ァ-ヺー・]+$/;
  // 查詞：完整詞 → 去掉中黑點 → 最長匹配拆複合詞（コインロッカー＝コイン＋ロッカー）
  function get(w) {
    w = String(w || '').trim();
    if (!KATA.test(w)) return null;
    if (L[w]) return pack(L[w]);
    const plain = w.replace(/・/g, '');
    if (L[plain]) return pack(L[plain]);
    const parts = [];
    let i = 0;
    while (i < plain.length) {
      let j = plain.length;
      for (; j > i + 1; j--) if (L[plain.slice(i, j)] && L[plain.slice(i, j)][0] !== 'ja') break;
      if (j <= i + 1) return null;
      parts.push(L[plain.slice(i, j)]); i = j;
    }
    if (parts.length < 2) return null;
    const langs = [...new Set(parts.map(p => p[0] === 'abbr' || p[0] === 'wasei' ? 'en' : p[0]))];
    return { lang: langs.length === 1 ? langs[0] : 'other', name: langs.map(x => NAME[x] || x).join('＋'), src: parts.map(p => p[1]).join(' + '), note: '複合詞', guess: true };
  }
  function pack(e) {
    if (!e || e[0] === 'ja') return null;
    let name = NAME[e[0]] || e[0], note = e[2] || '';
    if (e[0] === 'abbr' || e[0] === 'other') { const m = note.match(/(英|法|德|葡萄牙|荷蘭|義大利|西班牙|拉丁|希臘|俄|阿拉伯|韓|梵|波斯|馬來|阿伊努|愛奴)語/); if (m) name = m[0] + (e[0] === 'abbr' ? '省略' : ''); }
    if (note.startsWith(name.replace('省略', ''))) note = note.slice(name.replace('省略', '').length);
    note = note.replace(/^[：:、，, 　]+/, '').trim(); if (/^省略$/.test(note)) note = '';
    return { lang: e[0], name, src: e[1] || '', note };
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 「🌐 英語 card」；給長版說明用
  function label(w, long) {
    const o = get(w); if (!o || !o.src) return '';
    return long ? \`🌐 \${o.name}：\${o.src}\${o.note ? '（' + o.note + '）' : ''}\` : o.src;
  }
  function html(w, cls) {
    const o = get(w); if (!o || !o.src) return '';
    return \`<span class="\${cls || 'loan'}" lang="\${o.lang.length === 2 ? o.lang : 'en'}" title="\${esc(o.name + (o.note ? '・' + o.note : ''))}">🌐 \${esc(o.src)}</span>\`;
  }
  // 句子裡的片假名外來語：[{w, src, name}]
  function inText(text, max) {
    const out = [], seen = new Set();
    for (const m of String(text || '').matchAll(/[ァ-ヺ][ァ-ヺー・]+/g)) {
      const w = m[0].replace(/・+$/, ''); if (seen.has(w)) continue; seen.add(w);
      const o = get(w); if (o && o.src) out.push({ w, src: o.src, name: o.name });
      if (out.length >= (max || 6)) break;
    }
    return out;
  }
  function textHTML(text, cls) {
    const a = inText(text); if (!a.length) return '';
    return \`<span class="\${cls || 'loan'}">🌐 \${a.map(x => esc(x.w) + '＝' + esc(x.src)).join('・')}</span>\`;
  }
  window.Loan = { get, label, html, inText, textHTML, NAME, isKata: w => KATA.test(String(w || '')) };
})();
`;
fs.writeFileSync('data/loan.js', code);
console.log('詞數', Object.keys(map).length, '略過', bad);
