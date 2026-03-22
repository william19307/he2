# API 实际实现说明（api-actual）

> 根据 `backend/src` 路由扫描整理，与 `claudeplan0317/integration-guide.md` 对照处已标 **⚠️ 已变更**。  
> 生成时间：以仓库当前代码为准。

## 通用约定

| 项 | 说明 |
|----|------|
| **Base** | `/api/v1/...`（健康检查除外：`GET /api/health`） |
| **鉴权** | 除标注「公开」外均需 `Authorization: Bearer <accessToken>`；业务路由经 `injectTenant`，`req.tenantId` 来自 JWT |
| **响应外壳** | `{ code, message, data, timestamp }`；成功通常 `code: 0` |
| **BigInt** | 部分 Prisma 字段在 JSON 中转为 **字符串** |
| **权限 `authorize(role)`** | 该角色及**更高**层级可访问：`student(0) < teacher(1) < counselor(2) < doctor(3) < admin(4) < super_admin(5)` |
| **`authorizeRole('student')` 等** | **仅**该角色，其它角色 403 |

---

## GET `/api/health`

- **权限**：公开  
- **Response data**：`{ status: 'ok', timestamp: number }`（无 `code` 包裹）

---

## `/api/v1/auth`（公开除 `/me`、`/logout`、`/password`）

### POST `/api/v1/auth/login`

- **权限**：公开  
- **Body**：`username` string 必填；`password` string 必填；`tenant_code` string 必填  
- **Response data**：`accessToken`, `refreshToken`, `user: { id, username, realName, role, tenantId, tenantName }`（id 等为字符串）

### POST `/api/v1/auth/refresh`

- **权限**：公开  
- **Body**：`refresh_token` string 必填  
- **Response data**：`{ accessToken }`

### POST `/api/v1/auth/logout`

- **权限**：需登录  
- **Body**：无  
- **Response data**：`null`

### GET `/api/v1/auth/me`

- **权限**：需登录  
- **Response data**：用户对象（含 `tenant`、`student` 等，密码字段已剔除；嵌套 id 多为字符串）

### PUT `/api/v1/auth/password`

- **权限**：需登录  
- **Body**：`old_password`、`new_password` 必填（新密码至少 6 位由 service 校验）  
- **Response data**：`null`

**⚠️ 已变更**：integration-guide 若写其它字段名，以 `username`/`tenant_code`/`refresh_token` 为准。

---

## `/api/v1/h5`（H5 学生端）

### POST `/api/v1/h5/verify`

- **权限**：公开  
- **Body**：`tenant_code`；`student_no` 或 `username`；`password`  
- **Response data**：`token`（即 accessToken）、`refresh_token`、`student: { id, name, class_name, pending_task_count }`  
- **⚠️ 已变更**：文档常见为 `sms_code` 短信登录；当前实现为 **学号/用户名 + 密码**，无短信码校验。

### GET `/api/v1/h5/tasks`（需学生 Token）

- **权限**：`authorizeRole('student')`  
- **Response data**：`{ pending: [...], completed: [...] }`；pending 项含 `task_id`, `plan_title`, `scale_id`, `scale_name`, `scale_short`, `question_count`, `estimated_mins`, `end_time`, `status`, `answered_count`, `is_urgent`

### GET `/api/v1/h5/tasks/:taskId/questions`

- **权限**：学生  
- **Response data**：`task_id`, `scale_name`, `instruction`, `question_count`, `estimated_mins`, `questions[]`（`options` **无 score**）, `saved_answers[]`

### POST `/api/v1/h5/tasks/:taskId/save-progress`

- **权限**：学生  
- **Body**：`answers` 数组必填  
- **Response data**：`{}`

### POST `/api/v1/h5/tasks/:taskId/submit`

- **权限**：学生  
- **Body**：`answers` 数组必填  
- **Response data**：`task_id`, `status: 'completed'`, `next_task` 或 `null`

### POST `/api/v1/h5/tasks/:taskId/start`

- **权限**：学生  
- **Response data**：`null`

---

## `/api/v1/student`（学生 Token，与 H5 不同挂载路径）

- **权限**：`authorizeRole('student')` 全文  

| 方法 | 路径 | Query | Body | Response data（要点） |
|------|------|-------|------|----------------------|
| GET | `/tasks` | — | — | 任务数组（Prisma 形状，非 H5 的 pending/completed 分组） |
| GET | `/tasks/:id` | — | — | 任务 + `questions[]` |
| POST | `/tasks/:id/start` | — | — | `null` |
| POST | `/tasks/:id/submit` | — | `answers` 数组必填 | `{ message: '提交成功...' }` **⚠️ 已变更**：H5 submit 返回 `next_task`，此处仅文案 |
| GET | `/history` | — | — | 已完成任务列表 |

