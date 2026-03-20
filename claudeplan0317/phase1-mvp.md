# 心理健康测评平台 — 一期工程开发文档（MVP）

> 目标：3-4个月交付可上线的核心测评闭环，支持1-2所学校试点运行  
> 技术栈：前端 Vue3 + 后端 Node.js/Python + MySQL + Redis

---

## 一、一期目标与范围

### 1.1 核心交付物

- 学生端：H5问卷填写页面（微信内打开）
- 老师端：测评管理 + 学生列表 + 预警查看
- 管理员端：学校/年级/班级配置
- 后台：题库管理 + 量表配置
- 数据层：个人档案 + 班级看板

### 1.2 一期明确不做的功能（避免范围蔓延）

- 地市级宏观看板（二期）
- 干预引导方案库（二期）
- 家长端通知（二期）
- AI辅助评估（三期）
- 移动App（三期）

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                          │
│  Vue3 SPA（老师/管理员端）  H5（学生问卷填写端）    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / RESTful API
┌──────────────────────▼──────────────────────────────┐
│               Nginx 反向代理 + 静态资源              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Node.js API 服务（Express）             │
│  路由层 → 中间件层（鉴权/日志/限流）→ 业务层        │
│  → 数据访问层（ORM: Prisma）                        │
└──────────┬───────────────────────────┬──────────────┘
           │                           │
┌──────────▼──────────┐   ┌────────────▼──────────────┐
│     MySQL 8.0       │   │      Redis（缓存/会话）    │
│   主库 + 从库读写   │   │                           │
└─────────────────────┘   └───────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术选型 | 选型理由 |
|------|----------|----------|
| 前端框架 | Vue 3 + Vite | 生态成熟，团队上手快 |
| UI组件库 | Element Plus | 后台管理场景覆盖完整 |
| 状态管理 | Pinia | Vue3官方推荐 |
| HTTP客户端 | Axios | 成熟稳定 |
| 后端框架 | Node.js + Express | 快速开发，JS全栈 |
| ORM | Prisma | 类型安全，迁移方便 |
| 数据库 | MySQL 8.0 | 关系型，适合本项目结构 |
| 缓存 | Redis 7 | 会话存储 + 热数据缓存 |
| 部署 | Docker Compose | 一键部署，易迁移 |
| 反向代理 | Nginx | 静态资源 + SSL 终止 |
| 文件存储 | 本地 / 阿里云OSS | 导出报告存储 |

### 2.3 多租户设计（一期简化版）

一期采用**共享数据库 + 行级隔离**方案：

- 每张核心业务表增加 `tenant_id`（对应学校ID）字段
- 所有查询强制带 `tenant_id` 条件，通过中间件注入
- 不同学校数据逻辑隔离，共享底层数据库
- 二期升级为多Schema或多库方案（地市版需要）

---

## 三、数据库设计

### 3.1 完整表结构

