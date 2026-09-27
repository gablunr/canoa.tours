import type { ImageMetadata } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findTourDetails, tourPhoto, type TourDetails } from '../../data/tours/tours';
import type { DestinationId } from '../../data/tours/destinations';
import { loadBookingDetails, shortTime, spanishTranslation, tourPathFor, type BookingDetails } from '../booking/booking-details';
import { supabaseAdmin } from '../supabase/admin';
import type { BookingStatus, Database } from '../supabase/types';

export interface CustomerBooking {
	code: string;
	status: BookingStatus;
	tourDate: string;
	productKey: string;
	productName: string;
	tourPath: string;
	startTime: string;
	pickupTo: string | null;
	pickupTime: string | null;
	adults: number;
	children: number;
	infants: number;
	hasReview: boolean;
}

const statusesShownToCustomers: BookingStatus[] = ['confirmed', 'completed', 'no_show', 'cancelled'];

export const bookingStatusLabels: Record<BookingStatus, string> = {
	pending_payment: 'Pago pendiente',
	expired: 'Sin pagar',
	confirmed: 'Confirmada',
	cancelled: 'Cancelada',
	completed: 'Realizada',
	no_show: 'No presentado',
};

const santoDomingoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' });

export const localToday = () => santoDomingoDate.format(new Date());

const tourDateFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatBookingDate = (isoDate: string) => {
	const formatted = tourDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const tourDayFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export const formatTourDay = (isoDate: string, today = localToday()) => {
	if (isoDate.slice(0, 4) !== today.slice(0, 4)) return formatBookingDate(isoDate);
	const formatted = tourDayFormatter.format(new Date(`${isoDate}T00:00:00Z`));
	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export function suggestedAuthorName(fullName: string) {
	const [first = '', ...rest] = fullName.trim().split(/\s+/);
	return rest.length > 0 ? `${first} ${rest.at(-1)?.charAt(0).toUpperCase()}.` : first;
}

export function bookingTourDetails(productKey: string): TourDetails | undefined {
	const [destinationId, tourSlug] = productKey.split('/');
	if (!destinationId || !tourSlug) return undefined;
	try {
		return findTourDetails(destinationId as DestinationId, tourSlug);
	} catch {
		return undefined;
	}
}

export function bookingPhoto(productKey: string): ImageMetadata | undefined {
	const tour = bookingTourDetails(productKey);
	return tour ? tourPhoto(tour) : undefined;
}

export function isUpcoming(booking: Pick<CustomerBooking, 'status' | 'tourDate'>, today = localToday()) {
	return booking.status === 'confirmed' && booking.tourDate >= today;
}

export interface CustomerProfile {
	id: string;
	fullName: string;
	phone: string | null;
	country: string | null;
	createdAt: string;
}

export async function loadCustomerProfile(supabase: SupabaseClient<Database>, userId: string): Promise<CustomerProfile | null> {
	const { data, error } = await supabase
		.from('customers')
		.select('id, full_name, phone, country, created_at')
		.eq('auth_user_id', userId)
		.maybeSingle();
	if (error) throw error;
	return data ? { id: data.id, fullName: data.full_name, phone: data.phone, country: data.country, createdAt: data.created_at } : null;
}

export async function loadCustomerBookings(supabase: SupabaseClient<Database>, customerId: string): Promise<CustomerBooking[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'code, status, tour_date, adults, children, infants, pickup_time, products ( key, destination_slug, product_translations ( locale, name, slug ) ), product_schedules ( start_time, pickup_to ), reviews!reviews_booking_id_fkey ( id )',
		)
		.eq('customer_id', customerId)
		.in('status', statusesShownToCustomers)
		.order('tour_date', { ascending: true });

	if (error) throw error;

	return (data ?? []).map((row) => {
		const translation = spanishTranslation(row.products?.product_translations);
		const productKey = row.products?.key ?? '';
		return {
			code: row.code,
			status: row.status,
			tourDate: row.tour_date,
			productKey,
			productName: translation?.name ?? productKey,
			tourPath: row.products && translation ? tourPathFor(row.products.destination_slug, translation.slug) : '/excursiones',
			startTime: shortTime(row.product_schedules?.start_time ?? null) ?? '',
			pickupTo: shortTime(row.product_schedules?.pickup_to ?? null),
			pickupTime: shortTime(row.pickup_time),
			adults: row.adults,
			children: row.children,
			infants: row.infants,
			hasReview: Boolean(row.reviews),
		};
	});
}

export async function customerIdForUser(userId: string): Promise<string | null> {
	const { data, error } = await supabaseAdmin.from('customers').select('id').eq('auth_user_id', userId).maybeSingle();
	if (error) throw error;
	return data?.id ?? null;
}

export function isBookingOwner(details: BookingDetails, customerId: string | null, email: string) {
	return (customerId !== null && details.customerId === customerId) || details.customerEmail.toLowerCase() === email.toLowerCase();
}

export async function findOwnedBooking(user: { id: string; email?: string | null }, code: string): Promise<BookingDetails | null> {
	const details = await loadBookingDetails({ code });
	if (!details) return null;
	const customerId = await customerIdForUser(user.id);
	return isBookingOwner(details, customerId, user.email ?? '') ? details : null;
}

export async function bookingHasReview(bookingId: string): Promise<boolean> {
	const { count, error } = await supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }).eq('booking_id', bookingId);
	if (error) throw error;
	return (count ?? 0) > 0;
}

export async function refundedAmount(bookingId: string): Promise<number> {
	const { data, error } = await supabaseAdmin
		.from('payments')
		.select('amount')
		.eq('booking_id', bookingId)
		.eq('kind', 'refund')
		.eq('status', 'succeeded');
	if (error) throw error;
	return (data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
}
