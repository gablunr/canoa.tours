import { formatPrice } from '../../lib/format';
import { clearErrorOnInput, setFieldError, validateFields } from '../ui/form-validation';

const weekdayIds = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: 'UTC' });

const toInputDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const utcDate = (value: string) => new Date(`${value}T12:00:00Z`);

const readCount = (input: HTMLInputElement | null, min: number) => {
	const value = Math.floor(Number(input?.value));
	return Number.isFinite(value) && value >= min ? value : min;
};

export function initTourBooking(form: HTMLFormElement) {
	const data = form.dataset;
	const price = Number(data.price);
	const childPrice = Number(data.childPrice || 0);
	const deposit = Number(data.deposit);
	const perGroup = data.pricePer === 'group';
	const days = (data.days ?? '').split(',');
	const daysLabel = data.daysLabel ?? '';
	const fees = JSON.parse(data.pickupFees ?? '{}') as Record<string, number>;

	const dateInput = form.elements.namedItem('fecha') as HTMLInputElement;
	const adultsInput = form.elements.namedItem('adultos') as HTMLInputElement | null;
	const childrenInput = form.elements.namedItem('ninos') as HTMLInputElement | null;
	const hotelInput = form.elements.namedItem('hotel') as HTMLInputElement;
	const zoneSelect = form.elements.namedItem('zona') as HTMLSelectElement | null;
	const dateField = dateInput.closest<HTMLElement>('[data-field]');
	const summary = (key: string) => form.querySelector<HTMLElement>(`[data-summary="${key}"]`);

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);

	const weekdayOf = (value: string) => weekdayIds[utcDate(value).getUTCDay()];

	const daySelect = form.elements.namedItem('dia') as HTMLSelectElement;
	const monthSelect = form.elements.namedItem('mes') as HTMLSelectElement;
	const yearSelect = form.elements.namedItem('anio') as HTMLSelectElement;
	const firstDate = toInputDate(tomorrow);

	function renderYears() {
		const year = tomorrow.getFullYear();
		for (const option of Array.from(yearSelect.options)) if (option.value) option.remove();
		for (const value of [year, year + 1]) yearSelect.add(new Option(String(value), String(value)));
	}

	const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
	const composeDate = (year: string, month: string, day: string) => `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

	const isDeparture = (value: string) => value >= firstDate && days.includes(weekdayOf(value));
	const monthHasDeparture = (year: number, month: number) =>
		Array.from({ length: daysInMonth(year, month) }, (_, index) => composeDate(String(year), String(month), String(index + 1))).some(isDeparture);

	function syncDays() {
		const year = yearSelect.value;
		for (const option of Array.from(monthSelect.options)) {
			if (option.value) option.disabled = Boolean(year) && !monthHasDeparture(Number(year), Number(option.value));
		}
		if (monthSelect.selectedOptions[0]?.disabled) monthSelect.value = '';

		const month = monthSelect.value;
		const known = Boolean(year && month);
		const lastDay = known ? daysInMonth(Number(year), Number(month)) : 31;
		for (const option of Array.from(daySelect.options)) {
			if (!option.value) continue;
			const day = Number(option.value);
			option.hidden = day > lastDay;
			option.disabled = known && (day > lastDay || !isDeparture(composeDate(year, month, option.value)));
		}
		if (daySelect.selectedOptions[0]?.disabled) daySelect.value = '';
		dateInput.value = daySelect.value && known ? composeDate(year, month, daySelect.value) : '';
	}

	function preselectNextDeparture() {
		const cursor = new Date(tomorrow);
		for (let i = 0; i < 14; i++, cursor.setDate(cursor.getDate() + 1)) {
			if (!days.includes(weekdayIds[cursor.getDay()])) continue;
			yearSelect.value = String(cursor.getFullYear());
			monthSelect.value = String(cursor.getMonth() + 1);
			return;
		}
	}

	const stepButtons = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-step]'));

	function syncSteppers() {
		for (const button of stepButtons) {
			const input = form.elements.namedItem(button.dataset.target ?? '') as HTMLInputElement | null;
			if (!input) continue;
			const value = Number(input.value);
			const step = Number(button.dataset.step);
			button.disabled = step < 0 ? value <= Number(input.min) : value >= Number(input.max);
		}
	}

	for (const button of stepButtons) {
		button.addEventListener('click', () => {
			const input = form.elements.namedItem(button.dataset.target ?? '') as HTMLInputElement | null;
			if (!input) return;
			const next = Math.min(Math.max((Math.floor(Number(input.value)) || 0) + Number(button.dataset.step), Number(input.min)), Number(input.max));
			input.value = String(next);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}

	function checkDate() {
		if (!dateInput.value || !dateField) return true;
		if (days.includes(weekdayOf(dateInput.value))) return true;
		setFieldError(dateField, `Esta excursión no sale ese día. Sale: ${daysLabel.toLowerCase()}.`);
		return false;
	}

	function recalc() {
		const adults = readCount(adultsInput, 1);
		const children = readCount(childrenInput, 0);
		const people = adults + children;
		const zone = zoneSelect?.value ?? '';
		const tourCost = perGroup ? price : price * adults + childPrice * children;
		const pickupCost = zone ? (fees[zone] ?? 0) * people : null;
		const depositCost = perGroup ? deposit : deposit * people;
		const rest = tourCost + (pickupCost ?? 0) - depositCost;

		const values: Record<string, string> = {
			tour: formatPrice(tourCost),
			pickup: pickupCost === null ? 'Te lo confirmamos' : pickupCost === 0 ? 'Sin cargo' : formatPrice(pickupCost),
			total: formatPrice(tourCost + (pickupCost ?? 0)),
			deposit: formatPrice(depositCost),
			rest: formatPrice(rest),
		};
		for (const [key, value] of Object.entries(values)) {
			const target = summary(key);
			if (target) target.textContent = value;
		}
	}

	function message() {
		const adults = readCount(adultsInput, 1);
		const children = readCount(childrenInput, 0);
		const adultsText = perGroup ? plural(adults, 'persona', 'personas') : plural(adults, 'adulto', 'adultos');
		const people = children > 0 ? `${adultsText} y ${plural(children, 'niño', 'niños')}` : adultsText;
		const zoneName = zoneSelect?.value ? zoneSelect.selectedOptions[0]?.textContent?.trim() : '';
		const date = dateFormatter.format(new Date(`${dateInput.value}T12:00:00Z`));

		return [
			`Hola, quiero reservar ${data.tourTitle}.`,
			`Fecha: ${date}`,
			`Personas: ${people}`,
			`Hotel: ${hotelInput.value.trim()}${zoneName ? ` (zona ${zoneName})` : ''}`,
			'¿Me confirman la disponibilidad y cómo pagar el anticipo?',
		].join('\n');
	}

	clearErrorOnInput(form);
	form.addEventListener('input', recalc);
	form.addEventListener('change', recalc);
	form.addEventListener('input', syncSteppers);
	for (const select of [daySelect, monthSelect, yearSelect]) {
		select.addEventListener('change', () => {
			syncDays();
			checkDate();
		});
	}

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const valid = validateFields(form);
		const dateOk = checkDate();
		if (!valid) return;
		if (!dateOk) {
			daySelect.focus();
			return;
		}

		const url = `${data.whatsappHref}?text=${encodeURIComponent(message())}`;
		const opened = window.open(url, '_blank', 'noopener');
		if (!opened) location.assign(url);
	});

	renderYears();
	preselectNextDeparture();
	syncDays();
	syncSteppers();
	recalc();
}

export function initBookingBar(bar: HTMLElement) {
	const photo = document.querySelector('[data-tour-photo]');
	const targets = [document.getElementById('reservar'), document.querySelector('footer')].filter((target) => target !== null);
	const visible = new Map<Element, boolean>();
	let photoPassed = false;

	const update = () => {
		const show = photoPassed && !Array.from(visible.values()).some(Boolean);
		bar.toggleAttribute('data-visible', show);
		bar.inert = !show;
	};

	const blockers = new IntersectionObserver((entries) => {
		for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
		update();
	});
	targets.forEach((target) => blockers.observe(target));

	if (photo) {
		new IntersectionObserver(([entry]) => {
			photoPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
			update();
		}).observe(photo);
	}
}

export function initStickyCard(card: HTMLElement) {
	const top = 96;
	const bottom = 24;

	const update = () => {
		const overflow = card.offsetHeight + top + bottom - window.innerHeight;
		card.style.top = overflow > 0 ? `${top - overflow}px` : '';
	};

	new ResizeObserver(update).observe(card);
	window.addEventListener('resize', update, { passive: true });
	update();
}
