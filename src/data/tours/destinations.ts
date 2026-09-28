import type { ImageMetadata } from 'astro';
import { publishedTourRows } from '../../lib/tours/published-tours';
import { activeSchedule, resolveTourPrices, spanishTranslation, type TourRow } from '../../lib/tours/tour-rows';
import { destinationDefinitions, type DestinationDefinition, type DestinationId, type DestinationTourFacts } from './destination-definitions';

export type { DestinationId, DestinationKind } from './destination-definitions';

export interface Tour {
	name: string;
	slug: string;
}

export interface Destination extends Omit<DestinationDefinition, 'details'> {
	fromPrice: number;
	details: string;
	tours: Tour[];
}

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
