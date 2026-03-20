# 心理健康测评平台 — 三期工程开发文档（智能化与规模化）

> 目标：6个月，引入AI辅助能力、移动端、深度数据洞察，打造行业领先的完整心理健康管理平台  
> 前置条件：二期稳定运行，已积累足够真实数据支撑AI训练与调优

---

## 一、三期目标与范围

### 1.1 三期核心交付

| 能力模块 | 核心价值 |
|----------|----------|
| AI辅助评估 | 辅助老师解读报告、给出建议，降低专业门槛 |
| 移动端App | iOS/Android原生App，改善体验，扩大用户黏性 |
| 纵向追踪分析 | 学生心理健康发展曲线，长周期变化洞察 |
| 学校现有系统集成 | 对接教务系统、德育系统、学籍系统 |
| 家长端小程序 | 家长查看子女健康概况，接收通知，有限参与 |
| 高级数据分析 | 预测模型、群体干预效果评估、归因分析 |
| 内容资源中心 | 心理健康科普、学生自助工具 |
| 商业能力升级 | 订阅管理、计费模块、数据大屏（政府展示版）|

### 1.2 三期明确边界

- 不做：心理咨询视频预约（涉及医疗资质）
- 不做：AI直接诊断（辅助工具定位，不替代专业判断）
- 不做：数据对外公开接口（隐私合规要求）

---

## 二、AI辅助评估模块

### 2.1 功能定位

```
AI辅助评估 ≠ AI诊断
定位：AI是心理老师的助手，不是决策者
作用：
  1. 帮老师快速解读多份量表的综合含义
  2. 给出初步建议（非医疗建议）
  3. 识别量表间的关联模式
  4. 提示老师关注的重点问题
  5. 辅助生成个案记录草稿
```

### 2.2 AI功能清单

| 功能 | 描述 | 技术方案 |
|------|------|----------|
| 报告解读 | 多量表结果的综合解读文本 | LLM调用（调用Anthropic Claude API）|
| 风险分析建议 | 基于得分分布给出关注建议 | LLM + 规则引擎混合 |
| 干预方案推荐 | 根据测评结果推荐方案库中的合适方案 | 向量检索 + LLM排序 |
| 谈话问题建议 | 为老师生成初次谈话的参考问题 | LLM调用 |
| 个案记录辅助 | 根据老师输入的关键词生成记录草稿 | LLM调用 |
| 异常模式识别 | 识别学生多次测评的异常变化趋势 | 规则 + 统计模型 |

### 2.3 AI调用架构

```javascript
// AI服务封装层
class AIAssistantService {
    constructor() {
        this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        this.model = 'claude-opus-4-6';
    }
    
    // 综合报告解读
    async interpretAssessmentResults(studentProfile, assessmentResults) {
        const prompt = this.buildInterpretationPrompt(studentProfile, assessmentResults);
        
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1500,
            system: `你是一位专业的学校心理健康顾问助手，帮助心理教师理解学生的心理健康测评结果。
你的角色是辅助专业人员，不替代医疗诊断。
请用专业且易懂的语言，给出解读和建议，注意：
1. 不做医学诊断
2. 强调需结合实际情况判断
3. 每条建议都注明参考依据
4. 始终以学生利益为中心`,
            messages: [{ role: 'user', content: prompt }]
        });
        
        return response.content[0].text;
    }
    
    // 构建解读提示词
    buildInterpretationPrompt(profile, results) {
        return `
请帮我综合解读以下学生的心理健康测评结果：

学生信息：
- 年级：${profile.grade}年级
- 性别：${profile.gender}
- 近期主要变化：${profile.recent_changes || '无特别说明'}

测评结果：
${results.map(r => `
量表：${r.scale_name}
总分：${r.total_score}分（满分${r.max_score}分）
等级：${r.result_level}
子量表：${JSON.stringify(r.subscale_scores)}
`).join('\n')}

请提供：
1. 综合状况解读（100字以内）
2. 重点关注方向（列举2-3项）
3. 建议谈话切入点
4. 需要进一步了解的信息
5. 是否建议引入其他支持资源
        `;
    }
    
    // 干预方案推荐
    async recommendInterventions(assessmentSummary, availablePlans) {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 800,
            system: '你是心理干预方案匹配助手，根据学生评估情况，从可用方案中选择最合适的2-3个，并说明选择理由。',
            messages: [{
                role: 'user',
                content: `
评估摘要：${assessmentSummary}

