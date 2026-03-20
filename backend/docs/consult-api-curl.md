# 咨询预约排班 API — curl 示例

> **先执行迁移**：`prisma/migrations/20250318100000_consult_scheduling/migration.sql`（或 `npx prisma migrate deploy`），再 `npx prisma generate` 并启动服务。

`weekday`：1=周一 … 7=周日。`appointment_date` / `date`：北京时间日历日 `YYYY-MM-DD`。

---

## 登录

```bash
export API=http://localhost:3000/api/v1
# 心理老师（排班、预约管理、确认/办结）
curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"counselor001","password":"你的密码","tenant_code":"DEMO_SCHOOL"}' | tee /tmp/c.json
export TOKEN_C=$(jq -r '.data.accessToken' /tmp/c.json)

# 学生 H5（与测评同一套学号+密码登录拿 token）
curl -s -X POST "$API/h5/verify" -H 'Content-Type: application/json' \
  -d '{"tenant_code":"DEMO_SCHOOL","student_no":"学号","password":"密码"}' | tee /tmp/s.json
export TOKEN_S=$(jq -r '.data.token' /tmp/s.json)
```

---

## 1. GET `/api/v1/consult/schedules`（counselor+）

```bash
curl -s "$API/consult/schedules" -H "Authorization: Bearer $TOKEN_C" | jq .
```

## 2. POST `/api/v1/consult/schedules`（counselor+）

```bash
curl -s -X POST "$API/consult/schedules" -H "Authorization: Bearer $TOKEN_C" \
  -H 'Content-Type: application/json' \
  -d '{"counselor_id":2,"weekday":1,"slot_start":"09:00","slot_end":"10:00","max_slots":2}' | jq .
```

（非 admin 时 `counselor_id` 可省略，默认为当前登录咨询师。）

## 3. PUT `/api/v1/consult/schedules/:id`（counselor+）

```bash
curl -s -X PUT "$API/consult/schedules/1" -H "Authorization: Bearer $TOKEN_C" \
  -H 'Content-Type: application/json' \
  -d '{"max_slots":3,"is_active":1}' | jq .
```

## 4. GET `/api/v1/h5/consult/available-slots`（学生 Token）

```bash
curl -s "$API/h5/consult/available-slots?date=2025-03-24" \
  -H "Authorization: Bearer $TOKEN_S" | jq .
```

## 5. POST `/api/v1/h5/consult/appointments`（学生 Token）

```bash
curl -s -X POST "$API/h5/consult/appointments" -H "Authorization: Bearer $TOKEN_S" \
  -H 'Content-Type: application/json' \
  -d '{"schedule_id":1,"appointment_date":"2025-03-24","student_note":"希望约谈学习压力"}' | jq .
```

## 6. POST `/api/v1/consult/appointments/:id/confirm`（counselor+）

```bash
curl -s -X POST "$API/consult/appointments/1/confirm" -H "Authorization: Bearer $TOKEN_C" | jq .
```

## 7. POST `/api/v1/consult/appointments/:id/cancel`（counselor+ 或 学生）

```bash
# 老师取消
curl -s -X POST "$API/consult/appointments/1/cancel" -H "Authorization: Bearer $TOKEN_C" \
  -H 'Content-Type: application/json' -d '{"cancel_reason":"时间调整"}' | jq .

# 学生取消本人预约
curl -s -X POST "$API/consult/appointments/1/cancel" -H "Authorization: Bearer $TOKEN_S" \
  -H 'Content-Type: application/json' -d '{"cancel_reason":"临时有事"}' | jq .
```

## 8. POST `/api/v1/consult/appointments/:id/complete`（counselor+）

```bash
curl -s -X POST "$API/consult/appointments/1/complete" -H "Authorization: Bearer $TOKEN_C" \
  -H 'Content-Type: application/json' \
  -d '{"create_case":true,"record_content":"首次面谈，约定下周再访"}' | jq .
```

`create_case: true` 且无个案时自动建 `case_files`，并写 `case_records`（`appointment_id`、`consult_type=appointment`）。

## 9. GET `/api/v1/consult/appointments`（counselor+）

```bash
curl -s "$API/consult/appointments?status=pending&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN_C" | jq .
```

## 10. GET `/api/v1/h5/consult/my-appointments`（学生 Token）

```bash
curl -s "$API/h5/consult/my-appointments" -H "Authorization: Bearer $TOKEN_S" | jq .
```

---

## 典型联调顺序

1. counselor 建排班（`weekday` 与你要预约的「星期几」一致）。  
2. 学生 `available-slots?date=...` 看 `remaining_slots > 0`。  
3. 学生 `POST .../appointments`。  
4. counselor `GET .../appointments` → `confirm`。  
5. counselor `complete` + `create_case`（按需）。

本地若无数据库或未跑迁移，接口会报 Prisma/SQL 错误；迁移成功且端口一致时，上述命令即为预期联调用例。
