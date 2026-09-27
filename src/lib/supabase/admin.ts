import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SECRET_KEY } from 'astro:env/server';
import type { Database } from './database.types';

export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { persistSession: false, autoRefreshToken: false },
});
