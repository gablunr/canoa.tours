import type { ImageMetadata } from 'astro';
import { formatPrice } from '../../lib/format';
import type { SiteImage } from '../../lib/images';
import type { OfferOptions, QuestionAndAnswer } from '../../lib/seo/structured-data';
import { bookingPolicy, cancellationInsurancePriceLabel, cancellationNoticeLabel } from '../booking/booking-policy';
import { departurePorts, distanceLabel } from './departure-ports';
import { destinationImage, destinations, tourHref, tourImage, type Destination, type DestinationId, type Tour } from './destinations';

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

export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export type Weekday = (typeof weekdays)[number];

export type PickupZoneId = 'bavaro' | 'cabeza-de-toro' | 'cap-cana' | 'macao' | 'uvero-alto';

export interface PickupZone {
	id: PickupZoneId;
	name: string;
}

export const pickupZones: PickupZone[] = [
	{ id: 'bavaro', name: 'Bávaro y Arena Gorda' },
	{ id: 'cabeza-de-toro', name: 'Cabeza de Toro' },
	{ id: 'cap-cana', name: 'Cap Cana' },
	{ id: 'macao', name: 'Macao' },
	{ id: 'uvero-alto', name: 'Uvero Alto' },
];

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

interface TourEntry
	extends Omit<TourDetails, 'destination' | 'tour' | 'productKey' | 'shortName' | 'images' | 'bestFor' | 'includesSummary' | 'updatedAt'> {
	destinationId: DestinationId;
	tourSlug: string;
}

const boatTripFees: PickupFees = { bavaro: 15, 'cabeza-de-toro': 20, 'cap-cana': 25, macao: 20, 'uvero-alto': 25 };
const roadTripFees: PickupFees = { bavaro: 0, 'cabeza-de-toro': 10, 'cap-cana': 15, macao: 10, 'uvero-alto': 15 };
const inlandActivityFees: PickupFees = { bavaro: 0, 'cabeza-de-toro': 10, 'cap-cana': 15, macao: 0, 'uvero-alto': 15 };
const beachActivityFees: PickupFees = {
	bavaro: 0,
	'cabeza-de-toro': 10,
	'cap-cana': bookingPolicy.beachActivityPickupFee,
	macao: 10,
	'uvero-alto': bookingPolicy.beachActivityPickupFee,
};

const everyDay: Weekday[] = [...weekdays];
const mondayToSaturday: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const thursdayAndSaturday: Weekday[] = ['thursday', 'saturday'];

const portMeetingPoint = (key: DeparturePortKey) =>
	`Puerto de ${departurePorts[key].port}, a unos ${distanceLabel(departurePorts[key])} de Punta Cana`;

const drivingAgeNote = 'Para conducir hay que tener 18 años y licencia.';

const saonaBring = ['Traje de baño', 'Toalla', 'Protector solar biodegradable', 'Gorra o sombrero', 'Funda impermeable para el móvil', 'Efectivo para extras'];

const buggyBring = ['Ropa que se pueda manchar', 'Muda limpia y bolsa', 'Traje de baño', 'Calzado cerrado', 'Gafas de sol'];

const nightBring = ['Pasaporte o documento de identidad', 'Calzado cerrado', 'Efectivo para propinas', 'Ropa cómoda para bailar'];

