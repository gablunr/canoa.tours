const sequenceStepMs = 150;

let nextSlotAt = 0;

function reveal(element: HTMLElement, delayMs = 0) {
	element.style.setProperty('--reveal-delay', `${Math.round(delayMs)}ms`);
	element.setAttribute('data-revealed', '');
}

function revealInSequence(elements: HTMLElement[]) {
	const now = performance.now();

	elements.forEach((element) => {
		const startAt = Math.max(now, nextSlotAt);
		reveal(element, startAt - now);
		nextSlotAt = startAt + sequenceStepMs;
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

export function initReveal() {
	const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
	if (targets.length === 0) return;

	if (!('IntersectionObserver' in window)) {
		targets.forEach((target) => reveal(target));
		return;
	}

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
