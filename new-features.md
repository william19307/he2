# 心晴平台 · 新功能开发文档 v1.0

> 客户需求来源：邵武教育局 / 妇幼保健院心理科
> 文档版本：2026-03-26
> 优先级：需求四（体测）> 需求一（培训）> 需求二（打印）> 需求三（升学）

---

## 目录

1. 需求一：培训管理模块
2. 需求二：学生档案一键打印
3. 需求三：学生升学管理
4. 需求四：学生体测档案
5. 测试与验收清单

---

## 需求一：培训管理模块

### 1.1 功能说明

妇幼保健院心理科或教育局管理员，定期组织学校心理老师参与培训。
系统需支持：发布培训通知、跨校群发、事后录入参与状态、心理老师查看自己的培训记录。

**角色权限说明：**
- `admin` / `super_admin`：创建培训、发布通知、录入参与状态
- `counselor`：查看通知、查看自己的培训记录

### 1.2 数据库

```sql
-- 培训场次表
CREATE TABLE training_sessions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL COMMENT '培训标题',
    description     TEXT COMMENT '培训内容说明',
    organizer_id    BIGINT NOT NULL COMMENT '组织者（admin账号）',
    training_date   DATE NOT NULL COMMENT '培训日期',
    location        VARCHAR(200) COMMENT '培训地点',
    status          ENUM('draft','published','completed') DEFAULT 'draft',
    target_scope    ENUM('all','selected') DEFAULT 'all' COMMENT '通知范围',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id, status)
) COMMENT '培训场次';

-- 参与记录表
CREATE TABLE training_participants (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id      BIGINT NOT NULL,
    tenant_id       BIGINT NOT NULL,
    counselor_id    BIGINT NOT NULL COMMENT '参与的心理老师',
    school_name     VARCHAR(200) COMMENT '所在学校名称（冗余存储）',
    status          ENUM('invited','attended','absent') DEFAULT 'invited',
    attended_at     DATETIME COMMENT '实际参与时间（管理员录入）',
    note            VARCHAR(500) COMMENT '备注',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_session_counselor (session_id, counselor_id),
    INDEX idx_counselor (counselor_id)
) COMMENT '培训参与记录';
```

### 1.3 后端接口

```
POST   /api/v1/training/sessions                    创建培训（admin+）
GET    /api/v1/training/sessions                    培训列表（分页）
GET    /api/v1/training/sessions/:id                培训详情 + 参与人列表
PUT    /api/v1/training/sessions/:id                编辑培训（draft状态可编辑）
POST   /api/v1/training/sessions/:id/publish        发布通知（群发给所有counselor）
POST   /api/v1/training/sessions/:id/complete       标记为已完成
PUT    /api/v1/training/sessions/:id/participants   批量更新参与状态

GET    /api/v1/training/my                          我的培训记录（counselor视角）
```

**发布通知逻辑：**
发布时自动查询本租户（或全部租户，视 target_scope）的所有 counselor 账号，
批量写入 training_participants（status='invited'），
并写入 notifications 表推送站内通知。

**批量更新参与状态 Request Body：**
```json
{
  "participants": [
    { "counselor_id": 1001, "status": "attended", "attended_at": "2026-03-25T09:00:00+08:00" },
    { "counselor_id": 1002, "status": "absent" }
  ]
}
```

### 1.4 前端页面

**侧边栏位置：** 系统管理 → 培训管理

**培训列表页 `/training`：**
- Tab：全部 / 进行中 / 已完成
- 表格列：培训标题 / 日期 / 地点 / 参与人数 / 出席率 / 状态 / 操作
- [新建培训] 按钮（admin+ 可见）

**培训详情页 `/training/:id`：**
- 顶部：培训基本信息卡片
- 参与人员列表：姓名 / 学校 / 状态（已参加/未参加/待确认）/ 参与时间
- [批量标记出席] 按钮：多选后批量更新
- [发布通知] 按钮（draft 状态显示）
- [标记完成] 按钮（published 状态显示）

**心理老师视角 `/training/my`：**
- 侧边栏位置：主功能 → 我的培训
- 列表：培训名称 / 日期 / 地点 / 我的状态（已参加 / 未参加）
- 点击查看培训详情（只读）

---

## 需求二：学生档案一键打印

### 2.1 功能说明