```sql
-- ==========================================
-- 租户与组织
-- ==========================================

-- 租户表（学校）
CREATE TABLE tenants (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL COMMENT '学校名称',
    code        VARCHAR(50) UNIQUE NOT NULL COMMENT '学校编码',
    district    VARCHAR(100) COMMENT '所属区县',
    city        VARCHAR(100) COMMENT '所属地市',
    status      TINYINT DEFAULT 1 COMMENT '1正常 0禁用',
    config      JSON COMMENT '学校个性化配置',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT '学校（租户）表';

-- 年级表
CREATE TABLE grades (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id   BIGINT NOT NULL,
    name        VARCHAR(20) NOT NULL COMMENT '年级名称，如"初一"',
    level       TINYINT NOT NULL COMMENT '学段：1小学 2初中 3高中',
    grade_num   TINYINT NOT NULL COMMENT '年级序号：1-6/1-3',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id)
) COMMENT '年级表';

-- 班级表
CREATE TABLE classes (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id   BIGINT NOT NULL,
    grade_id    BIGINT NOT NULL,
    name        VARCHAR(30) NOT NULL COMMENT '如"初一(3)班"',
    class_num   INT NOT NULL COMMENT '班级序号',
    teacher_id  BIGINT COMMENT '班主任ID',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_grade (tenant_id, grade_id)
) COMMENT '班级表';

-- ==========================================
-- 用户与权限
-- ==========================================

-- 用户表
CREATE TABLE users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    real_name       VARCHAR(50) NOT NULL,
    role            ENUM('student','teacher','counselor','doctor','admin','super_admin') NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    avatar_url      VARCHAR(500),
    status          TINYINT DEFAULT 1 COMMENT '1正常 0禁用',
    last_login_at   DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_role (tenant_id, role),
    INDEX idx_username (username)
) COMMENT '用户表（教师/医生/管理员/学生）';

-- 学生扩展信息表
CREATE TABLE students (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    user_id         BIGINT UNIQUE NOT NULL,
    student_no      VARCHAR(30) COMMENT '学号',
    class_id        BIGINT NOT NULL,
    gender          TINYINT COMMENT '1男 2女',
    birth_date      DATE,
    guardian_name   VARCHAR(50) COMMENT '监护人姓名',
    guardian_phone  VARCHAR(20) COMMENT '监护人电话',
    special_flag    TINYINT DEFAULT 0 COMMENT '是否重点关注学生',
    INDEX idx_tenant_class (tenant_id, class_id),
    INDEX idx_user (user_id)
) COMMENT '学生扩展信息';

-- 教师与班级关联表
CREATE TABLE teacher_classes (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    teacher_id  BIGINT NOT NULL,
    class_id    BIGINT NOT NULL,
    role        ENUM('homeroom','counselor','subject') DEFAULT 'homeroom',
    UNIQUE KEY uk_teacher_class (teacher_id, class_id)
) COMMENT '教师班级关联';

-- ==========================================
-- 题库与量表
-- ==========================================

-- 量表分类表
CREATE TABLE scale_categories (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50) NOT NULL COMMENT '如"焦虑类""抑郁类"',
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT '量表分类';

-- 量表表
CREATE TABLE scales (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id     BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL COMMENT '量表名称，如PHQ-9',
    short_name      VARCHAR(30) COMMENT '简称',
    description     TEXT COMMENT '量表说明',
    instruction     TEXT COMMENT '作答说明（展示给学生）',
    applicable_levels JSON COMMENT '适用学段：[1,2,3]',
    min_age         INT COMMENT '最小适用年龄',
    max_age         INT COMMENT '最大适用年龄',
    question_count  INT NOT NULL DEFAULT 0,
    estimated_mins  INT COMMENT '预计完成时间（分钟）',
    scoring_type    ENUM('total','subscale','both') DEFAULT 'total',
    scoring_rule    JSON COMMENT '评分规则配置JSON',
    result_levels   JSON COMMENT '结果分级定义JSON',
    alert_rules     JSON COMMENT '预警触发规则JSON',
    min_interval_days INT DEFAULT 30 COMMENT '同一学生最短再测间隔天数',
    is_active       TINYINT DEFAULT 1,
    is_system       TINYINT DEFAULT 1 COMMENT '1系统内置 0租户自建',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_active (is_active)
) COMMENT '量表定义表';

-- 量表题目表
CREATE TABLE scale_questions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    scale_id        BIGINT NOT NULL,
    question_no     INT NOT NULL COMMENT '题目序号',
    question_text   TEXT NOT NULL COMMENT '题目正文',
    question_type   ENUM('single','multi','likert','text') DEFAULT 'single',
    options         JSON COMMENT '选项配置[{value,label,score}]',
    reverse_score   TINYINT DEFAULT 0 COMMENT '是否反向计分',
    subscale_key    VARCHAR(50) COMMENT '所属子量表标识',
    is_required     TINYINT DEFAULT 1,
    UNIQUE KEY uk_scale_no (scale_id, question_no),
    INDEX idx_scale (scale_id)
) COMMENT '量表题目表';

-- ==========================================
-- 测评任务
-- ==========================================

-- 测评计划表
CREATE TABLE assessment_plans (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL COMMENT '测评计划名称',
    description     TEXT,
    creator_id      BIGINT NOT NULL COMMENT '创建人（老师）',
    scale_ids       JSON NOT NULL COMMENT '包含的量表ID列表',
    target_type     ENUM('class','grade','school','individual') NOT NULL,
    target_ids      JSON COMMENT '目标对象ID列表',
    start_time      DATETIME NOT NULL COMMENT '开始时间',
    end_time        DATETIME NOT NULL COMMENT '截止时间',
    remind_before   INT DEFAULT 1 COMMENT '提前N天提醒',
    status          ENUM('draft','published','ongoing','completed','cancelled') DEFAULT 'draft',
    auto_alert      TINYINT DEFAULT 1 COMMENT '是否自动触发预警',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_creator (creator_id)
) COMMENT '测评计划表';

-- 学生测评任务表（plan展开到个人）
CREATE TABLE assessment_tasks (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    plan_id         BIGINT NOT NULL,
    student_id      BIGINT NOT NULL COMMENT '学生user_id',
    scale_id        BIGINT NOT NULL,
    status          ENUM('pending','in_progress','completed','expired','skipped') DEFAULT 'pending',
    start_time      DATETIME COMMENT '学生开始作答时间',
    submit_time     DATETIME COMMENT '学生提交时间',
    answers         JSON COMMENT '作答数据',
    total_score     DECIMAL(10,2) COMMENT '总分',
    subscale_scores JSON COMMENT '子量表得分',
    result_level    VARCHAR(20) COMMENT '结果等级标签',
    result_detail   JSON COMMENT '详细分析结果',
    alert_triggered TINYINT DEFAULT 0 COMMENT '是否已触发预警',
    INDEX idx_plan_student (plan_id, student_id),
    INDEX idx_tenant_student (tenant_id, student_id),
    INDEX idx_status (status)
) COMMENT '个人测评任务表';

-- ==========================================
-- 预警管理
-- ==========================================

-- 预警记录表
CREATE TABLE alerts (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    task_id         BIGINT NOT NULL COMMENT '触发的测评任务ID',
    student_id      BIGINT NOT NULL,
    scale_id        BIGINT NOT NULL,
    alert_level     ENUM('yellow','red') NOT NULL COMMENT '黄色/红色预警',
    alert_reason    TEXT COMMENT '预警原因说明',
    trigger_score   DECIMAL(10,2) COMMENT '触发预警的得分',
    trigger_rule    VARCHAR(200) COMMENT '触发规则描述',
    status          ENUM('pending','notified','processing','closed') DEFAULT 'pending',
    assigned_to     BIGINT COMMENT '负责处理的心理老师ID',
    notify_time     DATETIME COMMENT '通知发出时间',
    process_time    DATETIME COMMENT '开始处理时间',
    close_time      DATETIME COMMENT '结案时间',
    close_note      TEXT COMMENT '结案说明',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_student (student_id),
    INDEX idx_level (alert_level)
) COMMENT '预警记录表';

-- 预警处理记录
CREATE TABLE alert_logs (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    alert_id    BIGINT NOT NULL,
    operator_id BIGINT NOT NULL COMMENT '操作人ID',
    action      ENUM('notify','assign','followup','note','close') NOT NULL,
    content     TEXT COMMENT '跟进内容/备注',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert (alert_id)
) COMMENT '预警跟进记录';

-- ==========================================
-- 个案档案（一期基础版）
-- ==========================================

-- 个案档案表
CREATE TABLE case_files (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    counselor_id    BIGINT COMMENT '主要负责心理老师',
    open_date       DATE COMMENT '建档日期',
    status          ENUM('active','closed','transferred') DEFAULT 'active',
    priority        ENUM('normal','attention','urgent') DEFAULT 'normal',
    summary         TEXT COMMENT '综合情况摘要',
    close_date      DATE,
    close_reason    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student (tenant_id, student_id),
    INDEX idx_counselor (counselor_id)
) COMMENT '学生心理个案档案';

-- 个案跟进记录
CREATE TABLE case_records (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    case_id     BIGINT NOT NULL,
    operator_id BIGINT NOT NULL,
    record_type ENUM('consult','group','phone','home_visit','note') NOT NULL COMMENT '记录类型',
    record_date DATE NOT NULL,
    content     TEXT NOT NULL COMMENT '记录内容',
    next_plan   TEXT COMMENT '下次跟进计划',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_case (case_id)
) COMMENT '个案跟进记录';

-- ==========================================
-- 系统配置与通知
-- ==========================================

-- 通知消息表
CREATE TABLE notifications (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id   BIGINT NOT NULL,
    to_user_id  BIGINT NOT NULL,
    type        ENUM('alert','task','system') NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     TEXT,
    ref_id      BIGINT COMMENT '关联业务ID',
    is_read     TINYINT DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (to_user_id, is_read)
) COMMENT '系统通知表';

-- 操作日志表
CREATE TABLE operation_logs (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id   BIGINT,
    user_id     BIGINT,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100) COMMENT '操作对象',
    resource_id BIGINT,
    ip          VARCHAR(50),
    user_agent  VARCHAR(500),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) COMMENT '操作审计日志';
```

