import { describe, expect, it } from 'vitest';

import { timeLeft } from '../countdown';
import { ORDER_DEADLINE, isOrderClosed } from '../pricing';

const deadline = new Date(ORDER_DEADLINE).getTime();

function before(ms: number): Date {
    return new Date(deadline - ms);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('timeLeft', () => {
    it('splits the time to the deadline into days, hours, minutes and seconds', () => {
        expect(timeLeft(before(20 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND))).toEqual({
            closed: false,
            days: 20,
            hours: 3,
            minutes: 4,
            seconds: 5,
        });
    });

    it('counts 20 days on 5 Oct 2026, 12:00 Munich time', () => {
        // 12:00 CEST = 10:00 UTC; the deadline is 23:59:59 CET on 25 Oct.
        const result = timeLeft(new Date('2026-10-05T10:00:00Z'));
        expect(result.closed).toBe(false);
        expect(result.days).toBe(20);
    });

    it('rounds partial seconds down, so the display never runs ahead', () => {
        expect(timeLeft(before(5 * SECOND + 900))).toMatchObject({ seconds: 5, closed: false });
    });

    it('shows zeros at the very last moment, still open', () => {
        expect(timeLeft(before(0))).toEqual({
            closed: false,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        });
    });

    it('is closed with zeros once the deadline has passed', () => {
        expect(timeLeft(new Date(deadline + 1))).toEqual({
            closed: true,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        });
    });

    it('agrees with isOrderClosed around the deadline', () => {
        for (const offset of [-DAY, -SECOND, 0, 1, SECOND, DAY]) {
            const now = new Date(deadline + offset);
            expect(timeLeft(now).closed).toBe(isOrderClosed(now));
        }
    });

    it('accepts another deadline', () => {
        expect(timeLeft(new Date('2026-01-01T00:00:00Z'), '2026-01-02T01:00:00Z')).toMatchObject({
            days: 1,
            hours: 1,
        });
    });
});
