import { actions, isInputError } from 'astro:actions';

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

function initFilters(root: HTMLElement) {
	const buttons = root.querySelectorAll<HTMLButtonElement>('[data-coupon-filter]');
	const items = root.querySelectorAll<HTMLElement>('[data-coupon-state]');
	const emptyMessage = root.querySelector<HTMLElement>('[data-coupon-filter-empty]');

	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			const filter = button.dataset.couponFilter ?? 'all';
			buttons.forEach((other) => other.setAttribute('aria-pressed', other === button ? 'true' : 'false'));
			let visibleCount = 0;
			items.forEach((item) => {
				const visible = filter === 'all' || item.dataset.couponState === filter;
				item.hidden = !visible;
				if (visible) visibleCount += 1;
			});
			if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
		});
	});
}

const copiedFeedbackMs = 1500;

function initCopyCodes(root: HTMLElement) {
	const errorMessage = root.querySelector<HTMLElement>('[data-coupons-error]');

	root.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((button) => {
		const label = button.querySelector<HTMLElement>('[data-copy-label]');
		let resetTimer: number | undefined;
		button.addEventListener('click', async () => {
			const code = button.dataset.copyCode ?? '';
			try {
				await navigator.clipboard.writeText(code);
			} catch {
				showMessage(errorMessage, 'No pudimos copiar el código. Prueba de nuevo.');
				return;
			}
			showMessage(errorMessage, null);
			if (label) label.textContent = 'Copiado';
			window.clearTimeout(resetTimer);
			resetTimer = window.setTimeout(() => {
				if (label) label.textContent = code;
			}, copiedFeedbackMs);
		});
	});
}

function initToggles(root: HTMLElement) {
	const errorMessage = root.querySelector<HTMLElement>('[data-coupons-error]');

	root.querySelectorAll<HTMLButtonElement>('[data-coupon-toggle]').forEach((toggle) => {
		toggle.addEventListener('click', async () => {
			const code = toggle.dataset.code;
			if (!code) return;
			const nextActive = toggle.getAttribute('aria-checked') !== 'true';

			showMessage(errorMessage, null);
			toggle.disabled = true;
			toggle.setAttribute('aria-checked', String(nextActive));
			const { error } = await actions.manage.setCouponActive({ code, active: nextActive });
			if (error) {
				toggle.setAttribute('aria-checked', String(!nextActive));
				toggle.disabled = false;
				showMessage(errorMessage, error.message);
				return;
			}
			location.reload();
		});
	});
}

function clearFieldErrors(form: HTMLFormElement) {
	form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((element) => showMessage(element, null));
	form.querySelectorAll('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function showFieldErrors(form: HTMLFormElement, fields: Record<string, string[] | undefined>) {
	let firstInvalid: HTMLElement | null = null;
	for (const [name, messages] of Object.entries(fields)) {
		const message = messages?.[0];
		if (!message) continue;
		showMessage(form.querySelector<HTMLElement>(`#field-${name}-error`), message);
		const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
		input?.setAttribute('aria-invalid', 'true');
		firstInvalid ??= input;
	}
	firstInvalid?.focus();
	return firstInvalid !== null;
}

const optionalText = (value: FormDataEntryValue | null) => {
	const text = typeof value === 'string' ? value.trim() : '';
	return text || undefined;
};

const optionalNumber = (value: FormDataEntryValue | null) => {
	const text = optionalText(value);
	return text === undefined ? undefined : Number(text);
};

function initCreateDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-coupon-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-coupon-form]');
	if (!dialog || !form) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-coupon-submit]');
	const formError = form.querySelector<HTMLElement>('[data-coupon-form-error]');
	const valueHint = form.querySelector<HTMLElement>('#field-discountValue-hint');
	const valueInput = form.querySelector<HTMLInputElement>('[name="discountValue"]');

	const syncValueHint = () => {
		const isPercent = form.querySelector<HTMLInputElement>('[name="discountType"]:checked')?.value !== 'fixed';
		if (valueHint) valueHint.textContent = isPercent ? 'En porcentaje, hasta 100.' : 'En dólares, por reserva.';
		if (valueInput) valueInput.max = isPercent ? '100' : '';
	};

	root.querySelectorAll<HTMLButtonElement>('[data-coupon-new]').forEach((button) => {
		button.addEventListener('click', () => {
			form.reset();
			clearFieldErrors(form);
			showMessage(formError, null);
			const percentOption = form.querySelector<HTMLInputElement>('[name="discountType"][value="percent"]');
			if (percentOption) percentOption.checked = true;
			syncValueHint();
			dialog.showModal();
		});
	});

	form.querySelectorAll<HTMLInputElement>('[name="discountType"]').forEach((radio) => radio.addEventListener('change', syncValueHint));
	form.querySelector<HTMLButtonElement>('[data-coupon-dialog-close]')?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearFieldErrors(form);
		showMessage(formError, null);

		const data = new FormData(form);
		const discountType = data.get('discountType') === 'fixed' ? 'fixed' : 'percent';

		setBusy(submitButton, true, 'Creando…');
		const { error } = await actions.manage.createCoupon({
			code: String(data.get('code') ?? '').trim().toUpperCase(),
			discountType,
			discountValue: Number(data.get('discountValue')),
			productKey: optionalText(data.get('productKey')),
			validFrom: optionalText(data.get('validFrom')),
			validTo: optionalText(data.get('validTo')),
			maxRedemptions: optionalNumber(data.get('maxRedemptions')),
		});
		if (error) {
			const shownInFields = isInputError(error) && showFieldErrors(form, error.fields);
			if (!shownInFields) showMessage(formError, error.message);
			setBusy(submitButton, false, '');
			return;
		}
		location.reload();
	});
}

export function initCouponsPage(root: HTMLElement) {
	initFilters(root);
	initCopyCodes(root);
	initToggles(root);
	initCreateDialog(root);
}
