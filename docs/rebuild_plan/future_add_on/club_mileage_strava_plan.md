# ACC ClubHub — 俱乐部骑行里程仪表板（Strava 方案）

## Context（背景）

用户希望在主页新增一个有趣的小功能：展示俱乐部所有成员 **今年迄今（YTD）** 的骑行数据。
- **主视图**：折线图，展示俱乐部累计里程随时间的增长；可切换 **YTD / 近 30 天** 双视图。
- **侧边卡片**：YTD 总距离、总骑行时长、总爬升。
- 数据源：**Strava**（用户结论：几乎所有成员都在用 Strava，Intervals.icu 覆盖不全）。
- 同步：**Strava Webhook**（实时新增/更新/删除推送）+ 初次 OAuth 后的 YTD 回填。
- 存储：Postgres（新增 `members` + `activities` 两张表）。

### 关于"Webhook 是否可以免数据库"（回应用户疑问）

**不能**。Webhook 只推送事件 ID（如 `activity_id=12345, aspect_type=create`），不包含实际数据。流程一定是：
1. Webhook 到达 → 按 ID 调 `GET /activities/{id}` 拉详情。
2. 必须长期持久化 **每个成员的 `refresh_token`**（access_token 6 小时过期，refresh_token 永久有效）。
3. 必须能在每次请求主页时快速聚合"全体成员 YTD 累计"，如果不落库就得每次遍历全员重新拉 Strava，触发速率限制（200 req/15min，2000/天）。

所以 DB 是必需的；Webhook 是优化增量同步效率的手段，两者并存。

---

## 架构总览

```
[Member 浏览器]                              [Strava]
     │                                          ▲
     │ 1. 点击 "Connect Strava"                  │
     ▼                                          │
[Frontend /connect-strava]  ──OAuth redirect──►│
     │                                          │
     │ 4. callback with code                    │
     ▼                                          │
[FastAPI /api/strava/callback] ──交换 token──► │
     │   存 members(refresh_token)              │
     │   触发 YTD 回填任务                       │
     │                                          │
[Backfill Task] ─── GET /athlete/activities ───►│
     │   写入 activities 表                     │
     │                                          │
[Strava Webhook] ────aspect_type=create────────▶
     ▼
[FastAPI /api/strava/webhook]
     │   GET /activities/{id} → upsert
     │
[Homepage] ── GET /api/club/stats ──► [FastAPI] ── SQL 聚合 ──► Postgres
            (SSR, Astro frontmatter)
```

---

## 后端改动

### 1. 数据库迁移
**新文件**: `backend/migrations/002_strava_activities.sql`

```sql
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  strava_athlete_id BIGINT UNIQUE,               -- null 表示未连接
  strava_refresh_token_encrypted TEXT,           -- AES-GCM 加密
  strava_access_token_encrypted TEXT,
  strava_token_expires_at TIMESTAMPTZ,
  strava_scope TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activities (
  id BIGINT PRIMARY KEY,                          -- Strava activity id
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                             -- Ride / VirtualRide 等
  start_date_local TIMESTAMPTZ NOT NULL,
  distance_m REAL NOT NULL,
  moving_time_s INT NOT NULL,
  total_elevation_gain_m REAL NOT NULL,
  raw JSONB,                                      -- 保留原始 payload 便于调试
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX activities_start_date_idx ON activities (start_date_local);
CREATE INDEX activities_member_idx ON activities (member_id);
```

### 2. 模型
**修改**: `backend/models.py` — 新增 `Member`、`Activity` SQLAlchemy 模型（与现有 `Event`、`RSVP`、`Subscriber` 同风格）。

### 3. 配置
**修改**: `backend/config.py` — 追加：
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_WEBHOOK_VERIFY_TOKEN`（我们自定义的随机串）
- `STRAVA_WEBHOOK_CALLBACK_URL`（形如 `https://<domain>/api/strava/webhook`）
- `TOKEN_ENCRYPTION_KEY`（32 字节 base64，用于 AES-GCM 加密 refresh_token）

**修改**: `docs/ENV.md` 同步文档。

