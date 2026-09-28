import { CRON_SECRET } from 'astro:env/server';
import { claimBookingEmail, releaseBookingEmailClaim } from './email/booking-email-claims';
import { sendBookingEmail } from './email/booking-emails';
import { supabaseAdmin } from './supabase/admin';

type BookingEmailKind = Parameters<typeof sendBookingEmail>[0];

const santoDomingoOffsetMs = -4 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

export function isAuthorizedCron(request: Request): boolean {
	if (!CRON_SECRET) return false;
	return request.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

export function localDate(offsetDays = 0, now = new Date()): string {
	return new Date(now.getTime() + santoDomingoOffsetMs + offsetDays * dayMs).toISOString().slice(0, 10);
}

export function unauthorizedCronResponse(): Response {
	return Response.json({ error: 'unauthorized' }, { status: 401 });
}

export async function bookingIdsAlreadyEmailed(bookingIds: string[], kind: string): Promise<Set<string>> {
	if (bookingIds.length === 0) return new Set();
	const { data, error } = await supabaseAdmin
		.from('booking_events')
		.select('booking_id')
		.in('booking_id', bookingIds)
		.eq('type', 'email_sent')
		.eq('data->>kind', kind);
	if (error) throw error;
	return new Set((data ?? []).map((event) => event.booking_id));
}

async function sendBookingEmailWithRetry(kind: BookingEmailKind, bookingId: string, origin: string) {
	try {
		await sendBookingEmail(kind, bookingId, { origin });
	} catch {
		await sendBookingEmail(kind, bookingId, { origin });
	}
}

export async function sendBookingEmails(bookingIds: string[], kind: BookingEmailKind, origin: string) {
	let sent = 0;
	let failed = 0;
	for (const bookingId of bookingIds) {
		try {
			if (!(await claimBookingEmail(bookingId, kind))) continue;
		} catch (error) {
			failed += 1;
			console.error(`cron email ${kind} not claimed for ${bookingId}`, error);
			continue;
		}

		try {
			await sendBookingEmailWithRetry(kind, bookingId, origin);
			sent += 1;
		} catch (error) {
			failed += 1;
			await releaseBookingEmailClaim(bookingId, kind);
			console.error(`cron email ${kind} failed for ${bookingId}`, error);
		}
	}
	return { sent, failed };
}
