import type Stripe from 'stripe';
import { sendBookingEmail, type BookingEmailKind, type BookingEmailOptions } from '../email/booking-emails';
import { stripe } from '../stripe';
import { supabaseAdmin } from '../supabase/admin';
import { dbErrorCode } from './errors';
import { recordPayment, refundDeposit } from './payments';

const seatLossErrorCodes = new Set(['not_enough_seats', 'coupon_exhausted', 'day_closed']);

interface BookingStateRow {
	id: string;
	status: string;
	customer_id: string;
}

export const stripeId = (reference: string | { id: string } | null | undefined) =>
	typeof reference === 'string' ? reference : (reference?.id ?? null);

export async function sendBookingEmailSafely(kind: BookingEmailKind, bookingId: string, options: BookingEmailOptions) {
	try {
		await sendBookingEmail(kind, bookingId, options);
	} catch (error) {
		console.error('booking_email_not_sent', { kind, bookingId, error });
	}
}

async function loadBookingState(bookingId: string): Promise<BookingStateRow | null> {
	const { data, error } = await supabaseAdmin.from('bookings').select('id, status, customer_id').eq('id', bookingId).maybeSingle();
	if (error) throw error;
	return (data as BookingStateRow | null) ?? null;
}

async function saveSavedCard(booking: BookingStateRow, paymentIntentId: string) {
	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
	const paymentMethodId = stripeId(paymentIntent.payment_method);
	const stripeCustomerId = stripeId(paymentIntent.customer);

	if (paymentMethodId) {
		const { error } = await supabaseAdmin.from('bookings').update({ stripe_payment_method_id: paymentMethodId }).eq('id', booking.id);
		if (error) throw error;
	}

	if (stripeCustomerId) {
		const { error } = await supabaseAdmin
			.from('customers')
			.update({ stripe_customer_id: stripeCustomerId })
			.eq('id', booking.customer_id)
			.is('stripe_customer_id', null);
		if (error) throw error;
	}
}

export async function fulfillDepositCheckout(session: Stripe.Checkout.Session, origin: string) {
	const bookingId = session.metadata?.booking_id;
	const paymentIntentId = stripeId(session.payment_intent);
	if (!bookingId || session.metadata?.kind !== 'deposit' || !paymentIntentId || session.payment_status !== 'paid') return;

	const booking = await loadBookingState(bookingId);
	if (!booking) {
		console.error('deposit_fulfillment_booking_missing', { bookingId, sessionId: session.id });
		return;
	}

	const paidAmount = (session.amount_total ?? 0) / 100;
	await recordPayment({
		bookingId,
		providerRef: paymentIntentId,
		kind: 'deposit',
		status: 'succeeded',
		amount: paidAmount,
		currency: session.currency ?? 'usd',
	});
	await saveSavedCard(booking, paymentIntentId);

	if (booking.status === 'cancelled') console.error('deposit_paid_for_cancelled_booking', { bookingId, paymentIntentId });
	if (booking.status === 'confirmed' || booking.status === 'cancelled') return;

	const { data: confirmedNow, error: confirmError } = await supabaseAdmin.rpc('confirm_booking', { p_booking_id: bookingId });
	if (!confirmError) {
		if (confirmedNow) await sendBookingEmailSafely('confirmed', bookingId, { origin });
		return;
	}

	const code = dbErrorCode(confirmError);
	if (!code || !seatLossErrorCodes.has(code)) throw confirmError;

	const refund = await refundDeposit(bookingId, paidAmount, code);
	const { error: cancelError } = await supabaseAdmin.rpc('cancel_booking', { p_booking_id: bookingId, p_reason: code });
	if (cancelError) throw cancelError;

	await sendBookingEmailSafely('no_seats_refunded', bookingId, { origin, refundAmount: refund?.amount ?? paidAmount });
}