### 4. Strava 服务层
**新文件**: `backend/services/strava.py`
- `build_authorize_url(state)` — 生成 OAuth 授权 URL，`scope=read,activity:read_all`。
- `exchange_code(code)` — POST `/oauth/token`，返回 `{athlete, access_token, refresh_token, expires_at}`。
- `refresh_token_if_needed(member)` — 过期自动刷新并落库。
- `fetch_activities_since(member, after_ts)` — 分页 GET `/athlete/activities?after=<ts>&per_page=200`，YTD 回填用。
- `fetch_activity(member, activity_id)` — Webhook 命中后取详情。
- `ensure_webhook_subscription()` — 启动时调 `GET/POST /push_subscriptions`，幂等注册；Strava 全 App 只允许一个订阅。
- 所有函数内置速率限制计数（15 分钟窗口）+ 指数退避。

### 5. 加密工具
**新文件**: `backend/services/crypto.py` — 基于 `cryptography` 库的 AES-GCM 封装（`encrypt_token`/`decrypt_token`）。refresh_token 属于长期凭证，**必须加密存储**。

### 6. 路由
**新文件**: `backend/routes/strava.py`
- `GET /api/strava/connect` — 重定向到 Strava 授权页（附 `state` 防 CSRF）。
- `GET /api/strava/callback?code=&state=` — 交换 token、upsert member、kickoff YTD 回填（用 FastAPI `BackgroundTasks`）。
- `GET /api/strava/webhook` — Strava 验证握手，回显 `hub.challenge`。
- `POST /api/strava/webhook` — 处理 `create/update/delete`；`create/update` 触发 `fetch_activity` + upsert；`delete` 清除对应行。
- `POST /api/strava/disconnect`（管理台用）— 删 member，级联删 activities。

**新文件**: `backend/routes/club_stats.py`
- `GET /api/club/stats?window=ytd|30d` — 返回：
  ```json
  {
    "window": "ytd",
    "totals": { "distance_km": 12345.6, "moving_time_s": 987654, "elevation_m": 54321 },
    "member_count": 28,
    "series": [ { "date": "2026-01-01", "cumulative_km": 0 }, ... ]
  }
  ```
  SQL 用 `date_trunc('day', start_date_local)` 聚合后在 Python 里做前缀和；加 60 秒内存/Redis 缓存（现无 Redis，先用 `functools.lru_cache` + `time`）。

**修改**: `backend/app.py` — 注册两个新 router；在 `startup` 事件里调 `ensure_webhook_subscription()`。

### 7. 初次回填
回填放在 OAuth 回调的 `BackgroundTasks` 里：拉 `after=<今年1月1日 UTC 时间戳>` 的所有活动，分页写入。YTD 每人典型 ~50–150 条，3 次分页内结束。

---

## 前端改动

### 8. 图表库选择
当前 `frontend/package.json` 无图表库。推荐 **uPlot**（~40KB，极轻，性能好，时间序列完美契合）。备选 Chart.js（更易用但 ~80KB）。

### 9. 组件
**新文件**: `frontend/src/components/home/ClubMileage.astro`
- Astro frontmatter 中 SSR fetch `BACKEND_URL + /api/club/stats?window=ytd` 和 `?window=30d`，Astro 页面自带缓存（每次部署/重新渲染时刷新；也可加 `Cache-Control`）。
- 布局：左侧 line chart（uPlot Preact 岛），右侧 3 张统计卡（总距离 / 总时长 / 总爬升 / 已连接成员数）。
- 视图切换 tab：YTD / 近 30 天，client-side 切换，无需额外请求（两份数据一次性 SSR 下发）。
- 支持 i18n：在 `frontend/src/lib/i18n.ts` 新增 `home.mileage.title / totalDistance / totalTime / totalElevation / connectedMembers / ytd / last30d` 键（zh/en/de 三语）。

**新文件**: `frontend/src/components/home/MileageChart.tsx`（Preact 岛，`client:idle`）——uPlot 渲染累计里程曲线。

**修改**: `frontend/src/pages/[lang]/index.astro` — 在 `NextRideBanner` 之后、第一个 `PillarSection` 之前插入 `<ClubMileage />`。

### 10. 成员连接入口
**新文件**: `frontend/src/pages/[lang]/connect-strava.astro` — 简单落地页：说明 + "Connect with Strava" 官方按钮（图片规范见 Strava Brand Guidelines）→ 跳转 `backend /api/strava/connect`。把链接放在 footer 或"加入俱乐部"页即可。

