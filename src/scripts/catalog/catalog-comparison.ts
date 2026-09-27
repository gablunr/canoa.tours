type SortKey = 'price' | 'hours';
type SortDirection = 'ascending' | 'descending';

const countText = (count: number) => `${count} ${count === 1 ? 'excursión' : 'excursiones'}`;

export function initCatalogComparison(root: HTMLElement) {
	const body = root.querySelector<HTMLElement>('[data-comparison-body]');
	const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('[data-comparison-row]'));
	const zoneSelect = root.querySelector<HTMLSelectElement>('[data-comparison-zone]');
	const zoneName = root.querySelector<HTMLElement>('[data-comparison-zone-name]');
	const dayInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="comparison-day"]'));
	const pregnancy = root.querySelector<HTMLInputElement>('[data-comparison-pregnancy]');
	const wheelchair = root.querySelector<HTMLInputElement>('[data-comparison-wheelchair]');
	const sortButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-sort]'));
	const toggle = root.querySelector<HTMLButtonElement>('[data-comparison-toggle]');
	const empty = root.querySelector<HTMLElement>('[data-comparison-empty]');
	const count = root.querySelector<HTMLElement>('[data-comparison-count]');
	const reset = root.querySelector<HTMLButtonElement>('[data-comparison-reset]');
	if (!body || rows.length === 0 || !zoneSelect || !toggle) return;

	const collapsedRowsBySize = JSON.parse(root.dataset.collapsedRows ?? '{}') as Partial<Record<'phone' | 'tablet' | 'desktop', number>>;
	const tabletQuery = matchMedia('(min-width: 48rem)');
	const desktopQuery = matchMedia('(min-width: 64rem)');
	const collapsedRows = () =>
		(desktopQuery.matches ? collapsedRowsBySize.desktop : tabletQuery.matches ? collapsedRowsBySize.tablet : collapsedRowsBySize.phone) ??
		rows.length;
	let sortKey: SortKey = 'price';
	let sortDirection: SortDirection = 'ascending';
	let expanded = false;

	const selectedDay = () => dayInputs.find((input) => input.checked)?.value ?? '';

	const matches = (row: HTMLTableRowElement) => {
		const day = selectedDay();
		if (day && !row.dataset.days?.split(' ').includes(day)) return false;
		if (pregnancy?.checked && row.dataset.pregnancy === 'not-allowed') return false;
		if (wheelchair?.checked && row.dataset.wheelchair !== 'true') return false;
		return true;
	};

	const sortRows = () => {
		const factor = sortDirection === 'ascending' ? 1 : -1;
		const value = (row: HTMLTableRowElement, key: SortKey) => Number(row.dataset[key]);
		const other: SortKey = sortKey === 'price' ? 'hours' : 'price';
		const sorted = [...rows].sort(
			(a, b) => factor * (value(a, sortKey) - value(b, sortKey)) || value(a, other) - value(b, other),
		);
		body.append(...sorted);

		for (const button of sortButtons) {
			const column = button.closest('th');
			if (!column) continue;
			if (button.dataset.sort === sortKey) column.setAttribute('aria-sort', sortDirection);
			else column.removeAttribute('aria-sort');
		}
	};

	const update = () => {
		const zone = zoneSelect.value;
		const day = selectedDay();
		for (const row of rows) {
			row.toggleAttribute('data-excluded', !matches(row));
			const pickup = row.querySelector<HTMLElement>('[data-comparison-pickup]');
			const labels = JSON.parse(row.dataset.pickup ?? '{}') as Record<string, string>;
			if (pickup && labels[zone]) pickup.textContent = labels[zone];
			for (const dot of row.querySelectorAll<HTMLElement>('[data-weekday]')) {
				dot.toggleAttribute('data-selected', dot.dataset.weekday === day);
			}
		}
		if (zoneName) zoneName.textContent = zoneSelect.selectedOptions[0]?.textContent ?? '';

		const visible = Array.from(body.querySelectorAll<HTMLTableRowElement>('[data-comparison-row]')).filter(
			(row) => !row.hidden && !row.hasAttribute('data-excluded'),
		);
		const limit = collapsedRows();
		visible.forEach((row, index) => row.toggleAttribute('data-collapsed', !expanded && index >= limit));
		for (const row of rows) if (row.hidden || row.hasAttribute('data-excluded')) row.removeAttribute('data-collapsed');

		const foldable = visible.length > limit;
		toggle.hidden = !foldable;
		toggle.setAttribute('aria-expanded', String(expanded));
		toggle.textContent = expanded ? 'Ver menos' : `Ver las ${countText(visible.length)}`;
		if (empty) empty.hidden = visible.length > 0;
		if (count) {
			count.textContent =
				visible.length === 0 ? '' : foldable && !expanded ? `${limit} de ${countText(visible.length)}` : countText(visible.length);
		}
	};

	for (const button of sortButtons) {
		button.addEventListener('click', () => {
			const key = button.dataset.sort as SortKey;
			sortDirection = key === sortKey && sortDirection === 'ascending' ? 'descending' : 'ascending';
			sortKey = key;
			sortRows();
			update();
		});
	}

	toggle.addEventListener('click', () => {
		expanded = !expanded;
		update();
		if (!expanded) root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	});

	reset?.addEventListener('click', () => {
		const anyDay = dayInputs.find((input) => input.value === '');
		if (anyDay) anyDay.checked = true;
		if (pregnancy) pregnancy.checked = false;
		if (wheelchair) wheelchair.checked = false;
		update();
	});

	root.addEventListener('change', update);
	tabletQuery.addEventListener('change', update);
	desktopQuery.addEventListener('change', update);

	document.addEventListener('change', (event) => {
		if ((event.target as HTMLInputElement).name === 'duracion') setTimeout(update);
	});

	sortRows();
	update();
	setTimeout(update);
}
