import { describe, expect, it, vi } from 'vitest';
import { withRetries } from './retry';

describe('withRetries', () => {
	it('returns the first successful result', async () => {
		const load = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('catalog');
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		await expect(withRetries(load, [0, 0])).resolves.toBe('catalog');
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('throws the last error after three attempts', async () => {
		const load = vi.fn().mockRejectedValue(new Error('down'));
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		await expect(withRetries(load, [0, 0])).rejects.toThrow('down');
		expect(load).toHaveBeenCalledTimes(3);
	});
});
