import { paginationItems } from '../../lib/account/pagination';

const maxPageSlots = 5;

export interface ClientPagination {
	render: (currentPage: number, totalPages: number) => void;
	focusCurrent: () => void;
}

export function createClientPagination(nav: HTMLElement, onPageChange: (page: number) => void): ClientPagination {
	const pageList = nav.querySelector<HTMLElement>('[data-pagination-pages]');
	const pageTemplate = nav.querySelector<HTMLTemplateElement>('[data-pagination-page-template]');
	const previousButton = nav.querySelector<HTMLButtonElement>('[data-pagination-previous]');
	const nextButton = nav.querySelector<HTMLButtonElement>('[data-pagination-next]');
	let current = 1;

	previousButton?.addEventListener('click', () => onPageChange(current - 1));
	nextButton?.addEventListener('click', () => onPageChange(current + 1));

	const render = (currentPage: number, totalPages: number) => {
		current = currentPage;
		nav.hidden = totalPages <= 1;
		if (previousButton) previousButton.disabled = currentPage <= 1;
		if (nextButton) nextButton.disabled = currentPage >= totalPages;
		if (!pageList || !pageTemplate) return;

		pageList.replaceChildren(
			...paginationItems(currentPage, totalPages, maxPageSlots).map((entry) => {
				if (entry.kind === 'gap') {
					const gap = document.createElement('span');
					gap.className = 'flex size-9 items-center justify-center text-[13px] text-muted';
					gap.setAttribute('aria-hidden', 'true');
					gap.textContent = '…';
					return gap;
				}
				const pageButton = pageTemplate.content.firstElementChild?.cloneNode(true) as HTMLButtonElement;
				pageButton.textContent = String(entry.page);
				pageButton.setAttribute('aria-label', `Página ${entry.page}`);
				if (entry.page === currentPage) pageButton.setAttribute('aria-current', 'page');
				pageButton.addEventListener('click', () => onPageChange(entry.page));
				return pageButton;
			}),
		);
	};

	const focusCurrent = () => pageList?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });

	return { render, focusCurrent };
}
