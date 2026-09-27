import Stripe from 'stripe';
import { sendBookingEmail } from '../email/booking-emails';
import { stripe } from '../stripe';
import { supabaseAdmin } from '../supabase/admin';
import { loadBookingDetails, type BookingDetails } from './booking-details';
import { toCents } from './pricing';
import { ticketUrl } from './tokens';

type PaymentKind = 'deposit' | 'balance' | 'no_show_charge' | 'refund';
type PaymentStatus = 'pending' | 'succeeded' | 'failed';

const checkoutSessionLifetimeSeconds = 31 * 60;

const savedCardNotice =
	'Guardamos tu tarjeta de forma segura con Stripe. Solo la usaremos para cobrar el saldo pendiente si no te presentas a la excursión y no has contratado el seguro de cancelación.';

export async function recordPayment(input: {
	bookingId: string;
	providerRef: string;
	kind: PaymentKind;
	status: PaymentStatus;
	amount: number;
	currency: string;
}): Promise<void> {
	const { error } = await supabaseAdmin.rpc('record_payment', {
		p_booking_id: input.bookingId,
		p_provider: 'stripe',
		p_provider_ref: input.providerRef,
		p_kind: input.kind,
		p_status: input.status,
		p_amount: input.amount,
		p_currency: input.currency.toUpperCase(),
	});
	if (error) throw error;
}

export function refundPaymentStatus(refundStatus: string | null): PaymentStatus {
	if (refundStatus === 'succeeded') return 'succeeded';
	if (refundStatus === 'failed' || refundStatus === 'canceled') return 'failed';
	return 'pending';
}

export async function ensureStripeCustomer(customer: {
	id: string;
	email: string;
	name: string;
	stripeCustomerId: string | null;
}): Promise<string> {
	if (customer.stripeCustomerId) return customer.stripeCustomerId;

	const stripeCustomer = await stripe.customers.create(
		{ email: customer.email, name: customer.name, metadata: { customer_id: customer.id } },
		{ idempotencyKey: `customer_${customer.id}` },
	);

	const { error } = await supabaseAdmin
		.from('customers')
		.update({ stripe_customer_id: stripeCustomer.id })
		.eq('id', customer.id)
		.is('stripe_customer_id', null);
	if (error) throw error;

	return stripeCustomer.id;
}

export async function createCheckoutSession(input: {
	bookingId: string;
	bookingCode: string;
	productName: string;
	amount: number;
	currency: string;
	customer: { id: string; email: string; name: string; stripeCustomerId: string | null };
	origin: string;
	cancelPath: string;
}): Promise<{ id: string; url: string }> {
	const stripeCustomerId = await ensureStripeCustomer(input.customer);
	const metadata = { booking_id: input.bookingId, booking_code: input.bookingCode, kind: 'deposit' };

	const session = await stripe.checkout.sessions.create(
		{
			mode: 'payment',
			customer: stripeCustomerId,
			client_reference_id: input.bookingId,
			line_items: [
				{
					quantity: 1,
					price_data: {
						currency: input.currency.toLowerCase(),
						unit_amount: toCents(input.amount),
						product_data: {
							name: input.productName,
							description: `Reserva ${input.bookingCode}. Pago al reservar, el resto se paga el día del tour.`,
						},
					},
				},
			],
			payment_intent_data: {
				setup_future_usage: 'off_session',
				description: `Reserva ${input.bookingCode}`,
				metadata,
			},
			metadata,
			expires_at: Math.floor(Date.now() / 1000) + checkoutSessionLifetimeSeconds,
			success_url: `${input.origin}/booking/confirmed?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${input.origin}${input.cancelPath}`,
			locale: 'es',
			custom_text: { submit: { message: savedCardNotice } },
		},
		{ idempotencyKey: `checkout_deposit_${input.bookingId}` },
	);

	if (!session.url) throw new Error('checkout_url_missing');

	const { error } = await supabaseAdmin.from('bookings').update({ stripe_checkout_session_id: session.id }).eq('id', input.bookingId);
	if (error) throw error;

	return { id: session.id, url: session.url };
}

