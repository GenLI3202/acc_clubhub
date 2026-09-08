import { useEffect, useRef, useState } from "preact/hooks";

import {
    calculate_pull_distance,
    PULL_REFRESH_THRESHOLD_PX,
    pull_should_refresh,
} from "../lib/pull_refresh";

export type PullRefreshState = "idle" | "pulling" | "ready" | "refreshing";

interface PullToRefreshOptions {
    disabled: boolean;
    on_refresh: () => Promise<void>;
    refreshing: boolean;
}

interface PullToRefreshResult {
    distance: number;
    state: PullRefreshState;
}

function page_is_at_top(): boolean {
    return (
        Math.max(
            window.scrollY,
            document.documentElement.scrollTop,
            document.body.scrollTop,
        ) <= 0
    );
}

export function use_pull_to_refresh({
    disabled,
    on_refresh,
    refreshing,
}: PullToRefreshOptions): PullToRefreshResult {
    const [distance, set_distance] = useState(0);
    const distance_ref = useRef(0);
    const on_refresh_ref = useRef(on_refresh);
    on_refresh_ref.current = on_refresh;

    useEffect(() => {
        if (disabled || refreshing) {
            distance_ref.current = 0;
            set_distance(0);
            return;
        }

        let start_y: number | undefined;
        let tracking = false;

        const clear_pull = (): void => {
            distance_ref.current = 0;
            set_distance(0);
        };

        const cancel_pull = (): void => {
            tracking = false;
            start_y = undefined;
            clear_pull();
        };

        const handle_touch_start = (event: TouchEvent): void => {
            if (event.touches.length !== 1 || !page_is_at_top()) {
                return;
            }
            start_y = event.touches[0]?.clientY;
            tracking = start_y !== undefined;
        };

        const handle_touch_move = (event: TouchEvent): void => {
            if (!tracking || start_y === undefined || !page_is_at_top()) {
                cancel_pull();
                return;
            }
            const current_y = event.touches[0]?.clientY;
            if (current_y === undefined) {
                cancel_pull();
                return;
            }
            const next_distance = calculate_pull_distance(current_y - start_y);
            if (next_distance === 0) {
                clear_pull();
                return;
            }
            if (event.cancelable) {
                event.preventDefault();
            }
            distance_ref.current = next_distance;
            set_distance(next_distance);
        };

        const handle_touch_end = (): void => {
            if (!tracking) {
                return;
            }
            const should_refresh = pull_should_refresh(distance_ref.current);
            cancel_pull();
            if (should_refresh) {
                void on_refresh_ref.current();
            }
        };

        window.addEventListener("touchstart", handle_touch_start, {
            passive: true,
        });
        window.addEventListener("touchmove", handle_touch_move, {
            passive: false,
        });
        window.addEventListener("touchend", handle_touch_end, {
            passive: true,
        });
        window.addEventListener("touchcancel", cancel_pull, {
            passive: true,
        });

        return (): void => {
            window.removeEventListener("touchstart", handle_touch_start);
            window.removeEventListener("touchmove", handle_touch_move);
            window.removeEventListener("touchend", handle_touch_end);
            window.removeEventListener("touchcancel", cancel_pull);
        };
    }, [disabled, refreshing]);

    const state: PullRefreshState = refreshing
        ? "refreshing"
        : distance >= PULL_REFRESH_THRESHOLD_PX
          ? "ready"
          : distance > 0
            ? "pulling"
            : "idle";

    return {
        distance: refreshing ? 48 : distance,
        state,
    };
}
