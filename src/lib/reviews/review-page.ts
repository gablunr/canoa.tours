import {
	allReviewRatings,
	findReviewRatingFilter,
	ratingMatches,
	reviewListHref,
	reviewListParams,
	reviewPageSize,
	reviewRatingFilters,
	reviewTourKey,
	type ReviewRatingFilter,
} from '../../data/reviews/review-filters';
import { ratingStats, reviewsFromRows, tourByProductKey, type Review, type ReviewStats } from '../../data/reviews/review-model';
import { destinations } from '../../data/tours/destinations';
import { tourDetails, tourProductKey, type TourDetails } from '../../data/tours/tours';
import { pageRange, pageState, type ListPageState } from '../manage/list-page';
import { publicReviewsClient, publishedReviewColumns, publishedReviewRows } from './review-rows';

export interface ReviewPageFilters {
	rating: ReviewRatingFilter;
	tour: TourDetails | null;
}

export interface ReviewPageRequest {
	filters: ReviewPageFilters;
	page: number | null;
}

export interface ReviewRatingOption extends ReviewRatingFilter {
	count: number;
	href: string;
}

export interface ReviewTourOption {
	value: string;
	label: string;
}

export interface ReviewTourGroup {
	label: string;
	tours: ReviewTourOption[];
}

export interface ReviewPage extends ListPageState {
	reviews: Review[];
	filters: ReviewPageFilters;
	stats: ReviewStats | null;
	totalCount: number;
	ratingOptions: ReviewRatingOption[];
	tourGroups: ReviewTourGroup[];
}

interface ReviewSummary {
	rating: number;
	productId: string;
	tour: TourDetails;
}

export function readReviewPageRequest(searchParams: URLSearchParams): ReviewPageRequest {
	const tourKey = searchParams.get(reviewListParams.tour);
	const rawPage = searchParams.get(reviewListParams.page);
	const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);
	return {
		filters: {
			rating: findReviewRatingFilter(searchParams.get(reviewListParams.rating)),
			tour: tourDetails.find((details) => reviewTourKey(details) === tourKey) ?? null,
		},
		page: Number.isFinite(page) ? page : null,
	};
}

export const hasActiveReviewFilters = (filters: ReviewPageFilters) => filters.rating !== allReviewRatings || filters.tour !== null;

export const reviewPageHref = (filters: ReviewPageFilters, page = 1) => reviewListHref({ ...filters, page });

async function loadReviewSummaries(): Promise<ReviewSummary[]> {
	const { data, error } = await publicReviewsClient()
		.from('reviews')
		.select('rating, product_id, product:products(key)')
		.eq('locale', 'es')
		.eq('status', 'published');
	if (error) throw error;
	return (data ?? []).flatMap((row) => {
		const tour = row.product ? tourByProductKey.get(row.product.key) : undefined;
		return tour ? [{ rating: row.rating, productId: row.product_id, tour }] : [];
	});
}

async function loadPageReviews(productIds: string[], rating: ReviewRatingFilter, page: number): Promise<Review[]> {
	const [from, to] = pageRange(page, reviewPageSize);
	const { data, error } = await publicReviewsClient()
		.from('reviews')
		.select(publishedReviewColumns)
		.eq('locale', 'es')
		.eq('status', 'published')
		.in('product_id', productIds)
		.gte('rating', rating.minRating)
		.lte('rating', rating.maxRating)
		.order('published_at', { ascending: false })
		.order('id')
		.range(from, to);
	if (error) throw error;
	return reviewsFromRows(await publishedReviewRows(data ?? []));
}

function tourGroupsOf(summaries: ReviewSummary[]): ReviewTourGroup[] {
	return destinations
		.map((destination) => ({
			label: destination.name,
			tours: tourDetails
				.filter((details) => details.destination.id === destination.id)
				.flatMap((details) => {
					const count = summaries.filter((summary) => summary.tour === details).length;
					return count > 0 ? [{ value: reviewTourKey(details), label: `${details.tour.name} (${count})` }] : [];
				}),
		}))
		.filter((group) => group.tours.length > 0);
}

export async function loadReviewPage(filters: ReviewPageFilters, requestedPage: number): Promise<ReviewPage> {
	const summaries = await loadReviewSummaries();
	const tourKey = filters.tour ? tourProductKey(filters.tour) : null;
	const inTour = tourKey ? summaries.filter((summary) => tourProductKey(summary.tour) === tourKey) : summaries;
	const matching = inTour.filter((summary) => ratingMatches(filters.rating, summary.rating));
	const state = pageState(matching.length, requestedPage, reviewPageSize);
	const productIds = [...new Set(inTour.map((summary) => summary.productId))];
	const reviews = matching.length > 0 ? await loadPageReviews(productIds, filters.rating, state.page) : [];

	return {
		...state,
		reviews,
		filters,
		stats: ratingStats(summaries.map((summary) => summary.rating)),
		totalCount: summaries.length,
		ratingOptions: reviewRatingFilters.map((rating) => ({
			...rating,
			count: inTour.filter((summary) => ratingMatches(rating, summary.rating)).length,
			href: reviewPageHref({ ...filters, rating }),
		})),
		tourGroups: tourGroupsOf(summaries),
	};
}
