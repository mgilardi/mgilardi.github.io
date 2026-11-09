import shownPrivate from './private-repos.json';
import { ORGS, fetchRepos, buildGroups } from './catalog.mjs';

// The projects on the home page are read from GitHub at build time: every public,
// non-fork, non-archived repo in the orgs in catalog.mjs, plus the private repos switched
// on with `npm run private`. A scheduled workflow rebuilds the site daily, so new repos and changed
// descriptions show up without editing anything. If GitHub can't be reached, the build fails
// rather than publishing an empty list. The rules themselves are in catalog.mjs.

/** Public repos to leave off the site anyway. Use the exact repo name. */
const EXCLUDE = new Set<string>([]);

const listed = (await Promise.all(ORGS.map((org) => fetchRepos(org, { token: process.env.GITHUB_TOKEN })))).flat();

/** Groups with at least one project, in page order. */
export const groups = buildGroups(listed, shownPrivate.repos, EXCLUDE);

export const builtAt = new Date();

export const links: { label: string; url?: string }[] = [
  { label: 'GitHub', url: 'https://github.com/mgilardi' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mdgilardi' },
  { label: 'Trailblazer', url: 'https://www.salesforce.com/trailblazer/mgilardi' },
  { label: 'YouTube', url: 'https://www.youtube.com/@ExtantApe' },
];
