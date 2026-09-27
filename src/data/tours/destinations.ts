import type { ImageMetadata } from 'astro';

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

export const destinations: Destination[] = [
	{
		id: 'isla-saona',
		kind: 'place',
		name: 'Isla Saona',
		slug: 'isla-saona',
		fromPrice: 55,
		details: 'Día completo con embarque en el puerto de Bayahibe.',
		tours: [
			{ name: 'Catamarán', slug: 'catamaran' },
			{ name: 'VIP 4 Playas', slug: 'vip-4-playas' },
			{ name: 'First Class', slug: 'first-class' },
			{ name: 'Privada', slug: 'privada' },
		],
	},
	{
		id: 'samana',
		kind: 'place',
		name: 'Samaná',
		slug: 'samana',
		fromPrice: 99,
		details: 'Cascada El Limón e Isla Bacardí, salidas jueves y sábados.',
		tours: [
			{ name: '3 Maravillas', slug: '3-maravillas' },
			{ name: 'Cayo Levantado y El Limón', slug: 'cayo-levantado-el-limon' },
		],
	},
	{
		id: 'santo-domingo',
		kind: 'place',
		name: 'Santo Domingo',
		slug: 'santo-domingo',
		fromPrice: 69,
		details: 'La Zona Colonial en un día, en versión clásica o VIP.',
		tours: [
			{ name: 'Clásica', slug: 'clasica' },
			{ name: 'VIP', slug: 'vip' },
		],
	},
	{
		id: 'isla-catalina',
		kind: 'place',
		name: 'Isla Catalina',
		slug: 'isla-catalina',
		fromPrice: 65,
		details: 'Snorkel desde US$65 y buceo desde US$120. Embarque en La Romana.',
		tours: [
			{ name: 'Snorkel', slug: 'snorkel' },
			{ name: 'Buceo', slug: 'buceo' },
		],
	},
	{
		id: 'aventura',
		kind: 'activity',
		name: 'Aventura',
		slug: 'aventura-punta-cana',
		fromPrice: 40,
		details: 'Buggies, safari, parasailing, speed boat y Seaquarium.',
		tours: [
			{ name: 'Buggies 4x4', slug: 'buggies' },
			{ name: 'Buggies Predator', slug: 'buggies-predator' },
			{ name: 'Safari', slug: 'safari' },
			{ name: 'Parasailing', slug: 'parasailing' },
			{ name: 'Speed boat', slug: 'speed-boat' },
			{ name: 'Seaquarium', slug: 'seaquarium' },
			{ name: 'Buggies en Bayahibe', slug: 'buggies-bayahibe' },
		],
	},
	{
		id: 'fiesta',
		kind: 'activity',
		name: 'Fiesta',
		slug: 'fiesta-punta-cana',
		fromPrice: 40,
		details: 'Coco Bongo, Imagine Cave y party boat.',
		tours: [
			{ name: 'Coco Bongo', slug: 'coco-bongo' },
			{ name: 'Imagine Cave', slug: 'imagine-cave' },
			{ name: 'Party boat', slug: 'party-boat' },
		],
	},
];

const placeholderImages = import.meta.glob<{ default: ImageMetadata }>(
	'../../assets/images/placeholders/destinations/*.{jpg,jpeg,png,webp}',
	{ eager: true },
);

const placeholderImage = (destination: Destination) =>
	Object.entries(placeholderImages).find(([path]) => path.includes(`/${destination.slug}.`))?.[1].default;

export const destinationImage = (destination: Destination) => destination.image ?? placeholderImage(destination);

const placeholderTourImages = import.meta.glob<{ default: ImageMetadata }>(
	'../../assets/images/placeholders/tours/*/*.{jpg,jpeg,png,webp}',
	{ eager: true },
);

export const tourImage = (destination: Destination, tour: Tour) =>
	Object.entries(placeholderTourImages).find(([path]) => path.includes(`/${destination.slug}/${tour.slug}.`))?.[1].default;

export function findDestination(destinationId: DestinationId) {
	const destination = destinations.find((candidate) => candidate.id === destinationId);
	if (!destination) throw new Error(`Unknown destination: ${destinationId}`);
	return destination;
}

export function findTour(destinationId: DestinationId, tourSlug: string) {
	const destination = findDestination(destinationId);
	const tour = destination.tours.find((candidate) => candidate.slug === tourSlug);
	if (!tour) throw new Error(`Unknown tour: ${destinationId}/${tourSlug}`);
	return { destination, tour };
}

export const destinationHref = (destination: Destination) => `/${destination.slug}`;

export const tourHref = (destination: Destination, tour: Tour) => `${destinationHref(destination)}/${tour.slug}`;

export const lowestFromPrice = Math.min(...destinations.map((destination) => destination.fromPrice));

export const tourCountLabel = (destination: Destination) =>
	`${destination.tours.length} ${destination.tours.length === 1 ? 'excursión' : 'excursiones'}`;
