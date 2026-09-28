import { destinationHref, destinations, type Destination } from '../../../data/tours/destinations';
import { isPillarCitedTour } from '../../../data/pillars/cited-tours';
import { priceLabel, tourFaqs, tourSeoDescription, tourSeoTitle, type TourDetails } from '../../../data/tours/tours';
import { canonicalUrl } from '../../../lib/seo/seo';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { publicMediaUrl } from '../../../lib/supabase/media';
import { santoDomingoToday, spanishTranslation, tourRowSelect, tourRowToDetails, tourRowToEditable, type TourRow } from '../../../lib/tours/tour-rows';
import type { TourEditable } from '../../../lib/tours/tour-schema';

export const tourUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const tourImagePrefix = (tourId: string) => `products/${tourId}/`;

export const mostBookedPositions = [1, 2, 3, 4] as const;

export const seoDescriptionLimit = 160;

export const seoTitleLimit = 60;

const suggestionLimit = 150;

export interface TourZoneOption {
	id: string;
	name: string;
}

export interface TourFeeSource {
	id: string;
	name: string;
	fees: { zoneId: string; fee: number }[];
}

export interface TourMostBookedHolder {
	position: number;
	id: string;
	name: string;
}

export interface TourEditorPhoto {
	path: string;
	alt: string;
	width: number;
	height: number;
	url: string;
}

export interface TourListSuggestions {
	highlights: string[];
	includes: string[];
	excludes: string[];
	bring: string[];
}

export interface TourGooglePreview {
	title: string;
	titleSuffix: string;
	description: string;
	descriptionSuffix: string;
	host: string;
}

export interface TourEditorData {
	row: TourRow;
	editable: TourEditable;
	details: TourDetails;
	destination: Destination;
	photos: TourEditorPhoto[];
	slugLocked: boolean;
	publicPath: string;
	zones: TourZoneOption[];
	feeSources: TourFeeSource[];
	suggestions: TourListSuggestions;
	takenSlugs: string[];
	mostBookedHolders: TourMostBookedHolder[];
	futureBookings: number;
	canRemove: boolean;
	archiveBlock: string | null;
	autoFaqQuestions: string[];
	googlePreview: TourGooglePreview;
	updatedLabel: string;
}

type OtherTourRow = {
	id: string;
	status: TourRow['status'];
	destination_slug: string;
	most_booked_position: number | null;
	product_translations: { locale: string; slug: string; name: string; short_name: string | null; highlights: string[]; includes: string[]; excludes: string[]; bring: string[] }[];
	product_pickup_zones: { zone_id: string; fee_per_person: number }[];
};

export const findDestinationBySlug = (slug: string) => destinations.find((destination) => destination.slug === slug);

export const tourPublicPath = (destination: Destination, slug: string) => `${destinationHref(destination)}/${slug}`;

export async function loadTourRow(id: string | undefined): Promise<TourRow | null> {
	if (!id || !tourUuidPattern.test(id)) return null;
	const { data, error } = await supabaseAdmin.from('products').select(tourRowSelect).eq('id', id).maybeSingle();
	if (error) throw error;
	return data as TourRow | null;
}

export function archiveBlockReason(tour: { key: string; status: TourRow['status'] }, activeToursInDestination: number) {
	if (tour.status !== 'active') return null;
	if (isPillarCitedTour(tour.key)) return 'La cita la página de su destino como una de sus excursiones. Quítala de allí antes de archivarla.';
	if (activeToursInDestination <= 1) return 'Es la única a la venta en su destino. Pon otra a la venta antes de archivarla.';
	return null;
}

export async function countFutureBookings(tourId: string, today = santoDomingoToday()) {
	const { count, error } = await supabaseAdmin
		.from('bookings')
		.select('id', { count: 'exact', head: true })
		.eq('product_id', tourId)
		.gte('tour_date', today)
		.in('status', ['confirmed', 'pending_payment']);
	if (error) throw error;
	return count ?? 0;
}

export async function countActiveToursInDestination(destinationSlug: string) {
	const { count, error } = await supabaseAdmin
		.from('products')
		.select('id', { count: 'exact', head: true })
		.eq('destination_slug', destinationSlug)
		.eq('status', 'active');
	if (error) throw error;
	return count ?? 0;
}

