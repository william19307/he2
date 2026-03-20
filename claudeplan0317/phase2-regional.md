# 心理健康测评平台 — 二期工程开发文档（地市化扩展）

> 目标：4-6个月，在一期基础上完成地市级部署能力、干预引导体系、家长通知链路，达到可向教育局销售的完整产品形态  
> 前置条件：一期试点运行稳定，已有真实用户反馈

---

## 一、二期目标与范围

### 1.1 二期新增核心能力

| 能力 | 说明 |
|------|------|
| 地市宏观看板 | 教育局层面跨校横向对比与分析 |
| 干预引导方案库 | 内置分类干预方案，老师有迹可循 |
| 家长通知链路 | 分级告知机制，合规且有记录 |
| 多租户架构升级 | 支持地市部署，数据强隔离 |
| 批量测评排程 | 全地市统一组织，定期自动发放 |
| 年度报告自动生成 | PDF导出，可直接提报教育主管部门 |
| 问卷构建器 | 教师自建自定义问卷（非标准量表）|
| 数据导入对接 | 对接学校现有学籍系统（Excel/API）|

### 1.2 二期不做的功能（三期）

- AI辅助风险评估与建议
- 移动App（iOS/Android）
- 视频咨询预约
- 家长端独立系统

---

## 二、架构升级

### 2.1 多租户架构升级（Schema隔离）

二期从一期的行级隔离升级为**数据库Schema隔离**：

```
地市教育局（Region）
    ├── 学校A（Tenant A）→ 独立Schema: school_001
    ├── 学校B（Tenant B）→ 独立Schema: school_002
    └── 学校C（Tenant C）→ 独立Schema: school_003

公共Schema（shared）
    ├── 量表题库（系统内置量表共享）
    ├── 地市机构信息
    └── 超管账户
```

**路由中间件升级：**

```javascript
// 二期：动态Schema切换中间件
async function tenantMiddleware(req, res, next) {
    const tenantCode = req.headers['x-tenant-code'] || req.user?.tenant_code;
    if (!tenantCode) return res.status(401).json({ code: 1001, message: '无效租户' });
    
    // 动态切换数据库连接Schema
    await req.dbPool.query(`SET search_path TO ${tenantCode}, shared`);
    req.tenantCode = tenantCode;
    next();
}
```

### 2.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                 │
│  学生H5  |  教师/咨询端Web  |  管理员Web  |  地市教育局Web       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   API 网关（Nginx + 路由）                       │
│           域名路由 / 限流 / SSL / 租户识别                       │
└──────────┬─────────────────────────────────────┬────────────────┘
           │                                     │
┌──────────▼──────────┐               ┌──────────▼──────────────┐
│   主业务服务（Node） │               │   报告生成服务（Python） │
│   测评/预警/档案     │               │   PDF生成/数据分析       │
└──────────┬──────────┘               └──────────┬──────────────┘
           │                                     │
┌──────────▼─────────────────────────────────────▼──────────────┐
│                    MySQL（多Schema）+ Redis                     │
│           shared / school_001 / school_002 / ...               │
└────────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                     消息队列（Bull / Redis）                     │
│       异步任务：批量发放 / 预警通知 / 报告生成 / 定时测评         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 消息队列设计

```javascript
// 二期新增：Bull消息队列，处理异步任务
const queues = {
    // 预警通知（优先级最高）
    alertNotification: new Bull('alert-notification', { priority: 1 }),
    
    // 测评任务分发（每次创建计划时展开到学生）
    taskDistribution: new Bull('task-distribution'),
    
    // 短信/微信推送
    messageDelivery: new Bull('message-delivery'),
    
    // 报告生成（耗时任务）
    reportGeneration: new Bull('report-generation', {
        defaultJobOptions: { timeout: 120000 }  // 2分钟超时
    }),
    
    // 定时测评排程（cron触发）
    scheduledAssessment: new Bull('scheduled-assessment')
};
```

---

## 三、新增数据库表

### 3.1 干预引导体系

