# Layer 1: 骨架结构 (Skeleton) — 详细执行方案

> **目标**: 初始化 Astro 项目，搭建所有页面骨架，导航可点击，内容用占位符，部署到 Vercel 可预览
> **交付状态**: `npm run dev` 本地可运行 + Vercel 预览链接可分享给成员

---

## 执行步骤

### Step 1: 初始化 Astro 项目 + Vercel 适配

在 `D:\my_projects\acc_clubhub\frontend\` 下创建 Astro 项目：

```bash
cd D:\my_projects\acc_clubhub
npm create astro@latest frontend -- --template minimal --no-install --no-git
cd frontend
npm install
npm install @astrojs/vercel
```

配置 `astro.config.mjs`：
- 引入 `@astrojs/vercel` adapter
- `output`: `static`（静态优先，Vercel 零配置部署）
- `adapter`: `vercel()`

### Step 2: 创建最小化 CSS Reset

**文件**: `frontend/src/styles/base.css`

仅包含：
- CSS Reset (box-sizing, margin/padding 归零)
- 基础字体设置 (system-ui fallback)
- 占位符样式 (.placeholder, .feature-placeholder)
- 最小化布局 (居中、间距)

> 不包含蓝骑士设计系统 — 那是 Layer 2 的任务。

### Step 3: 创建基础布局

**文件**: `frontend/src/layouts/BaseLayout.astro`

- 接收 `title` prop
- 引入 `base.css`
- 包含 `<Header />` 和 `<Footer />` 组件
- `<slot />` 用于页面内容

### Step 4: 创建 Header 组件

**文件**: `frontend/src/components/Header.astro`

导航结构：
```
ACC ClubHub Logo | 首页 | 慕城日常 | 车影骑踪 | 器械知识 | 科学训练 | 骑行路线 | 关于ACC
```

链接映射：
| 显示名 | 路由 |
|--------|------|
| 首页 | `/` |
| 慕城日常 | `/events` |
| 车影骑踪 | `/media` |
| 器械知识 | `/knowledge/gear` |
| 科学训练 | `/knowledge/training` |
| 骑行路线 | `/routes` |
| 关于 ACC | `/about` |

### Step 5: 创建 Footer 组件

**文件**: `frontend/src/components/Footer.astro`

- ACC 名称 + 版权年份
- 简单链接 (GitHub, 联系方式占位)

### Step 6: 创建所有页面（占位符）

每个页面使用统一占位模板，包含页面标题、建设中提示、以及该板块待实现的功能列表：

| 页面文件 | 标题 | 功能占位描述 |
|---------|------|-------------|
| `pages/index.astro` | ACC ClubHub | 中央导航 Hub，展示五大板块入口卡片 |
| `pages/events/index.astro` | 慕城日常 | 活动列表、报名功能、Social Ride / Training Day |
| `pages/media/index.astro` | 车影骑踪 | 影像资料、骑友访谈、翻山越岭记录 |
| `pages/knowledge/gear.astro` | 器械知识 | 购车指南、维修 Workshop、新品解读 |
| `pages/knowledge/training.astro` | 科学训练 | 训练方法论、安全科普 |
| `pages/routes/index.astro` | 骑行路线库 | 可搜索路线数据库、难度筛选 |
| `pages/about.astro` | 关于 ACC | 俱乐部介绍、联系方式 |

**首页特殊处理**: 除了占位提示外，还包含五大板块的导航卡片（纯 HTML 链接卡片，无样式），每张卡片链接到对应板块。

### Step 7: 复制 Logo 到 public 目录

将 `docs/assets/images/logo.jpg` 复制到 `frontend/public/images/logo.jpg`

### Step 8: 本地验证

- 运行 `npm run dev`，确认启动成功
- 逐一访问所有 7 个页面路由
- 确认导航栏链接全部可点击且跳转正确

### Step 9: Vercel 部署配置

1. **构建验证**: 运行 `npm run build`，确认静态构建成功
2. **Push 到 GitHub**: 将 frontend 代码提交到 `website-rebuilt` 分支
3. **连接 Vercel**（需手动操作）:
   - 访问 vercel.com → Import Git Repository → 选择 `acc_clubhub`
   - **Root Directory** 设为 `frontend`
   - **Framework Preset** 选 `Astro`
   - 点击 Deploy
4. **后续自动化**: 每次 push 到 GitHub，Vercel 自动重新部署

> 注意：Step 9 的第 3 步（Vercel 网页端操作）需要手动完成。

---

## 交付文件清单

```
frontend/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── events/
│   │   │   └── index.astro
│   │   ├── media/
│   │   │   └── index.astro
│   │   ├── knowledge/
│   │   │   ├── gear.astro
│   │   │   └── training.astro
│   │   ├── routes/
│   │   │   └── index.astro
│   │   └── about.astro
│   └── styles/
│       └── base.css
├── public/
│   └── images/
│       └── logo.jpg
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 验证清单

- [ ] `npm run dev` 在 localhost:4321 启动成功
- [ ] 导航栏显示所有 7 个链接
- [ ] 点击每个导航链接均可跳转到对应页面
- [ ] 每个页面显示标题 + 占位内容
- [ ] 首页显示五大板块导航卡片
- [ ] Logo 图片正常显示
- [ ] `npm run build` 构建成功
- [ ] 代码已 push 到 GitHub `website-rebuilt` 分支
- [ ] Vercel 部署成功，预览链接可访问（需手动连接 Vercel）
