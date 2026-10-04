import { useEffect, useRef, useState } from 'preact/hooks';

import { FORM_CONFIG, buildPrefillUrl, isFormConfigured } from '../../lib/uniform/form';
import type { UniformCopy } from '../../lib/uniform/copy';
import type { OrderState } from '../../lib/uniform/orderState';
import { PAYMENT, formatIban } from '../../lib/uniform/payment';
import { formatPrice, type OrderTotals } from '../../lib/uniform/pricing';

interface PayStepProps {
    copy: UniformCopy;
    order: OrderState;
    totals: OrderTotals;
}

/**
 * False when the Clipboard API is unavailable or refused (the page is always
 * served from a secure context, so this means a permission denial). The value
 * stays on screen as selectable text, so the buyer can still copy it by hand.
 */
async function copyText(value: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}

function CopyButton({ value, copy }: { value: string; copy: UniformCopy['pay'] }) {
    const [done, setDone] = useState(false);
    const timer = useRef<number>();
    useEffect(() => () => window.clearTimeout(timer.current), []);

    async function onClick() {
        if (!(await copyText(value))) return;
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1600);
    }

    return (
        <button type="button" class="kit-copy" onClick={onClick} aria-live="polite">
            {done ? copy.copied : copy.copy}
        </button>
    );
}

function Row({ label, value, raw, copy }: { label: string; value: string; raw?: string; copy: UniformCopy['pay'] }) {
    return (
        <div class="kit-pay-row">
            <dt>{label}</dt>
            <dd>
                <span class="kit-pay-value">{value}</span>
                <CopyButton value={raw ?? value} copy={copy} />
            </dd>
        </div>
    );
}

export function PayStep({ copy, order, totals }: PayStepProps) {
    const { pay, form } = copy;
    const code = order.code?.value ?? '';
    const amount = formatPrice(totals.total, order.currency);

    const config = isFormConfigured(FORM_CONFIG) ? FORM_CONFIG : null;
    const orderForForm = { code, lines: order.lines, membership: order.membership, currency: order.currency };
    const embedUrl = config && code ? buildPrefillUrl(config, orderForForm, { embedded: true }) : null;
    const openUrl = config && code ? buildPrefillUrl(config, orderForForm) : null;

    return (
        <div class="kit-pay">
            <section class="kit-panel" aria-labelledby="kit-pay-title">
                <h3 class="kit-panel-title" id="kit-pay-title">
                    {pay.title}
                </h3>
                <p class="kit-lede">{pay.intro}</p>

                <dl class="kit-pay-key">
                    <div>
                        <dt>{pay.amountDue}</dt>
                        <dd class="kit-pay-amount">{amount}</dd>
                    </div>
                    <div>
                        <dt>{pay.orderCode}</dt>
                        <dd class="kit-pay-code">
                            {code}
                            <CopyButton value={code} copy={pay} />
                        </dd>
                    </div>
                </dl>
                <p class="kit-note">{pay.referenceHint}</p>

                {order.currency === 'RMB' ? (
                    <div class="kit-method">
                        <h4>{pay.alipayTitle}</h4>
                        <div class="kit-alipay">
                            <img
                                class="kit-qr"
                                src={PAYMENT.alipay.qrImage}
                                alt={pay.alipayTitle}
                                width="240"
                                height="320"
                                loading="lazy"
                            />
                            <div>
                                <p>{pay.alipayScan}</p>
                                <p class="kit-note">
                                    {pay.payee}: {PAYMENT.alipay.payee}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div class="kit-method">
                        <h4>{pay.sepaTitle}</h4>
                        <dl class="kit-pay-rows">
                            <Row label={pay.iban} value={formatIban(PAYMENT.sepa.iban)} raw={PAYMENT.sepa.iban} copy={pay} />
                            <Row label={pay.bic} value={PAYMENT.sepa.bic} copy={pay} />
                            <Row label={pay.holder} value={PAYMENT.sepa.holder} copy={pay} />
                            <Row label={pay.reference} value={code} copy={pay} />
                            <Row
                                label={pay.amountDue}
                                value={amount}
                                raw={(totals.total / 100).toFixed(2)}
                                copy={pay}
                            />
                        </dl>
                    </div>
                )}
            </section>

            <section class="kit-panel" aria-labelledby="kit-form-title">
                <h3 class="kit-panel-title" id="kit-form-title">
                    {form.title}
                </h3>
                <p class="kit-lede">{form.intro}</p>
                <p class="kit-note">{form.signInNote}</p>

                {embedUrl && openUrl ? (
                    <>
                        <iframe
                            class="kit-iframe"
                            src={embedUrl}
                            title={form.iframeTitle}
                            loading="lazy"
                            referrerpolicy="no-referrer"
                        />
                        <a class="kit-btn kit-btn--outline" href={openUrl} target="_blank" rel="noopener noreferrer">
                            {form.openNewTab}
                        </a>
                    </>
                ) : (
                    <p class="kit-empty">{form.comingSoon}</p>
                )}
            </section>
        </div>
    );
}
