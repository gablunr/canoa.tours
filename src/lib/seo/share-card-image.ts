import { readFile } from 'node:fs/promises';
import type { ImageMetadata } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import interMedium from '../../assets/fonts/Inter-Medium.ttf?inline';
import interDisplaySemiBold from '../../assets/fonts/InterDisplay-SemiBold.ttf?inline';
import logoOnDark from '../../assets/images/brand/logo-dark.svg?raw';
import { isRemoteImage, type SiteImage } from '../images';
import { withRetries } from '../supabase/retry';
import { shareCardHeight, shareCardWidth, type ShareCard } from './share-cards';

interface CardElement {
	type: 'div';
	props: {
		style: Record<string, string | number>;
		children?: string | CardElement | CardElement[];
	};
}

const inset = 64;

const logoHeight = 60;

const ink = '2, 36, 45';

const fontFromDataUrl = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

const fonts = [
	{ name: 'Inter Display', data: fontFromDataUrl(interDisplaySemiBold), weight: 600 as const, style: 'normal' as const },
	{ name: 'Inter', data: fontFromDataUrl(interMedium), weight: 500 as const, style: 'normal' as const },
];

const box = (style: CardElement['props']['style'], children?: CardElement['props']['children']): CardElement => ({
	type: 'div',
	props: { style: { display: 'flex', ...style }, children },
});

const titleSize = (title: string) => (title.length > 58 ? 56 : title.length > 34 ? 64 : 76);

const factChip = (fact: string, index: number) =>
	box(
		{
			padding: '10px 22px',
			borderRadius: 999,
			fontFamily: 'Inter',
			fontSize: 24,
			...(index === 0
				? { backgroundColor: '#fbac29', color: `rgb(${ink})` }
				: { backgroundColor: 'rgba(255, 255, 255, 0.14)', border: '1.5px solid rgba(255, 255, 255, 0.4)', color: '#ffffff' }),
		},
		fact,
	);

const cardLayout = (card: ShareCard) =>
	box({ position: 'relative', width: '100%', height: '100%' }, [
		box({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundImage: `linear-gradient(90deg, rgba(${ink}, 0.88) 0%, rgba(${ink}, 0.6) 48%, rgba(${ink}, 0.12) 100%)`,
		}),
		box({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundImage: `linear-gradient(180deg, rgba(${ink}, 0.5) 0%, rgba(${ink}, 0) 32%, rgba(${ink}, 0) 55%, rgba(${ink}, 0.7) 100%)`,
		}),
		box(
			{
				position: 'absolute',
				left: inset,
				right: inset,
				bottom: inset,
				flexDirection: 'column',
				alignItems: 'flex-start',
				maxWidth: 900,
			},
			[
				box({ fontFamily: 'Inter', fontSize: 28, color: '#fec87f', marginBottom: 14 }, card.eyebrow),
				box(
					{
						fontFamily: 'Inter Display',
						fontSize: titleSize(card.title),
						lineHeight: 1.06,
						letterSpacing: -1.5,
						color: '#ffffff',
						lineClamp: 3,
					},
					card.title,
				),
				...(card.facts.length > 0 ? [box({ gap: 12, marginTop: 30 }, card.facts.map(factChip))] : []),
			],
		),
	]);

async function downloadPhoto(url: string) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`No se pudo descargar ${url} (${response.status})`);
	return Buffer.from(await response.arrayBuffer());
}

function localPhotoPath(photo: ImageMetadata) {
	const { fsPath } = photo as ImageMetadata & { fsPath?: string };
	if (!fsPath) throw new Error(`La foto ${photo.src} no tiene ruta en disco`);
	return fsPath;
}

const photoBytes = (photo: SiteImage) =>
	isRemoteImage(photo) ? withRetries(() => downloadPhoto(photo.src)) : readFile(localPhotoPath(photo));

let logoPng: Promise<Buffer> | undefined;

const logo = () => (logoPng ??= sharp(Buffer.from(logoOnDark)).resize({ height: logoHeight }).png().toBuffer());

export async function renderShareCard(card: ShareCard) {
	const [photo, overlay, logoImage] = await Promise.all([
		photoBytes(card.photo),
		satori(cardLayout(card), { width: shareCardWidth, height: shareCardHeight, fonts }),
		logo(),
	]);

	return sharp(photo)
		.resize(shareCardWidth, shareCardHeight, { fit: 'cover' })
		.modulate({ brightness: 0.92, saturation: 1.1 })
		.composite([
			{ input: Buffer.from(overlay), top: 0, left: 0 },
			{ input: logoImage, top: inset, left: inset },
		])
		.jpeg({ quality: 84, mozjpeg: true })
		.toBuffer();
}