---

## 四、API设计

### 4.1 接口规范

- 基础路径：`/api/v1`
- 认证方式：JWT Bearer Token，有效期8小时，支持refresh
- 响应格式：
```json
{
    "code": 0,
    "message": "success",
    "data": {},
    "timestamp": 1700000000000
}
```
- 错误码规范：`1xxx` 认证相关，`2xxx` 业务错误，`5xxx` 系统错误

### 4.2 认证模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | 账号密码登录 |
| POST | /auth/refresh | 刷新token |
| POST | /auth/logout | 退出登录 |
| GET  | /auth/me | 获取当前用户信息 |
| PUT  | /auth/password | 修改密码 |

**登录请求体：**
```json
{
    "username": "teacher001",
    "password": "xxx",
    "tenant_code": "school_001"
}
```

### 4.3 组织管理模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /grades | 获取年级列表 | teacher+ |
| GET  | /grades/:id/classes | 获取年级下班级 | teacher+ |
| GET  | /classes | 获取班级列表 | teacher+ |
| GET  | /classes/:id/students | 获取班级学生 | teacher+ |
| POST | /classes | 创建班级 | admin |
| POST | /students/import | 批量导入学生（Excel）| admin |

### 4.4 量表题库模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /scales | 获取量表列表 | teacher+ |
| GET  | /scales/:id | 获取量表详情 | teacher+ |
| GET  | /scales/:id/questions | 获取量表题目列表 | teacher+ |
| GET  | /scale-categories | 获取分类列表 | teacher+ |
| POST | /scales | 创建自定义量表 | counselor+ |
| PUT  | /scales/:id | 修改量表 | counselor+ |

