import { describe, expect, it } from 'vitest';
import {
  dbRowToAdminEvent,
  filterAdminEvents,
  getAdminEventStatus,
  getEventTypeLabel,
  mergeAdminEventRows,
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
    cancellation_reason: null,
    cancelled_at: null,
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
    expect(getAdminEventStatus(event({
      cancellation_reason: 'weather',
      cancelled_at: '2026-04-24T08:00:00.000Z',
    }), NOW).key).toBe('cancelled');
    expect(getAdminEventStatus(event({ db_id: null, in_db: false }), NOW).key)
      .toBe('not-synced');
    expect(getAdminEventStatus(event({ waitlist_count: 1 }), NOW).key)
      .toBe('waitlist');
    expect(getAdminEventStatus(event({ spots_remaining: 0 }), NOW).key)
      .toBe('full');
    expect(getAdminEventStatus(event({ date: '2026-04-18T08:00:00.000Z' }), NOW).key)
      .toBe('past');
  });

  it('adds DB-only past occurrences without duplicating current rows', () => {
    const current = event({
      slug: 'afterwork-ride-sud-2026-05-05',
      date: '2026-05-05T16:00:00.000Z',
    });
    const historical = event({
      slug: 'afterwork-ride-sud-2026-04-28',
      date: '2026-04-28T16:00:00.000Z',
      confirmed_count: 6,
    });
    const duplicateCurrent = event({
      slug: current.slug,
      date: current.date,
      confirmed_count: 2,
    });

    expect(
      mergeAdminEventRows(
        [current],
        [historical, duplicateCurrent],
        new Date('2026-05-01T10:00:00+02:00'),
      ).map((row) => row.slug),
    ).toEqual([
      'afterwork-ride-sud-2026-05-05',
      'afterwork-ride-sud-2026-04-28',
    ]);
  });

  it('does not add DB-only future rows to the dashboard source list', () => {
    const current = event({ slug: 'current' });
    const dbOnlyFuture = event({
      slug: 'future-from-db',
      date: '2026-05-08T16:00:00.000Z',
    });

    expect(
      mergeAdminEventRows(
        [current],
        [dbOnlyFuture],
        new Date('2026-05-01T10:00:00+02:00'),
      ).map((row) => row.slug),
    ).toEqual(['current']);
  });

  it('converts API event rows into admin dashboard rows', () => {
    expect(dbRowToAdminEvent({
      id: 42,
      slug: 'afterwork-ride-2026-04-30',
      title: 'ACC After Work Ride · München Nord',
      event_date: '2026-04-30T15:30:00.000Z',
      location: 'OEZ',
      event_type: 'after-work',
      max_participants: 15,
      registration_deadline: null,
      confirmed_count: 5,
      waitlist_count: 0,
      cancelled_count: 1,
      spots_remaining: 10,
      distance_km: 48.5,
      cancellation_reason: 'insufficient_staff',
      cancelled_at: '2026-04-24T08:00:00.000Z',
    })).toMatchObject({
      db_id: 42,
      slug: 'afterwork-ride-2026-04-30',
      eventType: 'after-work',
      confirmed_count: 5,
      distance_km: 48.5,
      in_db: true,
      cancellation_reason: 'insufficient_staff',
    });
  });
});
