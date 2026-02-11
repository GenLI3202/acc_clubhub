# Phase 3.1: Decap CMS 基础配置 — 详细实施方案

> **父文档**: [Layer 3 总纲](file:///d:/my_projects/acc_clubhub/docs/rebuild_plan/layer3_master_plan.md)  
> **目标**: 让 `/admin` 能访问 CMS 界面，配置好 4 个内容集合

---

## 一、任务清单

| 序号 | 任务 | 文件 | 预计时间 |
|------|------|------|----------|
| 3.1.1 | 创建 CMS 入口页 | `public/admin/index.html` | 5 分钟 |
| 3.1.2 | 配置 CMS Collections | `public/admin/config.yml` | 15 分钟 |
| 3.1.3 | 配置本地测试后端 | 修改 config.yml | 5 分钟 |
| 3.1.4 | 验证 CMS 访问 | 浏览器测试 | 5 分钟 |

**总计**: 约 30-45 分钟

---

## 二、文件详情

### 3.1.1 CMS 入口页

```html
<!-- frontend/public/admin/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ACC ClubHub Admin</title>
  <!-- Decap CMS CDN -->
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</head>
<body>
  <!-- CMS 会自动挂载到 body -->
</body>
</html>
```

---

### 3.1.2 CMS 配置文件

```yaml
# frontend/public/admin/config.yml

# ===============================
# 后端配置
# ===============================
# 开发阶段使用 test-repo (本地测试，不需真实提交)
# 部署后改为 github 后端
backend:
  name: test-repo

# 未来生产配置:
# backend:
#   name: github
#   repo: GenLI3202/acc_clubhub
#   branch: main

# ===============================
# 媒体文件配置
# ===============================
media_folder: "frontend/public/images/uploads"
public_folder: "/images/uploads"

# ===============================
# 站点配置
# ===============================
site_url: http://localhost:4321
display_url: http://localhost:4321
logo_url: /images/logo.jpg

# ===============================
# 内容集合
# ===============================
collections:

  # ────────────────────────────────
  # 🎬 车影骑踪 (Media)
  # ────────────────────────────────
  - name: media
    label: "🎬 车影骑踪"
    label_singular: "影像/访谈"
    folder: "frontend/src/content/media"
    create: true
    slug: "{{year}}-{{month}}-{{slug}}"
    summary: "{{title}} ({{type}})"
    fields:
      - label: "标题"
        name: "title"
        widget: "string"
      - label: "发布日期"
        name: "date"
        widget: "datetime"
      - label: "类型"
        name: "type"
        widget: "select"
        options:
          - { label: "🎥 影像", value: "影像" }
          - { label: "🎙️ 访谈", value: "访谈" }
          - { label: "⛰️ 翻山越岭", value: "翻山越岭" }
      - label: "封面图"
        name: "cover"
        widget: "image"
        required: false
      - label: "视频链接 (YouTube/Bilibili)"
        name: "videoUrl"
        widget: "string"
        required: false
        hint: "粘贴 YouTube 或 Bilibili 视频链接"
      - label: "正文"
        name: "body"
        widget: "markdown"

  # ────────────────────────────────
  # 🔧 器械知识 (Gear)
  # ────────────────────────────────
  - name: knowledge-gear
    label: "🔧 器械知识"
    label_singular: "器械文章"
    folder: "frontend/src/content/knowledge/gear"
    create: true
    slug: "{{slug}}"
    fields:
      - label: "标题"
        name: "title"
        widget: "string"
      - label: "作者"
        name: "author"
        widget: "string"
      - label: "发布日期"
        name: "date"
        widget: "datetime"
      - label: "封面图"
        name: "cover"
        widget: "image"
        required: false
      - label: "正文"
        name: "body"
        widget: "markdown"

  # ────────────────────────────────
  # 📊 科学训练 (Training)
  # ────────────────────────────────
  - name: knowledge-training
    label: "📊 科学训练"
    label_singular: "训练文章"
    folder: "frontend/src/content/knowledge/training"
    create: true
    slug: "{{slug}}"
    fields:
      - label: "标题"
        name: "title"
        widget: "string"
      - label: "作者"
        name: "author"
        widget: "string"
      - label: "发布日期"
        name: "date"
        widget: "datetime"
      - label: "封面图"
        name: "cover"
        widget: "image"
        required: false
      - label: "正文"
        name: "body"
        widget: "markdown"

  # ────────────────────────────────
  # 🗺️ 骑行路线 (Routes)
  # ────────────────────────────────
  - name: routes
    label: "🗺️ 骑行路线"
    label_singular: "路线"
    folder: "frontend/src/content/routes"
    create: true
    slug: "{{slug}}"
    summary: "{{name}} ({{region}}) - {{distance}}km"
    fields:
      - label: "路线名称"
        name: "name"
        widget: "string"
      - label: "区域"
        name: "region"
        widget: "string"
        hint: "例如: 慕尼黑南郊, 阿尔卑斯山, 伊萨尔河谷"
      - label: "距离 (km)"
        name: "distance"
        widget: "number"
        value_type: "float"
        min: 1
      - label: "爬升 (m)"
        name: "elevation"
        widget: "number"
        value_type: "int"
        min: 0
      - label: "难度"
        name: "difficulty"
        widget: "select"
        options:
          - { label: "🟢 Easy", value: "easy" }
          - { label: "🟡 Medium", value: "medium" }
          - { label: "🟠 Hard", value: "hard" }
          - { label: "🔴 Expert", value: "expert" }
      - label: "封面图"
        name: "cover"
        widget: "image"
        required: false
      - label: "Strava 链接"
        name: "stravaUrl"
        widget: "string"
        required: false
      - label: "Komoot 链接"
        name: "komootUrl"
        widget: "string"
        required: false
      - label: "路线描述"
        name: "body"
        widget: "markdown"
```

---

## 三、验证清单

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 启动 `npm run dev` | 开发服务器运行 |
| 2 | 访问 `http://localhost:4321/admin` | 显示 Decap CMS 界面 |
| 3 | 点击任意集合 (如 "🎬 车影骑踪") | 显示内容列表 (空) |
| 4 | 点击 "New 影像/访谈" | 显示编辑表单 |
| 5 | 填写表单并点击 "Publish" | 成功保存 (test-repo 模式下为虚拟保存) |

---

## 四、下一步

完成 Phase 3.1 后，继续 **Phase 3.2: Astro Content Collections**：
- 创建 `src/content/config.ts` 定义 Zod schema
- 创建内容目录结构
- 添加示例 Markdown 文件

---

> [!TIP]
> **test-repo 模式说明**:  
> 使用 `backend: name: test-repo` 时，所有编辑操作都在浏览器内存中进行，刷新后丢失。
> 这对于验证 CMS 配置是否正确非常有用，无需配置 GitHub OAuth。