---

## `/api/v1/grades`

- **权限**：`authorize('teacher')`（教师及以上）

### GET `/`

- **Query**：`include_classes=1` 或 `true` 时返回班级树；否则返回年级数组（**无** `list` 包裹）  
- **Response data（无 include）**：`Grade[]`（Prisma）  
- **Response data（include_classes）**：`{ list: [{ id, name, level, classes: [{ id, name, student_count }] }] }`

### GET `/:id/classes`

- **Response data**：班级数组（含 `teacher`）

---

## `/api/v1/classes`

| 方法 | 路径 | 权限 | Query | Body | Response data |
|------|------|------|-------|------|---------------|
| GET | `/` | teacher | — | — | 全校班级列表（含 grade、teacher、_count） |
| GET | `/:id/students` | teacher | — | — | 该班学生（含 user） |
| POST | `/` | **admin** | — | `grade_id`, `name`, `class_num` 必填；`teacher_id` 可选 | 新建班级对象 |

---

## `/api/v1/scale-categories`

### GET `/`

- **权限**：teacher+  
- **Response data**：`{ list: [{ id, name, description, scale_count, sort_order }] }`  
- **⚠️ 已变更**：与文档「仅路径」一致；**另**：`GET /api/v1/scales/categories` 仍返回 **原始分类数组**（无 `list` 包裹），属重复能力。

---

## `/api/v1/scales`

### GET `/categories`

- **权限**：teacher+  
- **Response data**：分类数组（非 `{ list }`）

### GET `/`

- **权限**：teacher+  
- **Query**：`category_id`, `is_active`, `page`, `page_size`, **`keyword`**（名称/简称模糊）  
- **Response data**：`{ list, pagination: { total, page, pageSize, totalPages } }`  
- **⚠️ 已变更**：文档中的 `level`（学段）筛选 **未实现**，需前端按 `applicableLevels` 过滤。

### GET `/:id`

- **权限**：teacher+  
- **Response data**：量表 + `category` + `questions[]`（每题附加 `is_alert_item`, `alert_rule`）

### GET `/:id/questions`

- **权限**：teacher+  
- **Response data**：题目数组

### POST `/`

- **权限**：counselor+  
- **Body**：`category_id` 必填；`name`, `short_name`, `description`, `instruction`, `applicable_levels`, `min_age`, `max_age`, `question_count`, `estimated_mins`, `scoring_type`, `scoring_rule`, `result_levels`, `alert_rules`, `min_interval_days` 等  
- **Response data**：新建量表记录

---

## `/api/v1/assessment-plans`

### POST `/estimate`

- **权限**：counselor+  
- **Body**：`target_type` 必填（`class`|`grade`|`school`|`individual`）；`target_ids` 数组；`scale_ids` 数组（用于提示文案）  
- **Response data**：`estimated_count`, `excluded_count`, `exclude_reason`, `breakdown: [{ class_name, count, excluded }]`  
- **⚠️ 已变更**：`excluded_count` 恒为 0，未做真实学段排除。

### GET `/`

- **权限**：teacher+  
- **Query**：`status`, `page`, `page_size`, `keyword`（标题 contains）  
- **Response data**：`list[]`（含 `scale_names`, `completion_rate`, `is_urgent`, `status_label` 等）, `total`, `page`, `page_size`, **`pagination`**  
- **⚠️ 已变更**：文档若仅写 `list+total`，实际多 `pagination` 与 `is_urgent`。

### POST `/`

- **权限**：counselor+  
- **Body**：`title`, `start_time`, `end_time` 必填；`scale_ids` 草稿可为空；`target_type` 默认 `school`；`target_ids`；`description`；`remind_before` / `remind_before_days[0]`；`auto_alert`  
- **Response data**：`{ id, status: 'draft' }`（创建恒为 draft）

### GET `/:id/progress`

- **权限**：teacher+  
- **Response data**：`plan`（汇总）, `class_progress[]`, 以及 **`total`, `completed`, `completionRate`, `completion_rate`, `breakdown`**（任务状态分布）  
- **⚠️ 已变更**：较纯文档多一层冗余字段便于前端兼容。

### GET `/:id`

- **权限**：teacher+  
- **Response data**：Prisma `AssessmentPlan` + `creator`（非扁平化文档结构）

### PUT `/:id`

- **权限**：counselor+  
- **Body**：`title`, `description`, `scale_ids`, `target_type`, `target_ids`, `start_time`, `end_time`  
- **条件**：仅 **draft**  
- **Response data**：`null`

### POST `/:id/publish`

- **权限**：counselor+  
- **Body**：可为 `{}`  
- **条件**：draft；**`scale_ids` 非空**否则报「请先在草稿中配置量表」；**目标学生数与量表数乘积为任务数**  
- **Response data**：`id`, `status`（`ongoing` 或 `published`，由当前时间是否在计划窗口决定）, `task_count`  
- **⚠️ 已变更**：文档写 `published`；窗口内实际为 **`ongoing`**。

