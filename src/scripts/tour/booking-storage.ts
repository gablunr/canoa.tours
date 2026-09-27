import type { PickupSelection } from './hotel-picker';

export interface StoredBooking {
	tourDate?: string;
	adults?: number;
	children?: number;
	infants?: number;
	hotel?: PickupSelection;
	insurance?: boolean;
	couponCode?: string;
	leadName?: string;
	email?: string;
	phone?: { country?: string; number?: string };
	country?: string;
}

const storageKey = (productKey: string) => `canoa:booking:${productKey}`;

export function saveBooking(productKey: string, booking: StoredBooking) {
	try {
		sessionStorage.setItem(storageKey(productKey), JSON.stringify(booking));
	} catch {
		return;
	}
}

export function loadBooking(productKey: string): StoredBooking | null {
	try {
		const raw = sessionStorage.getItem(storageKey(productKey));
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		return parsed && typeof parsed === 'object' ? (parsed as StoredBooking) : null;
	} catch {
		return null;
	}
}
