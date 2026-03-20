# 第四轮：接口实现与 curl 自测说明

以下接口均已挂载；**请先 `npm run db:seed`**（含 PHQ-9 + GAD-7 全题、ongoing 联调计划、班级答卷、通知种子）。

```bash
export BASE=http://127.0.0.1:3002
export TC=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"counselor001","password":"123456","tenant_code":"demo_school"}' | jq -r '.data.accessToken')
export TA=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456","tenant_code":"demo_school"}' | jq -r '.data.accessToken')
```

---

## 五、测评计划

| 接口 | curl |
|------|------|
| 列表 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/assessment-plans?status=ongoing&page=1&page_size=5"` |
| 创建草稿 | `curl -s -X POST -H "Authorization: Bearer $TC" -H "Content-Type: application/json" -d '{"title":"草稿","scale_ids":[1],"target_type":"class","target_ids":[1],"start_time":"2035-01-01T08:00:00+08:00","end_time":"2035-01-31T23:00:00+08:00"}' "$BASE/api/v1/assessment-plans"` |
| 进度 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/assessment-plans/1/progress"`（`1` 换为 ongoing 计划 id） |
| 发布 | `curl -s -X POST -H "Authorization: Bearer $TC" -H "Content-Type: application/json" -d '{}' "$BASE/api/v1/assessment-plans/<草稿id>/publish"` |
| 预估人数 | `curl -s -X POST -H "Authorization: Bearer $TC" -H "Content-Type: application/json" -d '{"target_type":"class","target_ids":[1],"scale_ids":[1,2]}' "$BASE/api/v1/assessment-plans/estimate"` |

**响应要点**

- 列表：`data.list[]` 含 `scale_names`、`completion_rate`、`status_label`、`is_urgent` 等。
- 进度：`data.plan` + `data.class_progress[]`（按班级汇总完成度、红黄预警数）。
- 发布：`data.task_count`、`data.status`（开始～结束时间内为 `ongoing`，否则 `published`）。
- 预估：`estimated_count`、`breakdown[].class_name/count`。

---

## 六、量表

| 接口 | curl |
|------|------|
| 分类 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/scale-categories"` → `data.list` |
| 量表列表 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/scales?page_size=20"` |
| 量表详情（含题目） | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/scales/1"` → `data.questions[]`，含 `is_alert_item` |

---

## 五（续）·年级班级树

```bash
curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/grades?include_classes=1"
```

`data.list[].classes[]`：`id`、`name`、`student_count`。

---

## 八、看板

| 接口 | curl |
|------|------|
| 班级看板 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/dashboard/class/1?plan_id=1"` |
| 学生看板 | `curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/dashboard/student/5"`（`5`= student002 的 user id，有 completed 任务时折线图有数据） |

班级看板：`completion`、`risk_distribution`、`scale_scores`、`students[].scores`（PHQ-9 / GAD-7）。

---

## 九、管理员

| 接口 | curl |
|------|------|
| 用户列表 | `curl -s -H "Authorization: Bearer $TA" "$BASE/api/v1/admin/users?page=1&page_size=10"` |
| Excel 导入 | `curl -s -X POST -H "Authorization: Bearer $TA" -F "file=@学生导入模板.xlsx" "$BASE/api/v1/admin/students/import"` |

表头需含：**学号、姓名、班级**（与班级名称一致）；可选性别。依赖 `xlsx`（已写入 `package.json`）。

---

## 十、通知

```bash
curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/notifications/unread-count"
curl -s -H "Authorization: Bearer $TC" "$BASE/api/v1/notifications?is_read=0&page=1&page_size=10"
curl -s -X POST -H "Authorization: Bearer $TC" -H "Content-Type: application/json" \
  -d '{"ids":[1]}' "$BASE/api/v1/notifications/mark-read"
# 或全部已读: {"all":true}
```

种子为 **counselor001** 写入 3 条通知（1 条未读）。

---

## 种子数据（第四轮）

- **GAD-7**：7 题完整（与 PHQ-9 并存）。
- **【联调】进行中测评**：`ongoing`，目标班级含 **student001～005**；**student001** 两量表均为 pending（H5）；**002～005** PHQ-9+GAD-7 已填，供班级看板。
- **通知**：counselor 未读角标可测。

重启后端后再执行上述 curl。
