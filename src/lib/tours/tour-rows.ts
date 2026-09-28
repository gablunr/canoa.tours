import { departurePorts } from '../../data/tours/departure-ports';
import type { Destination } from '../../data/tours/destinations';
import type {
	ChildPrice,
	DeparturePortKey,
	DurationCategory,
	ItineraryStep,
	PickupFees,
	PregnancyPolicy,
	PricePer,
	TourDetails,
	Weekday,
} from '../../data/tours/tours';
import type { QuestionAndAnswer } from '../seo/structured-data';
import type { Json } from '../supabase/database.types';
import { storedMediaImage } from '../supabase/media';
import type { Tables } from '../supabase/types';
import type { PregnancyPolicyValue, PricingMode, TourDuration, TourEditable } from './tour-schema';

export const tourRowSelect =
	'id, key, status, destination_slug, position, pricing_mode, max_group_size, min_age, daily_capacity, infants_occupy_seat, deposit_value, duration_category, duration_hours, departure_port, pregnancy, pregnancy_max_months, wheelchair, most_booked_position, published_at, updated_at, updated_by, translations:product_translations(locale, slug, name, short_name, summary, price_unit, meeting_point, age_note, image_alt, highlights, includes, excludes, bring, itinerary, faqs, best_for, includes_summary), images:product_images(id, path, alt, width, height, position), prices:product_prices(passenger_type, amount, min_age, max_age, valid_from, valid_to), schedules:product_schedules(start_time, pickup_to, return_at, weekdays, active), pickup_fees:product_pickup_zones(fee_per_person, zone:pickup_zones(id, slug, name, position))';

type ProductRow = Tables<'products'>;

export type TourTranslationRow = Pick<
	Tables<'product_translations'>,
	| 'locale'
	| 'slug'
	| 'name'
	| 'short_name'
	| 'summary'
	| 'price_unit'
	| 'meeting_point'
	| 'age_note'
	| 'image_alt'
	| 'highlights'
	| 'includes'
	| 'excludes'
	| 'bring'
	| 'itinerary'
	| 'faqs'
	| 'best_for'
	| 'includes_summary'
>;

export type TourImageRow = Pick<Tables<'product_images'>, 'id' | 'path' | 'alt' | 'width' | 'height' | 'position'>;

export type TourPriceRow = Pick<Tables<'product_prices'>, 'passenger_type' | 'amount' | 'min_age' | 'max_age' | 'valid_from' | 'valid_to'>;

export type TourScheduleRow = Pick<Tables<'product_schedules'>, 'start_time' | 'pickup_to' | 'return_at' | 'weekdays' | 'active'>;

export type TourPickupFeeRow = Pick<Tables<'product_pickup_zones'>, 'fee_per_person'> & {
	zone: Pick<Tables<'pickup_zones'>, 'id' | 'slug' | 'name' | 'position'>;
};

export type TourRow = Pick<
	ProductRow,
	| 'id'
	| 'key'
	| 'status'
	| 'destination_slug'
	| 'position'
	| 'pricing_mode'
	| 'max_group_size'
	| 'min_age'
	| 'daily_capacity'
	| 'infants_occupy_seat'
	| 'deposit_value'
	| 'duration_category'
	| 'duration_hours'
	| 'departure_port'
	| 'pregnancy'
	| 'pregnancy_max_months'
	| 'wheelchair'
	| 'most_booked_position'
	| 'published_at'
	| 'updated_at'
	| 'updated_by'
> & {
	translations: TourTranslationRow[];
	images: TourImageRow[];
	prices: TourPriceRow[];
	schedules: TourScheduleRow[];
	pickup_fees: TourPickupFeeRow[];
};

export interface TourRowContext {
	destinations: readonly Destination[];
	today?: string;
}

export interface ResolvedTourPrices {
	base: number | null;
	child: { amount: number; minAge: number; maxAge: number } | null;
}

const isoWeekdayNames: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const durationCategories: Record<TourDuration, DurationCategory> = { full_day: 'full-day', half_day: 'half-day', night: 'night' };

const pregnancyPolicies: Record<PregnancyPolicyValue, PregnancyPolicy> = { allowed: 'allowed', limited: 'limited', not_allowed: 'not-allowed' };

