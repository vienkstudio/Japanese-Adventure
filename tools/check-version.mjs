// 版本號檢查：node tools/check-version.mjs
// js/core.js 的 APP_VERSION（主.次.修）必須和 sw.js 的 VERSION（'jpq-v' + 同一版本）一致，格式為 X.X.X
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8').match(/const APP_VERSION = '([^']+)'/);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/const VERSION = 'jpq-v([^']+)'/);
const errs = [];
if (!core) errs.push('js/core.js 找不到 APP_VERSION');
if (!sw) errs.push("sw.js 找不到 VERSION = 'jpq-v…'");
if (core && !/^\d+\.\d+\.\d+$/.test(core[1])) errs.push(`APP_VERSION「${core[1]}」不是 X.X.X 格式`);
if (core && sw && core[1] !== sw[1]) errs.push(`版本不一致：core.js ${core[1]}、sw.js ${sw[1]}`);
if (errs.length) { errs.forEach(e => console.log('✗ ' + e)); process.exit(1); }
console.log(`✓ 版本 V${core[1]}（core.js 與 sw.js 一致）`);
