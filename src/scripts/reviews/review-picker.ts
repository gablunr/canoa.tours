interface ReviewableBooking {
	code: string;
	productKey: string;
	productName: string;
	dateLabel: string;
	hasReview: boolean;
}

type ReviewableBookingsResponse = { signedIn: false } | { signedIn: true; suggestedAuthor: string; bookings: ReviewableBooking[] };

type PickerState = 'loading' | 'signed-out' | 'empty' | 'error' | 'list';

const endpoint = '/api/account/reviewable-bookings';

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
	if (data.bookings.length === 0) {
		show('empty');
		return;
	}

	if (authorInput && !authorInput.value) authorInput.value = data.suggestedAuthor;

	const buttons = new Map<ReviewableBooking, HTMLButtonElement>();

	const choose = (booking: ReviewableBooking, button: HTMLButtonElement, moveFocus: boolean) => {
		for (const candidate of buttons.values()) {
			if (!candidate.disabled) candidate.setAttribute('aria-pressed', String(candidate === button));
		}
		codeInput.value = booking.code;
		if (formTitle) formTitle.textContent = `¿Qué tal fue ${booking.productName}?`;
		formPanel.hidden = false;
		if (moveFocus) formTitle?.focus();
	};

	for (const booking of data.bookings) {
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

		buttons.set(booking, button);
		options.append(item);
	}

	show('list');

	const pending = data.bookings.filter((booking) => !booking.hasReview);
	const onlyPending = pending.length === 1 ? pending[0] : undefined;
	const onlyPendingButton = onlyPending && buttons.get(onlyPending);
	if (onlyPending && onlyPendingButton) choose(onlyPending, onlyPendingButton, false);
}