const pricesPer: Record<PricingMode, PricePer> = { per_person: 'person', per_group: 'group' };

const localDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit' });

export const santoDomingoToday = (now: Date = new Date()) => localDateFormat.format(now);

export const clockFromDatabase = (time: string | null | undefined) => (time ? time.slice(0, 5) : null);

const toNumber = (value: number | string | null | undefined) => (value === null || value === undefined ? null : Number(value));

export const spanishTranslation = (row: Pick<TourRow, 'key' | 'translations'>) => {
	const translation = row.translations.find((candidate) => candidate.locale === 'es');
	if (!translation) throw new Error(`Falta la traducción en español de ${row.key}`);
	return translation;
};

export const activeSchedule = (row: Pick<TourRow, 'schedules'>) =>
	row.schedules.filter((schedule) => schedule.active).sort((first, second) => first.start_time.localeCompare(second.start_time))[0] ?? null;

export const sortedImages = (row: Pick<TourRow, 'images'>) => [...row.images].sort((first, second) => first.position - second.position);

export const sortedPickupFees = (row: Pick<TourRow, 'pickup_fees'>) =>
	[...row.pickup_fees].sort((first, second) => first.zone.position - second.zone.position);

const isValidOn = (price: TourPriceRow, today: string) => price.valid_from <= today && (price.valid_to === null || price.valid_to >= today);

export function resolveTourPrices(prices: TourPriceRow[], pricingMode: PricingMode, today: string = santoDomingoToday()): ResolvedTourPrices {
	const current = prices.filter((price) => isValidOn(price, today));
	const baseType = pricingMode === 'per_group' ? 'group' : 'adult';
	const base = current.find((price) => price.passenger_type === baseType);
	const child = pricingMode === 'per_person' ? current.find((price) => price.passenger_type === 'child') : undefined;
	return {
		base: base ? Number(base.amount) : null,
		child: child ? { amount: Number(child.amount), minAge: child.min_age ?? 0, maxAge: child.max_age ?? 0 } : null,
	};
}

const isRecord = (value: Json): value is { [key: string]: Json | undefined } => typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: Json | undefined) => (typeof value === 'string' ? value : '');

export function parseItinerary(value: Json): ItineraryStep[] {
	if (!Array.isArray(value)) return [];
	return value.filter(isRecord).map((step) => {
		const time = textOf(step.time);
		return time ? { time, title: textOf(step.title), text: textOf(step.text) } : { title: textOf(step.title), text: textOf(step.text) };
	});
}

export function parseFaqs(value: Json): QuestionAndAnswer[] {
	if (!Array.isArray(value)) return [];
	return value.filter(isRecord).map((faq) => ({ question: textOf(faq.question), answer: textOf(faq.answer) }));
}

const isDeparturePort = (key: string | null): key is DeparturePortKey => key !== null && key in departurePorts;

const weekdaysFromIso = (isoDays: number[]) =>
	[...new Set(isoDays)]
		.filter((day) => day >= 1 && day <= 7)
		.sort((first, second) => first - second)
		.map((day) => isoWeekdayNames[day - 1]);

function destinationFor(row: TourRow, destinations: readonly Destination[]) {
	const destination = destinations.find((candidate) => candidate.slug === row.destination_slug);
	if (!destination) throw new Error(`Destino desconocido ${row.destination_slug} en ${row.key}`);
	return destination;
}

