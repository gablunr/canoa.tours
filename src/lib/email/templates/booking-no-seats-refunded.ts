import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, formatTourDate, renderEmail, type EmailContent } from './layout';

export function bookingNoSeatsRefundedEmail(details: BookingDetails, input: { refundAmount: number; tourUrl: string }): EmailContent {
	return renderEmail({
		subject: `No hemos podido confirmar tu reserva ${details.code}`,
		preheader: `Te hemos devuelto ${formatMoney(input.refundAmount)}.`,
		heading: 'No quedaban plazas para tu fecha',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. Mientras completabas el pago, se agotaron las plazas de ${details.productName} para el ${formatTourDate(details.tourDate)}. Lo sentimos mucho.`,
			`Te hemos devuelto ${formatMoney(input.refundAmount)} a la tarjeta con la que pagaste. Según tu banco, puede tardar entre 5 y 10 días hábiles en aparecer.`,
			'Si quieres, puedes reservar otra fecha desde la página de la excursión.',
		],
		cta: { label: 'Elegir otra fecha', url: input.tourUrl },
	});
}
