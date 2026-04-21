# Agent 发帖规范

> 本文档是 [`MAINTENANCE.md §11`](../MAINTENANCE.md) 的提炼子集，专供自动化发帖 Agent 使用。
> 两者保持一致——如有冲突，以 MAINTENANCE.md §11 为准。

---

## 1. 发帖前检查

在创建任何新帖子之前，Agent 必须确认：

1. 已确定 `slug`（kebab-case，与 `.md` 文件名一致）
2. 已知 `collection`（events / media / knowledge/training / knowledge/gear / routes）
3. 对于 media，已知 `type`（group-ride / adventure / video / interview）

**不得参考带有 `aiTemplate: true` 的帖子作为格式范本。** 这些是占位内容，不符合当前规范。

---

## 2. 资产路径约定

每个帖子拥有自己的独立资产目录，路径由 collection + (type) + slug 决定：

| Collection | 封面路径 | Gallery 路径 |
|---|---|---|
| events | `/images/events/{slug}/cover.jpg` | `/images/events/{slug}/gallery/` |
| media | `/images/media/{type}/{slug}/cover.jpg` | `/images/media/{type}/{slug}/gallery/` |
| knowledge/training | `/images/knowledge/training/{slug}/cover.jpg` | `/images/knowledge/training/{slug}/gallery/` |
| knowledge/gear | `/images/knowledge/gear/{slug}/cover.jpg` | `/images/knowledge/gear/{slug}/gallery/` |
| routes | `/images/routes/{slug}/cover.jpg` | （路线帖无 gallery） |

所有路径均为从站点根目录起的绝对路径，对应 `frontend/public/` 下的文件。

---

## 3. 文件放置顺序（必须先文件后 markdown）

```
1. 创建目录：  frontend/public/images/{collection}/{[type/]}{slug}/
2. 放入封面：  cover.jpg（或 cover.webp）
3. 放入 gallery（如有）：gallery/01-descriptor.jpg, 02-descriptor.jpg ...
4. 放入微信二维码（events 如有）：wechat-qr.png
5. 创建 markdown 文件，frontmatter 引用上述路径
```

---

## 4. Frontmatter 字段规则

### 封面字段
```yaml
# ✅ 正确
cover: /images/events/spring-classic-2026/cover.jpg

# ❌ 错误——字段名已废弃
coverImage: ...

# ❌ 错误——不得引用其他帖子的专属图片
cover: /images/media/adventure/rad-race-120-2025/cover.jpg
```

### 无真实照片时的占位图
```yaml
# ✅ 允许（未发布的草稿/未来活动）
cover: /images/shared/placeholders/ai-placeholder-01.jpg

# ❌ 禁止——不得引用另一个帖子的专属资产作为占位
cover: /images/media/video/alps-summer-2025/cover.jpg
```

---

## 5. Gallery 图片在正文中的引用

Gallery 图片直接嵌入 markdown body，使用绝对路径：

```markdown
![骑行出发](//images/events/spring-classic-2026/gallery/01-group-start.jpg)
![山顶合影](//images/events/spring-classic-2026/gallery/02-summit.jpg)
```

### Gallery 文件命名规则
- 格式：`{两位序号}-{简短描述}.jpg`
- 示例：`01-group-start.jpg`、`02-summit-photo.jpg`、`03-finish-line.jpg`
- 全小写，只用连字符，不用空格或下划线

---

## 6. 禁止行为

- 使用 `coverImage:` 字段名
- 路径含 `/images/uploads/`
- 封面图引用另一个帖子的专属资产
- 文件名含大写字母、空格、中文、UUID
- 提交 `.HEIC` 格式（上传前转为 `.jpg` 或 `.webp`）
- 已发布内容（`status: published`）使用 `shared/placeholders/` 下的占位图

---

## 7. 各 Collection 模板位置

完整 frontmatter 模板见 `docs/content-templates/`：

| Collection | 模板文件 |
|---|---|
| events | `docs/content-templates/events.md` |
| media | `docs/content-templates/media.md` |
| knowledge/training | `docs/content-templates/knowledge-training.md` |
| knowledge/gear | `docs/content-templates/knowledge-gear.md` |
| routes | `docs/content-templates/routes.md` |
