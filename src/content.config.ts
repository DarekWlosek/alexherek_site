import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** A single purchasable book within a series. */
const volumeSchema = z.object({
  number: z.string(), // "Vol. 1", "Bk. 1", "01" — display label
  title: z.string(),
  meta: z.string().optional(), // "25 COUNTRIES", "98 EXERCISES", etc.
  description: z.string().optional(),
  status: z.enum(["available", "in-production", "planned"]),
  price: z.number().optional(), // USD
  asin: z.string().optional(),
  cover: z.string().optional(), // path under /public/images
});

const kidsSeries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/kids-series" }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    ageRange: z.string(),
    flagship: z.boolean().default(false),
    heroImage: z.string().optional(),
    volumes: z.array(volumeSchema),
    languageNote: z.string().optional(),
    order: z.number().default(99),
  }),
});

const seniorSeries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/senior-series" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    heroImage: z.string().optional(),
    volumes: z.array(volumeSchema),
    languageNote: z.string().optional(),
    order: z.number().default(99),
  }),
});

const blogPostSchema = z.object({
  title: z.string(),
  tag: z.string(),
  excerpt: z.string(),
  draft: z.boolean().default(true),
  pubDate: z.date().optional(),
  heroImage: z.string().optional(), // path under /public/images
  heroImageAlt: z.string().optional(),
  /** id (filename without extension) of the matching post in blogKidsPl/blogSeniorsPl, if a translation exists. */
  plSlug: z.string().optional(),
});

const blogKids = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-kids" }),
  schema: blogPostSchema,
});

const blogSeniors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-seniors" }),
  schema: blogPostSchema,
});

/** Same shape as blogPostSchema, plus an optional FAQ block for FAQPage schema.org markup. */
const blogPostPlSchema = z.object({
  title: z.string(),
  tag: z.string(),
  excerpt: z.string(),
  draft: z.boolean().default(true),
  pubDate: z.date().optional(),
  heroImage: z.string().optional(), // path under /public/images
  heroImageAlt: z.string().optional(),
  faq: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .optional(),
  /** id (filename without extension) of the matching post in blogKids/blogSeniors, if an EN original exists. */
  enSlug: z.string().optional(),
});

const blogKidsPl = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-kids-pl" }),
  schema: blogPostPlSchema,
});

const blogSeniorsPl = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-seniors-pl" }),
  schema: blogPostPlSchema,
});

/**
 * Real customer testimonials only. The FTC's Consumer Reviews and
 * Testimonials Rule (effective Oct 21, 2024, 16 CFR Part 465) bans
 * fabricated or AI-generated reviews attributed to people who don't exist —
 * penalties run up to ~$53,000 per violation. Every entry here must be a
 * real quote from a real reader, with a verifiable source.
 *
 * `source` is required and must say where the quote came from (e.g.
 * "Verified Amazon review — Left Hand Brain Training, Book 1" or
 * "Submitted via alexherek.com beta reader form, with permission").
 * Never add a placeholder or invented entry — pages that display
 * testimonials simply render nothing until a real one exists here.
 */
const testimonials = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/testimonials" }),
  schema: z.object({
    quote: z.string(),
    author: z.string(), // real name, initials, or "Verified Amazon Customer"
    source: z.string(), // required — where/how this was collected
    silo: z.enum(["kids", "seniors"]),
    rating: z.number().min(1).max(5).default(5),
    link: z.string().url().optional(), // link to the public review, if any
    photo: z.string().optional(), // path under /public/images
    order: z.number().default(99),
  }),
});

const plKidsSeries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pl-kids-series" }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    ageRange: z.string(),
    flagship: z.boolean().default(false),
    heroImage: z.string().optional(),
    volumes: z.array(volumeSchema),
    languageNote: z.string().optional(),
    order: z.number().default(99),
  }),
});

const plSeniorSeries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pl-senior-series" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    heroImage: z.string().optional(),
    volumes: z.array(volumeSchema),
    languageNote: z.string().optional(),
    order: z.number().default(99),
  }),
});

export const collections = {
  kidsSeries,
  seniorSeries,
  blogKids,
  blogSeniors,
  testimonials,
  plKidsSeries,
  plSeniorSeries,
  blogKidsPl,
  blogSeniorsPl,
};
