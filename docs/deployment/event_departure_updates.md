# 活动出发时间调整

Dashboard 活动详情的 `Event updates & emails` 提供三个独立入口：

- `Send ride reminder`：仅发送当前出发时间、集合点及活动链接，不修改活动。
- `Change date & time`：选择新日期、新时刻及原因，按 `Europe/Berlin` 输入。
- `Cancel event`：选择原因，将整个活动标记为取消并发送取消邮件。

改期和取消会先展示审核确认框，再保存并发送英文邮件，无需另外发送提醒。
改期审核同时展示原日期时间、新日期时间、原因和 confirmed / waitlist 通知人数。

取消仍使用原来的取消通知。改期不改变报名状态、候补位置、集合地点或报名截止时间。
新时间和原出发时间都必须在未来；重复时间、过期页面以及夏令时切换造成的
不存在或有歧义的时间会被拒绝。
已取消活动不能发送普通骑行提醒；所有操作均显示 sent / skipped / failed 计数。

## 部署顺序

1. 在目标 PostgreSQL 数据库执行
   `backend/migrations/014_add_event_rescheduling.sql`。
2. 部署后端；用 `/api/admin/health/schema` 确认新增字段齐全。
3. 部署前端；用一个测试活动核对 Dashboard、公开活动页及测试收件箱。

支持跨日期改期不需要新迁移，沿用 014 的字段。必须先部署支持
`departure_date` 的后端，再部署日期选择界面，避免旧后端忽略新日期。
旧客户端省略 `departure_date` 时，后端仍按活动当前的慕尼黑日期改时。

迁移只增加 `events.previous_event_date`、`events.reschedule_reason`、
`events.rescheduled_at` 和约束。`events.event_date` 保存当前有效时间，
`previous_event_date` 保存最近一次更改前的时间。这不是完整历史审计表。
后台同步、Markdown 同步脚本以及旧页面报名均保留后台改时；
同一活动的 Markdown 时间后续不会自动替换这一运营设置。
改期保留原活动 slug 和链接；报名截止时间仍沿用原设置，不随新日期移动。

公开 zh/en/de 详情页展示明确的时间变更提示，并把有效时间传给报名表。
活动正文中手写的旧时间保留，提示明确说明以新时间为准。
报名确认、取消及提醒邮件均按慕尼黑时间显示 CET/CEST。

## 邮件与失败处理

英文邮件标题：`Departure Time Changed: <event title>`。
使用 ACC 红色出发信息卡，称呼读取报名者姓名。卡片仅突出新出发日期时间及集合地点；
活动名称、改期原因、原出发时间及报名/候补状态保留说明放在自然段落中。
底部统一署名、俱乐部标语及“穿越无疆”PNG 书法，并提供活动链接和联系邮箱。

示例内容（仅用于预览）：

> Hi Lin Chen,
>
> We've moved Isar Weekend Ride because of adverse weather. We were originally
> due to leave on 2030-07-06 09:00 CEST; here's the new plan.
>
> New departure: 2030-07-07 09:30 CEST
>
> Meeting point: Square outside Deutsches Museum
>
> Your registration status is unchanged, including any waitlist position.
> You don't need to register again.

用 `backend/.venv/bin/python backend/scripts/preview_email_cards.py` 从真实渲染器
生成本地样稿到 `docs/design/`，包含报名、订阅和改期邮件；该脚本没有发送能力。
三个模板同时输出 HTML 和纯文本。HTML 使用内联样式、表格和 Outlook 宽度回退；
PNG 图片关闭时关键文字仍可阅读。已检查浏览器宽/窄屏，不等同于真实邮箱兼容测试。
上线前还需验证 Gmail、Outlook、Apple Mail 的真实收件效果，包括图片关闭和深色模式。

数据库提交成功后才发送邮件。发送失败不撤销改时；页面保留 sent / skipped /
failed 数量，不自动刷新掩盖结果。失败时需联系未收到通知的骑友；本功能沿用
已有逐封发送方式，不提供自动重试或持久化邮件发件队列。

## 本地验证

后端 SQLite 测试覆盖权限、非法输入、旧时间冲突、重复提交、事务回滚、
confirmed / waitlist 收件人、失败计数、夏令时、两种同步入口及旧报名页面。
另覆盖跨日期/跨年度改期、午夜 UTC 换日、目标日期的冬夏令时及非法日期。
前端 Playwright 覆盖桌面/手机改时、取消、确认框关闭、失败反馈及车库交互。
另用 localhost 模拟 API 验证三语 SSR 提示及报名时间一致。
本地测试不证明生产迁移已执行或真实邮件已送达。
