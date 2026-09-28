import type { APIRoute, GetStaticPaths } from 'astro';
import { renderShareCard } from '../../lib/seo/share-card-image';
import { shareCardFile, shareCards, type ShareCard } from '../../lib/seo/share-cards';

export const getStaticPaths = (async () =>
	(await shareCards()).map((card) => ({ params: { path: shareCardFile(card) }, props: { card } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ card: ShareCard }> = async ({ props }) =>
	new Response(new Uint8Array(await renderShareCard(props.card)), { headers: { 'Content-Type': 'image/jpeg' } });
