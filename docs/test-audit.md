# Test audit

What the site promises, and what proves it. Redo after each feature or fix, and at least every 14 days while the repo has commits.

## 2026-11-08: first audit

Before this audit the only automated checks were the leak check, the type check and the section-order check. This pass added `test/catalog.test.mjs` (11 unit tests, `npm test`, run in CI) and `scripts/check-dist.mjs` (runs after every build). To make the project list testable without GitHub, its logic moved from `src/data/projects.ts` to `src/data/catalog.mjs`.

### Always covered

| Promise | Proved by |
| --- | --- |
| Nothing private or personal is committed: emails, build output | `scripts/leak-check.sh` in CI on every push, PR and daily run |
| Private terms stay out of the repo | `scripts/leak-check.sh` locally with `LEAK_PRIVATE_TERMS`. Not in CI by design: the terms live off GitHub |
| A featured private repo shows no link | unit tests "a featured private repo gets no link…" and "a private repo can never carry a link, even if saved data has one"; `check-dist` fails the build if a Private card has a link or the repo's GitHub URL appears anywhere in `dist/`. Each failure case was run once by hand and failed as expected |
| Private repos that aren't featured are never written to the public repo | unit test "the feature command saves only switched-on repos…" (also checks only four fields are saved) |
| Private repos returned by the listing never get a card | unit test "private repos in the listing are dropped…" |
| Fails closed: an API error or an empty listing fails the build, so the live site stays as it was | unit tests "a GitHub API error fails the build" and "an empty listing fails the build…" |
| Drafts are never published | `check-dist`: no page and no feed entry for any `draft: true` post. Failure case run by hand |

### Covered

| Promise | Proved by |
| --- | --- |
| Every public repo is listed, across pages of the API | unit test "the API is paged until a short page, and the token is sent" |
| A featured repo that goes public is linked and joins its own section | unit test "once a featured repo is public…" |
| Forks, archived repos, dot-repos and `EXCLUDE` are left off, in Featured too | unit test "forks, archived, dot-repos and EXCLUDE…" |
| Featured comes first; sections are alphabetical; empty sections are hidden | unit test "Featured comes first…" and `scripts/check-order.mjs` on the built page |
| Card names and descriptions read well | unit test "card names…" |
| The feature checklist switches, saves and quits without saving | run by hand in a pseudo-terminal on 2026-11-08 (switch twice and save leaves the file the same; q leaves it unchanged) |
| Types are sound | `astro check` in every build |

### Gaps skipped, and why

- **Accessibility (axe, WCAG 2.2 AA):** run by hand with Playwright on each visual change (0 issues, light and dark, 2026-11-08). Not in CI: it needs a browser download on every run, and the page changes rarely. Revisit if the page gets interactive.
- **The interactive checklist in CI:** it needs the owner's `gh` sign-in to list private repos. The part that matters for privacy, what gets saved, is unit-tested.
- **Blog rendering and the RSS format:** Astro and `@astrojs/rss` internals. The draft rule, which is ours, is covered.
- **The daily schedule:** GitHub's cron. The first scheduled run is checked once by hand (area notes).
