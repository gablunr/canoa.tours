import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImageMetadata } from 'astro';
import { destinationHref, destinations, tourImage, type Destination } from '../../../data/tours/destinations';
import { formatPrice } from '../../../lib/format';
import { currentBuildStartedAt, hasPendingChanges } from '../../../lib/manage/site-status';
import type { Database, Json } from '../../../lib/supabase/database.types';
import { publicMediaUrl } from '../../../lib/supabase/media';
import { missingForSale, type TourContent, type TourEditable, type TourOperations } from '../../../lib/tours/tour-schema';

type Supabase = SupabaseClient<Database>;

export type TourStatus = Database['public']['Enums']['product_status'];

type TourDuration = Database['public']['Enums']['tour_duration'];

export interface TourListItem {
	id: string;
	status: TourStatus;
	name: string;
	shortName: string;
	slug: string;
	path: string;
	position: number;
	imageUrl: string | null;
	placeholder: ImageMetadata | undefined;
	basePrice: number | null;
	facts: string[];
	mostBookedPosition: number | null;
	pendingOnWeb: boolean;
	missingCount: number;
	searchText: string;
}

export interface TourListGroup {
	destination: Destination;
	href: string;
	fromPriceLabel: string | null;
	tours: TourListItem[];
}

export interface TourCopySource {
	id: string;
	name: string;
}

export interface TourList {
	tours: TourListItem[];
	groups: (status: TourStatus) => TourListGroup[];
	counts: Record<TourStatus, number>;
	activeDestinationCount: number;
	tourSlugs: string[];
	guideSlugs: string[];
	copySources: Record<string, TourCopySource[]>;
}

export interface OrderableTour {
	position: number;
	slug: string;
	name: string;
}

const timeZone = 'America/Santo_Domingo';

const durationLabels: Record<TourDuration, string> = {
	full_day: 'Día completo',
	half_day: 'Medio día',
	night: 'Noche',
};

const weekdayShortNames = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const weekdayList = new Intl.ListFormat('es', { type: 'conjunction' });

const statusOrder: Record<TourStatus, number> = { active: 0, draft: 1, archived: 2 };

const tourColumns =
	'*, product_translations(*), product_images(path, alt, width, height, position), product_prices(passenger_type, amount, min_age, max_age, valid_from, valid_to), product_schedules(start_time, pickup_to, return_at, weekdays, active), product_pickup_zones(zone_id, fee_per_person)';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const normalizeSearchText = (text: string) =>
	text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

export const destinationPathPrefix = (destination: Destination) => `${destinationHref(destination)}/`;

export const findDestinationById = (id: string) => destinations.find((destination) => destination.id === id);

export function weekdaysLabel(weekdays: number[]) {
	const days = [...new Set(weekdays)].filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b);
	if (days.length === 0) return null;
	if (days.length === 7) return 'Todos los días';
	const isRun = days.length >= 3 && days.every((day, index) => index === 0 || day === days[index - 1] + 1);
	if (isRun) return `${capitalize(weekdayShortNames[days[0] - 1])} a ${weekdayShortNames[days[days.length - 1] - 1]}`;
	return capitalize(weekdayList.format(days.map((day) => weekdayShortNames[day - 1])));
}

function durationLabel(category: TourDuration | null, hours: number | null) {
	const hoursLabel = hours ? `${String(hours).replace('.', ',')} h` : null;
	if (category && hoursLabel) return `${durationLabels[category]}, ${hoursLabel}`;
	return category ? durationLabels[category] : hoursLabel;
}

