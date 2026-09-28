const scrollBehavior = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');

export const initTourGallery = (root: HTMLElement) => {
	const dialog = root.querySelector<HTMLDialogElement>('[data-gallery-dialog]');
	const track = dialog?.querySelector<HTMLElement>('[data-gallery-track]');
	if (!dialog || !track) return;

	const slides = [...track.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
	const counter = dialog.querySelector<HTMLElement>('[data-gallery-counter]');
	const previousButton = dialog.querySelector<HTMLButtonElement>('[data-gallery-previous]');
	const nextButton = dialog.querySelector<HTMLButtonElement>('[data-gallery-next]');
	const lastIndex = slides.length - 1;

	let current = 0;
	let pendingIndex: number | null = null;
	let settleTimer = 0;
	let trigger: HTMLElement | null = null;

	const clampIndex = (index: number) => Math.min(Math.max(index, 0), lastIndex);

	const render = (index: number) => {
		current = index;
		if (counter) counter.textContent = `${index + 1} de ${slides.length}`;
		const focused = document.activeElement;
		if (previousButton) previousButton.disabled = index === 0;
		if (nextButton) nextButton.disabled = index === lastIndex;
		if (focused instanceof HTMLButtonElement && focused.disabled) (focused === nextButton ? previousButton : nextButton)?.focus();
		slides.forEach((slide, slideIndex) => {
			slide.inert = slideIndex !== index;
		});
	};

	const scrollToSlide = (index: number, behavior: ScrollBehavior) => {
		track.scrollTo({ left: index * track.clientWidth, behavior });
	};

	const visibleIndex = () => clampIndex(Math.round(track.scrollLeft / track.clientWidth));

	const step = (direction: number) => {
		const origin = pendingIndex ?? current;
		const index = clampIndex(origin + direction);
		if (index === origin) return;
		pendingIndex = index;
		render(index);
		scrollToSlide(index, scrollBehavior());
	};

	const open = (index: number, source: HTMLElement) => {
		trigger = source;
		pendingIndex = null;
		dialog.showModal();
		const target = clampIndex(index);
		render(target);
		scrollToSlide(target, 'instant');
	};

	root.querySelectorAll<HTMLElement>('[data-gallery-open]').forEach((opener) => {
		opener.addEventListener('click', () => open(Number(opener.dataset.galleryOpen) || 0, opener));
	});

	previousButton?.addEventListener('click', () => step(-1));
	nextButton?.addEventListener('click', () => step(1));

	track.addEventListener(
		'scroll',
		() => {
			if (!dialog.open || track.clientWidth === 0) return;
			if (pendingIndex === null && visibleIndex() !== current) render(visibleIndex());
			window.clearTimeout(settleTimer);
			settleTimer = window.setTimeout(() => {
				pendingIndex = null;
				if (dialog.open && visibleIndex() !== current) render(visibleIndex());
			}, 150);
		},
		{ passive: true },
	);

	document.addEventListener('keydown', (event) => {
		if (!dialog.open || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
		event.preventDefault();
		step(event.key === 'ArrowLeft' ? -1 : 1);
	});

	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});

	dialog.addEventListener('close', () => {
		trigger?.focus();
		trigger = null;
	});
};