const entries: TourEntry[] = [
	{
		destinationId: 'isla-saona',
		tourSlug: 'catamaran',
		title: 'Isla Saona en catamarán',
		summary:
			'Día completo en Isla Saona: ida en catamarán con música y bebidas, almuerzo buffet en la playa y vuelta en lancha por la piscina natural.',
		imageAlt: 'Catamarán blanco navegando frente a una costa llena de palmeras',
		highlights: [
			'Ida en catamarán con música, refrescos y ron',
			'Tiempo libre en una playa de arena blanca de Saona',
			'Almuerzo buffet con pescado, pollo y ensaladas',
			'Vuelta en lancha con parada en la piscina natural',
		],
		price: 55,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 35, fromAge: 3, toAge: 11 },
		deposit: 15,
		durationCategory: 'full-day',
		durationHours: 10,
		days: everyDay,
		pickupFrom: '06:30',
		pickupTo: '07:30',
		returnAt: '18:00',
		port: 'saona',
		meetingPoint: portMeetingPoint('saona'),
		pickupFees: boatTripFees,
		includes: [
			'Ida en catamarán y vuelta en lancha rápida',
			'Barra de refrescos, agua y ron a bordo',
			'Almuerzo buffet en la isla',
			'Parada en la piscina natural',
			'Guía en español e inglés',
			'Entrada al parque nacional',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Fotos y vídeos a bordo', 'Tumbonas y bebidas premium en la playa', 'Propinas'],
		itinerary: [
			{ time: '07:00', title: 'Recogida en tu hotel', text: 'El autobús pasa por tu hotel y sigue hacia Bayahibe, a hora y media de Bávaro.' },
			{ time: '09:00', title: 'Embarque en Bayahibe', text: 'Subes al catamarán y navegas unas dos horas junto a la costa del parque nacional, con música y bebidas.' },
			{ time: '11:00', title: 'Llegada a Isla Saona', text: 'Tiempo libre para bañarte y descansar a la sombra de las palmeras.' },
			{ time: '13:00', title: 'Almuerzo en la playa', text: 'Buffet con pescado, pollo, arroz, ensaladas y fruta.' },
			{ time: '15:00', title: 'Piscina natural', text: 'La lancha para en un banco de arena con el agua por la cintura, donde suelen verse estrellas de mar.' },
			{ time: '16:30', title: 'Vuelta a Bayahibe', text: 'Llegada al puerto y regreso en autobús a tu hotel.' },
		],
		bring: saonaBring,
		pregnancy: 'allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Se va y se vuelve en catamarán?',
				answer: 'No. La ida es en catamarán, más tranquila y con música, y la vuelta es en lancha rápida, que es la que para en la piscina natural.',
			},
			{
				question: '¿Hay sombra en la playa de Saona?',
				answer: 'Sí, hay palmeras y algunos ranchos con techo. Aun así, el sol pega fuerte y conviene llevar protector y gorra.',
			},
			{
				question: '¿Se pueden tocar las estrellas de mar?',
				answer: 'No. Están protegidas y sacarlas del agua las daña, así que se miran sin tocarlas.',
			},
		],
	},
	{
		destinationId: 'isla-saona',
		tourSlug: 'vip-4-playas',
		title: 'Isla Saona VIP 4 Playas',
		summary:
			'Isla Saona en lancha y en grupo reducido, con cuatro paradas de playa, la piscina natural y almuerzo en la arena. De domingo a jueves.',
		imageAlt: 'Playa de arena blanca con palmeras, cabañas con techo de paja y agua turquesa',
		highlights: [
			'Grupo reducido en lancha, sin aglomeraciones',
			'Cuatro paradas de playa, incluida la piscina natural',
			'Almuerzo servido en la playa',
			'Más tiempo en el agua y menos en el barco',
		],
		price: 79,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 20,
		durationCategory: 'full-day',
		durationHours: 10,
		days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
		pickupFrom: '06:30',
		pickupTo: '07:30',
		returnAt: '18:00',
		port: 'saona',
		meetingPoint: portMeetingPoint('saona'),
		pickupFees: boatTripFees,
		includes: [
			'Lancha rápida de ida y vuelta en grupo reducido',
			'Cuatro paradas de playa',
			'Parada en la piscina natural',
			'Almuerzo en la playa',
			'Agua, refrescos y ron a bordo',
			'Guía en español e inglés',
			'Entrada al parque nacional',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Fotos y vídeos', 'Propinas'],
		itinerary: [
			{ time: '07:00', title: 'Recogida en tu hotel', text: 'Viaje en autobús hasta el puerto de Bayahibe.' },
			{ time: '09:00', title: 'Salida en lancha', text: 'Grupo pequeño y trayecto corto hasta la primera playa.' },
			{ time: '09:45', title: 'Dos playas de camino', text: 'Paradas para bañarte en calas de agua clara antes de llegar a Saona.' },
			{ time: '12:30', title: 'Almuerzo en Isla Saona', text: 'Comida servida en la arena y tiempo libre después.' },
			{ time: '15:00', title: 'Piscina natural', text: 'Última parada en el banco de arena, con el agua por la cintura.' },
			{ time: '16:30', title: 'Regreso', text: 'Vuelta a Bayahibe y autobús hasta tu hotel.' },
		],
		bring: saonaBring,
		pregnancy: 'limited',
		pregnancyMaxMonths: 6,
		wheelchair: true,
		faqs: [
			{
				question: '¿Cuántas personas van en la lancha?',
				answer: 'Los grupos son pequeños, de unas 20 personas como máximo, para que las playas no se llenen cuando llegas.',
			},
			{
				question: '¿Cómo es el embarque en silla de ruedas?',
				answer: 'La tripulación ayuda a subir y bajar de la lancha en el muelle. Avísanos al reservar para preparar el embarque.',
			},
		],
	},
	{
		destinationId: 'isla-saona',
		tourSlug: 'first-class',
		title: 'Isla Saona First Class',
		summary:
			'Isla Saona en catamarán con zona reservada, bebidas premium, tumbonas guardadas en la playa y almuerzo servido en mesa.',
		imageAlt: 'Agua clara y poco profunda junto a una playa de arena blanca con palmeras inclinadas',
		highlights: [
			'Zona reservada en el catamarán',
			'Bebidas premium y cócteles a bordo',
			'Tumbonas reservadas en la playa',
			'Almuerzo servido en mesa',
		],
		price: 99,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 25,
		durationCategory: 'full-day',
		durationHours: 10,
		days: ['monday', 'wednesday', 'friday'],
		pickupFrom: '06:30',
		pickupTo: '07:30',
		returnAt: '18:00',
		port: 'saona',
		meetingPoint: portMeetingPoint('saona'),
		pickupFees: boatTripFees,
		includes: [
			'Catamarán con zona reservada y vuelta en lancha',
			'Barra libre premium a bordo',
			'Tumbonas reservadas en Isla Saona',
			'Almuerzo servido en mesa, con pescado o carne',
			'Parada en la piscina natural',
			'Guía en español e inglés',
			'Entrada al parque nacional',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Fotos y vídeos', 'Propinas'],
		itinerary: [
			{ time: '07:00', title: 'Recogida en tu hotel', text: 'Viaje en autobús hasta el puerto de Bayahibe.' },
			{ time: '09:00', title: 'Embarque en la zona reservada', text: 'Navegas hacia Saona en la parte del catamarán reservada, con cócteles y servicio a bordo.' },
			{ time: '11:00', title: 'Playa con tumbona', text: 'Al llegar tienes tu tumbona guardada a la sombra.' },
			{ time: '13:00', title: 'Almuerzo servido', text: 'Comida en mesa, con opción de pescado o carne.' },
			{ time: '15:00', title: 'Piscina natural', text: 'La lancha de vuelta para en el banco de arena para bañarte.' },
			{ time: '16:30', title: 'Regreso', text: 'Llegada a Bayahibe y autobús hasta tu hotel.' },
		],
		bring: saonaBring,
		pregnancy: 'limited',
		pregnancyMaxMonths: 6,
		wheelchair: false,
		faqs: [
			{
				question: '¿Qué cambia respecto al catamarán normal?',
				answer:
					'El recorrido es el mismo, pero vas en una zona del barco con menos gente, con bebidas premium, tumbona guardada en la playa y almuerzo servido en mesa en lugar de buffet.',
			},
			{
				question: '¿Por qué solo sale tres días a la semana?',
				answer: 'Las plazas de la zona reservada son pocas, así que las salidas se agrupan los lunes, miércoles y viernes.',
			},
		],
	},
	{
		destinationId: 'isla-saona',
		tourSlug: 'privada',
		title: 'Isla Saona privada',
		summary:
			'Isla Saona en lancha privada para hasta 6 personas: eliges las paradas y el ritmo del día, con capitán y guía solo para tu grupo.',
		imageAlt: 'Agua clara y poco profunda junto a una playa de arena blanca con palmeras inclinadas',
		highlights: [
			'Lancha solo para tu grupo',
			'Horario y paradas a tu medida',
			'Playas menos concurridas y la piscina natural',
			'Buena opción para familias y celebraciones',
		],
		price: 450,
		priceUnit: 'por grupo de hasta 6 personas',
		pricePer: 'group',
		deposit: 100,
		durationCategory: 'full-day',
		durationHours: 9,
		days: everyDay,
		pickupFrom: '07:00',
		pickupTo: '08:00',
		returnAt: '17:30',
		port: 'saona',
		meetingPoint: portMeetingPoint('saona'),
		pickupFees: boatTripFees,
		includes: [
			'Lancha privada con capitán',
			'Guía para tu grupo',
			'Bebidas y hielo a bordo',
			'Almuerzo en la playa',
			'Parada en la piscina natural',
			'Entrada al parque nacional',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Fotos y vídeos', 'Propinas'],
		itinerary: [
			{ time: '07:30', title: 'Recogida en tu hotel', text: 'Si sumas el transporte, te recogemos y vamos directo a Bayahibe.' },
			{ time: '09:30', title: 'Salida en tu lancha', text: 'El capitán te propone la ruta y la ajusta a lo que prefiera el grupo.' },
			{ time: '10:30', title: 'Primera parada', text: 'Playa o snorkel, según lo que hayáis elegido.' },
			{ time: '13:00', title: 'Almuerzo en Saona', text: 'Comida en la playa, sin horarios de grupo grande.' },
			{ time: '15:00', title: 'Piscina natural', text: 'Parada larga en el banco de arena antes de volver.' },
			{ time: '16:00', title: 'Regreso', text: 'Vuelta a Bayahibe y, si lo contrataste, autobús hasta tu hotel.' },
		],
		bring: saonaBring,
		pregnancy: 'allowed',
		wheelchair: true,
		faqs: [
			{
				question: '¿Qué pasa si somos más de 6?',
				answer: 'Se pueden sumar personas con un cargo por cada una o reservar una lancha más grande. Escríbenos y te pasamos el precio.',
			},
			{
				question: '¿Podemos elegir las playas?',
				answer: 'Sí. El capitán te propone una ruta y la adapta a lo que queráis: más snorkel, más playa o una parada larga en la piscina natural.',
			},
		],
	},
	{
		destinationId: 'samana',
		tourSlug: '3-maravillas',
		title: 'Samaná 3 Maravillas',
		summary:
			'Samaná en un día: cruce en lancha desde Miches, cascada El Limón y Cayo Levantado. Sale jueves y sábados, con almuerzo incluido.',
		imageAlt: 'Playa de Cayo Levantado con tumbonas azules bajo las palmeras',
		highlights: [
			'Cruce de la bahía de Samaná en lancha desde Miches',
			'Cascada El Limón, a caballo o desde el mirador',
			'Tarde de playa en Cayo Levantado',
			'Almuerzo dominicano',
		],
		price: 119,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 79, fromAge: 3, toAge: 11 },
		deposit: 30,
		durationCategory: 'full-day',
		durationHours: 12,
		days: thursdayAndSaturday,
		pickupFrom: '05:00',
		pickupTo: '06:00',
		returnAt: '20:00',
		port: 'samana',
		meetingPoint: portMeetingPoint('samana'),
		pickupFees: boatTripFees,
		includes: [
			'Lancha de ida y vuelta desde Miches',
			'Subida a caballo a la cascada El Limón o visita al mirador',
			'Almuerzo dominicano',
			'Tiempo de playa en Cayo Levantado',
			'Agua y refrescos',
			'Guía en español e inglés',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Bebidas alcohólicas', 'Propina para el guía del caballo'],
		itinerary: [
			{ time: '05:30', title: 'Recogida en tu hotel', text: 'Salida de madrugada hacia Miches, en la costa norte.' },
			{ time: '07:30', title: 'Cruce en lancha', text: 'Atraviesas la bahía de Samaná en algo más de una hora.' },
			{ time: '09:30', title: 'Cascada El Limón', text: 'Subida a caballo por el bosque hasta un salto de agua de más de 40 metros. Quien prefiere no subir espera en el mirador.' },
			{ time: '12:30', title: 'Almuerzo', text: 'Comida dominicana con arroz, habichuelas y pollo o pescado.' },
			{ time: '14:00', title: 'Cayo Levantado', text: 'Playa de arena blanca para bañarte y descansar.' },
			{ time: '16:30', title: 'Vuelta a Miches', text: 'Cruce de regreso y autobús hasta tu hotel.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Calzado que se pueda mojar', 'Protector solar', 'Pastilla para el mareo si la necesitas', 'Efectivo para propinas'],
		pregnancy: 'not-allowed',
		wheelchair: true,
		faqs: [
			{
				question: '¿Hay que subir a caballo a la cascada?',
				answer: 'No es obligatorio. Quien no quiere o no puede subir espera en un mirador con vistas al valle, y el grupo se vuelve a juntar para comer.',
			},
			{
				question: '¿Por qué hay que salir tan temprano?',
				answer: `Miches queda a unos ${distanceLabel(departurePorts.samana)} de Punta Cana y después hay que cruzar la bahía. Salir de madrugada da tiempo para las tres paradas sin prisas.`,
			},
			{
				question: '¿Se mueve mucho la lancha en el cruce?',
				answer: 'A veces la bahía está movida, sobre todo por la tarde. Si te mareas con facilidad, toma algo antes de embarcar.',
			},
		],
	},
	{
		destinationId: 'samana',
		tourSlug: 'cayo-levantado-el-limon',
		title: 'Cayo Levantado y cascada El Limón',
		summary:
			'Samaná por carretera: subida a caballo a la cascada El Limón, almuerzo y lancha a Cayo Levantado. Sale jueves y sábados.',
		imageAlt: 'Palmeras inclinadas sobre la playa y barcas en la bahía, con montañas al fondo',
		highlights: [
			'Viaje por carretera por el norte del país',
			'Subida a caballo a la cascada El Limón',
			'Lancha a Cayo Levantado, en la bahía de Samaná',
			'Almuerzo dominicano',
		],
		price: 99,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 69, fromAge: 3, toAge: 11 },
		deposit: 25,
		durationCategory: 'full-day',
		durationHours: 13,
		days: thursdayAndSaturday,
		pickupFrom: '05:00',
		pickupTo: '06:00',
		returnAt: '20:30',
		meetingPoint: 'Muelle de Samaná, tras unas 3 horas de carretera',
		pickupFees: boatTripFees,
		includes: [
			'Caballo y guía para subir a El Limón',
			'Lancha de ida y vuelta a Cayo Levantado',
			'Almuerzo dominicano',
			'Agua y refrescos',
			'Guía en español e inglés',
		],
		excludes: ['Transporte desde tu hotel, que se paga según tu zona', 'Bebidas en Cayo Levantado', 'Propinas'],
		itinerary: [
			{ time: '05:30', title: 'Recogida en tu hotel', text: 'Salida hacia Samaná por carretera, unas 3 horas con una parada para desayunar.' },
			{ time: '09:00', title: 'Cascada El Limón', text: 'Subida a caballo por caminos de montaña y un último tramo a pie hasta la cascada.' },
			{ time: '12:00', title: 'Almuerzo en Samaná', text: 'Comida típica en el pueblo, con vistas a la bahía.' },
			{ time: '13:30', title: 'Lancha a Cayo Levantado', text: 'Tarde de playa en la isla, con tiempo para bañarte.' },
			{ time: '16:30', title: 'Regreso', text: 'Vuelta al muelle y viaje por carretera hasta tu hotel.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Calzado cerrado que se pueda mojar', 'Protector solar', 'Efectivo para propinas'],
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Qué diferencia hay con Samaná 3 Maravillas?',
				answer:
					'Aquí se llega a Samaná por carretera, sin el cruce en lancha desde Miches. Es más barata, pero el día es más largo y no es accesible en silla de ruedas.',
			},
			{
				question: '¿Es dura la subida a caballo?',
				answer: 'El camino tiene barro y piedras, pero los caballos van al paso y cada uno lleva su guía. Al final hay un tramo corto a pie con escalones.',
			},
		],
	},
	{
		destinationId: 'santo-domingo',
		tourSlug: 'clasica',
		title: 'Santo Domingo Clásica',
		summary:
			'Santo Domingo en un día: la Zona Colonial a pie con la Catedral Primada y el Alcázar de Colón, las cuevas de Los Tres Ojos y almuerzo.',
		imageAlt: 'Fachada del Alcázar de Colón frente a una plaza empedrada en la Zona Colonial',
		highlights: [
			'Paseo a pie por la Zona Colonial',
			'Catedral Primada y Alcázar de Colón',
			'Lagos subterráneos de Los Tres Ojos',
			'Almuerzo buffet dominicano',
		],
		price: 69,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 45, fromAge: 3, toAge: 11 },
		deposit: 20,
		durationCategory: 'full-day',
		durationHours: 11,
		days: ['tuesday', 'thursday', 'saturday'],
		pickupFrom: '06:00',
		pickupTo: '07:00',
		returnAt: '19:00',
		meetingPoint: 'Salida en autobús desde tu hotel',
		pickupFees: roadTripFees,
		includes: [
			'Autobús con aire acondicionado',
			'Guía en español e inglés',
			'Entrada a Los Tres Ojos',
			'Almuerzo buffet',
			'Agua a bordo',
		],
		excludes: ['Entrada al interior del Alcázar de Colón y de la Catedral', 'Bebidas en el almuerzo', 'Compras y propinas'],
		itinerary: [
			{ time: '06:30', title: 'Recogida en tu hotel', text: 'Unas dos horas y media de autopista hasta la capital.' },
			{ time: '09:30', title: 'Los Tres Ojos', text: 'Bajada a unas cuevas con lagos de agua dulce, en un parque del este de la ciudad.' },
			{ time: '11:00', title: 'Zona Colonial a pie', text: 'Paseo por la calle Las Damas, la plaza de España, el Alcázar de Colón y la Catedral Primada.' },
			{ time: '13:00', title: 'Almuerzo', text: 'Buffet de comida dominicana en la Zona Colonial.' },
			{ time: '14:30', title: 'Calle El Conde', text: 'Tiempo libre para pasear, comprar ámbar o larimar y tomar un café.' },
			{ time: '16:00', title: 'Regreso a Punta Cana', text: 'Salida hacia los hoteles.' },
		],
		bring: ['Calzado cómodo para caminar', 'Ropa ligera que cubra los hombros', 'Gorra o sombrero', 'Protector solar', 'Efectivo para compras'],
		pregnancy: 'allowed',
		wheelchair: true,
		faqs: [
			{
				question: '¿Se camina mucho?',
				answer: 'Unos 2 km por calles llanas, con paradas a la sombra. El empedrado es irregular, así que conviene llevar calzado cómodo.',
			},
			{
				question: '¿Cómo es el recorrido en silla de ruedas?',
				answer: 'El autobús tiene espacio para una silla plegable y la ruta por la Zona Colonial es llana. En Los Tres Ojos hay escaleras, así que esa parada se ve desde arriba.',
			},
		],
	},
	{
		destinationId: 'santo-domingo',
		tourSlug: 'vip',
		title: 'Santo Domingo VIP',
		summary:
			'Santo Domingo en grupo reducido y en minibús, con entradas a los monumentos incluidas y almuerzo en un restaurante de la Zona Colonial.',
		imageAlt: 'Fachada del Alcázar de Colón frente a una plaza empedrada en la Zona Colonial',
		highlights: [
			'Grupo reducido en minibús',
			'Entradas al Alcázar de Colón y a la Catedral Primada',
			'Almuerzo en un restaurante de la Zona Colonial',
			'Más tiempo libre en la calle El Conde',
		],
		price: 95,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 25,
		durationCategory: 'full-day',
		durationHours: 11,
		days: ['wednesday', 'saturday'],
		pickupFrom: '06:00',
		pickupTo: '07:00',
		returnAt: '19:00',
		meetingPoint: 'Salida en autobús desde tu hotel',
		pickupFees: roadTripFees,
		includes: [
			'Minibús con aire acondicionado',
			'Guía en español e inglés',
			'Entradas al Alcázar de Colón, la Catedral Primada y Los Tres Ojos',
			'Almuerzo con una bebida',
			'Agua y refrescos a bordo',
		],
		excludes: ['Bebidas extra', 'Compras y propinas'],
		itinerary: [
			{ time: '06:30', title: 'Recogida en tu hotel', text: 'Viaje en minibús hasta la capital.' },
			{ time: '09:30', title: 'Los Tres Ojos', text: 'Cuevas con lagos de agua dulce, antes de que llegue la mayoría de grupos.' },
			{ time: '11:00', title: 'Alcázar y Catedral por dentro', text: 'Visita guiada a la casa de Diego Colón y a la primera catedral de América.' },
			{ time: '13:00', title: 'Almuerzo en la Zona Colonial', text: 'Restaurante en una casa colonial, con menú dominicano.' },
			{ time: '14:30', title: 'Tiempo libre', text: 'Calle El Conde y parque Colón, a tu ritmo.' },
			{ time: '16:00', title: 'Regreso a Punta Cana', text: 'Vuelta en minibús hasta tu hotel.' },
		],
		bring: ['Calzado cómodo para caminar', 'Ropa ligera que cubra los hombros', 'Gorra o sombrero', 'Protector solar', 'Efectivo para compras'],
		pregnancy: 'allowed',
		wheelchair: true,
		faqs: [
			{
				question: '¿Qué cambia respecto a la versión clásica?',
				answer:
					'El grupo es más pequeño y va en minibús, se entra al Alcázar de Colón y a la Catedral Primada, y el almuerzo es en un restaurante de la Zona Colonial en lugar de un buffet.',
			},
			{
				question: '¿Cuántas personas van en el grupo?',
				answer: 'Como máximo 15, para que el guía pueda atender a todos y las visitas por dentro sean cómodas.',
			},
		],
	},
	{
		destinationId: 'isla-catalina',
		tourSlug: 'snorkel',
		title: 'Snorkel en Isla Catalina',
		summary:
			'Isla Catalina desde La Romana: dos paradas de snorkel en aguas muy claras, playa de arena blanca y almuerzo buffet en la isla.',
		imageAlt: 'Persona haciendo snorkel bajo el agua azul',
		highlights: [
			'Dos paradas de snorkel en aguas muy claras',
			'Equipo de snorkel incluido',
			'Playa tranquila en Isla Catalina',
			'Almuerzo buffet en la isla',
		],
		price: 65,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 45, fromAge: 3, toAge: 11 },
		deposit: 15,
		durationCategory: 'full-day',
		durationHours: 9,
		days: mondayToSaturday,
		pickupFrom: '07:00',
		pickupTo: '08:00',
		returnAt: '17:30',
		port: 'catalina',
		meetingPoint: portMeetingPoint('catalina'),
		pickupFees: boatTripFees,
		includes: [
			'Barco de ida y vuelta desde La Romana',
			'Equipo de snorkel y chaleco',
			'Dos paradas de snorkel con guía',
			'Almuerzo buffet',
			'Agua, refrescos y ron',
			'Entrada a la isla',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Fotos bajo el agua', 'Propinas'],
		itinerary: [
			{ time: '07:30', title: 'Recogida en tu hotel', text: 'Hora y media de carretera hasta La Romana.' },
			{ time: '09:30', title: 'Embarque', text: 'Salida en barco hacia Isla Catalina, a unos 40 minutos.' },
			{ time: '10:15', title: 'Snorkel en el arrecife', text: 'Primera parada en aguas poco profundas, llenas de peces de colores.' },
			{ time: '11:15', title: 'Snorkel en la pared', text: 'Un borde de coral que cae hacia aguas profundas, con más vida marina.' },
			{ time: '12:30', title: 'Playa y almuerzo', text: 'Buffet en la isla y tiempo libre en la arena.' },
			{ time: '15:30', title: 'Regreso', text: 'Vuelta a La Romana y autobús hasta tu hotel.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Protector solar biodegradable', 'Camiseta para el agua', 'Efectivo para extras'],
		pregnancy: 'limited',
		pregnancyMaxMonths: 6,
		wheelchair: false,
		faqs: [
			{
				question: '¿Hace falta saber nadar?',
				answer: 'Es recomendable, aunque todos llevan chaleco y el guía acompaña al grupo en el agua. Quien no quiera meterse puede quedarse en el barco.',
			},
			{
				question: '¿Qué se ve haciendo snorkel?',
				answer: 'Corales, peces tropicales y, con suerte, tortugas o rayas. Por la mañana el agua suele estar más clara.',
			},
		],
	},
	{
		destinationId: 'isla-catalina',
		tourSlug: 'buceo',
		title: 'Buceo en Isla Catalina',
		summary:
			'Dos inmersiones en Isla Catalina con instructor y equipo incluido. Si nunca has buceado, puedes hacer un bautismo con clase previa.',
		imageAlt: 'Persona haciendo snorkel bajo el agua azul',
		highlights: [
			'Dos inmersiones en el arrecife y la pared',
			'Instructor certificado y equipo completo',
			'Bautismo para quien nunca ha buceado',
			'Playa y almuerzo en la isla',
		],
		price: 120,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 30,
		durationCategory: 'full-day',
		durationHours: 9,
		days: mondayToSaturday,
		pickupFrom: '07:00',
		pickupTo: '08:00',
		returnAt: '17:30',
		port: 'catalina',
		meetingPoint: portMeetingPoint('catalina'),
		pickupFees: boatTripFees,
		includes: [
			'Barco de ida y vuelta desde La Romana',
			'Dos inmersiones con instructor',
			'Equipo completo de buceo',
			'Clase previa para principiantes',
			'Almuerzo buffet',
			'Agua y refrescos',
		],
		excludes: ['Recogida en el hotel, que se paga según tu zona', 'Curso de certificación', 'Propinas'],
		itinerary: [
			{ time: '07:30', title: 'Recogida en tu hotel', text: 'Hora y media de carretera hasta La Romana.' },
			{ time: '09:30', title: 'Clase y embarque', text: 'Te explican el equipo y, si es tu primera vez, practicas en aguas poco profundas.' },
			{ time: '10:30', title: 'Primera inmersión', text: 'Arrecife de poca profundidad, ideal para empezar.' },
			{ time: '12:00', title: 'Playa y almuerzo', text: 'Descanso en la isla entre las dos inmersiones.' },
			{ time: '13:30', title: 'Segunda inmersión', text: 'La pared de Catalina, o el arrecife otra vez si estás en el bautismo.' },
			{ time: '15:30', title: 'Regreso', text: 'Vuelta a La Romana y autobús hasta tu hotel.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Certificado de buceo si lo tienes', 'Protector solar biodegradable', 'Ropa de abrigo para el barco'],
		minAge: 10,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Puedo bucear sin certificación?',
				answer: 'Sí, con el bautismo: clase previa y buceo a poca profundidad con el instructor a tu lado. Con certificación se baja a más metros.',
			},
			{
				question: '¿Hay requisitos médicos?',
				answer: 'Antes de bajar rellenas un cuestionario de salud. Con problemas de corazón, pulmones u oídos no se puede bucear, y después de hacerlo no conviene volar en 24 horas.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'buggies',
		title: 'Buggies 4x4',
		summary:
			'Buggy 4x4 por caminos de barro hacia Macao, con baño en una cueva de agua dulce, playa y visita a una casa típica con café y cacao.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Conduces un buggy 4x4 por caminos de barro',
			'Baño en una cueva de agua dulce',
			'Parada en la playa de Macao',
			'Café, cacao y mamajuana en una casa típica',
		],
		price: 40,
		priceUnit: 'por persona en buggy doble',
		pricePer: 'person',
		deposit: 10,
		durationCategory: 'half-day',
		durationHours: 4,
		days: everyDay,
		pickupFrom: '08:00',
		pickupTo: '08:30',
		returnAt: '13:00',
		meetingPoint: 'Rancho de buggies en la zona de Macao',
		pickupFees: inlandActivityFees,
		includes: ['Buggy doble con casco', 'Guía durante la ruta', 'Entrada a la cueva', 'Degustación de café, cacao y mamajuana', 'Agua'],
		excludes: ['Pañuelo para el polvo, que se vende en el rancho', 'Fotos y vídeos de la ruta', 'Propinas'],
		itinerary: [
			{ time: '08:15', title: 'Recogida en tu hotel', text: 'Traslado al rancho, cerca de Macao.' },
			{ time: '09:00', title: 'Casco e instrucciones', text: 'Te explican cómo manejar el buggy y sales en fila detrás del guía.' },
			{ time: '09:30', title: 'Caminos de barro', text: 'Tramos de tierra y charcos entre fincas y campo abierto.' },
			{ time: '10:15', title: 'Cueva de agua dulce', text: 'Parada para bañarte en una cueva con agua fresca y clara.' },
			{ time: '11:00', title: 'Playa Macao', text: 'Un rato en una de las playas más bonitas de la zona.' },
			{ time: '11:45', title: 'Casa típica', text: 'Degustación de café, cacao y mamajuana antes de volver.' },
		],
		bring: buggyBring,
		minAge: 5,
		ageNote: drivingAgeNote,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Me voy a manchar?',
				answer: 'Sí, y bastante. Ven con ropa que no te importe y deja una muda limpia en la bolsa. En el rancho hay duchas.',
			},
			{
				question: '¿Puedo ir solo en un buggy?',
				answer: 'Sí, con un suplemento por buggy individual. El precio publicado es por persona compartiendo buggy doble.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'buggies-predator',
		title: 'Buggies Predator',
		summary:
			'La ruta de buggies hacia Macao en un Predator, más potente y con mejor suspensión: barro, cueva de agua dulce, playa y casa típica.',
		imageAlt: 'Buggy azul con cuatro personas en un camino de tierra entre montañas',
		highlights: [
			'Buggy Predator, más potente y con suspensión reforzada',
			'Mismo recorrido por barro, cueva y playa Macao',
			'Grupos más pequeños en la ruta',
			'Café y cacao en una casa típica',
		],
		price: 45,
		priceUnit: 'por persona en buggy doble',
		pricePer: 'person',
		deposit: 10,
		durationCategory: 'half-day',
		durationHours: 4,
		days: mondayToSaturday,
		pickupFrom: '08:00',
		pickupTo: '08:30',
		returnAt: '13:00',
		meetingPoint: 'Rancho de buggies en la zona de Macao',
		pickupFees: inlandActivityFees,
		includes: ['Buggy Predator doble con casco', 'Guía durante la ruta', 'Entrada a la cueva', 'Degustación de café, cacao y mamajuana', 'Agua'],
		excludes: ['Pañuelo para el polvo, que se vende en el rancho', 'Fotos y vídeos de la ruta', 'Propinas'],
		itinerary: [
			{ time: '08:15', title: 'Recogida en tu hotel', text: 'Traslado al rancho, cerca de Macao.' },
			{ time: '09:00', title: 'Casco e instrucciones', text: 'Te presentan el Predator y te explican los mandos.' },
			{ time: '09:30', title: 'Caminos de barro', text: 'Con más motor y mejor suspensión, los baches se notan menos.' },
			{ time: '10:15', title: 'Cueva de agua dulce', text: 'Parada para bañarte en agua fresca y clara.' },
			{ time: '11:00', title: 'Playa Macao', text: 'Tiempo para caminar por la arena o darte un baño.' },
			{ time: '11:45', title: 'Casa típica', text: 'Café, cacao y mamajuana antes de volver al rancho.' },
		],
		bring: buggyBring,
		minAge: 5,
		ageNote: drivingAgeNote,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Qué diferencia hay con el buggy 4x4?',
				answer: 'El recorrido es el mismo. El Predator tiene más motor y mejor suspensión, así que se disfruta más en los tramos de barro.',
			},
			{
				question: '¿Es más difícil de conducir?',
				answer: 'No. Se va en fila detrás del guía y a un ritmo marcado. Si nunca has conducido uno, te lo explican todo en el rancho.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'safari',
		title: 'Safari dominicano',
		summary:
			'El campo dominicano en camión safari: plantación de cacao y café, casa típica, paseo por un pueblo y baño en la playa.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Recorrido por el campo en camión abierto',
			'Plantación de cacao y café',
			'Casa típica con degustación',
			'Baño en la playa',
		],
		price: 55,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 35, fromAge: 3, toAge: 11 },
		deposit: 15,
		durationCategory: 'half-day',
		durationHours: 5,
		days: mondayToSaturday,
		pickupFrom: '07:30',
		pickupTo: '08:00',
		returnAt: '13:30',
		meetingPoint: 'Salida en camión safari desde tu hotel',
		pickupFees: inlandActivityFees,
		includes: [
			'Camión safari con guía',
			'Visita a una plantación de cacao y café',
			'Degustación de café, cacao, fruta y mamajuana',
			'Parada en la playa',
			'Agua y refrescos',
		],
		excludes: ['Almuerzo', 'Compras en la plantación', 'Propinas'],
		itinerary: [
			{ time: '07:45', title: 'Recogida en tu hotel', text: 'El camión safari pasa a buscarte.' },
			{ time: '08:45', title: 'Paseo por un pueblo', text: 'Parada en un pueblo del interior para ver el día a día lejos de los hoteles.' },
			{ time: '09:45', title: 'Plantación de cacao y café', text: 'Cómo se cultiva y se tuesta, con degustación.' },
			{ time: '10:45', title: 'Casa típica', text: 'Fruta, mamajuana y charla con la familia que vive allí.' },
			{ time: '11:45', title: 'Playa', text: 'Baño y tiempo libre antes de volver.' },
		],
		bring: ['Ropa cómoda', 'Traje de baño', 'Toalla', 'Protector solar', 'Efectivo para compras'],
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿El camión es cómodo?',
				answer: 'Es un camión abierto con bancos y techo. Hay tramos de camino de tierra, así que se mueve bastante.',
			},
			{
				question: '¿Es buena opción con niños?',
				answer: 'Sí, es de las actividades más tranquilas de aventura y los niños pagan menos.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'parasailing',
		title: 'Parasailing en Bávaro',
		summary:
			'Vuelo en parasailing sobre la playa de Bávaro, solo o en pareja, de 10 a 15 minutos, saliendo en lancha desde la orilla.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Vuelo de 10 a 15 minutos sobre el mar',
			'Solo o en pareja',
			'Vistas de toda la costa de Bávaro',
			'Despegue y aterrizaje en la plataforma de la lancha',
		],
		price: 60,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 15,
		durationCategory: 'half-day',
		durationHours: 2,
		days: everyDay,
		pickupFrom: '09:00',
		pickupTo: '09:30',
		returnAt: '12:00',
		meetingPoint: 'Playa de Bávaro',
		pickupFees: beachActivityFees,
		includes: ['Vuelo de 10 a 15 minutos', 'Lancha y tripulación', 'Chaleco y arnés', 'Instrucciones de seguridad'],
		excludes: ['Fotos y vídeo del vuelo', 'Propinas'],
		itinerary: [
			{ time: '09:15', title: 'Recogida en tu hotel', text: 'Traslado a la playa de Bávaro.' },
			{ time: '09:45', title: 'Instrucciones', text: 'Te ponen el arnés y te explican cómo es el despegue.' },
			{ time: '10:00', title: 'Salida en lancha', text: 'La lancha se aleja de la orilla hasta la zona de vuelo.' },
			{ time: '10:15', title: 'Vuelo', text: 'Mientras vuela uno, el resto del grupo espera en la lancha.' },
			{ time: '11:30', title: 'Regreso', text: 'Vuelta a la playa y a tu hotel.' },
		],
		bring: ['Traje de baño', 'Gafas de sol con cinta', 'Protector solar', 'Toalla'],
		minAge: 6,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Hay límite de peso?',
				answer: 'Sí. En pareja, entre los dos no pueden pasar de unos 180 kg, y los niños vuelan siempre con un adulto.',
			},
			{
				question: '¿Da vértigo?',
				answer: 'Se sube despacio y arriba la sensación es de mucha calma. Si te pones nervioso, avisa a la tripulación y bajan el cable.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'speed-boat',
		title: 'Speed boat en Bávaro',
		summary:
			'Conduce tu propia lancha rápida en pareja por la costa de Bávaro y para a hacer snorkel en el arrecife. Equipo y guía incluidos.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Lancha rápida que conduces tú, en pareja',
			'Ruta por la costa de Bávaro detrás del guía',
			'Parada de snorkel en el arrecife',
			'Equipo de snorkel incluido',
		],
		price: 40,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 10,
		durationCategory: 'half-day',
		durationHours: 3,
		days: everyDay,
		pickupFrom: '08:30',
		pickupTo: '09:00',
		returnAt: '12:30',
		meetingPoint: 'Playa de Bávaro',
		pickupFees: beachActivityFees,
		includes: ['Lancha rápida para dos personas', 'Chaleco salvavidas', 'Equipo de snorkel', 'Guía en lancha', 'Agua y refrescos'],
		excludes: ['Fotos y vídeos', 'Propinas'],
		itinerary: [
			{ time: '08:45', title: 'Recogida en tu hotel', text: 'Traslado a la playa de Bávaro.' },
			{ time: '09:15', title: 'Instrucciones', text: 'Te explican los mandos y las señales del guía.' },
			{ time: '09:30', title: 'Ruta en lancha', text: 'Navegas en fila por la costa, a la velocidad que marca el guía.' },
			{ time: '10:15', title: 'Snorkel en el arrecife', text: 'Parada para ver peces y corales cerca de la orilla.' },
			{ time: '11:15', title: 'Vuelta a la playa', text: 'Regreso en lancha y traslado a tu hotel.' },
		],
		bring: ['Traje de baño', 'Gafas de sol con cinta', 'Protector solar biodegradable', 'Toalla'],
		minAge: 5,
		ageNote: 'Para conducir la lancha hay que tener 18 años.',
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Hace falta experiencia para conducir la lancha?',
				answer: 'No. Te explican los mandos en la playa y vas detrás del guía, que marca la ruta y la velocidad.',
			},
			{
				question: '¿Y si voy solo?',
				answer: 'Puedes llevar una lancha tú solo con un suplemento, o compartirla con otra persona del grupo.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'seaquarium',
		title: 'Seaquarium',
		summary:
			'Caminata bajo el mar con casco en Cabeza de Toro, entre peces y corales, sin necesidad de saber bucear. Después, snorkel y tiempo libre.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Caminas por el fondo del mar con un casco de aire',
			'No hace falta saber bucear',
			'Peces tropicales a tu alrededor',
			'Snorkel y tiempo libre en la plataforma',
		],
		price: 89,
		priceUnit: 'por adulto',
		pricePer: 'person',
		childPrice: { amount: 69, fromAge: 8, toAge: 11 },
		deposit: 20,
		durationCategory: 'half-day',
		durationHours: 4,
		days: everyDay,
		pickupFrom: '08:00',
		pickupTo: '08:30',
		returnAt: '13:00',
		meetingPoint: 'Base en la playa de Cabeza de Toro',
		pickupFees: inlandActivityFees,
		includes: ['Caminata submarina con casco, de unos 25 minutos', 'Instructor en el agua', 'Barco a la plataforma', 'Equipo de snorkel', 'Refrescos'],
		excludes: ['Fotos y vídeo bajo el agua', 'Propinas'],
		itinerary: [
			{ time: '08:15', title: 'Recogida en tu hotel', text: 'Traslado a la base de Cabeza de Toro.' },
			{ time: '09:00', title: 'Registro y charla', text: 'Te explican cómo funciona el casco y las señales bajo el agua.' },
			{ time: '09:30', title: 'Barco a la plataforma', text: 'Trayecto corto hasta la plataforma sobre el arrecife.' },
			{ time: '10:00', title: 'Caminata bajo el mar', text: 'Bajas por una escalera y caminas con el instructor entre peces y corales.' },
			{ time: '10:45', title: 'Snorkel y tiempo libre', text: 'Baño y descanso en la plataforma antes de volver.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Protector solar biodegradable', 'Muda de ropa'],
		minAge: 8,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Puedo llevar gafas graduadas?',
				answer: 'Sí. El casco mantiene la cabeza dentro de una burbuja de aire, así que puedes bajar con tus gafas y el pelo casi no se moja.',
			},
			{
				question: '¿Y si tengo claustrofobia?',
				answer: 'El casco está abierto por abajo y puedes subir cuando quieras. Si te agobian los espacios cerrados, prueba primero en la escalera.',
			},
		],
	},
	{
		destinationId: 'aventura',
		tourSlug: 'buggies-bayahibe',
		title: 'Buggies en Bayahibe',
		summary:
			'Ruta en buggy por el campo cerca de Bayahibe, entre cañaverales y caminos de tierra, con baño en un río o playa y parada en una casa típica.',
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		highlights: [
			'Buggy por caminos de tierra entre cañaverales',
			'Baño en un río o en la playa, según el día',
			'Casa típica con café y cacao',
			'Buena opción si te hospedas en Bayahibe',
		],
		price: 50,
		priceUnit: 'por persona en buggy doble',
		pricePer: 'person',
		deposit: 15,
		durationCategory: 'half-day',
		durationHours: 5,
		days: mondayToSaturday,
		pickupFrom: '07:30',
		pickupTo: '08:00',
		returnAt: '13:30',
		meetingPoint: 'Rancho cerca de Bayahibe',
		pickupFees: roadTripFees,
		includes: ['Buggy doble con casco', 'Guía durante la ruta', 'Parada de baño en río o playa', 'Degustación de café y cacao', 'Agua'],
		excludes: ['Pañuelo para el polvo', 'Fotos y vídeos', 'Propinas'],
		itinerary: [
			{ time: '07:45', title: 'Recogida en tu hotel', text: 'Viaje hasta el rancho, cerca de Bayahibe.' },
			{ time: '09:15', title: 'Casco e instrucciones', text: 'Te explican el buggy y sales detrás del guía.' },
			{ time: '09:45', title: 'Ruta por el campo', text: 'Caminos de tierra entre cañaverales y fincas.' },
			{ time: '10:30', title: 'Parada de baño', text: 'Río o playa de la zona, según cómo esté el día.' },
			{ time: '11:15', title: 'Casa típica', text: 'Café y cacao antes de volver al rancho.' },
		],
		bring: buggyBring,
		minAge: 5,
		ageNote: drivingAgeNote,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Qué diferencia hay con los buggies de Macao?',
				answer: 'El paisaje: aquí se va entre cañaverales y campo abierto, con menos barro, y la parada de baño es en un río o una playa de la zona de Bayahibe.',
			},
			{
				question: '¿Me recogen si me hospedo en Bayahibe?',
				answer: 'Sí, y al estar cerca del rancho el trayecto es más corto. Indica tu hotel al reservar.',
			},
		],
	},
	{
		destinationId: 'fiesta',
		tourSlug: 'coco-bongo',
		title: 'Coco Bongo',
		summary:
			'Entrada al espectáculo de Coco Bongo en Punta Cana con barra libre nacional y transporte de ida y vuelta desde tu hotel.',
		imageAlt: 'Público bailando en una discoteca con luces moradas y bolas de espejos',
		highlights: [
			'Espectáculo con acróbatas, música en vivo y personajes de cine',
			'Barra libre de bebidas nacionales',
			'Transporte de ida y vuelta',
			'Fiesta hasta la madrugada',
		],
		price: 85,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 25,
		durationCategory: 'night',
		durationHours: 5,
		days: ['wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
		pickupFrom: '21:30',
		pickupTo: '22:00',
		returnAt: '03:00',
		meetingPoint: 'Coco Bongo, en Downtown Punta Cana',
		pickupFees: roadTripFees,
		includes: ['Entrada general a Coco Bongo', 'Barra libre nacional', 'Transporte de ida y vuelta', 'Asistente durante el traslado'],
		excludes: ['Mesas y zonas VIP', 'Bebidas premium', 'Propinas'],
		itinerary: [
			{ time: '21:45', title: 'Recogida en tu hotel', text: 'Traslado a Downtown Punta Cana.' },
			{ time: '22:30', title: 'Entrada', text: 'Acceso a la sala y primera ronda en la barra.' },
			{ time: '23:00', title: 'Espectáculo', text: 'Unas tres horas de números sobre el escenario y por encima del público.' },
			{ time: '02:00', title: 'Fiesta', text: 'Sigue la música hasta la hora de volver.' },
			{ time: '02:30', title: 'Regreso', text: 'Traslado de vuelta a tu hotel.' },
		],
		bring: nightBring,
		minAge: 18,
		pregnancy: 'allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Hay código de vestimenta?',
				answer: 'No hace falta ir de gala, pero no se entra con chanclas ni ropa de playa. Los hombres no pueden entrar con camiseta sin mangas.',
			},
			{
				question: '¿Piden documento en la entrada?',
				answer: 'Sí, para comprobar la edad. Lleva el pasaporte o una copia en el móvil.',
			},
		],
	},
	{
		destinationId: 'fiesta',
		tourSlug: 'imagine-cave',
		title: 'Imagine Cave',
		summary:
			'Noche en Imagine, una discoteca dentro de una cueva natural, con entrada y transporte desde tu hotel. Sale viernes y sábados.',
		imageAlt: 'Público bailando en una discoteca con luces moradas y bolas de espejos',
		highlights: [
			'Discoteca dentro de una cueva natural',
			'Varias salas con música distinta',
			'Entrada y transporte incluidos',
			'Buen plan para grupos de amigos',
		],
		price: 40,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 10,
		durationCategory: 'night',
		durationHours: 5,
		days: ['friday', 'saturday'],
		pickupFrom: '22:00',
		pickupTo: '22:30',
		returnAt: '03:00',
		meetingPoint: 'Discoteca Imagine, a unos 20 minutos de Bávaro',
		pickupFees: roadTripFees,
		includes: ['Entrada a Imagine', 'Acceso a todas las salas', 'Transporte de ida y vuelta', 'Asistente durante el traslado'],
		excludes: ['Bebidas', 'Zonas VIP', 'Propinas'],
		itinerary: [
			{ time: '22:15', title: 'Recogida en tu hotel', text: 'Traslado a la cueva.' },
			{ time: '22:45', title: 'Llegada a Imagine', text: 'Entrada por el túnel de roca hasta las salas.' },
			{ time: '23:00', title: 'Fiesta en las salas', text: 'Cada sala tiene su música, y puedes moverte entre ellas toda la noche.' },
			{ time: '02:30', title: 'Regreso', text: 'Traslado de vuelta a tu hotel.' },
		],
		bring: nightBring,
		minAge: 18,
		pregnancy: 'not-allowed',
		wheelchair: false,
		faqs: [
			{
				question: '¿Están incluidas las bebidas?',
				answer: 'No. La entrada da acceso a todas las salas y las bebidas se pagan dentro. Se puede añadir barra libre con un suplemento.',
			},
			{
				question: '¿Hace calor dentro de la cueva?',
				answer: 'Menos de lo que parece, porque la roca mantiene el aire fresco. En las salas llenas sí se nota el calor de la gente.',
			},
		],
	},
	{
		destinationId: 'fiesta',
		tourSlug: 'party-boat',
		title: 'Party boat en Bávaro',
		summary:
			'Fiesta en barco por la costa de Bávaro al atardecer, con música, barra libre y parada para bañarte en la piscina natural.',
		imageAlt: 'Público bailando en una discoteca con luces moradas y bolas de espejos',
		highlights: [
			'Música y animación a bordo',
			'Barra libre de bebidas nacionales',
			'Baño en la piscina natural',
			'Atardecer desde el mar',
		],
		price: 55,
		priceUnit: 'por persona',
		pricePer: 'person',
		deposit: 15,
		durationCategory: 'night',
		durationHours: 4,
		days: ['tuesday', 'thursday', 'saturday'],
		pickupFrom: '16:30',
		pickupTo: '17:00',
		returnAt: '21:00',
		meetingPoint: 'Playa de Bávaro',
		pickupFees: beachActivityFees,
		includes: ['Paseo en barco de unas 3 horas', 'Barra libre nacional', 'Parada en la piscina natural', 'DJ y animación', 'Picoteo a bordo'],
		excludes: ['Cena', 'Fotos', 'Propinas'],
		itinerary: [
			{ time: '16:45', title: 'Recogida en tu hotel', text: 'Traslado a la playa de Bávaro.' },
			{ time: '17:15', title: 'Embarque', text: 'Subes al barco y empieza la música.' },
			{ time: '17:45', title: 'Piscina natural', text: 'Parada para bañarte con la música sonando desde el barco.' },
			{ time: '18:30', title: 'Atardecer', text: 'El barco sigue por la costa mientras cae el sol.' },
			{ time: '20:15', title: 'Desembarco', text: 'Vuelta a la playa y traslado a tu hotel.' },
		],
		bring: ['Traje de baño', 'Toalla', 'Algo de abrigo para la vuelta', 'Pasaporte o documento de identidad', 'Efectivo para propinas'],
		minAge: 18,
		pregnancy: 'limited',
		pregnancyMaxMonths: 6,
		wheelchair: false,
		faqs: [
			{
				question: '¿Se puede ir en traje de baño?',
				answer: 'Sí, es lo más cómodo porque hay parada para bañarse. Lleva algo de abrigo para la vuelta, cuando ya es de noche.',
			},
			{
				question: '¿Por qué hay que tener 18 años?',
				answer: 'Porque hay barra libre de alcohol a bordo durante todo el paseo.',
			},
		],
	},
];

