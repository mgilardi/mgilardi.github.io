// @ts-check
// The project list's rules, kept free of network and Astro so they can be tested on their own
// (test/catalog.test.mjs). projects.ts fetches from GitHub and passes the results in here.
import { compareNames } from './order.mjs';

/**
 * @typedef {{ name: string, full_name: string, html_url?: string, description: string | null,
 *   fork?: boolean, archived?: boolean, private?: boolean, topics?: string[],
 *   license?: { spdx_id: string } | null }} Repo
 * @typedef {{ name: string, url?: string, description: string, facts: string[], private?: boolean }} Project
 * @typedef {{ id: string, title: string, intro: string, more?: { label: string, url: string },
 *   projects: Project[] }} ProjectGroup
 * @typedef {{ full_name: string, name: string, description: string | null, topics?: string[], label?: string }} SavedRepo
 */

export const ORGS = ['ExtantApe', 'CaptiveOrigins'];

const npmScope = { label: '@captiveorigins on npm', url: 'https://www.npmjs.com/org/captiveorigins' };

/** @param {Repo} r @param {string} topic */
const has = (r, topic) => (r.topics ?? []).includes(topic);

/** Groups in page order. A repo goes in the first group whose test it passes. */
const RULES = [
  {
    id: 'mac',
    title: 'Mac apps',
    intro: 'Small native apps that do one job and ask before they change anything.',
    /** @param {Repo} r */ test: (r) => has(r, 'macos'),
  },
  {
    id: 'ios',
    title: 'iOS apps',
    intro: 'Apps for iPhone and iPad.',
    /** @param {Repo} r */ test: (r) => has(r, 'ios') || has(r, 'iphone') || has(r, 'ipad'),
  },
  {
    id: 'minecraft',
    title: 'Minecraft plugins',
    intro: 'Plugins for Minecraft servers, mostly Paper.',
    /** @param {Repo} r */ test: (r) => has(r, 'minecraft'),
  },
  {
    id: 'science',
    title: 'Science tools',
    intro:
      'The OneOrigin suite: frameworks for lineage, pedigree and taxonomy data. Source-available under PolyForm Noncommercial 1.0.0.',
    more: npmScope,
    /** @param {Repo} r */ test: (r) => /^one[a-z]+$/.test(r.name),
  },
  {
    id: 'payload',
    title: 'Payload plugins',
    intro: 'Plugins for the Payload CMS. The published ones are on npm under @captiveorigins.',
    more: npmScope,
    /** @param {Repo} r */ test: (r) => has(r, 'payload-plugin'),
  },
  {
    id: 'other',
    title: 'Other',
    intro: 'Everything else that is public.',
    test: () => true,
  },
];

/** Topic → the platform chip shown on a card. First match wins. */
const PLATFORMS = [
  ['tauri', 'Tauri'],
  ['swiftui', 'SwiftUI'],
  ['papermc', 'Paper'],
  ['paper-plugin', 'Paper'],
  ['paper', 'Paper'],
];

/**
 * Every public repo in an org. Throws on any error, so a failed build leaves the live site alone.
 * @param {string} org
 * @param {{ fetch?: typeof fetch, token?: string }} [opts]
 * @returns {Promise<Repo[]>}
 */
export async function fetchRepos(org, { fetch: get = fetch, token } = {}) {
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'mgilardi.github.io-build' };
  if (token) headers.Authorization = `Bearer ${token}`;
  /** @type {Repo[]} */
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await get(`https://api.github.com/orgs/${org}/repos?type=public&per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status} listing ${org} repos: ${await res.text()}`);
    const batch = /** @type {Repo[]} */ (await res.json());
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

/** @param {string} s */
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** @param {string} s */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The card's name comes from the repo name. A description that opens with the repo's own name
 * ("OnePhylogeny: a framework…") lends its spelling and loses the prefix. Payload plugins drop
 * their "Menus for Payload:" opener, since the section already says Payload.
 * @param {Repo} repo
 */
