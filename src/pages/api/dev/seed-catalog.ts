import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { pickupZones, tourDetails, weekdays, type PickupZone, type PickupZoneId, type TourDetails, type Weekday } from '../../../data/tours/tours';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import type { Enums } from '../../../lib/supabase/types';

export const prerender = false;

const supplier = { slug: 'caribe-activo', name: 'Caribe Activo' };
const defaultDailyCapacity = 100;
const catalogLocale = 'es';
const pickupZonesEntryId = 'zonas-de-recogida';

interface SeedPrice {
	passenger_type: Enums<'passenger_type'>;
	amount: number;
	min_age: number | null;
	max_age: number | null;
}

interface SeedHotel {
	name: string;
	zoneId: PickupZoneId;
}

type QueryResult<T> = { data: T; error: { message: string } | null };

function unwrap<T>({ data, error }: QueryResult<T>): NonNullable<T> {
	if (error) throw new Error(error.message);
	if (data === null || data === undefined) throw new Error('La consulta no devolvió datos');
	return data as NonNullable<T>;
}

function assertSucceeded({ error }: { error: { message: string } | null }) {
	if (error) throw new Error(error.message);
}

const productKey = (details: TourDetails) => `${details.destination.id}/${details.tour.slug}`;

const isoWeekday = (day: Weekday) => weekdays.indexOf(day) + 1;

function maxGroupSize(details: TourDetails) {
	if (details.pricePer !== 'group') return null;
	const match = details.priceUnit.match(/hasta (\d+)/);
	if (!match) throw new Error(`No se encuentra el tamaño máximo del grupo en «${details.priceUnit}» (${productKey(details)})`);
	return Number(match[1]);
}

function seedPrices(details: TourDetails): SeedPrice[] {
	const basePrice: SeedPrice = {
		passenger_type: details.pricePer === 'group' ? 'group' : 'adult',
		amount: details.price,
		min_age: null,
		max_age: null,
	};
	if (!details.childPrice) return [basePrice];
	const { amount, fromAge, toAge } = details.childPrice;
	return [basePrice, { passenger_type: 'child', amount, min_age: fromAge, max_age: toAge }];
}

