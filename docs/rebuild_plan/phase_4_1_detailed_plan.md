# Phase 4.1: 全站搜索与内容治理实施方案 (Optimized)

> **目标**: 结合 [内容治理总纲](../content_governance_guide.md) 与 [Bob&#39;s Detailed Plan](./bob_phase_4_1_detailed_plan.md)，落地 "源头治理 + 全站搜索" 体系。
> **状态**: 计划中
> **执行人**: Antigravity

---

## 1. 核心目标 (Objectives)

1. **治理落地**: 通过 CMS 配置 (`config.yml`) 强制执行新的内容分类与命名规范，利用 `media_folder` 实现资源物理隔离。
2. **全站搜索 (Client-side)**: 基于 Fuse.js 实现跨板块 (Media, Gear, Training, Routes, Events) 的高性能模糊搜索。
3. **深度筛选 (Contextual)**: 为各版块提供基于 Frontmatter 的多维度筛选，支持 URL 状态同步。
4. **性能优先**: 静态生成索引，Time to Interactive < 100ms。

---

## 2. 架构设计 (Architecture)

### 2.1 数据流 (Data Flow)

```mermaid
graph TB
    subgraph "Build Time (Astro SSG)"
        A[Content Collections] --> B[Search Index Generator]
        B --> C[/api/search-index.{lang}.json]
    end
  
    subgraph "Runtime (Client)"
        C --> D[Lazy Loader]
        D --> E[Fuse.js Engine]
        E --> F[SearchBar Component]
        E --> G[FilterPanel Component]
        H[URL State Manager] <--> G
    end
```

### 2.2 目录结构 (File Structure)

```
frontend/
├── public/
│   ├── images/uploads/{media,gear,training,routes,events}/  # [NEW] 物理隔离
├── src/
│   ├── components/
│   │   ├── search/
│   │   │   ├── SearchBar.tsx          # 全局搜索入口
│   │   │   ├── SearchResults.tsx      # 结果下拉 (分组显示)
│   │   │   └── SearchHighlight.tsx    # 高亮匹配
│   │   └── filter/
│   │       ├── FilterPanel.tsx        # 通用筛选面板
│   │       ├── FilterChip.tsx         # 已选标签
│   │       └── FilterRange.tsx        # 滑块 (Km/Elevation)
│   ├── lib/
│   │   ├── search/
│   │   │   ├── fuseConfig.ts          # Fuse 配置 (权重调优)
│   │   │   └── searchIndex.ts         # Index Loader (Singleton/Cache)
│   │   └── filter/
│   │       ├── filterState.ts         # Hook: URL Sync
│   │       └── filterConfig.ts        # 各版块筛选配置
│   └── pages/
│       └── api/
│           └── search-index.[lang].json.ts # [NEW] 静态索引接口
```

---

## 3. 实施步骤详解 (Implementation)

### Step 1: 基础设施与 CMS 治理 (Governance Logic)

**文件**: `frontend/public/admin/config.yml`

#### 1.1 资源目录物理隔离

* **动作**: 创建 `frontend/public/images/uploads/{media,gear,training,routes,events}/` 目录。
* **CMS 配置**:
  ```yaml
  collections:
    - name: media
      # ...
      media_folder: "{{public_folder}}/images/uploads/media" # 强制归档
  ```

#### 1.2 元数据结构升级

基于新的 Taxonomy (详见 [Governance Guide](../content_governance_guide.md))：

* **Gear**: `category` (bike-build, etc.), `subcategory`
* **Routes**: `region`, `difficulty`, `distance`, `elevation`, `surface`
* **Global**: 为 slug/title 添加 `hint` 和正则 `pattern`。

---

### Step 2: 搜索后端 (Search Index)

**文件**: `frontend/src/pages/api/search-index.[lang].json.ts`

生成 3 个静态文件: `search-index.zh.json`, `search-index.en.json`, `search-index.de.json`。

#### 数据结构 (Route Item Example)

```typescript
interface RouteSearchItem {
  collection: 'routes';
  slug: string;
  name: string;
  region: 'munich-south' | 'alps-bavaria' | ...;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'; // 用于筛选
  distance: number; // 用于 Range Filter
  elevation: number;
  lang: 'zh';
}
```

---

### Step 3: 前端交互组件 (Interactive UI)

使用 **Preact** 构建轻量化交互组件。

#### 3.1 全局搜索栏 (`SearchBar.tsx`)

* **Lazy Load**: `onFocus` 时才请求 JSON 索引。
* **Fuse 配置**:
  ```typescript
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'tags', weight: 0.2 },
    { name: 'description', weight: 0.1 }
  ]
  ```
* **UI**: 支持键盘导航 (Arrow Keys, Enter)，结果按 Collections 分组。

#### 3.2 通用筛选器 (`FilterPanel.tsx`)

* **配置化驱动**: 传入 Config 对象自动生成 UI。
  ```typescript
  const routeConfig = {
    region: { type: 'checkbox', options: [...] },
    distance: { type: 'range', min: 0, max: 200, unit: 'km' }
  }
  ```
* **URL 同步 (`useFilterState`)**:
  * Read: URL -> State (初始化)
  * Write: State -> URL (每次变更使用 `history.replaceState`)

---

### Step 4: 自动化守门员 (Content Linter)

**文件**: `scripts/lint-content.js` + GitHub Actions

* **检查项**:
  1. **Image Size**: Warning if > 500KB.
  2. **Naming**: Warning if not kebab-case.
  3. **Asset Logic**: 警告如果 Media 文章引用了 Gear 目录的图片 (可选)。
* **反馈**: PR Comment (Non-blocking).

---

## 4. 任务清单 (Task List)

### 4.1 Governance & CMS (Day 1)

- [ ] ♻️ 重构 `public/images/uploads` 目录结构。
- [ ] ⚙️ 更新 `config.yml`: 实现 Taxonomy, Hint, Pattern, Media Folder。
- [ ] 📐 更新 `src/content.config.ts` (Zod Schema)。

### 4.2 Search Core (Day 2)

- [ ] 🛠️ 创建 `src/pages/api/search-index.[lang].json.ts`。
- [ ] 📦 安装 `fuse.js`。
- [ ] 🧩 开发 `useSearchIndex` Hook (Loader & Cache)。

### 4.3 UI Components (Day 3)

- [ ] 🔍 开发 `SearchBar` (Preact)。
- [ ] 🎛️ 开发 `FilterPanel` & `FilterRange`。
- [ ] 🔗 开发 `useFilterState` (URL Sync)。

### 4.4 Integration & CI (Day 4)

- [ ] 🚀 集成到各 Index 页面 (`[lang]/routes/index.astro` 等)。
- [ ] 🤖 编写 `lint-content.js` 和 CI Workflow。
- [ ] 🧪 执行 Playwright E2E 测试 (Search & Filter)。

---

## 5. 交付物 (Deliverables)

* CMS 配置文件 (`config.yml`)
* 搜索索引生成器
* Preact 组件库 (`SearchBar`, `FilterPanel`)
* Linter 脚本

**Next Step**: 确认无误后，开始 **Day 1: Governance & CMS 配置**。
