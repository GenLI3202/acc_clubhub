将康定斯基（Kandinsky）的早期表现主义风格（特别是慕尼黑时期的蓝骑士风格）引入自行车社团设计，不仅呼应了  **ACC 的地理根基（慕尼黑）** ，更完美诠释了骑行运动中的 **“速度（线条）”** 与  **“自然（色彩）”** 。

基于你提供的《ACC_2026焕新计划》和两幅康定斯基画作，我为你制定了这套名为 **"Der Blaue Reiter (蓝骑士) 2.0"** 的原子设计定义方案。

这套方案的核心逻辑是：**用德式的严谨骨架（Grid/Layout）去承载表现主义的浪漫灵魂（Color/Texture）。**

> 所用素材:
>
> - https://www.meisterdrucke.uk/fine-art-prints/Wassily-Kandinsky/759048/Romantic-Landscape.html
> - https://www.meisterdrucke.uk/fine-art-prints/Wassily-Kandinsky/1186712/A-Mountain,-1909.html
> - ![1769464625178](image/atomic_guide/1769464625178.png)

---

### 🎨 Design Concept: "Kinetic Expressionism" (动能表现主义)

* **视觉隐喻：** 屏幕是画布。骑行不是机器的运动，而是人在风景中的流淌。
* **核心冲突与融合：**
  * **静态 (Static):** 慕尼黑的秩序感（来自 ACC 企划书的“专业度”）。
  * **动态 (Dynamic):** *Romantic Landscape* 中的那条标志性的**对角线**和 **飞驰的骑手** 。
  * **氛围 (Vibe):** *A Mountain* 中的**朦胧感**与 **色块堆叠** 。

---

### ⚛️ T0: Design Tokens (宪法与变量)

#### 1. Color Palette (色彩原子) —— 直接取色于画作

我们不使用纯黑纯白，而是从画作中提取带有“温度”和“材质感”的颜色。

* **Background (Canvas):**
  * `token: $color-bg-canvas` -> **#E8E4D9** (米灰白)。
  * *来源：* 两幅画作中未被颜料完全覆盖的画布底色。用于网页整体背景，模拟纸张/画布质感。
* **Primary (Motion Blue):**
  * `token: $color-primary` -> **#2A5CA6** (群青蓝)。
  * *来源：* *A Mountain* 中那座巨大的蓝色山体，以及 *Romantic Landscape* 中的蓝色流线。代表 ACC 的专业与速度。
* **Accent (Sun Red):**
  * `token: $color-accent` -> **#D94F30** (朱砂红)。
  * *来源：* *Romantic Landscape* 左上角的那个 **太阳** 。用于 CTA 按钮（Call to Action）和关键数据高亮。
* **Secondary (Nature Green):**
  * `token: $color-secondary` -> **#5F8C4A** (苔藓绿)。
  * *来源：* *A Mountain* 中的前景植被。用于“路线库”和“休闲骑”板块。
* **Text (Ink):**
  * `token: $color-text-main` -> **#1A1A1A** (近乎黑的深褐)。
  * *来源：* 康定斯基画作中强有力的黑色勾边线条。

#### 2. Typography (排版原子)

我们需要在“艺术感”和“易读性”之间做平衡。

* **Font Family (Heading):** **Futura PT** 或  **Jost** 。
  * *逻辑：* 典型的德国几何无衬线体，以此致敬 Bauhaus 时期（与康定斯基同源）。它足够“硬”，能撑起 ACC 的专业度。
* **Font Family (Body):** **Inter** 或  **Source Sans 3** 。
  * *逻辑：* 极致的易读性，承载大量信息（如维修知识、路书详情）。

#### 3. Shapes & Lines (形状与线条原子) —— 关键差异点

* **The Diagonal (对角线):**
  * `token: $angle-motion` -> **-15deg** 或  **30deg** 。
  * *逻辑：* 取自 *Romantic Landscape* 中骑手下坡的角度。网页中的分割线、卡片的装饰条，全部采用倾斜切角，以此打破传统 Bento Grid 的方正沉闷，制造“速度感”。