### POST `/:id/cancel`

- **权限**：counselor+  
- **Response data**：`null`

---

## `/api/v1/alerts`

- **权限**：`authorize('counselor')`（**不含**班主任 teacher；与部分文档「教师可看」可能不一致）  
- **⚠️ 已变更**：列表/详情/操作均为心理老师及以上（counselor 起）。

### GET `/counselors-list`

- **Response data**：`[{ id, real_name }]`（失败或缺租户时 `[]`）  
- **⚠️ 已变更**：另有 **`GET /api/v1/meta/alert-counselors`**（同 counselor+），角色含 teacher，返回形状相同，路径不同。

### GET `/manual-report/counselors`

- **权限**：`teacher` 及以上  
- **Response data**：`{ counselors: [{ id, real_name, role }] }`

### POST `/manual-report`

- **权限**：`teacher` 及以上；**`student`** 仅当本人、`alert_level` 为 **`red`**、`report_urgency` 为 **`urgent` 或 `critical`** 时允许；学生 `report_reason` **≥10 字**，教师 **≥20 字**；学生请求忽略 `assign_to`。  
- **Body**：`student_id`（**`students` 表主键**，勿传 user id）；`alert_level`；`report_reason`；`assign_to`、`report_evidence`、`report_urgency` 等见实现。  
- **说明**：H5「联系心理老师」默认走 **`POST /h5/ai-chat/crisis-notify`**，非本接口；见 `backend/docs/AI_CHAT_CRISIS_FIX.md`。

### GET `/`

- **Query**：`alert_level`, `status`（前端 `revoked` 映射库内 `cancelled`）, `scale_id`, `start_date`, `end_date`, `keyword`, `class_id`, `assigned_to`, `page`, `page_size`  
- **Response data**：`list[]`（含 `sla_*`, `user_id`, `task_id` 等）, `total`, `page`, `page_size`, `stats`  
- **缺租户**：`list: []`, `stats` 全 0

### GET `/:id`

- **Response data**：`id`, `student`, `alert`, `assessment_result`, `process_logs`, `assignable_counselors`, `mental_status`, `mental_status_label`  
- **⚠️ 已变更**：较 integration-guide 多扩展字段；`student.id` 为 **用户 id**（档案路由用）。

### POST `/:id/accept`

- **Body**：`assigned_to` 必填；`note` 至少 20 字；`parent_notified` boolean；若 true 则 `parent_notify_method` 必填  
- **Response data**：`{ alert_id, status: 'processing' }`

### POST `/:id/logs`

- **Body**：`content` 必填；`next_plan_date`, `next_plan_note` 可选（拼入 content）  
- **Response data**：单条 log 对象

### POST `/:id/assign`

- **Body**：`assignee_id` 必填  
- **Response data**：`null`

### POST `/:id/close`

- **Body**：`close_note` 必填  
- **Response data**：`null`

---

## GET `/api/v1/meta/alert-counselors`

- **权限**：counselor+（独立挂载）  
- **Response data**：同 `alerts/counselors-list`（负责人列表）

---

## `/api/v1/students`（`:id` 可为 **userId** 或 **student 表主键**）

- **权限**：teacher+  

| 方法 | 路径 | Query | Body | Response data（要点） |
|------|------|-------|------|------------------------|
| GET | `/:id/assessments` | `page`, `page_size`, `scale_id`, `start_date`, `end_date`, `alert_level` | — | `list`, `total`, `trend_data` |
| GET | `/:id/alerts` | — | — | `list`, `total`, `red_count`, `yellow_count` |
| GET | `/:id/case` | — | — | `has_case`, `case` 或 null；sessions 含 `record_type` |
| POST | `/:id/parent-comms` | — | `notify_type`, `content` 必填；其它 guardian/跟进字段可选 | `{ id, case_id, record_type, created_at }` |
| GET | `/:id` | — | — | 档案扁平字段；多数字段与 guide 接近；`enroll_date`/`guardian_relation` 等可能为 null |

---

## `/api/v1/dashboard`

工作台子路由（**先注册**）：

- **权限**：`authorize('teacher')`（`/school` 除外）

| 方法 | 路径 | Query | Response data（要点） |
|------|------|-------|------------------------|
| GET | `/overview` | — | 周测评、红黄预警、个案统计等 |
| GET | `/pending-alerts` | `limit` | `list`, `total_pending` |
| GET | `/active-plans` | `limit` | `list`（完成率、截止紧迫度） |
| GET | `/week-stats` | — | 周维度统计 |
| GET | `/alert-trend` | `days` 7–90 | `dates`, `red_counts`, `yellow_counts` |

