import { VERCEL_DEPLOY_HOOK_URL } from 'astro:env/server';

export async function triggerRebuild(): Promise<void> {
	if (!VERCEL_DEPLOY_HOOK_URL) return;
	try {
		const response = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
		if (!response.ok) console.error('deploy hook responded', response.status);
	} catch (error) {
		console.error('deploy hook failed', error);
	}
}
