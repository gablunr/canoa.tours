import type { APIRoute } from 'astro';
import type { BookingDetails } from '../../../lib/booking/booking-details';
import { renderBookingEmail, type BookingEmailKind } from '../../../lib/email/booking-emails';
import type { EmailContent } from '../../../lib/email/templates/layout';
import { magicLinkEmail } from '../../../lib/email/templates/magic-link';
import { teamDeparturesPendingEmail } from '../../../lib/email/templates/team-departures-pending';

export const prerender = false;

const sampleBooking: BookingDetails = {
	id: '00000000-0000-0000-0000-000000000000',
	code: 'CTAAQAFT',
	status: 'confirmed',
	tourDate: '2026-10-09',
	productId: '00000000-0000-0000-0000-000000000001',
	productKey: 'isla-saona/catamaran',
	productName: 'Isla Saona en catamarán',
	tourPath: '/isla-saona/catamaran',
	startTime: '06:30',
	pickupTo: '07:30',
	returnAt: '18:00',
	adults: 2,
	children: 1,
	infants: 0,
	seats: 3,
	leadName: 'María López',
	leadPhone: '+34600000000',
	customerId: '00000000-0000-0000-0000-000000000002',
	customerEmail: 'maria@example.com',
	customerName: 'María López',
	stripeCustomerId: null,
	hotel: 'Alsol del Mar',
	zone: 'Cap Cana',
	pickupTime: null,
	pickupFeePending: false,
	hasInsurance: true,
	currency: 'USD',
	subtotal: 145,
	pickupTotal: 75,
	insuranceTotal: 14.97,
	discountTotal: 0,
	total: 234.97,
	depositAmount: 59.97,
	balanceAmount: 175,
	dateChangesCount: 0,
	stripePaymentMethodId: null,
};

const bookingPreviews: Record<BookingEmailKind, string> = {
	confirmed: 'Reserva confirmada',
	tour_reminder: 'Recordatorio del tour',
	date_changed: 'Cambio de fecha',
	cancelled: 'Cancelación con reembolso',
	no_seats_refunded: 'Sin plazas y reembolso',
	no_show_charged: 'Cobro por no presentarse',
	balance_payment_link: 'Enlace para pagar el resto',
	review_request: 'Petición de opinión',
};

const otherPreviews: Record<string, { label: string; render: (origin: string) => EmailContent }> = {
	magic_link: {
		label: 'Enlace de acceso',
		render: (origin) => magicLinkEmail(`${origin}/account/callback?token_hash=ejemplo&type=magiclink&next=/account`),
	},
	team_departures_pending: {
		label: 'Aviso al equipo de salidas sin enviar',
		render: (origin) =>
			teamDeparturesPendingEmail({
				date: '2026-10-09',
				rows: [
					{ productName: 'Isla Saona en catamarán', bookings: 4, seats: 11 },
					{ productName: 'Buggies en Punta Cana', bookings: 2, seats: 4 },
				],
				manageUrl: `${origin}/manage/departures?date=2026-10-09`,
			}),
	},
};

function renderPreview(kind: string, origin: string): EmailContent | null {
	if (kind in bookingPreviews) {
		return renderBookingEmail(kind as BookingEmailKind, sampleBooking, {
			origin,
			refundAmount: 45,
			chargedAmount: 175,
			paymentUrl: 'https://checkout.stripe.com/c/pay/ejemplo',
		});
	}
	return otherPreviews[kind]?.render(origin) ?? null;
}

function indexHtml(): string {
	const links = [
		...Object.entries(bookingPreviews).map(([kind, label]) => ({ kind, label })),
		...Object.entries(otherPreviews).map(([kind, preview]) => ({ kind, label: preview.label })),
	]
		.map(({ kind, label }) => `<li><a href="?kind=${kind}">${label}</a> <a href="?kind=${kind}&format=text">(texto)</a></li>`)
		.join('');
	return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Emails</title></head><body style="font-family:system-ui;padding:32px;line-height:1.8"><h1>Emails</h1><ul>${links}</ul></body></html>`;
}

export const GET: APIRoute = ({ url }) => {
	if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });

	const kind = url.searchParams.get('kind');
	if (!kind) return new Response(indexHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

	const email = renderPreview(kind, url.origin);
	if (!email) return new Response('Email desconocido', { status: 404 });

	if (url.searchParams.get('format') === 'text') {
		return new Response(`Asunto: ${email.subject}\n\n${email.text}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	}
	return new Response(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
