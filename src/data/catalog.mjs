// @ts-check
// The project list's rules, kept free of network and Astro so they can be tested on their own
// (test/catalog.test.mjs). scripts/sync-repos.mjs fetches from GitHub, updates the settings file
// (src/data/repos.yaml, see settings.mjs) and calls resolve() here to work out the page.
import { compareNames } from './order.mjs';

/**
 * @typedef {{ id: number, name: string, full_name: string, html_url?: string, description: string | null,
 *   fork?: boolean, archived?: boolean, private?: boolean, topics?: string[],
 *   license?: { spdx_id: string } | null }} Repo
 * @typedef {{ title: string, intro: string, topics?: string[], names?: string, chip?: string,
 *   more?: { label: string, url: string }, default?: boolean }} Category
 * @typedef {{ category: string, show: boolean, private?: boolean, fork?: boolean, archived?: boolean,
 *   gone?: string, description?: string | null, topics?: string[] }} Auto
 * @typedef {{ id: number, repo: string, show?: boolean, category?: string, name?: string, label?: string,
 *   auto?: Auto }} Entry
 * @typedef {{ categories: Record<string, Category>, repos: Entry[] }} Settings
 * @typedef {{ name: string, url?: string, description: string, facts: string[], private?: boolean }} Project
 * @typedef {{ id: string, title: string, intro: string, more?: { label: string, url: string },
 *   projects: Project[] }} ProjectGroup
 */

/** Where the repos come from: two orgs and the owner's own account. */
export const OWNERS = ['orgs/ExtantApe', 'orgs/CaptiveOrigins', 'users/mgilardi'];

/** Topic → the platform chip shown on a card. First match wins. */
const PLATFORMS = [
  ['tauri', 'Tauri'],
  ['swiftui', 'SwiftUI'],
  ['papermc', 'Paper'],
  ['paper-plugin', 'Paper'],
  ['paper', 'Paper'],
];

/**
 * Every public repo of an org (`orgs/X`) or user (`users/x`). Throws on any error, so a failed
 * build leaves the live site alone. Private repos are dropped here, whatever the token can see.
 * @param {string} owner
 * @param {{ fetch?: typeof fetch, token?: string }} [opts]
 * @returns {Promise<Repo[]>}
 */
export async function fetchRepos(owner, { fetch: get = fetch, token } = {}) {
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'mgilardi.github.io-build' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const type = owner.startsWith('users/') ? 'owner' : 'public';
  /** @type {Repo[]} */
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await get(`https://api.github.com/${owner}/repos?type=${type}&per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status} listing ${owner} repos: ${await res.text()}`);
    const batch = /** @type {Repo[]} */ (await res.json());
    repos.push(...batch.filter((r) => !r.private));
    if (batch.length < 100) return repos;
  }
}

/** @param {{ topics?: string[] }} r @param {string} topic */
const has = (r, topic) => (r.topics ?? []).includes(topic);

/**
 * The category a repo's topics (or name) point to: the first category in the file whose `topics`
 * or `names` match. `matched` is false when nothing did and the default category was used.
 * @param {{ name: string, topics?: string[] }} repo
 * @param {Record<string, Category>} categories
 */
export function guessCategory(repo, categories) {
  for (const [id, c] of Object.entries(categories)) {
    if ((c.topics ?? []).some((t) => has(repo, t)) || (c.names && new RegExp(c.names).test(repo.name))) return { id, matched: true };
  }
  const fallback = Object.entries(categories).find(([, c]) => c.default)?.[0];
  if (!fallback) throw new Error('No category has "default: true".');
  return { id: fallback, matched: false };
}

/**
 * The values the build fills in for a public repo. Forks and archived repos are hidden unless the
 * owner says otherwise.
 * @param {Repo} repo @param {Record<string, Category>} categories
 * @returns {Auto}
 */
export function autoFor(repo, categories) {
  /** @type {Auto} */
  const auto = { category: guessCategory(repo, categories).id, show: !repo.fork && !repo.archived };
  if (repo.fork) auto.fork = true;
  if (repo.archived) auto.archived = true;
  return auto;
}

