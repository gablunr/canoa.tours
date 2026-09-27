import { actions } from 'astro:actions';
import { clearErrorOnInput, validateFields } from '../ui/form-validation';

const notSet = 'Sin indicar';

export function initProfileForm(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-profile-form]');
	if (!form) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-profile-submit]');
	const errorMessage = form.querySelector<HTMLElement>('[data-profile-error]');
	const savedMessage = form.querySelector<HTMLElement>('[data-profile-saved]');
	const countrySelect = form.elements.namedItem('country') as HTMLSelectElement;
	const submitLabel = submitButton?.textContent?.trim() ?? '';

	const field = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value.trim();

	const showError = (message: string | null) => {
		if (!errorMessage) return;
		errorMessage.textContent = message ?? '';
		errorMessage.hidden = !message;
	};

	const showValue = (name: string, value: string) => {
		root.querySelectorAll<HTMLElement>(`[data-profile-value="${name}"]`).forEach((element) => {
			element.textContent = value;
		});
	};

	const refreshSummary = (saved: { full_name: string; phone: string | null; country: string | null }) => {
		showValue('fullName', saved.full_name);
		showValue('phone', saved.phone ?? notSet);
		showValue('country', saved.country ? (countrySelect.selectedOptions[0]?.textContent ?? saved.country) : notSet);
	};

	clearErrorOnInput(form);
	form.addEventListener('input', () => {
		if (savedMessage) savedMessage.hidden = true;
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showError(null);
		if (savedMessage) savedMessage.hidden = true;
		if (!validateFields(form)) return;

		if (submitButton) {
			submitButton.disabled = true;
			submitButton.textContent = 'Guardando…';
		}

		const { data, error } = await actions.account.updateProfile({
			fullName: field('fullName'),
			phone: field('phone') || undefined,
			country: field('country'),
		});

		if (submitButton) {
			submitButton.disabled = false;
			submitButton.textContent = submitLabel;
		}

		if (error) {
			showError(error.message);
			return;
		}

		refreshSummary(data);
		if (savedMessage) savedMessage.hidden = false;
	});
}
