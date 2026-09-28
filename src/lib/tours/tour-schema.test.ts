import { describe, expect, it } from 'vitest';
import {
	missingForSale,
	saleChecklist,
	toContentPayload,
	toImagesPayload,
	toOperationsPayload,
	tourContentSchema,
	tourImagesSchema,
	tourOperationsSchema,
	type TourContentInput,
	type TourEditable,
	type TourOperationsInput,
} from './tour-schema';

const bavaroZone = '3f0c2a52-8d1e-4b6f-9a3c-1d2e3f4a5b6c';
const macaoZone = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const completeContent: TourContentInput = {
	name: 'Isla Saona en catamarán',
	shortName: 'Catamarán',
	slug: 'catamaran',
	destinationSlug: 'isla-saona',
	summary: 'Día completo en Isla Saona con catamarán, almuerzo y piscina natural.',
	ageNote: '',
	imageAlt: 'Catamarán frente a la costa',
	highlights: ['Ida en catamarán', 'Playa de arena blanca', 'Almuerzo buffet', '  '],
	includes: ['Recogida en el hotel', 'Catamarán', 'Almuerzo'],
	excludes: ['Propinas'],
	bring: ['Toalla'],
	itinerary: [
		{ time: '07:00', title: 'Recogida', text: 'Pasamos por tu hotel.' },
		{ time: '', title: 'Playa', text: 'Tiempo libre.' },
	],
	faqs: [
		{ question: '¿Hay baños?', answer: 'Sí, en la playa.' },
		{ question: '¿Pueden ir niños?', answer: 'Sí, desde bebés.' },
		{ question: '¿Hay sombra?', answer: 'Sí, bajo las palmeras.' },
	],
	bestFor: 'Primera vez en Saona',
	includesSummary: 'Catamarán, buffet y piscina natural',
	minAge: null,
	pregnancy: 'limited',
	pregnancyMaxMonths: 6,
	wheelchair: false,
};

const completeOperations: TourOperationsInput = {
	pricingMode: 'per_person',
	maxGroupSize: null,
	dailyCapacity: 100,
	infantsOccupySeat: true,
	depositValue: 20,
	priceUnit: 'por persona',
	meetingPoint: 'Puerto de Bayahibe',
	durationCategory: 'full_day',
	durationHours: 10.5,
	departurePort: 'saona',
	schedule: { startTime: '07:00', pickupTo: '07:30', returnAt: '18:00', weekdays: [7, 1, 2, 3, 4, 5, 6] },
	prices: { base: 55, child: { amount: 35, minAge: 3, maxAge: 11 } },
	pickupFees: [
		{ zoneId: bavaroZone, fee: 0 },
		{ zoneId: macaoZone, fee: 15.5 },
	],
};

const images = [
	{ path: 'products/abc/one.jpg', alt: 'Playa', width: 2400, height: 1600 },
	{ path: 'products/abc/two.jpg', alt: 'Barco', width: 1600, height: 1200 },
];

function editable(content: Partial<TourContentInput> = {}, operations: Partial<TourOperationsInput> = {}): TourEditable {
	return {
		content: tourContentSchema.parse({ ...completeContent, ...content }),
		operations: tourOperationsSchema.parse({ ...completeOperations, ...operations }),
		images: tourImagesSchema.parse(images),
	};
}

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
	(result.error?.issues ?? []).map((issue) => issue.path.join('.'));

