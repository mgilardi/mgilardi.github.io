import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../data/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Michael Gilardi',
    description: 'Writing by Michael Gilardi.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
    })),
  });
}
