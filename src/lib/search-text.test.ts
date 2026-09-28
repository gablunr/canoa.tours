import { describe, expect, it } from 'vitest';
import { accentInsensitivePattern, normalizeSearchText } from './search-text';

describe('normalizeSearchText', () => {
	it('ignores accents, case and extra spaces', () => {
		expect(normalizeSearchText('  Bávaro   PRÍNCIPE Ñandú ')).toBe('bavaro principe nandu');
	});
});

describe('accentInsensitivePattern', () => {
	const matches = (term: string, text: string) => new RegExp(accentInsensitivePattern(term), 'i').test(text);

	it('matches with or without accents on either side', () => {
		expect(matches('jose', 'José Pérez')).toBe(true);
		expect(matches('josé', 'Jose Perez')).toBe(true);
		expect(matches('nuñez', 'Nunez')).toBe(true);
		expect(matches('BAVARO', 'Hotel Bávaro')).toBe(true);
	});

	it('treats regex syntax as a single wildcard character', () => {
		expect(accentInsensitivePattern('a.b+c')).not.toMatch(/\\/);
		expect(matches('juan.perez', 'juan.perez@example.com')).toBe(true);
		expect(matches('+34', '+34 600 000 000')).toBe(true);
	});
});
