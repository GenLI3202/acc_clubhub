import { fill, type UniformCopy } from '../../lib/uniform/copy';
import type { OrderState } from '../../lib/uniform/orderState';
import {
    SKUS,
    formatPrice,
    shippingFee,
    type Currency,
    type Membership,
    type OrderTotals,
    type SkuId,
    type Size,
} from '../../lib/uniform/pricing';

interface SummaryPanelProps {
    copy: UniformCopy;
    order: OrderState;
    totals: OrderTotals;
    step: 'select' | 'pay';
    closed: boolean;
    onMembership: (membership: Membership) => void;
    onCurrency: (currency: Currency) => void;
    onRemove: (sku: SkuId, size: Size) => void;
    onContinue: () => void;
    onEdit: () => void;
}

function lineName(copy: UniformCopy, sku: SkuId): string {
    const { products, vestWhite, vestBlack } = copy.shop;
    switch (sku) {
        case 'jersey':
            return products.jersey.name;
        case 'bib':
            return products.bib.name;
        case 'vest-white':
            return `${products.vest.name} · ${vestWhite}`;
        case 'vest-black':
            return `${products.vest.name} · ${vestBlack}`;
    }
}

interface SegmentProps<T extends string> {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    disabled: boolean;
    onChange: (value: T) => void;
}

function Segment<T extends string>({ label, value, options, disabled, onChange }: SegmentProps<T>) {
    return (
        <div class="kit-field">
            <span class="kit-field-label">{label}</span>
            <div class="kit-segment" role="radiogroup" aria-label={label}>
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        class="kit-segment-btn"
                        aria-checked={value === option.value}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function SummaryPanel({
    copy,
    order,
    totals,
    step,
    closed,
    onMembership,
    onCurrency,
    onRemove,
    onContinue,
    onEdit,
}: SummaryPanelProps) {
    const { summary } = copy;
    const { currency, membership } = order;
    const locked = step === 'pay';
    const empty = order.lines.length === 0;
    const money = (amount: number) => formatPrice(amount, currency);

    return (
        <aside class="kit-summary" id="kit-summary" aria-labelledby="kit-summary-title">
            <h3 class="kit-summary-title" id="kit-summary-title">
                {summary.title}
            </h3>

            <Segment
                label={summary.membershipLabel}
                value={membership}
                disabled={locked}
                onChange={onMembership}
                options={[
                    { value: 'member', label: summary.member },
                    { value: 'non-member', label: summary.nonMember },
                ]}
            />
            <p class="kit-note">{summary.membershipHint}</p>

            <Segment
                label={summary.currencyLabel}
                value={currency}
                disabled={locked}
                onChange={onCurrency}
                options={[
                    { value: 'RMB', label: summary.currencyRmb },
                    { value: 'EUR', label: summary.currencyEur },
                ]}
            />

            {empty ? (
                <p class="kit-empty">{summary.empty}</p>
            ) : (
                <ul class="kit-lines">
                    {order.lines.map((line) => {
                        const sku = SKUS.find((candidate) => candidate.id === line.sku);
                        const price = sku ? sku.prices[membership][currency] * line.qty : 0;
                        return (
                            <li key={`${line.sku}-${line.size}`} class="kit-line">
                                <div>
                                    <p class="kit-line-name">{lineName(copy, line.sku)}</p>
                                    <p class="kit-line-meta">
                                        {line.size} × {line.qty}
                                    </p>
                                </div>
                                <div class="kit-line-side">
                                    <span>{money(price)}</span>
                                    {!locked && (
                                        <button
                                            type="button"
                                            class="kit-link"
                                            aria-label={`${summary.remove}: ${lineName(copy, line.sku)} ${line.size}`}
                                            onClick={() => onRemove(line.sku, line.size)}
                                        >
                                            {summary.remove}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!empty && (
                <dl class="kit-totals" aria-live="polite">
                    <div>
                        <dt>{summary.subtotal}</dt>
                        <dd>
                            {fill(summary.pieces, { n: totals.pieces })} · {money(totals.subtotal)}
                        </dd>
                    </div>
                    <div>
                        <dt>{summary.transfer}</dt>
                        <dd>{money(totals.shipping)}</dd>
                    </div>
                    <div class="kit-total">
                        <dt>{summary.total}</dt>
                        <dd>{money(totals.total)}</dd>
                    </div>
                </dl>
            )}
            <p class="kit-note">
                {fill(summary.transferHint, {
                    single: money(shippingFee(1, currency)),
                    each: money(shippingFee(2, currency) / 2),
                })}
            </p>

            {locked ? (
                <button type="button" class="kit-btn kit-btn--outline kit-wide" onClick={onEdit}>
                    {summary.edit}
                </button>
            ) : (
                <>
                    <button
                        type="button"
                        class="kit-btn kit-btn--solid kit-wide"
                        disabled={empty || closed}
                        onClick={onContinue}
                    >
                        {summary.continue}
                    </button>
                    {empty && !closed && <p class="kit-note">{summary.continueDisabled}</p>}
                </>
            )}
        </aside>
    );
}
