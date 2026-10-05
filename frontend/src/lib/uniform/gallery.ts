// src/lib/uniform/gallery.ts
// Which pictures each product card shows, in order. Design drawings are
// "contain" (the whole garment must stay visible); model photos are "cover".

import type { SkuCategory } from './pricing';

export type VestColor = 'white' | 'black';

export interface GalleryImage {
    readonly src: string;
    readonly alt: string;
    readonly fit: 'cover' | 'contain';
}

interface ImageAlt {
    readonly flat: string;
    readonly front: string;
    readonly back: string;
    readonly left: string;
    readonly right: string;
    readonly selfie: string;
}

const DIR = '/images/uniform';

export function galleryFor(
    category: SkuCategory,
    vestColor: VestColor,
    alt: ImageAlt,
): readonly GalleryImage[] {
    const flat = (name: string): GalleryImage => ({
        src: `${DIR}/${name}.webp`,
        alt: alt.flat,
        fit: 'contain',
    });
    const photo = (name: string, label: string): GalleryImage => ({
        src: `${DIR}/${name}.webp`,
        alt: label,
        fit: 'cover',
    });

    switch (category) {
        case 'jersey':
            return [
                flat('flat-jersey'),
                photo('model-front', alt.front),
                photo('model-back', alt.back),
                photo('model-left', alt.left),
                photo('model-right', alt.right),
                photo('model-selfie', alt.selfie),
            ];
        case 'bib':
            return [
                flat('flat-bib'),
                photo('model-selfie', alt.selfie),
                photo('model-back', alt.back),
                photo('model-front', alt.front),
            ];
        case 'vest':
            return vestColor === 'white'
                ? [
                      photo('vest-white-front', alt.front),
                      photo('vest-white-back', alt.back),
                      flat('flat-vest-white'),
                  ]
                : [flat('flat-vest-black')];
    }
}
