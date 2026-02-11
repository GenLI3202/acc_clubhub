# Phase 4.2.2: Waline 扩展功能 — 微信/QQ 登录

> **状态**: 后续扩展，非 Phase 4.2.1 必需
> **依赖**: Phase 4.2.1 Waline 基础服务已部署

---

## 微信/QQ 登录方案

### 方案对比

| 方案 | 适合场景 | 复杂度 | 成本 |
|------|----------|--------|------|
| **第三方 OAuth 服务** | 快速上线 | ⭐⭐ | 免费/低价 |
| **自建 OAuth 服务** | 完全控制 | ⭐⭐⭐⭐ | 需要服务器 |
| **Waline 官方 OAuth** | 等待官方支持 | ⭐ | 免费（未来）|

### 推荐方案: 使用第三方 OAuth 服务

Waline 官方提供了 OAuth 服务：https://github.com/walinejs/auth

#### 部署步骤

1. **Fork 并部署 OAuth 服务**
   ```bash
   # Fork https://github.com/walinejs/auth
   # 在 Vercel/Railway 上部署
   ```

2. **配置微信开放平台**
   - 前往 https://open.weixin.qq.com/
   - 创建网站应用
   - 获取 AppID 和 AppSecret
   - 设置回调域名: `your-oauth-service.vercel.app`

3. **配置 QQ 互联**
   - 前往 https://connect.qq.com/
   - 创建网站应用
   - 获取 AppID 和 AppKey
   - 设置回调域名: `your-oauth-service.vercel.app`

4. **更新 Waline 环境变量**
   ```bash
   OAUTH_URL=https://your-oauth-service.vercel.app
   WECHAT_CLIENT_ID=xxx
   WECHAT_CLIENT_SECRET=xxx
   QQ_CLIENT_ID=xxx
   QQ_CLIENT_SECRET=xxx
   ```

### 注意事项

- 微信开放平台需要企业认证（个人开发者无法申请）
- QQ 互联相对宽松，个人可申请
- 第三方 OAuth 服务需要额外维护

---

## 其他扩展功能

### 反垃圾策略

在 Waline 管理后台配置：

1. **Akismet 集成**
   - 注册 https://akismet.com/ (免费个人版)
   - 获取 API Key
   - 在 Waline 后台配置

2. **关键词过滤**
   - 在管理后台添加违禁词列表
   - 自动标记或拒绝包含违禁词的评论

3. **IP 黑名单**
   - 手动封禁恶意 IP
   - 支持通配符 (如 `192.168.*.*`)

### 邮件通知

配置 SMTP 环境变量：

```bash
SMTP_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SENDER_NAME=ACC ClubHub
SENDER_EMAIL=your-email@gmail.com
```

支持的服务商：
- Gmail (推荐)
- Outlook
- QQ 邮箱
- 163 邮箱
- 自建 SMTP

### 评论管理

- 审核模式: 新评论需要管理员审核后才显示
- 回复通知: 被回复时发送邮件通知
- 表情反应: 支持 emoji 表情反应
- 图片上传: 支持评论中插入图片

---

## 实施优先级

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 反垃圾策略 | P1 | 建议尽快配置，避免垃圾评论 |
| 邮件通知 | P2 | 提升用户互动体验 |
| 微信/QQ 登录 | P3 | 取决于用户群体需求 |
