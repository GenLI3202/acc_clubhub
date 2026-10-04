// src/lib/uniform/copy/index.ts
import type { Locale } from '../../i18n';
import { de } from './de';
import { en } from './en';
import type { UniformCopy } from './types';
import { zh } from './zh';

export type { UniformCopy } from './types';

const COPY: Readonly<Record<Locale, UniformCopy>> = { zh, en, de };

export function getUniformCopy(lang: Locale): UniformCopy {
    return COPY[lang] ?? COPY.zh;
}

/** Replaces `{name}` placeholders; unknown names stay as they are. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
    );
}
