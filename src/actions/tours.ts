import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import sharp from 'sharp';
import {
	archiveBlockReason,
	countActiveToursInDestination,
	countFutureBookings,
	findDestinationBySlug,
	hasTourHistory,
	loadTourRow,
	tourImagePrefix,
} from '../components/manage/tours/tour-editor-data';
import { findDestinationById, mergeTourOrder, sortToursForDestination } from '../components/manage/tours/tour-list-data';
import { destinationDefinitions, type DestinationDefinition } from '../data/tours/destination-definitions';
import { triggerRebuild } from '../lib/deploy-hook';
import { requireStaff } from '../lib/manage/guards';
import { supabaseAdmin } from '../lib/supabase/admin';
import type { Json } from '../lib/supabase/database.types';
import { publicMediaUrl } from '../lib/supabase/media';
import type { StaffRole } from '../lib/supabase/types';
import { tourRowToEditable, type TourRow } from '../lib/tours/tour-rows';
import {
	missingForSale,
	toContentPayload,
	toImagesPayload,
	toOperationsPayload,
	tourContentSchema,
	tourImagesSchema,
	tourOperationsSchema,
	type TourEditable,
	type TourImage,
} from '../lib/tours/tour-schema';

export const tourEditors: StaffRole[] = ['admin', 'editor'];
export const tourAdmins: StaffRole[] = ['admin'];

const destinationIds: string[] = destinationDefinitions.map((destination) => destination.id);

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const tourSlug = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'La dirección necesita al menos 3 caracteres.')
	.max(80)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones, sin espacios ni tildes.');

export const tourDestinationId = z.string().refine((value) => destinationIds.includes(value), 'Elige un destino.');

const rpcErrorMessages: Record<string, string> = {
	product_not_found: 'Esa excursión ya no existe. Recarga la página.',
	slug_locked: 'La dirección y el destino no cambian una vez que la excursión sale a la venta.',
	schedule_incomplete: 'Completa el horario: hora de salida y días.',
	image_path_taken: 'Una de las fotos ya la usa otra excursión. Súbela de nuevo.',
	prices_required: 'Si cambias el tipo de precio, pon también los precios nuevos.',
	supplier_not_found: 'No hay ningún proveedor activo para crear la excursión.',
	invalid_tour_order: 'El orden ya no coincide con las excursiones del destino. Recarga la página.',
	product_not_active: 'Solo puedes destacar excursiones que estén a la venta.',
};

const uniqueConstraintMessages: Record<string, string> = {
	product_translations_locale_slug_key: 'Ya hay una excursión con esa dirección. Elige otra.',
	products_key_key: 'Ya hay una excursión con esa clave en este destino. Cambia la dirección.',
};

const takenByGuideMessage = 'Esa dirección ya la usa una guía publicada. Elige otra.';

type DbError = { code?: string; message?: string } | null;

export function failWithDbError(error: DbError, fallback = 'No se pudo guardar la excursión.'): never {
	const message = error?.message?.trim() ?? '';
	const rpcMessage = rpcErrorMessages[message];
	if (rpcMessage) throw new ActionError({ code: message === 'product_not_found' ? 'NOT_FOUND' : 'BAD_REQUEST', message: rpcMessage });
	if (error?.code === '23505') {
		const constraint = Object.keys(uniqueConstraintMessages).find((name) => message.includes(name));
		throw new ActionError({ code: 'CONFLICT', message: constraint ? uniqueConstraintMessages[constraint] : 'Ya hay una excursión con esos datos.' });
	}
	console.error('tour action failed', error);
	throw new ActionError({ code: 'BAD_REQUEST', message: fallback });
}

export async function assertSlugFreeOfGuides(slug: string) {
	const { data, error } = await supabaseAdmin.from('guides').select('id').eq('locale', 'es').eq('status', 'published').eq('slug', slug).limit(1);
	if (error) failWithDbError(error);
	if (data.length > 0) throw new ActionError({ code: 'CONFLICT', message: takenByGuideMessage });
}

const maxUploadBytes = 10 * 1024 * 1024;
const imageExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const sharpFormats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const mediaBucket = 'media';
const rotatedOrientations = new Set([5, 6, 7, 8]);
const recentUploadMs = 60 * 60 * 1000;

