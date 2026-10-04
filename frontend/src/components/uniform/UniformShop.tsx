import { useEffect, useMemo, useState } from 'preact/hooks';

import { fill, getUniformCopy } from '../../lib/uniform/copy';
import {
    EMPTY_ORDER,
    addLine,
    codeFor,
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

    const totals = useMemo(
        () => computeTotals(order.lines, order.membership, order.currency),
        [order.lines, order.membership, order.currency],
    );

    function goToPay() {
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
                <h2 class="kit-h2">{copy.shop.title}</h2>
                <p class="kit-lede">{copy.shop.intro}</p>
                <ol class="kit-steps" aria-label={copy.shop.eyebrow}>
                    {copy.summary.steps.map((label, i) => {
                        // Paying and submitting the form share one screen, so
                        // both stay "current" once the order is confirmed.
                        const status = step === 'select' ? (i === 0 ? 'current' : 'todo') : i === 0 ? 'done' : 'current';
                        const isFirstCurrent = i === (step === 'select' ? 0 : 1);
                        return (
                            <li
                                key={label}
                                class={`kit-step is-${status}`}
                                aria-current={isFirstCurrent ? 'step' : undefined}
                            >
                                <span class="kit-step-no">{i + 1}</span>
                                {label}
                            </li>
                        );
                    })}
                </ol>
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
                                currency={order.currency}
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
                    onMembership={(membership) => setOrder((current) => setMembership(current, membership))}
                    onCurrency={(currency) => setOrder((current) => setCurrency(current, currency))}
                    onRemove={(sku, size) => setOrder((current) => removeLine(current, sku, size))}
                    onContinue={goToPay}
                    onEdit={goToSelect}
                />
            </div>

            {step === 'select' && totals.pieces > 0 && (
                <a class="kit-mobile-bar" href="#kit-summary">
                    <span>
                        {fill(copy.summary.pieces, { n: totals.pieces })} ·{' '}
                        <strong>{formatPrice(totals.total, order.currency)}</strong>
                    </span>
                    <span class="kit-mobile-bar-cta">{copy.summary.mobileBar}</span>
                </a>
            )}
        </div>
    );
}
