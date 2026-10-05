import { useEffect, useState } from 'preact/hooks';

import type { GalleryImage } from '../../lib/uniform/gallery';

interface ProductGalleryProps {
    images: readonly GalleryImage[];
    /** Badge text on model photos (they show a sample, not the final kit). */
    sampleLabel: string;
}

export function ProductGallery({ images, sampleLabel }: ProductGalleryProps) {
    const [index, setIndex] = useState(0);

    // A different image set (the vest colour changed) starts from its first picture.
    const signature = images.map((image) => image.src).join('|');
    useEffect(() => setIndex(0), [signature]);

    const current = images[Math.min(index, images.length - 1)];

    return (
        <div class="kit-gallery">
            <div
                class={`kit-gallery-stage kit-fit-${current.fit}`}
                data-sample={current.fit === 'cover' ? sampleLabel : undefined}
            >
                <img class="kit-gallery-img" src={current.src} alt={current.alt} decoding="async" />
            </div>
            {images.length === 1 && <div class="kit-gallery-thumbs" aria-hidden="true" />}
            {images.length > 1 && (
                <ul class="kit-gallery-thumbs">
                    {images.map((image, i) => (
                        <li key={image.src}>
                            <button
                                type="button"
                                class={`kit-thumb kit-fit-${image.fit}`}
                                aria-label={image.alt}
                                aria-current={i === index ? 'true' : undefined}
                                onClick={() => setIndex(i)}
                            >
                                <img src={image.src} alt="" loading="lazy" decoding="async" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
