import { useRef } from 'preact/hooks';

import type { SymbolKey, UniformCopy } from '../../lib/uniform/copy/types';

interface DesignStoryProps {
    copy: UniformCopy;
}

const SYMBOL_FILES: Readonly<Record<SymbolKey, string>> = {
    mountains: 'mountain-rider',
    paths: 'parallel',
    borders: 'bridge',
    across: 'crossing',
};

/**
 * "Read the design idea": a button on the jersey card that opens the story of
 * the kit in a modal. A native <dialog> gives focus trapping and Esc to close;
 * the text stays in the page's HTML (closed), so it is still indexable.
 */
export function DesignStory({ copy }: DesignStoryProps) {
    const { story, shop } = copy;
    const dialog = useRef<HTMLDialogElement>(null);

    const open = () => dialog.current?.showModal();
    const close = () => dialog.current?.close();

    return (
        <>
            <button type="button" class="kit-design-btn" onClick={open}>
                {shop.designButton} <span aria-hidden="true">→</span>
            </button>

            <dialog
                class="kit-dialog"
                ref={dialog}
                aria-labelledby="kit-story-title"
                // A click on the backdrop lands on the <dialog> itself, not on the panel.
                onClick={(event) => {
                    if (event.target === dialog.current) close();
                }}
            >
                <div class="kit-dialog-panel">
                    <button type="button" class="kit-dialog-close" aria-label={story.close} onClick={close}>
                        <span aria-hidden="true">×</span>
                    </button>

                    <div class="kit-story-grid">
                        <div>
                            <p class="kit-eyebrow">{story.eyebrow}</p>
                            <h2 class="kit-h2" id="kit-story-title">
                                {story.title}
                            </h2>
                            {story.opening.map((paragraph) => (
                                <p class="kit-story-p" key={paragraph}>
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                        <figure class="kit-story-photo" data-sample={shop.sampleBadge}>
                            <img
                                src="/images/uniform/model-front-zoom.webp"
                                alt={shop.imageAlt.front}
                                width="663"
                                height="884"
                                loading="lazy"
                                decoding="async"
                            />
                        </figure>
                    </div>

                    {/* The seals and the club name sit on the back, so the second half goes beside the back photo. */}
                    <div class="kit-story-grid kit-story-grid--flip">
                        <div>
                            {story.closing.map((paragraph) => (
                                <p class="kit-story-p" key={paragraph}>
                                    {paragraph}
                                </p>
                            ))}
                            <p class="kit-story-coda">{story.coda}</p>
                            <p class="kit-produced">{story.producedBy}</p>
                        </div>
                        <figure class="kit-story-photo kit-story-photo--back" data-sample={shop.sampleBadge}>
                            <img
                                src="/images/uniform/model-back.webp"
                                alt={shop.imageAlt.back}
                                width="1086"
                                height="1448"
                                loading="lazy"
                                decoding="async"
                            />
                        </figure>
                    </div>

                    <figure class="kit-flat">
                        <img
                            src="/images/uniform/flat-jersey.webp"
                            alt={shop.imageAlt.flat}
                            width="1400"
                            height="890"
                            loading="lazy"
                            decoding="async"
                        />
                    </figure>

                    <div class="kit-meaning">
                        <div>
                            <h3 class="kit-h3">{story.symbolsTitle}</h3>
                            <p class="kit-symbols-intro">{story.symbolsIntro}</p>
                            <ul class="kit-symbols">
                                {story.symbols.map((symbol) => (
                                    <li key={symbol.key}>
                                        <img
                                            src={`/images/about/symbols/${SYMBOL_FILES[symbol.key]}.svg`}
                                            alt=""
                                            width="72"
                                            height="48"
                                            loading="lazy"
                                        />
                                        <span>{symbol.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 class="kit-h3">{story.detailsTitle}</h3>
                            <dl class="kit-details">
                                {story.details.map((detail) => (
                                    <div key={detail.title}>
                                        <dt>{detail.title}</dt>
                                        <dd>{detail.text}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>

                    <aside class="kit-sample" role="note">
                        <strong>{story.sampleTitle}</strong>
                        <p>{story.sampleText}</p>
                    </aside>
                </div>
            </dialog>
        </>
    );
}
