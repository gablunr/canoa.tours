import { ActionError, defineAction, type ActionErrorCode } from 'astro:actions';
import { z } from 'astro/zod';
import { bookingPolicy } from '../data/booking/booking-policy';
import { findActiveProductId, loadBookableProduct, loadPickupOptions, type BookableProduct } from '../lib/booking/catalog';
import { bookingErrorMessage, dbErrorCode } from '../lib/booking/errors';
import { closeUnpaidCheckoutSession, createCheckoutSession } from '../lib/booking/payments';
import { quoteBooking, type Quote, type QuoteInput } from '../lib/booking/pricing';
import { siteOrigin } from '../lib/site-origin';
import { supabaseAdmin } from '../lib/supabase/admin';

const maxPendingBookingsPerCustomer = 2;
const termsVersion = 'v1';
const cancelledCheckoutQuery = '?pago=cancelado';

const productKeyInput = z.string().trim().min(1).max(100);

const availabilityInputSchema = z
	.object({ productKey: productKeyInput, from: z.iso.date(), to: z.iso.date() })
	.refine((range) => range.from <= range.to, { message: 'El rango de fechas no es válido.', path: ['to'] });

const bookingSelectionShape = {
	productKey: productKeyInput,
	tourDate: z.iso.date(),
	adults: z.number().int().min(0).max(50),
	children: z.number().int().min(0).max(50).default(0),
	infants: z.number().int().min(0).max(50).default(0),
	hotelId: z.uuid().optional(),
	hotelName: z.string().trim().min(1).max(200).optional(),
	zoneSlug: z.string().trim().min(1).max(100).optional(),
	insurance: z.boolean().default(false),
	couponCode: z.string().trim().min(1).max(64).optional(),
};

const optionalUtmValue = z.string().trim().max(200).optional();

const bookingContactShape = {
	leadName: z.string().trim().min(2).max(120),
	email: z.string().trim().toLowerCase().pipe(z.email()),
	phone: z.string().trim().min(6).max(30),
	country: z
		.string()
		.regex(/^[A-Za-z]{2}$/)
		.transform((country) => country.toUpperCase())
		.optional(),
	acceptTerms: z.literal(true),
	utm: z
		.object({
			source: optionalUtmValue,
			medium: optionalUtmValue,
			campaign: optionalUtmValue,
			term: optionalUtmValue,
			content: optionalUtmValue,
		})
		.optional(),
};

const hasPayingPeople = (selection: { adults: number; children: number }) => selection.adults + selection.children > 0;
const payingPeopleIssue = { message: 'Añade al menos un adulto o un niño.', path: ['adults'] };

const quoteInputSchema = z.object(bookingSelectionShape).refine(hasPayingPeople, payingPeopleIssue);
const createInputSchema = z.object({ ...bookingSelectionShape, ...bookingContactShape }).refine(hasPayingPeople, payingPeopleIssue);

type BookingSelection = z.infer<typeof quoteInputSchema>;

interface CouponRow {
	id: string;
	code: string;
	discount_type: 'fixed' | 'percent';
	discount_value: number | string;
	product_id: string | null;
	valid_from: string | null;
	valid_to: string | null;
	active: boolean;
}

interface ResolvedPickup {
	hotelId: string | null;
	zoneId: string | null;
	zoneName: string | null;
	feePerPerson: number | null;
}

interface PricedSelection {
	bookable: BookableProduct;
	pickup: ResolvedPickup;
	coupon: CouponRow | null;
	couponValid: boolean;
	quote: Quote;
}

function actionErrorCodeFor(code: string): ActionErrorCode {
	if (code === 'not_enough_seats' || code === 'day_closed' || code === 'coupon_exhausted') return 'CONFLICT';
	if (code === 'product_not_available' || code === 'booking_not_found') return 'NOT_FOUND';
	if (code === 'forbidden') return 'FORBIDDEN';
	return 'BAD_REQUEST';
}

function bookingActionError(code: string): ActionError {
	return new ActionError({ code: actionErrorCodeFor(code), message: bookingErrorMessage(code) });
}

