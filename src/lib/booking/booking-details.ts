import { supabaseAdmin } from '../supabase/admin';

export interface BookingDetails {
	id: string;
	code: string;
	status: string;
	tourDate: string;
	productId: string;
	productKey: string;
	productName: string;
	tourPath: string;
	startTime: string;
	pickupTo: string | null;
	returnAt: string | null;
	adults: number;
	children: number;
	infants: number;
	seats: number;
	leadName: string;
	leadPhone: string | null;
	customerId: string;
	customerEmail: string;
	customerName: string;
	stripeCustomerId: string | null;
	hotel: string | null;
	zone: string | null;
	pickupTime: string | null;
	pickupFeePending: boolean;
	hasInsurance: boolean;
	currency: string;
	subtotal: number;
	pickupTotal: number;
	insuranceTotal: number;
	discountTotal: number;
	total: number;
	depositAmount: number;
	balanceAmount: number;
	dateChangesCount: number;
	stripePaymentMethodId: string | null;
}

interface ProductTranslationRow {
	locale: string;
	slug: string;
	name: string;
}

interface BookingDetailsRow {
	id: string;
	code: string;
	status: string;
	tour_date: string;
	product_id: string;
	adults: number;
	children: number;
	infants: number;
	seats: number;
	lead_name: string;
	lead_phone: string | null;
	customer_id: string;
	hotel_name: string | null;
	pickup_time: string | null;
	pickup_fee_pending: boolean;
	has_insurance: boolean;
	currency: string;
	subtotal: number | string;
	pickup_total: number | string;
	insurance_total: number | string;
	discount_total: number | string;
	total: number | string;
	deposit_amount: number | string;
	balance_amount: number | string;
	date_changes_count: number;
	stripe_payment_method_id: string | null;
	products: { key: string; destination_slug: string; product_translations: ProductTranslationRow[] } | null;
	product_schedules: { start_time: string; pickup_to: string | null; return_at: string | null } | null;
	customers: { email: string; full_name: string; stripe_customer_id: string | null } | null;
	hotels: { name: string } | null;
	pickup_zones: { name: string } | null;
}

const bookingDetailsSelect = `
	id, code, status, tour_date, product_id, adults, children, infants, seats, lead_name, lead_phone, customer_id,
	hotel_name, pickup_time, pickup_fee_pending, has_insurance, currency, subtotal, pickup_total, insurance_total,
	discount_total, total, deposit_amount, balance_amount, date_changes_count, stripe_payment_method_id,
	products ( key, destination_slug, product_translations ( locale, slug, name ) ),
	product_schedules ( start_time, pickup_to, return_at ),
	customers ( email, full_name, stripe_customer_id ),
	hotels ( name ),
	pickup_zones!pickup_zone_id ( name )
`;

export const shortTime = (time: string | null) => (time ? time.slice(0, 5) : null);

export function spanishTranslation(translations: ProductTranslationRow[] | null | undefined) {
	return translations?.find((translation) => translation.locale === 'es') ?? translations?.[0] ?? null;
}

export const tourPathFor = (destinationSlug: string, tourSlug: string) => `/${destinationSlug}/${tourSlug}`;

type BookingDetailsRef = { id: string } | { code: string } | { checkoutSessionId: string };

function bookingDetailsFilter(ref: BookingDetailsRef): { column: string; value: string } {
	if ('id' in ref) return { column: 'id', value: ref.id };
	if ('code' in ref) return { column: 'code', value: ref.code };
	return { column: 'stripe_checkout_session_id', value: ref.checkoutSessionId };
}

export async function loadBookingDetails(ref: BookingDetailsRef): Promise<BookingDetails | null> {
	const filter = bookingDetailsFilter(ref);
	if (!filter.value) return null;

	const { data, error } = await supabaseAdmin.from('bookings').select(bookingDetailsSelect).eq(filter.column, filter.value).maybeSingle();

	if (error) throw error;
	if (!data) return null;

	const row = data as unknown as BookingDetailsRow;
	const translation = spanishTranslation(row.products?.product_translations);
	const productKey = row.products?.key ?? '';

	return {
		id: row.id,
		code: row.code,
		status: row.status,
		tourDate: row.tour_date,
		productId: row.product_id,
		productKey,
		productName: translation?.name ?? productKey,
		tourPath: row.products && translation ? tourPathFor(row.products.destination_slug, translation.slug) : '/',
		startTime: shortTime(row.product_schedules?.start_time ?? null) ?? '',
		pickupTo: shortTime(row.product_schedules?.pickup_to ?? null),
		returnAt: shortTime(row.product_schedules?.return_at ?? null),
		adults: row.adults,
		children: row.children,
		infants: row.infants,
		seats: row.seats,
		leadName: row.lead_name,
		leadPhone: row.lead_phone,
		customerId: row.customer_id,
		customerEmail: row.customers?.email ?? '',
		customerName: row.customers?.full_name ?? row.lead_name,
		stripeCustomerId: row.customers?.stripe_customer_id ?? null,
		hotel: row.hotels?.name ?? row.hotel_name,
		zone: row.pickup_zones?.name ?? null,
		pickupTime: shortTime(row.pickup_time),
		pickupFeePending: row.pickup_fee_pending,
		hasInsurance: row.has_insurance,
		currency: row.currency,
		subtotal: Number(row.subtotal),
		pickupTotal: Number(row.pickup_total),
		insuranceTotal: Number(row.insurance_total),
		discountTotal: Number(row.discount_total),
		total: Number(row.total),
		depositAmount: Number(row.deposit_amount),
		balanceAmount: Number(row.balance_amount),
		dateChangesCount: row.date_changes_count,
		stripePaymentMethodId: row.stripe_payment_method_id,
	};
}
