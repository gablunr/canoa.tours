import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { loadBookingDetails, type BookingDetails } from '../lib/booking/booking-details';
import { bookingErrorMessage, dbErrorCode } from '../lib/booking/errors';
import { chargeNoShowBalance, refundDeposit } from '../lib/booking/payments';
import { triggerRebuild } from '../lib/deploy-hook';
import { sendBookingEmail } from '../lib/email/booking-emails';
import { requireStaff } from '../lib/manage/guards';
import { siteOrigin } from '../lib/site-origin';
import { supabaseAdmin } from '../lib/supabase/admin';

const bookingCode = z.string().trim().toUpperCase().min(4).max(20);
const isoDate = z.iso.date();
const hourMinute = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM.');
const productKey = z.string().trim().min(1).max(80);
const staffRole = z.enum(['admin', 'operations', 'editor']);
const couponCode = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z0-9_]{3,32}$/, 'El código solo puede tener letras, números y guiones bajos (entre 3 y 32 caracteres).');

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

function failWithDbError(error: unknown): never {
	const code = dbErrorCode(error);
	if (!code) console.error('manage action failed', error);
	throw new ActionError({ code: 'BAD_REQUEST', message: code ? bookingErrorMessage(code) : 'No se pudo completar la operación.' });
}

async function bookingByCode(code: string): Promise<BookingDetails> {
	const details = await loadBookingDetails({ code });
	if (!details) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa reserva.' });
	return details;
}

async function productIdByKey(key: string): Promise<string> {
	const { data, error } = await supabaseAdmin.from('products').select('id').eq('key', key).maybeSingle();
	if (error) failWithDbError(error);
	if (!data) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa excursión.' });
	return data.id;
}

async function currentScheduleId(bookingId: string): Promise<string> {
	const { data, error } = await supabaseAdmin.from('bookings').select('schedule_id').eq('id', bookingId).single();
	if (error) failWithDbError(error);
	return data.schedule_id;
}

async function sendEmailSafely(...args: Parameters<typeof sendBookingEmail>): Promise<boolean> {
	try {
		await sendBookingEmail(...args);
		return true;
	} catch (error) {
		console.error(`booking email ${args[0]} failed`, error);
		return false;
	}
}

type EventData = { [key: string]: string | number | boolean | null };

async function logEvent(bookingId: string, type: string, data: EventData, actorUserId: string) {
	const { error } = await supabaseAdmin.from('booking_events').insert({ booking_id: bookingId, type, data, actor_user_id: actorUserId });
	if (error) console.error(`booking event ${type} failed`, error);
}

async function changeBookingDate(
	context: Parameters<typeof requireStaff>[0] & { url: URL },
	input: { code: string; tourDate: string; scheduleId?: string },
	ignoreCapacity: boolean,
) {
	const { userId } = requireStaff(context, ['admin', 'operations']);
	const details = await bookingByCode(input.code);
	const scheduleId = input.scheduleId ?? (await currentScheduleId(details.id));

	const { error } = await supabaseAdmin.rpc('change_booking_date', {
		p_booking_id: details.id,
		p_tour_date: input.tourDate,
		p_schedule_id: scheduleId,
		p_ignore_capacity: ignoreCapacity,
		p_count_as_change: false,
		p_actor_user_id: userId,
	});
	if (error) failWithDbError(error);

	const emailSent = await sendEmailSafely('date_changed', details.id, { origin: siteOrigin(context.url) });
	return { tourDate: input.tourDate, scheduleId, emailSent };
}