describe('tourContentSchema', () => {
	it('accepts a complete tour and drops blank list rows', () => {
		const content = tourContentSchema.parse(completeContent);
		expect(content.highlights).toEqual(['Ida en catamarán', 'Playa de arena blanca', 'Almuerzo buffet']);
	});

	it('accepts an incomplete draft', () => {
		const result = tourContentSchema.safeParse({
			...completeContent,
			shortName: '',
			summary: '',
			highlights: [],
			includes: [],
			itinerary: [],
			faqs: [],
			bestFor: '',
			includesSummary: '',
			pregnancy: null,
			pregnancyMaxMonths: null,
		});
		expect(result.success).toBe(true);
	});

	it('rejects a slug with spaces or capitals', () => {
		expect(issuePaths(tourContentSchema.safeParse({ ...completeContent, slug: 'Isla Saona' }))).toContain('slug');
	});

	it('requires months only when pregnancy is limited', () => {
		expect(issuePaths(tourContentSchema.safeParse({ ...completeContent, pregnancyMaxMonths: null }))).toEqual(['pregnancyMaxMonths']);
		expect(issuePaths(tourContentSchema.safeParse({ ...completeContent, pregnancy: 'allowed' }))).toEqual(['pregnancyMaxMonths']);
		expect(tourContentSchema.safeParse({ ...completeContent, pregnancy: 'not_allowed', pregnancyMaxMonths: null }).success).toBe(true);
	});

	it('rejects itinerary times that are not HH:MM', () => {
		const result = tourContentSchema.safeParse({ ...completeContent, itinerary: [{ time: '7h', title: 'Recogida', text: '' }] });
		expect(issuePaths(result)).toEqual(['itinerary.0.time']);
	});

	it('limits list sizes and text lengths', () => {
		expect(tourContentSchema.safeParse({ ...completeContent, highlights: Array.from({ length: 11 }, (_, index) => `Punto ${index}`) }).success).toBe(false);
		expect(tourContentSchema.safeParse({ ...completeContent, summary: 'a'.repeat(301) }).success).toBe(false);
	});
});

describe('tourOperationsSchema', () => {
	it('accepts complete operations', () => {
		expect(tourOperationsSchema.safeParse(completeOperations).success).toBe(true);
	});

	it('rejects amounts with more than two decimals or below zero', () => {
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, depositValue: 10.555 }))).toEqual(['depositValue']);
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, prices: { base: -1, child: null } }))).toEqual(['prices.base']);
	});

	it('keeps the child price at or below the adult price', () => {
		const result = tourOperationsSchema.safeParse({ ...completeOperations, prices: { base: 55, child: { amount: 60, minAge: 3, maxAge: 11 } } });
		expect(issuePaths(result)).toContain('prices.child.amount');
	});

	it('keeps the deposit at or below the lowest price', () => {
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, depositValue: 40 }))).toEqual(['depositValue']);
		expect(tourOperationsSchema.safeParse({ ...completeOperations, depositValue: 35 }).success).toBe(true);
	});

	it('uses the group size only with group pricing', () => {
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, maxGroupSize: 8 }))).toEqual(['maxGroupSize']);
		const group = { ...completeOperations, pricingMode: 'per_group' as const, prices: { base: 450, child: null } };
		expect(issuePaths(tourOperationsSchema.safeParse(group))).toEqual(['maxGroupSize']);
		expect(tourOperationsSchema.safeParse({ ...group, maxGroupSize: 8 }).success).toBe(true);
	});

	it('validates times, weekdays and zones', () => {
		const schedule = { ...completeOperations.schedule, startTime: '7:00', weekdays: [1, 8] };
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, schedule }))).toEqual(['schedule.startTime', 'schedule.weekdays.1']);
		const repeatedZones = [
			{ zoneId: bavaroZone, fee: 0 },
			{ zoneId: bavaroZone, fee: 5 },
		];
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, pickupFees: repeatedZones }))).toEqual(['pickupFees']);
	});

	it('keeps pickup within the window order', () => {
		const schedule = { ...completeOperations.schedule, startTime: '08:00', pickupTo: '07:30' };
		expect(issuePaths(tourOperationsSchema.safeParse({ ...completeOperations, schedule }))).toEqual(['schedule.pickupTo']);
	});

	it('accepts an empty draft', () => {
		const draft: TourOperationsInput = {
			pricingMode: 'per_person',
			maxGroupSize: null,
			dailyCapacity: 100,
			infantsOccupySeat: true,
			depositValue: null,
			priceUnit: '',
			meetingPoint: '',
			durationCategory: null,
			durationHours: null,
			departurePort: null,
			schedule: { startTime: null, pickupTo: null, returnAt: null, weekdays: [] },
			prices: { base: null, child: null },
			pickupFees: [],
		};
		expect(tourOperationsSchema.safeParse(draft).success).toBe(true);
	});
});

describe('tourImagesSchema', () => {
	it('requires alt text and unique paths', () => {
		expect(tourImagesSchema.safeParse(images).success).toBe(true);
		expect(tourImagesSchema.safeParse([{ ...images[0], alt: ' ' }]).success).toBe(false);
		expect(tourImagesSchema.safeParse([images[0], images[0]]).success).toBe(false);
	});
});

