# Knowledge + Media 板块重设计 · Training & Media Pilot

> **Status**: Planned, not yet implemented. To be executed in a fresh session.
> **Scope**: Pilot covers `training` + `media`; `routes` + `gear` follow in a later PR using the same components.
> **Planned**: 2026-04-21

## Context

当前 `/[lang]/knowledge/training`、`/[lang]/knowledge/gear`、`/[lang]/routes`、`/[lang]/media` 四个列表页的视觉语言与首页、`/events`、`/about` 不一致，具体痛点：

1. **Emoji 开头的页面标题**（📊/🔧/🗺️/🎬）硬写在 `<h1>` 前，显得山寨、与品牌语言脱节。
2. **Knowledge 三兄弟**（training/gear/routes）内容一律用 Masonry 瀑布流卡片（和 `/media` 同一套组件），把具有知识架构性的内容当成"小红书式信息流"来展示，失去了目录索引、系统学习的作用。
3. **Routes 页面**虽然已经有 distance/elevation range filter，但所有路线一股脑铺在同一个瀑布里，没有任何"按线路分档"的结构化入口。
4. **Media 页面**的小红书瀑布是对的（内容性质就是草稿/鲜货），但缺乏"最新发布 / 编辑高亮"的信号陈列，用户进到页面看不出哪些是新的、哪些值得优先看。

目标：
- **Knowledge**：重塑为"图书馆 + 书店"风格 —— 编辑式主标题 + 精选陈列 + 分类索引 + 完整列表（用 bordered card 替代 Masonry）。
- **Media**：保留小红书式 Masonry 瀑布（这是对的），但上方加一层编辑式 Hero + 3 张精选卡，突出"最高亮"的内容。
- Emoji 标题全部下线。
- 所有新的排版元素与 `/about` 设计语言对齐。

**本次先做 Training 一页（知识板块 pilot）+ Media 一页（媒体板块轻改）**。验证通过后，把同一套组件应用到 routes（按难度分档 + region 作为卡片 meta）和 gear（按 4 大 `GEAR_CATEGORIES` 分章）。

## Design Decisions (已确认)

| 决策项 | 选择 |
|---|---|
| 四个页面 Hero | 统一编辑式：eyebrow `ACROSS · KNOWLEDGE` / `ACROSS · MEDIA` + H1 + 48×3px 红色 accent bar + 副标题 |
| Training 版面 | Hero → Featured shelf → 4 个 CategoryShelf → SectionRule → FilterPanel + ArticleGrid |
| Media 版面 | Hero → Featured shelf (3 张) → SectionRule → 现有 FilterPanel + MasonryGrid（保留） |
| Routes 分组（后续阶段） | 双层：难度为 section，region 作为卡片角标 |
| 精选机制 | 在 frontmatter 加 `featured: boolean` 手动策划 |
| 交付范围 | 本 PR: **Training + Media**；routes/gear 下一轮 |

## 推荐版面

### Training（知识 pilot）

```
┌──────────────────────────────────────────────────┐
│  ACROSS · KNOWLEDGE              ← eyebrow       │
│  科学训练                        ← H1 Jost 700   │
│  ━━━                             ← accent bar    │
│  训练方法论与安全科普              ← subtitle      │
├──────────────────────────────────────────────────┤
│  ─────────── FEATURED ───────────                │
│  [big card] [big card] [big card]                 │
├──────────────────────────────────────────────────┤
│  ─────────── BY CATEGORY ────────────            │
│  体能训练 Physical                    view all → │
│  [card][card][card][card]                        │
│  训练计划 Planning                    view all → │
│  ...                                             │
├──────────────────────────────────────────────────┤
│  ─────────── ALL ARTICLES ───────────            │
│  [FilterPanel]                                   │
│  [bordered-card grid · 3 cols]                   │← 类 events 卡片，非 masonry
└──────────────────────────────────────────────────┘
```

### Media

```
┌──────────────────────────────────────────────────┐
│  ACROSS · MEDIA                                  │
│  车影骑踪                                        │
│  ━━━                                             │
│  影像作品 · 骑友访谈 · 翻山越岭                   │
├──────────────────────────────────────────────────┤
│  ─────────── FEATURED ───────────                │
│  [big card] [big card] [big card]                 │
├──────────────────────────────────────────────────┤
│  ─────────── ALL MEDIA ──────────                │
│  [FilterPanel] [existing MasonryGrid feed]       │← 瀑布流保留
└──────────────────────────────────────────────────┘
```