可用方案列表：
${availablePlans.map((p, i) => `${i+1}. ${p.title}（适用：${p.target_issue}）`).join('\n')}

请推荐最合适的方案并说明理由。`
            }]
        });
        return response.content[0].text;
    }
    
    // 谈话建议生成
    async generateTalkGuide(studentContext, issueDescription) {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1000,
            system: '你是心理咨询技能培训助手，为心理教师提供初次谈话的参考问题和引导框架，基于来访者中心和认知行为理论。',
            messages: [{
                role: 'user',
                content: `
学生情况：${studentContext}
主要问题：${issueDescription}

请提供：
1. 开场白建议（如何开启话题）
2. 核心探索问题（5-6个开放式问题）
3. 需要避免的问题或话题
4. 本次谈话的合理目标设定`
            }]
        });
        return response.content[0].text;
    }
}
```

### 2.4 AI功能使用规范（合规要求）

```javascript
// AI输出必须附带免责声明
const AI_DISCLAIMER = `
⚠️ 以上内容由AI辅助生成，仅供专业心理教师参考。
不构成医学诊断或治疗建议。
最终判断请结合实际情况由专业人员做出。
`;

// AI分析结果日志记录（用于审计）
const logAIUsage = async (userId, featureType, inputHash, outputLength) => {
    await db.aiUsageLogs.create({
        user_id: userId,
        feature_type: featureType,
        input_hash: inputHash,  // 不存储原始输入，只存哈希
        output_length: outputLength,
        model_version: 'claude-opus-4-6',
        created_at: new Date()
    });
};
```

---

## 三、移动端App（React Native）

### 3.1 技术选型

| 选项 | 选型 | 理由 |
|------|------|------|
| 框架 | React Native | 一套代码iOS+Android，共享后端API |
| 导航 | React Navigation 6 | 成熟稳定 |
| 状态 | Zustand | 轻量，RN场景够用 |
| 本地存储 | MMKV | 比AsyncStorage快10x |
| 网络 | Axios | 与Web端统一 |
| 推送 | 极光推送（JPush）| 国内推送到达率高 |
| 图表 | Victory Native | RN友好的图表库 |
| 生物认证 | react-native-biometrics | 指纹/FaceID登录 |

### 3.2 移动端功能范围

**教师/咨询师App（主要用户）：**

```
首页
├── 待处理预警卡片（快速响应）
├── 今日需跟进学生列表
├── 进行中测评完成进度
└── 快速入口

预警中心
├── 红色/黄色预警列表
├── 预警详情（测评结果 + 处置建议）
├── 一键添加跟进记录
└── 通知推送（推送到手机）

学生管理
├── 班级列表 → 学生列表
├── 学生个人档案（趋势图）
├── 快速记录（语音转文字）
└── 发起临时测评

消息中心
├── 系统通知
├── 预警提醒
└── 任务到期提醒
```

**学生H5升级为App版本（可选）：**

```
任务列表 → 作答页 → 完成页（与一期H5功能相同，但体验更好）
心理知识（内容资源中心入口）
```

### 3.3 推送通知设计

```javascript
// 预警推送：红色预警必须推送，不可关闭
const PushService = {
    // 红色预警推送（高优先级，带声音）
    sendRedAlert: async (userId, alertInfo) => {
        await JPush.push({
            registration_ids: [await getUserDeviceToken(userId)],
            notification: {
                title: '⚠️ 紧急预警',
                alert: `${alertInfo.student_name}需要立即关注`,
                badge: 1,
                sound: 'alert.wav',
                extras: {
                    type: 'red_alert',
                    alert_id: alertInfo.id,
                    navigate_to: `/alerts/${alertInfo.id}`
                }
            },
            options: { apns_production: true, time_to_live: 86400 }
        });
    },
    
    // 任务到期提醒（可关闭）
    sendTaskReminder: async (userId, taskInfo) => {
        await JPush.push({ /* ... */ });
    }
};
```

---

## 四、家长端小程序

### 4.1 功能边界（审慎设计）

```
家长可以看到：
  ✓ 孩子已完成测评的时间和量表名称
  ✓ 综合心理健康状态（仅显示"良好/需关注/需要特别关注"三档，不显示具体分数）
  ✓ 学校推送的通知和建议
  ✓ 心理健康科普文章

家长不可以看到：
  ✗ 具体量表得分和题目作答
  ✗ 其他学生任何信息
  ✗ 心理老师的个案记录
  ✗ 转介和会谈内容
```

