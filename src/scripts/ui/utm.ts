export interface Utm {
	source?: string;
	medium?: string;
	campaign?: string;
	term?: string;
	content?: string;
}

const storageKey = 'canoa:utm';
const maxValueLength = 200;
const utmKeys = ['source', 'medium', 'campaign', 'term', 'content'] as const;

function utmFromUrl(url: URL): Utm | undefined {
	const utm: Utm = {};
	for (const key of utmKeys) {
		const value = url.searchParams.get(`utm_${key}`)?.trim();
		if (value) utm[key] = value.slice(0, maxValueLength);
	}
	return Object.keys(utm).length > 0 ? utm : undefined;
}

export function readUtm(): Utm | undefined {
	try {
		const stored = sessionStorage.getItem(storageKey);
		if (!stored) return undefined;
		const parsed: unknown = JSON.parse(stored);
		if (!parsed || typeof parsed !== 'object') return undefined;
		const utm: Utm = {};
		for (const key of utmKeys) {
			const value = (parsed as Record<string, unknown>)[key];
			if (typeof value === 'string' && value) utm[key] = value.slice(0, maxValueLength);
		}
		return Object.keys(utm).length > 0 ? utm : undefined;
	} catch {
		return undefined;
	}
}

export function captureUtm(): void {
	const utm = utmFromUrl(new URL(window.location.href));
	if (!utm) return;
	try {
		if (sessionStorage.getItem(storageKey)) return;
		sessionStorage.setItem(storageKey, JSON.stringify(utm));
	} catch {
		return;
	}
}
