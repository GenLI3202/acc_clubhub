export const PULL_REFRESH_THRESHOLD_PX = 72;

const PULL_RESISTANCE = 0.45;
const MAX_PULL_DISTANCE_PX = 112;

export function calculate_pull_distance(delta_y: number): number {
    if (!Number.isFinite(delta_y) || delta_y <= 0) {
        return 0;
    }
    return Math.min(delta_y * PULL_RESISTANCE, MAX_PULL_DISTANCE_PX);
}

export function pull_should_refresh(distance: number): boolean {
    return distance >= PULL_REFRESH_THRESHOLD_PX;
}
