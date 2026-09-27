import type { APIRoute } from 'astro';
import { aiCrawlers } from '../data/site/ai-crawlers';
import { absoluteUrl } from '../lib/seo/seo';

const group = (userAgents: string[]) => [...userAgents.map((userAgent) => `User-agent: ${userAgent}`), 'Allow: /', ''];

export const GET: APIRoute = () => {
	const body = [...group(aiCrawlers), ...group(['*']), `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`, ''].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
