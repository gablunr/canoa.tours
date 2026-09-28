const movedPages: Record<string, string> = {
	'/index.html': '/',
	'/fiesta-punta-cana/coco-bongo-punta-cana': '/fiesta-punta-cana/que-saber-antes-de-ir-a-coco-bongo',
	'/samana/samana-desde-punta-cana': '/samana/como-es-un-dia-en-samana',
};

const withPercentEncodedTwin = ([source, destination]: [string, string]) => {
	const encodedSource = encodeURI(source.normalize('NFC'));
	return encodedSource === source ? [[source, destination]] : [[source, destination], [encodedSource, destination]];
};

export const legacyRedirects: Record<string, string> = Object.fromEntries(
	Object.entries(movedPages).flatMap(withPercentEncodedTwin),
);
