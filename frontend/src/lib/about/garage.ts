/** Continuous garage browsing and a single departure animation per opened bike. */
export function init_garage(): void {
    const strip = document.querySelector<HTMLElement>(".garage-grid");
    const lane = strip?.querySelector<HTMLElement>(".garage-lane");
    const sheet = document.querySelector<HTMLElement>('[data-sheet="member"]');
    const photo = sheet?.querySelector<HTMLImageElement>("[data-member-photo]");
    if (!strip || !lane || !sheet || !photo) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hovered = false;
    let visible = false;
    let dragging = false;
    let moved = false;
    let pointer_x = 0;
    let starting_scroll = 0;
    let resume_at = 0;
    let previous_time = 0;
    let fractional_travel = 0;
    let flight: Animation | null = null;
    let ghost: HTMLImageElement | null = null;
    let opening = 0;

    strip.addEventListener("pointerenter", (event: PointerEvent) => {
        hovered = event.pointerType === "mouse";
    });
    strip.addEventListener("pointerleave", () => { hovered = false; });
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
    }).observe(strip);

    const wrap = (): void => {
        if (strip.querySelector(":focus-visible") !== null) return;
        const copy = strip.querySelector<HTMLElement>('[aria-hidden="true"]');
        if (!copy) return;
        const period = copy.offsetLeft - lane.offsetLeft;
        if (period > 0 && strip.scrollLeft >= period) strip.scrollLeft -= period;
    };
    const tick = (now: number): void => {
        const elapsed = previous_time ? Math.min(now - previous_time, 50) : 0;
        previous_time = now;
        if (visible && !document.hidden && !reduced.matches
            && !hovered && !dragging && now > resume_at && sheet.hidden
            && strip.querySelector(":focus-visible") === null) {
            fractional_travel += elapsed * 0.028;
            const pixels = Math.floor(fractional_travel);
            fractional_travel -= pixels;
            strip.scrollLeft += pixels;
            wrap();
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    strip.addEventListener("scroll", wrap, { passive: true });
    strip.addEventListener("wheel", () => {
        resume_at = performance.now() + 2500;
    }, { passive: true });
    strip.addEventListener("pointerdown", (event: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return;
        dragging = true;
        moved = false;
        pointer_x = event.clientX;
        starting_scroll = strip.scrollLeft;
    });
    window.addEventListener("pointermove", (event: PointerEvent) => {
        if (!dragging) return;
        const delta = event.clientX - pointer_x;
        if (Math.abs(delta) > 6) moved = true;
        if (event.pointerType === "mouse" && moved) {
            event.preventDefault();
            strip.scrollLeft = starting_scroll - delta;
        }
    });
    const release = (): void => {
        if (!dragging) return;
        dragging = false;
        resume_at = performance.now() + 2500;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    strip.addEventListener("click", (event: MouseEvent) => {
        if (moved && event.detail !== 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        moved = false;
    }, true);
    strip.addEventListener("dragstart", (event) => event.preventDefault());

    const clear_flight = (): void => {
        opening += 1;
        flight?.cancel();
        flight = null;
        ghost?.remove();
        ghost = null;
        photo.style.visibility = "";
    };
    sheet.addEventListener("member:close", clear_flight);
    reduced.addEventListener("change", () => {
        if (reduced.matches) clear_flight();
    });
    sheet.addEventListener("member:open", async () => {
        clear_flight();
        if (reduced.matches) return;
        const version = opening;
        try {
            await photo.decode();
            const panel = sheet.querySelector<HTMLElement>(".sheet-panel");
            await Promise.all(panel?.getAnimations().map((a) => a.finished) ?? []);
        } catch { return; }
        if (opening !== version || sheet.hidden || reduced.matches) return;
        const rect = photo.getBoundingClientRect();
        ghost = photo.cloneNode() as HTMLImageElement;
        ghost.removeAttribute("data-member-photo");
        ghost.className = "garage-flight";
        ghost.alt = "";
        ghost.setAttribute("aria-hidden", "true");
        Object.assign(ghost.style, {
            left: `${rect.left}px`, top: `${rect.top}px`,
            width: `${rect.width}px`, height: `${rect.height}px`,
        });
        document.body.append(ghost);
        photo.style.visibility = "hidden";
        const left = -rect.right - rect.height;
        const right = window.innerWidth - rect.left + rect.height;
        flight = ghost.animate([
            { transform: "translateX(0) rotate(0)", offset: 0 },
            { transform: "translateX(0) rotate(-6deg)", offset: 0.08 },
            { transform: "translateX(0) rotate(5deg)", offset: 0.16 },
            { transform: "translateX(0) rotate(0)", offset: 0.24 },
            { transform: `translateX(${right}px) rotate(8deg)`, opacity: 1, offset: 0.48 },
            { transform: `translateX(${right}px)`, opacity: 0, offset: 0.49 },
            { transform: `translateX(${left}px)`, opacity: 0, offset: 0.50 },
            { transform: `translateX(${left}px) rotate(-5deg)`, opacity: 1, offset: 0.51 },
            { transform: "translateX(0) rotate(0)", opacity: 1, offset: 0.88 },
            { transform: "translateX(0) rotate(0)", opacity: 1, offset: 1 },
        ], { duration: 2300, easing: "ease-in-out", fill: "forwards" });
        flight.finished.then(() => {
            if (opening === version) clear_flight();
        }).catch(() => { /* Closing the dialog cancels its flight. */ });
    });
    window.addEventListener("resize", clear_flight);
}
