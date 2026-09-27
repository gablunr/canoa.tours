import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { fillContentTokens } from './data/guides/content-tokens';

const text = z.string().transform(fillContentTokens);

const documentSchema = z.object({
	title: text,
	description: text,
	summary: text.optional(),
	updatedAt: z.coerce.date(),
});

const legal = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/legal' }),
	schema: documentSchema,
});

const help = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/help' }),
	schema: documentSchema,
});

export const collections = { legal, help };
