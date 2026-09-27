import { company } from '../../../data/site/company';
import { formatPrice } from '../../format';

export interface EmailContent {
	subject: string;
	html: string;
	text: string;
}

export interface EmailDetail {
	label: string;
	value: string;
}

export interface EmailLayoutInput {
	subject: string;
	preheader: string;
	heading: string;
	paragraphs: string[];
	details?: EmailDetail[];
	detailsAfter?: string[];
	cta?: { label: string; url: string };
	closing?: string[];
}

const siteUrl = import.meta.env.SITE.replace(/\/$/, '');
const siteHost = new URL(siteUrl).host;
const publicAsset = (path: string) => `${siteUrl}${path}`;

const logo = { src: publicAsset('/email/logo.png'), width: 132, height: 32 };

const colors = {
	page: '#f3f8f9',
	card: '#ffffff',
	notch: '#000000',
	primary: '#02242d',
	secondary: '#2c4147',
	muted: '#5e6c70',
	border: '#d7e0e2',
	accent: '#017d94',
	onDark: '#e9f0f2',
	mutedOnDark: '#bfc9cd',
};

const bodyFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const displayFont = `'Inter Display', ${bodyFont}`;

const fontFaces = [
	{ family: 'Inter', weight: 400, file: 'Inter-Regular' },
	{ family: 'Inter', weight: 500, file: 'Inter-Medium' },
	{ family: 'Inter Display', weight: 600, file: 'InterDisplay-SemiBold' },
]
	.map(
		(font) =>
			`@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};src:url('${publicAsset(`/fonts/inter/${font.file}.woff2`)}') format('woff2');}`,
	)
	.join('');

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export const formatMoney = (amount: number) => formatPrice(Math.round(amount * 100) / 100);

const tourDateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatTourDate = (isoDate: string) => tourDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

function countLabel(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function joinInSpanish(parts: string[]): string {
	if (parts.length <= 1) return parts.join('');
	return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;
}

export function peopleSummary(people: { adults: number; children: number; infants: number }): string {
	const parts = [
		people.adults > 0 ? countLabel(people.adults, 'adulto', 'adultos') : '',
		people.children > 0 ? countLabel(people.children, 'niño', 'niños') : '',
		people.infants > 0 ? countLabel(people.infants, 'bebé', 'bebés') : '',
	].filter(Boolean);
	return joinInSpanish(parts);
}

export function pickupSummary(schedule: { pickupTime: string | null; startTime: string; pickupTo: string | null }): string {
	if (schedule.pickupTime) return `A las ${schedule.pickupTime}`;
	if (schedule.pickupTo && schedule.pickupTo !== schedule.startTime) return `Entre las ${schedule.startTime} y las ${schedule.pickupTo}`;
	return `A partir de las ${schedule.startTime}`;
}

export function contactLine(): string {
	const whatsapp = company.whatsapp ? `por WhatsApp al ${company.whatsapp.label} o ` : '';
	return `¿Tienes dudas? Escríbenos ${whatsapp}a ${company.email}.`;
}

const paragraphHtml = (text: string) =>
	`<p style="margin:0 0 16px;font-family:${bodyFont};font-size:16px;line-height:1.6;color:${colors.secondary};">${escapeHtml(text)}</p>`;

function detailsHtml(details: EmailDetail[]): string {
	const rows = details
		.map((detail, index) => {
			const divider = index < details.length - 1 ? `border-bottom:1px solid ${colors.border};` : '';
			return `<tr>
<td style="padding:12px 0;${divider}font-family:${bodyFont};font-size:13px;line-height:1.4;color:${colors.muted};vertical-align:top;">${escapeHtml(detail.label)}</td>
<td align="right" style="padding:12px 0 12px 16px;${divider}font-family:${bodyFont};font-size:15px;line-height:1.4;font-weight:500;color:${colors.primary};vertical-align:top;">${escapeHtml(detail.value)}</td>
</tr>`;
		})
		.join('');

	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${colors.page};border-radius:16px;">
<tr><td style="padding:8px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
</td></tr>
</table>`;
}

function ctaHtml(cta: { label: string; url: string }): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
<tr><td style="border-radius:9999px;background:${colors.accent};">
<a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:15px 28px;font-family:${bodyFont};font-size:15px;font-weight:500;line-height:1;color:#ffffff;text-decoration:none;border-radius:9999px;">${escapeHtml(cta.label)}&nbsp;&nbsp;&rarr;</a>
</td></tr>
</table>`;
}

function logoHtml(): string {
	return `<a href="${siteUrl}" style="text-decoration:none;"><img src="${logo.src}" width="${logo.width}" height="${logo.height}" alt="${escapeHtml(company.brandName)}" style="display:block;border:0;width:${logo.width}px;height:${logo.height}px;"></a>`;
}

function headerHtml(): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.notch};border-radius:9999px;">
<tr>
<td style="padding:12px 16px 12px 22px;">${logoHtml()}</td>
<td align="right" style="padding:12px 22px 12px 16px;font-family:${bodyFont};font-size:13px;color:${colors.onDark};">
<a href="${siteUrl}" style="color:${colors.onDark};text-decoration:none;">${escapeHtml(siteHost)}</a>
</td>
</tr>
</table>`;
}

function footerHtml(): string {
	const linkStyle = `color:${colors.onDark};text-decoration:none;`;
	const contactRows = [
		company.whatsapp
			? `<a href="${escapeHtml(company.whatsapp.href)}" style="${linkStyle}">WhatsApp ${escapeHtml(company.whatsapp.label)}</a>`
			: null,
		`<a href="mailto:${escapeHtml(company.email)}" style="${linkStyle}">${escapeHtml(company.email)}</a>`,
	]
		.filter((row): row is string => row !== null)
		.map((row) => `<p style="margin:0 0 6px;font-family:${bodyFont};font-size:14px;line-height:1.5;">${row}</p>`)
		.join('');

	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.notch};border-radius:24px;">
<tr><td class="email-footer" style="padding:32px 32px 28px;">
${logoHtml()}
<p style="margin:20px 0 16px;font-family:${bodyFont};font-size:14px;line-height:1.6;color:${colors.mutedOnDark};">¿Tienes dudas? Escríbenos, te respondemos rápido.</p>
${contactRows}
<p style="margin:24px 0 0;font-family:${bodyFont};font-size:12px;line-height:1.6;color:${colors.mutedOnDark};">© ${new Date().getFullYear()} ${escapeHtml(company.name)}. Excursiones en Punta Cana con recogida en tu hotel.</p>
</td></tr>
</table>`;
}

