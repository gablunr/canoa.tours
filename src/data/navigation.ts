import { company } from './company';

export interface NavLink {
	label: string;
	href: string;
}

export interface NavGroup {
	title: string;
	links: NavLink[];
}

export const mainLinks: NavLink[] = [
	{ label: 'Isla Saona', href: '/isla-saona' },
	{ label: 'Samaná', href: '/samana' },
	{ label: 'Santo Domingo', href: '/santo-domingo' },
	{ label: 'Isla Catalina', href: '/isla-catalina' },
	{ label: 'Aventura', href: '/aventura-punta-cana' },
	{ label: 'Fiesta', href: '/fiesta-punta-cana' },
];

export const catalogLink: NavLink = { label: 'Ver excursiones', href: '/excursiones' };

export const mostBookedLinks: NavLink[] = [
	{ label: 'Saona en catamarán', href: '/isla-saona/catamaran' },
	{ label: 'Saona VIP', href: '/isla-saona/vip' },
	{ label: 'Samaná 3 Maravillas', href: '/samana/3-maravillas' },
	{ label: 'Buggies', href: '/aventura-punta-cana/buggies' },
];

export const helpLinks: NavLink[] = [
	{ label: 'Cómo reservar', href: '/como-reservar' },
	{ label: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
	{ label: 'Zonas de recogida', href: '/zonas-de-recogida' },
	{ label: 'Cancelaciones y cambios', href: '/cancelaciones' },
	{ label: 'Contacto', href: '/contacto' },
];

export const companyLinks: NavLink[] = [
	{ label: 'Quiénes somos', href: '/quienes-somos' },
	{ label: 'Opiniones', href: '/opiniones' },
	{ label: 'Guías de viaje', href: '/guias' },
];

export const footerGroups: NavGroup[] = [
	{ title: 'Excursiones', links: [...mainLinks, { label: 'Todas las excursiones', href: catalogLink.href }] },
	{ title: 'Las más reservadas', links: mostBookedLinks },
	{ title: 'Ayuda', links: helpLinks },
	{ title: company.brandName, links: companyLinks },
];

export const privacyPolicyHref = '/aviso-de-privacidad';

export const legalLinks: NavLink[] = [
	{ label: 'Aviso de privacidad', href: privacyPolicyHref },
	{ label: 'Términos y condiciones', href: '/terminos-y-condiciones' },
];
