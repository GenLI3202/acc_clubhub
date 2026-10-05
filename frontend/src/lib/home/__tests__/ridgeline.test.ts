import { describe, expect, it } from 'vitest';

import { ridgePath, ridgePoints } from '../ridgeline';

const options = { startX: 100, endX: 1100, baseY: 500, amplitude: 120, peaks: 6, seed: 7 };

describe('ridgePoints', () => {
    it('runs from startX to endX, left to right', () => {
        const points = ridgePoints(options);
        expect(points[0][0]).toBe(100);
        expect(points[points.length - 1][0]).toBe(1100);
        for (let i = 1; i < points.length; i++) {
            expect(points[i][0]).toBeGreaterThan(points[i - 1][0]);
        }
    });

    it('keeps every point between the peak height and the base line', () => {
        for (const [, y] of ridgePoints(options)) {
            expect(y).toBeGreaterThanOrEqual(500 - 120);
            expect(y).toBeLessThanOrEqual(500);
        }
    });

    it('draws the same ridge for the same seed, a different one for another', () => {
        expect(ridgePoints(options)).toEqual(ridgePoints(options));
        expect(ridgePoints({ ...options, seed: 8 })).not.toEqual(ridgePoints(options));
    });
});

describe('ridgePath', () => {
    it('is an SVG path that starts with a move and continues with lines', () => {
        const path = ridgePath(options);
        expect(path).toMatch(/^M100 [\d.]+( L[\d.]+ [\d.]+)+$/);
    });
});
