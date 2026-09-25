export interface NavLink {
	label: string;
	href: string;
}

export const mainLinks: NavLink[] = [];

export const privacyPolicyHref = '/aviso-de-privacidad';

export const legalLinks: NavLink[] = [
	{ label: 'Aviso de privacidad', href: privacyPolicyHref },
	{ label: 'Términos y condiciones', href: '/terminos-y-condiciones' },
];
