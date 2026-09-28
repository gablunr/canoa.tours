import { supabaseAdmin } from '../supabase/admin';
import type { BookingEmailKind } from './booking-emails';

export async function claimBookingEmail(bookingId: string, kind: BookingEmailKind): Promise<boolean> {
	const { error } = await supabaseAdmin.from('booking_email_claims').insert({ booking_id: bookingId, kind });
	if (!error) return true;
	if (error.code === '23505') return false;
	throw error;
}

export async function releaseBookingEmailClaim(bookingId: string, kind: BookingEmailKind) {
	const { error } = await supabaseAdmin.from('booking_email_claims').delete().eq('booking_id', bookingId).eq('kind', kind);
	if (error) console.error('booking_email_claim_not_released', { bookingId, kind, error });
}
