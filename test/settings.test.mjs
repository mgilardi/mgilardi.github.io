import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, syncPublic, syncPrivate, dump } from '../src/data/settings.mjs';

const REAL = readFileSync(new URL('../src/data/repos.yaml', import.meta.url), 'utf8');
const CATS = REAL.slice(0, REAL.indexOf('\nrepos:'));
const file = (repos = '[]') => `${CATS}\nrepos: ${repos}\n`;
const pub = (id, name, extra = {}) => ({ id, name, full_name: `ExampleOrg/${name}`, description: `${name} does a thing.`, topics: [], ...extra });
const TODAY = '2026-11-09';

test('the committed settings file is valid', () => {
  assert.deepEqual(load(REAL, 'src/data/repos.yaml').errors, []);
});

test('the committed file names no private repo that isn\'t shown', () => {
  const { data } = load(REAL, 'src/data/repos.yaml');
  for (const e of data.repos) if (e.auto?.private) assert.equal(e.show, true, e.repo);
});

test('a typo in a category fails with the file, line and the valid choices', () => {
  const text = file('\n  - id: 1\n    repo: ExampleOrg/a\n    category: minecrft\n');
  const { errors } = load(text, 'src/data/repos.yaml');
  const line = text.split('\n').findIndex((l) => l.includes('minecrft')) + 1;
  assert.equal(errors.length, 1);
  assert.match(errors[0], new RegExp(`^src/data/repos\\.yaml:${line}: unknown category "minecrft" .*Choose one of: mac, ios, minecraft`));
});

test('unknown keys, bad values and duplicate ids are refused', () => {
  const bad = file(`
  - id: 1
    repo: ExampleOrg/a
    catgory: mac
  - id: 1
    repo: ExampleOrg/b
    show: yes please
  - repo: ExampleOrg/c
`);
  const errors = load(bad, 'f.yaml').errors.join('\n');
  assert.match(errors, /f\.yaml:\d+: unknown key "catgory"/);
  assert.match(errors, /id 1 is listed twice/);
  assert.match(errors, /show should be true or false/);
  assert.match(errors, /needs its numeric GitHub id/);
});

test('broken YAML fails with a line number', () => {
  const { errors } = load(file('\n  - id: 1\n    repo: [unclosed\n'), 'f.yaml');
  assert.ok(errors.length > 0);
  assert.match(errors[0], /^f\.yaml:\d+: /);
});

test('the categories need exactly one default, and valid names patterns', () => {
  const noDefault = file().replace('    default: true\n', '');
  assert.match(load(noDefault, 'f.yaml').errors.join(), /exactly one category needs "default: true"/);
  const badPattern = file().replace('names: "^one[a-z]+$"', 'names: "(("');
  assert.match(load(badPattern, 'f.yaml').errors.join(), /names isn't a valid pattern/);
});

test('a private repo that isn\'t shown is refused in the public file', () => {
  const text = file('\n  - id: 5\n    repo: ExampleOrg/secret\n    auto: { category: ios, show: false, private: true }\n');
  assert.match(load(text, 'f.yaml').errors.join(), /belongs in repos\.private\.yaml/);
});

test('new repos are added with guesses under auto; nothing else is filled in', () => {
  const { doc } = load(file(), 'f.yaml');
  const changes = syncPublic(doc, [pub(10, 'Voidwell', { topics: ['minecraft'] }), pub(11, 'mystery')], TODAY);
  assert.deepEqual(changes, ['added ExampleOrg/Voidwell (minecraft)', 'added ExampleOrg/mystery (other)']);
  const out = load(dump(doc), 'f.yaml');
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.data.repos.map((e) => Object.keys(e)), [['id', 'repo', 'auto'], ['id', 'repo', 'auto']]);
  assert.deepEqual(out.data.repos[1].auto, { category: 'minecraft', show: true });
});

