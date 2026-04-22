# ACC ClubHub — Brand & Style Reference
> 供 slides / design agent 参阅。当前设计系统为 **V4 Rapha-Inspired Modern**（源文件：`frontend/src/styles/variables.css`）。

---

## Logo 文件

| 文件路径 | 说明 | 推荐用途 |
|---------|------|---------|
| `assets/images/logo.jpg` | 主 logo（简洁版） | 导航栏、印刷品 |
| `assets/images/ACC_logo_paint_gental_bg_two_bikes_compressed.png` | 水彩画风，浅底双人骑行（已压缩） | **Slides 背景水印（推荐）** |
| `assets/images/ACC_logo_paint_gental_bg_two_bikes.png` | 同上，原始大图 | 高清印刷 |
| `assets/images/ACC_logo_paint_two_bikes.png` | 水彩画风，透明底双人骑行 | 深色背景叠加 |
| `assets/images/ACC_logo_paint_1bike.png` | 水彩画风，单人骑行 | 小尺寸装饰 |
| `assets/images/ACC_logo_paint_colorful_two_bikes.png` | 彩色版双人骑行 | 节庆场合 |

---

## 色彩系统

### 主调色板（Light Mode）

| Token | 颜色值 | 说明 |
|-------|--------|------|
| `--color-accent` | `#C62828` | **Wine Red — 核心品牌色**，CTA、高亮、强调 |
| `--color-accent-dark` | `#a81f1f` | Hover 状态红 |
| `--color-primary` | `#1A1A1A` | Near-black，主文字 & 主 UI 色 |
| `--color-bg-canvas` | `#FFFFFF` | 画布白 |
| `--color-bg-secondary` | `#F7F7F8` | 次级背景（section 分块） |
| `--color-text-main` | `#111111` | 正文文字 |
| `--color-text-secondary` | `#6B7280` | 次要文字、副标题 |
| `--color-text-muted` | `#9CA3AF` | 弱化文字、metadata |
| `--color-text-light` | `#FFFFFF` | 深色背景上的文字 |
| `--color-border` | `#E5E7EB` | 细边框 |
| `--color-border-strong` | `#D1D5DB` | 强边框 |

### Dark Mode 覆盖

| Token | 颜色值 |
|-------|--------|
| `--color-bg-canvas` | `#111111` |
| `--color-bg-secondary` | `#1A1A1A` |
| `--color-primary` | `#EDEDED` |
| `--color-text-main` | `#E5E5E5` |
| `--color-text-secondary` | `#9CA3AF` |
| `--color-border` | `#2D2D2D` |

> Wine Red `#C62828` 在 dark mode 保持不变——在深色背景上同样有效。

---

## 字体

| 用途 | 字体 | 备用 |
|------|------|------|
| **标题** | `Jost` | `Futura`, sans-serif |
| **正文** | `Inter` | system-ui, sans-serif |

```
来源：Google Fonts
URL：https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Jost:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap
```

**字体风格规则：**
- 标题：`font-weight: 700`，`letter-spacing: -0.02em`，`line-height: 1.2`
- 正文：`font-weight: 400`，`line-height: 1.6`
- 标签/按钮：`font-family: Jost`，`text-transform: uppercase`，`letter-spacing: 0.06em`

**字号参考：**
| 层级 | 字号 |
|------|------|
| H1 | `2.5rem` |
| H2 | `1.75rem` |
| H3 | `1.25rem` |

---

## 圆角系统

| Token | 值 | 用途 |
|-------|----|------|
| `--radius-sm` | `4px` | 小元素 |
| `--radius-md` | `8px` | 通用 |
| `--radius-aero` | `12px` | 平滑边角（badge、input） |
| `--radius-btn` | `8px` | 按钮 |
| `--radius-card` | `16px` | 卡片 |
| `--radius-full` | `9999px` | 药丸形（pill） |

---

## 间距系统

| Token | 值 |
|-------|----|
| `--space-xs` | `0.25rem` |
| `--space-sm` | `0.5rem` |
| `--space-md` | `1rem` |
| `--space-lg` | `2rem` |
| `--space-xl` | `4rem` |

---

## 阴影系统

| Token | 值 |
|-------|----|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` |
| `--shadow-xl` | `0 16px 40px rgba(0,0,0,0.14)` |

---

## 布局

```
--max-width: clamp(960px, 65vw, 1400px)
```

---

## Slides 设计指导

### 颜色方案

| 用途 | 颜色 |
|------|------|
| 封面/分隔页背景 | `#1A1A1A`（near-black） |
| 正文页背景 | `#FFFFFF`（白） 或 `#F7F7F8`（浅灰） |
| 主标题 | `#1A1A1A` |
| 重点高亮文字 | `#C62828`（wine red） |
| 引用块背景 | `rgba(198, 40, 40, 0.06)` + 左侧 `#C62828` 竖线 |
| 次要文字 | `#6B7280` |

### Logo 背景使用规则

**封面 & 分隔页（深色背景）：**
- 使用 `ACC_logo_paint_two_bikes.png`（透明底）
- 叠加在 `#1A1A1A` 背景上
- 右下角或居中，opacity `0.12–0.18`，作为水印
- 不要遮挡文字

**正文页（白色背景）：**
- 使用 `ACC_logo_paint_gental_bg_two_bikes_compressed.png`
- 右下角，opacity `0.06–0.10`，极淡水印
- 或在右侧留白区域放置，不干扰内容区

**推荐：封面全屏背景方案**
```
背景色：#1A1A1A
Logo：ACC_logo_paint_gental_bg_two_bikes_compressed.png
  - 位置：右半部分，垂直居中
  - 尺寸：约 55% 页面宽度
  - opacity：0.25
  - blend mode：luminosity
主标题：#FFFFFF，左对齐，左 1/2 区域
Accent 线：#C62828，标题下方 3px 横线
```

---

## 品牌语调

- **精简，留白充足**（Rapha-inspired）
- **不倾斜**（V4 移除了 V3 的倾斜元素：`--angle-motion: 0deg`）
- 强调感来自 wine red 的点缀，而非复杂装饰
- 字体风格：几何感（Jost/Futura 系统），不是手写体

---

## 核心品牌文案

```
俱乐部名称：ACROSS Cycling Club（ACC）
Slogan：骑行，不只是骑行
三层内核：
  Across Mountains — 我们翻山越岭
  Across Paths     — 我们倾盖如故
  Across Borders   — 我们天涯比邻
```
