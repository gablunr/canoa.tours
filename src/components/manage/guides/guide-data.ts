import type { SupabaseClient } from '@supabase/supabase-js';
import palmBeachImage from '../../../assets/images/home/caribbean-palm-beach.jpg';
import type { Guide, GuideSilo } from '../../../data/guides/guides';
import { routes } from '../../../data/site/routes';
import { destinationHref, destinationImage, destinations } from '../../../data/tours/destinations';
import { tourDetails } from '../../../data/tours/tours';
import type { SiteImage } from '../../../lib/images';
import { storedArray, type StoredGuideSection } from '../../../lib/guides/render-guide-content';
import type { QuestionAndAnswer } from '../../../lib/seo/structured-data';
import type { Database } from '../../../lib/supabase/database.types';
import { publicMediaUrl, remoteImage } from '../../../lib/supabase/media';

export type GuideStatus = 'draft' | 'published';

export interface GuideListItem {
	id: string;
	status: GuideStatus;
	title: string;
	path: string;
	siloLabel: string;
	imageUrl: string | null;
	featured: boolean;
	readingMinutes: number | null;
	updatedAt: string;
	publishedAt: string | null;
}

export interface EditableGuide {
	id: string;
	status: GuideStatus;
	title: string;
	slug: string;
	silo: GuideSilo;
	description: string;
	imagePath: string | null;
	imageUrl: string | null;
	imageAlt: string;
	readingMinutes: number | null;
	featured: boolean;
	answer: string;
	sections: StoredGuideSection[];
	faqs: QuestionAndAnswer[];
	tourProductKey: string | null;
	tourNote: string;
	publishedAt: string | null;
	updatedAt: string;
}

type Supabase = SupabaseClient<Database>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const guideSiloOptions: { value: GuideSilo; label: string }[] = [
	{ value: 'general', label: 'General' },
	...destinations.map((destination) => ({ value: destination.id, label: destination.name })),
];

const findSilo = (silo: string): GuideSilo => guideSiloOptions.find((option) => option.value === silo)?.value ?? 'general';

export const guideSiloLabel = (silo: string) => guideSiloOptions.find((option) => option.value === silo)?.label ?? 'General';

export function guidePathPrefix(silo: string) {
	const destination = destinations.find((candidate) => candidate.id === silo);
	return destination ? `${destinationHref(destination)}/` : `${routes.guides}/`;
}

export const guidePathPrefixes: Record<string, string> = Object.fromEntries(guideSiloOptions.map((option) => [option.value, guidePathPrefix(option.value)]));

export const tourSlugsBySilo: Record<string, string[]> = Object.fromEntries(
	destinations.map((destination) => [destination.id, tourDetails.filter((details) => details.destination.id === destination.id).map((details) => details.tour.slug)]),
);

const searchTerm = (query: string) => query.replace(/[%_*,()"\\]/g, ' ').replace(/\s+/g, ' ').trim();

export async function loadGuideCounts(supabase: Supabase, query: string): Promise<Record<GuideStatus, number>> {
	const term = searchTerm(query);
	const countFor = async (status: GuideStatus) => {
		let request = supabase.from('guides').select('id', { count: 'exact', head: true }).eq('locale', 'es').eq('status', status);
		if (term) request = request.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
		const { count, error } = await request;
		if (error) throw error;
		return count ?? 0;
	};
	const [draft, published] = await Promise.all([countFor('draft'), countFor('published')]);
	return { draft, published };
}

export async function loadGuideList(supabase: Supabase, status: GuideStatus, query: string, rangeStart: number, pageSize: number): Promise<GuideListItem[]> {
	const term = searchTerm(query);
	let request = supabase
		.from('guides')
		.select('id, status, title, slug, silo, image_path, featured, reading_minutes, updated_at, published_at')
		.eq('locale', 'es')
		.eq('status', status);
	if (term) request = request.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
	const { data, error } = await request
		.order(status === 'published' ? 'published_at' : 'updated_at', { ascending: false })
		.range(rangeStart, rangeStart + pageSize - 1);
	if (error) throw error;

	return data.map((row) => ({
		id: row.id,
		status: row.status,
		title: row.title,
		path: `${guidePathPrefix(row.silo)}${row.slug}`,
		siloLabel: guideSiloLabel(row.silo),
		imageUrl: row.image_path ? publicMediaUrl(row.image_path) : null,
		featured: row.featured,
		readingMinutes: row.reading_minutes,
		updatedAt: row.updated_at,
		publishedAt: row.published_at,
	}));
}

export async function loadEditableGuide(supabase: Supabase, id: string | undefined): Promise<EditableGuide | null> {
	if (!id || !uuidPattern.test(id)) return null;

	const { data, error } = await supabase
		.from('guides')
		.select('id, status, title, slug, silo, description, image_path, image_alt, reading_minutes, featured, answer, sections, faqs, tour_note, published_at, updated_at, product:products(key)')
		.eq('id', id)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;

	return {
		id: data.id,
		status: data.status,
		title: data.title,
		slug: data.slug,
		silo: findSilo(data.silo),
		description: data.description,
		imagePath: data.image_path,
		imageUrl: data.image_path ? publicMediaUrl(data.image_path) : null,
		imageAlt: data.image_alt ?? '',
		readingMinutes: data.reading_minutes,
		featured: data.featured,
		answer: data.answer ?? '',
		sections: storedArray<StoredGuideSection>(data.sections),
		faqs: storedArray<QuestionAndAnswer>(data.faqs),
		tourProductKey: data.product?.key ?? null,
		tourNote: data.tour_note ?? '',
		publishedAt: data.published_at,
		updatedAt: data.updated_at,
	};
}

async function previewImage(guide: EditableGuide): Promise<SiteImage> {
	const destination = destinations.find((candidate) => candidate.id === guide.silo);
	const fallback = (destination && destinationImage(destination)) ?? palmBeachImage;
	if (!guide.imageUrl) return fallback;

	try {
		return await remoteImage(guide.imageUrl);
	} catch {
		return fallback;
	}
}

export async function previewGuide(guide: EditableGuide): Promise<Guide> {
	return {
		slug: guide.slug,
		silo: guide.silo,
		title: guide.title,
		description: guide.description,
		image: await previewImage(guide),
		imageAlt: guide.imageAlt,
		readingMinutes: guide.readingMinutes ?? 1,
		publishedAt: new Date(guide.publishedAt ?? guide.updatedAt),
		updatedAt: new Date(guide.updatedAt),
		featured: guide.featured,
	};
}
