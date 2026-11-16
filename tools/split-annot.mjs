// 把各級 CSV 切成加註用的輸入檔：idx<TAB>expression<TAB>reading<TAB>english
import fs from 'node:fs';
import { readLevel } from './csv.mjs';
const PLAN = { 5: 1, 4: 1, 3: 2, 2: 2, 1: 3 };
for (const n of [5, 4, 3, 2, 1]) {
  const rows = readLevel(n), parts = PLAN[n], size = Math.ceil(rows.length / parts);
  for (let p = 0; p < parts; p++) {
    const name = `n${n}${parts > 1 ? '-' + 'abc'[p] : ''}`;
    const out = rows.slice(p * size, (p + 1) * size).map((r, i) => [p * size + i, r.expr, r.kana, r.en.replace(/\t/g, ' ')].join('\t'));
    fs.writeFileSync(new URL(`./annot/in/${name}.tsv`, import.meta.url), out.join('\n') + '\n');
    console.log(name, out.length);
  }
}
