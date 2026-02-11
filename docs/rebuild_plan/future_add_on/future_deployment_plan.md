# 未来部署方案总览

> **文档说明**: 本文件包含两项独立的未来部署规划
> **更新日期**: 2026-02-10

---

## 目录

| 主题 | 状态 | 优先级 |
|------|------|--------|
| **一、混合内容贡献系统** | 计划中 | P0 |
| **二、Waline 部署平台迁移方案** | 备用方案 | P2 |

---

# 一、混合内容贡献系统 — 详细实施方案

> **目标**: 在不改变现有 Sveltia CMS infra 的前提下，让普通会员通过 Google 账号参与内容贡献
> **交付状态**: 计划中
> **日期**: 2026-02-10

---

## 一、战略分析

### 当前约束

1. **Sveltia CMS 已运行良好** — 核心编辑团队 (3-5人) 使用 GitHub OAuth 登录
2. **Sveltia 不支持 Google OAuth** — 官方只支持 GitHub/GitLab
3. **自建 OAuth Proxy 成本高** — 需要 2-3 周开发 + 每年 40-80 小时维护
4. **会员需要低门槛贡献方式** — 不是所有人都有 GitHub 账号

### 核心决策

**不改变现有 infra，引入两个"小功能"**:

1. **优化 GitHub 账号创建流程** — 让非技术用户无痛注册
2. **添加表单式投稿系统** — 无需 GitHub 账号也能贡献内容

---

## 二、系统架构

### 混合模式架构

```
                    ┌─────────────────────────────┐
                    │      内容贡献生态系统          │
                    │     (Hybrid Content System)    │
                    └─────────────────────────────┘
           ┌────────────────┴────────────────┐
           │                                  │
    核心编辑团队                            普通会员
    (3-5人)                              (所有会员)
           │                                  │
    Sveltia CMS                        Web 表单
    (GitHub OAuth)                      (无门槛投稿)
           │                                  │
           │                                  │
    └────────────────┬────────────────┘
                       │
                       ▼
           ┌─────────────────────────┐
           │    内容审核与发布          │
           │  (Editorial Workflow)      │
           │                             │
           │  - 核心成员审核             │
           │  - 转换为 Markdown          │
           │  - 提交到 GitHub           │
           │  - Vercel 自动部署         │
           └─────────────────────────┘
```

### 与现有 Infra 的关系

```
现有 (保持不变):
├── Sveltia CMS (GitHub OAuth)
├── Vercel 部署
├── GitHub 仓库
└── Content Collections

新增 (小功能):
├── 内容投稿表单 (Vercel Serverless Functions)
├── 内容审核后台 (Preact 组件)
├── GitHub 账号引导流程
└── 自动化邀请脚本
```

---

## 三、方案详解

### 方案 A: 优化 GitHub 账号创建流程

**目标**: 让 15 分钟内完成从零到成为 collaborator

#### A1. 精美的图文指南

**文件**: `docs/contributor-guide/如何成为内容贡献者.md`

内容:

1. **为什么需要 GitHub?**

   - 简短解释：这是行业标准的代码托管平台，我们可以用它管理内容版本
   - 强调：只需要注册一次，以后像登录 Google 一样简单
2. **注册流程 (带截图)**

   - 访问 github.com → 点击 "Sign up"
   - 选择 "Email password" 方式（不需要电话）
   - 填写邮箱和密码
   - 验证邮箱
3. **自动加入团队**

   - 注册完成后，访问 `acc-clubhub.vercel.app/contribute`
   - 点击 "请求成为贡献者" 按钮
   - 填写 GitHub 用户名
   - 核心成员收到通知，一键发送邀请

**时间投入**: 4-8 小时制作指南

#### A2: 自动化邀请脚本

**文件**: `frontend/src/pages/contribute.astro`

**页面内容**:

- 感谢参与贡献的欢迎语
- 简单表单：姓名、GitHub 用户名、感兴趣的内容板块
- 提交后自动触发 GitHub邀请流程

**后端逻辑** (Vercel Serverless Function):

```typescript
// api/invite-contributor.ts
import { Octokit } from 'octokit';

export async function POST(request) {
  const { name, githubUsername, interests } = await request.json();

  // 1. 验证用户名
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // 2. 发送仓库邀请
  await octokit.rest.repos.addCollaborator({
    owner: 'GenLI3202',
    repo: 'acc_clubhub',
    username: githubUsername,
    permission: 'write',
  });

  // 3. 记录到数据库 (可选)
  // ...

  return Response.json({ success: true });
}
```

