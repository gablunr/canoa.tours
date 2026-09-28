import type { StaffRole } from '../../lib/supabase/types';

export type ManageSectionId = 'overview' | 'bookings' | 'departures' | 'capacity' | 'tours' | 'pickup' | 'reviews' | 'guides' | 'coupons' | 'team';

export type ManageGroupId = 'operations' | 'catalog' | 'marketing' | 'settings';

export interface ManageSection {
	id: ManageSectionId;
	label: string;
	description: string;
	href: string;
	roles: StaffRole[];
	group: ManageGroupId | null;
}

export interface ManageGroup {
	id: ManageGroupId;
	label: string;
}

const operationsRoles: StaffRole[] = ['admin', 'operations'];

export const manageGroups: ManageGroup[] = [
	{ id: 'operations', label: 'Operación' },
	{ id: 'catalog', label: 'Catálogo' },
	{ id: 'marketing', label: 'Marketing' },
	{ id: 'settings', label: 'Ajustes' },
];

export const manageSections: ManageSection[] = [
	{ id: 'overview', label: 'Resumen', description: 'Ventas, cobros y ocupación', href: '/manage', roles: operationsRoles, group: null },
	{ id: 'bookings', label: 'Reservas', description: 'Busca, cambia o cancela reservas', href: '/manage/bookings', roles: operationsRoles, group: 'operations' },
	{ id: 'departures', label: 'Salidas', description: 'Listado del día para el proveedor', href: '/manage/departures', roles: operationsRoles, group: 'operations' },
	{ id: 'capacity', label: 'Cupo', description: 'Plazas por día y días cerrados', href: '/manage/capacity', roles: operationsRoles, group: 'operations' },
	{ id: 'tours', label: 'Excursiones', description: 'Crea y edita las excursiones', href: '/manage/tours', roles: ['admin', 'editor'], group: 'catalog' },
	{ id: 'pickup', label: 'Zonas y hoteles', description: 'Dónde recogemos y cuánto cuesta', href: '/manage/pickup', roles: operationsRoles, group: 'catalog' },
	{ id: 'reviews', label: 'Opiniones', description: 'Modera y responde a los viajeros', href: '/manage/reviews', roles: ['admin', 'operations', 'editor'], group: 'marketing' },
	{ id: 'guides', label: 'Guías', description: 'Escribe y publica las guías de viaje', href: '/manage/guides', roles: ['admin', 'editor'], group: 'marketing' },
	{ id: 'coupons', label: 'Cupones', description: 'Descuentos para campañas y socios', href: '/manage/coupons', roles: ['admin'], group: 'marketing' },
	{ id: 'team', label: 'Equipo', description: 'Quién entra al panel y con qué rol', href: '/manage/team', roles: ['admin'], group: 'settings' },
];

export const sectionsForRole = (role: StaffRole | null) => (role ? manageSections.filter((section) => section.roles.includes(role)) : []);

export const canOpenSection = (role: StaffRole | null, id: ManageSectionId) => sectionsForRole(role).some((section) => section.id === id);

export const panelHomeHref = (role: StaffRole | null) => sectionsForRole(role)[0]?.href ?? '/manage';

export function menuForRole(role: StaffRole | null) {
	const sections = sectionsForRole(role);
	return {
		links: sections.filter((section) => section.group === null),
		groups: manageGroups
			.map((group) => ({ ...group, sections: sections.filter((section) => section.group === group.id) }))
			.filter((group) => group.sections.length > 0),
	};
}
