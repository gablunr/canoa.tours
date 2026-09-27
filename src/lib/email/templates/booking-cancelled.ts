import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, formatTourDate, renderEmail, type EmailContent } from './layout';

export function bookingCancelledEmail(details: BookingDetails, input: { refundAmount?: number; tourUrl: string }): EmailContent {
	const refundAmount = input.refundAmount ?? 0;
	const refundParagraph =
		refundAmount > 0
			? `Te hemos devuelto ${formatMoney(refundAmount)} a la tarjeta con la que pagaste. Según tu banco, puede tardar entre 5 y 10 días hábiles en aparecer.`
			: 'Según nuestra política de cancelación, esta reserva no tiene reembolso.';

	return renderEmail({
		subject: `Reserva ${details.code} cancelada`,
		preheader: refundAmount > 0 ? `Te hemos devuelto ${formatMoney(refundAmount)}.` : `Tu reserva de ${details.productName} está cancelada.`,
		heading: 'Tu reserva está cancelada',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. Hemos cancelado tu reserva de ${details.productName} para el ${formatTourDate(details.tourDate)}.`,
			refundParagraph,
			'Si quieres volver a reservar, estaremos encantados de llevarte.',
		],
		cta: { label: 'Ver la excursión', url: input.tourUrl },
	});
}
