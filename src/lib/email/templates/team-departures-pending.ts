import { formatTourDate, renderEmail, type EmailContent } from './layout';

export function teamDeparturesPendingEmail(input: {
	date: string;
	rows: { productName: string; bookings: number; seats: number }[];
	manageUrl: string;
}): EmailContent {
	const totalSeats = input.rows.reduce((sum, row) => sum + row.seats, 0);

	return renderEmail({
		subject: `Salidas del ${formatTourDate(input.date)} pendientes de enviar al proveedor`,
		preheader: `${input.rows.length} excursiones y ${totalSeats} plazas sin enviar.`,
		heading: 'Salidas pendientes de enviar',
		paragraphs: [`Estas salidas del ${formatTourDate(input.date)} todavía no se han enviado al proveedor.`],
		details: input.rows.map((row) => ({
			label: row.productName,
			value: `${row.bookings} ${row.bookings === 1 ? 'reserva' : 'reservas'}, ${row.seats} ${row.seats === 1 ? 'plaza' : 'plazas'}`,
		})),
		cta: { label: 'Gestionar salidas', url: input.manageUrl },
	});
}
