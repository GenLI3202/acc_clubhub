# Phase 4.3.1: Backend Deployment Guide

> **目标**: 部署 FastAPI 后端到 Vercel + 在 Neon 创建数据表
> **当前状态**: 代码已就绪，待手动操作
> **预计时间**: 15 分钟

---

## 前置条件

✅ Neon 数据库已存在 (用于 Waline 的同一个数据库)
✅ FastAPI 后端代码已编写完成
✅ `vercel.json` 已配置
✅ `requirements.txt` 已准备

---

## Step 1: Neon 数据库建表 (5 分钟)

### 1.1 登录 Neon Console

访问: https://console.neon.tech/

### 1.2 选择数据库

选择 Waline 使用的同一个 Neon 项目（例如 `acc-clubhub-db`）

### 1.3 执行 SQL 迁移

1. 点击左侧 **SQL Editor**
2. 复制粘贴 `backend/migrations/001_initial_schema.sql` 的全部内容
3. 点击 **Run** 执行

### 1.4 验证表创建成功

在 SQL Editor 中运行以下查询:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('events', 'rsvps', 'subscribers', 'event_metadata')
ORDER BY table_name;
```

**预期输出**:

```
table_name
-------------------
event_metadata
events
rsvps
subscribers
```

如果还看到 Waline 的表，这是正常的:

```
event_metadata
events
rsvps
subscribers
wl_comment       ← Waline
wl_counter       ← Waline
wl_users         ← Waline
```

### 1.5 插入测试活动数据 (可选)

```sql
INSERT INTO events (
  slug,
  title,
  description,
  event_date,
  location,
  event_type,
  max_participants,
  registration_deadline
) VALUES (
  'test-event-2026',
  'Test Event - Alps Ride 2026',
  'This is a test event for Phase 4.3 development',
  '2026-07-15 08:00:00+00',
  'Munich Hbf',
  'social-ride',
  20,
  '2026-07-14 23:59:59+00'
);

-- 验证插入
SELECT id, slug, title, max_participants, current_participants
FROM events
WHERE slug = 'test-event-2026';
```

---

## Step 2: 后端部署到 Vercel (10 分钟)

### 2.1 创建 Vercel 项目 (如果还没有)

访问: https://vercel.com/new

- 选择 GitHub 仓库: `acc_clubhub`
- **Root Directory**: `backend`
- **Framework Preset**: Other
- 点击 **Deploy**

### 2.2 配置环境变量

在 Vercel Dashboard:

1. 进入项目 Settings → Environment Variables
2. 添加以下变量:

| Key                 | Value                                                              | 说明                                              |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `DATABASE_URL`    | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` | 从 Neon Dashboard → Connection String 复制       |
| `RESEND_API_KEY`  | `re_xxxxxxxxx`                                                   | 从 https://resend.com/api-keys 获取（需注册账号） |
| `ALLOWED_ORIGINS` | `http://localhost:4321,https://acc-clubhub.vercel.app`           | CORS 配置                                         |

**注意**:

- `DATABASE_URL` 使用 Waline 同一个数据库的连接字符串
- `RESEND_API_KEY` 如果还没有，可以暂时留空（Phase 4.3.3 再配置）

### 2.3 重新部署

点击 **Deployments** → 最新部署 → **Redeploy**

### 2.4 验证部署成功

访问部署的 URL（例如 `https://acc-clubhub-events-ms.vercel.app`）:

**测试 Root 端点**:

```
acc-clubhub-events-ms.vercel.app
```

**预期返回**:

```json
{
  "message": "Welcome to ACC ClubHub API",
  "version": "0.4.3",
  "docs": "/docs",
  "status": "operational"
}
```

**测试 Health 端点**:

```
acc-clubhub-events-ms.vercel.apphealth
```

**预期返回** (如果 RESEND_API_KEY 未配置):

```json
{
  "status": "healthy",
  "service": "acc-clubhub-backend",
  "version": "0.4.3",
  "mode": "development",
  "warning": "Running in development mode - some features may not work"
}
```

**预期返回** (如果 RESEND_API_KEY 已配置):

