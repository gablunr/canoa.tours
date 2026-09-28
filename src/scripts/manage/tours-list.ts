import { actions } from 'astro:actions';
import { actionErrorMessage, setBusy, showMessage, slugify, wireDialogClosing } from './form-helpers';
import { normalizeSearchText } from '../../lib/search-text';

interface CopySource {
	id: string;
	name: string;
}

interface ListView {
	startSorting: (group: HTMLElement) => void;
	stopSorting: () => void;
}

const takenByTourMessage = 'Esa dirección ya la usa otra excursión. Elige otra.';
const takenByGuideMessage = 'Esa dirección ya la usa una guía publicada. Elige otra.';

function readJson<Value>(value: string | undefined, fallback: Value): Value {
	try {
		return value ? (JSON.parse(value) as Value) : fallback;
	} catch {
		return fallback;
	}
}

function initListView(root: HTMLElement): ListView {
	const input = root.querySelector<HTMLInputElement>('[data-tour-search]');
	const results = root.querySelector<HTMLElement>('[data-tour-results]');
	const resultsText = root.querySelector<HTMLElement>('[data-tour-results-text]');
	const emptyPanel = root.querySelector<HTMLElement>('[data-tour-search-empty]');
	const emptyText = root.querySelector<HTMLElement>('[data-tour-search-empty-text]');
	const listPanel = root.querySelector<HTMLElement>('[data-tour-groups]');
	const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-destination-filter]')];
	const destinationSelect = root.querySelector<HTMLSelectElement>('[data-destination-select]');
	const groups = [...root.querySelectorAll<HTMLElement>('[data-tour-group]')];

	const params = new URLSearchParams(window.location.search);
	const knownDestinations = new Set(filterButtons.map((button) => button.dataset.destinationFilter ?? ''));
	let destination = knownDestinations.has(params.get('destino') ?? '') ? (params.get('destino') ?? '') : '';
	let sortingGroup: HTMLElement | null = null;

	const syncUrl = () => {
		const url = new URL(window.location.href);
		if (destination) url.searchParams.set('destino', destination);
		else url.searchParams.delete('destino');
		window.history.replaceState(window.history.state, '', url);
	};

	const apply = () => {
		const typed = input?.value.trim() ?? '';
		const term = sortingGroup ? '' : normalizeSearchText(typed);
		let total = 0;
		let matchCount = 0;

		groups.forEach((group) => {
			const inDestination = sortingGroup ? group === sortingGroup : !destination || group.dataset.destinationId === destination;
			let visibleInGroup = 0;
			group.querySelectorAll<HTMLElement>('[data-tour-row]').forEach((row) => {
				total += 1;
				const visible = inDestination && (!term || (row.dataset.search ?? '').includes(term));
				row.hidden = !visible;
				if (visible) visibleInGroup += 1;
			});
			group.hidden = visibleInGroup === 0;
			matchCount += visibleInGroup;
		});

		filterButtons.forEach((button) => {
			button.setAttribute('aria-pressed', String((button.dataset.destinationFilter ?? '') === destination));
			button.disabled = sortingGroup !== null;
		});
		if (destinationSelect) {
			destinationSelect.value = destination;
			destinationSelect.disabled = sortingGroup !== null;
		}

		if (listPanel) listPanel.hidden = matchCount === 0;
		if (results) results.hidden = !term;
		if (resultsText) resultsText.textContent = `${matchCount} ${matchCount === 1 ? 'resultado' : 'resultados'} para «${typed}».`;
		if (emptyText) emptyText.textContent = `Ninguna excursión coincide con «${typed}».`;
		if (emptyPanel) emptyPanel.hidden = !term || matchCount > 0 || total === 0;
		if (input) input.disabled = sortingGroup !== null;

		if (!sortingGroup) syncUrl();
	};

	const clear = () => {
		if (!input) return;
		input.value = '';
		apply();
	};

	input?.addEventListener('input', apply);
	root.querySelectorAll<HTMLButtonElement>('[data-tour-search-clear]').forEach((button) =>
		button.addEventListener('click', () => {
			clear();
			input?.focus();
		}),
	);
	filterButtons.forEach((button) =>
		button.addEventListener('click', () => {
			destination = button.dataset.destinationFilter ?? '';
			apply();
		}),
	);
	destinationSelect?.addEventListener('change', () => {
		destination = destinationSelect.value;
		apply();
	});

	apply();

	return {
		startSorting: (group) => {
			if (input) input.value = '';
			sortingGroup = group;
			apply();
		},
		stopSorting: () => {
			sortingGroup = null;
			apply();
		},
	};
}

