const sequenceStepMs = 150;
const fastSequenceStepMs = 40;
const revealDurationMs = 700;
const fastRevealDurationMs = 400;
const maxScrollBacklogMs = 450;
const fastScrollSpeed = 3;
const scrollIdleMs = 120;

let nextSlotAt = 0;
let scrollSpeed = 0;
let lastScrollY = 0;
let lastScrollAt = 0;
let trackingScroll = false;

function trackScrollSpeed() {
	if (trackingScroll) return;
	trackingScroll = true;
	lastScrollY = window.scrollY;

	window.addEventListener(
		'scroll',
		() => {
			const now = performance.now();
			const elapsed = now - lastScrollAt;
			const speed = Math.abs(window.scrollY - lastScrollY) / Math.max(elapsed, 1);
			scrollSpeed = elapsed > scrollIdleMs ? speed : scrollSpeed * 0.6 + speed * 0.4;
			lastScrollY = window.scrollY;
			lastScrollAt = now;
		},
		{ passive: true },
	);
}

function scrollUrgency() {
	if (performance.now() - lastScrollAt > scrollIdleMs) return 0;
	return Math.min(scrollSpeed / fastScrollSpeed, 1);
}

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function reveal(element: HTMLElement, delayMs = 0, urgency = scrollUrgency()) {
	element.style.setProperty('--reveal-delay', `${Math.round(delayMs)}ms`);
	element.style.setProperty('--reveal-duration', `${Math.round(lerp(revealDurationMs, fastRevealDurationMs, urgency))}ms`);
	element.setAttribute('data-revealed', '');
}

function revealInSequence(elements: HTMLElement[]) {
	const now = performance.now();
	const urgency = scrollUrgency();
	const step = lerp(sequenceStepMs, fastSequenceStepMs, urgency);
	if (urgency > 0) nextSlotAt = Math.min(nextSlotAt, now + maxScrollBacklogMs * (1 - urgency));

	elements.forEach((element) => {
		const startAt = Math.max(now, nextSlotAt);
		reveal(element, startAt - now, urgency);
		nextSlotAt = startAt + step;
	});
}

function animationStartedAt(element: HTMLElement, animation: CSSAnimation) {
	const delay = animation.effect?.getTiming().delay ?? 0;
	const localTime = Number(animation.effect?.getComputedTiming().localTime ?? 0);
	if (localTime >= delay) return Promise.resolve(performance.now() - (localTime - delay));

	return new Promise<number | undefined>((resolve) => {
		const settle = (event: AnimationEvent) => {
			if (event.target !== element || event.animationName !== animation.animationName) return;
			element.removeEventListener('animationstart', settle);
			element.removeEventListener('animationcancel', settle);
			resolve(event.type === 'animationstart' ? performance.now() : undefined);
		};
		element.addEventListener('animationstart', settle);
		element.addEventListener('animationcancel', settle);
	});
}

async function waitForPageEntranceStart() {
	const entranceElements = Array.from(document.querySelectorAll<HTMLElement>('[data-entrance], .animate-fade-up'));
	const startTimes = await Promise.all(
		entranceElements.flatMap((element) =>
			typeof element.getAnimations === 'function'
				? element
						.getAnimations()
						.filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation)
						.map((animation) => animationStartedAt(element, animation))
				: [],
		),
	);

	const lastStart = Math.max(...startTimes.filter((time): time is number => time !== undefined));
	if (Number.isFinite(lastStart)) nextSlotAt = Math.max(nextSlotAt, lastStart + sequenceStepMs);
}

const isScrolledDown = () => window.scrollY > 0;

const byDocumentOrder = (first: HTMLElement, second: HTMLElement) =>
	first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

function jumpToHashTarget() {
	if (!location.hash) return;
	document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant', block: 'start' });
}

const skipsEntrance = () => document.documentElement.classList.contains('skip-entrance') || isScrolledDown();

function showInstantly(elements: HTMLElement[]) {
	elements.forEach((element) => {
		element.style.setProperty('--reveal-delay', '0ms');
		element.style.setProperty('--reveal-duration', '0ms');
		element.setAttribute('data-revealed', '');
	});
}

export function initReveal() {
	jumpToHashTarget();
	const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
	if (targets.length === 0) return;

	if (skipsEntrance()) {
		showInstantly(targets);
		return;
	}

	if (!('IntersectionObserver' in window)) {
		targets.forEach((target) => reveal(target));
		return;
	}

	trackScrollSpeed();
	const entrance = waitForPageEntranceStart();
	let entranceStarted = false;
	entrance.then(() => {
		entranceStarted = true;
	});

	const pending = new Set(targets);

	const stopWatching = (elements: HTMLElement[]) => {
		elements.forEach((element) => {
			observer.unobserve(element);
			pending.delete(element);
		});
	};

	const showScrolledPast = () => {
		const scrolledPast = Array.from(pending).filter((element) => element.getBoundingClientRect().bottom <= 0);
		stopWatching(scrolledPast);
		scrolledPast.forEach((element) => reveal(element));
	};

	const observer = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.map((entry) => entry.target as HTMLElement)
				.sort(byDocumentOrder);

			stopWatching(visible);
			showScrolledPast();
			if (visible.length === 0) return;

			if (entranceStarted) {
				revealInSequence(visible);
				return;
			}

			if (isScrolledDown()) {
				visible.forEach((element) => reveal(element));
				return;
			}

			entrance.then(() => revealInSequence(visible));
		},
		{ rootMargin: '0px 0px -8% 0px' },
	);

	targets.forEach((target) => observer.observe(target));
}
