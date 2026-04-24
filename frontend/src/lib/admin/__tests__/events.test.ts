import { describe, expect, it } from 'vitest';
import {
  filterAdminEvents,
  getAdminEventStatus,
  getEventTypeLabel,
  sortAdminEvents,
  type AdminEventRow,
} from '../events';

const NOW = new Date('2026-04-25T10:00:00+02:00');

function event(overrides: Partial<AdminEventRow>): AdminEventRow {
  return {
    slug: 'event',
    title: 'Event',
    date: '2026-05-01T17:30:00.000Z',
    location: 'Munich',
    eventType: 'social-ride',
    maxParticipants: 20,
    registrationDeadline: null,
    confirmed_count: 0,
    waitlist_count: 0,
    cancelled_count: 0,
    spots_remaining: 20,
    db_id: 1,
    in_db: true,
    ...overrides,
  };
}

describe('admin event helpers', () => {
  it('labels after-work rides as their own event type', () => {
    expect(getEventTypeLabel('after-work')).toBe('After Work');
  });

  it('keeps past events out of the default upcoming view', () => {
    const events = [
      event({ slug: 'past', date: '2026-04-18T08:00:00.000Z' }),
      event({ slug: 'future', date: '2026-04-30T15:30:00.000Z' }),
    ];

    expect(filterAdminEvents(events, 'upcoming', 'all', NOW).map((e) => e.slug))
      .toEqual(['future']);
  });

  it('sorts upcoming events by nearest date first', () => {
    const events = [
      event({ slug: 'later', date: '2026-06-07T08:00:00.000Z' }),
      event({ slug: 'sooner', date: '2026-04-28T15:30:00.000Z' }),
    ];

    expect(sortAdminEvents(events, 'upcoming').map((e) => e.slug))
      .toEqual(['sooner', 'later']);
  });

  it('puts completed events in the past view newest first', () => {
    const events = [
      event({ slug: 'older', date: '2025-06-20T08:00:00.000Z' }),
      event({ slug: 'newer', date: '2026-04-18T08:00:00.000Z' }),
    ];

    expect(filterAdminEvents(events, 'past', 'all', NOW).map((e) => e.slug))
      .toEqual(['newer', 'older']);
  });

  it('identifies waitlist, full, and unsynced events as needing attention', () => {
    const events = [
      event({ slug: 'normal', spots_remaining: 8 }),
      event({ slug: 'waitlist', waitlist_count: 2, spots_remaining: 0 }),
      event({ slug: 'unsynced', db_id: null, in_db: false }),
    ];

    expect(
      filterAdminEvents(events, 'needs-attention', 'all', NOW).map((e) => e.slug),
    ).toEqual(['waitlist', 'unsynced']);
  });

  it('derives clear operational statuses', () => {
    expect(getAdminEventStatus(event({ db_id: null, in_db: false }), NOW).key)
      .toBe('not-synced');
    expect(getAdminEventStatus(event({ waitlist_count: 1 }), NOW).key)
      .toBe('waitlist');
    expect(getAdminEventStatus(event({ spots_remaining: 0 }), NOW).key)
      .toBe('full');
    expect(getAdminEventStatus(event({ date: '2026-04-18T08:00:00.000Z' }), NOW).key)
      .toBe('past');
  });
});
