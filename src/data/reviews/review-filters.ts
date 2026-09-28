import { routes } from '../site/routes';
import type { TourDetails } from '../tours/tours';

export const reviewPageSize = 4;

export interface ReviewRatingFilter {
	value: string;
	label: string;
	starred?: boolean;
	accessibleLabel?: string;
	minRating: number;
	maxRating: number;
}

export const allReviewRatings: ReviewRatingFilter = { value: 'todas', label: 'Todas', minRating: 1, maxRating: 5 };

export const reviewRatingFilters: ReviewRatingFilter[] = [
	allReviewRatings,
	{ value: '5', label: '5', starred: true, accessibleLabel: '5 estrellas', minRating: 5, maxRating: 5 },
	{ value: '4', label: '4', starred: true, accessibleLabel: '4 estrellas', minRating: 4, maxRating: 4 },
	{ value: 'bajas', label: '1-3', starred: true, accessibleLabel: 'De 1 a 3 estrellas', minRating: 1, maxRating: 3 },
];

export const findReviewRatingFilter = (value: string | null) => reviewRatingFilters.find((filter) => filter.value === value) ?? allReviewRatings;

export const ratingMatches = (filter: ReviewRatingFilter, rating: number) => rating >= filter.minRating && rating <= filter.maxRating;

export const reviewTourKey = (details: TourDetails) => `${details.destination.id}/${details.tour.slug}`;

export const reviewListParams = { page: 'pagina', rating: 'estrellas', tour: 'excursion' } as const;

export interface ReviewListQuery {
	rating?: ReviewRatingFilter;
	tour?: TourDetails | null;
	page?: number;
}

export function reviewListHref({ rating = allReviewRatings, tour = null, page = 1 }: ReviewListQuery) {
	const entries: [string, string][] = [];
	if (rating !== allReviewRatings) entries.push([reviewListParams.rating, rating.value]);
	if (tour) entries.push([reviewListParams.tour, reviewTourKey(tour)]);
	if (page > 1) entries.push([reviewListParams.page, String(page)]);
	const query = new URLSearchParams(entries).toString().replaceAll('%2F', '/');
	return query ? `${routes.reviews}?${query}` : routes.reviews;
}
