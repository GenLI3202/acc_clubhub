# Layer 3: 内容系统 (Content) — 实施方案

> **目标**: CMS 可用，能发布文章，内容驱动页面

---

## 一、交付物概览

```
frontend/
├── public/admin/
│   ├── index.html                # Decap CMS 入口
│   └── config.yml                # CMS 配置
└── src/content/
    ├── config.ts                 # Astro 内容集合定义
    ├── media/                    # 🎬 车影骑踪
    │   └── sample-interview.md   # 示例文章
    ├── knowledge/
    │   ├── gear/                 # 🔧 器械知识
    │   │   └── buying-guide.md   # 示例文章
    │   └── training/             # 📊 科学训练
    │       └── ftp-basics.md     # 示例文章
    └── routes/                   # 🗺️ 骑行路线
        └── alpine-loop.md        # 示例路线
```

---

## 二、实施任务清单

### Phase 3.1: Decap CMS 基础配置

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.1.1 | 创建 `/admin` 入口 | `public/admin/index.html` + Decap CMS CDN |
| 3.1.2 | 配置 `config.yml` | GitHub backend + 4 个 Collections |
| 3.1.3 | OAuth 设置 | 配置 Netlify Identity 或 GitHub OAuth App (可选，后期) |

---

### Phase 3.2: Astro Content Collections

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.2.1 | 定义 `config.ts` | 使用 Zod schema 定义 4 个集合 |
| 3.2.2 | 创建目录结构 | `src/content/{media,knowledge/gear,knowledge/training,routes}` |
| 3.2.3 | 添加示例内容 | 每个集合 1-2 篇 Markdown 示例 |

---

### Phase 3.3: 动态页面生成

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.3.1 | `/media/[slug].astro` | 车影骑踪详情页 |
| 3.3.2 | `/media/index.astro` | 车影骑踪列表页 (从占位符升级) |
| 3.3.3 | `/knowledge/gear/[slug].astro` | 器械知识详情页 |
| 3.3.4 | `/knowledge/gear/index.astro` | 器械知识列表页 |
| 3.3.5 | `/knowledge/training/[slug].astro` | 科学训练详情页 |
| 3.3.6 | `/knowledge/training/index.astro` | 科学训练列表页 |
| 3.3.7 | `/routes/[slug].astro` | 骑行路线详情页 |
| 3.3.8 | `/routes/index.astro` | 骑行路线列表页 (从占位符升级) |

---

### Phase 3.4: 生产环境 CMS 认证

> **详细方案**: [phase_3_4_plan.md](./phase_3_4_plan.md)

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.4.1 | 注册 GitHub OAuth App | 在 GitHub Developer Settings 创建 OAuth App，配置 callback URL |
| 3.4.2 | 部署 sveltia-cms-auth | Sveltia CMS 官方认证代理，部署到 Cloudflare Workers (免费) |
| 3.4.3 | 更新 `config.yml` | backend 切换为 `github`，添加 OAuth `base_url`，更新 `site_url` |
| 3.4.4 | 添加成员 Collaborator | 在 GitHub repo 添加俱乐部核心成员为 Collaborator (Write 权限) |
| 3.4.5 | 部署验证 | Push 到 master → Vercel 部署 → 访问 /admin → GitHub OAuth 登录 → 创建/发布内容 → 验证前台显示 |

---

### Phase 3.5: 测试体系完备化

> **详细方案**: [layer_3_test_plan.md](./layer_3_test_plan.md)

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.5.1 | 检查测试基础设施 | 确认 Vitest / Playwright 配置可用 |
| 3.5.2 | i18n 单元测试 | `src/lib/__tests__/i18n.test.ts` (Vitest) |
| 3.5.3 | E2E 路由测试 | `e2e/routing.spec.ts` (Playwright) |
| 3.5.4 | E2E 内容页面测试 | `e2e/content.spec.ts` |
| 3.5.5 | E2E 导航测试 | `e2e/navigation.spec.ts` |
| 3.5.6 | E2E 响应式测试 | `e2e/responsive.spec.ts` |
| 3.5.7 | Schema + 构建验证 | `astro check` + `astro build` |
| 3.5.8 | 执行全部测试 | `npm run test:all`，修复所有失败项 |
| 3.5.9 | 文档更新 | 更新 test plan 标记完成状态 |

---

## 三、核心配置详解

### 3.1 Decap CMS Config

