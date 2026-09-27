import { actions } from 'astro:actions';
import { formatPrice } from '../../lib/format';
import { fetchAvailability } from '../../lib/supabase/browser';

const availabilityWindowDays = 92;

const optionFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const utcDate = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);
const isoDateAfter = (isoDate: string, days: number) => new Date(utcDate(isoDate).getTime() + days * 86_400_000).toISOString().slice(0, 10);

interface ActionOutcome {
	error: string | null;
	result?: string | null;
}

type ActionHandler = (code: string, values: FormData) => Promise<ActionOutcome>;

const fieldValue = (values: FormData, name: string) => String(values.get(name) ?? '').trim();

const failure = (message: string): ActionOutcome => ({ error: message });

const actionHandlers: Record<string, ActionHandler> = {
	async changeDate(code, values) {
		const tourDate = fieldValue(values, 'tourDate');
		if (!tourDate) return failure('Elige la nueva fecha.');
		const { error } = await actions.manage.changeDate({ code, tourDate });
		return { error: error?.message ?? null };
	},
	async moveForWeather(code, values) {
		const tourDate = fieldValue(values, 'tourDate');
		if (!tourDate) return failure('Elige la nueva fecha.');
		const { error } = await actions.manage.moveForWeather({ code, tourDate });
		return { error: error?.message ?? null };
	},
	async setPickupZone(code, values) {
		const zoneId = fieldValue(values, 'zoneId');
		const hotelId = fieldValue(values, 'hotelId');
		if (!zoneId) return failure('Elige la zona de recogida.');
		const { error } = await actions.manage.setPickupZone({ code, zoneId, hotelId: hotelId || undefined });
		return { error: error?.message ?? null };
	},
	async resendEmail(code, values) {
		const kind = fieldValue(values, 'kind') === 'tour_reminder' ? 'tour_reminder' : 'confirmed';
		const { error } = await actions.manage.resendEmail({ code, kind });
		return error ? { error: error.message } : { error: null, result: 'Email enviado.' };
	},
	async markCompleted(code) {
		const { error } = await actions.manage.markCompleted({ code });
		return { error: error?.message ?? null };
	},
	async markNoShow(code) {
		const { data, error } = await actions.manage.markNoShow({ code });
		if (error) return { error: error.message };
		return { error: null, result: data.message ?? 'Reserva marcada como no presentado.' };
	},
	async cancel(code, values) {
		const reason = fieldValue(values, 'reason');
		if (reason.length < 3) return failure('Escribe el motivo de la cancelación.');
		const refundValue = fieldValue(values, 'refund');
		const refund = refundValue === 'none' || refundValue === 'full' ? refundValue : 'deposit_without_insurance';
		const { data, error } = await actions.manage.cancel({ code, refund, reason });
		if (error) return { error: error.message };
		if (data.refundFailed) return { error: null, result: 'Reserva cancelada, pero el reembolso falló. Revísalo en Stripe.' };
		const refundText = data.refundAmount > 0 ? ` Reembolso de ${formatPrice(Math.round(data.refundAmount * 100) / 100)}.` : '';
		const emailText = data.emailSent ? '' : ' No se pudo enviar el email al cliente.';
		return { error: null, result: `Reserva cancelada.${refundText}${emailText}` };
	},
};

