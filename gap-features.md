# 心晴平台 — 差距补齐开发文档 v1.0

> 基于现有 phase1-mvp.md 数据结构和 integration-guide.md 接口规范扩展
> 本文档覆盖 5 个与竞品的差距模块，前后端直接参考开发
> 优先级：P0 人工上报预警 → P1 咨询预约 → P1 学生端扩展 → P2 家长端 → P2 数据报告

---

## 目录

1. 模块一：人工上报预警（P0）
2. 模块二：咨询预约排班（P1）
3. 模块三：学生端功能扩展（P1）
4. 模块四：家长端（P2）
5. 模块五：数据报告深化（P2）

---

## 模块一：人工上报预警（P0）

### 1.1 功能说明

班主任或心理老师发现学生异常时，可不依赖量表测评，直接在系统手动上报危机预警。
与现有量表自动预警并列，共同进入统一的预警处置流程。

### 1.2 数据库新增

```sql
-- 在现有 alerts 表新增字段
ALTER TABLE alerts
  ADD COLUMN source ENUM('assessment','manual','ai_chat') DEFAULT 'assessment'
    COMMENT '预警来源：量表评估/人工上报/AI倾诉',
  ADD COLUMN reporter_id BIGINT COMMENT '上报人ID（人工上报时必填）',
  ADD COLUMN report_reason TEXT COMMENT '上报原因（人工上报时必填）',
  ADD COLUMN report_evidence TEXT COMMENT '佐证描述（目击情况/学生言语等）',
  ADD COLUMN report_urgency ENUM('normal','urgent','critical') DEFAULT 'normal'
    COMMENT '紧迫程度：一般/紧急/极度危机';

-- 新增索引
ALTER TABLE alerts ADD INDEX idx_source (source);
ALTER TABLE alerts ADD INDEX idx_reporter (reporter_id);
```

### 1.3 后端接口

#### 1.3.1 人工上报预警

```
POST /api/v1/alerts/manual-report
权限：teacher / counselor / doctor
```

**Request Body：**

```json
{
  "student_id": 3001,
  "alert_level": "red",
  "report_reason": "学生今日上课期间情绪崩溃，自述不想活了",
  "report_evidence": "第三节语文课课间，学生独自在走廊哭泣，询问后说出上述内容",
  "report_urgency": "critical",
  "assign_to": 1001
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| student_id | number | ✓ | 学生ID |
| alert_level | string | ✓ | red / yellow |
| report_reason | string | ✓ | 上报原因，最少20字 |
| report_evidence | string | 否 | 目击情况描述 |
| report_urgency | string | ✓ | normal / urgent / critical |
| assign_to | number | 否 | 指定处置人，不填则默认通知全部心理老师 |

**Response data：**

```json
{
  "alert_id": 2008,
  "status": "pending",
  "source": "manual",
  "notify_count": 2,
  "message": "预警已创建，已通知 2 名心理教师"
}
```

**后端逻辑：**

```
1. 创建 alerts 记录，source='manual'，reporter_id=当前用户ID
2. alert_level='red' → 立即触发通知（同现有量表红色预警逻辑）
3. report_urgency='critical' → 额外通知学校分管领导
4. 写入 alert_logs：action='manual_report'，content=report_reason
5. 写入 notifications 表，to_user_id=assign_to 或全部 counselor
```

---

#### 1.3.2 获取上报人信息（上报表单用）

```
GET /api/v1/alerts/manual-report/counselors
权限：teacher / counselor / doctor
```

**Response data：**

```json
{
  "counselors": [
    { "id": 1001, "real_name": "张晓慧", "role": "counselor" },
    { "id": 1002, "real_name": "李建国", "role": "counselor" }
  ]
}
```

---

#### 1.3.3 预警列表接口扩展（现有接口新增参数）

在现有 `GET /api/v1/alerts` 基础上新增：

```
GET /api/v1/alerts?source=manual
```

| 新增参数 | 说明 |
|----------|------|
| source | assessment / manual / ai_chat，不传则全部 |

**Response list 对象新增字段：**

```json
{
  "source": "manual",
  "source_label": "人工上报",
  "reporter_name": "王明（班主任）",
  "report_urgency": "critical",
  "report_urgency_label": "极度危机"
}
```

---

### 1.4 前端页面

#### 1.4.1 危机上报按钮（全局悬浮）

所有页面右下角固定一个红色悬浮按钮：

```
位置：fixed，right: 24px，bottom: 24px
样式：圆形，直径 52px，背景 #D92D20，白色感叹号图标
hover：transform scale(1.05)，box-shadow
点击：打开上报 Modal
```

#### 1.4.2 人工上报 Modal

```
标题："危机上报"
宽度：520px

