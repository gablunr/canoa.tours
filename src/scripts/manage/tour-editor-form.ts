import type { TourContent, TourDuration, TourOperations, PricingMode, PregnancyPolicyValue } from '../../lib/tours/tour-schema';
import { readObjectList, readTextList } from './list-editor';
import { readWeekdays } from './weekday-picker';

export interface ZoneOption {
	id: string;
	name: string;
}

export interface FieldIssue {
	path: readonly PropertyKey[];
	message: string;
}

export interface FieldProblem {
	target: HTMLElement;
	label: string;
}

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isControl = (element: unknown): element is FormControl =>
	element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;

function control(form: HTMLFormElement, name: string) {
	const element = form.elements.namedItem(name);
	return isControl(element) ? element : null;
}

const textOf = (form: HTMLFormElement, name: string) => control(form, name)?.value.trim() ?? '';

function numberOrNull(form: HTMLFormElement, name: string) {
	const value = textOf(form, name).replace(',', '.');
	return value === '' ? null : Number(value);
}

const numberOrNaN = (form: HTMLFormElement, name: string) => numberOrNull(form, name) ?? Number.NaN;

const isChecked = (form: HTMLFormElement, name: string) => {
	const element = control(form, name);
	return element instanceof HTMLInputElement && element.checked;
};

function checkedRadio(form: HTMLFormElement, name: string) {
	const checked = form.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"]:checked`);
	return checked?.value ?? null;
}

const listRoot = (form: HTMLFormElement, name: string) => form.querySelector<HTMLElement>(`[data-list-editor][data-list-name="${name}"]`);

const textList = (form: HTMLFormElement, name: string) => {
	const root = listRoot(form, name);
	return root ? readTextList(root) : [];
};

const objectList = (form: HTMLFormElement, name: string) => {
	const root = listRoot(form, name);
	return root ? readObjectList(root) : [];
};

export function collectContent(form: HTMLFormElement): TourContent {
	const pregnancy = checkedRadio(form, 'pregnancy') as PregnancyPolicyValue | null;
	return {
		name: textOf(form, 'name'),
		shortName: textOf(form, 'shortName'),
		slug: textOf(form, 'slug'),
		destinationSlug: textOf(form, 'destinationSlug'),
		summary: textOf(form, 'summary'),
		ageNote: textOf(form, 'ageNote'),
		imageAlt: textOf(form, 'imageAlt'),
		highlights: textList(form, 'highlights'),
		includes: textList(form, 'includes'),
		excludes: textList(form, 'excludes'),
		bring: textList(form, 'bring'),
		itinerary: objectList(form, 'itinerary').map((step) => ({
			...(step.time ? { time: step.time } : {}),
			title: step.title ?? '',
			text: step.text ?? '',
		})),
		faqs: objectList(form, 'faqs').map((faq) => ({ question: faq.question ?? '', answer: faq.answer ?? '' })),
		bestFor: textOf(form, 'bestFor'),
		includesSummary: textOf(form, 'includesSummary'),
		minAge: numberOrNull(form, 'minAge'),
		pregnancy,
		pregnancyMaxMonths: pregnancy === 'limited' ? numberOrNull(form, 'pregnancyMaxMonths') : null,
		wheelchair: isChecked(form, 'wheelchair'),
	};
}

export function servedZones(form: HTMLFormElement, zones: ZoneOption[]) {
	return zones.filter((zone) => isChecked(form, `serves-${zone.id}`));
}

export function collectOperations(form: HTMLFormElement, zones: ZoneOption[]): TourOperations {
	const pricingMode = (checkedRadio(form, 'pricingMode') ?? 'per_person') as PricingMode;
	const perGroup = pricingMode === 'per_group';
	const hasChildPrice = !perGroup && isChecked(form, 'childPrice');
	const weekdayPicker = form.querySelector<HTMLElement>('[data-weekday-picker]');
	return {
		pricingMode,
		maxGroupSize: perGroup ? numberOrNull(form, 'maxGroupSize') : null,
		dailyCapacity: numberOrNaN(form, 'dailyCapacity'),
		infantsOccupySeat: isChecked(form, 'infantsOccupySeat'),
		depositValue: numberOrNull(form, 'depositValue'),
		priceUnit: textOf(form, 'priceUnit'),
		meetingPoint: textOf(form, 'meetingPoint'),
		durationCategory: (textOf(form, 'durationCategory') || null) as TourDuration | null,
		durationHours: numberOrNull(form, 'durationHours'),
		departurePort: (textOf(form, 'departurePort') || null) as TourOperations['departurePort'],
		schedule: {
			startTime: textOf(form, 'startTime') || null,
			pickupTo: textOf(form, 'pickupTo') || null,
			returnAt: textOf(form, 'returnAt') || null,
			weekdays: weekdayPicker ? readWeekdays(weekdayPicker) : [],
		},
		prices: {
			base: numberOrNull(form, 'basePrice'),
			child: hasChildPrice
				? { amount: numberOrNaN(form, 'childAmount'), minAge: numberOrNaN(form, 'childMinAge'), maxAge: numberOrNaN(form, 'childMaxAge') }
				: null,
		},
		pickupFees: servedZones(form, zones).map((zone) => ({ zoneId: zone.id, fee: numberOrNaN(form, `fee-${zone.id}`) })),
	};
}

