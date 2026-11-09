import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Blog posts are Markdown files in src/content/blog/. The file name is the URL: hello.md → /blog/hello/.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** One or two sentences, shown on the homepage and in the feed. */
    summary: z.string(),
    date: z.coerce.date(),
    /** Drafts are left out of the built site and the feed. `npm run dev` shows them. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
