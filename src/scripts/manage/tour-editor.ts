import { actions } from 'astro:actions';
import { formatPrice } from '../../lib/format';
import {
	lowestTourPrice,
	missingForSale,
	saleChecklist,
	tourContentSchema,
	tourImagesSchema,
	tourOperationsSchema,
	type TourContent,
	type TourEditable,
	type TourImage,
	type TourOperations,
} from '../../lib/tours/tour-schema';
import { wireCharacterCounters } from '../ui/character-counter';
import { initConfirmDialogs } from './confirm-dialogs';
import { createEditorSession, type SaveResult } from './editor-session';
import { actionErrorMessage, setBusy, slugify } from './form-helpers';
import { initListEditors } from './list-editor';
import { requestSiteStatusRefresh } from './site-status';
import { googleDescription, googleTitle, priceChanges, priceSample } from './tour-editor-helpers';
import {
	clearFieldErrors,
	collectContent,
	collectOperations,
	fieldLabelOf,
	reportIssues,
	showFieldError,
	type FieldProblem,
	type ZoneOption,
} from './tour-editor-form';
import { initTourPhotos, type TourPhotos } from './tour-photos';
import { initWeekdayPickers } from './weekday-picker';

interface SavedTour {
	futureBookingsOnRemovedWeekdays: number;
}

interface PendingSave {
	content: TourContent;
	operations: TourOperations | null;
	images: TourImage[];
}

interface FeeSource {
	id: string;
	fees: { zoneId: string; fee: number }[];
}

const takenSlugMessage = 'Esa dirección ya la usa otra excursión o una guía. Elige otra.';
const busyPhotosMessage = 'Espera a que terminen de subir las fotos.';

function parseJson<Value>(value: string | undefined, fallback: Value): Value {
	try {
		return value ? (JSON.parse(value) as Value) : fallback;
	} catch {
		return fallback;
	}
}

const missingText = (count: number) => `${count === 1 ? 'Falta 1 dato' : `Faltan ${count} datos`}.`;
const pendingText = (count: number) => `${count === 1 ? '1 pendiente' : `${count} pendientes`}.`;

function focusField(target: HTMLElement) {
	target.scrollIntoView({ behavior: 'smooth', block: 'center' });
	const focusable = target.matches('input, select, textarea, button') ? target : target.querySelector<HTMLElement>('input, select, textarea, button');
	focusable?.focus({ preventScroll: true });
}

