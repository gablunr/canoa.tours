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

export interface PickupOptions {
	zones: { slug: string; name: string; fee: number }[];
	hotels: { id: string; name: string; zoneSlug: string }[];
}

interface PickupZoneRow {
	fee_per_person: number | string;
	pickup_zones: { id: string; slug: string; name: string; position: number } | null;
}

const pickupZoneColumns = 'fee_per_person, pickup_zones ( id, slug, name, position )';

function toPickupZones(rows: PickupZoneRow[]): BookablePickupZone[] {
	return rows
		.filter((row) => row.pickup_zones !== null)
		.sort((first, second) => (first.pickup_zones?.position ?? 0) - (second.pickup_zones?.position ?? 0))
		.map((row) => ({
			id: row.pickup_zones?.id ?? '',
			slug: row.pickup_zones?.slug ?? '',
			name: row.pickup_zones?.name ?? '',
			fee: Number(row.fee_per_person),
		}));
}

export async function findActiveProductId(productKey: string): Promise<string | null> {
	const { data, error } = await supabaseAdmin.from('products').select('id').eq('key', productKey).eq('status', 'active').maybeSingle();
	if (error) throw error;
	return data?.id ?? null;
}

export async function loadPickupOptions(productKey: string): Promise<PickupOptions | null> {
	const productId = await findActiveProductId(productKey);
	if (!productId) return null;

	const { data: zoneRows, error: zonesError } = await supabaseAdmin
		.from('product_pickup_zones')
		.select(pickupZoneColumns)
		.eq('product_id', productId);
	if (zonesError) throw zonesError;

	const zones = toPickupZones((zoneRows ?? []) as unknown as PickupZoneRow[]);
	if (zones.length === 0) return { zones: [], hotels: [] };

	const { data: hotelRows, error: hotelsError } = await supabaseAdmin
		.from('hotels')
		.select('id, name, zone_id')
		.eq('active', true)
		.in('zone_id', zones.map((zone) => zone.id))
		.order('name');
	if (hotelsError) throw hotelsError;

	const zoneSlugById = new Map(zones.map((zone) => [zone.id, zone.slug]));

	return {
		zones: zones.map(({ slug, name, fee }) => ({ slug, name, fee })),
		hotels: (hotelRows ?? []).map((hotel) => ({ id: hotel.id, name: hotel.name, zoneSlug: zoneSlugById.get(hotel.zone_id) ?? '' })),
	};
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
		supabaseAdmin.from('product_pickup_zones').select(pickupZoneColumns).eq('product_id', product.id),
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

	const pickupZones = toPickupZones((zonesResult.data ?? []) as unknown as PickupZoneRow[]);

	return {
		product,
		name: translation?.name ?? product.key,
		tourPath: translation ? tourPathFor(product.destination_slug, translation.slug) : '/',
		schedule,
		prices,
		pickupZones,
	};
}
