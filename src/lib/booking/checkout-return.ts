import { stripe } from '../stripe';
import { loadBookingDetails, type BookingDetails } from './booking-details';
import { fulfillDepositCheckout } from './fulfillment';

export type CheckoutReturnState = 'confirmed' | 'processing' | 'awaiting_payment' | 'cancelled' | 'expired';

export interface CheckoutReturn {
	state: CheckoutReturnState;
	details: BookingDetails;
	resumeUrl: string | null;
}

const checkoutSessionIdPattern = /^cs_(test|live)_\w{10,250}$/;

const settledStates: Partial<Record<string, CheckoutReturnState>> = {
	confirmed: 'confirmed',
	completed: 'confirmed',
	no_show: 'confirmed',
	cancelled: 'cancelled',
};

const settledState = (details: BookingDetails) => settledStates[details.status] ?? null;

export async function loadCheckoutReturn(sessionId: string, origin: string): Promise<CheckoutReturn | null> {
	if (!checkoutSessionIdPattern.test(sessionId)) return null;

	const details = await loadBookingDetails({ checkoutSessionId: sessionId });
	if (!details) return null;

	const state = settledState(details);
	if (state) return { state, details, resumeUrl: null };

	const session = await stripe.checkout.sessions.retrieve(sessionId);
	if (session.metadata?.booking_id !== details.id) return null;

	if (session.payment_status === 'paid') {
		try {
			await fulfillDepositCheckout(session, origin);
		} catch (error) {
			console.error('checkout_return_not_fulfilled', { sessionId, error });
			return { state: 'processing', details, resumeUrl: null };
		}

		const fulfilled = (await loadBookingDetails({ id: details.id })) ?? details;
		return { state: settledState(fulfilled) ?? 'processing', details: fulfilled, resumeUrl: null };
	}

	if (session.status === 'open') return { state: 'awaiting_payment', details, resumeUrl: session.url };
	return { state: 'expired', details, resumeUrl: null };
}
