import type { ImageMetadata } from 'astro';
import { formatPrice } from '../../lib/format';
import { scheduleLabel, weekdaysFromIso } from './schedule-text';

export type DestinationId = 'isla-saona' | 'samana' | 'santo-domingo' | 'isla-catalina' | 'aventura' | 'fiesta';

export type DestinationKind = 'place' | 'activity';

export interface DestinationTourFacts {
	name: string;
	basePrice: number | null;
	isoWeekdays: readonly number[];
}

export interface DestinationDefinition {
	id: DestinationId;
	kind: DestinationKind;
	name: string;
	slug: string;
	image?: ImageMetadata;
	details: string | ((tours: DestinationTourFacts[]) => string);
}

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

export const destinationDefinitions: readonly DestinationDefinition[] = [
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
