import type { SiteImage } from '../../lib/images';
import { latestDate } from '../../lib/format';
import { publishedGuideRows } from '../../lib/guides/published-guides';
import { destinationHref, destinations, findDestination, type DestinationId } from '../tours/destinations';
import { routes } from '../site/routes';

export type GuideSilo = DestinationId | 'general';

export interface Guide {
	slug: string;
	silo: GuideSilo;
	title: string;
	description: string;
	image: SiteImage;
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

const siloIds = new Set<string>(['general', ...destinations.map((destination) => destination.id)]);
const isGuideSilo = (silo: string): silo is GuideSilo => siloIds.has(silo);

export const guides: Guide[] = publishedGuideRows.flatMap((row) =>
	isGuideSilo(row.silo)
		? [
				{
					slug: row.slug,
					silo: row.silo,
					title: row.title,
					description: row.description,
					image: row.image,
					imageAlt: row.imageAlt,
					readingMinutes: row.readingMinutes,
					publishedAt: row.publishedAt,
					updatedAt: row.updatedAt,
					featured: row.featured,
				},
			]
		: [],
);

export const guidesUpdatedAt = latestDate(guides.map((guide) => guide.updatedAt ?? guide.publishedAt));

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

export const featuredGuide: Guide | undefined = guides.find((guide) => guide.featured) ?? guides[0];

const siloOrder: GuideSilo[] = ['general', ...destinations.map((destination) => destination.id)];

export const siloGuides = (silo: GuideSilo) => guides.filter((guide) => guide.silo === silo);

export const guideGroups: GuideGroup[] = siloOrder.flatMap((silo) => {
	const groupGuides = siloGuides(silo);
	return groupGuides.length > 0 ? [{ silo, ...siloDetails(silo), guides: groupGuides }] : [];
});

export const guideSiloHref = (silo: GuideSilo) => (silo === 'general' ? routes.guides : destinationHref(findDestination(silo)));

export const siblingGuides = (guide: Guide) => guides.filter((candidate) => candidate.silo === guide.silo && candidate.slug !== guide.slug);
