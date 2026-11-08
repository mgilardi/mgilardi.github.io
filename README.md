# mgilardi.github.io

My personal site at https://mgilardi.github.io. One page: a short intro and the public things I've built, grouped as Mac apps, Minecraft plugins, science tools and Payload plugins.

It's a static Astro site with no client-side JavaScript, no tracking and no cookies. The built page is about 20 KB.

## Editing

The project list lives in `src/data/projects.ts`. Descriptions follow each repo's GitHub description, so when one changes there, change it here too. The page itself is `src/pages/index.astro` and the styles are in `src/styles/global.css`. Light and dark follow the system setting.

## Build

Needs Node 22 or newer.

```sh
npm install
npm run dev        # local server at http://localhost:4321
npm run build      # type-checks, then writes dist/
npm run leak-check # emails, build output, and private terms if ~/.leak-private-terms exists
```

## Deploy

A push to `main` runs the leak check (emails and build output only; private terms are checked locally) and a build, then deploys to GitHub Pages. Pull requests run the same checks without deploying.

Decisions about the site are in `docs/decisions.md`.

## License

MIT. See `LICENSE`.
