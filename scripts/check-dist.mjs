// Checks the built site for the rules that must never slip. Runs after every build.
// - A private repo's card has no link, and that repo's GitHub URL appears nowhere in dist/.
// - Draft posts have no page and aren't in the feed.
// Usage: node scripts/check-dist.mjs [dist]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { split } from '../src/data/catalog.mjs';

const dist = process.argv[2] ?? 'dist';
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const built = walk(dist).filter((f) => /\.(html|xml|txt|json|js|css)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8').toLowerCase()]);
const index = readFileSync(join(dist, 'index.html'), 'utf8');
const problems = [];

const cards = [...index.matchAll(/<li class="card"[^>]*>[\s\S]*?<\/ul>\s*<\/li>/g)].map((m) => m[0]);
const privateCards = cards.filter((c) => /^<li class="card"[^>]*data-private/.test(c));
const saved = JSON.parse(readFileSync('src/data/private-repos.json', 'utf8')).repos;
for (const card of privateCards) {
  const name = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1].replace(/<[^>]*>/g, "").trim();
  if (/<a\s/.test(card)) problems.push(`the private card "${name}" has a link`);
  const repo = saved.find((r) => split(r).name === name);
  if (!repo) {
    problems.push(`the private card "${name}" doesn't match anything in private-repos.json`);
    continue;
  }
  const url = `github.com/${repo.full_name}`.toLowerCase();
  for (const [f, t] of built) if (new RegExp(`${url.replace(/[.]/g, '\\.')}(?![\\w.-])`).test(t)) problems.push(`${f} has ${url}, but that repo is private`);
}

// Every shown private repo has an unlinked card, or is public now and linked like any other.
for (const r of saved) {
  const card = privateCards.find((c) => c.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1].replace(/<[^>]*>/g, '').trim() === split(r).name);
  const nowPublic = index.toLowerCase().includes(`href="https://github.com/${r.full_name}"`.toLowerCase());
  if (!card && !nowPublic) problems.push(`${r.full_name} is in private-repos.json but has no private card on the page`);
}

const blog = 'src/content/blog';
const rss = existsSync(join(dist, 'rss.xml')) ? readFileSync(join(dist, 'rss.xml'), 'utf8') : '';
let drafts = 0;
for (const f of existsSync(blog) ? readdirSync(blog).filter((f) => f.endsWith('.md')) : []) {
  const front = readFileSync(join(blog, f), 'utf8').split(/^---\s*$/m)[1] ?? '';
  if (!/^draft:\s*true\s*$/m.test(front)) continue;
  drafts++;
  const slug = f.replace(/\.md$/, '');
  if (existsSync(join(dist, 'blog', slug))) problems.push(`draft "${slug}" has a page`);
  if (rss.includes(`/blog/${slug}/`)) problems.push(`draft "${slug}" is in the feed`);
}

if (problems.length) {
  for (const p of problems) console.error(`check-dist: ${p}`);
  process.exit(1);
}
console.log(`check-dist: ok (${privateCards.length} private card(s) without links, ${drafts} draft(s) unpublished)`);
