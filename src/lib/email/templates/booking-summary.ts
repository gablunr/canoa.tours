import type { BookingDetails } from '../../booking/booking-details';
import { formatTourDate, peopleSummary, pickupSummary, type EmailDetail } from './layout';

export function bookingSummaryDetails(details: BookingDetails): EmailDetail[] {
	return [
		{ label: 'Código de reserva', value: details.code },
		{ label: 'Excursión', value: details.productName },
		{ label: 'Fecha', value: formatTourDate(details.tourDate) },
		{ label: 'Personas', value: peopleSummary(details) },
		{ label: 'Recogida', value: details.hotel ?? 'Por confirmar' },
		{ label: 'Hora de recogida', value: pickupSummary(details) },
	];
}

export function pickupPendingNotice(details: BookingDetails): string[] {
	return details.pickupFeePending
		? ['El suplemento de recogida de tu zona está pendiente de confirmar. Te lo diremos antes del tour y se paga ese mismo día.']
		: [];
}

export function pickupWindowNotice(details: BookingDetails): string[] {
	return details.pickupTime ? [] : ['Te confirmaremos la hora exacta de recogida el día antes de la excursión.'];
}
