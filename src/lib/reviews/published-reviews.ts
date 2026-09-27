import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database } from '../supabase/database.types';
import type { RemoteImage } from '../images';
import { remoteMediaImage } from '../supabase/media';

export interface PublishedReviewRow {
	id: string;
	verified: boolean;
	authorName: string;
	rating: number;
	title: string | null;
	body: string;
	reply: string | null;
	productKey: string;
	photos: RemoteImage[];
	publishedAt: Date;
}

async function loadPublishedReviewRows(): Promise<PublishedReviewRow[]> {
	const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
	const { data, error } = await supabase
		.from('reviews')
		.select('id, source, author_name, rating, title, body, reply, published_at, created_at, product:products(key), review_photos(storage_path, position)')
		.eq('locale', 'es')
		.eq('status', 'published')
		.order('published_at', { ascending: false });
	if (error) throw error;

	return Promise.all(
		(data ?? []).flatMap((row) => {
			const productKey = row.product?.key;
			if (!productKey) return [];
			const photoPaths = [...row.review_photos].sort((first, second) => first.position - second.position).map((photo) => photo.storage_path);
			return [
				Promise.all(photoPaths.map(remoteMediaImage)).then((photos) => ({
					id: row.id,
					verified: row.source === 'booking',
					authorName: row.author_name,
					rating: row.rating,
					title: row.title,
					body: row.body,
					reply: row.reply,
					productKey,
					photos,
					publishedAt: new Date(row.published_at ?? row.created_at),
				})),
			];
		}),
	);
}

export const publishedReviewRows = await loadPublishedReviewRows();
