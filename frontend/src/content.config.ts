// frontend/src/content.config.ts
// Phase 3.2: Astro Content Collections 配置
// 与 CMS config.yml 字段定义完全匹配

import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// ─────────────────────────────────
// 🎬 车影骑踪 (Media)
// ─────────────────────────────────
const mediaCollection = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/media',
        generateId: ({ entry }) => entry.replace(/\.md$/, ''),  // e.g., "zh/alps-ride"
    }),
    schema: z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string().optional(),
        date: z.coerce.date(),
        type: z.enum(['影像', '访谈', '翻山越岭']),
        author: z.string().default('ACC Club'),
        cover: z.string().optional(),
        videoUrl: z.string().optional(),
        xiaohongshuUrl: z.string().optional(),
    }),
});

// ─────────────────────────────────
// 🔧 器械知识 (Gear)
// ─────────────────────────────────
const gearCollection = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/knowledge/gear',
        generateId: ({ entry }) => entry.replace(/\.md$/, ''),  // e.g., "zh/bike-fit"
    }),
    schema: z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string().optional(),
        author: z.string(),
        date: z.coerce.date(),
        cover: z.string().optional(),
        xiaohongshuUrl: z.string().optional(),
    }),
});

// ─────────────────────────────────
// 📊 科学训练 (Training)
// ─────────────────────────────────
const trainingCollection = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/knowledge/training',
        generateId: ({ entry }) => entry.replace(/\.md$/, ''),  // e.g., "zh/interval-training"
    }),
    schema: z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string().optional(),
        author: z.string(),
        date: z.coerce.date(),
        cover: z.string().optional(),
        xiaohongshuUrl: z.string().optional(),
    }),
});

// ─────────────────────────────────
// 🗺️ 骑行路线 (Routes)
// 注意：没有 description 字段，使用结构化数据 (distance/elevation/difficulty) 作为摘要
// ─────────────────────────────────
const routesCollection = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/routes',
        generateId: ({ entry }) => entry.replace(/\.md$/, ''),  // e.g., "zh/afterwork-north"
    }),
    schema: z.object({
        slug: z.string(),
        name: z.string(),
        region: z.string(),
        distance: z.number(),
        elevation: z.number(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
        author: z.string().default('ACC Club'),
        cover: z.string().optional(),
        stravaUrl: z.string().optional(),
        komootUrl: z.string().optional(),
        xiaohongshuUrl: z.string().optional(),
    }).refine((data) => data.stravaUrl || data.komootUrl, {
        message: 'At least one of stravaUrl or komootUrl is required',
        path: ['stravaUrl'], // Shows error on stravaUrl field
    }),
});

// ─────────────────────────────────
// 导出
// ─────────────────────────────────
export const collections = {
    media: mediaCollection,
    gear: gearCollection,
    training: trainingCollection,
    routes: routesCollection,
};