function staticOrderIndex(destination: Destination, slug: string) {
	const index = destination.tours.findIndex((tour) => tour.slug === slug);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortToursForDestination<Tour extends OrderableTour>(destination: Destination, tours: Tour[]): Tour[] {
	return [...tours].sort(
		(a, b) =>
			a.position - b.position ||
			staticOrderIndex(destination, a.slug) - staticOrderIndex(destination, b.slug) ||
			a.name.localeCompare(b.name, 'es'),
	);
}

export function mergeTourOrder(currentIds: string[], reorderedIds: string[]): string[] | null {
	const moving = new Set(reorderedIds);
	if (moving.size !== reorderedIds.length || reorderedIds.some((id) => !currentIds.includes(id))) return null;
	const queue = [...reorderedIds];
	return currentIds.map((id) => (moving.has(id) ? (queue.shift() ?? id) : id));
}

function todayInSantoDomingo(now: Date) {
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

const jsonArray = <Item>(value: Json): Item[] => (Array.isArray(value) ? (value as Item[]) : []);

const clock = (time: string | null | undefined) => (time ? time.slice(0, 5) : null);

async function loadTourRows(supabase: Supabase) {
	const { data, error } = await supabase.from('products').select(tourColumns);
	if (error) throw error;
	return data;
}

type TourRow = Awaited<ReturnType<typeof loadTourRows>>[number];

type TranslationRow = TourRow['product_translations'][number];

type PriceRow = TourRow['product_prices'][number];

function missingForSaleCount(row: TourRow, translation: TranslationRow, prices: { base: PriceRow | undefined; child: PriceRow | undefined }) {
	const schedule = row.product_schedules.find((candidate) => candidate.active);
	const tour: TourEditable = {
		content: {
			name: translation.name,
			shortName: translation.short_name ?? '',
			slug: translation.slug,
			destinationSlug: row.destination_slug,
			summary: translation.summary ?? '',
			ageNote: translation.age_note ?? '',
			imageAlt: translation.image_alt ?? '',
			highlights: translation.highlights,
			includes: translation.includes,
			excludes: translation.excludes,
			bring: translation.bring,
			itinerary: jsonArray<TourContent['itinerary'][number]>(translation.itinerary),
			faqs: jsonArray<TourContent['faqs'][number]>(translation.faqs),
			bestFor: translation.best_for ?? '',
			includesSummary: translation.includes_summary ?? '',
			minAge: row.min_age,
			pregnancy: row.pregnancy,
			pregnancyMaxMonths: row.pregnancy_max_months,
			wheelchair: row.wheelchair,
		},
		operations: {
			pricingMode: row.pricing_mode,
			maxGroupSize: row.max_group_size,
			dailyCapacity: row.daily_capacity,
			infantsOccupySeat: row.infants_occupy_seat,
			depositValue: Number(row.deposit_value),
			priceUnit: translation.price_unit ?? '',
			meetingPoint: translation.meeting_point ?? '',
			durationCategory: row.duration_category,
			durationHours: row.duration_hours === null ? null : Number(row.duration_hours),
			departurePort: row.departure_port as TourOperations['departurePort'],
			schedule: {
				startTime: clock(schedule?.start_time),
				pickupTo: clock(schedule?.pickup_to),
				returnAt: clock(schedule?.return_at),
				weekdays: schedule?.weekdays ?? [],
			},
			prices: {
				base: prices.base ? Number(prices.base.amount) : null,
				child: prices.child ? { amount: Number(prices.child.amount), minAge: prices.child.min_age ?? 0, maxAge: prices.child.max_age ?? 0 } : null,
			},
			pickupFees: row.product_pickup_zones.map((zone) => ({ zoneId: zone.zone_id, fee: Number(zone.fee_per_person) })),
		},
		images: row.product_images.map((image) => ({ path: image.path, alt: image.alt, width: image.width, height: image.height })),
	};
	return missingForSale(tour).required.length;
}

export async function loadTourList(supabase: Supabase, now = new Date()): Promise<TourList> {
	const [rows, guidesResult] = await Promise.all([loadTourRows(supabase), supabase.from('guides').select('slug').eq('locale', 'es').eq('status', 'published')]);
	if (guidesResult.error) throw guidesResult.error;

	const today = todayInSantoDomingo(now);
	const buildStartedAt = currentBuildStartedAt();
	const tourSlugs: string[] = [];
	const toursByDestination = new Map<string, TourListItem[]>();

	for (const row of rows) {
		const translation = row.product_translations.find((candidate) => candidate.locale === 'es');
		if (!translation) continue;
		tourSlugs.push(translation.slug);

		const destination = destinations.find((candidate) => candidate.slug === row.destination_slug);
		if (!destination) continue;

		const cover = [...row.product_images].sort((a, b) => a.position - b.position)[0];
		const baseType = row.pricing_mode === 'per_group' ? 'group' : 'adult';
		const currentPrice = (type: PriceRow['passenger_type']) =>
			row.product_prices.find((price) => price.passenger_type === type && price.valid_from <= today && (price.valid_to === null || price.valid_to >= today));
		const prices = { base: currentPrice(baseType), child: currentPrice('child') };
		const basePrice = prices.base ? Number(prices.base.amount) : null;
		const weekdays = row.product_schedules.filter((schedule) => schedule.active).flatMap((schedule) => schedule.weekdays);
		const shortName = translation.short_name?.trim() || translation.name;

		const facts = [
			basePrice === null ? 'Sin precio' : `${formatPrice(basePrice)} ${row.pricing_mode === 'per_group' ? 'por grupo' : 'por persona'}`,
			weekdaysLabel(weekdays) ?? 'Sin días de salida',
			durationLabel(row.duration_category, row.duration_hours === null ? null : Number(row.duration_hours)),
		].filter((fact): fact is string => Boolean(fact));

		const item: TourListItem = {
			id: row.id,
			status: row.status,
			name: translation.name,
			shortName,
			slug: translation.slug,
			path: `${destinationPathPrefix(destination)}${translation.slug}`,
			position: row.position,
			imageUrl: cover ? publicMediaUrl(cover.path) : null,
			placeholder: cover ? undefined : tourImage(destination, { name: shortName, slug: translation.slug }),
			basePrice,
			facts,
			mostBookedPosition: row.most_booked_position,
			pendingOnWeb: row.status === 'active' && hasPendingChanges(row.updated_at, buildStartedAt),
			missingCount: row.status === 'draft' ? missingForSaleCount(row, translation, prices) : 0,
			searchText: normalizeSearchText(`${translation.name} ${shortName} ${translation.slug} ${destination.name}`),
		};
		toursByDestination.set(destination.id, [...(toursByDestination.get(destination.id) ?? []), item]);
	}

	const orderedByDestination = new Map(
		destinations.map((destination) => [destination.id, sortToursForDestination(destination, toursByDestination.get(destination.id) ?? [])]),
	);
	const tours = destinations.flatMap((destination) => orderedByDestination.get(destination.id) ?? []);

	const counts: Record<TourStatus, number> = { active: 0, draft: 0, archived: 0 };
	tours.forEach((tour) => (counts[tour.status] += 1));

	const groups = (status: TourStatus): TourListGroup[] =>
		destinations
			.map((destination) => {
				const destinationTours = orderedByDestination.get(destination.id) ?? [];
				const prices = destinationTours.filter((tour) => tour.status === 'active' && tour.basePrice !== null).map((tour) => tour.basePrice as number);
				return {
					destination,
					href: destinationHref(destination),
					fromPriceLabel: prices.length > 0 ? `Desde ${formatPrice(Math.min(...prices))}` : null,
					tours: destinationTours.filter((tour) => tour.status === status),
				};
			})
			.filter((group) => group.tours.length > 0);

	const copySources = Object.fromEntries(
		destinations.map((destination) => [
			destination.id,
			[...(orderedByDestination.get(destination.id) ?? [])]
				.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
				.map((tour) => ({ id: tour.id, name: tour.shortName })),
		]),
	);

	return {
		tours,
		groups,
		counts,
		activeDestinationCount: destinations.filter((destination) => (orderedByDestination.get(destination.id) ?? []).some((tour) => tour.status === 'active')).length,
		tourSlugs,
		guideSlugs: guidesResult.data.map((guide) => guide.slug),
		copySources,
	};
}