export function split(repo) {
  let desc = (repo.description ?? '').trim();
  let name = displayName(repo.name.replace(/^payload-plugin-/, ''));
  const own = desc.match(/^([^:]{1,40}):\s+(.+)$/s);
  if (own && squash(own[1]) === squash(repo.name)) {
    name = own[1];
    desc = own[2];
  } else if (repo.name.startsWith('payload-plugin-')) {
    desc = desc.replace(/^[A-Z][\w-]*(?: [A-Z][\w-]*)* for Payload:\s+/, '');
  }
  return { name, description: capitalize(desc) || 'No description yet.' };
}

/** "leaf-juice" → "Leaf Juice". Names with capitals, like "BlueMapHUD", stay as they are. @param {string} n */
function displayName(n) {
  if (/[A-Z]/.test(n)) return n;
  return n.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** @param {Repo} repo @param {string} groupId */
function facts(repo, groupId) {
  const out = [];
  const spdx = repo.license?.spdx_id;
  if (groupId === 'science') out.push('Source-available');
  else if (spdx && spdx !== 'NOASSERTION') out.push(spdx);
  const platform = PLATFORMS.find(([t]) => has(repo, t));
  if (platform) out.push(platform[1]);
  return out;
}

/**
 * Builds the page's groups in order, each sorted by name, empty ones dropped. Public repos from
 * `listed` get linked cards. A shown private repo (from private-repos.json) goes in its own
 * section with no link and a "Pending release" chip, unless it's public now, when its live,
 * linked card is used instead.
 * @param {Repo[]} listed what GitHub returned for the public listing
 * @param {SavedRepo[]} shown from private-repos.json
 * @param {Set<string>} [exclude] repo names to leave off
 * @returns {ProjectGroup[]}
 */
export function buildGroups(listed, shown, exclude = new Set()) {
  const repos = listed.filter((r) => !r.private && !r.fork && !r.archived && !r.name.startsWith('.') && !exclude.has(r.name));
  if (repos.length === 0) throw new Error('GitHub returned no public repos; refusing to build an empty project list.');

  /** @type {ProjectGroup[]} */
  const filled = RULES.map(({ test: _test, ...g }) => ({ ...g, projects: [] }));
  const publicNames = new Set();
  for (const repo of repos) {
    const i = RULES.findIndex((g) => g.test(repo));
    filled[i].projects.push({ ...split(repo), url: repo.html_url, facts: facts(repo, RULES[i].id) });
    publicNames.add(repo.full_name.toLowerCase());
  }

  for (const saved of shown) {
    if (exclude.has(saved.name) || publicNames.has(saved.full_name.toLowerCase())) continue;
    // Built from the saved fields only, so no URL can get onto the card.
    /** @type {Repo} */
    const repo = { name: saved.name, full_name: saved.full_name, description: saved.description, topics: saved.topics ?? [] };
    const i = RULES.findIndex((g) => g.test(repo));
    const chips = facts(repo, RULES[i].id).filter((f) => f !== 'Source-available');
    filled[i].projects.push({ ...split(repo), facts: [saved.label || 'Pending release', ...chips], private: true });
  }

  for (const g of filled) g.projects.sort((a, b) => compareNames(a.name, b.name));
  return filled.filter((g) => g.projects.length > 0);
}

/**
 * What `npm run private` saves: the private repos switched on, in name order, keeping any
 * "label" from before. Nothing else is written, so hidden private repos never reach the file.
 * @param {Repo[]} repos the private repos the command could see
 * @param {Set<string>} on lowercase full names that are switched on
 * @param {string} note
 * @param {SavedRepo[]} [previous] the file's entries before this save
 */
export function privateFile(repos, on, note, previous = []) {
  const labels = new Map(previous.filter((r) => r.label).map((r) => [r.full_name.toLowerCase(), r.label]));
  return {
    note,
    repos: repos
      .filter((r) => r.private && on.has(r.full_name.toLowerCase()))
      .sort((a, b) => compareNames(a.name, b.name))
      .map((r) => {
        const label = labels.get(r.full_name.toLowerCase());
        return { full_name: r.full_name, name: r.name, description: r.description, topics: r.topics ?? [], ...(label ? { label } : {}) };
      }),
  };
}
