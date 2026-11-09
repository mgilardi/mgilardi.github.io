// Pick which repos show in the Featured section, public or private.
//
//   npm run feature              checklist: ↑/↓ to move, space to switch, enter to save, q to quit
//   npm run feature -- list      print every repo and whether it's featured
//   npm run feature -- on <repo>   feature a repo (name or Org/name)
//   npm run feature -- off <repo>  stop featuring it
//
// Reads every repo in the orgs through your own `gh` sign-in, so private repos show up here
// on your machine. Only the featured ones are written to src/data/featured.json, which is
// public: a private repo that isn't featured is never written anywhere. Saving also refreshes
// the saved descriptions and drops featured repos that no longer exist.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { compareNames } from '../src/data/order.mjs';

const ORGS = ['ExtantApe', 'CaptiveOrigins'];
const FILE = new URL('../src/data/featured.json', import.meta.url);

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
    .filter((r) => !r.fork && !r.archived && !r.name.startsWith('.'))
    .sort((a, b) => compareNames(a.name, b.name));
}

const saved = JSON.parse(readFileSync(FILE, 'utf8'));
const on = new Set(saved.repos.map((r) => r.full_name.toLowerCase()));
const repos = fetchAll();
const key = (r) => r.full_name.toLowerCase();

function save() {
  const known = new Set(repos.map(key));
  for (const k of on) if (!known.has(k)) console.log(`Dropped ${k}: it no longer exists or was renamed.`);
  const out = {
    note: saved.note,
    repos: repos
      .filter((r) => on.has(key(r)))
      .map((r) => ({ full_name: r.full_name, name: r.name, description: r.description, topics: r.topics ?? [] })),
  };
  writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  const list = out.repos.map((r) => r.name).join(', ') || 'nothing';
  console.log(`Featured: ${list}.`);
  console.log('Saved src/data/featured.json. Commit and push it to main to update the site.');
}

function find(name) {
  const n = name.toLowerCase();
  const r = repos.find((x) => key(x) === n) ?? repos.find((x) => x.name.toLowerCase() === n);
  if (!r) {
    console.error(`No repo called "${name}" in ${ORGS.join(' or ')}.`);
    process.exit(1);
  }
  return r;
}

const label = (r) => `${r.private ? 'private' : 'public '}  ${r.full_name}`;
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'on' || cmd === 'off') {
  if (!arg) throw new Error(`Usage: npm run feature -- ${cmd} <repo>`);
  const r = find(arg);
  if (cmd === 'on') on.add(key(r));
  else on.delete(key(r));
  if (cmd === 'on' && r.private) console.log(`Note: ${r.name} is private. Its name and description will be public:\n  ${r.description ?? '(no description)'}`);
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
    s += 'Featured repos. ↑/↓ move, space switches, enter saves, q quits without saving.\n\n';
    repos.slice(top, top + rows).forEach((r, j) => {
      const at = top + j === i;
      s += `${at ? '›' : ' '} ${on.has(key(r)) ? '[x]' : '[ ]'} ${label(r)}\n`;
    });
    const r = repos[i];
    s += `\n${r.private ? 'Private: if featured, this name and description go on the public site.' : 'Public: shown with a link.'}\n`;
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
