import { useEffect, useRef } from "preact/hooks";

import { completes_edge_swipe, starts_edge_swipe } from "../lib/edge_swipe_back";

export function use_edge_swipe_back(enabled: boolean, on_back: () => void): void {
    const on_back_ref = useRef(on_back);
    on_back_ref.current = on_back;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const shell = document.querySelector<HTMLElement>(".app-shell");
        if (!shell) {
            return;
        }
        let start_x: number | undefined;
        let start_y: number | undefined;
        let distance_x = 0;
        let distance_y = 0;

        const reset = (): void => {
            start_x = undefined;
            start_y = undefined;
            distance_x = 0;
            distance_y = 0;
            shell.classList.remove("is-swiping-back");
            shell.style.removeProperty("--detail-swipe-offset");
        };

        const handle_start = (event: TouchEvent): void => {
            const touch = event.touches[0];
            if (event.touches.length !== 1) {
                reset();
                return;
            }
            if (!touch || !starts_edge_swipe(touch.clientX)) {
                return;
            }
            start_x = touch.clientX;
            start_y = touch.clientY;
        };

        const handle_move = (event: TouchEvent): void => {
            const touch = event.touches[0];
            if (event.touches.length !== 1) {
                reset();
                return;
            }
            if (start_x === undefined || start_y === undefined || !touch) {
                return;
            }
            distance_x = touch.clientX - start_x;
            distance_y = touch.clientY - start_y;
            if (Math.abs(distance_y) > 12 && Math.abs(distance_y) >= distance_x) {
                reset();
                return;
            }
            if (distance_x < 12 || distance_x <= Math.abs(distance_y) * 1.2) {
                return;
            }
            if (event.cancelable) {
                event.preventDefault();
            }
            shell.classList.add("is-swiping-back");
            shell.style.setProperty(
                "--detail-swipe-offset",
                `${Math.min(distance_x, 120)}px`,
            );
        };

        const handle_end = (): void => {
            const should_close = completes_edge_swipe(distance_x, distance_y);
            reset();
            if (should_close) {
                on_back_ref.current();
            }
        };

        window.addEventListener("touchstart", handle_start, { passive: true });
        window.addEventListener("touchmove", handle_move, { passive: false });
        window.addEventListener("touchend", handle_end, { passive: true });
        window.addEventListener("touchcancel", reset, { passive: true });

        return (): void => {
            reset();
            window.removeEventListener("touchstart", handle_start);
            window.removeEventListener("touchmove", handle_move);
            window.removeEventListener("touchend", handle_end);
            window.removeEventListener("touchcancel", reset);
        };
    }, [enabled]);
}
