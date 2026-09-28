const wordsPerMinute = 200;

const longDateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' });

export const formatLongDate = (date: Date) => longDateFormatter.format(date);

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const latestDate = (dates: Date[]) => (dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined);

export function estimateReadingMinutes(text = '') {
	const wordCount = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

const priceFormatter = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

export const formatPrice = (amount: number) =>
	`US$${Number.isInteger(amount) ? priceFormatter.format(amount) : amount.toFixed(2).replace('.', ',')}`;
