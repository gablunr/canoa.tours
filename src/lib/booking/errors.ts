const bookingErrorMessages: Record<string, string> = {
	not_enough_seats: 'No quedan plazas suficientes para esa fecha. Prueba con menos personas o con otro día.',
	day_closed: 'Ese día no hay salidas. Elige otra fecha.',
	coupon_not_valid: 'El cupón no es válido para esta excursión o esta fecha.',
	coupon_exhausted: 'El cupón ya se ha usado el máximo de veces.',
	booking_window_closed: 'Ya no se puede reservar esa salida en línea. Escríbenos por WhatsApp y lo intentamos.',
	no_departure_on_date: 'No hay salida ese día de la semana. Elige otra fecha.',
	group_too_large: 'El grupo supera el máximo de personas de esta excursión.',
	hotel_not_available: 'No encontramos ese hotel. Escríbelo a mano y te confirmamos la recogida.',
	pickup_zone_not_served: 'Esta excursión no recoge en esa zona. Escríbenos y buscamos una solución.',
	product_not_available: 'Esta excursión no está disponible para reservar ahora mismo.',
	schedule_not_available: 'Ese horario ya no está disponible.',
	booking_not_found: 'No encontramos la reserva.',
	booking_not_pending: 'La reserva ya no está pendiente de pago.',
	booking_not_confirmed: 'La reserva no está confirmada.',
	booking_not_cancellable: 'Esta reserva ya no se puede cancelar.',
	tour_not_started: 'La excursión todavía no ha empezado.',
	invalid_outcome: 'El estado indicado no es válido.',
	forbidden: 'No tienes permiso para hacer esto.',
};

const knownErrorCodes = Object.keys(bookingErrorMessages);

const genericBookingErrorMessage = 'No hemos podido completar la operación. Inténtalo de nuevo o escríbenos por WhatsApp.';

export function dbErrorCode(error: unknown): string | null {
	if (typeof error !== 'object' || error === null || !('message' in error)) return null;
	const message = typeof error.message === 'string' ? error.message.trim() : '';
	if (knownErrorCodes.includes(message)) return message;
	return knownErrorCodes.find((code) => new RegExp(`\\b${code}\\b`).test(message)) ?? null;
}

export function bookingErrorMessage(code: string | null): string {
	return (code && bookingErrorMessages[code]) || genericBookingErrorMessage;
}
