// src/lib/home/ridgeline.ts
// Jagged Alpine ridgelines for the ink-wash art on the home hero's kit slide.
// Seeded, so the same mountains are drawn on every build and every visit.

export interface RidgeOptions {
    readonly startX: number;
    readonly endX: number;
    /** The line never drops below this y (SVG y grows downwards). */
    readonly baseY: number;
    /** The highest peak rises at most this far above baseY. */
    readonly amplitude: number;
    readonly peaks: number;
    readonly seed: number;
}

export type Point = readonly [number, number];

/** Small deterministic PRNG (mulberry32), returns numbers in [0, 1). */
function random(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Peaks and valleys alternate; each slope gets two small kinks so the line
 * reads as rock, not as a smooth wave.
 */
export function ridgePoints({ startX, endX, baseY, amplitude, peaks, seed }: RidgeOptions): Point[] {
    const next = random(seed);
    const top = baseY - amplitude;
    const clampY = (y: number): number => round(Math.min(baseY, Math.max(top, y)));

    const anchors = peaks * 2;
    const step = (endX - startX) / anchors;
    const keys: Point[] = [[startX, clampY(baseY - amplitude * 0.15 * next())]];
    for (let i = 1; i <= anchors; i++) {
        const isPeak = i % 2 === 1;
        const x = i === anchors ? endX : startX + step * (i + (next() - 0.5) * 0.5);
        const y = isPeak
            ? baseY - amplitude * (0.45 + 0.55 * next())
            : baseY - amplitude * (0.05 + 0.25 * next());
        keys.push([round(x), clampY(y)]);
    }

    const points: Point[] = [keys[0]];
    for (let i = 1; i < keys.length; i++) {
        const [x0, y0] = keys[i - 1];
        const [x1, y1] = keys[i];
        for (const share of [1 / 3, 2 / 3]) {
            const x = x0 + (x1 - x0) * share;
            const y = y0 + (y1 - y0) * share + (next() - 0.5) * amplitude * 0.12;
            points.push([round(x), clampY(y)]);
        }
        points.push(keys[i]);
    }
    return points;
}

export function ridgePath(options: RidgeOptions): string {
    const [first, ...rest] = ridgePoints(options);
    return `M${first[0]} ${first[1]}` + rest.map(([x, y]) => ` L${x} ${y}`).join('');
}
