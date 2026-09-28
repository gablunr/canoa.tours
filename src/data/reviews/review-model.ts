import type { RemoteImage } from '../../lib/images';
import type { PublishedReviewRow } from '../../lib/reviews/review-rows';
import { tourDetails, tourDetailsHref, tourProductKey, type TourDetails } from '../tours/tours';

export interface Review {
	id: string;
	author: string;
	authorAvatarUrl: string | null;
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

export const tourByProductKey = new Map(tourDetails.map((details) => [tourProductKey(details), details]));

export function reviewFromRow(row: PublishedReviewRow): Review | null {
	const tour = tourByProductKey.get(row.productKey);
	if (!tour) return null;
	return {
		id: row.id,
		author: row.authorName,
		authorAvatarUrl: row.authorAvatarUrl,
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
	};
}

export const reviewsFromRows = (rows: PublishedReviewRow[]): Review[] =>
	rows.flatMap((row) => {
		const review = reviewFromRow(row);
		return review ? [review] : [];
	});

export function ratingStats(ratings: number[]): ReviewStats | null {
	if (ratings.length === 0) return null;
	const total = ratings.reduce((sum, rating) => sum + rating, 0);
	return { rating: Math.round((total / ratings.length) * 10) / 10, count: ratings.length };
}

export const reviewStats = (list: Review[]) => ratingStats(list.map((review) => review.rating));

const ratingFormatter = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatRating = (rating: number) => ratingFormatter.format(rating);

export const reviewCountLabel = (count: number) => `${count} ${count === 1 ? 'opinión' : 'opiniones'}`;

export const reviewStatsSummary = (stats: ReviewStats) => `${formatRating(stats.rating)} de 5, ${reviewCountLabel(stats.count)}`;

export const reviewSummary = (review: Review) => `${review.author} (${review.tourTitle}): ${review.text}`;
