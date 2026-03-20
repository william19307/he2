# 心晴平台 — 前后端联调文档 v1.0

> 本文档用于前后端联调阶段，精确描述每个前端页面调用哪些接口、传什么字段、收到什么数据、如何处理错误。  
> 前端参考：`prototype-spec.md`  
> 后端参考：`phase1-mvp.md`  
> **本文档是两者之间的"翻译层"，有歧义以本文档为准，两端都要看。**

---

## 约定

### 请求规范

```
Base URL:        /api/v1
Content-Type:    application/json
鉴权:            Authorization: Bearer <token>
租户识别:        请求头 X-Tenant-Code: school_001（后端中间件自动注入 tenant_id）
```

### 统一响应结构

```json
// 成功
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "timestamp": 1711339200000
}

// 失败
{
  "code": 4001,
  "message": "token已过期，请重新登录",
  "data": null,
  "timestamp": 1711339200000
}
```

### 错误码表（前端统一拦截处理）

| code | 含义 | 前端行为 |
|------|------|----------|
| 0 | 成功 | 正常处理 |
| 1001 | 未登录 / token无效 | 跳转 `/login` |
| 1002 | token已过期 | 静默刷新token，失败则跳 `/login` |
| 1003 | 权限不足 | 弹 `a-message.error("无操作权限")` |
| 2001 | 参数校验失败 | 取 `message` 展示在表单项下 |
| 2002 | 资源不存在 | 展示 `a-result status:404` |
| 2003 | 业务规则冲突 | 弹 `a-message.warning(message)` |
| 5001 | 服务器内部错误 | 弹 `a-message.error("系统异常，请稍后重试")` |

### 分页参数（所有列表接口统一）

```
请求：?page=1&page_size=20
响应 data 结构：
{
  "list": [...],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 时间格式

- 接口传输：Unix 毫秒时间戳（`number`）或 ISO 8601 字符串（`2025-03-17T09:23:00+08:00`）
- **前端统一约定用 ISO 字符串，后端统一约定存毫秒时间戳，响应时返回 ISO 字符串**
- 前端展示格式：`YYYY-MM-DD HH:mm`

---

## 一、登录模块

### 页面：P-001 登录页（`/login`）

---

#### 1.1 账号密码登录

**前端触发：** 点击"登录"按钮

```
POST /api/v1/auth/login
```

**Request Body：**

```json
{
  "username": "counselor_zhang",
  "password": "abc123456",
  "tenant_code": "school_001",
  "role": "counselor"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✓ | 账号，2-50字符 |
| password | string | ✓ | 密码，6-30字符 |
| tenant_code | string | ✓ | 学校编码，从登录页 URL 参数或用户输入获取 |
| role | string | 否 | 多角色时指定登录角色，单角色可不传 |

**Response data：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 28800,
  "user": {
    "id": 1001,
    "username": "counselor_zhang",
    "real_name": "张晓慧",
    "role": "counselor",
    "roles": ["counselor"],
    "tenant_id": 1,
    "tenant_name": "XX市第一中学",
    "avatar_url": null
  }
}
```

**前端处理：**

```
成功：
  1. token 存入 localStorage（key: xq_token）
  2. refresh_token 存入 localStorage（key: xq_refresh_token）
  3. user 信息存入 Pinia userStore
  4. 如 user.roles.length > 1 → 跳转 /select-role
  5. 否则 → 跳转 /dashboard

失败 code=2001，message 含"密码错误"：
  → 表单 password 字段 validate-status:error，help 显示 message

失败 code=2003，message 含"账号锁定"：
  → 页面顶部展示 a-alert type:error banner:true message
