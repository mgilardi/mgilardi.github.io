# Decisions

Recorded so later work follows them without asking again.

## 2026-11-07: remake

- **Projects first.** The page leads with a short intro, then the public projects grouped as Mac apps, Minecraft plugins, science tools and Payload plugins. The old résumé template (particles header, skill logos, work-history stub) is gone.
- **Astro**, static output only, no client-side JavaScript. Deployed by `.github/workflows/site.yml` to GitHub Pages. The Pages source has to be set to "GitHub Actions" when this first merges.
- **Links kept:** GitHub, LinkedIn, Salesforce Trailblazer, university profile. The old business link was dropped.
- **npm:** linked as the `@captiveorigins` scope from the science tools and Payload plugins sections, not as a header link.
- **Go-live:** built on a branch and previewed first. Nothing merges to `main` without the owner's OK.
- **Name:** this is the one place the owner's personal name may appear. Family names, finances and other personal details stay out.
- **Leak check:** `scripts/leak-check.sh` is the standard script shared by the other public repos. CI checks for non-noreply email addresses and committed build output. Private terms are checked locally only, from `LEAK_PRIVATE_TERMS` (default `~/.leak-private-terms`). They stay off GitHub, with no repo secret. `scripts/leak-allow.txt` lists the exact public phrases this site shows on purpose.
- **Forward-only cleanup:** the committed `vendor/bundle` (91 MB) was removed and ignored. History was not rewritten.
- **Project list:** superseded on 2026-11-08, below.

## 2026-11-08: owner's review

- **Projects come from GitHub automatically.** Every public, non-fork, non-archived repo in the ExtantApe and CaptiveOrigins orgs is listed, read from the GitHub API at build time. The workflow rebuilds and deploys daily, so new repos and changed descriptions appear within a day. If GitHub can't be reached, the build fails and the live site stays as it was. To hide a public repo, add its name to `EXCLUDE` in `src/data/projects.ts`.
- **Grouping** uses repo names and topics: `macos` is Mac apps, `minecraft` is Minecraft plugins, `one<thing>` is science tools, `payload-plugin` is Payload plugins, anything else is Other. Science tools always say "Source-available", never "open source".
- **Intro** is the owner's own Long Bio from the owner's university directory profile, word for word. Only the bio paragraphs are used, not the contact details on that page.

## 2026-11-08: stable order

- **Alphabetical within each section**, by displayed name, ignoring case and a leading "The", so the order doesn't change from one build to the next. The rule lives in `src/data/order.mjs`. `scripts/check-order.mjs` runs as part of `npm run build`, in CI too, and fails if any section on the built page is out of order. Supersedes "most recently pushed first" above.

## 2026-11-08: featured section and blog

- **One page.** Everything lives on the homepage. The only other pages are blog posts.
- **Captive Origins section** near the top of the page, in its own palette (brown, cream, orange, pink from the public brand notes). High-level only: why it's needed, what it does and why the owner is the right person for it. It uses only what is already public (the live prototype site and the public One tools), never plans, prices, partners or internal details.
- **Blog.** Posts are Markdown files in `src/content/blog/`, each with its own page at `/blog/<file-name>/`. The homepage lists them under Writing, newest first, and there's an RSS feed at `/rss.xml`. The Writing section only appears once there's a published post. `draft: true` keeps a post off the live site. `npm run dev` shows drafts, and so does a build with `SHOW_DRAFTS=1`.

## 2026-11-08: Featured repos, and Captive Origins wording

- The owner's review of PR #4: keep the Captive Origins copy up to "Why me", rewrite "Why me" to sound like him, drop "My life's work" as the eyebrow, and use a pink accent in that section.
- A Featured category comes first in the project list. The owner switches repos in or out with `npm run feature`; choices are saved in `src/data/featured.json` and persist across the daily builds.
- Private repos can be featured, with name and description only and no link (Slothdoku first). Only featured repos are stored, so private repos that aren't featured never appear in the public repo. When a featured private repo goes public, the build links it and lists it in its normal section automatically.
- The command reads private repos through the owner's local `gh` sign-in. The daily build doesn't get a token for private repos, so a private description only changes when the command is run again. A read-only token would make that automatic, but it's one more thing to renew.

## 2026-11-09: No Featured section; private repos in their own sections

- The owner: "the Captive Origins thing _is_ the featured one". The Featured project category is gone; the Captive Origins box is the featured piece.
- Private repos the owner switches on (`npm run private`, saved in `src/data/private-repos.json`) go in their normal section with a "Pending release" chip and no link. Slothdoku is listed under a new iOS apps section. An optional `label` changes the chip for a repo that isn't headed for release.
- The Captive Origins box takes its terms from the platform's approved site copy (2026-11-09: keepers, evidence, conservation, "an indication, not proof", the Roadmap). It leaves out what that copy says but the live site doesn't yet: species, prices, kits and agency credits. Revisit once the platform's copy is live.
- More space between the Captive Origins box and the project links below it (owner, 2026-11-09).

- A headshot from the owner (2026-11-09) sits beside the name and is the link-preview image. It's a 320 px WebP with all metadata stripped (no EXIF or location); the original stays off the repo.

## 2026-11-09: Fewer header links

- The owner removed the Discord username and the university profile link from the header. The rest of the bio stays word for word.
- `scripts/check-dist.mjs` now pins the header links to the owner's list (GitHub, LinkedIn, Trailblazer, YouTube), so a removed link can't come back without someone changing that list too.
- The schedule's time is written in UTC, and the README and workflow no longer name a location.