### 4.5 测评计划模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /assessment-plans | 计划列表 | teacher+ |
| POST | /assessment-plans | 创建计划 | counselor+ |
| GET  | /assessment-plans/:id | 计划详情 | teacher+ |
| PUT  | /assessment-plans/:id | 修改计划 | counselor+ |
| POST | /assessment-plans/:id/publish | 发布计划 | counselor+ |
| POST | /assessment-plans/:id/cancel | 取消计划 | counselor+ |
| GET  | /assessment-plans/:id/progress | 完成情况进度 | teacher+ |

### 4.6 学生测评（H5端）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /student/tasks | 获取我的待完成测评 |
| GET  | /student/tasks/:id | 获取测评任务详情（含题目）|
| POST | /student/tasks/:id/start | 开始作答 |
| POST | /student/tasks/:id/submit | 提交答卷 |
| GET  | /student/history | 历史测评记录 |

**提交答卷请求体：**
```json
{
    "answers": [
        {"question_id": 1, "value": 2},
        {"question_id": 2, "value": 1}
    ],
    "duration_seconds": 480
}
```

### 4.7 预警管理模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /alerts | 预警列表（支持筛选）| counselor+ |
| GET  | /alerts/:id | 预警详情 | counselor+ |
| POST | /alerts/:id/assign | 指派负责人 | counselor+ |
| POST | /alerts/:id/logs | 添加跟进记录 | counselor+ |
| POST | /alerts/:id/close | 关闭预警 | counselor+ |
| GET  | /alerts/stats | 预警统计数据 | counselor+ |

### 4.8 数据看板模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /dashboard/school | 学校总览数据 | admin+ |
| GET  | /dashboard/class/:id | 班级看板数据 | teacher+ |
| GET  | /dashboard/student/:id | 学生个人档案数据 | counselor+ |
| GET  | /students/:id/assessments | 学生历次测评记录 | counselor+ |
| GET  | /students/:id/alerts | 学生预警历史 | counselor+ |

---

## 五、内置量表清单（一期50+）

### 5.1 通用筛查类（全学段）

