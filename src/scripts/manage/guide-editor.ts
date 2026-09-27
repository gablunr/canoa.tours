import { actions } from 'astro:actions';
import { faqHeading, parseGuideMarkdown, type GuideMarkdownContent, type GuideMarkdownIssue } from '../../lib/guides/guide-markdown';
import { wireCharacterCounters } from '../ui/character-counter';
import { initConfirmDialogs } from './confirm-dialogs';
import { createEditorSession, type SaveResult } from './editor-session';
import { actionErrorMessage, readRouteConfig, setBusy, showMessage, slugify, wireSlugField } from './form-helpers';

const wordsPerMinute = 200;
const maxImageBytes = 5 * 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const isTextField = (element: unknown): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
	element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;

function readingMinutes(title: string, description: string, tourNote: string, content: GuideMarkdownContent) {
	const texts = [
		title,
		description,
		tourNote,
		content.answer,
		...content.sections.flatMap((section) => [
			section.title,
			...section.blocks.flatMap((block) => {
				if (block.type === 'paragraph') return [block.text];
				if (block.type === 'list') return block.items;
				return [...block.head, ...block.rows.flat()];
			}),
		]),
		...content.faqs.flatMap((faq) => [faq.question, faq.answer]),
	];
	const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function insertText(textarea: HTMLTextAreaElement, text: string, selectFrom?: number, selectTo?: number) {
	textarea.focus();
	const start = textarea.selectionStart;
	const insertedNatively = document.execCommand('insertText', false, text);
	if (!insertedNatively) {
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
	}
	if (selectFrom !== undefined) textarea.setSelectionRange(start + selectFrom, start + (selectTo ?? selectFrom));
}

function blockPrefix(textarea: HTMLTextAreaElement) {
	const before = textarea.value.slice(0, textarea.selectionStart);
	if (!before.trim()) return '';
	if (before.endsWith('\n\n')) return '';
	return before.endsWith('\n') ? '\n' : '\n\n';
}

function applyTool(textarea: HTMLTextAreaElement, tool: string) {
	const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);

	if (tool === 'bold') {
		const label = selected || 'texto';
		insertText(textarea, `**${label}**`, 2, 2 + label.length);
	} else if (tool === 'link') {
		const label = selected || 'texto';
		insertText(textarea, `[${label}](/ruta)`, label.length + 3, label.length + 8);
	} else if (tool === 'section') {
		const prefix = blockPrefix(textarea);
		const title = selected || 'Título de la sección';
		insertText(textarea, `${prefix}## ${title}\n\n`, prefix.length + 3, prefix.length + 3 + title.length);
	} else if (tool === 'list') {
		if (selected.includes('\n')) {
			insertText(textarea, selected.split('\n').map((line) => (line.trim() ? `- ${line.replace(/^\s*[-*•]\s+/, '')}` : line)).join('\n'));
		} else {
			const prefix = blockPrefix(textarea);
			const item = selected || 'Elemento';
			insertText(textarea, `${prefix}- ${item}\n`, prefix.length + 2, prefix.length + 2 + item.length);
		}
	} else if (tool === 'table') {
		const prefix = blockPrefix(textarea);
		insertText(textarea, `${prefix}| Columna | Columna |\n| --- | --- |\n| Dato | Dato |\n\n`, prefix.length + 2, prefix.length + 9);
	} else if (tool === 'question') {
		const hasFaqSection = textarea.value.split('\n').some((line) => line.trim().toLowerCase() === `## ${faqHeading.toLowerCase()}`);
		const end = textarea.value.replace(/\s+$/, '').length;
		textarea.setSelectionRange(end, textarea.value.length);
		const heading = hasFaqSection ? '' : `## ${faqHeading}\n\n`;
		const prefix = end > 0 ? '\n\n' : '';
		const question = '¿Pregunta?';
		const offset = prefix.length + heading.length + 4;
		insertText(textarea, `${prefix}${heading}### ${question}\n\nRespuesta.\n`, offset, offset + question.length);
	}
}

const mirroredStyles = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing'] as const;

