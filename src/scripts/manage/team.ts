import { actions, isInputError } from 'astro:actions';

type StaffRole = 'admin' | 'operations' | 'editor';

const staffRoles: StaffRole[] = ['admin', 'operations', 'editor'];
const isStaffRole = (value: string): value is StaffRole => staffRoles.includes(value as StaffRole);

function showMessage(element: HTMLElement | null, message: string | null) {
	if (!element) return;
	element.textContent = message ?? '';
	element.hidden = !message;
}

function setBusy(button: HTMLButtonElement | null, busy: boolean, busyLabel: string) {
	if (!button) return;
	button.dataset.label ??= button.textContent?.trim() ?? '';
	button.disabled = busy;
	button.textContent = busy ? busyLabel : button.dataset.label;
}

function initRoleSelects(root: HTMLElement) {
	const errorMessage = root.querySelector<HTMLElement>('[data-team-error]');
	const selects = [...root.querySelectorAll<HTMLSelectElement>('[data-member-role]')];
	const statusTimers = new Map<string, number>();

	const selectsFor = (userId: string) => selects.filter((select) => select.dataset.userId === userId);
	const setStatus = (userId: string, message: string) => {
		root.querySelectorAll<HTMLElement>(`[data-member-role-status][data-user-id="${userId}"]`).forEach((status) => {
			status.textContent = message;
		});
	};

	selects.forEach((select) => {
		select.addEventListener('change', async () => {
			const userId = select.dataset.userId;
			const savedRole = select.dataset.savedRole ?? '';
			const role = select.value;
			if (!userId || !isStaffRole(role)) return;

			showMessage(errorMessage, null);
			window.clearTimeout(statusTimers.get(userId));
			selectsFor(userId).forEach((other) => {
				other.value = role;
				other.disabled = true;
			});
			setStatus(userId, 'Guardando…');

			const { error } = await actions.manage.setStaffRole({ userId, role });
			selectsFor(userId).forEach((other) => {
				other.disabled = false;
				other.value = error ? savedRole : role;
				if (!error) other.dataset.savedRole = role;
			});

			if (error) {
				setStatus(userId, '');
				showMessage(errorMessage, error.message);
				return;
			}
			setStatus(userId, 'Guardado');
			statusTimers.set(
				userId,
				window.setTimeout(() => setStatus(userId, ''), 2500),
			);
		});
	});
}

function initAddDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-member-dialog]');
	const form = dialog?.querySelector<HTMLFormElement>('[data-member-form]');
	if (!dialog || !form) return;

	const submitButton = form.querySelector<HTMLButtonElement>('[data-member-submit]');
	const formError = form.querySelector<HTMLElement>('[data-member-form-error]');
	const emailError = form.querySelector<HTMLElement>('#field-email-error');
	const emailInput = form.querySelector<HTMLInputElement>('[name="email"]');

	const clearErrors = () => {
		showMessage(formError, null);
		showMessage(emailError, null);
		emailInput?.removeAttribute('aria-invalid');
	};

	root.querySelectorAll<HTMLButtonElement>('[data-member-new]').forEach((button) => {
		button.addEventListener('click', () => {
			form.reset();
			clearErrors();
			dialog.showModal();
		});
	});
	form.querySelector<HTMLButtonElement>('[data-member-dialog-close]')?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearErrors();

		const data = new FormData(form);
		const role = String(data.get('role') ?? '');
		if (!isStaffRole(role)) {
			showMessage(formError, 'Elige un rol.');
			return;
		}

		setBusy(submitButton, true, 'Añadiendo…');
		const { error } = await actions.manage.addStaff({ email: String(data.get('email') ?? '').trim(), role });
		if (error) {
			const emailIssue = isInputError(error) ? error.fields.email?.[0] : undefined;
			if (emailIssue) {
				showMessage(emailError, emailIssue);
				emailInput?.setAttribute('aria-invalid', 'true');
				emailInput?.focus();
			} else {
				showMessage(formError, error.message);
			}
			setBusy(submitButton, false, '');
			return;
		}
		location.reload();
	});
}

function initRemoveDialog(root: HTMLElement) {
	const dialog = root.querySelector<HTMLDialogElement>('[data-remove-dialog]');
	if (!dialog) return;

	const emailLabel = dialog.querySelector<HTMLElement>('[data-remove-email]');
	const errorMessage = dialog.querySelector<HTMLElement>('[data-remove-error]');
	const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-remove-confirm]');
	let pendingUserId: string | null = null;

	root.querySelectorAll<HTMLButtonElement>('[data-member-remove]').forEach((button) => {
		button.addEventListener('click', () => {
			pendingUserId = button.dataset.userId ?? null;
			if (emailLabel) emailLabel.textContent = button.dataset.email ?? '';
			showMessage(errorMessage, null);
			dialog.showModal();
		});
	});
	dialog.querySelector<HTMLButtonElement>('[data-remove-close]')?.addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	confirmButton?.addEventListener('click', async () => {
		if (!pendingUserId) return;
		showMessage(errorMessage, null);
		setBusy(confirmButton, true, 'Quitando…');
		const { error } = await actions.manage.removeStaff({ userId: pendingUserId });
		if (error) {
			showMessage(errorMessage, error.message);
			setBusy(confirmButton, false, '');
			return;
		}
		location.reload();
	});
}

export function initTeamPage(root: HTMLElement) {
	initRoleSelects(root);
	initAddDialog(root);
	initRemoveDialog(root);
}