describe('payload mappers', () => {
	it('maps content to the snake case payload', () => {
		const payload = toContentPayload(tourContentSchema.parse({ ...completeContent, ageNote: '  ' }));
		expect(payload).toMatchObject({ short_name: 'Catamarán', destination_slug: 'isla-saona', age_note: null, pregnancy_max_months: 6, best_for: 'Primera vez en Saona' });
		expect(payload.itinerary).toEqual([
			{ time: '07:00', title: 'Recogida', text: 'Pasamos por tu hotel.' },
			{ title: 'Playa', text: 'Tiempo libre.' },
		]);
	});

	it('maps operations with sorted weekdays and child ages', () => {
		const payload = toOperationsPayload(tourOperationsSchema.parse(completeOperations));
		expect(payload.schedule).toEqual({ start_time: '07:00', pickup_to: '07:30', return_at: '18:00', weekdays: [1, 2, 3, 4, 5, 6, 7] });
		expect(payload.prices).toEqual({ base: 55, child: { amount: 35, min_age: 3, max_age: 11 } });
		expect(payload.pickup_fees).toEqual([
			{ zone_id: bavaroZone, fee: 0 },
			{ zone_id: macaoZone, fee: 15.5 },
		]);
		expect(payload).toMatchObject({ pricing_mode: 'per_person', max_group_size: null, deposit_value: 20, departure_port: 'saona', duration_category: 'full_day' });
	});

	it('leaves an incomplete schedule untouched', () => {
		const operations = tourOperationsSchema.parse({ ...completeOperations, schedule: { startTime: '07:00', pickupTo: null, returnAt: null, weekdays: [] } });
		expect(toOperationsPayload(operations).schedule).toBeNull();
	});

	it('maps images in order', () => {
		expect(toImagesPayload(tourImagesSchema.parse(images)).map((image) => image.path)).toEqual(['products/abc/one.jpg', 'products/abc/two.jpg']);
	});
});

describe('missingForSale', () => {
	it('finds nothing required in a complete tour and recommends more photos', () => {
		const missing = missingForSale(editable());
		expect(missing.required).toEqual([]);
		expect(missing.recommended.map((item) => item.id)).toEqual(['photos']);
	});

	it('lists every required item of an empty draft with a stable id and section', () => {
		const tour = editable(
			{ shortName: '', summary: '', highlights: [], includes: [], itinerary: [], faqs: [], bring: [], bestFor: '', includesSummary: '' },
			{
				depositValue: null,
				priceUnit: '',
				meetingPoint: '',
				durationCategory: null,
				durationHours: null,
				schedule: { startTime: null, pickupTo: null, returnAt: null, weekdays: [] },
				prices: { base: null, child: null },
				pickupFees: [],
			},
		);
		const missing = missingForSale({ ...tour, images: [] });
		expect(missing.required.map((item) => item.id)).toEqual([
			'short-name',
			'summary',
			'highlights',
			'price',
			'deposit',
			'days',
			'schedule',
			'pickup-zones',
			'includes',
			'itinerary',
			'best-for',
			'includes-summary',
		]);
		expect(missing.recommended.map((item) => item.id)).toEqual(['photos', 'faqs', 'bring']);
		expect(missing.required.find((item) => item.id === 'pickup-zones')).toEqual({ id: 'pickup-zones', label: 'Al menos una zona de recogida', section: 'pickup' });
	});

	it('counts minimums', () => {
		const missing = missingForSale(editable({ highlights: ['Uno', 'Dos'], includes: ['Uno', 'Dos'], itinerary: [{ title: 'Uno', text: '' }] }));
		expect(missing.required.map((item) => item.id)).toEqual(['highlights', 'includes', 'itinerary']);
	});

	it('marks each checklist item as done or pending', () => {
		const checklist = saleChecklist(editable({}, { schedule: { startTime: '07:00', pickupTo: null, returnAt: '18:00', weekdays: [1] } }));
		expect(checklist.required.filter((item) => !item.done).map((item) => item.id)).toEqual(['schedule']);
		expect(checklist.required).toHaveLength(13);
		expect(checklist.recommended).toHaveLength(3);
	});
});
