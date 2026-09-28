import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { triggerRebuild } from '../lib/deploy-hook';
import { requireStaff } from '../lib/manage/guards';
import { supabaseAdmin } from '../lib/supabase/admin';
import type { StaffRole } from '../lib/supabase/types';
import { slugify } from '../scripts/manage/form-helpers';

const zoneEditors: StaffRole[] = ['admin'];
const hotelEditors: StaffRole[] = ['admin', 'operations'];
const maxHotelsPerPaste = 200;
const maxHotelNameLength = 120;

type DbError = { code?: string; message?: string } | null;

const normalizeHotelName = (name: string) => name.replace(/\s+/g, ' ').trim();
const hotelNameKey = (name: string) => normalizeHotelName(name).toLocaleLowerCase('es');
const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

const zoneName = z.string().trim().min(2, 'Escribe el nombre de la zona.').max(80, 'Usa como mucho 80 caracteres.');
const zoneDescription = z.string().trim().max(400, 'Usa como mucho 400 caracteres.').default('');
const fee = z.number().min(0, 'La tarifa no puede ser negativa.').max(1000, 'La tarifa no puede pasar de US$1.000.').transform(roundMoney);
const hotelName = z
	.string()
	.transform(normalizeHotelName)
	.pipe(z.string().min(2, 'Escribe el nombre del hotel.').max(maxHotelNameLength, `Usa como mucho ${maxHotelNameLength} caracteres.`));

function failWithDbError(error: DbError, fallback: string, conflictMessage?: string): never {
	if (error?.code === '23505' && conflictMessage) throw new ActionError({ code: 'CONFLICT', message: conflictMessage });
	if (error?.message?.includes('zone_not_found')) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa zona.' });
	console.error('pickup action failed', error);
	throw new ActionError({ code: 'BAD_REQUEST', message: fallback });
}

async function assertZoneExists(zoneId: string) {
	const { data, error } = await supabaseAdmin.from('pickup_zones').select('id').eq('id', zoneId).maybeSingle();
	if (error) failWithDbError(error, 'No pudimos cargar la zona.');
	if (!data) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa zona.' });
}

async function freeZoneSlug(name: string) {
	const base = slugify(name) || 'zona';
	const { data, error } = await supabaseAdmin.from('pickup_zones').select('slug').like('slug', `${base}%`);
	if (error) failWithDbError(error, 'No se pudo crear la zona.');
	const taken = new Set(data.map((zone) => zone.slug));
	let candidate = base;
	for (let suffix = 2; taken.has(candidate); suffix += 1) candidate = `${base}-${suffix}`;
	return candidate;
}

function countOrFail({ count, error }: { count: number | null; error: DbError }) {
	if (error) failWithDbError(error, 'No pudimos comprobar si se puede borrar.');
	return count ?? 0;
}

const countZoneHotels = async (zoneId: string) =>
	countOrFail(await supabaseAdmin.from('hotels').select('id', { count: 'exact', head: true }).eq('zone_id', zoneId));

const countZoneBookings = async (zoneId: string) =>
	countOrFail(await supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('pickup_zone_id', zoneId));

const countHotelBookings = async (hotelId: string) =>
	countOrFail(await supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId));

async function loadHotelsWithZones() {
	const { data, error } = await supabaseAdmin.from('hotels').select('id, name, zone_id, pickup_zones ( name )');
	if (error) failWithDbError(error, 'No pudimos cargar los hoteles.');
	return data.map((hotel) => ({ id: hotel.id, name: hotel.name, zoneId: hotel.zone_id, zoneName: hotel.pickup_zones?.name ?? '' }));
}