const provisionalUpdatedAt = new Date('2026-09-26');

function entryFor(destination: Destination, tour: Tour) {
	const entry = entries.find((candidate) => candidate.destinationId === destination.id && candidate.tourSlug === tour.slug);
	if (!entry) throw new Error(`Faltan los datos de la excursión ${destination.id}/${tour.slug}`);
	return entry;
}

export const tourDetails: TourDetails[] = destinations.flatMap((destination) =>
	destination.tours.map((tour) => {
		const { destinationId: _destinationId, tourSlug: _tourSlug, ...details } = entryFor(destination, tour);
		return {
			destination,
			tour,
			productKey: `${destination.id}/${tour.slug}`,
			shortName: tour.name,
			images: [],
			bestFor: '',
			includesSummary: '',
			...details,
			updatedAt: provisionalUpdatedAt,
		};
	}),
);

for (const destination of destinations) {
	const lowest = Math.min(
		...tourDetails.filter((details) => details.destination.id === destination.id && details.pricePer === 'person').map((details) => details.price),
	);
	if (lowest !== destination.fromPrice) throw new Error(`El precio desde de ${destination.name} no coincide con su excursión más barata`);
}

export function findTourDetails(destinationId: DestinationId, tourSlug: string) {
	const details = tourDetails.find((candidate) => candidate.destination.id === destinationId && candidate.tour.slug === tourSlug);
	if (!details) throw new Error(`Unknown tour: ${destinationId}/${tourSlug}`);
	return details;
}

