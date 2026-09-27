import { actions } from 'astro:actions';

const copiedFeedbackMs = 2000;

function buttonLabel(button: HTMLButtonElement) {
	return button.querySelector<HTMLElement>('[data-button-label]');
}

function setLabel(button: HTMLButtonElement, text: string | null) {
	const label = buttonLabel(button);
	if (!label) return;
	label.dataset.label ??= label.textContent?.trim() ?? '';
	label.textContent = text ?? label.dataset.label;
}

function showError(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
	if (message) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initCopyButtons(root: HTMLElement, errorElement: HTMLElement | null) {
	root.querySelectorAll<HTMLButtonElement>('button[data-copy-text]').forEach((button) => {
		let resetTimer: number | undefined;
		button.addEventListener('click', async () => {
			showError(errorElement, null);
			try {
				await navigator.clipboard.writeText(button.dataset.copyText ?? '');
			} catch {
				showError(errorElement, 'No pudimos copiar el texto. Prueba de nuevo.');
				return;
			}
			setLabel(button, 'Copiado');
			window.clearTimeout(resetTimer);
			resetTimer = window.setTimeout(() => setLabel(button, null), copiedFeedbackMs);
		});
	});
}

function initMarkButtons(root: HTMLElement, date: string, errorElement: HTMLElement | null) {
	const markButtons = root.querySelectorAll<HTMLButtonElement>('button[data-mark-step]');

	const errorTargetFor = (button: HTMLButtonElement) => button.closest('dialog')?.querySelector<HTMLElement>('[data-dialog-error]') ?? errorElement;

	markButtons.forEach((button) => {
		button.addEventListener('click', async () => {
			const errorTarget = errorTargetFor(button);
			showError(errorTarget, null);
			const productKey = button.dataset.productKey || undefined;
			const markAction = button.dataset.markStep === 'confirmed' ? actions.manage.markProviderConfirmed : actions.manage.markProviderSent;

			markButtons.forEach((markButton) => (markButton.disabled = true));
			setLabel(button, 'Guardando…');
			const { error } = await markAction({ date, productKey });
			if (error) {
				showError(errorTarget, error.message);
				setLabel(button, null);
				markButtons.forEach((markButton) => (markButton.disabled = markButton.dataset.initiallyDisabled === 'true'));
				return;
			}
			location.reload();
		});
		button.dataset.initiallyDisabled = String(button.disabled);
	});
}

function initMarkAllDialog(root: HTMLElement, errorElement: HTMLElement | null) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-mark-all-dialog]');
	const openButton = root.querySelector<HTMLButtonElement>('[data-open-mark-all]');
	if (!dialog || !openButton) return;

	openButton.addEventListener('click', () => {
		showError(errorElement, null);
		showError(dialog.querySelector<HTMLElement>('[data-dialog-error]'), null);
		dialog.showModal();
	});
	dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
}

function initDateInput(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-date-form]');
	const input = form?.querySelector<HTMLInputElement>('[data-date-input]');
	if (!form || !input) return;
	input.addEventListener('change', () => {
		if (input.value && input.value !== root.dataset.date) form.requestSubmit();
	});
}

export function initDepartures(root: HTMLElement) {
	const date = root.dataset.date;
	if (!date) return;
	const errorElement = root.querySelector<HTMLElement>('[data-departures-error]');
	initDateInput(root);
	initCopyButtons(root, errorElement);
	initMarkButtons(root, date, errorElement);
	initMarkAllDialog(root, errorElement);
}
