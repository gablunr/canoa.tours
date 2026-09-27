import { Resend } from 'resend';
import { EMAIL_FROM, RESEND_API_KEY } from 'astro:env/server';

let resendClient: Resend | null = null;

const resend = () => (resendClient ??= new Resend(RESEND_API_KEY));

export async function sendEmail(message: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<void> {
	const { error } = await resend().emails.send({
		from: EMAIL_FROM,
		to: message.to,
		subject: message.subject,
		html: message.html,
		text: message.text,
		replyTo: message.replyTo,
	});

	if (error) throw new Error(`email_not_sent: ${error.name}: ${error.message}`);
}
