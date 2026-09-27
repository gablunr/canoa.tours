import { cancellationNoticeLabel } from '../booking/booking-policy';
import type { DestinationId } from '../tours/destinations';

export const aboutIntro =
	'Canoa Tours es una agencia de excursiones en República Dominicana. Vendemos tours de día completo, de medio día y de noche desde Punta Cana y Bayahibe, y en casi todos te recogemos en tu hotel.';

export type TourGroupId = 'full-day' | 'half-day' | 'night';

export interface TourGroup {
	id: TourGroupId;
	title: string;
	text: string;
	destinationIds: DestinationId[];
}

export const tourGroups: TourGroup[] = [
	{
		id: 'full-day',
		title: 'De día completo',
		text: 'Salen temprano y vuelves al hotel por la tarde.',
		destinationIds: ['isla-saona', 'samana', 'santo-domingo', 'isla-catalina'],
	},
	{
		id: 'half-day',
		title: 'De medio día',
		text: 'Caben en una mañana o una tarde y te dejan el resto del día libre en el hotel.',
		destinationIds: ['aventura'],
	},
	{
		id: 'night',
		title: 'De noche',
		text: 'De Coco Bongo y de Imagine, una discoteca dentro de una cueva, vendemos la entrada. La fiesta en barco recorre la costa de Bávaro.',
		destinationIds: ['fiesta'],
	},
];

export const tourDetailsNote =
	'En la ficha de cada tour están los días de salida, la duración y qué incluye. También indicamos si es apto para embarazadas o para personas en silla de ruedas.';

export type AboutPromiseId = 'clear-prices' | 'cancellation' | 'someone-answers';

export interface AboutPromise {
	id: AboutPromiseId;
	title: string;
	text: string;
}

export const aboutPromises: AboutPromise[] = [
	{
		id: 'clear-prices',
		title: 'Precios sin sorpresas',
		text: 'Antes de pagar ves qué incluye cada tour y cuánto cuesta la recogida desde tu zona, con el cargo extra ya sumado si tu hotel queda lejos de Bávaro.',
	},
	{
		id: 'cancellation',
		title: 'Opción de cancelar',
		text: `Si agregas el seguro de cancelación al reservar, puedes cancelar hasta ${cancellationNoticeLabel} antes con reembolso completo o cambiar la fecha.`,
	},
	{
		id: 'someone-answers',
		title: 'Alguien que te responde',
		text: 'Reservas y pagas online, y si te surge una duda antes o después, nos escribes por WhatsApp y te responde alguien del equipo.',
	},
];
