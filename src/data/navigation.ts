import { company } from './company';
import { destinationHref, destinations } from './destinations';
import { mostBookedHref, mostBookedTours } from './most-booked';

export interface NavLink {
	label: string;
	href: string;
}

export interface NavGroup {
	title: string;
	links: NavLink[];
}

export const mainLinks: NavLink[] = destinations.map((destination) => ({
	label: destination.name,
	href: destinationHref(destination),
}));

export const catalogLink: NavLink = { label: 'Ver excursiones', href: '/excursiones' };

export const mostBookedLinks: NavLink[] = mostBookedTours.map((item) => ({
	label: item.title,
	href: mostBookedHref(item),
}));

export const howToBookLink: NavLink = { label: 'Cómo reservar', href: '/como-reservar' };

export const pickupZonesLink: NavLink = { label: 'Zonas de recogida', href: '/zonas-de-recogida' };

export const helpLinks: NavLink[] = [
	howToBookLink,
	{ label: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
	pickupZonesLink,
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
