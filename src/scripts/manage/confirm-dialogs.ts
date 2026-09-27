import { setBusy, showMessage, wireDialogClosing } from './form-helpers';

export type ConfirmHandler = () => Promise<string | null>;

export type AskToConfirm = (name: string, busyLabel: string, handler: ConfirmHandler) => void;

export function initConfirmDialogs(root: ParentNode): AskToConfirm {
	const handlers = new Map<string, { busyLabel: string; handler: ConfirmHandler }>();

	root.querySelectorAll<HTMLDialogElement>('[data-confirm-dialog]').forEach((dialog) => {
		const name = dialog.dataset.confirmDialog ?? '';
		const submitButton = dialog.querySelector<HTMLButtonElement>('[data-confirm-submit]');
		const errorMessage = dialog.querySelector<HTMLElement>('[data-confirm-error]');
		wireDialogClosing(dialog, dialog.querySelector<HTMLButtonElement>('[data-confirm-close]'));

		submitButton?.addEventListener('click', async () => {
			const entry = handlers.get(name);
			if (!entry) return;
			showMessage(errorMessage, null);
			setBusy(submitButton, true, entry.busyLabel);
			const failure = await entry.handler();
			setBusy(submitButton, false, '');
			if (failure) {
				showMessage(errorMessage, failure);
				return;
			}
			dialog.close();
		});
	});

	return (name, busyLabel, handler) => {
		const dialog = root.querySelector<HTMLDialogElement>(`[data-confirm-dialog="${name}"]`);
		if (!dialog) return;
		handlers.set(name, { busyLabel, handler });
		showMessage(dialog.querySelector<HTMLElement>('[data-confirm-error]'), null);
		dialog.showModal();
	};
}
