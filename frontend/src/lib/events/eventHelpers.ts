import type { CollectionEntry } from 'astro:content';
import { parse_event_datetime } from "./event_datetime";
import { departure_day } from "./event_schedule";

type EventEntry = CollectionEntry<'events'>;
export type EventSection = 'hero' | 'upcoming' | 'regular';

type EventSectionData = {
  displaySection?: EventSection;
  displaySections?: EventSection[] | null;
};

type EventWithSections = {
  data: EventSectionData;
};

export function getTodayAtMidnight(now: Date = new Date()): Date {
  return parse_event_datetime(`${departure_day(now.toISOString())} 00:00`);
}

export function splitEvents(
  events: EventEntry[],
  now: Date = new Date(),
): { upcoming: EventEntry[]; past: EventEntry[]; paused: EventEntry[] } {
  const today = getTodayAtMidnight(now);
  const upcoming: EventEntry[] = [];
  const past: EventEntry[] = [];
  const paused: EventEntry[] = [];
  for (const e of events) {
    if (e.data.recurring?.paused === true) {
      paused.push(e);
      continue;
    }
    (new Date(e.data.date) >= today ? upcoming : past).push(e);
  }
  upcoming.sort((a, b) => new Date(a.data.date).valueOf() - new Date(b.data.date).valueOf());
  past.sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());
  return { upcoming, past, paused };
}

export function getEventDisplaySections(event: EventWithSections): EventSection[] {
  if (event.data.displaySections && event.data.displaySections.length > 0) {
    return event.data.displaySections;
  }

  return [event.data.displaySection ?? 'upcoming'];
}

export function isEventInSection(
  event: EventWithSections,
  section: EventSection,
): boolean {
  return getEventDisplaySections(event).includes(section);
}

export function getRegulars<T extends EventWithSections>(events: T[]): T[] {
  return events.filter((e) => isEventInSection(e, 'regular'));
}