表单字段：

[选择学生] a-select 带搜索
  搜索接口：GET /api/v1/students?keyword=xxx&page_size=20
  展示：姓名 + 班级

[预警等级] a-radio-group
  ○ 黄色预警（需关注）
  ● 红色预警（紧急危机）

[紧迫程度] a-radio-group（红色预警才显示）
  ○ 紧急   ● 极度危机

[上报原因] a-textarea rows:4 必填 最少20字
  placeholder："请描述观察到的异常情况，如：学生言语、行为表现等"

[佐证描述] a-textarea rows:3
  placeholder："发生时间、地点、在场人员等（选填）"

[指派处置人] a-select
  接口：GET /api/v1/alerts/manual-report/counselors
  placeholder："不填则通知全部心理老师"

底部：
  [取消]  [确认上报]（红色按钮）

确认上报前弹 a-popconfirm：
  "确认上报该学生的危机预警？上报后将立即通知心理老师。"
```

#### 1.4.3 预警列表页扩展

在现有预警列表页顶部 Tab 新增来源筛选：

```
现有：全部 / 红色 / 黄色 / 已关闭
新增 Tab：全部来源 / 量表评估 / 人工上报

人工上报的预警行，"触发量表"列改为显示：
  a-tag color:purple "人工上报" + 上报人姓名
```

#### 1.4.4 预警详情页扩展

人工上报的预警详情，"触发测评结果"区块替换为"上报详情"：

```
上报人：王明（班主任 · 初二3班）
上报时间：2025-03-18 10:30
紧迫程度：极度危机（红色 tag）
上报原因：（正文展示）
佐证描述：（正文展示）
```

---

## 模块二：咨询预约排班（P1）

### 2.1 功能说明

心理老师设置每周可预约时间段，学生在H5端主动提交预约申请，
老师在PC端审核确认，双方在约定时间进行线下咨询。
咨询完成后老师记录咨询过程，自动归入个案档案。

### 2.2 数据库新增

```sql
-- 咨询排班表
CREATE TABLE consult_schedules (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL,
    weekday         TINYINT NOT NULL COMMENT '星期几：1-7',
    start_time      TIME NOT NULL COMMENT '开始时间如 09:00:00',
    end_time        TIME NOT NULL COMMENT '结束时间如 10:00:00',
    max_slots       INT DEFAULT 1 COMMENT '该时段最多预约人数',
    location        VARCHAR(100) COMMENT '咨询地点',
    is_active       TINYINT DEFAULT 1,
    effective_from  DATE COMMENT '生效日期',
    effective_until DATE COMMENT '失效日期（null=长期有效）',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_counselor (tenant_id, counselor_id, is_active)
) COMMENT '心理老师咨询排班';

-- 预约申请表
CREATE TABLE consult_appointments (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL,
    schedule_id     BIGINT NOT NULL,
    appoint_date    DATE NOT NULL COMMENT '预约日期',
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    reason          TEXT COMMENT '预约原因（学生填写）',
    status          ENUM('pending','confirmed','completed','cancelled','no_show')
                    DEFAULT 'pending',
    cancel_reason   TEXT COMMENT '取消原因',
    location        VARCHAR(100),
    remind_sent     TINYINT DEFAULT 0 COMMENT '是否已发提醒',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id),
    INDEX idx_counselor_date (counselor_id, appoint_date),
    INDEX idx_status (status)
) COMMENT '咨询预约记录';

-- 咨询会谈记录表（扩展现有 case_records）
-- 在现有 case_records 表新增字段
ALTER TABLE case_records
  ADD COLUMN appointment_id BIGINT COMMENT '关联预约ID（预约咨询时关联）',
  ADD COLUMN consult_type ENUM('walk_in','appointment','crisis') DEFAULT 'walk_in'
    COMMENT '咨询类型：自来访/预约/危机干预';
