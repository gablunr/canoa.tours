import type { APIRoute } from 'astro';
import { company, officeAddress } from '../data/site/company';
import { destinationHref, destinations } from '../data/tours/destinations';
import { destinationAnswer } from '../data/pillars/pillar-page';
import { isGuidePublished } from '../data/guides/guide-content';
import { guideHref, siloGuides, type Guide } from '../data/guides/guides';
import { catalogIntro } from '../data/tours/catalog';
import { routes } from '../data/site/routes';
import { destinationTourDetails, tourDetailsHref, tourSeoDescription } from '../data/tours/tours';
import { bookingBenefitSummary, bookingBenefits } from '../data/booking/booking-benefits';
import { bookingStepSummary, bookingSteps } from '../data/booking/booking-steps';
import { faqSummary, faqs } from '../data/booking/faq';
import { mostBookedHref, mostBookedSummary, mostBookedTours } from '../data/tours/most-booked';
import { reviewStats, reviewStatsSummary, reviewSummary, reviews } from '../data/reviews/reviews';
import { getLegalDocuments, legalHref } from '../data/pages/legal';
import { documentHref } from '../data/pages/documents';
import { getHelpDocument } from '../data/pages/help';
import { absoluteUrl } from '../lib/seo/seo';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const link = (label: string, path: string, description?: string) =>
	`- [${label}](${absoluteUrl(path)})${description ? `: ${description}` : ''}`;

const publishedGuides = (silo: Parameters<typeof siloGuides>[0]) => siloGuides(silo).filter((guide) => isGuidePublished(guide.slug));

const guideLink = (guide: Guide) => link(guide.title, guideHref(guide), guide.description);

const section = (title: string, lines: string[]) => (lines.length > 0 ? [`## ${title}`, '', ...lines, ''] : []);

const reviewLimit = 20;

const reviewLines = () => {
	const stats = reviewStats(reviews);
	return stats ? [`- Nota media: ${reviewStatsSummary(stats)}`, ...reviews.slice(0, reviewLimit).map((review) => `- ${reviewSummary(review)}`)] : [];
};

export const GET: APIRoute = async () => {
	const legalDocuments = await getLegalDocuments();
	const howToBookDocument = await getHelpDocument('como-reservar');
	const faqDocument = await getHelpDocument('preguntas-frecuentes');
	const pickupZonesDocument = await getHelpDocument('zonas-de-recogida');
	const cancellationsDocument = await getHelpDocument('cancelaciones');
	const { office, phone, whatsapp, serviceAreas, socialProfiles } = company;

	const contactLines = [
		...(office ? [`- Oficina: ${officeAddress(office)}`] : []),
		...(phone ? [`- Teléfono: ${phone.label} (${phone.number})`] : []),
		...(whatsapp ? [`- WhatsApp: ${whatsapp.label} (${whatsapp.href})`] : []),
		`- Correo: ${company.email}`,
		...(serviceAreas.length > 0 ? [`- Zonas de servicio: ${listFormat.format(serviceAreas.map((area) => area.name))}`] : []),
		...socialProfiles.map((profile) => `- ${profile.label}: ${profile.url}`),
	];

	const destinationLines = [
		link('Todas las excursiones', routes.catalog, catalogIntro),
		...destinations.flatMap((destination) => [
			link(destination.name, destinationHref(destination), destinationAnswer(destination)),
			...destinationTourDetails(destination).map((details) => `  ${link(details.title, tourDetailsHref(details), tourSeoDescription(details))}`),
			...publishedGuides(destination.id).map((guide) => `  - Guía: ${guideLink(guide).slice(2)}`),
		]),
	];

	const body = [
		`# ${company.brandName}`,
		'',
		`> ${company.description}`,
		'',
		...(company.brandName !== company.name ? [`${company.brandName} es la marca de ${company.name}.`, ''] : []),
		...contactLines,
		'',
		...section('Excursiones por destino y actividad', destinationLines),
		...section('Guías para planear el viaje', publishedGuides('general').map(guideLink)),
		...section(
			'Las más reservadas',
			mostBookedTours.map((item) => link(item.title, mostBookedHref(item), mostBookedSummary(item))),
		),
		...section(
			'Por qué reservar con Canoa Tours',
			bookingBenefits.map((benefit) => `- ${bookingBenefitSummary(benefit)}`),
		),
		...section('Opiniones de clientes', reviewLines()),
		...section('Cómo reservar', [
			...bookingSteps.map(bookingStepSummary),
			link(howToBookDocument.data.title, documentHref(howToBookDocument), howToBookDocument.data.description),
			link(pickupZonesDocument.data.title, documentHref(pickupZonesDocument), pickupZonesDocument.data.description),
			link(cancellationsDocument.data.title, documentHref(cancellationsDocument), cancellationsDocument.data.description),
		]),
		...section(
			'Preguntas frecuentes',
			[
				...faqs.flatMap((faq) => [`- ${faqSummary(faq)}`, ...(faq.link ? [`  ${link(faq.link.label, faq.link.href)}`] : [])]),
				link(faqDocument.data.title, documentHref(faqDocument), faqDocument.data.description),
			],
		),
		...section(
			'Optional',
			legalDocuments.map((legalDocument) => link(legalDocument.data.title, legalHref(legalDocument), legalDocument.data.description)),
		),
	].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