```

---

#### 1.2 手机号验证码登录

**前端触发：** Tab2 点击"登录"按钮

```
POST /api/v1/auth/login-sms
```

**Request Body：**

```json
{
  "phone": "13812345678",
  "code": "123456",
  "tenant_code": "school_001"
}
```

**Response data：** 同 1.1

---

#### 1.3 发送验证码

**前端触发：** 点击"发送验证码"按钮，60秒倒计时

```
POST /api/v1/auth/send-sms
```

**Request Body：**

```json
{
  "phone": "13812345678",
  "scene": "login"
}
```

**Response data：** `{}`（成功即可）

**前端处理：**

```
成功：按钮进入倒计时 60s，disabled
失败 code=2003，message 含"频繁"：弹 a-message.warning
```

---

#### 1.4 刷新 Token

**前端触发：** Axios 响应拦截器捕获 code=1002 时自动触发

```
POST /api/v1/auth/refresh
```

**Request Body：**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response data：**

```json
{
  "token": "new_token...",
  "expires_in": 28800
}
```

**前端处理：**

```
成功：更新 localStorage xq_token，重试原请求
失败：清空 localStorage，跳转 /login
```

---

#### 1.5 获取当前用户信息

**前端触发：** App 初始化时（`main.js` 中 `router.beforeEach`）

```
GET /api/v1/auth/me
```

**Response data：**

```json
{
  "id": 1001,
  "username": "counselor_zhang",
  "real_name": "张晓慧",
  "role": "counselor",
  "roles": ["counselor"],
  "tenant_id": 1,
  "tenant_name": "XX市第一中学",
  "avatar_url": null,
  "phone": "138****5678",
  "last_login_at": "2025-03-17T08:00:00+08:00",
  "permissions": [
    "alert:view", "alert:handle",
    "student:view", "student:edit",
    "plan:create", "plan:publish",
    "scale:view", "case:manage",
    "dashboard:class", "dashboard:school"
  ]
}
```

**前端处理：**

```
成功：写入 Pinia userStore，前端路由守卫基于 permissions 做鉴权
失败 code=1001：清空 token，跳转 /login
```

---

## 二、工作台首页

### 页面：C-001（`/dashboard`）

---

#### 2.1 工作台汇总数据（4个 KPI 卡片）

**前端触发：** 页面 mounted

```
GET /api/v1/dashboard/overview
```

**Response data：**

```json
{
  "weekly_assessment_count": 342,
  "weekly_assessment_rate": 0.872,
  "weekly_rate_change": 12,
  "red_alert_pending": 3,
  "yellow_alert_processing": 12,
  "yellow_alert_overdue": 5,
  "case_active": 28,
  "case_new_this_week": 2,
  "case_closed_this_month": 3
}
```

---

#### 2.2 待处理预警列表（工作台卡片）

**前端触发：** 页面 mounted，轮询间隔 60s

```
GET /api/v1/dashboard/pending-alerts?limit=5
```

**Response data：**

```json
{
  "list": [
    {
      "id": 2001,
      "student_id": 3001,
      "student_name": "李梦瑶",
      "student_no": "2023042",
      "class_name": "初二(3)班",
      "scale_name": "PHQ-9",
      "scale_short": "PHQ-9",
      "alert_level": "red",
      "trigger_score": 22,
      "max_score": 27,
      "trigger_reason": "PHQ-9总分22分（重度抑郁），且第9题得分3分",
      "status": "pending",
      "created_at": "2025-03-17T09:23:00+08:00",
      "time_ago": "2小时前"
    }
  ],
  "total_pending": 15
}
```

**字段说明：**

| 字段 | 前端用途 |
|------|----------|
| alert_level | 决定卡片背景色：`red` → `--alert-red-bg`，`yellow` → `--alert-yellow-bg` |
| status | 决定按钮：`pending` → "立即处理"（primary），其他 → "查看详情" |
| time_ago | 由后端计算返回，前端直接展示 |

---

#### 2.3 进行中测评计划

**前端触发：** 页面 mounted

```
GET /api/v1/dashboard/active-plans?limit=3
```

**Response data：**

```json
{
  "list": [
    {
      "id": 101,
      "title": "2025春季学期开学心理普测",
      "end_time": "2025-03-21T23:59:59+08:00",
      "total_targets": 392,
      "completed_count": 342,
      "completion_rate": 0.872,
      "days_remaining": 4,
      "is_urgent": false
    }
  ]
}
```

**字段说明：**

| 字段 | 前端用途 |
|------|----------|
| is_urgent | `true`（剩余 < 3天）→ 截止日期标红 + 显示"即将截止"tag |
| completion_rate | `a-progress :percent="Math.round(rate*100)"` |

---

#### 2.4 本周工作统计

**前端触发：** 页面 mounted

```
GET /api/v1/dashboard/week-stats
```

**Response data：**

```json
{
  "new_alerts": 5,
  "handled_alerts": 2,
  "new_cases": 1,
  "consult_sessions": 8,
  "parent_communications": 3,
  "notifications_sent": 12
}
```

---

#### 2.5 近30天风险趋势

**前端触发：** 页面 mounted

```
GET /api/v1/dashboard/alert-trend?days=30
```

**Response data：**

```json
{
  "dates": ["2025-02-16", "2025-02-17", "...", "2025-03-17"],
  "red_counts": [0, 1, 0, 0, 2, ...],
  "yellow_counts": [3, 2, 4, 1, 3, ...]
}
```

**前端图表配置（@antv/g2）：**

```javascript
// x轴：dates，y轴：counts，双折线
// 红色预警线：color '#C0392B'
// 黄色预警线：color '#D4A017'
// tooltip：{ date, red: N, yellow: M }
```

---

#### 2.6 实现说明与 curl 自测（与种子对齐）

**后端挂载：** `GET /api/v1/dashboard/*` 与现有 dashboard 一致，需 **JWT + 租户**（`X-Tenant-Code` 或 token 内租户），角色 **teacher 及以上**（心理老师、管理员等）。实现位于 `backend/src/routes/dashboardWorkbench.js`，由 `dashboard.js` 挂载。

**口径摘要：**

| 接口 | 要点 |
|------|------|
| `overview` | 近 7 天 / 前 7～14 天在 **ongoing + published 计划** 内的完成量算环比；`weekly_assessment_rate` = 近7天完成数 / 上述计划总任务数；黄预警：`processing` / 超48h未处理的 `pending` |
| `pending-alerts` | **仅 `status=pending`**；`total_pending` 同口径；`id`/`student_id` 为 number；`created_at` 为 `...+08:00`；`time_ago` 由后端生成（如 `约N分钟前`） |
| `active-plans` | `ongoing` + `published`；`end_time` 为 `+08:00` |
| `week-stats` | 滚动近 7 天 |
| `alert-trend` | 按 **东八区日历日** 聚合；仅统计 `red` / `yellow` |

**种子（`cd backend && npm run db:seed`）：**

- 红色 pending 预警：独立计划「【联调】红色预警演示」（已结束），student002 + 已完成 PHQ-9 + 一条 red/pending。
- 进行中测评：「【联调】进行中测评」`ongoing`，`active-plans` 可见。

**登录取 Token（`tenant_code` 与学校一致，如 `demo_school`）：**

```bash
BASE=http://127.0.0.1:3010   # 按本机端口修改
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"counselor001","password":"123456","tenant_code":"demo_school"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.accessToken")

curl -s "$BASE/api/v1/dashboard/overview" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/v1/dashboard/pending-alerts?limit=5" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/v1/dashboard/active-plans?limit=3" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/v1/dashboard/week-stats" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/v1/dashboard/alert-trend?days=30" -H "Authorization: Bearer $TOKEN"
```

成功时统一外壳 `{ code, message, data, timestamp }`，前端使用 **`data`**。

---

## 三、预警管理

### 页面：C-003 预警列表（`/alerts`）

---

#### 3.1 预警列表（带筛选）

**前端触发：** 页面 mounted、筛选条件变化、分页变化

```
GET /api/v1/alerts
```

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| alert_level | string | `red` / `yellow`，不传则全部 |
| status | string | `pending` / `processing` / `closed` / `cancelled` |
| scale_id | number | 触发量表ID |
| start_date | string | 触发时间起始，格式 `2025-03-01` |
| end_date | string | 触发时间截止 |
| keyword | string | 学生姓名或学号，模糊搜索 |
| class_id | number | 班级ID |
| assigned_to | number | 负责人用户ID |
| page | number | 默认1 |
| page_size | number | 默认20 |

**Response data：**

```json
{
  "list": [
    {
      "id": 2001,
      "student_id": 3001,
      "student_name": "李梦瑶",
      "student_no": "2023042",
      "class_id": 201,
      "class_name": "初二(3)班",
      "grade_name": "初二",
      "scale_id": 1,
      "scale_name": "PHQ-9 患者健康问卷",
      "scale_short": "PHQ-9",
      "alert_level": "red",
      "trigger_score": 22,
      "max_score": 27,
      "trigger_reason": "PHQ-9总分22分（重度抑郁），且第9题（自伤意念）得分3分，直接触发红色预警",
      "status": "pending",
      "assigned_to": null,
      "assigned_name": null,
      "sla_deadline": "2025-03-18T09:23:00+08:00",
      "sla_remaining_hours": 21.6,
      "sla_overdue": false,
      "created_at": "2025-03-17T09:23:00+08:00",
      "task_id": 5001
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 20,
  "stats": {
    "red_pending": 3,
    "yellow_processing": 12,
    "closed_this_month": 8,
    "avg_handle_hours": 4.2
  }
}
```

**字段说明：**

| 字段 | 前端用途 |
|------|----------|
| sla_remaining_hours | 红色预警：`< 24` 显示倒计时；`< 0` 标红 "已超时" |
| sla_overdue | `true` → SLA列整行文字变红 |
| stats | 驱动页面顶部 4 个统计卡片 |

---

#### 3.2 预警详情

**前端触发：** 点击列表行 or "处理"/"详情" 按钮，跳转 `/alerts/:id`

```
GET /api/v1/alerts/:id
```

**Response data：**

```json
{
  "id": 2001,
  "student": {
    "id": 3001,
    "name": "李梦瑶",
    "student_no": "2023042",
    "gender": 2,
    "class_name": "初二(3)班",
    "grade_name": "初二",
    "guardian_name": "张梦华",
    "guardian_phone": "138****1234",
    "case_status": "active",
    "case_id": 401,
    "total_alert_count": 3
  },
  "alert": {
    "level": "red",
    "status": "pending",
    "trigger_score": 22,
    "max_score": 27,
    "trigger_reason": "PHQ-9总分22分（重度抑郁），且第9题得分3分",
    "scale_id": 1,
    "scale_name": "PHQ-9",
    "task_id": 5001,
    "created_at": "2025-03-17T09:23:00+08:00",
    "sla_deadline": "2025-03-18T09:23:00+08:00",
    "sla_overdue": false,
    "assigned_to": null,
    "assigned_name": null
  },
  "assessment_result": {
    "task_id": 5001,
    "submit_time": "2025-03-17T09:21:00+08:00",
    "total_score": 22,
    "result_level": "severe",
    "result_label": "重度抑郁",
    "answers": [
      {
        "question_no": 1,
        "question_text": "做什么事都提不起劲或没有兴趣",
        "answer_value": 2,
        "answer_label": "超过一半天数",
        "score": 2,
        "is_alert_item": false
      },
      {
        "question_no": 9,
        "question_text": "有不如死掉或用某种方式伤害自己的念头",
        "answer_value": 3,
        "answer_label": "几乎每天",
        "score": 3,
        "is_alert_item": true,
        "alert_reason": "第9题得分≥2，直接触发红色预警"
      }
    ],
    "history_scores": [
      { "date": "2024-09-05", "score": 8, "level": "mild", "plan_title": "初二开学测评" },
      { "date": "2024-12-10", "score": 15, "level": "moderate", "plan_title": "期末普测" },
      { "date": "2025-03-17", "score": 22, "level": "severe", "plan_title": "春季开学普测" }
    ]
  },
  "process_logs": [
    {
      "id": 1,
      "operator_id": 1001,
      "operator_name": "张晓慧",
      "action": "notify",
      "action_label": "系统自动通知",
      "content": "系统触发预警，已发送通知至张晓慧（手机短信）",
      "created_at": "2025-03-17T09:23:05+08:00"
    }
  ]
}
```

**前端渲染要点：**

```
answers 列表：is_alert_item=true 的行，整行背景色 var(--alert-red-bg)，
  右侧展示 a-tag color:red "⚠ 关键题"

history_scores：驱动左侧迷你折线图（3个数据点）
  最新一次（当前预警）：数据点标红

process_logs：渲染 a-timeline，action=notify 用灰色点，
  action=handle/close 用品牌色点
```

---

#### 3.3 确认接收预警

**前端触发：** 处置流程 Step2 点击"确认接收"

```
POST /api/v1/alerts/:id/accept
```

**Request Body：**

```json
{
  "assigned_to": 1001,
  "note": "今日上午10:00安排面谈，评估安全风险等级",
  "parent_notified": true,
  "parent_notify_method": "phone"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assigned_to | number | ✓ | 负责人用户ID |
| note | string | ✓ | 初步处置计划说明，最少20字 |
| parent_notified | boolean | ✓ | 是否已通知家长 |
| parent_notify_method | string | 否 | `phone`/`sms`/`later`，parent_notified=true时必填 |

**Response data：** `{ "alert_id": 2001, "status": "processing" }`

---

#### 3.4 添加跟进记录

**前端触发：** 日志 Tab 底部"添加跟进记录"内联表单提交

```
POST /api/v1/alerts/:id/logs
```

**Request Body：**

```json
{
  "content": "今日上午完成首次面谈，学生情绪较稳定，无即时危险",
  "next_plan_date": "2025-03-20",
  "next_plan_note": "安排第二次面谈"
}
```

**Response data：** 返回新增的 log 对象（追加到 process_logs 列表末尾）

---

#### 3.5 关闭预警

**前端触发：** 点击"关闭预警"，需 a-popconfirm 二次确认

```
POST /api/v1/alerts/:id/close
```

**Request Body：**

```json
{
  "close_note": "经过5次会谈评估，学生风险已降至正常水平，结案"
}
```

**必填校验：** close_note 不能为空

---

## 四、学生档案

### 页面：C-007 学生详情（`/students/:id`）

---

#### 4.1 学生基本信息

**前端触发：** 页面 mounted

```
GET /api/v1/students/:id
```

**Response data：**

```json
{
  "id": 3001,
  "user_id": 3001,
  "student_no": "2023042",
  "real_name": "李梦瑶",
  "gender": 2,
  "gender_label": "女",
  "birth_date": "2011-05-12",
  "age": 13,
  "class_id": 201,
  "class_name": "初二(3)班",
  "grade_id": 101,
  "grade_name": "初二",
  "homeroom_teacher": "王明",
  "enroll_date": "2023-09-01",
  "guardian_name": "张梦华",
  "guardian_phone": "138****1234",
  "guardian_relation": "母亲",
  "guardian2_name": null,
  "guardian2_phone": null,
  "family_type": "双亲",
  "is_boarding": false,
  "special_flag": true,
  "special_note": "父母离异（2024-09备注）",
  "mental_status": "high_risk",
  "mental_status_label": "高风险",
  "case_status": "active",
  "case_id": 401,
  "total_assessments": 3,
  "total_alerts": 3,
  "total_sessions": 5
}
```

**字段说明：**

| 字段 | 前端用途 |
|------|----------|
| mental_status | 档案头部状态 tag 颜色：`normal`→绿，`attention`→黄，`high_risk`→红 |
| special_flag | `true` → 在档案头部显示"重点关注"橙色标签 |
| case_status | `active` → 显示"个案在案"蓝色标签 |

---

#### 4.2 测评历史列表

**前端触发：** 切换到"测评历史" Tab

```
GET /api/v1/students/:id/assessments?page=1&page_size=10
```

**Query 参数（可选筛选）：**

| 参数 | 说明 |
|------|------|
| scale_id | 按量表筛选 |
| start_date / end_date | 时间范围 |
| alert_level | `red`/`yellow`/`normal` |

**Response data：**

```json
{
  "list": [
    {
      "task_id": 5001,
      "plan_id": 101,
      "plan_title": "2025春季开学心理普测",
      "scale_id": 1,
      "scale_name": "PHQ-9",
      "scale_short": "PHQ-9",
      "submit_time": "2025-03-17T09:21:00+08:00",
      "total_score": 22,
      "max_score": 27,
      "result_level": "severe",
      "result_label": "重度抑郁",
      "alert_level": "red",
      "subscale_scores": null
    }
  ],
  "total": 3,
  "trend_data": {
    "labels": ["2024-09-05", "2024-12-10", "2025-03-17"],
    "datasets": [
      {
        "scale_name": "PHQ-9",
        "scale_short": "PHQ-9",
        "scores": [8, 15, 22],
        "max_score": 27,
        "normalized_scores": [29.6, 55.6, 81.5]
      }
    ]
  }
}
```

**前端渲染要点：**

```
trend_data 驱动页面顶部多量表趋势折线图：
  x轴：labels（日期）
  y轴：normalized_scores（0-100标准化，方便多量表对比）
  每条线的 scale_name 作为图例
  数据点 hover：显示原始 score/max_score 和 result_label
```

---

#### 4.3 预警记录列表

**前端触发：** 切换到"预警记录" Tab

```
GET /api/v1/students/:id/alerts
```

**Response data：**

```json
{
  "list": [
    {
      "id": 2001,
      "scale_name": "PHQ-9",
      "alert_level": "red",
      "trigger_score": 22,
      "status": "processing",
      "status_label": "处理中",
      "assigned_name": "张晓慧",
      "created_at": "2025-03-17T09:23:00+08:00",
      "closed_at": null,
      "summary": "PHQ-9总分22分，第9题自伤意念得分3分"
    }
  ],
  "total": 3,
  "red_count": 2,
  "yellow_count": 1
}
```

---

#### 4.4 个案记录（Tab）

**前端触发：** 切换到"个案记录" Tab

```
GET /api/v1/students/:id/case
```

**Response data（有个案时）：**

```json
{
  "has_case": true,
  "case": {
    "id": 401,
    "counselor_id": 1001,
    "counselor_name": "张晓慧",
    "open_date": "2025-01-15",
    "status": "active",
    "priority": "urgent",
    "summary": "学生抑郁情绪持续加重，需密切跟进",
    "sessions": [
      {
        "id": 601,
        "session_no": 1,
        "record_date": "2025-01-20",
        "duration_mins": 45,
        "content": "首次会谈，建立信任关系...",
        "student_mood": 3,
        "progress_note": "初步建立咨询关系",
        "next_plan": "2025-02-03 第二次会谈"
      }
    ],
    "total_sessions": 5
  }
}
```

**Response data（无个案时）：**

```json
{
  "has_case": false,
  "case": null
}
```

**前端渲染：**

```
has_case=false → 展示 a-empty + "为该学生建立个案档案"按钮
has_case=true  → 展示个案信息 + 会谈记录折叠列表
```

---

#### 4.5 记录家长沟通

**前端触发：** 家长沟通 Tab → "记录家长沟通" → Modal 提交

```
POST /api/v1/students/:id/parent-comms
```

**Request Body：**

```json
{
  "notify_type": "phone",
  "guardian_name": "张梦华",
  "guardian_phone": "13812341234",
  "notify_time": "2025-03-17T10:30:00+08:00",
  "content": "告知家长本次测评结果，建议配合学校心理辅导",
  "guardian_attitude": "cooperate",
  "follow_up": "家长表示会配合，约定下次沟通时间",
  "next_contact_date": "2025-03-24"
}
```

| 字段 | 枚举值 | 说明 |
|------|--------|------|
| notify_type | phone/sms/meeting/letter | 沟通方式 |
| guardian_attitude | cooperate/neutral/resistant/unreachable | 家长态度 |

---

## 五、测评计划

### 页面：C-011 测评计划列表（`/plans`）

---

#### 5.1 测评计划列表

```
GET /api/v1/assessment-plans?status=ongoing&page=1&page_size=20
```

**Query 参数：**

| 参数 | 说明 |
|------|------|
| status | `draft`/`published`/`ongoing`/`completed`/`cancelled` |
| keyword | 计划名称搜索 |

**Response data：**

```json
{
  "list": [
    {
      "id": 101,
      "title": "2025春季学期开学心理普测",
      "scale_names": ["PHQ-9", "GAD-7", "PSS-10"],
      "scale_count": 3,
      "target_type": "school",
      "target_label": "全校",
      "total_targets": 392,
      "completed_count": 342,
      "completion_rate": 0.872,
      "start_time": "2025-03-10T08:00:00+08:00",
      "end_time": "2025-03-21T23:59:59+08:00",
      "status": "ongoing",
      "status_label": "进行中",
      "creator_name": "张晓慧",
      "auto_alert": true,
      "created_at": "2025-03-08T14:30:00+08:00"
    }
  ],
  "total": 3
}
```

---

### 页面：C-012 新建测评计划（`/plans/create`）

分步骤向导，**每步独立保存到本地 state（Pinia），最后一步统一提交**。

---

#### 5.2 Step2：获取可选量表列表

**前端触发：** 进入 Step2 时

```
GET /api/v1/scales?is_active=1&page_size=100
```

（参数详见第七章量表接口，此处使用量表列表接口）

---

#### 5.3 Step3：获取组织架构（选目标）

**前端触发：** 进入 Step3 时

```
GET /api/v1/grades?include_classes=1
```

**Response data：**

```json
{
  "list": [
    {
      "id": 101,
      "name": "初一",
      "level": 2,
      "classes": [
        { "id": 201, "name": "初一(1)班", "student_count": 48 },
        { "id": 202, "name": "初一(2)班", "student_count": 50 }
      ]
    }
  ]
}
```

---

#### 5.4 预估覆盖人数

**前端触发：** Step3 选择目标后（防抖 500ms）

```
POST /api/v1/assessment-plans/estimate
```

**Request Body：**

```json
{
  "target_type": "class",
  "target_ids": [201, 202, 203],
  "scale_ids": [1, 2, 3]
}
```

**Response data：**

```json
{
  "estimated_count": 342,
  "excluded_count": 12,
  "exclude_reason": "PHQ-9不适用小学段学生，已自动排除12人",
  "breakdown": [
    { "class_name": "初一(1)班", "count": 48, "excluded": 0 },
    { "class_name": "初一(2)班", "count": 46, "excluded": 4 }
  ]
}
```

---

#### 5.5 创建测评计划（草稿）

**前端触发：** Step5 点击"保存草稿"

```
POST /api/v1/assessment-plans
```

**Request Body：**

```json
{
  "title": "2025春季学期心理健康测评",
  "description": "本次测评用于了解全校学生开学状态",
  "scale_ids": [1, 2, 3],
  "target_type": "school",
  "target_ids": [],
  "start_time": "2025-03-18T08:00:00+08:00",
  "end_time": "2025-03-25T23:59:59+08:00",
  "min_interval_days": 30,
  "auto_alert": true,
  "notify_methods": ["system", "sms"],
  "remind_before_days": [1],
  "status": "draft"
}
```

**Response data：** `{ "id": 102, "status": "draft" }`

---

#### 5.6 发布测评计划

**前端触发：** Step5 点击"立即发布" → a-popconfirm 确认后

```
POST /api/v1/assessment-plans/:id/publish
```

**Request Body：** `{}`

**Response data：** `{ "id": 102, "status": "published", "task_count": 342 }`

**前端处理：**

```
成功 → a-message.success("已发布，系统将在开始时间自动发送通知给 342 名学生")
     → 跳转 /plans/:id
```

---

#### 5.7 测评计划详情与进度

**前端触发：** 点击"查看进度"跳转 `/plans/:id`

```
GET /api/v1/assessment-plans/:id/progress
```

**Response data：**

```json
{
  "plan": {
    "id": 101,
    "title": "2025春季学期开学心理普测",
    "status": "ongoing",
    "start_time": "2025-03-10T08:00:00+08:00",
    "end_time": "2025-03-21T23:59:59+08:00",
    "total_targets": 392,
    "completed_count": 342,
    "completion_rate": 0.872,
    "pending_count": 50,
    "alert_triggered_count": 15
  },
  "class_progress": [
    {
      "class_id": 201,
      "class_name": "初二(3)班",
      "total": 50,
      "completed": 46,
      "completion_rate": 0.92,
      "red_alert_count": 2,
      "yellow_alert_count": 6
    }
  ]
}
```

---

## 六、量表题库

### 页面：C-016 量表列表（`/scales`）

---

#### 6.1 量表分类列表

**前端触发：** 页面 mounted，用于左侧分类树

```
GET /api/v1/scale-categories
```

**Response data：**

```json
{
  "list": [
    {
      "id": 1,
      "name": "情绪类",
      "description": "抑郁、焦虑、情绪调节相关量表",
      "scale_count": 18,
      "sort_order": 1
    }
  ]
}
```

---

#### 6.2 量表列表

```
GET /api/v1/scales?category_id=1&level=2&is_active=1&keyword=PHQ
```

**Query 参数：**

| 参数 | 说明 |
|------|------|
| category_id | 分类ID |
| level | 学段：1小学 2初中 3高中（applicable_levels 包含该值） |
| has_alert | `1` 只看含预警阈值的量表 |
| keyword | 名称模糊搜索 |
| is_system | `1` 系统内置，`0` 自建 |

**Response data：**

```json
{
  "list": [
    {
      "id": 1,
      "category_id": 1,
      "name": "PHQ-9 患者健康问卷（抑郁版）",
      "short_name": "PHQ-9",
      "description": "用于筛查抑郁症状的9题标准化量表",
      "applicable_levels": [2, 3],
      "question_count": 9,
      "estimated_mins": 5,
      "scoring_type": "total",
      "has_alert_config": true,
      "is_system": 1,
      "is_active": 1
    }
  ],
  "total": 18
}
```

---

### 页面：C-017 量表详情（`/scales/:id`）

---

#### 6.3 量表详情（含题目）

```
GET /api/v1/scales/:id
```

**Response data：**

```json
{
  "id": 1,
  "name": "PHQ-9 患者健康问卷（抑郁版）",
  "short_name": "PHQ-9",
  "description": "...",
  "instruction": "在过去两周内，下列症状出现的频率如何？请选择最符合您情况的选项。",
  "applicable_levels": [2, 3],
  "min_age": 12,
  "max_age": 18,
  "question_count": 9,
  "estimated_mins": 5,
  "scoring_type": "total",
  "scoring_rule": {
    "method": "sum",
    "reverse_items": []
  },
  "result_levels": [
    { "range": [0, 4],  "level": "normal",          "label": "无抑郁",      "alert": null },
    { "range": [5, 9],  "level": "mild",             "label": "轻度抑郁",    "alert": "yellow" },
    { "range": [10, 14],"level": "moderate",         "label": "中度抑郁",    "alert": "yellow" },
    { "range": [15, 19],"level": "moderate_severe",  "label": "中重度抑郁",  "alert": "red" },
    { "range": [20, 27],"level": "severe",           "label": "重度抑郁",    "alert": "red" }
  ],
  "alert_rules": {
    "item_rules": [
      {
        "question_no": 9,
        "condition": "value >= 2",
        "alert": "red",
        "reason": "第9题（自伤意念）得分≥2，直接触发红色预警"
      }
    ]
  },
  "min_interval_days": 30,
  "questions": [
    {
      "id": 101,
      "question_no": 1,
      "question_text": "做什么事都提不起劲或没有兴趣",
      "question_type": "likert",
      "options": [
        { "value": 0, "label": "完全没有", "score": 0 },
        { "value": 1, "label": "有几天",   "score": 1 },
        { "value": 2, "label": "超过一半天数", "score": 2 },
        { "value": 3, "label": "几乎每天", "score": 3 }
      ],
      "reverse_score": 0,
      "subscale_key": null,
      "is_required": 1,
      "is_alert_item": false
    },
    {
      "id": 109,
      "question_no": 9,
      "question_text": "有不如死掉或用某种方式伤害自己的念头",
      "question_type": "likert",
      "options": [...],
      "is_alert_item": true,
      "alert_rule": "value >= 2 直接触发红色预警"
    }
  ]
}
```

---

## 七、学生 H5 端

### 身份验证与答题流程

---

#### 7.1 H5 身份验证

```
POST /api/v1/h5/verify
```

**Request Body：**

```json
{
  "student_no": "2023042",
  "phone": "13812345678",
  "sms_code": "123456",
  "tenant_code": "school_001"
}
```

**Response data：**

```json
{
  "token": "h5_student_token...",
  "student": {
    "id": 3001,
    "name": "李梦瑶",
    "class_name": "初二(3)班",
    "pending_task_count": 2
  }
}
```

**前端处理：**

```
token 存入 sessionStorage（key: xq_h5_token），H5端不用 localStorage（隐私保护）
跳转 /h5/tasks
```

---

#### 7.2 获取我的待完成测评

**前端触发：** H5任务列表页 mounted

```
GET /api/v1/h5/tasks
```

**Response data：**

```json
{
  "pending": [
    {
      "task_id": 5001,
      "plan_title": "2025春季开学心理普测",
      "scale_id": 1,
      "scale_name": "PHQ-9 患者健康问卷",
      "scale_short": "PHQ-9",
      "question_count": 9,
      "estimated_mins": 5,
      "end_time": "2025-03-21T23:59:59+08:00",
      "status": "pending",
      "answered_count": 0,
      "is_urgent": false
    }
  ],
  "completed": [
    {
      "task_id": 4001,
      "scale_name": "GAD-7",
      "submit_time": "2025-03-10T10:30:00+08:00",
      "status": "completed"
    }
  ]
}
```

---

#### 7.3 获取测评题目（开始作答）

**前端触发：** H5作答页 mounted，调用一次拉取全部题目，之后纯前端翻页

```
GET /api/v1/h5/tasks/:taskId/questions
```

**Response data：**

```json
{
  "task_id": 5001,
  "scale_name": "PHQ-9",
  "instruction": "在过去两周内，下列症状出现的频率如何？",
  "question_count": 9,
  "estimated_mins": 5,
  "questions": [
    {
      "id": 101,
      "question_no": 1,
      "question_text": "做什么事都提不起劲或没有兴趣",
      "question_type": "likert",
      "options": [
        { "value": 0, "label": "完全没有" },
        { "value": 1, "label": "有几天" },
        { "value": 2, "label": "超过一半天数" },
        { "value": 3, "label": "几乎每天" }
      ],
      "is_required": true
    }
  ],
  "saved_answers": [
    { "question_id": 101, "value": 2 }
  ]
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| saved_answers | 上次未提交的暂存答案，前端用于恢复进度 |
| options 中不含 score 字段 | **前端不能知道每题分值，防止刷题** |

---

#### 7.4 暂存答案（自动触发）

**前端触发：** 每次切题自动调用（防抖 2s）

```
POST /api/v1/h5/tasks/:taskId/save-progress
```

**Request Body：**

```json
{
  "answers": [
    { "question_id": 101, "value": 2 },
    { "question_id": 102, "value": 1 }
  ]
}
```

**Response data：** `{}` （静默调用，失败不提示用户）

---

#### 7.5 提交答卷

**前端触发：** H5确认提交页 → "确认提交"按钮

```
POST /api/v1/h5/tasks/:taskId/submit
```

**Request Body：**

```json
{
  "answers": [
    { "question_id": 101, "value": 2 },
    { "question_id": 102, "value": 1 },
    { "question_id": 103, "value": 3 },
    { "question_id": 104, "value": 0 },
    { "question_id": 105, "value": 2 },
    { "question_id": 106, "value": 1 },
    { "question_id": 107, "value": 2 },
    { "question_id": 108, "value": 1 },
    { "question_id": 109, "value": 3 }
  ],
  "duration_seconds": 312
}
```

**Response data：**

```json
{
  "task_id": 5001,
  "status": "completed",
  "next_task": {
    "task_id": 5002,
    "scale_name": "GAD-7",
    "question_count": 7
  }
}
```

**字段说明：**

| 字段 | 前端用途 |
|------|----------|
| next_task | 不为 null → 完成页展示"还有 1 份待完成，是否继续？" |
| **不返回得分** | 保护隐私，完成页只展示鼓励文案 |

**前端处理：**

```
成功 → 清除 sessionStorage 中该 taskId 的暂存 → 跳转 /h5/tasks/:taskId/done
失败 code=2003（已提交）→ 弹提示"该测评已提交，无法重复提交"
```

---

## 八、数据看板

### 页面：C-022 班级看板（`/dashboard/class`）

---

#### 8.1 班级看板数据

**前端触发：** 选定班级和计划后点击"查看"

```
GET /api/v1/dashboard/class/:classId?plan_id=101
```

**Response data：**

```json
{
  "class": {
    "id": 201,
    "name": "初二(3)班",
    "grade_name": "初二",
    "student_count": 50,
    "homeroom_teacher": "王明"
  },
  "plan": {
    "id": 101,
    "title": "2025春季开学心理普测",
    "end_time": "2025-03-21T23:59:59+08:00"
  },
  "completion": {
    "completed": 46,
    "total": 50,
    "rate": 0.92,
    "pending_students": [
      { "id": 3010, "name": "赵某某", "student_no": "2023010" }
    ]
  },
  "risk_distribution": {
    "normal": 38,
    "yellow": 6,
    "red": 2,
    "incomplete": 4
  },
  "scale_scores": [
    {
      "scale_id": 1,
      "scale_short": "PHQ-9",
      "class_avg": 4.2,
      "grade_avg": 3.8,
      "school_avg": 3.5,
      "high_risk_rate": 0.04
    },
    {
      "scale_id": 2,
      "scale_short": "GAD-7",
      "class_avg": 6.8,
      "grade_avg": 5.1,
      "school_avg": 4.9,
      "high_risk_rate": 0.06
    }
  ],
  "auto_insight": "焦虑（GAD-7）维度班级均分6.8分，显著高于年级均分5.1分，建议关注该班级焦虑情绪状况。",
  "students": [
    {
      "id": 3001,
      "name": "李梦瑶",
      "student_no": "2023042",
      "scores": {
        "PHQ-9": { "score": 22, "level": "severe", "alert": "red" },
        "GAD-7": { "score": 8,  "level": "mild",   "alert": null },
        "PSS-10":{ "score": 22, "level": "moderate","alert": "yellow" }
      },
      "overall_status": "high_risk"
    }
  ]
}
```

---

### 页面：C-001 工作台 → 学生档案看板（`/dashboard/student/:id`）

---

#### 8.2 学生档案看板数据

```
GET /api/v1/dashboard/student/:studentId
```

**Response data：**

```json
{
  "student": { "id": 3001, "name": "李梦瑶", "class_name": "初二(3)班" },
  "health_score": 32,
  "health_score_label": "需重点关注",
  "risk_level": "high_risk",
  "longitudinal": {
    "labels": ["2024-09-05", "2024-12-10", "2025-03-17"],
    "datasets": [
      { "scale": "PHQ-9", "scores": [8, 15, 22], "normalized": [29.6, 55.6, 81.5] },
      { "scale": "GAD-7", "scores": [3, 6, 8],   "normalized": [14.3, 28.6, 38.1] }
    ],
    "events": [
      { "date": "2025-01-15", "type": "case_open", "label": "建立个案" },
      { "date": "2025-03-17", "type": "red_alert", "label": "红色预警" }
    ]
  },
  "radar": {
    "dimensions": ["抑郁", "焦虑", "压力", "人际", "睡眠"],
    "current":  [81, 38, 55, 20, 45],
    "previous": [56, 29, 40, 18, 50],
    "baseline": [30, 14, 30, 15, 30]
  }
}
```

**前端图表说明：**

```
longitudinal → 折线图
  events → 在对应日期打标注点（△图标），hover显示 label

radar → 雷达图
  三层叠加：current（实线红）/ previous（虚线橙）/ baseline（虚线灰）
```

---

## 九、管理员端

### 页面：A-002 账号管理（`/admin/users`）

---

#### 9.1 用户列表

```
GET /api/v1/admin/users?role=counselor&status=1&keyword=张&page=1&page_size=20
```

**Response data：**

```json
{
  "list": [
    {
      "id": 1001,
      "username": "counselor_zhang",
      "real_name": "张晓慧",
      "role": "counselor",
      "role_label": "心理教师",
      "phone": "138****5678",
      "status": 1,
      "status_label": "正常",
      "last_login_at": "2025-03-17T08:00:00+08:00",
      "class_names": []
    }
  ],
  "total": 12
}
```

---

#### 9.2 批量导入学生

**前端触发：** 上传 Excel 文件

```
POST /api/v1/admin/students/import
Content-Type: multipart/form-data
```

**Request：** FormData，字段 `file`（.xlsx 文件）

**Response data：**

```json
{
  "total": 500,
  "success": 496,
  "failed": 4,
  "errors": [
    { "row": 12, "student_no": "2023012", "reason": "班级不存在：初三(7)班" },
    { "row": 35, "student_no": "2023035", "reason": "学号重复" }
  ]
}
```

**前端处理：**

```
success > 0 → a-message.success(`成功导入 ${success} 名学生`)
failed > 0  → 展示错误明细表格，提供"下载错误明细"按钮
```

---

## 十、通知消息

---

#### 10.1 未读通知数（Topbar 铃铛角标）

**前端触发：** 登录后轮询，间隔 30s

```
GET /api/v1/notifications/unread-count
```

**Response data：** `{ "count": 3 }`

---

#### 10.2 通知列表

**前端触发：** 点击铃铛，展开抽屉

```
GET /api/v1/notifications?is_read=0&page=1&page_size=20
```

**Response data：**

```json
{
  "list": [
    {
      "id": 7001,
      "type": "alert",
      "title": "新红色预警",
      "content": "李梦瑶 · PHQ-9 · 22分 · 触发红色预警",
      "ref_id": 2001,
      "ref_type": "alert",
      "is_read": 0,
      "created_at": "2025-03-17T09:23:05+08:00"
    }
  ],
  "total": 3,
  "unread_count": 3
}
```

**前端处理：**

```
点击通知条目 → 标记已读 + 跳转至对应页面
  ref_type=alert  → /alerts/:ref_id
  ref_type=task   → /plans/:ref_id
  ref_type=system → 不跳转，仅展开详情
```

---

#### 10.3 标记已读

```
POST /api/v1/notifications/mark-read
```

**Request Body：** `{ "ids": [7001, 7002] }` 或 `{ "all": true }`

---

## 附录一：前端 Axios 统一拦截器配置

```javascript
// src/utils/request.js

import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// 请求拦截：注入 token 和租户信息
request.interceptors.request.use(config => {
  const token = localStorage.getItem('xq_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const tenantCode = localStorage.getItem('xq_tenant_code')
  if (tenantCode) config.headers['X-Tenant-Code'] = tenantCode
  return config
})

// 响应拦截：统一处理错误
request.interceptors.response.use(
  res => {
    const { code, message, data } = res.data
    if (code === 0) return data
    // 业务错误
    if (code === 1001) {
      localStorage.clear()
      router.push('/login')
      return Promise.reject(new Error(message))
    }
    if (code === 1002) {
      return refreshTokenAndRetry(res.config)
    }
    if (code === 1003) {
      ElMessage.error('无操作权限')
      return Promise.reject(new Error(message))
    }
    if (code === 5001) {
      ElMessage.error('系统异常，请稍后重试')
      return Promise.reject(new Error(message))
    }
    // code=2001/2002/2003 等业务错误，直接抛出，由调用方处理
    return Promise.reject({ code, message })
  },
  err => {
    if (err.response?.status === 502 || err.response?.status === 503) {
      ElMessage.error('服务暂时不可用，请稍后重试')
    }
    return Promise.reject(err)
  }
)

export default request
```

---

## 附录二：后端接口响应时间要求

| 接口类型 | P95 响应时间 | 说明 |
|----------|-------------|------|
| 登录 | < 500ms | — |
| 列表查询（带分页） | < 300ms | 需建好索引 |
| 详情查询 | < 200ms | — |
| 答卷提交 + 评分 | < 1000ms | 评分引擎同步执行 |
| 预警触发（评分后）| 异步，< 5s | 通知走消息队列 |
| 报告导出 | < 10s | 异步生成，轮询状态 |
| 批量导入500人 | < 30s | 进度条反馈 |

---

## 附录三：联调顺序建议

前后端联调建议按以下顺序进行，从最核心的闭环开始，逐层展开：

**第一轮（核心闭环，优先级最高）**

```
1. 登录 → 获取用户信息 → 存token → 跳转dashboard
2. 学生H5端：verify → 获取任务 → 拉题 → 暂存 → 提交
3. 教师端：工作台KPI → 待处理预警列表
4. 预警详情 → 确认接收 → 添加跟进
```

**第二轮（测评管理）**

```
5. 量表列表 → 量表详情（题目预览）
6. 新建测评计划（全流程5步）→ 发布 → 计划进度
7. 测评记录列表
```

**第三轮（学生档案）**

```
8. 学生列表 → 学生详情（6个Tab全部）
9. 班级看板
10. 学生档案看板（雷达图+折线图）
```

**第四轮（管理员端）**

```
11. 用户管理CRUD
12. 班级管理
13. 学生批量导入
14. 通知消息系统
```

---

### 第一轮实现对照（与当前代码）

| 附录三步骤 | 实现说明 |
|------------|----------|
| 登录 → dashboard | PC：`POST /api/v1/auth/login`，学生账号跳转 `/h5/tasks` 并写入 H5 会话；教师/管理员进 `/dashboard`。 |
| H5：verify → 任务 → 拉题 → 暂存 → 提交 | `POST /api/v1/h5/verify`（账号密码，学生）；`GET /api/v1/h5/tasks`；`GET /api/v1/h5/tasks/:id/questions`（选项不含 score）；`POST .../save-progress`；`POST .../submit`。H5 Token 存 `sessionStorage`（`xq_h5_token`）。 |
| 文档 7.1 短信验证 | 未实现；第一轮用学号+密码等同验证。 |

**联调前请执行：** `npm run db:seed`（会创建「【联调】演示测评计划」及全班 PHQ-9 待办任务，便于学生 `student001` 等作答）。

---

### 第一轮前端实现摘要（与附录三步骤 1～2 对齐）

| 附录三 | 实现说明 |
|--------|----------|
| **1. 登录 → token → dashboard** | PC：`POST /api/v1/auth/login`，写入 `xq_token` / `xq_refresh_token` / `xq_tenant_code`，再 `GET /api/v1/auth/me` 写入 Pinia。**学生账号**（`role=student`）同步将 token 写入 `sessionStorage.xq_h5_token`，跳转 `/h5/tasks`（与 H5 共用学生 JWT）。教师/管理员进 `/dashboard`；多角色时进 `/select-role`。 |
| **2. H5：verify → 任务 → 拉题 → 暂存 → 提交** | `POST /api/v1/h5/verify`（`tenant_code` + **学号或用户名** + `password`，后端 `loginByUsernameOrStudentNo`）。Token 仅存 **`sessionStorage.xq_h5_token`**（与 PC 隔离）。`GET /h5/tasks` → 列表；`GET /h5/tasks/:taskId/questions`（选项无 score）；作答页 **2s 防抖** `POST .../save-progress`；**确认页** `POST .../submit`（漏题按 0 分提交）。 |

**本地联调：** 后端默认 `:3002`，前端 Vite 将 `/api` 代理到该端口。演示：`demo_school`，学号 **`20240001`** 或用户名 **`student001`**，密码 **`123456`**。H5 入口：`/h5/verify`。