```

### 2.3 后端接口

#### 2.3.1 获取排班列表（老师查看自己的排班）

```
GET /api/v1/consult/schedules
权限：counselor / doctor
```

**Response data：**

```json
{
  "list": [
    {
      "id": 1,
      "weekday": 1,
      "weekday_label": "周一",
      "start_time": "09:00",
      "end_time": "10:00",
      "max_slots": 2,
      "location": "心理咨询室A",
      "is_active": 1,
      "booked_count_this_week": 1
    }
  ]
}
```

---

#### 2.3.2 创建/更新排班

```
POST /api/v1/consult/schedules
PUT  /api/v1/consult/schedules/:id
权限：counselor / doctor
```

**Request Body：**

```json
{
  "weekday": 1,
  "start_time": "09:00",
  "end_time": "10:00",
  "max_slots": 2,
  "location": "心理咨询室A",
  "effective_from": "2025-03-18",
  "effective_until": null
}
```

---

#### 2.3.3 获取可预约时间段（H5学生端）

```
GET /api/v1/h5/consult/available-slots?date_from=2025-03-18&date_to=2025-03-25
权限：student（H5 token）
```

**Response data：**

```json
{
  "slots": [
    {
      "schedule_id": 1,
      "counselor_id": 1001,
      "counselor_name": "张晓慧",
      "date": "2025-03-18",
      "weekday_label": "周一",
      "start_time": "09:00",
      "end_time": "10:00",
      "location": "心理咨询室A",
      "remaining_slots": 1,
      "is_available": true
    }
  ]
}
```

---

#### 2.3.4 学生提交预约

```
POST /api/v1/h5/consult/appointments
权限：student（H5 token）
```

**Request Body：**

```json
{
  "schedule_id": 1,
  "appoint_date": "2025-03-18",
  "reason": "最近压力很大，想和老师谈谈"
}
```

**Response data：**

```json
{
  "appointment_id": 101,
  "status": "pending",
  "message": "预约申请已提交，请等待老师确认"
}
```

**后端逻辑：**

```
1. 检查该时段 remaining_slots > 0
2. 检查该学生当天是否已有预约
3. 创建 appointment 记录
4. 发通知给对应 counselor
5. 返回预约信息
```

---

#### 2.3.5 老师确认/取消预约

```
POST /api/v1/consult/appointments/:id/confirm
POST /api/v1/consult/appointments/:id/cancel
权限：counselor / doctor
```

**confirm Request Body：** `{}`

**cancel Request Body：**

```json
{
  "cancel_reason": "该时段临时有紧急事务，已联系学生改约"
}
```

---

#### 2.3.6 预约列表（老师端）

```
GET /api/v1/consult/appointments
权限：counselor / doctor
```

**Query 参数：**

| 参数 | 说明 |
|------|------|
| status | pending / confirmed / completed / cancelled |
| date | 指定日期 YYYY-MM-DD |
| week | 本周 this_week / 下周 next_week |

**Response data：**

```json
{
  "list": [
    {
      "id": 101,
      "student_id": 3001,
      "student_name": "李梦瑶",
      "class_name": "初二(3)班",
      "appoint_date": "2025-03-18",
      "start_time": "09:00",
      "end_time": "10:00",
      "location": "心理咨询室A",
      "reason": "最近压力很大，想和老师谈谈",
      "status": "pending",
      "status_label": "待确认",
      "created_at": "2025-03-16T14:30:00+08:00"
    }
  ],
  "total": 5,
  "pending_count": 2
}
```

---

#### 2.3.7 完成咨询并记录

```
POST /api/v1/consult/appointments/:id/complete
权限：counselor / doctor
```

**Request Body：**

```json
{
  "duration_mins": 50,
  "content": "学生主诉学业压力大，与父母关系紧张...",
  "student_mood": 3,
  "progress_note": "初次咨询，建立了基本信任关系",
  "next_plan": "建议下周继续约谈",
  "create_case": true
}
```

| 字段 | 说明 |
|------|------|
| create_case | true=如无个案则自动创建，false=仅记录 |

**后端逻辑：**

```
1. 更新 appointment status='completed'
2. 创建 case_records 记录，consult_type='appointment'，appointment_id 关联
3. create_case=true 且学生无个案 → 自动创建 case_files 记录
4. 发通知给学生（咨询记录已生成）
```

---

#### 2.3.8 学生查看自己的预约（H5端）

```
GET /api/v1/h5/consult/my-appointments
权限：student（H5 token）
```

**Response data：**

```json
{
  "upcoming": [
    {
      "id": 101,
      "counselor_name": "张晓慧",
      "appoint_date": "2025-03-18",
      "start_time": "09:00",
      "location": "心理咨询室A",
      "status": "confirmed",
      "status_label": "已确认"
    }
  ],
  "history": []
}
```

---

### 2.4 前端页面

#### 2.4.1 PC端：咨询排班管理（`/consult/schedule`）

```
页面布局：
  左侧：周历视图（周一到周五），每天显示已配置的时间段
  右侧：操作面板

周历每个时间块：
  显示：时间段 + 地点 + 本周已预约/最大数
  颜色：
    available（空余）→ 浅绿色背景
    full（满员）→ 浅灰色
    inactive（未启用）→ 白色虚线边框

