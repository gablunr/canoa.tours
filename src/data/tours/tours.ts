import { formatPrice, latestDate } from '../../lib/format';
import type { SiteImage } from '../../lib/images';
import { publishedPickupZones, publishedTourRows } from '../../lib/tours/published-tours';
import { tourRowToDetails, type TourRow } from '../../lib/tours/tour-rows';
import { fitsPageTitle } from '../../lib/seo/seo';
import type { OfferOptions, QuestionAndAnswer } from '../../lib/seo/structured-data';
import { cancellationInsurancePriceLabel, cancellationNoticeLabel } from '../booking/booking-policy';
import { departurePorts } from './departure-ports';
import { destinationImage, destinations, tourHref, type Destination, type Tour } from './destinations';
import { scheduleLabel, scheduleSentence, type Weekday } from './schedule-text';

export type DurationCategory = 'full-day' | 'half-day' | 'night';

export const durationCategories: DurationCategory[] = ['full-day', 'half-day', 'night'];

export const durationCategoryLabels: Record<DurationCategory, string> = {
	'full-day': 'Día completo',
	'half-day': 'Medio día',
	night: 'Noche',
};

export const durationCategorySlugs: Record<DurationCategory, string> = {
	'full-day': 'dia-completo',
	'half-day': 'medio-dia',
	night: 'noche',
};

export { scheduleLabel, scheduleSentence, scheduleWhen, weekdayLabel, weekdays, type Weekday } from './schedule-text';

export type PickupZoneId = string;

export interface PickupZone {
	id: PickupZoneId;
	name: string;
}

export const pickupZones: PickupZone[] = publishedPickupZones.map((zone) => ({ id: zone.slug, name: zone.name }));

export const includedPickupZone: PickupZone | undefined = pickupZones.find((zone) => zone.id === 'bavaro');

export const includedPickupZoneName = includedPickupZone?.name ?? '';

export type PickupFees = Record<PickupZoneId, number>;

export type PricePer = 'person' | 'group';

export type PregnancyPolicy = 'allowed' | 'limited' | 'not-allowed';

export type DeparturePortKey = keyof typeof departurePorts;

export interface ChildPrice {
	amount: number;
	fromAge: number;
	toAge: number;
}

export interface ItineraryStep {
	time?: string;
	title: string;
	text: string;
}

export interface TourImageEntry {
	image: SiteImage;
	alt: string;
}

export interface TourDetails {
	destination: Destination;
	tour: Tour;
	productKey: string;
	title: string;
	shortName: string;
	summary: string;
	imageAlt: string;
	images: TourImageEntry[];
	highlights: string[];
	price: number;
	priceUnit: string;
	pricePer: PricePer;
	childPrice?: ChildPrice;
	deposit: number;
	durationCategory: DurationCategory;
	durationHours: number;
	days: Weekday[];
	pickupFrom: string;
	pickupTo: string;
	returnAt: string;
	port?: DeparturePortKey;
	meetingPoint: string;
	pickupFees: PickupFees;
	includes: string[];
	excludes: string[];
	itinerary: ItineraryStep[];
	bring: string[];
	minAge?: number;
	ageNote?: string;
	pregnancy: PregnancyPolicy;
	pregnancyMaxMonths?: number;
	wheelchair: boolean;
	faqs: QuestionAndAnswer[];
	bestFor: string;
	includesSummary: string;
	updatedAt: Date;
}

function detailsFromRow(row: TourRow): TourDetails[] {
	try {
		return [tourRowToDetails(row, { destinations })];
	} catch (error) {
		console.warn(`La excursión ${row.key} no sale en la web: ${error instanceof Error ? error.message : String(error)}`);
		return [];
	}
}

export const tourDetails: TourDetails[] = destinations.flatMap((destination) =>
	publishedTourRows.filter((row) => row.destination_slug === destination.slug).flatMap(detailsFromRow),
);

export const toursUpdatedAt = latestDate(tourDetails.map((details) => details.updatedAt));

export const destinationTourDetails = (destination: Destination) => tourDetails.filter((details) => details.destination.id === destination.id);

export const siblingTourDetails = (details: TourDetails) => destinationTourDetails(details.destination).filter((candidate) => candidate !== details);

export const tourDetailsHref = (details: TourDetails) => tourHref(details.destination, details.tour);

