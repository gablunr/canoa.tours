import { actions, isInputError } from 'astro:actions';
import { initConfirmDialogs, type AskToConfirm } from './confirm-dialogs';
import { actionErrorMessage, setBusy, showMessage, wireDialogClosing } from './form-helpers';
import { requestSiteStatusRefresh } from './site-status';
import { clearErrorOnInput, setFieldError, validateFields } from '../ui/form-validation';

interface KnownHotel {
	name: string;
	zoneId: string;
	zoneName: string;
}

const savedFeedbackMs = 2500;
const defaultTab = 'hotels';

const unsavedForms = new Set<HTMLFormElement>();

function trackUnsaved(form: HTMLFormElement) {
	form.addEventListener('input', () => unsavedForms.add(form));
}

function reloadPage() {
	unsavedForms.clear();
	location.reload();
}

function goTo(href: string) {
	unsavedForms.clear();
	location.href = href;
}

const normalizeHotelName = (name: string) => name.replace(/\s+/g, ' ').trim();
const hotelNameKey = (name: string) => normalizeHotelName(name).toLocaleLowerCase('es');

function readKnownHotels(root: HTMLElement): KnownHotel[] {
	try {
		const parsed: unknown = JSON.parse(root.dataset.knownHotels ?? '[]');
		return Array.isArray(parsed) ? (parsed as KnownHotel[]) : [];
	} catch {
		return [];
	}
}

function fieldOf(form: HTMLFormElement, name: string) {
	return form.querySelector<HTMLElement>(`#field-${name}`)?.closest<HTMLElement>('[data-field]') ?? null;
}

function showActionError(form: HTMLFormElement, error: Parameters<typeof actionErrorMessage>[0], fieldNames: Record<string, string>, formError: HTMLElement | null) {
	if (isInputError(error)) {
		const shown = Object.entries(error.fields).filter(([name, messages]) => {
			const field = fieldNames[name] ? fieldOf(form, fieldNames[name]) : null;
			const message = messages?.[0];
			if (!field || !message) return false;
			setFieldError(field, message);
			return true;
		});
		if (shown.length > 0) return;
	}
	showMessage(formError, actionErrorMessage(error));
}

function flashStatus(element: HTMLElement | null, message: string) {
	if (!element) return;
	element.textContent = message;
	window.setTimeout(() => {
		if (element.textContent === message) element.textContent = '';
	}, savedFeedbackMs);
}

function zoneHref(slug: string | undefined) {
	return slug ? `/manage/pickup?zone=${encodeURIComponent(slug)}` : '/manage/pickup';
}

function initHotelList(root: HTMLElement) {
	const input = root.querySelector<HTMLInputElement>('[data-hotel-search]');
	const list = root.querySelector<HTMLElement>('[data-hotel-list]');
	const rows = [...root.querySelectorAll<HTMLElement>('[data-hotel-row]')];
	const emptyMessage = root.querySelector<HTMLElement>('[data-hotel-search-empty]');

	const apply = () => {
		const query = input?.value.trim().toLocaleLowerCase('es') ?? '';
		let matchCount = 0;
		rows.forEach((row) => {
			const matches = !query || (row.dataset.searchName ?? '').includes(query);
			row.hidden = !matches;
			if (matches) matchCount += 1;
		});
		if (list) list.hidden = matchCount === 0;
		if (emptyMessage) emptyMessage.hidden = matchCount > 0;
	};

	input?.addEventListener('input', apply);
	if (rows.length > 0) apply();
}

