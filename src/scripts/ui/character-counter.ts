const wiredCounters = new WeakSet<HTMLElement>();

export function wireCharacterCounters(root: ParentNode) {
	root.querySelectorAll<HTMLElement>('[data-count-for]').forEach((counter) => {
		if (wiredCounters.has(counter)) return;
		const field = document.getElementById(counter.dataset.countFor ?? '');
		if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement)) return;
		wiredCounters.add(counter);
		field.addEventListener('input', () => (counter.textContent = String(field.value.length)));
	});
}
