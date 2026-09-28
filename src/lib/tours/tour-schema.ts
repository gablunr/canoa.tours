import { z } from 'astro/zod';
import { departurePorts } from '../../data/tours/departure-ports';

export const pricingModes = ['per_person', 'per_group'] as const;
export const tourDurations = ['full_day', 'half_day', 'night'] as const;
export const pregnancyPolicies = ['allowed', 'limited', 'not_allowed'] as const;

export const tourLimits = {
	nameLength: 120,
	shortNameLength: 60,
	slugLength: 80,
	summaryLength: 300,
	noteLength: 200,
	listItemLength: 200,
	highlights: 10,
	includes: 20,
	excludes: 20,
	bring: 15,
	itinerarySteps: 15,
	itineraryTitleLength: 120,
	itineraryTextLength: 600,
	faqs: 15,
	questionLength: 200,
	answerLength: 1500,
	bestForLength: 160,
	includesSummaryLength: 200,
	priceUnitLength: 60,
	meetingPointLength: 200,
	maxAge: 99,
	childMaxAge: 17,
	maxGroupSize: 100,
	dailyCapacity: 5000,
	durationHours: 24,
	maxMoney: 100000,
	maxPickupFee: 1000,
	pickupZones: 30,
	images: 20,
	imagePathLength: 300,
} as const;

export const idealImageCount = 5;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const tooLong = (max: number) => `Usa como mucho ${max} caracteres.`;

const plainText = (max: number) => z.string().trim().max(max, tooLong(max));

const requiredText = (max: number, emptyMessage: string) => plainText(max).min(1, emptyMessage);

const textList = (maxItems: number, maxLength: number) =>
	z
		.array(z.string())
		.transform((items) => items.map((item) => item.trim()).filter((item) => item.length > 0))
		.pipe(z.array(plainText(maxLength)).max(maxItems, `Pon como mucho ${maxItems}.`));

const slugField = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'La dirección necesita al menos 3 caracteres.')
	.max(tourLimits.slugLength, tooLong(tourLimits.slugLength))
	.regex(slugPattern, 'Usa minúsculas, números y guiones, sin espacios ni tildes.');

const hasCents = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

const isValidMoney = (value: number | null | undefined): value is number => typeof value === 'number' && value >= 0 && hasCents(value);

const isClockTime = (value: string | null): value is string => value !== null && timePattern.test(value);

const moneyUpTo = (max: number, tooHighMessage: string) =>
	z
		.number({ error: 'Escribe un importe.' })
		.min(0, 'El importe no puede ser negativo.')
		.max(max, tooHighMessage)
		.refine(hasCents, 'Usa como mucho dos decimales.');

const money = moneyUpTo(tourLimits.maxMoney, 'Ese importe es demasiado alto.');

const wholeNumber = (min: number, max: number) =>
	z
		.number({ error: 'Escribe un número.' })
		.int('Usa un número entero.')
		.min(min, `Usa un número desde ${min}.`)
		.max(max, `Usa un número hasta ${max}.`);

const clockTime = z.string().regex(timePattern, 'Usa el formato HH:MM.');

const isoWeekday = wholeNumber(1, 7);

const hasUniqueValues = <T>(values: T[]) => new Set(values).size === values.length;

const itineraryStepSchema = z.object({
	time: z.union([z.literal(''), clockTime]).optional(),
	title: requiredText(tourLimits.itineraryTitleLength, 'Pon un título al paso.'),
	text: plainText(tourLimits.itineraryTextLength),
});

const faqSchema = z.object({
	question: requiredText(tourLimits.questionLength, 'Escribe la pregunta.'),
	answer: requiredText(tourLimits.answerLength, 'Escribe la respuesta.'),
});

