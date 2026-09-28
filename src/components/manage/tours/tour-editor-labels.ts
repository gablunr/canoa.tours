import { departurePorts } from '../../../data/tours/departure-ports';
import { formatPrice } from '../../../lib/format';
import type { PregnancyPolicyValue, TourDuration, TourOperations } from '../../../lib/tours/tour-schema';
import type { TourZoneOption } from './tour-editor-data';
import { weekdaysLabel } from './tour-list-data';

export const durationOptions: { value: TourDuration | ''; label: string }[] = [
	{ value: '', label: 'Sin elegir' },
	{ value: 'full_day', label: 'Día completo' },
	{ value: 'half_day', label: 'Medio día' },
	{ value: 'night', label: 'Noche' },
];

export const portOptions = [
	{ value: '', label: 'Sin barco, sale desde el hotel' },
	...Object.entries(departurePorts).map(([key, port]) => ({ value: key, label: port.port })),
];

export const pregnancyOptions: { value: PregnancyPolicyValue; label: string }[] = [
	{ value: 'allowed', label: 'Sí' },
	{ value: 'limited', label: 'Con límite' },
	{ value: 'not_allowed', label: 'No' },
];

const moneyOrEmpty = (amount: number | null) => (amount === null ? 'Sin precio' : formatPrice(amount));

export function priceFacts(operations: TourOperations) {
	const { prices, pricingMode } = operations;
	const perGroup = pricingMode === 'per_group';
	return [
		{ label: perGroup ? 'Precio del grupo' : 'Precio del adulto', value: `${moneyOrEmpty(prices.base)} ${operations.priceUnit}`.trim() },
		...(perGroup
			? [{ label: 'Grupo', value: operations.maxGroupSize ? `Hasta ${operations.maxGroupSize} personas` : 'Sin tamaño' }]
			: [{ label: 'Niños', value: prices.child ? `${formatPrice(prices.child.amount)}, de ${prices.child.minAge} a ${prices.child.maxAge} años` : 'Sin precio de niño' }]),
		{ label: 'Bebés', value: operations.infantsOccupySeat ? 'No pagan y ocupan plaza' : 'No pagan ni ocupan plaza' },
		{ label: 'Depósito', value: moneyOrEmpty(operations.depositValue) },
	];
}

export function scheduleFacts(operations: TourOperations) {
	const { schedule } = operations;
	const duration = durationOptions.find((option) => option.value === operations.durationCategory);
	const port = portOptions.find((option) => option.value === operations.departurePort);
	const hours = operations.durationHours ? `${String(operations.durationHours).replace('.', ',')} h` : null;
	return [
		{ label: 'Días', value: weekdaysLabel(schedule.weekdays) ?? 'Sin días' },
		{ label: 'Recogida', value: schedule.startTime ? `De ${schedule.startTime} a ${schedule.pickupTo ?? schedule.startTime}` : 'Sin horario' },
		{ label: 'Vuelta', value: schedule.returnAt ?? 'Sin hora' },
		{ label: 'Duración', value: [duration?.label, hours].filter(Boolean).join(', ') || 'Sin duración' },
		{ label: 'Puerto', value: port?.label ?? 'Sin barco' },
		{ label: 'Punto de encuentro', value: operations.meetingPoint || 'Sin punto de encuentro' },
	];
}

export function pickupFacts(operations: TourOperations, zones: TourZoneOption[]) {
	const fees = new Map(operations.pickupFees.map((fee) => [fee.zoneId, fee.fee]));
	return zones.map((zone) => {
		const fee = fees.get(zone.id);
		return { label: zone.name, value: fee === undefined ? 'No se recoge' : fee === 0 ? 'Incluida' : `${formatPrice(fee)} por persona` };
	});
}
