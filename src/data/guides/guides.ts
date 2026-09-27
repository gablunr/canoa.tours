import type { ImageMetadata } from 'astro';
import catamaranImage from '../../assets/images/placeholders/tours/isla-saona/catamaran.jpg';
import saonaBeachImage from '../../assets/images/placeholders/destinations/isla-saona.jpg';
import saonaHutsImage from '../../assets/images/placeholders/tours/isla-saona/vip-4-playas.jpg';
import samanaBayImage from '../../assets/images/placeholders/destinations/samana.jpg';
import cayoLevantadoImage from '../../assets/images/placeholders/tours/samana/3-maravillas.jpg';
import colonialZoneImage from '../../assets/images/placeholders/destinations/santo-domingo.jpg';
import snorkelImage from '../../assets/images/placeholders/destinations/isla-catalina.jpg';
import muddyTrailImage from '../../assets/images/placeholders/destinations/aventura-punta-cana.jpg';
import buggyImage from '../../assets/images/placeholders/tours/aventura-punta-cana/buggies-predator.jpg';
import nightclubImage from '../../assets/images/placeholders/destinations/fiesta-punta-cana.jpg';
import palmBeachImage from '../../assets/images/home/caribbean-palm-beach.jpg';
import pierBeachImage from '../../assets/images/home/turquoise-pier-beach.jpg';
import { departurePorts } from '../tours/departure-ports';
import { destinationHref, destinations, findDestination, type DestinationId } from '../tours/destinations';
import { routes } from '../site/routes';

export type GuideSilo = DestinationId | 'general';

export interface Guide {
	slug: string;
	silo: GuideSilo;
	title: string;
	description: string;
	image: ImageMetadata;
	imageAlt: string;
	readingMinutes: number;
	publishedAt: Date;
	updatedAt?: Date;
	featured?: boolean;
}

export interface GuideGroup {
	silo: GuideSilo;
	anchor: string;
	title: string;
	guides: Guide[];
}

export const guidesIntro =
	'Qué llevar, cuándo ir, cuánto cuesta cada excursión y cómo elegir entre una y otra. Lo que conviene saber antes de reservar en Punta Cana, ordenado por destino.';

