import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, formatTourDate, renderEmail, type EmailContent } from './layout';

export function balancePaymentLinkEmail(details: BookingDetails, input: { paymentUrl: string; amount: number }): EmailContent {
	return renderEmail({
		subject: `Pago pendiente de tu reserva ${details.code}`,
		preheader: `Queda pendiente un pago de ${formatMoney(input.amount)}.`,
		heading: 'Tienes un pago pendiente',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. No te presentaste a ${details.productName} el ${formatTourDate(details.tourDate)} y la reserva no tenía seguro de cancelación, así que queda pendiente el saldo de ${formatMoney(input.amount)}.`,
			'Intentamos cobrarlo en la tarjeta que guardaste al reservar, pero tu banco pide que confirmes el pago. Puedes hacerlo desde este enlace.',
		],
		cta: { label: 'Pagar el saldo', url: input.paymentUrl },
		closing: ['Si crees que es un error, responde a este correo y lo revisamos.'],
	});
}
