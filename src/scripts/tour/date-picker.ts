import { formatMonthLabel, leadingBlankDays, localToday, monthBounds, monthOf, shiftMonth } from '../../lib/calendar';
import { setFieldError } from '../ui/form-validation';

export interface CalendarDay {
	date: string;
	available: number;
	bookable: boolean;
}

export interface DatePickerOptions {
	minMonth: string;
	maxMonth: string;
	loadMonth: (month: string) => Promise<CalendarDay[]>;
	onChange: (date: string, day: CalendarDay) => void;
}

export interface DatePickerHandle {
	value(): string | null;
	setValue(date: string | null): void;
	open(): void;
	close(): void;
	invalidate(month: string): void;
	dayOf(date: string): CalendarDay | undefined;
}

type DayState = 'bookable' | 'few' | 'full' | 'none';
type FocusTarget = 'active' | 'first' | 'last' | null;

const fewSeatsThreshold = 10;
const monthsToSearchForBookableDay = 3;
const daysPerWeek = 7;
const dayInMilliseconds = 86_400_000;

const triggerDateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayMonthFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const middayOf = (date: string) => new Date(`${date}T12:00:00Z`);

export const formatPickerDate = (date: string) => triggerDateFormatter.format(middayOf(date)).replace(',', '');

const addDays = (date: string, days: number) => new Date(middayOf(date).getTime() + days * dayInMilliseconds).toISOString().slice(0, 10);

const seatsLeftLabel = (available: number) => (available === 1 ? 'queda 1 plaza' : `quedan ${available} plazas`);

function dayState(date: string, day: CalendarDay | undefined, today: string): DayState {
	if (!day || date < today) return 'none';
	if (day.bookable) return day.available < fewSeatsThreshold ? 'few' : 'bookable';
	return day.available === 0 ? 'full' : 'none';
}

const isSelectableState = (state: DayState) => state === 'bookable' || state === 'few';

function dayAriaLabel(date: string, day: CalendarDay | undefined, state: DayState) {
	const dayMonth = dayMonthFormatter.format(middayOf(date));
	if (state === 'full') return `${dayMonth}, completo`;
	if (state === 'none' || !day) return `${dayMonth}, sin salida`;
	return `${dayMonth}, ${seatsLeftLabel(day.available)}`;
}

function fewSeatsNote(day: CalendarDay | undefined) {
	if (!day || !day.bookable || day.available >= fewSeatsThreshold) return '';
	return day.available === 1 ? 'Queda 1 plaza ese día.' : `Quedan ${day.available} plazas ese día.`;
}

