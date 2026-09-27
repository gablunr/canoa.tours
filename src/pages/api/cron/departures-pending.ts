import type { APIRoute } from 'astro';
import { TEAM_EMAIL } from 'astro:env/server';
import { isAuthorizedCron, localDate, unauthorizedCronResponse } from '../../../lib/cron';
import { sendEmail } from '../../../lib/email/send';
import { teamDeparturesPendingEmail } from '../../../lib/email/templates/team-departures-pending';
import { groupManifestRows, loadManifest } from '../../../lib/manage/manifest';
import { siteOrigin } from '../../../lib/site-origin';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
	if (!isAuthorizedCron(request)) return unauthorizedCronResponse();

	const tomorrow = localDate(1);
	let groups;
	try {
		groups = await loadManifest(supabaseAdmin, tomorrow);
	} catch (error) {
		console.error('departures pending manifest failed', error);
		return Response.json({ error: 'query_failed' }, { status: 500 });
	}

	const pendingGroups = groupManifestRows(groups.flatMap((group) => group.rows).filter((row) => !row.provider_sent_at));
	if (pendingGroups.length === 0) return Response.json({ date: tomorrow, products: 0, bookings: 0, sent: false });

	const rows = pendingGroups.map((group) => ({ productName: group.productName, bookings: group.bookings, seats: group.seats }));
	const manageUrl = `${siteOrigin(url)}/manage/departures?date=${tomorrow}`;

	try {
		await sendEmail({ to: TEAM_EMAIL, ...teamDeparturesPendingEmail({ date: tomorrow, rows, manageUrl }) });
	} catch (error) {
		console.error('departures pending email failed', error);
		return Response.json({ error: 'email_failed' }, { status: 500 });
	}

	return Response.json({
		date: tomorrow,
		products: pendingGroups.length,
		bookings: rows.reduce((total, row) => total + row.bookings, 0),
		sent: true,
	});
};
