import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database, Json } from '../supabase/database.types';
import type { RemoteImage } from '../images';
import { remoteMediaImage } from '../supabase/media';

export interface PublishedGuideRow {
	slug: string;
	silo: string;
	title: string;
	description: string;
	image: RemoteImage;
	imageAlt: string;
	readingMinutes: number;
	featured: boolean;
	answer: string;
	sections: Json;
	faqs: Json;
	tourProductKey: string | null;
	tourNote: string | null;
	publishedAt: Date;
	updatedAt: Date;
}

async function loadPublishedGuideRows(): Promise<PublishedGuideRow[]> {
	const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
	const { data, error } = await supabase
		.from('guides')
		.select('slug, silo, title, description, image_path, image_alt, reading_minutes, featured, answer, sections, faqs, tour_note, published_at, updated_at, product:products(key)')
		.eq('locale', 'es')
		.eq('status', 'published')
		.order('published_at', { ascending: false });
	if (error) throw error;

	const rows = (data ?? []).filter((row) => row.image_path);
	return Promise.all(
		rows.map(async (row) => ({
			slug: row.slug,
			silo: row.silo,
			title: row.title,
			description: row.description,
			image: await remoteMediaImage(row.image_path ?? ''),
			imageAlt: row.image_alt ?? '',
			readingMinutes: row.reading_minutes ?? 1,
			featured: row.featured,
			answer: row.answer ?? '',
			sections: row.sections,
			faqs: row.faqs,
			tourProductKey: row.product?.key ?? null,
			tourNote: row.tour_note,
			publishedAt: new Date(row.published_at ?? row.updated_at),
			updatedAt: new Date(row.updated_at),
		})),
	);
}

export const publishedGuideRows = await loadPublishedGuideRows();
