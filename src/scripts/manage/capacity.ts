import { actions } from 'astro:actions';

function showMessage(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

function setBusy(button: HTMLButtonElement | null, busy: boolean, busyLabel: string) {
	if (!button) return;
	button.dataset.label ??= button.textContent?.trim() ?? '';
	button.disabled = busy;
	button.textContent = busy ? busyLabel : button.dataset.label;
}

function initProductSelect(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-product-form]');
	const select = form?.querySelector<HTMLSelectElement>('[data-product-select]');
	if (!form || !select) return;
	select.addEventListener('change', () => {
		if (select.value && select.value !== root.dataset.productKey) form.requestSubmit();
	});
}

function parseCapacity(value: string): number | null | undefined {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const capacity = Number(trimmed);
	return Number.isInteger(capacity) && capacity >= 0 && capacity <= 10000 ? capacity : undefined;
}

function initDayDialog(root: HTMLElement) {
	const productKey = root.dataset.productKey;
	const dialog = root.querySelector<HTMLDialogElement>('[data-capacity-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-capacity-form]');
	if (!productKey || !dialog || !form) return;

	const title = dialog.querySelector<HTMLElement>('[data-capacity-dialog-title]');
	const soldLine = dialog.querySelector<HTMLElement>('[data-capacity-dialog-sold]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-capacity-error]');
	const submitButton = dialog.querySelector<HTMLButtonElement>('[data-capacity-submit]');
	const capacityInput = form.elements.namedItem('capacity') as HTMLInputElement | null;
	const closedInput = form.elements.namedItem('closed') as HTMLInputElement | null;
	const noteInput = form.elements.namedItem('note') as HTMLInputElement | null;
	let selectedDate = '';

	root.querySelectorAll<HTMLButtonElement>('[data-capacity-day]').forEach((dayButton) => {
		dayButton.addEventListener('click', () => {
			const { date = '', dateLabel = '', customCapacity = '', closed = 'false', note = '', seatsSold = '0' } = dayButton.dataset;
			selectedDate = date;
			if (title) title.textContent = dateLabel;
			if (soldLine) soldLine.textContent = seatsSold === '1' ? '1 plaza vendida.' : `${seatsSold} plazas vendidas.`;
			if (capacityInput) capacityInput.value = customCapacity;
			if (closedInput) closedInput.checked = closed === 'true';
			if (noteInput) noteInput.value = note;
			showMessage(errorMessage, null);
			dialog.showModal();
		});
	});

	dialog.querySelector<HTMLButtonElement>('[data-capacity-close]')?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(errorMessage, null);
		const capacity = parseCapacity(capacityInput?.value ?? '');
		if (capacity === undefined) {
			showMessage(errorMessage, 'Escribe un número entero de plazas o déjalo vacío.');
			capacityInput?.focus();
			return;
		}

		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.manage.setDayCapacity({
			productKey,
			tourDate: selectedDate,
			capacity,
			closed: closedInput?.checked ?? false,
			note: noteInput?.value.trim() ?? '',
		});
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(submitButton, false, '');
			return;
		}
		location.reload();
	});
}

export function initCapacity(root: HTMLElement) {
	initProductSelect(root);
	initDayDialog(root);
}
