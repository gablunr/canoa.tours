import { actions, isInputError } from 'astro:actions';
import { setAvatarImage } from '../ui/avatar';
import { shrinkPhoto } from '../ui/shrink-photo';

const maxUploadBytes = 4 * 1024 * 1024;
const uploadShortEdge = 1024;

type AvatarOutcome = { avatarUrl: string } | { errorMessage: string };

async function uploadAvatar(file: File): Promise<AvatarOutcome> {
	const upload = await shrinkPhoto(file, { shortEdge: uploadShortEdge });
	if (upload.size > maxUploadBytes) return { errorMessage: 'La foto puede pesar como máximo 4 MB.' };

	const formData = new FormData();
	formData.append('photo', upload);
	const { data, error } = await actions.account.updateAvatar(formData);
	if (!error) return { avatarUrl: data.avatarUrl };

	const firstIssue = isInputError(error) ? Object.values(error.fields).flat()[0] : undefined;
	return { errorMessage: firstIssue ?? error.message };
}

export function initAvatarPicker(root: HTMLElement) {
	const avatar = root.querySelector<HTMLElement>('[data-avatar]');
	const input = root.querySelector<HTMLInputElement>('[data-avatar-input]');
	const chooseButton = root.querySelector<HTMLButtonElement>('[data-avatar-choose]');
	const errorMessage = root.querySelector<HTMLElement>('[data-avatar-error]');
	if (!avatar || !input || !chooseButton) return;

	let idleLabel = chooseButton.getAttribute('aria-label') ?? '';

	const showError = (message: string | null) => {
		if (!errorMessage) return;
		errorMessage.textContent = message ?? '';
		errorMessage.hidden = !message;
	};

	const setBusy = (busy: boolean) => {
		chooseButton.disabled = busy;
		chooseButton.toggleAttribute('aria-busy', busy);
		chooseButton.setAttribute('aria-label', busy ? 'Subiendo la foto…' : idleLabel);
		avatar.toggleAttribute('data-busy', busy);
	};

	chooseButton.addEventListener('click', () => input.click());

	input.addEventListener('change', async () => {
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		showError(null);
		setBusy(true);
		const outcome = await uploadAvatar(file);

		if ('avatarUrl' in outcome) {
			setAvatarImage(avatar, outcome.avatarUrl);
			idleLabel = 'Cambiar foto de perfil';
		}
		setBusy(false);
		showError('errorMessage' in outcome ? outcome.errorMessage : null);
	});
}
