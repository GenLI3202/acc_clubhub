import { describe, expect, it } from 'vitest';
import {
  getEventDisplaySections,
  getTodayAtMidnight,
  getRegulars,
  isEventInSection,
  splitEvents,
  type EventSection,
} from '../eventHelpers';

type MockEvent = {
  data: {
    displaySection?: EventSection;
    displaySections?: EventSection[];
  };
};

describe('event section helpers', () => {
  it('keeps paused regulars visible without listing a next ride or a past event', () => {
    const paused_event = {
      data: {
        date: '2026-06-04T16:00:00Z',
        displaySections: ['regular'] as EventSection[],
        recurring: { paused: true },
      },
    } as Parameters<typeof splitEvents>[0][number];

    for (const date of ['2026-10-08T12:00:00Z', '2027-04-01T12:00:00Z']) {
      const { upcoming, past, paused } = splitEvents(
        [paused_event], new Date(date),
      );
      expect(upcoming).toEqual([]);
      expect(past).toEqual([]);
      expect(getRegulars([...upcoming, ...paused])).toEqual([paused_event]);
    }
  });

  it('uses Munich midnight for event day boundaries in summer and winter', () => {
    expect(getTodayAtMidnight(new Date('2026-09-05T22:30:00Z')).toISOString())
      .toBe('2026-09-05T22:00:00.000Z');
    expect(getTodayAtMidnight(new Date('2026-01-05T23:30:00Z')).toISOString())
      .toBe('2026-01-05T23:00:00.000Z');
  });

  it('uses displaySections when multiple sections are configured', () => {
    const event: MockEvent = {
      data: {
        displaySection: 'regular',
        displaySections: ['hero', 'upcoming'],
      },
    };

    expect(getEventDisplaySections(event)).toEqual(['hero', 'upcoming']);
    expect(isEventInSection(event, 'hero')).toBe(true);
    expect(isEventInSection(event, 'upcoming')).toBe(true);
    expect(isEventInSection(event, 'regular')).toBe(false);
  });

  it('falls back to legacy displaySection', () => {
    const event: MockEvent = {
      data: {
        displaySection: 'regular',
      },
    };

    expect(getEventDisplaySections(event)).toEqual(['regular']);
    expect(isEventInSection(event, 'regular')).toBe(true);
  });

  it('defaults events without section metadata to upcoming', () => {
    const event: MockEvent = {
      data: {},
    };

    expect(getEventDisplaySections(event)).toEqual(['upcoming']);
  });

  it('keeps regular filtering compatible with multi-section events', () => {
    const regularEvent: MockEvent = {
      data: {
        displaySections: ['hero', 'regular'],
      },
    };
    const upcomingEvent: MockEvent = {
      data: {
        displaySection: 'upcoming',
      },
    };

    expect(getRegulars([regularEvent, upcomingEvent])).toEqual([regularEvent]);
  });
});
