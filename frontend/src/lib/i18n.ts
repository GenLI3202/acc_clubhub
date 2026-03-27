// src/lib/i18n.ts
// Phase 3.3: i18n 工具函数

export const locales = ['zh', 'en', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

/**
 * 从 entry.filePath 提取语言 (稳健方式)
 * @example getLangFromEntry("src/content/media/zh/alps.md", "media") => "zh"
 */
export function getLangFromEntry(filePath: string | undefined, collection: string): Locale {
    if (!filePath) return defaultLocale;
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
        'search.placeholder': '搜索...',
        'search.noResults': '未找到相关内容',
        'comments.title': '评论区',
        'comments.description': '使用 GitHub 账号或邮箱参与讨论',
        // Event Registration
        'event.register': '立即报名',
        'event.registering': '报名中...',
        'event.registered': '已报名',
        'event.spotsAvailable': '剩余席位',
        'event.noSpotsLeft': '已满员',
        'event.waitlist': '等待名单',
        'event.formEmail': '邮箱地址',
        'event.formName': '姓名',
        'event.formNotes': '备注（可选）',
        'event.privacyAcceptPrefix': '我同意',
        'event.privacyPolicy': '隐私政策',
        'event.subscribe': '订阅 ACC 活动通知',
        'event.submitBtn': '提交报名',
        'event.success': '报名成功！确认邮件已发送至：',
        'event.waitlistSuccess': '已加入等待名单',
        'event.errorDuplicate': '该邮箱已报名此活动',
        'event.errorDeadline': '报名已截止',
        'event.errorPrivacy': '请先同意隐私政策',
        'event.errorNetwork': '无法连接报名服务器，请稍后重试',
        'event.errorServer': '服务器错误，请稍后重试',
        'event.errorInit': '无法加载报名表单，请刷新页面重试',
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
        'search.placeholder': 'Search...',
        'search.noResults': 'No results found',
        'comments.title': 'Comments',
        'comments.description': 'Join with GitHub or email',
        // Event Registration
        'event.register': 'Register Now',
        'event.registering': 'Registering...',
        'event.registered': 'Registered',
        'event.spotsAvailable': 'Spots Available',
        'event.noSpotsLeft': 'Sold Out',
        'event.waitlist': 'Waitlist',
        'event.formEmail': 'Email Address',
        'event.formName': 'Name',
        'event.formNotes': 'Notes (Optional)',
        'event.privacyAcceptPrefix': 'I accept the',
        'event.privacyPolicy': 'Privacy Policy',
        'event.subscribe': 'Subscribe to ACC event notifications',
        'event.submitBtn': 'Submit Registration',
        'event.success': 'Registration successful! Confirmation email sent to: ',
        'event.waitlistSuccess': 'Added to waitlist',
        'event.errorDuplicate': 'This email is already registered',
        'event.errorDeadline': 'Registration deadline has passed',
        'event.errorPrivacy': 'Please accept the privacy policy',
        'event.errorNetwork': 'Unable to connect to the server. Please try again later.',
        'event.errorServer': 'Server error. Please try again later.',
        'event.errorInit': 'Unable to load registration form. Please refresh the page.',
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
        'search.placeholder': 'Suchen...',
        'search.noResults': 'Nichts gefunden',
        'comments.title': 'Kommentare',
        'comments.description': 'Mit GitHub oder E-Mail teilnehmen',
        // Event Registration
        'event.register': 'Jetzt anmelden',
        'event.registering': 'Anmelden...',
        'event.registered': 'Angemeldet',
        'event.spotsAvailable': 'Verfügbare Plätze',
        'event.noSpotsLeft': 'Ausverkauft',
        'event.waitlist': 'Warteliste',
        'event.formEmail': 'E-Mail-Adresse',
        'event.formName': 'Name',
        'event.formNotes': 'Notizen (Optional)',
        'event.privacyAcceptPrefix': 'Ich akzeptiere die',
        'event.privacyPolicy': 'Datenschutzerklärung',
        'event.subscribe': 'ACC-Veranstaltungsbenachrichtigungen abonnieren',
        'event.submitBtn': 'Anmeldung absenden',
        'event.success': 'Anmeldung erfolgreich! Bestätigungs-E-Mail gesendet an: ',
        'event.waitlistSuccess': 'Zur Warteliste hinzugefügt',
        'event.errorDuplicate': 'Diese E-Mail ist bereits registriert',
        'event.errorDeadline': 'Anmeldefrist abgelaufen',
        'event.errorPrivacy': 'Bitte akzeptieren Sie die Datenschutzerklärung',
        'event.errorNetwork': 'Keine Verbindung zum Server. Bitte versuchen Sie es später erneut.',
        'event.errorServer': 'Serverfehler. Bitte versuchen Sie es später erneut.',
        'event.errorInit': 'Anmeldeformular konnte nicht geladen werden. Bitte laden Sie die Seite neu.',
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
