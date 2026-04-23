# ACC ClubHub 内容治理与架构总纲

> **目标**: 建立标准化的内容生产、管理和维护规范，确保网站长期健康运行。
> **适用对象**: 内容贡献者、开发者、管理员
> **生效日期**: 2026-01-29
> **最近更新**: 2026-03-30

---

## 1. 命名规范 (Naming Conventions)

混乱的文件名会导致 404 错误、引用困难及 SEO 降级。所有文件必须遵循以下规则：

### 1.1 通用规则

* **全小写英文**: 禁止使用中文、大写字母。
* **连字符分隔**: 使用 `-` (kebab-case) 代替空格或下划线。
* **无特殊字符**: 禁止 `(`, `)`, `.`, `?` 等字符。

### 1.2 图片/资源文件 (Assets)

**存储路径**: `frontend/public/images/uploads/`

**命名格式**: `{板块前缀}-{描述}-{序号/类型}.{ext}`

| 板块前缀   | 示例                           | 说明         |
| ---------- | ----------------------------- | ----------- |
| `media-` | `media-alps-2025-cover.webp` | 影像/游记封面 |
| `gear-`  | `gear-tarmac-sl8-frame.webp` | 器械相关     |
| `train-` | `train-indoor-setup.webp`    | 训练相关     |
| `route-` | `route-isar-map.webp`        | 路线地图/风景 |
| `event-` | `event-coffee-ride-01.webp` | 活动海报     |
| `user-`  | `user-avatar-tom.webp`       | 用户头像     |

> **❌ 错误示例**:
>
> * `买canyon 吧.jpg` (中文)
> * `DSC04622.jpg` (无意义)
> * `Regatta.png` (大写)
> * `Image (1).jpg` (特殊字符)

### 1.3 内容文件 (Markdown)

内容文件通过 Sveltia CMS 创建。文件名由 slug 字段决定，slug 必须遵循：

* 格式: 简短语义化短语，`/events/my-event-slug` 即为 `my-event-slug`
* 全小写英文、数字、连字符
* **在所有语言版本中保持一致**（slug 跨语言共享同一个）

---

## 2. 内容集合 (Content Collections)

> **生效时间**: 2026-03-29 — Phase A+B UI redesign 后已全部落地。

所有集合均通过 Sveltia CMS 管理（`/admin`），存储在 `frontend/src/content/` 下，采用 **i18n multiple_folders** 结构：

```
collection/
├── zh/article.md    ← 中文版
├── en/article.md    ← 英文版
└── de/article.md    ← 德文版
```

`config.yml` 中已配置 `i18n: structure: multiple_folders`。

### 2.1 🎉 活动 (Events)

**存储路径**: `frontend/src/content/events/{zh,en,de}/`
**CMS 集合名**: `events`（通过 Astro 内容集合直接读取，非 Sveltia 托管）
**用途**: 所有活动内容，含报名信息

#### 2.1.1 Frontmatter Schema

```yaml
---
# REQUIRED — 控制 URL 和显示位置
slug: spring-classic-2026   # /[lang]/events/[slug]，跨语言一致
title: 春季经典骑行 2026
location: 慕尼黑英国花园南门
date: 2026-04-19           # ISO date YYYY-MM-DD

# displaySections — 控制出现在 events 页的哪些板块
# 'hero'     → 顶部轮播（限 2-3 个旗舰活动）
# 'upcoming' → 即将举办卡片网格（默认）
# 'regular'  → 每周例行活动紧凑列表（循环社交骑）
# 注意：date < 今天 的活动无论此字段为何都会出现在往期回顾
displaySections:
  - hero

# eventType — 仅用于徽章显示，不影响布局
# social-ride | training-camp | race | workshop
eventType: training-camp

# OPTIONAL
description: 年度经典长距离骑行，穿越慕尼黑南郊丘陵地带
author: ACC Club             # 默认 'ACC Club'
coverImage: /images/uploads/rr120_2024.jpg
maxParticipants: 30          # 省略 = 无人数限制
registrationDeadline: 2026-04-12  # ISO date; 截止后报名表单关闭
status: published            # draft | published
---
```

#### 2.1.2 往期活动报名关闭逻辑

date < 今天 的活动，详情页自动显示"已结束"提示，不再展示报名表单。
无需手动设置，模板自动判断（`getTodayAtMidnight()` 在 `eventHelpers.ts`）。

#### 2.1.3 创建新活动的步骤

