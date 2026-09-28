import type { APIContext, APIRoute } from 'astro';
import { z } from 'astro/zod';
import { allowMagicLinkRequest, sendMagicLink } from '../../../lib/auth/magic-link';
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

function clientIp(context: APIContext): string {
	try {
		return context.clientAddress;
	} catch {
		return 'unknown';
	}
}

export const POST: APIRoute = async (context) => {
	const { request, url } = context;
	const parsed = magicLinkRequest.safeParse(await readBody(request));
	if (!parsed.success) {
		return Response.json({ ok: false, error: 'Escribe un email válido.' }, { status: 400 });
	}

	if (!(await allowMagicLinkRequest(parsed.data.email, clientIp(context)))) {
		return Response.json(
			{ ok: false, error: 'Has pedido varios enlaces seguidos. Espera un rato y vuelve a intentarlo.' },
			{ status: 429 },
		);
	}

	try {
		await sendMagicLink(parsed.data.email, parsed.data.next ?? '/account', siteOrigin(url));
	} catch (error) {
		console.error('magic link failed', error);
	}

	return Response.json({ ok: true });
};
