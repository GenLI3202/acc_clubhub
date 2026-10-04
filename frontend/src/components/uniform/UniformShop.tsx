import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { fill, getUniformCopy } from '../../lib/uniform/copy';
import { isWeChatUserAgent } from '../../lib/uniform/environment';
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

const ORDER_KEY = 'acc-kit-2026-order';
const STEP_KEY = 'acc-kit-2026-step';
const CATEGORIES: readonly SkuCategory[] = ['jersey', 'bib', 'vest'];

type Step = 'select' | 'pay';

interface UniformShopProps {
    lang: Locale;
}

// localStorage, not sessionStorage: a buyer who leaves to pay in their bank
// or Alipay app and comes back (or reopens the tab) finds the order and code
// they paid for. It holds no personal data — only items, sizes and choices.
function readStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
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
    const [inWeChat, setInWeChat] = useState(false);
    const [summaryInView, setSummaryInView] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const moveFocus = useRef(false);

    // Paying only makes sense once buyers can also submit the form. Dev builds
    // skip the check so the payment step can be previewed before it is wired.
    const formReady = isFormConfigured(FORM_CONFIG) || import.meta.env.DEV;

    // The page is prerendered, so anything that depends on "now", on the
    // visitor's browser or on its storage is decided after hydration.
    useEffect(() => {
        const isClosed = isOrderClosed();
        setClosed(isClosed);
        setInWeChat(isWeChatUserAgent(window.navigator.userAgent));

        const saved = isClosed ? null : parseSavedOrder(readStorage(ORDER_KEY));
        if (saved) {
            setOrder(saved);
            // Come back to the payment screen the buyer left, with the same code.
            if (readStorage(STEP_KEY) === 'pay' && saved.code && isReadyToPay(saved) && formReady) {
                setStep('pay');
            }
        }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        writeStorage(ORDER_KEY, serializeOrder(order));
        writeStorage(STEP_KEY, step);
    }, [order, step, ready]);

    // After a deliberate step change, put keyboard and screen-reader focus on
    // the new screen's heading instead of leaving it on a button that vanished.
    useEffect(() => {
        if (!moveFocus.current) return;
        moveFocus.current = false;
        titleRef.current?.focus({ preventScroll: true });
    }, [step]);

    // The phone bar points at the summary; hide it while the summary is on screen.
    useEffect(() => {
        const target = document.getElementById('kit-summary');
        if (!target || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) => setSummaryInView(entry.isIntersecting));
        observer.observe(target);
        return () => observer.disconnect();
    }, [step]);

    // Until the buyer has chosen, prices are shown as non-member / EUR. Totals
    // never reach a code or the form link in that state (see isReadyToPay).
    const { membership, currency } = displayOptions(order);
    const totals = useMemo(
        () => computeTotals(order.lines, membership, currency),
        [order.lines, membership, currency],
    );

    function goToPay() {
        if (closed || !formReady || !isReadyToPay(order)) return;
        moveFocus.current = true;
        setOrder((current) => codeFor(current, generateOrderCode));
        setStep('pay');
        scrollToShop();
    }

    function goToSelect() {
        moveFocus.current = true;
        setStep('select');
        scrollToShop();
    }

    const showBar = step === 'select' && totals.pieces > 0 && !summaryInView;

    return (
        <div class={`kit-shop${showBar ? ' has-bar' : ''}`} id="kit-shop">
            <header class="kit-shop-head">
                <p class="kit-eyebrow">{copy.shop.eyebrow}</p>
                <h2 class="kit-h2" ref={titleRef} tabIndex={-1}>
                    {step === 'select' ? copy.shop.title : copy.shop.payTitle}
                </h2>
                {step === 'select' && <p class="kit-lede">{copy.shop.intro}</p>}
                {inWeChat && (
                    <div class="kit-callout" role="note">
                        <strong>{copy.shop.wechatTitle}</strong>
                        <p>{copy.shop.wechatBody}</p>
                    </div>
                )}
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
                    onRemove={(sku, cut, size) => setOrder((current) => removeLine(current, sku, cut, size))}
                    onContinue={goToPay}
                    onEdit={goToSelect}
                />
            </div>

            {showBar && (
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
