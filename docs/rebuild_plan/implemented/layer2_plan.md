# Layer 2: 样式皮肤 (Style) — 详细执行方案

> **目标**: 将蓝骑士 (Blaue Reiter) 设计系统应用到 Layer 1 骨架上，网站变"好看"
> **交付状态**: 所有页面呈现康定斯基风格，导航有动效，卡片有硬阴影

---

## 设计系统来源

- **CSS 变量 + 组件样式**: `assets/styles/blaue_reiter.css` (236 行)
- **设计哲学**: `assets/styles/atomic_guide/atomic_guide.md`
- **核心风格**: 画布背景 #E8E4D9 + 群青蓝 + 朱砂红 + 硬阴影 + 倾斜角度 + Jost/Inter 字体

---

## CSS 架构

Astro 推荐 scoped `<style>` + 全局 CSS 结合。Layer 2 采用以下结构：

```
frontend/src/styles/
├── variables.css          # T0: 设计 tokens (从 blaue_reiter.css 提取)
├── global.css             # 全局样式 (替代 base.css，导入 variables)
└── components/
    ├── cards.css          # 卡片样式 (首页 hub + 通用)
    └── buttons.css        # 按钮样式 (Primary / Ghost)
```

组件级样式 (Header, Footer) 保留在 `.astro` 文件的 scoped `<style>` 中，通过 `var()` 引用全局 tokens。

---

## 执行步骤

### Step 1: 创建 `variables.css` — 设计 Tokens

**文件**: `frontend/src/styles/variables.css`

从 `blaue_reiter.css` 提取所有 CSS 自定义属性：

```css
/* Google Fonts: Jost (heading) + Inter (body) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Jost:ital,wght@0,400;0,500;0,700;1,400&display=swap');

:root {
  /* Color Palette */
  --color-bg-canvas: #E8E4D9;
  --color-primary: #2A5CA6;
  --color-accent: #D94F30;
  --color-secondary: #5F8C4A;
  --color-text-main: #1A1A1A;
  --color-text-light: #F9F7F2;
  --color-border-rough: #1A1A1A;

  /* Typography */
  --font-heading: 'Jost', 'Futura', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Angles & Shapes */
  --angle-motion: -2deg;
  --angle-section: -3deg;
}
```

### Step 2: 重写 `global.css` — 替代 base.css

**文件**: `frontend/src/styles/global.css` (替代 `base.css`)

职责:
- 导入 `variables.css`
- CSS Reset (保留 Layer 1 的)
- 画布背景 `--color-bg-canvas` + 噪点纹理伪元素
- 全局排版 (heading 用 Jost, body 用 Inter)
- 链接样式 (蓝色 → hover 朱砂红)
- 占位符样式保留（Layer 3 替换前仍需要）
- hub-grid / hub-card 样式升级（硬阴影 + hover 位移）

关键变化:
| 属性 | Layer 1 (base.css) | Layer 2 (global.css) |
|------|-------------------|---------------------|
| 背景色 | `#f5f5f5` | `var(--color-bg-canvas)` #E8E4D9 |
| 字体 | system-ui | Jost (heading) + Inter (body) |
| 链接色 | `#2a5ca6` | `var(--color-primary)` |
| 链接 hover | underline | `var(--color-accent)` 变色 |
| 卡片阴影 | `box-shadow: 0 2px 8px` | `6px 6px 0px` 硬阴影 |
| 卡片 hover | 柔阴影 | `translate(-3px, -3px)` + 蓝色硬阴影 |
| 卡片边框 | `1px solid #ddd` | `2px solid var(--color-border-rough)` |

### Step 3: 创建 `components/buttons.css`

**文件**: `frontend/src/styles/components/buttons.css`

两种按钮：
- **Primary (The Impulse)**: 朱砂红背景 + 米色文字 + `-2deg` 倾斜 + 硬阴影 → hover 归正 + 阴影加大
- **Ghost**: 无填充 + 粗黑描边 → hover 反转为黑底白字

### Step 4: 创建 `components/cards.css`

**文件**: `frontend/src/styles/components/cards.css`

