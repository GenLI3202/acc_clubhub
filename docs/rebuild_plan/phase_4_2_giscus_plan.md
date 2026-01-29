# Phase 4.2: Giscus 评论系统 — 详细执行方案

> **目标**: 为所有文章详情页 (media, gear, training, routes, events) 集成 Giscus 评论系统
> **交付状态**: 五类详情页底部均可评论，支持 zh/en/de 三语切换，样式匹配 Blaue Reiter V3
> **实施状态**: 已完成 (构建通过，127 页面)

---

## 架构分析

### 页面结构

| 详情页 | 路由 | 使用布局 | 集成方式 |
|--------|------|----------|----------|
| media/[slug] | `[lang]/media/[slug]` | ArticleLayout | ArticleLayout 统一集成 |
| gear/[slug] | `[lang]/knowledge/gear/[slug]` | ArticleLayout | ArticleLayout 统一集成 |
| training/[slug] | `[lang]/knowledge/training/[slug]` | ArticleLayout | ArticleLayout 统一集成 |
| events/[slug] | `[lang]/events/[slug]` | ArticleLayout | **新建详情页** + ArticleLayout 统一集成 |
| routes/[slug] | `[lang]/routes/[slug]` | BaseLayout (自定义) | 页面中单独集成 |

### Giscus 配置

- `data-repo`: `GenLI3202/acc_clubhub`
- `data-mapping`: `pathname` (URL 路径映射到 Discussion)
- `data-loading`: `lazy` (懒加载，提升首屏性能)
- `data-input-position`: `top` (输入框在顶部)

### 语言映射

| 网站 Locale | Giscus lang |
|-------------|-------------|
| `zh` | `zh-CN` |
| `en` | `en` |
| `de` | `de` |

---

## 执行步骤

### Step 0: GitHub 准备工作 (手动，用户完成)

1. GitHub 仓库 Settings -> Features -> 勾选 **Discussions**
2. Discussions 中创建 `Announcements` 类别
3. 安装 Giscus App: https://github.com/apps/giscus
4. 前往 https://giscus.app 获取 `data-repo-id` 和 `data-category-id`
5. 替换 `GiscusComments.astro` 中的 `PLACEHOLDER_REPO_ID` 和 `PLACEHOLDER_CATEGORY_ID`

### Step 1: 添加 i18n 翻译键

**文件**: `frontend/src/lib/i18n.ts`

新增键:
- `comments.title`: 评论区 / Comments / Kommentare
- `comments.description`: 使用 GitHub 账号参与讨论 / Join the discussion with your GitHub account / Diskutieren Sie mit Ihrem GitHub-Konto

### Step 2: 创建 GiscusComments.astro 组件

**文件**: `frontend/src/components/GiscusComments.astro`

- 接受 `lang` prop，映射为 Giscus 语言代码
- 渲染评论区标题 + 说明文字 (i18n)
- 注入 Giscus script 标签 (lazy loading)
- Scoped 样式: 分隔线、Jost 标题、Inter 说明文字

### Step 3: 集成到 ArticleLayout.astro

**文件**: `frontend/src/layouts/ArticleLayout.astro`

- 导入 GiscusComments
- 在 `<slot />` 之后、`</article>` 之前插入
- 自动覆盖 media、gear、training、events 四个板块

### Step 4: 集成到 routes/[slug].astro

**文件**: `frontend/src/pages/[lang]/routes/[slug].astro`

- 单独导入 GiscusComments (因使用 BaseLayout 而非 ArticleLayout)
- 在 route-content 之后插入

### Step 5: 新建 events/[slug].astro 详情页

**文件**: `frontend/src/pages/[lang]/events/[slug].astro`

- 使用 ArticleLayout (自动获得 Giscus 评论)
- 显示 eventType 标签、location、registrationLink
- 注册按钮使用 Blaue Reiter 硬阴影风格
- 三语注册按钮文案: 立即报名 / Register Now / Jetzt anmelden

### Step 6: 构建验证

- `npm run build` 通过，127 页面生成
- events 集合暂无内容 (只有 .gitkeep)，为预期行为

---

## 修改文件清单

| 文件 | 操作 | 状态 |
|------|------|------|
| `frontend/src/lib/i18n.ts` | **修改** — 添加 comments 翻译键 | 已完成 |
| `frontend/src/components/GiscusComments.astro` | **新建** — Giscus 评论组件 | 已完成 |
| `frontend/src/layouts/ArticleLayout.astro` | **修改** — 集成 GiscusComments | 已完成 |
| `frontend/src/pages/[lang]/routes/[slug].astro` | **修改** — 单独集成 GiscusComments | 已完成 |
| `frontend/src/pages/[lang]/events/[slug].astro` | **新建** — 活动详情页 | 已完成 |

---

## 待用户完成

替换 `GiscusComments.astro` 中的两个占位符:
1. `PLACEHOLDER_REPO_ID` -> 仓库 ID (从 giscus.app 获取)
2. `PLACEHOLDER_CATEGORY_ID` -> 分类 ID (从 giscus.app 获取)

---

## 验证清单

- [x] GiscusComments.astro 组件创建成功
- [x] i18n 翻译键已添加 (zh/en/de)
- [x] ArticleLayout 中集成评论组件 (覆盖 media, gear, training, events)
- [x] routes/[slug] 中单独集成评论组件
- [x] events/[slug].astro 详情页创建成功
- [x] `npm run build` 构建成功 (127 pages, 6.63s)
- [ ] 占位符 ID 替换 (待用户提供)
- [ ] Vercel 部署后评论功能测试
