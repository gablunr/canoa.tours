import { supabaseAdmin } from '../supabase/admin';
import { sendEmail } from '../email/send';
import { magicLinkEmail } from '../email/templates/magic-link';
import { routes } from '../../data/site/routes';

const defaultNextPath = '/account';
const maxLinksPerEmailPerHour = 5;
const maxLinksPerIpPerHour = 20;
const allowedNextSections = ['/account', '/manage', routes.reviews];

function isInAllowedSection(path: string) {
	return allowedNextSections.some(
		(section) => path === section || path.startsWith(`${section}/`) || path.startsWith(`${section}?`) || path.startsWith(`${section}#`),
	);
}

export function safeNextPath(next: string | null): string {
	if (!next) return defaultNextPath;
	const path = next.trim();
	if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return defaultNextPath;
	return isInAllowedSection(path) ? path : defaultNextPath;
}

function isAlreadyRegisteredError(error: { code?: string; status?: number; message: string }) {
	return error.code === 'email_exists' || error.code === 'user_already_exists' || /already (been )?registered/i.test(error.message);
}

export async function allowMagicLinkRequest(email: string, ip: string): Promise<boolean> {
	const { data, error } = await supabaseAdmin.rpc('register_auth_link_request', {
		p_email: email.trim().toLowerCase(),
		p_ip: ip,
		p_max_per_email: maxLinksPerEmailPerHour,
		p_max_per_ip: maxLinksPerIpPerHour,
	});
	if (error) {
		console.error('magic_link_rate_limit_failed', error);
		return true;
	}
	return data;
}

export async function sendMagicLink(email: string, next: string, origin: string): Promise<void> {
	const normalizedEmail = email.trim().toLowerCase();
	const safeNext = safeNextPath(next);

	const { error: createError } = await supabaseAdmin.auth.admin.createUser({ email: normalizedEmail, email_confirm: true });
	if (createError && !isAlreadyRegisteredError(createError)) throw createError;

	const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: normalizedEmail });
	if (error) throw error;

	const link = `${origin}/account/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(safeNext)}`;
	await sendEmail({ to: normalizedEmail, ...magicLinkEmail(link) });
}