export const tourProductKey = (details: TourDetails) => details.productKey;

export const tourPhoto = (details: TourDetails): SiteImage | undefined => details.images[0]?.image ?? destinationImage(details.destination);

export const tourPhotoAlt = (details: TourDetails) => details.images[0]?.alt || details.title;

export const tourCountText = (count: number) => `${count} ${count === 1 ? 'excursión' : 'excursiones'}`;

export const toursByDuration = Object.fromEntries(
	durationCategories.map((category) => [category, tourDetails.filter((details) => details.durationCategory === category)]),
) as Record<DurationCategory, TourDetails[]>;

export const pickupIncluded = (details: TourDetails) => details.pickupFees[includedPickupZone?.id ?? ''] === 0;

const paidPickupFees = (details: TourDetails) => Object.values(details.pickupFees).filter((fee) => fee > 0);

export const lowestPickupFee = (details: TourDetails) => {
	const fees = paidPickupFees(details);
	return fees.length > 0 ? Math.min(...fees) : 0;
};

const highestPickupFee = (details: TourDetails) => {
	const fees = paidPickupFees(details);
	return fees.length > 0 ? Math.max(...fees) : 0;
};

export const pickupFeeLabel = (fee: number) => (fee === 0 ? 'Sin cargo' : `${formatPrice(fee)} por persona`);

export const pickupLabel = (details: TourDetails) =>
	pickupIncluded(details) ? `Incluida desde ${includedPickupZoneName}` : `Aparte, desde ${formatPrice(lowestPickupFee(details))} por persona`;

export const tourDeparture = (details: TourDetails) => (details.port ? `Embarque en ${departurePorts[details.port].port}` : 'Recogida en tu hotel');

export const meetingPointTitle = (details: TourDetails) => (details.port ? 'Punto de embarque' : 'Punto de salida');

export const priceLabel = (details: TourDetails) => `${formatPrice(details.price)} ${details.priceUnit}`;

export const childPriceLabel = (details: TourDetails): string | undefined =>
	details.childPrice &&
	`Niños de ${details.childPrice.fromAge} a ${details.childPrice.toAge} años: ${formatPrice(details.childPrice.amount)}`;

export const depositLabel = (details: TourDetails) =>
	`${formatPrice(details.deposit)} ${details.pricePer === 'group' ? 'por grupo' : 'por persona'}`;

export const durationLabel = (details: TourDetails) => `${durationCategoryLabels[details.durationCategory]} (${details.durationHours} h)`;

export const clockLabel = (time: string) => time.replace(/^0/, '');

export const pickupWindowLabel = (details: TourDetails) =>
	`Entre las ${clockLabel(details.pickupFrom)} y las ${clockLabel(details.pickupTo)}, según tu hotel`;

export const returnLabel = (details: TourDetails) => `Hacia las ${clockLabel(details.returnAt)}`;

export const minAgeLabel = (details: TourDetails) => (details.minAge ? `Desde ${details.minAge} años` : 'Sin edad mínima');

export const pregnancyLabel = (details: TourDetails) =>
	details.pregnancy === 'allowed' ? 'Sí' : details.pregnancy === 'limited' ? `Hasta los ${details.pregnancyMaxMonths} meses` : 'No';

export const wheelchairLabel = (details: TourDetails) => (details.wheelchair ? 'Sí' : 'No');

const placeNames = ['Punta Cana', 'Bávaro', 'Bayahibe'];

export const tourHeading = (details: TourDetails) => {
	const needsPlace = details.destination.kind !== 'place' && !placeNames.some((place) => details.title.includes(place));
	return needsPlace ? `${details.title} en Punta Cana` : details.title;
};

const tourSeoTitleEndings = [': precio y qué incluye', ': precio y reserva', ': precio'];

export const tourSeoTitle = (details: TourDetails) => {
	const heading = tourHeading(details);
	return tourSeoTitleEndings.map((ending) => `${heading}${ending}`).find(fitsPageTitle) ?? heading;
};

const descriptionMaxLength = 160;

export const tourSeoDescription = (details: TourDetails) => {
	const withPrice = `${details.summary} Desde ${priceLabel(details)}.`;
	return withPrice.length <= descriptionMaxLength ? withPrice : details.summary;
};

