const storageKey = 'canoa:cookie-notice';

function wasDismissed(): boolean {
	try {
		return localStorage.getItem(storageKey) !== null;
	} catch {
		return false;
	}
}

function rememberDismissal(): void {
	try {
		localStorage.setItem(storageKey, new Date().toISOString());
	} catch {
		return;
	}
}

export function initCookieNotice(): void {
	const notice = document.querySelector<HTMLElement>('[data-cookie-notice]');
	if (!notice || wasDismissed()) return;
	notice.hidden = false;
	notice.querySelector('[data-cookie-notice-dismiss]')?.addEventListener('click', () => {
		rememberDismissal();
		notice.hidden = true;
	});
}
