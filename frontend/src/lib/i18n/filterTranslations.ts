
// src/lib/i18n/filterTranslations.ts
import type { Locale } from "../i18n";

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
        'munich-south': { zh: '慕尼黑南', de: 'München Süd', en: 'Munich South' },
        'munich-north': { zh: '慕尼黑北', de: 'München Nord', en: 'Munich North' },
        'alps-bavaria': { zh: '巴伐利亚阿尔卑斯', de: 'Bayerische Alpen', en: 'Bavarian Alps' },
        'alps-austria': { zh: '奥地利阿尔卑斯', de: 'Österreichische Alpen', en: 'Austrian Alps' },
        'alps-italy': { zh: '多洛米蒂', de: 'Dolomiten', en: 'Dolomites' },
        'island-spain': { zh: '西班牙海岛', de: 'Spanische Inseln', en: 'Spanish Islands' }
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
