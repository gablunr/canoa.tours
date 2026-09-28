import type { Faq } from '../booking/faq';
import type { GuideSection } from '../guides/guide-content';
import type { TourFact } from '../tours/tours';

export interface PillarCta {
	title: string;
	text: string;
	whatsappMessage: string;
}

export interface PillarContent {
	seoTitle: string;
	description: string;
	heading?: string;
	imageAlt: string;
	comparisonTitle: string;
	comparisonIntro?: string;
	overviewTitle: string;
	sections: GuideSection[];
	facts?: TourFact[];
	faqs: Faq[];
	faqTitle?: string;
	faqIntro?: string;
	cta: PillarCta;
	updatedAt: Date;
}

export interface PillarKeyFact extends TourFact {
	hiddenBelowSm?: boolean;
}

export interface PillarNavLink {
	href: string;
	label: string;
	count?: { value: number; label: string };
}
