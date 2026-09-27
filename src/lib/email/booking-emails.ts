import { TEAM_EMAIL } from 'astro:env/server';
import { loadBookingDetails, type BookingDetails } from '../booking/booking-details';
import { reviewUrl, ticketUrl } from '../booking/tokens';
import { supabaseAdmin } from '../supabase/admin';
import { sendEmail } from './send';
import { balancePaymentLinkEmail } from './templates/balance-payment-link';
import { bookingCancelledEmail } from './templates/booking-cancelled';
import { bookingConfirmedEmail } from './templates/booking-confirmed';
import { bookingDateChangedEmail } from './templates/booking-date-changed';
import { bookingNoSeatsRefundedEmail } from './templates/booking-no-seats-refunded';
import type { EmailContent } from './templates/layout';
import { noShowChargedEmail } from './templates/no-show-charged';
import { reviewRequestEmail } from './templates/review-request';
import { tourReminderEmail } from './templates/tour-reminder';

export type BookingEmailKind =
	| 'confirmed'
	| 'no_seats_refunded'
	| 'date_changed'
	| 'cancelled'
	| 'balance_payment_link'
	| 'tour_reminder'
	| 'review_request'
	| 'no_show_charged';

export interface BookingEmailOptions {
	origin: string;
	refundAmount?: number;
	paymentUrl?: string;
	chargedAmount?: number;
}

export function renderBookingEmail(kind: BookingEmailKind, details: BookingDetails, options: BookingEmailOptions): EmailContent {
	const bookingTicketUrl = ticketUrl(options.origin, details.code);
	const tourUrl = `${options.origin}${details.tourPath}`;

	switch (kind) {
		case 'confirmed':
			return bookingConfirmedEmail(details, { ticketUrl: bookingTicketUrl });
		case 'no_seats_refunded':
			return bookingNoSeatsRefundedEmail(details, { refundAmount: options.refundAmount ?? details.depositAmount, tourUrl });
		case 'date_changed':
			return bookingDateChangedEmail(details, { ticketUrl: bookingTicketUrl });
		case 'cancelled':
			return bookingCancelledEmail(details, { refundAmount: options.refundAmount, tourUrl });
		case 'balance_payment_link':
			if (!options.paymentUrl) throw new Error('payment_url_required');
			return balancePaymentLinkEmail(details, { paymentUrl: options.paymentUrl, amount: details.balanceAmount });
		case 'tour_reminder':
			return tourReminderEmail(details, { ticketUrl: bookingTicketUrl });
		case 'review_request':
			return reviewRequestEmail(details, { reviewUrl: reviewUrl(options.origin, details.code) });
		case 'no_show_charged':
			return noShowChargedEmail(details, { chargedAmount: options.chargedAmount ?? details.balanceAmount });
	}
}

export async function sendBookingEmail(kind: BookingEmailKind, bookingId: string, options: BookingEmailOptions): Promise<void> {
	const details = await loadBookingDetails({ id: bookingId });
	if (!details) throw new Error('booking_not_found');
	if (!details.customerEmail) throw new Error('customer_email_missing');

	const email = renderBookingEmail(kind, details, options);
	await sendEmail({ to: details.customerEmail, subject: email.subject, html: email.html, text: email.text, replyTo: TEAM_EMAIL });

	const { error } = await supabaseAdmin.from('booking_events').insert({ booking_id: bookingId, type: 'email_sent', data: { kind } });
	if (error) console.error('booking_email_event_not_recorded', { bookingId, kind, error });
}
