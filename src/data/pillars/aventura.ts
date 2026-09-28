import type { PillarContent } from './types';
import { clockLabel, departurePorts, distanceLabel, formatPrice, fromPriceOf, guidePath, link, pillarPath, tourOf, toursOf } from './kit';

const buggies = tourOf('aventura/buggies');
const predator = tourOf('aventura/buggies-predator');
const speedBoat = tourOf('aventura/speed-boat');
const partyBoat = tourOf('fiesta/party-boat');

const whereRows = toursOf('aventura').map((details) => [
	details.title,
	details.tour.slug === 'safari' ? 'Por el campo, en camión desde tu hotel' : details.meetingPoint,
]);

export const pillar: PillarContent = {
	seoTitle: 'Excursiones de aventura en Punta Cana: precios',
	description: `Excursiones de aventura en Punta Cana desde ${fromPriceOf('aventura')}: buggies en Macao, safari, parasailing, speed boat y Seaquarium. Cuál elegir y qué llevar.`,
	heading: 'Excursiones de aventura en Punta Cana',
	imageAlt: 'Buggy levantando barro en un camino de tierra',
	comparisonTitle: 'Qué excursión de aventura elegir',
	overviewTitle: 'Qué esperar de las excursiones de aventura en Punta Cana',
	sections: [
		{
			title: 'Dónde se hace cada una',
			blocks: [
				{
					type: 'paragraph',
					html: `Las rutas de buggies de Macao salen de ranchos del extremo norte de la costa, entre Bávaro y Uvero Alto. La de Bayahibe va por campo abierto, tiene menos barro y queda a unos ${distanceLabel(departurePorts.saona)} de Bávaro por carretera.`,
				},
				{ type: 'table', head: ['Excursión', 'Dónde se hace'], rows: whereRows },
			],
		},
		{
			title: 'Buggies en Macao: 4x4 o Predator',
			blocks: [
				{
					type: 'paragraph',
					html: `El 4x4 y el Predator hacen la misma ruta y lo que cambia es el buggy. El Predator tiene más motor y la suspensión reforzada, así que los baches se notan menos, y cuesta ${formatPrice(predator.price - buggies.price)} más por persona.`,
				},
				{
					type: 'paragraph',
					html: 'A diferencia de una cuatrimoto, el buggy se maneja con volante y cinturón, dentro de una jaula que protege si vuelca. Es doble: uno maneja y el otro va de copiloto.',
				},
			],
		},
		{
			title: 'Qué ropa llevar',
			blocks: [
				{
					type: 'paragraph',
					html: 'A los buggies ve con ropa que no te importe manchar y calzado cerrado, porque vuelves lleno de barro. Lleva el traje de baño puesto para la cueva, una muda limpia en una bolsa y gafas de sol. El pañuelo para el polvo no va incluido; en el rancho lo venden.',
				},
				{
					type: 'paragraph',
					html: 'En las de mar basta el traje de baño, gafas de sol con cinta para que no se las lleve el viento y protector solar biodegradable, por el arrecife. Al safari, ropa cómoda, toalla y algo de efectivo si quieres comprar café o cacao.',
				},
			],
		},
		{
			title: 'Cuándo hacer excursiones de aventura en Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: 'De diciembre a abril es la época más seca y en los caminos hay más polvo, así que el pañuelo se agradece. De mayo a noviembre llueve más, casi siempre en chaparrones cortos, y los buggies vuelven con más barro. La temporada de huracanes va del 1 de junio al 30 de noviembre, con más actividad de agosto a octubre.',
				},
				{
					type: 'paragraph',
					html: `Para repartir la semana entre medios días y días completos, en ${link(guidePath('cuantas-excursiones-hacer-en-punta-cana'), 'cuántas excursiones hacer en una semana')} hay un plan para cada duración.`,
				},
			],
		},
	],
	facts: [
		{ label: 'Dónde se hacen', value: 'Macao, Bávaro y Bayahibe' },
		{ label: 'Buggy', value: 'Doble, con volante, cinturón y jaula' },
		{ label: 'Meses más secos', value: 'De diciembre a abril' },
		{ label: 'Temporada de huracanes', value: 'De junio a noviembre' },
	],
	faqs: [
		{
			question: '¿Hace falta licencia para conducir el buggy o la lancha?',
			answer: `${buggies.ageNote ?? ''} En la speed boat no piden licencia ni experiencia. ${speedBoat.ageNote ?? ''}`.trim(),
		},
		{
			question: '¿Puedo hacer dos excursiones de aventura en Punta Cana el mismo día?',
			answer: `Dos de aventura seguidas no caben, porque salen por la mañana y vuelven a la hora de comer. Una por la mañana sí encaja con un plan de tarde, como el party boat, que recoge desde las ${clockLabel(partyBoat.pickupFrom)}.`,
			link: { label: 'Excursiones de fiesta', href: pillarPath('fiesta') },
		},
		{
			question: '¿Parasailing o speed boat?',
			answer: 'Depende de si quieres mirar o manejar. En el parasailing vuelas colgado de un paracaídas sobre la costa de Bávaro, solo o en pareja, y despegas y aterrizas en la lancha. En la speed boat llevas tú el timón y te bajas a nadar en el arrecife.',
		},
		{
			question: '¿Hay que saber nadar para el Seaquarium?',
			answer: 'No. Caminas por el fondo, a unos 5 metros, con un casco que recibe aire desde la superficie y respiras como en tierra. Puedes bajar con tus lentes, y un instructor va contigo en el agua.',
		},
		{
			question: '¿Salen los buggies si llueve?',
			answer: 'Sí, salen con lluvia, y solo una tormenta fuerte suspende la ruta. En las de mar manda el viento: con rachas fuertes, el parasailing se retrasa o se cancela.',
		},
		{
			question: '¿Qué excursión de aventura va mejor con niños pequeños?',
			answer: 'El safari, porque nadie maneja y los niños van sentados en el camión entre parada y parada. Lleva traje de baño y toalla para ellos, que hay parada en la playa.',
		},
	],
	faqTitle: 'Preguntas frecuentes sobre excursiones de aventura',
	cta: {
		title: 'Arma tu mañana de aventura',
		text: 'Pásanos cuántos van y la edad de los niños, si los hay, y te proponemos la que mejor les encaja.',
		whatsappMessage: 'Hola, quiero hacer una excursión de aventura el [fecha] y no sé cuál elegir',
	},
	updatedAt: new Date('2026-09-27'),
};
