# 活动出发时间调整

Dashboard 活动详情中，先选原因，再选 `Change departure time` 或
`Cancel event`。改时只调整同一天的出发时刻，按 `Europe/Berlin` 输入。
点击 `Review & send notification` 后，确认框展示原时间、新时间、原因和
confirmed / waitlist 通知人数；确认后保存并发送英文邮件。

取消仍使用原来的取消通知。改时不改变报名状态、候补位置、集合地点或报名截止时间。
新时间和原出发时间都必须在未来；重复时间、过期页面以及夏令时切换造成的
不存在或有歧义的时间会被拒绝。

## 部署顺序

1. 在目标 PostgreSQL 数据库执行
   `backend/migrations/014_add_event_rescheduling.sql`。
2. 部署后端；用 `/api/admin/health/schema` 确认新增字段齐全。
3. 部署前端；用一个测试活动核对 Dashboard、公开活动页及测试收件箱。

迁移只增加 `events.previous_event_date`、`events.reschedule_reason`、
`events.rescheduled_at` 和约束。`events.event_date` 保存当前有效时间，
`previous_event_date` 保存最近一次更改前的时间。这不是完整历史审计表。
后台同步、Markdown 同步脚本以及旧页面报名均保留后台改时；
同一活动的 Markdown 时间后续不会自动替换这一运营设置。

公开 zh/en/de 详情页展示明确的时间变更提示，并把有效时间传给报名表。
活动正文中手写的旧时间保留，提示明确说明以新时间为准。
报名确认、取消及提醒邮件均按慕尼黑时间显示 CET/CEST。

## 邮件与失败处理

英文邮件标题：`Departure Time Changed: <event title>`。
正文列出活动名、原出发时间、新出发时间、原因和集合地点，说明报名及候补状态
不变、不必重新报名，并提供活动链接和俱乐部联系邮箱。

示例内容（仅用于预览）：

> Previous departure: 2030-07-06 09:00 CEST  
> New departure: 2030-07-06 09:30 CEST  
> Reason: Adverse weather  
> Your registration status is unchanged, including any waitlist position.

数据库提交成功后才发送邮件。发送失败不撤销改时；页面保留 sent / skipped /
failed 数量，不自动刷新掩盖结果。失败时需联系未收到通知的骑友；本功能沿用
已有逐封发送方式，不提供自动重试或持久化邮件发件队列。

## 本地验证

后端 SQLite 测试覆盖权限、非法输入、旧时间冲突、重复提交、事务回滚、
confirmed / waitlist 收件人、失败计数、夏令时、两种同步入口及旧报名页面。
前端 Playwright 覆盖桌面/手机改时、取消、确认框关闭、失败反馈及车库交互。
另用 localhost 模拟 API 验证三语 SSR 提示及报名时间一致。
本地测试不证明生产迁移已执行或真实邮件已送达。
