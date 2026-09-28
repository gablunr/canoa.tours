import { ActionError, defineAction } from 'astro:actions';
import { TEAM_EMAIL } from 'astro:env/server';
import { z } from 'astro/zod';
import sharp from 'sharp';
import { avatarFolder } from '../lib/account/avatar';
import { customerIdForUser, findOwnedBooking, isBookingOwner } from '../lib/account/bookings';
import { loadBookingDetails, type BookingDetails } from '../lib/booking/booking-details';
import { bookingErrorMessage, dbErrorCode } from '../lib/booking/errors';
import { refundDeposit } from '../lib/booking/payments';
import { canCustomerCancel, canCustomerChangeDate } from '../lib/booking/self-service';
import { verifyBookingToken } from '../lib/booking/tokens';
import { sendBookingEmail } from '../lib/email/booking-emails';
import { sendEmail } from '../lib/email/send';
import { requireCustomerUser } from '../lib/manage/guards';
import { siteOrigin } from '../lib/site-origin';
import { supabaseAdmin } from '../lib/supabase/admin';
import { publicMediaUrl } from '../lib/supabase/media';

const bookingCode = z.string().trim().toUpperCase().min(4).max(20);
const maxReviewPhotos = 5;
const maxPhotoBytes = 5 * 1024 * 1024;
const photoExtensions: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/heic': 'heic',
	'image/heif': 'heif',
};

const reviewPhoto = z
	.instanceof(File)
	.refine((file) => file.type in photoExtensions, 'Solo se aceptan fotos JPG, PNG, WebP, AVIF o HEIC.')
	.refine((file) => file.size <= maxPhotoBytes, 'Cada foto puede pesar como máximo 5 MB.');

const reviewPhotos = z
	.array(z.instanceof(File))
	.transform((files) => files.filter((file) => file.size > 0))
	.pipe(z.array(reviewPhoto).max(maxReviewPhotos, `Puedes subir hasta ${maxReviewPhotos} fotos.`));

const maxAvatarBytes = 4 * 1024 * 1024;
const avatarEdge = 320;

const avatarPhoto = z
	.instanceof(File)
	.refine((file) => file.size > 0, 'Elige una foto.')
	.refine((file) => file.type in photoExtensions, 'Solo se aceptan fotos JPG, PNG, WebP, AVIF o HEIC.')
	.refine((file) => file.size <= maxAvatarBytes, 'La foto puede pesar como máximo 4 MB.');

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

function failWithDbError(error: unknown): never {
	const code = dbErrorCode(error);
	if (!code) console.error('account action failed', error);
	throw new ActionError({ code: 'BAD_REQUEST', message: code ? bookingErrorMessage(code) : 'No se pudo completar la operación.' });
}

const noCustomerProfile = () => new ActionError({ code: 'NOT_FOUND', message: 'Todavía no tienes un perfil de cliente.' });

async function customerAvatar(userId: string) {
	const { data, error } = await supabaseAdmin.from('customers').select('id, avatar_path').eq('auth_user_id', userId).maybeSingle();
	if (error) failWithDbError(error);
	if (!data) throw noCustomerProfile();
	return data;
}

async function squareAvatar(photo: File): Promise<Buffer | null> {
	try {
		return await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 60_000_000 })
			.rotate()
			.resize(avatarEdge, avatarEdge, { fit: 'cover', position: 'attention' })
			.webp({ quality: 80 })
			.toBuffer();
	} catch {
		return null;
	}
}

async function removeAvatarFile(customerId: string, path: string | null) {
	if (!path?.startsWith(avatarFolder(customerId))) return;
	const { error } = await supabaseAdmin.storage.from('media').remove([path]);
	if (error) console.error('avatar removal failed', error);
}

const bookingNotFound = () => new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa reserva en tu cuenta.' });

