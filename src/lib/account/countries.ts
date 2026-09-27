const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const regionNames = new Intl.DisplayNames(['es'], { type: 'region', fallback: 'none' });

const nonCountryCodes = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ']);

export const countryOptions = [...alphabet]
	.flatMap((first) => [...alphabet].map((second) => `${first}${second}`))
	.filter((code) => !nonCountryCodes.has(code))
	.map((code) => ({ value: code, label: regionNames.of(code) }))
	.filter((option): option is { value: string; label: string } => Boolean(option.label) && option.label !== option.value)
	.sort((a, b) => a.label.localeCompare(b.label, 'es'));
