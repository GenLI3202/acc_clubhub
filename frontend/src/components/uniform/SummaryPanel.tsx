import { fill, type UniformCopy } from '../../lib/uniform/copy';
import { displayOptions, isReadyToPay, type OrderState } from '../../lib/uniform/orderState';
import {
    SKUS,
    formatPrice,
    shippingFee,
    type OrderTotals,
    type Size,
    type SkuId,
} from '../../lib/uniform/pricing';

interface SummaryPanelProps {
    copy: UniformCopy;
    order: OrderState;
    totals: OrderTotals;
    step: 'select' | 'pay';
    closed: boolean;
    /** The Google Form is wired in (or this is a dev build), so paying makes sense. */
    formReady: boolean;
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

/** Why Continue is locked right now, or null when it is open. */
function blockedReason(
    copy: UniformCopy,
    order: OrderState,
    closed: boolean,
    formReady: boolean,
): string | null {
    if (closed) return null; // the closed banner already says it
    if (order.lines.length === 0) return copy.summary.continueDisabled;
    if (!isReadyToPay(order)) return copy.summary.chooseFirst;
    if (!formReady) return copy.form.comingSoon;
    return null;
}

export function SummaryPanel({
    copy,
    order,
    totals,
    step,
    closed,
    formReady,
    onRemove,
    onContinue,
    onEdit,
}: SummaryPanelProps) {
    const { summary } = copy;
    const { currency, membership } = displayOptions(order);
    const locked = step === 'pay';
    const empty = order.lines.length === 0;
    const money = (amount: number) => formatPrice(amount, currency);
    const blocked = blockedReason(copy, order, closed, formReady);
    const canContinue = !closed && isReadyToPay(order) && formReady;

    return (
        <aside class="kit-summary" id="kit-summary" aria-labelledby="kit-summary-title">
            <h3 class="kit-summary-title" id="kit-summary-title">
                {summary.title}
            </h3>

            <dl class="kit-choices">
                <div>
                    <dt>{summary.membershipLabel}</dt>
                    <dd>
                        {order.membership === null
                            ? '—'
                            : order.membership === 'member'
                              ? summary.member
                              : summary.nonMember}
                    </dd>
                </div>
                <div>
                    <dt>{summary.currencyLabel}</dt>
                    <dd>
                        {order.currency === null
                            ? '—'
                            : order.currency === 'RMB'
                              ? summary.currencyRmb
                              : summary.currencyEur}
                    </dd>
                </div>
            </dl>

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
                <>
                    <button type="button" class="kit-btn kit-btn--outline kit-wide" onClick={onEdit}>
                        {summary.edit}
                    </button>
                    <p class="kit-note">{copy.pay.editWarning}</p>
                </>
            ) : (
                <>
                    <p class="kit-note kit-fineprint">
                        {summary.fineprint} ·{' '}
                        <a class="kit-link" href="#kit-terms">
                            {summary.termsLink}
                        </a>
                    </p>
                    <button
                        type="button"
                        class="kit-btn kit-btn--solid kit-wide"
                        disabled={!canContinue}
                        onClick={onContinue}
                    >
                        {summary.continue}
                    </button>
                    {blocked && <p class="kit-note">{blocked}</p>}
                </>
            )}
        </aside>
    );
}
