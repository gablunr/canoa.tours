const activationOffsetPx = 176;
const bottomTolerancePx = 2;
const clickLockMs = 1200;
const maxStretch = 0.25;

interface TrackedSection {
	link: HTMLAnchorElement;
	section: HTMLElement;
}

function trackedSections(nav: HTMLElement): TrackedSection[] {
	return Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-section-nav-link]')).flatMap((link) => {
		const section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
		return section ? [{ link, section }] : [];
	});
}

const isScrolledToBottom = () =>
	window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomTolerancePx;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function initSectionNav(nav: HTMLElement) {
	const sections = trackedSections(nav);
	const indicator = nav.querySelector<HTMLElement>('[data-section-nav-indicator]');
	const scroller = nav.querySelector<HTMLElement>('[data-section-nav-scroller]');
	if (sections.length === 0 || !indicator || !scroller) return;

	let currentLink: HTMLAnchorElement | undefined;
	let indicatorLeft: number | undefined;
	let lockedUntil = 0;
	let pendingFrame = 0;

	const moveIndicator = (slide: boolean) => {
		if (!currentLink) {
			indicator.style.opacity = '0';
			indicatorLeft = undefined;
			return;
		}

		const left = currentLink.offsetLeft;
		const sliding = slide && indicatorLeft !== undefined;
		indicator.style.transitionProperty = sliding ? '' : 'opacity';
		indicator.style.translate = `${left}px 0`;
		indicator.style.width = `${currentLink.offsetWidth}px`;
		indicator.style.opacity = '1';

		if (sliding && indicatorLeft !== undefined && indicatorLeft !== left && !reducedMotion.matches) {
			const stretch = Math.min(Math.abs(left - indicatorLeft) / 600, maxStretch);
			indicator.animate([{ scale: '1 1' }, { scale: `${1 + stretch} ${1 - stretch / 2}`, offset: 0.3 }, { scale: '1 1' }], {
				duration: 700,
				easing: 'ease-out',
			});
		}

		indicatorLeft = left;
	};

	const keepLinkInView = (link: HTMLAnchorElement) => {
		if (scroller.scrollWidth <= scroller.clientWidth) return;
		scroller.scrollTo({
			left: link.offsetLeft - (scroller.clientWidth - link.offsetWidth) / 2,
			behavior: reducedMotion.matches ? 'auto' : 'smooth',
		});
	};

	const setCurrentLink = (link: HTMLAnchorElement | undefined) => {
		for (const { link: candidate } of sections) {
			if (candidate === link) candidate.setAttribute('aria-current', 'true');
			else candidate.removeAttribute('aria-current');
		}

		if (link === currentLink) return;
		currentLink = link;
		moveIndicator(true);
		if (link) keepLinkInView(link);
	};

	const markCurrentSection = () => {
		pendingFrame = 0;
		if (performance.now() < lockedUntil) return;

		const reached = sections.filter(({ section }) => section.getBoundingClientRect().top <= activationOffsetPx);
		const current = reached.length > 0 && isScrolledToBottom() ? sections.at(-1) : reached.at(-1);
		setCurrentLink(current?.link);
	};

	window.addEventListener(
		'scroll',
		() => {
			if (!pendingFrame) pendingFrame = requestAnimationFrame(markCurrentSection);
		},
		{ passive: true },
	);

	nav.addEventListener('click', (event) => {
		const link = (event.target as Element).closest<HTMLAnchorElement>('[data-section-nav-link]');
		if (!link) return;
		lockedUntil = performance.now() + clickLockMs;
		setCurrentLink(link);
	});

	window.addEventListener('scrollend', () => {
		lockedUntil = 0;
		markCurrentSection();
	});

	const resizeObserver = new ResizeObserver(() => {
		scroller.toggleAttribute('data-overflowing', scroller.scrollWidth > scroller.clientWidth);
		moveIndicator(false);
	});
	resizeObserver.observe(scroller);
	if (scroller.firstElementChild) resizeObserver.observe(scroller.firstElementChild);

	markCurrentSection();
}
