const staggerStepMs = 70;
const maxStaggerMs = 280;

const reveal = (element: HTMLElement) => element.setAttribute('data-revealed', '');

export function initReveal() {
	const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
	if (targets.length === 0) return;

	if (!('IntersectionObserver' in window)) {
		targets.forEach(reveal);
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries
				.filter((entry) => entry.isIntersecting)
				.forEach((entry, index) => {
					const element = entry.target as HTMLElement;
					element.style.setProperty('--reveal-delay', `${Math.min(index * staggerStepMs, maxStaggerMs)}ms`);
					reveal(element);
					observer.unobserve(element);
				});
		},
		{ rootMargin: '0px 0px -8% 0px' },
	);

	targets.forEach((target) => observer.observe(target));
}
