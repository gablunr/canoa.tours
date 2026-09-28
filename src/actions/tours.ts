import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { findDestinationById, mergeTourOrder, sortToursForDestination } from '../components/manage/tours/tour-list-data';
import { destinations } from '../data/tours/destinations';
import { triggerRebuild } from '../lib/deploy-hook';
import { requireStaff } from '../lib/manage/guards';
import { supabaseAdmin } from '../lib/supabase/admin';
import type { StaffRole } from '../lib/supabase/types';

export const tourEditors: StaffRole[] = ['admin', 'editor'];
export const tourAdmins: StaffRole[] = ['admin'];

const destinationIds: string[] = destinations.map((destination) => destination.id);

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
};
