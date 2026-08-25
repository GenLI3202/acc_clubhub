import { describe, expect, it } from 'vitest';
import {
  get_cancellation_notice,
  type EventCancellationReason,
} from '../eventCancellation';

describe('event cancellation copy', () => {
  const cases: Array<{
    lang: 'zh' | 'en' | 'de';
    reason: EventCancellationReason;
    expected: string;
  }> = [
    { lang: 'zh', reason: 'weather', expected: '因天气原因' },
    {
      lang: 'en',
      reason: 'insufficient_staff',
      expected: 'insufficient ride leaders or organisers',
    },
    {
      lang: 'de',
      reason: 'unsafe_conditions',
      expected: 'unsicherer Streckenbedingungen',
    },
  ];

  for (const test_case of cases) {
    it(`localizes ${test_case.reason} in ${test_case.lang}`, () => {
      expect(
        get_cancellation_notice(test_case.reason, test_case.lang),
      ).toContain(test_case.expected);
    });
  }

  it('uses neutral fallback copy for an unknown stored reason', () => {
    expect(get_cancellation_notice('legacy-value', 'en')).toBe(
      'This event has been cancelled. Registration is closed.',
    );
  });
});
