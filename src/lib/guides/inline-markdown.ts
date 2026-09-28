import { fillContentTokens } from '../../data/guides/content-tokens';

const htmlEscapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => htmlEscapes[character]);

const isSafeHref = (href: string) => /^\/(?![/\\])/.test(href) || href.startsWith('#') || href.startsWith('https://') || href.startsWith('mailto:');

export function inlineMarkdown(text: string) {
	return escapeHtml(fillContentTokens(text))
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => (isSafeHref(href) ? `<a href="${href}">${label}</a>` : label));
}