```sql
-- 干预问题分类
CREATE TABLE intervention_categories (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(50) NOT NULL COMMENT '如"情绪调节""人际关系"',
    description     TEXT,
    icon            VARCHAR(100) COMMENT '图标标识',
    sort_order      INT DEFAULT 0,
    applicable_levels JSON COMMENT '适用学段'
);

-- 干预方案库
CREATE TABLE intervention_plans (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id     BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL COMMENT '方案标题',
    target_issue    VARCHAR(200) COMMENT '针对问题（如"轻度抑郁情绪"）',
    alert_levels    JSON COMMENT '适用预警等级["yellow","red"]',
    applicable_levels JSON COMMENT '适用学段',
    target_audience ENUM('individual','group','class') DEFAULT 'individual',
    duration_sessions INT COMMENT '建议会谈次数',
    session_duration  INT COMMENT '每次时长（分钟）',
    overview        TEXT COMMENT '方案概述',
    goals           JSON COMMENT '干预目标列表',
    steps           JSON COMMENT '干预步骤详细内容',
    talk_guides     JSON COMMENT '谈话引导框架',
    activities      JSON COMMENT '推荐活动/技术',
    parent_letter   TEXT COMMENT '家长沟通信件模板',
    referral_criteria TEXT COMMENT '转介建议标准',
    notes           TEXT COMMENT '注意事项',
    is_system       TINYINT DEFAULT 1 COMMENT '1系统内置 0自建',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id)
) COMMENT '干预方案库';

-- 干预计划（针对具体学生的应用记录）
CREATE TABLE student_intervention_plans (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL,
    alert_id        BIGINT COMMENT '关联预警ID（可为空）',
    plan_id         BIGINT COMMENT '参考的方案库ID（可为空，支持自定义）',
    title           VARCHAR(200) NOT NULL,
    start_date      DATE NOT NULL,
    planned_sessions INT COMMENT '计划会谈次数',
    status          ENUM('active','paused','completed','referred') DEFAULT 'active',
    summary         TEXT COMMENT '干预总结',
    close_date      DATE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id)
);

-- 干预会谈记录
CREATE TABLE intervention_sessions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    plan_id         BIGINT NOT NULL,
    session_no      INT NOT NULL COMMENT '第几次会谈',
    session_date    DATE NOT NULL,
    duration_mins   INT COMMENT '实际时长',
    content         TEXT NOT NULL COMMENT '会谈内容记录',
    student_mood    TINYINT COMMENT '学生情绪状态1-5分',
    progress_note   TEXT COMMENT '进展评估',
    next_session_plan TEXT COMMENT '下次会谈计划',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plan (plan_id)
);

-- 转介记录
CREATE TABLE referral_records (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL,
    referral_type   ENUM('hospital','specialist','external_agency') NOT NULL,
    referral_to     VARCHAR(200) COMMENT '转介机构/人员名称',
    referral_reason TEXT NOT NULL,
    referral_date   DATE NOT NULL,
    follow_up_note  TEXT COMMENT '转介后跟进记录',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 家长通知体系

```sql
-- 家长通知记录
CREATE TABLE parent_notifications (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    alert_id        BIGINT COMMENT '关联预警ID',
    counselor_id    BIGINT NOT NULL COMMENT '发送人',
    notify_type     ENUM('sms','call','meeting','letter','wechat') NOT NULL,
    content         TEXT NOT NULL COMMENT '通知内容',
    notify_time     DATETIME NOT NULL COMMENT '通知时间',
    guardian_name   VARCHAR(50) COMMENT '通知对象',
    guardian_phone  VARCHAR(20),
    result          ENUM('success','failed','no_answer') DEFAULT 'success',
    follow_up       TEXT COMMENT '家长反馈/跟进内容',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id),
    INDEX idx_alert (alert_id)
) COMMENT '家长通知记录';

