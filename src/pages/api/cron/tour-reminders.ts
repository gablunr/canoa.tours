import type { APIRoute } from 'astro';
import { bookingIdsAlreadyEmailed, isAuthorizedCron, localDate, sendBookingEmails, unauthorizedCronResponse } from '../../../lib/cron';
import { siteOrigin } from '../../../lib/site-origin';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
	if (!isAuthorizedCron(request)) return unauthorizedCronResponse();

	const tomorrow = localDate(1);
	const { data, error } = await supabaseAdmin.from('bookings').select('id').eq('tour_date', tomorrow).eq('status', 'confirmed');
	if (error) {
		console.error('tour reminders query failed', error);
		return Response.json({ error: 'query_failed' }, { status: 500 });
	}

	const bookingIds = (data ?? []).map((booking) => booking.id);
	const alreadyReminded = await bookingIdsAlreadyEmailed(bookingIds, 'tour_reminder');
	const pendingIds = bookingIds.filter((bookingId) => !alreadyReminded.has(bookingId));
	const { sent, failed } = await sendBookingEmails(pendingIds, 'tour_reminder', siteOrigin(url));

	return Response.json({ date: tomorrow, bookings: bookingIds.length, skipped: alreadyReminded.size, sent, failed });
};
