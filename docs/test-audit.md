# Test audit

What the site promises, and what proves it. Redo after each feature or fix, and at least every 14 days while the repo has commits.

## 2026-11-08: first audit

Before this audit the only automated checks were the leak check, the type check and the section-order check. This pass added `test/catalog.test.mjs` (11 unit tests, `npm test`, run in CI) and `scripts/check-dist.mjs` (runs after every build). To make the project list testable without GitHub, its logic moved from `src/data/projects.ts` to `src/data/catalog.mjs`.

### Always covered

| Promise | Proved by |
| --- | --- |
| Nothing private or personal is committed: emails, build output | `scripts/leak-check.sh` in CI on every push, PR and daily run |
| Private terms stay out of the repo | `scripts/leak-check.sh` locally with `LEAK_PRIVATE_TERMS`. Not in CI by design: the terms live off GitHub |
| A shown private repo has no link | unit tests "a shown private repo goes in its own section…" and "a private repo can never carry a link…"; `check-dist` fails the build if a private card has a link, if the repo's GitHub URL appears anywhere in `dist/`, or if a repo in `private-repos.json` has no card at all. Failure cases run by hand |
| Private repos that aren't switched on are never written to the public repo | unit test "the private command saves only switched-on private repos…" (also checks the fields saved) |
| Private repos returned by the listing never get a card | unit test "private repos in the listing are dropped…" |
| Fails closed: an API error or an empty listing fails the build, so the live site stays as it was | unit tests "a GitHub API error fails the build" and "an empty listing fails the build…" |
| Drafts are never published | `check-dist`: no page and no feed entry for any `draft: true` post. Failure case run by hand |

### Covered

| Promise | Proved by |
| --- | --- |
| Every public repo is listed, across pages of the API | unit test "the API is paged until a short page, and the token is sent" |
| A shown private repo that goes public is listed once, linked, without the chip | unit test "once a shown private repo is public…" |
| A label replaces the Pending release chip | unit test "a saved label replaces…" |
| Forks, archived repos, dot-repos and `EXCLUDE` are left off, shown private repos too | unit test "forks, archived, dot-repos and EXCLUDE…" |
| Sections in page order (iOS apps after Mac apps), alphabetical, empty ones hidden | unit test "sections come in page order…" and `scripts/check-order.mjs` on the built page |
| Card names and descriptions read well | unit test "card names…" |
| The private-repo checklist switches, saves and quits without saving | run by hand in a pseudo-terminal on 2026-11-08 (switch twice and save leaves the file the same; q leaves it unchanged) |
| Types are sound | `astro check` in every build |

### Gaps skipped, and why

- **Accessibility (axe, WCAG 2.2 AA):** run by hand with Playwright on each visual change (0 issues, light and dark, 2026-11-08). Not in CI: it needs a browser download on every run, and the page changes rarely. Revisit if the page gets interactive.
- **The interactive checklist in CI:** it needs the owner's `gh` sign-in to list private repos. The part that matters for privacy, what gets saved, is unit-tested.
- **Blog rendering and the RSS format:** Astro and `@astrojs/rss` internals. The draft rule, which is ours, is covered.
- **The daily schedule:** GitHub's cron. The first scheduled run is checked once by hand (area notes).

## 2026-11-09: after removing Featured

Featured became private repos in their own sections, so the tests above were rewritten for it (12 unit tests). New: `check-dist` also fails if a repo in `private-repos.json` has neither an unlinked card nor a public, linked one, so a broken marker can't pass silently. The checklist was re-run by hand in a pseudo-terminal. Gaps skipped are unchanged.

## 2026-11-09: header links trimmed

Promise added: the header shows exactly the owner's chosen links. Covered by `check-dist`, which compares the built header against a fixed list; it was checked to fail with the old links in place and pass without them. It lists the links to keep rather than naming the removed ones, so the removed details don't sit in the public repo. The same day, a manual deploy confirmed the project list picks up renamed and new repos on its own: the live page matched the 15 public, non-fork, non-archived ExtantApe repos exactly, with no duplicates or old names. Nothing is cached between builds, so no fix was needed. Gaps skipped are unchanged.
