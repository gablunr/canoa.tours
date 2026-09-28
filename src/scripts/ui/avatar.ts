export interface AvatarContent {
	src: string | null;
	initials: string | null;
}

export function setAvatarInitials(avatar: HTMLElement, initials: string | null) {
	const icon = avatar.querySelector<HTMLElement>('[data-avatar-icon]');
	const initialsElement = avatar.querySelector<HTMLElement>('[data-avatar-initials]');
	if (initialsElement) {
		initialsElement.textContent = initials ?? '';
		initialsElement.hidden = !initials;
	}
	if (icon) icon.hidden = Boolean(initials);
}

export function setAvatarImage(avatar: HTMLElement, src: string | null) {
	const image = avatar.querySelector<HTMLImageElement>('[data-avatar-image]');
	if (!image) return;
	if (src) image.src = src;
	else image.removeAttribute('src');
	image.hidden = !src;
}

export function setAvatar(avatar: HTMLElement, { src, initials }: AvatarContent) {
	setAvatarInitials(avatar, initials);
	setAvatarImage(avatar, src);
}
