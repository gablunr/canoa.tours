import { existsSync, readFileSync } from 'node:fs';

interface BuiltPage {
	isIndexable: boolean;
	lastModified?: string;
}

const noindexMeta = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/;

const dateModifiedField = /"dateModified":"([^"]+)"/;

function htmlFileFor(outDir: URL, pageUrl: string) {
	const pathname = decodeURIComponent(new URL(pageUrl).pathname).replace(/\/+$/, '');
	return new URL(`.${pathname}/index.html`, outDir);
}

function readBuiltPage(outDir: URL, pageUrl: string): BuiltPage {
	const htmlFile = htmlFileFor(outDir, pageUrl);
	if (!existsSync(htmlFile)) return { isIndexable: false };

	const html = readFileSync(htmlFile, 'utf8');
	return { isIndexable: !noindexMeta.test(html), lastModified: html.match(dateModifiedField)?.[1] };
}

export function builtPageReader(outDir: URL) {
	const pages = new Map<string, BuiltPage>();

	return (pageUrl: string) => {
		const page = pages.get(pageUrl) ?? readBuiltPage(outDir, pageUrl);
		pages.set(pageUrl, page);
		return page;
	};
}