```json
{
  "status": "healthy",
  "service": "acc-clubhub-backend",
  "version": "0.4.3",
  "mode": "production"
}
```

### 2.5 测试 API 文档

访问: `acc-clubhub-events-ms.vercel.appdocs`

应该看到 FastAPI 自动生成的 Swagger UI 文档，包含:

- GET `/` - Root
- GET `/health` - Health Check
- GET `/api/events` - List Events
- GET `/api/events/{slug}` - Get Event
- POST `/api/events/{event_id}/rsvp` - Create RSVP
- GET `/api/events/{event_id}/rsvps` - List RSVPs
- DELETE `/api/events/{event_id}/rsvp` - Cancel RSVP
- POST `/api/subscribe` - Subscribe
- GET `/api/unsubscribe/{token}` - Unsubscribe

### 2.6 测试 RSVP 创建 (可选)

在 `/docs` 页面，展开 `POST /api/events/{event_id}/rsvp`:

1. 点击 **Try it out**
2. 填写参数:
   - `event_id`: 1 (或从 Step 1.5 获取的 ID)
   - Request body:
     ```json
     {
       "email": "test@example.com",
       "name": "Test User",
       "notes": "Test RSVP from API docs",
       "privacy_accepted": true,
       "subscribe": false
     }
     ```
3. 点击 **Execute**

**预期返回 200**:

```json
{
  "success": true,
  "message": "报名成功！",
  "rsvp_id": 1,
  "status": "confirmed",
  "waitlist_position": null
}
```

---

## Step 3: 更新前端环境变量

### 3.1 本地开发环境

编辑 `frontend/.env`:

```bash
# 已有的 Waline 配置
PUBLIC_WALINE_SERVER_URL=https://acc-clubhub-waline.vercel.app

# 新增: 后端 API URL
PUBLIC_API_URL=https://acc-clubhub-events-ms.vercel.app
```

### 3.2 Vercel 生产环境

在 Vercel Dashboard (前端项目):

1. Settings → Environment Variables
2. 添加:
   - Key: `PUBLIC_API_URL`
   - Value: `https://acc-clubhub-events-ms.vercel.app`
3. 点击 **Save**
4. 重新部署前端

---

## 验证清单

- [x] Neon 数据库中成功创建 4 张表 (events, rsvps, subscribers, event_metadata)
- [x] 触发器正常工作 (插入 RSVP 后 `current_participants` 自动增加)
- [x] 后端部署到 Vercel 成功
- [x] `/` 和 `/health` 端点返回正常
- [x] `/docs` 可以访问 Swagger UI
- [x] 可以通过 API 创建 RSVP (如果有测试活动数据)
- [ ] 前端环境变量 `PUBLIC_API_URL` 已配置

---

## 常见问题

### Q1: Vercel 部署失败，提示找不到 `app.py`

**原因**: Root Directory 设置错误

**解决**:

1. Vercel Dashboard → Settings → General
2. **Root Directory**: 设置为 `backend`
3. Save → Redeploy

### Q2: `/health` 返回 500 错误

**原因**: `DATABASE_URL` 环境变量未配置或格式错误

**解决**:

1. 检查 Vercel 环境变量中 `DATABASE_URL` 是否存在
2. 从 Neon Dashboard 复制正确的连接字符串
3. 确保字符串包含 `?sslmode=require`

### Q3: 插入 RSVP 后 `current_participants` 没有增加

**原因**: 数据库触发器未创建

**解决**:

1. 在 Neon SQL Editor 重新运行 `001_initial_schema.sql`
2. 手动验证触发器:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE event_object_table = 'rsvps';
   ```

   应该看到 `update_participants_on_rsvp_change` 触发器

---

## 下一步

✅ **Phase 4.3.1 完成！**

下一阶段:

- **Phase 4.3.2**: 创建前端报名表单 (Preact 组件)
- **Phase 4.3.3**: 集成 Resend 邮件服务

---

**文档版本**: 1.0
**创建日期**: 2026-02-11
**作者**: Claude (Anthropic)
