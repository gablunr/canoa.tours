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

export interface Headquarters {
	locality: string;
	country: string;
	countryCode: string;
}

export interface Company {
	name: string;
	brandName: string;
	legalName: string;
	legalForm: string;
	foundingDate: string;
	foundingLabel: string;
	founder: string;
	headquarters: Headquarters;
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

export const whatsappFrom = (label: string, number: string): Phone => ({ label, number, href: `https://wa.me/${number.replace(/\D/g, '')}` });

export const whatsappMessageHref = (whatsapp: Phone, message: string) => `${whatsapp.href}?text=${encodeURIComponent(message)}`;

export const officeAddress = (office: Office) =>
	`${office.streetAddress}, ${office.postalCode} ${office.locality}, ${office.regionAbbreviation}`;

export const company: Company = {
	name: 'Canoa Tours',
	brandName: 'Canoa Tours',
	legalName: 'Canoa Tours SL',
	legalForm: 'sociedad limitada',
	foundingDate: '2025-01',
	foundingLabel: 'enero de 2025',
	founder: 'Gabriel Lunar',
	headquarters: { locality: 'Madrid', country: 'España', countryCode: 'ES' },
	schemaType: 'TravelAgency',
	description:
		'Canoa Tours es una agencia de excursiones en Punta Cana. Seleccionamos excursiones por la zona y las reservas online, con recogida en tu hotel.',
	email: 'hola@canoa.tours',
	whatsapp: whatsappFrom('+44 7366 329699', '+447366329699'),
	serviceAreas: [{ name: 'Punta Cana', kind: 'City' }],
	socialProfiles: [],
	paymentMethods: ['visa', 'mastercard', 'paypal'],
};

export const companyIdentity = (entity: Company) =>
	`${entity.brandName} es la marca comercial de ${entity.legalName}, ${entity.legalForm} constituida en ${entity.headquarters.country} en ${entity.foundingLabel} y con sede en ${entity.headquarters.locality}.`;
