import type { PillarContent } from './types';
import { departureDaysOf, departurePorts, fromPriceOf, guidePath, link, pillarPath, toursOf } from './kit';

const port = departurePorts.saona.port;

const allInclude = (pattern: RegExp) => toursOf('isla-saona').every((details) => details.includes.some((item) => pattern.test(item)));

const poolStop = allInclude(/piscina natural/i) ? 'Todas nuestras excursiones a Saona paran allí' : 'Varias de nuestras excursiones a Saona paran allí';
const parkEntry = allInclude(/entrada al parque/i)
	? 'En nuestras excursiones, el barco y la entrada ya van incluidos'
	: 'En nuestras excursiones, el barco ya va incluido';

export const pillar: PillarContent = {
	seoTitle: 'Excursión a Isla Saona desde Punta Cana: precios',
	description: `Excursión a Isla Saona desde ${fromPriceOf('isla-saona')} en catamarán, VIP 4 Playas, First Class o lancha privada. Salen de ${port} ${departureDaysOf('isla-saona')}.`,
	imageAlt: 'Agua clara y poco profunda junto a una playa de arena blanca con palmeras inclinadas',
	comparisonTitle: 'Qué excursión a Isla Saona elegir',
	overviewTitle: 'Cómo es la excursión a Isla Saona',
	sections: [
		{
			title: 'Qué es Isla Saona',
			blocks: [
				{
					type: 'paragraph',
					html: 'Isla Saona forma parte del Parque Nacional Cotubanamá, el antiguo Parque Nacional del Este. La separa de la costa el canal de Catuano y no hay puente ni carretera: solo se llega en barco. Es la única isla del parque donde vive gente, en Mano Juan, un pueblo de pescadores con casas de madera pintadas. En sus playas anidan más tortugas marinas que en ningún otro lugar del país.',
				},
			],
		},
		{
			title: 'Cómo llegar a Isla Saona desde Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: `El barco sale de ${port}, a hora y media en autobús desde Bávaro. Desde el muelle, la lancha rápida tarda de 25 a 45 minutos en llegar a la isla y el catamarán, de hora y media a dos horas. La recogida en el hotel se cobra aparte porque hay quien se hospeda en ${port} y llega al puerto por su cuenta.`,
				},
			],
		},
		{
			title: 'Qué esperar del día',
			blocks: [
				{
					type: 'paragraph',
					html: 'Sales del hotel temprano y vuelves al final de la tarde. En el catamarán pasas entre tres y cuatro horas en la isla, y la VIP 4 Playas para además en otras playas por el camino. Se almuerza en la arena, con palmeras y ranchos para la sombra.',
				},
				{
					type: 'paragraph',
					html: `En la isla no hay cajeros, así que lleva efectivo para los extras (el resto de la lista está en ${link(guidePath('que-llevar-a-isla-saona'), 'qué llevar a Isla Saona')}). Desde 2023, una resolución del Ministerio de Medio Ambiente prohíbe entrar con unicel y plástico de un solo uso.`,
				},
			],
		},
		{
			title: 'Mejor época para ir a Isla Saona',
			blocks: [
				{
					type: 'paragraph',
					html: 'Marzo es el mes con menos días de lluvia, y cuando llueve suele ser un chubasco corto. Si viajas en temporada de huracanes, el riesgo es mayor de mediados de agosto a mediados de octubre. La temporada alta se llena sobre todo en Navidad y Semana Santa, mientras que en mayo y junio hay menos gente en las playas.',
				},
			],
		},
	],
	facts: [
		{ label: 'Superficie', value: '110 km²' },
		{ label: 'Distancia por mar', value: `19 km desde ${port}` },
		{ label: 'Meses más secos', value: 'De diciembre a abril' },
		{ label: 'Temporada de huracanes', value: 'De junio a noviembre' },
	],
	faqs: [
		{
			question: '¿Dónde está la piscina natural y se pueden tocar las estrellas de mar?',
			answer: `No está en la isla: es un banco de arena en el canal de Catuano, frente a la playa de Palmilla, con el agua por la cintura. ${poolStop}. Suele haber estrellas de mar, pero no se tocan ni se sacan del agua, porque se dañan.`,
		},
		{
			question: '¿Catamarán o lancha: cuál se mueve menos?',
			answer: 'El catamarán es más estable; la lancha rápida salta más con viento, que sopla más de noviembre a mayo y sobre todo en diciembre. En la excursión en catamarán uno de los trayectos es en lancha, y la VIP 4 Playas y la privada van en lancha todo el día. Si te mareas, tómate la pastilla antes de embarcar.',
		},
		{
			question: '¿Hay sargazo en Isla Saona?',
			answer: `Suele haber mucho menos que en las playas de Punta Cana, porque Saona y ${port} miran al mar Caribe y Punta Cana, al Atlántico. Cuando más aparece es de mayo a agosto.`,
		},
		{
			question: '¿Isla Saona o Isla Catalina?',
			answer: `Saona es mucho más grande, con playas largas y la piscina natural, y el barco sale de ${port}. Catalina es una isla pequeña y sin habitantes frente a ${departurePorts.catalina.port}, más de snorkel y buceo, y sus excursiones cuestan desde ${fromPriceOf('isla-catalina')}.`,
			link: { label: 'Excursiones a Isla Catalina', href: pillarPath('isla-catalina') },
		},
		{
			question: '¿Se puede ir a Isla Saona sin excursión?',
			answer: `Sí. En ${port} hay lanchas que cruzan a la isla, y la entrada al parque nacional se paga aparte. ${parkEntry}, y no tienes que buscar quién te cruce.`,
		},
	],
	cta: {
		title: 'Te ayudamos a elegir barco',
		text: 'Si dudas entre ir tranquilo en catamarán o ver más playas en lancha, cuéntanos quiénes van y te decimos cuál les conviene.',
		whatsappMessage: 'Hola, quiero ir a Isla Saona el [fecha] y no sé qué excursión elegir',
	},
	updatedAt: new Date('2026-09-27'),
};
