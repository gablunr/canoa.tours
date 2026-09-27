const allValue = 'todas';
const param = 'duracion';

const countText = (count: number) => `${count} ${count === 1 ? 'excursión' : 'excursiones'}`;

export function initCatalogFilter(root: HTMLElement | null) {
	if (!root) return;
	const inputs = Array.from(root.querySelectorAll<HTMLInputElement>(`input[name="${param}"]`));
	const items = Array.from(root.querySelectorAll<HTMLElement>('[data-duration]'));
	const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-group]'));
	const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-section-nav-link]'));
	const count = root.querySelector<HTMLElement>('[data-catalog-count]');
	const fieldset = inputs[0]?.closest('fieldset');
	if (inputs.length === 0 || !fieldset) return;

	const values = new Set(inputs.map((input) => input.value));
	const matches = (item: HTMLElement, value: string) => value === allValue || item.dataset.duration === value;

	const hidesTarget = (value: string) => {
		const target = root.querySelector<HTMLElement>(`section[data-catalog-group="${CSS.escape(decodeURIComponent(location.hash.slice(1)))}"]`);
		return target !== null && !Array.from(target.querySelectorAll<HTMLElement>('[data-duration]')).some((item) => matches(item, value));
	};

	const apply = (value: string) => {
		for (const item of items) item.hidden = !matches(item, value);
		for (const group of groups) {
			group.hidden = !group.querySelector('[data-duration]:not([hidden])');
			if (group.tagName !== 'SECTION') continue;
			const link = navLinks.find((candidate) => candidate.hash === `#${group.dataset.catalogGroup}`);
			const listItem = link?.closest('li');
			if (listItem) listItem.hidden = group.hidden;
		}
		if (count) count.textContent = countText(items.filter((item) => item.tagName === 'LI' && !item.hidden).length);

		const url = new URL(location.href);
		if (value === allValue) url.searchParams.delete(param);
		else url.searchParams.set(param, value);
		history.replaceState(history.state, '', url);
	};

	const select = (value: string) => {
		const input = inputs.find((candidate) => candidate.value === value) ?? inputs[0];
		input.checked = true;
		apply(input.value);
	};

	const requested = new URLSearchParams(location.search).get(param) ?? allValue;
	const initial = values.has(requested) ? requested : allValue;
	select(hidesTarget(initial) ? allValue : initial);

	fieldset.addEventListener('change', (event) => {
		const input = event.target as HTMLInputElement;
		if (input.name === param) apply(input.value);
	});

	window.addEventListener('hashchange', () => {
		const current = inputs.find((input) => input.checked)?.value ?? allValue;
		if (hidesTarget(current)) {
			select(allValue);
			document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
		}
	});
}
