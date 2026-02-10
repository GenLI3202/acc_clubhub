# Phase 3.4: 生产环境 CMS 认证 — 详细实施方案

> **父文档**: [Layer 3 总纲](./layer3_master_plan.md)
> **目标**: 让俱乐部核心成员通过 Vercel 部署的 `/admin` 页面登录 CMS，编辑并发布内容
> **日期**: 2026-01-28

---

## 一、认证架构

```
用户浏览器                  Cloudflare Worker              GitHub
    |                           |                           |
    |-- 点击 "Login with GitHub" -->                        |
    |                           |-- 重定向到 GitHub OAuth -->|
    |                           |                           |-- 用户授权
    |                           |<-- 返回 authorization code |
    |                           |-- 用 code 换 access token -->|
    |                           |<-- 返回 access token       |
    |<-- postMessage(token) ----|                           |
    |                           |                           |
    |-- 使用 token 操作 GitHub API ----------------------------->|
```

**关键组件:**
- **Sveltia CMS** (浏览器端): 运行在 `/admin` 页面，纯静态 SPA
- **sveltia-cms-auth** (Cloudflare Workers): 官方 OAuth 代理，交换 authorization code 为 access token
- **GitHub OAuth App**: 注册的 OAuth 应用，管理授权和 callback
- **GitHub API**: CMS 通过 token 直接读写仓库内容

---

## 二、实施步骤

### 步骤 1: 注册 GitHub OAuth App

**操作位置**: GitHub.com > Settings > Developer settings > OAuth Apps > New OAuth App

| 字段 | 值 |
|------|-----|
| Application name | `ACC ClubHub CMS` |
| Homepage URL | `https://acc-clubhub.vercel.app` |
| Authorization callback URL | `https://sveltia-cms-auth.<YOUR_SUBDOMAIN>.workers.dev/callback` |

> 注意: callback URL 中的 `<YOUR_SUBDOMAIN>` 在步骤 2 部署 Worker 后确定。
> 可以先填占位符 `https://example.com/callback`，部署后再回来更新。

创建后记录:
- **Client ID** (公开，形如 `Iv1.abc123def456`)
- **Client Secret** (点击 "Generate a new client secret"，仅显示一次，务必保存)

---

### 步骤 2: 部署 sveltia-cms-auth 到 Cloudflare Workers

这是 Sveltia CMS 官方维护的认证代理。Cloudflare Workers 免费层足够使用 (100K 请求/天)。

