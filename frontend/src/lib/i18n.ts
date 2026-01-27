// src/lib/i18n.ts
// Phase 3.3: i18n 工具函数

export const locales = ['zh', 'en', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

/**
 * 从 entry.filePath 提取语言 (稳健方式)
 * @example getLangFromEntry("src/content/media/zh/alps.md", "media") => "zh"
 */
export function getLangFromEntry(filePath: string, collection: string): Locale {
    const parts = filePath.split('/');
    const collectionIndex = parts.indexOf(collection);
    const lang = parts[collectionIndex + 1];
    return locales.includes(lang as Locale) ? (lang as Locale) : defaultLocale;
}

/**
 * 从 URL 提取当前语言
 */
export function getLocaleFromUrl(url: URL): Locale {
    const [, lang] = url.pathname.split('/');
    if (locales.includes(lang as Locale)) return lang as Locale;
    return defaultLocale;
}

// UI 翻译字典
export const ui = {
    zh: {
        'nav.home': '首页',
        'nav.media': '车影骑踪',
        'nav.gear': '器械知识',
        'nav.training': '科学训练',
        'nav.routes': '骑行路线',
        'nav.events': '慕城日常',
        'nav.about': '关于 ACC',
        'content.readMore': '阅读全文',
        'content.back': '返回列表',
        'content.noContent': '暂无内容',
        'lang.zh': '中文',
        'lang.en': 'English',
        'lang.de': 'Deutsch',
    },
    en: {
        'nav.home': 'Home',
        'nav.media': 'Media',
        'nav.gear': 'Gear Guide',
        'nav.training': 'Training',
        'nav.routes': 'Routes',
        'nav.events': 'Events',
        'nav.about': 'About',
        'content.readMore': 'Read More',
        'content.back': 'Back to List',
        'content.noContent': 'No content yet',
        'lang.zh': '中文',
        'lang.en': 'English',
        'lang.de': 'Deutsch',
    },
    de: {
        'nav.home': 'Startseite',
        'nav.media': 'Medien',
        'nav.gear': 'Ausrüstung',
        'nav.training': 'Training',
        'nav.routes': 'Routen',
        'nav.events': 'Events',
        'nav.about': 'Über uns',
        'content.readMore': 'Weiterlesen',
        'content.back': 'Zurück zur Liste',
        'content.noContent': 'Noch kein Inhalt',
        'lang.zh': '中文',
        'lang.en': 'English',
        'lang.de': 'Deutsch',
    },
} as const;

export type UIKey = keyof (typeof ui)['zh'];

/**
 * 获取翻译文本
 */
export function t(locale: Locale, key: UIKey): string {
    return ui[locale][key] ?? ui.zh[key];
}

/**
 * 导航链接配置
 */
export function getNavLinks(lang: Locale) {
    return [
        { label: t(lang, 'nav.home'), href: `/${lang}` },
        { label: t(lang, 'nav.events'), href: `/${lang}/events` },
        { label: t(lang, 'nav.media'), href: `/${lang}/media` },
        { label: t(lang, 'nav.gear'), href: `/${lang}/knowledge/gear` },
        { label: t(lang, 'nav.training'), href: `/${lang}/knowledge/training` },
        { label: t(lang, 'nav.routes'), href: `/${lang}/routes` },
        { label: t(lang, 'nav.about'), href: `/${lang}/about` },
    ];
}