右侧操作：
  [+ 新增时间段] 按钮
  点击已有时间块 → 显示编辑/删除/查看本周预约

新增/编辑 Modal：
  [星期] a-checkbox-group（可多选，一次配置多天）
  [开始时间] a-time-picker
  [结束时间] a-time-picker
  [最多人数] a-input-number min:1 max:5
  [咨询地点] a-input
  [生效日期] a-range-picker（选填）
```

#### 2.4.2 PC端：预约管理（`/consult/appointments`）

```
顶部 Tab：待确认（badge）/ 已确认 / 已完成 / 已取消

表格列：
  学生姓名 / 班级 / 预约日期+时间 / 地点 / 预约原因（省略） / 状态 / 操作

操作列：
  pending → [确认] [取消]
  confirmed → [记录完成] [取消]
  completed → [查看记录]

[记录完成] 点击打开 Modal（同现有个案会谈记录 Modal，新增 create_case 开关）
```

#### 2.4.3 H5端：预约咨询页（`/h5/consult`）

```
入口：H5任务列表页底部新增"预约咨询"入口卡片

预约页面结构：
  标题："预约心理咨询"
  说明："所有对话严格保密，请放心预约"

  日期选择（横向滚动，未来7天）：
    van-tabs 水平滚动：周一 3/18 / 周二 3/19 / ...
    选中日期高亮

  可选时间段列表（van-cell-group）：
    每项：张晓慧老师 · 09:00-10:00 · 心理咨询室A · 剩余1个名额
    已满：灰色 disabled

  预约原因（van-field textarea）：
    placeholder："简单说说你想聊的内容，帮老师提前了解（选填）"

  [提交预约] van-button type:primary block

提交成功页：
  图标（绿色对勾）
  "预约成功！请等待老师确认"
  "确认后你会收到通知"
  预约信息摘要（日期/时间/老师/地点）
```

---

## 模块三：学生端功能扩展（P1）

### 3.1 功能说明

在现有H5答题端基础上扩展三个功能：
自助调适（心理健康文章/练习）、AI倾诉（聊天 + 预警识别）、我的预约（查看预约状态）。

### 3.2 数据库新增

```sql
-- 自助调适内容表
CREATE TABLE wellness_articles (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT COMMENT 'null=系统内容，有值=学校自建',
    title           VARCHAR(200) NOT NULL,
    category        ENUM('emotion','stress','relationship','sleep','self') NOT NULL,
    category_label  VARCHAR(20) COMMENT '分类中文名',
    content         LONGTEXT NOT NULL COMMENT 'Markdown格式',
    cover_image     VARCHAR(500),
    read_mins       INT DEFAULT 5,
    is_published    TINYINT DEFAULT 1,
    view_count      INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category, is_published)
) COMMENT '自助调适内容库';

-- AI倾诉对话记录表
CREATE TABLE ai_chat_sessions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME,
    message_count   INT DEFAULT 0,
    risk_detected   TINYINT DEFAULT 0 COMMENT '是否检测到风险',
    risk_level      ENUM('none','low','medium','high') DEFAULT 'none',
    alert_triggered TINYINT DEFAULT 0 COMMENT '是否已触发预警',
    alert_id        BIGINT COMMENT '关联预警ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id),
    INDEX idx_risk (risk_detected)
) COMMENT 'AI倾诉会话记录';

