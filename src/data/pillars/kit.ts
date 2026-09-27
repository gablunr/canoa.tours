import { guideHref, guides } from '../guides/guides';
import { destinationHref, findDestination, type DestinationId } from '../tours/destinations';
import { findTourDetails, scheduleWhen, tourDetails, tourDetailsHref, weekdayLabel, weekdays, type TourDetails } from '../tours/tours';
import { formatPrice } from '../../lib/format';
import { routes } from '../site/routes';

export { formatPrice } from '../../lib/format';
export { routes } from '../site/routes';
export { isGuidePublished } from '../guides/guide-content';
export { pickupZonesLink } from '../site/navigation';
export { departurePorts, distanceLabel } from '../tours/departure-ports';
export { cancellationInsurancePriceLabel, cancellationNoticeLabel, maxDateChangesLabel } from '../booking/booking-policy';
export {
	priceLabel,
	childPriceLabel,
	depositLabel,
	durationLabel,
	scheduleLabel,
	scheduleSentence,
	scheduleWhen,
	pickupWindowLabel,
	returnLabel,
	clockLabel,
	minAgeLabel,
	lowestPickupFee,
} from '../tours/tours';

export const tourOf = (destinationId: DestinationId, slug: string): TourDetails => findTourDetails(destinationId, slug);

export const toursOf = (destinationId: DestinationId): TourDetails[] =>
	tourDetails.filter((details) => details.destination.id === destinationId);

export const tourPath = (details: TourDetails) => tourDetailsHref(details);

export const pillarPath = (destinationId: DestinationId) => destinationHref(findDestination(destinationId));

export const fromPriceOf = (destinationId: DestinationId) => formatPrice(findDestination(destinationId).fromPrice);

export const departureDaysOf = (destinationId: DestinationId) =>
	scheduleWhen(weekdays.filter((day) => toursOf(destinationId).some((details) => details.days.includes(day))));

export function guidePath(slug: string) {
	const guide = guides.find((candidate) => candidate.slug === slug);
	return guide ? guideHref(guide) : routes.guides;
}

export const link = (href: string, label: string) => `<a href="${href}">${label}</a>`;

export function weekdayRows(destinationId: DestinationId): string[][] {
	const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });
	const tours = toursOf(destinationId);

	return weekdays.map((day) => {
		const names = tours.filter((details) => details.days.includes(day)).map((details) => details.tour.name);
		return [weekdayLabel(day), names.length > 0 ? listFormat.format(names) : 'Sin salidas'];
	});
}