function toActionError(error: unknown): ActionError {
	if (error instanceof ActionError) return error;
	const code = dbErrorCode(error);
	if (code) return bookingActionError(code);
	console.error('booking_action_failed', error);
	return new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: bookingErrorMessage(null) });
}

function localToday(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date());
}

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`);

async function findCoupon(code: string): Promise<CouponRow | null> {
	const { data, error } = await supabaseAdmin
		.from('coupons')
		.select('id, code, discount_type, discount_value, product_id, valid_from, valid_to, active')
		.ilike('code', escapeLikePattern(code))
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return (data as CouponRow | null) ?? null;
}

function isCouponValid(coupon: CouponRow, productId: string): boolean {
	const today = localToday();
	return (
		coupon.active &&
		(coupon.product_id === null || coupon.product_id === productId) &&
		(coupon.valid_from === null || coupon.valid_from <= today) &&
		(coupon.valid_to === null || coupon.valid_to >= today)
	);
}

async function resolvePickup(bookable: BookableProduct, selection: BookingSelection): Promise<ResolvedPickup> {
	if (selection.hotelId) {
		const { data: hotel, error } = await supabaseAdmin
			.from('hotels')
			.select('id, zone_id, active')
			.eq('id', selection.hotelId)
			.maybeSingle();
		if (error) throw error;
		if (!hotel || !hotel.active) throw bookingActionError('hotel_not_available');

		const zone = bookable.pickupZones.find((candidate) => candidate.id === hotel.zone_id);
		if (!zone) throw bookingActionError('pickup_zone_not_served');
		return { hotelId: hotel.id, zoneId: zone.id, zoneName: zone.name, feePerPerson: zone.fee };
	}

	if (selection.zoneSlug) {
		const zone = bookable.pickupZones.find((candidate) => candidate.slug === selection.zoneSlug);
		if (!zone) throw bookingActionError('pickup_zone_not_served');
		return { hotelId: null, zoneId: zone.id, zoneName: zone.name, feePerPerson: zone.fee };
	}

	return { hotelId: null, zoneId: null, zoneName: null, feePerPerson: null };
}

function tourPrices(bookable: BookableProduct): { adultPrice: number; childPrice: number | null } | null {
	if (bookable.product.pricing_mode === 'per_group') {
		const groupPrice = bookable.prices.group ?? bookable.prices.adult;
		return groupPrice === null ? null : { adultPrice: groupPrice, childPrice: null };
	}
	return bookable.prices.adult === null ? null : { adultPrice: bookable.prices.adult, childPrice: bookable.prices.child };
}

async function priceSelection(selection: BookingSelection): Promise<PricedSelection> {
	const bookable = await loadBookableProduct(selection.productKey, selection.tourDate);
	if (!bookable) throw bookingActionError('product_not_available');
	if (!bookable.schedule) throw bookingActionError('no_departure_on_date');

	const prices = tourPrices(bookable);
	if (!prices) throw bookingActionError('product_not_available');

	const maxGroupSize = bookable.product.max_group_size;
	if (maxGroupSize !== null && selection.adults + selection.children + selection.infants > maxGroupSize) {
		throw bookingActionError('group_too_large');
	}

	const [pickup, coupon] = await Promise.all([
		resolvePickup(bookable, selection),
		selection.couponCode ? findCoupon(selection.couponCode) : Promise.resolve(null),
	]);
	const couponValid = coupon !== null && isCouponValid(coupon, bookable.product.id);

	const quoteInput: QuoteInput = {
		pricingMode: bookable.product.pricing_mode,
		adultPrice: prices.adultPrice,
		childPrice: prices.childPrice,
		adults: selection.adults,
		children: selection.children,
		infants: selection.infants,
		depositType: bookable.product.deposit_type,
		depositValue: Number(bookable.product.deposit_value),
		pickupFeePerPerson: pickup.feePerPerson,
		insurance: selection.insurance,
		insurancePricePerPerson: bookingPolicy.cancellationInsurancePrice,
		coupon: coupon && couponValid ? { type: coupon.discount_type, value: Number(coupon.discount_value) } : null,
	};

	return { bookable, pickup, coupon, couponValid, quote: quoteBooking(quoteInput) };
}

async function countActivePendingBookings(customerId: string): Promise<number> {
	const { count, error } = await supabaseAdmin
		.from('bookings')
		.select('id', { count: 'exact', head: true })
		.eq('customer_id', customerId)
		.eq('status', 'pending_payment')
		.gt('expires_at', new Date().toISOString());
	if (error) throw error;
	return count ?? 0;
}

interface CustomerRow {
	id: string;
	email: string;
	full_name: string;
	phone: string | null;
	country: string | null;
	stripe_customer_id: string | null;
}

const customerColumns = 'id, email, full_name, phone, country, stripe_customer_id';

async function findCustomerByEmail(email: string): Promise<CustomerRow | null> {
	const { data, error } = await supabaseAdmin.from('customers').select(customerColumns).eq('email', email).maybeSingle();
	if (error) throw error;
	return (data as CustomerRow | null) ?? null;
}

async function upsertCustomer(
	existing: CustomerRow | null,
	contact: { email: string; fullName: string; phone: string; country: string | null },
): Promise<CustomerRow> {
	if (!existing) {
		const { error } = await supabaseAdmin
			.from('customers')
			.upsert(
				{ email: contact.email, full_name: contact.fullName, phone: contact.phone, country: contact.country },
				{ onConflict: 'email', ignoreDuplicates: true },
			);
		if (error) throw error;
	}

	const customer = existing ?? (await findCustomerByEmail(contact.email));
	if (!customer) throw new Error('customer_not_saved');

	const missingFields = {
		...(customer.full_name.trim() === '' ? { full_name: contact.fullName } : {}),
		...(!customer.phone ? { phone: contact.phone } : {}),
		...(!customer.country && contact.country ? { country: contact.country } : {}),
	};

	if (Object.keys(missingFields).length > 0) {
		const { error } = await supabaseAdmin.from('customers').update(missingFields).eq('id', customer.id);
		if (error) throw error;
		return { ...customer, ...missingFields };
	}

	return customer;
}

async function expireBooking(bookingId: string) {
	const { error } = await supabaseAdmin.from('bookings').update({ status: 'expired' }).eq('id', bookingId).eq('status', 'pending_payment');
	if (error) console.error('booking_not_expired', { bookingId, error });
}

async function releaseUnpaidBookings(customerId: string, productId: string) {
	const { data, error } = await supabaseAdmin
		.from('bookings')
		.select('id, stripe_checkout_session_id')
		.eq('customer_id', customerId)
		.eq('product_id', productId)
		.eq('status', 'pending_payment')
		.gt('expires_at', new Date().toISOString())
		.not('stripe_checkout_session_id', 'is', null);
	if (error) throw error;

	await Promise.all(
		(data ?? []).map(async (booking) => {
			if (booking.stripe_checkout_session_id && (await closeUnpaidCheckoutSession(booking.stripe_checkout_session_id))) {
				await expireBooking(booking.id);
			}
		}),
	);
}

export const bookings = {
	availability: defineAction({
		accept: 'json',
		input: availabilityInputSchema,
		handler: async (input) => {
			try {
				const productId = await findActiveProductId(input.productKey);
				if (!productId) throw bookingActionError('product_not_available');

				const { data, error } = await supabaseAdmin.rpc('get_availability', {
					p_product_id: productId,
					p_from: input.from,
					p_to: input.to,
				});
				if (error) throw error;

				return { days: (data ?? []).map((day) => ({ date: day.tour_date, available: day.available, bookable: day.bookable })) };
			} catch (error) {
				throw toActionError(error);
			}
		},
	}),

	pickupOptions: defineAction({
		accept: 'json',
		input: z.object({ productKey: productKeyInput }),
		handler: async (input) => {
			try {
				const options = await loadPickupOptions(input.productKey);
				if (!options) throw bookingActionError('product_not_available');
				return options;
			} catch (error) {
				throw toActionError(error);
			}
		},
	}),

	quote: defineAction({
		accept: 'json',
		input: quoteInputSchema,
		handler: async (input) => {
			try {
				const { bookable, pickup, coupon, couponValid, quote } = await priceSelection(input);
				return {
					...quote,
					currency: bookable.product.currency,
					pickupZone: pickup.zoneName,
					coupon: input.couponCode
						? {
								code: coupon?.code ?? input.couponCode,
								valid: couponValid,
								message: couponValid ? null : bookingErrorMessage('coupon_not_valid'),
							}
						: null,
				};
			} catch (error) {
				throw toActionError(error);
			}
		},
	}),

	create: defineAction({
		accept: 'json',
		input: createInputSchema,
		handler: async (input, context) => {
			try {
				if (!input.hotelId && !input.hotelName) {
					throw new ActionError({ code: 'BAD_REQUEST', message: 'Indica tu hotel o el lugar donde te recogemos.' });
				}

				const { bookable, pickup, coupon, couponValid, quote } = await priceSelection(input);
				if (input.couponCode && !couponValid) throw bookingActionError('coupon_not_valid');

				const email = input.email.trim().toLowerCase();
				const existingCustomer = await findCustomerByEmail(email);
				if (existingCustomer) {
					await releaseUnpaidBookings(existingCustomer.id, bookable.product.id);
					if ((await countActivePendingBookings(existingCustomer.id)) >= maxPendingBookingsPerCustomer) {
						throw new ActionError({
							code: 'TOO_MANY_REQUESTS',
							message: 'Ya tienes dos reservas pendientes de pago. Complétalas o espera unos minutos para hacer otra.',
						});
					}
				}

				const customer = await upsertCustomer(existingCustomer, {
					email,
					fullName: input.leadName,
					phone: input.phone,
					country: input.country ?? null,
				});

				const { data: createdRows, error: createError } = await supabaseAdmin.rpc('create_booking', {
					p_booking: {
						product_id: bookable.product.id,
						schedule_id: bookable.schedule?.id,
						tour_date: input.tourDate,
						customer_id: customer.id,
						lead_name: input.leadName,
						lead_phone: input.phone,
						adults: input.adults,
						children: input.children,
						infants: input.infants,
						hotel_id: pickup.hotelId,
						hotel_name: input.hotelName ?? null,
						pickup_zone_id: pickup.zoneId,
						pickup_note: null,
						has_insurance: input.insurance,
						coupon_id: coupon && couponValid ? coupon.id : null,
						price_breakdown: quote.lines.map((line) => ({ ...line })),
						subtotal: quote.subtotal,
						pickup_total: quote.pickupTotal,
						insurance_total: quote.insuranceTotal,
						discount_total: quote.discountTotal,
						total: quote.total,
						deposit_amount: quote.depositAmount,
						terms_version: termsVersion,
						utm: input.utm ?? null,
					},
				});
				if (createError) throw createError;

				const created = (createdRows as { id: string; code: string }[] | null)?.[0];
				if (!created) throw new Error('booking_not_created');

				let checkout: { id: string; url: string };
				try {
					checkout = await createCheckoutSession({
						bookingId: created.id,
						bookingCode: created.code,
						productName: bookable.name,
						amount: quote.depositAmount,
						currency: bookable.product.currency,
						customer: {
							id: customer.id,
							email: customer.email,
							name: customer.full_name || input.leadName,
							stripeCustomerId: customer.stripe_customer_id,
						},
						origin: siteOrigin(context.url),
						cancelPath: `${bookable.tourPath}${cancelledCheckoutQuery}`,
					});
				} catch (checkoutError) {
					await expireBooking(created.id);
					throw checkoutError;
				}

				const { error: eventError } = await supabaseAdmin
					.from('booking_events')
					.insert({ booking_id: created.id, type: 'checkout_created', data: { session_id: checkout.id, amount: quote.depositAmount } });
				if (eventError) console.error('checkout_event_not_recorded', { bookingId: created.id, eventError });

				return { code: created.code, checkoutUrl: checkout.url };
			} catch (error) {
				throw toActionError(error);
			}
		},
	}),
};
