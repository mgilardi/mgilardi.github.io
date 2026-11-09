import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroups, privateFile, fetchRepos, split } from '../src/data/catalog.mjs';
import { compareNames } from '../src/data/order.mjs';

const pub = (name, extra = {}) => ({
  name,
  full_name: `ExampleOrg/${name}`,
  html_url: `https://github.com/ExampleOrg/${name}`,
  description: `${name} does a thing.`,
  topics: [],
  license: { spdx_id: 'MIT' },
  ...extra,
});
const saved = (name, extra = {}) => ({ full_name: `ExampleOrg/${name}`, name, description: `${name}: secret game.`, topics: ['ios', 'swiftui'], ...extra });
const allCards = (groups) => groups.flatMap((g) => g.projects);
const group = (groups, id) => groups.find((g) => g.id === id);

test('a shown private repo goes in its own section, with no link and a Pending release chip', () => {
  const groups = buildGroups([pub('waystation', { topics: ['minecraft'] })], [saved('hidden-game')]);
  const card = group(groups, 'ios').projects[0];
  assert.equal(card.url, undefined);
  assert.equal(card.private, true);
  assert.deepEqual(card.facts, ['Pending release', 'SwiftUI']);
  assert.equal(allCards(groups).filter((p) => p.name === card.name).length, 1);
  assert.ok(!JSON.stringify(groups).includes('github.com/ExampleOrg/hidden-game'));
});

test('a saved label replaces the Pending release chip', () => {
  const groups = buildGroups([pub('waystation')], [saved('tool', { topics: ['macos'], label: 'In use' })]);
  assert.deepEqual(group(groups, 'mac').projects[0].facts, ['In use']);
});

test('a private repo can never carry a link, even if saved data has one', () => {
  const groups = buildGroups([pub('waystation')], [saved('hidden-game', { html_url: 'https://github.com/ExampleOrg/hidden-game' })]);
  assert.equal(group(groups, 'ios').projects[0].url, undefined);
});

test('private repos in the listing are dropped, featured or not', () => {
  const groups = buildGroups([pub('waystation'), pub('leaked', { private: true })], []);
  assert.ok(!allCards(groups).some((p) => p.name === 'Leaked'));
});

test('once a shown private repo is public, it is listed once, linked, without the chip', () => {
  const groups = buildGroups([pub('hidden-game', { topics: ['ios', 'swiftui'] })], [saved('hidden-game')]);
  const cards = allCards(groups).filter((p) => p.name === 'Hidden Game');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].url, 'https://github.com/ExampleOrg/hidden-game');
  assert.ok(!cards[0].facts.includes('Pending release'));
  assert.equal(cards[0].private, undefined);
});

test('forks, archived, dot-repos and EXCLUDE are left off, shown private repos too', () => {
  const listed = [pub('keep'), pub('fork', { fork: true }), pub('old', { archived: true }), pub('.github'), pub('nope')];
  const groups = buildGroups(listed, [saved('nope')], new Set(['nope']));
  assert.deepEqual(allCards(groups).map((p) => p.name), ['Keep']);
});

test('an empty listing fails the build instead of publishing an empty page', () => {
  assert.throws(() => buildGroups([], [saved('hidden-game')]), /no public repos/);
  assert.throws(() => buildGroups([pub('x', { private: true })], []), /no public repos/);
});

test('a GitHub API error fails the build', async () => {
  const fail = async () => ({ ok: false, status: 403, text: async () => 'rate limited' });
  await assert.rejects(fetchRepos('ExampleOrg', { fetch: fail }), /GitHub API 403/);
});

test('the API is paged until a short page, and the token is sent', async () => {
  const seen = [];
  const fake = async (url, { headers }) => {
    seen.push([url, headers.Authorization]);
    const n = seen.length === 1 ? 100 : 3;
    return { ok: true, json: async () => Array.from({ length: n }, (_, i) => pub(`r${seen.length}-${i}`)) };
  };
  const repos = await fetchRepos('ExampleOrg', { fetch: fake, token: 't0k' });
  assert.equal(repos.length, 103);
  assert.equal(seen.length, 2);
  assert.match(seen[1][0], /page=2/);
  assert.equal(seen[0][1], 'Bearer t0k');
});

test('sections come in page order, sorted, empty ones dropped, with no Featured group', () => {
  const listed = [pub('Zeta', { topics: ['minecraft'] }), pub('alpha', { topics: ['minecraft'] }), pub('The Beta', { topics: ['minecraft'] })];
  const groups = buildGroups([...listed, pub('mac-thing', { topics: ['macos'] })], [saved('b-game'), saved('a-game')]);
  assert.deepEqual(groups.map((g) => g.id), ['mac', 'ios', 'minecraft']);
  for (const g of groups) {
    const names = g.projects.map((p) => p.name);
    assert.deepEqual([...names].sort(compareNames), names);
  }
});

test('the private command saves only switched-on private repos, and keeps labels', () => {
  const repos = [
    pub('shown-private', { private: true }),
    pub('labelled', { private: true }),
    pub('secret', { private: true, description: 'do not publish' }),
    pub('public-one'),
  ];
  const on = new Set(['exampleorg/shown-private', 'exampleorg/labelled', 'exampleorg/public-one']);
  const out = privateFile(repos, on, 'note', [{ full_name: 'ExampleOrg/labelled', name: 'labelled', description: null, label: 'In use' }]);
  assert.deepEqual(out.repos.map((r) => r.name), ['labelled', 'shown-private']);
  assert.ok(!JSON.stringify(out).includes('secret'));
  assert.equal(out.repos[0].label, 'In use');
  assert.deepEqual(Object.keys(out.repos[1]).sort(), ['description', 'full_name', 'name', 'topics']);
});

test('card names: own-name prefix, Payload opener, hyphenated names', () => {
  assert.deepEqual(split(pub('onephylogeny', { description: 'OnePhylogeny: a framework.' })), { name: 'OnePhylogeny', description: 'A framework.' });
  assert.deepEqual(split(pub('payload-plugin-menu', { description: 'Menus for Payload: nested menus.' })), { name: 'Menu', description: 'Nested menus.' });
  assert.equal(split(pub('leaf-juice', { description: null })).description, 'No description yet.');
  assert.equal(split(pub('leaf-juice')).name, 'Leaf Juice');
});
