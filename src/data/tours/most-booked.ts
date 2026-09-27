import { formatPrice } from '../../lib/format';
import { tourHref, type Destination, type DestinationId, type Tour } from './destinations';
import { findTourDetails, scheduleLabel, tourDeparture, tourNotes } from './tours';

export interface MostBookedTour {
	destination: Destination;
	tour: Tour;
	title: string;
	price: number;
	priceUnit: string;
	schedule: string;
	departure: string;
	notes: string[];
}

const picks: { destinationId: DestinationId; tourSlug: string }[] = [
	{ destinationId: 'isla-saona', tourSlug: 'catamaran' },
	{ destinationId: 'isla-saona', tourSlug: 'vip-4-playas' },
	{ destinationId: 'samana', tourSlug: '3-maravillas' },
	{ destinationId: 'aventura', tourSlug: 'buggies-predator' },
];

export const mostBookedTours: MostBookedTour[] = picks.map(({ destinationId, tourSlug }) => {
	const details = findTourDetails(destinationId, tourSlug);
	return {
		destination: details.destination,
		tour: details.tour,
		title: details.title,
		price: details.price,
		priceUnit: details.priceUnit,
		schedule: scheduleLabel(details.days),
		departure: tourDeparture(details),
		notes: tourNotes(details),
	};
});

export const mostBookedHref = (item: MostBookedTour) => tourHref(item.destination, item.tour);

export const mostBookedPriceLabel = (item: MostBookedTour) => `${formatPrice(item.price)} ${item.priceUnit}`;

export const mostBookedSummary = (item: MostBookedTour) =>
	[`${mostBookedPriceLabel(item)}.`, `${item.schedule}, ${item.departure.charAt(0).toLowerCase()}${item.departure.slice(1)}.`, ...item.notes.map((note) => `${note}.`)].join(' ');
