export const listPageSize = 10;

export interface ListPageState {
	page: number;
	totalPages: number;
	matchCount: number;
	firstShown: number;
	lastShown: number;
}

export interface ListPage<Item> extends ListPageState {
	items: Item[];
}

export function pageState(matchCount: number, requestedPage: number, pageSize = listPageSize): ListPageState {
	const totalPages = Math.max(1, Math.ceil(matchCount / pageSize));
	const page = Number.isFinite(requestedPage) ? Math.min(Math.max(Math.trunc(requestedPage), 1), totalPages) : 1;
	const firstIndex = (page - 1) * pageSize;
	return { page, totalPages, matchCount, firstShown: firstIndex + 1, lastShown: Math.min(firstIndex + pageSize, matchCount) };
}

export function pageRange(page: number, pageSize = listPageSize): [number, number] {
	const from = (page - 1) * pageSize;
	return [from, from + pageSize - 1];
}

export function slicePage<Item>(items: Item[], requestedPage: number, pageSize = listPageSize): ListPage<Item> {
	const state = pageState(items.length, requestedPage, pageSize);
	return { items: items.slice(state.firstShown - 1, state.lastShown), ...state };
}