function initTabs(root: HTMLElement) {
	const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-pickup-tab]')];
	const panels = [...root.querySelectorAll<HTMLElement>('[data-pickup-panel]')];
	if (tabs.length === 0) return;

	const select = (tab: HTMLButtonElement) => {
		const id = tab.dataset.pickupTab ?? defaultTab;
		tabs.forEach((candidate) => {
			const selected = candidate === tab;
			candidate.setAttribute('aria-selected', String(selected));
			candidate.tabIndex = selected ? 0 : -1;
		});
		panels.forEach((panel) => (panel.hidden = panel.dataset.pickupPanel !== id));
		const withTab = (href: string) => {
			const url = new URL(href, location.origin);
			if (id === defaultTab) url.searchParams.delete('tab');
			else url.searchParams.set('tab', id);
			return `${url.pathname}${url.search}`;
		};
		history.replaceState(history.state, '', withTab(location.href));
		root.querySelectorAll<HTMLAnchorElement>('[data-zone-link]').forEach((link) => (link.href = withTab(link.href)));
		root.querySelectorAll<HTMLOptionElement>('[data-zone-select] option').forEach((option) => (option.value = withTab(option.value)));
	};

	tabs.forEach((tab, index) => {
		tab.addEventListener('click', () => select(tab));
		tab.addEventListener('keydown', (event) => {
			const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
			const target = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : offset ? tabs[(index + offset + tabs.length) % tabs.length] : null;
			if (!target) return;
			event.preventDefault();
			select(target);
			target.focus();
		});
	});
}

function initZoneSelect(root: HTMLElement) {
	const select = root.querySelector<HTMLSelectElement>('[data-zone-select]');
	select?.addEventListener('change', () => {
		location.href = select.value;
	});
}

function initNewZone(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-new-zone-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-new-zone-form]');
	if (!dialog || !form) return;
	const submitButton = form.querySelector<HTMLButtonElement>('[data-new-zone-submit]');
	const formError = form.querySelector<HTMLElement>('[data-new-zone-error]');
	wireDialogClosing(dialog, form.querySelector<HTMLButtonElement>('[data-new-zone-close]'));
	clearErrorOnInput(form);

	root.querySelectorAll<HTMLButtonElement>('[data-new-zone-open]').forEach((button) => {
		button.addEventListener('click', () => {
			form.reset();
			form.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => setFieldError(field, null));
			form.querySelectorAll('textarea').forEach((textarea) => textarea.dispatchEvent(new Event('input', { bubbles: true })));
			showMessage(formError, null);
			dialog.showModal();
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(formError, null);
		if (!validateFields(form)) return;
		const data = new FormData(form);

		setBusy(submitButton, true, 'Creando…');
		const { data: result, error } = await actions.pickup.createZone({
			name: String(data.get('newZoneName') ?? ''),
			description: String(data.get('newZoneDescription') ?? ''),
			defaultFee: Number(data.get('newZoneFee')),
		});
		if (error) {
			showActionError(form, error, { name: 'newZoneName', description: 'newZoneDescription', defaultFee: 'newZoneFee' }, formError);
			setBusy(submitButton, false, '');
			return;
		}
		goTo(zoneHref(result.slug));
	});
}

function announcePosition(status: HTMLElement | null, index: number) {
	if (!status) return;
	status.textContent = '';
	window.setTimeout(() => {
		status.textContent = `Movida a la posición ${index + 1}`;
	}, 100);
}

