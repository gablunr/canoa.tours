const activationOffsetPx = 160;
const bottomTolerancePx = 2;

interface TrackedSection {
	link: HTMLAnchorElement;
	heading: HTMLElement;
}

function trackedSections(root: HTMLElement): TrackedSection[] {
	return Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')).flatMap((link) => {
		const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
		return heading ? [{ link, heading }] : [];
	});
}

const isScrolledToBottom = () =>
	window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomTolerancePx;

export function initTableOfContents(root: HTMLElement) {
	const sections = trackedSections(root);
	if (sections.length === 0) return;

	const indicator = root.querySelector<HTMLElement>('[data-toc-indicator]');
	let currentLink: HTMLAnchorElement | undefined;
	let pendingFrame = 0;

	function moveIndicator() {
		if (!indicator) return;
		if (!currentLink) {
			indicator.style.opacity = '0';
			return;
		}
		indicator.style.translate = `0 ${currentLink.offsetTop}px`;
		indicator.style.height = `${currentLink.offsetHeight}px`;
		indicator.style.opacity = '1';
	}

	function markCurrentSection() {
		pendingFrame = 0;
		const reached = sections.filter(({ heading }) => heading.getBoundingClientRect().top <= activationOffsetPx);
		const current = isScrolledToBottom() ? sections.at(-1) : reached.at(-1);

		for (const { link } of sections) {
			if (link === current?.link) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		}

		if (current?.link !== currentLink) {
			currentLink = current?.link;
			moveIndicator();
		}
	}

	window.addEventListener(
		'scroll',
		() => {
			if (!pendingFrame) pendingFrame = requestAnimationFrame(markCurrentSection);
		},
		{ passive: true },
	);

	window.addEventListener('resize', moveIndicator, { passive: true });

	markCurrentSection();
}
