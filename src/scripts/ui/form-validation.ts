type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const fallbackMessages = {
	required: 'Este campo es obligatorio.',
	invalid: 'Revisa este dato.',
};

const fieldControls = (field: HTMLElement) =>
	Array.from(field.querySelectorAll<FieldControl>('input, select, textarea'));

export function setFieldError(field: HTMLElement, message: string | null) {
	for (const control of fieldControls(field)) {
		if (message) control.setAttribute('aria-invalid', 'true');
		else control.removeAttribute('aria-invalid');
	}

	const error = field.querySelector<HTMLElement>('[data-field-error]');
	if (!error) return;
	error.textContent = message ?? '';
	error.hidden = !message;
}

export function validateField(field: HTMLElement) {
	const invalidControl = fieldControls(field).find((control) => !control.validity.valid);
	const message = invalidControl?.validity.valueMissing
		? (field.dataset.requiredMessage ?? fallbackMessages.required)
		: (field.dataset.invalidMessage ?? fallbackMessages.invalid);

	setFieldError(field, invalidControl ? message : null);
	return invalidControl;
}

export function validateFields(root: HTMLElement) {
	const fields = Array.from(root.querySelectorAll<HTMLElement>('[data-field]'));
	const invalidControls = fields.map(validateField).filter((control) => control !== undefined);
	invalidControls[0]?.focus();
	return invalidControls.length === 0;
}

export function clearErrorOnInput(root: HTMLElement) {
	root.addEventListener('input', (event) => {
		const field = (event.target as Element | null)?.closest<HTMLElement>('[data-field]');
		if (field) validateField(field);
	});
}
