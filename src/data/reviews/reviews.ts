import type { ImageMetadata } from 'astro';
import lauraAvatar from '../../assets/images/reviews/laura-m.jpg';
import danielAvatar from '../../assets/images/reviews/daniel-r.jpg';
import carlosAvatar from '../../assets/images/reviews/carlos-p.jpg';
import andreaAvatar from '../../assets/images/reviews/andrea-v.jpg';
import javierAvatar from '../../assets/images/reviews/javier-a.jpg';
import paulaAvatar from '../../assets/images/reviews/paula-s.jpg';
import { findTour, tourHref, type Destination, type DestinationId, type Tour } from '../tours/destinations';

export interface ReviewSource {
	name: string;
	rating: number;
	count: number;
	url?: string;
}

export interface Review {
	author: string;
	avatar: ImageMetadata;
	rating: number;
	destination: Destination;
	tour: Tour;
	tourTitle: string;
	text: string;
	date?: Date;
	url?: string;
}

interface ReviewEntry extends Omit<Review, 'destination' | 'tour'> {
	destinationId: DestinationId;
	tourSlug: string;
}

export const reviewSource: ReviewSource = {
	name: 'Google',
	rating: 4.9,
	count: 23,
};

const entries: ReviewEntry[] = [
	{
		author: 'Laura M.',
		avatar: lauraAvatar,
		rating: 5,
		destinationId: 'isla-saona',
		tourSlug: 'catamaran',
		tourTitle: 'Isla Saona en catamarán',
		text: 'Todo perfecto desde el primer momento. Nos recogieron en el hotel a la hora indicada y el guía estuvo pendiente de nosotros durante todo el día. Saona es preciosa y la excursión en catamarán estuvo muy bien organizada. La reserva por WhatsApp fue súper fácil y el pago del resto directamente allí nos dio bastante confianza. Repetiríamos sin duda.',
	},
	{
		author: 'Daniel R.',
		avatar: danielAvatar,
		rating: 5,
		destinationId: 'aventura',
		tourSlug: 'buggies-predator',
		tourTitle: 'Buggies Predator',
		text: 'Muy buena experiencia. Los buggies son una pasada y el recorrido por los caminos de tierra y la zona de la cueva estuvo genial. Nos recogieron directamente en el hotel y todo fue bastante puntual. Si buscas algo más de aventura que estar todo el día en la playa, merece mucho la pena.',
	},
	{
		author: 'Carlos P.',
		avatar: carlosAvatar,
		rating: 5,
		destinationId: 'samana',
		tourSlug: '3-maravillas',
		tourTitle: 'Samaná 3 Maravillas',
		text: 'Es una excursión larga porque salimos desde Punta Cana, pero merece muchísimo la pena. La cascada de El Limón fue lo que más nos gustó y Cayo Levantado es increíble. El conductor llegó puntual al hotel y durante el trayecto nos fueron explicando todo. Día intenso, pero muy completo.',
	},
	{
		author: 'Andrea V.',
		avatar: andreaAvatar,
		rating: 5,
		destinationId: 'santo-domingo',
		tourSlug: 'clasica',
		tourTitle: 'Santo Domingo Clásica',
		text: 'Reservamos Santo Domingo porque queríamos conocer algo más que las playas y fue una buena elección. La Zona Colonial nos gustó muchísimo y tuvimos tiempo para recorrerla tranquilamente. La organización fue buena y no tuvimos que preocuparnos por el transporte desde el hotel.',
	},
	{
		author: 'Javier A.',
		avatar: javierAvatar,
		rating: 5,
		destinationId: 'isla-catalina',
		tourSlug: 'snorkel',
		tourTitle: 'Snorkel en Isla Catalina',
		text: 'Fuimos con nuestros hijos y la experiencia fue muy buena. El agua estaba increíble y vimos bastantes peces haciendo snorkel. Todo bastante bien organizado y sin complicaciones con la reserva. También nos gustó poder pagar una parte al reservar y el resto el día de la excursión.',
	},
	{
		author: 'Paula S.',
		avatar: paulaAvatar,
		rating: 5,
		destinationId: 'fiesta',
		tourSlug: 'coco-bongo',
		tourTitle: 'Coco Bongo',
		text: 'Compramos las entradas con Canoa Tours y todo fue muy sencillo. Nos explicaron dónde nos recogían y recibimos toda la información por WhatsApp. Coco Bongo estuvo brutal, especialmente el espectáculo. Si estás en Punta Cana y te gusta salir, es algo que hay que hacer al menos una vez.',
	},
];

export const reviews: Review[] = entries.map(({ destinationId, tourSlug, ...review }) => ({
	...findTour(destinationId, tourSlug),
	...review,
}));

export const reviewTourHref = (review: Review) => tourHref(review.destination, review.tour);

const ratingFormatter = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatRating = (rating: number) => ratingFormatter.format(rating);

export const reviewCountLabel = (count: number) => `${count} ${count === 1 ? 'reseña' : 'reseñas'}`;

export const reviewSourceSummary = (source: ReviewSource) =>
	`${formatRating(source.rating)} en ${source.name}, ${reviewCountLabel(source.count)}`;

export const reviewSummary = (review: Review) => `${review.author} (${review.tourTitle}): ${review.text}`;