function initReorder(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-reorder-dialog]');
	const list = dialog?.querySelector<HTMLOListElement>('[data-reorder-list]');
	if (!dialog || !list) return;
	const submitButton = dialog.querySelector<HTMLButtonElement>('[data-reorder-submit]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-reorder-error]');
	const initialOrder = Array.from(list.children);
	wireDialogClosing(dialog, dialog.querySelector<HTMLButtonElement>('[data-reorder-close]'));

	const items = () => Array.from(list.querySelectorAll<HTMLElement>('[data-reorder-item]'));
	const syncButtons = () => {
		const current = items();
		current.forEach((item, index) => {
			const up = item.querySelector<HTMLButtonElement>('[data-reorder-up]');
			const down = item.querySelector<HTMLButtonElement>('[data-reorder-down]');
			if (up) up.disabled = index === 0;
			if (down) down.disabled = index === current.length - 1;
		});
	};

	list.addEventListener('click', (event) => {
		const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-reorder-up], [data-reorder-down]');
		const item = button?.closest<HTMLElement>('[data-reorder-item]');
		if (!button || !item) return;
		const movingUp = button.hasAttribute('data-reorder-up');
		const sibling = movingUp ? item.previousElementSibling : item.nextElementSibling;
		if (!sibling) return;
		if (movingUp) sibling.before(item);
		else sibling.after(item);
		syncButtons();
		announcePosition(dialog.querySelector<HTMLElement>('[data-sort-status]'), items().indexOf(item));
		const focusTarget = item.querySelector<HTMLButtonElement>(movingUp ? '[data-reorder-up]' : '[data-reorder-down]');
		(focusTarget && !focusTarget.disabled ? focusTarget : button).focus();
	});

	root.querySelectorAll<HTMLButtonElement>('[data-reorder-open]').forEach((button) =>
		button.addEventListener('click', () => {
			list.replaceChildren(...initialOrder);
			syncButtons();
			showMessage(errorMessage, null);
			dialog.showModal();
		}),
	);

	submitButton?.addEventListener('click', async () => {
		showMessage(errorMessage, null);
		const ids = items().map((item) => item.dataset.zoneId ?? '');
		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.pickup.reorderZones({ ids });
		if (error) {
			showMessage(errorMessage, actionErrorMessage(error));
			setBusy(submitButton, false, '');
			return;
		}
		reloadPage();
	});
}

function initZoneForm(root: HTMLElement, askToConfirm: AskToConfirm) {
	const form = root.querySelector<HTMLFormElement>('[data-zone-form]');
	const zoneId = form?.dataset.zoneId;
	if (!form || !zoneId) return;
	const submitButton = form.querySelector<HTMLButtonElement>('[data-zone-submit]');
	const formError = form.querySelector<HTMLElement>('[data-zone-form-error]');
	const status = form.querySelector<HTMLElement>('[data-zone-form-status]');
	const nameInput = form.querySelector<HTMLInputElement>('[name="zoneName"]');
	const savedName = nameInput?.value.trim() ?? '';
	clearErrorOnInput(form);
	trackUnsaved(form);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(formError, null);
		if (!validateFields(form)) return;
		const data = new FormData(form);

		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.pickup.saveZone({
			id: zoneId,
			name: String(data.get('zoneName') ?? ''),
			description: String(data.get('zoneDescription') ?? ''),
		});
		setBusy(submitButton, false, '');
		if (error) {
			showActionError(form, error, { name: 'zoneName', description: 'zoneDescription' }, formError);
			return;
		}
		unsavedForms.delete(form);
		if (nameInput && nameInput.value.trim() !== savedName) {
			reloadPage();
			return;
		}
		flashStatus(status, 'Guardado');
		requestSiteStatusRefresh();
	});

	form.querySelector<HTMLButtonElement>('[data-zone-remove]')?.addEventListener('click', () => {
		askToConfirm('remove-zone', 'Borrando…', async () => {
			const { error } = await actions.pickup.removeZone({ id: zoneId });
			if (error) return actionErrorMessage(error);
			goTo(zoneHref(undefined));
			return null;
		});
	});
}

