import type { SupabaseClient } from '@supabase/supabase-js';
import { dbErrorCode } from '../booking/errors';
import type { Database } from '../supabase/types';

type DatabaseFunctions = Database['public']['Functions'];
type RpcRows<FunctionName extends keyof DatabaseFunctions> = DatabaseFunctions[FunctionName]['Returns'];

export type DashboardSummary = RpcRows<'admin_summary'>[number];
export type DailySeriesPoint = RpcRows<'admin_daily_series'>[number];
export type OccupancyRow = RpcRows<'admin_occupancy'>[number];
export type ProductRankingRow = RpcRows<'admin_product_ranking'>[number];
export type SourceRow = RpcRows<'admin_sources'>[number];
export type CouponUsageRow = RpcRows<'admin_coupon_usage'>[number];

export type Dashboard = {
	summary: DashboardSummary | null;
	dailySeries: DailySeriesPoint[];
	occupancy: OccupancyRow[];
	productRanking: ProductRankingRow[];
	sources: SourceRow[];
	couponUsage: CouponUsageRow[];
};

export async function loadDashboard(supabase: SupabaseClient<Database>, from: string, to: string): Promise<Dashboard> {
	const range = { p_from: from, p_to: to };
	const [summary, dailySeries, occupancy, productRanking, sources, couponUsage] = await Promise.all([
		supabase.rpc('admin_summary', range),
		supabase.rpc('admin_daily_series', range),
		supabase.rpc('admin_occupancy', range),
		supabase.rpc('admin_product_ranking', range),
		supabase.rpc('admin_sources', range),
		supabase.rpc('admin_coupon_usage', range),
	]);

	for (const result of [summary, dailySeries, occupancy, productRanking, sources]) {
		if (result.error) throw result.error;
	}
	if (couponUsage.error && dbErrorCode(couponUsage.error) !== 'forbidden') throw couponUsage.error;

	return {
		summary: summary.data?.[0] ?? null,
		dailySeries: dailySeries.data ?? [],
		occupancy: occupancy.data ?? [],
		productRanking: productRanking.data ?? [],
		sources: sources.data ?? [],
		couponUsage: couponUsage.error ? [] : (couponUsage.data ?? []),
	};
}
