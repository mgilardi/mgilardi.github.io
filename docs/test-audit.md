# Test audit

What the site promises, and what proves it. Redo after each feature or fix, and at least every 14 days while the repo has commits.

## 2026-11-11: routine rerun

No code changes since 2026-11-10: only the record job's data commit (`f2db36a`). Locally: `npm test` passes 32 of 32. `npm run build` passes, with check-order ok in every section (Payload 20, Other 3) and check-dist ok. `npm run leak-check` passes on 31 files.

Seen: two more new public repos, `CaptiveOrigins/payload-plugin-labels` and `payload-plugin-signup`, have no category topic, so they're under Other with the build's warning. That's working as designed; the topics are for the Captive Origins Plugins lead to add. Next audit due by 2026-11-25.

## 2026-11-10: the daily build and the record job, seen live

The only change since 2026-11-09 is the record job's first commit (`f7e4d59`, new public repos added to `src/data/repos.yaml`). Run locally: `npm test` passes 32 of 32, `npm run build` passes, with check-order and check-dist ok, and `npm run leak-check` passes on 31 files.

| Promise | Proved by | State |
| --- | --- | --- |
| The site rebuilds daily even when GitHub delays scheduled runs | Run 42869311810: the 10:17 UTC cron, started 7½ hours late at 17:52Z, built and deployed (`FALLBACK: false`). Run 42910087788: the 16:43 UTC fallback, started 21:58Z, found that day's success and skipped the build (`FALLBACK: true`) | Seen working, both paths |
| New and renamed repos are recorded in the settings file without anyone touching it | The `record` job's first commit, `f7e4d59` (2026-11-10 17:53Z) | Seen working |
| A repo with no category topic is shown under Other, with a warning | The build warns for `CaptiveOrigins/payload-plugin-mfa` | Working as designed. That repo needs a topic (its owner's call) |

Still not seen: the fallback actually *building* when the 10:17 run fails. Its condition is the same check that skipped correctly today. Next audit due by 2026-11-24.

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

Promise added: the header shows exactly the owner's chosen links. Covered by `check-dist`, which compares the built header against a fixed list; it was checked to fail with the old links in place and pass without them. It lists the links to keep rather than naming the removed ones, so the removed details don't sit in the public repo. The same day, a manual deploy confirmed the project list picks up renamed and new repos on its own: the live page matched all 15 public, non-fork, non-archived repos in the Minecraft and Mac org exactly, with no duplicates or old names. Nothing is cached between builds, so no fix was needed. Gaps skipped are unchanged.

## 2026-11-09: settings file, categories and the daily fallback

What the repo promises now, and what proves it:

| Promise | Proof |
| --- | --- |
| Each repo lands in the right section by its topics (and the One tools by name) | unit test "each section is picked by the topics GitHub has", run against the real categories in repos.yaml; the live listing was checked by hand (below) |
| A repo matching no category goes to Other and makes the build warn | unit test "a repo whose topics match nothing…"; seen live in the sync output before the site's own repo was hidden |
| His values win, and the build never overwrites them | unit tests "the owner's values are never overwritten…", "no warning once the owner has chosen…", "show: false hides…" |
| Renames are matched by id, keep his settings and comments, and show once under the new name | unit tests "a rename keeps the owner's values and comments…" and "a renamed repo shows once…" |
| Repos that leave the list are marked gone, hidden, kept, and come back if the repo does | unit test "a repo that leaves the listing is marked gone…" and resolve's "a repo gone from the listing…" |
| Typos fail with file and line: unknown category, unknown key, bad value, duplicate id, broken YAML, no default category, bad pattern | five validation unit tests; "the committed settings file is valid" |
| A private repo is never in the public file unless shown; the public sync refuses private repos | unit tests "a private repo that isn't shown is refused…", "the public sync refuses a private repo outright", "private repos: hidden ones stay in the local file only…", "the committed file names no private repo that isn't shown"; check-dist on the built page; `repos.private.yaml` is git-ignored |
| Private cards have no link; once public, linked once without the chip | unit tests carried over; check-dist |
| An unchanged listing leaves the file byte-for-byte the same, so no empty commits | unit test "an unchanged listing…"; two local `npm run repos` runs compared with `cmp` |
| API errors and empty listings fail closed | unit tests carried over |

Checked by hand on 2026-11-09: the new build matched the live page exactly, apart from Slothdoku's description, which picked up its newer GitHub wording. All 36 public repos across the three accounts are in the file, 29 cards are shown, and the order and dist checks pass.

Gaps skipped:

- **The fallback schedule and the record job:** these are GitHub Actions plumbing that can't run locally. They're checked after merge: the record job on the first deploy, and the fallback whenever the 10:17 run is missed. Results go in the area notes.
- **The interactive checklist:** removed. Editing the file replaces it.
- Next audit due by 2026-11-23, or after the next change.
