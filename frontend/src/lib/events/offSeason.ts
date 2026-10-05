// src/lib/events/offSeason.ts
// What the events hero shows when no event is flagged for it: the club is in
// its off-season, not offline. Figures and photo come from the 2026 closing
// ride post; update them when the next season wraps up.

import type { Locale } from '../i18n';

export const OFF_SEASON = {
    /** Slug of the closing ride, linked as the season recap. */
    recapSlug: 'acc-2026-season-closure-ride-2026-10-04',
    image: '/images/events/acc-2026-season-closure-ride-2026-10-04/photo-3.jpg',
    stats: ['67', '57', '260+'],
} as const;

export interface OffSeasonCopy {
    readonly eyebrow: string;
    readonly title: string;
    readonly body: string;
    /** One label per entry of OFF_SEASON.stats, in the same order. */
    readonly statLabels: readonly string[];
    readonly recap: string;
    readonly kit: string;
}

const COPY: Readonly<Record<Locale, OffSeasonCopy>> = {
    zh: {
        eyebrow: 'ACC 2026 · 赛季收官',
        title: '2026 赛季，圆满收官',
        body: '从 4 月的开季骑到 10 月的收官骑，感谢每一位一起骑过的你。冬天好好休整，来年春天，路上见。',
        statLabels: ['场活动', '场顺利成行', '人次参与'],
        recap: '回顾收官骑 →',
        kit: '订购 2026 新队服',
    },
    en: {
        eyebrow: 'ACC 2026 · Season wrap',
        title: 'That’s a wrap on 2026',
        body: 'From the opening ride in April to the closing ride in October: thank you to everyone who rode with us. Rest up over the winter, and see you on the road in spring.',
        statLabels: ['events', 'rides that rolled out', 'rider turnouts'],
        recap: 'Relive the closing ride →',
        kit: 'Order the 2026 kit',
    },
    de: {
        eyebrow: 'ACC 2026 · Saisonabschluss',
        title: 'Die Saison 2026 ist geschafft',
        body: 'Vom Saisonstart im April bis zur Abschlussfahrt im Oktober: Danke an alle, die mit uns gefahren sind. Erholt euch im Winter, wir sehen uns im Frühling auf der Straße.',
        statLabels: ['Events', 'davon gefahren', 'Teilnahmen'],
        recap: 'Rückblick: Abschlussfahrt →',
        kit: 'Kit 2026 bestellen',
    },
};

export function getOffSeasonCopy(lang: Locale): OffSeasonCopy {
    return COPY[lang] ?? COPY.zh;
}