1. 打开 `docs/content-templates/events.md` 参考模板
2. 在 CMS 或直接创建 `events/zh/`、`events/en/`、`events/de/` 三个文件
3. 填写 frontmatter（slug 三语言一致）
4. Commit via Sveltia → GitHub → Vercel 自动部署

---

### 2.2 🎬 车影骑踪 (Media)

**存储路径**: `frontend/src/content/media/{zh,en,de}/`
**CMS 集合名**: `media`
**用途**: 影像、骑友访谈、图文游记、活动图集

#### 2.2.1 Frontmatter Schema

```yaml
---
# REQUIRED
slug: alps-summer-2025       # /[lang]/media/[slug]，跨语言一致
title: 阿尔卑斯夏季骑行 2025
date: 2025-08-01            # ISO date

# type — 控制筛选标签页
# video | interview | adventure | gallery
type: adventure

# OPTIONAL
description: 穿越阿尔卑斯山的十天骑行记录
author: ACC Club
coverImage: /images/uploads/your-image.webp
videoUrl: https://...        # YouTube/Vimeo（type: video 时填写）
xiaohongshuUrl: https://...  # 小红书原始链接
tags: [race, alps, 2025]    # 自由标签，供搜索/筛选
status: published
---
```

#### 2.2.2 Type 分类说明

| Type       | 显示名称 | 说明                          |
| ---------- | ------- | ----------------------------- |
| `video`     | 影像作品 | 视频为主，图文为辅            |
| `interview` | 骑友访谈 | 深度图文访谈，聚焦人物故事    |
| `adventure` | 翻山越岭 | 长篇图文游记，记录长途旅程    |
| `gallery`   | 活动图集 | 纯图片瀑布流，记录周末活动    |

---

### 2.3 🔧 器械知识 (Gear) + 📊 科学训练 (Training)

**存储路径**:
* `frontend/src/content/knowledge/gear/{zh,en,de}/`
* `frontend/src/content/knowledge/training/{zh,en,de}/`

**CMS 集合名**: `knowledge-gear`、`knowledge-training`
**用途**: 器械评测/保养知识、科学训练方法

#### 2.3.1 Frontmatter Schema（共用于 Gear 与 Training）

```yaml
---
# REQUIRED
slug: road-bike-buying-guide   # /[lang]/knowledge/gear/[slug]
title: 公路车选购指南
date: 2026-01-15

# 分类（用于筛选下拉）
category: bike-build          # 见 2.3.2 分类表
subcategory: frames           # 见 2.3.2 二级分类

# OPTIONAL
description: 选购公路车时需要考虑的关键因素
author: ACC Club
coverImage: /images/uploads/your-image.webp
tags: [公路车, 新手, 选购]
xiaohongshuUrl: https://...
status: published
---
```

#### 2.3.2 Gear 分类标准

**一级分类 (category)**:

| 代码            | 显示名称         | 说明                   |
| -------------- | --------------- | --------------------- |
| `bike-build`   | 单车选购与组装   | 车架、套件、刹车、轮组 |
| `electronics`  | 电子与穿戴       | 功率计、码表、骑行台   |
| `apparel`      | 人身装备         | 头盔、锁鞋、骑行服     |
| `maintenance`  | 维修保养         | 工具、清洁、链条油     |

**二级分类 (subcategory)**:

| category     | subcategory  | 显示名称 |
| ------------ | ------------ | ------- |
| bike-build   | frames       | 车架系统 |
| bike-build   | groupsets    | 传动系统 |
| bike-build   | brakes       | 刹车系统 |
| bike-build   | wheels       | 轮组轮胎 |
| bike-build   | cockpit      | 操控组件 |
| electronics  | power        | 功率计   |
| electronics  | hr-monitor   | 心率设备 |
| electronics  | computer     | 码表     |
| electronics  | indoor       | 骑行台   |
| apparel      | helmet       | 头盔     |
| apparel      | shoes        | 锁鞋     |
| apparel      | clothing     | 骑行服   |
| maintenance  | tools        | 工具     |
| maintenance  | cleaning     | 清洁     |

#### 2.3.3 Training 分类说明

Training 目前不强制分类，通过 `tags` 自由标签管理。建议使用：

* 训练类型: `耐力`, `力量`, `间歇`, `爬坡`
* 主题: `FTP`, `功率`, `营养`, `恢复`, `周期化`

---

### 2.4 🗺️ 骑行路线 (Routes)

**存储路径**: `frontend/src/content/routes/{zh,en,de}/`
**CMS 集合名**: `routes`
**用途**: 俱乐部精选骑行路线

#### 2.4.1 Frontmatter Schema

