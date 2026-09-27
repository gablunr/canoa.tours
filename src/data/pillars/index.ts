import type { DestinationId } from '../tours/destinations';
import { pillar as aventura } from './aventura';
import { pillar as fiesta } from './fiesta';
import { pillar as islaCatalina } from './isla-catalina';
import { pillar as islaSaona } from './isla-saona';
import { pillar as samana } from './samana';
import { pillar as santoDomingo } from './santo-domingo';
import type { PillarContent } from './types';

export const pillarContents: Record<DestinationId, PillarContent> = {
	'isla-saona': islaSaona,
	samana,
	'santo-domingo': santoDomingo,
	'isla-catalina': islaCatalina,
	aventura,
	fiesta,
};

export const crossSiloLinks: Record<DestinationId, DestinationId[]> = {
	'isla-saona': ['isla-catalina'],
	'isla-catalina': ['isla-saona'],
	samana: ['isla-saona'],
	'santo-domingo': [],
	aventura: ['fiesta'],
	fiesta: ['aventura'],
};
