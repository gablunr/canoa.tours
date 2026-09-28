import { paginationItems } from '../../lib/account/pagination';
import { glassCircle } from '../../components/manage/glass-classes';

export interface ListPagerState {
	page: number;
	totalPages: number;
	matchCount: number;
	firstShown: number;
	lastShown: number;
	hidden?: boolean;
}

function pageButton(page: number, current: number) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = glassCircle;
	button.textContent = String(page);
	button.dataset.listPage = String(page);
	button.setAttribute('aria-label', `Página ${page}`);
	if (page === current) button.setAttribute('aria-current', 'page');
	return button;
}

function pageGap() {
	const gap = document.createElement('span');
	gap.className = 'flex size-8 items-center justify-center text-[13px] text-muted sm:size-9';
	gap.textContent = '…';
	gap.setAttribute('aria-hidden', 'true');
	return gap;
}

export function initListPager(bar: HTMLElement | null, onPage: (page: number) => void) {
	const summary = bar?.querySelector<HTMLElement>('[data-list-pager-summary]');
	const nav = bar?.querySelector<HTMLElement>('[data-list-pager-nav]');
	const numbers = bar?.querySelector<HTMLElement>('[data-list-page-numbers]');
	const previous = bar?.querySelector<HTMLButtonElement>('[data-list-page-previous]');
	const next = bar?.querySelector<HTMLButtonElement>('[data-list-page-next]');
	const singular = bar?.dataset.singular ?? '';
	const plural = bar?.dataset.plural ?? '';
	let current = 1;

	const focusCurrentPage = () => numbers?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();

	const goTo = (page: number) => {
		onPage(page);
		if (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled) focusCurrentPage();
	};

	previous?.addEventListener('click', () => goTo(current - 1));
	next?.addEventListener('click', () => goTo(current + 1));
	numbers?.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-list-page]');
		if (!button) return;
		goTo(Number(button.dataset.listPage));
		focusCurrentPage();
	});

	return ({ page, totalPages, matchCount, firstShown, lastShown, hidden = false }: ListPagerState) => {
		current = page;
		if (bar) bar.hidden = hidden || matchCount === 0;
		if (summary) {
			const countLabel = `${matchCount} ${matchCount === 1 ? singular : plural}`;
			summary.textContent = totalPages > 1 ? `${firstShown} a ${lastShown} de ${countLabel}` : countLabel;
		}
		if (nav) nav.hidden = totalPages <= 1;
		if (previous) previous.disabled = page <= 1;
		if (next) next.disabled = page >= totalPages;
		numbers?.replaceChildren(...paginationItems(page, totalPages, 5).map((item) => (item.kind === 'gap' ? pageGap() : pageButton(item.page, page))));
	};
}