CREATE TABLE ai_chat_messages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id      BIGINT NOT NULL,
    role            ENUM('user','assistant') NOT NULL,
    content         TEXT NOT NULL,
    risk_score      DECIMAL(3,2) COMMENT '该条消息风险评分0-1',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id)
) COMMENT 'AI倾诉消息记录';
```

### 3.3 后端接口

#### 3.3.1 获取自助调适内容列表

```
GET /api/v1/h5/wellness/articles?category=emotion
权限：student（H5 token）
```

**Response data：**

```json
{
  "categories": [
    { "key": "emotion", "label": "情绪调节", "count": 12 },
    { "key": "stress",  "label": "压力应对", "count": 8 },
    { "key": "relationship", "label": "人际关系", "count": 6 },
    { "key": "sleep",   "label": "睡眠改善", "count": 5 },
    { "key": "self",    "label": "认识自己", "count": 7 }
  ],
  "list": [
    {
      "id": 1,
      "title": "当你感到焦虑时，试试这5个方法",
      "category": "emotion",
      "category_label": "情绪调节",
      "read_mins": 5,
      "cover_image": null,
      "view_count": 234
    }
  ],
  "total": 12
}
```

---

#### 3.3.2 获取文章详情

```
GET /api/v1/h5/wellness/articles/:id
权限：student（H5 token）
```

**Response data：**

```json
{
  "id": 1,
  "title": "当你感到焦虑时，试试这5个方法",
  "category_label": "情绪调节",
  "read_mins": 5,
  "content": "## 什么是焦虑？\n\n焦虑是...",
  "related": [
    { "id": 2, "title": "深呼吸练习：3分钟放松技巧" }
  ]
}
```

---

#### 3.3.3 开启 AI 倾诉会话

```
POST /api/v1/h5/ai-chat/sessions
权限：student（H5 token）
```

**Response data：**

```json
{
  "session_id": 501,
  "greeting": "你好，我在这里陪着你。今天想聊点什么？",
  "disclaimer": "我们的对话完全保密。如果我感到你需要帮助，我会建议你联系学校心理老师。"
}
```

---

#### 3.3.4 发送消息并获取回复

```
POST /api/v1/h5/ai-chat/sessions/:sessionId/messages
权限：student（H5 token）
```

**Request Body：**

```json
{
  "content": "我最近很难受，不想上学"
}
```

**Response data：**

```json
{
  "message_id": 1001,
  "reply": "听起来你现在很累。能跟我说说是什么让你觉得难受吗？",
  "risk_detected": false,
  "risk_level": "none",
  "crisis_prompt": null
}
```

**风险触发时 Response：**

```json
{
  "message_id": 1002,
  "reply": "我听到你说的了，我很担心你现在的状态。你愿意让我帮你联系一下学校的心理老师吗？",
  "risk_detected": true,
  "risk_level": "high",
  "crisis_prompt": {
    "show": true,
    "message": "我注意到你可能需要更多支持，学校心理老师随时可以帮助你",
    "action_label": "联系心理老师",
    "action_type": "trigger_alert"
  }
}
```

**后端逻辑（风险识别）：**

```
1. 将学生消息发给 AI（Claude API）
2. System prompt 中包含风险识别指令：
   识别以下关键词/语义：自杀/自残/不想活/伤害自己/死了算了
   检测到时在回复中设置 risk_level='high'
3. risk_level='high' → 更新 session.risk_detected=1
4. 如学生点击"联系心理老师" → 触发 manual alert（调用人工上报接口）
5. 所有消息存入 ai_chat_messages 表

AI System Prompt 参考：
"你是学校的心理健康陪伴助手，名字叫'小晴'。
你的角色是倾听和陪伴，不是诊断或治疗。
说话温柔、不评判、不说教。
如果学生表达了自伤、自杀或极度绝望的内容，
在回复中设置 risk_level='high'，并温和地建议联系老师。
每次回复不超过100字，用中文。"
```

---

#### 3.3.5 查看聊天历史（老师申请查看，需隐私授权）

```
GET /api/v1/ai-chat/sessions/:sessionId/messages
权限：counselor / doctor（需二次确认）
```

**此接口需要额外的确认步骤：**

```
1. 请求时需携带 confirm_reason 参数说明查看原因
2. 记录操作日志（谁、什么时间、为什么查看了哪个学生的对话）
3. Response 中同时返回消息列表和访问日志记录ID
```

**Response data：**

```json
{
  "session": {
    "id": 501,
    "student_name": "李梦瑶",
    "started_at": "2025-03-17T20:30:00+08:00",
    "message_count": 12,
    "risk_level": "high"
  },
  "messages": [
    {
      "id": 1001,
      "role": "user",
      "content": "我最近很难受，不想上学",
      "risk_score": 0.2,
      "created_at": "2025-03-17T20:31:00+08:00"
    }
  ],
  "access_log_id": 9001
}
```

---

### 3.4 H5端页面扩展

#### 3.4.1 H5首页改版（任务列表页扩展）

```
现有：只有测评任务列表
改为：底部导航 Tab 切换

底部导航（van-tabbar）：
  首页（测评任务）| 倾诉 | 调适 | 预约 | 我的

注意：底部导航项用图标+文字，图标简洁
```

#### 3.4.2 自助调适页（`/h5/wellness`）

```
顶部：分类横向滚动 Tab
  全部 / 情绪调节 / 压力应对 / 人际关系 / 睡眠改善 / 认识自己

文章列表（van-list）：
  每项：封面图（无则色块占位）+ 标题 + 分类tag + 阅读时长

文章详情页：
  van-nav-bar 返回
  标题（18px 500）
  分类 + 阅读时长
  正文（Markdown渲染，使用 marked.js）
  底部：相关推荐（2-3篇）
