import { createHash } from "node:crypto";
import { marked } from "marked";
import sanitize_html from "sanitize-html";

import {
    MOBILE_CONTENT_SCHEMA_VERSION,
    type MobileContentFeed,
    type MobileContentItem,
    type MobileLocale,
} from "../../../../shared/mobile_content";

const ALLOWED_TAGS = [
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
];

export const DEFAULT_MOBILE_SITE_URL = "https://www.across-cc.de";
export const DEFAULT_MINIMUM_APP_VERSION = "0.1.0";

export function normalize_public_url(
    value: string | undefined,
    site_url: string = DEFAULT_MOBILE_SITE_URL,
): string | undefined {
    if (!value?.trim()) {
        return undefined;
    }

    try {
        const url = new URL(value, site_url);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return undefined;
        }
        return url.toString();
    } catch {
        return undefined;
    }
}

export function sanitize_mobile_markdown(
    markdown: string | undefined,
    site_url: string = DEFAULT_MOBILE_SITE_URL,
): string {
    const rendered_html = marked.parse(markdown ?? "", {
        async: false,
        gfm: true,
    }) as string;

    return sanitize_html(rendered_html, {
        allowedAttributes: {
            a: ["href", "rel", "target", "title"],
            code: ["class"],
            img: ["alt", "loading", "src", "title"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        allowedSchemesAppliedToAttributes: ["href", "src"],
        allowedTags: ALLOWED_TAGS,
        allowProtocolRelative: false,
        enforceHtmlBoundary: true,
        transformTags: {
            a: (_tag_name, attributes) => {
                const href = normalize_public_url(attributes.href, site_url);
                return {
                    tagName: "a",
                    attribs: {
                        ...(href ? { href } : {}),
                        rel: "noopener noreferrer",
                        target: "_blank",
                        ...(attributes.title
                            ? { title: attributes.title }
                            : {}),
                    },
                };
            },
            img: (_tag_name, attributes) => {
                const src = normalize_public_url(attributes.src, site_url);
                return {
                    tagName: "img",
                    attribs: {
                        ...(attributes.alt ? { alt: attributes.alt } : {}),
                        loading: "lazy",
                        ...(src ? { src } : {}),
                        ...(attributes.title
                            ? { title: attributes.title }
                            : {}),
                    },
                };
            },
        },
    });
}

export function create_mobile_content_feed(
    locale: MobileLocale,
    items: MobileContentItem[],
    generated_at: string = new Date().toISOString(),
    minimum_app_version: string = DEFAULT_MINIMUM_APP_VERSION,
): MobileContentFeed {
    const sorted_items = [...items].sort((left, right) =>
        left.id.localeCompare(right.id),
    );
    const item_ids = new Set<string>();

    for (const item of sorted_items) {
        if (item.locale !== locale) {
            throw new Error(
                `Item ${item.id} uses locale ${item.locale}, expected ${locale}`,
            );
        }
        if (item_ids.has(item.id)) {
            throw new Error(`Duplicate mobile content id: ${item.id}`);
        }
        item_ids.add(item.id);
    }

    const revision_source = JSON.stringify({
        items: sorted_items,
        locale,
        minimum_app_version,
        schema_version: MOBILE_CONTENT_SCHEMA_VERSION,
    });
    const content_revision = createHash("sha256")
        .update(revision_source)
        .digest("hex");

    return {
        content_revision: `sha256:${content_revision}`,
        generated_at,
        items: sorted_items,
        locale,
        minimum_app_version,
        schema_version: MOBILE_CONTENT_SCHEMA_VERSION,
    };
}
