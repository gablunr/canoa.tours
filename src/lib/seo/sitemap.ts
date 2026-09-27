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

export function builtPageReader(...outDirs: URL[]) {
	const pages = new Map<string, BuiltPage>();

	return (pageUrl: string) => {
		const page = pages.get(pageUrl) ?? readBuiltPage(outDirs, pageUrl);
		pages.set(pageUrl, page);
		return page;
	};
}