| 量表名称 | 简称 | 题数 | 适用学段 | 主要评估维度 |
|----------|------|------|----------|--------------|
| 患者健康问卷（抑郁版）| PHQ-9 | 9 | 初中/高中 | 抑郁症状 |
| 广泛性焦虑量表 | GAD-7 | 7 | 初中/高中 | 焦虑症状 |
| 儿童焦虑情绪障碍筛查 | SCARED | 41 | 小学/初中 | 多维度焦虑 |
| 长处和困难问卷（学生版）| SDQ | 25 | 小学/初中 | 行为情绪社交 |
| 症状自评量表 | SCL-90 | 90 | 高中 | 综合心理健康 |
| 中学生心理健康量表 | MMHI-60 | 60 | 初中/高中 | 综合评定 |

### 5.2 情绪专项类

| 量表名称 | 简称 | 题数 | 适用学段 |
|----------|------|------|----------|
| 儿童抑郁量表 | CDI | 27 | 小学/初中 |
| 抑郁自评量表 | SDS | 20 | 初中/高中 |
| 状态-特质焦虑问卷 | STAI | 40 | 初中/高中 |
| 焦虑自评量表 | SAS | 20 | 初中/高中 |
| 正负性情绪量表 | PANAS | 20 | 初中/高中 |
| 儿童情绪调节量表 | EESC | 16 | 小学 |

### 5.3 压力与应激类

| 量表名称 | 简称 | 题数 | 适用学段 |
|----------|------|------|----------|
| 青少年生活事件量表 | ASLEC | 27 | 初中/高中 |
| 学业压力量表 | 自编 | 20 | 初中/高中 |
| 中小学生考试焦虑量表 | TAI-C | 37 | 初中/高中 |
| 压力感知量表 | PSS-10 | 10 | 高中 |

### 5.4 行为与人际类

| 量表名称 | 简称 | 题数 | 适用学段 |
|----------|------|------|----------|
| 网络成瘾量表 | IAT | 20 | 初中/高中 |
| 手机依赖量表 | MPAI | 17 | 初中/高中 |
| 校园欺凌受害者量表 | 自编 | 15 | 小学/初中 |
| 同伴关系量表 | PRLS | 25 | 小学/初中 |
| 孤独感量表 | UCLA-3 | 20 | 初中/高中 |
| 社交焦虑量表（青少年）| SAS-A | 18 | 初中/高中 |

### 5.5 自我认知类

| 量表名称 | 简称 | 题数 | 适用学段 |
|----------|------|------|----------|
| 儿童自我意识量表 | PHCSS | 80 | 小学 |
| Rosenberg自尊量表 | SES | 10 | 初中/高中 |
| 自我效能感量表 | GSES | 10 | 初中/高中 |
| 应对方式问卷 | CSQ | 62 | 高中 |

### 5.6 睡眠与躯体化类

| 量表名称 | 简称 | 题数 | 适用学段 |
|----------|------|------|----------|
| 匹兹堡睡眠质量指数 | PSQI | 19 | 初中/高中 |
| 儿童睡眠习惯问卷 | CSHQ | 33 | 小学 |
| 躯体化症状量表 | SSI | 20 | 初中/高中 |

### 5.7 重点风险筛查（须医生权限查看）

| 量表名称 | 说明 | 备注 |
|----------|------|------|
| 自杀风险评估问卷 | 需专业资质使用 | 红色预警直接触发 |
| 自我伤害行为问卷 | 非自杀性自伤筛查 | 黄色预警触发 |
| 攻击行为量表 | 外化行为风险 | 结合班主任观察 |

---

## 六、预警规则设计

### 6.1 三级预警定义

```
绿色（正常）：所有量表得分在正常范围
黄色（关注）：1个或多个量表轻中度异常，或存在特定题目异常作答
红色（紧急）：任一量表重度异常，或自伤/自杀相关题目触发
```

### 6.2 各量表预警阈值配置示例

```json
// PHQ-9
{
    "scale": "PHQ-9",
    "rules": [
        {"range": [0,4], "level": "normal", "label": "无抑郁"},
        {"range": [5,9], "level": "mild", "label": "轻度抑郁", "alert": "yellow"},
        {"range": [10,14], "level": "moderate", "label": "中度抑郁", "alert": "yellow"},
        {"range": [15,19], "level": "moderate_severe", "label": "中重度抑郁", "alert": "red"},
        {"range": [20,27], "level": "severe", "label": "重度抑郁", "alert": "red"}
    ],
    "item_rules": [
        {
            "question_no": 9,
            "condition": "value >= 2",
            "alert": "red",
            "reason": "第9题（自伤意念）得分>=2，触发紧急预警"
        }
    ]
}

// GAD-7
{
    "scale": "GAD-7",
    "rules": [
        {"range": [0,4], "level": "normal", "label": "无焦虑"},
        {"range": [5,9], "level": "mild", "label": "轻度焦虑", "alert": null},
        {"range": [10,14], "level": "moderate", "label": "中度焦虑", "alert": "yellow"},
        {"range": [15,21], "level": "severe", "label": "重度焦虑", "alert": "red"}
    ]
}
```

