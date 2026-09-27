import type { PillarContent } from './types';
import { departureDaysOf, departurePorts, fromPriceOf, pillarPath } from './kit';

const port = departurePorts.catalina.port;

export const pillar: PillarContent = {
	seoTitle: 'Excursión a Isla Catalina desde Punta Cana: snorkel y buceo',
	description: `Excursión a Isla Catalina desde Punta Cana: snorkel desde ${fromPriceOf('isla-catalina')} o buceo con instructor, con salida de ${port} ${departureDaysOf('isla-catalina')}.`,
	imageAlt: 'Persona haciendo snorkel bajo el agua azul',
	comparisonTitle: 'Snorkel o buceo en Isla Catalina',
	tours: {
		snorkel: { bestFor: 'Familias con niños y quien prefiere nadar en superficie', includesSummary: `Barco desde ${port}, equipo de snorkel y buffet` },
		buceo: { bestFor: 'Principiantes con bautismo y buceadores certificados', includesSummary: 'Dos inmersiones con instructor, equipo y almuerzo' },
	},
	overviewTitle: 'Cómo es la excursión a Isla Catalina',
	sections: [
		{
			title: 'Qué es Isla Catalina',
			blocks: [
				{
					type: 'paragraph',
					html: 'Isla Catalina es un monumento natural frente a la costa de La Romana, en el sureste del país. No tiene hoteles, así que se va solo a pasar el día. Es de roca coralina, con dunas y manglares, y la rodean arrecifes de coral. Muchas webs la meten en el Parque Nacional Cotubanamá, el de Saona, pero es un área protegida aparte. Colón la llamó Santa Catalina en 1494.',
				},
			],
		},
		{
			title: 'Cómo llegar a Isla Catalina desde Punta Cana',
			blocks: [
				{
					type: 'paragraph',
					html: `Sales temprano del hotel y en hora y media de carretera llegas a ${port}, donde te subes al barco para cruzar a la isla en unos 40 minutos. Con snorkel, el agua va por la mañana y después de comer queda tiempo en la playa; con buceo, el almuerzo en la isla va entre una inmersión y otra. Por la tarde haces el camino de vuelta en barco y autobús.`,
				},
			],
		},
		{
			title: 'Qué se ve en La Pared y El Acuario',
			blocks: [
				{
					type: 'paragraph',
					html: 'Los puntos más conocidos son La Pared, un muro de coral que cae a mucha profundidad, y El Acuario, un arrecife poco profundo. Haciendo snorkel en La Pared se ve el borde, a unos 5 metros, y buceando lo mejor está entre 12 y 18 metros. Es normal ver peces loro, peces trompeta, morenas, langostas y rayas, y con suerte alguna tortuga. El agua suele dejar ver de 10 a 30 metros.',
				},
			],
		},
		{
			title: 'Cuándo hacer la excursión a Isla Catalina',
			blocks: [
				{
					type: 'paragraph',
					html: 'Si puedes elegir, de enero a abril es cuando menos llueve en La Romana, entre 28 y 45 mm al mes según los registros de la NOAA; octubre es el mes más lluvioso. La temporada de huracanes va del 1 de junio al 30 de noviembre y tiene más actividad de agosto a octubre. El sargazo, además, suele llegar mucho menos a esta costa que a las playas de Punta Cana.',
				},
			],
		},
	],
	facts: [
		{ label: 'Distancia a la costa', value: '2,4 km' },
		{ label: 'Área protegida', value: '16,23 km²' },
		{ label: 'Habitantes', value: 'Ninguno' },
		{ label: 'Temperatura del agua', value: 'De 27 a 30 °C' },
	],
	faqs: [
		{
			question: '¿Se puede bucear en Isla Catalina sin certificación?',
			answer: 'Sí, con un bautismo: antes de entrar al agua te dan una clase y abajo el instructor va a tu lado. En un bautismo no se pasa de 12 metros, el límite que marca PADI; con certificado puedes bajar más en La Pared.',
		},
		{
			question: '¿Hace falta saber nadar para el snorkel?',
			answer: 'Conviene saber lo básico, aunque vas con chaleco y el guía nada con el grupo. Si prefieres no meterte, puedes esperar en el barco.',
		},
		{
			question: '¿Cuánto hay que esperar para volar después de bucear?',
			answer: 'Tras varias inmersiones el mismo día, como en esta excursión, la Divers Alert Network (DAN) recomienda esperar 18 horas, y tras una sola, 12. Nosotros aconsejamos 24, así que mejor no dejes el buceo para el último día del viaje.',
		},
		{
			question: '¿Qué no se puede hacer en Isla Catalina?',
			answer: 'Desde 2023, una resolución del Ministerio de Medio Ambiente (la 0024-2023) prohíbe entrar con foam o plásticos de un solo uso. En el agua no se toca ni se pisa el coral, y a los peces no se les da de comer.',
		},
		{
			question: '¿Qué llevar a la excursión a Isla Catalina?',
			answer: 'Traje de baño, toalla, una camiseta para el agua, protector solar biodegradable y algo de efectivo para extras. Si vas a bucear, suma tu certificado si lo tienes y algo de abrigo para el barco.',
		},
		{
			question: '¿Isla Catalina o Isla Saona?',
			answer: `En Catalina lo mejor está bajo el agua, así que conviene si quieres hacer snorkel o bucear. Saona es mucho más grande, con playas largas y la piscina natural; sus excursiones salen de ${departurePorts.saona.port} y cuestan desde ${fromPriceOf('isla-saona')}.`,
			link: { label: 'Excursiones a Isla Saona', href: pillarPath('isla-saona') },
		},
	],
	cta: {
		title: '¿Primera vez bajo el agua?',
		text: 'Dinos cuántos son y si alguien ha buceado antes. Te decimos si les conviene más el snorkel o el bautismo.',
		whatsappMessage: 'Hola, quiero ir a Isla Catalina el [fecha] y no sé si hacer snorkel o buceo',
	},
	updatedAt: new Date('2026-09-27'),
};
