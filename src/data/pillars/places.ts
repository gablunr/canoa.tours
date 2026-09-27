import { departurePorts } from '../tours/departure-ports';
import type { DestinationId } from '../tours/destinations';

export interface PlaceGeo {
	latitude: number;
	longitude: number;
}

export interface PlaceMentionData {
	type: 'Country' | 'Park' | 'AdministrativeArea' | 'City';
	name: string;
	sameAs?: string[];
}

export interface PlaceAttraction {
	name: string;
	aliases: string[];
	geo?: PlaceGeo;
	sameAs?: string[];
}

export interface PillarPlace {
	name: string;
	description: string;
	geo: PlaceGeo;
	sameAs: string[];
	shared?: boolean;
	park?: PlaceMentionData & { mention: string };
	attractions: PlaceAttraction[];
	touristType?: string[];
}

const wikidata = (id: string) => `https://www.wikidata.org/wiki/${id}`;
const wikipedia = (title: string) => `https://es.wikipedia.org/wiki/${title}`;

export const dominicanRepublicMention: PlaceMentionData = {
	type: 'Country',
	name: 'República Dominicana',
	sameAs: [wikidata('Q786')],
};

const puntaCana: Omit<PillarPlace, 'touristType'> = {
	name: 'Punta Cana',
	description: 'Zona turística del este de República Dominicana. Sus hoteles están repartidos entre Bávaro, Cabeza de Toro, Cap Cana, Macao y Uvero Alto.',
	geo: { latitude: 18.5586, longitude: -68.3694 },
	sameAs: [wikidata('Q1568095'), wikipedia('Punta_Cana')],
	shared: true,
	attractions: [],
};

export const pillarPlaces: Record<DestinationId, PillarPlace> = {
	'isla-saona': {
		name: 'Isla Saona',
		description: `Isla del sureste de República Dominicana, dentro del Parque Nacional Cotubanamá. Se llega en barco desde ${departurePorts.saona.port}. Frente a su costa, un banco de arena con agua poco profunda forma la piscina natural.`,
		geo: { latitude: 18.1556, longitude: -68.6994 },
		sameAs: [wikidata('Q1339113'), wikipedia('Isla_Saona')],
		park: { type: 'Park', name: 'Parque Nacional Cotubanamá', sameAs: [wikidata('Q585251')], mention: 'Cotubanamá' },
		attractions: [
			{ name: 'Piscina natural', aliases: ['piscina natural'] },
			{ name: 'Mano Juan', aliases: ['Mano Juan'] },
		],
	},
	samana: {
		name: 'Península de Samaná',
		description: 'Península del noreste de República Dominicana. En el interior está la cascada El Limón y, dentro de la bahía de Samaná, el islote de Cayo Levantado.',
		geo: { latitude: 19.2502, longitude: -69.4212 },
		sameAs: [wikidata('Q2279055'), wikipedia('Península_de_Samaná')],
		attractions: [
			{
				name: 'Cayo Levantado',
				aliases: ['Cayo Levantado', 'Isla Bacardí'],
				geo: { latitude: 19.1664, longitude: -69.2756 },
				sameAs: [wikidata('Q4208698')],
			},
			{
				name: 'Salto El Limón',
				aliases: ['cascada El Limón', 'salto El Limón', 'El Limón'],
				geo: { latitude: 19.2703, longitude: -69.4462 },
				sameAs: [wikidata('Q4531381')],
			},
		],
	},
	'santo-domingo': {
		name: 'Santo Domingo',
		description: 'Capital de República Dominicana. Tiene la Zona Colonial, Patrimonio de la Humanidad desde 1990, y Los Tres Ojos, unas cuevas con lagos de agua dulce al este de la ciudad.',
		geo: { latitude: 18.4625, longitude: -69.9361 },
		sameAs: [wikidata('Q34820'), wikipedia('Santo_Domingo')],
		attractions: [
			{
				name: 'Ciudad Colonial',
				aliases: ['Zona Colonial', 'Ciudad Colonial'],
				geo: { latitude: 18.473, longitude: -69.883 },
				sameAs: [wikidata('Q2470834')],
			},
			{
				name: 'Los Tres Ojos',
				aliases: ['Tres Ojos'],
				geo: { latitude: 18.4814, longitude: -69.8436 },
				sameAs: [wikidata('Q6683320')],
			},
		],
	},
	'isla-catalina': {
		name: 'Isla Catalina',
		description: `Isla pequeña frente a ${departurePorts.catalina.port}, en el sureste de República Dominicana. Se va en barco a hacer snorkel y a bucear en sus arrecifes.`,
		geo: { latitude: 18.36, longitude: -69.0047 },
		sameAs: [wikidata('Q477915'), wikipedia('Isla_Catalina_(República_Dominicana)')],
		attractions: [],
	},
	aventura: { ...puntaCana, touristType: ['Turismo de aventura'] },
	fiesta: { ...puntaCana, touristType: ['Vida nocturna'] },
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function mentionedAttractions(place: PillarPlace, visibleText: string) {
	const text = normalize(visibleText);
	return place.attractions.filter((attraction) => [attraction.name, ...attraction.aliases].some((name) => text.includes(normalize(name))));
}

export const containedInPlaceMention = (place: PillarPlace, visibleText: string): PlaceMentionData =>
	place.park && normalize(visibleText).includes(normalize(place.park.mention))
		? { type: place.park.type, name: place.park.name, sameAs: place.park.sameAs }
		: dominicanRepublicMention;
