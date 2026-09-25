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

export interface Company {
	name: string;
	brandName: string;
	schemaType: string;
	description: string;
	email: string;
	phone?: Phone;
	office?: Office;
	openingHours?: OpeningHours;
	serviceAreas: ServiceArea[];
	socialProfiles: string[];
}

export const phoneFrom = (label: string, number: string): Phone => ({ label, number, href: `tel:${number}` });

export const officeAddress = (office: Office) =>
	`${office.streetAddress}, ${office.postalCode} ${office.locality}, ${office.regionAbbreviation}`;

export const company: Company = {
	name: 'Canoa Tours',
	brandName: 'Canoa Tours',
	schemaType: 'TravelAgency',
	description: 'Tours y experiencias en canoa con Canoa Tours.',
	email: 'hola@canoatours.com',
	serviceAreas: [],
	socialProfiles: [],
};
