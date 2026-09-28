import { formatPrice } from '../../lib/format';
import type { SiteImage } from '../../lib/images';
import { publishedTourRows } from '../../lib/tours/published-tours';
import { tourHref, type Destination, type Tour } from './destinations';
import { scheduleLabel, tourDeparture, tourDetails, tourNotes, tourPhoto, tourPhotoAlt, type TourDetails } from './tours';

export interface MostBookedTour {
	destination: Destination;
	tour: Tour;
	productKey: string;
	title: string;
	price: number;
	priceUnit: string;
	schedule: string;
	departure: string;
	notes: string[];
	photo?: SiteImage;
	photoAlt: string;
}

export const mostBookedLimit = 4;

export function tourCardSummary(details: TourDetails): MostBookedTour {
	const photo = tourPhoto(details);
	return {
		destination: details.destination,
		tour: details.tour,
		productKey: details.productKey,
		title: details.title,
		price: details.price,
		priceUnit: details.priceUnit,
		schedule: scheduleLabel(details.days),
		departure: tourDeparture(details),
		notes: tourNotes(details),
		photoAlt: tourPhotoAlt(details),
		...(photo ? { photo } : {}),
	};
}

const mostBookedPositions = new Map(
	publishedTourRows.flatMap((row) => (row.most_booked_position === null ? [] : [[row.key, row.most_booked_position] as const])),
);

export const mostBookedTours: MostBookedTour[] = tourDetails
	.flatMap((details) => {
		const position = mostBookedPositions.get(details.productKey);
		return position === undefined ? [] : [{ position, details }];
	})
	.sort((first, second) => first.position - second.position)
	.slice(0, mostBookedLimit)
	.map(({ details }) => tourCardSummary(details));

export const mostBookedHref = (item: MostBookedTour) => tourHref(item.destination, item.tour);

export const mostBookedPriceLabel = (item: MostBookedTour) => `${formatPrice(item.price)} ${item.priceUnit}`;

export const mostBookedSummary = (item: MostBookedTour) =>
	[`${mostBookedPriceLabel(item)}.`, `${item.schedule}, ${item.departure.charAt(0).toLowerCase()}${item.departure.slice(1)}.`, ...item.notes.map((note) => `${note}.`)].join(' ');
