import { inferRemoteSize } from 'astro:assets';
import { SUPABASE_URL } from 'astro:env/client';
import type { RemoteImage } from '../images';

export const publicMediaUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;

export async function remoteImage(src: string): Promise<RemoteImage> {
	const { width, height } = await inferRemoteSize(src);
	return { remote: true, src, width, height };
}

export const remoteMediaImage = (path: string) => remoteImage(publicMediaUrl(path));
