// src/lib/uniform/orderSummary.ts
// The order as plain text, for buyers who cannot (or would rather not) use the
// Google Form: they paste it to the team on WeChat, or send it by email, with
// the payment screenshot. Labels are bilingual and fixed, whatever language
// the page is in, so staff read the same layout every time.

import type { ContactInfo } from './contact';
import { MEMBERSHIP_LABEL, PAYMENT_LABEL, orderLineText } from './form';
import { computeTotals, formatPrice, type Currency, type Membership, type OrderLine } from './pricing';

export interface SummaryOrder {
    readonly code: string;
    readonly lines: readonly OrderLine[];
    readonly membership: Membership;
    readonly currency: Currency;
    readonly contact: ContactInfo;
}

export function buildOrderSummary(order: SummaryOrder): string {
    const totals = computeTotals(order.lines, order.membership, order.currency);
    const { name, email, phone, wechat } = order.contact;
    const rows = [
        `ACC 2026 队服订单 Kit order — ${order.code}`,
        '',
        `订单号 Order code: ${order.code}`,
        `姓名 Name: ${name}`,
        `邮箱 Email: ${email}`,
        `电话 Phone: ${phone}`,
        wechat ? `微信 WeChat: ${wechat}` : null,
        `会员身份 Membership: ${MEMBERSHIP_LABEL[order.membership]}`,
        `付款方式 Payment: ${PAYMENT_LABEL[order.currency]}`,
        `应付金额 Amount due: ${formatPrice(totals.total, order.currency)}`,
        '',
        '款式 | 版型 | 颜色/尺码 | 数量 (Item | cut | colour/size | qty)',
        ...order.lines.map(orderLineText),
    ];
    return rows.filter((row): row is string => row !== null).join('\n');
}

export function buildOrderMailto(email: string, order: SummaryOrder): string {
    const params = new URLSearchParams({
        subject: `ACC 2026 队服订单 Kit order ${order.code}`,
        body: buildOrderSummary(order),
    });
    // URLSearchParams writes spaces as "+", which mail clients show literally.
    return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`;
}