async function requireTourRow(id: string): Promise<TourRow> {
	let row: TourRow | null = null;
	try {
		row = await loadTourRow(id);
	} catch (error) {
		failWithDbError(error as DbError, 'No pudimos cargar la excursión.');
	}
	if (!row) throw new ActionError({ code: 'NOT_FOUND', message: rpcErrorMessages.product_not_found });
	return row;
}

const missingLabels = (tour: TourEditable) =>
	missingForSale(tour)
		.required.map((item) => item.label)
		.join(', ');

function assertStillComplete(tour: TourEditable) {
	const missing = missingLabels(tour);
	if (missing) throw new ActionError({ code: 'BAD_REQUEST', message: `Está a la venta y tiene que seguir completa. Falta: ${missing}.` });
}

function assertOwnImages(tourId: string, images: TourImage[]) {
	const prefix = tourImagePrefix(tourId);
	const foreign = images.some((image) => {
		const fileName = image.path.slice(prefix.length);
		return !image.path.startsWith(prefix) || fileName.length === 0 || fileName.includes('/') || fileName.includes('..');
	});
	if (foreign) throw new ActionError({ code: 'BAD_REQUEST', message: 'Una de las fotos no es de esta excursión. Súbela de nuevo.' });
}

async function storedImagePaths(tourId: string) {
	const prefix = tourImagePrefix(tourId);
	const { data, error } = await supabaseAdmin.storage.from(mediaBucket).list(prefix.slice(0, -1), { limit: 1000 });
	if (error) throw error;
	return data.filter((entry) => Boolean(entry.id)).map((entry) => `${prefix}${entry.name}`);
}

async function assertImagesStored(tourId: string, images: TourImage[]) {
	if (images.length === 0) return;
	let stored: Set<string>;
	try {
		stored = new Set(await storedImagePaths(tourId));
	} catch (error) {
		console.error('tour image listing failed', error);
		throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos comprobar las fotos. Prueba de nuevo.' });
	}
	if (images.some((image) => !stored.has(image.path))) {
		throw new ActionError({ code: 'BAD_REQUEST', message: 'Una foto ya no está guardada. Quítala y súbela de nuevo.' });
	}
}

function isRecentUpload(path: string) {
	const uploadedAt = Number(path.split('/').pop()?.split('.')[0]);
	return Number.isFinite(uploadedAt) && uploadedAt > Date.now() - recentUploadMs;
}

async function removeStoredImages(tourId: string, keptPaths: string[] = [], { keepRecentUploads = false } = {}) {
	const kept = new Set(keptPaths);
	const prefix = tourImagePrefix(tourId);
	let stored: string[];
	try {
		stored = await storedImagePaths(tourId);
	} catch (error) {
		console.error('tour image listing failed', error);
		return;
	}
	const unused = stored.filter((path) => path.startsWith(prefix) && !kept.has(path) && !(keepRecentUploads && isRecentUpload(path)));
	if (unused.length === 0) return;
	const { error } = await supabaseAdmin.storage.from(mediaBucket).remove(unused);
	if (error) console.error('tour image removal failed', error);
}

async function updateDraftKey(tourId: string, destination: Pick<DestinationDefinition, 'id'>, slug: string) {
	const { error } = await supabaseAdmin.from('products').update({ key: `${destination.id}/${slug}` }).eq('id', tourId).is('published_at', null);
	if (error) failWithDbError(error);
}

async function imageSize(buffer: Buffer, declaredType: string) {
	try {
		const metadata = await sharp(buffer).metadata();
		if (metadata.format !== sharpFormats[declaredType]) return null;
		if (!metadata.width || !metadata.height) return null;
		const rotated = rotatedOrientations.has(metadata.orientation ?? 1);
		return rotated ? { width: metadata.height, height: metadata.width } : { width: metadata.width, height: metadata.height };
	} catch {
		return null;
	}
}

function readSaveResult(data: Json) {
	const result = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const futureBookings = Number(result.future_bookings_on_removed_weekdays ?? 0);
	return { futureBookingsOnRemovedWeekdays: Number.isFinite(futureBookings) ? futureBookings : 0 };
}

async function setTourStatus(tourId: string, userId: string, status: TourRow['status']) {
	const { error } = await supabaseAdmin.rpc('admin_set_tour_status', { p_product_id: tourId, p_user_id: userId, p_status: status });
	if (error) failWithDbError(error, 'No se pudo cambiar el estado de la excursión.');
}

