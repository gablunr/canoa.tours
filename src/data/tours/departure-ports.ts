import type { DestinationId } from './destinations';

export interface DeparturePort {
	destinationId: DestinationId;
	port: string;
	distanceKm: number;
}

export const departurePorts = {
	saona: { destinationId: 'isla-saona', port: 'Bayahibe', distanceKm: 80 },
	catalina: { destinationId: 'isla-catalina', port: 'La Romana', distanceKm: 90 },
	samana: { destinationId: 'samana', port: 'Miches', distanceKm: 95 },
} as const satisfies Record<string, DeparturePort>;

export const distanceLabel = (port: DeparturePort) => `${port.distanceKm} km`;
