export interface NavLink {
	label: string;
	href: string;
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

export const privacyPolicyHref = '/aviso-de-privacidad';

export const legalLinks: NavLink[] = [
	{ label: 'Aviso de privacidad', href: privacyPolicyHref },
	{ label: 'Términos y condiciones', href: '/terminos-y-condiciones' },
];
