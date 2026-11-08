# Decisions

Recorded so later work follows them without asking again.

## 2026-11-07: remake

- **Projects first.** The page leads with a short intro, then the public projects grouped as Mac apps, Minecraft plugins, science tools and Payload plugins. The old résumé template (particles header, skill logos, work-history stub) is gone.
- **Astro**, static output only, no client-side JavaScript. Deployed by `.github/workflows/site.yml` to GitHub Pages. The Pages source has to be set to "GitHub Actions" when this first merges.
- **Links kept:** GitHub, LinkedIn, Salesforce Trailblazer, university profile. The old business link was dropped.
- **npm:** linked as the `@captiveorigins` scope from the science tools and Payload plugins sections, not as a header link.
- **Go-live:** built on a branch and previewed first. Nothing merges to `main` without the owner's OK.
- **Name:** this is the one place the owner's personal name may appear. Family names, finances and other personal details stay out.
- **Leak check:** `scripts/leak-check.sh` reads the private terms from outside the repo (`~/.theseus-private-terms` or `LEAK_TERMS_FILE`; the `LEAK_TERMS` secret in CI). `scripts/leak-allow.txt` lists the exact public phrases this site shows on purpose.
- **Forward-only cleanup:** the committed `vendor/bundle` (91 MB) was removed and ignored. History was not rewritten.
- **Project list:** every public project is shown for now; the owner may trim it at preview. Descriptions follow each repo's GitHub description. The One tools are "source-available", never "open source".