```yaml
---
# REQUIRED
slug: alps-panorama           # /[lang]/routes/[slug]
name: 阿尔卑斯全景路线         # 路线名称（非 title）
distance: 120                 # 数值，公里
elevation: 1800              # 数值，米
difficulty: hard             # easy | medium | hard | expert

# 难度参考标准
# easy   → <60km,   <400m    休闲骑，零门槛
# medium → 60-100km, 400-1000m 标准周末骑
# hard   → 100-150km, 1000-2000m 挑战路线
# expert → >150km,   >2000m  顶级挑战

# 至少填写一个外部链接
stravaUrl: https://www.strava.com/routes/...
komootUrl: https://www.komoot.com/tour/...

# OPTIONAL
region: alps-bavaria         # 见 2.4.2 区域分类
description: 穿越巴伐利亚阿尔卑斯的经典路线
author: ACC Club
coverImage: /images/uploads/your-image.webp
surface: tarmac               # tarmac | gravel | mixed
xiaohongshuUrl: https://...
status: published
---
```

#### 2.4.2 区域分类 (Region)

| region          | 显示名称         | 说明                                    |
| -------------- | --------------- | --------------------------------------- |
| `munich-south` | 慕尼黑南郊       | 城市以南，阿尔卑斯山麓平原              |
| `munich-north` | 慕尼黑北郊       | 城市以北，平路为主                      |
| `alps-bavaria` | 巴伐利亚阿尔卑斯  | 德国境内山地 (Tegernsee, Sudelfeld)    |
| `alps-austria` | 奥地利阿尔卑斯    | 越境奥地利 (Achensee, Innsbruck)        |
| `alps-italy`   | 意大利多洛米蒂    | Dolomiti 及其周边 (Sella Ronda, Stelvio) |
| `island-spain` | 西班牙海岛        | 马略卡、加纳利                          |

---

## 3. 内容模板 (Content Templates)

所有集合的参考模板统一存放在 `docs/content-templates/`，**不放在内容目录内**（避免 Astro 生成虚假页面）。

| 模板文件               | 对应集合           | 用途                         |
| --------------------- | ----------------- | --------------------------- |
| `events.md`           | Events            | 活动创建参考                 |
| `media.md`            | Media             | 车影骑踪创建参考             |
| `knowledge-gear.md`   | Knowledge Gear    | 器械知识创建参考             |
| `knowledge-training.md` | Knowledge Training | 科学训练创建参考           |
| `routes.md`           | Routes            | 骑行路线创建参考             |

> 参见 `docs/MAINTENANCE.md` Section 10 也有对应的内容创作快速参考。

---

## 4. 资源质量标准 (Asset Standards)

### 4.1 图片格式与尺寸

**推荐格式**: WebP > JPG > PNG（仅限透明图标/Logo）
**转换工具**: [Squoosh.app](https://squoosh.app/)（Google 官方，免费网页工具）

**尺寸规范**:

| 类型             | 宽度   | 体积上限 |
| --------------- | ------ | -------- |
| 全屏大图 (Cover) | 1920px | 300KB    |
| 文章插图         | 1200px | 150KB    |
| 缩略图           | 600px  | 50KB     |

### 4.2 视频托管

**禁止** 直接上传视频文件到代码仓库。
使用 YouTube（国际）或 Bilibili（国内），在 frontmatter 中填写 `videoUrl`。

---

## 5. CI 治理工作流

```
CMS 撰写 → 发布 Publish → GitHub → Vercel 自动部署
```

### 5.1 Sveltia CMS 鉴权

Sveltia 通过 GitHub OAuth 登录，OAuth 代理托管在 Cloudflare Workers。
若出现 `Your domain is not allowed to use the authenticator` 错误：
→ 在 Cloudflare Workers `sveltia-cms-auth` 的环境变量中添加新域名。

### 5.2 CI 检查等级

| 等级 | 类型     | 后果         |
| ---- | -------- | ----------- |
| 🔴 L1 | 致命错误  | 阻止构建（如缺少必填字段） |
| 🟡 L2 | 优化建议  | 仅警告，不阻止（如图片 >500KB） |

---

## 6. 架构决策记录 (AD)

| AD  | 决策                          | 日期       |
|-----|------------------------------| ---------- |
| #10 | CMS 为单一数据源；DB 仅存 RSVP 交互数据；后端首次报名时自动创建 Event 记录 | 2026-03-27 |
| #13 | 手写 CSS 而非 Tailwind        | 2026-03-29 |
| #14 | `displaySections` 成为 canonical 字段，`displaySection` 仅作 legacy 兼容读取 | 2026-03-29 |
