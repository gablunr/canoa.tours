import type { QuestionAndAnswer } from '../../lib/seo/structured-data';
import { cancellationInsurancePriceLabel, cancellationNoticeLabel, maxDateChangesLabel } from '../booking/booking-policy';
import { departurePorts, distanceLabel } from '../tours/departure-ports';
import { destinationHref, findDestination, type DestinationId } from '../tours/destinations';
import { routes } from '../site/routes';

export type GuideBlock =
	| { type: 'paragraph'; html: string }
	| { type: 'list'; items: string[] }
	| { type: 'table'; head: string[]; rows: string[][] };

export interface GuideSection {
	title: string;
	blocks: GuideBlock[];
}

export interface GuideTour {
	destinationId: DestinationId;
	tourSlug: string;
	note: string;
}

export interface GuideContent {
	answer: string;
	sections: GuideSection[];
	faqs: QuestionAndAnswer[];
	tour?: GuideTour;
}

const link = (href: string, label: string) => `<a href="${href}">${label}</a>`;

const destinationLink = (destinationId: DestinationId) => {
	const destination = findDestination(destinationId);
	return link(destinationHref(destination), destination.name);
};

const saona = departurePorts.saona;

export const guideContents: Record<string, GuideContent> = {
	'que-llevar-a-isla-saona': {
		answer: `Bañador puesto, protector solar, gafas de sol, gorra, toalla y efectivo en billetes pequeños para lo que no incluye el tour. Es un día completo: sales temprano hacia el puerto de ${saona.port}, a unos ${distanceLabel(saona)} de Punta Cana, y pasas casi todo el día entre el barco y la playa.`,
		sections: [
			{
				title: 'Lo imprescindible en la mochila',
				blocks: [
					{
						type: 'paragraph',
						html: 'Viaja ligero. En el barco hay poco sitio para bolsas y en la playa vas a querer tener las cosas a mano, así que basta con una mochila pequeña o una bolsa de playa.',
					},
					{
						type: 'list',
						items: [
							'Protector solar resistente al agua. En el mar el sol pega más de lo que parece.',
							'Gafas de sol y una gorra o un sombrero que no se vuele en la lancha.',
							'Una toalla, salvo que la ficha de tu excursión diga que la incluye.',
							'Una funda estanca para el móvil, sobre todo si vas a hacer fotos en la piscina natural.',
							'Pastillas para el mareo si sueles marearte en barco. Tómalas antes de embarcar.',
						],
					},
				],
			},
			{
				title: 'Qué ropa ponerte',
				blocks: [
					{
						type: 'paragraph',
						html: 'Sal del hotel con el bañador puesto y ropa ligera encima. En la playa no siempre hay dónde cambiarse, y así te ahorras buscar un baño al llegar.',
					},
					{
						type: 'paragraph',
						html: 'Para los pies, sandalias que se puedan mojar. Al bajar del barco en la playa es normal meter los pies en el agua. Una camiseta fina de manga larga ayuda en los trayectos en lancha, cuando el sol y el viento se notan más.',
					},
				],
			},
			{
				title: 'Cuánto efectivo llevar',
				blocks: [
					{
						type: 'paragraph',
						html: `El precio del tour no incluye todo. La recogida en tu hotel se paga aparte según tu zona, y lo ves en ${link(routes.pickupZones, 'zonas de recogida')}. Una vez en la isla, estos son los gastos más habituales:`,
					},
					{
						type: 'table',
						head: ['Gasto', 'Cuándo aparece'],
						rows: [
							['Bebidas que no entran en el tour', 'En los chiringuitos de la playa'],
							['Fotos y vídeo del día', 'Al final de la excursión, si quieres comprarlos'],
							['Propinas', 'Para el guía y la tripulación, si quedaste contento'],
							['Recuerdos', 'En los puestos de la playa'],
						],
					},
					{
						type: 'paragraph',
						html: 'Lleva dólares o pesos en billetes pequeños. En la playa no siempre aceptan tarjeta y cuesta que tengan cambio.',
					},
				],
			},
			{
				title: 'Qué es mejor dejar en el hotel',
				blocks: [
					{
						type: 'list',
						items: [
							'Joyas y relojes que no quieras perder en el agua.',
							'Más dinero del que vas a gastar.',
							'Bolsos grandes o maletas: no hay dónde guardarlos a bordo.',
						],
					},
				],
			},
		],
		faqs: [
			{
				question: '¿Hace falta llevar comida?',
				answer: 'Normalmente no. La ficha de cada excursión indica si incluye almuerzo y bebidas, y con eso sabrás si te conviene llevar algo para picar en el autobús.',
			},
			{
				question: '¿Puedo ir a Isla Saona si estoy embarazada?',
				answer: 'Depende del tour. La excursión en catamarán es apta para embarazadas y la VIP 4 Playas las admite hasta los 6 meses. Cada ficha lo indica.',
			},
			{
				question: '¿Qué pasa si llueve el día de la excursión?',
				answer: 'Si el mal tiempo obliga a suspender el tour, la excursión pasa a la siguiente fecha en que se pueda hacer y te enviamos un ticket nuevo.',
			},
			{
				question: '¿La recogida en el hotel está incluida?',
				answer: 'En Isla Saona no. El transporte se cobra aparte según tu zona hotelera, porque hay clientes que se hospedan cerca del puerto y no lo necesitan.',
			},
		],
		tour: {
			destinationId: 'isla-saona',
			tourSlug: 'catamaran',
			note: 'Si es tu primera vez en Saona, el catamarán es la opción más sencilla: sale todos los días y es apta para embarazadas.',
		},
	},
	'cuantas-excursiones-hacer-en-punta-cana': {
		answer:
			'En una semana caben bien tres excursiones: dos de día completo y una de medio día o de noche. Más de dos días completos seguidos cansan, porque salen temprano y vuelves al hotel por la tarde.',
		sections: [
			{
				title: 'Cuántas caben sin agotarte',
				blocks: [
					{
						type: 'paragraph',
						html: `Las excursiones de día completo son ${destinationLink('isla-saona')}, ${destinationLink('samana')}, ${destinationLink('santo-domingo')} e ${destinationLink('isla-catalina')}. Ocupan la jornada entera, así que conviene dejar un día de playa entre una y otra.`,
					},
					{
						type: 'paragraph',
						html: `Las de ${link(destinationHref(findDestination('aventura')), 'aventura')}, como los buggies, el safari o el parasailing, caben en una mañana o una tarde. Las de ${link(destinationHref(findDestination('fiesta')), 'fiesta')}, como Coco Bongo o la fiesta en barco, son de noche y no te quitan tiempo de playa.`,
					},
				],
			},
			{
				title: 'Un plan para cada duración',
				blocks: [
					{
						type: 'table',
						head: ['Días de viaje', 'De día completo', 'De medio día o de noche'],
						rows: [
							['5 días', '1', '1 o 2'],
							['7 días', '2', '1 o 2'],
							['10 días', '3', '2'],
						],
					},
					{
						type: 'paragraph',
						html: 'Son planes pensados para que las excursiones no se coman el descanso. Si lo que quieres es ver todo lo posible, puedes sumar una de medio día más, pero no otra de día completo.',
					},
				],
			},
			{
				title: 'Cómo repartirlas',
				blocks: [
					{
						type: 'list',
						items: [
							'No reserves nada para el día que llegas. Entre el vuelo y el hotel, el primer día se va solo.',
							`Samaná solo sale jueves y sábados, así que si te interesa, colócala primero y organiza el resto alrededor.`,
							'No dejes una excursión para el último día. Si el mal tiempo obliga a moverla, pasa al siguiente día disponible y ya no te quedaría margen.',
							'Alterna: un día completo, un día de playa y después una actividad corta.',
						],
					},
				],
			},
		],
		faqs: [
			{
				question: '¿Conviene reservar todas las excursiones antes de llegar?',
				answer: 'Sí, sobre todo las de día completo. Los barcos y las actividades tienen plazas limitadas y se reservan con un anticipo; el resto se paga el día del tour.',
			},
			{
				question: '¿Puedo cambiar la fecha si cambian mis planes?',
				answer: `Con el seguro de cancelación (${cancellationInsurancePriceLabel} por persona) puedes cambiar la fecha hasta ${maxDateChangesLabel} o cancelar con reembolso completo hasta ${cancellationNoticeLabel} antes.`,
			},
			{
				question: '¿Qué excursión hago si solo tengo tiempo para una?',
				answer: 'Isla Saona es la más completa para una primera visita: barco, piscina natural y playa en un mismo día. Si prefieres algo corto, los buggies caben en medio día.',
			},
		],
	},
};

export const guideContent = (slug: string): GuideContent | undefined => guideContents[slug];

export const isGuidePublished = (slug: string) => slug in guideContents;
