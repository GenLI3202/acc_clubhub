import type { CollectionEntry } from 'astro:content';

type EventEntry = CollectionEntry<'events'>;

export function getHeroEvent(events: EventEntry[]): EventEntry | null {
  const featured = events.find((e) => e.data.featured);
  if (featured) return featured;
  const upcoming = events
    .filter((e) => new Date(e.data.date) >= new Date())
    .sort((a, b) => new Date(a.data.date).valueOf() - new Date(b.data.date).valueOf());
  return upcoming[0] ?? null;
}

export function splitEvents(events: EventEntry[]): { upcoming: EventEntry[]; past: EventEntry[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  return events.filter((e) => e.data.eventType === 'social-ride');
}