export const tourContentSchema = z
	.object({
		name: plainText(tourLimits.nameLength).min(3, 'El nombre necesita al menos 3 caracteres.'),
		shortName: plainText(tourLimits.shortNameLength),
		slug: slugField,
		destinationSlug: z.string().regex(slugPattern, 'Elige un destino.'),
		summary: plainText(tourLimits.summaryLength),
		ageNote: plainText(tourLimits.noteLength),
		imageAlt: plainText(tourLimits.noteLength),
		highlights: textList(tourLimits.highlights, tourLimits.listItemLength),
		includes: textList(tourLimits.includes, tourLimits.listItemLength),
		excludes: textList(tourLimits.excludes, tourLimits.listItemLength),
		bring: textList(tourLimits.bring, tourLimits.listItemLength),
		itinerary: z.array(itineraryStepSchema).max(tourLimits.itinerarySteps, `Pon como mucho ${tourLimits.itinerarySteps} pasos.`),
		faqs: z.array(faqSchema).max(tourLimits.faqs, `Pon como mucho ${tourLimits.faqs} preguntas.`),
		bestFor: plainText(tourLimits.bestForLength),
		includesSummary: plainText(tourLimits.includesSummaryLength),
		minAge: wholeNumber(0, tourLimits.maxAge).nullable(),
		pregnancy: z.enum(pregnancyPolicies, { error: 'Elige una opción.' }).nullable(),
		pregnancyMaxMonths: wholeNumber(1, 9).nullable(),
		wheelchair: z.boolean(),
	})
	.superRefine((content, context) => {
		if (content.pregnancy === 'limited' && content.pregnancyMaxMonths === null) {
			context.addIssue({ code: 'custom', path: ['pregnancyMaxMonths'], message: 'Indica hasta qué mes pueden ir.' });
		}
		if (content.pregnancy !== 'limited' && content.pregnancyMaxMonths !== null) {
			context.addIssue({ code: 'custom', path: ['pregnancyMaxMonths'], message: 'Los meses solo se indican si pueden ir con límite.' });
		}
	});

const childPriceSchema = z.object({
	amount: money,
	minAge: wholeNumber(0, tourLimits.childMaxAge),
	maxAge: wholeNumber(0, tourLimits.childMaxAge),
});

const scheduleSchema = z.object({
	startTime: clockTime.nullable(),
	pickupTo: clockTime.nullable(),
	returnAt: clockTime.nullable(),
	weekdays: z.array(isoWeekday).max(7).refine(hasUniqueValues, 'Cada día solo una vez.'),
});

const pickupFeeSchema = z.object({
	zoneId: z.uuid('Elige una zona.'),
	fee: moneyUpTo(tourLimits.maxPickupFee, 'La tarifa no puede pasar de US$1.000.'),
});

const departurePortKeys = Object.keys(departurePorts) as [keyof typeof departurePorts, ...(keyof typeof departurePorts)[]];

