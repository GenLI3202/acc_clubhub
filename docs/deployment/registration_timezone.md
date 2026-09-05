# 报名确认邮件出发时间修复

## 统一时间约定

所有活动默认使用慕尼黑当地时间 `Europe/Berlin`，自动处理 CET/CEST。
活动源文件、报名输入、创建活动、后台同步、报名截止时间和活动日期边界都遵循此规则，
不取服务器或用户设备时区。输入包含明确偏移时保留其真实瞬间；数据库和 API 输出使用
UTC，邮件和活动日期显示转回慕尼黑。已有数据库无时区 datetime 仍按 UTC 存储值读取，
不能再把这些存量值当作慕尼黑输入重复转换。

## 根因与修复

9 月 6 日 Epic Ride 的源文件原值为 `2026-09-06 09:30`，未注明时区。
Astro 原先通过 `z.coerce.date()` 使用服务器时区解析；生产 UTC 环境将它变成
`2026-09-06T09:30:00Z`。邮件正确地换算到 Europe/Berlin 后显示成 11:30 CEST。

活动 schema 和后端输入校验把不带时区的日期时间按慕尼黑当地时间解析，带偏移或 `Z`
的时间仍保留原瞬间。夏令时跳时/重复时刻会拒绝无偏移输入，不猜测其含义。
已解析的 Date 对象保留原瞬间。新活动应使用带引号和时区偏移的 ISO 时间，
避免 YAML 在进入 schema 前丢失原始时间字符串的含义。

本场活动三语源文件明确为 `"2026-09-06T09:30:00+02:00"`，传给 API 的值为
`2026-09-06T07:30:00.000Z`，邮件显示 `2026-09-06 09:30 CEST`。
Python Markdown 同步器也支持带偏移的 ISO 字符串。

## 发布与已有数据

1. 发布修复后的前端及后端，尤其确保 UTC 环境构建的前端已生效。
2. 检查活动页面报名容器 `data-event-date` 为 `2026-09-06T07:30:00.000Z`。
   旧前端尚未替换时不要单独修数据库，否则下一次报名或后台同步可能写回错误时间。
3. 针对本场活动执行下面的条件更新。若返回 0 行，重新读取状态，不能放宽条件强行覆盖。
   不运行全库统一减两小时；其他活动可能使用不同偏移或已有正确的改期记录。

```sql
UPDATE events
SET event_date = TIMESTAMPTZ '2026-09-06 07:30:00+00'
WHERE id = 76
  AND slug = 'acc-epic-ride-munich-linden-loop-2026-09-05'
  AND event_date = TIMESTAMPTZ '2026-09-06 09:30:00+00'
  AND rescheduled_at IS NULL
  AND cancelled_at IS NULL
RETURNING id, slug, event_date;
```

这是数据时区纠正，计划始终是慕尼黑 9:30。不要调用活动改期接口制造新的改期通知，
也不要改动报名、候补、个人 token 或报名截止时间。

2026-09-05 只读核查线上 API：活动 ID 为 76，时间为错误的 `09:30Z`，没有改期或
活动取消记录。本次开发未执行上述更新，未部署、未发送通知。

已发邮件无法被修改。确认发布和数据修正后，如需给已报名者补发正确时间说明，
须先确认具体通知内容及发送授权。

## 验证

- UTC 服务器复现旧逻辑 09:30 → 11:30；新解析覆盖夏冬时、UTC 日期跨日、
  带时区输入、非法日期和 DST 歧义，并在 UTC 与 Asia/Shanghai 下验证。
- 三语真实活动 frontmatter → RSVP API → 邮件 HTML/纯文本均显示 09:30 CEST。
- UTC Astro 服务配合 America/New_York 浏览器，桌面及手机报名均提交 07:30Z；
  浏览器测试拦截报名请求，不发送邮件，不写线上报名。

```bash
cd frontend
TZ=UTC npm run test
REGISTRATION_E2E=1 npm run test:e2e -- --config playwright.registration.config.ts --grep 'September 6'
```
