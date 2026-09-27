declare namespace App {
	interface Locals {
		supabase: import('@supabase/supabase-js').SupabaseClient<import('./lib/supabase/database.types').Database>;
		user: import('@supabase/supabase-js').User | null;
		staffRole: import('./lib/supabase/types').StaffRole | null;
	}
}
