import type { BookingDetails } from '../../booking/booking-details';
import { firstName, renderEmail, type EmailContent } from './layout';

export function reviewRequestEmail(details: BookingDetails, links: { reviewUrl: string }): EmailContent {
	return renderEmail({
		subject: `¿Qué tal fue ${details.productName}?`,
		preheader: 'Cuéntanos tu experiencia en un minuto.',
		heading: '¿Qué tal fue la excursión?',
		paragraphs: [
			`Hola, ${firstName(details.leadName)}. Gracias por venir con nosotros a ${details.productName}.`,
			'¿Nos cuentas qué tal fue? Tu opinión ayuda a otros viajeros a elegir y a nosotros a mejorar.',
		],
		cta: { label: 'Dejar mi opinión', url: links.reviewUrl },
	});
}
