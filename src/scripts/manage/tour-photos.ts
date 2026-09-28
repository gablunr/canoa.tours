import { actions } from 'astro:actions';
import type { TourImage } from '../../lib/tours/tour-schema';
import { actionErrorMessage } from './form-helpers';
import { fitWithin } from './tour-editor-helpers';

type PhotoState = 'ready' | 'waiting' | 'resizing' | 'uploading' | 'failed';

interface Photo {
	key: number;
	path: string | null;
	url: string;
	alt: string;
	width: number;
	height: number;
	state: PhotoState;
	error: string | null;
	file: File | null;
}

interface StoredPhoto {
	path: string;
	alt: string;
	width: number;
	height: number;
	url: string;
}

export interface TourPhotos {
	read: () => TourImage[];
	isBusy: () => boolean;
	count: () => number;
}

const maxSide = 2400;
const maxOriginalBytes = 25 * 1024 * 1024;
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const resizeQuality = 0.86;
const reencodeAboveBytes = 4 * 1024 * 1024;
const announceDelay = 100;

const stateTexts: Record<PhotoState, string> = {
	ready: '',
	waiting: 'En cola…',
	resizing: 'Reduciendo…',
	uploading: 'Subiendo…',
	failed: '',
};

function parseStored(value: string | undefined): StoredPhoto[] {
	try {
		const parsed: unknown = value ? JSON.parse(value) : [];
		return Array.isArray(parsed) ? (parsed as StoredPhoto[]) : [];
	} catch {
		return [];
	}
}

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
	return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, resizeQuality));
}

const extensionFor = (type: string) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg');

export async function resizeForUpload(file: File): Promise<File> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}
	const size = fitWithin(bitmap.width, bitmap.height, maxSide);
	const needsReencode = size.scaled || file.size > reencodeAboveBytes || file.type === 'image/png';
	if (!needsReencode) {
		bitmap.close();
		return file;
	}

	const canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height);
	bitmap.close();

	const preferredTypes = file.type === 'image/png' ? ['image/webp', 'image/jpeg'] : [file.type, 'image/jpeg'];
	for (const type of preferredTypes) {
		const blob = await canvasBlob(canvas, type);
		if (blob && blob.type === type) {
			const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
			return new File([blob], `${baseName}.${extensionFor(type)}`, { type });
		}
	}
	return file;
}

