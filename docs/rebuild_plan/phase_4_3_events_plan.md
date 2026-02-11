# Phase 4.3: 活动报名系统 (Event Registration) — 详细执行方案

> **目标**: Email-based 活动报名 + 活动订阅通知系统
> **当前状态**: 后端 API 代码已就绪，Neon 数据库待建表
> **交付状态**: 用户提交邮箱报名活动，可订阅活动通知，管理员可查看报名列表

---

## 🔍 代码审查与修复记录 (2026-02-11)

### 已修复的问题

| # | 问题 | 位置 | 修复状态 |
|---|------|------|---------|
| 1 | 使用废弃的 `declarative_base()` API | `models.py:8` | ✅ 已修复 → 使用 `DeclarativeBase` |
| 2 | 使用废弃的 `datetime.utcnow()` | `models.py`, `events.py`, `rsvp.py` | ✅ 已修复 → 使用 `datetime.now(timezone.utc)` |
| 3 | RSVP 并发竞态条件 | `rsvp.py:54` | ✅ 已修复 → 添加 `with_for_update()` 行锁 |
| 4 | 数据库触发器 vs Python 重复计数 | `rsvp.py:117`, `001_initial_schema.sql:126` | ✅ 已修复 → 删除 Python 手动计数，使用触发器 |
| 5 | 健康检查接口拼写错误 | `app.py:53` | ✅ 已修复 → `acc-cluhab` → `acc-clubhub` |
| 6 | SQL 外键引用不存在的表 | `001_initial_schema.sql:37` | ✅ 已修复 → 移除 `members` 表 FK 约束 |

### 架构决策 (已确认 2026-02-11)

| # | 问题 | 决策 | 状态 |
|---|------|------|------|
| 7 | **数据库选择** | ✅ **Neon 单一数据库** (评论+活动统一存储) | 已确认 |
| 8 | **认证系统** | ✅ **Supabase Auth** (仅用于认证，不用其数据库) | 已确认 |
| 9 | **评论系统认证** | ✅ **Waline 保持独立 GitHub OAuth** (见下方分析) | 已确认 |
| 10 | Astro `<script>` 变量传递 | ✅ 使用 `data-*` 属性 (已在 WalineComments 验证) | 已确认 |

### 修复详情

#### 修复 #1-2: 更新为现代 SQLAlchemy 2.0 API

**问题**: SQLAlchemy 2.0 废弃了 `declarative_base()` 和 `datetime.utcnow()`

**修复** (`models.py`):
```python
# ❌ 旧代码 (deprecated)
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
Base = declarative_base()
created_at = Column(DateTime, default=datetime.utcnow)

# ✅ 新代码 (modern)
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

created_at = Column(DateTime(timezone=True), default=_utcnow)
```

#### 修复 #3: RSVP 并发安全

**问题**: 两个用户同时报名可能导致超额 (TOCTOU race condition)

**修复** (`rsvp.py:54-56`):
```python
# ✅ 使用 SELECT FOR UPDATE 行锁
event = db.query(Event).filter(
    Event.id == event_id
).with_for_update().first()  # 锁定此行直到事务提交
```

#### 修复 #4: 避免重复计数

**问题**: 数据库触发器已自动更新 `current_participants`，Python 代码不应再手动 `+= 1`

**修复** (`rsvp.py:114-116`):
```python
# NOTE: current_participants 由数据库触发器自动更新
# (见 migrations/001_initial_schema.sql: update_event_participants)
# 不需要在 Python 代码中手动 event.current_participants += 1
```

#### 修复 #6: 移除不存在的外键约束

**问题**: `members` 表不在此 migration 中创建，FK 会失败

**修复** (`001_initial_schema.sql:37`):
```sql
-- ❌ 旧代码
member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

-- ✅ 新代码
member_id INTEGER,  -- Legacy: no FK constraint, members table may not exist
```

### 计划文档需更新的部分

以下代码示例在原计划中已过时，实际代码已按上述修复实施：
- **Step 6** (第 769 行): `models.py` 示例代码
- **Step 7** (第 925 行): `rsvp.py` 并发逻辑
- **Step 10** (第 1278 行): 前端组件 `import.meta.env` 问题
- **Step 11** (第 1141 行): 邮件域名拼写 `acc-clubhub.de` → `acc-clubhub.de`

---

## Context

### 当前实现分析 (Updated 2026-02-11)

**已完成的基础设施**:
- ✅ 前端活动列表页 (`EventsPage.tsx` Preact) + 筛选功能 (Phase 4.1)
- ✅ 前端活动详情页 (`events/[slug].astro`) + 外部报名按钮
- ✅ 活动内容集合 Schema (`content.config.ts`) — `eventsCollection`
- ✅ 后端数据模型 (`backend/models.py`) — SQLAlchemy 2.0 + timezone-aware
- ✅ 后端 Events API (`backend/routes/events.py`) — CRUD 已实现
- ✅ 后端 RSVP API (`backend/routes/rsvp.py`) — 结构完成，等待认证
- ✅ FastAPI 应用 (`backend/app.py`) — CORS、健康检查已配置
- ✅ 数据库连接 (`backend/database.py`) — 连接池 + serverless 优化
- ✅ SQL Migration (`001_initial_schema.sql`) — 适配 Neon (无 RLS)
- ✅ Waline 评论系统 — Neon 数据库 + GitHub OAuth 登录
- ✅ 前端 Astro + Preact 架构 — 静态输出 + 客户端交互

**缺失的关键功能**:
- ❌ Supabase Auth 项目创建 (Phase 4.4)
- ❌ 前端 Supabase 客户端 (`src/lib/supabase.ts` 不存在)
- ❌ 前端登录组件 (无 Auth 组件)
- ❌ 前端报名按钮组件
- ❌ Neon 建表 (SQL 已写好，未执行)
- ❌ 邮件通知服务 (Resend)
- ❌ 后端 Vercel 部署配置

### 与其他 Phase 的依赖关系

```
Phase 4.4 (认证系统)
    ↓ (依赖)
Phase 4.3 (活动报名) ← 当前任务
    ↓ (依赖)
Phase 4.1 (搜索筛选) ✅ 已完成
```

**决策**: Phase 4.3 依赖 Phase 4.4 (Supabase Auth)，但我们可以采用**分阶段实施策略**:
1. **Phase 4.3.1**: 先实现后端 API 和数据库 (无认证保护)
2. **Phase 4.4**: 实现 Supabase Auth
3. **Phase 4.3.2**: 集成认证到报名系统，实现前端报名组件

---

## 架构设计

### 系统架构

```mermaid
graph TB
    subgraph "前端 Astro"
        A[活动详情页]
        B[报名表单组件]
        C[用户认证组件]
    end

    subgraph "后端 FastAPI"
        D[events.py - 活动管理]
        E[rsvp.py - 报名管理]
        F[auth.py - JWT 验证]
        G[email.py - 邮件服务]
    end

    subgraph "数据库 Neon (Vercel Postgres)"
        H[(events 表)]
        I[(rsvps 表)]
        J[(wl_* 表 - Waline)]
    end

    subgraph "外部服务"
        K[Supabase Auth - 仅认证]
        L[Resend Email]
    end

    A --> B
    B --> E
    C --> F
    E --> H
    E --> I
    F --> K
    G --> L

    style A fill:#2A5CA6,color:white
    style D fill:#5F8C4A,color:white
    style H fill:#D94F30,color:white
    style K fill:#9B59B6,color:white
```

### 数据流设计

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant A as Supabase Auth
    participant B as FastAPI Backend
    participant D as Supabase DB
    participant E as Resend Email

    U->>F: 点击报名按钮
    F->>A: 检查登录状态
    alt 未登录
        F->>A: 触发 Google/GitHub OAuth
        A->>F: 返回 JWT Token
    end

    F->>B: POST /api/events/{id}/rsvp<br/>+ Authorization Header
    B->>B: 验证 JWT
    B->>D: 查询活动席位数
    D->>B: 返回剩余席位
    alt 有席位
        B->>D: 创建 RSVP 记录
        B->>E: 发送确认邮件
        B->>F: 返回成功
        F->>U: 显示报名成功提示
    else 席位已满
        B->>D: 创建等待名单记录
        B->>F: 返回等待名单状态
        F->>U: 显示已加入等待名单
    end
