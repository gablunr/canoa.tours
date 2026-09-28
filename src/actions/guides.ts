import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { unknownContentTokens } from '../data/guides/content-tokens';
import { destinationDefinitions } from '../data/tours/destination-definitions';
import { triggerRebuild } from '../lib/deploy-hook';
import { requireStaff } from '../lib/manage/guards';
import { supabaseAdmin } from '../lib/supabase/admin';
import type { Json } from '../lib/supabase/database.types';
import type { StaffRole } from '../lib/supabase/types';

const guideEditors: StaffRole[] = ['admin', 'editor'];
const siloIds: string[] = ['general', ...destinationDefinitions.map((destination) => destination.id)];
const wordsPerMinute = 200;
const maxImageBytes = 5 * 1024 * 1024;
const imageExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

const slug = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'La dirección necesita al menos 3 caracteres.')
	.max(80)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones, sin espacios ni tildes.');

const silo = z.string().refine((value) => siloIds.includes(value), 'Elige un destino o «general».');

const block = z.union([
	z.object({ type: z.literal('paragraph'), text: text(1, 4000) }),
	z.object({ type: z.literal('list'), items: z.array(text(1, 500)).min(1).max(30) }),
	z
		.object({ type: z.literal('table'), head: z.array(z.string().trim().max(80)).min(2).max(6), rows: z.array(z.array(z.string().trim().max(300))).min(1).max(40) })
		.refine((table) => table.rows.every((row) => row.length === table.head.length), 'Cada fila de la tabla necesita una celda por columna.'),
]);

const section = z.object({ title: text(2, 120), blocks: z.array(block).min(1).max(40) });
const faq = z.object({ question: text(5, 200), answer: text(5, 2000) });

const guideFields = z.object({
	title: text(5, 120),
	slug,
	silo,
	description: z.string().trim().max(300).default(''),
	imageAlt: z.string().trim().max(200).default(''),
	answer: z.string().trim().max(1200).default(''),
	sections: z.array(section).max(30).default([]),
	faqs: z.array(faq).max(20).default([]),
	featured: z.boolean().default(false),
	tourProductKey: z.string().trim().max(80).nullable().default(null),
	tourNote: z.string().trim().max(300).default(''),
});

type GuideFields = z.infer<typeof guideFields>;

type GuideRow = {
	id: string;
	status: 'draft' | 'published';
	title: string;
	description: string;
	image_path: string | null;
	image_alt: string | null;
	answer: string | null;
	sections: Json;
	published_at: string | null;
};

function failWithDbError(error: { code?: string } | null, fallback = 'No se pudo guardar la guía.'): never {
	if (error?.code === '23505') throw new ActionError({ code: 'CONFLICT', message: 'Ya hay una guía con esa dirección. Elige otra.' });
	console.error('guide action failed', error);
	throw new ActionError({ code: 'BAD_REQUEST', message: fallback });
}

async function assertRouteIsFree(guideSilo: string, guideSlug: string) {
	const destination = destinationDefinitions.find((candidate) => candidate.id === guideSilo);
	if (!destination) return;
	const { data, error } = await supabaseAdmin
		.from('product_translations')
		.select('product_id, products!inner(destination_slug, status)')
		.eq('locale', 'es')
		.eq('slug', guideSlug)
		.eq('products.status', 'active')
		.eq('products.destination_slug', destination.slug)
		.limit(1);
	if (error) failWithDbError(error);
	if (data.length > 0) throw new ActionError({ code: 'CONFLICT', message: 'Esa dirección ya la usa una excursión de este destino. Elige otra.' });
}

