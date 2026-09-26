import { findTour, formatPrice, tourHref, type Destination, type DestinationId, type Tour } from './destinations';

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

interface MostBookedEntry extends Omit<MostBookedTour, 'destination' | 'tour'> {
	destinationId: DestinationId;
	tourSlug: string;
}

const entries: MostBookedEntry[] = [
	{
		destinationId: 'isla-saona',
		tourSlug: 'catamaran',
		title: 'Isla Saona en catamarán',
		price: 55,
		priceUnit: 'por adulto',
		schedule: 'Todos los días',
		departure: 'Embarque en Bayahibe',
		notes: ['Apta para embarazadas'],
	},
	{
		destinationId: 'isla-saona',
		tourSlug: 'vip-4-playas',
		title: 'Isla Saona VIP 4 Playas',
		price: 79,
		priceUnit: 'por persona',
		schedule: 'De domingo a jueves',
		departure: 'Embarque en Bayahibe',
		notes: ['Embarazadas hasta 6 meses', 'Accesible en silla de ruedas'],
	},
	{
		destinationId: 'samana',
		tourSlug: '3-maravillas',
		title: 'Samaná 3 Maravillas',
		price: 119,
		priceUnit: 'por adulto',
		schedule: 'Jueves y sábados',
		departure: 'Embarque en Miches',
		notes: ['Accesible en silla de ruedas'],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'buggies-predator',
		title: 'Buggies Predator',
		price: 45,
		priceUnit: 'por persona en buggy doble',
		schedule: 'De lunes a sábado',
		departure: 'Recogida en tu hotel',
		notes: [],
	},
];

export const mostBookedTours: MostBookedTour[] = entries.map(({ destinationId, tourSlug, ...details }) => ({
	...findTour(destinationId, tourSlug),
	...details,
}));

export const mostBookedHref = (item: MostBookedTour) => tourHref(item.destination, item.tour);

export const mostBookedPriceLabel = (item: MostBookedTour) => `${formatPrice(item.price)} ${item.priceUnit}`;

export const mostBookedSummary = (item: MostBookedTour) =>
	[`${mostBookedPriceLabel(item)}.`, `${item.schedule}, ${item.departure.charAt(0).toLowerCase()}${item.departure.slice(1)}.`, ...item.notes.map((note) => `${note}.`)].join(' ');
