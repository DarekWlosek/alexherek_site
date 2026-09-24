// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Maps each content-collection directory to the root-relative URL prefix its
 * pages are published under, so the sitemap can attach a real <lastmod> to
 * every content page instead of leaving the tag out entirely.
 */
const CONTENT_ROUTES = [
  ['src/content/blog-kids', '/blog/kids'],
  ['src/content/blog-seniors', '/blog/seniors'],
  ['src/content/blog-cooking', '/blog/cooking'],
  ['src/content/blog-kids-pl', '/pl/blog/kids'],
  ['src/content/blog-seniors-pl', '/pl/blog/seniors'],
  ['src/content/blog-cooking-pl', '/pl/blog/cooking'],
  ['src/content/cooking-books', '/cooking'],
  ['src/content/pl-cooking-books', '/pl/cooking'],
  ['src/content/kids-series', '/kids'],
  ['src/content/senior-series', '/seniors'],
  ['src/content/pl-kids-series', '/pl/kids'],
  ['src/content/pl-senior-series', '/pl/seniors'],
];

/**
 * Pulls `pubDate: 2026-08-26` straight out of the frontmatter without a full
 * YAML parser — good enough for a single scalar date field like this one.
 */
function extractPubDate(raw) {
  const match = raw.match(/^pubDate:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
  return match ? match[1] : null;
}

/**
 * Builds a { "/blog/kids/01-intro-world-cultures-toddlers/": "2026-08-26", ... }
 * lookup used by the sitemap `serialize` hook below. Blog posts use their
 * `pubDate` frontmatter; series/book pages have no such field, so they fall
 * back to the markdown file's last-modified time — still a real signal of
 * when that page's content last changed, and better than no <lastmod> at all.
 */
function buildLastmodMap() {
  const map = new Map();
  for (const [dir, urlPrefix] of CONTENT_ROUTES) {
    const absDir = join(__dirname, dir);
    let files;
    try {
      files = readdirSync(absDir).filter((f) => f.endsWith('.md'));
    } catch {
      continue; // collection folder doesn't exist (yet) — skip quietly
    }
    for (const file of files) {
      const absPath = join(absDir, file);
      const slug = file.replace(/\.md$/, '');
      const raw = readFileSync(absPath, 'utf-8');
      const pubDate = extractPubDate(raw);
      const lastmod = pubDate ?? statSync(absPath).mtime.toISOString().slice(0, 10);
      map.set(`${urlPrefix}/${slug}/`, lastmod);
    }
  }
  return map;
}

const lastmodMap = buildLastmodMap();

export default defineConfig({
  site: 'https://alexherek.com',
  integrations: [
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const lastmod = lastmodMap.get(pathname);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