* **The Rough Edge (粗糙边缘):**
  * `token: $border-style` -> 这里的原子不是 CSS 的 `border`，而是 SVG 遮罩。
  * *逻辑：* 模仿 *A Mountain* 中色块的边缘，不是完美的直线，而是带有**笔触感 (Brush Stroke)** 的微小起伏。

---

### ⚛️ T1: Functional Primitives (基础元件)

#### 1. Buttons (按钮原子) —— "The Impulse"

* **Primary Button:**
  * **形态：** 几何矩形，但带有轻微的  **-2度倾斜** （致敬康定斯基的动态构图）。
  * **颜色：** 朱砂红背景，米色文字。
  * **交互 (Hover):** 鼠标悬停时，不改变透明度，而是 **色块发生位移 (Offset)** ，模仿版画错位效果。
* **Ghost Button:**
  * **形态：** 无填充，使用 **粗糙的黑色手绘风格描边** （2px-3px）。

#### 2. Icons (图标原子) —— "The Sketch"

* **风格：** **Hand-drawn Outline** (手绘线性风格)。
* **逻辑：** 图标不应该是完美的矢量圆滑曲线，而应该像是用**炭笔**快速勾勒出的自行车、扳手、地图。这呼应了你手绘草图的亲切感。

#### 3. Imagery Mask (图片容器)

* **定义：** 图片不放在完美的圆角矩形里。
* **原子：** 定义一套 **"Blob Shapes" (有机形态)** 或 **"Torn Paper" (撕纸效果)** 的 SVG 容器。
* *逻辑：* 让骑行照片看起来像是拼贴画（Collage），呼应 *Romantic Landscape* 中的色块堆叠感。

---

### ⚛️ T2: Molecules (核心组件构建)

根据你的手绘图和企划书，我们组装以下关键分子：

#### 1. The Central Hub (导航罗盘) —— 首页核心

* **原子组装：**
  * **中心 (Core):** 一个略显不规则的黑色圆环（炭笔触感），中间是 ACC 的 Logo（朱砂红）。
  * **辐条 (Spokes):** 极细的线条向四周发散。
  * **卫星 (Satellites):** 5 个图标（车影、慕城、器械、训练、商业），悬浮在圆环周围。
* **动态效果：** 整个 Hub 像 *Romantic Landscape* 中的天体一样，有轻微的 **呼吸感 (Breathing Animation)** ，而非机械旋转。

#### 2. The Route Card (路书卡片) —— "A Mountain" 的数字化

* **背景：** 米灰白底色 + 纸张噪点纹理。
* **海拔图 (Elevation):** 不用标准的 Echarts 折线图。而是用 **实心色块填充** （深绿/群青），边缘带有笔触感，让海拔图看起来像一座连绵的阿尔卑斯山脉剪影。
* **排版：** 标题使用 Futura (Bold)，关键数据（距离、爬升）使用朱砂红手写体标注。

#### 3. The Workshop Module (维修/知识卡片)

* **结构：** 经典的 Bento 布局，但 **打破边界** 。
* **样式：** 卡片之间没有明显的 Gap，而是通过 **色块拼接** （Color Blocking）来区分。
  * 例如：左边是“维修指南”（蓝色块），右边是“训练日志”（绿色块）。它们挤在一起，就像康定斯基画作中挤在一起的山峦和云层。

---

### 🚀 总结：给开发者的执行指令

当你根据这个方案编写代码时，请遵循以下原则：

1. **拒绝纯平：** 给所有纯色块增加 `noise-texture` (噪点纹理) overlay，模拟画布。
2. **拥抱倾斜：** 在 Section 的分割处，使用 `clip-path: polygon(...)` 创造斜切角，不要用水平分割线。
3. **字体对撞：** 标题要大、要几何化（German Precision）；装饰性文字或数据标注可以用手写体（Artistic Vibe）。
4. **光影逻辑：** 不要用 `box-shadow` 做悬浮。用**硬边缘的色块**做阴影（Deep Rock Color），模仿强光照射下的投影。

这套方案既保留了 ACC 作为德国社团的 **硬核与专业** （通过字体和布局），又通过康定斯基的色彩和笔触，注入了骑行者独有的 **浪漫与自由** 。
