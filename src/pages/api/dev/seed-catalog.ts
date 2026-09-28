import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import sharp from 'sharp';
import { fillContentTokens } from '../../../data/guides/content-tokens';
import { pillarContents } from '../../../data/pillars';
import { destinations } from '../../../data/tours/destinations';
import { mostBookedTours } from '../../../data/tours/most-booked';
import { pickupZones, tourDetails, weekdays, type PickupZone, type TourDetails } from '../../../data/tours/tours';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import {
	toContentPayload,
	toImagesPayload,
	toOperationsPayload,
	tourContentSchema,
	tourImagesSchema,
	tourOperationsSchema,
	type TourContentInput,
	type TourImage,
	type TourOperationsInput,
} from '../../../lib/tours/tour-schema';

export const prerender = false;

const supplier = { slug: 'caribe-activo', name: 'Caribe Activo' };
const defaultDailyCapacity = 100;
const catalogLocale = 'es';
const pickupZonesEntryId = 'zonas-de-recogida';
const mediaBucket = 'media';
const tourPhotosDirectory = 'src/assets/images/placeholders/tours';

interface SeedHotel {
	name: string;
	zoneSlug: string;
}

interface SeedZone {
	zone: PickupZone;
	description: string;
	hotels: SeedHotel[];
}

interface StoredProduct {
	id: string;
	key: string;
	pricing_mode: 'per_person' | 'per_group';
	max_group_size: number | null;
	daily_capacity: number;
	infants_occupy_seat: boolean;
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

const productKey = (details: TourDetails) => details.productKey;

const isoWeekday = (day: (typeof weekdays)[number]) => weekdays.indexOf(day) + 1;

function groupSizeFromPriceUnit(details: TourDetails) {
	if (details.pricePer !== 'group') return null;
	const match = details.priceUnit.match(/hasta (\d+)/);
	if (!match) throw new Error(`No se encuentra el tamaño máximo del grupo en «${details.priceUnit}» (${productKey(details)})`);
	return Number(match[1]);
}

const pregnancyValue = (details: TourDetails) => (details.pregnancy === 'not-allowed' ? 'not_allowed' : details.pregnancy);

const durationValue = (details: TourDetails) =>
	details.durationCategory === 'full-day' ? 'full_day' : details.durationCategory === 'half-day' ? 'half_day' : 'night';

function pillarCopy(details: TourDetails) {
	const copy = pillarContents[details.destination.id].tours[details.tour.slug];
	if (!copy) throw new Error(`Falta el texto de la pilar para ${productKey(details)}`);
	return copy;
}

function contentInput(details: TourDetails): TourContentInput {
	const copy = pillarCopy(details);
	return {
		name: details.title,
		shortName: details.tour.name,
		slug: details.tour.slug,
		destinationSlug: details.destination.slug,
		summary: details.summary,
		ageNote: details.ageNote ?? '',
		imageAlt: details.imageAlt,
		highlights: details.highlights,
		includes: details.includes,
		excludes: details.excludes,
		bring: details.bring,
		itinerary: details.itinerary.map((step) => ({ time: step.time ?? '', title: step.title, text: step.text })),
		faqs: details.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
		bestFor: copy.bestFor,
		includesSummary: copy.includesSummary,
		minAge: details.minAge ?? null,
		pregnancy: pregnancyValue(details),
		pregnancyMaxMonths: details.pregnancy === 'limited' ? (details.pregnancyMaxMonths ?? null) : null,
		wheelchair: details.wheelchair,
	};
}

function operationsInput(details: TourDetails, stored: StoredProduct, zoneIdBySlug: Map<string, string>): TourOperationsInput {
	const perGroup = details.pricePer === 'group';
	return {
		pricingMode: perGroup ? 'per_group' : 'per_person',
		maxGroupSize: perGroup ? (stored.max_group_size ?? groupSizeFromPriceUnit(details)) : null,
		dailyCapacity: stored.daily_capacity,
		infantsOccupySeat: stored.infants_occupy_seat,
		depositValue: details.deposit,
		priceUnit: details.priceUnit,
		meetingPoint: details.meetingPoint,
		durationCategory: durationValue(details),
		durationHours: details.durationHours,
		departurePort: details.port ?? null,
		schedule: {
			startTime: details.pickupFrom,
			pickupTo: details.pickupTo,
			returnAt: details.returnAt,
			weekdays: details.days.map(isoWeekday).sort((first, second) => first - second),
		},
		prices: {
			base: details.price,
			child: details.childPrice ? { amount: details.childPrice.amount, minAge: details.childPrice.fromAge, maxAge: details.childPrice.toAge } : null,
		},
		pickupFees: pickupZones.map((zone) => {
			const zoneId = zoneIdBySlug.get(zone.id);
			if (!zoneId) throw new Error(`No existe la zona ${zone.id}`);
			return { zoneId, fee: details.pickupFees[zone.id] };
		}),
	};
}

function validated<T>(label: string, result: { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }): T {
	if (result.success) return result.data;
	const issues = result.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ');
	throw new Error(`${label} no pasa la validación: ${issues}`);
}

function parsePickupZones(markdown: string, zones: PickupZone[]): SeedZone[] {
	return markdown
		.split(/^## /m)
		.slice(1)
		.flatMap((section) => {
			const [heading = '', ...lines] = section.split('\n');
			const zone = zones.find((candidate) => candidate.name === heading.trim());
			if (!zone) return [];
			const content = lines.join('\n');
			const hotels = new Map<string, SeedHotel>();
			for (const [, listBody = ''] of content.matchAll(/<div class="hotel-list">([\s\S]*?)<\/div>/g)) {
				for (const line of listBody.split('\n')) {
					const hotelName = line.match(/^\s*-\s+(.+?)\s*$/)?.[1];
					if (hotelName) hotels.set(hotelName, { name: hotelName, zoneSlug: zone.id });
				}
			}
			const onlyHotelName = content.match(/El único hotel de la zona es el ([^.\n]+)\./)?.[1]?.trim();
			if (onlyHotelName) hotels.set(onlyHotelName, { name: onlyHotelName, zoneSlug: zone.id });
			const prose = content
				.split(/\n\s*\n/)
				.map((paragraph) => paragraph.trim())
				.filter((paragraph) => paragraph.length > 0)
				.filter((paragraph) => !paragraph.startsWith('<') && !paragraph.startsWith('- ') && !paragraph.startsWith('Hoteles de la zona') && !paragraph.startsWith('El único hotel'));
			return [{ zone, description: fillContentTokens(prose.join('\n\n')), hotels: [...hotels.values()] }];
		});
}

async function uploadTourPhoto(details: TourDetails, productId: string): Promise<TourImage | null> {
	const source = path.join(process.cwd(), tourPhotosDirectory, details.destination.slug, `${details.tour.slug}.jpg`);
	const file = await readFile(source).catch(() => null);
	if (!file) return null;
	const metadata = await sharp(file).metadata();
	const width = metadata.autoOrient?.width ?? metadata.width;
	const height = metadata.autoOrient?.height ?? metadata.height;
	if (!width || !height) throw new Error(`No se pueden leer las medidas de ${source}`);
	const storagePath = `products/${productId}/${Date.now()}.jpg`;
	assertSucceeded(await supabaseAdmin.storage.from(mediaBucket).upload(storagePath, file, { contentType: 'image/jpeg', upsert: false }));
	return { path: storagePath, alt: details.imageAlt, width, height };
}

async function seedCatalog(userId: string) {
	const staff = unwrap(await supabaseAdmin.from('staff').select('role').eq('user_id', userId).maybeSingle());
	if (staff.role !== 'admin') throw new Error('El usuario tiene que ser administrador');

	const { id: supplierId } = unwrap(
		await supabaseAdmin.from('suppliers').upsert(supplier, { onConflict: 'slug', ignoreDuplicates: false }).select('id').single(),
	);

	const helpEntry = await getEntry('help', pickupZonesEntryId);
	if (!helpEntry?.body) throw new Error(`No se encuentra el contenido de ${pickupZonesEntryId}`);
	const seedZones = parsePickupZones(helpEntry.body, pickupZones);
	if (seedZones.length !== pickupZones.length) throw new Error('Falta la sección de alguna zona en zonas-de-recogida.md');

	assertSucceeded(
		await supabaseAdmin
			.from('pickup_zones')
			.upsert(pickupZones.map((zone, position) => ({ slug: zone.id, name: zone.name, position })), { onConflict: 'slug', ignoreDuplicates: true }),
	);
	const zones = unwrap(await supabaseAdmin.from('pickup_zones').select('id, slug, description'));
	const zoneIdBySlug = new Map(zones.map((zone) => [zone.slug, zone.id]));
	let zoneDescriptions = 0;
	for (const { zone, description } of seedZones) {
		const stored = zones.find((candidate) => candidate.slug === zone.id);
		if (!stored || stored.description === description) continue;
		assertSucceeded(await supabaseAdmin.from('pickup_zones').update({ description }).eq('id', stored.id));
		zoneDescriptions += 1;
	}

	assertSucceeded(
		await supabaseAdmin.from('products').upsert(
			tourDetails.map((details) => ({
				key: productKey(details),
				supplier_id: supplierId,
				destination_slug: details.destination.slug,
				status: 'active' as const,
				pricing_mode: details.pricePer === 'group' ? ('per_group' as const) : ('per_person' as const),
				max_group_size: groupSizeFromPriceUnit(details),
				deposit_type: 'fixed' as const,
				deposit_value: details.deposit,
				daily_capacity: defaultDailyCapacity,
				currency: 'USD',
			})),
			{ onConflict: 'key', ignoreDuplicates: true },
		),
	);
	const products = unwrap(
		await supabaseAdmin
			.from('products')
			.select('id, key, pricing_mode, max_group_size, daily_capacity, infants_occupy_seat, images:product_images(path)')
			.in('key', tourDetails.map(productKey)),
	);
	const productFor = (details: TourDetails) => {
		const product = products.find((candidate) => candidate.key === productKey(details));
		if (!product) throw new Error(`No existe el producto ${productKey(details)}`);
		return product;
	};

	assertSucceeded(
		await supabaseAdmin.from('product_translations').upsert(
			tourDetails.map((details) => ({ product_id: productFor(details).id, locale: catalogLocale, slug: details.tour.slug, name: details.title })),
			{ onConflict: 'product_id,locale', ignoreDuplicates: true },
		),
	);

	let uploadedImages = 0;
	for (const details of tourDetails) {
		const product = productFor(details);
		const content = validated(`El contenido de ${product.key}`, tourContentSchema.safeParse(contentInput(details)));
		const operations = validated(`La operación de ${product.key}`, tourOperationsSchema.safeParse(operationsInput(details, product, zoneIdBySlug)));
		const photo = product.images.length === 0 ? await uploadTourPhoto(details, product.id) : null;
		const images = photo ? validated(`Las fotos de ${product.key}`, tourImagesSchema.safeParse([photo])) : null;
		if (photo) uploadedImages += 1;
		assertSucceeded(
			await supabaseAdmin.rpc('admin_save_tour', {
				p_product_id: product.id,
				p_user_id: userId,
				p_content: toContentPayload(content),
				p_operations: toOperationsPayload(operations),
				...(images ? { p_images: toImagesPayload(images) } : {}),
			}),
		);
	}

	for (const destination of destinations) {
		const productIds = destination.tours.map((tour) => {
			const details = tourDetails.find((candidate) => candidate.destination.id === destination.id && candidate.tour.slug === tour.slug);
			if (!details) throw new Error(`Falta la excursión ${destination.id}/${tour.slug}`);
			return productFor(details).id;
		});
		assertSucceeded(
			await supabaseAdmin.rpc('admin_reorder_tours', { p_user_id: userId, p_destination_slug: destination.slug, p_product_ids: productIds }),
		);
	}

	for (const [index, item] of mostBookedTours.entries()) {
		const details = tourDetails.find((candidate) => candidate.destination.id === item.destination.id && candidate.tour.slug === item.tour.slug);
		if (!details) throw new Error(`Falta la más reservada ${item.destination.id}/${item.tour.slug}`);
		assertSucceeded(await supabaseAdmin.rpc('admin_set_most_booked', { p_user_id: userId, p_product_id: productFor(details).id, p_position: index + 1 }));
	}

	const expectedHotels = seedZones.flatMap((seedZone) => seedZone.hotels);
	assertSucceeded(
		await supabaseAdmin.from('hotels').upsert(
			expectedHotels.map((hotel) => ({ name: hotel.name, zone_id: zoneIdBySlug.get(hotel.zoneSlug) ?? '', active: true })),
			{ onConflict: 'name', ignoreDuplicates: true },
		),
	);
	const storedHotels = unwrap(await supabaseAdmin.from('hotels').select('name, active, zone:pickup_zones(slug)'));
	const hotelMismatches = [
		...expectedHotels.flatMap((hotel) => {
			const stored = storedHotels.find((candidate) => candidate.name === hotel.name);
			if (!stored) return [`Falta ${hotel.name}`];
			if (stored.zone?.slug !== hotel.zoneSlug) return [`${hotel.name} está en ${stored.zone?.slug} y no en ${hotel.zoneSlug}`];
			if (!stored.active) return [`${hotel.name} está desactivado`];
			return [];
		}),
		...storedHotels.filter((stored) => !expectedHotels.some((hotel) => hotel.name === stored.name)).map((stored) => `${stored.name} no está en el md`),
	];

	return {
		products: products.length,
		savedTours: tourDetails.length,
		uploadedImages,
		zoneDescriptions,
		reorderedDestinations: destinations.length,
		mostBooked: mostBookedTours.length,
		hotelsInMarkdown: expectedHotels.length,
		hotelsInDatabase: storedHotels.length,
		hotelMismatches,
	};
}

export const POST: APIRoute = async ({ request }) => {
	if (!import.meta.env.DEV) return new Response(null, { status: 404 });
	try {
		const body: unknown = await request.json().catch(() => ({}));
		const userId = typeof body === 'object' && body !== null && 'userId' in body && typeof body.userId === 'string' ? body.userId : '';
		if (!userId) return Response.json({ error: 'Falta userId' }, { status: 400 });
		return Response.json(await seedCatalog(userId));
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
	}
};
