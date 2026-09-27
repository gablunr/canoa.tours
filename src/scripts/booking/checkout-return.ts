const reloadKeyPrefix = 'canoa:booking:checkout-reloads:';
const reloadDelayMs = 4000;
const maxReloads = 6;

function readReloadCount(key: string): number {
	try {
		return Number(sessionStorage.getItem(key) ?? 0) || 0;
	} catch {
		return maxReloads;
	}
}

function writeReloadCount(key: string, count: number): boolean {
	try {
		sessionStorage.setItem(key, String(count));
		return true;
	} catch {
		return false;
	}
}

function showSlowNotice(root: HTMLElement) {
	root.querySelector<HTMLElement>('[data-checkout-message]')?.classList.add('hidden');
	root.querySelector<HTMLElement>('[data-checkout-slow]')?.classList.remove('hidden');
}

export function initProcessingReload(root: HTMLElement) {
	if (root.dataset.checkoutState !== 'processing') return;

	const sessionId = new URL(window.location.href).searchParams.get('session_id') ?? '';
	const key = `${reloadKeyPrefix}${sessionId}`;
	const count = readReloadCount(key);

	if (count >= maxReloads || !writeReloadCount(key, count + 1)) {
		showSlowNotice(root);
		return;
	}

	window.setTimeout(() => window.location.reload(), reloadDelayMs);
}