function part<T extends Element>(root: HTMLElement, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Falta ${selector} en el selector de fecha`);
	return element;
}

export function initDatePicker(root: HTMLElement, options: DatePickerOptions): DatePickerHandle {
	const trigger = part<HTMLButtonElement>(root, '[data-date-trigger]');
	const valueLabel = part<HTMLElement>(root, '[data-date-value]');
	const valueInput = part<HTMLInputElement>(root, 'input[type="hidden"]');
	const requiredInput = part<HTMLInputElement>(root, '[data-date-required]');
	const panel = part<HTMLElement>(root, '[data-date-panel]');
	const previousButton = part<HTMLButtonElement>(root, '[data-month-step="-1"]');
	const nextButton = part<HTMLButtonElement>(root, '[data-month-step="1"]');
	const monthLabel = part<HTMLElement>(root, '[data-month-label]');
	const grid = part<HTMLElement>(root, '[data-month-grid]');
	const status = part<HTMLElement>(root, '[data-date-status]');
	const retryButton = part<HTMLButtonElement>(root, '[data-date-retry]');
	const note = part<HTMLElement>(root, '[data-date-note]');
	const dayTemplate = part<HTMLTemplateElement>(root, '[data-day-template]');

	const emptyLabel = valueLabel.textContent?.trim() || 'Elige el día';
	const monthCache = new Map<string, CalendarDay[]>();
	const pendingMonths = new Map<string, Promise<CalendarDay[]>>();
	const paintedDays = new Map<string, CalendarDay>();
	let selectedDate: string | null = null;
	let shownMonth = options.minMonth;
	let hasOpened = false;
	let renderToken = 0;

	const clampMonth = (month: string) => (month < options.minMonth ? options.minMonth : month > options.maxMonth ? options.maxMonth : month);
	const isOpen = () => !panel.hidden;

	function dayOf(date: string) {
		return monthCache.get(monthOf(date))?.find((day) => day.date === date);
	}

	function updateNote() {
		const text = selectedDate ? fewSeatsNote(dayOf(selectedDate)) : '';
		note.textContent = text;
		note.hidden = !text;
	}

	function setStatus(text: string, canRetry: boolean) {
		status.textContent = text;
		status.hidden = !text;
		retryButton.hidden = !canRetry;
	}

	function ensureMonth(month: string): Promise<CalendarDay[]> {
		const cached = monthCache.get(month);
		if (cached) return Promise.resolve(cached);
		const pending = pendingMonths.get(month);
		if (pending) return pending;

		const request: Promise<CalendarDay[]> = options.loadMonth(month).then(
			(days) => {
				if (pendingMonths.get(month) === request) {
					pendingMonths.delete(month);
					monthCache.set(month, days);
					if (selectedDate && monthOf(selectedDate) === month) updateNote();
				}
				return days;
			},
			(error: unknown) => {
				if (pendingMonths.get(month) === request) pendingMonths.delete(month);
				throw error;
			},
		);
		pendingMonths.set(month, request);
		return request;
	}

	const dayButtons = () => Array.from(grid.querySelectorAll<HTMLButtonElement>('[data-day]'));
	const enabledDayButtons = () => dayButtons().filter((button) => !button.disabled);
	const dayButtonFor = (date: string) => enabledDayButtons().find((button) => button.dataset.date === date);

	function setRovingDay(target: HTMLButtonElement | undefined) {
		for (const button of dayButtons()) button.tabIndex = button === target ? 0 : -1;
	}

	function activeDayButton() {
		const enabled = enabledDayButtons();
		return enabled.find((button) => button.dataset.date === selectedDate) ?? enabled.find((button) => button.tabIndex === 0) ?? enabled[0];
	}

	function focusDay(button: HTMLButtonElement | undefined) {
		if (!button) return;
		setRovingDay(button);
		button.focus();
	}

	function canMoveFocusIntoGrid() {
		const focused = document.activeElement;
		return !focused || focused === document.body || root.contains(focused);
	}

	function createCell() {
		const cell = document.createElement('div');
		cell.setAttribute('role', 'gridcell');
		return cell;
	}

	function createDayButton(date: string, day: CalendarDay | undefined, today: string) {
		const button = dayTemplate.content.firstElementChild?.cloneNode(true);
		if (!(button instanceof HTMLButtonElement)) throw new Error('La plantilla de día tiene que ser un botón');
		const state = dayState(date, day, today);
		button.dataset.date = date;
		button.dataset.state = state;
		button.disabled = !isSelectableState(state);
		button.tabIndex = -1;
		button.setAttribute('aria-pressed', String(date === selectedDate));
		button.setAttribute('aria-label', dayAriaLabel(date, day, state));
		const number = button.querySelector('[data-day-number]');
		if (number) number.textContent = String(Number(date.slice(8, 10)));
		return button;
	}

	function paintMonth(month: string, days: CalendarDay[], focusTarget: FocusTarget) {
		const today = localToday();
		const daysByDate = new Map(days.map((day) => [day.date, day]));
		const lastDayOfMonth = Number(monthBounds(month).last.slice(8, 10));
		const cells = Array.from({ length: leadingBlankDays(month) }, createCell);

		paintedDays.clear();
		for (let dayOfMonth = 1; dayOfMonth <= lastDayOfMonth; dayOfMonth += 1) {
			const date = `${month}-${String(dayOfMonth).padStart(2, '0')}`;
			const day = daysByDate.get(date);
			if (day) paintedDays.set(date, day);
			const cell = createCell();
			cell.append(createDayButton(date, day, today));
			cells.push(cell);
		}
		while (cells.length % daysPerWeek !== 0) cells.push(createCell());

		const rows = [];
		for (let index = 0; index < cells.length; index += daysPerWeek) {
			const row = document.createElement('div');
			row.setAttribute('role', 'row');
			row.className = 'grid grid-cols-7 gap-1';
			row.append(...cells.slice(index, index + daysPerWeek));
			rows.push(row);
		}
		grid.replaceChildren(...rows);
		grid.removeAttribute('aria-busy');

		const enabled = enabledDayButtons();
		setStatus(enabled.length === 0 ? 'No quedan salidas este mes.' : '', false);
		setRovingDay(activeDayButton());
		if (selectedDate && monthOf(selectedDate) === month) updateNote();

		if (!focusTarget || !isOpen() || !canMoveFocusIntoGrid()) return;
		const target = focusTarget === 'first' ? enabled[0] : focusTarget === 'last' ? enabled.at(-1) : activeDayButton();
		if (target) focusDay(target);
		else if (focusTarget !== 'active' && !root.contains(document.activeElement)) (focusTarget === 'first' ? nextButton : previousButton).focus();
	}

	async function showMonth(month: string, focusTarget: FocusTarget = null) {
		shownMonth = month;
		const token = ++renderToken;
		monthLabel.textContent = formatMonthLabel(month);
		previousButton.disabled = month <= options.minMonth;
		nextButton.disabled = month >= options.maxMonth;

		const cached = monthCache.get(month);
		if (cached) {
			paintMonth(month, cached, focusTarget);
			return;
		}

		grid.replaceChildren();
		grid.setAttribute('aria-busy', 'true');
		setStatus('Cargando…', false);
		try {
			const days = await ensureMonth(month);
			if (token === renderToken) paintMonth(month, days, focusTarget);
		} catch {
			if (token !== renderToken) return;
			grid.removeAttribute('aria-busy');
			setStatus('No pudimos cargar las fechas.', true);
		}
	}

	async function showFirstBookableMonth() {
		void showMonth(options.minMonth, 'active');
		const token = renderToken;
		const today = localToday();
		for (let offset = 0; offset < monthsToSearchForBookableDay; offset += 1) {
			const month = shiftMonth(options.minMonth, offset);
			if (month > options.maxMonth) return;
			let days: CalendarDay[];
			try {
				days = await ensureMonth(month);
			} catch {
				return;
			}
			if (token !== renderToken || !isOpen()) return;
			if (days.some((day) => day.bookable && day.date >= today)) {
				if (month !== shownMonth) void showMonth(month, 'active');
				return;
			}
		}
	}

	function stepMonth(offset: number, focusTarget: FocusTarget = null) {
		const month = shiftMonth(shownMonth, offset);
		if (month < options.minMonth || month > options.maxMonth) return false;
		void showMonth(month, focusTarget);
		return true;
	}

	function setValue(date: string | null) {
		selectedDate = date;
		valueInput.value = date ?? '';
		requiredInput.value = date ?? '';
		valueLabel.textContent = date ? formatPickerDate(date) : emptyLabel;
		valueLabel.toggleAttribute('data-empty', !date);
		for (const button of dayButtons()) button.setAttribute('aria-pressed', String(button.dataset.date === date));
		setRovingDay(activeDayButton());
		updateNote();
	}

	function open() {
		if (isOpen()) return;
		panel.hidden = false;
		trigger.setAttribute('aria-expanded', 'true');
		const isFirstOpening = !hasOpened;
		hasOpened = true;
		if (selectedDate) void showMonth(clampMonth(monthOf(selectedDate)), 'active');
		else if (isFirstOpening) void showFirstBookableMonth();
		else void showMonth(shownMonth, 'active');
	}

	function close() {
		if (!isOpen()) return;
		panel.hidden = true;
		trigger.setAttribute('aria-expanded', 'false');
	}

	function invalidate(month: string) {
		monthCache.delete(month);
		pendingMonths.delete(month);
		if (isOpen() && shownMonth === month) void showMonth(month);
	}

	function choose(date: string) {
		const day = dayOf(date) ?? paintedDays.get(date);
		if (!day) return;
		setValue(date);
		close();
		trigger.focus();
		setFieldError(root, null);
		options.onChange(date, day);
	}

	function moveFocus(current: HTMLButtonElement, key: string) {
		const enabled = enabledDayButtons();
		const currentIndex = enabled.indexOf(current);
		const currentDate = current.dataset.date ?? '';

		if (key === 'Home') return focusDay(enabled[0]);
		if (key === 'End') return focusDay(enabled.at(-1));
		if (key === 'PageUp') return stepMonth(-1, 'active');
		if (key === 'PageDown') return stepMonth(1, 'active');

		const weekOffset = key === 'ArrowUp' ? -daysPerWeek : key === 'ArrowDown' ? daysPerWeek : 0;
		const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
		if (weekOffset !== 0) {
			for (let date = addDays(currentDate, weekOffset); monthOf(date) === shownMonth; date = addDays(date, weekOffset)) {
				const button = dayButtonFor(date);
				if (button) return focusDay(button);
			}
		}
		const neighbour = enabled[currentIndex + direction];
		if (neighbour) return focusDay(neighbour);
		return stepMonth(direction, direction > 0 ? 'first' : 'last');
	}

	const navigationKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

	trigger.addEventListener('click', () => (isOpen() ? close() : open()));
	requiredInput.addEventListener('focus', () => trigger.focus());
	previousButton.addEventListener('click', () => stepMonth(-1));
	nextButton.addEventListener('click', () => stepMonth(1));
	retryButton.addEventListener('click', () => void showMonth(shownMonth, 'active'));

	grid.addEventListener('click', (event) => {
		const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-day]');
		if (button && !button.disabled && button.dataset.date) choose(button.dataset.date);
	});

	grid.addEventListener('keydown', (event) => {
		const current = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-day]');
		if (!current || !navigationKeys.has(event.key)) return;
		event.preventDefault();
		moveFocus(current, event.key);
	});

	root.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape' || !isOpen()) return;
		event.preventDefault();
		event.stopPropagation();
		close();
		trigger.focus();
	});

	document.addEventListener('pointerdown', (event) => {
		if (isOpen() && event.target instanceof Node && !root.contains(event.target)) close();
	});

	setValue(valueInput.value || null);

	return {
		value: () => selectedDate,
		setValue,
		open,
		close,
		invalidate,
		dayOf,
	};
}