-- 家长知情同意记录
CREATE TABLE parent_consents (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    consent_type    ENUM('assessment','counseling','referral') NOT NULL,
    consent_date    DATE NOT NULL,
    guardian_name   VARCHAR(50),
    guardian_signature VARCHAR(500) COMMENT '签名图片URL',
    notes           TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 定时测评与批量排程

```sql
-- 定时测评计划（二期新增）
CREATE TABLE scheduled_assessment_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL COMMENT '可以是地市ID或学校ID',
    tenant_type     ENUM('region','school') DEFAULT 'school',
    title           VARCHAR(200) NOT NULL,
    scale_ids       JSON NOT NULL COMMENT '量表ID列表',
    target_levels   JSON COMMENT '适用学段列表',
    frequency       ENUM('weekly','monthly','semester','custom') NOT NULL,
    cron_expr       VARCHAR(100) COMMENT '自定义cron表达式',
    start_date      DATE NOT NULL,
    end_date        DATE COMMENT '如为空则永久有效',
    duration_days   INT DEFAULT 7 COMMENT '每次开放天数',
    is_active       TINYINT DEFAULT 1,
    last_triggered  DATETIME COMMENT '最后一次触发时间',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id, is_active)
) COMMENT '定时测评配置';

-- 地市/区域信息表（二期新增）
CREATE TABLE regions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL COMMENT '地市/区县名称',
    code            VARCHAR(50) UNIQUE NOT NULL,
    level           ENUM('city','district') NOT NULL COMMENT '地市/区县',
    parent_id       BIGINT COMMENT '上级区域ID',
    admin_user_id   BIGINT COMMENT '区域管理员ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 学校与地市关联
ALTER TABLE tenants ADD COLUMN region_id BIGINT COMMENT '所属地市/区县ID';
ALTER TABLE tenants ADD INDEX idx_region (region_id);

-- 年度报告记录
CREATE TABLE annual_reports (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT COMMENT '学校ID（null则为地市报告）',
    region_id       BIGINT COMMENT '地市ID',
    year            INT NOT NULL,
    semester        TINYINT COMMENT '1上半年 2下半年 NULL全年',
    report_type     ENUM('school','region') NOT NULL,
    status          ENUM('generating','ready','failed') DEFAULT 'generating',
    file_url        VARCHAR(500) COMMENT 'PDF文件地址',
    stats_snapshot  JSON COMMENT '统计数据快照',
    generated_by    BIGINT,
    generated_at    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 自定义问卷（问卷构建器）

```sql
-- 自定义问卷（非标准量表）
CREATE TABLE custom_questionnaires (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    creator_id      BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    purpose         TEXT COMMENT '使用目的说明',
    is_anonymous    TINYINT DEFAULT 0 COMMENT '是否匿名',
    has_scoring     TINYINT DEFAULT 0 COMMENT '是否计分（0表示仅收集）',
    applicable_levels JSON,
    status          ENUM('draft','active','archived') DEFAULT 'draft',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id)
) COMMENT '自定义问卷';

