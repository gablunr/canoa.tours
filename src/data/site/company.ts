export interface ServiceArea {
	name: string;
	kind: 'State' | 'City';
}

export interface Phone {
	label: string;
	number: string;
	href: string;
}

export interface Office {
	streetAddress: string;
	postalCode: string;
	locality: string;
	region: string;
	regionAbbreviation: string;
	country: string;
	latitude?: number;
	longitude?: number;
	mapsUrl?: string;
}

export interface OpeningHours {
	days: string[];
	opens: string;
	closes: string;
}

export type SocialNetwork = 'instagram' | 'tiktok' | 'facebook';

export interface SocialProfile {
	network: SocialNetwork;
	label: string;
	url: string;
}

export type PaymentMethod = 'visa' | 'mastercard' | 'paypal';

export interface Company {
	name: string;
	brandName: string;
	schemaType: string;
	description: string;
	email: string;
	phone?: Phone;
	whatsapp?: Phone;
	office?: Office;
	openingHours?: OpeningHours;
	serviceAreas: ServiceArea[];
	socialProfiles: SocialProfile[];
	paymentMethods: PaymentMethod[];
}

export const phoneFrom = (label: string, number: string): Phone => ({ label, number, href: `tel:${number}` });

export const whatsappFrom = (label: string, number: string): Phone => ({ label, number, href: `https://wa.me/${number.replace(/\D/g, '')}` });

export const whatsappMessageHref = (whatsapp: Phone, message: string) => `${whatsapp.href}?text=${encodeURIComponent(message)}`;

export const officeAddress = (office: Office) =>
	`${office.streetAddress}, ${office.postalCode} ${office.locality}, ${office.regionAbbreviation}`;

export const company: Company = {
	name: 'Canoa Tours',
	brandName: 'Canoa Tours',
	schemaType: 'TravelAgency',
	description:
		'Canoa Tours es una agencia local de excursiones en Punta Cana. Organizamos nuestros propios tours, sin intermediarios, y te recogemos en el hotel.',
	email: 'hola@canoa.tours',
	whatsapp: whatsappFrom('+1 809 555 0100', '+18095550100'),
	serviceAreas: [{ name: 'Punta Cana', kind: 'City' }],
	socialProfiles: [],
	paymentMethods: ['visa', 'mastercard', 'paypal'],
};
