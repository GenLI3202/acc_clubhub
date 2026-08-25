import type { Locale } from '../i18n';

export type EventCancellationReason =
  | 'weather'
  | 'insufficient_staff'
  | 'unsafe_conditions'
  | 'other';

export const EVENT_CANCELLATION_REASON_OPTIONS: Array<{
  value: EventCancellationReason;
  label: string;
}> = [
  { value: 'weather', label: 'Adverse weather' },
  {
    value: 'insufficient_staff',
    label: 'Insufficient ride leaders or organisers',
  },
  { value: 'unsafe_conditions', label: 'Unsafe route conditions' },
  { value: 'other', label: 'Other operational reasons' },
];

const CANCELLATION_NOTICES: Record<
  EventCancellationReason,
  Record<Locale, string>
> = {
  weather: {
    zh: '本活动因天气原因取消，报名已停止。',
    en: 'This event has been cancelled due to adverse weather. Registration is closed.',
    de: 'Diese Veranstaltung wurde aufgrund ungünstiger Wetterbedingungen abgesagt. Die Anmeldung ist geschlossen.',
  },
  insufficient_staff: {
    zh: '本活动因领骑或组织人员不足取消，报名已停止。',
    en: 'This event has been cancelled due to insufficient ride leaders or organisers. Registration is closed.',
    de: 'Diese Veranstaltung wurde aufgrund unzureichender Tourenleitung oder Organisation abgesagt. Die Anmeldung ist geschlossen.',
  },
  unsafe_conditions: {
    zh: '本活动因路线条件不安全取消，报名已停止。',
    en: 'This event has been cancelled due to unsafe route conditions. Registration is closed.',
    de: 'Diese Veranstaltung wurde aufgrund unsicherer Streckenbedingungen abgesagt. Die Anmeldung ist geschlossen.',
  },
  other: {
    zh: '本活动因其他运营原因取消，报名已停止。',
    en: 'This event has been cancelled for other operational reasons. Registration is closed.',
    de: 'Diese Veranstaltung wurde aus anderen organisatorischen Gründen abgesagt. Die Anmeldung ist geschlossen.',
  },
};

const FALLBACK_NOTICES: Record<Locale, string> = {
  zh: '本活动已取消，报名已停止。',
  en: 'This event has been cancelled. Registration is closed.',
  de: 'Diese Veranstaltung wurde abgesagt. Die Anmeldung ist geschlossen.',
};

export function is_event_cancellation_reason(
  reason: string | null | undefined,
): reason is EventCancellationReason {
  return EVENT_CANCELLATION_REASON_OPTIONS.some(
    (option) => option.value === reason,
  );
}

export function get_cancellation_reason_label(
  reason: string | null | undefined,
): string {
  return EVENT_CANCELLATION_REASON_OPTIONS.find(
    (option) => option.value === reason,
  )?.label ?? 'Unknown reason';
}

export function get_cancellation_notice(
  reason: string | null | undefined,
  lang: Locale,
): string {
  if (!is_event_cancellation_reason(reason)) {
    return FALLBACK_NOTICES[lang] ?? FALLBACK_NOTICES.en;
  }
  return CANCELLATION_NOTICES[reason][lang] ?? CANCELLATION_NOTICES[reason].en;
}

export function format_cancellation_timestamp(
  value: string | null | undefined,
): string {
  if (!value) return '—';

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) return value;

  return timestamp.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}
