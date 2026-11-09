// Fails the build if any section on the built page lists its projects out of order.
// Usage: node scripts/check-order.mjs [dist/index.html]
import { readFileSync } from 'node:fs';
import { compareNames } from '../src/data/order.mjs';

const file = process.argv[2] ?? 'dist/index.html';
const html = readFileSync(file, 'utf8');
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const sections = [...html.matchAll(/<section class="group" id="([^"]+)"[\s\S]*?<\/section>/g)];
if (sections.length === 0) {
  console.error(`check-order: no project sections found in ${file}`);
  process.exit(1);
}

let failed = false;
for (const [body, id] of sections) {
  const names = [...body.matchAll(/<h3>(?:<a [^>]*>([^<]*)<\/a>|([^<]*))<\/h3>/g)].map((m) => decode(m[1] ?? m[2]));
  let ok = true;
  for (let i = 1; i < names.length; i++) {
    if (compareNames(names[i - 1], names[i]) > 0) {
      console.error(`check-order: "${id}" is out of order: "${names[i - 1]}" comes before "${names[i]}"`);
      ok = false;
    }
  }
  if (ok) console.log(`check-order: ${id} ok (${names.length})`);
  else failed = true;
}
process.exit(failed ? 1 : 0);
