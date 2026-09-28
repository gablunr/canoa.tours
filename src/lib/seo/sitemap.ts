import { existsSync, readFileSync } from 'node:fs';

interface BuiltPage {
	isIndexable: boolean;
	lastModified?: string;
}

const noindexMeta = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/;

const dateModifiedField = /"dateModified":"([^"]+)"/;

function htmlFileFor(outDirs: URL[], pageUrl: string) {
	const pathname = decodeURIComponent(new URL(pageUrl).pathname).replace(/\/+$/, '');
	return outDirs.map((outDir) => new URL(`.${pathname}/index.html`, outDir)).find((htmlFile) => existsSync(htmlFile));
}

function readBuiltPage(outDirs: URL[], pageUrl: string): BuiltPage {
	const htmlFile = htmlFileFor(outDirs, pageUrl);
	if (!htmlFile) return { isIndexable: false };

	const html = readFileSync(htmlFile, 'utf8');
	return { isIndexable: !noindexMeta.test(html), lastModified: html.match(dateModifiedField)?.[1] };
}

async function fetchLatestReviewDate(supabaseUrl: string, publishableKey: string) {
	const endpoint = new URL('/rest/v1/reviews', supabaseUrl);
	endpoint.search = new URLSearchParams({
		select: 'published_at',
		status: 'eq.published',
		locale: 'eq.es',
		published_at: 'not.is.null',
		order: 'published_at.desc',
		limit: '1',
	}).toString();
	const response = await fetch(endpoint, { headers: { apikey: publishableKey } });
	if (!response.ok) return undefined;
	const [latest] = (await response.json()) as { published_at: string }[];
	return latest?.published_at;
}

export function latestReviewDateReader(supabaseUrl?: string, publishableKey?: string) {
	let latest: Promise<string | undefined> | undefined;

	return () => {
		if (!supabaseUrl || !publishableKey) return Promise.resolve(undefined);
		latest ??= fetchLatestReviewDate(supabaseUrl, publishableKey).catch(() => undefined);
		return latest;
	};
}

export function builtPageReader(...outDirs: URL[]) {
	const pages = new Map<string, BuiltPage>();

	return (pageUrl: string) => {
		const page = pages.get(pageUrl) ?? readBuiltPage(outDirs, pageUrl);
		pages.set(pageUrl, page);
		return page;
	};
}
