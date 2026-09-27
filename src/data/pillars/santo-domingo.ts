import type { PillarContent } from './types';
import { fromPriceOf, guidePath, scheduleWhen, tourOf } from './kit';

const clasica = tourOf('santo-domingo', 'clasica');
const vip = tourOf('santo-domingo', 'vip');

const minutesOf = (time: string) => {
	const [hours = 0, minutes = 0] = time.split(':').map(Number);
	return hours * 60 + minutes;
};
const stepMinutes = (title: string) => {
	const step = clasica.itinerary.find((candidate) => candidate.title === title);
	if (!step?.time) throw new Error(`Paso del itinerario sin hora en Santo Domingo Clásica: ${title}`);
	return minutesOf(step.time);
};
const hoursLabel = (minutes: number) => `${Math.floor(minutes / 60)} horas${minutes % 60 >= 30 ? ' y media' : ''}`;
const driveTime = hoursLabel(stepMinutes('Los Tres Ojos') - stepMinutes('Recogida en tu hotel'));
const cityTime = hoursLabel(stepMinutes('Regreso a Punta Cana') - stepMinutes('Los Tres Ojos'));

export const pillar: PillarContent = {
	seoTitle: 'Excursión a Santo Domingo desde Punta Cana: Clásica o VIP',
	description: `Excursión a Santo Domingo desde Punta Cana: la Zona Colonial y Los Tres Ojos en un día, desde ${fromPriceOf('santo-domingo')}. Compara la Clásica y la VIP.`,
	imageAlt: 'Fachada del Alcázar de Colón frente a una plaza empedrada en la Zona Colonial',
	comparisonTitle: 'Clásica o VIP: qué cambia',
	tours: {
		clasica: { bestFor: 'Primera visita a la capital y familias con niños', includesSummary: 'Los Tres Ojos, Zona Colonial a pie y almuerzo buffet' },
		vip: { bestFor: 'Quien prefiere un grupo reducido al autobús grande', includesSummary: 'Minibús, Los Tres Ojos, Zona Colonial y almuerzo' },
	},
	overviewTitle: 'Cómo es la excursión a Santo Domingo desde Punta Cana',
	sections: [
		{
			title: 'La Zona Colonial y Los Tres Ojos',
			blocks: [
				{
					type: 'paragraph',
					html: 'La Zona Colonial es el casco viejo de Santo Domingo, en la orilla oeste del río Ozama. Es la ciudad fundada por europeos más antigua de América que sigue habitada, y su Catedral Primada fue la primera del continente.',
				},
				{
					type: 'paragraph',
					html: 'Los Tres Ojos son cuevas de caliza abiertas al cielo, con lagos de agua dulce en el fondo. Se baja por escaleras, y al último lago se pasa en una balsa que avanza tirando de una cuerda.',
				},
			],
		},
		{
			title: 'Santo Domingo en un día desde Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: 'Sales temprano y la primera parada es Los Tres Ojos, que queda de camino: está en Santo Domingo Este, antes de cruzar el Ozama. Luego se pasa el río y la Zona Colonial se recorre a pie, unos 2 km por calles llanas desde la calle Las Damas hasta la Catedral. Después de comer tienes tiempo libre en la calle El Conde. A media tarde empieza la vuelta y llegas al hotel a la hora de cenar.',
				},
			],
		},
		{
			title: 'Qué ropa llevar a Santo Domingo',
			blocks: [
				{
					type: 'paragraph',
					html: 'Si entras en la Catedral Primada, te piden hombros y rodillas cubiertos: pantalón largo, falda hasta la rodilla o un pañuelo en la mochila. El empedrado es irregular, así que tenis o sandalias bien sujetas, nada de chanclas. El paseo cae en las horas de más sol y en la ciudad no llega la brisa de la playa: lleva gorra y protector.',
				},
			],
		},
		{
			title: 'Cuándo ir a Santo Domingo',
			blocks: [
				{
					type: 'paragraph',
					html: 'De diciembre a abril es la época más seca y algo más fresca. En mayo y de agosto a octubre llueve más del doble, y la temporada de huracanes va del 1 de junio al 30 de noviembre. Al ser un día de ciudad, un aguacero lo estropea menos que una excursión en barco.',
				},
			],
		},
	],
	facts: [
		{ label: 'Patrimonio Mundial', value: 'La Ciudad Colonial, desde 1990' },
		{ label: 'Catedral Primada', value: 'Consagrada en 1541' },
		{ label: 'Los Tres Ojos', value: '4 lagos, aunque el nombre diga 3' },
		{ label: 'Máximas medias', value: 'De 29 a 31 °C todo el año' },
	],
	faqs: [
		{
			question: '¿Cuánto se tarda de Punta Cana a Santo Domingo?',
			answer: `Son unos 190 km desde Bávaro por la autopista del Coral y la autovía del Este, 2 horas y media de carretera sin paradas. Con las recogidas por los hoteles, la ida dura unas ${driveTime}.`,
		},
		{
			question: '¿Vale la pena la excursión a Santo Domingo desde Punta Cana?',
			answer: `Pasas unas ${cityTime} en la ciudad y casi otras tantas en carretera, sumando ida y vuelta. Compensa si te interesa la historia o quieres ver algo de la isla que no sea playa. Si tienes pocos días y vienes a descansar, quizá no.`,
			link: { label: 'Cuántas excursiones hacer en una semana', href: guidePath('cuantas-excursiones-hacer-en-punta-cana') },
		},
		{
			question: '¿Qué días sale cada excursión a Santo Domingo?',
			answer: `La Clásica sale ${scheduleWhen(clasica.days)} y la VIP, ${scheduleWhen(vip.days)}. Los lunes cierran muchos museos de la ciudad, entre ellos el Alcázar de Colón, y los domingos la Catedral Primada no admite visitas turísticas.`,
		},
		{
			question: '¿Qué se puede comprar en la Zona Colonial?',
			answer: 'En la calle El Conde y sus alrededores hay muchas tiendas de ámbar y de larimar, una piedra azul que solo se extrae en República Dominicana, cerca de Barahona. Las compras corren por tu cuenta, así que lleva efectivo.',
		},
		{
			question: '¿Es segura la Zona Colonial?',
			answer: 'Politur, la policía turística, patrulla la zona y en 2024 la reforzó con más de 200 agentes. Aun así es el centro de una capital con mucha gente: lleva el dinero justo y guarda el teléfono cuando no lo uses.',
		},
		{
			question: '¿Se puede ir a Santo Domingo por libre?',
			answer: 'Sí, en el autobús de Expreso Bávaro, que tarda unas 3 horas desde Bávaro. Sus paradas en la capital no están en la Zona Colonial, así que tendrás que tomar un taxi, y Los Tres Ojos queda fuera de su ruta.',
		},
	],
	cta: {
		title: 'Elige tu día en la capital',
		text: 'Con la fecha y el hotel donde te hospedas, te confirmamos qué excursión sale ese día.',
		whatsappMessage: 'Hola, quiero ir a Santo Domingo el [fecha]',
	},
	updatedAt: new Date('2026-09-27'),
};