**方案 A: 一键部署 (推荐)**

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up) (免费)
2. 访问 [sveltia-cms-auth GitHub 仓库](https://github.com/sveltia/sveltia-cms-auth)
3. 点击 README 中的 **"Deploy to Cloudflare Workers"** 按钮
4. 按提示授权 Cloudflare 访问你的 GitHub，完成部署

**方案 B: 手动部署 (wrangler CLI)**

```bash
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
npm install
npx wrangler deploy
```

**部署后配置环境变量** (Cloudflare Dashboard > Workers > sveltia-cms-auth > Settings > Variables):

| 变量名 | 值 | 加密 |
|--------|-----|------|
| `GITHUB_CLIENT_ID` | 步骤 1 的 Client ID | 否 |
| `GITHUB_CLIENT_SECRET` | 步骤 1 的 Client Secret | **是** |
| `ALLOWED_DOMAINS` | `acc-clubhub.vercel.app` | 否 |

部署成功后获得 Worker URL，形如:
```
https://sveltia-cms-auth.<YOUR_SUBDOMAIN>.workers.dev
```

**回到步骤 1**: 用实际 Worker URL + `/callback` 更新 GitHub OAuth App 的 Authorization callback URL:
```
https://sveltia-cms-auth.<YOUR_SUBDOMAIN>.workers.dev/callback
```

---

### 步骤 3: 更新 config.yml

**修改文件**: `frontend/public/admin/config.yml`

需要修改的部分:

```yaml
# ===== 修改 1: backend 从 test-repo 切换为 github =====
# 修改前:
backend:
  name: test-repo

# 修改后:
backend:
  name: github
  repo: GenLI3202/acc_clubhub
  branch: master
  base_url: https://sveltia-cms-auth.<YOUR_SUBDOMAIN>.workers.dev

# ===== 修改 2: site_url 从 localhost 切换为 Vercel 域名 =====
# 修改前:
site_url: http://localhost:4321
display_url: http://localhost:4321

# 修改后:
site_url: https://acc-clubhub.vercel.app
display_url: https://acc-clubhub.vercel.app
```

> **重要**: `base_url` 指向 Cloudflare Worker URL (OAuth 代理)，不是 Vercel 域名。

其余所有配置 (locale, editor, i18n, collections) 保持不变。

---

### 步骤 4: 添加俱乐部成员为 GitHub Collaborator

**操作位置**: GitHub.com > GenLI3202/acc_clubhub > Settings > Collaborators and teams > Add people

对每个需要 CMS 编辑权限的核心成员:

1. 输入其 GitHub 用户名
2. 选择 **Write** 权限 (需要 push 内容到 repo)
3. 该成员会收到邀请邮件，点击接受即可

**权限说明**:
- **Write**: 可直接通过 CMS 发布内容 (commit 到 master)
- **Maintain**: 同上 + 管理 Issues/PR
- **Admin**: 完全控制 (不建议给普通成员)

---

### 步骤 5: 部署到 Vercel 并验证

```bash
git add frontend/public/admin/config.yml
git commit -m "feat: switch CMS backend to github with OAuth"
git push origin master
```

Vercel 自动部署后 (通常 1-2 分钟)，执行验证:

1. 访问 `https://acc-clubhub.vercel.app/admin/`
2. 点击 **"Sign in with GitHub"**
3. GitHub 授权页面弹出 → 点击 "Authorize ACC ClubHub CMS"
4. 授权后自动跳回 CMS 界面
5. 确认看到 4 个集合 (车影骑踪 / 器械知识 / 科学训练 / 骑行路线)
6. 点击任意集合 → 确认现有示例内容正常显示
7. 新建一篇测试文章 → 填写所有字段 → 点击 **发布**
8. 到 GitHub 仓库确认收到新 commit
9. 等待 Vercel 重新部署 (自动触发)
10. 访问前台页面确认新内容已显示

---

## 三、本地开发注意事项

切换为 `github` 后端后，本地开发 (`npm run dev`) 时访问 `/admin` 也会要求 GitHub 登录。

**本地开发选项:**
1. **直接用 GitHub 登录**: 本地也可以使用 OAuth 登录 (前提是 `ALLOWED_DOMAINS` 包含 `localhost` 或未设置)
2. **临时切回 test-repo**: 本地测试时将 backend 改回 `test-repo`，提交前改回 `github`
3. **使用环境变量**: 考虑后续通过 Astro 环境变量动态选择 backend (进阶优化)

---

## 四、故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 登录后显示 "Error: Not Found" | repo 名或 branch 名错误 | 检查 config.yml 的 `repo` 和 `branch` |
| OAuth 重定向失败 | callback URL 不匹配 | 确认 GitHub OAuth App 的 callback URL 与 Worker URL 完全一致 |
| 登录成功但无法创建内容 | 用户不是 Collaborator | 在 repo Settings 添加用户为 Collaborator (Write) |
| 发布后前台未更新 | Vercel 未自动部署 | 检查 Vercel 项目是否连接了 GitHub repo 的 master 分支 |
| Worker 报 403 | `ALLOWED_DOMAINS` 限制 | 确认包含你的 Vercel 域名 |

---

## 五、验证清单

- [ ] 访问 `https://acc-clubhub.vercel.app/admin/` 看到登录界面
- [ ] 点击 "Sign in with GitHub" 跳转到 GitHub 授权页面
- [ ] 授权后成功进入 CMS
- [ ] 4 个集合正常显示已有内容
- [ ] i18n 语言标签页 (zh / en / de) 正常
- [ ] 新建文章 → 填写 → 发布 → GitHub 收到 commit
- [ ] Vercel 自动重新部署
- [ ] 前台页面显示新发布的内容
- [ ] 其他成员 (Collaborator) 也能登录编辑

---

## 六、下一步

完成 Phase 3.4 后，继续 **Phase 3.5: 测试体系完备化**:
- 补全 Vitest 单元测试 + Playwright E2E 测试
- 运行 `astro check` + `astro build`
- 确保 GitHub Actions CI 全绿
