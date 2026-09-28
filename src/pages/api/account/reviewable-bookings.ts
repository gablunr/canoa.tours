import type { APIRoute } from 'astro';
import { formatBookingDate, loadCustomerBookings, loadCustomerProfile, suggestedAuthorName } from '../../../lib/account/bookings';
import { slicePage } from '../../../lib/manage/list-page';

export const prerender = false;

const pickerPageSize = 6;

type ReviewableFilter = 'pending' | 'reviewed' | 'all';

const filterMatches: Record<ReviewableFilter, (booking: { hasReview: boolean }) => boolean> = {
	pending: (booking) => !booking.hasReview,
	reviewed: (booking) => booking.hasReview,
	all: () => true,
};

const isReviewableFilter = (value: string | null): value is ReviewableFilter => value !== null && Object.hasOwn(filterMatches, value);

const privateJson = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });

export const GET: APIRoute = async ({ locals, url }) => {
	const { user, supabase } = locals;
	if (!user) return privateJson({ signedIn: false });

	const customer = await loadCustomerProfile(supabase, user.id);
	const bookings = customer ? await loadCustomerBookings(supabase, customer.id) : [];

	const reviewable = bookings
		.filter((booking) => booking.status === 'completed')
		.reverse()
		.map((booking) => ({
			code: booking.code,
			productKey: booking.productKey,
			productName: booking.productName,
			dateLabel: formatBookingDate(booking.tourDate),
			hasReview: booking.hasReview,
		}));

	const counts: Record<ReviewableFilter, number> = {
		pending: reviewable.filter(filterMatches.pending).length,
		reviewed: reviewable.filter(filterMatches.reviewed).length,
		all: reviewable.length,
	};

	const requestedFilter = url.searchParams.get('filter');
	const filter: ReviewableFilter = isReviewableFilter(requestedFilter) ? requestedFilter : counts.pending > 0 ? 'pending' : 'all';
	const { items, ...page } = slicePage(reviewable.filter(filterMatches[filter]), Number(url.searchParams.get('page') ?? 1), pickerPageSize);

	return privateJson({
		signedIn: true,
		suggestedAuthor: customer ? suggestedAuthorName(customer.fullName) : '',
		filter,
		counts,
		page,
		bookings: items,
	});
};
