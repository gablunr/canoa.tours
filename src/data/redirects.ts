const movedPages: Record<string, string> = {};

const withPercentEncodedTwin = ([source, destination]: [string, string]) => {
	const encodedSource = encodeURI(source.normalize('NFC'));
	return encodedSource === source ? [[source, destination]] : [[source, destination], [encodedSource, destination]];
};

export const legacyRedirects: Record<string, string> = Object.fromEntries(
	Object.entries(movedPages).flatMap(withPercentEncodedTwin),
);
