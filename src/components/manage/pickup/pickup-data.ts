import { destinations } from '../../../data/tours/destinations';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export interface PickupZone {
	id: string;
	slug: string;
	name: string;
	description: string;
	hotelCount: number;
}

export interface PickupHotel {
	id: string;
	name: string;
	zoneId: string;
	active: boolean;
}

export interface ZoneHotel extends PickupHotel {
	bookingCount: number;
}

export interface ZoneFeeTour {
	productId: string;
	name: string;
	isDraft: boolean;
	served: boolean;
	fee: number | null;
}

export interface ZoneFeeGroup {
	destinationName: string;
	tours: ZoneFeeTour[];
}

export interface ZoneDetails {
	hotels: ZoneHotel[];
	bookingCount: number;
	feeGroups: ZoneFeeGroup[];
}

const bookingsPageSize = 1000;

export async function loadPickupCatalog(): Promise<{ zones: PickupZone[]; hotels: PickupHotel[] }> {
	const [zonesResult, hotelsResult] = await Promise.all([
		supabaseAdmin.from('pickup_zones').select('id, slug, name, description, position').order('position').order('name'),
		supabaseAdmin.from('hotels').select('id, name, zone_id, active').order('name'),
	]);
	if (zonesResult.error) throw zonesResult.error;
	if (hotelsResult.error) throw hotelsResult.error;

	const hotels = hotelsResult.data.map((hotel) => ({ id: hotel.id, name: hotel.name, zoneId: hotel.zone_id, active: hotel.active }));
	const zones = zonesResult.data.map((zone) => ({
		id: zone.id,
		slug: zone.slug,
		name: zone.name,
		description: zone.description ?? '',
		hotelCount: hotels.filter((hotel) => hotel.zoneId === zone.id).length,
	}));
	return { zones, hotels };
}

async function loadZoneBookingHotels(zoneId: string): Promise<(string | null)[]> {
	const hotelIds: (string | null)[] = [];
	for (let from = 0; ; from += bookingsPageSize) {
		const { data, error } = await supabaseAdmin
			.from('bookings')
			.select('hotel_id')
			.eq('pickup_zone_id', zoneId)
			.order('id')
			.range(from, from + bookingsPageSize - 1);
		if (error) throw error;
		hotelIds.push(...data.map((booking) => booking.hotel_id));
		if (data.length < bookingsPageSize) return hotelIds;
	}
}

async function loadZoneFeeGroups(zoneId: string): Promise<ZoneFeeGroup[]> {
	const [productsResult, feesResult] = await Promise.all([
		supabaseAdmin
			.from('products')
			.select('id, key, destination_slug, status, position, product_translations ( locale, name, short_name )')
			.neq('status', 'archived')
			.order('position')
			.order('key'),
		supabaseAdmin.from('product_pickup_zones').select('product_id, fee_per_person').eq('zone_id', zoneId),
	]);
	if (productsResult.error) throw productsResult.error;
	if (feesResult.error) throw feesResult.error;

	const feeByProduct = new Map(feesResult.data.map((row) => [row.product_id, Number(row.fee_per_person)]));
	const tourFor = (product: (typeof productsResult.data)[number]): ZoneFeeTour => {
		const translation = product.product_translations.find((row) => row.locale === 'es') ?? product.product_translations[0];
		const fee = feeByProduct.get(product.id) ?? null;
		return {
			productId: product.id,
			name: translation?.short_name || translation?.name || product.key,
			isDraft: product.status === 'draft',
			served: fee !== null,
			fee,
		};
	};

	const knownSlugs = destinations.map((destination) => destination.slug);
	const groups = destinations.map((destination) => ({
		destinationName: destination.name,
		tours: productsResult.data.filter((product) => product.destination_slug === destination.slug).map(tourFor),
	}));
	const otherTours = productsResult.data.filter((product) => !knownSlugs.includes(product.destination_slug)).map(tourFor);
	return [...groups, { destinationName: 'Otros destinos', tours: otherTours }].filter((group) => group.tours.length > 0);
}

export async function loadZoneDetails(zone: PickupZone, hotels: PickupHotel[]): Promise<ZoneDetails> {
	const [bookingHotelIds, feeGroups] = await Promise.all([loadZoneBookingHotels(zone.id), loadZoneFeeGroups(zone.id)]);

	const bookingsByHotel = new Map<string, number>();
	bookingHotelIds.forEach((hotelId) => {
		if (hotelId) bookingsByHotel.set(hotelId, (bookingsByHotel.get(hotelId) ?? 0) + 1);
	});

	const zoneHotels = hotels
		.filter((hotel) => hotel.zoneId === zone.id)
		.map((hotel) => ({ ...hotel, bookingCount: bookingsByHotel.get(hotel.id) ?? 0 }))
		.sort((first, second) => Number(second.active) - Number(first.active) || first.name.localeCompare(second.name, 'es'));

	return { hotels: zoneHotels, bookingCount: bookingHotelIds.length, feeGroups };
}
