export type ChartPoint = {
	date: string;
	value: number;
	tooltip: string;
};

export type ChartScale = {
	top: number;
	ticks: number[];
};

export type ColumnGeometry = {
	date: string;
	value: number;
	tooltip: string;
	slotStart: number;
	slotWidth: number;
	center: number;
	barTop: number;
	barHeight: number;
};

export type AxisLabel = {
	text: string;
	x: number;
	anchor: 'start' | 'middle' | 'end';
};

const stepFactors = [1, 2, 5, 10];

export function niceScale(maxValue: number, intervals = 3): ChartScale {
	const safeMax = Math.max(maxValue, 1);
	const roughStep = safeMax / intervals;
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const niceStep = stepFactors.map((factor) => factor * magnitude).find((step) => step >= roughStep) ?? 10 * magnitude;
	const step = Math.max(1, niceStep);
	const top = step * Math.ceil(safeMax / step);
	const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
	return { top, ticks };
}

export function columnGeometry(points: ChartPoint[], scale: ChartScale, plotTop: number, plotHeight: number): ColumnGeometry[] {
	const slotWidth = points.length > 0 ? 100 / points.length : 100;
	return points.map((point, index) => {
		const barHeight = scale.top > 0 ? (point.value / scale.top) * plotHeight : 0;
		return {
			...point,
			slotStart: index * slotWidth,
			slotWidth,
			center: index * slotWidth + slotWidth / 2,
			barTop: plotTop + plotHeight - barHeight,
			barHeight,
		};
	});
}

export function fixedBarWidth(pointCount: number): number | null {
	if (pointCount <= 10) return 20;
	if (pointCount <= 16) return 12;
	if (pointCount <= 31) return 6;
	return null;
}

const axisDayFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const formatAxisDay = (isoDate: string) => axisDayFormatter.format(new Date(`${isoDate}T00:00:00Z`)).replace('.', '');

export function axisLabels(columns: ColumnGeometry[], maxLabels = 5): AxisLabel[] {
	if (columns.length === 0) return [];
	const lastIndex = columns.length - 1;
	const labelCount = Math.min(maxLabels, columns.length);
	const indexes = labelCount === 1 ? [0] : Array.from({ length: labelCount }, (_, position) => Math.round((position * lastIndex) / (labelCount - 1)));

	return [...new Set(indexes)].map((index) => {
		const column = columns[index];
		const text = formatAxisDay(column.date);
		if (columns.length > 1 && index === 0) return { text, x: column.slotStart, anchor: 'start' };
		if (columns.length > 1 && index === lastIndex) return { text, x: column.slotStart + column.slotWidth, anchor: 'end' };
		return { text, x: column.center, anchor: 'middle' };
	});
}