const operationFieldNames: Record<string, string> = {
	'schedule.startTime': 'startTime',
	'schedule.pickupTo': 'pickupTo',
	'schedule.returnAt': 'returnAt',
	'schedule.weekdays': 'weekdays',
	'schedule': 'weekdays',
	'prices.base': 'basePrice',
	'prices.child': 'childAmount',
	'prices.child.amount': 'childAmount',
	'prices.child.minAge': 'childMinAge',
	'prices.child.maxAge': 'childMaxAge',
	'prices': 'basePrice',
};

const listItemNames: Record<string, string> = { itinerary: 'Paso', faqs: 'Pregunta', highlights: 'Punto', includes: 'Elemento', excludes: 'Elemento', bring: 'Elemento' };

const rowIsFilled = (row: HTMLElement) =>
	Array.from(row.querySelectorAll<FormControl>('[data-list-field]')).some((field) => field.value.trim().length > 0);

function filledListRow(form: HTMLFormElement, name: string, index: number) {
	const root = listRoot(form, name);
	const rows = Array.from(root?.querySelectorAll<HTMLElement>('[data-list-rows] > [data-list-row]') ?? []).filter(rowIsFilled);
	return rows[index] ?? null;
}

const fieldById = (form: HTMLFormElement, id: string) => form.querySelector<HTMLElement>(`#${CSS.escape(id)}`);

export function fieldContainer(target: HTMLElement) {
	return target.closest<HTMLElement>('[data-field]') ?? target;
}

function errorElementOf(container: HTMLElement) {
	return container.querySelector<HTMLElement>(':scope > [data-field-error]') ?? container.querySelector<HTMLElement>('[data-field-error]');
}

function firstText(element: Element | null) {
	if (!element) return '';
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent?.trim();
		if (text) return text;
	}
	return '';
}

export function fieldLabelOf(target: HTMLElement) {
	const ariaLabel = target.getAttribute('aria-label');
	if (ariaLabel) return ariaLabel;
	const container = fieldContainer(target);
	return firstText(container.querySelector(':scope > legend, :scope > label, label, legend')) || 'Un campo';
}

export function showFieldError(target: HTMLElement, message: string) {
	const container = fieldContainer(target);
	const errorElement = errorElementOf(container);
	if (errorElement) {
		errorElement.textContent = message;
		errorElement.hidden = false;
	}
	if (isControl(target)) target.setAttribute('aria-invalid', 'true');
	else container.setAttribute('aria-invalid', 'true');
}

export function clearFieldErrors(root: ParentNode) {
	root.querySelectorAll<HTMLElement>('[data-field-error]').forEach((element) => {
		element.textContent = '';
		element.hidden = true;
	});
	root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function locateContentIssue(form: HTMLFormElement, path: readonly PropertyKey[]) {
	const [name, index, field] = path.map(String);
	if ((name === 'itinerary' || name === 'faqs' || name in listItemNames) && index !== undefined) {
		const row = filledListRow(form, name, Number(index));
		const rowControl = row?.querySelector<HTMLElement>(field ? `[data-list-field="${field}"]` : '[data-list-field]');
		const list = fieldById(form, `field-${name}`);
		return { target: list, rowControl, prefix: `${listItemNames[name] ?? 'Fila'} ${Number(index) + 1}: ` };
	}
	return { target: fieldById(form, `field-${name}`), rowControl: null, prefix: '' };
}

function locateOperationsIssue(form: HTMLFormElement, path: readonly PropertyKey[], zones: ZoneOption[]) {
	const keys = path.map(String);
	if (keys[0] === 'pickupFees' && keys[1] !== undefined) {
		const zone = servedZones(form, zones)[Number(keys[1])];
		return { target: zone ? fieldById(form, `field-fee-${zone.id}`) : fieldById(form, 'field-pickupFees'), rowControl: null, prefix: '' };
	}
	const joined = keys.join('.');
	const name = operationFieldNames[joined] ?? operationFieldNames[keys.slice(0, 2).join('.')] ?? keys[0];
	return { target: fieldById(form, `field-${name}`), rowControl: null, prefix: '' };
}

function locateImageIssue(form: HTMLFormElement, path: readonly PropertyKey[]) {
	const [index, field] = path.map(String);
	if (index !== undefined && field === 'alt') {
		const photo = form.querySelectorAll<HTMLElement>('[data-photo][data-photo-ready]')[Number(index)];
		const altInput = photo?.querySelector<HTMLElement>('[data-photo-alt]');
		if (altInput) return { target: altInput, rowControl: null, prefix: '' };
	}
	return { target: fieldById(form, 'field-photos'), rowControl: null, prefix: '' };
}

export type IssueScope = 'content' | 'operations' | 'images';

export function reportIssues(form: HTMLFormElement, scope: IssueScope, issues: readonly FieldIssue[], zones: ZoneOption[]): FieldProblem[] {
	const problems: FieldProblem[] = [];
	const seen = new Set<HTMLElement>();
	for (const issue of issues) {
		const located =
			scope === 'content' ? locateContentIssue(form, issue.path) : scope === 'operations' ? locateOperationsIssue(form, issue.path, zones) : locateImageIssue(form, issue.path);
		const target = located.target ?? fieldById(form, 'field-name');
		if (!target || seen.has(located.rowControl ?? target)) continue;
		seen.add(located.rowControl ?? target);
		showFieldError(target, `${located.prefix}${issue.message}`);
		if (located.rowControl) located.rowControl.setAttribute('aria-invalid', 'true');
		problems.push({ target: located.rowControl ?? target, label: fieldLabelOf(target) });
	}
	return problems;
}
