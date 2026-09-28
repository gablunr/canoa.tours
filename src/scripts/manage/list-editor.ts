export type ListItem = Record<string, string>;
export type ListValues = string[] | ListItem[];

type ListMode = 'text' | 'object';
type ListControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type MoveAction = 'up' | 'down';

const textValueField = 'value';
const describedTextMaxLength = 60;
const announceDelay = 100;
const readyEditors = new WeakSet<HTMLElement>();

export function normalizeTextItems(values: readonly string[]): string[] {
	return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export function normalizeObjectItems(rows: readonly ListItem[]): ListItem[] {
	return rows
		.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()])))
		.filter((row) => Object.values(row).some((value) => value.length > 0));
}

export function toRowValues(items: readonly unknown[]): ListItem[] {
	return items.map((item) => {
		if (typeof item === 'string') return { [textValueField]: item };
		if (!item || typeof item !== 'object') return {};
		return Object.fromEntries(
			Object.entries(item).map(([key, value]) => [key, value === null || value === undefined ? '' : String(value)]),
		);
	});
}

export function padRows<Row>(rows: readonly Row[], min: number, createEmpty: () => Row): Row[] {
	const missing = Math.max(0, min - rows.length);
	return [...rows, ...Array.from({ length: missing }, createEmpty)];
}

export function describeItem(text: string, fallback: string) {
	const clean = text.trim().replace(/\s+/g, ' ');
	if (!clean) return fallback;
	const short = clean.length > describedTextMaxLength ? `${clean.slice(0, describedTextMaxLength - 1).trimEnd()}…` : clean;
	return `«${short}»`;
}

export const movedMessage = (position: number) => `Movido a la posición ${position}`;