-- 自定义问卷题目
CREATE TABLE custom_questions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    questionnaire_id BIGINT NOT NULL,
    question_no     INT NOT NULL,
    question_text   TEXT NOT NULL,
    question_type   ENUM('single','multi','likert','text','scale','matrix') NOT NULL,
    options         JSON COMMENT '选项配置',
    is_required     TINYINT DEFAULT 1,
    hint_text       VARCHAR(500) COMMENT '填写提示',
    UNIQUE KEY uk_q_no (questionnaire_id, question_no)
);
```

---

## 四、二期新增API

### 4.1 干预引导模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /intervention-plans | 方案库列表（支持分类/学段筛选）| counselor+ |
| GET  | /intervention-plans/:id | 方案详情（含话术/步骤）| counselor+ |
| GET  | /intervention-categories | 分类列表 | counselor+ |
| POST | /students/:id/intervention | 为学生创建干预计划 | counselor+ |
| GET  | /students/:id/interventions | 学生干预历史 | counselor+ |
| POST | /interventions/:id/sessions | 添加会谈记录 | counselor+ |
| GET  | /interventions/:id/sessions | 会谈记录列表 | counselor+ |
| POST | /interventions/:id/refer | 创建转介记录 | counselor+ |
| POST | /interventions/:id/close | 结束干预计划 | counselor+ |

### 4.2 家长通知模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /students/:id/parent-notify | 记录家长通知 | counselor+ |
| GET  | /students/:id/parent-notifications | 家长通知历史 | counselor+ |
| GET  | /alerts/:id/parent-notify-template | 获取预警对应的家长通知模板 | counselor+ |
| POST | /students/:id/consents | 记录知情同意 | counselor+ |

### 4.3 地市管理模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /region/dashboard | 地市总览看板 | region_admin |
| GET  | /region/schools | 下属学校列表+评估状态 | region_admin |
| GET  | /region/schools/:id/summary | 单校摘要数据 | region_admin |
| GET  | /region/risk-map | 区域风险热力图数据 | region_admin |
| GET  | /region/compare | 学校间横向对比 | region_admin |
| POST | /region/reports | 触发年度报告生成 | region_admin |
| GET  | /region/reports | 历史报告列表 | region_admin |

### 4.4 定时测评排程

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /scheduled-configs | 定时配置列表 | admin+ |
| POST | /scheduled-configs | 创建定时配置 | admin+ |
| PUT  | /scheduled-configs/:id | 修改配置 | admin+ |
| DELETE | /scheduled-configs/:id | 删除配置 | admin+ |
| POST | /scheduled-configs/:id/trigger | 手动触发一次 | admin+ |

### 4.5 自定义问卷

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET  | /custom-questionnaires | 问卷列表 | counselor+ |
| POST | /custom-questionnaires | 创建问卷 | counselor+ |
| PUT  | /custom-questionnaires/:id | 修改问卷 | counselor+ |
| POST | /custom-questionnaires/:id/publish | 发布问卷 | counselor+ |
| GET  | /custom-questionnaires/:id/responses | 收集结果列表 | counselor+ |
| GET  | /custom-questionnaires/:id/statistics | 统计分析 | counselor+ |

### 4.6 报告导出

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /reports/student/:id | 生成学生个人报告PDF | counselor+ |
| POST | /reports/class/:id | 生成班级测评报告 | teacher+ |
| POST | /reports/school/annual | 生成学校年度报告 | admin+ |
| POST | /reports/region/annual | 生成地市年度报告 | region_admin |
| GET  | /reports/:id/status | 查询报告生成状态 | counselor+ |
| GET  | /reports/:id/download | 下载报告文件 | counselor+ |

---

## 五、干预方案库内容规划

### 5.1 情绪调节类（12个方案）

| 方案标题 | 适用问题 | 适用学段 | 会谈次数 |
|----------|----------|----------|----------|
| 轻度抑郁情绪干预方案 | PHQ-9得分5-9 | 初中/高中 | 3-5次 |
| 中度抑郁情绪干预方案 | PHQ-9得分10-14 | 初中/高中 | 5-8次 |
| 轻度焦虑干预方案 | GAD-7得分5-9 | 初中/高中 | 3-4次 |
| 考试焦虑专项干预 | 考前压力过高 | 初中/高中 | 2-3次 |
| 情绪调节技能训练 | 情绪管理薄弱 | 全学段 | 4次 |
| 小学生情绪启蒙干预 | 情绪识别困难 | 小学 | 3次 |
| 悲伤与丧失陪伴 | 家庭变故/亲人离世 | 全学段 | 4-6次 |
| 愤怒管理专项 | 冲动控制问题 | 初中 | 4次 |
| 正念减压团体 | 班级压力普遍 | 初中/高中 | 6次（团体）|
| 自我关怀能力培养 | 低自尊/自我批评 | 初中/高中 | 4次 |
| 情绪行为问题联合干预 | SDQ得分异常 | 小学 | 5次 |
| 躯体化症状心理干预 | 身体症状无器质性病变 | 初中/高中 | 3-5次 |

### 5.2 人际关系类（8个方案）

| 方案标题 | 适用问题 | 适用学段 |
|----------|----------|----------|
| 校园欺凌受害者支持 | 遭受欺凌 | 全学段 |
| 人际冲突处理技能 | 同伴冲突 | 初中 |
| 社交焦虑干预方案 | SAS-A得分高 | 初中/高中 |
| 孤独感与社交退缩 | UCLA-3得分高 | 全学段 |
| 新生适应辅导（中学）| 入学适应困难 | 初中/高中 |
| 转学生适应辅导 | 转学适应 | 全学段 |
| 师生关系修复辅导 | 师生冲突 | 全学段 |
| 友谊技能建设（小学）| 交友困难 | 小学 |

### 5.3 家庭压力类（6个方案）

| 方案标题 | 适用问题 | 适用学段 |
|----------|----------|----------|
| 家庭变故应激干预 | 父母离婚/家庭重组 | 全学段 |
| 留守儿童关爱辅导 | 留守背景 | 小学 |
| 亲子关系紧张干预 | 亲子冲突激烈 | 初中/高中 |
| 家庭经济压力应对 | 经济困难背景 | 全学段 |
| 父母疾病/缺失应对 | 家庭重大变故 | 全学段 |
| 高压家庭的学业焦虑 | 过度学业要求 | 初中/高中 |

### 5.4 自我发展类（6个方案）

| 方案标题 | 适用问题 | 适用学段 |
|----------|----------|----------|
| 自尊重建专项辅导 | Rosenberg自尊量表低 | 初中/高中 |
| 学习动力激活干预 | 学习兴趣丧失 | 全学段 |
| 网络/手机依赖干预 | IAT得分高 | 初中/高中 |
| 生涯探索与规划 | 迷茫无目标 | 高中 |
| 完美主义认知调整 | 过度追求完美 | 初中/高中 |
| 创伤知情支持方案 | 有创伤经历 | 全学段（医生参与）|

### 5.5 方案内容结构示例（JSON格式）

```json
{
    "id": 1,
    "title": "轻度抑郁情绪干预方案",
    "target_issue": "PHQ-9得分5-9，存在轻度抑郁情绪",
    "duration_sessions": 4,
    "session_duration": 45,
    "goals": [
        "帮助学生识别并命名自己的情绪状态",
        "建立积极的日常行为活化计划",
        "学会2-3种情绪调节技能",
        "改善睡眠和运动习惯"
    ],
    "steps": [
        {
            "session": 1,
            "title": "建立关系与情绪评估",
            "duration": 45,
            "objectives": ["建立安全咨询关系", "了解情绪现状"],
            "activities": ["情绪温度计评估", "生活情境梳理"],
            "key_points": "重点聆听，不急于给建议，建立信任感"
        },
        {
            "session": 2,
            "title": "认识情绪与行为连接",
            "duration": 45,
            "objectives": ["了解行为活化原理", "识别愉快活动"],
            "activities": ["情绪-行为记录表", "愉快活动清单"],
            "key_points": "避免说教，用苏格拉底式提问引导"
        }
    ],
    "talk_guides": {
        "opening": "你最近有没有注意到自己的情绪有些低落？能跟我说说最近一段时间你的生活状态吗？",
        "explore": "当你感到这种低落的时候，你通常会做什么？这些做法之后你感觉有没有变化？",
        "closure": "我们今天聊了这些，你有什么感受？你觉得哪一点对你来说最有用？"
    },
    "activities": [
        {
            "name": "情绪温度计",
            "description": "用1-10分评价当下情绪，每日记录，追踪情绪变化规律",
            "materials": "情绪温度计记录表（附件）"
        },
        {
            "name": "行为活化计划",
            "description": "每天安排1件带来愉快感的活动，从简单开始",
            "examples": "散步、听音乐、与朋友聊天、画画"
        }
    ],
    "parent_letter": "尊敬的家长，您好。经过与您的孩子的交流，我们了解到孩子近期情绪状态需要一些关注。我们已启动相关辅导支持。建议您在家中注意以下几点：减少对成绩的催促，多陪伴聆听，保证孩子规律的睡眠和运动。如有问题请联系学校心理老师。",
    "referral_criteria": "若经过4次干预后PHQ-9得分无下降，或出现自伤意念，需转介至专业医疗机构。"
}
```

---

## 六、地市看板数据设计

### 6.1 地市看板核心指标

```javascript
// 地市总览API响应结构
{
    "region": {
        "name": "XX市",
        "total_schools": 45,
        "total_students": 62000,
        "active_tenants": 42
    },
    "assessment_overview": {
        "this_semester_plans": 128,
        "completion_rate": 0.876,
        "total_assessments": 54320
    },
    "risk_overview": {
        "red_alerts_active": 12,
        "yellow_alerts_active": 89,
        "red_rate": 0.0022,
        "yellow_rate": 0.0145
    },
    "dimension_scores": {
        // 各维度全市平均分及分布
        "depression": { "avg": 4.2, "high_risk_rate": 0.031 },
        "anxiety": { "avg": 5.8, "high_risk_rate": 0.042 },
        "stress": { "avg": 6.1, "high_risk_rate": 0.038 }
    },
    "school_rankings": [
        // 各校风险指标排名（高风险占比从低到高）
        { "school_id": 1, "name": "XX一中", "risk_rate": 0.018, "completion_rate": 0.95 }
    ],
    "trend": {
        // 近6个月风险率趋势
        "months": ["2024-09","2024-10","2024-11","2024-12","2025-01","2025-02"],
        "red_rates": [0.002, 0.0025, 0.0018, 0.0022, 0.0019, 0.0021],
        "yellow_rates": [0.015, 0.017, 0.013, 0.014, 0.016, 0.015]
    }
}
```

### 6.2 风险热力图数据

```javascript
// 学校风险热力图API
// 返回各学校坐标（或行政区划位置）+ 风险等级
{
    "schools": [
        {
            "school_id": 1,
            "name": "XX第一中学",
            "district": "XX区",
            "lat": 28.123,
            "lng": 117.456,
            "risk_score": 65,           // 综合风险评分0-100
            "red_alert_count": 3,
            "yellow_alert_count": 12,
            "completion_rate": 0.89,
            "last_assessment_date": "2025-02-15"
        }
    ]
}
```

---

## 七、年度报告自动生成

### 7.1 报告结构

```
学校心理健康年度报告（2024年度）
│
├── 第一章：概述
│   ├── 测评覆盖情况（学生数/量表数/完成率）
│   └── 本年度工作亮点
│
├── 第二章：整体心理健康状况
│   ├── 各维度平均得分与常模比较
│   ├── 风险等级分布饼图
│   └── 与上学年同期对比
│
├── 第三章：重点人群分析
│   ├── 高风险学生分布（按年级/性别）
│   ├── 红色预警处置情况
│   └── 黄色预警跟进率
│
├── 第四章：干预工作情况
│   ├── 个案服务数量与类型
│   ├── 团体辅导开展情况
│   └── 转介情况
│
├── 第五章：分析与建议
│   ├── 突出问题识别
│   └── 下一年度工作建议
│
└── 附录：量表说明与数据保护声明
```

### 7.2 PDF生成技术方案

```python
# 使用 Python + ReportLab/WeasyPrint 生成PDF
# 图表使用 Matplotlib 生成图片后嵌入

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, Image
import matplotlib.pyplot as plt
import io