export function initTourEditor(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-tour-form]');
	const tourId = root.dataset.tourId;
	if (!form || !tourId) return;

	const status = root.dataset.tourStatus ?? 'draft';
	const isActive = status === 'active';
	const isAdmin = root.dataset.role === 'admin';
	const initial = parseJson<TourEditable | null>(root.dataset.initial, null);
	if (!initial) return;
	const zones = parseJson<ZoneOption[]>(root.dataset.zones, []);
	const zoneNames = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]));
	const takenSlugs = new Set(parseJson<string[]>(root.dataset.takenSlugs, []));
	const pathPrefixes = parseJson<Record<string, string>>(root.dataset.pathPrefixes, {});

	const saveButton = form.querySelector<HTMLButtonElement>('[data-save]');
	const publishButton = form.querySelector<HTMLButtonElement>('[data-publish]');
	const previewLink = form.querySelector<HTMLAnchorElement>('[data-preview-link]');
	const saveState = form.querySelector<HTMLElement>('[data-save-state]');
	const errorBox = form.querySelector<HTMLElement>('[data-editor-error]');
	const errorText = form.querySelector<HTMLElement>('[data-editor-error-text]');
	const errorLinks = form.querySelector<HTMLElement>('[data-editor-error-links]');
	const noticeBox = form.querySelector<HTMLElement>('[data-editor-notice]');
	const noticeText = form.querySelector<HTMLElement>('[data-editor-notice-text]');
	const updatedLabel = form.querySelector<HTMLElement>('[data-updated-label]');
	const askToConfirm = initConfirmDialogs(root);

	initListEditors(root);
	initWeekdayPickers(root);
	wireCharacterCounters(form);

	const photosRoot = form.querySelector<HTMLElement>('[data-photos]');
	const photos: TourPhotos | null = photosRoot ? initTourPhotos(photosRoot, tourId) : null;

	let savedOperations: TourOperations = initial.operations;
	let pending: PendingSave | null = null;

	const readOperations = () => (isAdmin ? collectOperations(form, zones) : savedOperations);
	const readImages = () => photos?.read() ?? initial.images;
	const readEditable = (): TourEditable => ({ content: collectContent(form), operations: readOperations(), images: readImages() });

	const hideError = () => {
		if (errorBox) errorBox.hidden = true;
		errorLinks?.replaceChildren();
	};

	const showError = (message: string, problems: FieldProblem[] = []) => {
		if (!errorBox || !errorText) return;
		errorText.textContent = message;
		errorLinks?.replaceChildren(
			...problems.map((problem) => {
				const item = document.createElement('li');
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'cursor-pointer rounded text-left font-medium underline decoration-error/40 underline-offset-4 outline-none hover:decoration-error focus-visible:ring-2 focus-visible:ring-accent';
				button.textContent = problem.label;
				button.addEventListener('click', () => focusField(problem.target));
				item.append(button);
				return item;
			}),
		);
		errorBox.hidden = false;
	};

	const showNotice = (message: string | null) => {
		if (!noticeBox || !noticeText) return;
		noticeText.textContent = message ?? '';
		noticeBox.hidden = !message;
	};

	const slugInput = form.querySelector<HTMLInputElement>('[data-slug-input]');
	const destinationSelect = form.querySelector<HTMLSelectElement>('[data-destination-select]');
	const slugPath = form.querySelector<HTMLElement>('[data-slug-path]');
	const slugIsTaken = () => Boolean(slugInput && !slugInput.readOnly && takenSlugs.has(slugInput.value.trim()));

	const refreshSlug = () => {
		if (!slugInput) return;
		const prefix = pathPrefixes[destinationSelect?.value ?? ''] ?? '/';
		if (slugPath) slugPath.textContent = `${prefix}${slugInput.value.trim()}`;
		slugInput.setCustomValidity(slugIsTaken() ? takenSlugMessage : '');
	};
	slugInput?.addEventListener('input', refreshSlug);
	slugInput?.addEventListener('change', () => {
		if (slugInput.readOnly) return;
		slugInput.value = slugify(slugInput.value);
		refreshSlug();
	});
	destinationSelect?.addEventListener('change', refreshSlug);

	const pricingRadios = Array.from(form.querySelectorAll<HTMLInputElement>('[data-pricing-mode]'));
	const childToggle = form.querySelector<HTMLInputElement>('[data-child-toggle]');
	const refreshPricing = () => {
		const perGroup = pricingRadios.find((radio) => radio.checked)?.value === 'per_group';
		form.querySelectorAll<HTMLElement>('[data-group-only]').forEach((element) => (element.hidden = !perGroup));
		form.querySelectorAll<HTMLElement>('[data-person-only]').forEach((element) => (element.hidden = perGroup));
		const baseLabel = form.querySelector<HTMLLabelElement>('label[for="field-basePrice"]');
		const baseLabelText = Array.from(baseLabel?.childNodes ?? []).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
		if (baseLabelText) baseLabelText.textContent = perGroup ? 'Precio del grupo' : 'Precio del adulto';
		const childFields = form.querySelector<HTMLElement>('[data-child-fields]');
		if (childFields) childFields.hidden = !childToggle?.checked;
	};
	pricingRadios.forEach((radio) => radio.addEventListener('change', refreshPricing));
	childToggle?.addEventListener('change', refreshPricing);

	const pregnancyMonths = form.querySelector<HTMLElement>('[data-pregnancy-months]');
	form.querySelectorAll<HTMLInputElement>('[data-pregnancy]').forEach((radio) =>
		radio.addEventListener('change', () => {
			if (pregnancyMonths && radio.checked) pregnancyMonths.hidden = radio.value !== 'limited';
		}),
	);

	form.querySelectorAll<HTMLInputElement>('[data-serves-zone]').forEach((checkbox) => {
		const feeInput = checkbox.closest('[data-pickup-zone]')?.querySelector<HTMLInputElement>('[data-zone-fee]');
		checkbox.addEventListener('change', () => {
			if (!feeInput) return;
			feeInput.disabled = !checkbox.checked;
			if (checkbox.checked && feeInput.value.trim() === '') feeInput.value = '0';
			if (checkbox.checked) feeInput.focus();
		});
	});

	const copyFees = form.querySelector<HTMLSelectElement>('[data-copy-fees]');
	const feeSources = parseJson<FeeSource[]>(form.querySelector<HTMLElement>('[data-fee-sources]')?.dataset.feeSources, []);
	copyFees?.addEventListener('change', () => {
		const source = feeSources.find((candidate) => candidate.id === copyFees.value);
		copyFees.value = '';
		if (!source) return;
		const fees = new Map(source.fees.map((fee) => [fee.zoneId, fee.fee]));
		form.querySelectorAll<HTMLElement>('[data-pickup-zone]').forEach((row) => {
			const fee = fees.get(row.dataset.pickupZone ?? '');
			const checkbox = row.querySelector<HTMLInputElement>('[data-serves-zone]');
			const feeInput = row.querySelector<HTMLInputElement>('[data-zone-fee]');
			if (!checkbox || !feeInput) return;
			checkbox.checked = fee !== undefined;
			feeInput.disabled = fee === undefined;
			feeInput.value = fee === undefined ? '' : String(fee);
		});
		form.querySelector<HTMLElement>('#field-pickupFees')?.dispatchEvent(new Event('input', { bubbles: true }));
	});

	const requiredSummary = form.querySelector<HTMLElement>('[data-checklist-summary="required"]');
	const recommendedSummary = form.querySelector<HTMLElement>('[data-checklist-summary="recommended"]');
	const refreshChecklist = (editable: TourEditable) => {
		const checklist = saleChecklist(editable);
		[...checklist.required, ...checklist.recommended].forEach((item) => {
			const row = form.querySelector<HTMLElement>(`[data-check-item="${item.id}"]`);
			if (!row) return;
			row.toggleAttribute('data-done', item.done);
			const done = row.querySelector<HTMLElement>('[data-check-done]');
			const todo = row.querySelector<HTMLElement>('[data-check-todo]');
			const link = row.querySelector<HTMLElement>('[data-check-link]');
			const state = row.querySelector<HTMLElement>('[data-check-state]');
			if (done) done.hidden = !item.done;
			if (todo) todo.hidden = item.done;
			link?.classList.toggle('text-muted', item.done);
			link?.classList.toggle('text-primary', !item.done);
			if (state) state.textContent = item.done ? ', hecho' : ', pendiente';
		});
		const missing = checklist.required.filter((item) => !item.done).length;
		const pending = checklist.recommended.filter((item) => !item.done).length;
		if (requiredSummary) requiredSummary.textContent = missing === 0 ? (requiredSummary.dataset.readyText ?? '') : missingText(missing);
		if (recommendedSummary) recommendedSummary.textContent = pending === 0 ? (recommendedSummary.dataset.readyText ?? '') : pendingText(pending);
	};

	const googlePreview = form.querySelector<HTMLElement>('[data-google-preview]');
	const refreshGoogle = (content: TourContent) => {
		if (!googlePreview) return;
		const title = googleTitle(content.name, googlePreview.dataset.titleSuffix ?? '');
		const description = googleDescription(content.summary, googlePreview.dataset.descriptionSuffix ?? '', Number(googlePreview.dataset.descriptionLimit) || 160);
		const setText = (selector: string, text: string) => {
			const element = form.querySelector<HTMLElement>(selector);
			if (element) element.textContent = text;
		};
		setText('[data-google-title]', title);
		setText('[data-google-description]', description);
		setText('[data-google-title-count]', String(title.length));
		setText('[data-google-description-count]', String(description.length));
		setText('[data-google-url]', `${googlePreview.dataset.host ?? ''}${slugPath?.textContent ?? ''}`);
	};

	const priceSampleElement = form.querySelector<HTMLElement>('[data-price-sample]');
	const refreshSamples = (editable: TourEditable) => {
		if (priceSampleElement) priceSampleElement.textContent = priceSample(editable.operations);
		const setText = (selector: string, text: string) => {
			const element = form.querySelector<HTMLElement>(selector);
			if (element) element.textContent = text;
		};
		setText('[data-sample-name]', editable.content.shortName || editable.content.name);
		setText('[data-sample-best-for]', editable.content.bestFor);
		setText('[data-sample-includes]', editable.content.includesSummary);
		const lowest = lowestTourPrice(editable.operations);
		setText('[data-sample-price]', lowest !== null && Number.isFinite(lowest) ? formatPrice(lowest) : '');
	};

	const refreshDerived = () => {
		const editable = readEditable();
		refreshChecklist(editable);
		refreshGoogle(editable.content);
		refreshSamples(editable);
	};

	form.addEventListener('input', (event) => {
		const target = event.target;
		if (target instanceof HTMLElement && target.getAttribute('aria-invalid') === 'true') target.removeAttribute('aria-invalid');
	});

	const confirmPriceChanges = (changes: string[]) =>
		new Promise<boolean>((resolve) => {
			const dialog = root.querySelector<HTMLDialogElement>('[data-confirm-dialog="price-changes"]');
			const changeList = dialog?.querySelector<HTMLElement>('[data-price-change-list]');
			if (!dialog || !changeList) {
				resolve(true);
				return;
			}
			changeList.replaceChildren(
				...changes.map((change) => {
					const item = document.createElement('li');
					item.textContent = change;
					return item;
				}),
			);
			let confirmed = false;
			dialog.addEventListener('close', () => resolve(confirmed), { once: true });
			askToConfirm('price-changes', 'Guardando…', async () => {
				confirmed = true;
				return null;
			});
		});

	const validate = async () => {
		clearFieldErrors(form);
		hideError();
		pending = null;

		if (photos?.isBusy()) {
			showError(busyPhotosMessage);
			return false;
		}

		const content = tourContentSchema.safeParse(collectContent(form));
		const operations = isAdmin ? tourOperationsSchema.safeParse(collectOperations(form, zones)) : null;
		const images = tourImagesSchema.safeParse(readImages());

		const problems: FieldProblem[] = [];
		if (!content.success) problems.push(...reportIssues(form, 'content', content.error.issues, zones));
		if (operations && !operations.success) problems.push(...reportIssues(form, 'operations', operations.error.issues, zones));
		if (!images.success) problems.push(...reportIssues(form, 'images', images.error.issues, zones));
		if (slugInput && slugIsTaken()) {
			showFieldError(slugInput, takenSlugMessage);
			problems.push({ target: slugInput, label: fieldLabelOf(slugInput) });
		}

		if (problems.length > 0 || !content.success || (operations && !operations.success) || !images.success) {
			const first = problems[0];
			if (first) focusField(first.target);
			showError(problems.length === 1 ? 'Revisa este campo:' : `Revisa estos ${problems.length} campos:`, problems);
			return false;
		}

		const nextOperations = operations?.success ? operations.data : null;
		const next: TourEditable = { content: content.data, operations: nextOperations ?? savedOperations, images: images.data };
		if (isActive) {
			const missing = missingForSale(next).required;
			if (missing.length > 0) {
				const sectionProblems = missing.flatMap((item) => {
					const section = form.querySelector<HTMLElement>(`[data-editor-section="${item.section}"]`);
					return section ? [{ target: section, label: item.label }] : [];
				});
				if (sectionProblems[0]) focusField(sectionProblems[0].target);
				showError('Está a la venta y tiene que seguir completa. Falta:', sectionProblems);
				return false;
			}
		}

		if (isActive && nextOperations) {
			const changes = priceChanges(savedOperations, nextOperations, zoneNames);
			if (changes.length > 0 && !(await confirmPriceChanges(changes))) return false;
		}

		pending = { content: content.data, operations: nextOperations, images: images.data };
		return true;
	};

	const persist = async (): Promise<SaveResult<SavedTour>> => {
		if (!pending) return { ok: false };
		showNotice(null);
		const { data, error } = await actions.tours.save({ id: tourId, ...pending });
		if (error) {
			showError(actionErrorMessage(error));
			return { ok: false };
		}
		return { ok: true, data };
	};

	const session = createEditorSession({
		form,
		validate,
		persist,
		onSaved: (data) => {
			if (pending?.operations) savedOperations = pending.operations;
			if (data.futureBookingsOnRemovedWeekdays > 0) {
				const count = data.futureBookingsOnRemovedWeekdays;
				showNotice(
					count === 1
						? 'Hay 1 reserva futura en un día que ya no sale. Revísala en Salidas.'
						: `Hay ${count} reservas futuras en días que ya no salen. Revísalas en Salidas.`,
				);
			}
			if (updatedLabel) updatedLabel.textContent = 'Actualizada ahora mismo por ti';
			if (isActive) requestSiteStatusRefresh();
		},
		onChange: refreshDerived,
		saveButton,
		saveState,
		previewLink,
		savedMessage: isActive ? 'Guardado, la web se actualiza en unos minutos' : 'Guardado',
		untrackedFields: '[data-photo-input], [data-copy-fees], [data-most-booked]',
	});
	const { leaveTo } = session;

	publishButton?.addEventListener('click', async () => {
		if (!(await session.saveIfDirty())) return;
		hideError();
		setBusy(publishButton, true, 'Poniendo a la venta…');
		const { error } = await actions.tours.publish({ id: tourId });
		if (error) {
			showError(actionErrorMessage(error));
			setBusy(publishButton, false, '');
			return;
		}
		leaveTo(`${window.location.pathname}?done=published`);
	});

	form.querySelector<HTMLButtonElement>('[data-archive]')?.addEventListener('click', async () => {
		if (!(await session.saveIfDirty())) return;
		askToConfirm('archive', 'Archivando…', async () => {
			const { error } = await actions.tours.archive({ id: tourId });
			if (error) return actionErrorMessage(error);
			leaveTo(`${window.location.pathname}?done=archived`);
			return null;
		});
	});

	const restoreButton = form.querySelector<HTMLButtonElement>('[data-restore]');
	restoreButton?.addEventListener('click', async () => {
		if (!(await session.saveIfDirty())) return;
		hideError();
		setBusy(restoreButton, true, 'Restaurando…');
		const { error } = await actions.tours.restore({ id: tourId });
		if (error) {
			showError(actionErrorMessage(error));
			setBusy(restoreButton, false, '');
			return;
		}
		leaveTo(`${window.location.pathname}?done=restored`);
	});

	form.querySelector<HTMLButtonElement>('[data-remove]')?.addEventListener('click', () => {
		askToConfirm('remove', 'Borrando…', async () => {
			const { error } = await actions.tours.remove({ id: tourId });
			if (error) return actionErrorMessage(error);
			leaveTo('/manage/tours?status=draft');
			return null;
		});
	});

	refreshSlug();
	refreshPricing();
	refreshDerived();

	if (new URL(window.location.href).searchParams.has('done')) window.history.replaceState(null, '', window.location.pathname);
}
