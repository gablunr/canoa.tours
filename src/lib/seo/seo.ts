import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import shareImage from '../../assets/images/brand/share.jpg';
import { company } from '../../data/site/company';

export interface SeoImage {
	src: ImageMetadata | string;
	alt: string;
}

export interface SocialImage {
	url: string;
	width: number;
	height: number;
	alt: string;
}

export interface Breadcrumb {
	name: string;
	path: string;
}

export const siteLanguage = 'es-MX';

export const openGraphLocale = 'es_MX';

const socialImageRatio = 1200 / 630;

const socialImageMaxWidth = 1200;

export const defaultSocialImage: SeoImage = {
	src: shareImage,
	alt: `Logotipo de ${company.brandName}`,
};

export const absoluteUrl = (path: string) => new URL(path, import.meta.env.SITE).href;

const publicPath = (pathname: string) =>
	pathname
		.replace(/\.html$/, '')
		.replace(/\/index$/, '')
		.replace(/\/+$/, '') || '/';

export const canonicalUrl = (pathname: string) => absoluteUrl(publicPath(pathname));

export const siteHost = new URL(import.meta.env.SITE).host;

export const pageTitle = (title: string) => `${title} | ${company.brandName}`;

export async function socialImage({ src, alt }: SeoImage): Promise<SocialImage> {
	const width =
		typeof src === 'string'
			? socialImageMaxWidth
			: Math.min(socialImageMaxWidth, src.width, Math.floor(src.height * socialImageRatio));
	const height = Math.round(width / socialImageRatio);
	const image = await getImage({ src, width, height, fit: 'cover', format: 'jpg', quality: 80 });

	return { url: absoluteUrl(image.src), width, height, alt };
}