```

---

## 认证方式设计

### 支持的登录方式

Supabase Auth 原生支持多种认证方式，本系统将实施以下三种:

| 认证方式 | 优先级 | 适用场景 | 实施难度 |
|---------|-------|---------|---------|
| **🔐 Google OAuth** | P0 核心 | 技术用户、快速登录 | ⭐ 简单 |
| **🔐 GitHub OAuth** | P0 核心 | 技术用户、开发者 | ⭐ 简单 |
| **✉️ Email Magic Link** | P0 核心 | 非技术用户、邮箱用户 | ⭐ 简单 |
| **🔑 密码登录** | P2 扩展 | 传统用户习惯 | ⭐⭐ 中等 (需额外实现) |
| **微信/QQ** | P3 未来 | 中国用户 | ⭐⭐⭐ 复杂 |

**Email Magic Link 优势**:
- ✅ 无需记忆密码
- ✅ 验证邮箱所有权（用于邮件通知）
- ✅ 无需第三方账号绑定
- ✅ Supabase 原生支持，零配置
- ✅ 适合非技术用户（俱乐部主力）

### 认证流程对比

#### Google/GitHub OAuth 流程
```
用户点击 "使用 Google 登录"
  ↓
重定向到 Google/GitHub 授权页面
  ↓
用户授权
  ↓
回调到网站（带 OAuth code）
  ↓
Supabase Auth 交换 JWT token
  ↓
前端获得 session，自动登录
```

#### Email Magic Link 流程
```
用户输入邮箱地址
  ↓
Supabase 发送魔法链接邮件
  ↓
用户打开邮件，点击链接
  ↓
浏览器打开网站，Supabase 验证 token
  ↓
自动登录，重定向到原页面
```

## 技术选型

### 后端: FastAPI + Supabase

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| **Web 框架** | FastAPI | 类型安全、自动文档、异步支持 |
| **数据库 ORM** | SQLAlchemy 2.0 | 已有模型定义，成熟稳定 |
| **认证** | Supabase Auth + JWT | Google/GitHub/Email，免费额度大 |
| **数据库** | Supabase Postgres | 与 Auth 同平台，免费 500MB |
| **邮件服务** | Resend (Supabase Email) | 免费 3,000 封/月，开发者友好 |
| **部署** | Vercel Serverless | 与前端同平台，零配置 |

### 前端: Astro + React/Preact

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| **认证客户端** | `@supabase/supabase-js` | 官方 SDK，类型完整 |
| **UI 组件** | React/Preact | 与现有 FilterPanel 技术栈一致 |
| **表单管理** | React State | 简单场景无需重型库 |
| **状态管理** | Supabase Auth Observer | 内置 session 监听 |

---

## 数据模型设计

### Supabase 数据库表结构

#### 1. `events` 表 (扩展现有模型)

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) UNIQUE NOT NULL,  -- 与前端 content.slug 同步
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(200),
  event_type VARCHAR(50) DEFAULT 'social-ride',  -- social-ride, training-camp, race, workshop
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_date ON events(event_date);
```

#### 2. `rsvps` 表 (报名记录)

```sql
CREATE TABLE rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Supabase Auth
  status VARCHAR(20) DEFAULT 'confirmed',  -- confirmed, cancelled, waitlist
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(event_id, user_id)  -- 防止重复报名
);

-- 索引
CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX idx_rsvps_status ON rsvps(status);
```

#### 3. `event_metadata` 表 (与前端内容同步)

```sql
-- 用于存储从 Markdown frontmatter 同步的额外元数据
CREATE TABLE event_metadata (
  event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  cover_image TEXT,
  xiaohongshu_url TEXT,
  lang VARCHAR(10) DEFAULT 'de',  -- zh, en, de
  additional_data JSONB
);
```

### 数据同步策略

**核心问题**:
- 前端活动内容存储在 Markdown (`src/content/events/*.md`)
- 数据库 `events` 表用于报名管理和席位跟踪
- 两者需要保持同步但职责不同

**数据分工**:
| 维度 | Markdown (Content Collections) | Database (events 表) |
|------|-------------------------------|---------------------|
| **标题、描述、日期、地点** | ✅ 主要存储 | ✅ 同步副本 |
| **活动类型、封面图** | ✅ 主要存储 | ✅ 同步副本 |
| **当前参加人数** | ❌ 无 | ✅ 唯一数据源 |
| **报名截止时间** | ✅ 可选字段 | ✅ 主要存储 |
| **席位限制** | ❌ 无 | ✅ 唯一数据源 |
| **多语言内容** | ✅ 通过目录结构 (zh/en/de) | ⚠️ 需特殊处理 |

**解决方案 - 单向同步**:

**文件**: `backend/scripts/sync_events_from_content.py`

```python
"""
同步 Markdown 内容到数据库
GitHub Actions: 每次推送到 main 分支时自动运行
"""

import os
import re
import frontmatter
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Event, Base

def parse_markdown_file(file_path: Path) -> dict:
    """解析 Markdown frontmatter"""
    post = frontmatter.load(file_path)
    return {
        'slug': file_path.stem,
        'title': post.get('title'),
        'description': post.get('description'),
        'date': post.get('date'),
        'location': post.get('location'),
        'eventType': post.get('eventType', 'social-ride'),
        'coverImage': post.get('coverImage') or post.get('cover'),
        'xiaohongshuUrl': post.get('xiaohongshuUrl'),
        'lang': str(file_path.parent.name)  # zh, en, de
    }

def sync_events():
    """同步所有事件"""
    db: Session = SessionLocal()

    # 确保表存在
    Base.metadata.create_all(bind=engine)

    # 读取所有事件 Markdown 文件
    events_dir = Path("frontend/src/content/events")

    if not events_dir.exists():
        print(f"目录不存在: {events_dir}")
        return

    for lang_dir in events_dir.iterdir():
        if not lang_dir.is_dir():
            continue

        lang = lang_dir.name  # zh, en, de
        print(f"处理语言: {lang}")

        for md_file in lang_dir.glob("*.md"):
            try:
                data = parse_markdown_file(md_file)

                # 查找或创建事件
                event = db.query(Event).filter(Event.slug == data['slug']).first()

                if event:
                    # 更新现有事件（保留报名相关字段）
                    event.title = data['title']
                    event.description = data['description']
                    event.location = data['location']
                    event.event_type = data['eventType']
                    # 不覆盖: current_participants, max_participants, registration_deadline
                    print(f"  更新: {data['slug']}")
                else:
                    # 创建新事件
                    event = Event(
                        slug=data['slug'],
                        title=data['title'],
                        description=data['description'],
                        event_date=datetime.fromisoformat(data['date']),
                        location=data['location'],
                        event_type=data['eventType']
                    )
                    db.add(event)
                    print(f"  创建: {data['slug']}")

            except Exception as e:
                print(f"  错误: {md_file.name} - {e}")

    db.commit()
    db.close()
    print("同步完成")

if __name__ == "__main__":
    sync_events()
```

**GitHub Actions 工作流**:

**文件**: `.github/workflows/sync-events.yml`

```yaml
name: Sync Events to Database

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/src/content/events/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run sync script
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd backend
          python scripts/sync_events_from_content.py
```

**触发时机**:
1. **自动**: GitHub Actions 在每次 `push` 到 `main` 分支且 `frontend/src/content/events/` 有变更时
2. **手动**: 运行 `python backend/scripts/sync_events_from_content.py`
3. **Webhook**: 可选配置 Supabase Database Webhooks

---

## API 端点设计

