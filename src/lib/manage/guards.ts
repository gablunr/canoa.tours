import { ActionError } from 'astro:actions';
import type { StaffRole } from '../supabase/types';

type ContextWithLocals = { locals: App.Locals };

export function requireStaff(context: ContextWithLocals, roles?: StaffRole[]): { userId: string; role: StaffRole } {
	const { user, staffRole } = context.locals;
	if (!user) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Inicia sesión para continuar.' });
	if (!staffRole || (roles && !roles.includes(staffRole))) {
		throw new ActionError({ code: 'FORBIDDEN', message: 'No tienes permiso para hacer esto.' });
	}
	return { userId: user.id, role: staffRole };
}

export function requireCustomerUser(context: ContextWithLocals): { userId: string; email: string } {
	const { user } = context.locals;
	if (!user?.email) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Inicia sesión para continuar.' });
	return { userId: user.id, email: user.email.toLowerCase() };
}
