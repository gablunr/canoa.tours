export const pillarCitedTourKeys = [
	'aventura/buggies',
	'aventura/buggies-predator',
	'aventura/speed-boat',
	'fiesta/party-boat',
	'fiesta/coco-bongo',
	'fiesta/imagine-cave',
	'santo-domingo/clasica',
	'santo-domingo/vip',
] as const;

export type PillarCitedTourKey = (typeof pillarCitedTourKeys)[number];

export const isPillarCitedTour = (productKey: string): productKey is PillarCitedTourKey =>
	(pillarCitedTourKeys as readonly string[]).includes(productKey);
