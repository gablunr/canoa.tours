import { paymentMethodLabels } from '../../data/site/brand-icons';
import { company, type Office } from '../../data/site/company';
import { absoluteUrl, siteLanguage, type Breadcrumb, type SocialImage } from './seo';

export type SchemaNode = Record<string, unknown>;

export type PageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage' | 'ImageGallery';

export interface LogoImage {
	url: string;
	width: number;
	height: number;
}

export interface QuestionAndAnswer {
	question: string;
	answer: string;
}

const organizationId = absoluteUrl('/#organization');

const websiteId = absoluteUrl('/#website');

export const reference = (id: string) => ({ '@id': id });

export const organizationReference = reference(organizationId);

export const pageNodeIds = (url: string) => ({
	webPage: `${url}#webpage`,
	primaryImage: `${url}#primaryimage`,
	breadcrumb: `${url}#breadcrumb`,
	mainEntity: `${url}#main`,
	itemList: `${url}#itemlist`,
	trip: `${url}#trip`,
	destination: `${url}#destination`,
});

export const puntaCanaId = absoluteUrl('/#punta-cana');

export const areaServed = company.serviceAreas.map((area) => ({ '@type': area.kind, name: area.name }));

const imageObject = (id: string, image: SocialImage | LogoImage) => ({
	'@type': 'ImageObject',
	'@id': id,
	url: image.url,
	contentUrl: image.url,
	width: image.width,
	height: image.height,
	...('alt' in image && { caption: image.alt }),
});

const postalAddress = (office: Office) => ({
	'@type': 'PostalAddress',
	streetAddress: office.streetAddress,
	postalCode: office.postalCode,
	addressLocality: office.locality,
	addressRegion: office.region,
	addressCountry: office.country,
});

export interface GeoPoint {
	latitude: number;
	longitude: number;
}

const geoCoordinates = ({ latitude, longitude }: Partial<GeoPoint>) =>
	latitude !== undefined && longitude !== undefined ? { '@type': 'GeoCoordinates', latitude, longitude } : undefined;

export function organizationSchema(logo: LogoImage, image: SocialImage): SchemaNode {
	const { office, openingHours, phone } = company;
	const geo = office && geoCoordinates(office);
	const sameAs = [...company.socialProfiles.map((profile) => profile.url), ...(office?.mapsUrl ? [office.mapsUrl] : [])];
	const paymentAccepted = company.paymentMethods.map((method) => paymentMethodLabels[method]).join(', ');

	return {
		'@type': company.schemaType,
		'@id': organizationId,
		name: company.name,
		...(company.brandName !== company.name && { alternateName: company.brandName }),
		description: company.description,
		url: absoluteUrl('/'),
		logo: imageObject(absoluteUrl('/#logo'), logo),
		image: image.url,
		email: company.email,
		...(phone && { telephone: phone.number }),
		...(paymentAccepted && { paymentAccepted }),
		...(office && { address: postalAddress(office) }),
		...(geo && { geo }),
		...(office?.mapsUrl && { hasMap: office.mapsUrl }),
		...(openingHours && {
			openingHoursSpecification: {
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: openingHours.days,
				opens: openingHours.opens,
				closes: openingHours.closes,
			},
		}),
		...(areaServed.length > 0 && { areaServed }),
		...(sameAs.length > 0 && { sameAs }),
	};
}

export function websiteSchema(): SchemaNode {
	return {
		'@type': 'WebSite',
		'@id': websiteId,
		url: absoluteUrl('/'),
		name: company.brandName,
		...(company.brandName !== company.name && { alternateName: company.name }),
		inLanguage: siteLanguage,
		publisher: organizationReference,
	};
}

interface WebPageOptions {
	url: string;
	type: PageType | PageType[];
	name: string;
	description: string;
	hasBreadcrumbs: boolean;
	mainEntity?: SchemaNode | SchemaNode[];
	about?: SchemaNode;
	datePublished?: Date;
	dateModified?: Date;
}

export function webPageSchema({ url, type, name, description, hasBreadcrumbs, mainEntity, about, datePublished, dateModified }: WebPageOptions): SchemaNode {
	const ids = pageNodeIds(url);

	return {
		'@type': type,
		'@id': ids.webPage,
		url,
		name,
		description,
		inLanguage: siteLanguage,
		isPartOf: reference(websiteId),
		publisher: organizationReference,
		primaryImageOfPage: reference(ids.primaryImage),
		...(hasBreadcrumbs && { breadcrumb: reference(ids.breadcrumb) }),
		...(mainEntity && { mainEntity }),
		...(about && { about }),
		...(datePublished && { datePublished: datePublished.toISOString() }),
		...(dateModified && { dateModified: dateModified.toISOString() }),
	};
}

export const primaryImageSchema = (url: string, image: SocialImage): SchemaNode =>
	imageObject(pageNodeIds(url).primaryImage, image);

export function breadcrumbSchema(url: string, breadcrumbs: Breadcrumb[]): SchemaNode {
	return {
		'@type': 'BreadcrumbList',
		'@id': pageNodeIds(url).breadcrumb,
		itemListElement: breadcrumbs.map((breadcrumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: breadcrumb.name,
			item: absoluteUrl(breadcrumb.path),
		})),
	};
}

interface BlogPostingOptions {
	url: string;
	headline: string;
	description: string;
	section: string;
	datePublished: Date;
	dateModified?: Date;
}

