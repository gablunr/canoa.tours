import { paginationItems } from '../../lib/account/pagination';

const chevron = (path: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

const pageButtonClass =
	'relative z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-[13px] font-medium tabular-nums text-secondary outline-none transition-colors duration-300 ease-smooth hover:text-primary focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-35 aria-[current=page]:text-white aria-[current=page]:hover:text-white';

const indicatorClass =
	'pointer-events-none absolute top-1.5 left-0 size-9 rounded-full bg-primary opacity-0 shadow-lg shadow-primary/25 data-ready:transition-[translate,opacity] data-ready:duration-700 data-ready:ease-spring';

const smoothEase = 'cubic-bezier(0.16, 1, 0.3, 1)';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wideScreen = window.matchMedia('(min-width: 640px)');

function pageButton(label: string, onSelect: () => void, options: { ariaLabel?: string; current?: boolean; disabled?: boolean; html?: boolean } = {}) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = pageButtonClass;
	if (options.html) button.innerHTML = label;
	else button.textContent = label;
	if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
	if (options.current) button.setAttribute('aria-current', 'page');
	button.disabled = Boolean(options.disabled);
	button.addEventListener('click', onSelect);
	return button;
}

function animateOut(elements: HTMLElement[], direction: number): Animation[] {
	if (reducedMotion.matches) return [];
	const shift = direction === 0 ? 'translateY(-8px)' : `translateX(${-direction * 16}px)`;
	return elements.map((element) =>
		element.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `${shift} scale(0.98)` }], {
			duration: 160,
			easing: 'ease-in',
			fill: 'forwards',
		}),
	);
}

function animateIn(elements: HTMLElement[], direction: number) {
	if (reducedMotion.matches) return;
	const shift = direction === 0 ? 'translateY(18px)' : `translateX(${direction * 32}px)`;
	elements.forEach((element, index) => {
		element.animate([{ opacity: 0, transform: `${shift} scale(0.97)` }, { opacity: 1, transform: 'none' }], {
			duration: 560,
			delay: index * 55,
			easing: smoothEase,
			fill: 'backwards',
		});
	});
}

export function initBookingFilters(root: HTMLElement) {
	const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
	const items = Array.from(root.querySelectorAll<HTMLElement>('[data-booking-group]'));
	const pagination = root.querySelector<HTMLElement>('[data-pagination]');
	const pagesContainer = root.querySelector<HTMLElement>('[data-pagination-pages]');
	const status = root.querySelector<HTMLElement>('[data-pagination-status]');
	const pageSizeFor = (wide: boolean) => (wide ? Number(root.dataset.pageSize) || 6 : Number(root.dataset.mobilePageSize) || 3);
	let pageSize = pageSizeFor(wideScreen.matches);

	const indicator = document.createElement('span');
	indicator.className = indicatorClass;
	indicator.setAttribute('aria-hidden', 'true');
	const pageRow = document.createElement('div');
	pageRow.className = 'flex items-center gap-1';
	pagesContainer?.replaceChildren(indicator, pageRow);

	let activeFilter = root.dataset.activeFilter ?? 'all';
	let currentPage = 1;
	let generation = 0;

	const matching = () => items.filter((item) => activeFilter === 'all' || item.dataset.bookingGroup === activeFilter);
	const totalPages = () => Math.max(1, Math.ceil(matching().length / pageSize));

	const moveIndicator = () => {
		const active = pageRow.querySelector<HTMLElement>('[aria-current="page"]');
		if (!active || pagination?.hidden) return;
		indicator.style.translate = `${active.offsetLeft}px 0`;
		indicator.style.opacity = '1';
		if (!indicator.hasAttribute('data-ready')) requestAnimationFrame(() => indicator.setAttribute('data-ready', ''));
	};

	const renderPages = () => {
		const pages = totalPages();
		pageRow.replaceChildren(
			pageButton(chevron('m15 18-6-6 6-6'), () => goToPage(currentPage - 1), {
				ariaLabel: 'Página anterior',
				disabled: currentPage === 1,
				html: true,
			}),
			...paginationItems(currentPage, pages, wideScreen.matches ? 7 : 5).map((item) => {
				if (item.kind === 'gap') {
					const gap = document.createElement('span');
					gap.className = 'flex size-9 items-center justify-center text-[13px] text-muted';
					gap.setAttribute('aria-hidden', 'true');
					gap.textContent = '…';
					return gap;
				}
				return pageButton(String(item.page), () => goToPage(item.page), {
					ariaLabel: `Página ${item.page}`,
					current: item.page === currentPage,
				});
			}),
			pageButton(chevron('m9 18 6-6-6-6'), () => goToPage(currentPage + 1), {
				ariaLabel: 'Página siguiente',
				disabled: currentPage === pages,
				html: true,
			}),
		);
		moveIndicator();
	};

	const showCurrentPage = () => {
		const visible = matching();
		const total = visible.length;
		currentPage = Math.min(currentPage, totalPages());
		const start = (currentPage - 1) * pageSize;

		for (const item of items) item.hidden = true;
		const shown = visible.slice(start, start + pageSize);
		for (const item of shown) item.hidden = false;

		if (pagination) pagination.hidden = totalPages() <= 1;
		if (status) status.textContent = `${start + 1}–${Math.min(start + pageSize, total)} de ${total}`;
		renderPages();
		return shown;
	};

	const transitionTo = async (direction: number) => {
		const current = ++generation;
		const outgoing = items.filter((item) => !item.hidden);
		const exits = animateOut(outgoing, direction);
		renderPages();
		await Promise.all(exits.map((animation) => animation.finished.catch(() => undefined)));
		if (current !== generation) return;

		const incoming = showCurrentPage();
		for (const animation of exits) animation.cancel();
		animateIn(incoming, direction);
		return incoming;
	};

	const goToPage = async (page: number) => {
		if (page < 1 || page > totalPages() || page === currentPage) return;
		const direction = page > currentPage ? 1 : -1;
		currentPage = page;

		if (root.getBoundingClientRect().top < 0) {
			root.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
		}

		const incoming = await transitionTo(direction);
		incoming?.[0]?.querySelector<HTMLAnchorElement>('a[href^="/account/bookings/"]')?.focus({ preventScroll: true });
	};

	for (const button of buttons) {
		button.addEventListener('click', () => {
			if (button.getAttribute('aria-pressed') === 'true') return;
			activeFilter = button.dataset.filter ?? 'all';
			currentPage = 1;
			for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
			transitionTo(0);
		});
	}

	wideScreen.addEventListener('change', () => {
		const firstShownIndex = (currentPage - 1) * pageSize;
		pageSize = pageSizeFor(wideScreen.matches);
		currentPage = Math.floor(firstShownIndex / pageSize) + 1;
		showCurrentPage();
	});

	showCurrentPage();
	window.addEventListener('resize', moveIndicator);
}
