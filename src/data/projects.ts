// The projects shown on the home page, grouped.
// Descriptions follow each repo's own GitHub description; when one changes there, change it here too.

export interface Project {
  name: string;
  url: string;
  description: string;
  /** Short facts shown under the description, such as the license or platform. */
  facts?: string[];
}

export interface ProjectGroup {
  id: string;
  title: string;
  intro: string;
  /** An optional link for the whole group, such as the npm scope. */
  more?: { label: string; url: string };
  projects: Project[];
}

export const groups: ProjectGroup[] = [
  {
    id: 'mac',
    title: 'Mac apps',
    intro: 'Small native apps that do one job and ask before they change anything.',
    projects: [
      {
        name: 'Theseus',
        url: 'https://github.com/ExtantApe/theseus',
        description:
          'A private, never-sends personal assistant for Claude Code on your Mac. Clears the path, so you can make the call.',
        facts: ['MIT', 'Tauri'],
      },
      {
        name: 'Ariadne',
        url: 'https://github.com/ExtantApe/ariadne',
        description:
          "Keep your Mac's files and Apple Notes filed, with a yes. Never deletes or overwrites; every batch can be undone.",
        facts: ['MIT', 'Tauri'],
      },
      {
        name: 'Leaf Juice',
        url: 'https://github.com/ExtantApe/leaf-juice',
        description:
          'A free, native Mac app for running Minecraft Java servers: lean, safe upgrades, plugin compatibility and clear problem reports.',
        facts: ['MIT', 'SwiftUI'],
      },
    ],
  },
  {
    id: 'minecraft',
    title: 'Minecraft plugins',
    intro: 'Plugins for Minecraft servers, mostly Paper. No client mods needed.',
    projects: [
      {
        name: 'BlueMapHUD',
        url: 'https://github.com/ExtantApe/BlueMapHUD',
        description:
          'A BlueMap minimap and coordinates HUD for Paper, with a fullscreen map, drawn with a resource pack font. No client mods or shaders.',
        facts: ['MIT', 'Paper'],
      },
      {
        name: 'Waystation',
        url: 'https://github.com/ExtantApe/Waystation',
        description:
          'Walkable gates between Multiverse worlds for Paper: a generated train station built from display entities, so it never places a block. No client mods.',
        facts: ['MIT', 'Paper'],
      },
      {
        name: 'Latchkey',
        url: 'https://github.com/ExtantApe/Latchkey',
        description:
          'One-time sign-in links for Paper servers: a player types /signin and their browser is signed in, with no password. Only a hash of each link is stored.',
        facts: ['MIT', 'Paper'],
      },
      {
        name: 'Preflight',
        url: 'https://github.com/ExtantApe/Preflight',
        description:
          'Boot-time smoke tests for servers: holds logins until tests pass, and lets plugins add their own tests.',
        facts: ['MIT'],
      },
    ],
  },
  {
    id: 'science',
    title: 'Science tools',
    intro:
      'The OneOrigin suite: frameworks for lineage, pedigree and taxonomy data. Source-available under PolyForm Noncommercial 1.0.0.',
    more: { label: '@captiveorigins on npm', url: 'https://www.npmjs.com/org/captiveorigins' },
    projects: [
      {
        name: 'OnePhylogeny',
        url: 'https://github.com/CaptiveOrigins/onephylogeny',
        description:
          'A species-agnostic framework for acquiring sequence evidence, building reference panels and placing samples in lineages, with provenance and honest uncertainty.',
        facts: ['Source-available', 'TypeScript', 'Alpha'],
      },
      {
        name: 'OnePedigree',
        url: 'https://github.com/CaptiveOrigins/onepedigree',
        description:
          'A species-neutral pedigree framework, with a data model, validation, bounded traversal, 13 views and layout, plus packages for React and Payload.',
        facts: ['Source-available', 'TypeScript', 'Alpha'],
      },
      {
        name: 'OneTaxonomy',
        url: 'https://github.com/CaptiveOrigins/onetaxonomy',
        description:
          'Import, curate, browse and publish taxonomic classifications and phylogenetic trees, with a TypeScript core, React components, a Payload plugin and a desktop studio.',
        facts: ['Source-available', 'TypeScript', 'Alpha'],
      },
    ],
  },
  {
    id: 'payload',
    title: 'Payload plugins',
    intro: 'Plugins for the Payload CMS, published on npm. Still 0.x until they have seen more real use.',
    more: { label: '@captiveorigins on npm', url: 'https://www.npmjs.com/org/captiveorigins' },
    projects: [
      {
        name: 'Masquerade',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-masq',
        description:
          'Admins sign in as another user, read-only, to see what they see, with a banner, a one-hour session, an admin-only user search and audit hooks.',
        facts: ['MIT'],
      },
      {
        name: 'Sandbox',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-sandbox',
        description:
          'Realistic test data that reads your schema, fills every collection so each case appears, tracks every record for one-click removal, and refuses to run in production.',
        facts: ['MIT'],
      },
      {
        name: 'Polyglot',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-polyglot',
        description:
          'Keeps content in every language, translating on publish and in a sweep, remembering every sentence, and never overwriting a human-reviewed translation.',
        facts: ['MIT'],
      },
      {
        name: 'Roles',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-roles',
        description:
          'Per-site role ladders for multi-tenant sites, plus add-on and platform roles, per-site role names and access helpers.',
        facts: ['MIT'],
      },
      {
        name: 'Menu',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-menu',
        description:
          "Drag-and-drop links, dropdowns and section headings, optional icons, alphabetical order in each visitor's language, and visibility per entry.",
        facts: ['MIT'],
      },
      {
        name: 'Roadmap',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-roadmap',
        description:
          'A public roadmap with voting: items in curator-set stages, one vote per person per item, deduplicated requests and parent grouping.',
        facts: ['MIT'],
      },
      {
        name: 'Membership',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-membership',
        description:
          'Patreon-style tiers or pick-your-own-amount pledges, billed as Stripe subscriptions, with a backers wall and hooks for perks.',
        facts: ['MIT'],
      },
      {
        name: 'Sponsors',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-sponsors',
        description:
          'A public sponsor list with optional tiers, private contacts, and sponsor updates written and sent from the admin.',
        facts: ['MIT'],
      },
      {
        name: 'Printify',
        url: 'https://github.com/CaptiveOrigins/payload-plugin-printify',
        description:
          "Print-on-demand for Payload's ecommerce plugin, with product sync, order fulfillment and tracking, and optional price write-back.",
        facts: ['MIT'],
      },
    ],
  },
];

export const links = [
  { label: 'GitHub', url: 'https://github.com/mgilardi' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mdgilardi' },
  { label: 'Trailblazer', url: 'https://www.salesforce.com/trailblazer/mgilardi' },
  { label: 'ASU profile', url: 'https://search.asu.edu/profile/1467777' },
];
