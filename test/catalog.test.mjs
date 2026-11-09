import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { resolve, fetchRepos, split, guessCategory, autoFor } from '../src/data/catalog.mjs';
import { compareNames } from '../src/data/order.mjs';

// The real categories from the settings file, so the tests cover the rules the site uses.
const { categories } = parse(readFileSync(new URL('../src/data/repos.yaml', import.meta.url), 'utf8'));

let nextId = 1;
const pub = (name, extra = {}) => ({
  id: nextId++,
  name,
  full_name: `ExampleOrg/${name}`,
  html_url: `https://github.com/ExampleOrg/${name}`,
  description: `${name} does a thing.`,
  topics: [],
  license: { spdx_id: 'MIT' },
  ...extra,
});
/** A shown private entry, as the private sync writes it into repos.yaml. */
const priv = (name, extra = {}) => ({
  id: nextId++,
  repo: `ExampleOrg/${name}`,
  show: true,
  auto: { category: 'ios', show: false, private: true, description: `${name}: secret game.`, topics: ['ios', 'swiftui'] },
  ...extra,
});
const settings = (repos = []) => ({ categories, repos });
const cards = (groups) => groups.flatMap((g) => g.projects);
const group = (groups, id) => groups.find((g) => g.id === id);

test('each section is picked by the topics GitHub has', () => {
  const cases = [
    [['macos', 'tauri'], 'mac'],
    [['iphone'], 'ios'],
    [['minecraft', 'paper-plugin'], 'minecraft'],
    [['payload', 'payload-plugin'], 'payload'],
    [['macos', 'minecraft'], 'mac'], // a Mac app for Minecraft servers is a Mac app
  ];
  for (const [topics, want] of cases) assert.equal(guessCategory({ name: 'thing', topics }, categories).id, want, topics.join(','));
  assert.equal(guessCategory({ name: 'onetaxonomy', topics: ['payload-plugin'] }, categories).id, 'science');
});

test('a repo whose topics match nothing goes to Other and makes the build warn', () => {
  const lost = pub('mystery', { topics: ['something-new'] });
  const { groups, warnings } = resolve(settings(), [lost]);
  assert.equal(group(groups, 'other').projects[0].name, 'Mystery');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ExampleOrg\/mystery has no topic/);
});

test('no warning once the owner has chosen a category, and his choice wins over the topics', () => {
  const r = pub('mystery', { topics: ['macos'] });
  const { groups, warnings } = resolve(settings([{ id: r.id, repo: r.full_name, category: 'minecraft' }]), [r]);
  assert.equal(group(groups, 'minecraft').projects[0].name, 'Mystery');
  assert.equal(group(groups, 'mac'), undefined);
  assert.deepEqual(warnings, []);
});

test('show: false hides a public repo, and show: true brings back a fork', () => {
  const a = pub('hidden'), b = pub('forked', { fork: true }), c = pub('kept', { topics: ['macos'] });
  const { groups } = resolve(settings([{ id: a.id, repo: a.full_name, show: false }, { id: b.id, repo: b.full_name, show: true }]), [a, b, c]);
  assert.deepEqual(cards(groups).map((p) => p.name).sort(), ['Forked', 'Kept']);
});

test('forks and archived repos are hidden unless the owner says otherwise', () => {
  assert.equal(autoFor(pub('f', { fork: true }), categories).show, false);
  assert.equal(autoFor(pub('a', { archived: true }), categories).show, false);
  const { groups } = resolve(settings(), [pub('keep'), pub('fork', { fork: true }), pub('old', { archived: true })]);
  assert.deepEqual(cards(groups).map((p) => p.name), ['Keep']);
});

test('a renamed repo shows once, under its new name, with the owner\'s settings', () => {
  const renamed = pub('NewName', { topics: ['macos'] });
  const entry = { id: renamed.id, repo: 'ExampleOrg/OldName', category: 'minecraft', name: 'Shown Name' };
  const { groups } = resolve(settings([entry]), [renamed]);
  assert.deepEqual(cards(groups).map((p) => [p.name, p.url]), [['Shown Name', 'https://github.com/ExampleOrg/NewName']]);
  assert.equal(group(groups, 'minecraft').projects.length, 1);
});

test('a shown private repo has no link and a Pending release chip, in its section', () => {
  const { groups } = resolve(settings([priv('hidden-game')]), [pub('waystation', { topics: ['minecraft'] })]);
  const card = group(groups, 'ios').projects[0];
  assert.equal(card.url, undefined);
  assert.equal(card.private, true);
  assert.deepEqual(card.facts, ['Pending release', 'SwiftUI']);
  assert.ok(!JSON.stringify(groups).includes('github.com/ExampleOrg/hidden-game'));
});

