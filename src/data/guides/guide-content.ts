import type { QuestionAndAnswer } from '../../lib/seo/structured-data';
import { publishedGuideRows } from '../../lib/guides/published-guides';
import { renderGuideContent } from '../../lib/guides/render-guide-content';
import type { DestinationId } from '../tours/destinations';

export type GuideBlock =
	| { type: 'paragraph'; html: string }
	| { type: 'list'; items: string[] }
	| { type: 'table'; head: string[]; rows: string[][] };

export interface GuideSection {
	title: string;
	blocks: GuideBlock[];
}

export interface GuideTour {
	destinationId: DestinationId;
	tourSlug: string;
	note: string;
}

export interface GuideContent {
	answer: string;
	sections: GuideSection[];
	faqs: QuestionAndAnswer[];
	tour?: GuideTour;
}

export const guideContents: Record<string, GuideContent> = Object.fromEntries(publishedGuideRows.map((row) => [row.slug, renderGuideContent(row)]));

export const guideContent = (slug: string): GuideContent | undefined => guideContents[slug];

export const isGuidePublished = (slug: string) => slug in guideContents;
