import { VERCEL_DEPLOY_HOOK_URL } from 'astro:env/server';
import { supabaseAdmin } from './supabase/admin';

async function recordRebuildRequest(reason: string, userId: string | null): Promise<void> {
	try {
		const { error } = await supabaseAdmin.from('site_rebuilds').insert({ reason, requested_by: userId });
		if (error) console.error('site rebuild record failed', error);
	} catch (error) {
		console.error('site rebuild record failed', error);
	}
}

export async function triggerRebuild(reason: string, userId: string | null): Promise<void> {
	await recordRebuildRequest(reason, userId);
	if (!VERCEL_DEPLOY_HOOK_URL) return;
	try {
		const response = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
		if (!response.ok) console.error('deploy hook responded', response.status);
	} catch (error) {
		console.error('deploy hook failed', error);
	}
}
