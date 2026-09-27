export interface QuoteInput {
	pricingMode: 'per_person' | 'per_group';
	adultPrice: number;
	childPrice: number | null;
	adults: number;
	children: number;
	infants: number;
	depositType: 'fixed' | 'percent';
	depositValue: number;
	pickupFeePerPerson: number | null;
	insurance: boolean;
	insurancePricePerPerson: number;
	coupon: { type: 'fixed' | 'percent'; value: number } | null;
}

export interface QuoteLine {
	key: 'adults' | 'children' | 'group' | 'pickup' | 'insurance' | 'discount';
	quantity: number;
	unitAmount: number;
	amount: number;
}

export interface Quote {
	lines: QuoteLine[];
	subtotal: number;
	pickupTotal: number;
	pickupPending: boolean;
	insuranceTotal: number;
	discountTotal: number;
	total: number;
	depositAmount: number;
	balanceAmount: number;
}

export function toCents(amount: number): number {
	return Math.round(Number.parseFloat((amount * 100).toFixed(6)));
}

const fromCents = (cents: number) => cents / 100;

const percentOf = (cents: number, percent: number) => Math.round((cents * percent) / 100);

interface CentsLine {
	key: QuoteLine['key'];
	quantity: number;
	unitCents: number;
}

export function quoteBooking(input: QuoteInput): Quote {
	const adults = Math.max(0, Math.trunc(input.adults));
	const children = Math.max(0, Math.trunc(input.children));
	const payingPeople = adults + children;
	const isGroup = input.pricingMode === 'per_group';
	const lines: CentsLine[] = [];

	if (isGroup) {
		lines.push({ key: 'group', quantity: 1, unitCents: toCents(input.adultPrice) });
	} else {
		if (adults > 0) lines.push({ key: 'adults', quantity: adults, unitCents: toCents(input.adultPrice) });
		if (children > 0) lines.push({ key: 'children', quantity: children, unitCents: toCents(input.childPrice ?? input.adultPrice) });
	}

	const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0);

	const pickupPending = input.pickupFeePerPerson === null;
	const pickupUnitCents = pickupPending ? 0 : toCents(input.pickupFeePerPerson ?? 0);
	const pickupCents = pickupUnitCents * payingPeople;
	if (pickupCents > 0) lines.push({ key: 'pickup', quantity: payingPeople, unitCents: pickupUnitCents });

	const insuranceUnitCents = toCents(input.insurancePricePerPerson);
	const insuranceCents = input.insurance ? insuranceUnitCents * payingPeople : 0;
	if (insuranceCents > 0) lines.push({ key: 'insurance', quantity: payingPeople, unitCents: insuranceUnitCents });

	const requestedDiscountCents = input.coupon
		? input.coupon.type === 'percent'
			? percentOf(subtotalCents, input.coupon.value)
			: toCents(input.coupon.value)
		: 0;
	const discountCents = Math.min(Math.max(requestedDiscountCents, 0), subtotalCents);
	if (discountCents > 0) lines.push({ key: 'discount', quantity: 1, unitCents: -discountCents });

	const totalCents = subtotalCents + pickupCents + insuranceCents - discountCents;

	const tourDepositCents =
		input.depositType === 'percent'
			? percentOf(subtotalCents - discountCents, input.depositValue)
			: toCents(input.depositValue) * (isGroup ? 1 : payingPeople);
	const cappedTourDepositCents = Math.min(Math.max(tourDepositCents, 0), totalCents - insuranceCents);
	const depositCents = cappedTourDepositCents + insuranceCents;

	return {
		lines: lines.map((line) => ({
			key: line.key,
			quantity: line.quantity,
			unitAmount: fromCents(line.unitCents),
			amount: fromCents(line.quantity * line.unitCents),
		})),
		subtotal: fromCents(subtotalCents),
		pickupTotal: fromCents(pickupCents),
		pickupPending,
		insuranceTotal: fromCents(insuranceCents),
		discountTotal: fromCents(discountCents),
		total: fromCents(totalCents),
		depositAmount: fromCents(depositCents),
		balanceAmount: fromCents(totalCents - depositCents),
	};
}
