# ACC ClubHub 迭代开发流程

> **状态更新 (2026-01-29)**: 
> - **Layer 1 (骨架)**: ✅ 已完成
> - **Layer 2 (样式)**: ✅ 已完成
> - **Layer 3 (内容)**: ✅ 已完成 (采用 Sveltia CMS + i18n)
> - **Layer 4 (功能)**: 🚧 待启动

> **理念**: 搭乐高，先骨架、后样式、再功能  
> **原则**: 每一层完成后都是可运行、可预览的状态

---

## 开发层次总览

```
┌─────────────────────────────────────────────────────┐
│  Layer 4: 功能模块 (NEXT)                            │
│  ┌─────────────────────────────────────────────────┐│
│  │  Layer 3: 内容系统 (DONE)                        ││
│  │  ┌─────────────────────────────────────────────┐││
│  │  │  Layer 2: 样式皮肤 (DONE)                    │││
│  │  │  ┌─────────────────────────────────────────┐│││
│  │  │  │  Layer 1: 骨架结构 (DONE)                ││││
│  │  │  │  (HTML 结构 + 导航 + 占位符)              ││││
│  │  │  └─────────────────────────────────────────┘│││
│  │  │  (蓝骑士 CSS + 组件样式)                     │││
│  │  └─────────────────────────────────────────────┘││
│  │  (Sveltia CMS + i18n 内容集合)                  ││
│  └─────────────────────────────────────────────────┘│
│  (认证 + 报名 + 搜索 + 邮件)                         │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: 骨架 (Skeleton) - [已完成]

> **目标**: 网站能跑起来，所有页面能点击，内容用占位符 (已达成)

### 交付物 (已存档)

```
frontend/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro      # 基础布局
│   ├── components/
│   │   ├── Header.astro          # 导航栏
│   │   └── Footer.astro          # 页脚
│   ├── pages/
│   │   ├── [lang]/               # i18n 动态路由
│   │   │   ├── index.astro       # 首页
│   │   │   ├── media/            # 车影骑踪
│   │   │   ├── knowledge/        # 知识库
│   │   │   └── routes/           # 路线库
│   └── styles/
│       └── base.css              # Reset CSS
```

---

## Layer 2: 样式 (Style) - [已完成]

> **目标**: 套上蓝骑士设计系统，网站变好看 (已达成)

### 交付物 (已存档)

```
frontend/src/styles/
├── blaue-reiter.css              # 核心样式库
├── variables.css                 # CSS 变量
└── components/
    ├── header.css
    ├── footer.css
    ├── cards.css                 # 瀑布流/标准卡片
    └── buttons.css