---

## Strava App 注册 & Webhook 配置（用户需手动完成一次）

1. https://www.strava.com/settings/api → 创建 App
   - Authorization Callback Domain: `acc-clubhub.vercel.app`（或你们的域名）。
2. 拿到 `Client ID` / `Client Secret` → 配置到 Vercel 环境变量。
3. Webhook 订阅通过 `ensure_webhook_subscription()` 自动注册（POST /push_subscriptions，body 含 callback_url + verify_token）。全 App 仅一个订阅，接收所有已授权 athlete 的事件。

---

## 速率限制与风险

| 风险 | 缓解 |
|---|---|
| Strava 200/15min、2000/天限制 | 回填错峰 + 指数退避；Webhook 增量拉取使日常调用极少 |
| refresh_token 泄露 | AES-GCM 加密入库，`TOKEN_ENCRYPTION_KEY` 由 Vercel 管理 |
| Webhook 验证请求必须 2 秒内回 `hub.challenge` | 路由只做回显，无任何 DB 调用 |
| Webhook POST 处理超时 → Strava 会重试 | `POST /webhook` 立即 200 返回，实际拉取用 BackgroundTasks |
| 全 App 仅允许 1 个 Webhook 订阅 | `ensure_webhook_subscription` 启动时查询后决定复用/创建 |
| 成员隐私（显示谁的数据） | MVP 只展示**聚合**总量 + 累计曲线，不露单人明细 |
| Club 功能误用 | 不使用 Strava Clubs API（受限且功能不够），而是每成员授权 |

---

## 复杂度评估

| 模块 | 工作量 |
|---|---|
| DB migration + models | 小（1–2h） |
| Strava OAuth + token 加密刷新 | 中（0.5–1 天，坑在 token 刷新边界） |
| Webhook 订阅 + 验证 + 处理 | 中（0.5 天） |
| YTD 回填 + 分页 + 限流 | 中（0.5 天） |
| 聚合 API + 缓存 | 小（2–3h） |
| 前端图表 + 卡片 + i18n | 中（0.5–1 天，uPlot 上手成本） |
| 连接落地页 + 管理台入口 | 小（2h） |
| **合计** | **约 3–4 天全职工作量**，中等复杂度 |

主要复杂度集中在 OAuth/Webhook 的工程细节（token 生命周期、订阅幂等性、分页限流），而不是单点代码量。

---

## 关键文件清单（新增/修改）

### 新增
- `backend/migrations/002_strava_activities.sql`
- `backend/services/strava.py`
- `backend/services/crypto.py`
- `backend/routes/strava.py`
- `backend/routes/club_stats.py`
- `frontend/src/components/home/ClubMileage.astro`
- `frontend/src/components/home/MileageChart.tsx`
- `frontend/src/pages/[lang]/connect-strava.astro`

### 修改
- `backend/models.py` — 加 `Member`、`Activity`
- `backend/config.py` — 加 Strava 相关 env
- `backend/app.py` — 注册 router、启动时订阅 Webhook
- `backend/requirements.txt` / `pyproject.toml` — 加 `cryptography`、`httpx`（若未有）
- `frontend/package.json` — 加 `uplot`
- `frontend/src/lib/i18n.ts` — 加 `home.mileage.*`
- `frontend/src/pages/[lang]/index.astro` — 挂载 `<ClubMileage />`
- `docs/ENV.md` — 补环境变量说明

---

## 验证计划（端到端）

1. **本地**：用 ngrok 暴露本地 FastAPI → 填入 Strava App callback domain。
2. 启动后端，浏览器走 `/api/strava/connect`，用自己 Strava 账号授权，确认 callback 入库、YTD 回填完成。
3. 检查 Strava UI 里 "My API Application" 下的 webhook subscription 存在。
4. 在 Strava 上随便发一条 ride → 几秒内 DB 出现新行，主页刷新后曲线/卡片更新。
5. `/api/club/stats?window=ytd` 和 `?window=30d` 直接访问返回合理 JSON。
6. 主页 Lighthouse：加入图表后 LCP/CLS 不退化（uPlot 懒加载 `client:idle`）。
7. 单元测试：`test_strava_token_refresh`、`test_webhook_verification_handshake`、`test_club_stats_aggregation`（8 活动 → 预期累计值）。
