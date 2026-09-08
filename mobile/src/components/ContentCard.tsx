import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import { format_item_date, format_item_type } from "../lib/content";
import { translate } from "../i18n";

interface ContentCardProps {
    favorite: boolean;
    item: MobileContentItem;
    locale: MobileLocale;
    on_open: (item: MobileContentItem) => void;
    on_toggle_favorite: (item: MobileContentItem) => void;
}

export function ContentCard({
    favorite,
    item,
    locale,
    on_open,
    on_toggle_favorite,
}: ContentCardProps) {
    const date = format_item_date(item, locale);
    const location = item.metadata.location ?? item.metadata.region;

    return (
        <article class="content-card">
            <button
                aria-label={`${translate(locale, "details")}: ${item.title}`}
                class="content-card__main"
                onClick={() => on_open(item)}
                type="button"
            >
                {item.cover_image ? (
                    <img
                        alt={item.title}
                        class="content-card__image"
                        loading="lazy"
                        src={item.cover_image}
                    />
                ) : (
                    <span aria-hidden="true" class="content-card__placeholder">
                        ACC
                    </span>
                )}
                <span class="content-card__body">
                    <span class="content-card__eyebrow">
                        {format_item_type(item, locale)}
                        {date ? ` · ${date}` : ""}
                    </span>
                    <strong>{item.title}</strong>
                    {location ? <span>{location}</span> : null}
                    <span class="content-card__description">{item.description}</span>
                </span>
            </button>
            <button
                aria-label={translate(locale, favorite ? "unfavorite" : "favorite")}
                aria-pressed={favorite}
                class="icon-button content-card__favorite"
                onClick={() => on_toggle_favorite(item)}
                type="button"
            >
                <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
            </button>
        </article>
    );
}
