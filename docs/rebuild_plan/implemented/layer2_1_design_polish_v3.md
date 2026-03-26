# Layer 2.1: 运动感升级方案 (Sporty Polish) - V3 (Kandinsky Edition)

> **设计输入**: 用户上传 *Der blaue Berg (1908/1909)* 画作  
> **核心诉求**: 提取蓝绿山峦色彩，背景要有"油画笔触感"  
> **风格定义**: **Expressionist Sport (表现主义运动风)** —— 用艺术的色彩填充速度的骨架

---

## 1. 🎨 调色盘：从 *A Mountain* 提取 (Art + Sport)

我们放弃通用的"电光蓝"，转而使用画作中独特的**有机色彩**，但提升亮度以适应屏幕显示。

| 角色 | 变量名 | 提取颜色 (Hex) | 视觉感受 |
|------|-------|---------------|---------|
| **Background** | `--color-bg-canvas` | `#F0F4F5` (Mist White) | 画作中苍白的山体中心，带一点冷蓝调的白 |
| **Primary** | `--color-primary` | `#2D5D9B` (Mountain Blue) | 画作核心的深邃蓝色 |
| **Secondary** | `--color-secondary` | `#5CA042` (Brush Green) | 画作前景的草地绿，充满生机 |
| **Accent** | `--color-accent` | `#D63E33` (Arch Red) | 包裹山体的红色拱门，极具张力 |
| **Highlight**| `--color-highlight` | `#F2C94C` (Sun Yellow) | 画作顶部的金色光芒 (用于徽章/小细节) |
| **Text** | `--color-text-main` | `#111111` (Charcoal) | 炭笔勾勒的黑色轮廓 |

---

## 2. 🖌️ 背景：油画笔触 (Brush Stroke Vibe)

用户想要 "蓝色绿色的山峦油画笔触作为背景的感觉"。
我们不能直接用一张大图（加载慢且干扰阅读），而是用 **CSS Mesh Gradient + 噪点** 来模拟这种"氛围"。

```css
body {
  background-color: var(--color-bg-canvas);
  /* 模拟画作中蓝/绿/白的交融 */
  background-image: 
    radial-gradient(at 0% 0%, rgba(45, 93, 155, 0.15) 0px, transparent 50%), /* Mountain Blue */
    radial-gradient(at 100% 0%, rgba(214, 62, 51, 0.1) 0px, transparent 50%), /* Arch Red */
    radial-gradient(at 100% 100%, rgba(92, 160, 66, 0.15) 0px, transparent 50%); /* Brush Green */
  background-attachment: fixed;
}

/* 叠加一层"画布纹理"而非之前的速度线 */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  opacity: 0.4;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

---

## 3. 🏎️ 形态与线条 (保持 Sporty 结构)

色彩是康定斯基的，但**骨架**依然保持 V2 确定的 "Modern Sporty"，避免退回到复古风。

*   **卡片**: `border-radius: 12px` + `skewX(-3deg)`
*   **字体**: 标题 `Jost` + `Italic`
*   **装饰线**: 使用 **Arch Red** 和 **Sun Yellow** 的渐变

---

## 4. 实施变更

1.  **`variables.css`**: 注入提取的 5 个新颜色。
2.  **`global.css`**: 重写 `body` 背景，使用 Mesh Gradient 模拟油画氛围。
3.  **组件**: 保持 V2 的圆角和倾斜设计，但应用新的配色方案（例如按钮改用 Mountain Blue，Hover 变 Arch Red）。
