import generated from './.generated/projects.json';
import type { ProjectGroup } from './catalog.mjs';

// The projects on the home page come from scripts/sync-repos.mjs, which runs before every build:
// it reads GitHub's public listing, updates the settings in src/data/repos.yaml, and writes the
// resolved list to .generated/projects.json (git-ignored). Edit repos.yaml to change a repo's
// section or hide it; the rules are in catalog.mjs.

/** Groups with at least one project, in page order. */
export const groups: ProjectGroup[] = generated.groups;

export const builtAt = new Date();

export const links: { label: string; url?: string }[] = [
  { label: 'GitHub', url: 'https://github.com/mgilardi' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mdgilardi' },
  { label: 'Trailblazer', url: 'https://www.salesforce.com/trailblazer/mgilardi' },
  { label: 'YouTube', url: 'https://www.youtube.com/@ExtantApe' },
];
