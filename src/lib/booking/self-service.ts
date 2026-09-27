import { bookingPolicy, cancellationNoticeLabel, maxDateChangesLabel } from '../../data/booking/booking-policy';
import type { BookingDetails } from './booking-details';

const santoDomingoUtcOffset = '-04:00';
const hourMs = 60 * 60 * 1000;

type SelfServiceDetails = Pick<BookingDetails, 'status' | 'hasInsurance' | 'tourDate' | 'startTime' | 'dateChangesCount'>;

export type SelfServiceCheck = { allowed: boolean; reason?: string };

function normalizeTime(startTime: string) {
	const [hours = '00', minutes = '00', seconds = '00'] = startTime.split(':');
	return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.slice(0, 2).padStart(2, '0')}`;
}

export function tourStartsAt(tourDate: string, startTime: string): Date {
	return new Date(`${tourDate}T${normalizeTime(startTime)}${santoDomingoUtcOffset}`);
}

export function hasNotice(tourDate: string, startTime: string, now = new Date()): boolean {
	return tourStartsAt(tourDate, startTime).getTime() - now.getTime() >= bookingPolicy.cancellationNoticeHours * hourMs;
}

function commonCheck(details: SelfServiceDetails, now: Date, action: 'cambiar la fecha' | 'cancelar'): SelfServiceCheck | null {
	if (details.status !== 'confirmed') {
		return { allowed: false, reason: 'Esta reserva ya no admite cambios.' };
	}
	if (!details.hasInsurance) {
		return {
			allowed: false,
			reason: `Tu reserva no incluye el seguro de cancelación, así que no puedes ${action} desde tu cuenta. Escríbenos y te ayudamos.`,
		};
	}
	if (!hasNotice(details.tourDate, details.startTime, now)) {
		return { allowed: false, reason: `Solo puedes ${action} con al menos ${cancellationNoticeLabel} de antelación.` };
	}
	return null;
}

export function canCustomerChangeDate(details: SelfServiceDetails, now = new Date()): SelfServiceCheck {
	const blocked = commonCheck(details, now, 'cambiar la fecha');
	if (blocked) return blocked;
	if (details.dateChangesCount >= bookingPolicy.maxDateChanges) {
		return { allowed: false, reason: `Ya has cambiado la fecha ${maxDateChangesLabel}, que es el máximo permitido.` };
	}
	return { allowed: true };
}

export function canCustomerCancel(details: SelfServiceDetails, now = new Date()): SelfServiceCheck {
	return commonCheck(details, now, 'cancelar') ?? { allowed: true };
}
