import { createClient, type QueryData } from '@supabase/supabase-js';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Destination } from '../../data/tours/destinations';
import type { Database } from '../supabase/database.types';
import { santoDomingoToday, tourRowSelect, tourRowToDetails, tourRowToEditable, type TourRow } from './tour-rows';
import { missingForSale, tourContentSchema, tourOperationsSchema } from './tour-schema';

vi.mock('astro:env/client', () => ({ SUPABASE_URL: 'https://media.test' }));
vi.mock('astro:assets', () => ({ inferRemoteSize: vi.fn() }));

const saona: Destination = {
	id: 'isla-saona',
	kind: 'place',
	name: 'Isla Saona',
	slug: 'isla-saona',
	fromPrice: 55,
	details: 'Día completo.',
	tours: [{ name: 'Catamarán', slug: 'catamaran' }],
};

const bavaro = { id: '3f0c2a52-8d1e-4b6f-9a3c-1d2e3f4a5b6c', slug: 'bavaro', name: 'Bávaro y Arena Gorda', position: 0 };
const macao = { id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', slug: 'macao', name: 'Macao', position: 3 };

const row: TourRow = {
	id: 'b1d2c3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
	key: 'isla-saona/catamaran',
	status: 'active',
	destination_slug: 'isla-saona',
	position: 0,
	pricing_mode: 'per_person',
	max_group_size: null,
	min_age: null,
	daily_capacity: 100,
	infants_occupy_seat: true,
	deposit_value: 20,
	duration_category: 'full_day',
	duration_hours: 10.5,
	departure_port: 'saona',
	pregnancy: 'limited',
	pregnancy_max_months: 6,
	wheelchair: false,
	most_booked_position: 1,
	published_at: '2026-09-26T12:00:00+00:00',
	updated_at: '2026-09-27T15:30:00+00:00',
	updated_by: null,
	translations: [
		{
			locale: 'en',
			slug: 'catamaran-en',
			name: 'Saona Island by catamaran',
			short_name: 'Catamaran',
			summary: null,
			price_unit: null,
			meeting_point: null,
			age_note: null,
			image_alt: null,
			highlights: [],
			includes: [],
			excludes: [],
			bring: [],
			itinerary: [],
			faqs: [],
			best_for: null,
			includes_summary: null,
		},
		{
			locale: 'es',
			slug: 'catamaran',
			name: 'Isla Saona en catamarán',
			short_name: 'Catamarán',
			summary: 'Día completo en Isla Saona.',
			price_unit: 'por persona',
			meeting_point: 'Puerto de Bayahibe',
			age_note: null,
			image_alt: 'Catamarán frente a la costa',
			highlights: ['Catamarán', 'Playa', 'Buffet'],
			includes: ['Recogida', 'Catamarán', 'Almuerzo'],
			excludes: ['Propinas'],
			bring: ['Toalla'],
			itinerary: [{ time: '07:00', title: 'Recogida', text: 'Pasamos por tu hotel.' }, { title: 'Playa', text: 'Tiempo libre.' }, 'basura'],
			faqs: [{ question: '¿Hay baños?', answer: 'Sí.' }],
			best_for: 'Primera vez en Saona',
			includes_summary: 'Catamarán y buffet',
		},
	],
	images: [
		{ id: 'i2', path: 'products/x/second.jpg', alt: 'Barco', width: 1600, height: 1200, position: 1 },
		{ id: 'i1', path: 'products/x/cover.jpg', alt: 'Playa', width: 2400, height: 1600, position: 0 },
	],
	prices: [
		{ passenger_type: 'adult', amount: 50, min_age: null, max_age: null, valid_from: '2000-01-01', valid_to: '2026-09-27' },
		{ passenger_type: 'adult', amount: 55, min_age: null, max_age: null, valid_from: '2026-09-28', valid_to: null },
		{ passenger_type: 'child', amount: 35, min_age: 3, max_age: 11, valid_from: '2000-01-01', valid_to: null },
		{ passenger_type: 'adult', amount: 70, min_age: null, max_age: null, valid_from: '2027-01-01', valid_to: null },
	],
	schedules: [
		{ start_time: '06:00:00', pickup_to: null, return_at: null, weekdays: [1], active: false },
		{ start_time: '07:00:00', pickup_to: '07:30:00', return_at: '18:00:00', weekdays: [7, 4, 6], active: true },
	],
	pickup_fees: [
		{ fee_per_person: 15, zone: macao },
		{ fee_per_person: 0, zone: bavaro },
	],
};

const context = { destinations: [saona], today: '2026-09-28' };

describe('tourRowSelect', () => {
	it('matches the TourRow type', () => {
		const query = createClient<Database>('https://db.test', 'key').from('products').select(tourRowSelect);
		expectTypeOf<QueryData<typeof query>[number]>().toExtend<TourRow>();
		expect(tourRowSelect).toContain('translations:product_translations(');
	});
});

describe('tourRowToDetails', () => {
	const details = tourRowToDetails(row, context);

	it('reads the spanish translation and the static destination', () => {
		expect(details.destination).toBe(saona);
		expect(details.tour).toBe(saona.tours[0]);
		expect(details).toMatchObject({ productKey: 'isla-saona/catamaran', title: 'Isla Saona en catamarán', shortName: 'Catamarán', bestFor: 'Primera vez en Saona' });
	});

	it('resolves the prices valid today', () => {
		expect(details.price).toBe(55);
		expect(details.childPrice).toEqual({ amount: 35, fromAge: 3, toAge: 11 });
		expect(tourRowToDetails(row, { ...context, today: '2026-09-27' }).price).toBe(50);
	});

	it('maps enums, weekdays and times', () => {
		expect(details).toMatchObject({
			pricePer: 'person',
			durationCategory: 'full-day',
			durationHours: 10.5,
			pregnancy: 'limited',
			pregnancyMaxMonths: 6,
			port: 'saona',
			pickupFrom: '07:00',
			pickupTo: '07:30',
			returnAt: '18:00',
		});
		expect(details.days).toEqual(['thursday', 'saturday', 'sunday']);
		expect(tourRowToDetails({ ...row, pregnancy: 'not_allowed', pregnancy_max_months: null }, context).pregnancy).toBe('not-allowed');
	});

	it('orders images and pickup fees by position', () => {
		expect(details.images.map((entry) => entry.alt)).toEqual(['Playa', 'Barco']);
		expect(details.images[0].image).toEqual({ remote: true, src: 'https://media.test/storage/v1/object/public/media/products/x/cover.jpg', width: 2400, height: 1600 });
		expect(Object.entries(details.pickupFees)).toEqual([
			['bavaro', 0],
			['macao', 15],
		]);
	});

	it('parses itinerary and faqs and skips malformed entries', () => {
		expect(details.itinerary).toEqual([
			{ time: '07:00', title: 'Recogida', text: 'Pasamos por tu hotel.' },
			{ title: 'Playa', text: 'Tiempo libre.' },
		]);
		expect(details.faqs).toEqual([{ question: '¿Hay baños?', answer: 'Sí.' }]);
	});

	it('uses products.updated_at', () => {
		expect(details.updatedAt.toISOString()).toBe('2026-09-27T15:30:00.000Z');
	});

	it('maps group pricing without a child price', () => {
		const group = tourRowToDetails(
			{ ...row, pricing_mode: 'per_group', max_group_size: 8, prices: [{ passenger_type: 'group', amount: 450, min_age: null, max_age: null, valid_from: '2000-01-01', valid_to: null }] },
			context,
		);
		expect(group).toMatchObject({ pricePer: 'group', price: 450 });
		expect(group.childPrice).toBeUndefined();
	});

	it('fails on an unknown destination', () => {
		expect(() => tourRowToDetails({ ...row, destination_slug: 'marte' }, context)).toThrow();
	});
});

describe('tourRowToEditable', () => {
	it('builds form values that pass the schema', () => {
		const editable = tourRowToEditable(row, '2026-09-28');
		expect(tourContentSchema.safeParse(editable.content).success).toBe(true);
		expect(tourOperationsSchema.safeParse(editable.operations).success).toBe(true);
		expect(editable.operations.schedule).toEqual({ startTime: '07:00', pickupTo: '07:30', returnAt: '18:00', weekdays: [4, 6, 7] });
		expect(editable.operations.pickupFees.map((fee) => fee.zoneId)).toEqual([bavaro.id, macao.id]);
		expect(editable.images.map((image) => image.path)).toEqual(['products/x/cover.jpg', 'products/x/second.jpg']);
		expect(missingForSale(editable).required).toEqual([]);
	});
});

describe('santoDomingoToday', () => {
	it('uses the Santo Domingo calendar day', () => {
		expect(santoDomingoToday(new Date('2026-09-29T03:00:00Z'))).toBe('2026-09-28');
		expect(santoDomingoToday(new Date('2026-09-29T04:00:00Z'))).toBe('2026-09-29');
	});
});
