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
