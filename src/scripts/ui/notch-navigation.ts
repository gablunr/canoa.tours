export function initNotchNavigation(header: HTMLElement) {
	const notch = header.querySelector<HTMLElement>('[data-notch]');
	const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
	const menu = header.querySelector<HTMLElement>('[data-notch-menu]');
	const mega = header.querySelector<HTMLElement>('[data-mega]');
	const megaContent = header.querySelector<HTMLElement>('[data-mega-content]');
	const backdrop = header.querySelector<HTMLElement>('[data-mega-backdrop]');
	const triggers = [...header.querySelectorAll<HTMLButtonElement>('[data-mega-trigger]')];
	const panels = [...header.querySelectorAll<HTMLElement>('[data-mega-panel]')];
	const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

	let activeMenu: string | null = null;
	let closedWidth = 0;
	let hoverTimer: number | undefined;

	function setMenu(open: boolean) {
		toggle?.setAttribute('aria-expanded', String(open));
		toggle?.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
		menu?.toggleAttribute('data-open', open);
		menu?.toggleAttribute('inert', !open);
		notch?.toggleAttribute('data-menu-open', open);
	}

	function showPanel(id: string | null) {
		for (const trigger of triggers) trigger.setAttribute('aria-expanded', String(trigger.dataset.megaTrigger === id));
		for (const panel of panels) {
			const active = panel.dataset.megaPanel === id;
			panel.toggleAttribute('data-active', active);
			panel.toggleAttribute('inert', !active);
		}
	}

	function fitMegaHeight() {
		if (mega) mega.style.height = activeMenu && megaContent ? `${megaContent.offsetHeight}px` : '0px';
	}

	function setMegaOpen(open: boolean) {
		mega?.toggleAttribute('inert', !open);
		backdrop?.toggleAttribute('data-open', open);
		notch?.toggleAttribute('data-mega-open', open);
	}

	function openMega(id: string) {
		if (!notch) return;
		if (!activeMenu) {
			closedWidth = notch.getBoundingClientRect().width;
			notch.style.width = `${closedWidth}px`;
			void notch.offsetWidth;
			notch.style.width = 'var(--mega-width)';
			setMegaOpen(true);
		}
		activeMenu = id;
		showPanel(id);
		fitMegaHeight();
	}

	function closeMega() {
		if (!notch || !activeMenu) return;
		activeMenu = null;
		fitMegaHeight();
		showPanel(null);
		setMegaOpen(false);
		notch.style.width = `${closedWidth}px`;
	}

	function schedule(action: () => void, delay: number) {
		window.clearTimeout(hoverTimer);
		hoverTimer = window.setTimeout(action, delay);
	}

	toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

	window.addEventListener('resize', fitMegaHeight);

	notch?.addEventListener('transitionend', (event) => {
		if (event.target === notch && event.propertyName === 'width' && !activeMenu) notch.style.width = '';
	});

	for (const trigger of triggers) {
		const id = trigger.dataset.megaTrigger;
		if (!id) continue;

		trigger.addEventListener('pointerenter', (event) => {
			if (event.pointerType === 'mouse') schedule(() => openMega(id), activeMenu ? 0 : 120);
		});

		trigger.addEventListener('click', (event) => {
			const openedByHover = canHover.matches && event.detail > 0;
			if (activeMenu === id && !openedByHover) closeMega();
			else openMega(id);
		});
	}

	notch?.addEventListener('pointerenter', () => window.clearTimeout(hoverTimer));
	notch?.addEventListener('pointerleave', (event) => {
		if (event.pointerType === 'mouse') schedule(closeMega, 250);
	});

	notch?.addEventListener('focusout', (event) => {
		if (!notch.contains(event.relatedTarget as Node | null)) closeMega();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		setMenu(false);
		const trigger = triggers.find((candidate) => candidate.dataset.megaTrigger === activeMenu);
		closeMega();
		if (trigger && notch?.contains(document.activeElement)) trigger.focus();
	});

	document.addEventListener('click', (event) => {
		if (notch?.contains(event.target as Node)) return;
		setMenu(false);
		closeMega();
	});
}