async function markProviderStep(
	column: 'provider_sent_at' | 'provider_confirmed_at',
	eventType: 'provider_sent' | 'provider_confirmed',
	input: { date: string; productKey?: string },
	actorUserId: string,
) {
	const productId = input.productKey ? await productIdByKey(input.productKey) : null;
	const now = new Date().toISOString();

	let query = supabaseAdmin
		.from('bookings')
		.update(column === 'provider_sent_at' ? { provider_sent_at: now } : { provider_confirmed_at: now })
		.eq('tour_date', input.date)
		.eq('status', 'confirmed')
		.is(column, null);
	if (productId) query = query.eq('product_id', productId);

	const { data, error } = await query.select('id');
	if (error) failWithDbError(error);

	const bookingIds = (data ?? []).map((booking) => booking.id);
	if (bookingIds.length === 0) return { count: 0 };

	if (column === 'provider_confirmed_at') {
		const { error: sentError } = await supabaseAdmin.from('bookings').update({ provider_sent_at: now }).in('id', bookingIds).is('provider_sent_at', null);
		if (sentError) console.error('provider sent backfill failed', sentError);
	}

	const { error: eventsError } = await supabaseAdmin
		.from('booking_events')
		.insert(bookingIds.map((bookingId) => ({ booking_id: bookingId, type: eventType, data: { date: input.date }, actor_user_id: actorUserId })));
	if (eventsError) console.error(`booking event ${eventType} failed`, eventsError);

	return { count: bookingIds.length };
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
	const perPage = 1000;
	for (let page = 1; page <= 50; page += 1) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
		if (error) throw error;
		const match = data.users.find((user) => user.email?.toLowerCase() === email);
		if (match) return match.id;
		if (data.users.length < perPage) return null;
	}
	return null;
}

async function assertNotLastAdmin(userId: string) {
	const { data: member, error } = await supabaseAdmin.from('staff').select('role').eq('user_id', userId).maybeSingle();
	if (error) failWithDbError(error);
	if (member?.role !== 'admin') return;

	const { count, error: countError } = await supabaseAdmin.from('staff').select('user_id', { count: 'exact', head: true }).eq('role', 'admin');
	if (countError) failWithDbError(countError);
	if ((count ?? 0) <= 1) {
		throw new ActionError({ code: 'BAD_REQUEST', message: 'Tiene que quedar al menos un administrador.' });
	}
}

const refundOption = z.enum(['none', 'deposit_without_insurance', 'full']);

function refundAmountFor(details: BookingDetails, option: z.infer<typeof refundOption>) {
	if (option === 'none') return 0;
	if (option === 'full') return roundMoney(details.depositAmount);
	return roundMoney(Math.max(0, details.depositAmount - details.insuranceTotal));
}

