# Waline 部署平台迁移方案

> **目的**: 记录 Waline 评论系统从当前平台迁移到其他平台的步骤
> **适用场景**: Vercel 无法访问、需要自建服务器、或切换云平台

---

## 迁移路径概览

```
┌─────────────────┐     pg_dump      ┌─────────────────┐
│ Vercel Postgres │ ────────────────→ │   新平台数据库   │
│   (Neon)        │                   │   PostgreSQL    │
└─────────────────┘                   └─────────────────┘
                                                 │
┌─────────────────┐   更新环境变量        │
│ Waline 服务端   │ ─────────────────────→┘
│ (Vercel)        │
└─────────────────┘
        │
        ↓ 重新部署
┌─────────────────┐
│  新平台服务端   │
│ (Railway/Render/│
│  自建服务器)    │
└─────────────────┘
        │
        ↓ 更新 serverURL
┌─────────────────┐
│   你的网站      │
│   (前端无需改动) │
└─────────────────┘
```

---

## 目标平台对比

| 平台 | 免费额度 | 国内访问 | 部署难度 | 推荐度 |
|------|----------|----------|----------|--------|
| **Vercel** | 256MB PG + 10万操作/月 | ⚠️ 较慢 | ⭐ 非常简单 | ⭐⭐⭐⭐⭐ |
| **Railway** | $5 免费额度 | ✅ 尚可 | ⭐⭐ 简单 | ⭐⭐⭐⭐ |
| **Render** | 256MB RAM + 750小时/月 | ✅ 尚可 | ⭐⭐ 简单 | ⭐⭐⭐⭐ |
| **自建服务器** | 取决于配置 | ✅ 最快 | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐ |
| **Cloudflare Workers** | 100K 请求/天免费 | ✅ 极快 | ⭐⭐⭐ 中等 | ⭐⭐⭐ |

---

## 详细迁移步骤

### 迁移到 Railway

#### 1. 导出 Vercel Postgres 数据

```bash
# 从 Vercel 项目设置中获取 POSTGRES_URL
pg_dump $POSTGRES_URL > waline_backup.sql
```

#### 2. 在 Railway 创建 PostgreSQL 数据库

1. 前往 https://railway.app/
2. 点击 "New Project" → "Provision PostgreSQL"
3. 记录 Railway 提供的 DATABASE_URL

#### 3. 导入数据到 Railway

```bash
psql $RAILWAY_DATABASE_URL < waline_backup.sql
```

#### 4. 在 Railway 部署 Waline 服务端

1. 在 Railway 创建新项目
2. 连接 GitHub 仓库 (fork https://github.com/walinejs/waline)
3. 配置环境变量:
   ```bash
   POSTGRES_HOST=${RAILWAY_DB_HOST}
   POSTGRES_DB=${RAILWAY_DB_NAME}
   POSTGRES_USER=${RAILWAY_DB_USER}
   POSTGRES_PASSWORD=${RAILWAY_DB_PASSWORD}
   POSTGRES_PORT=5432

   # GitHub/Google OAuth 保持不变
   GITHUB_CLIENT_ID=xxx
   GITHUB_CLIENT_SECRET=xxx
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   ```
4. 部署，获得新 URL: `https://your-waline.railway.app`

#### 5. 更新前端配置

修改 `frontend/src/components/WalineComments.astro`:
```typescript
init({
  el: '#waline',
- serverURL: 'https://your-waline.vercel.app',
+ serverURL: 'https://your-waline.railway.app',
  ...
});
```

#### 6. 验证

- 访问任意详情页，确认评论区加载
- 登录管理后台，确认历史评论存在
- 发表测试评论，确认功能正常

---

### 迁移到 Render

#### 1. 导出 Vercel Postgres 数据

同 Railway 步骤 1

#### 2. 在 Render 创建 PostgreSQL 数据库

1. 前往 https://render.com/
2. 点击 "New" → "PostgreSQL"
3. 选择免费计划 (256MB RAM, 90天休眠)
4. 记录 Internal Database URL

#### 3. 导入数据到 Render

```bash
psql $RENDER_DATABASE_URL < waline_backup.sql
```

#### 4. 在 Render 部署 Waline 服务端

1. 在 Render 点击 "New" → "Web Service"
2. 连接 GitHub 仓库
3. 配置环境变量 (同 Railway)
4. 部署，获得新 URL

#### 5. 更新前端配置

同 Railway 步骤 5

---

### 迁移到自建服务器

#### 1. 导出 Vercel Postgres 数据

同 Railway 步骤 1

#### 2. 在自建服务器安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE waline;
CREATE USER waline_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE waline TO waline_user;
```

#### 3. 导入数据

```bash
psql -U waline_user -d waline < waline_backup.sql
```

#### 4. 部署 Waline 服务端 (Docker)

```bash
# Clone Waline 仓库
git clone https://github.com/walinejs/waline.git
cd waline

# 创建 .env 文件
cat > .env << EOF
POSTGRES_HOST=localhost
POSTGRES_DB=waline
POSTGRES_USER=waline_user
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432

# GitHub/Google OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
EOF

# 使用 Docker Compose 启动
docker-compose up -d
```

#### 5. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name waline.your-domain.com;

    location / {
        proxy_pass http://localhost:8363;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 6. 更新前端配置

修改 `serverURL` 为自建服务器域名

---

## 回滚方案

如果迁移出现问题，可以快速回滚：

1. 保留 Vercel Postgres 数据库不删除（至少 7 天）
2. 保留 Vercel Waline 服务端运行
3. 只需修改前端 `serverURL` 即可切回原平台

---

## 数据备份策略

### 自动备份 (Vercel Postgres)

```bash
# 每日自动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump $POSTGRES_URL > /backup/waline_$DATE.sql
# 上传到云存储 (S3/Backblaze B2)
```

### 手动备份

```bash
# 导出整个数据库
pg_dump $POSTGRES_URL > waline_full_backup_$(date +%Y%m%d).sql

# 导出特定表
pg_dump $POSTGRES_URL -t wl_Comment -t wl_User > waline_comments_only.sql
```

---

## 性能优化建议

### 数据库连接池

Vercel Postgres 使用 Neon，默认支持连接池（Prisma Pooler）：

```bash
# 使用连接池 URL (推荐)
POSTGRES_PRISMA_URL=postgresql://user:pass@host/dbname?pgbouncer=true
```

### CDN 加速

为 Waline 服务端配置 CDN：
- Cloudflare (免费)
- AWS CloudFront
- 阿里云 CDN (国内)

### 缓存策略

在 Waline 服务端启用 Redis 缓存（可选）：
```bash
REDIS_URL=redis://localhost:6379
```

---

## 成本估算

| 平台 | 数据库成本 | 服务端成本 | 总成本/月 |
|------|-----------|-----------|----------|
| **Vercel** | 免费 | 免费 | $0 |
| **Railway** | $5 | $5 (共享) | $10 |
| **Render** | 免费 | $7 (Starter) | $7 |
| **自建** | $0 | $5+ (VPS) | $5+ |

---

## 决策建议

### 何时迁移？

✅ **建议迁移**:
- Vercel 在国内访问速度无法接受
- 需要更多免费额度
- 需要完全控制服务器

❌ **不建议迁移**:
- 项目初期，用户量小
- 团队没有运维经验
- Vercel 功能完全满足需求

### 推荐平台

| 场景 | 推荐平台 |
|------|----------|
| 快速上线，技术用户为主 | Vercel |
| 需要国内访问，预算有限 | Railway |
| 需要国内访问，长期运营 | 自建服务器 |
