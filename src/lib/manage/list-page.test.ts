import { describe, expect, it } from 'vitest';
import { pageRange, pageState, slicePage } from './list-page';

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('slicePage', () => {
	it('returns the requested page with its range', () => {
		expect(slicePage(numbers(33), 2)).toEqual({ items: numbers(10).map((n) => n + 10), page: 2, totalPages: 4, matchCount: 33, firstShown: 11, lastShown: 20 });
	});

	it('keeps the page inside the available range', () => {
		expect(slicePage(numbers(33), 9).page).toBe(4);
		expect(slicePage(numbers(33), 9).items).toEqual([31, 32, 33]);
		expect(slicePage(numbers(33), 0).page).toBe(1);
		expect(slicePage(numbers(33), Number.NaN).page).toBe(1);
	});

	it('reports one empty page when there is nothing to show', () => {
		expect(slicePage([], 3)).toEqual({ items: [], page: 1, totalPages: 1, matchCount: 0, firstShown: 1, lastShown: 0 });
	});
});

describe('pageState', () => {
	it('describes the requested page of a server count', () => {
		expect(pageState(48, 2, 15)).toEqual({ page: 2, totalPages: 4, matchCount: 48, firstShown: 16, lastShown: 30 });
	});

	it('stops the last page at the match count', () => {
		expect(pageState(48, 4, 15)).toEqual({ page: 4, totalPages: 4, matchCount: 48, firstShown: 46, lastShown: 48 });
	});

	it('keeps the page inside the available range', () => {
		expect(pageState(48, 9, 15).page).toBe(4);
		expect(pageState(48, 0, 15).page).toBe(1);
		expect(pageState(48, -3, 15).page).toBe(1);
		expect(pageState(48, Number.NaN, 15).page).toBe(1);
		expect(pageState(48, 2.7, 15).page).toBe(2);
	});

	it('reports one empty page when nothing matches', () => {
		expect(pageState(0, 5)).toEqual({ page: 1, totalPages: 1, matchCount: 0, firstShown: 1, lastShown: 0 });
	});

	it('uses the default page size', () => {
		expect(pageState(33, 4)).toEqual({ page: 4, totalPages: 4, matchCount: 33, firstShown: 31, lastShown: 33 });
	});
});

describe('pageRange', () => {
	it('returns the inclusive row range for a page', () => {
		expect(pageRange(1, 15)).toEqual([0, 14]);
		expect(pageRange(3, 12)).toEqual([24, 35]);
		expect(pageRange(2)).toEqual([10, 19]);
	});
});