export const manage = {
	setPickupTime: defineAction({
		input: z.object({ code: bookingCode, pickupTime: hourMinute }),
		handler: async ({ code, pickupTime }, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);

			const { error } = await supabaseAdmin.from('bookings').update({ pickup_time: pickupTime }).eq('id', details.id);
			if (error) failWithDbError(error);

			await logEvent(details.id, 'pickup_updated', { pickup_time: pickupTime }, userId);
			return { pickupTime };
		},
	}),

	setPickupZone: defineAction({
		input: z.object({ code: bookingCode, zoneId: z.uuid(), hotelId: z.uuid().optional() }),
		handler: async ({ code, zoneId, hotelId }, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);

			const { data: booking, error: bookingError } = await supabaseAdmin
				.from('bookings')
				.select('id, product_id, adults, children, subtotal, insurance_total, discount_total, total, hotel_id, hotel_name')
				.eq('id', details.id)
				.single();
			if (bookingError) failWithDbError(bookingError);

			const { data: zoneFee, error: zoneError } = await supabaseAdmin
				.from('product_pickup_zones')
				.select('fee_per_person')
				.eq('product_id', booking.product_id)
				.eq('zone_id', zoneId)
				.maybeSingle();
			if (zoneError) failWithDbError(zoneError);
			if (!zoneFee) throw new ActionError({ code: 'BAD_REQUEST', message: 'Esa zona de recogida no está disponible para esta excursión.' });

			let nextHotelId: string | null = booking.hotel_id;
			let nextHotelName: string | null = booking.hotel_name;
			const hotelIdToCheck = hotelId ?? booking.hotel_id;
			if (hotelIdToCheck) {
				const { data: hotel, error: hotelError } = await supabaseAdmin.from('hotels').select('id, name, zone_id').eq('id', hotelIdToCheck).maybeSingle();
				if (hotelError) failWithDbError(hotelError);
				if (hotelId) {
					if (!hotel || hotel.zone_id !== zoneId) {
						throw new ActionError({ code: 'BAD_REQUEST', message: 'Ese hotel no pertenece a la zona elegida.' });
					}
					nextHotelId = hotel.id;
					nextHotelName = hotel.name;
				} else if (!hotel || hotel.zone_id !== zoneId) {
					nextHotelId = null;
					nextHotelName = booking.hotel_name ?? hotel?.name ?? null;
				}
			}
			if (!nextHotelId && !nextHotelName) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Indica el hotel de recogida.' });
			}

			const pickupTotal = roundMoney(zoneFee.fee_per_person * (booking.adults + booking.children));
			const total = roundMoney(booking.subtotal + pickupTotal + booking.insurance_total - booking.discount_total);

			const { error: updateError } = await supabaseAdmin
				.from('bookings')
				.update({
					pickup_zone_id: zoneId,
					hotel_id: nextHotelId,
					hotel_name: nextHotelName,
					pickup_total: pickupTotal,
					total,
					pickup_fee_pending: false,
				})
				.eq('id', details.id);
			if (updateError) failWithDbError(updateError);

			await logEvent(
				details.id,
				'pickup_updated',
				{ zone_id: zoneId, hotel_id: nextHotelId, pickup_total: pickupTotal, from_total: booking.total, total },
				userId,
			);
			return { pickupTotal, total, balanceAmount: roundMoney(total - details.depositAmount) };
		},
	}),

	changeDate: defineAction({
		input: z.object({ code: bookingCode, tourDate: isoDate, scheduleId: z.uuid().optional() }),
		handler: (input, context) => changeBookingDate(context, input, false),
	}),

	moveForWeather: defineAction({
		input: z.object({ code: bookingCode, tourDate: isoDate, scheduleId: z.uuid().optional() }),
		handler: (input, context) => changeBookingDate(context, input, true),
	}),

	cancel: defineAction({
		input: z.object({ code: bookingCode, refund: refundOption, reason: z.string().trim().min(3).max(500) }),
		handler: async ({ code, refund, reason }, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);
			if (details.status === 'cancelled') {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Esta reserva ya está cancelada.' });
			}

			const { error } = await supabaseAdmin.rpc('cancel_booking', { p_booking_id: details.id, p_reason: reason, p_actor_user_id: userId });
			if (error) failWithDbError(error);

			const amountToRefund = refundAmountFor(details, refund);
			const refundResult = amountToRefund > 0 ? await refundDeposit(details.id, amountToRefund, reason) : null;
			const refundFailed = amountToRefund > 0 && !refundResult;
			const refundAmount = refundResult?.amount ?? 0;

			const emailSent = refundFailed
				? false
				: await sendEmailSafely('cancelled', details.id, { origin: siteOrigin(context.url), refundAmount });

			return { refundAmount, refundId: refundResult?.refundId ?? null, refundFailed, emailSent };
		},
	}),

	markCompleted: defineAction({
		input: z.object({ code: bookingCode }),
		handler: async ({ code }, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);
			const { error } = await supabaseAdmin.rpc('set_booking_outcome', { p_booking_id: details.id, p_status: 'completed', p_actor_user_id: userId });
			if (error) failWithDbError(error);
			return { status: 'completed' as const };
		},
	}),

	markNoShow: defineAction({
		input: z.object({ code: bookingCode }),
		handler: async ({ code }, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);
			const { error } = await supabaseAdmin.rpc('set_booking_outcome', { p_booking_id: details.id, p_status: 'no_show', p_actor_user_id: userId });
			if (error) failWithDbError(error);
			const charge = await chargeNoShowBalance(details.id, siteOrigin(context.url));
			return { status: charge.status, message: charge.message ?? null };
		},
	}),

	resendEmail: defineAction({
		input: z.object({ code: bookingCode, kind: z.enum(['confirmed', 'tour_reminder']) }),
		handler: async ({ code, kind }, context) => {
			requireStaff(context, ['admin', 'operations']);
			const details = await bookingByCode(code);
			const sent = await sendEmailSafely(kind, details.id, { origin: siteOrigin(context.url) });
			if (!sent) throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo enviar el email. Inténtalo de nuevo.' });
			return { sent };
		},
	}),

	markProviderSent: defineAction({
		input: z.object({ date: isoDate, productKey: productKey.optional() }),
		handler: async (input, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			return markProviderStep('provider_sent_at', 'provider_sent', input, userId);
		},
	}),

	markProviderConfirmed: defineAction({
		input: z.object({ date: isoDate, productKey: productKey.optional() }),
		handler: async (input, context) => {
			const { userId } = requireStaff(context, ['admin', 'operations']);
			return markProviderStep('provider_confirmed_at', 'provider_confirmed', input, userId);
		},
	}),

	setDayCapacity: defineAction({
		input: z.object({
			productKey,
			tourDate: isoDate,
			capacity: z.number().int().min(0).max(10000).nullable(),
			closed: z.boolean(),
			note: z.string().trim().max(300).optional(),
		}),
		handler: async ({ productKey: key, tourDate, capacity, closed, note }, context) => {
			requireStaff(context, ['admin', 'operations']);
			const productId = await productIdByKey(key);
			const { error } = await supabaseAdmin
				.from('product_days')
				.upsert({ product_id: productId, tour_date: tourDate, capacity, closed, note: note || null }, { onConflict: 'product_id,tour_date' });
			if (error) failWithDbError(error);
			return { productKey: key, tourDate, capacity, closed };
		},
	}),

	createCoupon: defineAction({
		input: z
			.object({
				code: couponCode,
				discountType: z.enum(['percent', 'fixed']),
				discountValue: z.number().positive(),
				productKey: productKey.optional(),
				validFrom: isoDate.optional(),
				validTo: isoDate.optional(),
				maxRedemptions: z.number().int().positive().optional(),
			})
			.refine((coupon) => coupon.discountType !== 'percent' || coupon.discountValue <= 100, {
				message: 'Un descuento en porcentaje no puede pasar de 100.',
				path: ['discountValue'],
			})
			.refine((coupon) => !coupon.validFrom || !coupon.validTo || coupon.validTo >= coupon.validFrom, {
				message: 'La fecha final tiene que ser igual o posterior a la inicial.',
				path: ['validTo'],
			}),
		handler: async (input, context) => {
			requireStaff(context, ['admin']);
			const productId = input.productKey ? await productIdByKey(input.productKey) : null;
			const { data, error } = await supabaseAdmin
				.from('coupons')
				.insert({
					code: input.code,
					discount_type: input.discountType,
					discount_value: input.discountValue,
					product_id: productId,
					valid_from: input.validFrom ?? null,
					valid_to: input.validTo ?? null,
					max_redemptions: input.maxRedemptions ?? null,
				})
				.select('id, code')
				.single();
			if (error?.code === '23505') throw new ActionError({ code: 'CONFLICT', message: 'Ya existe un cupón con ese código.' });
			if (error) failWithDbError(error);
			return data;
		},
	}),

	setCouponActive: defineAction({
		input: z.object({ code: couponCode, active: z.boolean() }),
		handler: async ({ code, active }, context) => {
			requireStaff(context, ['admin']);
			const { data, error } = await supabaseAdmin.from('coupons').update({ active }).eq('code', code).select('id');
			if (error) failWithDbError(error);
			if (!data?.length) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos ese cupón.' });
			return { code, active };
		},
	}),

	addStaff: defineAction({
		input: z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), role: staffRole }),
		handler: async ({ email, role }, context) => {
			requireStaff(context, ['admin']);

			const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
			let userId = created?.user?.id ?? null;
			if (!userId) {
				if (createError && createError.code !== 'email_exists' && createError.code !== 'user_already_exists') {
					console.error('create staff user failed', createError);
					throw new ActionError({ code: 'BAD_REQUEST', message: 'No se pudo crear el usuario.' });
				}
				userId = await findAuthUserIdByEmail(email);
			}
			if (!userId) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos ningún usuario con ese email.' });

			if (role !== 'admin') await assertNotLastAdmin(userId);

			const { error } = await supabaseAdmin.from('staff').upsert({ user_id: userId, role }, { onConflict: 'user_id' });
			if (error) failWithDbError(error);
			return { userId, email, role };
		},
	}),

	setStaffRole: defineAction({
		input: z.object({ userId: z.uuid(), role: staffRole }),
		handler: async ({ userId, role }, context) => {
			requireStaff(context, ['admin']);
			if (role !== 'admin') await assertNotLastAdmin(userId);
			const { data, error } = await supabaseAdmin.from('staff').update({ role }).eq('user_id', userId).select('user_id');
			if (error) failWithDbError(error);
			if (!data?.length) throw new ActionError({ code: 'NOT_FOUND', message: 'Esa persona no forma parte del equipo.' });
			return { userId, role };
		},
	}),

	removeStaff: defineAction({
		input: z.object({ userId: z.uuid() }),
		handler: async ({ userId }, context) => {
			requireStaff(context, ['admin']);
			await assertNotLastAdmin(userId);
			const { error } = await supabaseAdmin.from('staff').delete().eq('user_id', userId);
			if (error) failWithDbError(error);
			return { userId };
		},
	}),

	moderateReview: defineAction({
		input: z.object({
			reviewId: z.uuid(),
			status: z.enum(['published', 'rejected']),
			reply: z.string().trim().max(2000).optional(),
		}),
		handler: async ({ reviewId, status, reply }, context) => {
			requireStaff(context);

			const { data: review, error: reviewError } = await supabaseAdmin.from('reviews').select('id, status, published_at').eq('id', reviewId).maybeSingle();
			if (reviewError) failWithDbError(reviewError);
			if (!review) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa opinión.' });

			const now = new Date().toISOString();
			const replyChanges = reply === undefined ? {} : reply ? { reply, replied_at: now } : { reply: null, replied_at: null };

			const { error } = await supabaseAdmin
				.from('reviews')
				.update({ status, published_at: status === 'published' ? (review.published_at ?? now) : null, ...replyChanges })
				.eq('id', reviewId);
			if (error) failWithDbError(error);

			if (status === 'published' || review.status === 'published') await triggerRebuild();
			return { reviewId, status };
		},
	}),

	createManualReview: defineAction({
		input: z.object({
			productKey,
			authorName: z.string().trim().min(2).max(80),
			rating: z.number().int().min(1).max(5),
			title: z.string().trim().max(120).optional(),
			body: z.string().trim().min(20).max(4000),
			publish: z.boolean(),
		}),
		handler: async (input, context) => {
			requireStaff(context);
			const productId = await productIdByKey(input.productKey);
			const now = new Date().toISOString();

			const { data, error } = await supabaseAdmin
				.from('reviews')
				.insert({
					source: 'manual',
					product_id: productId,
					author_name: input.authorName,
					rating: input.rating,
					title: input.title || null,
					body: input.body,
					status: input.publish ? 'published' : 'pending',
					published_at: input.publish ? now : null,
				})
				.select('id')
				.single();
			if (error) failWithDbError(error);

			if (input.publish) await triggerRebuild();
			return { reviewId: data.id };
		},
	}),
};
