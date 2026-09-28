const combiningMarks = /[̀-ͯ]/g;

export const normalizeSearchText = (text: string) => text.toLowerCase().normalize('NFD').replace(combiningMarks, '').replace(/\s+/g, ' ').trim();

const accentVariants: Record<string, string> = {
	a: 'aáàâäãAÁÀÂÄÃ',
	e: 'eéèêëEÉÈÊË',
	i: 'iíìîïIÍÌÎÏ',
	o: 'oóòôöõOÓÒÔÖÕ',
	u: 'uúùûüUÚÙÛÜ',
	n: 'nñNÑ',
	c: 'cçCÇ',
};

const regexSyntax = /[\\^$.*+?()[\]{}|]/;

export const accentInsensitivePattern = (term: string) =>
	[...normalizeSearchText(term)].map((character) => (accentVariants[character] ? `[${accentVariants[character]}]` : regexSyntax.test(character) ? '.' : character)).join('');
