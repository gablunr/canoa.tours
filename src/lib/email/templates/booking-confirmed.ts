import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, formatTourDate, renderEmail, type EmailContent } from './layout';
import { bookingSummaryDetails, pickupPendingNotice, pickupWindowNotice } from './booking-summary';

export function bookingConfirmedEmail(details: BookingDetails, links: { ticketUrl: string }): EmailContent {
	const paidInFull = details.balanceAmount <= 0;
	const paidOnlineLabel = paidInFull
		? 'Pagado al reservar (total)'
		: details.hasInsurance
			? 'Pagado al reservar (depósito y seguro)'
			: 'Pagado al reservar (depósito)';

	return renderEmail({
		subject: `Reserva confirmada: ${details.productName}, ${formatTourDate(details.tourDate)}`,
		preheader: `Tu código de reserva es ${details.code}. Aquí tienes todos los detalles.`,
		heading: 'Tu reserva está confirmada',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. Ya tienes tu plaza en ${details.productName}. Guarda este correo, aquí tienes todo lo que necesitas para el día del tour.`,
		],
		details: [
			...bookingSummaryDetails(details),
			{ label: 'Total', value: formatMoney(details.total) },
			{ label: paidOnlineLabel, value: formatMoney(details.depositAmount) },
			{ label: 'A pagar el día del tour', value: paidInFull ? 'Nada, ya está pagado' : formatMoney(details.balanceAmount) },
			...(details.hasInsurance ? [{ label: 'Seguro de cancelación', value: 'Incluido' }] : []),
		],
		detailsAfter: [...pickupWindowNotice(details), ...pickupPendingNotice(details)],
		cta: { label: 'Ver mi reserva', url: links.ticketUrl },
		closing: ['Nos vemos pronto.'],
	});
}