**设计理由：** 过度暴露细节可能引发家长焦虑，或导致家长对孩子施压；仅提供宏观状态和建议，保护学生隐私。

### 4.2 微信小程序技术方案

```javascript
// 使用微信小程序原生开发
// 家长认证：手机号 + 学生学号绑定（学校审核）

// app.js 核心配置
App({
    onLaunch() {
        // 微信授权登录
        wx.login({ success: res => this.globalData.code = res.code });
    },
    globalData: { userInfo: null, studentInfo: null }
});

// 家长绑定流程
// 1. 家长输入手机号 + 孩子学号
// 2. 系统验证：学号是否存在，家长电话是否与档案一致
// 3. 发送验证码到手机
// 4. 验证成功后绑定
```

### 4.3 家长端页面清单

| 页面 | 功能说明 |
|------|----------|
| 孩子心理健康概况 | 显示最近一次测评状态（三档）+ 趋势 |
| 学校通知 | 接收来自心理老师的通知消息 |
| 建议与指导 | 针对当前状态的家庭支持建议 |
| 科普资源 | 青少年心理健康知识库 |
| 联系心理老师 | 预约沟通时间（线下，非视频）|

---

## 五、纵向追踪分析

### 5.1 学生心理健康成长档案

```javascript
// 纵向分析数据结构
{
    "student_id": 12345,
    "grade_span": "初一 - 高三",  // 跟踪周期
    "assessment_timeline": [
        {
            "date": "2023-09-01",
            "grade": "初一上",
            "assessments": [
                { "scale": "PHQ-9", "score": 3, "level": "normal" },
                { "scale": "GAD-7", "score": 4, "level": "normal" }
            ]
        },
        {
            "date": "2024-03-01",
            "grade": "初一下",
            "assessments": [
                { "scale": "PHQ-9", "score": 8, "level": "mild_concern" },
                { "scale": "GAD-7", "score": 11, "level": "moderate" }
            ]
        }
    ],
    "significant_events": [
        { "date": "2024-01-15", "event": "父母离婚", "source": "case_record" }
    ],
    "interventions": [
        { "start": "2024-03-05", "end": "2024-04-20", "type": "individual_counseling", "sessions": 5 }
    ],
    "trend_analysis": {
        "overall_trend": "improving",  // improving/stable/declining/volatile
        "key_turning_points": [...],
        "resilience_score": 72  // 心理弹性评估
    }
}
```

### 5.2 群体效果评估

```python
# 干预效果量化分析
class InterventionEffectivenessAnalyzer:
    
    def compare_pre_post(self, scale_id: str, student_ids: list, 
                          pre_date: date, post_date: date) -> dict:
        """干预前后对比分析"""
        pre_scores = self.get_scores(scale_id, student_ids, pre_date)
        post_scores = self.get_scores(scale_id, student_ids, post_date)
        
        return {
            "sample_size": len(student_ids),
            "pre_mean": statistics.mean(pre_scores),
            "post_mean": statistics.mean(post_scores),
            "effect_size": self.cohens_d(pre_scores, post_scores),
            "improvement_rate": len([i for i in range(len(pre_scores)) 
                                    if post_scores[i] < pre_scores[i]]) / len(pre_scores),
            "statistical_significance": self.t_test(pre_scores, post_scores)
        }
    
    def analyze_class_intervention(self, class_id: int, plan_id: int) -> dict:
        """班级团体干预效果分析"""
        # 识别参与团辅的班级 vs 对照组
        # 比较前后测评变化
        pass
    
    def cohens_d(self, group1: list, group2: list) -> float:
        """计算效应量"""
        n1, n2 = len(group1), len(group2)
        var1 = statistics.variance(group1)
        var2 = statistics.variance(group2)
        pooled_std = ((( n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)) ** 0.5
        return (statistics.mean(group1) - statistics.mean(group2)) / pooled_std
```

---

## 六、内容资源中心

### 6.1 内容架构

```
内容资源中心
├── 学生自助工具
│   ├── 情绪日记（简单记录功能）
│   ├── 呼吸放松练习（动画引导）
│   ├── 正念音频（引导冥想）
│   └── 心情地图（情绪打卡）
│
├── 心理健康知识库
│   ├── 青少年情绪管理
│   ├── 压力应对技巧
│   ├── 人际交往技能
│   ├── 睡眠健康
│   └── 学习方法
│
├── 教师工具箱
│   ├── 心理健康课程资源
│   ├── 团体活动方案
│   ├── 主题班会材料
│   └── 家长会PPT模板
│
└── 家长指南
    ├── 如何与孩子谈论情绪
    ├── 识别孩子的心理信号
    ├── 支持孩子的实用方法
    └── 何时寻求专业帮助
```

