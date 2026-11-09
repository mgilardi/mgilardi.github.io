# mgilardi.github.io

My personal site at https://mgilardi.github.io. One page: a short intro, Captive Origins, my writing, and the public things I've built, grouped as Mac apps, iOS apps, Minecraft plugins, science tools and Payload plugins. Blog posts get their own pages.

It's a static Astro site with no client-side JavaScript, no tracking and no cookies. The built page is about 20 KB.

## Editing

The project list isn't written by hand. Every build reads every public repo in ExtantApe, CaptiveOrigins and my own account from GitHub, then sorts each into a section by its topics. To change what a card says, change that repo's description or topics on GitHub, and the next build picks it up.

### The settings file

`src/data/repos.yaml` lists every repo the site knows about, one entry each, and it's mine to edit. The comments at the top explain each field.

- **categories** are the sections, in page order. A repo goes in the first one whose `topics` match its GitHub topics, or whose `names` pattern matches its name. A repo that matches nothing goes to the `default: true` one (Other), and the build prints a warning naming it, so a new repo can't land there unnoticed.
- **repos** has one entry per repo, matched by GitHub's id, so a renamed repo keeps its settings. Set `show: false` to hide one, `category:` to move it, `name:` to fix its card name, or `label:` to change a private repo's chip. Values under `auto` are the build's guesses: it rewrites them on every build, and anything I set wins over them.
- The build adds new public repos on its own. After each deploy it commits the file to `main` if anything changed, so pull before editing. A renamed repo has its `repo` updated. A repo that leaves GitHub's public list gets `gone:` and the date, and is hidden but kept.
- A typo fails the build with the file and line: an unknown key, an unknown category, or `show` that isn't true or false.
- Forks and archived repos are hidden unless I set `show: true`. There's no order setting: sections are always alphabetical, ignoring case and a leading "The", and the build fails if the page comes out in any other order.

### Private repos

To show a private repo too, such as an app waiting for release:

```sh
npm run repos     # updates both files, reading private repos through my own gh sign-in
```

That writes every private repo in the three accounts to `src/data/repos.private.yaml`, hidden. That file is git-ignored and stays on this Mac. Set `show: true` on one there, run `npm run repos` again, and commit `repos.yaml`. The repo gets a card in its section with its name, description and a "Pending release" chip, but no link. Taking `show: true` off removes it from `repos.yaml` again. Running the command also refreshes the saved descriptions, which the daily build can't read on its own. When a shown repo goes public, the next build links it like any other.

A private repo that isn't shown is never written to `repos.yaml`, and the build refuses one that is. Before showing one, check its description is fine to make public.

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
npm test           # unit tests for the project list and the settings file
npm run build      # syncs repos.yaml, type-checks, writes dist/, then checks section order, private cards, links and drafts
npm run repos      # also syncs private repos, through your gh sign-in
npm run leak-check # emails, build output, and private terms if ~/.leak-private-terms exists
```

## Deploy

A push to `main` runs the leak check (emails and build output only; private terms are checked locally), the tests and a build, then deploys to GitHub Pages. If GitHub's API can't be reached, the build fails and the live site is left alone. Pull requests run the same checks without deploying.

The same thing runs every day at 10:17 UTC (overnight for me), which picks up new repos, renames and changed descriptions.

GitHub can delay or drop scheduled runs when it's busy. That's why the first daily run, due 2026-11-09 at 13:17 UTC, never started: GitHub has no record of it and gives no reason. So a fallback runs at 16:43 UTC. It does nothing if the 10:17 run succeeded that day. Otherwise it builds and deploys, and it shows a warning saying the main run was missed. Pushing to `main` or running the workflow by hand also rebuilds.

Decisions about the site are in `docs/decisions.md`.

## License

MIT. See `LICENSE`.
