import { actions } from 'astro:actions';
import { actionErrorMessage } from './form-helpers';
import { requestSiteStatusRefresh } from './site-status';

const idleHint = 'Se guarda al elegir.';

function parseHolders(value: string | undefined): Record<string, string> {
	try {
		const parsed: unknown = value ? JSON.parse(value) : {};
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
	} catch {
		return {};
	}
}

export function initMostBooked(panel: HTMLElement) {
	const select = panel.querySelector<HTMLSelectElement>('[data-most-booked]');
	const hint = panel.querySelector<HTMLElement>('[data-most-booked-hint]');
	const status = panel.querySelector<HTMLElement>('[data-most-booked-status]');
	const tourId = panel.dataset.tourId;
	if (!select || !tourId) return;

	const holders = parseHolders(panel.dataset.holders);
	let current = panel.dataset.current ?? '';

	const setStatus = (message: string | null, tone: 'info' | 'error' = 'info') => {
		if (!status) return;
		status.textContent = message ?? '';
		status.hidden = !message;
		status.classList.toggle('text-error', tone === 'error');
		status.classList.toggle('text-secondary', tone === 'info');
	};

	const refreshOptions = () => {
		Array.from(select.options).forEach((option) => {
			if (!option.value) return;
			const holder = holders[option.value];
			option.textContent = holder ? `Puesto ${option.value}, ahora ${holder}` : `Puesto ${option.value}`;
		});
	};

	select.addEventListener('change', async () => {
		const chosen = select.value;
		const replaced = chosen ? holders[chosen] : undefined;
		select.disabled = true;
		setStatus('Guardando…');
		const { error } = await actions.tours.setMostBooked({ id: tourId, position: chosen ? Number(chosen) : null });
		select.disabled = false;
		if (error) {
			select.value = current;
			setStatus(actionErrorMessage(error), 'error');
			return;
		}

		if (chosen) delete holders[chosen];
		current = chosen;
		refreshOptions();
		if (hint) hint.textContent = replaced ? `Sustituye a ${replaced}, que deja de salir.` : idleHint;
		setStatus('Guardado, la web se actualiza en unos minutos.');
		requestSiteStatusRefresh();
	});
}
