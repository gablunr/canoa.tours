export function siteOrigin(requestUrl: URL): string {
	if (import.meta.env.DEV) return requestUrl.origin;
	return import.meta.env.SITE.replace(/\/+$/, '');
}
