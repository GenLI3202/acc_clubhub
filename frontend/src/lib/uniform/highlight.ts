// src/lib/uniform/highlight.ts
// Finds one phrase inside a paragraph of copy, so the page can style it on
// its own while the copy files stay plain strings.

export interface PhraseParts {
    readonly before: string;
    readonly match: string;
    readonly after: string;
}

/** Splits `text` around the first occurrence of `phrase`; null when it is absent or empty. */
export function splitAtPhrase(text: string, phrase: string): PhraseParts | null {
    if (phrase === '') return null;
    const at = text.indexOf(phrase);
    if (at === -1) return null;
    return {
        before: text.slice(0, at),
        match: phrase,
        after: text.slice(at + phrase.length),
    };
}
