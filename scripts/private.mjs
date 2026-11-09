// Pick which private repos show on the site. Public repos are always listed; this is only for
// private ones, such as an app that's waiting for release.
//
//   npm run private                checklist: ↑/↓ to move, space to switch, enter to save, q to quit
//   npm run private -- list        print every private repo and whether it's shown
//   npm run private -- on <repo>   show a private repo (name or Org/name)
//   npm run private -- off <repo>  hide it again
//
// Reads the orgs' private repos through your own `gh` sign-in, on your machine. Only the ones
// switched on are written to src/data/private-repos.json, which is public: a private repo that
// isn't shown is never written anywhere. A shown one appears in its own section with no link and
// a "Pending release" chip (set "label" on its entry to say something else). Once it goes public,
// the build lists and links it like any other, and the next save drops it from the file. Saving
// also refreshes the saved descriptions and drops repos that no longer exist.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { compareNames } from '../src/data/order.mjs';
import { ORGS, privateFile } from '../src/data/catalog.mjs';

const FILE = new URL('../src/data/private-repos.json', import.meta.url);

function fetchAll() {
  const all = [];
  for (const org of ORGS) {
    const out = execFileSync('gh', ['api', '--paginate', `orgs/${org}/repos?type=all&per_page=100`, '--jq', '.[]'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    for (const line of out.split('\n')) if (line.trim()) all.push(JSON.parse(line));
  }
  return all
    .filter((r) => r.private && !r.fork && !r.archived && !r.name.startsWith('.'))
    .sort((a, b) => compareNames(a.name, b.name));
}

const saved = JSON.parse(readFileSync(FILE, 'utf8'));
const on = new Set(saved.repos.map((r) => r.full_name.toLowerCase()));
const repos = fetchAll();
const key = (r) => r.full_name.toLowerCase();

function save() {
  const known = new Set(repos.map(key));
  for (const k of on) if (!known.has(k)) console.log(`Dropped ${k}: it's public now, renamed or gone.`);
  const out = privateFile(repos, on, saved.note, saved.repos);
  writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  const list = out.repos.map((r) => r.name).join(', ') || 'nothing';
  console.log(`Shown: ${list}.`);
  console.log('Saved src/data/private-repos.json. Commit and push it to main to update the site.');
}

function find(name) {
  const n = name.toLowerCase();
  const r = repos.find((x) => key(x) === n) ?? repos.find((x) => x.name.toLowerCase() === n);
  if (!r) {
    console.error(`No private repo called "${name}" in ${ORGS.join(' or ')}. Public repos are listed automatically.`);
    process.exit(1);
  }
  return r;
}

const label = (r) => r.full_name;
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'on' || cmd === 'off') {
  if (!arg) throw new Error(`Usage: npm run private -- ${cmd} <repo>`);
  const r = find(arg);
  if (cmd === 'on') on.add(key(r));
  else on.delete(key(r));
  if (cmd === 'on') console.log(`Note: ${r.name}'s name and description will be public:\n  ${r.description ?? '(no description)'}`);
  save();
} else if (cmd === 'list' || !process.stdin.isTTY) {
  for (const r of repos) console.log(`${on.has(key(r)) ? '[x]' : '[ ]'} ${label(r)}`);
} else if (cmd) {
  console.error(`Unknown command "${cmd}". Use list, on <repo> or off <repo>, or no command for the checklist.`);
  process.exit(1);
} else {
  checklist();
}

function checklist() {
  let i = 0;
  const out = process.stdout;
  const draw = () => {
    const rows = Math.max(5, (out.rows ?? 24) - 8);
    const top = Math.min(Math.max(0, i - Math.floor(rows / 2)), Math.max(0, repos.length - rows));
    let s = '\x1b[2J\x1b[H';
    s += 'Private repos to show on the site. ↑/↓ move, space switches, enter saves, q quits without saving.\n\n';
    repos.slice(top, top + rows).forEach((r, j) => {
      const at = top + j === i;
      s += `${at ? '›' : ' '} ${on.has(key(r)) ? '[x]' : '[ ]'} ${label(r)}\n`;
    });
    const r = repos[i];
    s += '\nIf shown, this name and description go on the public site, with no link:\n';
    s += `${r.description ?? '(no description)'}\n`;
    out.write(s);
  };
  const done = (fn) => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    out.write('\x1b[2J\x1b[H');
    fn();
  };
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (_s, k) => {
    if (k.name === 'up' || k.name === 'k') i = (i - 1 + repos.length) % repos.length;
    else if (k.name === 'down' || k.name === 'j') i = (i + 1) % repos.length;
    else if (k.name === 'space') on.has(key(repos[i])) ? on.delete(key(repos[i])) : on.add(key(repos[i]));
    else if (k.name === 'return') return done(save);
    else if (k.name === 'q' || k.name === 'escape' || (k.ctrl && k.name === 'c')) return done(() => console.log('Nothing saved.'));
    draw();
  });
  draw();
}
