import type { PageHeroContent } from "../lib/page_hero";

interface PageHeroProps {
    content: PageHeroContent;
    on_action: () => void;
}

export function PageHero({ content, on_action }: PageHeroProps) {
    return (
        <section
            aria-labelledby="page-hero-title"
            class="page-hero"
            data-view={content.view}
        >
            <img
                alt={content.title}
                class="page-hero__image"
                loading="eager"
                src={content.image_url}
            />
            <div aria-hidden="true" class="page-hero__overlay" />
            <div class="page-hero__content">
                <span class="page-hero__eyebrow">{content.eyebrow}</span>
                <h1 class="page-hero__title" id="page-hero-title">
                    {content.title}
                </h1>
                {content.meta ? <p class="page-hero__meta">{content.meta}</p> : null}
                <p class="page-hero__description">{content.description}</p>
                {content.action_label ? (
                    <button class="page-hero__action" onClick={on_action} type="button">
                        {content.action_label} <span aria-hidden="true">→</span>
                    </button>
                ) : null}
            </div>
            <span aria-hidden="true" class="page-hero__scroll-cue">
                ↓
            </span>
        </section>
    );
}
