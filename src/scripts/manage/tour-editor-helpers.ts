import { formatPrice } from '../../lib/format';
import type { TourOperations } from '../../lib/tours/tour-schema';

export type PricedOperations = Pick<TourOperations, 'pricingMode' | 'prices' | 'depositValue' | 'pickupFees' | 'priceUnit'>;

const pricingModeLabels: Record<TourOperations['pricingMode'], string> = { per_person: 'por persona', per_group: 'por grupo' };

const isAmount = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

const moneyLabel = (amount: number | null | undefined, emptyLabel: string) => (isAmount(amount) ? formatPrice(amount) : emptyLabel);

const sameAmount = (first: number | null | undefined, second: number | null | undefined) =>
	isAmount(first) && isAmount(second) ? Math.abs(first - second) < 0.005 : !isAmount(first) && !isAmount(second);

export function fitWithin(width: number, height: number, maxSide: number) {
	const scale = Math.min(1, maxSide / Math.max(width, height));
	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: scale < 1 };
}

export function priceChanges(before: PricedOperations, after: PricedOperations, zoneNames: Record<string, string>): string[] {
	const changes: string[] = [];
	if (before.pricingMode !== after.pricingMode) {
		changes.push(`Cobro: ${pricingModeLabels[before.pricingMode]} → ${pricingModeLabels[after.pricingMode]}`);
	}

	const baseLabel = after.pricingMode === 'per_group' ? 'Grupo' : 'Adulto';
	if (!sameAmount(before.prices.base, after.prices.base)) {
		changes.push(`${baseLabel}: ${moneyLabel(before.prices.base, 'sin precio')} → ${moneyLabel(after.prices.base, 'sin precio')}`);
	}

	const beforeChild = before.pricingMode === 'per_person' ? before.prices.child : null;
	const afterChild = after.pricingMode === 'per_person' ? after.prices.child : null;
	if (!sameAmount(beforeChild?.amount, afterChild?.amount)) {
		changes.push(`Niño: ${moneyLabel(beforeChild?.amount, 'sin precio de niño')} → ${moneyLabel(afterChild?.amount, 'sin precio de niño')}`);
	}
	if (beforeChild && afterChild && (beforeChild.minAge !== afterChild.minAge || beforeChild.maxAge !== afterChild.maxAge)) {
		changes.push(`Edades de niño: de ${beforeChild.minAge} a ${beforeChild.maxAge} → de ${afterChild.minAge} a ${afterChild.maxAge}`);
	}

	if (!sameAmount(before.depositValue, after.depositValue)) {
		changes.push(`Depósito: ${moneyLabel(before.depositValue, 'sin depósito')} → ${moneyLabel(after.depositValue, 'sin depósito')}`);
	}

	const beforeFees = new Map(before.pickupFees.map((fee) => [fee.zoneId, fee.fee]));
	const afterFees = new Map(after.pickupFees.map((fee) => [fee.zoneId, fee.fee]));
	const zoneIds = [...new Set([...afterFees.keys(), ...beforeFees.keys()])];
	for (const zoneId of zoneIds) {
		const previous = beforeFees.get(zoneId);
		const next = afterFees.get(zoneId);
		if (previous !== undefined && next !== undefined && sameAmount(previous, next)) continue;
		const zoneName = zoneNames[zoneId] ?? 'otra zona';
		const feeLabel = (fee: number | undefined) => (fee === undefined ? 'no se recoge' : fee === 0 ? 'incluida' : formatPrice(fee));
		changes.push(`Recogida en ${zoneName}: ${feeLabel(previous)} → ${feeLabel(next)}`);
	}
	return changes;
}

export function priceSample(operations: PricedOperations) {
	const { prices, pricingMode, depositValue, priceUnit } = operations;
	if (!isAmount(prices.base)) return 'Pon el precio para ver la muestra.';
	const parts = [`Desde ${formatPrice(prices.base)}${priceUnit.trim() ? ` ${priceUnit.trim()}` : ''}.`];
	const child = pricingMode === 'per_person' ? prices.child : null;
	if (child && isAmount(child.amount)) parts.push(`Niños de ${child.minAge} a ${child.maxAge} años: ${formatPrice(child.amount)}.`);
	if (isAmount(depositValue)) parts.push(`Depósito de ${formatPrice(depositValue)}.`);
	return parts.join(' ');
}

export const googleTitle = (name: string, suffix: string) => `${name.trim()}${suffix}`;

export function googleDescription(summary: string, suffix: string, limit: number) {
	const trimmed = summary.trim();
	const withPrice = `${trimmed}${suffix}`;
	return withPrice.length <= limit ? withPrice : trimmed;
}