export const tourOperationsSchema = z
	.object({
		pricingMode: z.enum(pricingModes, { error: 'Elige por persona o por grupo.' }),
		maxGroupSize: wholeNumber(1, tourLimits.maxGroupSize).nullable(),
		dailyCapacity: wholeNumber(0, tourLimits.dailyCapacity),
		infantsOccupySeat: z.boolean(),
		depositValue: money.nullable(),
		priceUnit: plainText(tourLimits.priceUnitLength),
		meetingPoint: plainText(tourLimits.meetingPointLength),
		durationCategory: z.enum(tourDurations, { error: 'Elige la duración.' }).nullable(),
		durationHours: z
			.number({ error: 'Escribe las horas.' })
			.positive('Las horas tienen que ser más de 0.')
			.max(tourLimits.durationHours, `Usa como mucho ${tourLimits.durationHours} horas.`)
			.refine((hours) => Number.isInteger(Math.round(hours * 10 * 1e6) / 1e6), 'Usa como mucho un decimal.')
			.nullable(),
		departurePort: z.enum(departurePortKeys, { error: 'Elige un puerto.' }).nullable(),
		schedule: scheduleSchema,
		prices: z.object({ base: money.nullable(), child: childPriceSchema.nullable() }),
		pickupFees: z
			.array(pickupFeeSchema)
			.max(tourLimits.pickupZones)
			.refine((fees) => hasUniqueValues(fees.map((fee) => fee.zoneId)), 'Cada zona solo una vez.'),
	})
	.superRefine((operations, context) => {
		const { pricingMode, maxGroupSize, depositValue, schedule, prices } = operations;
		if (pricingMode === 'per_group' && maxGroupSize === null) {
			context.addIssue({ code: 'custom', path: ['maxGroupSize'], message: 'Indica para cuántas personas es el grupo.' });
		}
		if (pricingMode === 'per_person' && maxGroupSize !== null) {
			context.addIssue({ code: 'custom', path: ['maxGroupSize'], message: 'El tamaño del grupo solo va con precio por grupo.' });
		}
		if (pricingMode === 'per_group' && prices.child !== null) {
			context.addIssue({ code: 'custom', path: ['prices', 'child'], message: 'El precio de niño solo va con precio por persona.' });
		}
		if (prices.child && prices.child.minAge > prices.child.maxAge) {
			context.addIssue({ code: 'custom', path: ['prices', 'child', 'maxAge'], message: 'La edad hasta no puede ser menor que la edad desde.' });
		}
		if (prices.child && isValidMoney(prices.base) && isValidMoney(prices.child.amount) && prices.child.amount > prices.base) {
			context.addIssue({ code: 'custom', path: ['prices', 'child', 'amount'], message: 'El precio de niño no puede superar al de adulto.' });
		}
		const lowestPrice = lowestTourPrice(operations);
		const pricesAreValid = isValidMoney(prices.base) && (prices.child === null || isValidMoney(prices.child.amount));
		if (isValidMoney(depositValue) && pricesAreValid && lowestPrice !== null && depositValue > lowestPrice) {
			context.addIssue({ code: 'custom', path: ['depositValue'], message: 'El depósito no puede superar el precio más bajo.' });
		}
		if (isClockTime(schedule.startTime) && isClockTime(schedule.pickupTo) && schedule.pickupTo < schedule.startTime) {
			context.addIssue({ code: 'custom', path: ['schedule', 'pickupTo'], message: 'La recogida no puede terminar antes de empezar.' });
		}
	});