- 半透明白底 `rgba(255,255,255,0.6)`
- 粗黑边框 `2px solid`
- 硬阴影 `6px 6px 0px`
- hover: `translate(-3px, -3px)` + 蓝色硬阴影
- `.card-header`: Jost 字体，群青蓝色

### Step 5: 更新 `BaseLayout.astro`

**改动**:
- `import '../styles/base.css'` → `import '../styles/global.css'`
- 其余不变

### Step 6: 重写 `Header.astro` 样式

应用蓝骑士导航栏风格：
- 透明背景 + `backdrop-filter: blur(5px)`
- 粗边框底部 `2px solid var(--color-border-rough)`
- Logo: Jost 字体, 朱砂红, 大写
- 导航链接: Jost 字体, 500 weight
- **Hover 下划线动效**: 伪元素从 0% → 100% 宽度, 朱砂红, 带 `-1deg` 微倾斜
- 移动端: 汉堡菜单（简单的 CSS-only 折叠）

### Step 7: 重写 `Footer.astro` 样式

- 粗边框顶部 `2px solid`
- 画布背景色
- Jost 字体标题 + Inter 正文
- 链接 hover 变朱砂红

### Step 8: 升级首页 `index.astro`

- 标题: Jost 字体, 大号
- 副标题: Inter, 带呼吸感间距
- Hub 卡片: 应用 `.card` 样式 (硬阴影, hover 位移, 蓝色 hover 阴影)
- 每张卡片标题用板块对应的颜色标记
- 移除"建设中"提示，改为更优雅的"即将上线"标记

### Step 9: 升级其余 6 个页面样式

每个页面统一升级：
- `<h1>` 使用 Jost 字体 + 页面标题下方加朱砂红装饰线
- 占位区域用 `.card` 风格替代 dashed border
- 待实现列表用更优雅的样式

### Step 10: 本地验证 + 构建

- `npm run dev` 验证所有页面视觉效果
- `npm run build` 确认构建成功
- Push 到 GitHub 触发 Vercel 重新部署

---

## 需修改的文件清单

| 文件 | 操作 |
|------|------|
| `frontend/src/styles/variables.css` | **新建** — 设计 tokens |
| `frontend/src/styles/global.css` | **新建** — 全局样式 (替代 base.css) |
| `frontend/src/styles/components/buttons.css` | **新建** — 按钮组件 |
| `frontend/src/styles/components/cards.css` | **新建** — 卡片组件 |
| `frontend/src/styles/base.css` | **删除** — 被 global.css 替代 |
| `frontend/src/layouts/BaseLayout.astro` | **修改** — 导入 global.css |
| `frontend/src/components/Header.astro` | **修改** — 蓝骑士导航栏样式 |
| `frontend/src/components/Footer.astro` | **修改** — 蓝骑士页脚样式 |
| `frontend/src/pages/index.astro` | **修改** — 首页 Hub 视觉升级 |
| `frontend/src/pages/events/index.astro` | **修改** — 样式升级 |
| `frontend/src/pages/media/index.astro` | **修改** — 样式升级 |
| `frontend/src/pages/knowledge/gear.astro` | **修改** — 样式升级 |
| `frontend/src/pages/knowledge/training.astro` | **修改** — 样式升级 |
| `frontend/src/pages/routes/index.astro` | **修改** — 样式升级 |
| `frontend/src/pages/about.astro` | **修改** — 样式升级 |

---

## 验证清单

- [ ] 背景色为画布米灰白 (#E8E4D9)
- [ ] 标题字体为 Jost，正文字体为 Inter
- [ ] 导航栏透明底 + 粗边框 + hover 朱砂红下划线动效
- [ ] 首页 Hub 卡片有硬阴影 + hover 位移 + 蓝色阴影
- [ ] 按钮有倾斜 + 硬阴影 (Primary) 或粗描边 (Ghost)
- [ ] 链接 hover 从蓝色变朱砂红
- [ ] 占位页面样式统一美观
- [ ] 移动端导航可折叠
- [ ] `npm run build` 构建成功
- [ ] Vercel 部署后视觉效果正确
