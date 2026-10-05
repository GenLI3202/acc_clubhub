import type { UniformCopy } from '../../lib/uniform/copy';
import type { OrderState } from '../../lib/uniform/orderState';
import type { Currency, Membership } from '../../lib/uniform/pricing';
import { RadioGroup } from './RadioGroup';

interface OrderOptionsProps {
    copy: UniformCopy;
    order: OrderState;
    onMembership: (membership: Membership) => void;
    onCurrency: (currency: Currency) => void;
}

/**
 * The two choices that change what a buyer pays and how: asked once, up
 * front, above the product cards — not at the bottom of a long page.
 */
export function OrderOptions({ copy, order, onMembership, onCurrency }: OrderOptionsProps) {
    const { summary } = copy;
    return (
        <div class="kit-options">
            <div>
                <RadioGroup
                    name="kit-membership"
                    legend={summary.membershipLabel}
                    value={order.membership}
                    onChange={onMembership}
                    variant="segment"
                    options={[
                        { value: 'core', label: summary.core },
                        { value: 'member', label: summary.member },
                        { value: 'non-member', label: summary.nonMember },
                    ]}
                />
                <p class="kit-note">{summary.membershipHint}</p>
            </div>
            <RadioGroup
                name="kit-currency"
                legend={summary.currencyLabel}
                value={order.currency}
                onChange={onCurrency}
                variant="segment"
                options={[
                    { value: 'RMB', label: summary.currencyRmb },
                    { value: 'EUR', label: summary.currencyEur },
                ]}
            />
        </div>
    );
}
