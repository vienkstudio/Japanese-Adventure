// 開放資料檢查（docs/資料來源.md「原則」）：node tools/check-sources.mjs
// 1) 執行時程式（js/、*.html、sw.js、css/）只能連登記過的開放授權網域
// 2) data/ 底下每個資料檔、根目錄 kana-data.js 都要在 docs/資料來源.md 登記（檔名或 * 萬用字元）
// 3) vendor/ 每個第三方程式庫都要附 LICENSE
// 4) 已移除的需授權來源不得再出現
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0;
const bad = m => { fail++; console.log('✗ ' + m); };

// 1) 網域白名單
const OK_HOST = [
  /^(ja|zh|en)\.(m\.)?(wikipedia|wikinews|wikisource|wikibooks|wikiquote|wikivoyage|wiktionary)\.org$/,
  /^tatoeba\.org$/,
  /^(www\.)?youtube-nocookie\.com$/, /^(www\.|m\.|music\.)?youtube\.com$/, /^youtu\.be$/,   // 使用者自己貼的影片：嵌入播放＋oEmbed 取標題（例外，見 docs/資料來源.md）
  /^www\.w3\.org$/   // XML 命名空間，不是連線
];
const BANNED = /lrclib|jina\.ai|news\.yahoo|nhk\.or\.jp|news\.web\.nhk|matcha-jp/i;   // YouTube oEmbed（取標題）為使用者指定保留的例外
const files = [];
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach(e => { const p = d ? d + '/' + e.name : e.name; if (e.isDirectory()) { if (d === '' && /^(js|css)$/.test(e.name)) walk(p); else if (/^js\//.test(p)) walk(p); } else if (/\.(js|css|html)$/.test(e.name) && (d !== '' || /\.(html)$|^sw\.js$/.test(e.name))) files.push(p); });
walk('');
const hosts = new Map();
for (const f of files) {
  const s = rd(f);
  if (BANNED.test(s)) bad(`${f}：出現已移除的需授權來源 ${s.match(BANNED)[0]}`);
  for (const m of s.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) { const h = m[1].toLowerCase(); if (!hosts.has(h)) hosts.set(h, f); }
}
for (const [h, f] of hosts) if (!OK_HOST.some(r => r.test(h))) bad(`${f}：連到未登記的網域 ${h}（先在 docs/資料來源.md 登記開放授權來源，再加進 tools/check-sources.mjs）`);

// 2) 資料檔都要登記
const doc = rd('docs/資料來源.md');
const pats = [...doc.matchAll(/`([^`\s]+\.(?:js|html))`/g)].map(m => m[1]);
const toRe = p => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
const covered = (f, dir) => pats.some(p => toRe(p).test(f) || toRe(dir + p).test(f) || (p.endsWith('/*') && f.startsWith(p.slice(0, -1))));
const dataFiles = [];
const walkD = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach(e => { const p = d + '/' + e.name; if (e.isDirectory()) walkD(p); else if (/\.js$/.test(e.name)) dataFiles.push(p); });
walkD('data');
dataFiles.push('kana-data.js');
for (const f of dataFiles) {
  const dir = f.replace(/[^/]+$/, '');
  if (!covered(f, dir) && !covered(f, 'data/')) bad(`${f}：沒有在 docs/資料來源.md 登記來源與授權`);
}

// 3) vendor 授權檔
for (const f of fs.readdirSync(path.join(ROOT, 'vendor')).filter(f => /\.js$/.test(f))) {
  const base = f.replace(/(\.min)?\.js$/, '');
  if (!fs.existsSync(path.join(ROOT, 'vendor', base + '.LICENSE'))) bad(`vendor/${f}：缺授權檔 vendor/${base}.LICENSE`);
}

// 4) CC BY-SA 匯入檔要在檔頭寫來源與授權
for (const f of ['data/reading/dict-fill.js', 'data/reading/dict-big.js', 'data/reading/senses.js', 'data/reading/kanji.js']) {
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  const head = rd(f).slice(0, 1500);
  if (!/CC BY-SA 4\.0/.test(head) || !/EDRDG|Electronic Dictionary Research/.test(head)) bad(`${f}：檔頭缺來源或授權標示`);
}

// 5) 工具與測試資料也不得收錄需授權內容：tools/ 底下不得出現已移除來源、受著作權保護的歌詞（測試基準的 lyric 類只能存本機）
const toolFiles = [];
const walkT = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach(e => { const p = d + '/' + e.name; if (e.isDirectory()) walkT(p); else if (/\.(m?js|txt|tsv|json|md)$/.test(e.name) && p !== 'tools/check-sources.mjs') toolFiles.push(p); });
walkT('tools');
for (const f of toolFiles) {
  const s = rd(f);
  if (BANNED.test(s)) bad(`${f}：出現已移除的需授權來源 ${s.match(BANNED)[0]}`);
  if (/^lyric\t/m.test(s)) bad(`${f}：收錄了歌詞（受著作權保護，基準只能存在專案外）`);
}

console.log(fail ? `✗ check-sources：${fail} 個問題` : `✓ check-sources：${files.length} 個程式檔只連開放來源（${[...hosts.keys()].length} 個網域）、${dataFiles.length} 個資料檔都已登記授權`);
process.exit(fail ? 1 : 0);
