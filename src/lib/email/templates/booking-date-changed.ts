import { bookingPolicy } from '../../../data/booking/booking-policy';
import type { BookingDetails } from '../../booking/booking-details';
import { firstName, formatTourDate, renderEmail, type EmailContent } from './layout';
import { bookingSummaryDetails, pickupWindowNotice } from './booking-summary';

function remainingChangesNotice(details: BookingDetails): string {
	const remaining = Math.max(bookingPolicy.maxDateChanges - details.dateChangesCount, 0);
	if (remaining === 0) return 'Ya no puedes cambiar más veces la fecha de esta reserva.';
	return remaining === 1 ? 'Te queda un cambio de fecha más.' : `Te quedan ${remaining} cambios de fecha más.`;
}

export function bookingDateChangedEmail(details: BookingDetails, links: { ticketUrl: string }): EmailContent {
	return renderEmail({
		subject: `Nueva fecha para tu reserva ${details.code}: ${formatTourDate(details.tourDate)}`,
		preheader: `Tu excursión ahora es el ${formatTourDate(details.tourDate)}.`,
		heading: 'Hemos cambiado la fecha de tu reserva',
		paragraphs: [`Hola, ${firstName(details.leadName)}. Tu reserva de ${details.productName} tiene nueva fecha. Estos son los datos actualizados.`],
		details: bookingSummaryDetails(details),
		detailsAfter: [...pickupWindowNotice(details), remainingChangesNotice(details)],
		cta: { label: 'Ver mi reserva', url: links.ticketUrl },
	});
}