/** @param {string} s */
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** @param {string} s */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The card's name comes from the repo name. A description that opens with the repo's own name
 * ("OnePhylogeny: a framework…") lends its spelling and loses the prefix. Payload plugins drop
 * their "Menus for Payload:" opener, since the section already says Payload.
 * @param {{ name: string, description: string | null | undefined }} repo
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

/** "leaf-juice" → "Leaf Juice". Names with capitals, like "BlueMinimap", stay as they are. @param {string} n */
function displayName(n) {
  if (/[A-Z]/.test(n)) return n;
  return n.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** @param {{ topics?: string[], license?: { spdx_id: string } | null }} repo @param {string} [chip] the category's chip, in place of the license */
function facts(repo, chip) {
  const out = [];
  const spdx = repo.license?.spdx_id;
  if (chip) out.push(chip);
  else if (spdx && spdx !== 'NOASSERTION') out.push(spdx);
  const platform = PLATFORMS.find(([t]) => has(repo, t));
  if (platform) out.push(platform[1]);
  return out;
}

/**
 * Works out the page from the settings and GitHub's public listing. The owner's own values
 * (`show`, `category`, `name`, `label`) always win over the guesses.
 * - A public repo is shown unless `show` (his, or the guess) is false. Its category is his, or
 *   guessed from its topics. A repo whose topics match no category goes to the default one and
 *   adds a warning, so it can't land there unnoticed.
 * - A private repo is only in the file if he chose to show it. It gets no link and a "Pending
 *   release" chip (or his `label`), built from the saved description only.
 * - A repo that's gone from the listing (deleted, made private or moved) isn't shown.
 * @param {Settings} settings
 * @param {Repo[]} listing what GitHub returned for the public listing
 * @returns {{ groups: ProjectGroup[], warnings: string[] }}
 */
export function resolve(settings, listing) {
  const live = listing.filter((r) => !r.private);
  if (live.length === 0) throw new Error('GitHub returned no public repos; refusing to build an empty project list.');
  const { categories } = settings;
  const byId = new Map(live.map((r) => [r.id, r]));
  const entries = new Map(settings.repos.map((e) => [e.id, e]));
  /** @type {string[]} */
  const warnings = [];
  /** @type {Map<string, Project[]>} */
  const cards = new Map(Object.keys(categories).map((id) => [id, []]));

  for (const repo of live) {
    const e = entries.get(repo.id);
    const auto = autoFor(repo, categories);
    if (!(e?.show ?? auto.show)) continue;
    const guess = guessCategory(repo, categories);
    const category = e?.category ?? guess.id;
    if (!e?.category && !guess.matched)
      warnings.push(`${repo.full_name} has no topic that picks a category, so it's under "${categories[category].title}". Add a topic, or set its category in src/data/repos.yaml.`);
    const text = split(repo);
    cards.get(category)?.push({ ...text, name: e?.name ?? text.name, url: repo.html_url, facts: facts(repo, categories[category].chip) });
  }

  for (const e of settings.repos) {
    if (byId.has(e.id)) continue;
    if (!e.auto?.private) {
      if (e.show) warnings.push(`${e.repo} is set to show, but it isn't in GitHub's public list any more, so it's left off.`);
      continue;
    }
    if (!e.show) continue;
    // Built from the saved fields only, so no URL can get onto the card.
    const saved = { name: e.repo.split('/')[1], description: e.auto.description ?? null, topics: e.auto.topics ?? [] };
    const category = e.category ?? guessCategory(saved, categories).id;
    const text = split(saved);
    cards.get(category)?.push({
      ...text,
      name: e.name ?? text.name,
      facts: [e.label || 'Pending release', ...facts(saved)],
      private: true,
    });
  }

  const groups = Object.entries(categories)
    .map(([id, c]) => ({
      id,
      title: c.title,
      intro: c.intro,
      ...(c.more ? { more: c.more } : {}),
      projects: (cards.get(id) ?? []).sort((a, b) => compareNames(a.name, b.name)),
    }))
    .filter((g) => g.projects.length > 0);
  return { groups, warnings };
}
