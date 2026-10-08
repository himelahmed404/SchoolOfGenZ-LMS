// The admin console is English only. Fails if a Bangla letter or digit appears in admin code.
// The taka sign (৳, U+09F3) is allowed: it is the currency symbol.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/lib/admin', 'src/components/admin', 'src/app/admin'];
const BANGLA = /[\u0980-\u09F2\u09F4-\u09FF]/;

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx|css)$/.test(name) ? [path] : [];
});

const hits = [];
for (const file of ROOTS.flatMap(files)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (BANGLA.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
}

if (hits.length) {
  console.error(`Bangla text in admin code (${hits.length} line${hits.length === 1 ? '' : 's'}):\n` + hits.join('\n'));
  process.exit(1);
}
console.log('Admin code is English only.');