function showMessage(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

function setBusy(button: HTMLButtonElement | null, busy: boolean) {
	if (!button) return;
	button.dataset.label ??= button.textContent?.trim() ?? '';
	button.disabled = busy;
	button.textContent = busy ? (button.dataset.busyLabel ?? button.dataset.label) : button.dataset.label;
}

async function loadDateOptions(select: HTMLSelectElement, productId: string, currentDate: string, today: string) {
	const rows = await fetchAvailability(productId, today, isoDateAfter(today, availabilityWindowDays));
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

function initDateSelect(root: HTMLElement, dialog: HTMLDialogElement) {
	const select = dialog.querySelector<HTMLSelectElement>('[data-date-select]');
	if (!select) return;
	const submitButton = dialog.querySelector<HTMLButtonElement>('[data-dialog-submit]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-dialog-error]');
	const { productId = '', currentDate = '', today = '' } = root.dataset;
	let loaded = false;

	if (submitButton) submitButton.disabled = true;
	dialog.addEventListener('toggle', () => {
		if (!dialog.open || loaded) return;
		loaded = true;
		loadDateOptions(select, productId, currentDate, today)
			.then((hasDates) => {
				select.disabled = !hasDates;
				if (submitButton) submitButton.disabled = !hasDates;
			})
			.catch(() => {
				loaded = false;
				select.replaceChildren(new Option('No pudimos cargar las fechas', ''));
				showMessage(errorMessage, 'Cierra y vuelve a abrir para intentarlo de nuevo.');
			});
	});
}

interface HotelOption {
	id: string;
	name: string;
	zoneId: string;
}

function initHotelSelect(dialog: HTMLDialogElement) {
	const zoneSelect = dialog.querySelector<HTMLSelectElement>('[data-zone-select]');
	const hotelSelect = dialog.querySelector<HTMLSelectElement>('[data-hotel-select]');
	if (!zoneSelect || !hotelSelect) return;

	let hotels: HotelOption[] = [];
	try {
		hotels = JSON.parse(hotelSelect.dataset.hotels ?? '[]') as HotelOption[];
	} catch {
		hotels = [];
	}

	const renderHotels = () => {
		hotelSelect.replaceChildren(new Option('Mantener el hotel actual', ''));
		hotels.filter((hotel) => hotel.zoneId === zoneSelect.value).forEach((hotel) => hotelSelect.add(new Option(hotel.name, hotel.id)));
	};

	renderHotels();
	zoneSelect.addEventListener('change', renderHotels);
}

function initDialog(root: HTMLElement, dialog: HTMLDialogElement, code: string) {
	const form = dialog.querySelector<HTMLFormElement>('form[data-action]');
	if (!form) return;
	const handler = actionHandlers[form.dataset.action ?? ''];
	if (!handler) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-dialog-submit]');
	const closeButton = form.querySelector<HTMLButtonElement>('[data-dialog-close]');
	const errorMessage = form.querySelector<HTMLElement>('[data-dialog-error]');
	const resultMessage = form.querySelector<HTMLElement>('[data-dialog-result]');
	const fields = form.querySelector<HTMLElement>('[data-dialog-fields]');
	let finished = false;

	closeButton?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
	dialog.addEventListener('close', () => {
		if (finished) location.reload();
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (finished) {
			dialog.close();
			return;
		}
		showMessage(errorMessage, null);
		setBusy(submitButton, true);
		const outcome = await handler(code, new FormData(form)).catch(() => failure('No se pudo completar la operación. Inténtalo de nuevo.'));
		if (outcome.error) {
			showMessage(errorMessage, outcome.error);
			setBusy(submitButton, false);
			return;
		}
		if (!outcome.result) {
			location.reload();
			return;
		}
		finished = true;
		if (fields) fields.hidden = true;
		if (closeButton) closeButton.hidden = true;
		showMessage(resultMessage, outcome.result);
		setBusy(submitButton, false);
		if (submitButton) submitButton.textContent = 'Cerrar';
	});

	root.querySelectorAll<HTMLButtonElement>(`[data-dialog-open="${dialog.dataset.dialog}"]`).forEach((button) => {
		button.addEventListener('click', () => {
			showMessage(errorMessage, null);
			dialog.showModal();
		});
	});
}

export function initBookingManage(root: HTMLElement) {
	const code = root.dataset.code;
	if (!code) return;
	root.querySelectorAll<HTMLDialogElement>('dialog[data-dialog]').forEach((dialog) => {
		initDialog(root, dialog, code);
		initDateSelect(root, dialog);
		initHotelSelect(dialog);
	});
}

export function initPickupTimeForm(form: HTMLFormElement) {
	const code = form.dataset.code;
	const input = form.querySelector<HTMLInputElement>('input[name="pickupTime"]');
	if (!code || !input) return;
	const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
	const errorMessage = form.querySelector<HTMLElement>('[data-pickup-time-error]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(errorMessage, null);
		const pickupTime = input.value.slice(0, 5);
		if (!/^\d{2}:\d{2}$/.test(pickupTime)) {
			showMessage(errorMessage, 'Indica la hora en formato HH:MM.');
			input.focus();
			return;
		}
		setBusy(submitButton, true);
		const { error } = await actions.manage.setPickupTime({ code, pickupTime });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(submitButton, false);
			return;
		}
		location.reload();
	});
}
