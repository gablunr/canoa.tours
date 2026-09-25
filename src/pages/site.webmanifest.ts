import type { APIRoute } from 'astro';
import { company } from '../data/company';
import { siteLanguage } from '../lib/seo';

const brandBackground = '#ffffff';

export const GET: APIRoute = () => {
	const manifest = {
		name: company.brandName,
		short_name: company.brandName,
		description: company.description,
		lang: siteLanguage,
		start_url: '/',
		display: 'standalone',
		background_color: brandBackground,
		theme_color: brandBackground,
		icons: [
			{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
			{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
			{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
	};

	return new Response(JSON.stringify(manifest, null, '\t'), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
};