**环境变量** (Vercel):

- `GITHUB_TOKEN` — Classic PAT (repo 权限)

#### A3: Social Ride 现场教学

**流程**:

- 在每次 Social Ride 活动开始前，展示 2 分钟演示
- 准备 3-5 台 iPad 或手机，现场注册
- 志愿者协助答疑

**效果**: 1 小时内可以让 10+ 人成为贡献者

---

### 方案 B: 表单式投稿 + 审核

#### B1: 内容投稿表单

**文件**: `frontend/src/pages/contribute/[lang]/submit.astro`

**表单字段**:

- 内容类型: 路线/器械知识/训练/活动回顾/其他
- 标题
- 正文 (支持 Markdown)
- 联系邮箱 (用于反馈)
- 附件 (图片，可选)

**技术实现**:

```astro
---
import { t, type Locale } from '../../../lib/i18n';

const { lang } = Astro.params;
---

<section class="contribute-form">
  <h1>{t(lang, 'contribute.title')}</h1>
  <p>{t(lang, 'contribute.description')}</p>

  <form action="/api/submit" method="POST">
    <input type="hidden" name="lang" value={lang} />
    <input type="text" name="authorName" placeholder="你的名字" required />
    <input type="email" name="authorEmail" placeholder="联系邮箱" required />
    <select name="contentType" required>
      <option value="route">🗺️ 骑行路线</option>
      <option value="gear">🔧 器械知识</option>
      <option value="training">📊 科学训练</option>
      <option value="event">📅 活动回顾</option>
      <option value="other">💡 其他</option>
    </select>
    <input type="text" name="title" placeholder="标题" required />
    <textarea name="content" placeholder="内容详情 (支持 Markdown)" rows="10"></textarea>
    <button type="submit">{t(lang, 'contribute.submit')}</button>
  </form>
</section>
```

#### B2: 投稿接收 API

**文件**: `frontend/src/pages/api/submit.ts`

**功能**:

- 接收表单提交
- 数据验证
- 存储到 Vercel Postgres (新表)
- 发送通知邮件给核心成员

**数据库 Schema**:

```sql
CREATE TABLE content_submissions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  lang VARCHAR(2) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  github_url TEXT,  -- 发布后的 GitHub 链接
  metadata JSONB
);
```

#### B3: 内容审核后台

**文件**: `frontend/src/pages/admin/review/[lang]/index.astro`

**功能**:

- 显示待审核投稿列表
- 预览提交的内容
- 一键批准/拒绝
- 批准时自动创建 GitHub PR (通过 Vercel Function)

**核心逻辑**:

```typescript
// api/approve-submission.ts
import { Octokit } from 'octokit';

export async function POST(request) {
  const { submissionId } = await request.json();

  // 1. 获取投稿内容
  const submission = await getSubmission(submissionId);

  // 2. 转换为 Markdown
  const markdown = generateMarkdown(submission);

  // 3. 提交到 GitHub (创建 branch + commit + PR)
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const branch = `contrib/${submission.id}`;
  await octokit.rest.git.createRef({
    owner: 'GenLI3202',
    repo: 'acc_clubhub',
    ref: `refs/heads/${branch}`,
    sha: await getBranchSHA('master'),  // 基于 master 创建新分支
  });

  await octokit.repos.createOrUpdateFile({
    owner: 'GenLI3202',
    repo: 'acc_clabhub',
    path: generateContentPath(submission),
    message: `feat: ${submission.title}`,
    content: markdown,
    branch,
  });

  // 4. 创建 PR
  const pr = await octokit.pulls.create({
    owner: 'GenLI3202',
    repo: 'acc_clubhub',
    title: `[内容投稿] ${submission.title}`,
    head: `${branch}:main`,
    base: 'master',
    body: generatePRBody(submission),
  });

  // 5. 更新投稿状态
  await updateSubmissionStatus(submissionId, 'approved', pr.html_url);

  return Response.json({ success: true, prUrl: pr.html_url });
}
```

#### B4: 邮件通知

**文件**: `frontend/src/api/notifications.ts`

