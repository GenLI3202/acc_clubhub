# 报名者自助取消

报名确认邮件、活动提醒及候补回执包含个人“取消我的报名”按钮和说明，支持中英德三语。
按钮打开活动页的报名管理区域，用户确认后才会提交取消，无需登录。
旧邮件中的有效个人名单链接也会显示该区域。

- 只取消链接对应的个人报名，活动本身和订阅状态保持不变。
- 出发前且尚未签到时允许自助取消；报名截止时间不限制取消。
- 已取消报名重复操作返回成功，刷新页面仍显示已取消，不再展示参与名单。
- 释放正式名额后，按报名时间和 ID 递补首位候补，并发送报名确认邮件。
- 整个活动已取消时不递补；邮件发送失败不回滚已保存的报名状态。
- 重新报名会生成新 token，旧 token 失效。个人链接请勿转发。

## API

`POST /api/events/{slug}/registration/cancel`

请求：`{"token": "<邮件中的个人 token>"}`

成功：`{"success": true, "status": "cancelled"}`

错误位于 `detail.error_code`：

| HTTP | error_code | 含义 |
| --- | --- | --- |
| 401 | INVALID_REGISTRATION_TOKEN | 个人链接无效或属于其他活动 |
| 404 | EVENT_NOT_FOUND | 活动不存在 |
| 409 | REGISTRATION_CANCELLATION_CLOSED | 已出发或已签到，请联系俱乐部 |

现有 `GET /api/events/{slug}/participant?token=...` 增加 `your_name` 和
`can_cancel`；已取消报名返回个人状态及空参与名单。成功响应禁用缓存。
带 token 的活动页禁用缓存、搜索索引和 Referer 传递。

## 发布与验收

需要配套发布后端和前端，无新增数据库迁移。先发布后端接口，紧接着发布前端，
两者均就绪后再发送活动提醒或引导用户使用新入口。

上线验收使用专门的测试报名：检查确认邮件和提醒邮件的按钮，取消后确认后台人数、
候补及个人页面状态。历史已发送邮件不会增加新按钮，但其中原有的个人链接仍可使用。
本次开发未发送真实邮件，也未修改线上报名。

```bash
cd backend
.venv/bin/python -m pytest -q

cd ../frontend
REGISTRATION_E2E=1 npm run test:e2e -- --config playwright.registration.config.ts
```

浏览器测试启动真实本地 API 路由和内存 SQLite，明确禁用邮件发送；不连接 Neon。
桌面及手机覆盖三语确认、保留报名、取消后刷新、请求失败、无效链接、签到后限制，
以及关闭图片后的邮件按钮。PostgreSQL 并发锁和真实邮箱客户端渲染需上线环境验收。
