import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/supabase/database.types';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import type { StaffRole } from '../../../lib/supabase/types';

export interface StaffRoleOption {
	value: StaffRole;
	label: string;
	description: string;
}

export const staffRoleOptions: StaffRoleOption[] = [
	{ value: 'admin', label: 'Administración', description: 'Acceso completo.' },
	{ value: 'operations', label: 'Operaciones', description: 'Reservas, salidas, cupo y opiniones.' },
	{ value: 'editor', label: 'Edición', description: 'Solo opiniones y contenido.' },
];

export interface TeamMember {
	userId: string;
	email: string;
	role: StaffRole;
	lastSignInLabel: string;
	isCurrentUser: boolean;
}

const lastSignInFormatter = new Intl.DateTimeFormat('es', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'America/Santo_Domingo',
});

const lastSignInLabel = (lastSignInAt: string | null | undefined) =>
	lastSignInAt ? lastSignInFormatter.format(new Date(lastSignInAt)).replace('.', '') : 'Todavía no ha entrado';

const roleOrder: Record<StaffRole, number> = { admin: 0, operations: 1, editor: 2 };

export async function loadTeamMembers(supabase: SupabaseClient<Database>, currentUserId: string | null): Promise<TeamMember[]> {
	const { data: staffRows, error } = await supabase.from('staff').select('user_id, role');
	if (error) throw error;

	const members = await Promise.all(
		(staffRows ?? []).map(async (row) => {
			const { data } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
			return {
				userId: row.user_id,
				email: data.user?.email ?? 'Sin email',
				role: row.role,
				lastSignInLabel: lastSignInLabel(data.user?.last_sign_in_at),
				isCurrentUser: row.user_id === currentUserId,
			};
		}),
	);

	return members.sort(
		(first, second) =>
			Number(second.isCurrentUser) - Number(first.isCurrentUser) ||
			roleOrder[first.role] - roleOrder[second.role] ||
			first.email.localeCompare(second.email, 'es'),
	);
}
