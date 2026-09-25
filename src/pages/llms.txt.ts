import type { APIRoute } from 'astro';
import { company, officeAddress } from '../data/company';
import { getLegalDocuments, legalHref } from '../data/legal';
import { absoluteUrl } from '../lib/seo';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const link = (label: string, path: string, description?: string) =>
	`- [${label}](${absoluteUrl(path)})${description ? `: ${description}` : ''}`;

const section = (title: string, lines: string[]) => (lines.length > 0 ? [`## ${title}`, '', ...lines, ''] : []);

export const GET: APIRoute = async () => {
	const legalDocuments = await getLegalDocuments();
	const { office, phone, serviceAreas } = company;

	const contactLines = [
		...(office ? [`- Oficina: ${officeAddress(office)}`] : []),
		...(phone ? [`- Teléfono: ${phone.label} (${phone.number})`] : []),
		`- Correo: ${company.email}`,
		...(serviceAreas.length > 0 ? [`- Zonas de servicio: ${listFormat.format(serviceAreas.map((area) => area.name))}`] : []),
	];

	const body = [
		`# ${company.brandName}`,
		'',
		`> ${company.description}`,
		'',
		...(company.brandName !== company.name ? [`${company.brandName} es la marca de ${company.name}.`, ''] : []),
		...contactLines,
		'',
		...section(
			'Optional',
			legalDocuments.map((legalDocument) => link(legalDocument.data.title, legalHref(legalDocument), legalDocument.data.description)),
		),
	].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
