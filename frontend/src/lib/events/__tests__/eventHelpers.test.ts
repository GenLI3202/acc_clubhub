import { describe, expect, it } from 'vitest';
import {
  getEventDisplaySections,
  getTodayAtMidnight,
  getRegulars,
  isEventInSection,
  type EventSection,
} from '../eventHelpers';

type MockEvent = {
  data: {
    displaySection?: EventSection;
    displaySections?: EventSection[];
  };
};

describe('event section helpers', () => {
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
