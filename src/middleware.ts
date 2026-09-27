import { defineMiddleware } from 'astro:middleware';
import { supabaseAdmin } from './lib/supabase/admin';
import { createSupabaseServerClient } from './lib/supabase/server';

const noindexSections = ['/manage', '/account', '/booking', '/api'];
const publicAccountPaths = ['/account/sign-in', '/account/callback', '/account/reviews/new'];
const ticketPathPattern = /^\/account\/bookings\/[^/]+$/;

const isInSection = (pathname: string, section: string) => pathname === section || pathname.startsWith(`${section}/`);

function isPublicAccountPath(url: URL) {
	if (publicAccountPaths.includes(url.pathname)) return true;
	return ticketPathPattern.test(url.pathname) && url.searchParams.has('token');
}

function withNoindex(response: Response) {
	try {
		response.headers.set('X-Robots-Tag', 'noindex');
		return response;
	} catch {
		const headers = new Headers(response.headers);
		headers.set('X-Robots-Tag', 'noindex');
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
	}
}

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.isPrerendered) return next();

	const { pathname, search } = context.url;
	const supabase = createSupabaseServerClient(context);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	let staffRole: App.Locals['staffRole'] = null;
	if (user) {
		const { data: staffMember } = await supabaseAdmin.from('staff').select('role').eq('user_id', user.id).maybeSingle();
		staffRole = staffMember?.role ?? null;
	}

	context.locals.supabase = supabase;
	context.locals.user = user;
	context.locals.staffRole = staffRole;

	const respond = async () => {
		if ((isInSection(pathname, '/manage') || isInSection(pathname, '/api/manage')) && !staffRole) {
			return new Response(null, { status: 404, statusText: 'Not Found' });
		}

		if (isInSection(pathname, '/account') && !user && !isPublicAccountPath(context.url)) {
			return context.redirect(`/account/sign-in?next=${encodeURIComponent(pathname + search)}`);
		}

		return next();
	};

	const response = await respond();
	return noindexSections.some((section) => isInSection(pathname, section)) ? withNoindex(response) : response;
});
