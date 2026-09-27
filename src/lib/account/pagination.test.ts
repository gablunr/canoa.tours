import { describe, expect, it } from 'vitest';
import { paginationItems } from './pagination';

const labels = (current: number, total: number, maxSlots?: number) =>
	paginationItems(current, total, maxSlots).map((item) => (item.kind === 'page' ? String(item.page) : '…'));

describe('paginationItems with seven slots', () => {
	it('shows every page when there are seven or fewer', () => {
		expect(labels(1, 1)).toEqual(['1']);
		expect(labels(3, 6)).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(labels(7, 7)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
	});

	it('collapses the end near the first pages', () => {
		expect(labels(1, 12)).toEqual(['1', '2', '3', '4', '5', '…', '12']);
		expect(labels(4, 12)).toEqual(['1', '2', '3', '4', '5', '…', '12']);
	});

	it('collapses the start near the last pages', () => {
		expect(labels(12, 12)).toEqual(['1', '…', '8', '9', '10', '11', '12']);
		expect(labels(9, 12)).toEqual(['1', '…', '8', '9', '10', '11', '12']);
	});

	it('collapses both sides in the middle', () => {
		expect(labels(6, 12)).toEqual(['1', '…', '5', '6', '7', '…', '12']);
	});
});

describe('paginationItems with five slots', () => {
	it('shows every page when there are five or fewer', () => {
		expect(labels(2, 5, 5)).toEqual(['1', '2', '3', '4', '5']);
	});

	it('keeps the edges and the current page', () => {
		expect(labels(1, 16, 5)).toEqual(['1', '2', '3', '…', '16']);
		expect(labels(2, 16, 5)).toEqual(['1', '2', '3', '…', '16']);
		expect(labels(6, 16, 5)).toEqual(['1', '…', '6', '…', '16']);
		expect(labels(15, 16, 5)).toEqual(['1', '…', '14', '15', '16']);
		expect(labels(16, 16, 5)).toEqual(['1', '…', '14', '15', '16']);
	});

	it('never uses more than five slots', () => {
		for (let current = 1; current <= 16; current += 1) {
			expect(paginationItems(current, 16, 5)).toHaveLength(5);
		}
	});
});
