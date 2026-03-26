# Phase 3.2: Astro Content Collections 详细实施方案

> **父文档**: [Layer 3 总纲](file:///d:/my_projects/acc_clubhub/docs/rebuild_plan/layer3_master_plan.md)  
> **前置**: [Phase 3.1 优化方案](file:///d:/my_projects/acc_clubhub/docs/rebuild_plan/phase_3_1_optimized_plan.md) ✅ 已完成  
> **日期**: 2026-01-27

---

## 目标

让 Astro 能够读取 CMS 创建的内容，并为 Phase 3.3 的动态页面渲染做好准备。

---

## 一、任务清单

| 序号 | 任务 | 文件/目录 | 预计时间 |
|------|------|-----------|----------|
| 3.2.1 | 创建内容集合配置 | `src/content.config.ts` | 15 分钟 |
| 3.2.2 | 创建 i18n 目录结构 | `src/content/{media,knowledge/gear,knowledge/training,routes}/{zh,en,de}/` | 5 分钟 |
| 3.2.3 | 添加中文示例内容 | 每个集合 1 篇 `.md` 文件 | 20 分钟 |
| 3.2.4 | 验证内容加载 | 开发服务器 + 控制台检查 | 5 分钟 |

**总计**: 约 45 分钟

---

## 二、与 Phase 3.1 CMS 配置的对应关系

> [!IMPORTANT]
> **Zod schema 必须匹配 CMS config.yml 的字段定义**，否则内容无法正确解析。

### 字段对照表

| CMS 字段 | Zod 类型 | i18n 模式 | 说明 |
|----------|----------|-----------|------|
| `slug` | `z.string()` | duplicate | URL 标识，英文 |
| `title` / `name` | `z.string()` | true | 标题，需翻译 |
| `description` | `z.string().optional()` | true | 摘要，需翻译 |
| `date` | `z.coerce.date()` | duplicate | 发布日期 |
| `author` | `z.string()` | duplicate | 作者 (gear/training 必填) |
| `type` | `z.enum([...])` | duplicate | 内容类型 |
| `cover` | `z.string().optional()` | duplicate | 封面图路径 |
| `videoUrl` | `z.string().optional()` | duplicate | 视频链接 |
| `distance` | `z.number()` | duplicate | 路线距离 |
| `elevation` | `z.number()` | duplicate | 路线爬升 |
| `difficulty` | `z.enum([...])` | duplicate | 路线难度 |
| `stravaUrl` | `z.string().optional()` | duplicate | Strava 链接 |
| `komootUrl` | `z.string().optional()` | duplicate | Komoot 链接 |

---

## 三、文件详情

### 3.2.1 内容集合配置

> [!NOTE]
> **Astro 5.x 变更**: 配置文件从 `src/content/config.ts` 移至项目根目录的 `src/content.config.ts`。

```typescript
// frontend/src/content.config.ts
import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// ─────────────────────────────────
// 🎬 车影骑踪 (Media)
// ─────────────────────────────────
const mediaCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/media' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    type: z.enum(['影像', '访谈', '翻山越岭']),
    cover: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
});

// ─────────────────────────────────
// 🔧 器械知识 (Gear)
// ─────────────────────────────────
const gearCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/knowledge/gear' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    author: z.string(),
    date: z.coerce.date(),
    cover: z.string().optional(),
  }),
});

// ─────────────────────────────────
// 📊 科学训练 (Training)
// ─────────────────────────────────
const trainingCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/knowledge/training' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    author: z.string(),
    date: z.coerce.date(),
    cover: z.string().optional(),
  }),
});

// ─────────────────────────────────
// 🗺️ 骑行路线 (Routes)
// 注意：没有 description 字段，使用结构化数据 (distance/elevation/difficulty) 作为摘要
// ─────────────────────────────────
const routesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/routes' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    region: z.string(),
    distance: z.number(),
    elevation: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
    cover: z.string().optional(),
    stravaUrl: z.string().optional(),
    komootUrl: z.string().optional(),
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
```

---

### 3.2.2 目录结构

CMS 使用 `multiple_folders` i18n 模式，需要按语言创建子目录：

```
frontend/src/content/
├── media/
│   ├── zh/
│   │   └── .gitkeep
│   ├── en/
│   │   └── .gitkeep
│   └── de/
│       └── .gitkeep
├── knowledge/
│   ├── gear/
│   │   ├── zh/
│   │   │   └── .gitkeep
│   │   ├── en/
│   │   │   └── .gitkeep
│   │   └── de/
│   │       └── .gitkeep
│   └── training/
│       ├── zh/
│       │   └── .gitkeep
│       ├── en/
│       │   └── .gitkeep
│       └── de/
│           └── .gitkeep
└── routes/
    ├── zh/
    │   └── .gitkeep
    ├── en/
    │   └── .gitkeep
    └── de/
        └── .gitkeep
```

> [!TIP]
> 使用 `.gitkeep` 文件确保空目录被 Git 跟踪。CMS 创建内容时会自动保存到对应语言目录。

---

### 3.2.3 示例内容

每个集合创建一篇中文示例文章，用于验证内容加载和 Phase 3.3 页面渲染。

#### media/zh/alps-summer-2025.md

```markdown
---
slug: alps-summer-2025
title: 阿尔卑斯夏日骑行记
description: 2025年夏天，ACC 车队穿越阿尔卑斯群山的精彩影像。
date: 2025-08-15
type: 影像
cover: /images/uploads/alps-summer.jpg
videoUrl: https://www.youtube.com/watch?v=dQw4w9WgXcQ
---

这是一次难忘的骑行经历...

## 行程亮点

- Stelvio Pass 攀登
- 沿途壮丽风景
- 团队协作精神
```

#### knowledge/gear/zh/road-bike-buying-guide.md

```markdown
---
slug: road-bike-buying-guide
title: 公路车购买指南 2026
description: 从入门到进阶，帮你选择适合的公路自行车。
author: ACC 器械组
date: 2026-01-20
cover: /images/uploads/road-bikes.jpg
---

选购公路车是一门学问...

## 预算分级

| 等级 | 价格区间 | 推荐品牌 |
|------|----------|----------|
| 入门 | €500-1500 | Giant, Trek |
| 进阶 | €1500-4000 | Canyon, Specialized |
| 专业 | €4000+ | Cervélo, Pinarello |
```

#### knowledge/training/zh/ftp-training-basics.md

```markdown
---
slug: ftp-training-basics
title: FTP 训练入门指南
description: 了解功能阈值功率（FTP）及如何通过科学训练提升它。
author: ACC 训练组
date: 2026-01-15
cover: /images/uploads/ftp-training.jpg
---

FTP（Functional Threshold Power）是衡量骑行能力的关键指标...

## 什么是 FTP？

FTP 代表你能够持续 1 小时的最大平均功率输出。

## 如何测试 FTP

1. 20 分钟全力测试
2. 结果乘以 0.95
```

#### routes/zh/isar-valley-loop.md

```markdown
---
slug: isar-valley-loop
name: 伊萨尔河谷环线
region: 慕尼黑南郊
distance: 65
elevation: 450
difficulty: medium
cover: /images/uploads/isar-valley.jpg
stravaUrl: https://www.strava.com/routes/123456
komootUrl: https://www.komoot.com/tour/123456
---

这条经典路线沿着伊萨尔河谷蜿蜒前行，适合周末的休闲骑行。

## 路线特点

- 大部分路段为平坦的河边自行车道
- 沿途有多个休息站和咖啡馆
- 风景优美，适合拍照

## 注意事项

- 周末可能较为拥挤
- 建议早上出发避开人流
```

---

## 四、验证清单

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | `npm run dev` | 开发服务器启动无错误 |
| 2 | 检查终端输出 | 无 Zod schema 验证错误 |
| 3 | 检查 `.astro` 类型生成 | `src/env.d.ts` 包含集合类型 |
| 4 | 访问 CMS 创建新内容 | 保存后文件出现在对应目录 |

---

## 五、与 Phase 3.3 的衔接

Phase 3.2 完成后，Phase 3.3 将能够：

```typescript
// 示例：获取所有中文 media 内容
import { getCollection } from 'astro:content';

const zhMedia = await getCollection('media', ({ id }) => id.startsWith('zh/'));
```

---

## 六、不在本次范围内

| 项目 | 属于 |
|------|------|
| 动态列表页 `/[lang]/media/index.astro` | Phase 3.3 |
| 动态详情页 `/[lang]/media/[slug].astro` | Phase 3.3 |
| 语言切换器 UI | Phase 3.3 |
| 英文/德文翻译内容 | 后期 |
