import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { galleryFor, type VestColor } from '../gallery';
import { getUniformCopy } from '../copy';
import type { SkuCategory } from '../pricing';

const PUBLIC_DIR = join(__dirname, '../../../../public');
const alt = getUniformCopy('en').shop.imageAlt;

const cases: [SkuCategory, VestColor][] = [
    ['jersey', 'white'],
    ['bib', 'white'],
    ['vest', 'white'],
    ['vest', 'black'],
];

describe('galleryFor', () => {
    it.each(cases)('%s (%s) only points at images that exist', (category, color) => {
        const images = galleryFor(category, color, alt);
        expect(images.length).toBeGreaterThan(0);
        for (const image of images) {
            expect(existsSync(join(PUBLIC_DIR, image.src)), image.src).toBe(true);
            expect(image.alt.length).toBeGreaterThan(0);
        }
    });

    it('opens every gallery on a design drawing for the jersey and bib, the photo for the white vest', () => {
        expect(galleryFor('jersey', 'white', alt)[0].src).toContain('flat-jersey');
        expect(galleryFor('bib', 'white', alt)[0].src).toContain('flat-bib');
        expect(galleryFor('vest', 'white', alt)[0].src).toContain('vest-white-front');
    });

    it('shows the black vest as a design drawing only', () => {
        const images = galleryFor('vest', 'black', alt);
        expect(images).toHaveLength(1);
        expect(images[0].src).toContain('flat-vest-black');
    });

    it('contains drawings and covers photos', () => {
        const images = galleryFor('jersey', 'white', alt);
        expect(images.find((i) => i.src.includes('flat-'))?.fit).toBe('contain');
        expect(images.find((i) => i.src.includes('model-'))?.fit).toBe('cover');
    });
});
