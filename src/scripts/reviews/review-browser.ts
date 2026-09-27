import { reviewPageSize, reviewRatingFilters } from '../../data/reviews/review-filters';
import { createClientPagination } from '../ui/client-pagination';

interface BrowsableReview {
	item: HTMLElement;
	rating: number;
	tour: string;
}

const allRatings = 'all';

const ratingMatcher = (value: string) => reviewRatingFilters.find((filter) => filter.value === value)?.matches ?? (() => true);

export function initReviewBrowser(root: HTMLElement) {
	const paginationNav = root.querySelector<HTMLElement>('[data-client-pagination]');
	if (!paginationNav) return;

	const ratingGroup = root.querySelector<HTMLElement>('[data-filter-pills]');
	const tourSelect = root.querySelector<HTMLSelectElement>('[data-review-tour-filter]');
	const emptyMessage = root.querySelector<HTMLElement>('[data-review-browser-empty]');
	const reviews: BrowsableReview[] = Array.from(root.querySelectorAll<HTMLElement>('[data-review-item]')).map((item) => ({
		item,
		rating: Number(item.dataset.rating),
		tour: item.dataset.tour ?? '',
	}));

	let activeRating = allRatings;
	let activeTour = '';
	let currentPage = 1;

	const inActiveTour = (review: BrowsableReview) => !activeTour || review.tour === activeTour;

	const updateCounts = () => {
		const tourReviews = reviews.filter(inActiveTour);
		for (const counter of root.querySelectorAll<HTMLElement>('[data-filter-count]')) {
			const matches = ratingMatcher(counter.dataset.filterCount ?? allRatings);
			counter.textContent = String(tourReviews.filter((review) => matches(review.rating)).length);
		}
	};

	const pagination = createClientPagination(paginationNav, (page) => {
		currentPage = page;
		render();
		pagination.focusCurrent();
		if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	const render = () => {
		const matchesRating = ratingMatcher(activeRating);
		const visible = reviews.filter((review) => inActiveTour(review) && matchesRating(review.rating));
		const totalPages = Math.max(1, Math.ceil(visible.length / reviewPageSize));
		currentPage = Math.min(Math.max(currentPage, 1), totalPages);
		const pageReviews = new Set(visible.slice((currentPage - 1) * reviewPageSize, currentPage * reviewPageSize));

		for (const review of reviews) review.item.hidden = !pageReviews.has(review);
		if (emptyMessage) emptyMessage.hidden = visible.length > 0;
		pagination.render(currentPage, totalPages);
	};

	ratingGroup?.addEventListener('change', (event) => {
		activeRating = (event.target as HTMLInputElement).value;
		currentPage = 1;
		render();
	});

	tourSelect?.addEventListener('change', () => {
		activeTour = tourSelect.value;
		currentPage = 1;
		updateCounts();
		render();
	});

	render();
}