function initFees(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-fees-form]');
	const zoneId = form?.dataset.zoneId;
	if (!form || !zoneId) return;
	const submitButton = form.querySelector<HTMLButtonElement>('[data-fees-submit]');
	const formError = form.querySelector<HTMLElement>('[data-fees-error]');
	const status = form.querySelector<HTMLElement>('[data-fees-status]');
	const rows = Array.from(form.querySelectorAll<HTMLElement>('[data-fee-row]'));
	if (!submitButton) return;
	trackUnsaved(form);

	rows.forEach((row) => {
		const served = row.querySelector<HTMLInputElement>('[data-fee-served]');
		const amount = row.querySelector<HTMLInputElement>('[data-fee-amount]');
		served?.addEventListener('change', () => {
			if (!amount) return;
			amount.disabled = !served.checked;
			amount.removeAttribute('aria-invalid');
		});
		amount?.addEventListener('input', () => amount.removeAttribute('aria-invalid'));
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(formError, null);

		const fees: { productId: string; fee: number }[] = [];
		const invalidInputs: HTMLInputElement[] = [];
		for (const row of rows) {
			const served = row.querySelector<HTMLInputElement>('[data-fee-served]');
			const amount = row.querySelector<HTMLInputElement>('[data-fee-amount]');
			if (!served?.checked || !amount || !row.dataset.productId) continue;
			const fee = amount.value.trim() === '' ? Number.NaN : Number(amount.value);
			if (!Number.isFinite(fee) || fee < 0 || fee > Number(amount.max)) {
				amount.setAttribute('aria-invalid', 'true');
				invalidInputs.push(amount);
				continue;
			}
			fees.push({ productId: row.dataset.productId, fee });
		}
		if (invalidInputs.length > 0) {
			showMessage(formError, 'Revisa las tarifas marcadas: van de 0 a 1.000.');
			invalidInputs[0].focus();
			return;
		}

		setBusy(submitButton, true, 'Guardando…');
		const listedProductIds = rows.flatMap((row) => (row.dataset.productId ? [row.dataset.productId] : []));
		const { error } = await actions.pickup.saveZoneFees({ zoneId, fees, listedProductIds });
		setBusy(submitButton, false, '');
		if (error) {
			showMessage(formError, actionErrorMessage(error));
			return;
		}
		unsavedForms.delete(form);
		flashStatus(status, 'Guardado');
		requestSiteStatusRefresh();
	});
}

function initAddHotels(root: HTMLElement, knownHotels: KnownHotel[]) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-add-hotels-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-add-hotels-form]');
	const textarea = form?.querySelector<HTMLTextAreaElement>('[name="hotelNames"]');
	const zoneId = root.dataset.zoneId;
	if (!dialog || !form || !textarea || !zoneId) return;
	const submitButton = form.querySelector<HTMLButtonElement>('[data-add-hotels-submit]');
	const formError = form.querySelector<HTMLElement>('[data-add-hotels-error]');
	const summary = form.querySelector<HTMLElement>('[data-add-hotels-summary]');
	const duplicatesMessage = form.querySelector<HTMLElement>('[data-add-hotels-duplicates]');
	const knownByKey = new Map(knownHotels.map((hotel) => [hotelNameKey(hotel.name), hotel]));
	wireDialogClosing(dialog, form.querySelector<HTMLButtonElement>('[data-add-hotels-close]'));
	clearErrorOnInput(form);

	const readPaste = () => {
		const unique = new Map<string, string>();
		textarea.value
			.split('\n')
			.map(normalizeHotelName)
			.filter(Boolean)
			.forEach((name) => {
				if (!unique.has(hotelNameKey(name))) unique.set(hotelNameKey(name), name);
			});
		const names = [...unique.values()];
		return {
			newNames: names.filter((name) => !knownByKey.has(hotelNameKey(name))),
			existing: names.flatMap((name) => knownByKey.get(hotelNameKey(name)) ?? []),
		};
	};

	const describeExisting = (existing: KnownHotel[]) =>
		existing.map((hotel) => (hotel.zoneId === zoneId ? `${hotel.name} (ya está aquí)` : `${hotel.name} (${hotel.zoneName})`)).join(', ');

	const refreshPreview = () => {
		const { newNames, existing } = readPaste();
		const hasText = textarea.value.trim().length > 0;
		showMessage(summary, hasText ? `${newNames.length} ${newNames.length === 1 ? 'hotel nuevo' : 'hoteles nuevos'}.` : null);
		showMessage(duplicatesMessage, existing.length > 0 ? `No se añaden porque ya existen: ${describeExisting(existing)}.` : null);
	};

	textarea.addEventListener('input', refreshPreview);

	root.querySelectorAll<HTMLButtonElement>('[data-add-hotels-open]').forEach((button) => {
		button.addEventListener('click', () => {
			form.reset();
			form.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => setFieldError(field, null));
			showMessage(formError, null);
			refreshPreview();
			dialog.showModal();
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(formError, null);
		if (!validateFields(form)) return;
		const { newNames } = readPaste();
		if (newNames.length === 0) {
			showMessage(formError, 'Todos esos hoteles ya existen.');
			return;
		}

		setBusy(submitButton, true, 'Añadiendo…');
		const { data: result, error } = await actions.pickup.addHotels({ zoneId, names: newNames });
		if (error || result.added === 0) {
			showMessage(formError, error ? actionErrorMessage(error) : 'Todos esos hoteles ya existen.');
			setBusy(submitButton, false, '');
			return;
		}
		reloadPage();
	});
}

