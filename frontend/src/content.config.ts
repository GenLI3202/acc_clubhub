// frontend/src/content.config.ts
// Phase 4.1: Content Collections mit Content Governance Integration
// Aktualisiert gemäß Content Governance Guide und Search System Requirements
// Mit Abwärtskompatibilität für bestehende Content-Dateien

import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// ─────────────────────────────────────────────────────────────────
// Konstanten gemäß Content Governance Guide
// ─────────────────────────────────────────────────────────────────

// Regions (Governance Guide 2.4.2)
const REGIONS = [
  'munich-south',   // 慕尼黑南郊
  'munich-north',   // 慕尼黑北郊
  'alps-bavaria',   // 巴伐利亚阿尔卑斯
  'alps-austria',   // 奥地利阿尔卑斯
  'alps-italy',     // 意大利多洛米蒂
  'island-spain'    // 西班牙海岛
] as const;

// Difficulties (Governance Guide 2.4.3)
const DIFFICULTIES = [
  'easy',    // 🟢 <60km, <400m
  'medium',  // 🟡 60-100km, 400-1000m
  'hard',    // 🟠 100-150km, 1000-2000m
  'expert'   // 🔴 >150km, >2000m
] as const;

// Gear Categories (Governance Guide 2.1)
const GEAR_CATEGORIES = [
  'bike-build',    // 单车选购与组装
  'electronics',   // 电子与穿戴
  'apparel',       // 人身装备
  'maintenance'    // 维修保养
] as const;

// Training Categories (Governance Guide 2.2)
const TRAINING_CATEGORIES = [
  'safety',     // 安全与规范
  'skills',     // 骑行技术
  'physical',   // 体能训练
  'planning',   // 训练计划
  'wellness',   // 营养与健康
  'analytics'   // 数据分析
] as const;

// Media Types (Governance Guide 2.3.1) - mit Legacy-Support
const MEDIA_TYPES = [
  'video',      // 影像作品
  'interview',  // 骑友访谈
  'adventure',  // 翻山越岭
  'group-ride', // 团骑类
  // Legacy values für Abwärtskompatibilität
  '影像',
  '访谈',
  '翻山越岭'
] as const;

// Event Types
const EVENT_TYPES = [
  'after-work',     // 下班骑
  'social-ride',    // 休闲骑
  'training-ride',  // 训练骑
  'training-camp',  // 训练营
  'race',           // 比赛
  'workshop',       // 工作坊
  'special',        // 特别活动
  'gathering',      // 聚会
  'multi-day'       // 多日活动
] as const;

const EVENT_SECTIONS = ['hero', 'upcoming', 'regular'] as const;

const RECURRENCE_FREQUENCIES = [
  'weekly',
] as const;

// Surface Types
const SURFACES = [
  'tarmac',  // 铺装路面
  'gravel',  // 碎石路面
  'mixed'    // 混合路面
] as const;

// Languages
const LANGUAGES = ['de', 'en', 'zh'] as const;

// ─────────────────────────────────────────────────────────────────
// 🎬 车影骑踪 (Media)
// ─────────────────────────────────────────────────────────────────
const mediaCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/media',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    // Neue Felder (optional für Abwärtskompatibilität)
    lang: z.enum(LANGUAGES).optional(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(MEDIA_TYPES),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(), // Akzeptiert Date oder String
    author: z.string().default('ACC Club'),
    status: z.enum(['draft', 'published']).default('published'),
    featured: z.boolean().default(false),

    // Unterstütze beide Feldnamen
    coverImage: z.string().optional(),
    cover: z.string().optional(),

    videoUrl: z.string().optional(),
    xiaohongshuUrl: z.string().optional(),
  }).transform((data) => ({
    ...data,
    // Normalisiere coverImage
    coverImage: data.coverImage || data.cover || '',
    // Konvertiere Date zu ISO String für Search Index
    date: data.date.toISOString().split('T')[0],
    // Setze lang basierend auf Pfad wenn nicht vorhanden
    lang: data.lang || 'de' as const,
  })),
});

// ─────────────────────────────────────────────────────────────────
// 🔧 器械知识 (Gear)
// ─────────────────────────────────────────────────────────────────
const gearCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/knowledge/gear',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    lang: z.enum(LANGUAGES).optional(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(GEAR_CATEGORIES).optional(),
    subcategory: z.string().optional(),
    author: z.string(),
    status: z.enum(['draft', 'published']).default('published'),
    featured: z.boolean().default(false),
    date: z.coerce.date(),
    coverImage: z.string().optional(),
    cover: z.string().optional(),
    xiaohongshuUrl: z.string().optional(),
  }).transform((data) => ({
    ...data,
    coverImage: data.coverImage || data.cover,
    date: data.date.toISOString().split('T')[0],
    lang: data.lang || 'de' as const,
    category: data.category || 'bike-build' as const,
  })),
});

