import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { sendMagicLink } from '../../../lib/auth/magic-link';
import { siteOrigin } from '../../../lib/site-origin';

export const prerender = false;

const magicLinkRequest = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email()),
	next: z.string().optional(),
});

async function readBody(request: Request): Promise<Record<string, unknown>> {
	const contentType = request.headers.get('content-type') ?? '';
	try {
		if (contentType.includes('application/json')) return (await request.json()) as Record<string, unknown>;
		const formData = await request.formData();
		return { email: formData.get('email') ?? undefined, next: formData.get('next') ?? undefined };
	} catch {
		return {};
	}
}

export const POST: APIRoute = async ({ request, url }) => {
	const parsed = magicLinkRequest.safeParse(await readBody(request));
	if (!parsed.success) {
		return Response.json({ ok: false, error: 'Escribe un email válido.' }, { status: 400 });
	}

	try {
		await sendMagicLink(parsed.data.email, parsed.data.next ?? '/account', siteOrigin(url));
	} catch (error) {
		console.error('magic link failed', error);
	}

	return Response.json({ ok: true });
};
