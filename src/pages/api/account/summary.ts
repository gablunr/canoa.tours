import type { APIRoute } from 'astro';
import { formatBookingDate, isUpcoming, loadCustomerBookings, loadCustomerProfile } from '../../../lib/account/bookings';
import { firstName } from '../../../lib/email/templates/layout';

export const prerender = false;

const privateJson = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });

export const GET: APIRoute = async ({ locals }) => {
	const { user, supabase, staffRole } = locals;
	if (!user) return privateJson({ signedIn: false });

	const customer = await loadCustomerProfile(supabase, user.id);
	const bookings = customer ? await loadCustomerBookings(supabase, customer.id) : [];

	const upcoming = bookings.filter((booking) => isUpcoming(booking));
	const next = upcoming[0];
	const awaitingReview = bookings.filter((booking) => booking.status === 'completed' && !booking.hasReview).at(-1);

	return privateJson({
		signedIn: true,
		firstName: customer ? firstName(customer.fullName) : null,
		email: user.email ?? null,
		isStaff: staffRole !== null,
		upcomingCount: upcoming.length,
		nextBooking: next
			? { productName: next.productName, date: formatBookingDate(next.tourDate), href: `/account/bookings/${next.code}` }
			: null,
		reviewHref: awaitingReview ? `/account/reviews/new?code=${awaitingReview.code}` : null,
	});
};
