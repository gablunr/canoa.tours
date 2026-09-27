import type { APIRoute } from 'astro';
import { bookingIdsAlreadyEmailed, isAuthorizedCron, localDate, sendBookingEmails, unauthorizedCronResponse } from '../../../lib/cron';
import { siteOrigin } from '../../../lib/site-origin';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
	if (!isAuthorizedCron(request)) return unauthorizedCronResponse();

	const { data: autoCompleted, error: completeError } = await supabaseAdmin.rpc('complete_past_bookings');
	if (completeError) console.error('complete past bookings failed', completeError);

	const yesterday = localDate(-1);
	const { data, error } = await supabaseAdmin.from('bookings').select('id').eq('tour_date', yesterday).eq('status', 'completed');
	if (error) {
		console.error('review requests query failed', error);
		return Response.json({ error: 'query_failed' }, { status: 500 });
	}

	const bookingIds = (data ?? []).map((booking) => booking.id);
	const { data: reviews, error: reviewsError } =
		bookingIds.length > 0 ? await supabaseAdmin.from('reviews').select('booking_id').in('booking_id', bookingIds) : { data: [], error: null };
	if (reviewsError) {
		console.error('review requests reviews query failed', reviewsError);
		return Response.json({ error: 'query_failed' }, { status: 500 });
	}

	const reviewed = new Set((reviews ?? []).map((review) => review.booking_id));
	const alreadyAsked = await bookingIdsAlreadyEmailed(bookingIds, 'review_request');
	const pendingIds = bookingIds.filter((bookingId) => !reviewed.has(bookingId) && !alreadyAsked.has(bookingId));
	const { sent, failed } = await sendBookingEmails(pendingIds, 'review_request', siteOrigin(url));

	return Response.json({
		date: yesterday,
		autoCompleted: autoCompleted ?? 0,
		bookings: bookingIds.length,
		alreadyReviewed: reviewed.size,
		alreadyAsked: alreadyAsked.size,
		sent,
		failed,
	});
};