**功能**:

- 新投稿提交 → 邮件通知核心成员
- 投稿被批准 → 邮件通知投稿者
- 投稿被拒绝 → 邮件通知投稿者 (附拒绝理由)

**邮件服务**: Resend (免费 3000 封/月)

---

## 四、实施步骤

### Phase 1: 优化 GitHub 账号流程 (1-2 周)

**目标**: 让非技术用户 15 分钟内成为 collaborator

| 步骤 | 任务                           | 时间      |
| ---- | ------------------------------ | --------- |
| 1.1  | 制作图文指南 (注册 + 邀请)     | 4-8 小时  |
| 1.2  | 创建 /contribute 页面          | 2-4 小时  |
| 1.3  | 实现邀请 API (Vercel Function) | 8-12 小时 |
| 1.4  | Social Ride 现场教学 (第 1 次) | 2 小时    |
| 1.5  | 收集反馈，优化流程             | 4-8 小时  |

**交付物**:

- `docs/contributor-guide/如何成为内容贡献者.md`
- `frontend/src/pages/contribute.astro`
- `frontend/src/api/invite-contributor.ts`

---

### Phase 2: 表单式投稿系统 (2-3 周)

**目标**: 无需 GitHub 账号也能投稿

| 步骤 | 任务                    | 时间       |
| ---- | ----------------------- | ---------- |
| 2.1  | 设计投稿表单 UI         | 8-12 小时  |
| 2.2  | 创建 Vercel Postgres 表 | 2-4 小时   |
| 2.3  | 实现投稿接收 API        | 8-12 小时  |
| 2.4  | 集成 Resend 邮件通知    | 4-8 小时   |
| 2.5  | 实现内容审核后台        | 16-24 小时 |
| 2.6  | 实现自动生成 PR 逻辑    | 8-12 小时  |
| 2.7  | 测试与优化              | 8-12 小时  |

**交付物**:

- `frontend/src/pages/contribute/[lang]/submit.astro`
- `frontend/src/pages/api/submit.ts`
- `frontend/src/pages/api/approve-submission.ts`
- `frontend/src/pages/admin/review/[lang]/index.astro`
- `frontend/src/api/notifications.ts`

---

## 五、用户流程对比

### 流程 1: 核心编辑团队 (现有)

```
访问 /admin → GitHub OAuth →
Sveltia CMS → 直接编辑 → 发布
```

### 流程 2: 普通会员 (优化 GitHub 账号)

```
访问 /contribute → 填写 GitHub 用户名 →
自动发送邀请 → 接受邀请 →
访问 /admin → 开始编辑
```

### 流程 3: 普通会员 (表单投稿)

```
访问 /contribute → 填写表单 → 提交 →
核心成员审核 → 自动创建 PR → 发布
```

---

## 六、技术债务管理

### 短期 (3 个月内)

| 任务           | 优先级 | 原因         |
| -------------- | ------ | ------------ |
| 监控投稿转化率 | P0     | 评估方案效果 |
| 收集用户反馈   | P0     | 优化流程     |
| 内容质量指南   | P1     | 确保投稿质量 |

### 中期 (6-12 个月)

| 任务                    | 优先级 | 原因             |
| ----------------------- | ------ | ---------------- |
| 考虑 Google OAuth Proxy | P2     | 如果反馈强烈需要 |
| 内容推荐算法            | P2     | 提升优质内容曝光 |
| 贡献者排行榜            | P3     | 激励机制         |

---

## 七、成本估算

### 开发成本

| 阶段                       | 时间     | 成本 (@ $50/hr)  |
| -------------------------- | -------- | ---------------- |
| Phase 1 (优化 GitHub 流程) | 30 小时  | $1,500           |
| Phase 2 (表单投稿系统)     | 70 小时  | $3,500           |
| **总计**             | 100 小时 | **$5,000** |

### 运营成本

| 项目                        | 月成本                             | 年成本 |
| --------------------------- | ---------------------------------- | ------ |
| Vercel Serverless Functions | $0-20 | $0-240                     |        |
| Vercel Postgres             | $0 | $0                            |        |
| Resend 邮件                 | $0 | $0                            |        |
| **总计**              | **$0-20** | **$0-240** |        |

### 人力成本 (维护)

