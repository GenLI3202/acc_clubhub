# Phase 4.3.1: Backend Deployment Lessons Learned

> **日期**: 2026-02-11
> **状态**: ✅ 部署成功
> **部署地址**: acc-clubhub-events-ms.vercel.app

---

## 部署概览

将 FastAPI 后端部署到 Vercel Serverless，连接 Neon PostgreSQL 数据库。

### 技术栈

| 组件 | 选择 | 说明 |
|------|------|------|
| Web 框架 | FastAPI | ASGI，Vercel 原生支持 |
| 数据库 | Neon (Vercel Postgres) | 与 Waline 评论共用同一数据库 |
| DB 驱动 | pg8000 | 纯 Python，无 C 依赖 |
| ORM | SQLAlchemy 2.0 | DeclarativeBase + timezone-aware |
| 部署平台 | Vercel Serverless | @vercel/python |

---

## 踩过的坑与解决方案

### 1. vercel.json 必须使用 `builds` + `routes`

**问题**: 不使用 `builds` 时，Vercel 将 `.py` 文件当作静态文件返回源代码

**正确配置**:
```json
{
  "builds": [
    { "src": "app.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "app.py" }
  ]
}
```

**错误做法**: 使用 `rewrites` 代替 `builds` — 会直接展示源码

### 2. psycopg2-binary 不兼容 Vercel 环境

**问题**: `psycopg2-binary` 依赖 C 库 `libpq`，在 Vercel serverless 环境中无法加载

**解决**: 使用 `pg8000`（纯 Python PostgreSQL 驱动）

```
# requirements.txt
pg8000>=1.30.0  # 替代 psycopg2-binary
```

**注意**: SQLAlchemy 连接字符串需要转换:
```python
# database.py
url = url.replace("postgresql://", "postgresql+pg8000://")
```

### 3. Pydantic Settings 不允许未知环境变量

**问题**: Vercel 环境中可能存在额外的环境变量，Pydantic Settings 默认拒绝

**报错**: `Extra inputs are not permitted [type=extra_forbidden]`

**解决**: 在 Settings 的 Config 中添加 `extra = "ignore"`:
```python
class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略未知环境变量
```

### 4. EmailStr 需要 email-validator 包

**问题**: `pydantic.EmailStr` 类型需要额外安装 `email-validator`

**报错**: `ImportError: email-validator is not installed`

**解决**: 在 requirements.txt 中使用 `pydantic[email]`:
```
pydantic[email]>=2.5.0  # 替代 pydantic>=2.5.0
```

### 5. Vercel Runtime Logs 会截断错误信息

**问题**: Vercel 的 Runtime Logs 只显示错误的前几个字符，无法看到完整 traceback

**解决**: 在 app.py 中使用 try/except 包裹导入，将错误信息通过 API 返回:
```python
_startup_error = None
try:
    from config import settings
    from routes import events, rsvp
    # ... setup code
except Exception as e:
    import traceback
    _startup_error = traceback.format_exc()

@app.get("/")
def read_root():
    if _startup_error:
        return PlainTextResponse(f"STARTUP ERROR:\n\n{_startup_error}")
    return {"status": "operational"}
```

> 注意: 诊断完成后需要移除 try/except，恢复正式版本

### 6. Neon SQL Editor 的 Explain 模式

**问题**: Neon SQL Editor 有时会在 SQL 前自动添加 `EXPLAIN (ANALYZE, ...)`，导致 DDL 语句报错

**解决**: 关闭 SQL Editor 中的 "Explain" / "Query Plan" 模式后再执行

---

## Neon 数据库建表

在 Neon SQL Editor 中执行 `backend/migrations/001_initial_schema.sql`：

### 创建的表

| 表名 | 用途 | 与 Waline 关系 |
|------|------|---------------|
| `events` | 活动信息 | 独立 |
| `rsvps` | 报名记录 (email+name) | 独立 |
| `subscribers` | 活动订阅者 | 独立 |
| `event_metadata` | 活动元数据 | 独立 |
| `wl_comment` | Waline 评论 | Waline 专用 |
| `wl_counter` | Waline 计数 | Waline 专用 |
| `wl_users` | Waline 用户 | Waline 专用 |

> 7 张表共存于同一个 Neon 数据库，互不干扰

### 触发器

- `update_events_updated_at`: 自动更新 events.updated_at
- `update_participants_on_rsvp_change`: RSVP 变化时自动更新 events.current_participants

---

## Vercel 项目配置

| 配置项 | 值 |
|--------|-----|
| Project Name | acc-clubhub-events-ms |
| Root Directory | backend |
| Application Preset | Other |
| Production Branch | master |

### 环境变量

| Key | 来源 |
|-----|------|
| `DATABASE_URL` | Neon Dashboard → Connection String |
| `RESEND_API_KEY` | resend.com → API Keys |
| `ALLOWED_ORIGINS` | `http://localhost:4321,https://acc-clubhub.vercel.app` |

---

## 最终文件清单

```
backend/
├── app.py              # FastAPI 主应用
├── config.py           # Pydantic Settings (extra="ignore")
├── database.py         # SQLAlchemy + pg8000 驱动
├── models.py           # Event, RSVP, Subscriber 模型
├── requirements.txt    # pg8000, pydantic[email], etc.
├── vercel.json         # builds + routes 配置
├── .env.example        # 环境变量模板
├── migrations/
│   └── 001_initial_schema.sql  # 建表 SQL
└── routes/
    ├── __init__.py
    ├── events.py       # GET /api/events, GET /api/events/{slug}
    └── rsvp.py         # POST /api/events/{id}/rsvp, POST /api/subscribe
```

---

**文档版本**: 1.0
**创建日期**: 2026-02-11
**作者**: Claude (Anthropic)
