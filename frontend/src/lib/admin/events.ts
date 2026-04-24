export type AdminEventType =
  | 'after-work'
  | 'social-ride'
  | 'training-ride'
  | 'training-camp'
  | 'race'
  | 'workshop'
  | 'special'
  | 'gathering'
  | 'multi-day';

export type AdminEventView = 'upcoming' | 'needs-attention' | 'past' | 'all';

export type AdminEventCategory = AdminEventType | 'all';

export type AdminEventStatusKey =
  | 'open'
  | 'full'
  | 'waitlist'
  | 'closed'
  | 'past'
  | 'not-synced';

export type AdminEventStatus = {
  key: AdminEventStatusKey;
  label: string;
};

export type AdminEventRow = {
  slug: string;
  title: string;
  date: string;
  location: string | null;
  eventType: AdminEventType;
  maxParticipants: number | null;
  registrationDeadline: string | null;
  confirmed_count: number;
  waitlist_count: number;
  cancelled_count: number;
  spots_remaining: number | null;
  db_id: number | null;
  in_db: boolean;
};

const EVENT_TYPE_LABELS: Record<AdminEventType, string> = {
  'after-work': 'After Work',
  'social-ride': 'Social Ride',
  'training-ride': 'Training Ride',
  'training-camp': 'Training Camp',
  race: 'Race',
  workshop: 'Workshop',
  special: 'Special Event',
  gathering: 'Gathering',
  'multi-day': 'Multi-day',
};

export const ADMIN_EVENT_VIEWS: Array<{
  key: AdminEventView;
  label: string;
}> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'needs-attention', label: 'Needs Attention' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

export const ADMIN_EVENT_CATEGORIES: Array<{
  key: AdminEventCategory;
  label: string;
}> = [
  { key: 'all', label: 'All Types' },
  { key: 'after-work', label: EVENT_TYPE_LABELS['after-work'] },
  { key: 'social-ride', label: EVENT_TYPE_LABELS['social-ride'] },
  { key: 'training-ride', label: EVENT_TYPE_LABELS['training-ride'] },
  { key: 'training-camp', label: EVENT_TYPE_LABELS['training-camp'] },
  { key: 'workshop', label: EVENT_TYPE_LABELS.workshop },
  { key: 'special', label: EVENT_TYPE_LABELS.special },
];

function toTime(value: string | null): number {
  if (!value) return Number.NaN;
  return new Date(value).valueOf();
}

export function getEventTypeLabel(eventType: AdminEventType): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

export function isPastEvent(event: AdminEventRow, now: Date): boolean {
  return toTime(event.date) < now.valueOf();
}

export function getAdminEventStatus(
  event: AdminEventRow,
  now: Date,
): AdminEventStatus {
  if (!event.in_db || event.db_id === null) {
    return { key: 'not-synced', label: 'Not Synced' };
  }

  if (isPastEvent(event, now)) {
    return { key: 'past', label: 'Past' };
  }

  const deadline = toTime(event.registrationDeadline);
  if (!Number.isNaN(deadline) && deadline < now.valueOf()) {
    return { key: 'closed', label: 'Closed' };
  }

  if (event.waitlist_count > 0) {
    return { key: 'waitlist', label: 'Waitlist' };
  }

  if (event.spots_remaining !== null && event.spots_remaining <= 0) {
    return { key: 'full', label: 'Full' };
  }

  return { key: 'open', label: 'Open' };
}

export function needsAttention(event: AdminEventRow, now: Date): boolean {
  const status = getAdminEventStatus(event, now).key;
  return status === 'not-synced' || status === 'waitlist' || status === 'full';
}

export function sortAdminEvents(
  events: AdminEventRow[],
  view: AdminEventView,
): AdminEventRow[] {
  const direction = view === 'upcoming' || view === 'needs-attention' ? 1 : -1;
  return [...events].sort((a, b) => {
    const dateDiff = (toTime(a.date) - toTime(b.date)) * direction;
    if (dateDiff !== 0) return dateDiff;
    return a.title.localeCompare(b.title);
  });
}

export function filterAdminEvents(
  events: AdminEventRow[],
  view: AdminEventView,
  category: AdminEventCategory,
  now: Date,
): AdminEventRow[] {
  const categoryFiltered = category === 'all'
    ? events
    : events.filter((event) => event.eventType === category);

  const viewFiltered = categoryFiltered.filter((event) => {
    if (view === 'all') return true;
    if (view === 'past') return isPastEvent(event, now);
    if (view === 'needs-attention') {
      return !isPastEvent(event, now) && needsAttention(event, now);
    }
    return !isPastEvent(event, now);
  });

  return sortAdminEvents(viewFiltered, view);
}

export function formatRegistrationSummary(event: AdminEventRow): string {
  const confirmed = `${event.confirmed_count} confirmed`;
  const waitlist = `${event.waitlist_count} waitlist`;

  if (event.maxParticipants === null) {
    return `${confirmed} · ${waitlist} · No cap`;
  }

  return `${event.confirmed_count} / ${event.maxParticipants} confirmed · ${waitlist}`;
}