| 活动            | 频率 | 时间/年                 |
| --------------- | ---- | ----------------------- |
| 内容审核        | 按需 | 10-20 小时              |
| 用户支持        | 周度 | 5-10 小时               |
| GitHub 账号教学 | 按需 | 5-10 小时               |
| **总计**  |      | **20-40 小时/年** |

---

## 八、成功指标

### 3 个月目标

- [ ] 10+ 人成功通过新流程成为贡献者
- [ ] 收到 5+ 份表单投稿
- [ ] 至少 3 份投稿被发布
- [ ] 用户满意度评分 > 4.0/5.0

### 6 个月目标

- [ ] 30+ 人成为贡献者
- [ ] 表单投稿转化率 > 30%
- [ ] 月均新增内容 > 5 篇
- [ ] 核心团队审核时间 < 24 小时

### 1 年目标

- [ ] 50+ 人成为贡献者
- [ ] 80% 内容来自普通会员
- [ ] 月均新增内容 > 10 篇
- [ ] 形成稳定的内容贡献社区

---

## 九、风险与缓解

| 风险            | 可能性 | 影响 | 缓解措施              |
| --------------- | ------ | ---- | --------------------- |
| 投稿质量低      | 高     | 高   | 内容审核机制 + 指南   |
| 审核不及时      | 中     | 中   | 多人轮值 + 自动化提醒 |
| GitHub 账号门槛 | 中     | 低   | Social Ride 现场教学  |
| 表单垃圾内容    | 高     | 中   | CAPTCHA + 邮箱验证    |
| PR 合并冲突     | 低     | 中   | 分支策略 + 人工处理   |

---

## 十、后续优化方向

### 短期 (3-6 个月)

- [ ] 添加投稿预览功能
- [ ] 支持图片上传投稿
- [ ] 贡献者资料页
- [ ] 内容推荐系统

### 中期 (6-12 个月)

- [ ] 草稿箱功能
- [ ] 版本历史管理
- [ ] 协作编辑功能
- [ ] 内容分类标签优化

### 长期 (1 年+)

- [ ] 考虑 Google OAuth Proxy (如需求强烈)
- [ ] 内容质量评分算法
- [ ] 自动化内容分发
- [ ] 多人实时协作编辑

---

## 附录: 相关文档

| 文档                  | 路径                                                        |
| --------------------- | ----------------------------------------------------------- |
| Phase 4.1 搜索与筛选  | [`phase_4_1_detailed_plan.md`](./phase_4_1_detailed_plan.md) |
| Phase 4.2 Waline 评论 | [`phase_4_2_waline_plan.md`](./phase_4_2_waline_plan.md)     |
| Sveltia CMS 配置      | `/frontend/public/admin/config.yml`                       |
| Content Collections   | `/frontend/src/content.config.ts`                         |

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

| 平台                         | 免费额度               | 国内访问  | 部署难度      | 推荐度     |
| ---------------------------- | ---------------------- | --------- | ------------- | ---------- |
| **Vercel**             | 256MB PG + 10万操作/月 | ⚠️ 较慢 | ⭐ 非常简单   | ⭐⭐⭐⭐⭐ |
| **Railway**            | $5 免费额度            | ✅ 尚可   | ⭐⭐ 简单     | ⭐⭐⭐⭐   |
| **Render**             | 256MB RAM + 750小时/月 | ✅ 尚可   | ⭐⭐ 简单     | ⭐⭐⭐⭐   |
| **自建服务器**         | 取决于配置             | ✅ 最快   | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐     |
| **Cloudflare Workers** | 100K 请求/天免费       | ✅ 极快   | ⭐⭐⭐ 中等   | ⭐⭐⭐     |

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

| 平台              | 数据库成本     | 服务端成本        | 总成本/月 |
| ----------------- | -------------- | ----------------- | --------- |
| **Vercel**  | 免费           | 免费              | $0        |
| **Railway** | $5 | $5 (共享) | $10               |           |
| **Render**  | 免费           | $7 (Starter) | $7 |           |
| **自建**    | $0 | $5+ (VPS) | $5+               |           |

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

| 场景                   | 推荐平台   |
| ---------------------- | ---------- |
| 快速上线，技术用户为主 | Vercel     |
| 需要国内访问，预算有限 | Railway    |
| 需要国内访问，长期运营 | 自建服务器 |