export function renderEmail(input: EmailLayoutInput): EmailContent {
	const body = [
		`<h1 style="margin:0 0 20px;font-family:${displayFont};font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.03em;color:${colors.primary};">${escapeHtml(input.heading)}</h1>`,
		...input.paragraphs.map(paragraphHtml),
		input.details && input.details.length > 0 ? detailsHtml(input.details) : '',
		...(input.detailsAfter ?? []).map(paragraphHtml),
		input.cta ? ctaHtml(input.cta) : '',
		...(input.closing ?? []).map(paragraphHtml),
	].join('');

	const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.subject)}</title>
<style>
${fontFaces}
@media (max-width: 600px) {
.email-shell { padding: 16px 8px !important; }
.email-card { padding: 28px 22px 12px !important; }
.email-footer { padding: 28px 22px 24px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${colors.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};">
<tr><td align="center" class="email-shell" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td>${headerHtml()}</td></tr>
<tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
<tr><td style="background:${colors.card};border-radius:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="email-card" style="padding:40px 40px 16px;">${body}</td></tr></table>
</td></tr>
<tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
<tr><td>${footerHtml()}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	const text = [
		input.heading,
		'',
		...input.paragraphs.flatMap((paragraph) => [paragraph, '']),
		...(input.details ?? []).map((detail) => `${detail.label}: ${detail.value}`),
		input.details && input.details.length > 0 ? '' : null,
		...(input.detailsAfter ?? []).flatMap((paragraph) => [paragraph, '']),
		input.cta ? `${input.cta.label}: ${input.cta.url}` : null,
		input.cta ? '' : null,
		...(input.closing ?? []).flatMap((paragraph) => [paragraph, '']),
		contactLine(),
		company.brandName,
	]
		.filter((line): line is string => line !== null)
		.join('\n');

	return { subject: input.subject, html, text };
}