class AnnualReportGenerator:
    def __init__(self, report_data: dict):
        self.data = report_data
        
    def generate_chart(self, chart_type: str, data: dict) -> bytes:
        """生成图表PNG字节流"""
        fig, ax = plt.subplots(figsize=(6, 4))
        if chart_type == 'bar':
            ax.bar(data['labels'], data['values'], color='#4A90D9')
        elif chart_type == 'pie':
            ax.pie(data['values'], labels=data['labels'], autopct='%1.1f%%')
        elif chart_type == 'line':
            ax.plot(data['labels'], data['values'], marker='o', color='#E84D4D')
        
        plt.rcParams['font.sans-serif'] = ['SimHei']
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        plt.close()
        return buf.getvalue()
    
    def build(self, output_path: str):
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        # ... 构建报告内容
        doc.build(story)
```

---

## 八、前端新增页面清单

### 8.1 干预引导模块（教师/咨询端）

| 页面 | 路由 | 说明 |
|------|------|------|
| 方案库浏览 | /interventions/library | 分类浏览，支持搜索 |
| 方案详情 | /interventions/library/:id | 展示完整干预步骤/话术 |
| 创建干预计划 | /students/:id/interventions/new | 为学生建立干预计划 |
| 干预跟踪 | /students/:id/interventions/:planId | 会谈记录 + 进展 |
| 家长通知记录 | /students/:id/parent-comms | 家长沟通历史 |

### 8.2 地市管理端（新增角色）

| 页面 | 路由 | 说明 |
|------|------|------|
| 地市总览 | /region/dashboard | KPI卡片 + 趋势图 |
| 风险地图 | /region/risk-map | 各校风险热力图 |
| 学校对比 | /region/compare | 多维度横向对比表 |
| 学校详情 | /region/schools/:id | 单校数据摘要 |
| 报告管理 | /region/reports | 触发/下载年度报告 |

### 8.3 问卷构建器

| 页面 | 路由 | 说明 |
|------|------|------|
| 问卷列表 | /questionnaires | 自建问卷管理 |
| 构建器 | /questionnaires/builder | 拖拽式题目编辑器 |
| 数据收集 | /questionnaires/:id/data | 结果汇总与下载 |

---

## 九、开发排期（4-6个月）

### 9.1 Phase 2-A（Month 1-2）：架构升级 + 干预体系

| 周 | 任务 | 负责 |
|----|------|------|
| W1 | 多租户架构升级：Schema隔离改造 | 后端 |
| W1 | 地市/区域数据结构设计 + 迁移脚本 | 后端 |
| W2 | 消息队列（Bull）集成 + 异步任务框架 | 后端 |
| W2 | 干预方案库数据录入（30+方案JSON化）| 内容 |
| W3 | 干预模块API（方案库/干预计划/会谈记录）| 后端 |
| W3 | 干预方案库浏览页 + 方案详情页 | 前端 |
| W4 | 学生干预计划创建 + 会谈记录页 | 前端 |
| W4 | 家长通知记录API + 页面 | 后端+前端 |
| W5 | 转介记录模块 | 后端+前端 |
| W5 | 问卷构建器（拖拽式，基础题型）| 前端 |
| W6 | 问卷发放 + 结果收集 + 统计 | 后端+前端 |
| W6 | 联调：干预 + 家长通知 + 问卷 | 全员 |

### 9.2 Phase 2-B（Month 3-4）：地市看板 + 报告生成

| 周 | 任务 | 负责 |
|----|------|------|
| W7 | 地市级API：总览/对比/风险分布 | 后端 |
| W7 | 地市端权限体系 + 角色设置 | 后端 |
| W8 | 地市总览看板页面 | 前端 |
| W8 | 风险热力图（基于echarts地图）| 前端 |
| W9 | 学校横向对比页面 | 前端 |
| W9 | 年度报告模板设计（Python PDF）| 后端 |
| W10 | 报告生成服务 + 异步队列 | 后端 |
| W10 | 报告触发/状态/下载页面 | 前端 |

### 9.3 Phase 2-C（Month 5-6）：定时排程 + 集成 + 上线

| 周 | 任务 | 负责 |
|----|------|------|
| W11 | 定时测评配置 + cron调度 | 后端 |
| W12 | 学籍数据对接（Excel标准模板 + 第三方API接口）| 后端 |
| W13 | 白标定制能力（Logo/主题色配置）| 前端 |
| W14 | 全面回归测试 + 性能优化 | 测试 |
| W15 | 地市试点部署 + 培训材料制作 | 全员 |
| W16 | 教育局演示版准备 + 销售材料支持 | 产品 |

---

## 十、二期验收标准

- [ ] 地市管理员可登录查看下属所有学校的汇总数据
- [ ] 风险热力图正确标注各学校风险等级
- [ ] 学校横向对比可选择3-5所学校并排展示
- [ ] 年度报告可在5分钟内生成完整PDF（包含图表）
- [ ] 干预方案库可按类别/学段/预警等级筛选，展示完整内容
- [ ] 心理老师可为学生创建干预计划并记录每次会谈
- [ ] 家长通知记录全程可追溯
- [ ] 定时测评可配置学期初/期中/期末自动发放
- [ ] 自定义问卷可构建并回收结果
- [ ] 不同地市之间的学校数据完全隔离，无跨租户数据泄漏
- [ ] 系统支持5000名学生同时在线填写（并发测试）
- [ ] 白标定制：Logo/颜色主题可通过配置文件修改，无需改代码
