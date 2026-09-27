import { actions } from 'astro:actions';

type ModerationStatus = 'published' | 'rejected';

const isModerationStatus = (value: string | undefined): value is ModerationStatus => value === 'published' || value === 'rejected';

function showMessage(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

function setBusy(button: HTMLButtonElement | null, busy: boolean, busyLabel: string) {
	if (!button) return;
	const label = button.querySelector<HTMLElement>('[data-button-label]') ?? button;
	button.dataset.label ??= label.textContent?.trim() ?? '';
	button.disabled = busy;
	label.textContent = busy ? busyLabel : button.dataset.label;
}

function wireDialogClosing(dialog: HTMLDialogElement, closeButton: HTMLButtonElement | null) {
	closeButton?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
}

function initModerationButtons(root: HTMLElement) {
	root.querySelectorAll<HTMLButtonElement>('[data-moderate]').forEach((button) => {
		button.addEventListener('click', async () => {
			const card = button.closest<HTMLElement>('[data-review]');
			const reviewId = card?.dataset.reviewId;
			const status = button.dataset.moderate;
			if (!card || !reviewId || !isModerationStatus(status)) return;

			const errorMessage = card.querySelector<HTMLElement>('[data-review-error]');
			showMessage(errorMessage, null);
			setBusy(button, true, status === 'published' ? 'Publicando…' : 'Guardando…');

			const { error } = await actions.manage.moderateReview({ reviewId, status });
			if (error) {
				showMessage(errorMessage, error.message);
				setBusy(button, false, '');
				return;
			}
			window.location.reload();
		});
	});
}

function initReplyDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-reply-dialog]');
	if (!dialog) return;

	const form = dialog.querySelector<HTMLFormElement>('[data-reply-form]');
	const textarea = dialog.querySelector<HTMLTextAreaElement>('[data-reply-text]');
	const hint = dialog.querySelector<HTMLElement>('[data-reply-hint]');
	const submitButton = dialog.querySelector<HTMLButtonElement>('[data-reply-submit]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-reply-error]');
	let activeReviewId: string | null = null;
	let targetStatus: ModerationStatus = 'published';

	wireDialogClosing(dialog, dialog.querySelector<HTMLButtonElement>('[data-reply-close]'));

	root.querySelectorAll<HTMLButtonElement>('[data-reply-open]').forEach((button) => {
		button.addEventListener('click', () => {
			const card = button.closest<HTMLElement>('[data-review]');
			const target = button.dataset.replyTarget;
			if (!card?.dataset.reviewId || !isModerationStatus(target) || !textarea || !submitButton) return;

			activeReviewId = card.dataset.reviewId;
			targetStatus = target;
			const isPending = card.dataset.reviewStatus === 'pending';
			textarea.value = card.querySelector<HTMLElement>('[data-review-reply]')?.textContent?.trim() ?? '';
			submitButton.textContent = isPending ? 'Publicar con respuesta' : 'Guardar respuesta';
			submitButton.dataset.label = submitButton.textContent;
			if (hint) {
				hint.textContent = isPending
					? 'La opinión se publica junto con tu respuesta.'
					: targetStatus === 'published'
						? 'La respuesta aparece bajo la opinión en la web.'
						: 'La opinión sigue rechazada.';
			}
			showMessage(errorMessage, null);
			dialog.showModal();
			textarea.focus();
		});
	});

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!activeReviewId || !textarea) return;

		showMessage(errorMessage, null);
		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.manage.moderateReview({ reviewId: activeReviewId, status: targetStatus, reply: textarea.value.trim() });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(submitButton, false, '');
			return;
		}
		window.location.reload();
	});
}

function initManualReviewDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-manual-dialog]');
	const openButton = root.querySelector<HTMLButtonElement>('[data-manual-open]');
	if (!dialog || !openButton) return;

	const form = dialog.querySelector<HTMLFormElement>('[data-manual-form]');
	const submitButton = dialog.querySelector<HTMLButtonElement>('[data-manual-submit]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-manual-error]');

	wireDialogClosing(dialog, dialog.querySelector<HTMLButtonElement>('[data-manual-close]'));

	openButton.addEventListener('click', () => {
		showMessage(errorMessage, null);
		dialog.showModal();
	});

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const data = new FormData(form);
		const publish = data.get('publish') !== null;
		const title = String(data.get('title') ?? '').trim();

		showMessage(errorMessage, null);
		setBusy(submitButton, true, 'Guardando…');
		const { error } = await actions.manage.createManualReview({
			productKey: String(data.get('productKey') ?? ''),
			authorName: String(data.get('authorName') ?? ''),
			rating: Number(data.get('rating')),
			title: title || undefined,
			body: String(data.get('body') ?? ''),
			publish,
		});
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(submitButton, false, '');
			return;
		}
		window.location.assign(`/manage/reviews?status=${publish ? 'published' : 'pending'}`);
	});
}

function initBulkPublish(root: HTMLElement) {
	const bulkButton = root.querySelector<HTMLButtonElement>('[data-bulk-publish]');
	const dialog = root.querySelector<HTMLDialogElement>('[data-bulk-dialog]');
	if (!bulkButton || !dialog) return;
	const publishButton: HTMLButtonElement = bulkButton;

	const checkboxes = [...root.querySelectorAll<HTMLInputElement>('[data-review-select]')];
	const selectAll = root.querySelector<HTMLInputElement>('[data-select-all]');
	const publishLabel = publishButton.querySelector<HTMLElement>('[data-bulk-label]');
	const title = dialog.querySelector<HTMLElement>('[data-bulk-title]');
	const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-bulk-confirm]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-bulk-error]');

	const selectedIds = () => checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
	const opinionsLabel = (count: number) => (count === 1 ? '1 opinión' : `${count} opiniones`);

	function refresh() {
		const count = selectedIds().length;
		publishButton.disabled = count === 0;
		if (publishLabel) publishLabel.textContent = count === 0 ? 'Publicar seleccionadas' : `Publicar ${count}`;
		if (selectAll) {
			selectAll.checked = count > 0 && count === checkboxes.length;
			selectAll.indeterminate = count > 0 && count < checkboxes.length;
		}
	}

	checkboxes.forEach((checkbox) => checkbox.addEventListener('change', refresh));
	selectAll?.addEventListener('change', () => {
		checkboxes.forEach((checkbox) => (checkbox.checked = selectAll.checked));
		refresh();
	});

	wireDialogClosing(dialog, dialog.querySelector<HTMLButtonElement>('[data-bulk-close]'));

	publishButton.addEventListener('click', () => {
		const count = selectedIds().length;
		if (count === 0) return;
		if (title) title.textContent = `¿Publicar ${opinionsLabel(count)}?`;
		showMessage(errorMessage, null);
		dialog.showModal();
	});

	confirmButton?.addEventListener('click', async () => {
		const reviewIds = selectedIds();
		if (reviewIds.length === 0) return;
		showMessage(errorMessage, null);
		setBusy(confirmButton, true, 'Publicando…');
		const { error } = await actions.manage.publishReviews({ reviewIds });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(confirmButton, false, '');
			return;
		}
		window.location.reload();
	});

	refresh();
}

export function initReviewModeration(root: HTMLElement) {
	initModerationButtons(root);
	initReplyDialog(root);
	initManualReviewDialog(root);
	initBulkPublish(root);
}
