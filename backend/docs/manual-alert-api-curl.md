# 人工上报预警 — curl 示例与预期响应

> 请先执行 `prisma/migrations/20250317120000_manual_report_alerts/migration.sql`（或等价 ALTER），再启动服务。

## 0. 登录（获取 Token）

```bash
# 心理老师（counselor）— 用于列表/详情
curl -s -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"counselor001","password":"你的密码","tenant_code":"DEMO_SCHOOL"}'

# 班主任（teacher）— 用于人工上报接口
curl -s -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"teacher001","password":"你的密码","tenant_code":"DEMO_SCHOOL"}'
```

从返回 JSON 取 `data.accessToken`，下文用 `$TOKEN_C` / `$TOKEN_T` 表示。

---

## 1. POST `/api/v1/alerts/manual-report`（teacher 及以上）

```bash
curl -s -X POST 'http://localhost:3000/api/v1/alerts/manual-report' \
  -H "Authorization: Bearer $TOKEN_T" \
  -H 'Content-Type: application/json' \
  -d '{
    "student_id": 1,
    "alert_level": "red",
    "report_reason": "学生今日上课期间情绪崩溃，自述不想活了，需要心理老师立即介入关注",
    "report_evidence": "第三节课课间目击，已安抚并陪同至心理辅导室门口",
    "report_urgency": "critical",
    "assign_to": null
  }'
```

**预期响应示例：**

```json
{
  "code": 0,
  "message": "预警已创建，已通知 3 名相关人员",
  "data": {
    "alert_id": 42,
    "status": "pending",
    "source": "manual",
    "notify_count": 3,
    "message": "预警已创建，已通知 3 名相关人员"
  },
  "timestamp": 1730000000000
}
```

---

## 2. GET `/api/v1/alerts/manual-report/counselors`（teacher 及以上）

```bash
curl -s 'http://localhost:3000/api/v1/alerts/manual-report/counselors' \
  -H "Authorization: Bearer $TOKEN_T"
```

**预期响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "counselors": [
      { "id": 2, "real_name": "张晓慧", "role": "counselor" },
      { "id": 5, "real_name": "李建国", "role": "doctor" }
    ]
  },
  "timestamp": 1730000000000
}
```

---

## 3. GET `/api/v1/alerts?source=manual`（counselor 及以上）

```bash
curl -s 'http://localhost:3000/api/v1/alerts?source=manual&page=1&page_size=10' \
  -H "Authorization: Bearer $TOKEN_C"
```

列表项中会多字段 `source`；人工上报的 `scale_id` / `task_id` 可能为 `null`，`scale_name` 常为「人工上报」。

---

## 4. GET `/api/v1/alerts/:id`（counselor 及以上）

```bash
curl -s 'http://localhost:3000/api/v1/alerts/42' \
  -H "Authorization: Bearer $TOKEN_C"
```

**人工上报预警时，顶层与 `alert` 内均含：**

- `source`: `"manual"`
- `reporter_name`: 上报人姓名
- `report_reason`: 上报原因（与 `alert.trigger_reason` 一致）
- `report_urgency`: `"normal"` | `"urgent"` | `"critical"`
- `report_evidence`: 佐证文本或 `null`

`report_urgency` 在 POST 人工上报时可省略，省略时按 `normal` 处理。

`process_logs` 中首条常为 `action: "manual_report"`，`action_label`: 「人工上报」。

---

## 端口说明

若 `PORT` 非 3000，请替换 URL 中的主机与端口。
