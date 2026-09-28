import { actions, isInputError } from 'astro:actions';
import { clearErrorOnInput, validateFields } from '../ui/form-validation';
import { shrinkPhoto } from '../ui/shrink-photo';

const ratingLabels = ['Muy mala', 'Mala', 'Normal', 'Buena', 'Excelente'];
const maxPhotos = 5;
const maxPhotosTotalBytes = 4 * 1024 * 1024;
const photoLongEdge = 1600;
const acceptedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const tooManyPhotosMessage = `Puedes subir hasta ${maxPhotos} fotos.`;
const photosTooHeavyMessage = 'Las fotos pesan demasiado entre todas. Quita alguna para enviar tu opinión.';
const unreadablePhotoMessage = 'Solo se aceptan fotos JPG, PNG, WebP o AVIF.';

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

	const addPhotos = async (picked: File[]) => {
		const images = picked.filter((file) => file.type.startsWith('image/'));
		const shrunk = await Promise.all(images.map((image) => shrinkPhoto(image, { longEdge: photoLongEdge })));
		const readable = shrunk.filter((file) => acceptedPhotoTypes.includes(file.type));
		const merged = [...photos, ...readable];
		photos = merged.slice(0, maxPhotos);
		sync();

		if (merged.length > maxPhotos) showMessage(errorMessage, tooManyPhotosMessage);
		else if (readable.length < images.length) showMessage(errorMessage, unreadablePhotoMessage);
		else showMessage(errorMessage, photosProblem(photos));
	};

	input.addEventListener('change', () => void addPhotos(Array.from(input.files ?? [])));

	dropZone.addEventListener('dragover', (event) => {
		event.preventDefault();
		dropZone.toggleAttribute('data-dragging', true);
	});
	dropZone.addEventListener('dragleave', () => dropZone.toggleAttribute('data-dragging', false));
	dropZone.addEventListener('drop', (event) => {
		event.preventDefault();
		dropZone.toggleAttribute('data-dragging', false);
		void addPhotos(Array.from(event.dataTransfer?.files ?? []));
	});
}

function photosProblem(files: File[]): string | null {
	if (files.length > maxPhotos) return tooManyPhotosMessage;
	if (files.reduce((total, file) => total + file.size, 0) > maxPhotosTotalBytes) return photosTooHeavyMessage;
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

		const photoError = photosProblem(Array.from(photosInput?.files ?? []));
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
