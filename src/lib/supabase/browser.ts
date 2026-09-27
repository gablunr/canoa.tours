import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database } from './database.types';

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowser(): SupabaseClient<Database> {
	browserClient ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
	return browserClient;
}

export async function fetchAvailability(productId: string, from: string, to: string) {
	const { data, error } = await getSupabaseBrowser().rpc('get_availability', { p_product_id: productId, p_from: from, p_to: to });
	if (error) throw error;
	return data;
}
