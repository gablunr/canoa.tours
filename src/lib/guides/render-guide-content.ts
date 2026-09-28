import type { GuideBlock, GuideContent, GuideTour } from '../../data/guides/guide-content';
import { fillContentTokens } from '../../data/guides/content-tokens';
import { tourDetails } from '../../data/tours/tours';
import type { QuestionAndAnswer } from '../seo/structured-data';
import { inlineMarkdown } from './inline-markdown';

export type StoredGuideBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'table'; head: string[]; rows: string[][] };

export interface StoredGuideSection {
	title: string;
	blocks: StoredGuideBlock[];
}

export interface GuideContentSource {
	answer: string;
	sections: unknown;
	faqs: unknown;
	tourProductKey: string | null;
	tourNote: string | null;
}

export const storedArray = <Item>(value: unknown): Item[] => (Array.isArray(value) ? (value as Item[]) : []);

const plainText = (text: string) =>
	fillContentTokens(text)
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');

function renderBlock(block: StoredGuideBlock): GuideBlock {
	if (block.type === 'paragraph') return { type: 'paragraph', html: inlineMarkdown(block.text) };
	if (block.type === 'list') return { type: 'list', items: block.items.map(inlineMarkdown) };
	return { type: 'table', head: block.head.map(fillContentTokens), rows: block.rows.map((row) => row.map(inlineMarkdown)) };
}

function guideTour(productKey: string | null, note: string | null): GuideTour | undefined {
	if (!productKey || !note) return undefined;
	const details = tourDetails.find((candidate) => candidate.productKey === productKey);
	if (!details) return undefined;
	return { destinationId: details.destination.id, tourSlug: details.tour.slug, note: plainText(note) };
}

export function renderGuideContent(source: GuideContentSource): GuideContent {
	return {
		answer: plainText(source.answer),
		sections: storedArray<StoredGuideSection>(source.sections).map((section) => ({
			title: fillContentTokens(section.title),
			blocks: section.blocks.map(renderBlock),
		})),
		faqs: storedArray<QuestionAndAnswer>(source.faqs).map((faq) => ({ question: plainText(faq.question), answer: plainText(faq.answer) })),
		tour: guideTour(source.tourProductKey, source.tourNote),
	};
}