```

#### 3.4.3 AI倾诉页（`/h5/ai-chat`）

```
聊天界面（仿微信样式）：

顶部：
  van-nav-bar title:"小晴（心理陪伴）"
  右侧：结束对话按钮

聊天区域（滚动）：
  assistant消息：左对齐，浅绿色气泡
  user消息：右对齐，白色气泡
  时间戳：居中灰色小字（每隔5条显示一次）

风险检测到时：
  在消息流中插入提示卡片（不是弹窗，是内联卡片）：
  背景 #FFF1F0，左侧红色竖条
  "我注意到你可能需要更多支持"
  [联系心理老师] 按钮（点击触发预警）
  [继续聊天] 按钮

底部输入区：
  van-field type:textarea autosize（最多3行）
  发送按钮

免责说明（首次进入展示）：
  van-dialog：
  "对话内容保密保存。如检测到危机情况，系统会通知学校心理老师。
   心理老师可在必要时申请查看记录。"
  [我了解，开始聊天]
```

---

## 模块四：家长端（P2）

### 4.1 功能说明

家长通过微信小程序或H5，绑定子女账号后，可查看子女心理健康概况、
接收学校通知、参与家庭支持指导。
严格控制家长可见信息范围，保护学生隐私。

### 4.2 数据库扩展

（复用 phase2 文档中已设计的 parent_student_bindings 表）

```sql
-- 家长通知表（单独维护，与教师通知隔离）
CREATE TABLE parent_notifications (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL COMMENT '发送人（心理老师）',
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    notify_type     ENUM('health_summary','suggestion','alert_inform','general')
                    NOT NULL,
    is_read         TINYINT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id, is_read)
) COMMENT '家长通知记录';
```

### 4.3 后端接口

#### 4.3.1 家长绑定（H5/小程序）

```
POST /api/v1/parent/bind
无需鉴权（公开接口）
```

**Request Body：**

```json
{
  "phone": "13812345678",
  "sms_code": "123456",
  "student_no": "2023042",
  "tenant_code": "school_001",
  "relation": "mother"
}
```

**后端逻辑：**

```
1. 验证手机号短信验证码
2. 查找 student_no 对应学生
3. 验证 phone 是否在 students.guardian_phone 或 guardian2_phone 中
   （防止随意绑定他人子女）
4. 创建 parent_student_bindings 记录，status='verified'
5. 返回 parent_token（有效期7天）
```

**Response data：**

```json
{
  "token": "parent_token...",
  "student": {
    "name": "李梦瑶",
    "class_name": "初二(3)班",
    "relation": "母亲"
  }
}
```

---

#### 4.3.2 子女心理健康概况（家长可见）

```
GET /api/v1/parent/child/health-summary
权限：parent token
```

**Response data（严格脱敏）：**

```json
{
  "student_name": "李梦瑶",
  "class_name": "初二(3)班",
  "last_assessment_date": "2025-03-17",
  "overall_status": "needs_attention",
  "overall_status_label": "需要关注",
  "overall_status_desc": "孩子近期心理状态需要您的关注和支持",
  "trend": "declining",
  "trend_label": "近期有所下降",
  "assessment_count_this_semester": 3,
  "suggestions": [
    "多陪伴孩子，倾听她的想法",
    "减少对学业成绩的催促",
    "保证孩子规律的睡眠时间"
  ],
  "counselor_contact": {
    "name": "张晓慧",
    "title": "心理教师",
    "available_time": "工作日 9:00-17:00"
  }
}
```

**重要约束：**

```
家长端绝对不能返回的字段：
  × 具体量表名称
  × 具体测评得分
  × 预警等级和原因
  × 会谈内容
  × 个案详情

只返回：
  ✓ 三档状态（正常/需关注/需特别关注）
  ✓ 上次测评时间
  ✓ 本学期测评参与次数
  ✓ 学校心理老师联系方式
  ✓ 家庭支持建议（通用建议，非针对具体问题）