心理老师在学生详情页，点击一键导出该学生的完整心理健康档案，
生成适合打印的页面，包含基本信息、体测记录、测评历史、预警记录、个案记录。

**技术方案：前端打印（不依赖后端PDF生成）**
使用 `window.print()` + 打印专用 CSS，避免服务器安装 puppeteer 带来的内存压力。

### 2.2 前端实现

**打印触发：**
学生详情页右上角新增 [打印档案] 按钮，点击后：
1. 打开新窗口 `/students/:id/print`
2. 页面自动调用 `window.print()`
3. 打印完成后可关闭

**打印页面 `/students/:id/print`：**
```
页面结构（A4纸竖向）：

---- 页眉 ----
心晴·中小学生心理健康管理平台 | 学生心理健康档案 | 打印日期：xxxx-xx-xx

---- 第一部分：基本信息 ----
姓名 / 性别 / 出生日期 / 年级班级 / 学号
监护人姓名 / 联系电话

---- 第二部分：体测记录（最近3条）----
日期 | 身高 | 体重 | BMI | 左视力 | 右视力

---- 第三部分：测评历史 ----
测评时间 | 量表名称 | 得分 | 结果等级 | 是否触发预警

---- 第四部分：预警记录 ----
预警时间 | 预警等级 | 触发原因 | 处置状态 | 处置人

---- 第五部分：个案记录 ----
建档时间 | 会谈次数 | 干预进展 | 结案状态

---- 页脚 ----
本档案仅供学校心理健康工作使用，请妥善保管，不得对外泄露。
```

**打印CSS：**
```css
@media print {
  .no-print { display: none; }  /* 隐藏导航、按钮等 */
  @page { size: A4 portrait; margin: 2cm; }
  table { page-break-inside: avoid; }
}
```

---

## 需求三：学生升学管理

### 3.1 功能说明

处理学生升学后的档案迁移，支持三种场景：
- **本校升学**：同一学校，更新年级班级，历史档案保留
- **跨校升学**：迁移到目标学校的心理老师名下
- **升入其他地市**：手填去向，档案进入"待认领"队列

### 3.2 数据库

```sql
-- students 表新增字段
ALTER TABLE students
  ADD COLUMN graduation_status 
    ENUM('enrolled','graduated','transferred','other') 
    DEFAULT 'enrolled' COMMENT '在读状态',
  ADD COLUMN transfer_school_id   BIGINT NULL COMMENT '迁入学校ID（跨校时）',
  ADD COLUMN transfer_school_name VARCHAR(200) NULL COMMENT '迁入学校名（跨地市时手填）',
  ADD COLUMN transfer_date        DATE NULL COMMENT '升学日期',
  ADD COLUMN transfer_status      
    ENUM('pending','claimed','archived') 
    DEFAULT NULL COMMENT '待认领状态';

-- 升学迁移记录表
CREATE TABLE student_transfers (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id          BIGINT NOT NULL,
    transfer_type       ENUM('same_school','cross_school','other') NOT NULL,
    from_tenant_id      BIGINT NOT NULL,
    from_school_name    VARCHAR(200),
    from_counselor_id   BIGINT,
    to_tenant_id        BIGINT NULL COMMENT '目标学校租户ID',
    to_school_name      VARCHAR(200) COMMENT '目标学校名称',
    to_counselor_id     BIGINT NULL COMMENT '目标心理老师',
    new_grade           VARCHAR(50) NULL COMMENT '新年级（本校升学时）',
    new_class           VARCHAR(50) NULL COMMENT '新班级（本校升学时）',
    transfer_date       DATE NOT NULL,
    status              ENUM('pending','claimed','archived') DEFAULT 'pending',
    note                TEXT,
    operator_id         BIGINT COMMENT '操作人',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (student_id),
    INDEX idx_status (status)
) COMMENT '学生升学迁移记录';
```

### 3.3 后端接口

```
POST /api/v1/students/:id/transfer          发起升学迁移
GET  /api/v1/transfers/pending              待认领学生列表（admin+）
POST /api/v1/transfers/:id/claim            认领并分配给指定老师（admin+）
POST /api/v1/transfers/:id/archive          归档（无法认领时）
GET  /api/v1/students/:id/transfer-history  该学生的迁移历史
```

**发起升学迁移 Request Body：**
```json
{
  "transfer_type": "cross_school",
  "new_grade": "高一",
  "new_class": "高一(1)班",
  "to_tenant_id": 5,
  "to_counselor_id": 2001,
  "to_school_name": "邵武第一中学",
  "transfer_date": "2026-09-01",
  "note": "成绩优秀，升入高中部"
}
```

