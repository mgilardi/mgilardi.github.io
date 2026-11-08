// The projects on the home page are read from GitHub at build time: every public,
// non-fork, non-archived repo in the orgs below. A scheduled workflow rebuilds the
// site daily, so new repos and changed descriptions show up without editing this file.
// If GitHub can't be reached, the build fails rather than publishing an empty list.

export interface Project {
  name: string;
  url: string;
  description: string;
  /** Short facts shown under the description, such as the license or platform. */
  facts: string[];
}

export interface ProjectGroup {
  id: string;
  title: string;
  intro: string;
  /** An optional link for the whole group, such as the npm scope. */
  more?: { label: string; url: string };
  projects: Project[];
}

interface Repo {
  name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  private: boolean;
  topics?: string[];
  license: { spdx_id: string } | null;
  pushed_at: string;
}

const ORGS = ['ExtantApe', 'CaptiveOrigins'];

/** Public repos to leave off the site anyway. Use the exact repo name. */
const EXCLUDE = new Set<string>([]);

const npmScope = { label: '@captiveorigins on npm', url: 'https://www.npmjs.com/org/captiveorigins' };

type GroupRule = Omit<ProjectGroup, 'projects'> & { test: (r: Repo) => boolean };

// Groups in page order. A repo goes in the first group whose test it passes.
const RULES: GroupRule[] = [
  {
    id: 'mac',
    title: 'Mac apps',
    intro: 'Small native apps that do one job and ask before they change anything.',
    test: (r) => has(r, 'macos'),
  },
  {
    id: 'minecraft',
    title: 'Minecraft plugins',
    intro: 'Plugins for Minecraft servers, mostly Paper.',
    test: (r) => has(r, 'minecraft'),
  },
  {
    id: 'science',
    title: 'Science tools',
    intro:
      'The OneOrigin suite: frameworks for lineage, pedigree and taxonomy data. Source-available under PolyForm Noncommercial 1.0.0.',
    more: npmScope,
    test: (r) => /^one[a-z]+$/.test(r.name),
  },
  {
    id: 'payload',
    title: 'Payload plugins',
    intro: 'Plugins for the Payload CMS. The published ones are on npm under @captiveorigins.',
    more: npmScope,
    test: (r) => has(r, 'payload-plugin'),
  },
  {
    id: 'other',
    title: 'Other',
    intro: 'Everything else that is public.',
    test: () => true,
  },
];

// Topic → the platform chip shown on a card. First match wins.
const PLATFORMS: [string, string][] = [
  ['tauri', 'Tauri'],
  ['swiftui', 'SwiftUI'],
  ['papermc', 'Paper'],
  ['paper-plugin', 'Paper'],
  ['paper', 'Paper'],
];

function has(r: Repo, topic: string) {
  return (r.topics ?? []).includes(topic);
}

async function fetchRepos(org: string): Promise<Repo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mgilardi.github.io-build',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const repos: Repo[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/orgs/${org}/repos?type=public&per_page=100&page=${page}`,
      { headers },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status} listing ${org} repos: ${await res.text()}`);
    const batch = (await res.json()) as Repo[];
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The card's name comes from the repo name. A description that opens with the repo's own name
 * ("OnePhylogeny: a framework…") lends its spelling and loses the prefix. Payload plugins drop
 * their "Menus for Payload:" opener, since the section already says Payload.
 */
function split(repo: Repo): { name: string; description: string } {
  let desc = (repo.description ?? '').trim();
  const base = repo.name.replace(/^payload-plugin-/, '');
  let name = displayName(base);

  const own = desc.match(/^([^:]{1,40}):\s+(.+)$/s);
  if (own && squash(own[1]) === squash(repo.name)) {
    name = own[1];
    desc = own[2];
  } else if (repo.name.startsWith('payload-plugin-')) {
    desc = desc.replace(/^[A-Z][\w-]*(?: [A-Z][\w-]*)* for Payload:\s+/, '');
  }
  return { name, description: capitalize(desc) || 'No description yet.' };
}

/** "leaf-juice" → "Leaf Juice". Names with capitals, like "BlueMapHUD", stay as they are. */
function displayName(repo: string) {
  if (/[A-Z]/.test(repo)) return repo;
  return repo
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function facts(repo: Repo, groupId: string): string[] {
  const out: string[] = [];
  const spdx = repo.license?.spdx_id;
  if (groupId === 'science') out.push('Source-available');
  else if (spdx && spdx !== 'NOASSERTION') out.push(spdx);
  const platform = PLATFORMS.find(([t]) => has(repo, t));
  if (platform) out.push(platform[1]);
  return out;
}

const repos = (await Promise.all(ORGS.map(fetchRepos)))
  .flat()
  .filter((r) => !r.private && !r.fork && !r.archived && !r.name.startsWith('.') && !EXCLUDE.has(r.name));

if (repos.length === 0) {
  throw new Error('GitHub returned no public repos; refusing to build an empty project list.');
}

// Most recently worked on first, within each group.
repos.sort((a, b) => b.pushed_at.localeCompare(a.pushed_at));

const filled: ProjectGroup[] = RULES.map(({ test: _test, ...g }) => ({ ...g, projects: [] }));
for (const repo of repos) {
  const i = RULES.findIndex((g) => g.test(repo));
  filled[i].projects.push({ ...split(repo), url: repo.html_url, facts: facts(repo, RULES[i].id) });
}

/** Groups with at least one project, in page order. */
export const groups = filled.filter((g) => g.projects.length > 0);

export const builtAt = new Date();

export const links = [
  { label: 'GitHub', url: 'https://github.com/mgilardi' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mdgilardi' },
  { label: 'Trailblazer', url: 'https://www.salesforce.com/trailblazer/mgilardi' },
  { label: 'ASU profile', url: 'https://search.asu.edu/profile/1467777' },
];
