import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatMoney, pickupSummary, renderEmail, type EmailContent } from './layout';
import { bookingSummaryDetails, pickupPendingNotice } from './booking-summary';

export function tourReminderEmail(details: BookingDetails, links: { ticketUrl: string }): EmailContent {
	const pickupNotice = details.pickupTime
		? `Te recogemos a las ${details.pickupTime} en la entrada de ${details.hotel ?? 'tu hotel'}. Llega unos minutos antes.`
		: `${pickupSummary(details)} te recogemos en la entrada de ${details.hotel ?? 'tu hotel'}. Si quieres saber la hora exacta, escríbenos por WhatsApp.`;

	return renderEmail({
		subject: `Mañana es tu excursión: ${details.productName}`,
		preheader: `${pickupSummary(details)} en ${details.hotel ?? 'tu hotel'}.`,
		heading: 'Mañana es el gran día',
		paragraphs: [`Hola, ${firstName(details.leadName)}. Te recordamos los datos de tu excursión de mañana.`, pickupNotice],
		details: [
			...bookingSummaryDetails(details),
			...(details.balanceAmount > 0 ? [{ label: 'A pagar el día del tour', value: formatMoney(details.balanceAmount) }] : []),
		],
		detailsAfter: pickupPendingNotice(details),
		cta: { label: 'Ver mi reserva', url: links.ticketUrl },
		closing: ['Lleva traje de baño, protector solar y ganas de pasarla bien.'],
	});
}
