import type { SupabaseClient } from '@supabase/supabase-js';
import { formatPrice } from '../format';
import type { Database } from '../supabase/types';

export type ManifestRow = Database['public']['Functions']['daily_manifest']['Returns'][number];

export type ManifestGroup = {
	productKey: string;
	productName: string;
	bookings: number;
	seats: number;
	rows: ManifestRow[];
};

export function groupManifestRows(rows: ManifestRow[]): ManifestGroup[] {
	const groupsByProduct = new Map<string, ManifestGroup>();
	for (const row of rows) {
		const group = groupsByProduct.get(row.product_key) ?? {
			productKey: row.product_key,
			productName: row.product_name,
			bookings: 0,
			seats: 0,
			rows: [],
		};
		group.bookings += 1;
		group.seats += row.seats;
		group.rows.push(row);
		groupsByProduct.set(row.product_key, group);
	}
	return [...groupsByProduct.values()];
}

export async function loadManifest(supabase: SupabaseClient<Database>, date: string): Promise<ManifestGroup[]> {
	const { data, error } = await supabase.rpc('daily_manifest', { p_date: date });
	if (error) throw error;
	return groupManifestRows(data ?? []);
}

const shortTime = (time: string | null) => (time ? time.slice(0, 5) : null);

const manifestDateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function formatManifestDate(date: string) {
	return manifestDateFormatter.format(new Date(`${date}T12:00:00Z`));
}

function passengersLabel(row: ManifestRow) {
	return `${row.adults}A ${row.children}N ${row.infants}B`;
}

function balanceLabel(row: ManifestRow) {
	return row.balance_amount > 0 ? `Cobrar: ${formatPrice(row.balance_amount)}` : 'Cobrar: nada, está pagado';
}

function bookingBlock(row: ManifestRow) {
	const hotel = row.zone ? `${row.hotel ?? 'Sin hotel'} (${row.zone})` : (row.hotel ?? 'Sin hotel');
	const lines = [
		`${row.booking_code}, ${row.lead_name}, ${row.lead_phone ?? 'sin teléfono'}`,
		`Pax: ${passengersLabel(row)}`,
		`Hotel: ${hotel}`,
		`Recogida: ${shortTime(row.pickup_time) ?? 'por confirmar'}`,
		balanceLabel(row),
	];
	if (row.pickup_fee_pending) lines.push('Suplemento de recogida por calcular');
	if (row.pickup_note) lines.push(`Nota: ${row.pickup_note}`);
	return lines.join('\n');
}

export function manifestWhatsAppText(date: string, groups: ManifestGroup[]): string {
	const header = `Salidas del ${formatManifestDate(date)}`;
	if (groups.length === 0) return `${header}\n\nNo hay reservas confirmadas.`;

	const sections = groups.map((group) => {
		const startTimes = [...new Set(group.rows.map((row) => shortTime(row.start_time)))].join(', ');
		const title = `${group.productName}, salida ${startTimes} (${group.bookings} ${group.bookings === 1 ? 'reserva' : 'reservas'}, ${group.seats} ${group.seats === 1 ? 'plaza' : 'plazas'})`;
		return [title, ...group.rows.map(bookingBlock)].join('\n\n');
	});

	return [header, ...sections].join('\n\n\n');
}

const csvColumns: { header: string; value: (row: ManifestRow) => string | number | boolean | null }[] = [
	{ header: 'Producto', value: (row) => row.product_name },
	{ header: 'Salida', value: (row) => shortTime(row.start_time) },
	{ header: 'Código', value: (row) => row.booking_code },
	{ header: 'Cliente', value: (row) => row.lead_name },
	{ header: 'Teléfono', value: (row) => row.lead_phone },
	{ header: 'Email', value: (row) => row.customer_email },
	{ header: 'Adultos', value: (row) => row.adults },
	{ header: 'Niños', value: (row) => row.children },
	{ header: 'Bebés', value: (row) => row.infants },
	{ header: 'Plazas', value: (row) => row.seats },
	{ header: 'Hotel', value: (row) => row.hotel },
	{ header: 'Zona', value: (row) => row.zone },
	{ header: 'Recogida', value: (row) => shortTime(row.pickup_time) ?? 'por confirmar' },
	{ header: 'Suplemento pendiente', value: (row) => (row.pickup_fee_pending ? 'sí' : 'no') },
	{ header: 'Nota de recogida', value: (row) => row.pickup_note },
	{ header: 'Seguro', value: (row) => (row.has_insurance ? 'sí' : 'no') },
	{ header: 'Saldo a cobrar', value: (row) => row.balance_amount.toFixed(2) },
	{ header: 'Moneda', value: (row) => row.currency },
	{ header: 'Enviado al proveedor', value: (row) => row.provider_sent_at },
	{ header: 'Confirmado por el proveedor', value: (row) => row.provider_confirmed_at },
];

const phoneOrNumberPattern = /^[+-]?[\d\s().-]+$/;

function neutralizeFormula(text: string) {
	if (/^[=@\t\r]/.test(text)) return `'${text}`;
	if (/^[+-]/.test(text) && !phoneOrNumberPattern.test(text)) return `'${text}`;
	return text;
}

export function csvCell(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return '';
	const text = neutralizeFormula(String(value));
	return /[",\r\n;]|^\s|\s$/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function manifestCsv(rows: ManifestRow[]): string {
	const lines = [csvColumns.map((column) => csvCell(column.header)).join(',')];
	for (const row of rows) {
		lines.push(csvColumns.map((column) => csvCell(column.value(row))).join(','));
	}
	return `${lines.join('\r\n')}\r\n`;
}
