export const isoWeekdays = [1, 2, 3, 4, 5, 6, 7] as const;

export function normalizeWeekdays(values: readonly (string | number)[]): number[] {
	const days = values.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
	return [...new Set(days)].sort((first, second) => first - second);
}

const readyPickers = new WeakSet<HTMLElement>();

const checkboxesOf = (picker: HTMLElement) =>
	Array.from(picker.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-weekday]'));

function refreshShortcut(picker: HTMLElement) {
	const shortcut = picker.querySelector<HTMLButtonElement>('[data-weekday-all]');
	const allChecked = checkboxesOf(picker).every((checkbox) => checkbox.checked);
	shortcut?.setAttribute('aria-pressed', String(allChecked));
}

function setUpWeekdayPicker(picker: HTMLElement) {
	if (readyPickers.has(picker)) return;
	readyPickers.add(picker);
	picker.addEventListener('change', () => refreshShortcut(picker));
	picker.querySelector<HTMLButtonElement>('[data-weekday-all]')?.addEventListener('click', () => {
		const checkboxes = checkboxesOf(picker);
		const selectAll = !checkboxes.every((checkbox) => checkbox.checked);
		checkboxes.forEach((checkbox) => {
			checkbox.checked = selectAll;
		});
		refreshShortcut(picker);
		picker.dispatchEvent(new Event('input', { bubbles: true }));
		picker.dispatchEvent(new Event('change', { bubbles: true }));
	});
	refreshShortcut(picker);
}

export function initWeekdayPickers(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>('[data-weekday-picker]').forEach(setUpWeekdayPicker);
}

export function readWeekdays(picker: HTMLElement): number[] {
	return normalizeWeekdays(checkboxesOf(picker).filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
}
