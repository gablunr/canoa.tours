import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, formatTourDate, renderEmail, type EmailContent } from './layout';

export function noShowChargedEmail(details: BookingDetails, input: { chargedAmount: number }): EmailContent {
	return renderEmail({
		subject: `Cobro del saldo de tu reserva ${details.code}`,
		preheader: `Hemos cobrado ${formatMoney(input.chargedAmount)} del saldo pendiente.`,
		heading: 'Hemos cobrado el saldo pendiente',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. No te presentaste a ${details.productName} el ${formatTourDate(details.tourDate)} y la reserva no tenía seguro de cancelación.`,
			`Como indica nuestra política de cancelación, hemos cobrado el saldo pendiente de ${formatMoney(input.chargedAmount)} en la tarjeta que guardaste al reservar.`,
		],
		closing: ['Si crees que es un error, responde a este correo y lo revisamos.'],
	});
}
