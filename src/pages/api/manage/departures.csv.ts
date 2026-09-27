import type { APIRoute } from 'astro';
import { dbErrorCode } from '../../../lib/booking/errors';
import { loadManifest, manifestCsv } from '../../../lib/manage/manifest';

export const prerender = false;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const utf8ByteOrderMark = '﻿';

export const GET: APIRoute = async ({ url, locals }) => {
	const date = url.searchParams.get('date') ?? '';
	if (!isoDatePattern.test(date) || Number.isNaN(Date.parse(date))) {
		return Response.json({ error: 'invalid_date' }, { status: 400 });
	}

	try {
		const groups = await loadManifest(locals.supabase, date);
		const csv = manifestCsv(groups.flatMap((group) => group.rows));
		return new Response(utf8ByteOrderMark + csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="salidas-${date}.csv"`,
				'Cache-Control': 'no-store',
			},
		});
	} catch (error) {
		if (dbErrorCode(error) === 'forbidden') return Response.json({ error: 'forbidden' }, { status: 403 });
		console.error('departures csv failed', error);
		return Response.json({ error: 'manifest_failed' }, { status: 500 });
	}
};
