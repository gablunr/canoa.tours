type AccountSummary =
	| { signedIn: false }
	| {
			signedIn: true;
			firstName: string | null;
			email: string | null;
			panelHref: string | null;
			upcomingCount: number;
			nextBooking: { productName: string; date: string; href: string } | null;
			reviewHref: string | null;
	  };

let summaryRequest: Promise<AccountSummary | null> | null = null;

function loadAccountSummary() {
	summaryRequest ??= fetch('/api/account/summary', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
		.then((response) => (response.ok ? (response.json() as Promise<AccountSummary>) : null))
		.catch(() => null);
	return summaryRequest;
}

function setText(root: ParentNode, selector: string, text: string) {
	root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
		element.textContent = text;
	});
}

function setHidden(root: ParentNode, selector: string, hidden: boolean) {
	root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
		element.hidden = hidden;
	});
}

const panelIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>';

function addPanelLink(root: ParentNode, href: string) {
	root.querySelectorAll<HTMLElement>('[data-account-staff-slot]').forEach((slot) => {
		if (slot.childElementCount > 0) return;
		const link = document.createElement('a');
		link.href = href;
		link.className = slot.dataset.linkClass ?? '';
		link.innerHTML = `${panelIcon}Equipo`;
		slot.append(link);
	});
}

function accountLinkHref(link: string | undefined, summary: Extract<AccountSummary, { signedIn: true }>) {
	const ticketHref = summary.nextBooking?.href;
	if (link === 'ticket' && ticketHref) return ticketHref;
	if (link === 'change-date' && ticketHref) return `${ticketHref}#cambiar-fecha`;
	if (link === 'review' && summary.reviewHref) return summary.reviewHref;
	return '/account';
}

function applySummary(root: HTMLElement, summary: AccountSummary) {
	root.querySelectorAll<HTMLElement>('[data-account-guest]').forEach((element) => element.toggleAttribute('inert', summary.signedIn));
	root.querySelectorAll<HTMLElement>('[data-account-member]').forEach((element) => element.toggleAttribute('inert', !summary.signedIn));
	if (!summary.signedIn) return;

	setText(root, '[data-account-greeting]', summary.firstName ? `Hola, ${summary.firstName}` : 'Hola');
	setText(root, '[data-account-email]', summary.email ?? '');
	if (summary.panelHref) addPanelLink(root, summary.panelHref);
	setHidden(root, '[data-account-no-next]', summary.nextBooking !== null);
	setHidden(root, '[data-account-next]', summary.nextBooking === null);

	root.querySelectorAll<HTMLAnchorElement>('[data-account-link]').forEach((link) => {
		link.href = accountLinkHref(link.dataset.accountLink, summary);
	});

	if (summary.nextBooking) {
		root.querySelectorAll<HTMLAnchorElement>('[data-account-next]').forEach((link) => {
			link.href = summary.nextBooking?.href ?? '/account';
		});
		setText(root, '[data-account-next-name]', summary.nextBooking.productName);
		setText(root, '[data-account-next-date]', summary.nextBooking.date);
	}
}

export function initAccountMenus() {
	const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-account-menu]'));
	if (roots.length === 0) return;

	let applied = false;
	const refresh = () => {
		if (applied) return;
		applied = true;
		loadAccountSummary().then((summary) => {
			if (summary) roots.forEach((root) => applySummary(root, summary));
		});
	};

	document.querySelectorAll('[data-mega-trigger="cuenta"]').forEach((trigger) => {
		trigger.addEventListener('pointerenter', refresh, { once: true });
		trigger.addEventListener('focus', refresh, { once: true });
		trigger.addEventListener('click', refresh, { once: true });
	});
	document.querySelectorAll('[data-account-section]').forEach((section) => section.addEventListener('toggle', refresh, { once: true }));
}
