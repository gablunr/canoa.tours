export function initBookingsFilters(form: HTMLFormElement) {
	form.querySelectorAll<HTMLSelectElement>('[data-auto-submit]').forEach((select) => {
		select.addEventListener('change', () => form.requestSubmit());
	});
}
