import { createClientPagination } from '../ui/client-pagination';

interface ReviewableBooking {
	code: string;
	productKey: string;
	productName: string;
	dateLabel: string;
	hasReview: boolean;
}

type ReviewableBookingsResponse = { signedIn: false } | { signedIn: true; suggestedAuthor: string; bookings: ReviewableBooking[] };

type PickerState = 'loading' | 'signed-out' | 'empty' | 'error' | 'list';

type PickerFilter = 'pending' | 'reviewed' | 'all';

const endpoint = '/api/account/reviewable-bookings';
const pageSize = 6;

const filterMatches: Record<PickerFilter, (booking: ReviewableBooking) => boolean> = {
	pending: (booking) => !booking.hasReview,
	reviewed: (booking) => booking.hasReview,
	all: () => true,
};

const filterEmptyMessages: Record<PickerFilter, string> = {
	pending: 'Ya opinaste de todas tus excursiones. ¡Gracias!',
	reviewed: 'Todavía no has opinado de ninguna excursión.',
	all: '',
};

const isPickerFilter = (value: string): value is PickerFilter => value in filterMatches;

function readThumbnails(root: HTMLElement): Record<string, string> {
	try {
		return JSON.parse(root.querySelector('[data-tour-thumbnails]')?.textContent ?? '{}');
	} catch {
		return {};
	}
}

export async function initReviewPicker(root: HTMLElement) {
	const states = Array.from(root.querySelectorAll<HTMLElement>('[data-picker-state]'));
	const options = root.querySelector<HTMLElement>('[data-picker-options]');
	const template = root.querySelector<HTMLTemplateElement>('[data-picker-option-template]');
	const filterGroup = root.querySelector<HTMLElement>('[data-filter-pills]');
	const filterEmpty = root.querySelector<HTMLElement>('[data-picker-filter-empty]');
	const paginationNav = root.querySelector<HTMLElement>('[data-client-pagination]');
	const formPanel = root.querySelector<HTMLElement>('[data-picker-form]');
	const formTitle = root.querySelector<HTMLElement>('[data-picker-form-title]');
	const codeInput = root.querySelector<HTMLInputElement>('[data-review-code]');
	const authorInput = root.querySelector<HTMLInputElement>('input[name="authorName"]');
	if (!options || !template || !formPanel || !codeInput) return;

	const thumbnails = readThumbnails(root);

	const show = (state: PickerState) => {
		for (const element of states) element.hidden = element.dataset.pickerState !== state;
	};

	let data: ReviewableBookingsResponse;
	try {
		const response = await fetch(endpoint, { credentials: 'same-origin' });
		if (!response.ok) throw new Error(`reviewable bookings responded ${response.status}`);
		data = await response.json();
	} catch (error) {
		console.error(error);
		show('error');
		return;
	}

	if (!data.signedIn) {
		show('signed-out');
		return;
	}
	const { bookings } = data;
	if (bookings.length === 0) {
		show('empty');
		return;
	}

	if (authorInput && !authorInput.value) authorInput.value = data.suggestedAuthor;

	const items = new Map<ReviewableBooking, { item: HTMLElement; button: HTMLButtonElement }>();

	const choose = (booking: ReviewableBooking, button: HTMLButtonElement, moveFocus: boolean) => {
		for (const candidate of items.values()) {
			if (!candidate.button.disabled) candidate.button.setAttribute('aria-pressed', String(candidate.button === button));
		}
		codeInput.value = booking.code;
		if (formTitle) formTitle.textContent = `¿Qué tal fue ${booking.productName}?`;
		formPanel.hidden = false;
		if (moveFocus) formTitle?.focus();
	};

	for (const booking of bookings) {
		const item = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
		const button = item?.querySelector<HTMLButtonElement>('[data-picker-option]');
		if (!item || !button) continue;

		const name = item.querySelector<HTMLElement>('[data-picker-option-name]');
		const date = item.querySelector<HTMLElement>('[data-picker-option-date]');
		const image = item.querySelector<HTMLImageElement>('[data-picker-option-image]');
		const icon = item.querySelector<SVGElement>('[data-picker-option-icon]');
		const thumbnail = thumbnails[booking.productKey];

		if (name) name.textContent = booking.productName;
		if (date) date.textContent = booking.hasReview ? `${booking.dateLabel}, ya opinaste` : booking.dateLabel;
		if (image && thumbnail) {
			image.src = thumbnail;
			image.hidden = false;
			icon?.remove();
		}

		if (booking.hasReview) {
			button.disabled = true;
			button.removeAttribute('aria-pressed');
		} else {
			button.addEventListener('click', () => choose(booking, button, true));
		}

		items.set(booking, { item, button });
		options.append(item);
	}

	for (const counter of root.querySelectorAll<HTMLElement>('[data-filter-count]')) {
		const filter = counter.dataset.filterCount ?? '';
		if (isPickerFilter(filter)) counter.textContent = String(bookings.filter(filterMatches[filter]).length);
	}

	const pending = bookings.filter(filterMatches.pending);
	let activeFilter: PickerFilter = pending.length > 0 ? 'pending' : 'all';
	let currentPage = 1;

	const filterInput = (filter: PickerFilter) => filterGroup?.querySelector<HTMLInputElement>(`input[value="${filter}"]`);
	const selectedFilterInput = filterInput(activeFilter);
	if (selectedFilterInput) selectedFilterInput.checked = true;

	const pagination = paginationNav
		? createClientPagination(paginationNav, (page) => {
				currentPage = page;
				render();
				pagination?.focusCurrent();
			})
		: undefined;

	const render = () => {
		const visible = bookings.filter(filterMatches[activeFilter]);
		const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
		currentPage = Math.min(Math.max(currentPage, 1), totalPages);
		const pageBookings = new Set(visible.slice((currentPage - 1) * pageSize, currentPage * pageSize));

		for (const [booking, { item }] of items) item.hidden = !pageBookings.has(booking);

		if (filterEmpty) {
			filterEmpty.textContent = filterEmptyMessages[activeFilter];
			filterEmpty.hidden = visible.length > 0;
		}
		pagination?.render(currentPage, totalPages);
	};

	filterGroup?.addEventListener('change', (event) => {
		const value = (event.target as HTMLInputElement).value;
		if (!isPickerFilter(value)) return;
		activeFilter = value;
		currentPage = 1;
		render();
	});

	render();
	show('list');

	const onlyPending = pending.length === 1 ? pending[0] : undefined;
	const onlyPendingButton = onlyPending && items.get(onlyPending)?.button;
	if (onlyPending && onlyPendingButton) choose(onlyPending, onlyPendingButton, false);
}
