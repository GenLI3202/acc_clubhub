# Layer 4: 功能模块 (Features) — 实施总纲

> **目标**: 完成网站的核心交互功能，从静态展示升级为动态应用。
> **状态**: 待实施

---

## 一、模块概览

本层级分为 5 个子阶段，建议按顺序开发：

| 阶段 | 模块 | 核心技术 | 依赖 |
|------|------|----------|------|
| **4.1** | **认证系统** | Supabase Auth, React/Preact | Layer 1 (骨架) |
| **4.2** | **后端重构 & 活动** | FastAPI (Async), SQLAlchemy 2.0 | Layer 4.1 |
| **4.3** | **路线搜索** | Fuse.js, Astro API | Layer 3 (路线数据) |
| **4.4** | **视频嵌入** | YouTube/Bilibili API | 独立 |
| **4.5** | **评论系统** | Giscus (GitHub Discussions) | 独立 |

---

## 二、详细实施方案

### Phase 4.1: 认证系统 (Authentication)

> **目标**: 前端实现用户登录，后端准备好 Token 验证基础。

#### 技术方案
*   **服务**: Supabase Auth (免费 tier)
*   **前端 SDK**: `@supabase/supabase-js`
*   **认证流**: PKCE Flow (更安全)

#### 任务清单
1.  [ ] **Supabase 初始化**: 获取 Project URL & Key。
2.  [ ] **前端集成**:
    *   `src/lib/supabase.ts`: 单例客户端。
    *   `AuthButton.tsx`: 显示登录/头像。
    *   `LoginForm.tsx`: 处理 OAuth (Google/GitHub) 和 邮箱登录。
3.  [ ] **后端基础 (Critical)**:
    *   安装 `PyJWT`, `cryptography`。
    *   编写 `backend/core/security.py`: 验证 Supabase JWT 签名的依赖函数 (`verify_token`)。

#### 交付物
*   `frontend/src/lib/supabase.ts`
*   `frontend/src/components/auth/*`
*   `backend/core/security.py`

---

### Phase 4.2: 后端重构 & 活动报名 (Backend Rebuild & Events)

> **批判性重构**: 现有的 `backend/` 仅为占位符，需按生产标准重写。

#### 重构重点 (Critical Review)
1.  **数据库驱动**: 替换 `aiosqlite` 为 **`asyncpg`** (生产环境标准)。
2.  **ORM 模式**: 升级 `models.py` 为 **SQLAlchemy 2.0 Async** 风格。
3.  **用户模型**: `Member` 表 ID 必须兼容 Supabase 的 **UUID**，而不是自增 Integer。
4.  **架构分层**: 引入 Pydantic Schemas (`schemas.py`) 分离请求/响应数据模型。

#### 任务清单
1.  [ ] **基础设施重建**:
    *   `requirements.txt`: 添加 `asyncpg`, `pydantic-settings`。
    *   `database.py`: 配置 `AsyncSession` 和连接池。
2.  [ ] **模型重定义 (models.py)**:
    *   `Member`: **Reflect Existing Table** (created in 4.1). 定义 SQLAlchemy 模型以映射 `public.members`，ID 为 UUID。
    *   `Event`: `date` (UTC), `max_participants`。
    *   `RSVP`: 关联 Member UUID 和 Event ID。
3.  [ ] **环境配置**:
    *   设置 `DATABASE_URL` (Supabase Connection String) 到 `.env` 和生产环境。
3.  [ ] **FastAPI 路由开发**:
    *   `POST /api/events`: 管理员创建活动。
    *   `POST /api/events/{id}/rsvp`: 用户报名 (依赖 `verify_token`)。
    *   `GET /api/me/rsvps`: 我的报名记录。
4.  [ ] **邮件服务**: 集成 Resend 发送报名回执。

#### 交付物
*   重构后的 `backend/` 目录结构
*   `backend/routes/events.py`
*   `backend/schemas/event.py`

---

### Phase 4.3: 路线搜索 (Route Search)

#### 技术方案
*   **轻量化**: 不依赖后端数据库搜索，利用构建时生成的 JSON 索引 + Fuse.js 在客户端搜索 (性能足够且体验更好)。

#### 任务清单
1.  [ ] `src/pages/api/routes.json.ts`: 生成全量路线索引。
2.  [ ] `RouteSearch.tsx`: 客户端模糊搜索组件。
3.  [ ] `RouteFilter.tsx`: 难度/区域筛选。

---

### Phase 4.4 & 4.5: 媒体与交互

#### 任务清单
1.  [ ] **视频组件**: `VideoEmbed.astro` (封装 iframe)。
2.  [ ] **评论**: `Comments.astro` (Giscus 配置)。

---

## 三、开发流程建议

1.  **Phase 4.1 (Frontend Auth)**: 先让用户能登录。
2.  **Phase 4.2 (Backend Core)**: **重点攻坚**。这不仅仅是加功能，而是把后端“立起来”。
3.  **Phase 4.3+**: 锦上添花。

## 四、验证标准 (验收 Criteria)

| 模块 | 验证项 |
|------|-------|
| 4.1 | 前端 `supabase.auth.getUser()` 能获取用户信息；后端能解析 JWT 并拒绝无效 Token。 |
| 4.2 | **Refactor Check**: 代码中使用 `await session.execute(select(...))` 等异步语法；Member ID 为 UUID 格式。 |
| 4.2 | 报名流程：用户点击报名 -> API 200 OK -> 数据库 RSVP 表新增记录 -> 邮箱收到邮件。 |