### 6.2 内容数据库设计

```sql
-- 内容文章表
CREATE TABLE content_articles (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    title           VARCHAR(200) NOT NULL,
    category        ENUM('student_tool','knowledge','teacher_resource','parent_guide') NOT NULL,
    sub_category    VARCHAR(50),
    content         LONGTEXT NOT NULL COMMENT 'Markdown格式',
    cover_image     VARCHAR(500),
    target_audience JSON COMMENT '["student","teacher","parent"]',
    applicable_levels JSON COMMENT '适用学段',
    read_time_mins  INT COMMENT '预计阅读时间',
    is_published    TINYINT DEFAULT 0,
    view_count      INT DEFAULT 0,
    like_count      INT DEFAULT 0,
    tags            JSON,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category, is_published)
);

-- 互动工具记录（情绪日记等）
CREATE TABLE student_tool_records (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    tool_type       ENUM('mood_diary','breathing','mindfulness') NOT NULL,
    record_date     DATE NOT NULL,
    data            JSON NOT NULL COMMENT '工具记录数据',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_date (student_id, record_date)
);
```

---

## 七、系统集成能力

### 7.1 对外集成接口（Open API）

```yaml
# OpenAPI规范（供第三方系统集成）

# 学籍系统对接
/api/v1/sync/students:
  post:
    summary: 同步学生数据
    description: 支持教务系统推送学生信息变更
    security: [ApiKey]
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              tenant_code: {type: string}
              students:
                type: array
                items:
                  type: object
                  properties:
                    student_no: {type: string}
                    name: {type: string}
                    class_id: {type: string}
                    gender: {type: integer}
                    birth_date: {type: string}

# 德育系统数据共享（输出）
/api/v1/export/risk-summary:
  get:
    summary: 导出风险摘要（脱敏）
    description: 为德育管理系统提供班级风险摘要，不含个人识别信息
    security: [ApiKey, SchoolAdmin]
    parameters:
      - class_id: {in: query, type: integer}
      - semester: {in: query, type: string}
```

### 7.2 Webhook支持

```javascript
// 学校可配置Webhook，接收关键事件推送
const WEBHOOK_EVENTS = {
    'alert.red_triggered': '红色预警触发',
    'alert.closed': '预警已关闭',
    'assessment.plan_completed': '测评计划完成',
    'student.case_opened': '学生建立个案'
};

// Webhook发送服务
class WebhookService {
    async dispatch(tenantId, event, payload) {
        const config = await this.getTenantWebhookConfig(tenantId);
        if (!config?.url) return;
        
        const signature = this.sign(payload, config.secret);
        
        await axios.post(config.url, {
            event,
            payload,
            timestamp: Date.now()
        }, {
            headers: {
                'X-Webhook-Signature': signature,
                'X-Platform': 'MentalHealthPlatform'
            },
            timeout: 5000
        });
    }
    
    sign(payload, secret) {
        return crypto.createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }
}
```

---

## 八、商业能力模块

### 8.1 订阅计费系统

```sql
-- 订阅计划表
CREATE TABLE subscription_plans (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(50) NOT NULL COMMENT '如"学校基础版""学校专业版""地市版"',
    plan_type       ENUM('school','region') NOT NULL,
    billing_unit    ENUM('per_student','per_class','flat') NOT NULL,
    unit_price      DECIMAL(10,2) COMMENT '单价（元）',
    flat_price      DECIMAL(10,2) COMMENT '固定价格（flat类型）',
    min_units       INT COMMENT '最低购买数量',
    features        JSON COMMENT '功能权限清单',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 订阅记录
CREATE TABLE subscriptions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT,
    region_id       BIGINT,
    plan_id         BIGINT NOT NULL,
    status          ENUM('trial','active','expired','cancelled') NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    licensed_units  INT NOT NULL COMMENT '购买的学生数/班级数',
    actual_units    INT COMMENT '实际使用数量',
    contract_no     VARCHAR(100) COMMENT '合同编号',
    po_number       VARCHAR(100) COMMENT '采购单号',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 功能权限控制（基于订阅计划）
CREATE TABLE plan_features (
    plan_id         BIGINT NOT NULL,
    feature_key     VARCHAR(100) NOT NULL COMMENT '如"ai_assistant""region_dashboard"',
    is_included     TINYINT DEFAULT 1,
    limit_value     INT COMMENT '如每月AI调用次数上限',
    PRIMARY KEY (plan_id, feature_key)
);
```