export const pickup = {
	createZone: defineAction({
		input: z.object({ name: zoneName, description: zoneDescription, defaultFee: fee }),
		handler: async ({ name, description, defaultFee }, context) => {
			const { userId } = requireStaff(context, zoneEditors);
			const slug = await freeZoneSlug(name);

			const { data, error } = await supabaseAdmin.rpc('admin_create_pickup_zone', {
				p_slug: slug,
				p_name: name,
				p_description: description,
				p_default_fee: defaultFee,
			});
			if (error) failWithDbError(error, 'No se pudo crear la zona.', 'Ya hay una zona con ese nombre.');

			await triggerRebuild('Zona de recogida creada', userId);
			return { zoneId: data, slug };
		},
	}),

	saveZone: defineAction({
		input: z.object({ id: z.uuid(), name: zoneName, description: zoneDescription }),
		handler: async ({ id, name, description }, context) => {
			const { userId } = requireStaff(context, zoneEditors);

			const { data, error } = await supabaseAdmin.from('pickup_zones').update({ name, description: description || null }).eq('id', id).select('id');
			if (error) failWithDbError(error, 'No se pudo guardar la zona.');
			if (data.length === 0) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa zona.' });

			await triggerRebuild('Zona de recogida editada', userId);
			return { zoneId: id };
		},
	}),

	removeZone: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, zoneEditors);
			const [hotelCount, bookingCount] = await Promise.all([countZoneHotels(id), countZoneBookings(id)]);
			if (hotelCount > 0) throw new ActionError({ code: 'CONFLICT', message: 'Mueve o borra antes sus hoteles.' });
			if (bookingCount > 0) throw new ActionError({ code: 'CONFLICT', message: 'Esta zona tiene reservas y no se puede borrar.' });

			const { error } = await supabaseAdmin.from('pickup_zones').delete().eq('id', id);
			if (error) failWithDbError(error, 'No se pudo borrar la zona.');

			await triggerRebuild('Zona de recogida borrada', userId);
			return { zoneId: id };
		},
	}),

	reorderZones: defineAction({
		input: z.object({ ids: z.array(z.uuid()).min(1).max(100) }),
		handler: async ({ ids }, context) => {
			const { userId } = requireStaff(context, zoneEditors);

			const { data, error } = await supabaseAdmin.from('pickup_zones').select('id');
			if (error) failWithDbError(error, 'No se pudo guardar el orden.');
			const currentIds = new Set(data.map((zone) => zone.id));
			const sameZones = ids.length === currentIds.size && new Set(ids).size === ids.length && ids.every((id) => currentIds.has(id));
			if (!sameZones) throw new ActionError({ code: 'CONFLICT', message: 'Las zonas cambiaron mientras ordenabas. Recarga la página.' });

			const { error: reorderError } = await supabaseAdmin.rpc('admin_reorder_pickup_zones', { p_zone_ids: ids });
			if (reorderError) failWithDbError(reorderError, 'No se pudo guardar el orden.');

			await triggerRebuild('Zonas de recogida reordenadas', userId);
			return { count: ids.length };
		},
	}),

	saveZoneFees: defineAction({
		input: z.object({
			zoneId: z.uuid(),
			fees: z.array(z.object({ productId: z.uuid(), fee })).max(500),
		}),
		handler: async ({ zoneId, fees }, context) => {
			const { userId } = requireStaff(context, zoneEditors);

			const { error } = await supabaseAdmin.rpc('admin_save_zone_fees', {
				p_zone_id: zoneId,
				p_fees: fees.map((entry) => ({ product_id: entry.productId, fee: entry.fee })),
			});
			if (error) failWithDbError(error, 'No se pudieron guardar las tarifas.');

			await triggerRebuild('Tarifas de recogida cambiadas', userId);
			return { zoneId, served: fees.length };
		},
	}),

	addHotels: defineAction({
		input: z.object({ zoneId: z.uuid(), names: z.array(z.string().max(500)).min(1).max(maxHotelsPerPaste) }),
		handler: async ({ zoneId, names }, context) => {
			const { userId } = requireStaff(context, hotelEditors);
			await assertZoneExists(zoneId);

			const pasted = [...new Map(names.map(normalizeHotelName).filter(Boolean).map((name) => [hotelNameKey(name), name])).values()];
			if (pasted.length === 0) throw new ActionError({ code: 'BAD_REQUEST', message: 'Pega al menos un hotel.' });
			const tooLong = pasted.find((name) => name.length > maxHotelNameLength);
			if (tooLong) throw new ActionError({ code: 'BAD_REQUEST', message: `«${tooLong.slice(0, 40)}…» es demasiado largo.` });

			const existingByKey = new Map((await loadHotelsWithZones()).map((hotel) => [hotelNameKey(hotel.name), hotel]));
			const existing = pasted.flatMap((name) => {
				const match = existingByKey.get(hotelNameKey(name));
				return match ? [{ name: match.name, zoneName: match.zoneName, sameZone: match.zoneId === zoneId }] : [];
			});
			const newNames = pasted.filter((name) => !existingByKey.has(hotelNameKey(name)));

			if (newNames.length > 0) {
				const { error } = await supabaseAdmin.from('hotels').insert(newNames.map((name) => ({ name, zone_id: zoneId })));
				if (error) failWithDbError(error, 'No se pudieron añadir los hoteles.', 'Alguno de esos hoteles ya existe. Recarga la página.');
				await triggerRebuild('Hoteles añadidos', userId);
			}

			return { added: newNames.length, existing };
		},
	}),

	saveHotel: defineAction({
		input: z.object({ id: z.uuid(), name: hotelName, zoneId: z.uuid(), active: z.boolean() }),
		handler: async ({ id, name, zoneId, active }, context) => {
			const { userId } = requireStaff(context, hotelEditors);
			await assertZoneExists(zoneId);

			const duplicate = (await loadHotelsWithZones()).find((hotel) => hotel.id !== id && hotelNameKey(hotel.name) === hotelNameKey(name));
			if (duplicate) throw new ActionError({ code: 'CONFLICT', message: `Ya existe en ${duplicate.zoneName || 'otra zona'}.` });

			const { data, error } = await supabaseAdmin.from('hotels').update({ name, zone_id: zoneId, active }).eq('id', id).select('id');
			if (error) failWithDbError(error, 'No se pudo guardar el hotel.', 'Ya hay un hotel con ese nombre.');
			if (data.length === 0) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos ese hotel.' });

			await triggerRebuild('Hotel editado', userId);
			return { hotelId: id };
		},
	}),

	removeHotel: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, hotelEditors);
			if ((await countHotelBookings(id)) > 0) {
				throw new ActionError({ code: 'CONFLICT', message: 'Este hotel tiene reservas. Ocúltalo en vez de borrarlo.' });
			}

			const { error } = await supabaseAdmin.from('hotels').delete().eq('id', id);
			if (error) failWithDbError(error, 'No se pudo borrar el hotel.');

			await triggerRebuild('Hotel borrado', userId);
			return { hotelId: id };
		},
	}),
};