function textHeightBefore(textarea: HTMLTextAreaElement, index: number) {
	const mirror = document.createElement('div');
	const style = getComputedStyle(textarea);
	mirroredStyles.forEach((property) => (mirror.style[property] = style[property]));
	Object.assign(mirror.style, { position: 'absolute', top: '0', left: '-9999px', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
	mirror.textContent = textarea.value.slice(0, index);
	document.body.append(mirror);
	const height = mirror.scrollHeight;
	mirror.remove();
	return height;
}

function selectLine(textarea: HTMLTextAreaElement, line: number) {
	const lines = textarea.value.split('\n');
	const start = lines.slice(0, line - 1).reduce((total, current) => total + current.length + 1, 0);
	textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	textarea.focus({ preventScroll: true });
	textarea.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
	textarea.scrollTop = Math.max(0, textHeightBefore(textarea, start) - textarea.clientHeight / 3);
}

function initImageUpload(root: HTMLElement, guideId: string, isPublished: boolean) {
	const card = root.querySelector<HTMLElement>('[data-image-card]');
	const fileInput = card?.querySelector<HTMLInputElement>('[data-image-input]');
	const altInput = card?.querySelector<HTMLInputElement>('[data-image-alt]');
	if (!card || !fileInput || !altInput) return;

	const preview = card.querySelector<HTMLImageElement>('[data-image-preview]');
	const emptyState = card.querySelector<HTMLElement>('[data-image-empty]');
	const buttonLabel = card.querySelector<HTMLElement>('[data-image-button-label]');
	const status = card.querySelector<HTMLElement>('[data-image-status]');
	let pendingFile: File | null = null;

	const setStatus = (message: string | null, tone: 'info' | 'error' = 'info') => {
		if (status) status.className = `mt-2 text-xs ${tone === 'error' ? 'text-error' : 'text-secondary'}`;
		showMessage(status, message);
	};

	async function upload() {
		if (!pendingFile || !fileInput || !altInput) return;
		const imageAlt = altInput.value.trim();
		if (imageAlt.length < 5) {
			setStatus('Escribe el texto alternativo (5 caracteres o más) y la imagen se sube sola.', 'error');
			altInput.focus();
			return;
		}

		const file = pendingFile;
		const body = new FormData();
		body.set('id', guideId);
		body.set('image', file);
		body.set('imageAlt', imageAlt);
		setStatus('Subiendo imagen…');
		fileInput.disabled = true;
		const { error } = await actions.guides.setImage(body);
		fileInput.disabled = false;
		if (error) {
			setStatus(actionErrorMessage(error), 'error');
			return;
		}

		pendingFile = null;
		fileInput.value = '';
		if (preview) {
			preview.src = URL.createObjectURL(file);
			preview.hidden = false;
		}
		if (emptyState) emptyState.hidden = true;
		if (buttonLabel) buttonLabel.textContent = 'Cambiar imagen';
		setStatus(isPublished ? 'Imagen subida, la web se actualiza en unos minutos.' : 'Imagen subida.');
	}

	fileInput.addEventListener('change', () => {
		const file = fileInput.files?.[0];
		if (!file) return;
		if (!imageTypes.includes(file.type)) {
			setStatus('Usa una imagen JPG, PNG o WebP.', 'error');
			fileInput.value = '';
			return;
		}
		if (file.size > maxImageBytes) {
			setStatus('La imagen no puede pasar de 5 MB.', 'error');
			fileInput.value = '';
			return;
		}
		pendingFile = file;
		void upload();
	});
	altInput.addEventListener('change', () => void upload());
}

export function initGuideEditor(root: HTMLElement) {
	const form = root.querySelector<HTMLFormElement>('[data-guide-form]');
	const markdownInput = form?.querySelector<HTMLTextAreaElement>('[data-markdown-input]');
	const guideId = root.dataset.guideId;
	if (!form || !markdownInput || !guideId) return;

	const isPublished = root.dataset.guideStatus === 'published';
	const listHref = root.dataset.listHref ?? '/manage/guides';
	const saveButton = form.querySelector<HTMLButtonElement>('[data-save]');
	const publishButton = form.querySelector<HTMLButtonElement>('[data-publish]');
	const unpublishButton = form.querySelector<HTMLButtonElement>('[data-unpublish]');
	const previewLink = form.querySelector<HTMLAnchorElement>('[data-preview-link]');
	const saveState = form.querySelector<HTMLElement>('[data-save-state]');
	const errorBox = form.querySelector<HTMLElement>('[data-editor-error]');
	const readingOutput = form.querySelector<HTMLOutputElement>('[data-reading-minutes]');
	const wordCountOutput = form.querySelector<HTMLOutputElement>('[data-word-count]');
	const helpToggle = form.querySelector<HTMLButtonElement>('[data-help-toggle]');
	const helpPanel = form.querySelector<HTMLElement>('[data-help-panel]');
	const titleInput = form.querySelector<HTMLTextAreaElement>('[data-title-input]');
	const siloSelect = form.querySelector<HTMLSelectElement>('[data-silo-select]');
	const slugInput = form.querySelector<HTMLInputElement>('[data-slug-input]');
	const slugPath = form.querySelector<HTMLElement>('[data-slug-path]');
	const tourSelect = form.querySelector<HTMLSelectElement>('[data-tour-select]');
	const tourNote = form.querySelector<HTMLTextAreaElement>('[data-tour-note]');
	const markerSelect = form.querySelector<HTMLSelectElement>('[data-marker-select]');
	const issuesBox = form.querySelector<HTMLElement>('[data-markdown-issues]');
	const issueList = form.querySelector<HTMLElement>('[data-markdown-issue-list]');
	const askToConfirm = initConfirmDialogs(root);

	let showIssuesLive = false;

	const fieldValue = (name: string) => {
		const field = form.elements.namedItem(name);
		return isTextField(field) ? field.value.trim() : '';
	};

	const parseBody = () => parseGuideMarkdown(markdownInput.value);

	const renderIssues = (issues: GuideMarkdownIssue[]) => {
		if (!issuesBox || !issueList) return;
		issueList.replaceChildren(
			...issues.map((issue) => {
				const item = document.createElement('li');
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'cursor-pointer rounded text-left underline decoration-error/40 underline-offset-4 outline-none hover:decoration-error focus-visible:ring-2 focus-visible:ring-accent';
				button.textContent = `Línea ${issue.line}: ${issue.message}`;
				button.addEventListener('click', () => selectLine(markdownInput, issue.line));
				item.append(button);
				return item;
			}),
		);
		issuesBox.hidden = issues.length === 0;
	};

	const refreshFromBody = () => {
		const { content, issues } = parseBody();
		if (readingOutput) readingOutput.textContent = String(readingMinutes(fieldValue('title'), fieldValue('description'), fieldValue('tourNote'), content));
		if (wordCountOutput) wordCountOutput.textContent = String(markdownInput.value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length);
		if (showIssuesLive) renderIssues(issues);
	};

	titleInput?.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') event.preventDefault();
	});

	if (siloSelect && slugInput) {
		const refreshSlug = wireSlugField(readRouteConfig(root), {
			siloSelect,
			slugInput,
			onPrefixChange: (prefix) => {
				if (slugPath) slugPath.textContent = `${prefix}${slugInput.value.trim()}`;
			},
		});
		slugInput.addEventListener('change', () => {
			slugInput.value = slugify(slugInput.value);
			refreshSlug();
		});
	}

	const syncTourNote = () => {
		if (tourSelect && tourNote) tourNote.required = tourSelect.value !== '';
	};
	tourSelect?.addEventListener('change', syncTourNote);

	wireCharacterCounters(form);

	form.querySelectorAll<HTMLButtonElement>('[data-markdown-tool]').forEach((button) => {
		button.addEventListener('click', () => applyTool(markdownInput, button.dataset.markdownTool ?? ''));
	});

	const setHelpOpen = (open: boolean) => {
		if (!helpPanel || !helpToggle) return;
		helpPanel.hidden = !open;
		helpToggle.setAttribute('aria-expanded', String(open));
	};
	helpToggle?.addEventListener('click', () => setHelpOpen(Boolean(helpPanel?.hidden)));
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && helpPanel && !helpPanel.hidden) setHelpOpen(false);
	});
	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!helpPanel || helpPanel.hidden || !(target instanceof Node)) return;
		if (!helpPanel.contains(target) && !helpToggle?.contains(target)) setHelpOpen(false);
	});

	markerSelect?.addEventListener('change', () => {
		const name = markerSelect.value;
		markerSelect.value = '';
		if (name) insertText(markdownInput, `{{${name}}}`);
	});

	markdownInput.addEventListener('keydown', (event) => {
		if (!(event.metaKey || event.ctrlKey)) return;
		const key = event.key.toLowerCase();
		if (key !== 'b' && key !== 'k') return;
		event.preventDefault();
		applyTool(markdownInput, key === 'b' ? 'bold' : 'link');
	});

	const validate = () => {
		const { issues } = parseBody();
		showIssuesLive = true;
		renderIssues(issues);
		form.querySelectorAll('details').forEach((panel) => {
			if (panel.querySelector(':invalid')) panel.open = true;
		});
		if (!form.reportValidity()) return false;
		if (issues.length > 0) {
			issuesBox?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			showMessage(errorBox, 'Hay cosas que revisar en el texto, las tienes debajo del editor.');
			return false;
		}
		return true;
	};

	const persist = async (): Promise<SaveResult<{ readingMinutes: number }>> => {
		const { content } = parseBody();
		showMessage(errorBox, null);
		const featured = form.elements.namedItem('featured');
		const { data, error } = await actions.guides.save({
			id: guideId,
			title: fieldValue('title'),
			slug: fieldValue('slug'),
			silo: fieldValue('silo'),
			description: fieldValue('description'),
			imageAlt: fieldValue('imageAlt'),
			featured: featured instanceof HTMLInputElement && featured.checked,
			tourProductKey: fieldValue('tourProductKey') || null,
			tourNote: fieldValue('tourNote'),
			...content,
		});
		if (error) {
			showMessage(errorBox, actionErrorMessage(error));
			return { ok: false };
		}
		return { ok: true, data };
	};

	const session = createEditorSession({
		form,
		validate,
		persist,
		onSaved: (data) => {
			if (readingOutput && !session.isDirty()) readingOutput.textContent = String(data.readingMinutes);
		},
		onChange: refreshFromBody,
		saveButton,
		saveState,
		previewLink,
		savedMessage: isPublished ? 'Guardado, la web se actualiza en unos minutos' : 'Guardado',
		untrackedFields: '[data-image-input], [data-marker-select]',
	});
	const { leaveTo } = session;

	publishButton?.addEventListener('click', async () => {
		if (!(await session.saveIfDirty())) return;
		showMessage(errorBox, null);
		setBusy(publishButton, true, 'Publicando…');
		const { error } = await actions.guides.publish({ id: guideId });
		if (error) {
			showMessage(errorBox, actionErrorMessage(error));
			setBusy(publishButton, false, '');
			return;
		}
		leaveTo(`${window.location.pathname}?done=published`);
	});

	unpublishButton?.addEventListener('click', async () => {
		if (!(await session.saveIfDirty())) return;
		askToConfirm('unpublish', 'Retirando…', async () => {
			const { error } = await actions.guides.unpublish({ id: guideId });
			if (error) return actionErrorMessage(error);
			leaveTo(`${window.location.pathname}?done=unpublished`);
			return null;
		});
	});

	form.querySelector<HTMLButtonElement>('[data-delete-guide]')?.addEventListener('click', () => {
		askToConfirm('delete', 'Borrando…', async () => {
			const { error } = await actions.guides.remove({ id: guideId });
			if (error) return actionErrorMessage(error);
			leaveTo(listHref);
			return null;
		});
	});

	initImageUpload(root, guideId, isPublished);
	syncTourNote();
	refreshFromBody();

	if (new URL(window.location.href).searchParams.has('done')) window.history.replaceState(null, '', window.location.pathname);
}
