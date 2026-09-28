interface PhotoEdgeLimits {
	shortEdge?: number;
	longEdge?: number;
}

export async function shrinkPhoto(file: File, limits: PhotoEdgeLimits): Promise<File> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}

	const shortSide = Math.min(bitmap.width, bitmap.height);
	const longSide = Math.max(bitmap.width, bitmap.height);
	const scale = Math.min(1, limits.shortEdge ? limits.shortEdge / shortSide : 1, limits.longEdge ? limits.longEdge / longSide : 1);
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const context = canvas.getContext('2d');
	if (!context) {
		bitmap.close();
		return file;
	}
	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
	const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
	return blob ? new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }) : file;
}
