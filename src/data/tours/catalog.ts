import { formatPrice } from '../../lib/format';
import type { Faq } from '../booking/faq';
import { pickupZonesLink } from '../site/navigation';
import { destinations, lowestFromPrice, type Destination } from './destinations';
import {
	destinationTourDetails,
	pickupIncluded,
	priceLabel,
	scheduleLabel,
	tourCountText,
	tourDetails,
	toursByDuration,
	weekdays,
	type DurationCategory,
	type TourDetails,
} from './tours';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const titles = (items: TourDetails[]) => listFormat.format(items.map((details) => details.title));

const destinationNames = (items: Destination[]) =>
	listFormat.format(items.map((destination) => (destination.kind === 'place' ? destination.name : destination.name.toLowerCase())));

const separatePickupDestinations = destinations.filter((destination) => destinationTourDetails(destination).every((details) => !pickupIncluded(details)));

const includedPickupDestinations = destinations.filter((destination) => destinationTourDetails(destination).every(pickupIncluded));

export const catalogTitle = 'Excursiones en Punta Cana';

export const catalogSeoTitle = 'Excursiones en Punta Cana: precios y días de salida';

const pickupIncludedCount = tourDetails.filter(pickupIncluded).length;

export const catalogIntro = `De Isla Saona a Coco Bongo, las ${tourCountText(tourDetails.length)} que hacemos desde Punta Cana. Desde ${formatPrice(lowestFromPrice)} por persona, ${pickupIncludedCount > tourDetails.length / 2 ? 'la mayoría' : 'algunas'} con recogida en el hotel.`;

export const catalogDescription = `${tourCountText(tourDetails.length)} desde Punta Cana a Isla Saona, Samaná, Santo Domingo y más, desde ${formatPrice(lowestFromPrice)}. Compara precios, duración y días de salida.`;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const sharedDurationSentences: Record<DurationCategory, string> = {
	'full-day': 'Todas duran el día entero.',
	'half-day': 'Todas duran medio día.',
	night: 'Todas son de noche.',
};

function departureDaysSentence(tours: TourDetails[]) {
	const days = weekdays.filter((day) => tours.some((details) => details.days.includes(day)));
	return days.length > 0 ? `Salen ${lowerFirst(scheduleLabel(days))}.` : '';
}

function sharedDurationSentence(tours: TourDetails[]) {
	const [first] = tours;
	return first && tours.every((details) => details.durationCategory === first.durationCategory) ? sharedDurationSentences[first.durationCategory] : '';
}

const withSentence = (text: string, sentence: string) => (sentence ? `${text} ${sentence}` : text);

type GroupIntro = string | ((tours: TourDetails[]) => string);

const groupIntros: Partial<Record<string, GroupIntro>> = {
	'isla-saona': 'Día entero saliendo de Bayahibe, en catamarán, lancha VIP o lancha privada.',
	samana: (tours) => withSentence('Cascada El Limón y Cayo Levantado en un día.', departureDaysSentence(tours)),
	'santo-domingo': 'La Zona Colonial y Los Tres Ojos, a dos horas y media por autopista.',
	'isla-catalina': 'Snorkel o buceo en el arrecife, saliendo de La Romana.',
	'aventura-punta-cana': (tours) => withSentence('Buggies, safari, parasailing o speed boat.', sharedDurationSentence(tours)),
	'fiesta-punta-cana': 'Coco Bongo, el Imagine (una discoteca dentro de una cueva) y el party boat.',
};

function groupIntro(destination: Destination, tours: TourDetails[]) {
	const intro = groupIntros[destination.slug];
	if (intro === undefined) return destination.details;
	return typeof intro === 'string' ? intro : intro(tours);
}

export interface CatalogGroup {
	destination: Destination;
	anchor: string;
	intro: string;
	tours: TourDetails[];
}

export const catalogGroups: CatalogGroup[] = destinations.map((destination) => {
	const tours = destinationTourDetails(destination);
	return { destination, anchor: destination.slug, intro: groupIntro(destination, tours), tours };
});

const personTours = tourDetails.filter((details) => details.pricePer === 'person');

const lowestPersonPrice = personTours.length > 0 ? Math.min(...personTours.map((details) => details.price)) : 0;

const cheapestTours = personTours.filter((details) => details.price === lowestPersonPrice);

const cheapestFullDay = toursByDuration['full-day']
	.filter((details) => details.pricePer === 'person')
	.reduce<TourDetails | undefined>((cheapest, details) => (cheapest === undefined || details.price < cheapest.price ? details : cheapest), undefined);

const cheapestFullDaySentence = cheapestFullDay ? ` El día completo más barato es ${cheapestFullDay.title}, desde ${priceLabel(cheapestFullDay)}.` : '';

const pregnancyAllowed = tourDetails.filter((details) => details.pregnancy === 'allowed');

const pregnancyLimitedMonths = [...new Set(tourDetails.flatMap((details) => (details.pregnancy === 'limited' && details.pregnancyMaxMonths ? [details.pregnancyMaxMonths] : [])))];

const pregnancyLimitedSentences = pregnancyLimitedMonths.map(
	(months) =>
		`Hasta los ${months} meses de embarazo se admiten en ${titles(tourDetails.filter((details) => details.pregnancy === 'limited' && details.pregnancyMaxMonths === months))}.`,
);

const dailyTours = tourDetails.filter((details) => new Set(details.days).size === weekdays.length);

export const catalogFaqs: Faq[] = [
	{
		question: '¿Cuál es la excursión más barata en Punta Cana?',
		answer: `Las más baratas cuestan ${formatPrice(lowestPersonPrice)} por persona: ${titles(cheapestTours)}.${cheapestFullDaySentence}`,
	},
	{
		question: '¿Qué excursiones son de medio día?',
		answer: `Son de medio día ${titles(toursByDuration['half-day'])}. De noche salen ${titles(toursByDuration.night)}.`,
	},
	{
		question: '¿Qué excursiones incluyen la recogida en el hotel?',
		answer: `Las de ${destinationNames(includedPickupDestinations)} incluyen la recogida si te alojas en Bávaro o Arena Gorda; desde otras zonas puede costar algo más. En ${destinationNames(separatePickupDestinations)} el transporte hasta el puerto se paga aparte. En la comparativa de esta página eliges tu zona y ves el precio de la recogida en cada excursión.`,
		link: pickupZonesLink,
	},
	{
		question: '¿Qué excursiones pueden hacer embarazadas?',
		answer: [`Son aptas para embarazadas ${titles(pregnancyAllowed)}.`, ...pregnancyLimitedSentences, 'Las demás no las admiten.'].join(' '),
	},
	{
		question: '¿Qué excursiones son accesibles en silla de ruedas?',
		answer: `Se pueden hacer en silla de ruedas ${titles(tourDetails.filter((details) => details.wheelchair))}. Las demás no están adaptadas.`,
	},
	{
		question: '¿Qué excursiones salen todos los días?',
		answer: `Salen todos los días ${titles(dailyTours)}. Las demás tienen días fijos, que ves en la comparativa de esta página y en cada ficha.`,
	},
];