export const tourImageSchema = z.object({
	path: z
		.string()
		.trim()
		.min(1, 'Falta el archivo de la foto.')
		.max(tourLimits.imagePathLength)
		.regex(/^[^/].*[^/]$/, 'La ruta de la foto no es válida.'),
	alt: requiredText(tourLimits.noteLength, 'Describe la foto para quien no puede verla.'),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

export const tourImagesSchema = z
	.array(tourImageSchema)
	.max(tourLimits.images, `Pon como mucho ${tourLimits.images} fotos.`)
	.refine((images) => hasUniqueValues(images.map((image) => image.path)), 'Cada foto solo una vez.');

export type PricingMode = (typeof pricingModes)[number];
export type TourDuration = (typeof tourDurations)[number];
export type PregnancyPolicyValue = (typeof pregnancyPolicies)[number];
export type TourContent = z.output<typeof tourContentSchema>;
export type TourContentInput = z.input<typeof tourContentSchema>;
export type TourOperations = z.output<typeof tourOperationsSchema>;
export type TourOperationsInput = z.input<typeof tourOperationsSchema>;
export type TourImage = z.output<typeof tourImageSchema>;

export interface TourEditable {
	content: TourContent;
	operations: TourOperations;
	images: TourImage[];
}

export function lowestTourPrice(operations: Pick<TourOperations, 'pricingMode' | 'prices'>) {
	const { base, child } = operations.prices;
	const candidates = [base, operations.pricingMode === 'per_person' ? child?.amount : null].filter(
		(amount): amount is number => typeof amount === 'number',
	);
	return candidates.length > 0 ? Math.min(...candidates) : null;
}

export type TourItineraryPayload = { time?: string; title: string; text: string };

export type TourContentPayload = {
	name: string;
	short_name: string | null;
	slug: string;
	destination_slug: string;
	summary: string | null;
	age_note: string | null;
	image_alt: string | null;
	highlights: string[];
	includes: string[];
	excludes: string[];
	bring: string[];
	itinerary: TourItineraryPayload[];
	faqs: { question: string; answer: string }[];
	best_for: string | null;
	includes_summary: string | null;
	min_age: number | null;
	pregnancy: PregnancyPolicyValue | null;
	pregnancy_max_months: number | null;
	wheelchair: boolean;
};

export type TourSchedulePayload = { start_time: string; pickup_to: string | null; return_at: string | null; weekdays: number[] };

export type TourOperationsPayload = {
	pricing_mode: PricingMode;
	max_group_size: number | null;
	daily_capacity: number;
	infants_occupy_seat: boolean;
	deposit_value: number | null;
	price_unit: string | null;
	meeting_point: string | null;
	duration_category: TourDuration | null;
	duration_hours: number | null;
	departure_port: string | null;
	schedule: TourSchedulePayload | null;
	prices: { base: number | null; child: { amount: number; min_age: number; max_age: number } | null };
	pickup_fees: { zone_id: string; fee: number }[];
};

export type TourImagePayload = { path: string; alt: string; width: number; height: number };

const nullWhenEmpty = (text: string) => (text.trim() === '' ? null : text.trim());

export function toContentPayload(content: TourContent): TourContentPayload {
	return {
		name: content.name,
		short_name: nullWhenEmpty(content.shortName),
		slug: content.slug,
		destination_slug: content.destinationSlug,
		summary: nullWhenEmpty(content.summary),
		age_note: nullWhenEmpty(content.ageNote),
		image_alt: nullWhenEmpty(content.imageAlt),
		highlights: content.highlights,
		includes: content.includes,
		excludes: content.excludes,
		bring: content.bring,
		itinerary: content.itinerary.map((step) => (step.time ? { time: step.time, title: step.title, text: step.text } : { title: step.title, text: step.text })),
		faqs: content.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
		best_for: nullWhenEmpty(content.bestFor),
		includes_summary: nullWhenEmpty(content.includesSummary),
		min_age: content.minAge,
		pregnancy: content.pregnancy,
		pregnancy_max_months: content.pregnancy === 'limited' ? content.pregnancyMaxMonths : null,
		wheelchair: content.wheelchair,
	};
}

export function toOperationsPayload(operations: TourOperations): TourOperationsPayload {
	const { schedule, prices } = operations;
	const perGroup = operations.pricingMode === 'per_group';
	const scheduleIsComplete = schedule.startTime !== null && schedule.weekdays.length > 0;
	return {
		pricing_mode: operations.pricingMode,
		max_group_size: perGroup ? operations.maxGroupSize : null,
		daily_capacity: operations.dailyCapacity,
		infants_occupy_seat: operations.infantsOccupySeat,
		deposit_value: operations.depositValue,
		price_unit: nullWhenEmpty(operations.priceUnit),
		meeting_point: nullWhenEmpty(operations.meetingPoint),
		duration_category: operations.durationCategory,
		duration_hours: operations.durationHours,
		departure_port: operations.departurePort,
		schedule:
			scheduleIsComplete && schedule.startTime
				? {
						start_time: schedule.startTime,
						pickup_to: schedule.pickupTo,
						return_at: schedule.returnAt,
						weekdays: [...schedule.weekdays].sort((first, second) => first - second),
					}
				: null,
		prices: {
			base: prices.base,
			child: !perGroup && prices.child ? { amount: prices.child.amount, min_age: prices.child.minAge, max_age: prices.child.maxAge } : null,
		},
		pickup_fees: operations.pickupFees.map((fee) => ({ zone_id: fee.zoneId, fee: fee.fee })),
	};
}

export const toImagesPayload = (images: TourImage[]): TourImagePayload[] =>
	images.map((image) => ({ path: image.path, alt: image.alt, width: image.width, height: image.height }));

export type TourEditorSectionId =
	| 'basics'
	| 'photos'
	| 'price'
	| 'schedule'
	| 'pickup'
	| 'includes'
	| 'bring'
	| 'itinerary'
	| 'requirements'
	| 'faqs'
	| 'destination-page';

export type RequiredItemId =
	| 'name'
	| 'short-name'
	| 'summary'
	| 'highlights'
	| 'price'
	| 'deposit'
	| 'days'
	| 'schedule'
	| 'pickup-zones'
	| 'includes'
	| 'itinerary'
	| 'best-for'
	| 'includes-summary';

export type RecommendedItemId = 'photos' | 'faqs' | 'bring';

export interface MissingItem {
	id: RequiredItemId | RecommendedItemId;
	label: string;
	section: TourEditorSectionId;
}

export interface ChecklistItem extends MissingItem {
	done: boolean;
}

export const saleMinimums = { highlights: 3, includes: 3, itinerarySteps: 2, pickupZones: 1, faqs: 3, bring: 1 } as const;

const filled = (text: string | null | undefined) => typeof text === 'string' && text.trim().length > 0;

const countFilled = (items: string[]) => items.filter(filled).length;

export function saleChecklist(tour: TourEditable): { required: ChecklistItem[]; recommended: ChecklistItem[] } {
	const { content, operations, images } = tour;
	const { schedule } = operations;
	const scheduleDone =
		filled(schedule.startTime) &&
		filled(schedule.pickupTo) &&
		filled(schedule.returnAt) &&
		operations.durationCategory !== null &&
		operations.durationHours !== null &&
		operations.durationHours > 0 &&
		filled(operations.meetingPoint);
	const priceDone = operations.prices.base !== null && operations.prices.base > 0 && filled(operations.priceUnit);

	return {
		required: [
			{ id: 'name', label: 'Nombre', section: 'basics', done: filled(content.name) },
			{ id: 'short-name', label: 'Nombre corto', section: 'basics', done: filled(content.shortName) },
			{ id: 'summary', label: 'Resumen', section: 'basics', done: filled(content.summary) },
			{ id: 'highlights', label: '«Lo mejor», al menos 3', section: 'basics', done: countFilled(content.highlights) >= saleMinimums.highlights },
			{ id: 'price', label: 'Precio', section: 'price', done: priceDone },
			{ id: 'deposit', label: 'Depósito', section: 'price', done: operations.depositValue !== null && operations.depositValue > 0 },
			{ id: 'days', label: 'Días de salida', section: 'schedule', done: schedule.weekdays.length > 0 },
			{ id: 'schedule', label: 'Horario', section: 'schedule', done: scheduleDone },
			{ id: 'pickup-zones', label: 'Al menos una zona de recogida', section: 'pickup', done: operations.pickupFees.length >= saleMinimums.pickupZones },
			{ id: 'includes', label: '«Qué incluye», al menos 3', section: 'includes', done: countFilled(content.includes) >= saleMinimums.includes },
			{ id: 'itinerary', label: 'Itinerario, al menos 2 pasos', section: 'itinerary', done: content.itinerary.length >= saleMinimums.itinerarySteps },
			{ id: 'best-for', label: '«Ideal para»', section: 'destination-page', done: filled(content.bestFor) },
			{ id: 'includes-summary', label: 'Resumen para la comparativa', section: 'destination-page', done: filled(content.includesSummary) },
		],
		recommended: [
			{ id: 'photos', label: `Fotos propias, lo ideal son ${idealImageCount} o más`, section: 'photos', done: images.length >= idealImageCount },
			{ id: 'faqs', label: `Al menos ${saleMinimums.faqs} preguntas frecuentes`, section: 'faqs', done: content.faqs.length >= saleMinimums.faqs },
			{ id: 'bring', label: '«Qué llevar»', section: 'bring', done: countFilled(content.bring) >= saleMinimums.bring },
		],
	};
}

const withoutDone = ({ id, label, section }: ChecklistItem): MissingItem => ({ id, label, section });

export function missingForSale(tour: TourEditable): { required: MissingItem[]; recommended: MissingItem[] } {
	const checklist = saleChecklist(tour);
	return {
		required: checklist.required.filter((item) => !item.done).map(withoutDone),
		recommended: checklist.recommended.filter((item) => !item.done).map(withoutDone),
	};
}