## 要修改 / 新增的文件

### 修改

1. **`frontend/src/content.config.ts`**
   - 给 `trainingCollection` schema 加 `featured: z.boolean().default(false)`
   - 给 `mediaCollection` schema 加 `featured: z.boolean().default(false)`
   - gear/routes 下一轮再加

2. **`frontend/src/pages/[lang]/knowledge/training/index.astro`** — 重写：
   - 去掉 `📊` + 旧 `.page-title-header`
   - 渲染 `<EditorialHero>`、`<FeaturedShelf>`、`<SectionRule>` × 2、4 个 `<CategoryShelf>`
   - Astro 侧预分组：按 `featured=true` 抽精选、按 `category` 分 4 组
   - 调用新的 Preact 组件 `TrainingLibraryPage`（替换 `TrainingPage`）

3. **`frontend/src/pages/[lang]/media/index.astro`** — 轻改：
   - 去掉 `🎬` + 旧 `.page-title-header`
   - 顶部加 `<EditorialHero>` + `<FeaturedShelf>` + `<SectionRule>`（"ALL MEDIA"）
   - 下方保留现有 `<MediaPage client:load>`（MasonryGrid 不动）
   - Astro 侧预抽 `featured=true` media，传给 FeaturedShelf，并从 `initialItems` 里去重（避免精选文章在下方 masonry 再出现一次）

4. **`frontend/src/lib/i18n.ts`** — 新增翻译 key（zh/en/de 三套）：
   - `editorial.eyebrow.knowledge` → `ACROSS · KNOWLEDGE`
   - `editorial.eyebrow.media` → `ACROSS · MEDIA`
   - `knowledge.training.subtitle` / `media.subtitle`
   - `editorial.section.featured` / `editorial.section.byCategory` / `editorial.section.allArticles` / `editorial.section.allMedia`
   - `editorial.viewAll`
   - `knowledge.training.category.{physical|planning|wellness|analytics}` 标题
   - `knowledge.training.categoryDesc.{...}` 一句话说明

### 新建（共享组件，放到 `components/editorial/`）

5. **`frontend/src/components/editorial/EditorialHero.astro`**
   编辑式 Hero：eyebrow + H1 + 48×3px `.accent-bar` + subtitle。移植 `/about` 的 `.about-h1::after` 样式逻辑。props: `eyebrow`、`title`、`subtitle`。

6. **`frontend/src/components/editorial/SectionRule.astro`**
   移植 `about.astro` 的 `.section-rule`：居中大写小标题两侧带 1px 横线。props: `label`。

7. **`frontend/src/components/editorial/FeaturedShelf.astro`**
   3 张大卡片横排（≥900px），mobile 纵向堆叠。每张卡: cover 16:9 + category/type tag + title (H3 1.25rem) + 1-2 行 description + meta 行（日期或 author）。`items` < 1 时整个 shelf 不渲染。props: `items: Array<{ href, title, description, cover, tagLabel, meta }>`, `lang`。

### 新建（knowledge 专属）

8. **`frontend/src/components/knowledge/CategoryShelf.astro`**
   一个 category = 一个 shelf：左上 category 名 + 右上 `view all →`，下方 2-4 张横向卡片（溢出时横向可滚动）。空 category 不渲染。props: `category`、`items`、`lang`、`viewAllHref`、`categoryTitle`、`categoryDesc`。

9. **`frontend/src/components/knowledge/ArticleCard.astro`** + **`ArticleCard.tsx`** (Preact)
   bordered 矩形卡片：cover 16:9 → 小号 category eyebrow → title (H3) → description (2 行截断) → 底部 meta 行（日期 · author）。对齐 `components/events/UpcomingEvents.astro` 的 `.event-card`。Astro 版给 featured/category shelf 用，Preact 版给 `TrainingLibraryPage` 的 all-articles 区用，CSS 共享一份。

10. **`frontend/src/components/content/TrainingLibraryPage.tsx`** (Preact)
    负责 ALL ARTICLES 区：FilterPanel + 列表卡片。
    - 复用 `useFilterState` / `filterItems` / `calculateFacets` / `trainingFilters` / `sortFilters`（零改动）
    - 列表不用 MasonryGrid/MasonryCard；改用 `<ArticleCard>` 入 `.article-grid`（CSS Grid `repeat(auto-fill, minmax(280px, 1fr))`）
    - 空状态沿用现有样式

