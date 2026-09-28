import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database } from '../supabase/database.types';
import type { RemoteImage } from '../images';
import { publicMediaUrl, remoteMediaImage } from '../supabase/media';

export interface PublishedReviewRow {
	id: string;
	verified: boolean;
	authorName: string;
	authorAvatarUrl: string | null;
	rating: number;
	title: string | null;
	body: string;
	reply: string | null;
	productKey: string;
	photos: RemoteImage[];
	publishedAt: Date;
}

interface PublishedReviewRecord {
	id: string;
	source: Database['public']['Enums']['review_source'];
	author_name: string;
	author_avatar_path: string | null;
	rating: number;
	title: string | null;
	body: string;
	reply: string | null;
	published_at: string | null;
	created_at: string;
	product: { key: string } | null;
	review_photos: { storage_path: string; position: number }[];
}

export const publishedReviewColumns =
	'id, source, author_name, author_avatar_path, rating, title, body, reply, published_at, created_at, product:products(key), review_photos(storage_path, position)';

export const publicReviewsClient = () => createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

export async function publishedReviewRow(record: PublishedReviewRecord): Promise<PublishedReviewRow | null> {
	const productKey = record.product?.key;
	if (!productKey) return null;
	const photoPaths = [...record.review_photos].sort((first, second) => first.position - second.position).map((photo) => photo.storage_path);
	const photos = await Promise.all(photoPaths.map(remoteMediaImage));
	return {
		id: record.id,
		verified: record.source === 'booking',
		authorName: record.author_name,
		authorAvatarUrl: record.author_avatar_path ? publicMediaUrl(record.author_avatar_path) : null,
		rating: record.rating,
		title: record.title,
		body: record.body,
		reply: record.reply,
		productKey,
		photos,
		publishedAt: new Date(record.published_at ?? record.created_at),
	};
}

export async function publishedReviewRows(records: PublishedReviewRecord[]): Promise<PublishedReviewRow[]> {
	const rows = await Promise.all(records.map(publishedReviewRow));
	return rows.filter((row): row is PublishedReviewRow => row !== null);
}
