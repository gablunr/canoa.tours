import type { APIRoute } from 'astro';
import { formatBookingDate, loadCustomerBookings, loadCustomerProfile, suggestedAuthorName } from '../../../lib/account/bookings';

export const prerender = false;

const privateJson = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });

export const GET: APIRoute = async ({ locals }) => {
	const { user, supabase } = locals;
	if (!user) return privateJson({ signedIn: false });

	const customer = await loadCustomerProfile(supabase, user.id);
	const bookings = customer ? await loadCustomerBookings(supabase, customer.id) : [];

	return privateJson({
		signedIn: true,
		suggestedAuthor: customer ? suggestedAuthorName(customer.fullName) : '',
		bookings: bookings
			.filter((booking) => booking.status === 'completed')
			.reverse()
			.map((booking) => ({
				code: booking.code,
				productKey: booking.productKey,
				productName: booking.productName,
				dateLabel: formatBookingDate(booking.tourDate),
				hasReview: booking.hasReview,
			})),
	});
};