function parseHotels(markdown: string, zones: PickupZone[]): SeedHotel[] {
	const hotelsByName = new Map<string, SeedHotel>();
	for (const section of markdown.split(/^## /m).slice(1)) {
		const [heading = '', ...lines] = section.split('\n');
		const zone = zones.find((candidate) => candidate.name === heading.trim());
		if (!zone) continue;
		const content = lines.join('\n');
		for (const [, listBody = ''] of content.matchAll(/<div class="hotel-list">([\s\S]*?)<\/div>/g)) {
			for (const line of listBody.split('\n')) {
				const hotelName = line.match(/^\s*-\s+(.+?)\s*$/)?.[1];
				if (hotelName) hotelsByName.set(hotelName, { name: hotelName, zoneId: zone.id });
			}
		}
		const onlyHotelName = content.match(/El único hotel de la zona es el ([^.\n]+)\./)?.[1]?.trim();
		if (onlyHotelName) hotelsByName.set(onlyHotelName, { name: onlyHotelName, zoneId: zone.id });
	}
	return [...hotelsByName.values()];
}

async function seedCatalog() {
	const { id: supplierId } = unwrap(
		await supabaseAdmin.from('suppliers').upsert(supplier, { onConflict: 'slug' }).select('id').single(),
	);

	const products = unwrap(
		await supabaseAdmin
			.from('products')
			.upsert(
				tourDetails.map((details) => ({
					key: productKey(details),
					supplier_id: supplierId,
					destination_slug: details.destination.id,
					status: 'active' as const,
					pricing_mode: details.pricePer === 'group' ? ('per_group' as const) : ('per_person' as const),
					max_group_size: maxGroupSize(details),
					min_age: details.minAge ?? null,
					deposit_type: 'fixed' as const,
					deposit_value: details.deposit,
					daily_capacity: defaultDailyCapacity,
					currency: 'USD',
				})),
				{ onConflict: 'key' },
			)
			.select('id, key'),
	);
	const productIdByKey = new Map(products.map((product) => [product.key, product.id]));
	const productIdFor = (details: TourDetails) => {
		const productId = productIdByKey.get(productKey(details));
		if (!productId) throw new Error(`No se ha guardado el producto ${productKey(details)}`);
		return productId;
	};

	assertSucceeded(
		await supabaseAdmin.from('product_translations').upsert(
			tourDetails.map((details) => ({
				product_id: productIdFor(details),
				locale: catalogLocale,
				slug: details.tour.slug,
				name: details.title,
			})),
			{ onConflict: 'product_id,locale' },
		),
	);

	const zones = unwrap(
		await supabaseAdmin
			.from('pickup_zones')
			.upsert(
				pickupZones.map((zone, position) => ({ slug: zone.id, name: zone.name, position })),
				{ onConflict: 'slug' },
			)
			.select('id, slug'),
	);
	const zoneIdBySlug = new Map(zones.map((zone) => [zone.slug, zone.id]));
	const zoneIdFor = (zoneSlug: PickupZoneId) => {
		const zoneId = zoneIdBySlug.get(zoneSlug);
		if (!zoneId) throw new Error(`No se ha guardado la zona ${zoneSlug}`);
		return zoneId;
	};

	const productPickupZones = tourDetails.flatMap((details) =>
		pickupZones.map((zone) => ({
			product_id: productIdFor(details),
			zone_id: zoneIdFor(zone.id),
			fee_per_person: details.pickupFees[zone.id],
		})),
	);
	assertSucceeded(await supabaseAdmin.from('product_pickup_zones').upsert(productPickupZones, { onConflict: 'product_id,zone_id' }));

	let deletedSchedules = 0;
	let prices = 0;
	for (const details of tourDetails) {
		const productId = productIdFor(details);
		const bookings = unwrap(await supabaseAdmin.from('bookings').select('schedule_id').eq('product_id', productId));
		const bookedScheduleIds = new Set(bookings.map((booking) => booking.schedule_id));

		const { id: scheduleId } = unwrap(
			await supabaseAdmin
				.from('product_schedules')
				.upsert(
					{
						product_id: productId,
						label: null,
						start_time: details.pickupFrom,
						pickup_to: details.pickupTo,
						return_at: details.returnAt,
						weekdays: details.days.map(isoWeekday).sort((first, second) => first - second),
						active: true,
					},
					{ onConflict: 'product_id,start_time' },
				)
				.select('id')
				.single(),
		);

		const schedules = unwrap(await supabaseAdmin.from('product_schedules').select('id').eq('product_id', productId));
		const staleScheduleIds = schedules.map((schedule) => schedule.id).filter((id) => id !== scheduleId && !bookedScheduleIds.has(id));
		if (staleScheduleIds.length > 0) {
			assertSucceeded(await supabaseAdmin.from('product_schedules').delete().in('id', staleScheduleIds));
			deletedSchedules += staleScheduleIds.length;
		}

		const desiredPrices = seedPrices(details);
		if (bookings.length === 0) {
			assertSucceeded(await supabaseAdmin.from('product_prices').delete().eq('product_id', productId));
			assertSucceeded(
				await supabaseAdmin.from('product_prices').insert(desiredPrices.map((price) => ({ ...price, product_id: productId }))),
			);
		} else {
			for (const price of desiredPrices) {
				const updated = unwrap(
					await supabaseAdmin
						.from('product_prices')
						.update({ amount: price.amount, min_age: price.min_age, max_age: price.max_age })
						.eq('product_id', productId)
						.eq('passenger_type', price.passenger_type)
						.select('id'),
				);
				if (updated.length === 0) {
					assertSucceeded(await supabaseAdmin.from('product_prices').insert({ ...price, product_id: productId }));
				}
			}
		}
		prices += desiredPrices.length;
	}

	const helpEntry = await getEntry('help', pickupZonesEntryId);
	if (!helpEntry?.body) throw new Error(`No se encuentra el contenido de ${pickupZonesEntryId}`);
	const hotels = parseHotels(helpEntry.body, pickupZones);
	if (hotels.length > 0) {
		assertSucceeded(
			await supabaseAdmin.from('hotels').upsert(
				hotels.map((hotel) => ({ name: hotel.name, zone_id: zoneIdFor(hotel.zoneId), active: true })),
				{ onConflict: 'name' },
			),
		);
	}

	return {
		suppliers: 1,
		products: products.length,
		translations: tourDetails.length,
		schedules: tourDetails.length,
		deletedSchedules,
		prices,
		pickupZones: zones.length,
		productPickupZones: productPickupZones.length,
		hotels: hotels.length,
	};
}

export const POST: APIRoute = async () => {
	if (!import.meta.env.DEV) return new Response(null, { status: 404 });
	try {
		return Response.json(await seedCatalog());
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
