export type BookingStepId = 'choose-tour' | 'pay-deposit' | 'get-pickup-time' | 'enjoy-tour';

export interface BookingStep {
	id: BookingStepId;
	title: string;
	text: string;
}

export const bookingSteps: BookingStep[] = [
	{
		id: 'choose-tour',
		title: 'Elige excursión y fecha',
		text: 'En la ficha de cada tour ves los días con plazas libres y el precio exacto.',
	},
	{
		id: 'pay-deposit',
		title: 'Paga online',
		text: 'Pagas con tarjeta un depósito y el resto el día de la excursión, o todo de una vez.',
	},
	{
		id: 'get-pickup-time',
		title: 'Recibe tu billete',
		text: 'La confirmación te llega al momento por email. La hora de recogida la verás en tu billete.',
	},
	{
		id: 'enjoy-tour',
		title: 'Disfruta del tour',
		text: 'Te recogemos en el hotel y pagas lo que falta.',
	},
];

export const bookingStepSummary = (step: BookingStep, index: number) => `${index + 1}. ${step.title}. ${step.text}`;