function initEditHotel(root: HTMLElement, askToConfirm: AskToConfirm) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-edit-hotel-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-edit-hotel-form]');
	if (!dialog || !form) return;
	const nameInput = form.querySelector<HTMLInputElement>('[name="hotelName"]');
	const zoneSelect = form.querySelector<HTMLSelectElement>('[name="hotelZone"]');
	const activeInput = form.querySelector<HTMLInputElement>('[name="hotelActive"]');
	const moveHint = form.querySelector<HTMLElement>('[data-edit-hotel-move-hint]');
	const removeButton = form.querySelector<HTMLButtonElement>('[data-edit-hotel-remove]');
	const removeNote = form.querySelector<HTMLElement>('[data-edit-hotel-remove-note]');
	const submitButton = form.querySelector<HTMLButtonElement>('[data-edit-hotel-submit]');
	const formError = form.querySelector<HTMLElement>('[data-edit-hotel-error]');
	if (!nameInput || !zoneSelect || !activeInput) return;
	wireDialogClosing(dialog, form.querySelector<HTMLButtonElement>('[data-edit-hotel-close]'));
	clearErrorOnInput(form);

	let hotelId = '';
	let originalZoneId = '';
	let bookingCount = 0;

	zoneSelect.addEventListener('change', () => {
		if (moveHint) moveHint.hidden = bookingCount === 0 || zoneSelect.value === originalZoneId;
	});

	root.querySelectorAll<HTMLButtonElement>('[data-hotel-edit]').forEach((button) => {
		button.addEventListener('click', () => {
			hotelId = button.dataset.hotelId ?? '';
			originalZoneId = button.dataset.hotelZone ?? '';
			bookingCount = Number(button.dataset.hotelBookings ?? '0');
			form.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => setFieldError(field, null));
			showMessage(formError, null);
			nameInput.value = button.dataset.hotelName ?? '';
			zoneSelect.value = originalZoneId;
			activeInput.checked = button.dataset.hotelActive === 'true';
			if (moveHint) moveHint.hidden = true;
			if (removeButton) removeButton.hidden = bookingCount > 0;
			if (removeNote) removeNote.hidden = bookingCount === 0;
			dialog.showModal();
		});
	});

	removeButton?.addEventListener('click', () => {
		const id = hotelId;
		dialog.close();
		askToConfirm('remove-hotel', 'Borrando…', async () => {
			const { error } = await actions.pickup.removeHotel({ id });
			if (error) return actionErrorMessage(error);
			reloadPage();
			return null;
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(formError, null);
		if (!validateFields(form)) return;

		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.pickup.saveHotel({ id: hotelId, name: nameInput.value, zoneId: zoneSelect.value, active: activeInput.checked });
		if (error) {
			showActionError(form, error, { name: 'hotelName', zoneId: 'hotelZone' }, formError);
			setBusy(submitButton, false, '');
			return;
		}
		reloadPage();
	});
}

export function initPickupPage(root: HTMLElement) {
	const askToConfirm = initConfirmDialogs(root);
	window.addEventListener('beforeunload', (event) => {
		if (unsavedForms.size > 0) event.preventDefault();
	});
	initTabs(root);
	initZoneSelect(root);
	initHotelList(root);
	initNewZone(root);
	initReorder(root);
	initZoneForm(root, askToConfirm);
	initFees(root);
	initAddHotels(root, readKnownHotels(root));
	initEditHotel(root, askToConfirm);
}
