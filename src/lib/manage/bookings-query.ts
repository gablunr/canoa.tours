import type { SupabaseClient } from '@supabase/supabase-js';
import { bookingStatusLabels } from '../account/bookings';
import { spanishTranslation } from '../booking/booking-details';
import { formatMoney } from '../email/templates/layout';
import { supabaseAdmin } from '../supabase/admin';
import type { BookingStatus, Database } from '../supabase/types';

type Supabase = SupabaseClient<Database>;

export const bookingsPageSize = 15;

export type BookingsView = 'upcoming' | 'all';

export const bookingStatuses = Object.keys(bookingStatusLabels) as BookingStatus[];

const statusesHiddenByDefault: BookingStatus[] = ['pending_payment', 'expired'];

export interface BookingsFilters {
	q: string;
	status: BookingStatus | 'all';
	product: string;
	view: BookingsView;
	page: number;
}

export function readBookingsFilters(params: URLSearchParams): BookingsFilters {
	const status = params.get('status') ?? 'all';
	const page = Number.parseInt(params.get('page') ?? '1', 10);
	return {
		q: (params.get('q') ?? '').trim().slice(0, 80),
		status: bookingStatuses.includes(status as BookingStatus) ? (status as BookingStatus) : 'all',
		product: (params.get('product') ?? '').trim().slice(0, 80),
		view: params.get('view') === 'all' ? 'all' : 'upcoming',
		page: Number.isFinite(page) && page > 0 ? page : 1,
	};
}

export function bookingsSearch(filters: BookingsFilters, overrides: Partial<BookingsFilters> = {}) {
	const merged = { ...filters, ...overrides };
	const params = new URLSearchParams();
	if (merged.q) params.set('q', merged.q);
	if (merged.status !== 'all') params.set('status', merged.status);
	if (merged.product) params.set('product', merged.product);
	if (merged.view !== 'upcoming') params.set('view', merged.view);
	if (merged.page > 1) params.set('page', String(merged.page));
	const search = params.toString();
	return search ? `?${search}` : '';
}

export function backSearchFrom(value: string | null) {
	if (!value) return '';
	return bookingsSearch(readBookingsFilters(new URLSearchParams(value)));
}

export interface ProductOption {
	key: string;
	name: string;
}

export async function loadProductOptions(supabase: Supabase): Promise<ProductOption[]> {
	const { data, error } = await supabase.from('products').select('key, product_translations ( locale, name, slug )').order('key');
	if (error) throw error;
	return (data ?? [])
		.map((product) => ({ key: product.key, name: spanishTranslation(product.product_translations)?.name ?? product.key }))
		.sort((first, second) => first.name.localeCompare(second.name, 'es'));
}

export interface BookingListRow {
	code: string;
	status: BookingStatus;
	tourDate: string;
	people: number;
	adults: number;
	children: number;
	infants: number;
	leadName: string;
	email: string;
	productName: string;
	total: number;
	balance: number;
	providerSent: boolean;
	providerConfirmed: boolean;
}

