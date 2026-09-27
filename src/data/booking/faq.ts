import { formatPrice } from '../../lib/format';
import { cancellationInsurancePriceLabel, cancellationNoticeLabel } from './booking-policy';
import { departurePorts, distanceLabel } from '../tours/departure-ports';
import { findDestination } from '../tours/destinations';
import { pickupZonesLink, type NavLink } from '../site/navigation';

const fromPriceLabel = (id: Parameters<typeof findDestination>[0]) => formatPrice(findDestination(id).fromPrice);

export interface Faq {
	question: string;
	answer: string;
	link?: NavLink;
}

export const faqs: Faq[] = [
	{
		question: '¿Cuánto cuesta una excursión en Punta Cana?',
		answer:
			`Desde ${fromPriceLabel('aventura')} por persona en buggies o speed boat. Un día completo en Isla Saona cuesta desde ${fromPriceLabel('isla-saona')} y en Samaná desde ${fromPriceLabel('samana')}.`,
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
			`A Isla Saona se sale del puerto de ${departurePorts.saona.port}, a unos ${distanceLabel(departurePorts.saona)} de Punta Cana. A Isla Catalina, desde ${departurePorts.catalina.port}, a unos ${distanceLabel(departurePorts.catalina)}. A Samaná, desde ${departurePorts.samana.port}, a unos ${distanceLabel(departurePorts.samana)}.`,
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
			`Con el seguro de cancelación (${cancellationInsurancePriceLabel} por persona) puedes cancelar con reembolso del 100 % o cambiar la fecha hasta ${cancellationNoticeLabel} antes.`,
	},
	{
		question: '¿Pueden ir niños y embarazadas?',
		answer:
			'Depende de la excursión. Isla Saona en catamarán es apta para embarazadas, mientras que el buceo en Isla Catalina y Samaná con Isla Bacardí no. Cada ficha lo indica.',
	},
];

export const faqSummary = (faq: Faq) => `${faq.question} ${faq.answer}`;
