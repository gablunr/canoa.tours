import { clearErrorOnInput, validateFields } from '../ui/form-validation';

const genericError = 'No pudimos enviar el enlace. Inténtalo de nuevo en unos segundos.';
const connectionError = 'No pudimos enviar el enlace. Revisa tu conexión e inténtalo de nuevo.';

export function initSignIn(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-sign-in-form]');
	const formStep = root.querySelector<HTMLElement>('[data-sign-in-step="form"]');
	const sentStep = root.querySelector<HTMLElement>('[data-sign-in-step="sent"]');
	if (!form || !formStep || !sentStep) return;

	const emailInput = form.elements.namedItem('email') as HTMLInputElement;
	const nextInput = form.elements.namedItem('next') as HTMLInputElement;
	const submitButton = form.querySelector<HTMLButtonElement>('[data-sign-in-submit]');
	const errorMessage = form.querySelector<HTMLElement>('[data-sign-in-error]');
	const sentEmail = sentStep.querySelector<HTMLElement>('[data-sign-in-email]');
	const sentHeading = sentStep.querySelector<HTMLElement>('[data-sign-in-sent-heading]');
	const resetButton = sentStep.querySelector<HTMLButtonElement>('[data-sign-in-reset]');
	const submitLabel = submitButton?.textContent?.trim() ?? '';

	const showError = (message: string | null) => {
		if (!errorMessage) return;
		errorMessage.textContent = message ?? '';
		errorMessage.hidden = !message;
	};

	const setSending = (sending: boolean) => {
		if (!submitButton) return;
		submitButton.disabled = sending;
		submitButton.textContent = sending ? 'Enviando…' : submitLabel;
	};

	const showSent = (email: string) => {
		if (sentEmail) sentEmail.textContent = email;
		formStep.hidden = true;
		sentStep.hidden = false;
		sentHeading?.focus();
	};

	clearErrorOnInput(form);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showError(null);
		if (!validateFields(form)) return;

		const email = emailInput.value.trim();
		setSending(true);

		try {
			const response = await fetch('/api/auth/magic-link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, next: nextInput.value }),
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { error?: string } | null;
				showError(body?.error ?? genericError);
				return;
			}

			showSent(email);
		} catch {
			showError(connectionError);
		} finally {
			setSending(false);
		}
	});

	resetButton?.addEventListener('click', () => {
		sentStep.hidden = true;
		formStep.hidden = false;
		emailInput.focus();
		emailInput.select();
	});
}
