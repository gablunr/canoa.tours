import { actions, isInputError } from 'astro:actions';
import { clearErrorOnInput, validateFields } from '../ui/form-validation';

const ratingLabels = ['Muy mala', 'Mala', 'Normal', 'Buena', 'Excelente'];
const maxPhotos = 5;
const maxPhotoBytes = 5 * 1024 * 1024;
const tooManyPhotosMessage = `Puedes subir hasta ${maxPhotos} fotos.`;
const photoTooHeavyMessage = 'Cada foto puede pesar como máximo 5 MB.';

function showMessage(element: HTMLElement | null | undefined, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

function initRating(form: HTMLFormElement) {
	const stars = Array.from(form.querySelectorAll<HTMLElement>('[data-rating-star]'));
	const label = form.querySelector<HTMLElement>('[data-rating-label]');
	const checkedValue = () => Number(form.querySelector<HTMLInputElement>('input[name="rating"]:checked')?.value ?? 0);

	const paint = (value: number) => {
		for (const star of stars) star.toggleAttribute('data-filled', Number(star.dataset.ratingStar) <= value);
		if (label) label.textContent = value > 0 ? (ratingLabels[value - 1] ?? '') : (label.dataset.placeholder ?? '');
	};

	for (const star of stars) {
		star.addEventListener('mouseenter', () => paint(Number(star.dataset.ratingStar)));
	}
	form.querySelector('[data-rating]')?.addEventListener('mouseleave', () => paint(checkedValue()));
	form.addEventListener('change', (event) => {
		if ((event.target as HTMLInputElement).name === 'rating') paint(checkedValue());
	});
}

function initBodyCounter(form: HTMLFormElement) {
	const body = form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
	const counter = form.querySelector<HTMLElement>('[data-body-count]');
	if (!body || !counter) return;

	const update = () => {
		counter.textContent = `${body.value.length}/${counter.dataset.max ?? ''}`;
	};
	body.addEventListener('input', update);
	update();
}

function initPhotos(form: HTMLFormElement) {
	const root = form.querySelector<HTMLElement>('[data-photos]');
	const input = root?.querySelector<HTMLInputElement>('input[name="photos"]');
	const dropZone = root?.querySelector<HTMLElement>('[data-photo-drop]');
	const previews = root?.querySelector<HTMLElement>('[data-photo-previews]');
	const template = root?.querySelector<HTMLTemplateElement>('[data-photo-preview-template]');
	const errorMessage = root?.querySelector<HTMLElement>('[data-photos-error]');
	if (!input || !dropZone || !previews || !template) return;

	let photos: File[] = [];
	let previewUrls: string[] = [];

	const render = () => {
		previewUrls.forEach((url) => URL.revokeObjectURL(url));
		previewUrls = photos.map((photo) => URL.createObjectURL(photo));

		const items = photos.map((photo, index) => {
			const item = template.content.firstElementChild?.cloneNode(true) as HTMLElement;
			const image = item.querySelector('img');
			const removeButton = item.querySelector<HTMLButtonElement>('[data-photo-remove]');
			if (image) {
				image.src = previewUrls[index] ?? '';
				image.addEventListener('error', () => image.remove(), { once: true });
			}
			if (removeButton) {
				removeButton.setAttribute('aria-label', `Quitar ${photo.name}`);
				removeButton.addEventListener('click', () => {
					photos = photos.filter((_, photoIndex) => photoIndex !== index);
					sync();
					showMessage(errorMessage, null);
				});
			}
			return item;
		});

		previews.replaceChildren(...items);
		previews.hidden = photos.length === 0;
		dropZone.hidden = photos.length >= maxPhotos;
	};

	const sync = () => {
		const transfer = new DataTransfer();
		photos.forEach((photo) => transfer.items.add(photo));
		input.files = transfer.files;
		render();
	};

	const addPhotos = (picked: File[]) => {
		const images = picked.filter((file) => file.type.startsWith('image/'));
		const light = images.filter((file) => file.size <= maxPhotoBytes);
		const merged = [...photos, ...light];
		photos = merged.slice(0, maxPhotos);
		sync();

		if (merged.length > maxPhotos) showMessage(errorMessage, tooManyPhotosMessage);
		else if (light.length < images.length) showMessage(errorMessage, photoTooHeavyMessage);
		else showMessage(errorMessage, null);
	};

	input.addEventListener('change', () => addPhotos(Array.from(input.files ?? [])));

	dropZone.addEventListener('dragover', (event) => {
		event.preventDefault();
		dropZone.toggleAttribute('data-dragging', true);
	});
	dropZone.addEventListener('dragleave', () => dropZone.toggleAttribute('data-dragging', false));
	dropZone.addEventListener('drop', (event) => {
		event.preventDefault();
		dropZone.toggleAttribute('data-dragging', false);
		addPhotos(Array.from(event.dataTransfer?.files ?? []));
	});
}

function photosProblem(input: HTMLInputElement | null): string | null {
	const files = Array.from(input?.files ?? []);
	if (files.length > maxPhotos) return tooManyPhotosMessage;
	if (files.some((file) => file.size > maxPhotoBytes)) return photoTooHeavyMessage;
	return null;
}

export function initReviewForm(form: HTMLFormElement) {
	const section = form.parentElement;
	const done = section?.querySelector<HTMLElement>('[data-review-done]');
	const doneHeading = section?.querySelector<HTMLElement>('[data-review-done-heading]');
	const submitButton = form.querySelector<HTMLButtonElement>('[data-review-submit]');
	const errorMessage = form.querySelector<HTMLElement>('[data-review-error]');
	const photosInput = form.querySelector<HTMLInputElement>('input[name="photos"]');
	const submitLabel = submitButton?.textContent?.trim() ?? '';

	initRating(form);
	initBodyCounter(form);
	initPhotos(form);
	clearErrorOnInput(form);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		showMessage(errorMessage, null);
		if (!validateFields(form)) return;

		const photoError = photosProblem(photosInput);
		if (photoError) {
			showMessage(errorMessage, photoError);
			return;
		}

		if (submitButton) {
			submitButton.disabled = true;
			submitButton.textContent = 'Enviando…';
		}

		const { error } = await actions.account.submitReview(new FormData(form));

		if (submitButton) {
			submitButton.disabled = false;
			submitButton.textContent = submitLabel;
		}

		if (error) {
			const firstIssue = isInputError(error) ? Object.values(error.fields).flat()[0] : undefined;
			showMessage(errorMessage, firstIssue ?? error.message);
			return;
		}

		form.hidden = true;
		if (done) done.hidden = false;
		doneHeading?.focus();
	});
}
