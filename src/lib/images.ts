import type { ImageMetadata } from 'astro';

export interface RemoteImage {
	remote: true;
	src: string;
	width: number;
	height: number;
}

export type SiteImage = ImageMetadata | RemoteImage;

export const isRemoteImage = (image: SiteImage): image is RemoteImage => 'remote' in image;

export const imageSource = (image: SiteImage) => (isRemoteImage(image) ? { src: image.src, width: image.width, height: image.height } : { src: image });

export const seoImageSource = (image: SiteImage) => (isRemoteImage(image) ? image.src : image);
