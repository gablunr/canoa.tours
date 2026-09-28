import type { PillarPage } from '../../data/pillars/pillar-page';
import { containedInPlaceMention, mentionedAttractions, pillarPlaces } from '../../data/pillars/places';
import { tourDetailsHref, tourOffers, tourPhoto, type TourDetails } from '../../data/tours/tours';
import { seoImageSource } from '../images';
import { canonicalUrl, socialImage } from './seo';
import {
	faqSchema,
	itemListSchema,
	pageNodeIds,
	puntaCanaId,
	reference,
	touristDestinationSchema,
	touristTripSchema,
	type SchemaNode,
} from './structured-data';

export async function tripNode(details: TourDetails): Promise<SchemaNode> {
	const url = canonicalUrl(tourDetailsHref(details));
	const cover = tourPhoto(details);
	const photos = details.images.length > 0 ? details.images : cover ? [{ image: cover, alt: details.imageAlt }] : [];
	const images = await Promise.all(photos.map(({ image, alt }) => socialImage({ src: seoImageSource(image), alt })));

	return touristTripSchema({
		url,
		name: details.title,
		description: details.summary,
		offers: tourOffers(details, url),
		imageUrls: images.map((image) => image.url),
		touristType: pillarPlaces[details.destination.id].touristType,
	});
}

const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ');

function visibleText({ content, heading, answer, keyFacts, rows, tableNote, faqs }: PillarPage) {
	return [
		heading,
		answer,
		...keyFacts.map((fact) => `${fact.value} ${fact.note ?? ''}`),
		content.comparisonIntro ?? '',
		...rows.flatMap((row) => [row.title, row.includes, row.bestFor, ...row.notes]),
		tableNote ?? '',
		...content.sections.flatMap((section) => [
			section.title,
			...section.blocks.flatMap((block) => {
				if (block.type === 'paragraph') return [plainText(block.html)];
				if (block.type === 'list') return block.items.map(plainText);
				return [...block.head, ...block.rows.flat().map(plainText)];
			}),
		]),
		...(content.facts ?? []).map((fact) => `${fact.label} ${fact.value}`),
		...faqs.flatMap((faq) => [faq.question, faq.answer]),
	].join('\n');
}

export async function pillarGraph(page: PillarPage, url: string) {
	const place = pillarPlaces[page.destination.id];
	const text = visibleText(page);
	const ids = pageNodeIds(url);

	const destination = touristDestinationSchema({
		id: place.shared ? puntaCanaId : ids.destination,
		name: place.name,
		description: place.description,
		geo: place.geo,
		sameAs: place.sameAs,
		...(!place.shared && { url, imageId: ids.primaryImage }),
		containedInPlace: containedInPlaceMention(place, text),
		attractions: mentionedAttractions(place, text).map(({ name, geo, sameAs }) => ({ name, geo, sameAs })),
	});

	const trips = await Promise.all(page.tours.map(tripNode));
	const tourList = itemListSchema(
		url,
		page.heading,
		page.tours.map((details) => ({
			name: details.title,
			path: tourDetailsHref(details),
			itemId: pageNodeIds(canonicalUrl(tourDetailsHref(details))).trip,
		})),
	);

	return {
		about: reference(destination['@id'] as string),
		mainEntity: [tourList, ...faqSchema(page.faqs)],
		graph: [destination, ...trips],
	};
}
