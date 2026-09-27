import { formatPrice } from '../../lib/format';

export const bookingPolicy = {
	cancellationInsurancePrice: 4.99,
	cancellationNoticeHours: 24,
	maxDateChanges: 2,
	beachActivityPickupFee: 10,
} as const;

const timesInWords = ['ninguna vez', 'una vez', 'dos veces', 'tres veces', 'cuatro veces', 'cinco veces'] as const;

export const cancellationInsurancePriceLabel = formatPrice(bookingPolicy.cancellationInsurancePrice);

export const cancellationNoticeLabel = `${bookingPolicy.cancellationNoticeHours} horas`;

export const maxDateChangesLabel = timesInWords[bookingPolicy.maxDateChanges];

export const beachActivityPickupFeeLabel = formatPrice(bookingPolicy.beachActivityPickupFee);

export const savedCardNotice =
	'Guardamos tu tarjeta de forma segura con Stripe. Solo la usaremos para cobrar el saldo pendiente si no te presentas a la excursión y no has contratado el seguro de cancelación.';

export const termsVersion = '2026-09-27';
