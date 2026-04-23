import type { CollectionEntry } from 'astro:content';

type EventEntry = CollectionEntry<'events'>;
export type EventSection = 'hero' | 'upcoming' | 'regular';

type EventSectionData = {
  displaySection?: EventSection;
  displaySections?: EventSection[] | null;
};

type EventWithSections = {
  data: EventSectionData;
};

export function getTodayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function splitEvents(events: EventEntry[]): { upcoming: EventEntry[]; past: EventEntry[] } {
  const today = getTodayAtMidnight();
  const upcoming: EventEntry[] = [];
  const past: EventEntry[] = [];
  for (const e of events) {
    (new Date(e.data.date) >= today ? upcoming : past).push(e);
  }
  upcoming.sort((a, b) => new Date(a.data.date).valueOf() - new Date(b.data.date).valueOf());
  past.sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());
  return { upcoming, past };
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

export function getRegulars(events: EventEntry[]): EventEntry[] {
  return events.filter((e) => isEventInSection(e, 'regular'));
}
