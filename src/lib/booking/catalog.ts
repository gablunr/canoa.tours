import { supabaseAdmin } from '../supabase/admin';
import type { Tables } from '../supabase/types';
import { spanishTranslation, tourPathFor } from './booking-details';

export interface BookablePickupZone {
	id: string;
	slug: string;
	name: string;
	fee: number;
}

export interface BookablePrices {
	adult: number | null;
	child: number | null;
	infant: number | null;
	group: number | null;
}

export interface BookableProduct {
	product: Tables<'products'>;
	name: string;
	tourPath: string;
	schedule: Tables<'product_schedules'> | null;
	prices: BookablePrices;
	pickupZones: BookablePickupZone[];
}

interface PriceRow {
	passenger_type: keyof BookablePrices;
	amount: number | string;
}

interface PickupZoneRow {
	fee_per_person: number | string;
	pickup_zones: { id: string; slug: string; name: string; position: number } | null;
}

export function isoWeekday(tourDate: string): number {
	const weekday = new Date(`${tourDate}T00:00:00Z`).getUTCDay();
	return weekday === 0 ? 7 : weekday;
}

export async function loadBookableProduct(productKey: string, tourDate: string): Promise<BookableProduct | null> {
	const { data: productData, error: productError } = await supabaseAdmin
		.from('products')
		.select('*, product_translations ( locale, slug, name )')
		.eq('key', productKey)
		.eq('status', 'active')
		.maybeSingle();

	if (productError) throw productError;
	if (!productData) return null;

	const { product_translations: translations, ...product } = productData as unknown as Tables<'products'> & {
		product_translations: { locale: string; slug: string; name: string }[];
	};
	const translation = spanishTranslation(translations);

	const [schedulesResult, pricesResult, zonesResult] = await Promise.all([
		supabaseAdmin.from('product_schedules').select('*').eq('product_id', product.id).eq('active', true).order('start_time'),
		supabaseAdmin
			.from('product_prices')
			.select('passenger_type, amount')
			.eq('product_id', product.id)
			.lte('valid_from', tourDate)
			.or(`valid_to.is.null,valid_to.gte.${tourDate}`),
		supabaseAdmin.from('product_pickup_zones').select('fee_per_person, pickup_zones ( id, slug, name, position )').eq('product_id', product.id),
	]);

	if (schedulesResult.error) throw schedulesResult.error;
	if (pricesResult.error) throw pricesResult.error;
	if (zonesResult.error) throw zonesResult.error;

	const weekday = isoWeekday(tourDate);
	const schedules = (schedulesResult.data ?? []) as Tables<'product_schedules'>[];
	const schedule = schedules.find((candidate) => candidate.weekdays.includes(weekday)) ?? null;

	const prices: BookablePrices = { adult: null, child: null, infant: null, group: null };
	for (const price of (pricesResult.data ?? []) as unknown as PriceRow[]) {
		prices[price.passenger_type] = Number(price.amount);
	}

	const pickupZones = ((zonesResult.data ?? []) as unknown as PickupZoneRow[])
		.filter((row) => row.pickup_zones !== null)
		.sort((first, second) => (first.pickup_zones?.position ?? 0) - (second.pickup_zones?.position ?? 0))
		.map((row) => ({
			id: row.pickup_zones?.id ?? '',
			slug: row.pickup_zones?.slug ?? '',
			name: row.pickup_zones?.name ?? '',
			fee: Number(row.fee_per_person),
		}));

	return {
		product,
		name: translation?.name ?? product.key,
		tourPath: translation ? tourPathFor(product.destination_slug, translation.slug) : '/',
		schedule,
		prices,
		pickupZones,
	};
}
