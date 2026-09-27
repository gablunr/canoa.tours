import { cancellationInsurancePriceLabel, cancellationNoticeLabel } from './booking-policy';

export type BookingBenefitId = 'hotel-pickup' | 'deposit' | 'weather-reschedule' | 'cancellation-insurance';

export interface BookingBenefit {
	id: BookingBenefitId;
	title: string;
	text: string;
}

export const bookingBenefits: BookingBenefit[] = [
	{
		id: 'hotel-pickup',
		title: 'Te recogemos en tu hotel',
		text: 'Hay recogida en hoteles de Punta Cana y Bayahibe en todas las excursiones. En Saona, Catalina y Samaná se cobra aparte según tu zona, porque hay quien se aloja al lado del puerto y no la necesita.',
	},
	{
		id: 'deposit',
		title: 'Reservas online con un depósito',
		text: 'Pagas una parte con tarjeta al reservar y el resto el día de la excursión, o todo de una vez si prefieres.',
	},
	{
		id: 'weather-reschedule',
		title: 'Si hace mal tiempo, cambiamos la fecha',
		text: 'Si el clima impide salir, movemos tu excursión al siguiente día disponible, sin coste.',
	},
	{
		id: 'cancellation-insurance',
		title: `Cancela o cambia la fecha hasta ${cancellationNoticeLabel} antes`,
		text: `Con el seguro de cancelación (${cancellationInsurancePriceLabel} por persona) lo haces tú desde tu reserva. Si cancelas, te devolvemos lo que pagaste por la excursión.`,
	},
];

export const bookingBenefitSummary = (benefit: BookingBenefit) => `${benefit.title}. ${benefit.text}`;