**升学逻辑：**
```
本校升学：
  更新 students.grade / class_id
  写入 student_transfers，status='claimed'
  历史档案保留，counselor 不变

跨校升学（目标学校在系统内）：
  更新 students.tenant_id → 目标学校
  更新 students.counselor_id → 目标老师
  写入 student_transfers，status='claimed'
  原学校 counselor 不再看到该学生

跨校升学（目标学校不在系统内）或其他地市：
  students.graduation_status = 'transferred'
  students.transfer_status = 'pending'
  写入 student_transfers，status='pending'
  进入待认领队列

管理员认领：
  分配给目标老师
  student_transfers.status = 'claimed'
```

### 3.4 前端页面

**学生详情页新增 [办理升学] 按钮**

**升学 Modal：**
```
[升学类型] 单选：
  ○ 本校升学（更新年级班级）
  ○ 跨校升学（迁移到其他学校）
  ○ 升入其他地市

本校升学时显示：
  [新年级] 下拉
  [新班级] 下拉

跨校升学时显示：
  [目标学校] 搜索选择（系统内学校）
  [目标心理老师] 联动下拉

其他地市时显示：
  [学校名称] 文本输入（手填）
  [地市] 文本输入（手填）

[升学日期] 日期选择（必填）
[备注] 文本（选填）

底部提示：
  "升学后该学生的历史档案将完整保留"
```

**管理员待认领页面 `/transfers/pending`：**
- 侧边栏：系统管理 → 待认领学生
- 列表：学生姓名 / 原学校 / 升学去向 / 迁移日期 / 操作
- [分配给老师] → 弹窗选择目标老师
- [归档] → 无法处理时归档

---

## 需求四：学生体测档案

### 4.1 功能说明

在学生档案中新增体测记录 Tab，记录每次体测的身高、体重、视力等数据，
支持历史趋势查看，并在打印档案时包含体测数据。

**录入权限：** counselor / teacher / doctor / admin 均可录入

### 4.2 数据库

```sql
CREATE TABLE student_physicals (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id       BIGINT NOT NULL,
    student_id      BIGINT NOT NULL,
    record_date     DATE NOT NULL COMMENT '体测日期',
    height          DECIMAL(5,1) COMMENT '身高（cm）',
    weight          DECIMAL(5,2) COMMENT '体重（kg）',
    bmi             DECIMAL(4,2) COMMENT '体质指数（后端自动计算）',
    bmi_status      VARCHAR(20) COMMENT '偏瘦/正常/超重/肥胖',
    vision_left     DECIMAL(4,2) COMMENT '左眼视力',
    vision_right    DECIMAL(4,2) COMMENT '右眼视力',
    note            TEXT,
    recorder_id     BIGINT COMMENT '录入人ID',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (tenant_id, student_id),
    INDEX idx_date (record_date)
) COMMENT '学生体测记录';
```

**BMI计算规则（后端自动计算）：**
```
BMI = 体重(kg) / 身高(m)²

儿童青少年BMI判断标准（中国标准）：
  < 15.0  → 偏瘦
  15.0-23.0 → 正常
  23.0-27.5 → 超重
  ≥ 27.5  → 肥胖
```

### 4.3 后端接口

```
GET    /api/v1/students/:id/physicals            体测记录列表（按日期倒序）
POST   /api/v1/students/:id/physicals            新增体测记录
PUT    /api/v1/students/:id/physicals/:recordId  编辑记录
DELETE /api/v1/students/:id/physicals/:recordId  删除记录（counselor+）
```

**新增体测 Request Body：**
```json
{
  "record_date": "2026-03-22",
  "height": 165.5,
  "weight": 52.0,
  "vision_left": 4.8,
  "vision_right": 4.9,
  "note": "学期初体测"
}
```

**Response 新增字段：**
```json
{
  "bmi": 19.0,
  "bmi_status": "正常"
}
```

### 4.4 前端页面

**学生详情页新增"体测记录" Tab**

**Tab 内容：**

顶部数据卡（显示最新一条记录）：
```
身高          体重          BMI           视力（左/右）
165.5 cm     52.0 kg      19.0 正常      4.8 / 4.9
```

