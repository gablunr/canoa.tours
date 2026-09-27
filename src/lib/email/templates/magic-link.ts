import { renderEmail, type EmailContent } from './layout';

export function magicLinkEmail(link: string): EmailContent {
	return renderEmail({
		subject: 'Tu enlace para entrar en Canoa Tours',
		preheader: 'Pulsa el enlace para entrar en tu cuenta.',
		heading: 'Entra en tu cuenta',
		paragraphs: ['Pulsa el botón para entrar en tu cuenta de Canoa Tours y ver tus reservas.'],
		cta: { label: 'Entrar en mi cuenta', url: link },
		closing: ['Si no has pedido este enlace, puedes ignorar este correo.'],
	});
}
