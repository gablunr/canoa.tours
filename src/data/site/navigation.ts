import { company } from './company';
import { routes } from './routes';
import { destinationHref, destinations } from '../tours/destinations';
import { mostBookedHref, mostBookedTours } from '../tours/most-booked';

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

export const catalogLink: NavLink = { label: 'Ver excursiones', href: routes.catalog };

export const mostBookedLinks: NavLink[] = mostBookedTours.map((item) => ({
	label: item.title,
	href: mostBookedHref(item),
}));

export const howToBookLink: NavLink = { label: 'Cómo reservar', href: routes.howToBook };

export const faqLink: NavLink = { label: 'Preguntas frecuentes', href: routes.faq };

export const pickupZonesLink: NavLink = { label: 'Zonas de recogida', href: routes.pickupZones };

export const cancellationsLink: NavLink = { label: 'Cancelaciones y cambios', href: routes.cancellations };

export const contactLink: NavLink = { label: 'Contacto', href: routes.contact };

export const helpLinks: NavLink[] = [
	howToBookLink,
	faqLink,
	pickupZonesLink,
	cancellationsLink,
	contactLink,
];

export const aboutLink: NavLink = { label: 'Quiénes somos', href: routes.about };

export const reviewsLink: NavLink = { label: 'Opiniones', href: routes.reviews };

export const guidesLink: NavLink = { label: 'Guías de viaje', href: routes.guides };

export const companyLinks: NavLink[] = [
	aboutLink,
	reviewsLink,
	guidesLink,
];

export const footerGroups: NavGroup[] = [
	{ title: 'Excursiones', links: [...mainLinks, { label: 'Todas las excursiones', href: catalogLink.href }] },
	{ title: 'Las más reservadas', links: mostBookedLinks },
	{ title: 'Ayuda', links: helpLinks },
	{ title: company.brandName, links: companyLinks },
].filter((group) => group.links.length > 0);

export const privacyPolicyHref = '/aviso-de-privacidad';

export const legalLinks: NavLink[] = [
	{ label: 'Aviso de privacidad', href: privacyPolicyHref },
	{ label: 'Términos y condiciones', href: '/terminos-y-condiciones' },
];
