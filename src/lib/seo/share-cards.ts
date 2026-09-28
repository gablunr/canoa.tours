import { getCollection, type CollectionEntry } from 'astro:content';
import palmBeach from '../../assets/images/home/caribbean-palm-beach.jpg';
import pierBeach from '../../assets/images/home/turquoise-pier-beach.jpg';
import { featuredGuide, guideCountLabel, guideHref, guideReadingTime, guides } from '../../data/guides/guides';
import { documentHref } from '../../data/pages/documents';
import { pillarPage } from '../../data/pillars/pillar-page';
import { aboutLink, guidesLink, reviewsLink } from '../../data/site/navigation';
import { routes } from '../../data/site/routes';
import { catalogTitle } from '../../data/tours/catalog';
import { destinationImage, destinations, lowestFromPrice, tourCountLabel } from '../../data/tours/destinations';
import { durationLabel, pickupIncluded, tourCountText, tourDetails, tourDetailsHref, tourPhoto } from '../../data/tours/tours';
import { formatPrice } from '../format';
import type { SiteImage } from '../images';
import { absoluteUrl, type SocialImage } from './seo';

export interface ShareCard {
	path: string;
	eyebrow: string;
	title: string;
	photo: SiteImage;
	facts: string[];
}

export const shareCardWidth = 1200;

export const shareCardHeight = 630;

const fromPriceFact = (amount: number) => `Desde ${formatPrice(amount)}`;

const siteCards = (): ShareCard[] => [
	{
		path: '/',
		eyebrow: 'República Dominicana',
		title: 'Excursiones en Punta Cana con recogida en tu hotel',
		photo: palmBeach,
		facts: [fromPriceFact(lowestFromPrice), tourCountText(tourDetails.length)],
	},
	{
		path: routes.catalog,
		eyebrow: tourCountText(tourDetails.length),
		title: catalogTitle,
		photo: pierBeach,
		facts: [fromPriceFact(lowestFromPrice)],
	},
	{
		path: routes.guides,
		eyebrow: guidesLink.label,
		title: 'Lo que conviene saber antes de reservar en Punta Cana',
		photo: featuredGuide?.image ?? palmBeach,
		facts: [guideCountLabel(guides.length)],
	},
	{
		path: routes.reviews,
		eyebrow: reviewsLink.label,
		title: 'Lo que cuentan los clientes de nuestras excursiones',
		photo: pierBeach,
		facts: [],
	},
	{
		path: routes.about,
		eyebrow: aboutLink.label,
		title: 'Agencia de excursiones en Punta Cana',
		photo: palmBeach,
		facts: [],
	},
];

const destinationCards = (): ShareCard[] =>
	destinations.flatMap((destination) => {
		const photo = destinationImage(destination);
		if (!photo || destination.tours.length === 0) return [];
		const page = pillarPage(destination);
		return [
			{
				path: page.href,
				eyebrow: tourCountLabel(destination),
				title: page.heading,
				photo,
				facts: [fromPriceFact(destination.fromPrice)],
			},
		];
	});

const tourCards = (): ShareCard[] =>
	tourDetails.flatMap((details) => {
		const photo = tourPhoto(details);
		if (!photo) return [];
		return [
			{
				path: tourDetailsHref(details),
				eyebrow: details.destination.name,
				title: details.title,
				photo,
				facts: [fromPriceFact(details.price), durationLabel(details), ...(pickupIncluded(details) ? ['Recogida incluida'] : [])],
			},
		];
	});

const guideCards = (): ShareCard[] =>
	guides.map((guide) => ({
		path: guideHref(guide),
		eyebrow: guidesLink.label,
		title: guide.title,
		photo: guide.image,
		facts: [guideReadingTime(guide)],
	}));

const documentCard = (entry: CollectionEntry<'help' | 'legal'>, eyebrow: string): ShareCard => ({
	path: documentHref(entry),
	eyebrow,
	title: entry.data.title,
	photo: palmBeach,
	facts: [],
});

async function documentCards(): Promise<ShareCard[]> {
	const [helpEntries, legalEntries] = await Promise.all([getCollection('help'), getCollection('legal')]);
	return [...helpEntries.map((entry) => documentCard(entry, 'Ayuda')), ...legalEntries.map((entry) => documentCard(entry, 'Legal'))];
}

let allShareCards: Promise<ShareCard[]> | undefined;

export const shareCards = () =>
	(allShareCards ??= documentCards().then((documents) => [...siteCards(), ...destinationCards(), ...tourCards(), ...guideCards(), ...documents]));

export const findShareCard = async (pathname: string) => (await shareCards()).find((card) => card.path === pathname);

export const shareCardFile = (card: ShareCard) => `${card.path === '/' ? 'index' : card.path.slice(1)}.jpg`;

export const shareCardImage = (card: ShareCard): SocialImage => ({
	url: absoluteUrl(`/og/${shareCardFile(card)}`),
	width: shareCardWidth,
	height: shareCardHeight,
	alt: card.title,
});
