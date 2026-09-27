import { isInputError, type ActionError } from 'astro:actions';

interface RouteConfig {
	prefixes: Record<string, string>;
	tourSlugs: Record<string, string[]>;
}

interface SlugFieldElements {
	siloSelect: HTMLSelectElement;
	slugInput: HTMLInputElement;
	onPrefixChange: (prefix: string) => void;
}

const takenByTourMessage = 'Esa dirección ya la usa una excursión de este destino. Elige otra.';

export const slugify = (text: string) =>
	text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/, '');

function parseJson<Value>(value: string | undefined, fallback: Value): Value {
	try {
		return value ? (JSON.parse(value) as Value) : fallback;
	} catch {
		return fallback;
	}
}

export function readRouteConfig(root: HTMLElement): RouteConfig {
	return {
		prefixes: parseJson(root.dataset.pathPrefixes, {}),
		tourSlugs: parseJson(root.dataset.tourSlugs, {}),
	};
}

export function wireSlugField(config: RouteConfig, { siloSelect, slugInput, onPrefixChange }: SlugFieldElements) {
	const refresh = () => {
		onPrefixChange(config.prefixes[siloSelect.value] ?? '/');
		const takenByTour = config.tourSlugs[siloSelect.value]?.includes(slugInput.value.trim()) ?? false;
		slugInput.setCustomValidity(takenByTour ? takenByTourMessage : '');
	};
	siloSelect.addEventListener('change', refresh);
	slugInput.addEventListener('input', refresh);
	refresh();
	return refresh;
}

export function showMessage(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

export function setBusy(button: HTMLButtonElement | null, busy: boolean, busyLabel: string) {
	if (!button) return;
	const label = button.querySelector<HTMLElement>('[data-button-label]') ?? button;
	button.dataset.label ??= label.textContent?.trim() ?? '';
	button.disabled = busy;
	label.textContent = busy ? busyLabel : button.dataset.label;
}

export function wireDialogClosing(dialog: HTMLDialogElement, closeButton: HTMLButtonElement | null) {
	closeButton?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
}

export function actionErrorMessage(error: ActionError) {
	if (!isInputError(error)) return error.message;
	const firstFieldMessage = Object.values(error.fields)
		.flat()
		.find((message): message is string => typeof message === 'string' && message.length > 0);
	return firstFieldMessage ?? 'Revisa los campos marcados.';
}
