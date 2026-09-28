import { describe, expect, it } from 'vitest';
import { fitWithin, googleDescription, googleTitle, priceChanges, priceSample, type PricedOperations } from './tour-editor-helpers';

const zoneNames = { bavaro: 'Bávaro', macao: 'Macao', capcana: 'Cap Cana' };

const saved: PricedOperations = {
	pricingMode: 'per_person',
	priceUnit: 'por persona',
	depositValue: 20,
	prices: { base: 55, child: { amount: 30, minAge: 3, maxAge: 11 } },
	pickupFees: [
		{ zoneId: 'bavaro', fee: 15 },
		{ zoneId: 'macao', fee: 20 },
	],
};

describe('fitWithin', () => {
	it('keeps images that already fit', () => {
		expect(fitWithin(1600, 1200, 2400)).toEqual({ width: 1600, height: 1200, scaled: false });
	});

	it('scales the longest side down to the limit', () => {
		expect(fitWithin(4032, 3024, 2400)).toEqual({ width: 2400, height: 1800, scaled: true });
		expect(fitWithin(3024, 4032, 2400)).toEqual({ width: 1800, height: 2400, scaled: true });
	});
});

describe('priceChanges', () => {
	it('returns nothing when prices stay the same', () => {
		expect(priceChanges(saved, structuredClone(saved), zoneNames)).toEqual([]);
	});

	it('summarizes every amount that changes', () => {
		const next: PricedOperations = {
			...saved,
			depositValue: 25,
			prices: { base: 60, child: { amount: 30, minAge: 4, maxAge: 12 } },
			pickupFees: [
				{ zoneId: 'bavaro', fee: 0 },
				{ zoneId: 'capcana', fee: 25 },
			],
		};
		expect(priceChanges(saved, next, zoneNames)).toEqual([
			'Adulto: US$55 → US$60',
			'Edades de niño: de 3 a 11 → de 4 a 12',
			'Depósito: US$20 → US$25',
			'Recogida en Bávaro: US$15 → incluida',
			'Recogida en Cap Cana: no se recoge → US$25',
			'Recogida en Macao: US$20 → no se recoge',
		]);
	});

	it('mentions the pricing mode and the child price going away', () => {
		const next: PricedOperations = { ...saved, pricingMode: 'per_group', prices: { base: 300, child: null } };
		expect(priceChanges(saved, next, zoneNames)).toEqual(['Cobro: por persona → por grupo', 'Grupo: US$55 → US$300', 'Niño: US$30 → sin precio de niño']);
	});

	it('ignores differences below one cent', () => {
		const next: PricedOperations = { ...saved, prices: { ...saved.prices, base: 55.001 } };
		expect(priceChanges(saved, next, zoneNames)).toEqual([]);
	});
});

describe('priceSample', () => {
	it('shows the price, the child price and the deposit', () => {
		expect(priceSample(saved)).toBe('Desde US$55 por persona. Niños de 3 a 11 años: US$30. Depósito de US$20.');
	});

	it('asks for the price when there is none', () => {
		expect(priceSample({ ...saved, prices: { base: null, child: null } })).toBe('Pon el precio para ver la muestra.');
	});
});

describe('google preview', () => {
	it('adds the suffix to the title', () => {
		expect(googleTitle(' Isla Saona ', ': precio y qué incluye')).toBe('Isla Saona: precio y qué incluye');
	});

	it('adds the price only when the description still fits', () => {
		expect(googleDescription('Corto.', ' Desde US$55 por persona.', 160)).toBe('Corto. Desde US$55 por persona.');
		const long = 'a'.repeat(150);
		expect(googleDescription(long, ' Desde US$55 por persona.', 160)).toBe(long);
	});
});
