# Phase 4.3.2 UI Design: Event Page "Netflix Style"

> **目标**: 打造一个沉浸式、暗黑风格的活动中心，突出 "Alps Mountain Epic" 等重点活动，同时清晰展示每周常规活动。
> **参考风格**: Netflix, Strava Dark Mode, Apple Fitness+
> **关键配色**: 全局暗黑 (Dark Grey) + 活力橙 (Vibrant Orange)

---

## 1. 视觉识别系统 (Visual Identity)

### 1.1 配色方案 (Color Palette)

我们将使用极其简洁但高对比度的配色：

| 用途 | 色值 (Tailwind Class) | Hex | 说明 |
|------|----------------------|-----|------|
| **背景 (Background)** | `bg-neutral-900` | `#171717` | 页面主背景，极深灰色，非纯黑 |
> 这配色跟原来网站的主题风格太不协调了，不行。
| **卡片背景 (Surface)** | `bg-neutral-800` | `#262626` | 组件背景，略浅，带轻微透明度 |
| **主色/强调色 (Accent)** | `text-orange-500` | `#f97316` | 用于按钮、高亮标题、图标 |
| **文字 (Primary Text)** | `text-white` | `#ffffff` | 标题、重要信息 |
| **次要文字 (Secondary)** | `text-neutral-400` | `#a3a3a3` | 描述、日期、元数据 |
| **边框 (Border)** | `border-neutral-700` | `#404040` | 细微的分割线，增加层次感 |


![1770848514123](image/phase_4_3_2_event_ui/1770848514123.png)

### 1.2 字体排印 (Typography)

*   **Headings**: `font-sans font-bold tracking-tight` (紧凑、有力)
*   **Body**: `font-sans text-base leading-relaxed` (易读)
*   **Hero Title**: `text-5xl md:text-7xl font-extrabold uppercase italic` (动感、冲击力)

---

## 2. 页面布局 (Layout Structure)

页面将分为三个垂直堆叠的“楼层” (Sections)，每个楼层有不同的交互模式。

### Section A: The Stage (Spotlight / Featured)
**"Featured Events"**

*   **布局**: 全宽 (Full-width) 或 宽容器 (Container-xl)。
*   **高度**: `h-[70vh]` (占据首屏大部分)。
*   **背景**: 高清大图 (Cover Image)，叠加 `bg-gradient-to-t from-neutral-900 via-transparent to-transparent` (底部黑色渐变遮罩，保证文字可读)。
*   **内容**:
    *   左下角对齐。
    *   **标签**: `Badge` (e.g., "FEATURED", "LIMITED SPOTS").
    *   **标题**: 超大号文字，带橙色下划线或辉光效果。
    *   **信息**: 日期 | 地点 | 难度 (用图标表示)。
    *   **CTA 按钮**: 巨大的橙色实心按钮 "REGISTER NOW"。

### Section B: The Routine (Weekly Schedule)
**"Weekly Regulars"**

*   **布局**: 3-4 列网格 (Grid)，或横向滚动 (Carousel)。
*   **卡片样式**: "Glassmorphic Cards" (磨砂玻璃感)。
    *   背景: `bg-neutral-800/50` + `backdrop-blur-sm`。
    *   边框: `border border-white/10`。
    *   悬停 (Hover): `border-orange-500/50` + 轻微上浮。
*   **视觉重点**: 不使用照片，而是**图标/插画** (Iconography)。
    *   例如：啤酒图标 (Social Ride), 山峰图标 (Sunday Long), 闪电图标 (Intervals)。
    *   以此区别于上面的“大片”。

### Section C: The Archive (Past Adventures)
**"Past Epics"**

*   **布局**: 密集网格 (Grid-cols-2 md:grid-cols-3)。
*   **卡片样式**: 标准博客卡片。
    *   图片: 16:9 比例，圆角。
    *   标题: 下方显示。
    *   状态: 灰色滤镜 (Grayscale)，悬停变彩。

---

## 3. 组件规范 (Component Specs)

### 3.1 `FeaturedHero.astro`

```html
<section class="relative w-full h-[600px] overflow-hidden group">
  <!-- 1. Background Image with Zoom Effect -->
  <img src={event.cover} class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
  
  <!-- 2. Gradient Overlay -->
  <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent"></div>
  
  <!-- 3. Content -->
  <div class="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3">
    <span class="text-orange-500 font-bold tracking-widest uppercase text-sm mb-2 block">Featured Event</span>
    <h1 class="text-5xl md:text-7xl font-black text-white mb-4 italic uppercase leading-none">
      {event.title}
    </h1>
    <div class="flex items-center gap-6 text-neutral-300 mb-8 font-medium">
      <div class="flex items-center gap-2">
        <Icon name="calendar" /> {formatDate(event.date)}
      </div>
      <div class="flex items-center gap-2">
        <Icon name="map-pin" /> {event.location}
      </div>
    </div>
    <a href={`/events/${event.slug}`} class="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg shadow-orange-900/20">
      REGISTER NOW
    </a>
  </div>
</section>
```

### 3.2 `RecurringCard.astro`

```html
<a href={`/events/${event.slug}`} class="group relative flex flex-col p-6 rounded-2xl bg-neutral-800/50 border border-white/5 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1">
  <!-- Icon Wrapper -->
  <div class="w-12 h-12 rounded-xl bg-neutral-700/50 flex items-center justify-center text-orange-500 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
    <Icon name={event.icon || "bike"} size={24} />
  </div>
  
  <h3 class="text-xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{event.title}</h3>
  <p class="text-sm text-neutral-400 mb-4 line-clamp-2">{event.description}</p>
  
  <!-- Time Badge -->
  <div class="mt-auto flex items-center text-xs font-mono text-neutral-500 group-hover:text-neutral-300">
    <span class="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
    Every {getDay(event.date)}
  </div>
</a>
```

---

## 4. 实施清单

1.  **Tailwind 配置**: 确认 `tailwind.config.mjs` 中有 `neutral` 色板 (默认已有) 和 `orange` (需从 colors 引入)。
2.  **Schema 更新**: 在 `src/content/config.ts` 中添加:
    *   `featured: boolean`
    *   `isRecurring: boolean`
    *   `icon: string` (可选，用于 Regulars 卡片)
3.  **图标库**: 安装 `astro-icon` 或使用现有方案 (Lucide/Heroicons)。
4.  **页面重构**: 重写 `src/pages/events/index.astro`，移除原有的简单列表，替换为上述分层结构。

---

*设计版本: v1.0 | 日期: 2026-02-11*