const entries: Omit<Guide, 'publishedAt'>[] = [
	{
		slug: 'cuantas-excursiones-hacer-en-punta-cana',
		silo: 'general',
		title: 'Cuántas excursiones hacer en una semana en Punta Cana',
		description:
			'Cómo combinar tours de día completo y de medio día para no pasar las vacaciones en un autobús, con planes para cinco, siete y diez días.',
		image: pierBeachImage,
		imageAlt: 'Muelle de madera sobre el mar turquesa, con hojas de palmera en primer plano',
		readingMinutes: 7,
	},
	{
		slug: 'mejor-epoca-para-ir-a-punta-cana',
		silo: 'general',
		title: 'Cuál es la mejor época para ir a Punta Cana',
		description: 'El clima mes a mes, cuándo es la temporada de huracanes y qué pasa con tu excursión si el mal tiempo no deja salir.',
		image: palmBeachImage,
		imageAlt: 'Cielo azul despejado sobre una hilera de palmeras y el mar turquesa',
		readingMinutes: 6,
	},
	{
		slug: 'que-llevar-a-isla-saona',
		silo: 'isla-saona',
		title: 'Qué llevar a Isla Saona',
		description: 'La lista para la mochila, qué ropa ponerte para el barco y cuánto efectivo llevar para lo que no incluye el tour.',
		image: catamaranImage,
		imageAlt: 'Catamarán blanco navegando frente a una costa llena de palmeras',
		readingMinutes: 5,
		featured: true,
	},
	{
		slug: 'piscina-natural-de-isla-saona',
		silo: 'isla-saona',
		title: 'La piscina natural de Isla Saona',
		description:
			'Un banco de arena en mitad del mar con el agua por la cintura. Qué es, cómo se llega y qué conviene saber antes de bajarte del barco.',
		image: saonaBeachImage,
		imageAlt: 'Agua clara y poco profunda junto a una playa de arena blanca con palmeras inclinadas',
		readingMinutes: 4,
	},
	{
		slug: 'cuanto-cuesta-ir-a-isla-saona',
		silo: 'isla-saona',
		title: 'Cuánto cuesta ir a Isla Saona desde Punta Cana',
		description:
			'Qué cambia de precio entre el catamarán, el VIP 4 Playas, el First Class y la excursión privada, y cuánto se suma por la recogida en el hotel.',
		image: saonaHutsImage,
		imageAlt: 'Playa de arena blanca con palmeras, cabañas con techo de paja y agua turquesa',
		readingMinutes: 6,
	},
	{
		slug: 'samana-desde-punta-cana',
		silo: 'samana',
		title: 'Samaná desde Punta Cana: cómo es el día',
		description: `Salida temprano, barco desde ${departurePorts.samana.port} y un día largo entre la cascada El Limón y Cayo Levantado. Lo que conviene saber antes de reservar.`,
		image: samanaBayImage,
		imageAlt: 'Palmeras inclinadas sobre la playa y barcas en la bahía, con montañas al fondo',
		readingMinutes: 8,
	},
	{
		slug: 'cayo-levantado-isla-bacardi',
		silo: 'samana',
		title: 'Cayo Levantado, la isla Bacardí de Samaná',
		description: 'La isla de playa en mitad de la bahía de Samaná. Qué hay, qué se paga aparte y cuánto tiempo da para bañarse.',
		image: cayoLevantadoImage,
		imageAlt: 'Playa de Cayo Levantado con tumbonas azules bajo las palmeras',
		readingMinutes: 4,
	},
	{
		slug: 'que-ver-en-la-zona-colonial',
		silo: 'santo-domingo',
		title: 'Qué ver en la Zona Colonial de Santo Domingo en un día',
		description:
			'El Alcázar de Colón, la Catedral Primada y la calle El Conde. Qué entra en el tour clásico, qué suma el VIP y cuánto se camina.',
		image: colonialZoneImage,
		imageAlt: 'Fachada del Alcázar de Colón frente a una plaza empedrada en la Zona Colonial',
		readingMinutes: 9,
	},
	{
		slug: 'snorkel-o-buceo-en-isla-catalina',
		silo: 'isla-catalina',
		title: 'Snorkel o buceo en Isla Catalina: cuál elegir',
		description: 'Qué se ve en cada caso, si hace falta experiencia para bucear y cuál conviene si viajas con niños.',
		image: snorkelImage,
		imageAlt: 'Persona haciendo snorkel bajo el agua azul',
		readingMinutes: 5,
	},
	{
		slug: 'que-ropa-llevar-a-los-buggies',
		silo: 'aventura',
		title: 'Qué ropa llevar a los buggies en Punta Cana',
		description: 'Vas a volver lleno de barro. Qué ponerte, qué dejar en el hotel y en qué se diferencian el buggy 4x4 y el Predator.',
		image: muddyTrailImage,
		imageAlt: 'Cuatrimoto levantando barro en un camino de tierra',
		readingMinutes: 3,
	},
	{
		slug: 'actividades-de-medio-dia-en-punta-cana',
		silo: 'aventura',
		title: 'Actividades de medio día en Punta Cana',
		description:
			'Buggies, safari, parasailing, speed boat y Seaquarium caben en una mañana o una tarde. Cuál elegir según con quién viajes.',
		image: buggyImage,
		imageAlt: 'Buggy azul con cuatro personas en un camino de tierra entre montañas',
		readingMinutes: 6,
	},
	{
		slug: 'coco-bongo-punta-cana',
		silo: 'fiesta',
		title: 'Coco Bongo Punta Cana: lo que conviene saber antes de ir',
		description: 'Cómo es el espectáculo, cuánto dura la noche y qué entrada elegir según dónde quieras verlo.',
		image: nightclubImage,
		imageAlt: 'Público bailando en una discoteca con luces moradas y bolas de espejos',
		readingMinutes: 5,
	},
];

const provisionalPublishedAt = new Date('2026-09-26');

export const guides: Guide[] = entries.map((entry) => ({ ...entry, publishedAt: provisionalPublishedAt }));

function siloDetails(silo: GuideSilo) {
	if (silo === 'general') return { anchor: 'planear-el-viaje', title: 'Planear el viaje' };

	const destination = findDestination(silo);
	return { anchor: destination.slug, title: destination.name };
}

export const guideSiloTitle = (silo: GuideSilo) => siloDetails(silo).title;

export const guideHref = (guide: Guide) =>
	guide.silo === 'general' ? `${routes.guides}/${guide.slug}` : `${destinationHref(findDestination(guide.silo))}/${guide.slug}`;

export const guideReadingTime = (guide: Guide) => `${guide.readingMinutes} min de lectura`;

export const guideCountLabel = (count: number) => `${count} ${count === 1 ? 'guía' : 'guías'}`;

export const featuredGuide = guides.find((guide) => guide.featured) ?? guides[0];

const siloOrder: GuideSilo[] = ['general', ...destinations.map((destination) => destination.id)];

export const siloGuides = (silo: GuideSilo) => guides.filter((guide) => guide.silo === silo);

export const guideGroups: GuideGroup[] = siloOrder.flatMap((silo) => {
	const groupGuides = siloGuides(silo);
	return groupGuides.length > 0 ? [{ silo, ...siloDetails(silo), guides: groupGuides }] : [];
});

export const guideSiloHref = (silo: GuideSilo) => (silo === 'general' ? routes.guides : destinationHref(findDestination(silo)));

export const siblingGuides = (guide: Guide) => guides.filter((candidate) => candidate.silo === guide.silo && candidate.slug !== guide.slug);
