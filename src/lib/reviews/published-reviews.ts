import { publicReviewsClient, publishedReviewColumns, publishedReviewRows as toPublishedReviewRows, type PublishedReviewRow } from './review-rows';

export type { PublishedReviewRow } from './review-rows';

async function loadPublishedReviewRows(): Promise<PublishedReviewRow[]> {
	const { data, error } = await publicReviewsClient()
		.from('reviews')
		.select(publishedReviewColumns)
		.eq('locale', 'es')
		.eq('status', 'published')
		.order('published_at', { ascending: false });
	if (error) throw error;
	return toPublishedReviewRows(data ?? []);
}

export const publishedReviewRows = await loadPublishedReviewRows();
