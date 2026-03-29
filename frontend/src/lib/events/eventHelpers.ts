import type { CollectionEntry } from 'astro:content';

type EventEntry = CollectionEntry<'events'>;

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

export function getRegulars(events: EventEntry[]): EventEntry[] {
  return events.filter((e) => e.data.displaySection === 'regular');
}
