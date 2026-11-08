import { getCollection } from 'astro:content';

const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

/** Published posts, newest first. Drafts appear only in `npm run dev` or with SHOW_DRAFTS=1. */
export async function getPosts() {
  const posts = await getCollection('blog', (p) => showDrafts || !p.data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
