import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
    EMPTY_CONTACT,
    hasContactErrors,
    parseSavedContact,
    serializeContact,
    validateContact,
    type ContactInfo,
} from '../../lib/uniform/contact';
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
    changeQty,
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
import { ContactStep } from './ContactStep';
import { OrderOptions } from './OrderOptions';
import { PayStep } from './PayStep';
import { ProductCard } from './ProductCard';
import { SummaryPanel } from './SummaryPanel';
import './uniform.css';

const ORDER_KEY = 'acc-kit-2026-order';
const STEP_KEY = 'acc-kit-2026-step';
// Personal data goes to sessionStorage only: it survives a reload or a trip to
// the bank app in the same tab, and is gone when the tab closes.
const CONTACT_KEY = 'acc-kit-2026-contact';
const CATEGORIES: readonly SkuCategory[] = ['jersey', 'bib', 'vest'];

type Step = 'select' | 'info' | 'pay';
const STEP_ORDER: readonly Step[] = ['select', 'info', 'pay'];

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

function readSession(key: string): string | null {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeSession(key: string, value: string): void {
    try {
        window.sessionStorage.setItem(key, value);
    } catch {
        // Blocked storage: the buyer retypes their details after a reload.
    }
}

// Jump, don't glide: the screen's content has just been swapped, so a smooth
// scroll that started before the swap would be cut off by the layout change.
function scrollToShop(): void {
    document.getElementById('kit-shop')?.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export function UniformShop({ lang }: UniformShopProps) {
    const copy = getUniformCopy(lang);
    const [order, setOrder] = useState<OrderState>(EMPTY_ORDER);
    const [step, setStep] = useState<Step>('select');
    const [contact, setContact] = useState<ContactInfo>(EMPTY_CONTACT);
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
        const savedContact = parseSavedContact(readSession(CONTACT_KEY));
        setContact(savedContact);
        if (saved && isReadyToPay(saved) && formReady) {
            setOrder(saved);
            // Come back to the screen the buyer left. Paying needs the code and
            // the contact details; without them they go back one screen.
            const savedStep = readStorage(STEP_KEY);
            if (savedStep === 'pay' && saved.code) {
                setStep(hasContactErrors(validateContact(savedContact)) ? 'info' : 'pay');
            } else if (savedStep === 'info') {
                setStep('info');
            }
        } else if (saved) {
            setOrder(saved);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        writeStorage(ORDER_KEY, serializeOrder(order));
        writeStorage(STEP_KEY, step);
    }, [order, step, ready]);

    useEffect(() => {
        if (ready) writeSession(CONTACT_KEY, serializeContact(contact));
    }, [contact, ready]);

    // After a deliberate step change, bring the new screen to the top and put
    // keyboard and screen-reader focus on its heading, instead of leaving it on
    // a button that vanished. This runs once the new screen is in the DOM: the
    // select screen is much taller than the pay screen, so scrolling any
    // earlier would aim at a layout that is about to disappear.
    useEffect(() => {
        if (!moveFocus.current) return;
        moveFocus.current = false;
        titleRef.current?.focus({ preventScroll: true });
        scrollToShop();
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

    function goToInfo() {
        if (closed || !formReady || !isReadyToPay(order)) return;
        moveFocus.current = true;
        setStep('info');
    }

    function goToPay(confirmed: ContactInfo) {
        if (closed || !formReady || !isReadyToPay(order)) return;
        moveFocus.current = true;
        setContact(confirmed);
        setOrder((current) => codeFor(current, generateOrderCode));
        setStep('pay');
    }

    function goToSelect() {
        moveFocus.current = true;
        setStep('select');
    }

    const showBar = step === 'select' && totals.pieces > 0 && !summaryInView;

    return (
        <div class={`kit-shop${showBar ? ' has-bar' : ''}`} id="kit-shop">
            <header class="kit-shop-head">
                {step !== 'select' && (
                    <button type="button" class="kit-back-btn" onClick={goToSelect}>
                        <span aria-hidden="true">←</span> {copy.summary.edit}
                    </button>
                )}
                <p class="kit-eyebrow">{copy.shop.eyebrow}</p>
                <h2 class="kit-h2" ref={titleRef} tabIndex={-1}>
                    {step === 'select'
                        ? copy.shop.title
                        : step === 'info'
                          ? copy.shop.contactTitle
                          : copy.shop.payTitle}
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
                        const here = STEP_ORDER.indexOf(step);
                        const status = i < here ? 'done' : i === here ? 'current' : 'todo';
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
                    ) : step === 'info' ? (
                        <ContactStep copy={copy} contact={contact} onChange={(field, value) => setContact((current) => ({ ...current, [field]: value }))} onSubmit={goToPay} />
                    ) : (
                        <PayStep copy={copy} order={order} totals={totals} contact={contact} />
                    )}
                </div>

                <SummaryPanel
                    copy={copy}
                    order={order}
                    totals={totals}
                    step={step}
                    closed={closed}
                    formReady={formReady}
                    onChangeQty={(sku, cut, size, delta) =>
                        setOrder((current) => changeQty(current, sku, cut, size, delta))
                    }
                    onContinue={goToInfo}
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
