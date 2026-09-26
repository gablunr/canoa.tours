import type { APIRoute } from 'astro';
import { company, officeAddress } from '../data/company';
import { destinationHref, destinationSummary, destinations, tourHref } from '../data/destinations';
import { bookingBenefitSummary, bookingBenefits } from '../data/booking-benefits';
import { bookingStepSummary, bookingSteps } from '../data/booking-steps';
import { faqSummary, faqs } from '../data/faq';
import { mostBookedHref, mostBookedSummary, mostBookedTours } from '../data/most-booked';
import { reviewSource, reviewSourceSummary, reviewSummary, reviews } from '../data/reviews';
import { getLegalDocuments, legalHref } from '../data/legal';
import { absoluteUrl } from '../lib/seo';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const link = (label: string, path: string, description?: string) =>
	`- [${label}](${absoluteUrl(path)})${description ? `: ${description}` : ''}`;

const section = (title: string, lines: string[]) => (lines.length > 0 ? [`## ${title}`, '', ...lines, ''] : []);

export const GET: APIRoute = async () => {
	const legalDocuments = await getLegalDocuments();
	const { office, phone, whatsapp, serviceAreas, socialProfiles } = company;

	const contactLines = [
		...(office ? [`- Oficina: ${officeAddress(office)}`] : []),
		...(phone ? [`- Teléfono: ${phone.label} (${phone.number})`] : []),
		...(whatsapp ? [`- WhatsApp: ${whatsapp.label} (${whatsapp.href})`] : []),
		`- Correo: ${company.email}`,
		...(serviceAreas.length > 0 ? [`- Zonas de servicio: ${listFormat.format(serviceAreas.map((area) => area.name))}`] : []),
		...socialProfiles.map((profile) => `- ${profile.label}: ${profile.url}`),
	];

	const destinationLines = destinations.flatMap((destination) => [
		link(destination.name, destinationHref(destination), destinationSummary(destination)),
		...destination.tours.map((tour) => `  ${link(tour.name, tourHref(destination, tour))}`),
	]);

	const body = [
		`# ${company.brandName}`,
		'',
		`> ${company.description}`,
		'',
		...(company.brandName !== company.name ? [`${company.brandName} es la marca de ${company.name}.`, ''] : []),
		...contactLines,
		'',
		...section('Excursiones por destino', destinationLines),
		...section(
			'Las más reservadas',
			mostBookedTours.map((item) => link(item.title, mostBookedHref(item), mostBookedSummary(item))),
		),
		...section(
			'Por qué reservar con Canoa Tours',
			bookingBenefits.map((benefit) => `- ${bookingBenefitSummary(benefit)}`),
		),
		...section('Opiniones de clientes', [
			`- Nota media: ${reviewSourceSummary(reviewSource)}`,
			...reviews.map((review) => `- ${reviewSummary(review)}`),
		]),
		...section('Cómo reservar', bookingSteps.map(bookingStepSummary)),
		...section(
			'Preguntas frecuentes',
			faqs.flatMap((faq) => [`- ${faqSummary(faq)}`, ...(faq.link ? [`  ${link(faq.link.label, faq.link.href)}`] : [])]),
		),
		...section(
			'Optional',
			legalDocuments.map((legalDocument) => link(legalDocument.data.title, legalHref(legalDocument), legalDocument.data.description)),
		),
	].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
