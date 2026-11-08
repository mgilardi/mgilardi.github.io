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
- **Grouping** uses repo names and topics: `macos` is Mac apps, `minecraft` is Minecraft plugins, `one<thing>` is science tools, `payload-plugin` is Payload plugins, anything else is Other. Within a group, the most recently pushed comes first. Science tools always say "Source-available", never "open source".
- **Intro** is the owner's own Long Bio from the owner's university directory profile, word for word. Only the bio paragraphs are used, not the contact details on that page.
