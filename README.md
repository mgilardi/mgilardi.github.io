# mgilardi.github.io

My personal site at https://mgilardi.github.io. One page: a short intro, Captive Origins, my writing, and the public things I've built, grouped as Mac apps, Minecraft plugins, science tools and Payload plugins. Blog posts get their own pages.

It's a static Astro site with no client-side JavaScript, no tracking and no cookies. The built page is about 20 KB.

## Editing

The project list isn't written by hand. At build time `src/data/projects.ts` asks GitHub for every public repo in the ExtantApe and CaptiveOrigins orgs and groups them by topic. To change what a card says, change that repo's description or topics on GitHub. The site picks it up at the next daily build. To leave a public repo off, add it to `EXCLUDE` in the same file. Each section is sorted alphabetically by name, ignoring case and a leading "The", and the build fails if the page comes out in any other order. ## Private repos

Public repos are listed on their own. To show a private one too, such as an app waiting for release:

```sh
npm run private                    # checklist: ↑/↓, space to switch, enter to save, q to quit
npm run private -- on slothdoku    # or switch one at a time
npm run private -- off slothdoku
npm run private -- list
```

It lists the private repos in both orgs, using my own `gh` sign-in. Saving writes only the ones switched on to `src/data/private-repos.json`; commit and push that file to update the site. A shown private repo goes in its own section (an iOS app under iOS apps) with its name and description, a "Pending release" chip and no link. To say something else on the chip, add `"label": "…"` to its entry. When the repo goes public, the next build links it like any other. Running the command again refreshes the saved descriptions.

Private repos that aren't switched on are never written anywhere. Before switching one on, check its description is fine to make public.

## The rest

The page itself is `src/pages/index.astro` and the styles are in `src/styles/global.css`. Light and dark follow the system setting.

## Writing a post

Add a Markdown file to `src/content/blog/`. The file name becomes the address: `reptile-records.md` is published at `/blog/reptile-records/`. Start it with:

```md
---
title: The post's title
summary: One or two sentences for the homepage and the feed.
date: 2026-11-08
draft: true
---
```

Drafts show in `npm run dev` but not on the live site. Set `draft: false`, or remove the line, and push to `main` to publish. New posts go to the top of the Writing list on the homepage and into the feed at `/rss.xml`. `src/content/blog/example-post.md` is a full example and stays a draft.

## Build

Needs Node 22 or newer.

```sh
npm install
npm run dev        # local server at http://localhost:4321
npm test           # unit tests for the project list and the private-repo switch
npm run build      # type-checks, writes dist/, then checks section order, private repo cards and drafts
npm run leak-check # emails, build output, and private terms if ~/.leak-private-terms exists
```

## Deploy

A push to `main` runs the leak check (emails and build output only; private terms are checked locally), the tests and a build, then deploys to GitHub Pages. The same thing runs every day at 13:17 UTC, so the project list stays current. If GitHub's API can't be reached, the build fails and the live site is left alone. Pull requests run the same checks without deploying.

Decisions about the site are in `docs/decisions.md`.

## License

MIT. See `LICENSE`.