### 6.3 预警处理流程

```
学生提交答卷
    ↓
系统自动评分 + 规则匹配
    ↓
    ├── 绿色 → 归档，无通知
    │
    ├── 黄色 → 
    │       系统通知 → 心理老师（站内消息 + 短信）
    │       SLA：15天内必须创建跟进记录
    │       如15天未处理 → 升级通知学校心理负责人
    │
    └── 红色 →
            立即通知 → 心理老师 + 学校分管领导（站内 + 短信）
            SLA：24小时内必须确认处置
            系统锁定：该学生状态标记，需人工确认后才可关闭
            通知记录：所有通知均记录时间戳（法律保护）
```

---

## 七、前端页面清单

### 7.1 学生H5端（微信内打开）

| 页面 | 路由 | 说明 |
|------|------|------|
| 任务列表 | /student | 显示待做/进行中/已完成的测评 |
| 作答页 | /student/answer/:taskId | 逐题作答，支持暂存 |
| 提交确认 | /student/confirm/:taskId | 提交前确认 |
| 完成页 | /student/done/:taskId | 提交后展示鼓励语（不展示具体分数）|
| 历史记录 | /student/history | 历次测评记录 |

### 7.2 老师/心理老师端（PC Web）

| 模块 | 页面 | 路由 |
|------|------|------|
| 首页 | 工作台（待处理预警、进行中测评）| /dashboard |
| 测评管理 | 计划列表 | /assessments |
| | 创建计划 | /assessments/create |
| | 计划详情/进度 | /assessments/:id |
| 学生管理 | 班级学生列表 | /students |
| | 学生详情/档案 | /students/:id |
| 预警管理 | 预警列表 | /alerts |
| | 预警详情/处理 | /alerts/:id |
| 量表题库 | 量表列表 | /scales |
| | 量表详情/预览 | /scales/:id |
| 数据看板 | 班级看板 | /dashboard/class/:id |
| | 学生档案看板 | /dashboard/student/:id |

### 7.3 管理员端（PC Web）

| 模块 | 页面 |
|------|------|
| 学校总览看板 | /admin/dashboard |
| 用户管理 | /admin/users |
| 班级管理 | /admin/classes |
| 学生批量导入 | /admin/students/import |
| 系统配置 | /admin/settings |
| 操作日志 | /admin/logs |

---

## 八、评分引擎设计

### 8.1 评分模块（后端）

```javascript
// 核心评分函数
class ScoreEngine {
    // 计算总分
    calculateTotalScore(scale, answers) {
        let total = 0;
        for (const question of scale.questions) {
            const answer = answers.find(a => a.question_id === question.id);
            const raw = this.getOptionScore(question, answer);
            const score = question.reverse_score 
                ? (question.max_score - raw) 
                : raw;
            total += score;
        }
        return total;
    }

    // 计算子量表分
    calculateSubscaleScores(scale, answers) {
        const subscaleMap = {};
        for (const question of scale.questions) {
            if (!question.subscale_key) continue;
            if (!subscaleMap[question.subscale_key]) {
                subscaleMap[question.subscale_key] = 0;
            }
            const answer = answers.find(a => a.question_id === question.id);
            subscaleMap[question.subscale_key] += this.getOptionScore(question, answer);
        }
        return subscaleMap;
    }

    // 根据得分匹配结果等级
    matchResultLevel(scale, totalScore) {
        const rules = scale.result_levels;
        for (const rule of rules) {
            if (totalScore >= rule.range[0] && totalScore <= rule.range[1]) {
                return rule;
            }
        }
        return null;
    }

    // 检查是否触发预警
    checkAlertTriggers(scale, answers, totalScore) {
        const triggers = [];
        // 检查总分预警
        const resultLevel = this.matchResultLevel(scale, totalScore);
        if (resultLevel?.alert) {
            triggers.push({
                type: 'total_score',
                level: resultLevel.alert,
                reason: `${scale.name}总分${totalScore}分，属于${resultLevel.label}`
            });
        }
        // 检查单题预警规则
        if (scale.alert_rules?.item_rules) {
            for (const itemRule of scale.alert_rules.item_rules) {
                const answer = answers.find(a => a.question_no === itemRule.question_no);
                if (answer && eval(`${answer.value} ${itemRule.condition.replace('value', answer.value)}`)) {
                    triggers.push({
                        type: 'item_rule',
                        level: itemRule.alert,
                        reason: itemRule.reason
                    });
                }
            }
        }
        return triggers;
    }
}
```

