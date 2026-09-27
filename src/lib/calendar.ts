const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function isValidMonth(month: string | null): month is string {
	return month !== null && monthPattern.test(month);
}

export function shiftMonth(month: string, offset: number) {
	const [year = 0, monthNumber = 1] = month.split('-').map(Number);
	const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
	return shifted.toISOString().slice(0, 7);
}

export function monthBounds(month: string) {
	const first = `${month}-01`;
	const nextFirst = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
	const last = new Date(nextFirst.getTime() - 86_400_000).toISOString().slice(0, 10);
	return { first, last };
}

const monthLabelFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatMonthLabel(month: string) {
	const label = monthLabelFormatter.format(new Date(`${month}-01T12:00:00Z`));
	return label.charAt(0).toUpperCase() + label.slice(1);
}

export function leadingBlankDays(month: string) {
	const weekday = new Date(`${month}-01T12:00:00Z`).getUTCDay();
	return (weekday + 6) % 7;
}

export const weekdays = [
	{ short: 'L', long: 'Lunes' },
	{ short: 'M', long: 'Martes' },
	{ short: 'X', long: 'Miércoles' },
	{ short: 'J', long: 'Jueves' },
	{ short: 'V', long: 'Viernes' },
	{ short: 'S', long: 'Sábado' },
	{ short: 'D', long: 'Domingo' },
] as const;

export function localToday(timeZone = 'America/Santo_Domingo'): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
	return `${part('year')}-${part('month')}-${part('day')}`;
}
