import type { MobileLocale } from "../../../shared/mobile_content";
import { translate } from "../i18n";
import type { AppView } from "../lib/content";

interface BottomNavigationProps {
    active_view: AppView;
    locale: MobileLocale;
    on_select: (view: AppView) => void;
}

const NAV_ITEMS: AppView[] = ["events", "media", "gear", "training", "about", "manage"];

function NavigationIcon({ view }: { view: AppView }) {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
            viewBox="0 0 24 24"
        >
            {view === "events" ? (
                <>
                    <rect height="17" rx="2" width="18" x="3" y="4" />
                    <path d="M7 2v4m10-4v4M3 10h18" />
                </>
            ) : view === "media" ? (
                <>
                    <rect height="18" rx="2" width="18" x="3" y="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m3 17 5-5 4 4 3-3 6 6" />
                </>
            ) : view === "gear" ? (
                <>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
                </>
            ) : view === "training" ? (
                <path d="M3 19h18M5 16l5-5 4 3 5-7m-4 0h4v4" />
            ) : view === "about" ? (
                <>
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20v-2a6 6 0 0 1 12 0v2H3Zm13-14a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5" />
                </>
            ) : (
                <>
                    <path d="M4 7h10m4 0h2M4 17h2m4 0h10" />
                    <circle cx="16" cy="7" r="2" />
                    <circle cx="8" cy="17" r="2" />
                </>
            )}
        </svg>
    );
}

export function BottomNavigation({
    active_view,
    locale,
    on_select,
}: BottomNavigationProps) {
    return (
        <nav
            aria-label={translate(locale, "primary_navigation")}
            class="bottom-navigation"
        >
            <div class="bottom-navigation__items">
                {NAV_ITEMS.map((view) => (
                    <button
                        aria-current={active_view === view ? "page" : undefined}
                        aria-label={translate(locale, view)}
                        class={active_view === view ? "is-active" : ""}
                        key={view}
                        onClick={() => on_select(view)}
                        type="button"
                    >
                        <NavigationIcon view={view} />
                        <small>{translate(locale, `nav_${view}`)}</small>
                    </button>
                ))}
            </div>
        </nav>
    );
}