async function ownedBooking(user: { userId: string; email: string }, code: string): Promise<BookingDetails> {
	const details = await findOwnedBooking({ id: user.userId, email: user.email }, code).catch(failWithDbError);
	if (!details) throw bookingNotFound();
	return details;
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

async function alertTeamRefundFailed(details: BookingDetails, amount: number) {
	const text = `La reserva ${details.code} se ha cancelado desde la cuenta del cliente, pero el reembolso de ${amount.toFixed(2)} no se pudo hacer. Revísalo en el panel y avisa al cliente.`;
	try {
		await sendEmail({ to: TEAM_EMAIL, subject: `Reembolso pendiente de ${details.code}`, html: `<p>${text}</p>`, text });
	} catch (error) {
		console.error('refund alert failed', error);
	}
}

export const account = {
	changeDate: defineAction({
		input: z.object({ code: bookingCode, tourDate: z.iso.date() }),
		handler: async ({ code, tourDate }, context) => {
			const user = requireCustomerUser(context);
			const details = await ownedBooking(user, code);

			const check = canCustomerChangeDate(details);
			if (!check.allowed) throw new ActionError({ code: 'BAD_REQUEST', message: check.reason ?? 'No puedes cambiar la fecha de esta reserva.' });
			if (tourDate === details.tourDate) throw new ActionError({ code: 'BAD_REQUEST', message: 'Elige una fecha distinta a la actual.' });

			const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').select('schedule_id').eq('id', details.id).single();
			if (bookingError) failWithDbError(bookingError);

			const { error } = await supabaseAdmin.rpc('change_booking_date', {
				p_booking_id: details.id,
				p_tour_date: tourDate,
				p_schedule_id: booking.schedule_id,
				p_ignore_capacity: false,
				p_count_as_change: true,
				p_actor_user_id: user.userId,
			});
			if (error) failWithDbError(error);

			const emailSent = await sendEmailSafely('date_changed', details.id, { origin: siteOrigin(context.url) });
			return { tourDate, dateChangesCount: details.dateChangesCount + 1, emailSent };
		},
	}),

	cancel: defineAction({
		input: z.object({ code: bookingCode }),
		handler: async ({ code }, context) => {
			const user = requireCustomerUser(context);
			const details = await ownedBooking(user, code);

			const check = canCustomerCancel(details);
			if (!check.allowed) throw new ActionError({ code: 'BAD_REQUEST', message: check.reason ?? 'No puedes cancelar esta reserva.' });

			const reason = 'Cancelación del cliente con seguro';
			const { error } = await supabaseAdmin.rpc('cancel_booking', { p_booking_id: details.id, p_reason: reason, p_actor_user_id: user.userId });
			if (error) failWithDbError(error);

			const amountToRefund = roundMoney(Math.max(0, details.depositAmount - details.insuranceTotal));
			const refundResult = amountToRefund > 0 ? await refundDeposit(details.id, amountToRefund, reason) : null;
			const refundFailed = amountToRefund > 0 && !refundResult;

			if (refundFailed) {
				await alertTeamRefundFailed(details, amountToRefund);
				return { refundAmount: amountToRefund, refundPending: true, emailSent: false };
			}

			const refundAmount = refundResult?.amount ?? 0;
			const emailSent = await sendEmailSafely('cancelled', details.id, { origin: siteOrigin(context.url), refundAmount });
			return { refundAmount, refundPending: false, emailSent };
		},
	}),

	updateProfile: defineAction({
		input: z.object({
			fullName: z.string().trim().min(2).max(120),
			phone: z.string().trim().max(30).optional(),
			country: z
				.string()
				.trim()
				.toUpperCase()
				.regex(/^[A-Z]{2}$/, 'Usa el código de país de dos letras.')
				.optional()
				.or(z.literal('')),
		}),
		handler: async ({ fullName, phone, country }, context) => {
			const { userId } = requireCustomerUser(context);
			const { data, error } = await supabaseAdmin
				.from('customers')
				.update({ full_name: fullName, phone: phone || null, country: country || null })
				.eq('auth_user_id', userId)
				.select('id, full_name, phone, country');
			if (error) failWithDbError(error);
			if (!data?.length) throw noCustomerProfile();
			return data[0];
		},
	}),

	updateAvatar: defineAction({
		accept: 'form',
		input: z.object({ photo: avatarPhoto }),
		handler: async ({ photo }, context) => {
			const { userId } = requireCustomerUser(context);
			const customer = await customerAvatar(userId);

			const avatar = await squareAvatar(photo);
			if (!avatar) throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos leer la foto. Prueba con una JPG o PNG.' });

			const path = `${avatarFolder(customer.id)}${Date.now()}.webp`;
			const { error: uploadError } = await supabaseAdmin.storage.from('media').upload(path, avatar, { contentType: 'image/webp', upsert: false });
			if (uploadError) {
				console.error('avatar upload failed', uploadError);
				throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos subir la foto. Prueba de nuevo.' });
			}

			const { error } = await supabaseAdmin.from('customers').update({ avatar_path: path }).eq('id', customer.id);
			if (error) {
				await removeAvatarFile(customer.id, path);
				failWithDbError(error);
			}

			await removeAvatarFile(customer.id, customer.avatar_path);
			return { avatarUrl: publicMediaUrl(path) };
		},
	}),

	submitReview: defineAction({
		accept: 'form',
		input: z.object({
			code: bookingCode,
			token: z.string().optional(),
			rating: z.coerce.number().int().min(1).max(5),
			title: z.string().trim().max(120).optional(),
			body: z.string().trim().min(20, 'Cuéntanos un poco más, al menos 20 caracteres.').max(4000),
			authorName: z.string().trim().min(2).max(80),
			photos: reviewPhotos,
		}),
		handler: async (input, context) => {
			const details = await loadBookingDetails({ code: input.code });
			if (!details) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa reserva.' });

			const user = context.locals.user;
			const hasValidToken = Boolean(input.token) && verifyBookingToken(details.code, 'review', input.token ?? '');
			let isLoggedInOwner = false;
			if (!hasValidToken && user?.email) {
				const customerId = await customerIdForUser(user.id).catch(failWithDbError);
				isLoggedInOwner = isBookingOwner(details, customerId, user.email);
			}
			if (!hasValidToken && !isLoggedInOwner) {
				throw new ActionError({ code: 'FORBIDDEN', message: 'Este enlace para opinar no es válido.' });
			}

			if (details.status !== 'completed') {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Podrás dejar tu opinión cuando hayas hecho la excursión.' });
			}

			const { data: existingReview, error: existingError } = await supabaseAdmin.from('reviews').select('id').eq('booking_id', details.id).maybeSingle();
			if (existingError) failWithDbError(existingError);
			if (existingReview) throw new ActionError({ code: 'CONFLICT', message: 'Ya has dejado tu opinión sobre esta reserva. ¡Gracias!' });

			const { data: review, error: insertError } = await supabaseAdmin
				.from('reviews')
				.insert({
					source: 'booking',
					booking_id: details.id,
					product_id: details.productId,
					author_name: input.authorName,
					rating: input.rating,
					title: input.title || null,
					body: input.body,
					status: 'pending',
				})
				.select('id')
				.single();
			if (insertError?.code === '23505') {
				throw new ActionError({ code: 'CONFLICT', message: 'Ya has dejado tu opinión sobre esta reserva. ¡Gracias!' });
			}
			if (insertError) failWithDbError(insertError);

			const uploadedPhotos: { review_id: string; storage_path: string; position: number }[] = [];
			for (const [index, photo] of input.photos.entries()) {
				const storagePath = `reviews/${review.id}/${index}.${photoExtensions[photo.type]}`;
				const { error: uploadError } = await supabaseAdmin.storage
					.from('media')
					.upload(storagePath, photo, { contentType: photo.type, upsert: false });
				if (uploadError) {
					console.error('review photo upload failed', uploadError);
					continue;
				}
				uploadedPhotos.push({ review_id: review.id, storage_path: storagePath, position: index });
			}

			if (uploadedPhotos.length > 0) {
				const { error: photosError } = await supabaseAdmin.from('review_photos').insert(uploadedPhotos);
				if (photosError) console.error('review photos insert failed', photosError);
			}

			return { reviewId: review.id, photos: uploadedPhotos.length };
		},
	}),
};