test('a private repo can never carry a link, even if saved data has one', () => {
  const e = priv('hidden-game');
  e.auto.html_url = 'https://github.com/ExampleOrg/hidden-game';
  const { groups } = resolve(settings([e]), [pub('waystation')]);
  assert.equal(group(groups, 'ios').projects[0].url, undefined);
});

test('a label replaces the chip; a private repo not set to show stays off', () => {
  const { groups } = resolve(settings([priv('tool', { label: 'In use', category: 'mac' }), priv('quiet', { show: false })]), [pub('w')]);
  assert.deepEqual(group(groups, 'mac').projects[0].facts, ['In use', 'SwiftUI']);
  assert.ok(!cards(groups).some((p) => p.name === 'Quiet'));
});

test('once a shown private repo is public, it is listed once, linked, without the chip', () => {
  const e = priv('hidden-game');
  const now = pub('hidden-game', { id: e.id, topics: ['ios', 'swiftui'] });
  const { groups } = resolve(settings([e]), [now]);
  const found = cards(groups).filter((p) => p.name === 'Hidden Game');
  assert.equal(found.length, 1);
  assert.equal(found[0].url, 'https://github.com/ExampleOrg/hidden-game');
  assert.ok(!found[0].facts.includes('Pending release'));
});

test('private repos in the listing are dropped', () => {
  const { groups } = resolve(settings(), [pub('waystation'), pub('leaked', { private: true })]);
  assert.ok(!cards(groups).some((p) => p.name === 'Leaked'));
});

test('a repo gone from the listing is left off, with a warning if it was set to show', () => {
  const { groups, warnings } = resolve(settings([{ id: 999999, repo: 'ExampleOrg/gone', show: true, auto: { category: 'other', show: false, gone: '2026-11-09' } }]), [pub('w')]);
  assert.ok(!cards(groups).some((p) => p.name === 'Gone'));
  assert.match(warnings.join('\n'), /ExampleOrg\/gone is set to show/);
});

test('an empty listing fails the build instead of publishing an empty page', () => {
  assert.throws(() => resolve(settings([priv('hidden-game')]), []), /no public repos/);
  assert.throws(() => resolve(settings(), [pub('x', { private: true })]), /no public repos/);
});

test('sections come in the file\'s order, sorted, empty ones dropped; science cards say Source-available', () => {
  const listed = [pub('Zeta', { topics: ['minecraft'] }), pub('alpha', { topics: ['minecraft'] }), pub('The Beta', { topics: ['minecraft'] }), pub('onething')];
  const { groups } = resolve(settings([priv('b-game'), priv('a-game')]), [...listed, pub('mac-thing', { topics: ['macos'] })]);
  assert.deepEqual(groups.map((g) => g.id), ['mac', 'ios', 'minecraft', 'science']);
  for (const g of groups) {
    const names = g.projects.map((p) => p.name);
    assert.deepEqual([...names].sort(compareNames), names);
  }
  assert.deepEqual(group(groups, 'science').projects[0].facts, ['Source-available']);
});

test('a GitHub API error fails the build', async () => {
  const fail = async () => ({ ok: false, status: 403, text: async () => 'rate limited' });
  await assert.rejects(fetchRepos('orgs/ExampleOrg', { fetch: fail }), /GitHub API 403/);
});

test('the API is paged until a short page, the token is sent, and private repos are dropped', async () => {
  const seen = [];
  const fake = async (url, { headers }) => {
    seen.push([url, headers.Authorization]);
    const n = seen.length === 1 ? 100 : 3;
    return { ok: true, json: async () => Array.from({ length: n }, (_, i) => pub(`r${seen.length}-${i}`, { private: i === 0 })) };
  };
  const repos = await fetchRepos('orgs/ExampleOrg', { fetch: fake, token: 't0k' });
  assert.equal(repos.length, 101);
  assert.equal(seen.length, 2);
  assert.match(seen[0][0], /orgs\/ExampleOrg\/repos\?type=public/);
  assert.match(seen[1][0], /page=2/);
  assert.equal(seen[0][1], 'Bearer t0k');
  seen.length = 0;
  await fetchRepos('users/example', { fetch: fake });
  assert.match(seen[0][0], /users\/example\/repos\?type=owner/);
});

test('card names: own-name prefix, Payload opener, hyphenated names', () => {
  assert.deepEqual(split(pub('onephylogeny', { description: 'OnePhylogeny: a framework.' })), { name: 'OnePhylogeny', description: 'A framework.' });
  assert.deepEqual(split(pub('payload-plugin-menu', { description: 'Menus for Payload: nested menus.' })), { name: 'Menu', description: 'Nested menus.' });
  assert.equal(split(pub('leaf-juice', { description: null })).description, 'No description yet.');
  assert.equal(split(pub('leaf-juice')).name, 'Leaf Juice');
});