export function initTourPhotos(root: HTMLElement, tourId: string): TourPhotos | null {
	const list = root.querySelector<HTMLOListElement>('[data-photo-list]');
	const template = root.querySelector<HTMLTemplateElement>('template[data-photo-template]');
	const fileInput = root.querySelector<HTMLInputElement>('[data-photo-input]');
	const dropZone = root.querySelector<HTMLElement>('[data-photo-drop]');
	const summary = root.querySelector<HTMLElement>('[data-photo-summary]');
	const liveRegion = root.querySelector<HTMLElement>('[data-photo-status]');
	const errorElement = root.querySelector<HTMLElement>(':scope > [data-field-error]');
	if (!list || !template || !fileInput) return null;

	const limit = Number(root.dataset.photoLimit) || 20;
	let nextKey = 0;
	let queue = Promise.resolve();
	const photos: Photo[] = parseStored(root.dataset.photosInitial).map((photo) => ({
		key: nextKey++,
		path: photo.path,
		url: photo.url,
		alt: photo.alt,
		width: photo.width,
		height: photo.height,
		state: 'ready',
		error: null,
		file: null,
	}));

	const notifyChange = () => root.dispatchEvent(new Event('input', { bubbles: true }));

	const announce = (message: string) => {
		if (!liveRegion) return;
		liveRegion.textContent = '';
		window.setTimeout(() => {
			liveRegion.textContent = message;
		}, announceDelay);
	};

	const showListError = (message: string | null) => {
		if (!errorElement) return;
		errorElement.textContent = message ?? '';
		errorElement.hidden = !message;
	};

	const refreshSummary = () => {
		if (!summary) return;
		const count = photos.length;
		summary.textContent = count === 0 ? 'Sin fotos propias, la ficha usa la foto del destino.' : `${count} ${count === 1 ? 'foto' : 'fotos'} de ${limit} como mucho.`;
	};

	const itemFor = (photo: Photo) => list.querySelector<HTMLElement>(`[data-photo-key="${photo.key}"]`);

	function renderPhoto(photo: Photo, index: number): HTMLElement | null {
		let item = itemFor(photo);
		if (!item) {
			const clone = template?.content.firstElementChild?.cloneNode(true);
			if (!(clone instanceof HTMLElement)) return null;
			item = clone;
			item.dataset.photoKey = String(photo.key);
			const altInput = item.querySelector<HTMLInputElement>('[data-photo-alt]');
			const altLabel = item.querySelector<HTMLLabelElement>('[data-photo-alt-label]');
			if (altInput) {
				altInput.id = `field-photo-alt-${photo.key}`;
				altInput.value = photo.alt;
				altInput.addEventListener('input', () => {
					photo.alt = altInput.value;
					altInput.removeAttribute('aria-invalid');
				});
			}
			if (altLabel && altInput) altLabel.htmlFor = altInput.id;
		}

		const position = index + 1;
		const isCover = index === 0;
		const altLabel = item.querySelector<HTMLLabelElement>('[data-photo-alt-label]');
		if (altLabel) altLabel.textContent = isCover ? 'Texto alternativo de la portada' : `Texto alternativo de la foto ${position}`;
		const image = item.querySelector<HTMLImageElement>('[data-photo-image]');
		if (image && image.src !== photo.url) image.src = photo.url;
		const badge = item.querySelector<HTMLElement>('[data-photo-cover-badge]');
		if (badge) badge.hidden = !isCover;

		item.toggleAttribute('data-photo-ready', photo.state === 'ready' && Boolean(photo.path));
		const busy = photo.state !== 'ready' && photo.state !== 'failed';
		const stateLine = item.querySelector<HTMLElement>('[data-photo-state]');
		if (stateLine) {
			const text = photo.state === 'failed' ? (photo.error ?? 'No se pudo subir.') : stateTexts[photo.state];
			stateLine.textContent = text;
			stateLine.hidden = text === '';
			stateLine.classList.toggle('text-error', photo.state === 'failed');
		}
		const progress = item.querySelector<HTMLElement>('[data-photo-progress]');
		if (progress) progress.hidden = !busy;

		const description = photo.alt.trim() ? `«${photo.alt.trim()}»` : `la foto ${position}`;
		const up = item.querySelector<HTMLButtonElement>('[data-photo-action="up"]');
		const down = item.querySelector<HTMLButtonElement>('[data-photo-action="down"]');
		const cover = item.querySelector<HTMLButtonElement>('[data-photo-action="cover"]');
		const remove = item.querySelector<HTMLButtonElement>('[data-photo-action="remove"]');
		if (up) {
			up.disabled = index === 0;
			up.setAttribute('aria-label', `Subir ${description}`);
		}
		if (down) {
			down.disabled = index === photos.length - 1;
			down.setAttribute('aria-label', `Bajar ${description}`);
		}
		if (cover) {
			cover.hidden = isCover;
			cover.setAttribute('aria-label', `Usar ${description} de portada`);
		}
		if (remove) {
			remove.disabled = busy;
			remove.setAttribute('aria-label', `Quitar ${description}`);
		}
		return item;
	}

	function render() {
		const items = photos.map(renderPhoto).filter((item): item is HTMLElement => item !== null);
		items.forEach((item, index) => {
			if (list?.children[index] !== item) list?.insertBefore(item, list.children[index] ?? null);
		});
		while (list && list.children.length > items.length) list.lastElementChild?.remove();
		refreshSummary();
	}

	async function upload(photo: Photo) {
		if (!photo.file || !photos.includes(photo)) return;
		photo.state = 'resizing';
		render();
		const file = await resizeForUpload(photo.file);

		photo.state = 'uploading';
		render();
		const body = new FormData();
		body.set('id', tourId);
		body.set('image', file);
		const { data, error } = await actions.tours.uploadImage(body);
		if (!photos.includes(photo)) return;
		if (error) {
			photo.state = 'failed';
			photo.error = actionErrorMessage(error);
			render();
			announce(`No se pudo subir una foto. ${photo.error}`);
			return;
		}

		photo.path = data.path;
		photo.width = data.width;
		photo.height = data.height;
		photo.state = 'ready';
		photo.file = null;
		render();
		announce('Foto subida. Guarda para conservarla.');
		notifyChange();
	}

	function addFiles(files: File[]) {
		showListError(null);
		const room = limit - photos.length;
		const rejected: string[] = [];
		const accepted = files.filter((file) => {
			if (!acceptedTypes.includes(file.type)) {
				rejected.push(`${file.name}: usa JPG, PNG o WebP.`);
				return false;
			}
			if (file.size > maxOriginalBytes) {
				rejected.push(`${file.name}: pasa de 25 MB.`);
				return false;
			}
			return true;
		});
		const added = accepted.slice(0, Math.max(0, room));
		if (accepted.length > added.length) rejected.push(`Caben ${limit} fotos como mucho.`);
		if (rejected.length > 0) showListError(rejected.join(' '));

		for (const file of added) {
			const photo: Photo = {
				key: nextKey++,
				path: null,
				url: URL.createObjectURL(file),
				alt: '',
				width: 0,
				height: 0,
				state: 'waiting',
				error: null,
				file,
			};
			photos.push(photo);
			queue = queue.then(() => upload(photo));
		}
		if (added.length > 0) {
			render();
			announce(added.length === 1 ? 'Subiendo 1 foto.' : `Subiendo ${added.length} fotos.`);
		}
	}

	function move(photo: Photo, target: number) {
		const index = photos.indexOf(photo);
		if (index === -1 || target < 0 || target >= photos.length || target === index) return;
		photos.splice(index, 1);
		photos.splice(target, 0, photo);
		render();
		notifyChange();
	}

	list.addEventListener('click', (event) => {
		const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-photo-action]');
		const item = button?.closest<HTMLElement>('[data-photo]');
		const photo = photos.find((candidate) => String(candidate.key) === item?.dataset.photoKey);
		if (!button || !photo || button.disabled) return;

		const action = button.dataset.photoAction;
		const index = photos.indexOf(photo);
		if (action === 'up' || action === 'down') {
			move(photo, action === 'up' ? index - 1 : index + 1);
			const focusTarget = itemFor(photo)?.querySelector<HTMLButtonElement>(`[data-photo-action="${action}"]`);
			(focusTarget && !focusTarget.disabled ? focusTarget : itemFor(photo)?.querySelector<HTMLButtonElement>('[data-photo-action="remove"]'))?.focus();
			announce(`Movida a la posición ${photos.indexOf(photo) + 1}`);
		} else if (action === 'cover') {
			move(photo, 0);
			itemFor(photo)?.querySelector<HTMLInputElement>('[data-photo-alt]')?.focus();
			announce('Ahora es la portada');
		} else if (action === 'remove') {
			photos.splice(index, 1);
			if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url);
			render();
			notifyChange();
			const neighbour = photos[index] ?? photos[index - 1];
			(neighbour ? itemFor(neighbour)?.querySelector<HTMLButtonElement>('[data-photo-action="remove"]') : fileInput)?.focus();
			announce('Foto quitada');
		}
	});

	fileInput.addEventListener('change', () => {
		addFiles(Array.from(fileInput.files ?? []));
		fileInput.value = '';
	});

	if (dropZone) {
		const setDragging = (dragging: boolean) => dropZone.toggleAttribute('data-dragging', dragging);
		dropZone.addEventListener('dragover', (event) => {
			event.preventDefault();
			setDragging(true);
		});
		dropZone.addEventListener('dragleave', () => setDragging(false));
		dropZone.addEventListener('drop', (event) => {
			event.preventDefault();
			setDragging(false);
			addFiles(Array.from(event.dataTransfer?.files ?? []));
		});
	}

	render();

	return {
		read: () =>
			photos
				.filter((photo) => photo.state === 'ready' && photo.path)
				.map((photo) => ({ path: photo.path ?? '', alt: photo.alt.trim(), width: photo.width, height: photo.height })),
		isBusy: () => photos.some((photo) => photo.state === 'waiting' || photo.state === 'resizing' || photo.state === 'uploading'),
		count: () => photos.filter((photo) => photo.state === 'ready').length,
	};
}