const searchSafe = (text: string) => text.replace(/[,()"\\:%*]/g, ' ').replace(/\s+/g, ' ').trim();

async function customerIdsMatching(supabase: Supabase, term: string): Promise<string[]> {
	const { data, error } = await supabase.from('customers').select('id').ilike('email', `%${term}%`).limit(200);
	if (error) throw error;
	return (data ?? []).map((customer) => customer.id);
}

async function productIdByKey(supabase: Supabase, key: string): Promise<string | null> {
	const { data, error } = await supabase.from('products').select('id').eq('key', key).maybeSingle();
	if (error) throw error;
	return data?.id ?? null;
}

export async function loadBookingsPage(supabase: Supabase, filters: BookingsFilters, today: string) {
	let query = supabase
		.from('bookings')
		.select(
			'code, status, tour_date, adults, children, infants, lead_name, total, balance_amount, provider_sent_at, provider_confirmed_at, created_at, customers ( email ), products ( key, product_translations ( locale, name, slug ) )',
			{ count: 'exact' },
		);

	if (filters.status === 'all') query = query.not('status', 'in', `(${statusesHiddenByDefault.join(',')})`);
	else query = query.eq('status', filters.status);

	if (filters.product) {
		const productId = await productIdByKey(supabase, filters.product);
		if (!productId) return { rows: [] as BookingListRow[], total: 0 };
		query = query.eq('product_id', productId);
	}

	const term = searchSafe(filters.q);
	if (term) {
		const customerIds = await customerIdsMatching(supabase, term);
		const conditions = ['code', 'lead_name', 'lead_phone'].map((column) => `${column}.ilike."%${term}%"`);
		if (customerIds.length > 0) conditions.push(`customer_id.in.(${customerIds.join(',')})`);
		query = query.or(conditions.join(','));
	}

	if (filters.view === 'upcoming') {
		query = query.gte('tour_date', today).order('tour_date', { ascending: true }).order('created_at', { ascending: true });
	} else {
		query = query.order('created_at', { ascending: false });
	}

	const from = (filters.page - 1) * bookingsPageSize;
	const { data, count, error } = await query.range(from, from + bookingsPageSize - 1);
	if (error) {
		if (error.code === 'PGRST103') return { rows: [] as BookingListRow[], total: count ?? 0 };
		throw error;
	}

	const rows: BookingListRow[] = (data ?? []).map((row) => ({
		code: row.code,
		status: row.status,
		tourDate: row.tour_date,
		people: row.adults + row.children + row.infants,
		adults: row.adults,
		children: row.children,
		infants: row.infants,
		leadName: row.lead_name,
		email: row.customers?.email ?? '',
		productName: spanishTranslation(row.products?.product_translations)?.name ?? row.products?.key ?? '',
		total: Number(row.total),
		balance: Number(row.balance_amount),
		providerSent: Boolean(row.provider_sent_at),
		providerConfirmed: Boolean(row.provider_confirmed_at),
	}));

	return { rows, total: count ?? 0 };
}

export interface BookingExtras {
	id: string;
	zoneId: string | null;
	hotelId: string | null;
	pickupNote: string | null;
	providerSentAt: string | null;
	providerConfirmedAt: string | null;
	confirmedAt: string | null;
	cancelledAt: string | null;
	createdAt: string;
	customerPhone: string | null;
}

export async function loadBookingExtras(supabase: Supabase, code: string): Promise<BookingExtras | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select('id, pickup_zone_id, hotel_id, pickup_note, provider_sent_at, provider_confirmed_at, confirmed_at, cancelled_at, created_at, customers ( phone )')
		.eq('code', code)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;
	return {
		id: data.id,
		zoneId: data.pickup_zone_id,
		hotelId: data.hotel_id,
		pickupNote: data.pickup_note,
		providerSentAt: data.provider_sent_at,
		providerConfirmedAt: data.provider_confirmed_at,
		confirmedAt: data.confirmed_at,
		cancelledAt: data.cancelled_at,
		createdAt: data.created_at,
		customerPhone: data.customers?.phone ?? null,
	};
}

export interface PaymentRow {
	id: string;
	kind: string;
	status: string;
	provider: string;
	amount: number;
	createdAt: string;
}

export async function loadPayments(supabase: Supabase, bookingId: string): Promise<PaymentRow[]> {
	const { data, error } = await supabase
		.from('payments')
		.select('id, kind, status, provider, amount, created_at')
		.eq('booking_id', bookingId)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []).map((payment) => ({
		id: payment.id,
		kind: payment.kind,
		status: payment.status,
		provider: payment.provider,
		amount: Number(payment.amount),
		createdAt: payment.created_at,
	}));
}

export const paymentKindLabels: Record<string, string> = {
	deposit: 'Anticipo',
	balance: 'Saldo',
	no_show_charge: 'Cobro por no presentarse',
	refund: 'Reembolso',
};

export const paymentStatusLabels: Record<string, string> = {
	pending: 'Pendiente',
	succeeded: 'Completado',
	failed: 'Fallido',
};

export const paymentProviderLabels: Record<string, string> = {
	stripe: 'Stripe',
	paypal: 'PayPal',
	cash: 'Efectivo',
};

export interface HistoryEntry {
	id: number;
	label: string;
	detail: string | null;
	createdAt: string;
	actor: string;
}

const eventLabels: Record<string, string> = {
	checkout_created: 'Pago iniciado',
	confirmed: 'Reserva confirmada',
	payment_recorded: 'Pago registrado',
	payment_updated: 'Pago actualizado',
	cancelled: 'Reserva cancelada',
	completed: 'Marcada como realizada',
	no_show: 'Marcada como no presentado',
	date_changed: 'Fecha cambiada',
	moved: 'Movida por clima',
	pickup_updated: 'Recogida actualizada',
	provider_sent: 'Enviada al proveedor',
	provider_confirmed: 'Confirmada por el proveedor',
	email_sent: 'Email enviado',
	expired: 'Pago caducado',
	no_show_payment_link_sent: 'Enlace de pago del saldo enviado',
	no_show_charge_failed: 'Cobro del saldo fallido',
};

const emailKindLabels: Record<string, string> = {
	confirmed: 'Confirmación',
	tour_reminder: 'Recordatorio',
	date_changed: 'Cambio de fecha',
	cancelled: 'Cancelación',
	review_request: 'Petición de opinión',
};

const shortDateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const formatShortDate = (isoDate: string) => shortDateFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'America/Santo_Domingo',
});

