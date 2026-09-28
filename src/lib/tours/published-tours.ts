import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from 'astro:env/client';
import type { Database } from '../supabase/database.types';
import { tourRowSelect, tourRowToEditable, type TourRow } from './tour-rows';
import { missingForSale } from './tour-schema';

export interface PublishedHotel {
	id: string;
	name: string;
}

export interface PublishedPickupZone {
	id: string;
	slug: string;
	name: string;
	description: string;
	position: number;
	hotels: PublishedHotel[];
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

function isPublishable(row: TourRow) {
	try {
		const missing = missingForSale(tourRowToEditable(row)).required;
		if (missing.length === 0) return true;
		console.warn(`La excursión ${row.key} no sale en la web porque le falta: ${missing.map((item) => item.label).join(', ')}`);
		return false;
	} catch (error) {
		console.warn(`La excursión ${row.key} no sale en la web: ${describeError(error)}`);
		return false;
	}
}

async function loadPublishedCatalog() {
	const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
	const [toursResult, zonesResult, hotelsResult] = await Promise.all([
		supabase.from('products').select(tourRowSelect).eq('status', 'active').order('position').order('key'),
		supabase.from('pickup_zones').select('id, slug, name, description, position').order('position').order('name'),
		supabase.from('hotels').select('id, name, zone_id').eq('active', true).order('name'),
	]);
	if (toursResult.error) throw toursResult.error;
	if (zonesResult.error) throw zonesResult.error;
	if (hotelsResult.error) throw hotelsResult.error;

	const tourRows: TourRow[] = (toursResult.data ?? []).filter(isPublishable);
	const hotels = hotelsResult.data ?? [];
	const pickupZones: PublishedPickupZone[] = (zonesResult.data ?? []).map((zone) => ({
		id: zone.id,
		slug: zone.slug,
		name: zone.name,
		description: zone.description ?? '',
		position: zone.position,
		hotels: hotels.filter((hotel) => hotel.zone_id === zone.id).map((hotel) => ({ id: hotel.id, name: hotel.name })),
	}));

	return { tourRows, pickupZones };
}

const publishedCatalog = await loadPublishedCatalog();

export const publishedTourRows: readonly TourRow[] = publishedCatalog.tourRows;

export const publishedPickupZones: readonly PublishedPickupZone[] = publishedCatalog.pickupZones;