### 认证相关 (Phase 4.4)

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/auth/user` | GET | 获取当前用户信息 | 需登录 |
| `/api/auth/refresh` | POST | 刷新 JWT Token | 需登录 |

### 活动管理

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/events` | GET | 获取活动列表 (支持筛选) | 公开 |
| `/api/events/{slug}` | GET | 获取活动详情 (含席位) | 公开 |
| `/api/events/{id}` | PUT | 更新活动 (管理员) | Admin |
| `/api/events/{id}` | DELETE | 删除活动 (管理员) | Admin |

### 报名管理

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/events/{event_id}/rsvp` | POST | 创建/更新报名 | 需登录 |
| `/api/events/{event_id}/rsvp` | DELETE | 取消报名 | 需登录 |
| `/api/events/{event_id}/rsvps` | GET | 获取报名列表 (管理员) | Admin |
| `/api/user/rsvps` | GET | 获取当前用户报名列表 | 需登录 |

### API 响应格式

#### GET /api/events

```json
{
  "events": [
    {
      "id": 1,
      "slug": "alps-summer-2025",
      "title": "阿尔卑斯夏日骑行",
      "event_date": "2025-07-15T08:00:00Z",
      "location": "慕尼黑中央火车站",
      "event_type": "social-ride",
      "max_participants": 20,
      "current_participants": 15,
      "registration_deadline": "2025-07-10T23:59:59Z",
      "is_public": true,
      "is_registered": false,  // 当前用户是否已报名
      "available_spots": 5
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

#### POST /api/events/{event_id}/rsvp

**Request**:
```json
{
  "notes": "我会带朋友一起参加"
}
```

**Response (成功)**:
```json
{
  "success": true,
  "message": "报名成功！确认邮件已发送。",
  "rsvp": {
    "id": 123,
    "status": "confirmed",
    "registration_date": "2025-02-10T10:30:00Z"
  },
  "event": {
    "title": "阿尔卑斯夏日骑行",
    "event_date": "2025-07-15T08:00:00Z"
  }
}
```

**Response (席位已满)**:
```json
{
  "success": true,
  "message": "该活动已满员，您已加入等待名单。",
  "rsvp": {
    "id": 124,
    "status": "waitlist"
  },
  "waitlist_position": 3
}
```

---

## 执行步骤

### Phase 4.3.1: 后端基础设施 (无认证)

#### Step 1: Supabase 项目初始化

**用户手动操作** (无法自动化):

1. 前往 https://supabase.com 创建新项目
2. 项目名称: `acc-clubhub-events`
3. 区域: `eu-central-1` (法兰克福，接近德国用户)
4. 记录环境变量:
   - `SUPABASE_URL`: `https://xxx.supabase.co`
   - `SUPABASE_ANON_KEY`: 公开密钥
   - `SUPABASE_SERVICE_ROLE_KEY`: 服务端密钥 (仅后端使用)
   - `DATABASE_URL`: PostgreSQL 连接字符串

#### Step 2: 数据库表创建

**文件**: `backend/migrations/001_initial_schema.sql`

```sql
-- ============================================================
-- ACC ClubHub - Events & RSVP Database Schema
-- ============================================================

-- Events 表
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(200),
  event_type VARCHAR(50) DEFAULT 'social-ride',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- RSVPs 表
CREATE TABLE IF NOT EXISTS rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- Supabase Auth user ID
  status VARCHAR(20) DEFAULT 'confirmed',  -- confirmed, cancelled, waitlist
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(event_id, user_id)  -- 防止重复报名
);

-- Indexes for rsvps
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status);
CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON rsvps(created_at);

-- Event Metadata 表 (可选，用于存储 Markdown frontmatter 额外数据)
CREATE TABLE IF NOT EXISTS event_metadata (
  event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  cover_image TEXT,
  xiaohongshu_url TEXT,
  lang VARCHAR(10) DEFAULT 'de',
  additional_data JSONB
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events (公开读取)
CREATE POLICY "Events are publicly viewable"
  ON events FOR SELECT
  USING (is_public = true);

CREATE POLICY "Events can be created by authenticated users"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for rsvps (用户只能看到自己的报名)
CREATE POLICY "Users can view their own RSVPs"
  ON rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RSVPs"
  ON rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs"
  ON rsvps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVPs"
  ON rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**执行方式**:
- **方式 A (推荐)**: Supabase Dashboard → SQL Editor → 粘贴完整 SQL → 点击 "Run"
- **方式 B**: 命令行执行
  ```bash
  psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
  ```

**验证执行成功**:
```sql
-- 检查表是否创建
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('events', 'rsvps', 'event_metadata');

-- 检查 RLS 是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('events', 'rsvps');
```

#### Step 3: 后端依赖安装

**文件**: `backend/requirements.txt`

```txt
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9

# Validation & Settings
pydantic==2.5.0
pydantic-settings==2.1.0

# Authentication
python-jose[cryptography]==3.3.0
python-multipart==0.0.6

# HTTP Client & Email
httpx==0.25.1
resend==0.8.0

# Utilities
python-frontmatter==1.1.0  # 用于解析 Markdown frontmatter
```

**安装**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Step 4: 环境配置

**文件**: `backend/.env.example`

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# JWT (Supabase Auth 自动生成)
SUPABASE_JWT_SECRET=your_jwt_secret

# Resend Email
RESEND_API_KEY=re_xxxxxxxxx

# CORS
ALLOWED_ORIGINS=http://localhost:4321,https://your-acc-clubhub.vercel.app
```

**文件**: `backend/config.py`

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """
    应用配置 - 所有字段为 Optional 以支持开发模式
    (开发时可不配置 Supabase/Resend，仅使用本地数据库)
    """
    # Supabase (Optional for dev mode)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Database (Optional for dev mode)
    DATABASE_URL: Optional[str] = None

    # Email Service (Optional for dev mode)
    RESEND_API_KEY: Optional[str] = None

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Application
    APP_NAME: str = "ACC ClubHub API"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

def is_production_mode() -> bool:
    """Check if all production services are configured"""
    return bool(
        settings.SUPABASE_URL
        and settings.DATABASE_URL
        and settings.RESEND_API_KEY
    )
```

#### Step 5: 数据库连接设置

**文件**: `backend/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Step 6: 更新数据模型

**文件**: `backend/models.py`

**完整代码**:

```python
"""
ACC ClubHub - SQLAlchemy 数据模型
Phase 4.3: Updated for Supabase Auth integration (UUID user_id instead of Member ID)
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import JSONB


def _utcnow() -> datetime:
    """Return timezone-aware UTC now (replaces deprecated datetime.utcnow)"""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base (replaces deprecated declarative_base())"""
    pass


class Event(Base):
    """活动模型"""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False, index=True)
    location = Column(String(200), nullable=True)
    event_type = Column(String(50), default='social-ride')  # social-ride, training-camp, race, workshop
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)  # Fixed: use _utcnow instead of datetime.utcnow
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # 关系
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")


class RSVP(Base):
    """报名记录模型"""
    __tablename__ = "rsvps"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Supabase Auth user ID (UUID)
    status = Column(String(20), default="confirmed", index=True)  # confirmed, cancelled, waitlist
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, index=True)

    # 关系
    event = relationship("Event", back_populates="rsvps")

    # 唯一约束：一个用户只能报名一次活动
    __table_args__ = (
        # 使用 Index 创建复合唯一索引
        # Index('unique_event_user', 'event_id', 'user_id', unique=True),
    )
```

**说明**:
- `user_id` 改为 `UUID` 类型以匹配 Supabase Auth
- 添加了 `event_type`, `max_participants`, `current_participants` 等字段
- 添加了 `registration_deadline` 和 `is_public` 字段
- 唯一约束需要在数据库层面创建（见 Step 2 SQL）

#### Step 7: 实现 Events API

**文件**: `backend/routes/events.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Event
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

from typing import Optional, List
from datetime import datetime

class EventResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str]
    event_date: datetime
    location: str
    event_type: str
    max_participants: Optional[int]
    current_participants: int
    registration_deadline: Optional[datetime]
    available_spots: Optional[int]

@router.get("/api/events", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 20,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取活动列表"""
    query = db.query(Event)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    events = query.offset(skip).limit(limit).all()
    return events

@router.get("/api/events/{slug}", response_model=EventResponse)
def get_event(slug: str, db: Session = Depends(get_db)):
    """获取活动详情"""
    event = db.query(Event).filter(Event.slug == slug).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
```

#### Step 8: 实现 RSVP API

**文件**: `backend/routes/rsvp.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict
from database import get_db
from models import Event, RSVP
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()

class RSVPCreate(BaseModel):
    notes: Optional[str] = None

class RSVPResponse(BaseModel):
    success: bool
    message: str
    rsvp: Dict
    event: Optional[Dict] = None
    waitlist_position: Optional[int] = None

@router.post("/api/events/{event_id}/rsvp", response_model=RSVPResponse)
def create_rsvp(
    event_id: int,
    rsvp_data: RSVPCreate,
    db: Session = Depends(get_db)
    # user_id: UUID = Depends(get_current_user)  # Phase 4.3.2 添加
):
    """创建报名"""
    # 1. 查询活动 (使用 FOR UPDATE 行锁防止并发超额)
    event = db.query(Event).filter(
        Event.id == event_id
    ).with_for_update().first()  # ✅ 添加行锁，防止 TOCTOU race condition
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. 检查是否已报名
    # existing_rsvp = db.query(RSVP).filter(
    #     RSVP.event_id == event_id,
    #     RSVP.user_id == user_id,  # Phase 4.3.2: use actual user_id
    # ).first()
    # if existing_rsvp:
    #     raise HTTPException(status_code=400, detail="Already registered")

    # 3. 检查席位
    spots_available = (
        event.max_participants - event.current_participants
        if event.max_participants
        else None
    )

    rsvp_status = "confirmed"
    waitlist_pos = None

    if spots_available is not None and spots_available <= 0:
        rsvp_status = "waitlist"
        # 计算等待名单位置
        waitlist_pos = db.query(RSVP).filter(
            RSVP.event_id == event_id,
            RSVP.status == "waitlist"
        ).count() + 1

    # 4. 创建 RSVP 记录
    new_rsvp = RSVP(
        event_id=event_id,
        # user_id=user_id,  # Phase 4.3.2: use UUID from Supabase Auth
        status=rsvp_status,
        notes=rsvp_data.notes
    )
    db.add(new_rsvp)

    # NOTE: ✅ current_participants 由数据库触发器自动更新
    # (见 migrations/001_initial_schema.sql: update_event_participants)
    # 不需要在 Python 代码中手动 event.current_participants += 1
    # 这样避免了触发器和 Python 代码双重计数的问题

    db.commit()
    db.refresh(new_rsvp)

    # 6. 发送邮件 (Phase 4.3.3 实现)
    # send_confirmation_email(user_email, event)

    return RSVPResponse(
        success=True,
        message="报名成功！" if rsvp_status == "confirmed" else "已加入等待名单",
        rsvp={
            "id": new_rsvp.id,
            "status": rsvp_status,
            "registration_date": new_rsvp.created_at
        },
        event={
            "title": event.title,
            "event_date": event.event_date
        } if rsvp_status == "confirmed" else None,
        waitlist_position=waitlist_pos
    )
```

#### Step 9: 注册路由到主应用

**文件**: `backend/app.py`

**完整代码**:

```python
"""
ACC ClubHub - FastAPI 后端应用
会员注册、活动管理、报名系统
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import events, rsvp

app = FastAPI(
    title="ACC ClubHub API",
    description="ACC 俱乐部后端服务",
    version="0.1.0"
)

# CORS 配置 - 从环境变量读取
allowed_origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ACC ClubHub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# 注册路由
app.include_router(events.router)
app.include_router(rsvp.router)
```

**变更说明**:
- 导入 `settings` 从 `config.py`
- 动态配置 CORS origins（从环境变量读取）
- 注册 `events` 和 `rsvp` 路由

#### Step 10: 本地测试

```bash
cd backend
uvicorn app:app --reload --port 8000

# 访问 http://localhost:8000/docs 查看 API 文档
# 测试 GET /api/events
# 测试 POST /api/events/1/rsvp
```

---

### Phase 4.3.2: 集成认证系统 (依赖 Phase 4.4)

#### Step 11: JWT 验证中间件

**文件**: `backend/auth.py`

```python
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """验证 JWT Token，返回 user_id"""
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase JWT 不验证 aud
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
```

#### Step 12: 更新 RSVP API 添加认证

修改 `backend/routes/rsvp.py`:

```python
from auth import get_current_user
from uuid import UUID

@router.post("/api/events/{event_id}/rsvp")
def create_rsvp(
    event_id: int,
    rsvp_data: RSVPCreate,
    user_id: UUID = Depends(get_current_user),  # ✅ 添加认证
    db: Session = Depends(get_db)
):
    # ... (检查已报名时使用 user_id)
    existing_rsvp = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.user_id == str(user_id)
    ).first()

    if existing_rsvp:
        raise HTTPException(status_code=400, detail="Already registered")

    # 创建 RSVP 时使用 user_id
    new_rsvp = RSVP(
        event_id=event_id,
        user_id=str(user_id),  # ✅ 设置用户
        status=rsvp_status,
        notes=rsvp_data.notes
    )
```

---

### Phase 4.3.3: 邮件通知系统

#### Step 13: Resend 邮件服务

**文件**: `backend/services/email.py`

```python
import resend
from config import settings
from typing import Dict

resend.api_key = settings.RESEND_API_KEY

def send_confirmation_email(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: str,
    event_location: str
) -> Dict:
    """发送报名确认邮件"""

    params = {
        "from": "ACC ClubHub <noreply@acc-clubhub.de>",
        "to": [user_email],
        "subject": f"报名确认: {event_title}",
        "html": f"""
        <h2>🚴 报名成功</h2>
        <p>您好 {user_name}，</p>
        <p>您已成功报名参加以下活动：</p>
        <ul>
            <li><strong>活动：</strong>{event_title}</li>
            <li><strong>时间：</strong>{event_date}</li>
            <li><strong>地点：</strong>{event_location}</li>
        </ul>
        <p>我们将在活动前发送提醒邮件。如需取消报名，请访问网站个人中心。</p>
        <p>祝您骑行愉快！</p>
        <p>—— ACC ClubHub 团队</p>
        """
    }

    return resend.Emails.send(params)

def send_waitlist_email(
    user_email: str,
    event_title: str
):
    """发送等待名单邮件"""
    # 类似实现
```

#### Step 14: 获取用户信息的辅助函数

**文件**: `backend/services/supabase_auth.py`

```python
import httpx
from typing import Optional, Dict
from config import settings

async def get_user_from_supabase(user_id: str) -> Optional[Dict]:
    """
    从 Supabase Auth 获取用户信息
    使用 service_role key 以获取完整用户数据
    """
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return {
                "email": data.get("email"),
                "name": data.get("user_metadata", {}).get("full_name") or data.get("email").split("@")[0],
                "raw": data
            }
    return None
```

**文件**: `backend/routes/rsvp.py` (更新 create_rsvp 函数)

```python
from services.email import send_confirmation_email
from services.supabase_auth import get_user_from_supabase

@router.post("/api/events/{event_id}/rsvp", response_model=RSVPResponse)
async def create_rsvp(
    event_id: int,
    rsvp_data: RSVPCreate,
    db: Session = Depends(get_db)
    # user_id: UUID = Depends(get_current_user)  # Phase 4.3.2 添加
):
    """创建报名"""

    # ... 前面的代码保持不变 ...

    # 6. 发送邮件
    if rsvp_status == "confirmed":
        # Phase 4.3.2: 从 user_id 获取用户邮箱
        # user_info = await get_user_from_supabase(str(user_id))
        # if user_info:
        #     send_confirmation_email(
        #         user_email=user_info["email"],
        #         user_name=user_info["name"],
        #         event_title=event.title,
        #         event_date=event.event_date.strftime("%Y-%m-%d %H:%M"),
        #         event_location=event.location or ""
        #     )

        # Phase 4.3.1: 临时硬编码（测试用）
        pass

    return RSVPResponse(...)
```

---

### Phase 4.3.4: 前端报名组件

#### Step 15: 安装 Supabase 客户端

```bash
cd frontend
npm install @supabase/supabase-js
```

#### Step 16: 配置 Supabase 客户端

**文件**: `frontend/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**文件**: `frontend/.env.example`

```bash
# Supabase (Public)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
PUBLIC_API_URL=http://localhost:8000  # 开发环境
# PUBLIC_API_URL=https://your-backend.vercel.app  # 生产环境
```

#### Step 17: 创建报名按钮组件

**文件**: `frontend/src/components/EventRegistrationButton.tsx`

```typescript
import { useState } from 'preact/hooks';
import { supabase } from '../lib/supabase';
import { t, type Locale } from '../lib/i18n';

interface Props {
  eventId: number;
  eventSlug: string;
  lang: Locale;
  isRegistered?: boolean;
  onRegistrationSuccess?: () => void;
}

export function EventRegistrationButton({
  eventId,
  eventSlug,
  lang,
  isRegistered = false,
  onRegistrationSuccess
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 检查登录状态
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // 未登录，跳转到登录
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/${lang}/events/${eventSlug}`
          }
        });
        return;
      }

      // 2. 调用后端 API
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '报名失败');
      }

      // 3. 显示成功提示
      alert(data.message);
      onRegistrationSuccess?.();

    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="event-registration">
      {isRegistered ? (
        <button class="btn-registered" disabled>
          ✓ {t(lang, 'event.registered')}
        </button>
      ) : (
        <button
          class="btn-register"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading
            ? t(lang, 'event.registering')
            : t(lang, 'event.register_now')
          }
        </button>
      )}
      {error && <p class="error">{error}</p>}
    </div>
  );
}
```

#### Step 18: 创建用户报名列表组件

**文件**: `frontend/src/components/UserRegistrations.tsx`

```typescript
// 显示用户已报名的活动列表
// 支持取消报名功能
```

#### Step 19: 集成到活动详情页

**文件**: `frontend/src/pages/[lang]/events/[slug].astro`

**关键问题**:
- Astro SSG 阶段：只有 `slug` (从 Markdown)
- 运行时阶段：需要 `event_id` (从数据库)
- **解决方案**：通过 slug 查询 API 获取完整 event 数据

**完整实现**:

```astro
---
// src/pages/[lang]/events/[slug].astro
// 慕城日常 - 活动详情页 (添加报名功能)

import ArticleLayout from '../../../layouts/ArticleLayout.astro';
import { getCollection, render } from 'astro:content';
import { getLangFromEntry, t, type Locale } from '../../../lib/i18n';
import EventRegistrationButton from '../../../components/EventRegistrationButton';

export async function getStaticPaths() {
  const allEvents = await getCollection('events');
  return allEvents.map((entry) => {
    const lang = getLangFromEntry(entry.filePath, 'events');
    return {
      params: { lang, slug: entry.data.slug },
      props: { entry },
    };
  });
}

type Props = {
  entry: Awaited<ReturnType<typeof getCollection<'events'>>>[number];
};

const { entry } = Astro.props;
const { lang } = Astro.params as { lang: Locale };
const { Content } = await render(entry);

const registrationLabels: Record<string, string> = {
  zh: '立即报名',
  en: 'Register Now',
  de: 'Jetzt anmelden',
};
---

<ArticleLayout
  title={entry.data.title}
  date={entry.data.date}
  cover={entry.data.cover}
  lang={lang}
  backLink={`/${lang}/events`}
  backLabel={t(lang, 'nav.events')}
>
  <div class="event-info">
    {entry.data.eventType && (
      <span class="event-type-badge">{entry.data.eventType}</span>
    )}
    {entry.data.location && (
      <span class="event-location">📍 {entry.data.location}</span>
    )}
  </div>

  <!-- 报名按钮区域 -->
  <div id="event-registration-container" data-slug={entry.data.slug} data-lang={lang}>
    <!-- EventRegistrationButton 将在客户端渲染到这里 -->
  </div>

  <!-- 保留外部报名链接作为备选 -->
  {entry.data.registrationLink && (
    <div class="external-registration">
      <a href={entry.data.registrationLink} target="_blank" rel="noopener" class="event-register-btn">
        {registrationLabels[lang] || registrationLabels.en} (外部) →
      </a>
    </div>
  )}

  <Content />
</ArticleLayout>

<!-- 客户端脚本：动态加载报名按钮 -->
<script define:vars={{ apiUrl: import.meta.env.PUBLIC_API_URL }}>
  // ⚠️ IMPORTANT: 在 Astro <script> 标签中不能直接使用 import.meta.env
  // 必须使用 define:vars 指令将服务端变量传递到客户端
  // 或者使用 data-* 属性通过 DOM 传递
  //
  // ❌ 错误方式：const url = import.meta.env.PUBLIC_API_URL  (不会工作)
  // ✅ 正确方式：使用 define:vars={{ apiUrl: import.meta.env.PUBLIC_API_URL }}
  //
  // 参考：WalineComments.astro 已使用此模式解决同样问题

  import { supabase } from '../../lib/supabase';
  import { EventRegistrationButton } from '../../components/EventRegistrationButton';

  async function loadEventAndRenderButton() {
    const container = document.getElementById('event-registration-container');
    if (!container) return;

    const slug = container.dataset.slug;
    const lang = container.dataset.lang;

    try {
      // 从 API 获取活动信息（包含 id 和席位信息）
      const response = await fetch(`${apiUrl}/api/events/${slug}`);
      if (!response.ok) throw new Error('Failed to load event');

      const eventData = await response.json();

      // 检查用户登录状态
      const { data: { session } } = await supabase.auth.getSession();

      // 检查用户是否已报名
      let isRegistered = false;
      if (session) {
        const rsvpResponse = await fetch(
          `${apiUrl}/api/user/rsvps`,
          {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }
        );
        if (rsvpResponse.ok) {
          const rsvps = await rsvpResponse.json();
          isRegistered = rsvps.some((r: any) => r.event_id === eventData.id);
        }
      }

      // 渲染 React 组件到容器
      // 注意：这需要在 Astro 中配置 React/Preact 集成
      // 或者使用 astro-client:load 指令

    } catch (error) {
      console.error('Failed to load event:', error);
      container.innerHTML = '<p class="error">报名功能暂时不可用</p>';
    }
  }

  // 页面加载后执行
  loadEventAndRenderButton();
</script>

<style>
  /* 保持原有样式 */
  .event-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    margin-bottom: var(--space-md);
  }

  .event-type-badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    background: var(--color-primary);
    color: white;
    font-family: var(--font-heading);
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 4px;
  }

  .event-location {
    font-size: 0.95rem;
    color: #666;
  }

  #event-registration-container {
    margin-bottom: var(--space-lg);
  }

  .external-registration {
    margin-bottom: var(--space-md);
    font-size: 0.9rem;
    color: #888;
  }

  .event-register-btn {
    display: inline-block;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-accent);
    color: white;
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.95rem;
    border: 2px solid var(--color-border-rough);
    border-radius: 4px;
    text-decoration: none;
    margin-bottom: var(--space-lg);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 3px 3px 0 var(--color-border-rough);
  }

  .event-register-btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--color-primary);
    text-decoration: none;
    color: white;
  }

  .error {
    color: #d32f2f;
    padding: var(--space-sm);
    background: #ffebee;
    border-radius: 4px;
  }
</style>
```

**注意事项**:
1. **Astro SSR/Client 混合模式**: 报名按钮需要客户端渲染，因为涉及用户状态
2. **API 调用优化**: 可以考虑在服务端预加载 event 数据，减少客户端请求
3. **错误处理**: API 不可用时应优雅降级到外部链接按钮
4. **React/Preact 集成**: 确保在 `astro.config.mjs` 中已配置 Preact 集成

#### Step 20: 更新 i18n 翻译

**文件**: `frontend/src/lib/i18n.ts`

```typescript
// zh
'event.register_now': '立即报名',
'event.registering': '报名中...',
'event.registered': '已报名',
'event.join_waitlist': '加入等待名单',
'event.cancel_registration': '取消报名',
'event.registration_success': '报名成功！确认邮件已发送。',
'event.registration_full': '该活动已满员，您已加入等待名单。',

// en
'event.register_now': 'Register Now',
'event.registering': 'Registering...',
'event.registered': 'Registered',
'event.join_waitlist': 'Join Waitlist',
'event.cancel_registration': 'Cancel Registration',

// de
'event.register_now': 'Jetzt anmelden',
// ...
```

---

### Phase 4.3.5: 部署与测试

#### Step 21: 后端部署到 Vercel

**文件**: `backend/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```

**文件**: `backend/api/index.py` (Vercel Serverless Functions 入口)

```python
"""
Vercel Serverless Function Entry Point
将 FastAPI 应用包装为 Vercel 函数
"""

from app import app

# Vercel 需要 handler 函数
handler = app

# 或者使用 vercel-wsgi 适配器
# from vercel_wsgi import handle_wsgi_event
# def handler(event, context):
#     return handle_wsgi_event(app, event, context)
```

**重要** - Vercel Python 部署有两种方式:

**方式 A: Vercel Python Runtime (推荐)**
```bash
cd backend
vercel deploy
```

**方式 B: Vercel Serverless Functions**
- 将后端代码移到 `api/` 目录
- 每个端点一个独立的 `api/events.py`, `api/rsvp.py`
- 不推荐用于 FastAPI，会破坏应用结构

**推荐的 Vercel 配置**:

**文件**: `backend/.vercelignore`

```
__pycache__
*.pyc
venv
.env
.env.local
*.md
tests
```

**部署步骤**:

1. **创建 Vercel 项目**
```bash
cd backend
vercel link
```

2. **设置环境变量** (Vercel Dashboard 或 CLI)
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add SUPABASE_JWT_SECRET
vercel env add RESEND_API_KEY
vercel env add ALLOWED_ORIGINS
```

3. **部署到生产环境**
```bash
vercel --prod
```

4. **获取后端 URL**
- 部署成功后会显示: `https://your-backend.vercel.app`
- 记录此 URL 用于前端 `PUBLIC_API_URL`

**替代部署方案 - Railway** (如果 Vercel Python 不稳定):

Railway 对 Python 支持更好，提供真实容器环境:

1. 前往 https://railway.app
2. 创建新项目，导入 GitHub 仓库
3. Railway 会自动检测 `requirements.txt` 和 `app.py`
4. 设置环境变量
5. 部署完成，获得 URL: `https://your-backend.up.railway.app`

**比较**:

| 特性 | Vercel | Railway |
|------|--------|---------|
| **冷启动** | 较慢 (~2s) | 较慢 (~1s) |
| **永久运行** | ❌ Serverless | ✅ Docker 容器 |
| **Python 支持** | ⚠️ 实验性 | ✅ 原生支持 |
| **免费额度** | 100小时/月 | $5 免费额度 |
| **推荐场景** | 低流量 API | 持续运行服务 |

#### Step 22: 环境变量配置

在 Vercel Dashboard 中添加环境变量:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SUPABASE_JWT_SECRET`
- `RESEND_API_KEY`
- `ALLOWED_ORIGINS`

#### Step 23: 端到端测试

**测试场景**:

1. **未登录用户报名流程**:
   - [ ] 访问活动详情页
   - [ ] 点击"立即报名"按钮
   - [ ] 跳转到 Google OAuth 登录页
   - [ ] 授权成功后返回活动页面
   - [ ] 再次点击报名按钮
   - [ ] 显示"报名成功"提示
   - [ ] 按钮状态变为"已报名"
   - [ ] 收到确认邮件 (检查邮箱)

2. **已登录用户报名**:
   - [ ] 已登录状态下访问活动页
   - [ ] 直接显示用户信息
   - [ ] 点击报名 → 无需登录，直接报名成功
   - [ ] 席位数 -1

3. **席位管理测试**:
   - [ ] 创建测试活动，设置 `max_participants=2`
   - [ ] 用户 A 报名 → 成功，`current_participants=1`
   - [ ] 用户 B 报名 → 成功，`current_participants=2`
   - [ ] 用户 C 报名 → 加入等待名单，`waitlist_position=1`
   - [ ] 用户 A 取消报名 → `current_participants=1`
   - [ ] 用户 C 自动升级为 `confirmed` (需要实现自动升级逻辑)

4. **多语言测试**:
   - [ ] 中文界面报名流程
   - [ ] 英文界面报名流程
   - [ ] 德文界面报名流程
   - [ ] OAuth 回调 URL 正确保留语言参数

5. **错误处理**:
   - [ ] 网络断开时报名 → 显示友好错误提示
   - [ ] 重复点击报名按钮 → 防抖，只发送一次请求
   - [ ] 活动不存在 → 404 错误页
   - [ ] 报名截止后 → 禁用报名按钮

**测试数据准备**:

```sql
-- 在 Supabase SQL Editor 中执行

-- 创建测试活动
INSERT INTO events (slug, title, description, event_date, location, event_type, max_participants, current_participants)
VALUES
  ('test-event-1', 'Test Event 1', 'Description', NOW() + INTERVAL '7 days', 'Munich', 'social-ride', 5, 0),
  ('test-event-full', 'Full Event', 'This event is full', NOW() + INTERVAL '14 days', 'Berlin', 'training-camp', 2, 2);

-- 验证插入
SELECT * FROM events;
```

---

## 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| **后端** | | |
| `backend/requirements.txt` | **修改** | 添加 FastAPI, Supabase, Resend 依赖 |
| `backend/.env.example` | **新建** | 环境变量模板 |
| `backend/config.py` | **新建** | Pydantic Settings 配置类 |
| `backend/database.py` | **新建** | SQLAlchemy 数据库连接 |
| `backend/auth.py` | **新建** | JWT 验证中间件 |
| `backend/models.py` | **修改** | 扩展 Event, RSVP 模型 |
| `backend/routes/events.py` | **新建** | 活动管理 API |
| `backend/routes/rsvp.py` | **新建** | 报名管理 API |
| `backend/services/email.py` | **新建** | Resend 邮件服务 |
| `backend/migrations/001_initial_schema.sql` | **新建** | 数据库表结构 |
| `backend/vercel.json` | **新建** | Vercel 部署配置 |
| **前端** | | |
| `frontend/package.json` | **修改** | 添加 `@supabase/supabase-js` |
| `frontend/.env.example` | **修改** | 添加 Supabase 和 API URL 环境变量 |
| `frontend/src/lib/supabase.ts` | **新建** | Supabase 客户端配置 |
| `frontend/src/components/EventRegistrationButton.tsx` | **新建** | 报名按钮组件 |
| `frontend/src/components/UserRegistrations.tsx` | **新建** | 用户报名列表组件 |
| `frontend/src/components/Auth/LoginButton.tsx` | **新建** | 登录/登出按钮 |
| `frontend/src/lib/i18n.ts` | **修改** | 添加报名相关翻译键 |
| `frontend/src/pages/[lang]/events/[slug].astro` | **修改** | 集成报名按钮 |

---

## 验证清单

### 部署前检查 (后端)

- [ ] Supabase 项目已创建
- [ ] 数据库表已创建 (events, rsvps)
- [ ] 环境变量已配置 (至少 7 个)
- [ ] `requirements.txt` 依赖已安装
- [ ] 本地测试 `uvicorn app:app --reload` 成功
- [ ] API 文档 `http://localhost:8000/docs` 可访问
- [ ] Resend API Key 已配置

### 部署前检查 (前端)

- [ ] `@supabase/supabase-js` 已安装
- [ ] Supabase 客户端已配置
- [ ] i18n 翻译键已添加
- [ ] 报名组件已创建
- [ ] 活动详情页已集成组件

### 部署后功能测试

- [ ] 后端成功部署到 Vercel
- [ ] 前端成功部署到 Vercel
- [ ] Google OAuth 登录流程正常
- [ ] 用户可以报名活动
- [ ] 席位满员时自动加入等待名单
- [ ] 报名成功后收到邮件通知
- [ ] 用户可以查看已报名活动列表
- [ ] 用户可以取消报名
- [ ] 管理员可以查看活动报名列表

---

## 未来扩展

### Phase 4.3.6: 高级功能 (可选)

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **多场次支持** | 一个活动多个时间段，分别报名 | P2 |
| **嘉宾邀请** | 已报名用户可以邀请朋友 | P2 |
| **活动提醒** | 活动前 24/48 小时自动邮件提醒 | P1 |
| **费用支付** | 付费活动集成 Stripe | P3 |
| **签到系统** | 二维码签到，现场管理 | P2 |
| **活动相册** | 报名用户上传活动照片 | P2 |

### 与 Phase 4.4 (认证) 的集成

Phase 4.3 完成后，Phase 4.4 将实现:
- 完整的用户注册/登录界面
- 用户个人中心页面
- 管理员权限管理
- 用户资料编辑

### 与前端内容同步

未来可考虑:
- 使用 Supabase Realtime 功能
- 当 Markdown 内容更新时自动触发同步
- 在 CMS 中管理活动的报名相关字段

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **Supabase 配额超限** | 免费版 500MB 数据库可能不够 | 监控使用量，定期清理旧数据 |
| **邮件送达率低** | Resend 免费版 3,000 封/月 | 使用 Gmail SMTP 作为备选 |
| **JWT Token 过期** | 用户 session 失效 | 实现自动刷新机制 |
| **数据库同步延迟** | Markdown 与数据库数据不一致 | 添加手动同步按钮，定期 Cron |
| **并发报名超额** | 同时多人报名超过席位数 | 使用数据库事务锁 |

---

## 故障排查指南

### 常见问题

#### 1. CORS 错误

**症状**: 前端浏览器控制台显示 `Access-Control-Allow-Origin` 错误

**原因**:
- 后端 `ALLOWED_ORIGINS` 环境变量未正确配置
- Vercel 开发环境 URL 与生产环境 URL 不匹配

**解决方案**:
```bash
# 检查后端环境变量
echo $ALLOWED_ORIGINS

# 应包含所有前端 URL（逗号分隔）
http://localhost:4321,https://acc-clubhub.vercel.app

# 在 Vercel Dashboard 中更新环境变量
# Settings → Environment Variables → ALLOWED_ORIGINS
```

#### 2. JWT 验证失败

**症状**: `401 Unauthorized` 错误，日志显示 "Invalid token"

**原因**:
- `SUPABASE_JWT_SECRET` 未配置或配置错误
- Token 过期 (Supabase JWT 默认 1 小时有效期)

**解决方案**:
```python
# 获取正确的 JWT Secret
# 1. 登录 Supabase Dashboard
# 2. Project Settings → API → JWT Secret
# 3. 复制 JWT Secret（不是 anon key）

# 验证 Token 内容
import jwt
token = "your-jwt-token"
decoded = jwt.decode(token, options={"verify_signature": False})
print(decoded)  # 检查 exp, sub 等字段
```

#### 3. 数据库连接失败

**症状**: `sqlalchemy.exc.OperationalError: could not connect to server`

**原因**:
- `DATABASE_URL` 格式错误
- Supabase 项目暂停或删除
- 防火墙阻止连接

**解决方案**:
```bash
# 测试数据库连接
psql $DATABASE_URL

# 检查 URL 格式（应为 postgresql:// 或 postgres://）
postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# 检查 Supabase 项目状态
# 登录 Supabase Dashboard → 确认项目为 Active 状态
```

#### 4. 邮件发送失败

**症状**: Resend API 返回 401 或 403 错误

**原因**:
- `RESEND_API_KEY` 无效或过期
- 发件域名未验证

**解决方案**:
```python
# 验证 API Key
import resend
resend.api_key = "your_api_key"

# 测试发送
params = {
  "from": "onboarding@resend.dev",
  "to": "your-email@example.com",
  "subject": "Test",
  "html": "<p>Test</p>"
}
resend.Emails.send(params)

# 如果使用自定义域名，需在 Resend Dashboard 验证 DNS
```

#### 5. OAuth 回调失败

**症状**: Google 登录后跳转到错误页面

**原因**:
- Supabase Auth Redirect URL 配置错误
- 前端 URL 与配置不匹配

**解决方案**:
```
Supabase Dashboard → Authentication → URL Configuration

Redirect URLs:
- http://localhost:4321/**  (开发环境)
- https://your-acc-clubhub.vercel.app/**  (生产环境)
```

#### 6. Vercel 部署失败

**症状**: `Error: Cannot find module 'fastapi'`

**原因**:
- `requirements.txt` 格式错误或未提交
- Vercel Python 版本不兼容

**解决方案**:
```bash
# 确保使用 Unix 风格换行符
dos2unix requirements.txt

# 验证语法
pip install -r requirements.txt --dry-run

# 检查 Vercel 构建日志
vercel logs [deployment-url]
```

### 调试技巧

#### 查看详细日志

**后端 (FastAPI)**:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**前端 (浏览器)**:
```javascript
console.log('Supabase session:', session);
console.log('API response:', data);
```

**Supabase Logs**:
- Dashboard → Database → Logs
- Dashboard → Auth → Logs

#### 数据库查询检查

```sql
-- 实时查看报名记录
SELECT
  e.title,
  e.current_participants,
  e.max_participants,
  COUNT(r.id) as actual_count
FROM events e
LEFT JOIN rsvps r ON e.id = r.event_id AND r.status = 'confirmed'
GROUP BY e.id
ORDER BY e.event_date;
```

---

## 附录

### A. 相关文档

| 文档 | 路径 |
|------|------|
| 架构总纲 | [`docs/architecture_rebuild_master.md`](../architecture_rebuild_master.md) |
| 迭代计划 | [`docs/iterative_implementation_plan.md`](../iterative_implementation_plan.md) |
| Phase 4.1 搜索筛选 | [`phase_4_1_detailed_plan.md`](./phase_4_1_detailed_plan.md) |
| Phase 4.2 Waline 评论 | [`phase_4_2_waline_plan.md`](./phase_4_2_waline_plan.md) |

### B. 外部服务注册链接

| 服务 | 注册链接 | 免费额度 |
|------|---------|---------|
| **Supabase** | https://supabase.com | 500MB 数据库 + 50,000 MAU |
| **Resend** | https://resend.com | 3,000 封/月 |
| **Vercel** | https://vercel.com | 已使用 (后端部署) |
| **Railway** | https://railway.app | $5 免费额度 (备选) |

### C. 时间估算

| 阶段 | 工作量 (小时) | 说明 |
|------|-------------|------|
| **Phase 4.3.1** | 8-12h | 后端基础设施 + API |
| **Phase 4.3.2** | 4-6h | 认证集成 |
| **Phase 4.3.3** | 2-4h | 邮件系统 |
| **Phase 4.3.4** | 6-8h | 前端组件 |
| **Phase 4.3.5** | 2-4h | 部署测试 |
| **总计** | **22-34h** | 约 3-5 个工作日 |

### D. 关键文件索引

**后端核心文件**:
- `backend/app.py` - FastAPI 应用入口
- `backend/models.py` - SQLAlchemy 数据模型
- `backend/config.py` - Pydantic Settings 配置
- `backend/database.py` - 数据库连接
- `backend/auth.py` - JWT 验证中间件
- `backend/routes/events.py` - 活动管理 API
- `backend/routes/rsvp.py` - 报名管理 API
- `backend/services/email.py` - Resend 邮件服务
- `backend/services/supabase_auth.py` - Supabase Auth 客户端
- `backend/scripts/sync_events_from_content.py` - 内容同步脚本
- `backend/migrations/001_initial_schema.sql` - 数据库表结构
- `backend/requirements.txt` - Python 依赖
- `backend/.env.example` - 环境变量模板

**前端核心文件**:
- `frontend/.env.example` - 环境变量模板
- `frontend/src/lib/supabase.ts` - Supabase 客户端配置
- `frontend/src/components/EventRegistrationButton.tsx` - 报名按钮组件
- `frontend/src/components/UserRegistrations.tsx` - 用户报名列表
- `frontend/src/components/Auth/LoginButton.tsx` - 登录/登出按钮
- `frontend/src/components/Auth/AuthModal.tsx` - 认证模态框（Google/GitHub/Email）
- `frontend/src/lib/i18n.ts` - i18n 翻译键（需更新）
- `frontend/src/pages/[lang]/events/[slug].astro` - 活动详情页（需修改）
- `.github/workflows/sync-events.yml` - GitHub Actions 同步工作流

### E. SQL 快速参考

```sql
-- 创建新活动
INSERT INTO events (slug, title, event_date, location, event_type, max_participants)
VALUES ('alps-2025', 'Alps Summer 2025', '2025-07-15 08:00:00+00', 'Munich Hbf', 'social-ride', 20);

-- 查看活动报名情况
SELECT e.title, e.current_participants, e.max_participants,
  (e.max_participants - e.current_participants) as available
FROM events e
WHERE e.slug = 'alps-2025';

-- 取消报名（更新计数）
UPDATE events SET current_participants = current_participants - 1
WHERE id = (SELECT event_id FROM rsvps WHERE id = 123);

-- 查看等待名单
SELECT r.id, r.name, r.email, r.created_at
FROM rsvps r
WHERE r.event_id = 1 AND r.status = 'waitlist'
ORDER BY r.created_at;

-- 查看活动订阅者
SELECT email, name, lang FROM subscribers WHERE is_active = true;
```

---

## 附录 F：最终架构决策 (2026-02-11 v3)

### 架构总览

```
┌──────────────────────────────────────────────┐
│ 前端 Astro (Static) + Preact 交互组件         │
│                                               │
│  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Waline 评论  │  │ 报名表单 (Preact)       │ │
│  │ (GitHub登录) │  │ 姓名+邮箱+☑订阅+☑隐私  │ │
│  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼──────────────────────┼──────────────┘
          │                      │
          ▼                      ▼
┌──────────────┐        ┌──────────────┐
│ Waline 服务端 │        │ FastAPI 后端  │
│ (Vercel)     │        │ (Vercel)     │
│ 自带用户管理  │        │ 无需 OAuth   │
└──────┬───────┘        └──────┬───────┘
       │                       │
       ▼                       ▼
┌─────────────────────────────────────┐
│ Neon (Vercel Postgres) 统一数据库    │
│ ├─ wl_comment    (Waline 评论)      │
│ ├─ wl_users      (Waline 用户)      │
│ ├─ wl_counter    (Waline 计数)      │
│ ├─ events        (活动)             │
│ ├─ rsvps         (报名: email+name) │
│ └─ subscribers   (订阅者)           │
└─────────────────────────────────────┘

         ┌──────────────┐
         │ Resend       │  ← 邮件通知
         │ (Email API)  │
         └──────────────┘
```

### 核心设计：Email-based 报名 (无需 OAuth)

**用户报名流程**:
```
活动详情页
  ↓
报名表单:
  ├─ 姓名 *
  ├─ 邮箱 *
  ├─ 备注 (可选，如饮食禁忌等)
  ├─ ☑ 我同意隐私政策 *
  └─ ☑ 订阅 ACC 活动通知 (可选)
  ↓
POST /api/events/{id}/rsvp
  ↓
┌─ 报名成功 → 发送确认邮件
├─ 名额已满 → 加入等待名单
└─ 已报名   → 提示重复报名
```

**订阅流程**:
```
订阅者 → 收到活动通知邮件
  ↓
邮件底部: [退订链接] → GET /api/unsubscribe/{token}
  ↓
一键退订，无需登录
```

### 为什么不用 OAuth / Supabase Auth？

| | Email-based (采用) | OAuth (放弃) |
|---|---|---|
| **用户体验** | 填邮箱即可，零门槛 | 需要 GitHub/Google 账号 |
| **目标用户** | 骑行俱乐部成员，非程序员 | 程序员友好，普通用户困惑 |
| **依赖服务** | 无额外服务 | 需要 Supabase 项目 |
| **隐私** | 只收集必要信息 | OAuth 获取过多权限 |
| **维护成本** | 几乎为零 | 需要管理 OAuth 应用 |

### 数据库表设计

| 表 | 用途 | 关键字段 |
|---|---|---|
| `events` | 活动信息 | slug, title, event_date, max_participants |
| `rsvps` | 报名记录 | event_id, **email**, **name**, status, privacy_accepted |
| `subscribers` | 订阅者 | **email**, name, lang, **unsubscribe_token**, is_active |
| `event_metadata` | 活动元数据 | cover_image, xiaohongshu_url |

### API 端点

| Method | Path | 功能 | 认证 |
|--------|------|------|------|
| GET | `/api/events` | 活动列表 | 无 |
| GET | `/api/events/{slug}` | 活动详情 | 无 |
| POST | `/api/events/{id}/rsvp` | **报名** | 无 (email-based) |
| DELETE | `/api/events/{id}/rsvp?email=` | 取消报名 | 无 |
| GET | `/api/events/{id}/rsvps` | 报名列表 | TODO: Admin |
| POST | `/api/subscribe` | **订阅通知** | 无 |
| GET | `/api/unsubscribe/{token}` | **退订** | Token |

### 隐私保护设计

1. **最小数据收集**: 只收集 email + name，不收集其他个人信息
2. **明确同意**: `privacy_accepted` 字段强制勾选
3. **一键退订**: 每个订阅者有唯一 `unsubscribe_token`
4. **邮件底部**: 每封通知邮件包含退订链接
5. **GDPR 合规**: 退订后 `is_active = false`，不删除记录（审计追踪）

### 前端框架确认

**Preact** (非 React):
- 组件: `import { useState } from 'preact/hooks'`
- Astro 指令: `client:idle`, `client:load`
- 输出: `static` (SSG)
- 环境变量: Preact 组件内用 `import.meta.env.PUBLIC_*`
- Astro `<script>` 标签: 用 `data-*` 属性传递变量

### 环境变量配置

**前端** (`frontend/.env`):
```bash
# Waline 评论 (已配置)
PUBLIC_WALINE_SERVER_URL=https://acc-clubhub-waline.vercel.app

# 后端 API (待配置)
PUBLIC_API_URL=https://acc-clubhub-backend.vercel.app
```

**后端** (`backend/.env`):
```bash
# Neon 数据库 (使用 Waline 同一个数据库)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Resend 邮件 (待配置)
RESEND_API_KEY=re_xxxxxxxxx

# CORS
ALLOWED_ORIGINS=http://localhost:4321,https://acc-clubhub.vercel.app
```

### 成本分析

| 服务 | 用途 | 免费额度 | 预计用量 |
|------|------|---------|---------|
| **Neon** | 统一数据库 | 0.5 GB 存储 | < 100 MB |
| **Vercel** | 前端+Waline+后端 | 100 GB 流量 | < 5 GB |
| **Resend** | 邮件通知 | 3,000 封/月 | < 100 封 |
| **总计** | | | **$0/月** |

> 注意: 不再需要 Supabase，减少一个外部服务依赖！

### 实施顺序

```
Phase 4.3.1 ── Neon 建表 + 后端部署到 Vercel       ✅ 代码已就绪
     ↓
Phase 4.3.2 ── 前端报名表单 (Preact 组件)
     ↓
Phase 4.3.3 ── Resend 邮件通知 + 订阅者通知
     ↓
Phase 4.3.4 ── 管理员功能 (查看报名/管理订阅)
```

> Phase 4.4 (Supabase Auth) 不再是前置依赖！报名系统可以独立完成。

---

**文档版本**: 3.0
**创建日期**: 2026-02-10
**最后更新**: 2026-02-11
**作者**: Claude (Anthropic)
**状态**: ✅ 架构简化完成，Email-based 报名 + 订阅系统，待 Neon 建表