export function blogPostingSchema({ url, headline, description, section, datePublished, dateModified }: BlogPostingOptions): SchemaNode {
	const ids = pageNodeIds(url);

	return {
		'@type': 'BlogPosting',
		'@id': `${url}#article`,
		headline,
		description,
		inLanguage: siteLanguage,
		articleSection: section,
		mainEntityOfPage: reference(ids.webPage),
		image: reference(ids.primaryImage),
		author: organizationReference,
		publisher: organizationReference,
		datePublished: datePublished.toISOString(),
		dateModified: (dateModified ?? datePublished).toISOString(),
	};
}

export const faqSchema = (items: QuestionAndAnswer[]): SchemaNode[] =>
	items.map((item) => ({
		'@type': 'Question',
		name: item.question,
		acceptedAnswer: { '@type': 'Answer', text: item.answer },
	}));

export interface OfferOptions {
	url: string;
	price: number;
	name?: string;
	description?: string;
	priceCurrency?: string;
	unitText?: string;
}

export const offerSchema = ({ url, price, name, description, priceCurrency = 'USD', unitText }: OfferOptions): SchemaNode => ({
	'@type': 'Offer',
	url,
	price,
	priceCurrency,
	availability: 'https://schema.org/InStock',
	seller: organizationReference,
	...(name && { name }),
	...(description && { description }),
	...(unitText && { priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency, unitText } }),
});

export interface TripStop {
	name: string;
	description?: string;
}

export interface TouristTripOptions {
	url: string;
	name: string;
	description: string;
	offers: OfferOptions[];
	imageUrl?: string;
	touristType?: string[];
}

export const touristTripSchema = ({ url, name, description, offers, imageUrl, touristType }: TouristTripOptions): SchemaNode => ({
	'@type': 'TouristTrip',
	'@id': pageNodeIds(url).trip,
	name,
	description,
	url,
	...(imageUrl && { image: imageUrl }),
	provider: organizationReference,
	...(touristType && touristType.length > 0 && { touristType }),
	offers: offers.map(offerSchema),
});

export const tripItinerarySchema = (itinerary: TripStop[]): SchemaNode | undefined =>
	itinerary.length > 0
		? {
				'@type': 'ItemList',
				numberOfItems: itinerary.length,
				itemListElement: itinerary.map((stop, index) => ({
					'@type': 'ListItem',
					position: index + 1,
					name: stop.name,
					...(stop.description && { description: stop.description }),
				})),
			}
		: undefined;

export interface ListEntry {
	name: string;
	path: string;
	itemId?: string;
}

export const itemListSchema = (url: string, name: string, entries: ListEntry[]): SchemaNode => ({
	'@type': 'ItemList',
	'@id': pageNodeIds(url).itemList,
	name,
	numberOfItems: entries.length,
	itemListElement: entries.map((entry, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: entry.name,
		url: absoluteUrl(entry.path),
		...(entry.itemId && { item: reference(entry.itemId) }),
	})),
});

export interface PlaceMention {
	type: 'Country' | 'Park' | 'AdministrativeArea' | 'City';
	name: string;
	sameAs?: string[];
}

export interface AttractionOptions {
	name: string;
	description?: string;
	geo?: GeoPoint;
	sameAs?: string[];
}

export interface TouristDestinationOptions {
	id: string;
	name: string;
	description?: string;
	geo: GeoPoint;
	sameAs: string[];
	url?: string;
	imageId?: string;
	containedInPlace?: PlaceMention;
	attractions?: AttractionOptions[];
}

const placeMention = ({ type, name, sameAs }: PlaceMention): SchemaNode => ({
	'@type': type,
	name,
	...(sameAs && sameAs.length > 0 && { sameAs }),
});

export const dominicanRepublic: PlaceMention = {
	type: 'Country',
	name: 'República Dominicana',
	sameAs: ['https://www.wikidata.org/wiki/Q786'],
};

export function touristDestinationSchema({
	id,
	name,
	description,
	geo,
	sameAs,
	url,
	imageId,
	containedInPlace = dominicanRepublic,
	attractions = [],
}: TouristDestinationOptions): SchemaNode {
	return {
		'@type': 'TouristDestination',
		'@id': id,
		name,
		...(description && { description }),
		...(url && { url }),
		...(imageId && { image: reference(imageId) }),
		geo: geoCoordinates(geo),
		containedInPlace: placeMention(containedInPlace),
		...(attractions.length > 0 && {
			includesAttraction: attractions.map((attraction) => ({
				'@type': 'TouristAttraction',
				name: attraction.name,
				...(attraction.description && { description: attraction.description }),
				...(attraction.geo && { geo: geoCoordinates(attraction.geo) }),
				...(attraction.sameAs && attraction.sameAs.length > 0 && { sameAs: attraction.sameAs }),
			})),
		}),
		...(sameAs.length > 0 && { sameAs }),
	};
}

export function danglingReferences(nodes: SchemaNode[]): string[] {
	const defined = new Set<string>();
	const referenced = new Set<string>();
	const visit = (value: unknown): void => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (!value || typeof value !== 'object') return;
		const node = value as SchemaNode;
		if (typeof node['@id'] === 'string') (Object.keys(node).length === 1 ? referenced : defined).add(node['@id']);
		Object.values(node).forEach(visit);
	};
	visit(nodes);
	return [...referenced].filter((id) => !defined.has(id));
}