export const destinationTourDetails = (destination: Destination) => tourDetails.filter((details) => details.destination.id === destination.id);

export const siblingTourDetails = (details: TourDetails) => destinationTourDetails(details.destination).filter((candidate) => candidate !== details);

export const tourDetailsHref = (details: TourDetails) => tourHref(details.destination, details.tour);

export const tourProductKey = (details: TourDetails) => `${details.destination.id}/${details.tour.slug}`;

export const tourPhoto = (details: TourDetails): ImageMetadata | undefined =>
	tourImage(details.destination, details.tour) ?? destinationImage(details.destination);

export const tourCountText = (count: number) => `${count} ${count === 1 ? 'excursión' : 'excursiones'}`;

export const toursByDuration = Object.fromEntries(
	durationCategories.map((category) => [category, tourDetails.filter((details) => details.durationCategory === category)]),
) as Record<DurationCategory, TourDetails[]>;

export const pickupIncluded = (details: TourDetails) => details.pickupFees.bavaro === 0;

export const lowestPickupFee = (details: TourDetails) => Math.min(...Object.values(details.pickupFees).filter((fee) => fee > 0));

const highestPickupFee = (details: TourDetails) => Math.max(...Object.values(details.pickupFees));

export const pickupFeeLabel = (fee: number) => (fee === 0 ? 'Sin cargo' : `${formatPrice(fee)} por persona`);

