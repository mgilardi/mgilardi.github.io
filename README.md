# mgilardi.github.io

My personal site at https://mgilardi.github.io. One page: a short intro and the public things I've built, grouped as Mac apps, Minecraft plugins, science tools and Payload plugins.

It's a static Astro site with no client-side JavaScript, no tracking and no cookies. The built page is about 20 KB.

## Editing

The project list isn't written by hand. At build time `src/data/projects.ts` asks GitHub for every public repo in the ExtantApe and CaptiveOrigins orgs and groups them by topic. To change what a card says, change that repo's description or topics on GitHub. The site picks it up at the next daily build. To leave a public repo off, add it to `EXCLUDE` in the same file. The page itself is `src/pages/index.astro` and the styles are in `src/styles/global.css`. Light and dark follow the system setting.

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
