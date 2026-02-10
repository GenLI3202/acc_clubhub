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

## Layer 4: 功能 (Features) - [待启动]

> **目标**: 核心交互功能上线

### 4.1 认证系统 & 用户中心

| 交付物 | 说明 |
|-------|------|
| `backend/auth` | FastAPI + JWT 认证 |
| `frontend/src/lib/auth.ts` | 客户端 Auth 状态管理 |
| `frontend/src/components/Auth/` | 登录/注册/个人中心 UI |

### 4.2 活动报名 (慕城日常) - Events

> **注**: 目前 `events` 仅为占位符，Layer 4 将完全实现

| 交付物 | 说明 |
|-------|------|
| `backend/routes/events.py` | 活动管理 API |
| `backend/routes/rsvp.py` | 报名 API |
| `frontend/src/pages/[lang]/events/` | 活动列表与详情页 |
| `backend/services/email.py` | 邮件通知服务 |

### 4.3 评论系统 (Waline)

| 交付物 | 说明 |
|-------|------|
| Waline 服务端 | Vercel Serverless 部署 |
| `Vercel Postgres` | 评论数据存储 (256MB 免费) |
| `frontend/src/components/WalineComments.astro` | 评论组件 |
| Google/GitHub OAuth | OAuth 配置 |

**详细方案**: [`phase_4_2_waline_plan.md`](./rebuild_plan/phase_4_2_waline_plan.md)

### 4.4 搜索与筛选

| 交付物 | 说明 |
|-------|------|
| `frontend/src/lib/search.ts` | Fuse.js 前端模糊搜索 |
| `frontend/src/components/RouteFilter.astro` | 路线多维度筛选 |

### 4.5 互动增强

| 交付物 | 说明 |
|-------|------|
| `frontend/src/components/VideoEmbed.astro` | 优化的视频播放组件 |

### 预计时间: 待评估

---

## 里程碑检查点

| 里程碑 | 完成标志 | 状态 |
|-------|---------|------|
| **M1** | Layer 1 完成 | ✅ DONE |
| **M2** | Layer 2 完成 | ✅ DONE |
| **M3** | Layer 3 完成 (CMS + i18n) | ✅ DONE |
| **M4** | Layer 4 完成 (全功能上线) | 🚧 计划中 |

---

准备好后，我们将进入 **Layer 4: 功能开发** 阶段！


