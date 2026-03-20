# AI 倾诉「联系心理老师」500 问题说明（已修复）

## 现象

学生点击「联系心理老师」后提示服务器错误 / 通知失败。

## 根因（非 manual-report）

H5 实际调用的是 **`POST /api/v1/h5/ai-chat/crisis-notify`**（见 `frontend/src/views/h5/AiChatPage.vue`），**不是** `POST /api/v1/alerts/manual-report`。

`crisis-notify` 里 `prisma.notification.create` 使用了 **与 schema 不符的字段**：

| 错误字段 | Prisma `Notification` 实际字段 |
|----------|--------------------------------|
| `notificationType` | 应为 **`type`**（如 `'alert'`） |
| `fromUserId` | **不存在**（已删除） |

因此 Prisma 在运行时抛错，Express 返回 **500**，典型日志类似：

```
Invalid `prisma.notification.create()` invocation:
{
  data: {
    ...
    fromUserId: null,
    ~~~~~~~~~~
    notificationType: "alert",
    ? type?: String,
    ...
  }
}

Unknown arg `fromUserId` in data...
```

或 `Unknown arg 'notificationType'`（取决于 Prisma 版本表述）。

## 修复内容（`backend/src/routes/h5.js`）

- 使用 `type: 'alert'`、`title`、`content`、`refId`、`isRead`。
- 向本校 **全部** `role: counselor` 用户发送通知（与 `alertNotifications.js` 量表红预警一致）。

## 关于 manual-report 与 H5

- **原逻辑**：`POST /alerts/manual-report` 仅 **`teacher+`**，学生 Token 会得到 **403**，不是字段错误导致的 500。
- **本次增强**：允许 **`student`** 在 **`report_urgency` 为 `urgent` 或 `critical`**、**`alert_level` 为 `red`**、且 **`student_id` 等于本人 `students.id`** 时调用；`report_reason` 学生路径最短 **10 字**（教师路径仍为 20 字）。

若 H5 误传 **`user_id` 当作 `student_id`**，会校验失败（提示学生不存在或仅可为本人上报）。正确应传 **`students` 表主键**，与 `resolveStudentPk` 得到的 `id` 一致。

## 自测 curl（crisis-notify）

```bash
# 先 h5/verify 取学生 token，再：
curl -s -X POST "http://localhost:3002/api/v1/h5/ai-chat/crisis-notify" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" -d '{}'
```

期望：`code: 0`，且心理老师账号在通知列表中看到新预警。
