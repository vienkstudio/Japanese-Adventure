// 讀 open-anki-jlpt-decks CSV（含引號欄位）
import fs from 'node:fs';
export function parseCSV(txt) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
export function readLevel(n) {
  const rows = parseCSV(fs.readFileSync(new URL(`./src/n${n}.csv`, import.meta.url), 'utf8'));
  return rows.slice(1).map(r => ({ expr: r[0].trim(), kana: r[1].trim(), en: r[2].trim() }));
}
