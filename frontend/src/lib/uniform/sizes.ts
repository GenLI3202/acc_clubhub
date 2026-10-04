// src/lib/uniform/sizes.ts
// GRC size charts for the 2026 kit, transcribed from the supplied tables.
// Jersey and bib shorts share one men's and one women's quick-select chart;
// the vest uses the men's chart plus its own garment measurements.

import type { Size } from './pricing';

export type Sex = 'men' | 'women';
type Band = readonly [number, number];

export interface SizeRow {
    /** Body weight band in kg. */
    readonly weight: Band;
    /** One entry per height band; null where the chart leaves a gap. */
    readonly sizes: readonly (Size | null)[];
}

export interface SizeChart {
    /** Height bands in cm. */
    readonly heights: readonly Band[];
    readonly rows: readonly SizeRow[];
}

const _ = null;

const MEN: SizeChart = {
    heights: [[155, 160], [160, 165], [165, 170], [170, 175], [175, 180], [180, 185], [185, 190]],
    rows: [
        { weight: [45, 50], sizes: ['XS', 'XS', _, _, _, _, _] },
        { weight: [50, 55], sizes: ['S', 'XS', 'XS', _, _, _, _] },
        { weight: [55, 60], sizes: ['S', 'S', 'S', 'S', _, _, _] },
        { weight: [60, 65], sizes: ['M', 'S', 'S', 'S', 'S', _, _] },
        { weight: [65, 70], sizes: ['L', 'M', 'M', 'M', 'M', 'M', _] },
        { weight: [70, 75], sizes: ['XL', 'L', 'L', 'L', 'M', 'M', 'M'] },
        { weight: [75, 80], sizes: ['2XL', 'XL', 'XL', 'XL', 'L', 'L', 'L'] },
        { weight: [80, 85], sizes: ['3XL', '2XL', '2XL', '2XL', 'XL', 'XL', 'XL'] },
        { weight: [85, 90], sizes: [_, '3XL', '2XL', '2XL', '2XL', '2XL', '2XL'] },
        { weight: [90, 95], sizes: [_, _, '3XL', '3XL', '3XL', '3XL', '2XL'] },
        { weight: [95, 100], sizes: [_, _, _, '3XL', '3XL', '3XL', '3XL'] },
    ],
};

const WOMEN: SizeChart = {
    heights: [[150, 155], [155, 160], [160, 165], [165, 170], [170, 175], [175, 180]],
    rows: [
        { weight: [40, 45], sizes: ['XS', 'XS', 'XS', _, _, _] },
        { weight: [45, 50], sizes: ['S', 'XS', 'XS', 'XS', _, _] },
        { weight: [50, 55], sizes: ['M', 'S', 'S', 'S', 'XS', _] },
        { weight: [55, 60], sizes: ['L', 'M', 'S', 'S', 'S', 'XS'] },
        { weight: [60, 65], sizes: ['XL', 'L', 'M', 'M', 'M', 'S'] },
        { weight: [65, 70], sizes: [_, 'XL', 'L', 'L', 'M', 'M'] },
        { weight: [70, 75], sizes: [_, _, 'XL', 'L', 'L', 'L'] },
        { weight: [75, 80], sizes: [_, _, _, _, _, 'XL'] },
    ],
};

export const SIZE_CHARTS: Readonly<Record<Sex, SizeChart>> = { men: MEN, women: WOMEN };

export interface VestMeasurement {
    readonly size: Size;
    /** Garment measurements in cm (hand-measured, small tolerance). */
    readonly chest: number;
    readonly collar: number;
    readonly hem: number;
    readonly frontLength: number;
    readonly backLength: number;
}

export const VEST_MEASUREMENTS: readonly VestMeasurement[] = [
    { size: 'XS', chest: 93, collar: 18.5, hem: 72, frontLength: 45, backLength: 58.5 },
    { size: 'S', chest: 97, collar: 19.3, hem: 76, frontLength: 47, backLength: 60.5 },
    { size: 'M', chest: 101, collar: 20, hem: 80, frontLength: 49, backLength: 62.5 },
    { size: 'L', chest: 105, collar: 20.8, hem: 84, frontLength: 51, backLength: 64.5 },
    { size: 'XL', chest: 109, collar: 21.5, hem: 88, frontLength: 53, backLength: 66.5 },
    { size: '2XL', chest: 113, collar: 22.3, hem: 92, frontLength: 55, backLength: 68.5 },
    { size: '3XL', chest: 117, collar: 23, hem: 96, frontLength: 57, backLength: 70.5 },
];

/**
 * Index of the band holding `value`. Bands are half-open ([lo, hi)), so a
 * shared edge belongs to the taller / heavier band; the top edge of the
 * last band is inclusive.
 */
function bandIndex(bands: readonly Band[], value: number): number {
    const last = bands.length - 1;
    return bands.findIndex(
        ([lo, hi], i) => value >= lo && (value < hi || (i === last && value === hi)),
    );
}

export interface ChartCell {
    readonly row: number;
    readonly col: number;
}

/**
 * The chart cell for a height and weight, or null outside the chart. The
 * cell itself can still be a gap — check it with recommendSize.
 */
export function findCell(sex: Sex, heightCm: number, weightKg: number): ChartCell | null {
    const chart = SIZE_CHARTS[sex];
    const col = bandIndex(chart.heights, heightCm);
    const row = bandIndex(
        chart.rows.map((r) => r.weight),
        weightKg,
    );
    return col < 0 || row < 0 ? null : { row, col };
}

/**
 * Size suggested by the quick-select chart, or null when the person falls
 * outside the chart or in one of its gaps.
 */
export function recommendSize(sex: Sex, heightCm: number, weightKg: number): Size | null {
    const cell = findCell(sex, heightCm, weightKg);
    return cell ? SIZE_CHARTS[sex].rows[cell.row].sizes[cell.col] : null;
}