function announcePosition(status: HTMLElement | null, index: number) {
	if (!status) return;
	status.textContent = '';
	window.setTimeout(() => {
		status.textContent = `Movida a la posición ${index + 1}`;
	}, 100);
}

function initOrdering(group: HTMLElement, view: ListView) {
	const list = group.querySelector<HTMLElement>('[data-tour-rows]');
	const startButton = group.querySelector<HTMLButtonElement>('[data-sort-start]');
	const cancelButton = group.querySelector<HTMLButtonElement>('[data-sort-cancel]');
	const saveButton = group.querySelector<HTMLButtonElement>('[data-sort-save]');
	const errorMessage = group.querySelector<HTMLElement>('[data-sort-error]');
	const destinationId = group.dataset.destinationId;
	if (!list || !startButton || !cancelButton || !saveButton || !destinationId) return;

	let originalOrder: HTMLElement[] = [];

	const rows = () => [...list.querySelectorAll<HTMLElement>(':scope > [data-tour-row]')];
	const orderChanged = () => rows().some((row, index) => row !== originalOrder[index]);

	const refresh = () => {
		const current = rows();
		current.forEach((row, index) => {
			const up = row.querySelector<HTMLButtonElement>('[data-move="up"]');
			const down = row.querySelector<HTMLButtonElement>('[data-move="down"]');
			if (up) up.disabled = index === 0;
			if (down) down.disabled = index === current.length - 1;
		});
		saveButton.disabled = !orderChanged();
	};

	const setSorting = (sorting: boolean) => {
		group.toggleAttribute('data-sorting', sorting);
		if (sorting) view.startSorting(group);
		else view.stopSorting();
		showMessage(errorMessage, null);
	};

	startButton.addEventListener('click', () => {
		setSorting(true);
		originalOrder = rows();
		refresh();
		rows()[0]?.querySelector<HTMLButtonElement>('[data-move="down"]')?.focus();
	});

	cancelButton.addEventListener('click', () => {
		originalOrder.forEach((row) => list.append(row));
		setSorting(false);
		startButton.focus();
	});

	list.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-move]');
		const row = button?.closest<HTMLElement>('[data-tour-row]');
		if (!button || !row || !group.hasAttribute('data-sorting')) return;

		if (button.dataset.move === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
		if (button.dataset.move === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
		refresh();
		announcePosition(group.querySelector<HTMLElement>('[data-sort-status]'), Array.from(list.children).indexOf(row));

		const fallback = row.querySelector<HTMLButtonElement>(`[data-move="${button.dataset.move === 'up' ? 'down' : 'up'}"]`);
		(button.disabled ? fallback : button)?.focus();
	});

	saveButton.addEventListener('click', async () => {
		showMessage(errorMessage, null);
		setBusy(saveButton, true, 'Guardando…');
		cancelButton.disabled = true;
		const { error } = await actions.tours.reorder({
			destinationId,
			productIds: rows().map((row) => row.dataset.tourId ?? ''),
		});
		if (error) {
			showMessage(errorMessage, actionErrorMessage(error));
			setBusy(saveButton, false, '');
			cancelButton.disabled = false;
			return;
		}
		window.location.reload();
	});
}

function initNewTourDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-new-tour-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-new-tour-form]');
	const destinationSelect = form?.querySelector<HTMLSelectElement>('[data-destination-select]');
	const nameInput = form?.querySelector<HTMLInputElement>('[data-name-input]');
	const shortNameInput = form?.querySelector<HTMLInputElement>('[data-short-name-input]');
	const slugInput = form?.querySelector<HTMLInputElement>('[data-slug-input]');
	const copySelect = form?.querySelector<HTMLSelectElement>('[data-copy-select]');
	if (!dialog || !form || !destinationSelect || !nameInput || !shortNameInput || !slugInput || !copySelect) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-new-tour-submit]');
	const errorMessage = form.querySelector<HTMLElement>('[data-new-tour-error]');
	const pathHint = slugInput.id ? document.getElementById(`${slugInput.id}-hint`) : null;
	const blankValue = copySelect.dataset.blankValue ?? 'blank';

	const prefixes = readJson<Record<string, string>>(root.dataset.pathPrefixes, {});
	const copySources = readJson<Record<string, CopySource[]>>(root.dataset.copySources, {});
	const tourSlugs = new Set(readJson<string[]>(root.dataset.tourSlugs, []));
	const guideSlugs = new Set(readJson<string[]>(root.dataset.guideSlugs, []));
	let slugEditedByHand = false;

	const refreshSlug = () => {
		const slug = slugInput.value.trim();
		if (pathHint) pathHint.textContent = `canoa.tours${prefixes[destinationSelect.value] ?? '/'}${slug}`;
		const message = tourSlugs.has(slug) ? takenByTourMessage : guideSlugs.has(slug) ? takenByGuideMessage : '';
		slugInput.setCustomValidity(message);
	};

	const refreshCopySources = () => {
		const sources = copySources[destinationSelect.value] ?? [];
		copySelect.replaceChildren(...sources.map((source) => new Option(`Copia de ${source.name}`, source.id)), new Option('En blanco', blankValue));
		copySelect.value = sources[0]?.id ?? blankValue;
	};

	destinationSelect.addEventListener('change', () => {
		refreshCopySources();
		refreshSlug();
	});
	shortNameInput.addEventListener('input', () => {
		if (slugEditedByHand) return;
		slugInput.value = slugify(shortNameInput.value);
		refreshSlug();
	});
	slugInput.addEventListener('input', () => {
		slugEditedByHand = slugInput.value.trim().length > 0;
		refreshSlug();
	});
	slugInput.addEventListener('change', () => {
		slugInput.value = slugify(slugInput.value);
		refreshSlug();
	});

	wireDialogClosing(dialog, form.querySelector<HTMLButtonElement>('[data-new-tour-close]'));

	root.querySelectorAll<HTMLButtonElement>('[data-new-tour-open]').forEach((button) => {
		button.addEventListener('click', () => {
			showMessage(errorMessage, null);
			refreshSlug();
			dialog.showModal();
			nameInput.focus();
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		refreshSlug();
		if (!form.reportValidity()) return;

		showMessage(errorMessage, null);
		setBusy(submitButton, true, 'Creando…');
		const { data, error } = await actions.tours.create({
			destinationId: destinationSelect.value,
			name: nameInput.value.trim(),
			shortName: shortNameInput.value.trim(),
			slug: slugInput.value.trim(),
			copyFrom: copySelect.value === blankValue ? null : copySelect.value,
		});
		if (error) {
			showMessage(errorMessage, actionErrorMessage(error));
			setBusy(submitButton, false, '');
			return;
		}
		window.location.assign(`/manage/tours/${data.tourId}`);
	});
}

export function initToursPage(root: HTMLElement) {
	const view = initListView(root);
	root.querySelectorAll<HTMLElement>('[data-tour-group]').forEach((group) => initOrdering(group, view));
	initNewTourDialog(root);
}
