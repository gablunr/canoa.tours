import type { APIRoute } from 'astro';
import { triggerRebuild } from '../../../lib/deploy-hook';
import { loadSiteStatus } from '../../../lib/manage/site-status';
import type { StaffRole } from '../../../lib/supabase/types';

export const prerender = false;

const rebuildRoles: StaffRole[] = ['admin', 'editor'];
const noStore = { 'Cache-Control': 'no-store' };

async function statusResponse(supabase: App.Locals['supabase']): Promise<Response> {
	try {
		return Response.json(await loadSiteStatus(supabase), { headers: noStore });
	} catch (error) {
		console.error('site status failed', error);
		return Response.json({ error: 'status_failed' }, { status: 500, headers: noStore });
	}
}

export const GET: APIRoute = ({ locals }) => statusResponse(locals.supabase);

export const POST: APIRoute = async ({ locals }) => {
	const { user, staffRole } = locals;
	if (!user || !staffRole || !rebuildRoles.includes(staffRole)) {
		return Response.json({ error: 'forbidden' }, { status: 403, headers: noStore });
	}
	await triggerRebuild('Reintento desde el panel', user.id);
	return statusResponse(locals.supabase);
};