```

---

#### 4.3.3 家长接收通知

```
GET /api/v1/parent/notifications
权限：parent token
```

**Response data：**

```json
{
  "list": [
    {
      "id": 8001,
      "title": "关于孩子近期状态的家庭支持建议",
      "content": "您好，学校心理老师建议您近期多关注孩子的情绪状态...",
      "notify_type": "suggestion",
      "is_read": 0,
      "created_at": "2025-03-17T14:00:00+08:00"
    }
  ],
  "unread_count": 1
}
```

---

#### 4.3.4 老师发送家长通知（PC端）

```
POST /api/v1/parent-notifications
权限：counselor
```

**Request Body：**

```json
{
  "student_id": 3001,
  "title": "关于孩子近期状态的家庭支持建议",
  "content": "您好，学校心理老师建议...",
  "notify_type": "suggestion"
}
```

**注意：** 此接口与现有 `POST /api/v1/students/:id/parent-comms` 不同，
parent-comms 是记录线下沟通，此接口是发送系统内通知给家长账号。

---

### 4.4 前端页面

#### 4.4.1 PC端：发送家长通知（学生详情页扩展）

在现有学生详情页"家长沟通" Tab 中新增：

```
顶部新增按钮：[发送系统通知给家长]
点击打开 Modal：
  [通知类型] a-select：健康概况 / 支持建议 / 一般通知
  [通知标题] a-input
  [通知内容] a-textarea
  注意提示（a-alert type:warning）：
    "通知内容将直接展示给家长，请勿包含具体测评分数和预警详情"
```

#### 4.4.2 H5家长端页面（独立路由 /parent/）

```
绑定页 /parent/bind：
  手机号 + 验证码 + 学号 → 验证身份 → 进入首页

首页 /parent/home：
  顶部：孩子姓名 + 班级
  状态卡（大号）：
    图标（笑脸/一般脸/担忧脸）
    状态文字（正常/需关注/需特别关注）
    上次测评时间
  家庭支持建议（3条，卡片展示）
  心理老师联系方式

通知列表 /parent/notifications：
  van-list 展示历史通知
  点击查看通知详情
```

---

## 模块五：数据报告深化（P2）

### 5.1 功能说明

在现有班级看板和学校看板基础上，新增：
个人测评报告PDF导出、历史横向对比分析、批量导出学生报告。

### 5.2 数据库新增

```sql
-- 报告生成记录表
CREATE TABLE report_tasks (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    creator_id      BIGINT NOT NULL,
    report_type     ENUM('student','class','school','batch_student') NOT NULL,
    ref_id          BIGINT COMMENT '关联ID（student_id/class_id/plan_id）',
    plan_id         BIGINT COMMENT '关联测评计划ID',
    params          JSON COMMENT '报告参数（对比维度、时间范围等）',
    status          ENUM('pending','generating','ready','failed') DEFAULT 'pending',
    file_url        VARCHAR(500),
    file_size       INT COMMENT '文件大小（bytes）',
    error_msg       TEXT,
    generated_at    DATETIME,
    expires_at      DATETIME COMMENT '下载链接过期时间',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_creator (tenant_id, creator_id),
    INDEX idx_status (status)
) COMMENT '报告生成任务';
```

### 5.3 后端接口

#### 5.3.1 生成学生个人报告

```
POST /api/v1/reports/student/:studentId
权限：counselor / doctor
```

**Request Body：**

```json
{
  "plan_id": 101,
  "include_history": true,
  "include_suggestions": true
}
```

**Response data：**

```json
{
  "task_id": 3001,
  "status": "pending",
  "estimated_seconds": 10,
  "message": "报告生成中，请稍候"
}
```

---

#### 5.3.2 轮询报告状态

```
GET /api/v1/reports/tasks/:taskId
权限：counselor / doctor
```

**Response data：**

```json
{
  "task_id": 3001,
  "status": "ready",
  "file_url": "/api/v1/reports/tasks/3001/download",
  "file_size": 245760,
  "generated_at": "2025-03-17T10:05:00+08:00",
  "expires_at": "2025-03-24T10:05:00+08:00"
}
```

---

#### 5.3.3 下载报告文件

```
GET /api/v1/reports/tasks/:taskId/download
权限：counselor / doctor
Response：文件流（PDF）
Content-Disposition: attachment; filename="李梦瑶-心理测评报告-2025-03.pdf"
```

---

#### 5.3.4 批量生成班级学生报告

```
POST /api/v1/reports/batch/class/:classId
权限：counselor / school_admin
```

**Request Body：**

```json
{
  "plan_id": 101,
  "student_ids": [3001, 3002, 3003],
  "include_suggestions": true
}
```

**Response data：**

```json
{
  "task_id": 3010,
  "total_students": 3,
  "status": "pending",
  "message": "批量报告生成中，完成后可下载ZIP压缩包"
}
```

---

#### 5.3.5 历史对比数据

```
GET /api/v1/dashboard/class/:classId/compare?plan_ids=101,98,95
权限：counselor / teacher
```

**Response data：**

```json
{
  "class_name": "初二(3)班",
  "plans": [
    { "id": 95, "title": "2024秋季开学普测", "date": "2024-09-05" },
    { "id": 98, "title": "2024期末普测",     "date": "2024-12-10" },
    { "id": 101,"title": "2025春季开学普测", "date": "2025-03-17" }
  ],
  "scale_trends": [
    {
      "scale_short": "PHQ-9",
      "data": [
        { "plan_id": 95,  "class_avg": 3.8, "high_risk_rate": 0.02 },
        { "plan_id": 98,  "class_avg": 4.1, "high_risk_rate": 0.03 },
        { "plan_id": 101, "class_avg": 4.2, "high_risk_rate": 0.04 }
      ]
    }
  ],
  "gender_compare": {
    "male":   { "PHQ-9": 3.9, "GAD-7": 5.8 },
    "female": { "PHQ-9": 4.5, "GAD-7": 7.2 }
  }
}
```

---

### 5.4 前端页面

#### 5.4.1 学生详情页：报告导出按钮

在现有档案头部操作区新增：

```
[导出个人报告] a-button icon:FilePdf
点击 → POST 生成报告 → 轮询状态（每2s一次）
状态变化：
  pending/generating：按钮变为 a-spin + "生成中..."（disabled）
  ready：按钮变为 [下载报告]（触发文件下载）
  failed：a-message.error("报告生成失败，请重试")
