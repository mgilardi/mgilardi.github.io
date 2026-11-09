// Updates the repo settings file from GitHub, checks it, and works out the page's project list.
// Runs before every build and dev server.
//
//   node scripts/sync-repos.mjs            public repos only (what CI does)
//   node scripts/sync-repos.mjs --private  also private repos, through your own `gh` sign-in
//                                          (npm run repos)
//
// Writes src/data/repos.yaml when something changed, src/data/repos.private.yaml with
// --private (git-ignored, never pushed), and src/data/.generated/projects.json for the page.
// Any problem in the settings fails with the file and line. If GitHub can't be reached, it fails
// rather than building an empty list.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { OWNERS, fetchRepos, resolve } from '../src/data/catalog.mjs';
import { load, syncPublic, syncPrivate, dump } from '../src/data/settings.mjs';

const PUBLIC = 'src/data/repos.yaml';
const LOCAL = 'src/data/repos.private.yaml';
const OUT = 'src/data/.generated/projects.json';
const withPrivate = process.argv.includes('--private');
const ci = !!process.env.GITHUB_ACTIONS;
const today = new Date().toISOString().slice(0, 10);
const LOCAL_HEADER = `# Private repos, for this Mac only. This file is git-ignored and never pushed.
# Same fields as repos.yaml. Set "show: true" on one to put it on the site (no link, a
# "Pending release" chip), then run \`npm run repos\` and commit repos.yaml. Check its
# description is fine to make public first.
repos: []
`;

/** @param {string[]} errors */
function fail(errors) {
  for (const e of errors) console.error(ci ? `::error::${e}` : `error: ${e}`);
  process.exit(1);
}

const pubText = readFileSync(PUBLIC, 'utf8');
const pub = load(pubText, PUBLIC);
if (pub.errors.length) fail(pub.errors);

const listing = (await Promise.all(OWNERS.map((o) => fetchRepos(o, { token: process.env.GITHUB_TOKEN })))).flat();
const changes = syncPublic(pub.doc, listing, today);

let localText;
if (withPrivate) {
  const privateRepos = OWNERS.flatMap((o) => {
    const path = o.startsWith('users/') ? 'user/repos?visibility=private&affiliation=owner&per_page=100' : `${o}/repos?type=private&per_page=100`;
    const out = execFileSync('gh', ['api', '--paginate', path, '--jq', '.[]'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  });
  localText = existsSync(LOCAL) ? readFileSync(LOCAL, 'utf8') : LOCAL_HEADER;
  const local = load(localText, LOCAL, { categories: pub.data.categories, isPrivate: true });
  if (local.errors.length) fail(local.errors);
  changes.push(...syncPrivate(pub.doc, local.doc, privateRepos.filter((r) => r.private), today));
  const out = dump(local.doc);
  if (out !== localText) writeFileSync(LOCAL, out);
}

// Check the result too, so the build never writes a file it would refuse to read.
const after = dump(pub.doc);
const checked = load(after, PUBLIC);
if (checked.errors.length) fail(checked.errors);
if (after !== pubText) writeFileSync(PUBLIC, after);
for (const c of changes) console.log(`repos: ${c}`);

const { groups, warnings } = resolve(checked.data, listing);
for (const w of warnings) console.warn(ci ? `::warning file=${PUBLIC}::${w}` : `warning: ${w}`);
mkdirSync('src/data/.generated', { recursive: true });
writeFileSync(OUT, JSON.stringify({ groups }, null, 2) + '\n');
const count = groups.reduce((n, g) => n + g.projects.length, 0);
console.log(`repos: ${listing.length} public repos read, ${count} shown in ${groups.length} sections${changes.length ? `, ${PUBLIC} updated` : ''}`);
