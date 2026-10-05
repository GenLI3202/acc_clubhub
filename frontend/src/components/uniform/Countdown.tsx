import { useEffect, useState } from 'preact/hooks';

import { getUniformCopy } from '../../lib/uniform/copy';
import { timeLeft, type TimeLeft } from '../../lib/uniform/countdown';
import type { Locale } from '../../lib/i18n';
import './uniform.css';

interface CountdownProps {
    lang: Locale;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Time left to order. The page is prerendered, so the numbers stay blank
 * until the browser knows "now"; after the deadline it says orders are closed.
 */
export function Countdown({ lang }: CountdownProps) {
    const copy = getUniformCopy(lang);
    const [left, setLeft] = useState<TimeLeft | null>(null);

    useEffect(() => {
        const tick = () => setLeft(timeLeft(new Date()));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, []);

    if (left?.closed) {
        return (
            <p class="kit-countdown-closed" role="status">
                {copy.closed.title}
            </p>
        );
    }

    const { countdown } = copy.hero;
    const cells: readonly (readonly [number | undefined, string])[] = [
        [left?.days, countdown.days],
        [left?.hours, countdown.hours],
        [left?.minutes, countdown.minutes],
        [left?.seconds, countdown.seconds],
    ];

    return (
        <div class="kit-countdown" role="timer" aria-label={countdown.label}>
            <p class="kit-countdown-label">{countdown.label}</p>
            <ul class="kit-countdown-cells">
                {cells.map(([value, unit]) => (
                    <li key={unit}>
                        <strong>{value === undefined ? '–' : pad(value)}</strong>
                        <span>{unit}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