### 8.2 功能权限控制中间件

```javascript
// 基于订阅的功能门控
const featureGuard = (featureKey) => async (req, res, next) => {
    const subscription = await getActiveSubscription(req.tenantId);
    if (!subscription) return res.status(402).json({ message: '无有效订阅' });
    
    const feature = await getPlanFeature(subscription.plan_id, featureKey);
    if (!feature?.is_included) {
        return res.status(403).json({ 
            code: 4031,
            message: `${featureKey} 功能不在当前订阅计划内`,
            upgrade_url: '/upgrade'
        });
    }
    
    // 检查用量限制
    if (feature.limit_value) {
        const usage = await getMonthlyUsage(req.tenantId, featureKey);
        if (usage >= feature.limit_value) {
            return res.status(429).json({ message: '本月使用量已达上限' });
        }
    }
    
    next();
};

// 使用示例
router.post('/ai/interpret', 
    featureGuard('ai_assistant'),
    aiController.interpretResults
);

router.get('/region/dashboard', 
    featureGuard('region_dashboard'),
    dashboardController.regionOverview
);
```

### 8.3 政府数据大屏（展示版）

```javascript
// 教育局汇报专用大屏，只读展示
// 建议使用Vue3 + ECharts实现

// 大屏数据API（聚合查询，高缓存）
app.get('/api/v1/bigscreen/region/:regionId', 
    cache(300),  // 缓存5分钟
    async (req, res) => {
        const data = await BigScreenService.getRegionData(req.params.regionId);
        res.json(data);
    }
);

// 大屏展示内容：
// - 全市学生心理健康总览（环形图）
// - 实时预警数量（数字滚动动效）
// - 各学段风险对比（柱状图）
// - 本年度测评完成率趋势（折线图）
// - 区域热力图
// - 重点工作完成情况（进度条）
```

---

## 九、新增数据库表（三期）

```sql
-- AI调用日志
CREATE TABLE ai_usage_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT,
    user_id         BIGINT NOT NULL,
    feature_type    VARCHAR(50) NOT NULL COMMENT 'interpret/recommend/talk_guide等',
    input_hash      VARCHAR(64) COMMENT 'SHA256哈希，不存原文',
    output_length   INT COMMENT '输出字符数',
    model_version   VARCHAR(50),
    tokens_used     INT,
    latency_ms      INT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_feature (user_id, feature_type),
    INDEX idx_tenant_date (tenant_id, created_at)
);

-- 纵向追踪数据（学生心理健康曲线）
CREATE TABLE student_longitudinal_snapshots (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    snapshot_date   DATE NOT NULL,
    grade           VARCHAR(20),
    dimension_scores JSON COMMENT '各维度标准化得分',
    overall_score   DECIMAL(5,2) COMMENT '综合心理健康评分0-100',
    risk_level      ENUM('normal','mild','moderate','severe'),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_date (student_id, snapshot_date),
    INDEX idx_tenant_student (tenant_id, student_id)
);

-- 家长端绑定关系
CREATE TABLE parent_student_bindings (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    parent_openid   VARCHAR(100) COMMENT '微信OpenID',
    parent_phone    VARCHAR(20) NOT NULL,
    student_id      BIGINT NOT NULL,
    relationship    ENUM('father','mother','guardian') NOT NULL,
    verified_at     DATETIME,
    status          ENUM('pending','verified','blocked') DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parent_student (parent_phone, student_id)
);

-- 内容互动记录
CREATE TABLE content_interactions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    article_id      BIGINT NOT NULL,
    action          ENUM('view','like','bookmark','share') NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_article (article_id, action)
);

-- Webhook配置
CREATE TABLE webhook_configs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL UNIQUE,
    url             VARCHAR(500) NOT NULL,
    secret          VARCHAR(100) NOT NULL,
    events          JSON COMMENT '订阅的事件列表',
    is_active       TINYINT DEFAULT 1,
    last_triggered  DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 十、三期开发排期（6个月）

### 10.1 Phase 3-A（Month 1-2）：AI能力 + 移动端框架

| 周 | 任务 | 负责 |
|----|------|------|
| W1 | AI辅助服务封装（Anthropic API集成）| 后端 |
| W1 | AI功能安全审计 + 免责声明体系 | 产品+后端 |
| W2 | 报告解读AI功能（测试+调优Prompt）| AI+后端 |
| W2 | 干预方案推荐AI功能 | AI+后端 |
| W3 | 谈话建议生成AI功能 + Web端UI | AI+前端 |
| W3 | React Native项目初始化 + 导航架构 | 移动端 |
| W4 | 移动端：首页 + 预警中心 | 移动端 |
| W4 | 移动端：推送集成（极光）| 移动端 |
| W5 | 移动端：学生档案 + 快速记录 | 移动端 |
| W6 | 移动端：iOS/Android测试 + 联调 | 移动端+后端 |

### 10.2 Phase 3-B（Month 3-4）：家长端 + 内容中心

| 周 | 任务 | 负责 |
|----|------|------|
| W7 | 家长小程序：架构 + 绑定流程 | 移动端 |
| W8 | 家长小程序：概况页 + 通知 | 移动端 |
| W9 | 内容资源中心：文章CMS + 前台展示 | 后端+前端 |
| W10 | 学生自助工具：情绪日记 + 呼吸练习 | 前端+移动端 |
| W11 | 纵向追踪分析：快照生成 + 趋势图 | 后端+前端 |
| W12 | 干预效果评估：前后对比分析 | 后端+前端 |

### 10.3 Phase 3-C（Month 5-6）：商业能力 + 集成 + 上线

| 周 | 任务 | 负责 |
|----|------|------|
| W13 | 订阅计费系统 + 功能权限门控 | 后端 |
| W14 | 政府大屏开发 | 前端 |
| W15 | Open API + Webhook + 集成文档 | 后端 |
| W16 | App上架（AppStore + Google Play）| 移动端 |
| W17 | 全面压力测试（10000并发）| 测试 |
| W18 | 安全渗透测试 + 隐私合规审查 | 安全 |
| W19 | 产品演示材料 + 销售话术 | 产品 |
| W20 | 正式发布 + 重点地市推广启动 | 全员 |

---

## 十一、隐私合规与安全（三期加强版）

### 11.1 数据安全要求

```
传输安全：
  - 全站HTTPS，TLS 1.3
  - 敏感字段额外加密（AES-256）：学生姓名、手机号、测评分数
  - API请求签名验证

