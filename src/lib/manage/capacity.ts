import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export type CapacityProduct = {
	id: string;
	key: string;
	name: string;
	defaultCapacity: number;
};

export type CapacityDay = {
	date: string;
	dayOfMonth: number;
	isDeparture: boolean;
	isPast: boolean;
	capacity: number;
	customCapacity: number | null;
	seatsSold: number;
	closed: boolean;
	note: string | null;
};

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function isValidMonth(month: string | null): month is string {
	return month !== null && monthPattern.test(month);
}

export function shiftMonth(month: string, offset: number) {
	const [year = 0, monthNumber = 1] = month.split('-').map(Number);
	const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
	return shifted.toISOString().slice(0, 7);
}

export function monthBounds(month: string) {
	const first = `${month}-01`;
	const nextFirst = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`);
	const last = new Date(nextFirst.getTime() - 86_400_000).toISOString().slice(0, 10);
	return { first, last };
}

const monthLabelFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatMonthLabel(month: string) {
	const label = monthLabelFormatter.format(new Date(`${month}-01T12:00:00Z`));
	return label.charAt(0).toUpperCase() + label.slice(1);
}

export function leadingBlankDays(month: string) {
	const weekday = new Date(`${month}-01T12:00:00Z`).getUTCDay();
	return (weekday + 6) % 7;
}

export async function loadCapacityProducts(supabase: SupabaseClient<Database>): Promise<CapacityProduct[]> {
	const { data, error } = await supabase
		.from('products')
		.select('id, key, daily_capacity, product_translations(name, locale)')
		.eq('status', 'active')
		.order('key');
	if (error) throw error;
	return (data ?? []).map((product) => ({
		id: product.id,
		key: product.key,
		name: product.product_translations.find((translation) => translation.locale === 'es')?.name ?? product.key,
		defaultCapacity: product.daily_capacity,
	}));
}

export async function loadCapacityMonth(
	supabase: SupabaseClient<Database>,
	product: CapacityProduct,
	month: string,
	today: string,
): Promise<CapacityDay[]> {
	const { first, last } = monthBounds(month);
	const [occupancyResult, productDaysResult] = await Promise.all([
		supabase.rpc('admin_occupancy', { p_from: first, p_to: last }),
		supabase.from('product_days').select('tour_date, capacity, closed, note').eq('product_id', product.id).gte('tour_date', first).lte('tour_date', last),
	]);
	if (occupancyResult.error) throw occupancyResult.error;
	if (productDaysResult.error) throw productDaysResult.error;

	const occupancyByDate = new Map(
		(occupancyResult.data ?? []).filter((row) => row.product_key === product.key).map((row) => [row.tour_date, row]),
	);
	const productDayByDate = new Map((productDaysResult.data ?? []).map((row) => [row.tour_date, row]));

	const days: CapacityDay[] = [];
	const lastDayOfMonth = Number(last.slice(8, 10));
	for (let dayOfMonth = 1; dayOfMonth <= lastDayOfMonth; dayOfMonth += 1) {
		const date = `${month}-${String(dayOfMonth).padStart(2, '0')}`;
		const occupancy = occupancyByDate.get(date);
		const productDay = productDayByDate.get(date);
		days.push({
			date,
			dayOfMonth,
			isDeparture: Boolean(occupancy),
			isPast: date < today,
			capacity: occupancy?.capacity ?? productDay?.capacity ?? product.defaultCapacity,
			customCapacity: productDay?.capacity ?? null,
			seatsSold: occupancy?.seats_sold ?? 0,
			closed: occupancy?.closed ?? productDay?.closed ?? false,
			note: productDay?.note ?? null,
		});
	}
	return days;
}

export const isCapacityException = (day: CapacityDay) => day.customCapacity !== null || day.closed || Boolean(day.note);

export function occupancyRatio(day: CapacityDay) {
	if (day.capacity <= 0) return 1;
	return Math.min(day.seatsSold / day.capacity, 1);
}

export type OccupancyTone = 'normal' | 'high' | 'full';

export function occupancyTone(day: CapacityDay): OccupancyTone {
	if (day.seatsSold >= day.capacity) return 'full';
	return occupancyRatio(day) > 0.8 ? 'high' : 'normal';
}
