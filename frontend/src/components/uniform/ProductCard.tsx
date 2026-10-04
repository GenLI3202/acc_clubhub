import { useEffect, useRef, useState } from 'preact/hooks';

import type { UniformCopy } from '../../lib/uniform/copy';
import { galleryFor, type VestColor } from '../../lib/uniform/gallery';
import {
    MAX_QTY_PER_LINE,
    SIZES,
    SKUS,
    formatPrice,
    type Currency,
    type Cut,
    type Membership,
    type OrderLine,
    type Size,
    type Sku,
    type SkuCategory,
} from '../../lib/uniform/pricing';
import { ProductGallery } from './ProductGallery';
import { RadioGroup } from './RadioGroup';

interface ProductCardProps {
    category: SkuCategory;
    copy: UniformCopy;
    /** null until the buyer has chosen: then no price is singled out. */
    membership: Membership | null;
    currency: Currency;
    closed: boolean;
    onAdd: (line: OrderLine) => void;
}

const ADDED_FEEDBACK_MS = 1800;

function skuFor(category: SkuCategory, color: VestColor): Sku {
    const id = category === 'vest' ? `vest-${color}` : category;
    const sku = SKUS.find((candidate) => candidate.id === id);
    if (!sku) throw new RangeError(`No SKU for ${id}`);
    return sku;
}

export function ProductCard({ category, copy, membership, currency, closed, onAdd }: ProductCardProps) {
    const { shop } = copy;
    const product = shop.products[category];
    const [cut, setCut] = useState<Cut | null>(null);
    const [size, setSize] = useState<Size | null>(null);
    const [qty, setQty] = useState(1);
    const [color, setColor] = useState<VestColor>('white');
    const [added, setAdded] = useState<string | null>(null);
    const flashTimer = useRef<number>();

    useEffect(() => () => window.clearTimeout(flashTimer.current), []);

    const sku = skuFor(category, color);
    const images = galleryFor(category, color, shop.imageAlt);
    const productLabel =
        category === 'vest' ? `${product.name} · ${color === 'white' ? shop.vestWhite : shop.vestBlack}` : product.name;

    function add() {
        if (!cut || !size || closed || added) return;
        onAdd({ sku: sku.id, cut, size, qty });
        setAdded(`${productLabel} · ${cut === 'men' ? shop.cutMen : shop.cutWomen} ${size} × ${qty}`);
        setQty(1);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setAdded(null), ADDED_FEEDBACK_MS);
    }

    const missingChoice = !cut || !size;
    const statusText = added ? `${shop.added}: ${added}` : missingChoice && !closed ? shop.selectSize : '';

    return (
        <article class="kit-card" id={`kit-${category}`}>
            <ProductGallery images={images} sampleLabel={shop.sampleBadge} />

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
                    <>
                        <RadioGroup
                            name="kit-vest-color"
                            legend={shop.vestColorLabel}
                            value={color}
                            onChange={setColor}
                            variant="segment"
                            options={[
                                { value: 'white', label: shop.vestWhite, swatch: 'white' },
                                { value: 'black', label: shop.vestBlack, swatch: 'black' },
                            ]}
                        />
                        {color === 'white' && <p class="kit-note kit-note--tight">{shop.vestNote}</p>}
                    </>
                )}

                <RadioGroup
                    name={`kit-cut-${category}`}
                    legend={shop.cutLabel}
                    value={cut}
                    onChange={setCut}
                    variant="segment"
                    options={[
                        { value: 'men', label: shop.cutMen },
                        { value: 'women', label: shop.cutWomen },
                    ]}
                />
                <p class="kit-note kit-note--tight">{shop.cutHint}</p>

                <RadioGroup
                    name={`kit-size-${category}`}
                    legend={shop.sizeLabel}
                    value={size}
                    onChange={setSize}
                    variant="chip"
                    options={SIZES.map((value) => ({ value, label: value }))}
                />
                <p class="kit-note kit-note--tight">
                    <a class="kit-link" href="#size-guide">
                        {shop.sizeGuideLink}
                    </a>
                </p>
                {product.tip && <p class="kit-note kit-note--tight">{product.tip}</p>}

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
                        disabled={missingChoice || closed || added !== null}
                        onClick={add}
                    >
                        {closed ? copy.closed.title : added ? `✓ ${shop.added}` : shop.add}
                    </button>
                </div>
                <p class="kit-flash" role="status" aria-live="polite">
                    {statusText}
                </p>
            </div>
        </article>
    );
}
