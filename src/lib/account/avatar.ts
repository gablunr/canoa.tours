export function customerInitials(fullName: string) {
	const words = fullName.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.charAt(0) ?? '';
	const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : '';
	return `${first}${last}`.toLocaleUpperCase('es');
}

export const avatarFolder = (customerId: string) => `avatars/${customerId}/`;
