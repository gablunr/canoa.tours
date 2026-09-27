import { getEntry } from 'astro:content';
import type { QuestionAndAnswer } from '../../lib/seo/structured-data';
import { fillContentTokens } from '../guides/content-tokens';

export const getHelpDocument = async (id: string) => {
	const helpDocument = await getEntry('help', id);
	if (!helpDocument) throw new Error(`No existe el documento de ayuda "${id}"`);
	return helpDocument;
};

const plainText = (markdown: string) => fillContentTokens(markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')).trim();

export function questionsFromMarkdown(body = ''): QuestionAndAnswer[] {
	return body
		.split(/^### /m)
		.slice(1)
		.map((block) => {
			const [question, ...rest] = block.split('\n');
			const answer = rest.join('\n').split(/^#/m)[0];
			return { question: question.trim(), answer: plainText(answer.replace(/\s+/g, ' ')) };
		});
}
