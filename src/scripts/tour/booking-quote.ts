import { actions } from 'astro:actions';
import { formatPrice } from '../../lib/format';
import type { Quote, QuoteLine } from '../../lib/booking/pricing';

export interface BookingSelection {
	productKey: string;
	tourDate: string;
	adults: number;
	children: number;
	infants: number;
	hotelId?: string;
	hotelName?: string;
	zoneSlug?: string;
	insurance: boolean;
	couponCode?: string;
}

type QuoteResult = Awaited<ReturnType<typeof actions.bookings.quote>>;

export type ServerQuote = NonNullable<QuoteResult['data']>;

export type QuoteOutcome =
	| { kind: 'quote'; quote: ServerQuote }
	| { kind: 'error'; code: string; message: string }
	| { kind: 'network' };

export const selectionKey = (selection: BookingSelection) => JSON.stringify(selection);

export function createQuoteClient(delay = 400) {
	const cache = new Map<string, ServerQuote>();
	let sequence = 0;
	let timer: number | undefined;
	let resolveWaiting: ((outcome: null) => void) | undefined;

	function dropWaiting() {
		window.clearTimeout(timer);
		resolveWaiting?.(null);
		resolveWaiting = undefined;
	}

	async function fetchQuote(selection: BookingSelection, key: string, ticket: number): Promise<QuoteOutcome | null> {
		let outcome: QuoteOutcome;
		try {
			const { data, error } = await actions.bookings.quote(selection);
			if (data) {
				cache.set(key, data);
				outcome = { kind: 'quote', quote: data };
			} else if (error && error.code !== 'INTERNAL_SERVER_ERROR') {
				outcome = { kind: 'error', code: error.code, message: error.message };
			} else {
				outcome = { kind: 'network' };
			}
		} catch {
			outcome = { kind: 'network' };
		}
		return ticket === sequence ? outcome : null;
	}

	function request(selection: BookingSelection, immediate = false): Promise<QuoteOutcome | null> {
		dropWaiting();
		const ticket = ++sequence;
		const key = selectionKey(selection);
		const cached = cache.get(key);
		if (cached) return Promise.resolve({ kind: 'quote', quote: cached });
		if (immediate) return fetchQuote(selection, key, ticket);

		return new Promise((resolve) => {
			resolveWaiting = resolve;
			timer = window.setTimeout(() => {
				resolveWaiting = undefined;
				resolve(fetchQuote(selection, key, ticket));
			}, delay);
		});
	}

	function cancel() {
		dropWaiting();
		sequence++;
	}

	return { request, cancel };
}

export interface SummaryContext {
	hasPickup: boolean;
	couponCode: string | null;
}

interface SummaryRow {
	label: string;
	amount: string;
}

const signedPrice = (amount: number) => (amount < 0 ? `-${formatPrice(Math.abs(amount))}` : formatPrice(amount));

function lineLabel(line: QuoteLine, context: SummaryContext) {
	if (line.key === 'adults') return `Adultos × ${line.quantity}`;
	if (line.key === 'children') return `Niños × ${line.quantity}`;
	if (line.key === 'group') return 'Grupo';
	if (line.key === 'pickup') return `Recogida × ${line.quantity}`;
	if (line.key === 'insurance') return `Seguro × ${line.quantity}`;
	return context.couponCode ? `Cupón ${context.couponCode}` : 'Cupón';
}

function summaryRows(quote: Quote, context: SummaryContext): SummaryRow[] {
	const rows = quote.lines.map((line) => ({ label: lineLabel(line, context), amount: signedPrice(line.amount) }));
	if (!context.hasPickup || quote.lines.some((line) => line.key === 'pickup')) return rows;

	const pickupRow = { label: 'Recogida', amount: quote.pickupPending ? 'Te lo confirmamos' : 'Sin cargo' };
	const extrasStart = quote.lines.findIndex((line) => line.key === 'insurance' || line.key === 'discount');
	const insertAt = extrasStart === -1 ? rows.length : extrasStart;
	return [...rows.slice(0, insertAt), pickupRow, ...rows.slice(insertAt)];
}

export function renderSummary(summary: HTMLElement, quote: Quote, context: SummaryContext, pending: boolean) {
	const list = summary.querySelector<HTMLElement>('[data-summary-lines]');
	const template = summary.querySelector<HTMLTemplateElement>('template[data-summary-line]');
	if (list && template) {
		list.replaceChildren(
			...summaryRows(quote, context).map((row) => {
				const fragment = template.content.cloneNode(true) as DocumentFragment;
				const label = fragment.querySelector('[data-line-label]');
				const amount = fragment.querySelector('[data-line-amount]');
				if (label) label.textContent = row.label;
				if (amount) amount.textContent = row.amount;
				return fragment;
			}),
		);
	}

	const totals: Record<string, number> = { total: quote.total, deposit: quote.depositAmount, balance: quote.balanceAmount };
	for (const [key, amount] of Object.entries(totals)) {
		const target = summary.querySelector<HTMLElement>(`[data-summary="${key}"]`);
		if (target) target.textContent = formatPrice(amount);
	}
	const balanceRow = summary.querySelector<HTMLElement>('[data-summary-row="balance"]');
	if (balanceRow) balanceRow.hidden = quote.balanceAmount <= 0;

	summary.toggleAttribute('data-pending', pending);
	summary.setAttribute('aria-busy', String(pending));
}
