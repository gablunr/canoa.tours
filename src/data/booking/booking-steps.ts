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
		text: 'Mira los días de salida y el precio de cada tour en su ficha.',
	},
	{
		id: 'pay-deposit',
		title: 'Reserva con un anticipo',
		text: 'Pagas una parte en línea y el resto el día de la excursión.',
	},
	{
		id: 'get-pickup-time',
		title: 'Recibe la hora de recogida',
		text: 'Te enviamos por WhatsApp la hora y el punto de recogida en tu hotel.',
	},
	{
		id: 'enjoy-tour',
		title: 'Disfruta del tour',
		text: 'Te recogemos en el hotel y pagas lo que falta.',
	},
];

export const bookingStepSummary = (step: BookingStep, index: number) => `${index + 1}. ${step.title}. ${step.text}`;
