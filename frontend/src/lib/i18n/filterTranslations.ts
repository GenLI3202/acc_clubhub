
// src/lib/i18n/filterTranslations.ts
import type { Locale } from "../i18n";

const FILTER_UI_TRANSLATIONS = {
    reset: { zh: "重置", de: "Zurücksetzen", en: "Reset" },
    close: { zh: "关闭", de: "Schließen", en: "Close" },
    show_all: { zh: "显示全部", de: "Alle anzeigen", en: "Show All" },
    show_less: { zh: "收起", de: "Weniger anzeigen", en: "Show Less" },
    no_options: {
        zh: "没有可用选项",
        de: "Keine Optionen verfügbar",
        en: "No options available",
    },
    minimum_value: { zh: "最小值", de: "Mindestwert", en: "Minimum value" },
    maximum_value: { zh: "最大值", de: "Höchstwert", en: "Maximum value" },
} satisfies Record<string, Record<Locale, string>>;

const FILTER_SECTION_TRANSLATIONS: Record<string, Record<Locale, string>> = {
    type: { zh: "形式", de: "Format", en: "Format" },
    category: { zh: "分类", de: "Kategorie", en: "Category" },
    subcategory: { zh: "子分类", de: "Unterkategorie", en: "Subcategory" },
    author: { zh: "作者", de: "Autor", en: "Author" },
    tags: { zh: "标签", de: "Tags", en: "Tags" },
    eventType: { zh: "活动类型", de: "Veranstaltungstyp", en: "Type" },
    region: { zh: "区域", de: "Region", en: "Region" },
    difficulty: { zh: "难度", de: "Schwierigkeit", en: "Difficulty" },
    surface: { zh: "路面", de: "Untergrund", en: "Surface" },
    distance: { zh: "距离", de: "Distanz", en: "Distance" },
    elevation: { zh: "累计爬升", de: "Höhenmeter", en: "Elevation" },
    sort: { zh: "排序", de: "Sortieren", en: "Sort By" },
};

export type FilterUiKey = keyof typeof FILTER_UI_TRANSLATIONS;

export function getFilterUiLabel(key: FilterUiKey, lang: Locale): string {
    return FILTER_UI_TRANSLATIONS[key][lang];
}

export function getFilterSectionLabel(
    filter_key: string,
    fallback: string,
    lang: Locale,
): string {
    return FILTER_SECTION_TRANSLATIONS[filter_key]?.[lang] ?? fallback;
}

export const FILTER_TRANSLATIONS: Record<string, Record<string, Record<string, string>>> = {
    // Media Types
    type: {
        video: { zh: '影像', de: 'Video', en: 'Video' },
        interview: { zh: '访谈', de: 'Interview', en: 'Interview' },
        adventure: { zh: '翻山越岭', de: 'Abenteuer', en: 'Adventure' },
        gallery: { zh: '图集', de: 'Galerie', en: 'Gallery' }
    },
    // Gear/Training Categories
    category: {
        'bike-build': { zh: '单车组装', de: 'Fahrradbau', en: 'Bike Build' },
        'electronics': { zh: '电子设备', de: 'Elektronik', en: 'Electronics' },
        'apparel': { zh: '骑行服饰', de: 'Bekleidung', en: 'Apparel' },
        'maintenance': { zh: '维修保养', de: 'Wartung', en: 'Maintenance' },
        'safety': { zh: '安全与规范', de: 'Sicherheit & Regeln', en: 'Safety & Rules' },
        'skills': { zh: '骑行技术', de: 'Fahrtechnik', en: 'Riding Skills' },
        'physical': { zh: '体能训练', de: 'Körperlich', en: 'Physical' },
        'planning': { zh: '训练规划', de: 'Planung', en: 'Planning' },
        'wellness': { zh: '健康恢复', de: 'Wellness', en: 'Wellness' },
        'analytics': { zh: '数据分析', de: 'Analytik', en: 'Analytics' }
    },
    // Events
    eventType: {
        'social-ride': { zh: '休闲骑', de: 'Social Ride', en: 'Social Ride' },
        'training-camp': { zh: '训练营', de: 'Trainingslager', en: 'Training Camp' },
        'race': { zh: '比赛', de: 'Rennen', en: 'Race' },
        'workshop': { zh: '工作坊', de: 'Workshop', en: 'Workshop' }
    },
    // Common
    difficulty: {
        easy: { zh: '休闲', de: 'Einfach', en: 'Easy' },
        medium: { zh: '进阶', de: 'Mittel', en: 'Medium' },
        hard: { zh: '挑战', de: 'Schwer', en: 'Hard' },
        expert: { zh: '硬核', de: 'Expert', en: 'Expert' }
    },
    region: {
        'munich-city': { zh: '慕尼黑市区', de: 'München Stadt', en: 'Munich City' },
        'munich-south': { zh: '慕尼黑南', de: 'München Süd', en: 'Munich South' },
        'munich-north': { zh: '慕尼黑北', de: 'München Nord', en: 'Munich North' },
        'alps-bavaria': { zh: '巴伐利亚阿尔卑斯', de: 'Bayerische Alpen', en: 'Bavarian Alps' },
        'alps-austria': { zh: '奥地利阿尔卑斯', de: 'Österreichische Alpen', en: 'Austrian Alps' },
        'alps-italy': { zh: '多洛米蒂', de: 'Dolomiten', en: 'Dolomites' },
        'island-spain': { zh: '西班牙海岛', de: 'Spanische Inseln', en: 'Spanish Islands' }
    },
    surface: {
        tarmac: { zh: '铺装路面', de: 'Asphalt', en: 'Tarmac' },
        gravel: { zh: '碎石路面', de: 'Gravel', en: 'Gravel' },
        mixed: { zh: '混合路面', de: 'Gemischt', en: 'Mixed' }
    },
    sort: {
        'date-desc': { zh: '最新发布', de: 'Neueste zuerst', en: 'Newest First' },
        'date-asc': { zh: '最早发布', de: 'Älteste zuerst', en: 'Oldest First' },
        'name-asc': { zh: '名称 (A-Z)', de: 'Name (A-Z)', en: 'Name (A-Z)' },
        'name-desc': { zh: '名称 (Z-A)', de: 'Name (Z-A)', en: 'Name (Z-A)' }
    }
};

/**
 * Get localized label for a filter option
 * @param filterKey The filter key (e.g., 'type', 'category', 'author')
 * @param value The option value (e.g., 'adventure', 'tom-wang')
 * @param lang Current locale
 */
export function getFilterLabel(filterKey: string, value: string | number, lang: Locale): string {
    const valStr = String(value).toLowerCase();

    // 1. Try exact match in dictionary
    if (FILTER_TRANSLATIONS[filterKey]?.[valStr]?.[lang]) {
        return FILTER_TRANSLATIONS[filterKey][valStr][lang];
    }

    // 2. Fallback: Author formatting (e.g. "tom-wang" -> "Tom Wang")
    if (filterKey === 'author') {
        return valStr.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    }

    // 3. Fallback: Return original value
    return String(value);
}
