import { describe, expect, it } from 'vitest';
import { customerInitials } from './avatar';

describe('customerInitials', () => {
	it('uses the first and last word of the name', () => {
		expect(customerInitials('  maría josé   de la Peña ')).toBe('MP');
	});

	it('uses a single letter for a single name', () => {
		expect(customerInitials('Édison')).toBe('É');
	});
});
