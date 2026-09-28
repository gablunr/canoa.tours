import type { Faq } from '../booking/faq';
import type { PillarContent } from './types';
import {
	clockLabel,
	fromPriceOf,
	guidePath,
	link,
	pillarPath,
	returnLabel,
	scheduleSentence,
	scheduleWhen,
	tourOf,
	weekdayRows,
} from './kit';

const cocoBongo = tourOf('fiesta/coco-bongo');
const imagine = tourOf('fiesta/imagine-cave');
const partyBoat = tourOf('fiesta/party-boat');

const lower = (label: string) => label.toLowerCase();
const lowerFirst = (label: string) => `${label.charAt(0).toLowerCase()}${label.slice(1)}`;

const nightReturn =
	cocoBongo.returnAt === imagine.returnAt
		? `De Coco Bongo y de Imagine vuelves ${lower(returnLabel(cocoBongo))}`
		: `De Coco Bongo vuelves ${lower(returnLabel(cocoBongo))} y de Imagine, ${lower(returnLabel(imagine))}`;

const boatAndCocoBongoDays = cocoBongo.days.filter((day) => partyBoat.days.includes(day));
const sameNightFaq: Faq[] =
	boatAndCocoBongoDays.length > 0
		? [
				{
					question: '¿Puedo hacer el party boat y Coco Bongo la misma noche?',
					answer: `Sí, ${scheduleWhen(boatAndCocoBongoDays)}, que es cuando coinciden, pero va justo: la recogida de Coco Bongo empieza a las ${clockLabel(cocoBongo.pickupFrom)}, poco después de que el barco te deje en el hotel. Da para bañarte y cambiarte, y poco más.`,
				},
			]
		: [];

export const pillar: PillarContent = {
	seoTitle: 'Fiesta en Punta Cana: Coco Bongo, Imagine y party boat',
	description: `Fiesta en Punta Cana desde ${fromPriceOf('fiesta')}: Coco Bongo, Imagine y party boat con traslado desde tu hotel. Qué noche sale cada uno y qué ponerte.`,
	heading: 'Fiesta en Punta Cana',
	imageAlt: 'Público bailando en una discoteca con luces moradas y bolas de espejos',
	comparisonTitle: 'Coco Bongo, Imagine o party boat',
	overviewTitle: 'Qué esperar de una noche de fiesta en Punta Cana',
	sections: [
		{
			title: 'Qué noche hay fiesta en Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: 'Cada excursión nocturna sale sus propios días, así que lo más práctico es partir de la noche que tienes libre.',
				},
				{ type: 'table', head: ['Día', 'Qué hay esa noche'], rows: weekdayRows('fiesta') },
			],
		},
		{
			title: 'Dónde están las discotecas y el barco',
			blocks: [
				{
					type: 'paragraph',
					html: `Coco Bongo está en Downtown Punta Cana, el centro comercial de la carretera Barceló, en Bávaro. Imagine es una discoteca dentro de una cueva natural, a unos 15 o 20 minutos de los hoteles de Bávaro, con varias salas y una música distinta en cada una. La fiesta en barco sale de la ${lowerFirst(partyBoat.meetingPoint)}, así que desde los hoteles de esa zona el traslado es corto.`,
				},
			],
		},
		{
			title: 'Qué ponerse y qué documento llevar',
			blocks: [
				{
					type: 'paragraph',
					html: 'En Coco Bongo no hace falta ir de gala, pero no dejan pasar con chanclas, ropa de playa ni camiseta sin mangas. Imagine pide ropa arreglada sin llegar a formal, lo que allí llaman «smart casual». Para las dos noches de discoteca, zapato cerrado. Al barco se va en traje de baño, con algo de abrigo para la vuelta, que ya es de noche.',
				},
				{
					type: 'paragraph',
					html: 'En la entrada comprueban la edad, así que lleva el pasaporte o tu documento de identidad.',
				},
			],
		},
		{
			title: 'Salir de noche en Bávaro sin perder la mañana',
			blocks: [
				{
					type: 'paragraph',
					html: `Coco Bongo e Imagine te devuelven al hotel de madrugada, y las excursiones en barco a las islas recogen muy temprano, así que mejor no poner una a la mañana siguiente de la otra. Con el party boat pasa lo contrario: recoge por la tarde y te deja la mañana para una ${link(pillarPath('aventura'), 'excursión de aventura')} de medio día. Si estás armando la semana entera, mira ${link(guidePath('cuantas-excursiones-hacer-en-punta-cana'), 'cuántas excursiones caben en una semana')}.`,
				},
			],
		},
	],
	facts: [
		{ label: 'Coco Bongo', value: 'Downtown Punta Cana, en Bávaro' },
		{ label: 'Imagine', value: 'En una cueva, a 15 o 20 minutos de Bávaro' },
		{ label: 'Recogida del party boat', value: `Desde las ${clockLabel(partyBoat.pickupFrom)}` },
		{ label: 'Qué ponerse', value: 'Zapato cerrado, nada de ropa de playa' },
		{ label: 'Documento', value: 'Pasaporte o documento de identidad' },
	],
	faqs: [
		{
			question: '¿Coco Bongo o Imagine: cuál elijo?',
			answer: 'Depende de si quieres ver algo o solo bailar. Coco Bongo empieza con un espectáculo de unas tres horas, con acróbatas, música en vivo y personajes de cine, y después sigue como discoteca. Imagine es solo discoteca: se baila desde que entras hasta la vuelta.',
		},
		{
			question: '¿Cuál es el mejor día para salir de fiesta en Punta Cana?',
			answer: 'En Coco Bongo suele haber más ambiente los viernes y sábados, y menos gente a mitad de semana. En el party boat importa más el mes que el día: de noviembre a marzo el sol se pone en la primera mitad del paseo, y hacia junio, ya en la segunda.',
		},
		{
			question: '¿A qué hora y cómo vuelvo al hotel?',
			answer: `En el mismo traslado de la ida. ${nightReturn}, con un asistente que viaja con el grupo. En el party boat, el traslado te espera en la playa al desembarcar y llegas al hotel ${lower(returnLabel(partyBoat))}.`,
		},
		...sameNightFaq,
		{
			question: '¿Qué pasa si llueve la noche del party boat?',
			answer: `Coco Bongo e Imagine están a cubierto y la lluvia no las cambia. El barco sí depende del mar, y como ${scheduleSentence(partyBoat.days)}, resérvalo para las primeras noches del viaje: si no puede salir, te quedan otras para moverlo.`,
		},
	],
	faqTitle: 'Preguntas frecuentes sobre la fiesta en Punta Cana',
	cta: {
		title: '¿Qué noche te va mejor?',
		text: 'Si nos pasas las noches que tienes libres y dónde te hospedas, te decimos qué fiesta cae en cada una.',
		whatsappMessage: 'Hola, quiero salir de fiesta el [fecha] y no sé qué elegir',
	},
	updatedAt: new Date('2026-09-27'),
};