export const pickupLabel = (details: TourDetails) =>
	pickupIncluded(details) ? 'Incluida desde Bávaro y Arena Gorda' : `Aparte, desde ${formatPrice(lowestPickupFee(details))} por persona`;

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

export const tourSeoTitle = (details: TourDetails) => {
	const needsPlace = details.destination.kind !== 'place' && !placeNames.some((place) => details.title.includes(place));
	return `${details.title}${needsPlace ? ' en Punta Cana' : ''}: precio y qué incluye`;
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

const weekdayNames: Record<Weekday, { one: string; many: string }> = {
	monday: { one: 'lunes', many: 'lunes' },
	tuesday: { one: 'martes', many: 'martes' },
	wednesday: { one: 'miércoles', many: 'miércoles' },
	thursday: { one: 'jueves', many: 'jueves' },
	friday: { one: 'viernes', many: 'viernes' },
	saturday: { one: 'sábado', many: 'sábados' },
	sunday: { one: 'domingo', many: 'domingos' },
};

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function dayRun(days: Weekday[]) {
	const set = new Set(days);
	const starts = weekdays.filter((day, index) => set.has(day) && !set.has(weekdays[(index + 6) % 7]));
	if (days.length < 3 || starts.length !== 1) return undefined;

	const first = weekdays.indexOf(starts[0]);
	return { first: starts[0], last: weekdays[(first + set.size - 1) % 7] };
}

type ScheduleShape = { kind: 'daily' } | { kind: 'run'; first: string; last: string } | { kind: 'list'; names: string };

function scheduleShape(days: Weekday[]): ScheduleShape {
	if (new Set(days).size === weekdays.length) return { kind: 'daily' };

	const run = dayRun(days);
	if (run) return { kind: 'run', first: weekdayNames[run.first].one, last: weekdayNames[run.last].one };

	const names = weekdays.filter((day) => days.includes(day)).map((day) => weekdayNames[day].many);
	return { kind: 'list', names: listFormat.format(names) };
}

export function scheduleLabel(days: Weekday[]) {
	const shape = scheduleShape(days);
	if (shape.kind === 'daily') return 'Todos los días';
	if (shape.kind === 'run') return `De ${shape.first} a ${shape.last}`;
	return capitalize(shape.names);
}

export function scheduleWhen(days: Weekday[]) {
	const shape = scheduleShape(days);
	if (shape.kind === 'daily') return 'todos los días';
	if (shape.kind === 'run') return `de ${shape.first} a ${shape.last}`;
	return `los ${shape.names}`;
}

export const scheduleSentence = (days: Weekday[]) => `sale ${scheduleWhen(days)}`;

export const weekdayLabel = (day: Weekday) => capitalize(weekdayNames[day].one);

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

const durationPhrases: Record<DurationCategory, string> = {
	'full-day': 'Es un día completo, de unas',
	'half-day': 'Es de medio día, unas',
	night: 'Es un plan de noche, de unas',
};

export function tourAnswer(details: TourDetails) {
	const port = details.port && ` desde el puerto de ${departurePorts[details.port].port}`;
	const pickup = pickupIncluded(details)
		? 'Incluye la recogida en hoteles de Bávaro y Arena Gorda, y desde otras zonas se suma un cargo extra.'
		: `La recogida en el hotel se paga aparte, desde ${formatPrice(lowestPickupFee(details))} por persona según tu zona.`;

	return `${details.title} cuesta desde ${priceLabel(details)}. ${durationPhrases[details.durationCategory]} ${details.durationHours} horas, y ${scheduleSentence(details.days)}${port ?? ''}. ${pickup}`;
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

function accessibilityAnswer(details: TourDetails) {
	if (details.pregnancy === 'not-allowed') {
		return details.wheelchair
			? 'No es apta para embarazadas, pero sí es accesible en silla de ruedas.'
			: 'No es apta para embarazadas ni accesible en silla de ruedas.';
	}

	const pregnancy =
		details.pregnancy === 'allowed' ? 'Sí, es apta para embarazadas' : `Admite embarazadas hasta los ${details.pregnancyMaxMonths} meses`;
	return details.wheelchair ? `${pregnancy} y es accesible en silla de ruedas.` : `${pregnancy}, pero no es accesible en silla de ruedas.`;
}

function pickupAnswer(details: TourDetails) {
	if (pickupIncluded(details)) {
		return `Sí, desde hoteles de Bávaro y Arena Gorda sin cargo extra. Desde otras zonas se suma hasta ${formatPrice(highestPickupFee(details))} por persona. Te recogemos ${lowerFirst(pickupWindowLabel(details))}.`;
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
		{ question: '¿Pueden ir embarazadas o personas en silla de ruedas?', answer: accessibilityAnswer(details) },
		weatherFaq,
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
