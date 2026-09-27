import { setBusy } from './form-helpers';

export type SaveResult<Saved> = { ok: true; data: Saved } | { ok: false };

export interface EditorSessionOptions<Saved> {
	form: HTMLFormElement;
	persist: () => Promise<SaveResult<Saved>>;
	validate?: () => boolean | Promise<boolean>;
	onSaved?: (data: Saved) => void;
	onChange?: () => void;
	saveButton?: HTMLButtonElement | null;
	saveState?: HTMLElement | null;
	previewLink?: HTMLAnchorElement | null;
	savedMessage?: string | (() => string);
	untrackedFields?: string;
}

export interface EditorSession {
	save: () => Promise<boolean>;
	saveIfDirty: () => Promise<boolean>;
	markDirty: () => void;
	isDirty: () => boolean;
	leaveTo: (href: string) => void;
}

const unsavedText = 'Cambios sin guardar';
const savingText = 'Guardando…';
const defaultSavedText = 'Guardado';

export function createEditorSession<Saved>({
	form,
	persist,
	validate,
	onSaved,
	onChange,
	saveButton = null,
	saveState = null,
	previewLink = null,
	savedMessage = defaultSavedText,
	untrackedFields,
}: EditorSessionOptions<Saved>): EditorSession {
	let revision = 0;
	let savedRevision = 0;
	let leaving = false;

	const isDirty = () => revision !== savedRevision;
	const setSaveState = (text: string) => {
		if (saveState) saveState.textContent = text;
	};
	const savedText = () => (typeof savedMessage === 'function' ? savedMessage() : savedMessage);

	const markDirty = () => {
		revision += 1;
		setSaveState(unsavedText);
		onChange?.();
	};

	const save = async () => {
		if (validate && !(await validate())) return false;

		const revisionAtStart = revision;
		setBusy(saveButton, true, savingText);
		setSaveState(savingText);
		const result = await persist();
		setBusy(saveButton, false, '');
		if (!result.ok) {
			setSaveState(unsavedText);
			return false;
		}

		savedRevision = revisionAtStart;
		onSaved?.(result.data);
		setSaveState(isDirty() ? unsavedText : savedText());
		return true;
	};

	const saveIfDirty = async () => !isDirty() || (await save());

	const leaveTo = (href: string) => {
		leaving = true;
		window.location.assign(href);
	};

	form.addEventListener('input', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement) || (untrackedFields && target.matches(untrackedFields))) return;
		markDirty();
	});

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		void save();
	});

	document.addEventListener('keydown', (event) => {
		if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
		event.preventDefault();
		if (!saveButton?.disabled) void save();
	});

	window.addEventListener('beforeunload', (event) => {
		if (isDirty() && !leaving) event.preventDefault();
	});

	previewLink?.addEventListener('click', async (event) => {
		if (!isDirty()) return;
		event.preventDefault();
		const previewTab = window.open('about:blank', '_blank');
		const saved = await save();
		if (!saved) previewTab?.close();
		else if (previewTab) previewTab.location.href = previewLink.href;
		else window.open(previewLink.href, '_blank');
	});

	return { save, saveIfDirty, markDirty, isDirty, leaveTo };
}