```yaml
# public/admin/config.yml
backend:
  name: github
  repo: GenLI3202/acc_clubhub
  branch: main
  base_url: https://acc-clubhub.vercel.app  # 用于 OAuth 回调

media_folder: "frontend/public/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: media
    label: "🎬 车影骑踪"
    folder: "frontend/src/content/media"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string" }
      - { label: "发布日期", name: "date", widget: "datetime" }
      - { label: "类型", name: "type", widget: "select",
          options: ["影像", "访谈", "翻山越岭"] }
      - { label: "封面图", name: "cover", widget: "image", required: false }
      - { label: "视频链接", name: "videoUrl", widget: "string", required: false }
      - { label: "内容", name: "body", widget: "markdown" }

  - name: knowledge-gear
    label: "🔧 器械知识"
    folder: "frontend/src/content/knowledge/gear"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string" }
      - { label: "作者", name: "author", widget: "string" }
      - { label: "发布日期", name: "date", widget: "datetime" }
      - { label: "封面图", name: "cover", widget: "image", required: false }
      - { label: "内容", name: "body", widget: "markdown" }

  - name: knowledge-training
    label: "📊 科学训练"
    folder: "frontend/src/content/knowledge/training"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string" }
      - { label: "作者", name: "author", widget: "string" }
      - { label: "发布日期", name: "date", widget: "datetime" }
      - { label: "封面图", name: "cover", widget: "image", required: false }
      - { label: "内容", name: "body", widget: "markdown" }

  - name: routes
    label: "🗺️ 骑行路线"
    folder: "frontend/src/content/routes"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "路线名", name: "name", widget: "string" }
      - { label: "区域", name: "region", widget: "string" }
      - { label: "距离(km)", name: "distance", widget: "number" }
      - { label: "爬升(m)", name: "elevation", widget: "number" }
      - { label: "难度", name: "difficulty", widget: "select",
          options: ["easy", "medium", "hard", "expert"] }
      - { label: "封面图", name: "cover", widget: "image", required: false }
      - { label: "Strava链接", name: "stravaUrl", widget: "string", required: false }
      - { label: "Komoot链接", name: "komootUrl", widget: "string", required: false }
      - { label: "描述", name: "body", widget: "markdown" }
```

---

### 3.2 Astro Content Collections Config

```typescript
// src/content/config.ts
import { z, defineCollection } from 'astro:content';

const mediaCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    type: z.enum(['影像', '访谈', '翻山越岭']),
    cover: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
});

const gearCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    date: z.date(),
    cover: z.string().optional(),
  }),
});

const trainingCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    date: z.date(),
    cover: z.string().optional(),
  }),
});

const routesCollection = defineCollection({
  type: 'content',
  schema: z.object({
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

export const collections = {
  'media': mediaCollection,
  'knowledge/gear': gearCollection,
  'knowledge/training': trainingCollection,
  'routes': routesCollection,
};
```

---

## 四、验证清单

### Phase 3.1 ~ 3.3 (本地开发)

| 检查项 | 验证方法 | 状态 |
|--------|----------|------|
| CMS 可访问 | 访问 `http://localhost:4321/admin` 能看到 Sveltia CMS 界面 | ✅ |
| i18n 语言标签页 | 编辑器显示 zh / en / de 标签页 | ✅ |
| 集合可编辑 | 能在 CMS 中创建/编辑各类内容 | ✅ |
| 内容生成页面 | 示例 Markdown 在对应页面显示 | ✅ |
| 列表页正常 | 列表页显示所有该集合的内容卡片 | ✅ |
| 详情页正常 | 点击卡片跳转到详情页，内容正确渲染 | ✅ |

### Phase 3.4 (生产部署)

| 检查项 | 验证方法 | 状态 |
|--------|----------|------|
| 生产 CMS 可访问 | 访问 `https://acc-clubhub.vercel.app/admin/` 看到登录界面 | |
| GitHub OAuth 登录 | 点击 "Sign in with GitHub" 成功授权并进入 CMS | |
| 内容发布流转 | 新建文章 → 发布 → GitHub 收到 commit → Vercel 重新部署 → 前台显示 | |
| 多用户权限 | 其他 Collaborator 成员也能登录编辑 | |

### Phase 3.5 (测试)

| 检查项 | 验证方法 | 状态 |
|--------|----------|------|
| `astro check` | 无类型错误 | |
| `npm run test` | Vitest 单元测试 100% 通过 | |
| `npm run build` | 静态构建成功 | |
| `npm run test:e2e` | Playwright E2E 测试 100% 通过 | |
| GitHub Actions | CI 流水线全绿 | |

---

## 五、注意事项

> [!NOTE]
> **CMS 引擎**: 已从 Decap CMS 切换为 **Sveltia CMS** (同一份 config.yml，i18n 支持更稳定，体积更小)。
> 详见 [Phase 3.1 优化方案](./phase_3_1_optimized_plan.md)。

> [!IMPORTANT]
> **OAuth 认证架构**: 使用 **sveltia-cms-auth** (Cloudflare Workers) 作为 GitHub OAuth 代理。
> `config.yml` 中的 `base_url` 指向 Worker URL，不是 Vercel 地址。
> 详见 [Phase 3.4 方案](./phase_3_4_plan.md)。

> [!NOTE]
> **慕城日常 (Events)**: 这个板块依赖 FastAPI 后端 (Layer 4)，不在 Layer 3 范围内。
> Layer 3 仅处理静态内容 (Media, Knowledge, Routes)。
