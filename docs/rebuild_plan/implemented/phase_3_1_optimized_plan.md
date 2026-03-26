# Phase 3.1 优化实施方案 (含 i18n 地基 + Sveltia CMS)

> **父文档**: [Layer 3 总纲](./layer3_master_plan.md)
> **前置**: Phase 3.1 原始计划已审查，本文档为优化后版本
> **日期**: 2026-01-27

---

## 决策记录

| 决策          | 选择                           | 理由                                                                       |
| ------------- | ------------------------------ | -------------------------------------------------------------------------- |
| CMS 引擎      | **Sveltia CMS**          | i18n 更稳定，体积小 5 倍，同一份 config.yml，一行 CDN 切换                 |
| URL 前缀      | **所有语言带前缀**       | `/zh/media`、`/en/media`、`/de/media`，统一规范                      |
| 默认语言      | `zh`                         | 中文为主语言                                                               |
| i18n 文件结构 | `multiple_folders`           | `media/zh/article.md`、`media/en/article.md`，与 Astro glob() 天然兼容 |
| i18n 翻译内容 | **现在打地基，翻译后做** | 先只写中文，en/de 目录留空                                                 |

---

## 一、现状判断

Phase 3.1 的两个核心文件 **已经存在**：

- `frontend/public/admin/index.html` — CMS 入口页 (Decap CMS CDN)
- `frontend/public/admin/config.yml` — 4 个 Collection 定义齐全 (test-repo 模式)

现有配置**基础扎实**，经审查发现 **6 项值得立即优化** + **i18n 地基需要打入**。

---

## 二、修改范围

共涉及 **3 个文件**：

| 文件                                 | 操作                      |
| ------------------------------------ | ------------------------- |
| `frontend/public/admin/index.html` | 替换 CDN 为 Sveltia CMS   |
| `frontend/public/admin/config.yml` | 添加 i18n 配置 + 6 项优化 |
| `frontend/astro.config.mjs`        | 添加 i18n 路由配置        |

---

## 三、6 项优化详解

### 1. CMS 中文本地化 — `locale: 'zh_Hans'`

**问题**: CMS 管理界面按钮 (Save, Publish, Delete 等) 默认英文，与全中文的字段标签不协调。
**方案**: 添加 `locale: 'zh_Hans'`，CMS UI 自动切换为简体中文。

### 2. 关闭预览面板 — `editor: preview: false`

**问题**: 没有自定义预览模板，默认预览样式与蓝骑士设计系统完全不同，造成编辑者困惑。
**方案**: 关闭预览面板，编辑区更宽敞，避免误导。等 Phase 3.3 动态页面完成后可考虑重新开启。

### 3. CDN 引擎切换 — Sveltia CMS

**问题**: Decap CMS 3.x 有多个已知 i18n bug（multiple_folders 曾 broken、i18n:duplicate 解析失败等）。
**方案**: 切换为 Sveltia CMS（同一份 config.yml 格式，体积仅 300KB vs Decap 1.5MB，i18n 支持更成熟）。

### 4. 添加 `description` 摘要字段

**问题**: Phase 3.3 列表页卡片需要简短摘要，若不现在加入 CMS schema，后续需要手动迁移所有已创建内容。
**方案**: 为 media、knowledge-gear、knowledge-training 三个集合添加可选的 `description` 字段 (`widget: text`)。routes 集合已有结构化数据 (距离/爬升/难度) 自然形成摘要，无需添加。

### 5. 添加显式 `slug` 字段 — 解决中文 URL 问题

**问题**: 当前 slug 模板 `{{slug}}` 从 `title` 字段派生。标题是中文 (如 "公路车购车指南")，会导致文件名和 URL 出现中文字符，percent-encoding 后极丑且不利于分享和 SEO。
**方案**: 每个集合添加一个 `slug` 字段 (英文标识，如 `road-bike-buying-guide`)，slug 模板改为 `{{fields.slug}}`。

### 6. 补全生产环境注释 — `base_url` + 分支名

**问题**: 注释中的 GitHub 后端配置缺少 `base_url` (OAuth 回调必需)。确认分支名为 `master`。
**方案**: 补全注释内容。

---

## 四、i18n 地基

### config.yml 顶层 i18n 配置

```yaml
i18n:
  structure: multiple_folders
  locales: [zh, en, de]
  default_locale: zh
```

### astro.config.mjs i18n 路由

```javascript
i18n: {
  defaultLocale: 'zh',
  locales: ['zh', 'en', 'de'],
  routing: {
    prefixDefaultLocale: true,  // /zh/media, /en/media, /de/media
  },
},
```

### 字段级 i18n 规则

| 字段类型                                                 | i18n 标注           | 理由                   |
| -------------------------------------------------------- | ------------------- | ---------------------- |
| title / name / body / description                        | `i18n: true`      | 需要翻译               |
| date / author / cover / videoUrl / stravaUrl / komootUrl | `i18n: duplicate` | 各语言共享同一值       |
| type / difficulty / distance / elevation / region        | `i18n: duplicate` | 结构化数据，各语言共享 |
| slug                                                     | `i18n: duplicate` | URL 标识各语言统一     |

### 内容目录结构

```
frontend/src/content/
├── media/
│   ├── zh/          ← 中文内容 (Phase 3.1 开始写)
│   ├── en/          ← 英文内容 (后续翻译)
│   └── de/          ← 德文内容 (后续翻译)
├── knowledge/
│   ├── gear/
│   │   ├── zh/
│   │   ├── en/
│   │   └── de/
│   └── training/
│       ├── zh/
│       ├── en/
│       └── de/
└── routes/
    ├── zh/
    ├── en/
    └── de/
```

---

## 五、延后处理项

| 项目                                   | 原因                                      | 属于         |
| -------------------------------------- | ----------------------------------------- | ------------ |
| `tags` 标签字段                      | 需要 Phase 3.3 列表页筛选 UI 设计才有意义 | Phase 3.3    |
| `publish_mode: editorial_workflow`   | test-repo 模式下不需要                    | 切生产后端时 |
| `src/content/config.ts` (Zod schema) | 内容集合定义                              | Phase 3.2    |
| 示例 Markdown 内容                     | 测试内容                                  | Phase 3.2    |
| 动态页面 `[slug].astro`              | 页面渲染                                  | Phase 3.3    |
| Header 语言切换器 UI                   | 用户界面                                  | Phase 3.3    |
| `src/i18n/ui.ts` 翻译字典            | UI 文案翻译                               | Phase 3.3    |
| 实际翻译内容 (en/de)                   | 多语言内容                                | 后期         |

---

## 六、验证清单

1. `cd frontend && npm run dev`
2. 访问 `http://localhost:4321/admin`
3. 验证项：
   - [X] CMS 界面加载成功（Sveltia CMS）
   - [X] UI 按钮显示为中文 (发布、保存、删除等)
   - [X] 无预览面板 (编辑区全宽)
   - [X] 4 个集合都能点击进入
   - [X] 编辑器显示语言切换标签页（zh / en / de）
   - [X] 可翻译字段 (title, body) 在每个语言标签页有独立输入
   - [X] 共享字段 (date, cover) 在各语言页内容一致
   - [X] 新建条目时可看到 slug、description 等新字段
   - [X] 填写表单后点击发布无报错（test-repo 虚拟保存）
4. 确认 Astro 开发服务器启动无 i18n 配置错误
