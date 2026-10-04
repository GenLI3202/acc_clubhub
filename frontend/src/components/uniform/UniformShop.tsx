import { useEffect, useMemo, useState } from 'preact/hooks';

import { fill, getUniformCopy } from '../../lib/uniform/copy';
import { FORM_CONFIG, isFormConfigured } from '../../lib/uniform/form';
import {
    EMPTY_ORDER,
    addLine,
    codeFor,
    displayOptions,
    isReadyToPay,
    parseSavedOrder,
    removeLine,
    serializeOrder,
    setCurrency,
    setMembership,
    type OrderState,
} from '../../lib/uniform/orderState';
import {
    computeTotals,
    formatPrice,
    generateOrderCode,
    isOrderClosed,
    type SkuCategory,
} from '../../lib/uniform/pricing';
import type { Locale } from '../../lib/i18n';
import { OrderOptions } from './OrderOptions';
import { PayStep } from './PayStep';
import { ProductCard } from './ProductCard';
import { SummaryPanel } from './SummaryPanel';
import './uniform.css';

const STORAGE_KEY = 'acc-kit-2026-order';
const CATEGORIES: readonly SkuCategory[] = ['jersey', 'bib', 'vest'];

type Step = 'select' | 'pay';

interface UniformShopProps {
    lang: Locale;
}

function loadSaved(): OrderState | null {
    try {
        return parseSavedOrder(window.sessionStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

function save(order: OrderState): void {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, serializeOrder(order));
    } catch {
        // Private mode or blocked storage: the basket just won't survive a refresh.
    }
}

function scrollToShop(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
        .getElementById('kit-shop')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function UniformShop({ lang }: UniformShopProps) {
    const copy = getUniformCopy(lang);
    const [order, setOrder] = useState<OrderState>(EMPTY_ORDER);
    const [step, setStep] = useState<Step>('select');
    const [closed, setClosed] = useState(false);
    const [ready, setReady] = useState(false);

    // Paying only makes sense once buyers can also submit the form. Dev builds
    // skip the check so the payment step can be previewed before it is wired.
    const formReady = isFormConfigured(FORM_CONFIG) || import.meta.env.DEV;

    // The page is prerendered, so anything that depends on "now" or on the
    // visitor's browser storage is decided after hydration.
    useEffect(() => {
        setClosed(isOrderClosed());
        const saved = loadSaved();
        if (saved) setOrder(saved);
        setReady(true);
    }, []);

    useEffect(() => {
        if (ready) save(order);
    }, [order, ready]);

    // Until the buyer has chosen, prices are shown as non-member / EUR. Totals
    // never reach a code or the form link in that state (see isReadyToPay).
    const { membership, currency } = displayOptions(order);
    const totals = useMemo(
        () => computeTotals(order.lines, membership, currency),
        [order.lines, membership, currency],
    );

    function goToPay() {
        if (closed || !formReady || !isReadyToPay(order)) return;
        setOrder((current) => codeFor(current, generateOrderCode));
        setStep('pay');
        scrollToShop();
    }

    function goToSelect() {
        setStep('select');
        scrollToShop();
    }

    return (
        <div class="kit-shop" id="kit-shop">
            <header class="kit-shop-head">
                <p class="kit-eyebrow">{copy.shop.eyebrow}</p>
                <h2 class="kit-h2">{step === 'select' ? copy.shop.title : copy.shop.payTitle}</h2>
                {step === 'select' && <p class="kit-lede">{copy.shop.intro}</p>}
                <ol class="kit-steps" aria-label={copy.shop.eyebrow}>
                    {copy.summary.steps.map((label, i) => {
                        const status =
                            step === 'select'
                                ? i === 0
                                    ? 'current'
                                    : 'todo'
                                : i === 0
                                  ? 'done'
                                  : i === 1
                                    ? 'current'
                                    : 'todo';
                        return (
                            <li
                                key={label}
                                class={`kit-step is-${status}`}
                                aria-current={status === 'current' ? 'step' : undefined}
                            >
                                <span class="kit-step-no">{status === 'done' ? '✓' : i + 1}</span>
                                {label}
                            </li>
                        );
                    })}
                </ol>
                {step === 'select' && (
                    <OrderOptions
                        copy={copy}
                        order={order}
                        onMembership={(value) => setOrder((current) => setMembership(current, value))}
                        onCurrency={(value) => setOrder((current) => setCurrency(current, value))}
                    />
                )}
            </header>

            {closed && (
                <div class="kit-closed" role="status">
                    <strong>{copy.closed.title}</strong>
                    <p>{copy.closed.body}</p>
                </div>
            )}

            <div class="kit-shop-grid">
                <div class="kit-shop-main">
                    {step === 'select' ? (
                        CATEGORIES.map((category) => (
                            <ProductCard
                                key={category}
                                category={category}
                                copy={copy}
                                membership={order.membership}
                                currency={currency}
                                closed={closed}
                                onAdd={(line) => setOrder((current) => addLine(current, line))}
                            />
                        ))
                    ) : (
                        <PayStep copy={copy} order={order} totals={totals} />
                    )}
                </div>

                <SummaryPanel
                    copy={copy}
                    order={order}
                    totals={totals}
                    step={step}
                    closed={closed}
                    formReady={formReady}
                    onRemove={(sku, size) => setOrder((current) => removeLine(current, sku, size))}
                    onContinue={goToPay}
                    onEdit={goToSelect}
                />
            </div>

            {step === 'select' && totals.pieces > 0 && (
                <a class="kit-mobile-bar" href="#kit-summary">
                    <span>
                        {fill(copy.summary.pieces, { n: totals.pieces })} ·{' '}
                        <strong>{formatPrice(totals.total, currency)}</strong>
                    </span>
                    <span class="kit-mobile-bar-cta">{copy.summary.mobileBar}</span>
                </a>
            )}
        </div>
    );
}