export const destinationToursTitle = (destination: Destination) =>
	destination.kind === 'place' ? `Excursiones a ${destination.name}` : `Excursiones de ${destination.name.toLowerCase()}`;

export const siblingToursTitle = (destination: Destination) =>
	destination.kind === 'place' ? `Otras excursiones a ${destination.name}` : `Otras excursiones de ${destination.name.toLowerCase()}`;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function tourNotes(details: TourDetails): string[] {
	return [
		...(details.pregnancy === 'allowed'
			? ['Apta para embarazadas']
			: details.pregnancy === 'limited'
				? [`Embarazadas hasta ${details.pregnancyMaxMonths} meses`]
				: []),
		...(details.wheelchair ? ['Accesible en silla de ruedas'] : []),
	];
}

export interface TourFact {
	label: string;
	value: string;
	note?: string;
}

export function tourFacts(details: TourDetails): TourFact[] {
	const childPrice = childPriceLabel(details);

	return [
		{ label: 'Precio', value: childPrice ? `${priceLabel(details)}. ${childPrice}` : priceLabel(details) },
		{ label: 'Anticipo', value: `${depositLabel(details)}. El resto, el día de la excursión` },
		{ label: 'Duración', value: `${durationCategoryLabels[details.durationCategory]} de unas ${details.durationHours} horas` },
		{ label: 'Días de salida', value: scheduleLabel(details.days) },
		{ label: 'Recogida aproximada', value: pickupWindowLabel(details) },
		{ label: 'Regreso aproximado', value: returnLabel(details) },
		{ label: meetingPointTitle(details), value: details.meetingPoint },
		{ label: 'Recogida en el hotel', value: pickupLabel(details) },
		{ label: 'Edad mínima', value: details.ageNote ? `${minAgeLabel(details)}. ${details.ageNote}` : minAgeLabel(details) },
		{ label: 'Embarazadas', value: pregnancyLabel(details) },
		{ label: 'Silla de ruedas', value: wheelchairLabel(details) },
	];
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function pickupAnswer(details: TourDetails) {
	if (pickupIncluded(details)) {
		return `Sí, desde hoteles de ${includedPickupZoneName} sin cargo extra. Desde otras zonas se suma hasta ${formatPrice(highestPickupFee(details))} por persona. Te recogemos ${lowerFirst(pickupWindowLabel(details))}.`;
	}

	const reason = details.port
		? `porque hay quien se hospeda cerca del puerto de ${departurePorts[details.port].port} y no lo necesita`
		: `porque hay quien viaja por su cuenta hasta ${details.destination.name}`;
	return `No. El transporte se paga aparte ${reason}. Cuesta desde ${formatPrice(lowestPickupFee(details))} por persona según tu zona.`;
}

export function tourFaqs(details: TourDetails): QuestionAndAnswer[] {
	const child = details.childPrice;

	return [
		...details.faqs,
		{
			question: `¿Cuánto cuesta ${details.title}?`,
			answer: `Desde ${priceLabel(details)}.${child ? ` Los niños de ${child.fromAge} a ${child.toAge} años pagan ${formatPrice(child.amount)}.` : ''} Reservas online con un depósito de ${depositLabel(details)} y el resto lo pagas el día de la excursión.`,
		},
		{ question: '¿Incluye la recogida en el hotel?', answer: pickupAnswer(details) },
	];
}

export const weatherFaq: QuestionAndAnswer = {
	question: '¿Qué pasa si hace mal tiempo?',
	answer: `Si el clima no deja salir, movemos la excursión al siguiente día disponible sin coste. Con el seguro de cancelación (${cancellationInsurancePriceLabel} por persona) también puedes cancelar hasta ${cancellationNoticeLabel} antes y te devolvemos el 100 %.`,
};

export function tourOffers(details: TourDetails, url: string): OfferOptions[] {
	const child = details.childPrice;

	return [
		{
			url,
			price: details.price,
			name: details.title,
			description: `${priceLabel(details)}. ${capitalize(scheduleSentence(details.days))}.`,
			unitText: details.priceUnit,
		},
		...(child
			? [
					{
						url,
						price: child.amount,
						name: `Niños de ${child.fromAge} a ${child.toAge} años`,
						unitText: `por niño de ${child.fromAge} a ${child.toAge} años`,
					},
				]
			: []),
	];
}
