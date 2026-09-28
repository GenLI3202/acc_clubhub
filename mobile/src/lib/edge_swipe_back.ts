const EDGE_START_WIDTH_PX = 32;
const BACK_DISTANCE_PX = 72;

export function starts_edge_swipe(start_x: number): boolean {
    return start_x >= 0 && start_x <= EDGE_START_WIDTH_PX;
}

export function completes_edge_swipe(distance_x: number, distance_y: number): boolean {
    return distance_x >= BACK_DISTANCE_PX && distance_x > Math.abs(distance_y) * 1.4;
}
