import type { RemoteImage } from '../../lib/images';
import { publishedReviewRows } from '../../lib/reviews/published-reviews';
import { tourDetails, tourDetailsHref, tourProductKey, type TourDetails } from '../tours/tours';

export interface Review {
	id: string;
	author: string;
	rating: number;
	title: string | null;
	text: string;
	reply: string | null;
	verified: boolean;
	photos: RemoteImage[];
	date: Date;
	tour: TourDetails;
	tourTitle: string;
	tourHref: string;
}

export interface ReviewStats {
	rating: number;
	count: number;
}

const tourByProductKey = new Map(tourDetails.map((details) => [tourProductKey(details), details]));

export const reviews: Review[] = publishedReviewRows.flatMap((row) => {
	const tour = tourByProductKey.get(row.productKey);
	if (!tour) return [];
	return [
		{
			id: row.id,
			author: row.authorName,
			rating: row.rating,
			title: row.title,
			text: row.body,
			reply: row.reply,
			verified: row.verified,
			photos: row.photos,
			date: row.publishedAt,
			tour,
			tourTitle: tour.title,
			tourHref: tourDetailsHref(tour),
		},
	];
});

export const reviewsForTour = (details: TourDetails) => {
	const productKey = tourProductKey(details);
	return reviews.filter((review) => tourProductKey(review.tour) === productKey);
};

export function reviewStats(list: Review[]): ReviewStats | null {
	if (list.length === 0) return null;
	const total = list.reduce((sum, review) => sum + review.rating, 0);
	return { rating: Math.round((total / list.length) * 10) / 10, count: list.length };
}

const ratingFormatter = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatRating = (rating: number) => ratingFormatter.format(rating);

export const reviewCountLabel = (count: number) => `${count} ${count === 1 ? 'opinión' : 'opiniones'}`;

export const reviewStatsSummary = (stats: ReviewStats) => `${formatRating(stats.rating)} de 5 de media, ${reviewCountLabel(stats.count)}`;

export const reviewSummary = (review: Review) => `${review.author} (${review.tourTitle}): ${review.text}`;
