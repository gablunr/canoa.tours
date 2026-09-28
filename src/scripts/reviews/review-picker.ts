import type { ListPageState } from '../../lib/manage/list-page';
import { createClientPagination } from '../ui/client-pagination';

interface ReviewableBooking {
	code: string;
	productKey: string;
	productName: string;
	dateLabel: string;
	hasReview: boolean;
}

type PickerFilter = 'pending' | 'reviewed' | 'all';

interface ReviewableBookingsPage {
	signedIn: true;
	suggestedAuthor: string;
	filter: PickerFilter;
	counts: Record<PickerFilter, number>;
	page: ListPageState;
	bookings: ReviewableBooking[];
}

type ReviewableBookingsResponse = { signedIn: false } | ReviewableBookingsPage;

type PickerState = 'loading' | 'signed-out' | 'empty' | 'error' | 'list';

const endpoint = '/api/account/reviewable-bookings';

const filterEmptyMessages: Record<PickerFilter, string> = {
	pending: 'Ya opinaste de todas tus excursiones. ¡Gracias!',
	reviewed: 'Todavía no has opinado de ninguna excursión.',
	all: '',
};

const isPickerFilter = (value: string): value is PickerFilter => Object.hasOwn(filterEmptyMessages, value);

function readThumbnails(root: HTMLElement): Record<string, string> {
	try {
		return JSON.parse(root.querySelector('[data-tour-thumbnails]')?.textContent ?? '{}');
	} catch {
		return {};
	}
}

async function fetchReviewableBookings(query?: { filter: PickerFilter; page: number }, signal?: AbortSignal): Promise<ReviewableBookingsResponse> {
	const search = query ? `?${new URLSearchParams({ filter: query.filter, page: String(query.page) })}` : '';
	const response = await fetch(`${endpoint}${search}`, { credentials: 'same-origin', signal });
	if (!response.ok) throw new Error(`reviewable bookings responded ${response.status}`);
	return response.json();
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

	let firstPage: ReviewableBookingsResponse;
	try {
		firstPage = await fetchReviewableBookings();
	} catch (error) {
		console.error(error);
		show('error');
		return;
	}

	if (!firstPage.signedIn) {
		show('signed-out');
		return;
	}
	if (firstPage.counts.all === 0) {
		show('empty');
		return;
	}

	if (authorInput && !authorInput.value) authorInput.value = firstPage.suggestedAuthor;

	const markChosen = () => {
		for (const button of options.querySelectorAll<HTMLButtonElement>('[data-picker-option]')) {
			if (!button.disabled) button.setAttribute('aria-pressed', String(button.dataset.bookingCode === codeInput.value));
		}
	};

	const choose = (booking: ReviewableBooking, moveFocus: boolean) => {
		codeInput.value = booking.code;
		markChosen();
		if (formTitle) formTitle.textContent = `¿Qué tal fue ${booking.productName}?`;
		formPanel.hidden = false;
		if (moveFocus) formTitle?.focus();
	};

	const renderOption = (booking: ReviewableBooking): HTMLElement[] => {
		const item = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
		const button = item?.querySelector<HTMLButtonElement>('[data-picker-option]');
		if (!item || !button) return [];

		const name = item.querySelector<HTMLElement>('[data-picker-option-name]');
		const date = item.querySelector<HTMLElement>('[data-picker-option-date]');
		const image = item.querySelector<HTMLImageElement>('[data-picker-option-image]');
		const icon = item.querySelector<SVGElement>('[data-picker-option-icon]');
		const thumbnail = thumbnails[booking.productKey];

		button.dataset.bookingCode = booking.code;
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
			button.addEventListener('click', () => choose(booking, true));
		}

		return [item];
	};

	let activeFilter = firstPage.filter;

	const pagination = paginationNav
		? createClientPagination(paginationNav, async (page) => {
				const pressedControl = document.activeElement;
				if (!(await load(activeFilter, page))) return;
				if (pressedControl instanceof HTMLButtonElement && pressedControl.isConnected && !pressedControl.disabled) {
					pressedControl.focus({ preventScroll: true });
				} else {
					pagination?.focusCurrent();
				}
			})
		: undefined;

	const render = (data: ReviewableBookingsPage) => {
		activeFilter = data.filter;
		const filterInput = filterGroup?.querySelector<HTMLInputElement>(`input[value="${data.filter}"]`);
		if (filterInput) filterInput.checked = true;

		for (const counter of root.querySelectorAll<HTMLElement>('[data-filter-count]')) {
			const filter = counter.dataset.filterCount ?? '';
			if (isPickerFilter(filter)) counter.textContent = String(data.counts[filter]);
		}

		options.replaceChildren(...data.bookings.flatMap(renderOption));
		markChosen();

		if (filterEmpty) {
			filterEmpty.textContent = filterEmptyMessages[data.filter];
			filterEmpty.hidden = data.page.matchCount > 0;
		}
		pagination?.render(data.page.page, data.page.totalPages);
	};

	let pendingRequest: AbortController | undefined;

	async function load(filter: PickerFilter, page: number): Promise<boolean> {
		pendingRequest?.abort();
		const request = new AbortController();
		pendingRequest = request;
		options?.setAttribute('aria-busy', 'true');
		try {
			const data = await fetchReviewableBookings({ filter, page }, request.signal);
			if (!data.signedIn) {
				show('signed-out');
				return false;
			}
			render(data);
			return true;
		} catch (error) {
			if (request.signal.aborted) return false;
			console.error(error);
			show('error');
			return false;
		} finally {
			if (pendingRequest === request) {
				pendingRequest = undefined;
				options?.removeAttribute('aria-busy');
			}
		}
	}

	filterGroup?.addEventListener('change', (event) => {
		const value = (event.target as HTMLInputElement).value;
		if (!isPickerFilter(value)) return;
		activeFilter = value;
		void load(value, 1);
	});

	render(firstPage);
	show('list');

	const onlyPending = firstPage.counts.pending === 1 ? firstPage.bookings.find((booking) => !booking.hasReview) : undefined;
	if (onlyPending) choose(onlyPending, false);
}