存储安全：
  - MySQL透明加密（TDE）
  - 定时备份 + 异地容灾
  - 定期安全审计

访问控制：
  - 最小权限原则（RBAC精细化）
  - 敏感操作二次验证（管理员删除数据需二次确认）
  - 异常访问检测（同一IP短时间大量查询）

数据生命周期：
  - 学生毕业3年后，测评原始数据可匿名化处理
  - 用户可申请删除个人数据（留存法律要求的最小集合）
  - 明确数据保留期限，超期自动归档
```

### 11.2 合规声明

```
平台数据使用声明（需在系统中向所有用户展示）：
1. 学生心理健康数据仅用于本校心理健康服务，不对外共享
2. 测评数据采用加密存储，仅授权人员可访问
3. 向教育主管部门报送数据时，使用匿名化汇总数据
4. 学生可申请查看本人历史测评记录
5. 数据保留期限：学生在校期间 + 毕业后3年
```

---

## 十二、三期验收标准

### AI功能
- [ ] AI报告解读在30秒内完成，Prompt质量经3名心理专业人员评审
- [ ] 所有AI输出附带免责声明，不含诊断性结论
- [ ] AI功能调用日志完整记录，满足审计要求

### 移动端
- [ ] iOS App通过AppStore审核上架
- [ ] Android App通过Google Play及国内主流应用市场审核
- [ ] 红色预警推送到达率 ≥ 95%
- [ ] 冷启动时间 < 2秒

### 家长端
- [ ] 家长绑定认证流程完整，防止冒绑
- [ ] 家长可见数据经过严格脱敏，不泄露具体分数
- [ ] 信息安全渗透测试通过

### 商业能力
- [ ] 订阅计划可配置，功能门控精确生效
- [ ] 政府大屏在1920x1080分辨率下无布局异常
- [ ] Open API文档完整，集成示例通过验证

### 整体
- [ ] 系统支持20000名学生同时在线（并发压力测试）
- [ ] 核心功能可用性 ≥ 99.5%（月度统计）
- [ ] 数据安全通过第三方安全评测机构审查
- [ ] 隐私保护条款符合《个人信息保护法》要求
