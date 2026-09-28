import type { ImageMetadata } from 'astro';
import { formatPrice } from '../../lib/format';
import { publishedTourRows } from '../../lib/tours/published-tours';
import { activeSchedule, resolveTourPrices, spanishTranslation, type TourRow } from '../../lib/tours/tour-rows';
import { scheduleLabel, weekdaysFromIso } from './schedule-text';

export type DestinationId = 'isla-saona' | 'samana' | 'santo-domingo' | 'isla-catalina' | 'aventura' | 'fiesta';

export interface Tour {
	name: string;
	slug: string;
}

export type DestinationKind = 'place' | 'activity';

export interface Destination {
	id: DestinationId;
	kind: DestinationKind;
	name: string;
	slug: string;
	fromPrice: number;
	details: string;
	image?: ImageMetadata;
	tours: Tour[];
}

interface DestinationTourFacts {
	name: string;
	basePrice: number | null;
	isoWeekdays: readonly number[];
}

type DestinationDefinition = Omit<Destination, 'fromPrice' | 'tours' | 'details'> & {
	details: string | ((tours: DestinationTourFacts[]) => string);
};

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function departureDaysText(tours: DestinationTourFacts[]) {
	const days = weekdaysFromIso(tours.flatMap((tour) => tour.isoWeekdays));
	return days.length > 0 ? lowerFirst(scheduleLabel(days)) : undefined;
}

function pricesFromText(tours: DestinationTourFacts[]) {
	const prices = tours.flatMap((tour) => (tour.basePrice === null ? [] : [`${lowerFirst(tour.name)} desde ${formatPrice(tour.basePrice)}`]));
	return prices.length > 0 ? upperFirst(listFormat.format(prices)) : undefined;
}

const destinationDefinitions: DestinationDefinition[] = [
	{
		id: 'isla-saona',
		kind: 'place',
		name: 'Isla Saona',
		slug: 'isla-saona',
		details: 'Día completo con embarque en el puerto de Bayahibe.',
	},
	{
		id: 'samana',
		kind: 'place',
		name: 'Samaná',
		slug: 'samana',
		details: (tours) => {
			const days = departureDaysText(tours);
			return days ? `Cascada El Limón e Isla Bacardí, salidas ${days}.` : 'Cascada El Limón e Isla Bacardí.';
		},
	},
	{
		id: 'santo-domingo',
		kind: 'place',
		name: 'Santo Domingo',
		slug: 'santo-domingo',
		details: 'La Zona Colonial en un día, en versión clásica o VIP.',
	},
	{
		id: 'isla-catalina',
		kind: 'place',
		name: 'Isla Catalina',
		slug: 'isla-catalina',
		details: (tours) => {
			const prices = pricesFromText(tours);
			return prices ? `${prices}. Embarque en La Romana.` : 'Embarque en La Romana.';
		},
	},
	{
		id: 'aventura',
		kind: 'activity',
		name: 'Aventura',
		slug: 'aventura-punta-cana',
		details: 'Buggies, safari, parasailing, speed boat y Seaquarium.',
	},
	{
		id: 'fiesta',
		kind: 'activity',
		name: 'Fiesta',
		slug: 'fiesta-punta-cana',
		details: 'Coco Bongo, Imagine Cave y party boat.',
	},
];

const tourRowsOf = (definition: DestinationDefinition) => publishedTourRows.filter((row) => row.destination_slug === definition.slug);

function tourFromRow(row: TourRow): Tour {
	const translation = spanishTranslation(row);
	return { name: translation.short_name?.trim() || translation.name, slug: translation.slug };
}

const tourFacts = (row: TourRow): DestinationTourFacts => ({
	name: tourFromRow(row).name,
	basePrice: resolveTourPrices(row.prices, row.pricing_mode).base,
	isoWeekdays: activeSchedule(row)?.weekdays ?? [],
});

function lowestPrice(rows: TourRow[]) {
	const basePrices = rows.flatMap((row) => {
		const { base } = resolveTourPrices(row.prices, row.pricing_mode);
		return base === null ? [] : [{ perPerson: row.pricing_mode === 'per_person', base }];
	});
	const personPrices = basePrices.filter((price) => price.perPerson);
	const candidates = personPrices.length > 0 ? personPrices : basePrices;
	return candidates.length > 0 ? Math.min(...candidates.map((price) => price.base)) : 0;
}

export const destinations: Destination[] = destinationDefinitions.map((definition) => {
	const rows = tourRowsOf(definition);
	const details = typeof definition.details === 'string' ? definition.details : definition.details(rows.map(tourFacts));
	return { ...definition, details, fromPrice: lowestPrice(rows), tours: rows.map(tourFromRow) };
});

const placeholderImages = import.meta.glob<{ default: ImageMetadata }>(
	'../../assets/images/placeholders/destinations/*.{jpg,jpeg,png,webp}',
	{ eager: true },
);

const placeholderImage = (destination: Destination) =>
	Object.entries(placeholderImages).find(([path]) => path.includes(`/${destination.slug}.`))?.[1].default;

export const destinationImage = (destination: Destination) => destination.image ?? placeholderImage(destination);

export function findDestination(destinationId: DestinationId) {
	const destination = destinations.find((candidate) => candidate.id === destinationId);
	if (!destination) throw new Error(`Unknown destination: ${destinationId}`);
	return destination;
}

export const destinationHref = (destination: Destination) => `/${destination.slug}`;

export const tourHref = (destination: Destination, tour: Tour) => `${destinationHref(destination)}/${tour.slug}`;

const pricedDestinations = destinations.filter((destination) => destination.tours.length > 0);

export const lowestFromPrice = pricedDestinations.length > 0 ? Math.min(...pricedDestinations.map((destination) => destination.fromPrice)) : 0;

export const tourCountLabel = (destination: Destination) =>
	`${destination.tours.length} ${destination.tours.length === 1 ? 'excursión' : 'excursiones'}`;
