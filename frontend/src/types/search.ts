/**
 * Search System Type Definitions
 * Phase 4.1: Global Search & Content Governance
 * 
 * Diese Typen definieren die Struktur des Suchindex und der Suchergebnisse
 * gemäß dem Content Governance Guide.
 */

export type Collection = 'media' | 'gear' | 'training' | 'routes' | 'events';
export type Language = 'de' | 'en' | 'zh';

// Region Types (gemäß Governance Guide 2.4.2)
export type Region =
  | 'munich-south'    //慕尼黑南郊
  | 'munich-north'    // 慕尼黑北郊
  | 'alps-bavaria'    // 巴伐利亚阿尔卑斯
  | 'alps-austria'    // 奥地利阿尔卑斯
  | 'alps-italy'      // 意大利多洛米蒂
  | 'island-spain';   // 西班牙海岛

// Difficulty Types (gemäß Governance Guide 2.4.3)
export type Difficulty =
  | 'easy'    // 🟢 <60km, <400m
  | 'medium'  // 🟡 60-100km, 400-1000m
  | 'hard'    // 🟠 100-150km, 1000-2000m
  | 'expert'; // 🔴 >150km, >2000m

// Gear Category Types (gemäß Governance Guide 2.1)
export type GearCategory =
  | 'bike-build'    // 单车选购与组装
  | 'electronics'   // 电子与穿戴
  | 'apparel'       // 人身装备
  | 'maintenance';  // 维修保养

// Training Category Types (gemäß Governance Guide 2.2)
export type TrainingCategory =
  | 'physical'   // 体能训练
  | 'planning'   // 训练计划
  | 'wellness'   // 营养与健康
  | 'analytics'; // 数据分析

// Media Format Types (gemäß Governance Guide 2.3.1)
export type MediaType =
  | 'video'      // 影像作品
  | 'interview'  // 骑友访谈
  | 'adventure'  // 翻山越岭
  | 'gallery';   // 活动图集

// Event Types
export type EventType =
  | 'social-ride'    // 休闲骑
  | 'training-camp'  // 训练营
  | 'race'           // 比赛
  | 'workshop';      // 工作坊

// Surface Types
export type Surface =
  | 'tarmac'  // 铺装路面
  | 'gravel'  // 碎石路面
  | 'mixed';  // 混合路面

/**
 * Base Search Item
 * Alle Sucheinträge haben diese gemeinsamen Felder
 */
export interface BaseSearchItem {
  collection: Collection;
  slug: string;
  lang: Language;
}

/**
 * Media Search Item
 * 车影骑踪 - Medien und Geschichten
 */
export interface MediaSearchItem extends BaseSearchItem {
  collection: 'media';
  title: string;
  description?: string;
  type: MediaType;
  tags: string[];
  date: string; // ISO 8601 format
  coverImage: string;
}

/**
 * Gear Search Item
 * 器械知识 - Ausrüstung und Technik
 */
export interface GearSearchItem extends BaseSearchItem {
  collection: 'gear';
  title: string;
  description?: string;
  category: GearCategory;
  subcategory?: string;
  author: string;
  date: string; // ISO 8601 format
  coverImage?: string;
}

/**
 * Training Search Item
 * 科学训练 - Training und Wissenschaft
 */
export interface TrainingSearchItem extends BaseSearchItem {
  collection: 'training';
  title: string;
  description?: string;
  category: TrainingCategory;
  tags: string[];
  author: string;
  date: string; // ISO 8601 format
  coverImage?: string;
}

/**
 * Route Search Item
 * 骑行路线 - Routen und Strecken
 */
export interface RouteSearchItem extends BaseSearchItem {
  collection: 'routes';
  name: string;
  description?: string;
  region: Region;
  difficulty: Difficulty;
  distance: number; // km
  elevation: number; // m
  surface: Surface;
  gpxFile?: string;
  coverImage?: string;
}

/**
 * Event Search Item
 * 慕城日常 - Events und Aktivitäten
 */
export interface EventSearchItem extends BaseSearchItem {
  collection: 'events';
  title: string;
  description?: string;
  location: string;
  date: string; // ISO 8601 format
  eventType: EventType;
  coverImage?: string;
}

/**
 * Union Type für alle Sucheinträge
 */
export type SearchItem =
  | MediaSearchItem
  | GearSearchItem
  | TrainingSearchItem
  | RouteSearchItem
  | EventSearchItem;

/**
 * Search Index Structure
 * Die Struktur des generierten JSON-Index
 */
export interface SearchIndex {
  version: string;
  generated: string; // ISO 8601 timestamp
  lang: Language;
  collections: {
    media: MediaSearchItem[];
    gear: GearSearchItem[];
    training: TrainingSearchItem[];
    routes: RouteSearchItem[];
    events: EventSearchItem[];
  };
}

/**
 * Search Result
 * Ergebnis einer Fuse.js Suche mit Score und Matches
 */
export interface SearchResult<T extends SearchItem = SearchItem> {
  item: T;
  score?: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: [number, number][];
  }>;
}

/**
 * Filter State
 * Zustand der aktiven Filter (wird in URL synchronisiert)
 */
export interface FilterState {
  [key: string]: string | string[] | number | [number, number] | undefined;
}

/**
 * Filter Configuration
 * Definiert die verfügbaren Filter für eine Collection
 */
export interface FilterConfig {
  key: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  label: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/**
 * Asset Validation Result
 * Ergebnis der Asset-Pfad-Validierung
 */
export interface AssetValidationResult {
  valid: boolean;
  path: string;
  collection: Collection;
  warnings: string[];
  errors: string[];
}
