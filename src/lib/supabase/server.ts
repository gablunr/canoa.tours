import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database } from './database.types';

export function createSupabaseServerClient(context: { request: Request; cookies: AstroCookies }): SupabaseClient<Database> {
	return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return parseCookieHeader(context.request.headers.get('Cookie') ?? '').map(({ name, value }) => ({ name, value: value ?? '' }));
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					context.cookies.set(name, value, options);
				}
			},
		},
	});
}