export function tourRowToDetails(row: TourRow, context: TourRowContext): TourDetails {
	const translation = spanishTranslation(row);
	const destination = destinationFor(row, context.destinations);
	const shortName = translation.short_name?.trim() || translation.name;
	const tour = destination.tours.find((candidate) => candidate.slug === translation.slug) ?? { name: shortName, slug: translation.slug };
	const prices = resolveTourPrices(row.prices, row.pricing_mode, context.today ?? santoDomingoToday());
	const schedule = activeSchedule(row);
	const startTime = clockFromDatabase(schedule?.start_time) ?? '';
	const childPrice: ChildPrice | undefined = prices.child
		? { amount: prices.child.amount, fromAge: prices.child.minAge, toAge: prices.child.maxAge }
		: undefined;
	const port = isDeparturePort(row.departure_port) ? row.departure_port : undefined;

	return {
		destination,
		tour,
		productKey: row.key,
		title: translation.name,
		shortName,
		summary: translation.summary ?? '',
		imageAlt: translation.image_alt ?? '',
		images: sortedImages(row).map((image) => ({ image: storedMediaImage(image.path, image.width, image.height), alt: image.alt })),
		highlights: translation.highlights,
		price: prices.base ?? 0,
		priceUnit: translation.price_unit ?? '',
		pricePer: pricesPer[row.pricing_mode],
		...(childPrice ? { childPrice } : {}),
		deposit: Number(row.deposit_value),
		durationCategory: row.duration_category ? durationCategories[row.duration_category] : 'full-day',
		durationHours: toNumber(row.duration_hours) ?? 0,
		days: weekdaysFromIso(schedule?.weekdays ?? []),
		pickupFrom: startTime,
		pickupTo: clockFromDatabase(schedule?.pickup_to) ?? startTime,
		returnAt: clockFromDatabase(schedule?.return_at) ?? '',
		...(port ? { port } : {}),
		meetingPoint: translation.meeting_point ?? '',
		pickupFees: Object.fromEntries(sortedPickupFees(row).map((fee) => [fee.zone.slug, Number(fee.fee_per_person)])) as PickupFees,
		includes: translation.includes,
		excludes: translation.excludes,
		itinerary: parseItinerary(translation.itinerary),
		bring: translation.bring,
		...(row.min_age !== null ? { minAge: row.min_age } : {}),
		...(translation.age_note ? { ageNote: translation.age_note } : {}),
		pregnancy: row.pregnancy ? pregnancyPolicies[row.pregnancy] : 'not-allowed',
		...(row.pregnancy === 'limited' && row.pregnancy_max_months !== null ? { pregnancyMaxMonths: row.pregnancy_max_months } : {}),
		wheelchair: row.wheelchair,
		faqs: parseFaqs(translation.faqs),
		bestFor: translation.best_for ?? '',
		includesSummary: translation.includes_summary ?? '',
		updatedAt: new Date(row.updated_at),
	};
}

export function tourRowToEditable(row: TourRow, today: string = santoDomingoToday()): TourEditable {
	const translation = spanishTranslation(row);
	const schedule = activeSchedule(row);
	const prices = resolveTourPrices(row.prices, row.pricing_mode, today);

	return {
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
			itinerary: parseItinerary(translation.itinerary),
			faqs: parseFaqs(translation.faqs),
			bestFor: translation.best_for ?? '',
			includesSummary: translation.includes_summary ?? '',
			minAge: row.min_age,
			pregnancy: row.pregnancy,
			pregnancyMaxMonths: row.pregnancy === 'limited' ? row.pregnancy_max_months : null,
			wheelchair: row.wheelchair,
		},
		operations: {
			pricingMode: row.pricing_mode,
			maxGroupSize: row.pricing_mode === 'per_group' ? row.max_group_size : null,
			dailyCapacity: row.daily_capacity,
			infantsOccupySeat: row.infants_occupy_seat,
			depositValue: toNumber(row.deposit_value),
			priceUnit: translation.price_unit ?? '',
			meetingPoint: translation.meeting_point ?? '',
			durationCategory: row.duration_category,
			durationHours: toNumber(row.duration_hours),
			departurePort: isDeparturePort(row.departure_port) ? row.departure_port : null,
			schedule: {
				startTime: clockFromDatabase(schedule?.start_time),
				pickupTo: clockFromDatabase(schedule?.pickup_to),
				returnAt: clockFromDatabase(schedule?.return_at),
				weekdays: [...new Set(schedule?.weekdays ?? [])].sort((first, second) => first - second),
			},
			prices,
			pickupFees: sortedPickupFees(row).map((fee) => ({ zoneId: fee.zone.id, fee: Number(fee.fee_per_person) })),
		},
		images: sortedImages(row).map((image) => ({ path: image.path, alt: image.alt, width: image.width, height: image.height })),
	};
}
