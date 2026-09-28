type SiteState = 'live' | 'updating' | 'stale';

const endpoint = '/api/manage/site-status';
const pollIntervalMs = 20 * 1000;
const refreshEvent = 'site-status:refresh';
const siteStates: SiteState[] = ['live', 'updating', 'stale'];

function isSiteState(value: unknown): value is SiteState {
	return typeof value === 'string' && siteStates.includes(value as SiteState);
}

async function fetchSiteState(method: 'GET' | 'POST'): Promise<SiteState | null> {
	try {
		const response = await fetch(endpoint, { method, headers: { Accept: 'application/json' } });
		if (!response.ok) return null;
		const body: unknown = await response.json();
		const state = typeof body === 'object' && body !== null ? (body as { state?: unknown }).state : null;
		return isSiteState(state) ? state : null;
	} catch {
		return null;
	}
}

export function requestSiteStatusRefresh() {
	document.dispatchEvent(new CustomEvent(refreshEvent));
}

export function initSiteStatus(root: HTMLElement) {
	const views = root.querySelectorAll<HTMLElement>('[data-site-status-view]');
	const retryButton = root.querySelector<HTMLButtonElement>('[data-site-status-retry]');
	let pollTimer: number | undefined;

	const render = (state: SiteState) => {
		root.dataset.state = state;
		views.forEach((view) => {
			view.hidden = view.dataset.siteStatusView !== state;
		});
		if (retryButton) {
			retryButton.hidden = state !== 'stale';
			retryButton.disabled = false;
		}
		window.clearTimeout(pollTimer);
		pollTimer = state === 'updating' ? window.setTimeout(poll, pollIntervalMs) : undefined;
	};

	const poll = async () => {
		const state = await fetchSiteState('GET');
		const currentState = root.dataset.state;
		render(state ?? (isSiteState(currentState) ? currentState : 'live'));
	};

	retryButton?.addEventListener('click', async () => {
		retryButton.disabled = true;
		const state = await fetchSiteState('POST');
		if (state) render(state);
		else retryButton.disabled = false;
	});

	document.addEventListener(refreshEvent, poll);

	const initialState = root.dataset.state;
	if (isSiteState(initialState)) render(initialState);
}
