import { spanishTranslation } from '../../../lib/booking/booking-details';
import { formatPrice } from '../../../lib/format';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export type CouponState = 'active' | 'inactive';
export type CouponNotice = 'expired' | 'exhausted' | 'scheduled' | null;

export interface ProductOption {
	value: string;
	label: string;
}

export interface CouponSummary {
	code: string;
	discountLabel: string;
	productName: string | null;
	validityLabel: string;
	used: number;
	maxRedemptions: number | null;
	state: CouponState;
	notice: CouponNotice;
}

const countedStatuses = ['confirmed', 'completed', 'no_show', 'pending_payment'] as const;

const shortDateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const santoDomingoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date());

const formatShortDate = (isoDate: string) => shortDateFormatter.format(new Date(`${isoDate}T12:00:00Z`)).replace('.', '');

function validityLabel(validFrom: string | null, validTo: string | null) {
	if (validFrom && validTo) return `Del ${formatShortDate(validFrom)} al ${formatShortDate(validTo)}`;
	if (validFrom) return `Desde el ${formatShortDate(validFrom)}`;
	if (validTo) return `Hasta el ${formatShortDate(validTo)}`;
	return 'Sin fecha límite';
}

function discountLabel(type: 'percent' | 'fixed', value: number) {
	return type === 'percent' ? `${Number(value)} %` : formatPrice(Number(value));
}

export async function loadProductOptions(): Promise<ProductOption[]> {
	const { data, error } = await supabaseAdmin.from('products').select('key, product_translations ( locale, name, slug )');
	if (error) throw error;
	return (data ?? [])
		.map((product) => ({ value: product.key, label: spanishTranslation(product.product_translations)?.name ?? product.key }))
		.sort((first, second) => first.label.localeCompare(second.label, 'es'));
}

async function loadUsageByCoupon(couponIds: string[]) {
	const usage = new Map<string, number>();
	if (couponIds.length === 0) return usage;

	const { data, error } = await supabaseAdmin
		.from('bookings')
		.select('coupon_id, status, expires_at')
		.in('coupon_id', couponIds)
		.in('status', [...countedStatuses]);
	if (error) throw error;

	const now = Date.now();
	for (const booking of data ?? []) {
		if (!booking.coupon_id) continue;
		const isStalePending = booking.status === 'pending_payment' && booking.expires_at !== null && new Date(booking.expires_at).getTime() <= now;
		if (isStalePending) continue;
		usage.set(booking.coupon_id, (usage.get(booking.coupon_id) ?? 0) + 1);
	}
	return usage;
}

export async function loadCoupons(): Promise<CouponSummary[]> {
	const { data: coupons, error } = await supabaseAdmin
		.from('coupons')
		.select('id, code, discount_type, discount_value, valid_from, valid_to, max_redemptions, active, created_at, products ( key, product_translations ( locale, name, slug ) )')
		.order('created_at', { ascending: false });
	if (error) throw error;

	const usage = await loadUsageByCoupon((coupons ?? []).map((coupon) => coupon.id));
	const today = santoDomingoToday();

	return (coupons ?? []).map((coupon) => {
		const used = usage.get(coupon.id) ?? 0;
		const notice: CouponNotice =
			coupon.valid_to && coupon.valid_to < today
				? 'expired'
				: coupon.max_redemptions !== null && used >= coupon.max_redemptions
					? 'exhausted'
					: coupon.valid_from && coupon.valid_from > today
						? 'scheduled'
						: null;

		return {
			code: coupon.code,
			discountLabel: discountLabel(coupon.discount_type, coupon.discount_value),
			productName: coupon.products ? (spanishTranslation(coupon.products.product_translations)?.name ?? coupon.products.key) : null,
			validityLabel: validityLabel(coupon.valid_from, coupon.valid_to),
			used,
			maxRedemptions: coupon.max_redemptions,
			state: coupon.active ? 'active' : 'inactive',
			notice,
		};
	});
}
