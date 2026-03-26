# Phase 3.3: 动态页面生成 — 详细实施方案

> **父文档**: [Layer 3 总纲](file:///d:/my_projects/acc_clubhub/docs/rebuild_plan/layer3_master_plan.md)  
> **前置**: Phase 3.2 ✅ 已完成  
> **日期**: 2026-01-27

---

## ⚠️ 审查后发现的问题

> [!IMPORTANT]
> **审查发现 3 个必须修复的问题**：

### 问题 1: Header 导航链接缺少语言前缀

当前 `Header.astro` 硬编码为:
```typescript
{ label: '首页', href: '/' },
{ label: '慕城日常', href: '/events' },
```

**修复**: Header 需要接收 `lang` prop，链接改成 `/${lang}/events`

### 问题 2: BaseLayout 没有动态语言

当前 `<html lang="zh">` 是硬编码的。

**修复**: `BaseLayout` 需要接收 `lang` prop，动态设置 `<html lang={lang}>`

### 问题 3: 内容语言提取需要更稳健的方式

`entry.id` 格式可能因 Astro 版本而异。使用 `filePath` 更可靠：

```typescript
// filePath = "src/content/media/zh/alps-summer-2025.md"
function getLangFromEntry(entry: { filePath: string }, collection: string): string {
  const parts = entry.filePath.split('/');
  const collectionIndex = parts.indexOf(collection);
  return parts[collectionIndex + 1] || 'zh';
}
```

---

## 目标

让用户能够在网站上浏览和阅读内容集合中的文章。

---

## 一、核心挑战

### 1.1 i18n 路由结构

Phase 3.1 配置了 `prefixDefaultLocale: true`，所有路由需要语言前缀：

| 原路由 | 新路由 |
|--------|--------|
| `/` | `/zh/` `/en/` `/de/` |
| `/media` | `/zh/media` `/en/media` |
| `/media/[slug]` | `/zh/media/[slug]` |

### 1.2 页面文件结构

需要将所有页面移入 `[lang]` 动态目录：

```
src/pages/
├── [lang]/
│   ├── index.astro              # 首页
│   ├── about.astro              # 关于
│   ├── media/
│   │   ├── index.astro          # 列表页
│   │   └── [slug].astro         # 详情页
│   ├── knowledge/
│   │   ├── gear/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── training/
│   │       ├── index.astro
│   │       └── [slug].astro
│   ├── routes/
│   │   ├── index.astro
│   │   └── [slug].astro
│   └── events/
│       └── index.astro          # 占位符 (Layer 4)
└── (删除原 pages/ 下的文件)
```

---

## 二、任务清单

| 序号 | 任务 | 文件 | 预计时间 |
|------|------|------|----------|
| 3.3.1 | 创建 i18n 工具函数 | `src/lib/i18n.ts` | 10 分钟 |
| 3.3.2 | 更新 BaseLayout (添加 lang prop) | `src/layouts/BaseLayout.astro` | 5 分钟 |
| 3.3.3 | 更新 Header (动态 lang 链接) | `src/components/Header.astro` | 10 分钟 |
| 3.3.4 | 创建内容卡片组件 | `src/components/ContentCard.astro` | 15 分钟 |
| 3.3.5 | 创建文章布局 | `src/layouts/ArticleLayout.astro` | 15 分钟 |
| 3.3.6 | 迁移首页到 [lang] | `src/pages/[lang]/index.astro` | 10 分钟 |
| 3.3.7 | 创建 media 列表/详情页 | `src/pages/[lang]/media/` | 20 分钟 |
| 3.3.8 | 创建 gear 列表/详情页 | `src/pages/[lang]/knowledge/gear/` | 15 分钟 |
| 3.3.9 | 创建 training 列表/详情页 | `src/pages/[lang]/knowledge/training/` | 15 分钟 |
| 3.3.10 | 创建 routes 列表/详情页 | `src/pages/[lang]/routes/` | 15 分钟 |
| 3.3.11 | 迁移其他页面 (about, events) | `src/pages/[lang]/` | 10 分钟 |
| 3.3.12 | 清理旧页面文件 | 删除 `src/pages/*.astro` | 5 分钟 |
| 3.3.13 | 验证 | 浏览器测试 | 15 分钟 |

**总计**: 约 2.5-3 小时

---

## 三、核心代码

### 3.3.1 i18n 工具函数

```typescript
// src/lib/i18n.ts
export const locales = ['zh', 'en', 'de'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'zh';

// 从 entry.filePath 提取语言 (更稳健)
// filePath = "src/content/media/zh/alps-summer-2025.md"
export function getLangFromEntry(filePath: string, collection: string): Locale {
  const parts = filePath.split('/');
  const collectionIndex = parts.indexOf(collection);
  const lang = parts[collectionIndex + 1];
  return locales.includes(lang as Locale) ? (lang as Locale) : defaultLocale;
}

// UI 翻译字典 (后续扩展)
export const ui = {
  zh: {
    'nav.home': '首页',
    'nav.media': '车影骑踪',
    'nav.gear': '器械知识',
    'nav.training': '科学训练',
    'nav.routes': '骑行路线',
    'nav.events': '慕城日常',
    'nav.about': '关于我们',
    'content.readMore': '阅读全文',
    'content.back': '返回列表',
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
  },
} as const;

export function t(locale: Locale, key: keyof typeof ui.zh): string {
  return ui[locale][key] ?? ui.zh[key];
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (locales.includes(lang as Locale)) return lang as Locale;
  return defaultLocale;
}
```

### 3.3.2 内容卡片组件

```astro
---
// src/components/ContentCard.astro
interface Props {
  href: string;
  title: string;
  description?: string;
  cover?: string;
  date?: Date;
  meta?: string;  // 例如 "65km · 450m · Medium"
}

const { href, title, description, cover, date, meta } = Astro.props;
const formattedDate = date ? date.toLocaleDateString('zh-CN') : null;
---

<a href={href} class="content-card">
  {cover && <img src={cover} alt={title} class="content-card-cover" />}
  <div class="content-card-body">
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    <div class="content-card-meta">
      {formattedDate && <span>{formattedDate}</span>}
      {meta && <span>{meta}</span>}
    </div>
  </div>
</a>

<style>
  .content-card { /* 样式继承自 cards.css */ }
</style>
```

### 3.3.3 列表页示例 (Media)

```astro
---
// src/pages/[lang]/media/index.astro
import BaseLayout from '../../../layouts/BaseLayout.astro';
import ContentCard from '../../../components/ContentCard.astro';
import { getCollection } from 'astro:content';
import { locales, getLangFromEntry } from '../../../lib/i18n';

export function getStaticPaths() {
  return locales.map(lang => ({ params: { lang } }));
}

const { lang } = Astro.params;

// 使用 filePath 过滤语言 (稳健方式)
const allMedia = await getCollection('media');
const langMedia = allMedia.filter(entry => 
  getLangFromEntry(entry.filePath, 'media') === lang
);
const sortedMedia = langMedia.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---

<BaseLayout title="车影骑踪" lang={lang}>
  <div class="page-title">
    <h1>🎬 车影骑踪</h1>
    <p class="page-subtitle">影像资料、骑友访谈、翻山越岭记录</p>
  </div>

  <div class="content-grid">
    {sortedMedia.map((entry) => (
      <ContentCard
        href={`/${lang}/media/${entry.data.slug}`}
        title={entry.data.title}
        description={entry.data.description}
        cover={entry.data.cover}
        date={entry.data.date}
        meta={entry.data.type}
      />
    ))}
  </div>
</BaseLayout>
```

### 3.3.4 详情页示例 (Media)

```astro
---
// src/pages/[lang]/media/[slug].astro
import ArticleLayout from '../../../layouts/ArticleLayout.astro';
import { getCollection } from 'astro:content';
import { getLangFromEntry } from '../../../lib/i18n';

export async function getStaticPaths() {
  const allMedia = await getCollection('media');
  // 每个 entry 对应一个路径 (用 map 而非 flatMap)
  return allMedia.map((entry) => {
    const lang = getLangFromEntry(entry.filePath, 'media');
    return {
      params: { lang, slug: entry.data.slug },
      props: { entry },
    };
  });
}

const { entry } = Astro.props;
const { lang } = Astro.params;
const { Content } = await entry.render();
---

<ArticleLayout
  title={entry.data.title}
  date={entry.data.date}
  cover={entry.data.cover}
  lang={lang}
  backLink={`/${lang}/media`}
>
  <Content />
</ArticleLayout>
```

---

## 四、设计考量

### 4.1 内容过滤策略

使用 `id.startsWith()` 过滤语言:
```typescript
const zhMedia = await getCollection('media', ({ id }) => id.startsWith('zh/'));
```

### 4.2 Slug 处理

CMS 创建的文件路径: `src/content/media/zh/alps-summer-2025.md`
- `entry.id` = `"zh/alps-summer-2025"`（相对路径，无 .md）
- `entry.data.slug` = `"alps-summer-2025"`（frontmatter 中定义）

URL 生成: `/${lang}/media/${entry.data.slug}`

### 4.3 回退内容

如果某语言内容不存在，暂时显示空列表。后续可实现 fallback 到默认语言。

---

## 五、验证清单

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 访问 `/zh/` | 显示中文首页 |
| 2 | 访问 `/zh/media` | 显示 media 列表，含 1 篇示例 |
| 3 | 点击文章卡片 | 跳转到 `/zh/media/alps-summer-2025` 详情页 |
| 4 | 访问 `/en/media` | 显示空列表（暂无英文内容）|
| 5 | Header 语言切换 | 点击后切换到对应语言路由 |
| 6 | 访问 `/` | 重定向到 `/zh/` |

---

## 六、不在本次范围内

| 项目 | 属于 |
|------|------|
| 标签筛选 (tags) | 后期 |
| 搜索功能 (Fuse.js) | 后期 |
| 分页 | 后期 |
| 评论 (Giscus) | 后期 |
| 活动板块 (Events) | Layer 4 |
