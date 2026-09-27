import { describe, expect, it } from 'vitest';
import { quoteBooking, toCents, type QuoteInput } from './pricing';

const baseInput: QuoteInput = {
	pricingMode: 'per_person',
	adultPrice: 85,
	childPrice: 60,
	adults: 2,
	children: 0,
	infants: 0,
	depositType: 'fixed',
	depositValue: 20,
	pickupFeePerPerson: 0,
	insurance: false,
	insurancePricePerPerson: 4.99,
	coupon: null,
};

describe('toCents', () => {
	it('rounds floating point amounts to whole cents', () => {
		expect(toCents(4.99)).toBe(499);
		expect(toCents(1.005)).toBe(101);
		expect(toCents(0.1 + 0.2)).toBe(30);
	});
});

describe('quoteBooking', () => {
	it('prices adults per person with a fixed deposit per person', () => {
		const quote = quoteBooking(baseInput);
		expect(quote.subtotal).toBe(170);
		expect(quote.total).toBe(170);
		expect(quote.depositAmount).toBe(40);
		expect(quote.balanceAmount).toBe(130);
		expect(quote.lines).toEqual([{ key: 'adults', quantity: 2, unitAmount: 85, amount: 170 }]);
	});

	it('prices children at the child rate, keeps infants free and counts children for the deposit', () => {
		const quote = quoteBooking({ ...baseInput, children: 1, infants: 1 });
		expect(quote.subtotal).toBe(230);
		expect(quote.depositAmount).toBe(60);
		expect(quote.lines.map((line) => line.key)).toEqual(['adults', 'children']);
	});

	it('falls back to the adult price when there is no child price', () => {
		const quote = quoteBooking({ ...baseInput, childPrice: null, children: 1 });
		expect(quote.subtotal).toBe(255);
	});

	it('charges a per group product once and takes the deposit once', () => {
		const quote = quoteBooking({ ...baseInput, pricingMode: 'per_group', adultPrice: 450, adults: 5, children: 2, depositValue: 100 });
		expect(quote.subtotal).toBe(450);
		expect(quote.depositAmount).toBe(100);
		expect(quote.balanceAmount).toBe(350);
		expect(quote.lines).toEqual([{ key: 'group', quantity: 1, unitAmount: 450, amount: 450 }]);
	});

	it('adds the pickup fee per paying person', () => {
		const quote = quoteBooking({ ...baseInput, children: 1, infants: 2, pickupFeePerPerson: 10 });
		expect(quote.pickupTotal).toBe(30);
		expect(quote.pickupPending).toBe(false);
		expect(quote.total).toBe(260);
	});

	it('marks the pickup fee as pending and counts it as zero when the zone is unknown', () => {
		const quote = quoteBooking({ ...baseInput, pickupFeePerPerson: null });
		expect(quote.pickupPending).toBe(true);
		expect(quote.pickupTotal).toBe(0);
		expect(quote.total).toBe(170);
		expect(quote.lines.some((line) => line.key === 'pickup')).toBe(false);
	});

	it('adds insurance per paying person and charges it online with the deposit', () => {
		const quote = quoteBooking({ ...baseInput, children: 1, insurance: true });
		expect(quote.insuranceTotal).toBe(14.97);
		expect(quote.total).toBe(244.97);
		expect(quote.depositAmount).toBe(74.97);
		expect(quote.balanceAmount).toBe(170);
	});

	it('applies a percent coupon to the subtotal only', () => {
		const quote = quoteBooking({ ...baseInput, pickupFeePerPerson: 10, coupon: { type: 'percent', value: 10 } });
		expect(quote.discountTotal).toBe(17);
		expect(quote.total).toBe(173);
		expect(quote.lines.at(-1)).toEqual({ key: 'discount', quantity: 1, unitAmount: -17, amount: -17 });
	});

	it('applies a fixed coupon', () => {
		const quote = quoteBooking({ ...baseInput, coupon: { type: 'fixed', value: 25 } });
		expect(quote.discountTotal).toBe(25);
		expect(quote.total).toBe(145);
		expect(quote.balanceAmount).toBe(105);
	});

	it('never lets a coupon push the balance below zero', () => {
		const quote = quoteBooking({ ...baseInput, insurance: true, coupon: { type: 'fixed', value: 500 } });
		expect(quote.discountTotal).toBe(170);
		expect(quote.total).toBe(9.98);
		expect(quote.depositAmount).toBe(9.98);
		expect(quote.balanceAmount).toBe(0);
	});

	it('caps the deposit so the balance stays at zero or above', () => {
		const quote = quoteBooking({ ...baseInput, coupon: { type: 'fixed', value: 150 } });
		expect(quote.total).toBe(20);
		expect(quote.depositAmount).toBe(20);
		expect(quote.balanceAmount).toBe(0);
	});

	it('computes a percent deposit over the discounted subtotal', () => {
		const quote = quoteBooking({ ...baseInput, depositType: 'percent', depositValue: 30, coupon: { type: 'percent', value: 10 } });
		expect(quote.depositAmount).toBe(45.9);
		expect(quote.balanceAmount).toBe(107.1);
	});
});