function readingMinutes(fields: GuideFields) {
	const words = guideTexts(fields).join(' ').split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function guideTexts(fields: GuideFields) {
	return [
		fields.title,
		fields.description,
		fields.answer,
		fields.tourNote,
		...fields.sections.flatMap((guideSection) => [
			guideSection.title,
			...guideSection.blocks.flatMap((guideBlock) => {
				if (guideBlock.type === 'paragraph') return [guideBlock.text];
				if (guideBlock.type === 'list') return guideBlock.items;
				return [...guideBlock.head, ...guideBlock.rows.flat()];
			}),
		]),
		...fields.faqs.flatMap((entry) => [entry.question, entry.answer]),
	];
}

function assertKnownTokens(fields: GuideFields) {
	const unknown = [...new Set(guideTexts(fields).flatMap(unknownContentTokens))];
	if (unknown.length > 0) {
		throw new ActionError({ code: 'BAD_REQUEST', message: `No existen estos marcadores: ${unknown.map((name) => `{{${name}}}`).join(', ')}.` });
	}
}

async function productIdByKey(key: string | null): Promise<string | null> {
	if (!key) return null;
	const { data, error } = await supabaseAdmin.from('products').select('id').eq('key', key).maybeSingle();
	if (error) failWithDbError(error);
	if (!data) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa excursión.' });
	return data.id;
}

async function loadGuide(id: string): Promise<GuideRow> {
	const { data, error } = await supabaseAdmin
		.from('guides')
		.select('id, status, title, description, image_path, image_alt, answer, sections, published_at')
		.eq('id', id)
		.maybeSingle();
	if (error) failWithDbError(error, 'No pudimos cargar la guía.');
	if (!data) throw new ActionError({ code: 'NOT_FOUND', message: 'No encontramos esa guía.' });
	return data as GuideRow;
}

function missingForPublishing(guide: GuideRow) {
	const sectionCount = Array.isArray(guide.sections) ? guide.sections.length : 0;
	return [
		guide.description.trim().length < 20 && 'una descripción de al menos 20 caracteres',
		!guide.image_path && 'una imagen',
		!guide.image_alt?.trim() && 'el texto alternativo de la imagen',
		!guide.answer?.trim() && 'el párrafo de lo esencial al principio del texto',
		sectionCount === 0 && 'al menos una sección (##)',
	].filter((item): item is string => Boolean(item));
}

function assertPublishable(guide: GuideRow) {
	const missing = missingForPublishing(guide);
	if (missing.length > 0) throw new ActionError({ code: 'BAD_REQUEST', message: `Para publicarla falta ${missing.join(', ')}.` });
}

async function clearOtherFeatured(id: string) {
	const { error } = await supabaseAdmin.from('guides').update({ featured: false }).eq('featured', true).neq('id', id);
	if (error) failWithDbError(error);
}

async function removeImage(path: string | null) {
	if (!path) return;
	const { error } = await supabaseAdmin.storage.from('media').remove([path]);
	if (error) console.error('guide image removal failed', error);
}

export const guides = {
	create: defineAction({
		input: z.object({ title: text(5, 120), slug, silo }),
		handler: async (input, context) => {
			const { userId } = requireStaff(context, guideEditors);
			await assertRouteIsFree(input.silo, input.slug);

			const { data, error } = await supabaseAdmin
				.from('guides')
				.insert({ title: input.title, slug: input.slug, silo: input.silo, description: '', author_user_id: userId })
				.select('id')
				.single();
			if (error) failWithDbError(error);
			return { guideId: data.id };
		},
	}),

	save: defineAction({
		input: guideFields.extend({ id: z.uuid() }),
		handler: async ({ id, ...fields }, context) => {
			const { userId } = requireStaff(context, guideEditors);
			await assertRouteIsFree(fields.silo, fields.slug);
			assertKnownTokens(fields);
			const current = await loadGuide(id);
			const tourProductId = await productIdByKey(fields.tourProductKey);

			const changes = {
				title: fields.title,
				slug: fields.slug,
				silo: fields.silo,
				description: fields.description,
				image_alt: fields.imageAlt || null,
				answer: fields.answer || null,
				sections: fields.sections as Json,
				faqs: fields.faqs as Json,
				featured: fields.featured,
				tour_product_id: tourProductId,
				tour_note: tourProductId ? fields.tourNote || null : null,
				reading_minutes: readingMinutes(fields),
			};

			if (current.status === 'published') {
				assertPublishable({ ...current, title: changes.title, description: changes.description, image_alt: changes.image_alt, answer: changes.answer, sections: changes.sections });
			}

			const { error } = await supabaseAdmin.from('guides').update(changes).eq('id', id);
			if (error) failWithDbError(error);
			if (fields.featured) await clearOtherFeatured(id);

			if (current.status === 'published') await triggerRebuild('Guía editada', userId);
			return { guideId: id, readingMinutes: changes.reading_minutes };
		},
	}),

	setImage: defineAction({
		accept: 'form',
		input: z.object({
			id: z.uuid(),
			image: z
				.instanceof(File)
				.refine((file) => file.size > 0, 'Elige una imagen.')
				.refine((file) => file.size <= maxImageBytes, 'La imagen no puede pasar de 5 MB.')
				.refine((file) => file.type in imageExtensions, 'Usa una imagen JPG, PNG o WebP.'),
			imageAlt: text(5, 200),
		}),
		handler: async ({ id, image, imageAlt }, context) => {
			const { userId } = requireStaff(context, guideEditors);
			const current = await loadGuide(id);

			const storagePath = `guides/${id}/${Date.now()}.${imageExtensions[image.type]}`;
			const { error: uploadError } = await supabaseAdmin.storage.from('media').upload(storagePath, image, { contentType: image.type, upsert: false });
			if (uploadError) {
				console.error('guide image upload failed', uploadError);
				throw new ActionError({ code: 'BAD_REQUEST', message: 'No pudimos subir la imagen. Prueba de nuevo.' });
			}

			const { error } = await supabaseAdmin.from('guides').update({ image_path: storagePath, image_alt: imageAlt }).eq('id', id);
			if (error) {
				await removeImage(storagePath);
				failWithDbError(error);
			}

			await removeImage(current.image_path);
			if (current.status === 'published') await triggerRebuild('Imagen de guía cambiada', userId);
			return { guideId: id, imagePath: storagePath };
		},
	}),

	publish: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, guideEditors);
			const current = await loadGuide(id);
			assertPublishable(current);

			const { error } = await supabaseAdmin
				.from('guides')
				.update({ status: 'published', published_at: current.published_at ?? new Date().toISOString() })
				.eq('id', id);
			if (error) failWithDbError(error);

			await triggerRebuild('Guía publicada', userId);
			return { guideId: id };
		},
	}),

	unpublish: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, guideEditors);
			const current = await loadGuide(id);
			if (current.status !== 'published') return { guideId: id };

			const { error } = await supabaseAdmin.from('guides').update({ status: 'draft' }).eq('id', id);
			if (error) failWithDbError(error);

			await triggerRebuild('Guía retirada', userId);
			return { guideId: id };
		},
	}),

	remove: defineAction({
		input: z.object({ id: z.uuid() }),
		handler: async ({ id }, context) => {
			const { userId } = requireStaff(context, guideEditors);
			const current = await loadGuide(id);

			const { error } = await supabaseAdmin.from('guides').delete().eq('id', id);
			if (error) failWithDbError(error, 'No se pudo borrar la guía.');

			await removeImage(current.image_path);
			if (current.status === 'published') await triggerRebuild('Guía borrada', userId);
			return { guideId: id };
		},
	}),
};
