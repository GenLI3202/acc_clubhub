import type { MobileLocale } from "../../../shared/mobile_content";
import { translate } from "../i18n";

export type AppView = "events" | "favorites" | "home" | "learn" | "routes" | "settings";

interface BottomNavigationProps {
    active_view: AppView;
    locale: MobileLocale;
    on_select: (view: AppView) => void;
}

const NAV_ITEMS: Array<{
    icon: string;
    key: "events" | "favorites" | "home" | "routes" | "settings";
}> = [
    { icon: "⌂", key: "home" },
    { icon: "◉", key: "events" },
    { icon: "⌁", key: "routes" },
    { icon: "★", key: "favorites" },
    { icon: "•••", key: "settings" },
];

export function BottomNavigation({
    active_view,
    locale,
    on_select,
}: BottomNavigationProps) {
    return (
        <nav aria-label="Primary" class="bottom-navigation">
            {NAV_ITEMS.map((item) => (
                <button
                    aria-current={active_view === item.key ? "page" : undefined}
                    class={active_view === item.key ? "is-active" : ""}
                    key={item.key}
                    onClick={() => on_select(item.key)}
                    type="button"
                >
                    <span aria-hidden="true">{item.icon}</span>
                    <small>{translate(locale, item.key)}</small>
                </button>
            ))}
        </nav>
    );
}