```

---

## Layer 3: 内容 (Content) - [已完成]

> **目标**: CMS 可用，支持多语言 (i18n)，能发布文章 (已达成)
> **详细档案**: [Layer 3 Master Plan](./rebuild_plan/layer3_master_plan.md)

### ✅ Phase 3.1: CMS 基础配置 (Optimized)
- [x] **Sveltia CMS** 集成 (替代 Phase 3.1 原计划的 Decap CMS，体积更小，i18n 支持更好)
- [x] 配置 `public/admin/config.yml` (配置 GitHub Backend, Collections, Fields)
- [x] 确立多语言策略: `multiple_folders` 结构

### ✅ Phase 3.2: Content Collections
- [x] 定义 `src/content.config.ts` (Zod Schema 校验)
- [x] 建立内容目录结构 (`src/content/{media,knowledge,routes}/{zh,en,de}`)
- [x] 创建各类别的中文示例内容 (Markdown)

### ✅ Phase 3.3: 动态页面生成
- [x] 实现 i18n 动态路由 (`src/pages/[lang]/`)
- [x] 前端组件多语言适配 (`Header`, `BaseLayout`, `i18n.ts`)
- [x] 开发各类内容列表页 (`index.astro`) 与详情页 (`[slug].astro`)

### ✅ Phase 3.4: 生产环境认证
- [x] 部署 sveltia-cms-auth 到 Cloudflare Workers (作为 GitHub OAuth Proxy)
- [x] 注册并配置 GitHub OAuth App
- [x] 生产环境配置切换 (Backend 设为 `github`, `base_url` 指向 Worker)

### ✅ Phase 3.5: 测试体系完备化
- [x] 单元测试: 覆盖 i18n 逻辑 (Vitest)
- [x] E2E 测试: 覆盖路由、页面渲染、响应式 (Playwright)
- [x] CI/CD: 配置 GitHub Actions 自动运行测试

### 核心交付物概览

```
frontend/
├── public/admin/
│   ├── index.html                # Sveltia CMS Entry
│   └── config.yml                # CMS Configuration
├── src/
│   ├── content.config.ts         # Collections Definition
│   ├── content/                  # Markdown Content (i18n structure)
│   ├── pages/[lang]/             # Dynamic i18n Routes
│   └── lib/i18n.ts               # i18n Utilities
└── .github/workflows/test.yml    # CI/CD Pipeline
```

---

## Layer 4: 功能 (Features) - [部分已完成]

> **更新日期**: 2026-02-10
> **状态**: Phase 4.1 (搜索与筛选) ✅ 已完成

### 4.1 搜索与筛选系统 — ✅ 已完成 (Phase 4.1)

**详细方案**: [`phase_4_1_detailed_plan.md`](./rebuild_plan/phase_4_1_detailed_plan.md)

| 交付物 | 状态 | 说明 |
|-------|------|------|
| `frontend/src/lib/search/fuseConfig.ts` | ✅ 完成 | Fuse.js 搜索配置 |
| `frontend/src/lib/filter/` | ✅ 完成 | 筛选状态管理、工具函数、配置 |
| `frontend/src/components/filter/` | ✅ 完成 | FilterPanel, FilterCheckbox, FilterRange 等 |
| `frontend/src/pages/api/search-index.[lang].json.ts` | ✅ 完成 | 多语言搜索索引生成 API |
| `frontend/src/components/content/*Page.tsx` | ✅ 完成 | 各板块筛选页面集成 |

**功能特性**:
- ✅ 多维度筛选 (事件类型、路线难度、器械分类等)
- ✅ 加权模糊搜索 (标题、描述、标签、分类)
- ✅ URL 状态同步 (筛选条件保存在 URL 中)
- ✅ 多语言支持 (zh/en/de)
- ✅ 响应式瀑布流布局 (MasonryGrid + MasonryCard)

---

### 4.2 评论系统 (Giscus) — ✅ 已完成，待升级为 Waline

**当前状态**: Giscus 已集成，计划迁移到 Waline

| 交付物 | 当前状态 | 目标状态 |
|-------|---------|---------|
| 评论组件 | ✅ `GiscusComments.astro` | 📋 升级为 `WalineComments.astro` |
| 登录方式 | 仅 GitHub | Google + GitHub + 访客 |
| 数据存储 | GitHub Discussions | Vercel Postgres |

**Giscus 实施记录**: [`archive/abandoned_phase_4_2_giscus_plan.md`](./rebuild_plan/archive/abandoned_phase_4_2_giscus_plan.md)

**Waline 迁移方案**: [`phase_4_2_waline_plan.md`](./rebuild_plan/phase_4_2_waline_plan.md)

---

### 4.3 活动报名 (慕城日常) — ⚠️ 部分完成

**当前状态**: 静态页面已实现，仅支持外部报名链接

| 功能 | 状态 | 说明 |
|------|------|------|
| 活动列表页 | ✅ 完成 | EventsPage.tsx + 筛选功能 |
| 活动详情页 | ✅ 完成 | `events/[slug].astro` (ArticleLayout) |
| 报名按钮 | ✅ 完成 | 外部链接 (`registrationLink` 字段) |
| **内部报名系统** | ❌ 未实现 | 需后端 API + 数据库 |
| **邮件通知** | ❌ 未实现 | 需 SMTP 服务 (Resend/SendGrid) |
| **席位管理** | ❌ 未实现 | 需后端数据库 |

**待开发功能**:

| 交付物 | 说明 | 优先级 |
|-------|------|--------|
| `backend/routes/events.py` | FastAPI 活动管理 API | P0 |
| `backend/routes/rsvp.py` | 报名 API (POST/GET/DELETE) | P0 |
| `backend/services/email.py` | 邮件通知服务 (Resend) | P0 |
| `frontend/src/components/EventRegistration.tsx` | 报名表单组件 | P0 |
| Supabase 数据库 | 存储 RSVP 记录 | P0 |

---

### 4.4 认证系统 & 用户中心 — ❌ 未启动

| 交付物 | 说明 | 优先级 |
|-------|------|--------|
| Supabase Auth | Google/GitHub/Email 登录 | P1 |
| `frontend/src/lib/auth.ts` | 客户端 Auth 状态管理 | P1 |
| `frontend/src/components/Auth/` | 登录/注册/个人中心 UI | P1 |
| 用户权限管理 | 区分普通用户/管理员 | P2 |

---

### 4.5 互动增强 — 📋 计划中

| 交付物 | 说明 | 优先级 |
|-------|------|--------|
| `frontend/src/components/VideoEmbed.astro` | 视频播放组件 (YouTube/Bilibili) | P1 |

---

## 实施进度总览

| Phase | 内容 | 状态 | 完成日期 |
|-------|------|------|----------|
| **Layer 1** | 骨架结构 | ✅ 完成 | 2026-01-2X |
| **Layer 2** | 样式皮肤 | ✅ 完成 | 2026-01-2X |
| **Layer 3** | 内容系统 (CMS + i18n) | ✅ 完成 | 2026-01-29 |
| **Phase 4.1** | 搜索与筛选系统 | ✅ 完成 | 2026-02-10 |
| **Phase 4.2** | 评论系统 (Waline 迁移) | 📋 计划中 | - |
| **Phase 4.3** | 活动报名 (后端 API) | 📋 计划中 | - |
| **Phase 4.4** | 认证系统 (Supabase) | 📋 计划中 | - |

---

## 里程碑检查点

| 里程碑 | 完成标志 | 状态 |
|-------|---------|------|
| **M1** | Layer 1 完成 | ✅ DONE |
| **M2** | Layer 2 完成 | ✅ DONE |
| **M3** | Layer 3 完成 (CMS + i18n) | ✅ DONE |
| **M4.1** | Phase 4.1 完成 (搜索与筛选) | ✅ DONE |
| **M4.2** | Phase 4.2 完成 (Waline 评论) | 📋 计划中 |
| **M4.3** | Phase 4.3 完成 (活动报名) | 📋 计划中 |
| **M4.4** | Phase 4.4 完成 (认证系统) | 📋 计划中 |
| **M5** | Layer 4 完成 (全功能上线) | 📋 计划中 |

---

## 下一步行动

| 优先级 | 任务 | 依赖 |
|-------|------|------|
| 🔴 P0 | Phase 4.2: 部署 Waline 评论系统 | Vercel Postgres + OAuth 配置 |
| 🔴 P0 | Phase 4.3: 实现活动报名 API | FastAPI + Supabase |
| 🟡 P1 | Phase 4.4: 集成 Supabase Auth | Supabase 项目配置 |
| 🟢 P2 | Phase 4.5: 视频嵌入组件 | 无依赖 |

---

准备好后，我们可以开始 **Phase 4.2: Waline 评论系统** 的实施！


