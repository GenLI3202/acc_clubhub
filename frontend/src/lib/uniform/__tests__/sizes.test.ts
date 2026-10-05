import { describe, expect, it } from 'vitest';

import { SIZES } from '../pricing';
import { SIZE_CHARTS, VEST_MEASUREMENTS, findCell, recommendSize } from '../sizes';

describe('size charts', () => {
    it.each(['men', 'women'] as const)('%s chart has a size (or gap) in every column', (sex) => {
        const chart = SIZE_CHARTS[sex];
        for (const row of chart.rows) {
            expect(row.sizes).toHaveLength(chart.heights.length);
            for (const size of row.sizes) {
                if (size !== null) expect(SIZES).toContain(size);
            }
        }
    });

    it('men cover 155-190 cm and 45-100 kg, women 150-180 cm and 40-80 kg', () => {
        const men = SIZE_CHARTS.men;
        expect(men.heights[0][0]).toBe(155);
        expect(men.heights.at(-1)?.[1]).toBe(190);
        expect(men.rows[0].weight[0]).toBe(45);
        expect(men.rows.at(-1)?.weight[1]).toBe(100);

        const women = SIZE_CHARTS.women;
        expect(women.heights[0][0]).toBe(150);
        expect(women.heights.at(-1)?.[1]).toBe(180);
        expect(women.rows[0].weight[0]).toBe(40);
        expect(women.rows.at(-1)?.weight[1]).toBe(80);
    });
});

describe('recommendSize', () => {
    it('reads the men chart', () => {
        expect(recommendSize('men', 175, 68)).toBe('M');
        expect(recommendSize('men', 158, 62)).toBe('M');
        expect(recommendSize('men', 172, 92)).toBe('3XL');
        expect(recommendSize('men', 188, 98)).toBe('3XL');
    });

    it('reads the women chart', () => {
        expect(recommendSize('women', 162, 52)).toBe('S');
        expect(recommendSize('women', 152, 42)).toBe('XS');
        expect(recommendSize('women', 178, 77)).toBe('XL');
    });

    it('gives no answer where the chart has a gap or the person is out of range', () => {
        expect(recommendSize('men', 156, 97)).toBeNull();
        expect(recommendSize('men', 150, 60)).toBeNull();
        expect(recommendSize('men', 175, 120)).toBeNull();
        expect(recommendSize('women', 152, 77)).toBeNull();
    });

    it('treats a shared band edge as the taller / heavier band', () => {
        // 160 cm sits in 160-165, 65 kg in 65-70
        expect(recommendSize('men', 160, 65)).toBe(recommendSize('men', 162, 67));
    });
});

describe('findCell', () => {
    it('returns the row and column the recommendation comes from', () => {
        // men, 175 cm -> column 4 (175-180), 68 kg -> row 4 (65-70)
        expect(findCell('men', 175, 68)).toEqual({ row: 4, col: 4 });
        expect(findCell('women', 162, 52)).toEqual({ row: 2, col: 2 });
    });

    it('still finds a cell that is a gap in the chart, and null when out of range', () => {
        expect(findCell('men', 156, 97)).toEqual({ row: 10, col: 0 });
        expect(findCell('men', 150, 60)).toBeNull();
        expect(findCell('women', 160, 90)).toBeNull();
    });
});

describe('vest measurements', () => {
    it('lists XS to 3XL in order', () => {
        expect(VEST_MEASUREMENTS.map((row) => row.size)).toEqual([...SIZES]);
    });

    it('grows with every size', () => {
        for (let i = 1; i < VEST_MEASUREMENTS.length; i += 1) {
            expect(VEST_MEASUREMENTS[i].chest).toBeGreaterThan(VEST_MEASUREMENTS[i - 1].chest);
            expect(VEST_MEASUREMENTS[i].backLength).toBeGreaterThan(
                VEST_MEASUREMENTS[i - 1].backLength,
            );
        }
    });

    it('matches the supplied table for M', () => {
        expect(VEST_MEASUREMENTS.find((row) => row.size === 'M')).toEqual({
            size: 'M',
            chest: 101,
            collar: 20,
            hem: 80,
            frontLength: 49,
            backLength: 62.5,
        });
    });
});
