// src/lib/uniform/countdown.ts
// Time left until orders close, split for a days / hours / minutes / seconds display.

import { ORDER_DEADLINE } from './pricing';

export interface TimeLeft {
    /** True once the deadline has passed; the numbers are then all zero. */
    readonly closed: boolean;
    readonly days: number;
    readonly hours: number;
    readonly minutes: number;
    readonly seconds: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Partial seconds are dropped, so the display never runs ahead of the clock.
 * "Closed" follows the same rule as isOrderClosed: strictly after the deadline.
 */
export function timeLeft(now: Date, deadlineIso: string = ORDER_DEADLINE): TimeLeft {
    const remaining = new Date(deadlineIso).getTime() - now.getTime();
    if (remaining < 0) return { closed: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
        closed: false,
        days: Math.floor(remaining / DAY),
        hours: Math.floor((remaining % DAY) / HOUR),
        minutes: Math.floor((remaining % HOUR) / MINUTE),
        seconds: Math.floor((remaining % MINUTE) / SECOND),
    };
}
