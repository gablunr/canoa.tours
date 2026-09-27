import type { APIRoute } from 'astro';
import { safeNextPath } from '../../lib/auth/magic-link';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export const prerender = false;

const signInErrorPath = '/account/sign-in?error=link';

export const GET: APIRoute = async (context) => {
	const tokenHash = context.url.searchParams.get('token_hash');
	const nextPath = safeNextPath(context.url.searchParams.get('next'));

	if (!tokenHash) return context.redirect(signInErrorPath, 303);

	const supabase = createSupabaseServerClient(context);
	const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });

	if (error) return context.redirect(signInErrorPath, 303);
	return context.redirect(nextPath, 303);
};
