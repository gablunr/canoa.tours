import { pickupZonesLink, type NavLink } from './navigation';

export interface Faq {
	question: string;
	answer: string;
	link?: NavLink;
}

export const faqs: Faq[] = [
	{
		question: '¿Cuánto cuesta una excursión en Punta Cana?',
		answer:
			'Desde US$40 por persona en buggies o speed boat. Un día completo en Isla Saona cuesta desde US$55 y en Samaná desde US$99.',
	},
	{
		question: '¿Está incluida la recogida en el hotel?',
		answer:
			'En la mayoría de excursiones, sí. En Isla Saona, Isla Catalina y Samaná se cobra aparte según tu zona hotelera, porque algunos hoteles están al lado del puerto y no la necesitan.',
		link: pickupZonesLink,
	},
	{
		question: '¿Desde dónde salen los barcos a Saona, Catalina y Samaná?',
		answer:
			'A Isla Saona se sale del puerto de Bayahibe, a unos 80 km de Punta Cana. A Isla Catalina, desde La Romana, a unos 90 km. A Samaná, desde Miches, a unos 95 km.',
	},
	{
		question: '¿Puedo pagar todo el día de la excursión?',
		answer:
			'No. Las plazas en barcos y actividades son limitadas, así que hay que reservar con un anticipo. El resto se paga el día del tour.',
	},
	{
		question: '¿Qué pasa si llueve?',
		answer: 'Si el clima impide salir, tu excursión pasa al siguiente día disponible.',
	},
	{
		question: '¿Puedo cancelar o cambiar la fecha?',
		answer:
			'Con el seguro de cancelación (US$4,99 por persona) puedes cancelar con reembolso del 100 % o cambiar la fecha hasta 24 horas antes.',
	},
	{
		question: '¿Pueden ir niños y embarazadas?',
		answer:
			'Depende de la excursión. Isla Saona en catamarán es apta para embarazadas, mientras que el buceo en Isla Catalina y Samaná con Isla Bacardí no. Cada ficha lo indica.',
	},
];

export const faqSummary = (faq: Faq) => `${faq.question} ${faq.answer}`;