function destinationFor(id: string) {
	const destination = findDestinationById(id);
	if (!destination) throw new ActionError({ code: 'BAD_REQUEST', message: 'Elige un destino.' });
	return destination;
}

export const tours = {
	create: defineAction({
		input: z.object({
			destinationId: tourDestinationId,
			name: text(5, 120),
			shortName: text(2, 40),
			slug: tourSlug,
			copyFrom: z.uuid().nullable().default(null),
		}),
		handler: async ({ destinationId, name, shortName, slug, copyFrom }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const destination = destinationFor(destinationId);
			await assertSlugFreeOfGuides(slug);

			const { data, error } = await supabaseAdmin.rpc('admin_create_tour', {
				p_user_id: userId,
				p_key: `${destination.id}/${slug}`,
				p_destination_slug: destination.slug,
				p_name: name,
				p_short_name: shortName,
				p_slug: slug,
				...(copyFrom ? { p_copy_from: copyFrom } : {}),
			});
			if (error) failWithDbError(error, 'No se pudo crear la excursión.');
			return { tourId: data };
		},
	}),

	reorder: defineAction({
		input: z.object({
			destinationId: tourDestinationId,
			productIds: z.array(z.uuid()).min(1).max(100),
		}),
		handler: async ({ destinationId, productIds }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const destination = destinationFor(destinationId);
			const orderError = 'No se pudo guardar el orden.';

			const { data, error } = await supabaseAdmin
				.from('products')
				.select('id, status, position, product_translations(locale, name, slug)')
				.eq('destination_slug', destination.slug);
			if (error) failWithDbError(error, orderError);

			const current = sortToursForDestination(
				destination,
				data.map((row) => {
					const translation = row.product_translations.find((candidate) => candidate.locale === 'es');
					return { id: row.id, status: row.status, position: row.position, name: translation?.name ?? '', slug: translation?.slug ?? '' };
				}),
			);
			const fullOrder = mergeTourOrder(
				current.map((tour) => tour.id),
				productIds,
			);
			if (!fullOrder) failWithDbError({ message: 'invalid_tour_order' });

			const { error: reorderError } = await supabaseAdmin.rpc('admin_reorder_tours', {
				p_user_id: userId,
				p_destination_slug: destination.slug,
				p_product_ids: fullOrder,
			});
			if (reorderError) failWithDbError(reorderError, orderError);

			const touchesLiveTours = current.some((tour) => tour.status === 'active' && productIds.includes(tour.id));
			if (touchesLiveTours) await triggerRebuild('Orden de excursiones cambiado', userId);
			return { ok: true };
		},
	}),

	save: defineAction({
		input: z.object({
			id: z.uuid(),
			content: tourContentSchema,
			operations: tourOperationsSchema.nullable().default(null),
			images: tourImagesSchema,
		}),
		handler: async ({ id, content, operations, images }, context) => {
			const { userId, role } = requireStaff(context, tourEditors);
			if (operations && role !== 'admin') {
				throw new ActionError({ code: 'FORBIDDEN', message: 'Solo un admin puede cambiar precios, horario y recogida.' });
			}
			const row = await requireTourRow(id);
			const current = tourRowToEditable(row);
			const destination = findDestinationBySlug(content.destinationSlug);
			if (!destination) throw new ActionError({ code: 'BAD_REQUEST', message: 'Elige un destino.' });

			const routeChanged = content.slug !== current.content.slug || content.destinationSlug !== current.content.destinationSlug;
			if (routeChanged && (row.published_at !== null || row.status === 'active')) failWithDbError({ message: 'slug_locked' });
			if (content.slug !== current.content.slug) await assertSlugFreeOfGuides(content.slug);
			assertOwnImages(id, images);
			await assertImagesStored(id, images);
			if (row.status === 'active') assertStillComplete({ content, operations: operations ?? current.operations, images });

			const { data, error } = await supabaseAdmin.rpc('admin_save_tour', {
				p_product_id: id,
				p_user_id: userId,
				p_content: toContentPayload(content) as Json,
				...(operations ? { p_operations: toOperationsPayload(operations) as Json } : {}),
				p_images: toImagesPayload(images) as Json,
			});
			if (error) failWithDbError(error);

			if (routeChanged) await updateDraftKey(id, destination, content.slug);
			await removeStoredImages(
				id,
				images.map((image) => image.path),
				{ keepRecentUploads: true },
			);
			if (row.status === 'active') await triggerRebuild('Excursión editada', userId);
			return readSaveResult(data);
		},
	}),

	uploadImage: defineAction({
		accept: 'form',
		input: z.object({
			id: z.uuid(),
			image: z
				.instanceof(File)
				.refine((file) => file.size > 0, 'Elige una foto.')
				.refine((file) => file.size <= maxUploadBytes, 'La foto no puede pasar de 10 MB.')
				.refine((file) => file.type in imageExtensions, 'Usa fotos JPG, PNG o WebP.'),
		}),
		handler: async ({ id, image }, context) => {
			requireStaff(context, tourEditors);
			await requireTourRow(id);

			const buffer = Buffer.from(await image.arrayBuffer());
			const size = await imageSize(buffer, image.type);
			if (!size) throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos leer la foto. Prueba con otra.' });

			const path = `${tourImagePrefix(id)}${Date.now()}.${imageExtensions[image.type]}`;
			const { error } = await supabaseAdmin.storage.from(mediaBucket).upload(path, buffer, { contentType: image.type, upsert: false });
			if (error) {
				console.error('tour image upload failed', error);
				throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos subir la foto. Prueba de nuevo.' });
			}
			return { path, width: size.width, height: size.height, url: publicMediaUrl(path) };
		},
	}),

	publish: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const row = await requireTourRow(id);
			if (row.status === 'active') return { ok: true };
			if (row.status === 'archived') throw new ActionError({ code: 'BAD_REQUEST', message: 'Restáurala antes de ponerla a la venta.' });

			const missing = missingLabels(tourRowToEditable(row));
			if (missing) throw new ActionError({ code: 'BAD_REQUEST', message: `Para ponerla a la venta falta: ${missing}.` });
			const translation = row.translations.find((candidate) => candidate.locale === 'es');
			if (translation) await assertSlugFreeOfGuides(translation.slug);

			await setTourStatus(id, userId, 'active');
			await triggerRebuild('Excursión puesta a la venta', userId);
			return { ok: true };
		},
	}),

	archive: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const row = await requireTourRow(id);
			if (row.status === 'archived') return { futureBookings: await countFutureBookings(id) };

			const block = archiveBlockReason(row, row.status === 'active' ? await countActiveToursInDestination(row.destination_slug) : 0);
			if (block) throw new ActionError({ code: 'BAD_REQUEST', message: block });

			await setTourStatus(id, userId, 'archived');
			if (row.status === 'active') await triggerRebuild('Excursión archivada', userId);
			return { futureBookings: await countFutureBookings(id) };
		},
	}),

	restore: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const row = await requireTourRow(id);
			if (row.status !== 'archived') return { ok: true };
			await setTourStatus(id, userId, 'draft');
			return { ok: true };
		},
	}),

	remove: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			requireStaff(context, tourAdmins);
			const row = await requireTourRow(id);
			if (row.status !== 'draft' || row.published_at !== null) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Solo se borran los borradores que nunca salieron a la venta.' });
			}
			if (await hasTourHistory(id)) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Tiene reservas, opiniones o cupones, así que no se puede borrar. Archívala.' });
			}

			const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
			if (error) failWithDbError(error, 'No se pudo borrar la excursión.');
			await removeStoredImages(id);
			return { ok: true };
		},
	}),

	setMostBooked: defineAction({
		input: z.object({
			id: z.uuid(),
			position: z.number().int().min(1).max(4).nullable(),
		}),
		handler: async ({ id, position }, context) => {
			const { userId } = requireStaff(context, tourAdmins);
			const row = await requireTourRow(id);
			if (row.most_booked_position === position) return { ok: true };

			const { error } = await supabaseAdmin.rpc('admin_set_most_booked', {
				p_user_id: userId,
				p_product_id: id,
				p_position: position as number,
			});
			if (error) failWithDbError(error, 'No se pudo cambiar el puesto.');

			await triggerRebuild('Más reservadas cambiadas', userId);
			return { ok: true };
		},
	}),
};