### 内容侧（可选，本 PR 可先留空）

11. **`frontend/src/content/knowledge/training/{zh,en,de}/*.md`** — 编辑挑 2-3 篇加 `featured: true`。本 PR 内可留空（0 featured 时 FEATURED shelf 自动隐藏）。
12. **`frontend/src/content/media/{de,en,zh}/*.md`** — 同上，挑 2-3 条 media 加 `featured: true`。

## 现有可复用资产（不要重造）

| 资产 | 路径 | 用途 |
|---|---|---|
| 设计 token | `frontend/src/styles/variables.css` | 颜色、字号、间距、圆角 |
| `.section-rule` 样式 | `pages/[lang]/about.astro` | 移植到 `SectionRule.astro` |
| accent bar `::after` | `about.astro` `.about-h1::after` | Hero 红线 |
| 卡片 hover lift | `components/events/UpcomingEvents.astro` `.event-card` | ArticleCard 交互 |
| FilterPanel | `components/filter/FilterPanel.tsx` | 零改动复用 |
| useFilterState / filterItems / facetUtils | `lib/filter/*` | 零改动复用 |
| MasonryGrid / MasonryCard | `components/ui/Masonry*` | **Media 继续用** |
| Translation helper `t(lang, key)` | `lib/i18n.ts` | 新增 key |
| BaseLayout | `layouts/BaseLayout.astro` | 沿用 |
| MediaPage (Preact) | `components/content/MediaPage.tsx` | 零改动 |

## 不在本 PR 范围

- Routes 重设计（下一轮：按 difficulty 分 4 段 + region meta tag）
- Gear 重设计（下一轮：按 `GEAR_CATEGORIES` 分 4 段）
- `/knowledge` 汇总落地页
- 阅读量/点赞热门排序（无数据源）
- Subcategory 层级
- Content 正文翻译修订

## 验证方法

```bash
cd frontend && bun run dev
# http://localhost:4321/zh/knowledge/training
# http://localhost:4321/zh/media
# 重复 /en/ 和 /de/
```

**检查清单**：

Training:
- [ ] 三语 hero 文案正确（eyebrow/title/accent bar/subtitle）
- [ ] 无 📊 emoji
- [ ] 0 featured 时 FEATURED section 不渲染
- [ ] 任一 md 加 `featured: true` 后该文出现在顶部大卡
- [ ] 4 个 CategoryShelf 按 physical → planning → wellness → analytics 顺序
- [ ] 空 category shelf 不渲染
- [ ] `view all →` 链接带 `?category=xxx` 锚到 ALL ARTICLES 并预筛
- [ ] FilterPanel 完整工作
- [ ] 列表卡片是 bordered rectangle（非 masonry 断栏）

Media:
- [ ] 三语 hero 文案正确（ACROSS · MEDIA）
- [ ] 无 🎬 emoji
- [ ] 0 featured 时 FEATURED section 不渲染
- [ ] 任一 media md 加 `featured: true` 后出现在顶部大卡，**且不在下方 MasonryGrid 重复**
- [ ] 下方 MasonryGrid + FilterPanel 行为与改动前完全一致

通用:
- [ ] mobile (375px) 下 shelf 纵向堆叠、Hero bar 可见
- [ ] 控制台 / Lighthouse 无新报错

**静态检查**：

```bash
cd frontend && bun run build        # 确认三语预渲染通过
cd frontend && bun run astro check  # 类型 + Zod frontmatter 校验
```

**视觉对比**：用 `/browse` skill 抓 before/after 截图到 `/tmp/` 目测。

## Review / Handoff 后续流程

1. 本 PR 落地，用户浏览器过一遍 training 与 media。
2. 通过 → atomic commits：
   - `feat(editorial): shared EditorialHero + FeaturedShelf + SectionRule components`
   - `feat(knowledge): library-style training page`
   - `feat(media): editorial hero + featured shelf above masonry`
3. 下一轮 PR 把同一模式 port 到 `routes`（难度分档）和 `gear`（4 大类分章），并把 `featured` 加到这两个 schema。
