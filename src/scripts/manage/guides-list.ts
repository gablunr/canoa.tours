import { actions } from 'astro:actions';
import { actionErrorMessage, readRouteConfig, setBusy, showMessage, slugify, wireDialogClosing, wireSlugField } from './form-helpers';

export function initGuidesPage(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-new-guide-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-new-guide-form]');
	const titleInput = form?.querySelector<HTMLInputElement>('[data-title-input]');
	const siloSelect = form?.querySelector<HTMLSelectElement>('[data-silo-select]');
	const slugInput = form?.querySelector<HTMLInputElement>('[data-slug-input]');
	if (!dialog || !form || !titleInput || !siloSelect || !slugInput) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-new-guide-submit]');
	const errorMessage = form.querySelector<HTMLElement>('[data-new-guide-error]');
	const pathHint = slugInput.id ? document.getElementById(`${slugInput.id}-hint`) : null;
	let slugEditedByHand = false;

	const refreshSlug = wireSlugField(readRouteConfig(root), {
		siloSelect,
		slugInput,
		onPrefixChange: (prefix) => {
			if (pathHint) pathHint.textContent = `canoa.tours${prefix}${slugInput.value.trim()}`;
		},
	});

	titleInput.addEventListener('input', () => {
		if (slugEditedByHand) return;
		slugInput.value = slugify(titleInput.value);
		refreshSlug();
	});
	slugInput.addEventListener('input', () => {
		slugEditedByHand = slugInput.value.trim().length > 0;
	});
	slugInput.addEventListener('change', () => {
		slugInput.value = slugify(slugInput.value);
		refreshSlug();
	});

	wireDialogClosing(dialog, form.querySelector<HTMLButtonElement>('[data-new-guide-close]'));

	root.querySelectorAll<HTMLButtonElement>('[data-new-guide-open]').forEach((button) => {
		button.addEventListener('click', () => {
			showMessage(errorMessage, null);
			dialog.showModal();
			titleInput.focus();
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!form.reportValidity()) return;

		showMessage(errorMessage, null);
		setBusy(submitButton, true, 'Creando…');
		const { data, error } = await actions.guides.create({
			title: titleInput.value.trim(),
			slug: slugInput.value.trim(),
			silo: siloSelect.value,
		});
		if (error) {
			showMessage(errorMessage, actionErrorMessage(error));
			setBusy(submitButton, false, '');
			return;
		}
		window.location.assign(`/manage/guides/${data.guideId}`);
	});
}
