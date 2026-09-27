import {
	beachActivityPickupFeeLabel,
	cancellationInsurancePriceLabel,
	cancellationNoticeLabel,
	maxDateChangesLabel,
} from '../booking/booking-policy';
import { company } from '../site/company';
import { departurePorts, distanceLabel } from '../tours/departure-ports';
import { routes } from '../site/routes';

export const contentTokens: Readonly<Record<string, string>> = {
	insurancePrice: cancellationInsurancePriceLabel,
	noticeHours: cancellationNoticeLabel,
	maxDateChanges: maxDateChangesLabel,
	beachActivityPickupFee: beachActivityPickupFeeLabel,
	email: company.email,
	...Object.fromEntries(
		Object.entries(departurePorts).flatMap(([key, port]) => [
			[`${key}Port`, port.port],
			[`${key}Distance`, distanceLabel(port)],
		]),
	),
	...(company.whatsapp && { whatsapp: company.whatsapp.label, whatsappHref: company.whatsapp.href }),
	howToBookHref: routes.howToBook,
	faqHref: routes.faq,
	pickupZonesHref: routes.pickupZones,
	cancellationsHref: routes.cancellations,
	contactHref: routes.contact,
};

const tokenPattern = /\{\{\s*(\w+)\s*\}\}/g;

export const fillContentTokens = (text: string) =>
	text.replace(tokenPattern, (_, name: string) => {
		const value = contentTokens[name];
		if (value === undefined) throw new Error(`El marcador {{${name}}} no existe en content-tokens.ts`);
		return value;
	});

export const unknownContentTokens = (text: string) =>
	[...new Set([...text.matchAll(tokenPattern)].map((match) => match[1]))].filter((name) => contentTokens[name] === undefined);