// ─────────────────────────────────────────────────────────────────
// 📊 科学训练 (Training)
// ─────────────────────────────────────────────────────────────────
const trainingCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/knowledge/training',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    lang: z.enum(LANGUAGES).optional(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(TRAINING_CATEGORIES).optional(),
    tags: z.array(z.string()).default([]),
    author: z.string(),
    status: z.enum(['draft', 'published']).default('published'),
    featured: z.boolean().default(false),
    date: z.coerce.date(),
    coverImage: z.string().optional(),
    cover: z.string().optional(),
    xiaohongshuUrl: z.string().optional(),
  }).transform((data) => ({
    ...data,
    coverImage: data.coverImage || data.cover,
    date: data.date.toISOString().split('T')[0],
    lang: data.lang || 'de' as const,
    category: data.category || 'physical' as const,
  })),
});

// ─────────────────────────────────────────────────────────────────
// 🗺️ 骑行路线 (Routes)
// ─────────────────────────────────────────────────────────────────
const routesCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/routes',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    lang: z.enum(LANGUAGES).optional(),
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    region: z.string(), // Flexibel für Migration
    difficulty: z.enum(DIFFICULTIES),
    distance: z.number(),
    elevation: z.number(),
    surface: z.enum(SURFACES).optional(),
    author: z.string().default('ACC Club'),
    status: z.enum(['draft', 'published']).default('published'),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    cover: z.string().optional(),
    gpxFile: z.string().optional(),
    stravaUrl: z.string().optional(),
    komootUrl: z.string().optional(),
    xiaohongshuUrl: z.string().optional(),
  }).transform((data) => ({
    ...data,
    coverImage: data.coverImage || data.cover,
    lang: data.lang || 'de' as const,
    surface: data.surface || 'tarmac' as const,
    description: data.description || '',
  })).refine((data) => data.stravaUrl || data.komootUrl, {
    message: 'At least one of stravaUrl or komootUrl is required',
    path: ['stravaUrl'],
  }),
});

// ─────────────────────────────────────────────────────────────────
// 📅 慕城日常 (Events) - Optional, da Ordner möglicherweise nicht existiert
// ─────────────────────────────────────────────────────────────────
const eventsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/events',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    lang: z.enum(LANGUAGES).optional(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    location: z.string(),
    date: z.coerce.date(),
    author: z.string().default('ACC Club'),
    status: z.enum(['draft', 'published']).default('published'),
    eventType: z.enum(EVENT_TYPES).optional(),
    coverImage: z.string().optional(),
    cover: z.string().optional(),
    xiaohongshuUrl: z.string().optional(),
    maxParticipants: z.number().optional(),
    registrationDeadline: z.coerce.date().optional(),
    registrationReopened: z.boolean().optional().default(false),
    directOnly: z.boolean().optional().default(false),
    displayUntil: z.coerce.date().optional(),
    registrationLink: z.string().optional(),
    ACCOfficialRide: z.boolean().optional(),
    wechatQrCode: z.string().optional(),
    distanceKm: z.number().optional(),
    routeDistanceKm: z.number().optional(),
    routeKomootUrl: z.string().optional(),
    routeStravaUrl: z.string().optional(),
    // displaySections is the canonical frontmatter field for which sections of the events page this event appears in.
    // 'hero'     → featured carousel at the top (max 2-3 events)
    // 'upcoming' → upcoming events card grid
    // 'regular'  → weekly regulars compact list (recurring rides)
    // Past events (date < today) always appear in the archive regardless of this field.
    displaySection: z.enum(EVENT_SECTIONS).optional().default('upcoming'),
    displaySections: z.array(z.enum(EVENT_SECTIONS)).min(1).optional(),
    recurring: z.object({
      enabled: z.boolean().optional().default(true),
      frequency: z.enum(RECURRENCE_FREQUENCIES).default('weekly'),
      intervalWeeks: z.number().int().positive().optional().default(1),
      timezone: z.string().optional().default('Europe/Berlin'),
      rolloverTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default('22:00'),
      slugBase: z.string().optional(),
      registrationDeadlineHoursBefore: z.number().nonnegative().optional(),
      registrationDeadlineOverrides: z.record(z.string(), z.string()).optional(),
      paused: z.boolean().optional().default(false),
    }).optional(),
    // featured is deprecated. displaySection remains only for legacy parse compatibility; new content should use displaySections.
    featured: z.boolean().optional(),
  }).transform((data) => ({
    ...data,
    coverImage: data.coverImage || data.cover,
    date: data.date.toISOString(),
    lang: data.lang || 'de' as const,
    eventType: data.eventType || 'social-ride' as const,
    description: data.description || '',
    registrationDeadline: data.registrationDeadline?.toISOString() ?? null,
    displayUntil: data.displayUntil?.toISOString() ?? null,
    distanceKm: data.distanceKm ?? data.routeDistanceKm ?? undefined,
    displaySections: data.displaySections ?? [data.displaySection],
    routeKomootUrl: data.routeKomootUrl || undefined,
    routeStravaUrl: data.routeStravaUrl || undefined,
  })),
});

// ─────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────
export const collections = {
  media: mediaCollection,
  gear: gearCollection,
  training: trainingCollection,
  routes: routesCollection,
  events: eventsCollection,
};
