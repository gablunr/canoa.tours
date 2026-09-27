import type { APIRoute } from 'astro';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import type Stripe from 'stripe';
import { dbErrorCode } from '../../../lib/booking/errors';
import { recordPayment, refundDeposit, refundPaymentStatus } from '../../../lib/booking/payments';
import { sendBookingEmail, type BookingEmailKind, type BookingEmailOptions } from '../../../lib/email/booking-emails';
import { siteOrigin } from '../../../lib/site-origin';
import { stripe } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import type { Enums } from '../../../lib/supabase/types';

export const prerender = false;

const seatLossErrorCodes = new Set(['not_enough_seats', 'coupon_exhausted', 'day_closed']);

interface BookingStateRow {
	id: string;
	status: string;
	customer_id: string;
}

const stripeId = (reference: string | { id: string } | null | undefined) =>
	typeof reference === 'string' ? reference : (reference?.id ?? null);

async function sendEmailSafely(kind: BookingEmailKind, bookingId: string, options: BookingEmailOptions) {
	try {
		await sendBookingEmail(kind, bookingId, options);
	} catch (error) {
		console.error('stripe_webhook_email_not_sent', { kind, bookingId, error });
	}
}

async function loadBookingState(bookingId: string): Promise<BookingStateRow | null> {
	const { data, error } = await supabaseAdmin.from('bookings').select('id, status, customer_id').eq('id', bookingId).maybeSingle();
	if (error) throw error;
	return (data as BookingStateRow | null) ?? null;
}

async function paymentExists(providerRef: string, status: Enums<'payment_status'>): Promise<boolean> {
	const { data, error } = await supabaseAdmin.from('payments').select('id').eq('provider_ref', providerRef).eq('status', status).maybeSingle();
	if (error) throw error;
	return data !== null;
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

async function handleDepositCompleted(session: Stripe.Checkout.Session, bookingId: string, origin: string) {
	const paymentIntentId = stripeId(session.payment_intent);
	if (!paymentIntentId || session.payment_status !== 'paid') return;

	const booking = await loadBookingState(bookingId);
	if (!booking) {
		console.error('stripe_webhook_booking_missing', { bookingId, sessionId: session.id });
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

	if (booking.status === 'cancelled') console.error('stripe_webhook_paid_cancelled_booking', { bookingId, paymentIntentId });
	if (booking.status === 'confirmed' || booking.status === 'cancelled') return;

	const { error: confirmError } = await supabaseAdmin.rpc('confirm_booking', { p_booking_id: bookingId });
	if (!confirmError) {
		await sendEmailSafely('confirmed', bookingId, { origin });
		return;
	}

	const code = dbErrorCode(confirmError);
	if (!code || !seatLossErrorCodes.has(code)) throw confirmError;

	const refund = await refundDeposit(bookingId, paidAmount, code);
	const { error: cancelError } = await supabaseAdmin.rpc('cancel_booking', { p_booking_id: bookingId, p_reason: code });
	if (cancelError) throw cancelError;

	await sendEmailSafely('no_seats_refunded', bookingId, { origin, refundAmount: refund?.amount ?? paidAmount });
}

async function handleNoShowChargeCompleted(session: Stripe.Checkout.Session, bookingId: string, origin: string) {
	const paymentIntentId = stripeId(session.payment_intent);
	if (!paymentIntentId || session.payment_status !== 'paid') return;
	if (await paymentExists(paymentIntentId, 'succeeded')) return;

	const chargedAmount = (session.amount_total ?? 0) / 100;
	await recordPayment({
		bookingId,
		providerRef: paymentIntentId,
		kind: 'no_show_charge',
		status: 'succeeded',
		amount: chargedAmount,
		currency: session.currency ?? 'usd',
	});
	await sendEmailSafely('no_show_charged', bookingId, { origin, chargedAmount });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, origin: string) {
	const bookingId = session.metadata?.booking_id;
	if (!bookingId) return;

	if (session.metadata?.kind === 'deposit') await handleDepositCompleted(session, bookingId, origin);
	else if (session.metadata?.kind === 'no_show_charge') await handleNoShowChargeCompleted(session, bookingId, origin);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
	const bookingId = session.metadata?.booking_id;
	if (!bookingId || session.metadata?.kind !== 'deposit') return;

	const { error } = await supabaseAdmin.from('bookings').update({ status: 'expired' }).eq('id', bookingId).eq('status', 'pending_payment');
	if (error) throw error;
}

async function handleChargeRefunded(charge: Stripe.Charge) {
	const paymentIntentId = stripeId(charge.payment_intent);
	if (!paymentIntentId) return;

	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
	const bookingId = paymentIntent.metadata?.booking_id;
	if (!bookingId) return;

	const refunds = await stripe.refunds.list({ charge: charge.id, limit: 100 });
	for (const refund of refunds.data) {
		const status = refundPaymentStatus(refund.status);
		if (refund.amount <= 0 || (await paymentExists(refund.id, status))) continue;

		await recordPayment({
			bookingId,
			providerRef: refund.id,
			kind: 'refund',
			status,
			amount: refund.amount / 100,
			currency: refund.currency,
		});
	}
}

async function handleEvent(event: Stripe.Event, origin: string) {
	switch (event.type) {
		case 'checkout.session.completed':
			await handleCheckoutCompleted(event.data.object, origin);
			break;
		case 'checkout.session.expired':
			await handleCheckoutExpired(event.data.object);
			break;
		case 'charge.refunded':
			await handleChargeRefunded(event.data.object);
			break;
	}
}

export const POST: APIRoute = async ({ request, url }) => {
	const signature = request.headers.get('stripe-signature');
	if (!signature) return new Response('Missing signature', { status: 400 });

	const body = await request.text();
	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (error) {
		console.error('stripe_webhook_bad_signature', error);
		return new Response('Invalid signature', { status: 400 });
	}

	try {
		await handleEvent(event, siteOrigin(url));
	} catch (error) {
		console.error('stripe_webhook_failed', { eventId: event.id, type: event.type, error });
		return new Response('Webhook handler failed', { status: 500 });
	}

	return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
