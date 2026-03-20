# 家长端 + 数据报告接口 curl 测试

## 前置：获取 Token

```bash
# 心理老师 Token（用于 parent-notifications、reports、dashboard）
TOKEN=$(curl -s http://localhost:3002/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"counselor001","password":"123456","tenant_code":"demo_school"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
```

---

## 家长端

### 1. POST /api/v1/parent/bind（公开，无需 token）

```bash
curl -s http://localhost:3002/api/v1/parent/bind \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "13800010001",
    "sms_code": "123456",
    "student_no": "20240001",
    "tenant_code": "demo_school",
    "relation": "mother"
  }'
```

**说明**：手机号必须与 `students.guardian_phone` 或 `guardian2_phone` 一致。验证码支持 6 位数字或 `000000` 测试码。

### 2. GET /api/v1/parent/child/health-summary（需 parent token）

```bash
PARENT_TOKEN="<从 bind 返回的 token>"
curl -s http://localhost:3002/api/v1/parent/child/health-summary \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

**脱敏**：仅返回三档状态、上次测评时间、本学期测评次数、心理老师联系方式、通用家庭支持建议；不返回量表名、得分、预警详情、会谈内容。

### 3. GET /api/v1/parent/notifications

```bash
curl -s http://localhost:3002/api/v1/parent/notifications \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

### 4. POST /api/v1/parent-notifications（counselor+）

```bash
curl -s -X POST http://localhost:3002/api/v1/parent-notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "student_id": 1,
    "title": "家庭支持提醒",
    "content": "建议多关注孩子情绪，保持沟通。",
    "notify_type": "suggestion"
  }'
```

`notify_type`：`health_summary` | `suggestion` | `alert_inform` | `general`

---

## 数据报告

### 5. POST /api/v1/reports/student/:studentId

```bash
curl -s -X POST http://localhost:3002/api/v1/reports/student/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"plan_id": 1, "include_history": true, "include_suggestions": true}'
```

返回 `task_id`，前端轮询状态。

### 6. GET /api/v1/reports/tasks/:taskId

```bash
curl -s http://localhost:3002/api/v1/reports/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 7. GET /api/v1/reports/tasks/:taskId/download

```bash
curl -s -o report.md "http://localhost:3002/api/v1/reports/tasks/1/download" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. POST /api/v1/reports/batch/class/:classId

```bash
curl -s -X POST http://localhost:3002/api/v1/reports/batch/class/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"plan_id": 1, "scope": "all", "include_suggestions": true}'
```

`scope`：`all`（全部完成学生）| `high_risk`（高风险）| 或传 `student_ids: [1,2,3]` 手动指定。

### 9. GET /api/v1/dashboard/class/:classId/compare

```bash
curl -s "http://localhost:3002/api/v1/dashboard/class/1/compare?plan_ids=1,2" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 测试结果摘要

| 接口 | 状态 |
|------|------|
| POST parent/bind | ✓ |
| GET parent/child/health-summary | ✓ |
| GET parent/notifications | ✓ |
| POST parent-notifications | ✓ |
| POST reports/student/:id | ✓ |
| GET reports/tasks/:id | ✓ |
| GET reports/tasks/:id/download | ✓ |
| POST reports/batch/class/:id | ✓ |
| GET dashboard/class/:id/compare | ✓ |

报告文件当前输出为 Markdown（`.md`），保存在 `backend/uploads/reports/`。
