# mgilardi.github.io

My personal site at https://mgilardi.github.io. One page: a short intro, Captive Origins, my writing, and the public things I've built, grouped as Mac apps, Minecraft plugins, science tools and Payload plugins. Blog posts get their own pages.

It's a static Astro site with no client-side JavaScript, no tracking and no cookies. The built page is about 20 KB.

## Editing

The project list isn't written by hand. At build time `src/data/projects.ts` asks GitHub for every public repo in the ExtantApe and CaptiveOrigins orgs and groups them by topic. To change what a card says, change that repo's description or topics on GitHub. The site picks it up at the next daily build. To leave a public repo off, add it to `EXCLUDE` in the same file. Each section is sorted alphabetically by name, ignoring case and a leading "The", and the build fails if the page comes out in any other order. The page itself is `src/pages/index.astro` and the styles are in `src/styles/global.css`. Light and dark follow the system setting.

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
npm run build      # type-checks, then writes dist/
npm run leak-check # emails, build output, and private terms if ~/.leak-private-terms exists
```

## Deploy

A push to `main` runs the leak check (emails and build output only; private terms are checked locally) and a build, then deploys to GitHub Pages. The same thing runs every morning at 06:17 Arizona time, so the project list stays current. If GitHub's API can't be reached, the build fails and the live site is left alone. Pull requests run the same checks without deploying.

Decisions about the site are in `docs/decisions.md`.

## License

MIT. See `LICENSE`.
