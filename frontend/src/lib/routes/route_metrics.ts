import type { Locale } from "../i18n";

/**
 * Format a route distance without inventing precision that the source lacks.
 *
 * Args:
 *     distance: Numeric distance used by filters and exact-distance routes.
 *     distance_range: Optional source-reported minimum and maximum distance.
 *     lang: Active page locale.
 *
 * Returns:
 *     Localized distance text including the kilometre unit.
 */
export function format_route_distance(
    distance: number,
    distance_range: [number, number] | undefined,
    lang: Locale,
): string {
    const unit = lang === "zh" ? "公里" : "km";

    if (distance_range) {
        return `${distance_range[0]}–${distance_range[1]} ${unit}`;
    }

    return `${distance} ${unit}`;
}
