import { createHmac, timingSafeEqual } from 'node:crypto';
import { TICKET_SIGNING_SECRET } from 'astro:env/server';

export type BookingTokenPurpose = 'ticket' | 'review' | 'balance';

export function signBookingToken(code: string, purpose: BookingTokenPurpose): string {
	return createHmac('sha256', TICKET_SIGNING_SECRET).update(`${purpose}:${code}`).digest('base64url');
}

export function verifyBookingToken(code: string, purpose: BookingTokenPurpose, token: string): boolean {
	const expected = Buffer.from(signBookingToken(code, purpose));
	const received = Buffer.from(token);
	return expected.length === received.length && timingSafeEqual(expected, received);
}

export function ticketUrl(origin: string, code: string): string {
	return `${origin}/account/bookings/${encodeURIComponent(code)}?token=${signBookingToken(code, 'ticket')}`;
}

export function reviewUrl(origin: string, code: string): string {
	return `${origin}/account/reviews/new?code=${encodeURIComponent(code)}&token=${signBookingToken(code, 'review')}`;
}