test('a rename keeps the owner\'s values and comments, and only updates repo and auto', () => {
  const text = file(`
  - id: 7
    repo: ExampleOrg/BlueMapHUD
    show: true # mine
    category: other
    name: Blue Thing
    auto: { category: minecraft, show: true }
`);
  const { doc } = load(text, 'f.yaml');
  const changes = syncPublic(doc, [pub(7, 'BlueMinimap', { topics: ['minecraft'] })], TODAY);
  assert.deepEqual(changes, ['renamed ExampleOrg/BlueMapHUD to ExampleOrg/BlueMinimap']);
  const out = dump(doc);
  assert.match(out, /repo: ExampleOrg\/BlueMinimap\n    show: true # mine\n    category: other\n    name: Blue Thing\n/);
  assert.ok(!out.includes('BlueMapHUD'));
});

test('the owner\'s values are never overwritten, even when the guess changes', () => {
  const text = file('\n  - id: 7\n    repo: ExampleOrg/a\n    show: false\n    category: payload\n    auto: { category: mac, show: true }\n');
  const { doc } = load(text, 'f.yaml');
  syncPublic(doc, [pub(7, 'a', { topics: ['minecraft'], archived: true })], TODAY);
  const e = load(dump(doc), 'f.yaml').data.repos[0];
  assert.equal(e.show, false);
  assert.equal(e.category, 'payload');
  assert.deepEqual(e.auto, { category: 'minecraft', show: false, archived: true });
});

test('a repo that leaves the listing is marked gone with the date, not dropped', () => {
  const { doc } = load(file('\n  - id: 7\n    repo: ExampleOrg/a\n    auto: { category: mac, show: true }\n'), 'f.yaml');
  const changes = syncPublic(doc, [pub(8, 'b')], TODAY);
  assert.ok(changes.includes('marked ExampleOrg/a as gone from GitHub\'s public list'));
  const a = load(dump(doc), 'f.yaml').data.repos.find((e) => e.id === 7);
  assert.deepEqual(a.auto, { category: 'mac', show: false, gone: TODAY });
  // And it comes back if the repo does.
  syncPublic(doc, [pub(7, 'a', { topics: ['macos'] }), pub(8, 'b')], '2026-12-01');
  assert.deepEqual(load(dump(doc), 'f.yaml').data.repos.find((e) => e.id === 7).auto, { category: 'mac', show: true });
});

test('an unchanged listing leaves the file byte-for-byte the same', () => {
  const { doc } = load(file(), 'f.yaml');
  syncPublic(doc, [pub(1, 'a'), pub(2, 'b', { topics: ['macos'] })], TODAY);
  const once = dump(doc);
  const again = load(once, 'f.yaml').doc;
  assert.deepEqual(syncPublic(again, [pub(1, 'a'), pub(2, 'b', { topics: ['macos'] })], TODAY), []);
  assert.equal(dump(again), once);
});

test('the public sync refuses a private repo outright', () => {
  const { doc } = load(file(), 'f.yaml');
  assert.throws(() => syncPublic(doc, [pub(1, 'secret', { private: true })], TODAY), /private repo/);
});

test('private repos: hidden ones stay in the local file only; shown ones are copied, and taken out when hidden', () => {
  const p = load(file(), 'f.yaml').doc;
  const local = load('repos: []\n', 'l.yaml', { isPrivate: true }).doc;
  const privates = [pub(20, 'secret-thing', { private: true, description: 'do not publish' }), pub(21, 'game', { private: true, topics: ['ios'] })];
  syncPrivate(p, local, privates, TODAY);
  assert.ok(!dump(p).includes('secret-thing'));
  assert.ok(dump(local).includes('secret-thing'));

  const shown = load(dump(local).replace('repo: ExampleOrg/game\n', 'repo: ExampleOrg/game\n    show: true\n    label: Soon\n'), 'l.yaml', { isPrivate: true }).doc;
  syncPrivate(p, shown, privates, TODAY);
  const out = load(dump(p), 'f.yaml');
  assert.deepEqual(out.errors, []);
  const game = out.data.repos.find((e) => e.id === 21);
  assert.equal(game.show, true);
  assert.equal(game.label, 'Soon');
  assert.equal(game.auto.private, true);
  assert.ok(!dump(p).includes('secret-thing'));

  const hidden = load(dump(shown).replace('    show: true\n', ''), 'l.yaml', { isPrivate: true }).doc;
  const changes = syncPrivate(p, hidden, privates, TODAY);
  assert.ok(changes.includes('removed private ExampleOrg/game from repos.yaml (not shown)'));
  assert.ok(!dump(p).includes('ExampleOrg/game'));
});

test('a shown private repo that goes public turns into a normal public entry, keeping show', () => {
  const p = load(file('\n  - id: 21\n    repo: ExampleOrg/game\n    show: true\n    auto: { category: ios, show: false, private: true, description: x, topics: [ios] }\n'), 'f.yaml').doc;
  syncPublic(p, [pub(21, 'game', { topics: ['ios'] })], TODAY);
  const e = load(dump(p), 'f.yaml').data.repos[0];
  assert.equal(e.show, true);
  assert.deepEqual(e.auto, { category: 'ios', show: true });
});