### GET `/school`

- **权限**：**admin**（及 super_admin）  
- **Response data**：`studentCount`, `classCount`, `planCount`, `alertStats`, `recentPlans`

### GET `/class/:id`

- **权限**：teacher+  
- **Query**：`plan_id` 可选；无计划时尝试最近进行中的计划  
- **Response data**：`class`, `plan`, `completion`, `risk_distribution`, `scale_scores`, `auto_insight`, `students[]`（每人 `scores` 按量表简称）

### GET `/student/:id`

- **权限**：teacher+（**`:id` 为 userId**）  
- **Response data**：`student`, `health_score`, `health_score_label`, `risk_level`, `longitudinal`, `radar`（有 `subscale_scores` 用维度，否则「量表总分%」单维）

---

## `/api/v1/cases`（个案档案）

- **权限**：`authorize('counselor')`（心理老师、医生、管理员、超管）
- **挂载**：`authenticate` + `injectTenant`

### GET `/`

- **Query**：`status`=`active`|`closed`|`all`（默认 `active`）；`page`（默认 1）；`page_size`（默认 20）；`keyword`（学生姓名，模糊）
- **Response data**：`list[]`（`id`, `student_id`, `student_name`, `class_name`, `student_no`, `counselor_name`, `status`, `priority`, `priority_label`, `summary`, `created_at`, `last_record_at`, `record_count`, `alert_level`），`total`, `page`, `page_size`
- **说明**：`alert_level` 为该学生在 **pending / processing** 预警中的最高等级（red 优先于 yellow）；无则 `null`

### GET `/:id`

- **Response data**：`case`（个案扁平字段，含 `open_date`/`close_date`/`close_reason` 等东八区 ISO）、`records[]`（按记录时间倒序，含 `operator_name`、`record_type`、`record_date`、`content`、`next_plan` 等）

### POST `/:id/close`

- **Body**：`close_reason` 或 `closeReason` 必填（结案原因）
- **Response data**：`id`, `status`, `close_date`, `close_reason`, `updated_at`；`message` 为「个案已结案」
- **错误**：已结案时 `400` + 业务码 `2002`

---

## `/api/v1/admin`

- **权限**：**admin**（及 super_admin）全文

### GET `/users`

- **Query**：`role`, `status`, `keyword`, `page`, `page_size`  
- **Response data**：`list[]`（`real_name`, `role_label`, 脱敏 `phone`, `class_names: []`）, `total`

### POST `/students/import`

- **Content-Type**：`multipart/form-data`，字段名必须为 **`file`**  
- **文件**：`.csv`/`.tsv` 或 `.xlsx`/`.xls`（依赖 `xlsx`）  
- **表头**：须能匹配 **学号、姓名、班级**（列名包含关键字即可，如「班级名称」）；**班级 `name` 须与库完全一致**  
- **Response data**：`total`, `success`, `failed`（失败条数）, `errors`（明细 `{ row, student_no, reason }`）, 及 `imported_count`, `failed_count`, `failed_rows`  
- **⚠️ 已变更**：文档常见 `task_count` 式命名；实际成功条数用 **`success` / `imported_count`**；**年级+班拆分**未自动拼班名，需整列写全名（如 `初一(1)班`）。

---

## `/api/v1/notifications`

- **权限**：teacher+

### GET `/unread-count`

- **Response data**：`{ count }`

### GET `/`

- **Query**：`is_read`=`0`|`1`, `page`, `page_size`  
- **Response data**：`list[]`（`ref_type` 由 `type` 推断：alert/task/其它为 system）, `total`, `unread_count`

### POST `/mark-read`

- **Body**：`all: true` **或** `ids: number[]`  
- **Response data**：`null`

---

## 与 integration-guide 差异汇总（⚠️）

| 点 | 实际行为 |
|----|----------|
| H5 登录 | 密码登录，非短信验证码 |
| 学生端 `/student/tasks/:id/submit` | 返回 `message`，非 `next_task` |
| 量表列表 | 无服务端 `level` 筛选 |
| 测评计划发布 | 窗口内状态为 **`ongoing`** |
| 计划进度接口 | 额外字段 `total`/`breakdown`/`completionRate` |
| 预警模块 | **仅 counselor+**，非 teacher |
| 负责人 API | **`/meta/alert-counselors`** 与 **`/alerts/counselors-list`** 双路径 |
| 学生导入 | 字段名 **`file`**；班级全名匹配；支持 **年级名+班** 的模板需后端扩展（当前未实现） |
| scale-categories | `/scale-categories` 为 `{ list }`，`/scales/categories` 为数组 |

---

*文档由代码扫描生成，若路由有增删请以 `backend/src/app.js` 与各 `routes/*.js` 为准。*
