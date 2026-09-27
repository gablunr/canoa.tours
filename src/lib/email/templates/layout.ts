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

const brandColor = '#0f766e';
const textColor = '#1f2937';
const mutedColor = '#6b7280';
const borderColor = '#e5e7eb';
const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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

function contactLineHtml(): string {
	const linkStyle = `color:${brandColor};text-decoration:underline;`;
	const whatsapp = company.whatsapp
		? `por WhatsApp al <a href="${escapeHtml(company.whatsapp.href)}" style="${linkStyle}">${escapeHtml(company.whatsapp.label)}</a> o `
		: '';
	return `¿Tienes dudas? Escríbenos ${whatsapp}a <a href="mailto:${escapeHtml(company.email)}" style="${linkStyle}">${escapeHtml(company.email)}</a>.`;
}

const paragraphHtml = (text: string) =>
	`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${textColor};">${escapeHtml(text)}</p>`;

function detailsHtml(details: EmailDetail[]): string {
	const rows = details
		.map(
			(detail) =>
				`<tr><td style="padding:10px 12px;border-bottom:1px solid ${borderColor};font-size:14px;color:${mutedColor};vertical-align:top;width:40%;">${escapeHtml(detail.label)}</td><td style="padding:10px 12px;border-bottom:1px solid ${borderColor};font-size:15px;color:${textColor};font-weight:600;vertical-align:top;">${escapeHtml(detail.value)}</td></tr>`,
		)
		.join('');
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${borderColor};border-radius:8px;margin:0 0 20px;">${rows}</table>`;
}

function ctaHtml(cta: { label: string; url: string }): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:8px;background:${brandColor};"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a></td></tr></table>`;
}

export function renderEmail(input: EmailLayoutInput): EmailContent {
	const body = [
		`<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${textColor};">${escapeHtml(input.heading)}</h1>`,
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
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${fontStack};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="padding:20px 24px;background:${brandColor};font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(company.brandName)}</td></tr>
<tr><td style="padding:28px 24px 12px;">${body}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid ${borderColor};font-size:13px;line-height:1.6;color:${mutedColor};">${contactLineHtml()}</td></tr>
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
