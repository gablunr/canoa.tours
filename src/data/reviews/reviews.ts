import { publishedReviewRows } from '../../lib/reviews/published-reviews';
import { tourProductKey, type TourDetails } from '../tours/tours';
import { reviewsFromRows, type Review } from './review-model';

export * from './review-model';

export const reviews: Review[] = reviewsFromRows(publishedReviewRows);

export const reviewsForTour = (details: TourDetails) => {
	const productKey = tourProductKey(details);
	return reviews.filter((review) => tourProductKey(review.tour) === productKey);
};