export async function hasTourHistory(tourId: string) {
	const counts = await Promise.all(
		(['bookings', 'reviews', 'coupons'] as const).map(async (table) => {
			const { count, error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('product_id', tourId);
			if (error) throw error;
			return count ?? 0;
		}),
	);
	return counts.some((count) => count > 0);
}

const uniqueSorted = (items: string[]) =>
	[...new Set(items.map((item) => item.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'es')).slice(0, suggestionLimit);

const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function updatedAgoLabel(updatedAt: Date, now = new Date()) {
	const minutes = Math.round((updatedAt.getTime() - now.getTime()) / 60000);
	if (Math.abs(minutes) < 1) return 'ahora mismo';
	if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute');
	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
	const days = Math.round(hours / 24);
	if (Math.abs(days) < 30) return relativeTime.format(days, 'day');
	return relativeTime.format(Math.round(days / 30), 'month');
}

async function editorName(userId: string | null, currentUserId: string | null) {
	if (!userId) return null;
	if (userId === currentUserId) return 'ti';
	const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
	const metadata = data.user?.user_metadata ?? {};
	const name = typeof metadata.full_name === 'string' ? metadata.full_name : typeof metadata.name === 'string' ? metadata.name : null;
	return name?.trim() || data.user?.email || null;
}

function googlePreview(details: TourDetails, publicPath: string): TourGooglePreview {
	const title = tourSeoTitle(details);
	const description = tourSeoDescription(details);
	return {
		title,
		titleSuffix: title.startsWith(details.title) ? title.slice(details.title.length) : '',
		description,
		descriptionSuffix: ` Desde ${priceLabel(details)}.`,
		host: new URL(canonicalUrl(publicPath)).host,
	};
}

export async function loadTourEditor(row: TourRow, currentUserId: string | null): Promise<TourEditorData> {
	const destination = findDestinationBySlug(row.destination_slug) ?? destinations[0];
	const details = tourRowToDetails(row, { destinations });
	const editable = tourRowToEditable(row);
	const translation = spanishTranslation(row);
	const publicPath = tourPublicPath(destination, translation.slug);

	const [othersResult, zonesResult, guidesResult, futureBookings, history, updatedBy] = await Promise.all([
		supabaseAdmin
			.from('products')
			.select('id, status, destination_slug, most_booked_position, product_translations(locale, slug, name, short_name, highlights, includes, excludes, bring), product_pickup_zones(zone_id, fee_per_person)')
			.neq('id', row.id),
		supabaseAdmin.from('pickup_zones').select('id, name, position').order('position'),
		supabaseAdmin.from('guides').select('slug').eq('locale', 'es').eq('status', 'published'),
		countFutureBookings(row.id),
		row.published_at === null && row.status === 'draft' ? hasTourHistory(row.id) : Promise.resolve(true),
		editorName(row.updated_by, currentUserId),
	]);
	if (othersResult.error) throw othersResult.error;
	if (zonesResult.error) throw zonesResult.error;
	if (guidesResult.error) throw guidesResult.error;

	const others = (othersResult.data as OtherTourRow[]).flatMap((other) => {
		const otherTranslation = other.product_translations.find((candidate) => candidate.locale === 'es');
		return otherTranslation ? [{ ...other, translation: otherTranslation }] : [];
	});
	const shortNameOf = (other: (typeof others)[number]) => other.translation.short_name?.trim() || other.translation.name;
	const activeInDestination = others.filter((other) => other.destination_slug === row.destination_slug && other.status === 'active').length + (row.status === 'active' ? 1 : 0);
	const zoneOrder = new Map(zonesResult.data.map((zone, index) => [zone.id, index]));

	return {
		row,
		editable,
		details,
		destination,
		photos: editable.images.map((image) => ({ ...image, url: publicMediaUrl(image.path) })),
		slugLocked: row.published_at !== null || row.status === 'active',
		publicPath,
		zones: zonesResult.data.map((zone) => ({ id: zone.id, name: zone.name })),
		feeSources: others
			.filter((other) => other.product_pickup_zones.length > 0)
			.map((other) => ({
				id: other.id,
				name: shortNameOf(other),
				fees: [...other.product_pickup_zones]
					.sort((first, second) => (zoneOrder.get(first.zone_id) ?? 0) - (zoneOrder.get(second.zone_id) ?? 0))
					.map((fee) => ({ zoneId: fee.zone_id, fee: Number(fee.fee_per_person) })),
			}))
			.sort((first, second) => first.name.localeCompare(second.name, 'es')),
		suggestions: {
			highlights: uniqueSorted(others.flatMap((other) => other.translation.highlights)),
			includes: uniqueSorted(others.flatMap((other) => other.translation.includes)),
			excludes: uniqueSorted(others.flatMap((other) => other.translation.excludes)),
			bring: uniqueSorted(others.flatMap((other) => other.translation.bring)),
		},
		takenSlugs: [...new Set([...others.map((other) => other.translation.slug), ...guidesResult.data.map((guide) => guide.slug)])],
		mostBookedHolders: others
			.filter((other) => other.most_booked_position !== null)
			.map((other) => ({ position: other.most_booked_position ?? 0, id: other.id, name: shortNameOf(other) }))
			.sort((first, second) => first.position - second.position),
		futureBookings,
		canRemove: row.status === 'draft' && row.published_at === null && !history,
		archiveBlock: archiveBlockReason(row, activeInDestination),
		autoFaqQuestions: tourFaqs(details)
			.slice(details.faqs.length)
			.map((faq) => faq.question),
		googlePreview: googlePreview(details, publicPath),
		updatedLabel: `Actualizada ${updatedAgoLabel(new Date(row.updated_at))}${updatedBy ? ` por ${updatedBy}` : ''}`,
	};
}
