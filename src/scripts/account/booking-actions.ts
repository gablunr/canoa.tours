import { actions } from 'astro:actions';
import { fetchAvailability } from '../../lib/supabase/browser';

const availabilityWindowDays = 92;

const optionFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const utcDate = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);
const isoDateInDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

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

async function loadDateOptions(select: HTMLSelectElement, productId: string, currentDate: string) {
	const rows = await fetchAvailability(productId, isoDateInDays(1), isoDateInDays(availabilityWindowDays));
	const dates = rows.filter((row) => row.bookable && row.tour_date !== currentDate).map((row) => row.tour_date);

	select.replaceChildren();
	if (dates.length === 0) {
		select.add(new Option('No hay fechas con plazas en los próximos tres meses', ''));
		return false;
	}

	select.add(new Option('Elige una fecha', ''));
	const groups = new Map<string, HTMLOptGroupElement>();
	for (const date of dates) {
		const month = capitalize(monthFormatter.format(utcDate(date)));
		let group = groups.get(month);
		if (!group) {
			group = document.createElement('optgroup');
			group.label = month;
			groups.set(month, group);
			select.append(group);
		}
		group.append(new Option(capitalize(optionFormatter.format(utcDate(date))), date));
	}
	return true;
}

function initChangeDate(root: HTMLElement, code: string) {
	const form = root.querySelector<HTMLFormElement>('[data-change-date-form]');
	const select = form?.querySelector<HTMLSelectElement>('[data-date-select]');
	if (!form || !select) return;

	const errorMessage = form.querySelector<HTMLElement>('[data-change-date-error]');
	const submitButton = form.querySelector<HTMLButtonElement>('[data-change-date-submit]');
	const { productId = '', currentDate = '' } = root.dataset;

	loadDateOptions(select, productId, currentDate)
		.then((hasDates) => {
			select.disabled = !hasDates;
			if (submitButton) submitButton.disabled = !hasDates;
		})
		.catch(() => {
			select.replaceChildren(new Option('No pudimos cargar las fechas', ''));
			showMessage(errorMessage, 'Recarga la página para intentarlo de nuevo.');
		});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(errorMessage, null);
		if (!select.value) {
			showMessage(errorMessage, 'Elige la nueva fecha.');
			select.focus();
			return;
		}

		setBusy(submitButton, true, 'Cambiando…');
		const { error } = await actions.account.changeDate({ code, tourDate: select.value });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(submitButton, false, '');
			return;
		}
		location.reload();
	});
}

function initCancel(root: HTMLElement, code: string) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-cancel-dialog]');
	const openButton = root.querySelector<HTMLButtonElement>('[data-cancel-open]');
	if (!dialog || !openButton) return;

	const closeButton = dialog.querySelector<HTMLButtonElement>('[data-cancel-close]');
	const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-cancel-confirm]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-cancel-error]');

	openButton.addEventListener('click', () => {
		showMessage(errorMessage, null);
		dialog.showModal();
	});
	closeButton?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	confirmButton?.addEventListener('click', async () => {
		showMessage(errorMessage, null);
		setBusy(confirmButton, true, 'Cancelando…');
		const { error } = await actions.account.cancel({ code });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(confirmButton, false, '');
			return;
		}
		location.reload();
	});
}

export function initBookingActions(root: HTMLElement) {
	const code = root.dataset.code;
	if (!code) return;
	initChangeDate(root, code);
	initCancel(root, code);
}
