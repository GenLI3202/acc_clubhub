import { describe, expect, it } from 'vitest';

import { buildOrderMailto, buildOrderSummary } from '../orderSummary';
import type { OrderLine } from '../pricing';

const lines: OrderLine[] = [
    { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
    { sku: 'bib', cut: 'women', size: 'S', qty: 2 },
    { sku: 'vest-black', cut: 'men', size: 'L', qty: 1 },
];

const order = {
    code: 'ACC26-ABCD',
    lines,
    membership: 'member' as const,
    currency: 'EUR' as const,
    contact: {
        name: 'Li Wei',
        email: 'li@example.com',
        phone: '+49 170 1234567',
        wechat: 'liwei',
        address: '北京市朝阳区某某路 1 号 100000',
    },
};

describe('buildOrderSummary', () => {
    const text = buildOrderSummary(order);

    it('starts with the order code, so staff can find it by search', () => {
        expect(text.split('\n')[0]).toContain('ACC26-ABCD');
    });

    it('lists contact, membership, payment method and the total with transfer fee', () => {
        expect(text).toContain('Li Wei');
        expect(text).toContain('li@example.com');
        expect(text).toContain('+49 170 1234567');
        expect(text).toContain('liwei');
        expect(text).toContain('会员 Member');
        expect(text).toContain('SEPA transfer (EUR)');
        // 52.50 + 2 x 60.00 + 35.00 = 207.50, plus 4 pieces x 1.50 = 6.00
        expect(text).toContain('€213.50');
    });

    it('lists every item in the same format as the form\'s "other sizes" field', () => {
        expect(text).toContain('分体上衣 | 男款 | M | 1');
        expect(text).toContain('分体裤 | 女款 | S | 2');
        expect(text).toContain('马甲 | 男款 | 黑色 L | 1');
    });

    it('shows the China delivery address when one is given', () => {
        expect(text).toContain('收货地址 Delivery address: 北京市朝阳区某某路 1 号 100000');
        expect(text).not.toContain('慕尼黑自提');
    });

    it('says Munich pick-up when there is no address', () => {
        const pickup = buildOrderSummary({ ...order, contact: { ...order.contact, address: '' } });
        expect(pickup).toContain('收货方式 Delivery: 慕尼黑自提 / Munich pick-up');
        expect(pickup).not.toContain('收货地址');
    });

    it('leaves the WeChat line out when it is empty', () => {
        const without = buildOrderSummary({ ...order, contact: { ...order.contact, wechat: '' } });
        expect(without).not.toContain('WeChat');
    });
});

describe('buildOrderMailto', () => {
    it('addresses the team, puts the order code in the subject and the summary in the body', () => {
        const url = buildOrderMailto('team@example.com', order);
        expect(url.startsWith('mailto:team@example.com?')).toBe(true);
        const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
        expect(params.get('subject')).toContain('ACC26-ABCD');
        expect(params.get('body')).toBe(buildOrderSummary(order));
    });
});