export const formatDateTime = (timestamp: string) => dateTimeFormatter.format(new Date(timestamp));

const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : null);

function eventDetail(type: string, data: Record<string, unknown>): string | null {
	if (type === 'date_changed' || type === 'moved') {
		const from = text(data.from_date);
		const to = text(data.to_date);
		return from && to ? `Del ${formatShortDate(from)} al ${formatShortDate(to)}` : null;
	}
	if (type === 'cancelled') return text(data.reason);
	if (type === 'payment_recorded' || type === 'payment_updated') {
		const kind = text(data.kind);
		const amount = Number(data.amount);
		const status = text(data.status);
		const parts = [kind ? (paymentKindLabels[kind] ?? kind) : null, Number.isFinite(amount) ? formatMoney(amount) : null, status ? (paymentStatusLabels[status] ?? status).toLowerCase() : null];
		return parts.filter(Boolean).join(', ') || null;
	}
	if (type === 'email_sent') {
		const kind = text(data.kind);
		return kind ? (emailKindLabels[kind] ?? kind) : null;
	}
	if (type === 'pickup_updated') {
		const pickupTime = text(data.pickup_time);
		if (pickupTime) return `Hora de recogida: ${pickupTime.slice(0, 5)}`;
		const total = Number(data.total);
		return Number.isFinite(total) ? `Nueva zona, total ${formatMoney(total)}` : 'Nueva zona';
	}
	if (type === 'checkout_created' || type === 'no_show_payment_link_sent') {
		const amount = Number(data.amount);
		return Number.isFinite(amount) ? formatMoney(amount) : null;
	}
	if (type === 'no_show_charge_failed') return text(data.message);
	if (type === 'completed' || type === 'no_show') {
		const fromStatus = text(data.from_status);
		return fromStatus && fromStatus !== 'confirmed' ? `Antes: ${bookingStatusLabels[fromStatus as BookingStatus] ?? fromStatus}` : null;
	}
	return null;
}

async function actorEmails(actorIds: string[]): Promise<Map<string, string>> {
	const entries = await Promise.all(
		actorIds.map(async (actorId) => {
			const { data } = await supabaseAdmin.auth.admin.getUserById(actorId);
			return [actorId, data.user?.email ?? 'Equipo'] as const;
		}),
	);
	return new Map(entries);
}

export async function loadHistory(supabase: Supabase, bookingId: string): Promise<HistoryEntry[]> {
	const { data, error } = await supabase
		.from('booking_events')
		.select('id, type, data, actor_user_id, created_at')
		.eq('booking_id', bookingId)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false });
	if (error) throw error;

	const events = data ?? [];
	const actorIds = [...new Set(events.map((event) => event.actor_user_id).filter((actorId): actorId is string => Boolean(actorId)))];
	const actors = await actorEmails(actorIds);

	return events.map((event) => {
		const eventData = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? (event.data as Record<string, unknown>) : {};
		return {
			id: event.id,
			label: eventLabels[event.type] ?? event.type.replaceAll('_', ' '),
			detail: eventDetail(event.type, eventData),
			createdAt: event.created_at,
			actor: event.actor_user_id ? (actors.get(event.actor_user_id) ?? 'Equipo') : 'Sistema',
		};
	});
}

export interface PickupZoneOption {
	id: string;
	name: string;
	feePerPerson: number;
}

export interface HotelOption {
	id: string;
	name: string;
	zoneId: string;
}

export async function loadPickupOptions(supabase: Supabase, productId: string) {
	const { data: zoneRows, error: zoneError } = await supabase
		.from('product_pickup_zones')
		.select('fee_per_person, pickup_zones ( id, name, position )')
		.eq('product_id', productId);
	if (zoneError) throw zoneError;

	const zones = (zoneRows ?? [])
		.filter((row) => row.pickup_zones)
		.map((row) => ({
			id: row.pickup_zones?.id ?? '',
			name: row.pickup_zones?.name ?? '',
			position: row.pickup_zones?.position ?? 0,
			feePerPerson: Number(row.fee_per_person),
		}))
		.sort((first, second) => first.position - second.position || first.name.localeCompare(second.name, 'es'))
		.map(({ id, name, feePerPerson }): PickupZoneOption => ({ id, name, feePerPerson }));

	if (zones.length === 0) return { zones, hotels: [] as HotelOption[] };

	const { data: hotelRows, error: hotelError } = await supabase
		.from('hotels')
		.select('id, name, zone_id')
		.in(
			'zone_id',
			zones.map((zone) => zone.id),
		)
		.eq('active', true)
		.order('name');
	if (hotelError) throw hotelError;

	const hotels = (hotelRows ?? []).map((hotel): HotelOption => ({ id: hotel.id, name: hotel.name, zoneId: hotel.zone_id }));
	return { zones, hotels };
}
