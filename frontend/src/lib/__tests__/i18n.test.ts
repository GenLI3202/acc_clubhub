import { describe, it, expect } from 'vitest';
import {
    getLangFromEntry,
    getLocaleFromUrl,
    t,
    locales,
    getNavLinks,
    defaultLocale,
} from '../i18n';

describe('getLangFromEntry', () => {
    it('extracts zh from media path', () => {
        expect(
            getLangFromEntry('src/content/media/zh/alps-summer-2025.md', 'media')
        ).toBe('zh');
    });

    it('extracts en from nested gear path', () => {
        expect(
            getLangFromEntry('src/content/knowledge/gear/en/bike-guide.md', 'gear')
        ).toBe('en');
    });

    it('extracts de from routes path', () => {
        expect(
            getLangFromEntry('src/content/routes/de/some-route.md', 'routes')
        ).toBe('de');
    });

    it('extracts zh from training path', () => {
        expect(
            getLangFromEntry(
                'src/content/knowledge/training/zh/ftp-basics.md',
                'training'
            )
        ).toBe('zh');
    });

    it('fallbacks to zh for invalid path', () => {
        expect(getLangFromEntry('invalid/path.md', 'media')).toBe('zh');
    });

    it('fallbacks to zh when collection not found', () => {
        expect(
            getLangFromEntry('src/content/other/zh/file.md', 'media')
        ).toBe('zh');
    });
});

describe('getLocaleFromUrl', () => {
    it('parses /zh/ url', () => {
        expect(getLocaleFromUrl(new URL('http://localhost/zh/media'))).toBe('zh');
    });

    it('parses /en/ url', () => {
        expect(getLocaleFromUrl(new URL('http://localhost/en/about'))).toBe('en');
    });

    it('parses /de/ url', () => {
        expect(getLocaleFromUrl(new URL('http://localhost/de/'))).toBe('de');
    });

    it('parses nested path', () => {
        expect(
            getLocaleFromUrl(new URL('http://localhost/zh/knowledge/gear'))
        ).toBe('zh');
    });

    it('fallbacks for invalid locale', () => {
        expect(getLocaleFromUrl(new URL('http://localhost/fr/test'))).toBe('zh');
    });

    it('fallbacks for root url', () => {
        expect(getLocaleFromUrl(new URL('http://localhost/'))).toBe('zh');
    });
});

describe('t (translation)', () => {
    it('returns zh translation for nav.media', () => {
        expect(t('zh', 'nav.media')).toBe('车影骑踪');
    });

    it('returns zh translation for nav.home', () => {
        expect(t('zh', 'nav.home')).toBe('首页');
    });

    it('returns en translation for nav.media', () => {
        expect(t('en', 'nav.media')).toBe('Media');
    });

    it('returns en translation for content.back', () => {
        expect(t('en', 'content.back')).toBe('Back to List');
    });

    it('returns de translation for nav.home', () => {
        expect(t('de', 'nav.home')).toBe('Startseite');
    });

    it('returns de translation for content.readMore', () => {
        expect(t('de', 'content.readMore')).toBe('Weiterlesen');
    });
});

describe('getNavLinks', () => {
    it('generates correct number of links', () => {
        const links = getNavLinks('zh');
        expect(links.length).toBe(7);
    });

    it('generates correct links for zh', () => {
        const links = getNavLinks('zh');
        expect(links[0].href).toBe('/zh');
        expect(links[0].label).toBe('首页');
        expect(links.find((l) => l.href === '/zh/media')).toBeDefined();
    });

    it('generates correct links for en', () => {
        const links = getNavLinks('en');
        expect(links[0].href).toBe('/en');
        expect(links[0].label).toBe('Home');
    });

    it('generates correct links for de', () => {
        const links = getNavLinks('de');
        expect(links[0].href).toBe('/de');
        expect(links[0].label).toBe('Startseite');
    });
});

describe('locales constant', () => {
    it('contains zh, en, de', () => {
        expect(locales).toContain('zh');
        expect(locales).toContain('en');
        expect(locales).toContain('de');
    });

    it('has exactly 3 locales', () => {
        expect(locales).toHaveLength(3);
    });
});

describe('defaultLocale', () => {
    it('is zh', () => {
        expect(defaultLocale).toBe('zh');
    });
});
