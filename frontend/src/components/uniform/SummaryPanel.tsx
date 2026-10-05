import { fill, type UniformCopy } from '../../lib/uniform/copy';
import { splitOrderLines } from '../../lib/uniform/form';
import { displayOptions, isReadyToPay, type OrderState } from '../../lib/uniform/orderState';
import {
    MAX_QTY_PER_LINE,
    SKUS,
    formatPrice,
    shippingFee,
    type Cut,
    type OrderLine,
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
    /** One click on − or + changes a line by one piece; at zero the line disappears. */
    onChangeQty: (sku: SkuId, cut: Cut, size: Size, delta: number) => void;
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
    onChangeQty,
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
    const hasExtras = splitOrderLines(order.lines).extras.length > 0;
    const cutName = (cut: Cut) => (cut === 'men' ? copy.shop.cutMen : copy.shop.cutWomen);
    const itemLabel = (line: OrderLine) =>
        `${lineName(copy, line.sku)} · ${cutName(line.cut)} ${line.size}`;

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
                            <li key={`${line.sku}-${line.cut}-${line.size}`} class="kit-line">
                                <div>
                                    <p class="kit-line-name">
                                        {lineName(copy, line.sku)} ·{' '}
                                        {line.cut === 'men' ? copy.shop.cutMen : copy.shop.cutWomen}
                                    </p>
                                    <p class="kit-line-meta">
                                        {locked ? `${line.size} × ${line.qty}` : line.size}
                                    </p>
                                </div>
                                <div class="kit-line-side">
                                    <span>{money(price)}</span>
                                    {!locked && (
                                        <div class="kit-stepper kit-stepper--line" role="group">
                                            <button
                                                type="button"
                                                aria-label={`${line.qty === 1 ? summary.remove : summary.decrease}: ${itemLabel(line)}`}
                                                onClick={() => onChangeQty(line.sku, line.cut, line.size, -1)}
                                            >
                                                −
                                            </button>
                                            <output aria-live="polite">{line.qty}</output>
                                            <button
                                                type="button"
                                                aria-label={`${summary.increase}: ${itemLabel(line)}`}
                                                disabled={line.qty >= MAX_QTY_PER_LINE}
                                                onClick={() => onChangeQty(line.sku, line.cut, line.size, 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {hasExtras && <p class="kit-note">{summary.extrasNote}</p>}

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
                    <button type="button" class="kit-btn kit-btn--edit kit-wide" onClick={onEdit}>
                        <span aria-hidden="true">←</span> {summary.edit}
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