export async function refundDeposit(
	bookingId: string,
	amount: number,
	reason: string,
): Promise<{ refundId: string; amount: number } | null> {
	if (amount <= 0) return null;

	const { data: deposit, error } = await supabaseAdmin
		.from('payments')
		.select('provider_ref, amount, currency')
		.eq('booking_id', bookingId)
		.eq('provider', 'stripe')
		.eq('kind', 'deposit')
		.eq('status', 'succeeded')
		.not('provider_ref', 'is', null)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) throw error;
	if (!deposit?.provider_ref) return null;

	const refundCents = Math.min(toCents(amount), toCents(Number(deposit.amount)));
	const refund = await stripe.refunds.create(
		{ payment_intent: deposit.provider_ref, amount: refundCents, metadata: { booking_id: bookingId, reason } },
		{ idempotencyKey: `refund_${deposit.provider_ref}_${refundCents}` },
	);

	await recordPayment({
		bookingId,
		providerRef: refund.id,
		kind: 'refund',
		status: refundPaymentStatus(refund.status),
		amount: refund.amount / 100,
		currency: refund.currency,
	});

	return { refundId: refund.id, amount: refund.amount / 100 };
}

async function createBalancePaymentLink(details: BookingDetails, origin: string, stripeCustomerId: string | null): Promise<string> {
	const metadata = { booking_id: details.id, booking_code: details.code, kind: 'no_show_charge' };
	const bookingTicketUrl = ticketUrl(origin, details.code);

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: details.customerEmail }),
		client_reference_id: details.id,
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: details.currency.toLowerCase(),
					unit_amount: toCents(details.balanceAmount),
					product_data: { name: details.productName, description: `Saldo pendiente de la reserva ${details.code}` },
				},
			},
		],
		payment_intent_data: { description: `Saldo pendiente de la reserva ${details.code}`, metadata },
		metadata,
		success_url: bookingTicketUrl,
		cancel_url: bookingTicketUrl,
		locale: 'es',
	});

	if (!session.url) throw new Error('checkout_url_missing');
	return session.url;
}

async function recordBookingEvent(bookingId: string, type: string, data: Record<string, string | number | null>) {
	const { error } = await supabaseAdmin.from('booking_events').insert({ booking_id: bookingId, type, data });
	if (error) console.error('booking_event_not_recorded', { bookingId, type, error });
}

async function sendBalancePaymentLink(details: BookingDetails, origin: string) {
	const paymentUrl = await createBalancePaymentLink(details, origin, details.stripeCustomerId);
	await sendBookingEmail('balance_payment_link', details.id, { origin, paymentUrl });
	await recordBookingEvent(details.id, 'no_show_payment_link_sent', { amount: details.balanceAmount });
	return { status: 'payment_link_sent' as const };
}

export async function chargeNoShowBalance(
	bookingId: string,
	origin: string,
): Promise<{ status: 'charged' | 'payment_link_sent' | 'nothing_to_charge' | 'failed'; message?: string }> {
	const details = await loadBookingDetails({ id: bookingId });
	if (!details) return { status: 'failed', message: 'booking_not_found' };
	if (details.balanceAmount <= 0 || details.hasInsurance) return { status: 'nothing_to_charge' };

	if (!details.stripeCustomerId || !details.stripePaymentMethodId) {
		try {
			return await sendBalancePaymentLink(details, origin);
		} catch (error) {
			return { status: 'failed', message: error instanceof Error ? error.message : 'payment_link_failed' };
		}
	}

	try {
		const paymentIntent = await stripe.paymentIntents.create(
			{
				amount: toCents(details.balanceAmount),
				currency: details.currency.toLowerCase(),
				customer: details.stripeCustomerId,
				payment_method: details.stripePaymentMethodId,
				off_session: true,
				confirm: true,
				description: `Saldo por no presentarse, reserva ${details.code}`,
				metadata: { booking_id: details.id, booking_code: details.code, kind: 'no_show_charge' },
			},
			{ idempotencyKey: `no_show_charge_${details.id}` },
		);

		if (paymentIntent.status === 'requires_action') return await sendBalancePaymentLink(details, origin);

		const chargedAmount = paymentIntent.amount / 100;
		await recordPayment({
			bookingId: details.id,
			providerRef: paymentIntent.id,
			kind: 'no_show_charge',
			status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
			amount: chargedAmount,
			currency: paymentIntent.currency,
		});

		if (paymentIntent.status === 'succeeded') {
			await sendBookingEmail('no_show_charged', details.id, { origin, chargedAmount }).catch((error) =>
				console.error('no_show_email_not_sent', { bookingId, error }),
			);
		}

		return { status: 'charged' };
	} catch (error) {
		if (error instanceof Stripe.errors.StripeError && error.code === 'authentication_required') {
			try {
				return await sendBalancePaymentLink(details, origin);
			} catch (linkError) {
				return { status: 'failed', message: linkError instanceof Error ? linkError.message : 'payment_link_failed' };
			}
		}

		const message = error instanceof Error ? error.message : 'no_show_charge_failed';
		await recordBookingEvent(details.id, 'no_show_charge_failed', { message });
		return { status: 'failed', message };
	}
}
