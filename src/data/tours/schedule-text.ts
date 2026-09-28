export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export type Weekday = (typeof weekdays)[number];

const weekdayNames: Record<Weekday, { one: string; many: string }> = {
	monday: { one: 'lunes', many: 'lunes' },
	tuesday: { one: 'martes', many: 'martes' },
	wednesday: { one: 'miércoles', many: 'miércoles' },
	thursday: { one: 'jueves', many: 'jueves' },
	friday: { one: 'viernes', many: 'viernes' },
	saturday: { one: 'sábado', many: 'sábados' },
	sunday: { one: 'domingo', many: 'domingos' },
};

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function dayRun(days: Weekday[]) {
	const set = new Set(days);
	const starts = weekdays.filter((day, index) => set.has(day) && !set.has(weekdays[(index + 6) % 7]));
	if (days.length < 3 || starts.length !== 1) return undefined;

	const first = weekdays.indexOf(starts[0]);
	return { first: starts[0], last: weekdays[(first + set.size - 1) % 7] };
}

type ScheduleShape = { kind: 'daily' } | { kind: 'run'; first: string; last: string } | { kind: 'list'; names: string };

function scheduleShape(days: Weekday[]): ScheduleShape {
	if (new Set(days).size === weekdays.length) return { kind: 'daily' };

	const run = dayRun(days);
	if (run) return { kind: 'run', first: weekdayNames[run.first].one, last: weekdayNames[run.last].one };

	const names = weekdays.filter((day) => days.includes(day)).map((day) => weekdayNames[day].many);
	return { kind: 'list', names: listFormat.format(names) };
}

export function scheduleLabel(days: Weekday[]) {
	const shape = scheduleShape(days);
	if (shape.kind === 'daily') return 'Todos los días';
	if (shape.kind === 'run') return `De ${shape.first} a ${shape.last}`;
	return capitalize(shape.names);
}

export function scheduleWhen(days: Weekday[]) {
	const shape = scheduleShape(days);
	if (shape.kind === 'daily') return 'todos los días';
	if (shape.kind === 'run') return `de ${shape.first} a ${shape.last}`;
	return `los ${shape.names}`;
}

export const scheduleSentence = (days: Weekday[]) => `sale ${scheduleWhen(days)}`;

export const weekdayLabel = (day: Weekday) => capitalize(weekdayNames[day].one);

export const weekdaysFromIso = (isoDays: readonly number[]) =>
	weekdays.filter((_, index) => isoDays.includes(index + 1));
