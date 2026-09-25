import { company, type Office } from '../data/company';
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

const reference = (id: string) => ({ '@id': id });

export const organizationReference = reference(organizationId);

export const pageNodeIds = (url: string) => ({
	webPage: `${url}#webpage`,
	primaryImage: `${url}#primaryimage`,
	breadcrumb: `${url}#breadcrumb`,
	mainEntity: `${url}#main`,
});

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

const geoCoordinates = ({ latitude, longitude }: Office) =>
	latitude !== undefined && longitude !== undefined ? { '@type': 'GeoCoordinates', latitude, longitude } : undefined;

export function organizationSchema(logo: LogoImage, image: SocialImage): SchemaNode {
	const { office, openingHours, phone } = company;
	const geo = office && geoCoordinates(office);
	const sameAs = [...company.socialProfiles, ...(office?.mapsUrl ? [office.mapsUrl] : [])];

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
	type: PageType;
	name: string;
	description: string;
	hasBreadcrumbs: boolean;
	mainEntity?: SchemaNode | SchemaNode[];
	datePublished?: Date;
	dateModified?: Date;
}

export function webPageSchema({ url, type, name, description, hasBreadcrumbs, mainEntity, datePublished, dateModified }: WebPageOptions): SchemaNode {
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

export const faqSchema = (items: QuestionAndAnswer[]): SchemaNode[] =>
	items.map((item) => ({
		'@type': 'Question',
		name: item.question,
		acceptedAnswer: { '@type': 'Answer', text: item.answer },
	}));