---

## 九、开发排期

### 9.1 第一阶段（Month 1）：基础框架

| 周 | 任务 | 负责 |
|----|------|------|
| W1 | 项目初始化、数据库搭建、基础鉴权框架 | 后端 |
| W1 | Vue3项目初始化、路由、组件库配置 | 前端 |
| W2 | 用户/组织/班级/学生管理API + 批量导入 | 后端 |
| W2 | 登录页、用户管理页面 | 前端 |
| W3 | 量表题库数据录入（50+量表JSON格式化）| 数据 |
| W3 | 量表CRUD API + 题目API | 后端 |
| W3 | 量表列表/详情页 | 前端 |
| W4 | 测评计划CRUD + 发布逻辑 | 后端 |
| W4 | 创建测评计划页面 | 前端 |

### 9.2 第二阶段（Month 2）：核心闭环

| 周 | 任务 | 负责 |
|----|------|------|
| W5 | 学生H5端：任务列表 + 作答页 | 前端 |
| W5 | 答卷提交API + 评分引擎 | 后端 |
| W6 | 预警规则配置 + 预警触发逻辑 | 后端 |
| W6 | 预警管理页面（列表/详情/处理）| 前端 |
| W7 | 学生个人档案页 + 历次测评趋势 | 前端 |
| W7 | 个案记录CRUD API | 后端 |
| W8 | 班级看板（完成率/风险分布图表）| 前端 |
| W8 | 学校总览看板 + 通知消息系统 | 后端+前端 |

### 9.3 第三阶段（Month 3）：完善与上线

| 周 | 任务 | 负责 |
|----|------|------|
| W9 | 短信通知对接（阿里云SMS）| 后端 |
| W9 | 数据导出（Excel报告）| 后端 |
| W10 | 管理员端完善 + 操作日志 | 前端+后端 |
| W10 | 全面联调 + Bug修复 | 全员 |
| W11 | 性能测试 + 安全审计 | 测试 |
| W11 | 部署文档 + Docker Compose配置 | 后端 |
| W12 | 试点学校部署 + 用户培训 + 运行磨合 | 全员 |

---

## 十、部署方案

### 10.1 Docker Compose（推荐）

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

  api:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:password@mysql:3306/mentalhealth
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SMS_ACCESS_KEY=${SMS_ACCESS_KEY}
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=mentalhealth
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### 10.2 最低服务器配置

| 环境 | CPU | 内存 | 硬盘 | 说明 |
|------|-----|------|------|------|
| 试点（单校）| 2核 | 4GB | 100GB | 满足1000学生并发 |
| 正式（地市）| 4核 | 8GB | 500GB | 满足10000学生并发 |
| 推荐（地市）| 8核 | 16GB | 1TB | 读写分离，主从MySQL |

---

## 十一、一期验收标准

- [ ] 学生可通过H5端完成问卷填写并提交
- [ ] 教师可创建测评计划并指定目标班级
- [ ] 系统自动评分准确（与人工计算误差为0）
- [ ] 红色预警触发后，15分钟内系统通知到对应教师
- [ ] 班级看板正确展示完成率和风险分布
- [ ] 学生个人档案显示历次测评记录和趋势折线图
- [ ] 支持Excel批量导入500名学生数据无报错
- [ ] 系统支持不少于200名学生同时在线作答（并发测试）
- [ ] 所有学生测评数据加密存储，不同学校数据完全隔离
- [ ] 操作审计日志完整记录所有关键操作

---

## 十二、实现差异记录

当前实现与本文档的差异（技术选型、数据库、API 等）见同目录下 **`phase1-deviations.md`**，开发与评审时请以该文件为准做对齐或验收。
