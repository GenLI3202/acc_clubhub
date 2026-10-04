import { useEffect, useRef, useState } from 'preact/hooks';

import type { UniformCopy } from '../../lib/uniform/copy';
import { galleryFor, type VestColor } from '../../lib/uniform/gallery';
import {
    MAX_QTY_PER_LINE,
    SIZES,
    SKUS,
    formatPrice,
    type Currency,
    type Membership,
    type OrderLine,
    type Size,
    type Sku,
    type SkuCategory,
} from '../../lib/uniform/pricing';
import { ProductGallery } from './ProductGallery';

interface ProductCardProps {
    category: SkuCategory;
    copy: UniformCopy;
    membership: Membership;
    currency: Currency;
    closed: boolean;
    onAdd: (line: OrderLine) => void;
}

function skuFor(category: SkuCategory, color: VestColor): Sku {
    const id = category === 'vest' ? `vest-${color}` : category;
    const sku = SKUS.find((candidate) => candidate.id === id);
    if (!sku) throw new RangeError(`No SKU for ${id}`);
    return sku;
}

export function ProductCard({ category, copy, membership, currency, closed, onAdd }: ProductCardProps) {
    const { shop } = copy;
    const product = shop.products[category];
    const [size, setSize] = useState<Size | null>(null);
    const [qty, setQty] = useState(1);
    const [color, setColor] = useState<VestColor>('white');
    const [justAdded, setJustAdded] = useState(false);
    const flashTimer = useRef<number>();

    useEffect(() => () => window.clearTimeout(flashTimer.current), []);

    const sku = skuFor(category, color);
    const images = galleryFor(category, color, shop.imageAlt);

    function add() {
        if (!size || closed) return;
        onAdd({ sku: sku.id, size, qty });
        setQty(1);
        setJustAdded(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setJustAdded(false), 2200);
    }

    return (
        <article class="kit-card" id={`kit-${category}`}>
            <ProductGallery images={images} />

            <div class="kit-card-body">
                <h3 class="kit-card-name">{product.name}</h3>
                <p class="kit-card-tagline">{product.tagline}</p>

                <dl class="kit-prices">
                    {(['member', 'non-member'] as const).map((tier) => (
                        <div key={tier} class={tier === membership ? 'is-current' : undefined}>
                            <dt>{tier === 'member' ? shop.priceMember : shop.priceNonMember}</dt>
                            <dd>{formatPrice(sku.prices[tier][currency], currency)}</dd>
                        </div>
                    ))}
                </dl>

                <ul class="kit-bullets">
                    {product.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                    ))}
                </ul>

                {category === 'vest' && (
                    <fieldset class="kit-field">
                        <legend class="kit-field-label">{shop.vestColorLabel}</legend>
                        <div class="kit-segment" role="radiogroup" aria-label={shop.vestColorLabel}>
                            {(['white', 'black'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={color === value}
                                    class="kit-segment-btn"
                                    onClick={() => setColor(value)}
                                >
                                    <span class={`kit-swatch kit-swatch--${value}`} aria-hidden="true" />
                                    {value === 'white' ? shop.vestWhite : shop.vestBlack}
                                </button>
                            ))}
                        </div>
                        {color === 'white' && <p class="kit-note">{shop.vestNote}</p>}
                    </fieldset>
                )}

                <fieldset class="kit-field">
                    <div class="kit-field-head">
                        <legend class="kit-field-label">{shop.sizeLabel}</legend>
                        <a class="kit-link" href="#size-guide">
                            {shop.sizeGuideLink}
                        </a>
                    </div>
                    <div class="kit-chips" role="radiogroup" aria-label={shop.sizeLabel}>
                        {SIZES.map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={size === value}
                                class="kit-chip"
                                onClick={() => setSize(value)}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    {product.tip && <p class="kit-note">{product.tip}</p>}
                </fieldset>

                <div class="kit-actions">
                    <div class="kit-stepper" role="group" aria-label={shop.qtyLabel}>
                        <button
                            type="button"
                            aria-label={`${shop.qtyLabel} −`}
                            disabled={qty <= 1}
                            onClick={() => setQty(qty - 1)}
                        >
                            −
                        </button>
                        <output aria-live="polite">{qty}</output>
                        <button
                            type="button"
                            aria-label={`${shop.qtyLabel} +`}
                            disabled={qty >= MAX_QTY_PER_LINE}
                            onClick={() => setQty(qty + 1)}
                        >
                            +
                        </button>
                    </div>
                    <button
                        type="button"
                        class="kit-btn kit-btn--solid kit-add"
                        disabled={!size || closed}
                        onClick={add}
                    >
                        {closed ? copy.closed.title : shop.add}
                    </button>
                </div>
                <p class="kit-flash" role="status" aria-live="polite">
                    {justAdded ? shop.added : !size && !closed ? shop.selectSize : ''}
                </p>
            </div>
        </article>
    );
}
