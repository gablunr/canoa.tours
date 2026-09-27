export type PaginationItem = { kind: 'page'; page: number } | { kind: 'gap'; key: string };

const pages = (from: number, to: number): PaginationItem[] =>
	Array.from({ length: to - from + 1 }, (_, index) => ({ kind: 'page', page: from + index }));

export function paginationItems(current: number, totalPages: number, maxSlots = 7): PaginationItem[] {
	if (totalPages <= maxSlots) return pages(1, totalPages);

	const first: PaginationItem = { kind: 'page', page: 1 };
	const last: PaginationItem = { kind: 'page', page: totalPages };
	const edgeBlock = maxSlots - 2;
	const middleHalf = Math.floor((maxSlots - 4) / 2);

	if (current <= edgeBlock - 1) return [...pages(1, edgeBlock), { kind: 'gap', key: 'end' }, last];
	if (current >= totalPages - (edgeBlock - 2)) {
		return [first, { kind: 'gap', key: 'start' }, ...pages(totalPages - edgeBlock + 1, totalPages)];
	}
	return [
		first,
		{ kind: 'gap', key: 'start' },
		...pages(current - middleHalf, current + middleHalf),
		{ kind: 'gap', key: 'end' },
		last,
	];
}