export const removedMessage = (description: string) => `Quitado ${description}`;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function parseItems(value: string | undefined): unknown[] {
	try {
		const parsed: unknown = value ? JSON.parse(value) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function settings(listRoot: HTMLElement) {
	const { listMode, listName = 'list', itemLabel = 'elemento', min, max, labelField } = listRoot.dataset;
	const mode: ListMode = listMode === 'object' ? 'object' : 'text';
	return {
		mode,
		name: listName,
		itemLabel,
		min: Math.max(0, Number(min) || 0),
		max: max ? Number(max) : Number.POSITIVE_INFINITY,
		labelField: mode === 'text' ? textValueField : labelField,
	};
}

const rowsContainer = (listRoot: HTMLElement) => listRoot.querySelector<HTMLOListElement>('[data-list-rows]');

const rowsOf = (listRoot: HTMLElement) =>
	Array.from(rowsContainer(listRoot)?.querySelectorAll<HTMLElement>(':scope > [data-list-row]') ?? []);

const controlsOf = (row: HTMLElement) => Array.from(row.querySelectorAll<ListControl>('[data-list-field]'));

const actionButton = (row: HTMLElement, action: string) =>
	row.querySelector<HTMLButtonElement>(`[data-list-action="${action}"]`);

function rowValues(row: HTMLElement): ListItem {
	return Object.fromEntries(controlsOf(row).map((control) => [control.dataset.listField ?? textValueField, control.value]));
}

function rowDescription(listRoot: HTMLElement, row: HTMLElement, position: number) {
	const { itemLabel, labelField } = settings(listRoot);
	const labelControl = controlsOf(row).find((control) => control.dataset.listField === labelField) ?? controlsOf(row)[0];
	return describeItem(labelControl?.value ?? '', `${itemLabel} ${position}`);
}

function setAriaDisabled(element: HTMLElement | null, disabled: boolean) {
	if (!element) return;
	if (disabled) element.setAttribute('aria-disabled', 'true');
	else element.removeAttribute('aria-disabled');
}

function refreshRow(listRoot: HTMLElement, row: HTMLElement, index: number, count: number) {
	const { mode, itemLabel, min } = settings(listRoot);
	const position = index + 1;
	const title = `${capitalize(itemLabel)} ${position}`;
	const description = rowDescription(listRoot, row, position);

	if (mode === 'text') controlsOf(row)[0]?.setAttribute('aria-label', title);
	const positionLabel = row.querySelector<HTMLElement>('[data-list-position]');
	if (positionLabel) positionLabel.textContent = title;

	const up = actionButton(row, 'up');
	const down = actionButton(row, 'down');
	const remove = actionButton(row, 'remove');
	up?.setAttribute('aria-label', `Subir ${description}`);
	down?.setAttribute('aria-label', `Bajar ${description}`);
	remove?.setAttribute('aria-label', `Quitar ${description}`);
	setAriaDisabled(up, index === 0);
	setAriaDisabled(down, index === count - 1);
	setAriaDisabled(remove, count <= min);
}

function refreshRows(listRoot: HTMLElement) {
	const rows = rowsOf(listRoot);
	rows.forEach((row, index) => refreshRow(listRoot, row, index, rows.length));
	const addButton = listRoot.querySelector<HTMLButtonElement>('[data-list-action="add"]');
	if (addButton) addButton.disabled = rows.length >= settings(listRoot).max;
}

function createRow(listRoot: HTMLElement, values: ListItem) {
	const template = listRoot.querySelector<HTMLTemplateElement>('template[data-list-template]');
	const row = template?.content.firstElementChild?.cloneNode(true);
	if (!(row instanceof HTMLElement)) return null;

	const { name } = settings(listRoot);
	const key = String(Number(listRoot.dataset.listNextKey ?? '0'));
	listRoot.dataset.listNextKey = String(Number(key) + 1);
	const rowId = `field-${name}-${key}`;

	for (const control of controlsOf(row)) {
		const field = control.dataset.listField ?? textValueField;
		control.id = field === textValueField ? rowId : `${rowId}-${field}`;
		control.value = values[field] ?? '';
	}

	const positionLabel = row.querySelector<HTMLElement>('[data-list-position]');
	const group = row.querySelector<HTMLElement>('[data-list-row-fields]');
	if (positionLabel && group) {
		positionLabel.id = `${rowId}-position`;
		group.setAttribute('aria-labelledby', positionLabel.id);
	}
	return row;
}

function renderRows(listRoot: HTMLElement, rows: readonly ListItem[]) {
	const container = rowsContainer(listRoot);
	if (!container) return;
	const { min } = settings(listRoot);
	const elements = padRows(rows, min, () => ({}))
		.map((values) => createRow(listRoot, values))
		.filter((row): row is HTMLElement => row !== null);
	container.replaceChildren(...elements);
	refreshRows(listRoot);
}

function announce(listRoot: HTMLElement, message: string) {
	const status = listRoot.querySelector<HTMLElement>('[data-list-status]');
	if (!status) return;
	status.textContent = '';
	window.setTimeout(() => {
		status.textContent = message;
	}, announceDelay);
}

export function notifyListChange(listRoot: HTMLElement) {
	listRoot.dispatchEvent(new Event('input', { bubbles: true }));
}

function focusFirstControl(row: HTMLElement) {
	controlsOf(row)[0]?.focus();
}

function addRow(listRoot: HTMLElement) {
	const container = rowsContainer(listRoot);
	if (!container || rowsOf(listRoot).length >= settings(listRoot).max) return;
	const row = createRow(listRoot, {});
	if (!row) return;
	container.append(row);
	refreshRows(listRoot);
	focusFirstControl(row);
	notifyListChange(listRoot);
}

function moveRow(listRoot: HTMLElement, row: HTMLElement, action: MoveAction) {
	const sibling = action === 'up' ? row.previousElementSibling : row.nextElementSibling;
	if (!sibling) return;
	if (action === 'up') sibling.before(row);
	else sibling.after(row);
	refreshRows(listRoot);
	actionButton(row, action)?.focus();
	announce(listRoot, movedMessage(rowsOf(listRoot).indexOf(row) + 1));
	notifyListChange(listRoot);
}

function removeRow(listRoot: HTMLElement, row: HTMLElement) {
	const rows = rowsOf(listRoot);
	const index = rows.indexOf(row);
	const description = rowDescription(listRoot, row, index + 1);
	row.remove();
	refreshRows(listRoot);

	const remaining = rowsOf(listRoot);
	const neighbour = remaining[index] ?? remaining[index - 1];
	const nextFocus = neighbour ? actionButton(neighbour, 'remove') : listRoot.querySelector<HTMLButtonElement>('[data-list-action="add"]');
	nextFocus?.focus();
	announce(listRoot, removedMessage(description));
	notifyListChange(listRoot);
}

function handleClick(listRoot: HTMLElement, event: MouseEvent) {
	const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-list-action]');
	if (!button || button.closest('[data-list-editor]') !== listRoot) return;
	if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;

	const action = button.dataset.listAction;
	if (action === 'add') {
		addRow(listRoot);
		return;
	}
	const row = button.closest<HTMLElement>('[data-list-row]');
	if (!row) return;
	if (action === 'up' || action === 'down') moveRow(listRoot, row, action);
	else if (action === 'remove') removeRow(listRoot, row);
}

function handleKeydown(listRoot: HTMLElement, event: KeyboardEvent) {
	if (event.key !== 'Enter' || event.isComposing || settings(listRoot).mode !== 'text') return;
	const control = event.target;
	if (!(control instanceof HTMLInputElement) || !control.matches('[data-list-field]')) return;
	const row = control.closest<HTMLElement>('[data-list-row]');
	if (!row) return;

	event.preventDefault();
	const rows = rowsOf(listRoot);
	const nextRow = rows[rows.indexOf(row) + 1];
	if (nextRow) focusFirstControl(nextRow);
	else if (control.value.trim()) addRow(listRoot);
}

function handleInput(listRoot: HTMLElement, event: Event) {
	const row = (event.target as Element | null)?.closest<HTMLElement>('[data-list-row]');
	if (!row || row.closest('[data-list-editor]') !== listRoot) return;
	const rows = rowsOf(listRoot);
	refreshRow(listRoot, row, rows.indexOf(row), rows.length);
}

function setUpListEditor(listRoot: HTMLElement) {
	if (readyEditors.has(listRoot)) return;
	readyEditors.add(listRoot);
	renderRows(listRoot, toRowValues(parseItems(listRoot.dataset.listItems)));
	listRoot.addEventListener('click', (event) => handleClick(listRoot, event));
	listRoot.addEventListener('keydown', (event) => handleKeydown(listRoot, event));
	listRoot.addEventListener('input', (event) => handleInput(listRoot, event));
}

export function initListEditors(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>('[data-list-editor]').forEach(setUpListEditor);
}

export function readListValues(listRoot: HTMLElement): ListValues {
	setUpListEditor(listRoot);
	const rows = rowsOf(listRoot).map(rowValues);
	if (settings(listRoot).mode === 'text') return normalizeTextItems(rows.map((row) => row[textValueField] ?? ''));
	return normalizeObjectItems(rows);
}

export const readTextList = (listRoot: HTMLElement) => readListValues(listRoot) as string[];

export const readObjectList = (listRoot: HTMLElement) => readListValues(listRoot) as ListItem[];

export function setListValues(listRoot: HTMLElement, items: readonly unknown[]) {
	setUpListEditor(listRoot);
	renderRows(listRoot, toRowValues(items));
	notifyListChange(listRoot);
}
