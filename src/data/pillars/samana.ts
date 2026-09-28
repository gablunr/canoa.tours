import type { PillarContent } from './types';
import { departureDaysOf, departurePorts, distanceLabel, fromPriceOf, guidePath, pillarPath } from './kit';

export const pillar: PillarContent = {
	seoTitle: 'Excursión a Samaná desde Punta Cana: Cayo Levantado',
	description: `Excursión a Samaná desde Punta Cana a partir de ${fromPriceOf('samana')}: la cascada El Limón y Cayo Levantado en un día. Salen ${departureDaysOf('samana')}.`,
	imageAlt: 'Palmeras inclinadas sobre la playa y barcas en la bahía, con montañas al fondo',
	comparisonTitle: 'Qué excursión a Samaná elegir',
	overviewTitle: 'Cómo es la excursión a Samaná desde Punta Cana',
	sections: [
		{
			title: 'Qué es Samaná',
			blocks: [
				{
					type: 'paragraph',
					html: 'Mucha gente la busca como isla, pero Samaná es una península del noreste del país, con capital en Santa Bárbara de Samaná. En un día desde Punta Cana se pueden ver la cascada El Limón, que baja de la sierra de Samaná, y Cayo Levantado, un islote a la entrada de la bahía. Las Terrenas, Las Galeras y Los Haitises quedan fuera del recorrido.',
				},
			],
		},
		{
			title: 'Cómo se llega a Samaná desde Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: `Parte del viaje es en autobús y parte en barco. Samaná 3 Maravillas cruza la bahía en lancha desde ${departurePorts.samana.port}, a unos ${distanceLabel(departurePorts.samana)} de Punta Cana, y a Cayo Levantado solo se llega en lancha. La bahía suele estar más movida por la tarde, a la vuelta: si te mareas, toma algo antes de subir al barco.`,
				},
			],
		},
		{
			title: 'Cómo es el día',
			blocks: [
				{
					type: 'paragraph',
					html: 'Sales del hotel de madrugada y vuelves cuando ya oscureció, y buena parte de esas horas se va en autobús y en lancha. Lleva calzado cerrado que se pueda mojar y manchar, y ponte el traje de baño en el hotel para no perder tiempo en Cayo Levantado.',
				},
			],
		},
		{
			title: 'Mejor época para ir a Samaná',
			blocks: [
				{
					type: 'paragraph',
					html: 'De febrero a abril es cuando menos llueve. Octubre, noviembre y mayo son los meses más lluviosos, y la temporada de huracanes va del 1 de junio al 30 de noviembre. Antes de salir, mira el pronóstico de Samaná y no el de Punta Cana, porque puede hacer sol en tu hotel y estar lloviendo en la península.',
				},
			],
		},
	],
	facts: [
		{ label: 'Bahía de Samaná', value: 'Unos 850 km²' },
		{ label: 'Cascada El Limón', value: 'Unos 40 m de caída' },
		{ label: 'Cayo Levantado', value: 'A unos 5 km de la costa' },
		{ label: 'Lluvia al año', value: 'Unos 2.200 mm, el doble que en Punta Cana' },
	],
	faqs: [
		{
			question: '¿Hay que subir a caballo a la cascada El Limón?',
			answer: 'No. El camino tiene unos 2,5 km y se puede hacer a pie si estás en forma, aunque hay barro y escalones. Quien sube a caballo va con un cuidador que lleva al animal.',
		},
		{
			question: '¿Por qué a Cayo Levantado lo llaman isla Bacardí?',
			answer: 'Porque allí se rodó un anuncio del ron Bacardí y el apodo se quedó. Mucha gente la busca en Punta Cana, pero está en la bahía de Samaná. Una mitad del cayo es de un hotel y la otra es playa pública, con puestos de pescado.',
		},
		{
			question: '¿Cuándo hay ballenas en Samaná?',
			answer: 'La temporada oficial de avistamiento en la bahía va de mediados de enero al 31 de marzo, y febrero y marzo son los meses con más ballenas. Los barcos se quedan a 50 m de ellas, y a 80 m si hay crías. Si quieres sumar el avistamiento a tu excursión, escríbenos antes de reservar.',
		},
		{
			question: '¿Qué se paga aparte en la excursión a Samaná desde Punta Cana?',
			answer: 'Además de la recogida, lo que pidas en los puestos de Cayo Levantado y la propina del cuidador si subes a caballo a la cascada. Lleva efectivo para eso.',
		},
		{
			question: '¿Qué es mejor, Samaná o Isla Saona?',
			answer: `Isla Saona es un día de playa y piscina natural, desde ${fromPriceOf('isla-saona')} y con salidas ${departureDaysOf('isla-saona')}. Samaná pide más horas de autobús y de barco a cambio de la cascada, la bahía y Cayo Levantado.`,
			link: { label: 'Excursiones a Isla Saona', href: pillarPath('isla-saona') },
		},
		{
			question: '¿En qué momento del viaje conviene hacer Samaná?',
			answer: `Al principio. Solo sale ${departureDaysOf('samana')}, y si el clima obliga a moverla, el siguiente día con salida puede quedar a varios días. Si la dejas para el final, puedes quedarte sin ella.`,
			link: { label: 'Cuántas excursiones hacer en una semana', href: guidePath('cuantas-excursiones-hacer-en-punta-cana') },
		},
	],
	cta: {
		title: '¿Dudas con Samaná?',
		text: 'El precio exacto con la recogida lo ves al reservar. Si no sabes qué excursión elegir o van en grupo grande, escríbenos y te ayudamos.',
		whatsappMessage: 'Hola, quiero ir a Samaná el [fecha]. Somos [personas] y nos hospedamos en [hotel]',
	},
	updatedAt: new Date('2026-09-27'),
};