历史记录表格：
| 日期 | 身高 | 体重 | BMI | 状态 | 左视力 | 右视力 | 录入人 | 操作 |

[新增体测记录] 按钮

**新增体测 Modal：**
```
[体测日期] 日期选择（默认今天）
[身高] 数字输入，单位 cm，保留1位小数
[体重] 数字输入，单位 kg，保留1位小数
[BMI] 自动计算展示（灰色只读，含状态标签）
[左眼视力] 数字输入（如 4.8）
[右眼视力] 数字输入
[备注] 文本输入（选填）
```

---

## 测试与验收清单

### 需求一：培训管理

**功能验收：**
```
□ admin 账号能创建培训（填写标题/日期/地点/说明）
□ 发布培训后，所有 counselor 收到站内通知
□ admin 进入培训详情，能批量勾选参与人员标记出席
□ 单个 counselor 登录后，在"我的培训"能看到参与记录
□ 出席状态显示正确（已参加/未参加）
□ 培训列表按状态筛选正常
```

**边界测试：**
```
□ draft 状态的培训不发送通知
□ 已发布的培训不能再编辑基本信息
□ 同一个 counselor 在同一培训中只有一条参与记录
```

---

### 需求二：学生档案打印

**功能验收：**
```
□ 学生详情页右上角有[打印档案]按钮
□ 点击后打开新窗口，自动弹出打印对话框
□ 打印预览包含：基本信息、体测记录、测评历史、预警记录、个案记录
□ 打印样式整洁，无导航栏和按钮出现在打印内容中
□ 页脚有隐私声明
```

**边界测试：**
```
□ 没有体测记录时，体测部分显示"暂无记录"而非报错
□ 没有个案记录时，个案部分显示"暂无记录"
□ 打印内容超过一页时自动分页，表格不会被截断
```

---

### 需求三：学生升学管理

**功能验收：**

本校升学：
```
□ 办理升学选"本校升学"，更新年级班级后，原档案完整保留
□ 升学记录写入迁移历史
□ counselor 仍能看到该学生
```

跨校升学：
```
□ 选择目标学校后，能联动选择该学校的心理老师
□ 确认后，原 counselor 不再看到该学生
□ 目标 counselor 登录后能看到迁移过来的学生及完整档案
□ 迁移历史记录完整（from/to 均有记录）
```

其他地市/目标学校不在系统内：
```
□ 该学生进入待认领列表
□ admin 在"待认领学生"页面能看到该学生
□ admin 点击分配，能指定目标老师，分配后学生从待认领列表消失
□ 归档操作后学生状态变为 archived，不再显示在待认领列表
```

---

### 需求四：学生体测档案

**功能验收：**
```
□ 学生详情页有"体测记录" Tab
□ 新增体测记录时，BMI 自动计算并显示状态标签
□ 顶部数据卡显示最新一条记录的各项指标
□ 历史记录按日期倒序排列
□ 编辑和删除功能正常
□ 体测数据在打印档案时包含（需求二联动）
```

**BMI 计算验收：**
```
□ 身高 165cm，体重 52kg → BMI = 19.1，状态"正常"
□ 身高 150cm，体重 60kg → BMI = 26.7，状态"超重"
□ 只填身高不填体重，BMI 显示为空（不报错）
```

**边界测试：**
```
□ 同一学生同一日期可以有多条体测记录（允许重测）
□ 视力字段不填时，显示"-"而非 null 或 0
```

---

## 开发优先级与工时估算

| 需求 | 后端工时 | 前端工时 | 优先级 |
|------|---------|---------|--------|
| 需求四：体测档案 | 0.5天 | 1天 | P0（最简单，先做） |
| 需求一：培训管理 | 1天 | 2天 | P1 |
| 需求二：档案打印 | 0天 | 1天 | P1 |
| 需求三：升学管理 | 2天 | 2天 | P2（逻辑最复杂） |

**建议顺序：** 需求四 → 需求二 → 需求一 → 需求三

---

## 注意事项

1. **需求三跨校迁移**涉及 tenant_id 变更，操作前需二次确认弹窗，不可撤销
2. **需求一培训通知**发布后不可撤回，发布前提示确认
3. **需求四BMI标准**使用中国儿童青少年标准，非成人标准，后端计算时需根据年龄段调整阈值
4. **需求二打印**不要在打印内容中显示量表原始得分，只显示结果等级，保护学生隐私
