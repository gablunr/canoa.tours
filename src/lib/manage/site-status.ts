import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

export type SiteState = 'live' | 'updating' | 'stale';

export type SiteStatusSnapshot = {
	state: SiteState;
	buildStartedAt: string;
	latestRequestAt: string | null;
};

export const rebuildWindowMs = 10 * 60 * 1000;

export const siteStatusPollMs = 20 * 1000;

export function currentBuildStartedAt(): string {
	return __BUILD_STARTED_AT__;
}

export function siteStatus({ buildStartedAt, latestRequestAt, now }: { buildStartedAt: string; latestRequestAt: string | null; now: Date }): SiteState {
	if (!latestRequestAt) return 'live';
	const requestedAt = Date.parse(latestRequestAt);
	if (Number.isNaN(requestedAt) || requestedAt <= Date.parse(buildStartedAt)) return 'live';
	return now.getTime() - requestedAt < rebuildWindowMs ? 'updating' : 'stale';
}

export function hasPendingChanges(updatedAt: string | null | undefined, buildStartedAt: string = currentBuildStartedAt()): boolean {
	if (!updatedAt) return false;
	const changedAt = Date.parse(updatedAt);
	return !Number.isNaN(changedAt) && changedAt > Date.parse(buildStartedAt);
}

export async function loadSiteStatus(supabase: SupabaseClient<Database>, now = new Date()): Promise<SiteStatusSnapshot> {
	const buildStartedAt = currentBuildStartedAt();
	const { data, error } = await supabase.from('site_rebuilds').select('requested_at').order('requested_at', { ascending: false }).limit(1).maybeSingle();
	if (error) throw error;
	const latestRequestAt = data?.requested_at ?? null;
	return { state: siteStatus({ buildStartedAt, latestRequestAt, now }), buildStartedAt, latestRequestAt };
}
