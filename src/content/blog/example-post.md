---
title: How to write a post
summary: An example that stays a draft. Copy this file, change the top block, and set draft to false when it's ready.
date: 2026-11-08
draft: true
---

This post is a draft, so it never appears on the live site. It shows up in `npm run dev` only.

To write a real post, add a Markdown file next to this one. The file name becomes the address, so `reptile-records.md` is published at `/blog/reptile-records/`. Fill in the block at the top:

- **title**: the post's title.
- **summary**: one or two sentences for the homepage list and the feed.
- **date**: the date it's published, like `2026-11-08`.
- **draft**: `true` while you're working on it, `false` (or remove the line) to publish.

Then write normally. Headings, lists, links, `code` and images all work.

## A heading

Pushing to `main` publishes the post. It appears at the top of the Writing list on the homepage and in the feed at `/rss.xml`.