```

#### 5.4.2 班级看板：历史对比模块

在现有班级看板底部新增区块：

```
区块标题："历史趋势对比"

[选择对比计划] a-select multiple（最多选3个）
  从该班级的历史测评计划中选择
  选完后自动请求 /dashboard/class/:id/compare

图表：
  分组折线图，X轴=时间点（3个计划），Y轴=量表均分
  每个量表一条线，颜色区分

性别对比表格（a-table）：
  行：各量表
  列：男生均分 / 女生均分 / 差值
  差值列：负数（女生更高）用红色
```

#### 5.4.3 测评计划详情：批量导出

在现有计划详情页新增：

```
右上角 [批量导出学生报告] a-button icon:Download
点击打开 Modal：
  [选择学生范围]：全部完成学生 / 高风险学生 / 手动选择
  手动选择时：展示完成学生列表 a-transfer
  [导出格式]：单个PDF（ZIP打包）
  确认后：异步生成 → 完成后下载ZIP
```

---

## 开发优先级与排期

| 模块 | 优先级 | 估计工时 | 前置依赖 |
|------|--------|----------|----------|
| 人工上报预警 | P0 | 前端1天 + 后端1天 | 无 |
| 咨询预约排班 | P1 | 前端3天 + 后端2天 | 无 |
| 学生端扩展（自助调适）| P1 | 前端2天 + 后端1天 | 无 |
| 学生端扩展（AI倾诉）| P1 | 前端2天 + 后端3天 | Claude API Key |
| 家长端绑定+概况 | P2 | 前端2天 + 后端2天 | 无 |
| 家长端通知 | P2 | 前端1天 + 后端1天 | 家长绑定完成 |
| 个人报告PDF | P2 | 后端3天（PDF生成）| 无 |
| 历史对比分析 | P2 | 前端2天 + 后端1天 | 无 |
| 批量导出报告 | P2 | 前端1天 + 后端1天 | 个人报告完成 |

---

## 联调注意事项

### 与现有接口的关系

| 现有接口 | 本次变更 |
|----------|----------|
| `GET /api/v1/alerts` | 新增 `source` 筛选参数，response 新增 `source`/`reporter_name` 字段 |
| `GET /api/v1/alerts/:id` | response 新增 `source`/`report_urgency`/`report_evidence` 字段 |
| `POST /api/v1/students/:id/parent-comms` | 不变，新增独立的 parent-notifications 接口 |
| `GET /api/v1/h5/tasks` | H5首页改版后，此接口数据展示在"首页"Tab，不影响接口本身 |
| `GET /api/v1/dashboard/class/:classId` | 新增 compare 子接口，原接口不变 |

### AI倾诉接口特别说明

```
AI倾诉需要 Anthropic Claude API Key
在后端 .env 中配置：ANTHROPIC_API_KEY=sk-ant-...

后端实现建议：
  不要在每次消息都重新发送完整历史
  维护 session 内的消息历史（最近20条）
  System prompt 固定，每次请求携带 messages 数组
  流式返回（SSE）改善用户体验，或普通 JSON 返回均可
```

### 家长端隐私合规

```
家长端所有接口必须在 middleware 中验证：
  1. parent token 有效
  2. token 对应的 student_id 与请求的 student_id 一致
  3. 绑定状态 status='verified'

严禁返回的字段列表在接口注释中已标注，
后端代码 review 时重点检查 response 序列化逻辑。
```
