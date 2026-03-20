# 心晴 · 中小学心理健康管理平台
## 高保真原型设计规范 v1.0

> 设计系统：Arco Design（字节跳动）
> 适用端：PC Web（主端）+ H5（学生答题端）
> 目标角色：学生 / 班主任 / 心理老师 / 学校医生 / 学校管理员 / 地市管理员

---

## 目录

1. 设计系统规范
2. 全局布局规范
3. 角色与权限矩阵
4. 页面清单总览
5. 登录 & 角色切换
6. 心理老师端 — 工作台
7. 心理老师端 — 预警管理
8. 心理老师端 — 学生档案
9. 心理老师端 — 个案管理
10. 心理老师端 — 测评计划
11. 心理老师端 — 量表题库
12. 心理老师端 — 干预方案库
13. 心理老师端 — 数据看板
14. 班主任端 — 班级工作台
15. 班主任端 — 班级看板
16. 学校管理员端
17. 地市管理员端
18. 学生 H5 端
19. 通用组件规范

---

## 一、设计系统规范

### 1.1 UI 组件库选型

**主库：Arco Design Vue 2.x（字节跳动开源）**

```bash
npm install --save-dev @arco-design/web-vue
```

引入方式（全量引入，原型阶段）：

```js
// main.js
import ArcoDesign from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
app.use(ArcoDesign)
```

图表库：`@arco-design/web-vue` 内置 + `@antv/g2` 复杂图表
图标库：`@arco-design/web-vue/es/icon`（内置 Arco Icon）

---

### 1.2 色彩系统

#### 品牌主色（覆盖 Arco Design Token）

```css
/* 在 arco-design 自定义主题配置中覆盖 */
:root {
  /* 主色 — 松绿，传递专业·安全·温和 */
  --color-primary-1: #e8f2f0;
  --color-primary-2: #c3ddd9;
  --color-primary-3: #9dc8c1;
  --color-primary-4: #6fa89a;
  --color-primary-5: #4a7c6f;   /* 品牌主色，按钮/链接/选中 */
  --color-primary-6: #3a6459;   /* hover 深化 */
  --color-primary-7: #2d5449;   /* active / 深色背景 */

  /* 功能色 — 直接复用 Arco 语义色 */
  --color-danger-6: #c0392b;    /* 红色预警 */
  --color-warning-6: #d4a017;   /* 黄色预警 */
  --color-success-6: #4a7c6f;   /* 正常状态 */
  --color-info-6:  #4A90D9;     /* 信息/操作 */
}
```

#### 中性色（直接使用 Arco 灰阶）

| Token | 值 | 用途 |
|---|---|---|
| `--color-text-1` | #1D2129 | 主要文字 |
| `--color-text-2` | #4E5969 | 次要文字 |
| `--color-text-3` | #86909C | 辅助文字 |
| `--color-text-4` | #C9CDD4 | 占位/禁用 |
| `--color-bg-1` | #FFFFFF | 卡片背景 |
| `--color-bg-2` | #F7F8FA | 页面背景 |
| `--color-bg-3` | #F2F3F5 | 悬停背景 |
| `--color-border-1` | #F0F0F0 | 细分割线 |
| `--color-border-2` | #E5E6EB | 边框 |
| `--color-border-3` | #C9CDD4 | 强边框 |

#### 预警专用色板

```css
/* 红色预警 */
--alert-red-bg:     #FFF1F0;
--alert-red-border: #FFCCC7;
--alert-red-text:   #C0392B;
--alert-red-icon:   #FF4D4F;

/* 黄色预警 */
--alert-yellow-bg:     #FFFBE6;
--alert-yellow-border: #FFE58F;
--alert-yellow-text:   #B8860B;
--alert-yellow-icon:   #FAAD14;

/* 正常 */
--alert-green-bg:     #F6FFED;
--alert-green-border: #B7EB8F;
--alert-green-text:   #3A6459;
--alert-green-icon:   #52C41A;

/* 观察中 */
--alert-blue-bg:     #E6F7FF;
--alert-blue-border: #91D5FF;
--alert-blue-text:   #1890FF;
```

---

### 1.3 字体规范

```css
/* 正文字体 */
font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
             "Noto Sans SC", sans-serif;

/* 数字专用字体（KPI数字更具冲击力）*/
.numeric { font-family: "DIN Alternate", "Helvetica Neue", sans-serif; }

/* 报告/标题用衬线 */
.title-serif { font-family: "Noto Serif SC", "Source Han Serif SC", serif; }
```

#### 字号体系（完全对齐 Arco）

| 等级 | Size | Weight | Line-height | 用途 |
|---|---|---|---|---|
| `title-xl` | 24px | 600 | 32px | 页面大标题 |
| `title-lg` | 20px | 600 | 28px | 模块标题 |
| `title-md` | 16px | 600 | 24px | 卡片标题 |
| `title-sm` | 14px | 600 | 22px | 表格列头、小标题 |
| `body-lg` | 14px | 400 | 22px | 正文 |
| `body-md` | 13px | 400 | 20px | 次级正文 |
| `body-sm` | 12px | 400 | 18px | 辅助说明 |
| `caption` | 11px | 400 | 16px | 时间戳、标签 |

---

### 1.4 间距系统

使用 Arco 标准 4px 基础间距：

```
4px  — 元素内间距（icon 与文字）
8px  — 紧凑间距（tag 内，小组件）
12px — 组件内 padding
16px — 卡片内 padding（紧凑）
20px — 卡片内 padding（标准）
24px — 卡片内 padding（宽松）
32px — 页面区块间距
48px — 大区块分割
```

---

### 1.5 圆角规范

| 场景 | 值 | Arco Token |
|---|---|---|
| 按钮、输入框、小标签 | 4px | `--border-radius-small` |
| 卡片、面板 | 8px | `--border-radius-medium` |
| 对话框、抽屉 | 8px | `--border-radius-medium` |
| 头像、大圆角卡片 | 50% | — |
| 预警通知条 | 6px | — |

---

### 1.6 阴影规范

```css
/* 卡片默认阴影 */
--shadow-card: 0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.1);

/* 卡片 hover 阴影 */
--shadow-card-hover: 0 4px 12px rgba(0,0,0,.12);

/* 对话框阴影 */
--shadow-modal: 0 12px 48px rgba(0,0,0,.18);

/* 顶部栏阴影 */
--shadow-header: 0 1px 4px rgba(0,0,0,.08);
```

---

## 二、全局布局规范

### 2.1 PC 端整体布局结构

```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR (220px fixed)  │  MAIN AREA (flex-1)        │
│                         │  ┌──────────────────────┐  │
│  [Logo + 系统名]        │  │  TOPBAR (56px fixed)  │  │
│                         │  └──────────────────────┘  │
│  [用户信息块]           │  ┌──────────────────────┐  │
│                         │  │  PAGE CONTENT        │  │
│  [Nav 菜单组]           │  │  padding: 20px 24px  │  │
│                         │  │                      │  │
│  [底部：版本/帮助]      │  │                      │  │
│                         │  └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Sidebar 宽度：** 220px（固定），可收缩至 64px（收缩模式）
**Topbar 高度：** 56px（固定），position: sticky top:0

### 2.2 Sidebar 组件规范

使用 `a-layout-sider` + `a-menu`：

```
Sidebar 背景色：#1A2B2E（深松绿，比品牌主色深30%）

Logo 区：
  - 高度 56px（与 Topbar 等高对齐）
  - Logo 图标 28×28px（品牌标志"晴"字 SVG）
  - 系统名："心晴平台" font-size:16px font-weight:600 color:#fff
  - 收缩时只显示 Logo 图标

用户信息块：
  - 底部固定，或紧接 Logo 下方
  - a-avatar size:32 + 姓名（14px）+ 角色标签（12px，半透明白）
  - 点击展开下拉：个人设置 / 修改密码 / 退出登录

导航分组（a-menu-item-group）：
  - 分组标题：10px ALL-CAPS 半透明白色，padding-left:12px
  - 菜单项高度：40px
  - 选中项：背景 rgba(255,255,255,0.15)，左侧 3px 实线竖条（品牌主色）
  - 图标：Arco Icon 16px，margin-right:10px
  - 消息气泡：a-badge 红色，绝对定位于菜单项右侧
  - 子菜单：内嵌展开，background #152325（更深）
```

**导航菜单完整结构（心理老师角色）：**

```
── 工作台
   ● 首页工作台        /dashboard
   ● 待办事项          /todos         [角标：数字]

── 预警管理
   ● 预警列表          /alerts        [角标：红点]
   ● 预警处置记录      /alerts/logs

── 学生管理
   ● 全部学生          /students
   ● 个案管理          /cases
   ● 学生心理档案      /profiles

── 测评管理
   ● 测评计划          /plans
   ● 我的量表          /scales
   ● 测评记录          /records

── 干预支持
   ● 干预方案库        /interventions
   ● 干预跟进          /interventions/tracking
   ● 家长沟通记录      /parent-comms

── 数据分析
   ● 班级看板          /dashboard/class
   ● 个人档案看板      /dashboard/student
   ● 测评统计报告      /reports
```

### 2.3 Topbar 组件规范

使用 `a-layout-header`：

```
左侧：
  - 收缩/展开侧边栏按钮（a-button type:text，MenuFoldOutlined 图标）
  - 面包屑导航（a-breadcrumb）

右侧（从右到左）：
  - 用户头像 + 名字下拉菜单
  - 全局通知铃铛（a-badge + BellOutlined），点击展开通知抽屉
  - 全局搜索（SearchOutlined，点击展开 a-modal 全局搜索）
  - 角色切换器（如果用户有多角色，显示当前角色 tag，可切换）
```

### 2.4 页面内容区布局模式

**模式一：纯列表页**
```
[PageHeader: 标题 + 说明 + 右侧操作按钮]
[筛选工具栏: a-form inline + a-button 搜索/重置]
[数据表格: a-table，分页 a-pagination]
```

**模式二：看板页**
```
[PageHeader]
[KPI 卡片行: a-grid gutter:16，每格一个 a-card]
[图表区: 左右 or 上下分区，a-card 包裹图表]
[明细表格（可选）]
```

**模式三：详情页**
```
[返回按钮 + 面包屑]
[基础信息区：a-descriptions]
[Tab 切换：a-tabs]
[Tab 内容：时间线 / 表格 / 表单]
```

**模式四：左右分栏（个案详情）**
```
左侧固定 320px：学生基本信息 + 快速操作
右侧 flex-1：Tab 切换内容区
```

---

## 三、角色与权限矩阵

### 3.1 角色定义

| 角色 ID | 角色名 | 描述 |
|---|---|---|
| `student` | 学生 | 仅使用 H5 端完成测评，不登录 PC 端 |
| `teacher` | 班主任 | 查看本班学生状态，查看班级看板 |
| `counselor` | 心理教师 | 全功能使用，管理多个班级的测评和干预 |
| `doctor` | 学校医生 | 查看高风险学生，参与评估，无法发起测评 |
| `school_admin` | 学校管理员 | 配置学校组织架构、账号管理、查看全校数据 |
| `region_admin` | 地市管理员 | 跨校数据查看，年度报告，区域对比 |
| `super_admin` | 超级管理员 | 平台运营，租户管理，系统配置 |

### 3.2 功能权限矩阵

| 功能模块 | student | teacher | counselor | doctor | school_admin | region_admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 完成测评（H5）| ✓ | — | — | — | — | — |
| 查看本班学生列表 | — | ✓ | ✓ | — | ✓ | — |
| 查看学生完整档案 | — | 部分 | ✓ | ✓ | ✓ | — |
| 创建测评计划 | — | — | ✓ | — | ✓ | ✓ |
| 查看量表题库 | — | ✓ | ✓ | ✓ | ✓ | — |
| 自建量表 | — | — | ✓ | — | — | — |
| 查看预警列表 | — | 本班 | ✓ | ✓ | ✓ | 汇总 |
| 处置预警 | — | — | ✓ | ✓ | — | — |
| 创建个案档案 | — | — | ✓ | ✓ | — | — |
| 查看干预方案库 | — | — | ✓ | ✓ | — | — |
| 记录干预会谈 | — | — | ✓ | ✓ | — | — |
| 记录家长沟通 | — | — | ✓ | — | — | — |
| 查看班级看板 | — | ✓ | ✓ | — | ✓ | — |
| 查看全校看板 | — | — | ✓ | — | ✓ | — |
| 查看地市看板 | — | — | — | — | 本校 | ✓ |
| 导出报告 | — | 班级 | ✓ | — | ✓ | ✓ |
| 账号管理 | — | — | — | — | ✓ | ✓ |
| 批量导入学生 | — | — | — | — | ✓ | — |
| 系统配置 | — | — | — | — | ✓ | ✓ |

---

## 四、页面清单总览

### 4.1 PC 端完整页面列表（共 42 个页面）

#### 公共页（3个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| P-001 | 登录页 | `/login` | 支持账号密码 + 短信验证码 |
| P-002 | 角色选择页 | `/select-role` | 多角色用户切换 |
| P-003 | 忘记密码 | `/forgot-password` | 手机号验证重置 |

#### 心理教师端（21个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| C-001 | 工作台首页 | `/dashboard` | KPI+预警+待办+趋势 |
| C-002 | 待办事项 | `/todos` | 全部待处理任务列表 |
| C-003 | 预警列表 | `/alerts` | 筛选+表格+批量操作 |
| C-004 | 预警详情 | `/alerts/:id` | 详情+处置流程+日志 |
| C-005 | 预警处置记录 | `/alerts/logs` | 全历史处置记录 |
| C-006 | 学生列表 | `/students` | 全学生检索+筛选 |
| C-007 | 学生详情 | `/students/:id` | 档案+测评历史+预警+个案 |
| C-008 | 个案列表 | `/cases` | 在案学生管理 |
| C-009 | 个案详情 | `/cases/:id` | 干预计划+会谈记录+时间线 |
| C-010 | 新建/编辑个案 | `/cases/create` | 建档表单 |
| C-011 | 测评计划列表 | `/plans` | 全部测评计划 |
| C-012 | 新建测评计划 | `/plans/create` | 分步骤向导 |
| C-013 | 测评计划详情 | `/plans/:id` | 进度+学生明细+结果汇总 |
| C-014 | 测评记录列表 | `/records` | 全部答卷记录 |
| C-015 | 单份答卷详情 | `/records/:id` | 题目详情+得分+建议 |
| C-016 | 量表列表 | `/scales` | 分类浏览+搜索 |
| C-017 | 量表详情 | `/scales/:id` | 题目预览+计分规则+预警阈值 |
| C-018 | 自建量表编辑器 | `/scales/create` | 拖拽式题目编辑 |
| C-019 | 干预方案库 | `/interventions` | 分类浏览+搜索 |
| C-020 | 干预方案详情 | `/interventions/:id` | 完整方案内容+话术 |
| C-021 | 家长沟通记录 | `/parent-comms` | 按学生归类的沟通历史 |
| C-022 | 班级看板 | `/dashboard/class` | 班级维度数据分析 |
| C-023 | 学生档案看板 | `/dashboard/student` | 单生维度深度分析 |
| C-024 | 测评统计报告 | `/reports` | 多维度汇总报告 |

#### 班主任端（4个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| T-001 | 班级工作台 | `/teacher/dashboard` | 本班概览+预警提醒 |
| T-002 | 本班学生 | `/teacher/students` | 本班学生列表+状态 |
| T-003 | 本班看板 | `/teacher/class-board` | 班级数据可视化 |
| T-004 | 测评通知 | `/teacher/tasks` | 当前进行中测评完成情况 |

#### 学校管理员端（7个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| A-001 | 全校总览 | `/admin/overview` | 全校 KPI 看板 |
| A-002 | 账号管理 | `/admin/users` | 全部账号 CRUD |
| A-003 | 组织架构 | `/admin/org` | 年级/班级管理 |
| A-004 | 学生管理 | `/admin/students` | 批量导入/管理 |
| A-005 | 定时测评配置 | `/admin/schedules` | 定期测评排程 |
| A-006 | 系统配置 | `/admin/settings` | 通知/白标/预警阈值配置 |
| A-007 | 操作日志 | `/admin/logs` | 全员操作审计 |

#### 地市管理员端（4个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| R-001 | 地市总览大屏 | `/region/overview` | 全地市数据看板 |
| R-002 | 学校对比 | `/region/compare` | 多校横向对比 |
| R-003 | 风险地图 | `/region/map` | 区域热力图 |
| R-004 | 年度报告 | `/region/reports` | 生成/下载年度报告 |

### 4.2 H5 端页面（学生答题端，共 6 个）

| # | 页面名 | 路由 | 说明 |
|---|---|---|---|
| H-001 | 身份验证 | `/h5/verify` | 学号+手机号验证，免密 |
| H-002 | 任务列表 | `/h5/tasks` | 待完成测评列表 |
| H-003 | 测评说明页 | `/h5/tasks/:id/intro` | 量表简介+注意事项 |
| H-004 | 作答页 | `/h5/tasks/:id/answer` | 逐题作答 |
| H-005 | 提交确认 | `/h5/tasks/:id/confirm` | 检查漏题，确认提交 |
| H-006 | 完成页 | `/h5/tasks/:id/done` | 提交成功+鼓励语 |

---

## 五、登录 & 角色切换（P-001 / P-002）

### 5.1 登录页（P-001）

**布局：** 左右分栏，左侧品牌展示区 50%，右侧表单区 50%

#### 左侧品牌区（50%）

```
背景：品牌主色渐变（#2d5449 → #4a7c6f）
内容（垂直居中）：
  - 品牌 Logo（SVG，白色）76px
  - 系统名："心晴" 32px Noto Serif SC 600 白色
  - 副标题："中小学生心理健康管理平台" 16px 白色 opacity:0.8
  - 分隔线 1px rgba(255,255,255,0.2) 宽40px
  - 三条核心价值 tag（带 ✓ 图标，12px 白色 opacity:0.7）：
      "50+ 标准化心理量表"
      "三级预警·实时处置"
      "符合教育部专项行动计划要求"
  - 底部：版权信息 11px opacity:0.4
```

#### 右侧表单区（50%）

```
背景：#FFFFFF
内容（水平垂直居中，宽320px）：

标题区：
  - "欢迎登录" 24px 600 --color-text-1
  - "请选择您的身份" 14px --color-text-3  margin-top:8px

角色快速选择（a-radio-group button 模式）：
  - 4 个 radio button 水平排列，全宽：
    [心理老师] [班主任] [学校医生] [管理员]
  - 选中：背景品牌主色，白色文字

登录方式切换（a-tabs，line 模式，2个 tab）：
  Tab 1：账号密码登录
    - 账号输入框（a-input，prefix icon: UserOutlined）
    - 密码输入框（a-input-password，prefix icon: LockOutlined）
    - 记住我 + 忘记密码（同行，flex justify-between）
    - 登录按钮（a-button type:primary，full width，高40px）

  Tab 2：手机号登录
    - 手机号输入框
    - 验证码输入框 + 发送验证码按钮（inline）
    - 登录按钮

底部：
  - "首次使用？联系管理员获取账号" 12px --color-text-3

Arco 组件清单：
  a-layout | a-form | a-form-item | a-input | a-input-password
  a-button | a-checkbox | a-tabs | a-radio-group | a-spin（加载中）
```

**表单验证规则：**

```
账号：必填，2-50字符
密码：必填，6-30字符
手机号：必填，正则 /^1[3-9]\d{9}$/
验证码：必填，6位数字
```

**错误状态：**

```
账号/密码错误：a-form-item validate-status:error，
  help:"账号或密码错误，还可尝试 N 次，超出将锁定30分钟"
账号锁定：全局 a-alert type:error，banner，
  "账号已锁定，请30分钟后重试或联系管理员"
```

---

### 5.2 角色选择页（P-002，多角色用户专用）

```
触发条件：同一手机号/账号绑定了多个角色（如：既是心理老师，又是初三班主任）

布局：居中卡片，最大宽560px

内容：
  - 标题："请选择本次登录身份"
  - 副标题："您的账号绑定了多个角色"

  角色卡片列表（每行2个，a-grid gutter:12）：
  每张卡片（可点击，a-card hoverable）：
    - 角色图标（Arco Icon 或自定义 SVG，32px，圆形底色背景）
    - 角色名称（14px 600）
    - 所属学校/班级（12px --color-text-3）
    - 最后登录时间（11px --color-text-4）
  
  选中卡片：边框变品牌主色 2px，左上角出现 ✓ 图标徽章

  确认按钮：a-button type:primary full-width
```

---

## 六、心理老师端 — 工作台首页（C-001）

**路由：** `/dashboard`  
**布局：** 标准模式一（看板型）  
**刷新策略：** 自动刷新间隔 60 秒（预警数据实时性要求）

### 6.1 PageHeader

```
左侧：
  - 标题："工作台"
  - 副标题："张晓慧老师，早上好 🌿 今日有 3 项待处理事项"
    （根据时间段变换问候语：早上好/下午好/晚上好）

右侧操作区：
  a-button-group：
    [今日日期 + 星期（只读文字，--color-text-3）]
    [a-button type:primary  icon:Plus  "新建测评计划"]
```

### 6.2 顶部 KPI 卡片行

使用 `a-grid` col-span 各 6（4 等分）：

#### 卡片通用结构

```
a-card
  body-style: padding:20px
  bordered: false
  style: box-shadow:var(--shadow-card)

  顶部：左侧"维度标签"（12px --color-text-3）+ 右侧趋势箭头 + 百分比变化
  中部：数字（DIN 字体，36px 600，--color-text-1）
  底部：说明文字（12px --color-text-3）

  左侧：3px 竖条 border-left 品牌色
```

**4 张 KPI 卡片内容：**

| 卡片 | 左竖条色 | 数字 | 标签 | 底部说明 |
|---|---|---|---|---|
| 本周完成测评人次 | #4a7c6f | 342 | ↑ +12 较上周 | 覆盖率 87.2% |
| 🔴 红色预警（待处理）| #C0392B | 3 | 需24h内处置 | 本月累计触发 8 次 |
| 🟡 黄色预警（跟进中）| #D4A017 | 12 | 其中5个超7天未更新 | 本月已关闭 8 个 |
| 个案在跟进 | #4A90D9 | 28 | 本周新增 2 | 本月结案 3 |

**KPI 卡片交互：**

```
hover：box-shadow 加深，cursor:pointer
click：导航至对应列表页（预警列表/个案列表等）
```

### 6.3 主内容区（两栏布局，左 60% 右 40%）

#### 左栏

**子区块 1：紧急预警（顶部优先展示）**

```
SectionHeader：
  左："🚨 待处理预警" 14px 600
  右：a-badge count:3 + a-button type:text "查看全部 →"

预警卡片列表（最多展示 5 条，按严重程度排序）：

每条预警卡片（a-card，padding:14px 16px，margin-bottom:8px）：
  背景色：红色预警 var(--alert-red-bg)，黄色 var(--alert-yellow-bg)
  左侧竖条：4px 品牌警告色
  
  内容布局（flex）：
    左侧：
      - 预警等级 Tag（a-tag color:red/orange，带圆点前缀）
      - 学生姓名（14px 600）+ 班级（12px --color-text-3）
      - 触发量表 + 得分（"PHQ-9 · 22分" 13px）
      - 时间（11px --color-text-4）：触发时间 + 距今
    右侧操作：
      - a-button type:primary size:small "立即处理"（红色预警）
        或 a-button type:default size:small "查看详情"（黄色预警）
  
  红色预警额外：
    - 顶部显示 a-alert type:error message:"此学生第9题自伤意念得分3分"
```

**子区块 2：近期测评任务进度**

```
SectionHeader：
  左："📋 进行中测评" 14px 600
  右：a-button type:text "新建 +"

进度卡片列表（a-list，每项）：
  - 测评计划名称（14px 500）
  - a-progress type:line，percent:数字，strokeColor:品牌色
  - 截止日期（12px）+ 完成情况文字（"342/392人完成"，12px --color-text-3）
  - 如即将截止（<3天）：日期标红，加 a-tag color:red size:small "即将截止"
```

#### 右栏

**子区块 1：本周工作概览（a-statistic 组）**

```
a-card 标题："本周工作"

a-descriptions 布局（2列）：
  新增预警：5 条
  已处置：2 条
  新增个案：1 个
  会谈次数：8 次
  家长沟通：3 次
  发出通知：12 条
```

**子区块 2：待办提醒列表**

```
a-card 标题："⏰ 待办提醒"  右侧："全部（11）"

a-list size:small，每项：
  - 图标（a-icon，按类型：⚠警告 📞电话 📝记录）
  - 事项描述（13px）
  - 到期时间（12px，超期标红）
  - a-checkbox（完成勾选）

待办类型：
  1. 红色预警未处置 → 🔴 高优先级（红色文字）
  2. 黄色预警跟进超期 → 🟡 中优先级
  3. 个案下次会谈计划日期到达 → 📅 提醒
  4. 测评计划即将截止 → 📋 提醒
  5. 家长回访计划 → 📞 提醒
```

**子区块 3：本月趋势图**

```
a-card 标题："📊 风险趋势（近30天）"

图表：折线图（@antv/g2 或 Arco Charts）
  X轴：近30天日期（每5天显示一个刻度）
  Y轴：预警触发数
  双折线：红色预警（红色线）/ 黄色预警（黄色线）
  数据点：hover 显示 tooltip（日期 + 红色 N 个 + 黄色 M 个）
  
图表下方：
  本月与上月对比文字（12px --color-text-3）
  "红色预警：本月 8 次，较上月 -3 次 ▼37.5%"（绿色表示改善）
```

---

## 七、预警管理（C-003 / C-004）

### 7.1 预警列表页（C-003）

**路由：** `/alerts`

#### 页面头部

```
PageHeader：
  标题："预警管理"
  操作区：a-button icon:Download "导出报告"（disabled 无选中时）

顶部统计卡片行（a-grid，4列）：
  - 红色预警（待处理）：3  背景 var(--alert-red-bg)
  - 黄色预警（跟进中）：12  背景 var(--alert-yellow-bg)
  - 本月已关闭：8
  - 平均处置时长：4.2小时
```

#### 筛选工具栏

```
a-form layout:inline，间距 a-space size:12

筛选项：
  [预警等级]       a-select：全部 / 🔴红色预警 / 🟡黄色预警
  [处置状态]       a-select：全部 / 待处理 / 处理中 / 已关闭 / 已撤销
  [触发量表]       a-select（多选，允许搜索）
  [触发时间]       a-range-picker（日期范围）
  [学生姓名/学号]  a-input-search placeholder:"输入姓名或学号"
  [所属班级]       a-cascader（年级→班级）
  [负责人]         a-select（心理老师列表）

右侧：
  a-button "搜索"（type:primary）
  a-button "重置"（type:default）
```

#### 数据表格

```
a-table
  rowSelection: checkbox（支持批量操作）
  scroll: x:1400（横向滚动）
  pagination: 页码 + pageSize 选择 + 总数显示

列定义：

  列1：学生姓名（fixed:left width:120）
    主：a-link 可跳转到学生详情
    副：12px 班级名称

  列2：预警等级（width:110）
    a-tag：
      红色预警 → color:red，图标 ExclamationCircleFilled
      黄色预警 → color:orange，图标 WarningFilled

  列3：触发量表（width:140）
    量表名称 + a-tag color:blue "得分:22/27"

  列4：触发原因（width:240，ellipsis:true）
    tooltip 显示完整原因

  列5：触发时间（width:160）
    格式：2025-03-17 09:23
    副：距今时间（"2小时前"，--color-text-3）

  列6：处置状态（width:100）
    a-badge + 文字：
      待处理 → status:error text:"待处理"
      处理中 → status:processing text:"处理中"
      已关闭 → status:success text:"已关闭"

  列7：负责人（width:100）
    a-avatar size:24 + 姓名 or "未指派"（--color-text-4）

  列8：SLA（width:120）
    红色预警：距截止时间倒计时 "剩余 21h 36m"（超时变红）
    黄色预警：跟进已过天数 "第 3 天"

  列9：操作（fixed:right width:180）
    a-button type:primary size:small "处理"（待处理状态）
    a-button type:default size:small "详情"
    a-dropdown 更多：指派 / 撤销预警 / 导出
```

**批量操作栏（选中行后浮现）：**

```
底部 fixed 浮层：
  "已选 N 条"  |  [批量指派]  [批量关闭]  [导出选中]  [取消选择]
```

---

### 7.2 预警详情页（C-004）

**路由：** `/alerts/:id`  
**布局：** 详情页模式（左右分栏）

#### 页头

```
a-page-header：
  back 按钮（← 返回预警列表）
  标题："预警详情 #AL-2025031701"
  副标题：触发时间
  右侧 extra：
    a-tag（预警等级）
    a-tag（处置状态）
    a-button type:primary "立即处置"（待处理状态才显示）
```

#### 左侧（320px固定）：学生快照

```
a-card padding:20px

学生头像（a-avatar size:64，显示姓名首字）
姓名 18px 600
性别 + 年龄 + 班级
学号

a-divider

a-descriptions bordered size:small（竖排）：
  监护人：张梦华
  联系电话：138xxxx1234（a-link 可拨打）
  最近测评：2025-03-17
  历史预警：共 3 次（本次第3次）
  个案状态：在案跟进中（a-tag color:blue）

a-divider

快速操作：
  a-button block icon:Phone "记录家长沟通"
  a-button block icon:FileAdd "创建/查看个案"
  a-button block icon:User "查看完整档案"
```

#### 右侧内容区（flex:1）

**Tab 1：预警详情**

```
触发测评结果 a-card：
  标题："PHQ-9 测评结果 — 2025-03-17 09:21完成"

  得分展示（大号）：
    总分："22 / 27 分"（DIN 字体，36px，红色）
    等级："重度抑郁区间"（16px，红色 a-tag）

  分项得分（a-table 简化版，无分页）：
  列：题号 / 题目摘要 / 作答选项 / 得分
  关键题高亮：第9题行背景红色，加"⚠ 关键题"badge

  预警触发说明（a-alert type:error）：
    "PHQ-9总分22分（重度抑郁），且第9题（自伤/死亡念头）作答2分以上，系统自动触发红色预警。"

  历史得分趋势：
    三点折线图（内嵌小图）：9月 8分 → 12月 15分 → 3月 22分
    注释："连续三次测评呈上升趋势，需重点关注"
```

**Tab 2：处置流程**

```
a-steps direction:vertical（当前步骤高亮）：

Step 1 系统触发预警（已完成）
  - 时间：2025-03-17 09:23
  - 内容：系统自动触发，已发送通知至张晓慧老师、王副校长

Step 2 确认接收（待处理）
  a-form（当前步骤展示）：
    [负责人]  a-select 选择心理老师（默认当前登录人）
    [确认说明] a-textarea placeholder:"简要说明初步判断和计划"
    [家长是否知情] a-radio-group
    a-button type:primary "确认接收，进入处理"

Step 3 跟进处置（未开始，disabled）

Step 4 结案（未开始，disabled）
```

**Tab 3：处置日志**

```
a-timeline：

每条日志：
  时间点颜色：红色（紧急操作）/ 蓝色（常规）/ 灰色（系统）
  内容：
    操作人（a-avatar size:20 + 姓名）
    操作类型（"确认接收" / "添加跟进记录" / "指派他人" / "关闭预警"）
    详细说明（14px --color-text-2）
    时间（12px --color-text-4）

末尾：a-button type:dashed block icon:Plus "添加跟进记录"
  点击展开内联表单（不跳转页面）：
    a-textarea "本次跟进内容"
    a-date-picker "下次计划日期"
    a-button "保存"
```

---

## 八、学生档案（C-007）

**路由：** `/students/:id`  
**布局：** 详情页左右分栏

### 8.1 档案头部（Profile Header）

```
背景：品牌主色深色渐变（#2d5449 → #3a6459），圆角8px
height: 120px

左侧：
  a-avatar size:72（显示姓名首字，白色背景，品牌色文字）
  姓名 20px 600 白色
  年级 + 班级 + 学号 | 性别 | 年龄（14px 白色 opacity:0.8）
  状态 tags：
    a-tag（心理状态：正常/需关注/高风险，不同背景色）
    a-tag color:blue（个案状态）

右侧：
  四格统计（竖线分隔）：
    测评次数 / 预警次数 / 会谈次数 / 建档时长
  a-button type:default（白色描边）"导出档案" icon:Download
  a-button type:primary "创建干预计划"
```

### 8.2 Tab 区域（a-tabs type:card）

**Tab 1：基本信息**

```
a-descriptions bordered title:null column:2

个人信息组：
  - 学号 / 性别 / 出生日期 / 年龄
  - 年级 / 班级 / 班主任
  - 入学时间 / 学籍状态

家庭信息组：
  - 监护人1（关系/姓名/电话）
  - 监护人2（关系/姓名/电话）
  - 家庭类型（双亲/单亲/离异/留守等）
  - 家庭经济状况（select，不强制填）
  - 居住情况（住校/走读）

特殊标注（a-alert type:warning，可折叠）：
  - 特殊关注标记（如：父母离异，2024-09备注）
  - 既往就医记录（如有，展示机构和时间）
  - 用药情况（敏感，仅医生/心理老师可见）
```

**Tab 2：测评历史**

```
筛选行：
  [量表类型] a-select 多选
  [时间范围] a-range-picker
  [风险等级] a-radio-group button

纵向时间轴 + 卡片：
每次测评一张卡片（a-card）：
  头部：量表名 + 完成时间 + 风险等级 tag + 分数
  身体：
    各子量表得分进度条（如 SCL-90 的9个因子）
    与正常范围对比（a-progress 内嵌参考线）
  底部：
    是否触发预警（a-tag）
    a-link "查看完整答卷"

跨次对比图（大区块，置于列表上方）：
  折线图：X轴=测评日期，Y轴=标准化得分，多量表多线
  图例可勾选开关各量表线条
  hover数据点显示：具体分数 + 风险等级 + 与上次对比
```

**Tab 3：预警记录**

```
a-timeline 样式：

每条预警：
  时间轴点颜色：红/黄
  标题：量表 + 得分 + 等级
  副标题：触发时间 + 处置人 + 处置状态
  body：触发原因说明
  末尾：关联的处置记录摘要（可展开）

"共触发 N 次预警 | 其中红色 M 次" 统计文字
```

**Tab 4：个案记录**

```
如已建档：
  个案基本信息（a-descriptions）：
    建档日期 / 负责老师 / 当前状态 / 优先级

  会谈记录列表（a-collapse 每次会谈一折叠项）：
    title：第N次会谈 · 日期 · 时长 · 负责人
    content：
      会谈内容（正文，富文本展示）
      学生情绪评级：a-rate size:small（1-5分）
      下次计划：时间 + 计划内容
  
  a-button type:dashed block "记录本次会谈"

如未建档：
  a-empty description:"暂无个案档案"
  a-button type:primary "为该学生建立个案档案"
```

**Tab 5：家长沟通**

```
a-list：
每条沟通记录：
  沟通方式（icon：电话📞 / 面谈👥 / 短信💬 / 书面📄）
  沟通对象（家长姓名 + 关系）
  沟通时间
  主要内容（摘要，click 展开完整记录）
  家长反馈（摘要）

a-button type:primary "记录家长沟通" icon:Plus
  点击展开 a-modal：
    [沟通方式] a-radio
    [沟通对象] a-select（从监护人列表选）
    [沟通时间] a-date-time-picker
    [主要内容] a-textarea 必填
    [家长态度] a-radio-group：配合/中立/抵触/联系不上
    [家长反馈] a-textarea
    [下次沟通计划] a-date-picker
```

**Tab 6：干预计划**

```
当前干预计划（a-card，如有）：
  标题 + 状态（进行中/已完成/已转介）
  参考方案 + 开始日期 + 计划次数
  进度：a-steps（已完成N次 / 共M次）

历史干预计划（a-collapse）

无计划时：
  a-button type:primary "制定干预计划"
    跳转至 /cases/:caseId 或展开 a-drawer
```

---

## 九、个案管理（C-009 — 个案详情）

**路由：** `/cases/:id`  
**布局：** 左 340px 固定 + 右侧 Tab 区

### 9.1 左侧：个案概览面板

```
a-card（高度 100vh sticky）

学生信息块（点击跳转档案页）：
  头像 + 姓名 + 班级
  心理状态 tag + 个案优先级 tag

a-divider

个案元数据（a-descriptions size:small）：
  建档日期：2025-01-15
  负责老师：张晓慧
  个案状态：进行中（a-badge status:processing）
  优先级：紧急（a-tag color:red）
  会谈进度：5/8 次计划

a-divider

关联预警（a-list size:small）：
  列出本案相关的所有预警（含已关闭），点击跳转

a-divider

快速操作按钮组（a-space direction:vertical block）：
  a-button type:primary block "记录本次会谈"
  a-button block "记录家长沟通"
  a-button block "查看完整学生档案"
  a-button block "推荐干预方案"
  a-button type:default danger block "标记为结案"（需二次确认）
```

### 9.2 右侧 Tab 区

**Tab 1：干预计划**

```
干预计划头部（a-descriptions bordered）：
  方案名称：轻度抑郁情绪干预方案（来自方案库）
  干预目标：[展示4条目标，a-list]
  开始日期：2025-01-15
  计划次数：8次
  当前进度：第5次会谈完成

干预步骤进度（a-steps direction:vertical）：
  每步：
    名称（"第1次：建立关系与情绪评估"）
    状态：finish/process/wait
    完成时间（finish状态显示）
    点击 finish 状态 → 展开该次会谈记录摘要

修改计划：a-button type:link "调整计划次数" / "更换参考方案"
```

**Tab 2：会谈记录**

```
操作区：a-button type:primary "记录新会谈"

a-list（时间倒序）：

每条会谈记录（a-card）：
  head：
    第N次会谈 · 14px 600
    日期 + 时长（如：2025-03-10 · 45分钟）
    负责人 a-avatar + 姓名
    学生情绪：a-rate size:small readonly（1-5分）

  body：
    会谈内容（pre-line 格式，最多显示200字，超出"展开"）
    干预进展评估（a-tag 标注：有所改善/维持/有所退步/明显改善）

  footer：
    下次计划：[日期] [计划内容摘要]
    a-button type:text size:small "编辑" / "删除"

"记录新会谈" 点击打开 a-modal（宽640）：
  第几次会谈（自动计算）
  [会谈日期] a-date-picker
  [实际时长] a-input-number suffix:"分钟"
  [学生情绪] a-rate 5级（1=非常差 5=很好）
  [会谈内容] a-textarea rows:8 必填（带字数统计）
  [干预进展] a-radio-group（明显改善/有所改善/维持/有所退步）
  [下次会谈计划] a-date-picker + a-input "计划内容"
  保存按钮
```

**Tab 3：个案时间线**

```
a-timeline 混合展示所有事件：

事件类型（不同颜色点）：
  🔴 预警触发（红色点）
  💬 会谈记录（绿色点）
  📞 家长沟通（蓝色点）
  📋 测评完成（灰色点）
  📁 建档（品牌色点）
  ✅ 结案（绿色点）

每个事件：
  日期 + 时间
  事件标题（bold）
  摘要（1-2行）
  a-link "查看详情"（跳转对应页）
```

**Tab 4：结案报告**

```
状态：进行中时为草稿状态，可随时填写

a-form：
  [结案日期]
  [结案原因] a-select：目标达成 / 转介 / 学生/家长撤销 / 其他
  [转介机构] （转介时必填）
  [总结报告] a-textarea rows:12（富文本，支持标题/加粗）
  [效果评估] a-rate 5级
  [随访计划] a-checkbox + a-date-picker

预览/打印：a-button "生成结案报告 PDF"
```

---

## 十、测评计划 — 新建向导（C-012）

**路由：** `/plans/create`  
**布局：** 分步骤向导（a-steps + 内容区）

### 10.1 向导步骤条

```
a-steps current:当前步骤 style:margin-bottom:32px

Step 1：基本设置
Step 2：选择量表
Step 3：配置目标
Step 4：通知设置
Step 5：预览确认
```

### 10.2 Step 1：基本设置

```
a-form layout:vertical labelCol:{span:24}

[测评计划名称] a-input maxLength:100 必填
  placeholder："如：2025年春季开学心理普测"
  额外说明：该名称将展示在学生H5端答题界面

[计划说明] a-textarea rows:3
  placeholder："此次测评背景说明，将显示在学生通知中"

[时间配置] 必填 a-form-item
  a-range-picker showTime format:YYYY-MM-DD HH:mm
  警告：结束时间不得少于24小时后

[最短再测间隔] a-input-number suffix:"天" defaultValue:30
  说明：同一量表对同一学生的最短作答间隔，避免频繁测评失真

[是否自动触发预警] a-switch defaultChecked:true
  开：提交后自动评分并按阈值触发预警
  关：仅收集数据，不触发预警（适合非正式调查）
```

### 10.3 Step 2：选择量表

```
左侧（320px）：量表分类导航
  a-menu mode:inline：
    情绪类（18）/ 压力类（8）/ 行为类（10）/ 人际类（8）/ 睡眠类（4）/ 自我类（6）/ 自建量表（N）

右侧（flex:1）：量表列表 + 已选看板

量表列表（a-table，可多选）：
  - 量表名称 + 简称
  - 题目数
  - 预计时长
  - 适用学段（a-tag 组）
  - 预警配置（有/无）
  - a-checkbox 选中列

已选量表面板（右侧抽屉或底部固定栏）：
  已选 N 个量表 | 总题数 N | 预计时长 N 分钟
  可拖拽排序（DragOutlined 图标）
  每项右侧 × 移除
  提示："建议单次测评不超过60分钟，以保证数据质量"

量表预览：点击量表名称，右侧展开预览 a-drawer（不跳转页面）：
  量表说明 / 题目列表 / 计分规则 / 预警阈值
```

### 10.4 Step 3：配置目标

```
[目标范围] a-radio-group vertical：
  ○ 全校所有学生
  ○ 指定年级（展开：a-checkbox-group 年级列表）
  ○ 指定班级（展开：a-tree-select 年级→班级，多选）
  ○ 指定学生（展开：学生搜索框，支持批量输入学号）

预估覆盖人数：动态计算展示
  "已选定 342 名学生 · 初一3班(48人)、初二全年级(196人)..."

[学段过滤] a-switch（与量表适用学段联动）：
  开：自动过滤掉不适用该量表的学段学生
  说明："PHQ-9适用初中/高中，小学生将自动排除在外"
```

### 10.5 Step 4：通知设置

```
[学生通知方式] a-checkbox-group：
  ☑ 系统内消息（H5端弹出通知）
  ☑ 短信通知（可选，需平台配置短信）
  ☐ 家长通知（由心理老师手动处理）

[通知内容] a-textarea 可编辑模板：
  预设文案（可修改）：
  "同学，您好！[学校名]心理老师邀请您完成一份心理健康调查问卷（[量表名]），预计需要[N]分钟，请在[截止日期]前完成。您的信息将严格保密，请放心如实作答。"

[提醒配置]：
  ☑ 截止前1天发送提醒
  ☑ 截止前3小时发送提醒
  ☐ 指定时间发送（a-time-picker）
```

### 10.6 Step 5：预览确认

```
a-descriptions bordered column:2：
  计划名称 / 创建人
  开始时间 / 截止时间
  包含量表（列表）/ 量表数量
  目标学生 / 覆盖人数
  预警设置 / 通知方式

高风险提示（a-alert type:warning）：
  "本次测评包含PHQ-9（含自伤意念题），请确保在测评期间及测评完成后24小时内有专人值班响应预警。"

底部操作：
  a-button "上一步"
  a-button type:default "保存为草稿"
  a-button type:primary "立即发布"（点击展开二次确认 a-popconfirm）
```

---

## 十一、量表题库（C-016 / C-017）

### 11.1 量表列表（C-016）

**布局：** 左侧分类导航 240px + 右侧内容区

#### 左侧分类树

```
a-tree（可勾选展开）：
  情绪类（18）
    ├ 抑郁评估（8）
    ├ 焦虑评估（7）
    └ 情绪调节（3）
  压力与应激类（8）
  行为与适应类（10）
    ├ 网络使用（3）
    ├ 校园欺凌（2）
    └ 社交行为（5）
  睡眠与躯体化类（4）
  自我认知类（6）
  人际关系类（6）
  ── 分割线 ──
  学校自建量表（N）

底部：
  a-button type:dashed block icon:Plus "创建自建量表"
```

#### 右侧量表列表

```
工具栏：
  [适用学段] a-radio-group button：全部 / 小学 / 初中 / 高中
  [预警配置] a-select：全部 / 含预警阈值 / 无预警配置
  a-input-search placeholder:"搜索量表名称"

a-list grid cols:2（卡片式）：

每张量表卡（a-card hoverable）：
  头部（彩色背景条，按类别色）：
    量表简称（20px 600 白色）
    a-tag size:small（适用学段，白色描边）

  主体：
    全称（14px 600 --color-text-1）
    描述摘要（2行 ellipsis，12px --color-text-3）

  底部（flex justify-between）：
    左：题数 · 时长（12px --color-text-3）
    右：
      a-tag color:green size:small "含预警" 或灰色
      a-button type:link size:small "预览"
      a-button type:primary size:small "加入计划"
```

---

### 11.2 量表详情（C-017）

**布局：** 标准详情页 + 右侧操作栏

#### 基础信息区

```
a-descriptions bordered column:3：
  量表全称 / 简称 / 版本
  题目数量 / 预计时长 / 计分类型
  适用年龄 / 适用学段 / 最短间隔
  来源/版权 / 信效度说明 / 引用文献（简）
```

#### Tab 区域

**Tab 1：题目预览（作答样式）**

```
顶部说明框（a-card color:blue）：作答说明原文

题目列表（按量表实际样式还原）：

  Likert量表：
    题号 + 题目正文
    a-radio-group button 水平排列：
      [从不 0] [偶尔 1] [有时 2] [经常 3]（禁用状态，仅预览）

  单选题：
    a-radio-group vertical

  多选题：
    a-checkbox-group

特殊标注：
  反向计分题目：右侧标注 a-tag color:orange size:small "反向计分"
  预警关键题：右侧标注 a-tag color:red size:small "预警关键题"，加红色背景高亮
```

**Tab 2：计分规则**

```
维度说明（a-table）：
  列：维度名称 / 包含题目 / 计分方式 / 得分范围

结果分级（a-table color 行）：
  列：分数范围 / 结果等级 / 描述 / 建议
  行背景按风险着色（绿/黄/橙/红）

特殊计分说明（a-alert type:info）：
  如："总分使用均分法，各分量表分开计算，不加总"
```

**Tab 3：预警阈值配置**

```
总分预警规则（a-table 可编辑）：
  列：分数范围 / 预警等级 / 描述

单题预警规则（a-list）：
  每条：第N题 + 条件 + 触发等级 + 原因

a-button type:default "修改阈值配置"（counselor+权限）
```

**Tab 4：使用统计**

```
使用次数：a-statistic
最近使用：a-list（按计划列表）
预警触发率：donut 图（正常/黄/红 占比）
```

---

## 十二、干预方案库（C-019 / C-020）

### 12.1 方案库列表（C-019）

**布局：** 分类卡片入口 + 方案列表

#### 分类入口（a-grid 3列）

```
每个分类卡（a-card hoverable，带色块）：
  顶部：分类图标（emoji 或自定义 SVG，40px）+ 色块背景
  标题：分类名（16px 600）
  描述：适用情况（12px 2行）
  底部：方案数量（"12 个方案"，品牌色）

6个分类：
  💙 情绪调节类  💚 人际关系类  📚 学业压力类
  🏠 家庭压力类  🌱 自我发展类  ⭐ 危机干预类
```

#### 筛选条件

```
[分类] a-select（多选）
[适用预警等级] a-checkbox-group：🔴红色 / 🟡黄色
[适用学段] a-checkbox-group：小学/初中/高中
[干预形式] a-checkbox-group：个体/团体/家庭
[搜索] a-input-search
```

#### 方案列表（a-list）

每条方案（a-card）：
```
头部：
  方案名（16px 600）
  右侧 tags：[适用学段] [干预形式] [计划次数]

主体（2栏）：
  左：适用情况描述（13px）
  右：推荐指标（如"PHQ-9：5-9分"）

底部：
  干预目标数量 + 会谈次数 + 预计周期
  a-button "查看详情"  a-button type:primary "为学生创建计划"
```

---

### 12.2 干预方案详情（C-020）

**路由：** `/interventions/:id`

#### 信息头

```
面包屑导航
标题（20px 600）+ 适用说明（14px --color-text-2）
Tags：分类 / 学段 / 形式 / 评估指标

操作按钮：
  a-button type:primary icon:Plus "为学生创建此方案"
  a-button icon:Copy "复制为自建方案"
```

#### Tab 区域

**Tab 1：方案概述**

```
a-card 目标（a-list check-style）：
  ✓ 帮助学生识别并命名情绪
  ✓ 建立行为活化计划
  ✓ 学习2-3种调节技能
  ✓ 改善睡眠和运动习惯

干预步骤时间轴（a-steps direction:vertical）：
  每步：
    会谈编号 + 标题（"第1次：建立关系与情绪评估"）
    时长建议（45分钟）
    本次目标（2-3条）
    重点说明（a-alert type:info，蓝色提示框）
    推荐活动（a-tag 列表）

转介标准（a-alert type:warning）：
  黄色警示框，说明何种情况建议转介
```

**Tab 2：谈话引导框架**

```
说明（a-alert type:info）：
  "以下为参考性话术框架，请根据学生实际情况灵活运用，切勿照本宣科。"

各阶段话术（a-collapse 每次会谈一折叠）：

每次会谈折叠内容：
  开场引导（示例：卡片块，浅色背景，斜体）
  核心探索问题（a-list，带序号）
  常见学生反应与应对建议（两列：学生反应 / 建议回应）
  本次禁忌（a-alert type:error，红框）
    如："禁止直接询问"你有没有想自杀"，应使用量表标准问法"
```

**Tab 3：推荐活动与工具**

```
a-list：
每项活动：
  活动名称（14px 600）
  适用场景（12px --color-text-3）
  活动说明（正文）
  所需材料（a-tag 列表）
  a-button type:link "下载材料" （如有附件）
```

**Tab 4：家长沟通模板**

```
不同场景模板（a-tabs 横向）：
  Tab：初次告知 / 进展汇报 / 家庭建议 / 转介告知

每个模板：
  a-textarea readonly 显示模板内容
  a-button "复制模板" icon:Copy
  a-button "编辑后发送"（填写学生信息后快速发送记录）
```

---

## 十三、数据看板

### 13.1 班级看板（C-022）

**路由：** `/dashboard/class`

#### 选择器头部

```
a-form layout:inline：
  [选择班级] a-cascader（年级→班级，必选）
  [测评计划] a-select（该班级的历史测评计划列表）
  a-button type:primary "查看"

标题区（选定后显示）：
  "初二(3)班 · 2025春季开学心理普测"
  副标题：参与人数 / 完成情况 / 测评时间范围
  右侧：a-button icon:Download "导出班级报告 PDF"
```

#### KPI 行（4卡片）

```
完成率 92%（进度环图 a-progress type:circle）
高风险 2人（红色数字）
需关注 6人（黄色数字）
平均得分 [量表名] / 各量表均分列表
```

#### 主内容区（两栏）

**左栏：各维度分析**

```
a-card 标题："各量表班级平均分 vs 全年级平均"

分组条形图（G2 bar）：
  每个量表一组，左=班级均分，右=年级均分（灰色对照）
  tooltip显示：具体分值 + 风险等级标注

分析结论（a-alert type:warning 如有）：
  自动生成："焦虑（GAD-7）维度班级均分6.8分，
  显著高于年级均分5.1分，建议关注该班级焦虑情绪"
```

**右栏：风险分布**

```
a-card 标题："学生风险分布"

甜甜圈图（donut chart）：
  正常 / 黄色预警 / 红色预警 / 未完成

下方学生分级列表（a-collapse）：
  红色高风险（2人，展开显示学生列表）
  黄色需关注（6人，展开显示学生列表）

每个学生条目：
  a-avatar + 姓名 + 主要风险维度 + 得分
  a-button type:link size:small "查看档案"
```

#### 学生明细表格

```
a-table 完整学生列表：
  学生姓名 / 各量表得分（多列）/ 综合状态 / 操作

得分列颜色逻辑：
  正常范围：默认黑色
  轻度：a-tag color:orange
  中度以上：a-tag color:red
```

---

### 13.2 学生档案看板（C-023）

**路由：** `/dashboard/student`（也可从学生详情页进入）

```
学生选择器（同班级看板逻辑）

选定学生后展示：

学生基础 Profile（同C-007档案头部，简化版）

核心指标卡片（多维度）：
  - 心理健康综合评分（0-100，大圆形仪表盘，@antv/g2 gauge）
  - 近半年预警次数 / 近半年测评次数 / 当前风险等级

纵向趋势图（多量表多线，时间轴折线图）：
  X轴：历次测评日期
  Y轴：标准化得分（0-100映射）
  图例：可勾选各量表线条
  标注：预警触发点（红点/黄点），干预记录点（绿三角）

各维度雷达图（spider chart）：
  维度：抑郁/焦虑/压力/人际/睡眠/自我
  当前 vs 上次 vs 入学基线（三层叠加）

时间线（横向滑动）：
  按时间轴展示：测评 → 预警 → 干预 → 会谈 → 复测的完整脉络
```

---

## 十四、班主任端

### 14.1 班级工作台（T-001）

**路由：** `/teacher/dashboard`

```
页头："初二(3)班 工作台 — 张明老师"

顶部通知区（如有未读预警）：
  a-alert type:error banner:true
  "您班级有1名学生触发红色预警，请联系心理老师张晓慧处理"

KPI 卡片（4个，权限简化版）：
  本班完成率 / 班级高风险人数 / 班级需关注人数 / 本次测评剩余天数

进行中测评（同C-001简化版，仅本班数据）

本班学生状态列表（简化表格）：
  姓名 / 状态（仅显示：正常/需关注/高风险，不显示具体分数）/ 完成情况
  
  权限说明文字（底部）：
  "学生具体测评分数及档案由心理老师管理，如需了解请联系心理老师。"
```

---

## 十五、学校管理员端

### 15.1 全校总览（A-001）

```
PageHeader："XX中学 · 2025年春季学期"

KPI 行（5卡片）：
  全校学生数 / 本学期测评覆盖率 / 红色预警（待处理）
  黄色预警（跟进中）/ 个案在档数

全校年级对比（a-card）：
  分组柱状图：X=各年级，Y=心理健康均分
  各年级一栏，分多个量表维度叠加或分组

各班级状态表（a-table）：
  年级 / 班级 / 完成率 / 高风险人数 / 黄色预警数 / 状态
  点击班级名：跳转班级看板（C-022）

预警处理情况（a-card）：
  本月预警处置率进度条
  平均处置时长
  未处置最久的预警（简列）
```

### 15.2 账号管理（A-002）

```
a-table：
  列：姓名 / 角色 / 所属班级 / 账号 / 状态 / 最后登录 / 操作

操作：
  a-button "新增账号"（打开 a-modal）
  a-button icon:Upload "批量导入（Excel模板）"
  每行：编辑 / 禁用 / 重置密码 / 删除

新增账号弹窗（a-modal）：
  [真实姓名] [角色] [账号/手机号] [初始密码]
  [所属年级/班级]（按角色显示不同选项）
  [是否发送通知短信]
```

### 15.3 定时测评配置（A-005）

```
配置列表（a-table）：
  配置名 / 量表 / 频率 / 下次触发时间 / 状态 / 操作

新增配置（a-drawer）：
  [配置名称]
  [选择量表] a-select 多选
  [目标学段] a-checkbox-group
  [触发频率] a-select：
    每周一次（选择星期几）
    每月一次（选择几号）
    学期初（开学后N天）
    期中（第N周）
    期末（期末考前N天）
    自定义（cron 表达式）
  [每次开放天数] a-input-number
  [有效期] a-range-picker（开始生效/结束生效日期）
```

---

## 十六、地市管理员端

### 16.1 地市总览（R-001）

```
全屏看板风格（可切换为普通页面布局）

顶部：
  地市名称 + 学期 + 最后更新时间 + 刷新按钮
  [切换全屏]  [导出数据]

KPI 行（6卡片）：
  辖区学校总数 / 参测学校数 / 学生总数
  全地市完成率 / 红色预警合计 / 黄色预警合计

主图区（两栏）：

左栏：各校风险对比（排行榜式）
  横向条形图（sorted by 高风险率）
  每校一条：校名 + 色阶条 + 具体数值
  红色超阈值（如高风险率>5%）高亮

右栏：全地市维度热力图
  学段 × 维度 的热力矩阵（颜色深浅=风险程度）
  行：小学/初中/高中
  列：抑郁/焦虑/压力/人际/睡眠

底部：趋势图（全地市近半年预警率折线）
```

### 16.2 学校对比（R-002）

```
筛选：
  [选择学校] a-select 多选（最多6所）
  [比较维度] a-select（完成率/高风险率/各量表均分/预警处置率）
  [时间范围] a-select（本学期/本学年/自定义）

雷达图对比（多边形叠加，各校不同颜色）

明细表格（a-table）：
  行：各校
  列：各比较维度
  高亮：最优（绿底）/ 最差（红底）

数据导出：a-button icon:Download "导出对比报告"
```

---

## 十七、H5 学生答题端

### 17.1 全局 H5 设计规范

```
宽度：375px（iPhone SE/8 基准，适配至 428px）
安全区：底部 safe-area-inset-bottom

H5 框架：Vue3 + Vant 4（轻量移动端组件库）
字体：系统字体（iOS: -apple-system，Android: Roboto）

主色调：沿用品牌色 #4a7c6f，但更柔和明亮

设计原则：
  - 极简，减少学生作答时的认知负担
  - 题目字号 ≥ 16px，选项按钮 ≥ 44px 触控目标
  - 进度可见（顶部进度条）
  - 禁止显示具体得分（保护数据隐私，避免学生焦虑）
  - 提交后展示鼓励性文案，不分析结果
```

### 17.2 身份验证（H-001）

```
微信内打开，或直接 URL 访问

页面结构：
  Logo + "心理健康测评" 大标题
  卡片：
    说明文字："请用您的学号和绑定手机号验证身份"
    [学号] van-field
    [手机号] van-field type:tel
    [验证码] van-field + 发送按钮（inline）
    van-button type:primary block "验证并进入"
  
  底部：隐私说明（12px，点击展开详情）
    "您的测评结果仅供学校心理老师查看，不会公开，请放心如实填写。"
```

### 17.3 任务列表（H-002）

```
顶部：
  van-nav-bar title:"我的测评" right-text:"历史记录"
  
  问候语："[学生姓名]同学，你好！"

待完成列表（van-list）：
  每项（van-cell-group + van-cell）：
    量表名称（16px 500）
    截止日期（12px，< 24小时变红）
    预计时长（"约5分钟完成"）
    van-tag type:warning "待完成" 或 type:success "已完成"
    右箭头 →

空状态：
  van-empty description:"暂无待完成的测评，您很棒！"

底部固定：
  如有待完成："您有 N 项测评待完成，请尽快作答"（提示条）
```

### 17.4 测评说明页（H-003）

```
van-nav-bar title:[量表名称]

内容区：
  量表图标（SVG，64px，居中）
  量表名称（20px 600，居中）
  
  信息卡（van-cell-group）：
    题目数量：9题
    预计时长：约5分钟
    作答方式：单选，请选择最符合您近两周的状态
  
  作答说明（大段文字，14px 行高1.7）：
    卡片内展示量表原版作答指导语
  
  注意事项（van-notice-bar）：
    "本次测评完全保密，结果仅学校心理老师查看"

  开始按钮：
    van-button type:primary block size:large round "开始作答"
    底部：已完成 N/M 题（继续作答提示）
```

### 17.5 作答页（H-004）

```
顶部固定：
  van-progress percentage:进度百分比 color:#4a7c6f
  "第 N / M 题"（12px 居中，--color-text-3）

主体：
  题目文字（16px 行高1.7，padding:20px）

  选项区（不同题型）：
  
  Likert 单选（最常见）：
    van-radio-group 竖向排列
    每个选项 van-radio：
      label区域：文字描述（如"从不" / "有几天"）
      右侧：频率说明（如"0天"）
    每个 van-radio cell 高度 ≥ 52px
    选中：左侧实心圆 + 背景色 var(--color-primary-1)

  语义差异量表（-3到+3等）：
    两端锚点文字 + van-slider 中间滑动
    当前值高亮显示

  文本输入：
    van-field type:textarea autosize rows:3

底部固定操作区：
  a-button "上一题"（type:default）
  a-button type:primary "下一题" → 最后一题变为"完成作答"
  
  如当前题未作答点"下一题"：
    van-dialog 确认："此题尚未作答，是否跳过？"
    说明："跳过的题目将视为0分计算"

暂存机制：
  每次选择自动 localStorage 暂存（防止意外退出丢失进度）
  重新进入时：van-dialog "您有未完成的记录，是否继续？"
```

### 17.6 提交确认（H-005）

```
van-nav-bar title:"确认提交"

漏答检查：
  如有漏答题目：
    van-notice-bar color:red
    "您有 N 道题目尚未作答，提交后将视为0分"
    漏答题目列表（点击跳回该题）

  全部作答：
    van-icon name:success color:#4a7c6f size:48 居中
    "您已完成全部 M 道题目"

答题摘要（不显示得分和风险提示）：
  van-cell-group：
    量表名称
    作答题数 N / M
    用时：约 X 分钟

提交说明（12px --color-text-3）：
  "提交后将无法修改，请确认无误后提交。"

操作：
  van-button type:primary block size:large "确认提交"
  van-button plain block "返回检查"
```

### 17.7 完成页（H-006）

```
满屏居中布局

动效：Lottie 动画（绿色打钩）播放一次

文案（随机选取正向文案）：
  "很好，你完成了这次测评 🌿"
  "感谢你的配合！你的心情很重要"
  "完成啦！学校的老师在关心你"

副文字（14px --color-text-3）：
  "您的测评结果将由学校心理老师查看分析，如您近期情绪有困扰，欢迎主动找心理老师聊聊。"

心理老师联系方式（可选，学校配置）：
  van-cell icon:phone-o "张晓慧老师" "咨询电话：xxx"

底部：
  van-button plain round "查看我的历史记录"
  van-button type:text "关闭页面"
```

---

## 十八、通用组件规范

### 18.1 预警等级 Tag 组件

```vue
<!-- 统一封装，全局使用 -->
<AlertTag :level="'red' | 'yellow' | 'normal' | 'info'" :size="'small' | 'default'" />

红色：a-tag color:red icon:ExclamationCircleFilled "红色预警"
黄色：a-tag color:orange icon:WarningFilled "黄色预警"
正常：a-tag color:green icon:CheckCircleFilled "正常"
```

### 18.2 学生快速卡片（StudentMiniCard）

```vue
<!-- 在预警、个案、看板等处复用 -->
<StudentMiniCard :studentId="id" :showStatus="true" :showActions="true" />

展示：头像 + 姓名 + 班级 + 状态 tag
操作：查看档案 / 处理预警（按权限显示）
```

### 18.3 数据加载状态

```
全量数据加载：a-skeleton（骨架屏）
局部刷新：a-spin size:small（覆盖在内容区）
空状态：a-empty（统一使用，description 按场景定制）
错误状态：a-result status:error（API 请求失败时展示）
```

### 18.4 全局确认弹窗规范

```
危险操作（删除/关闭预警/结案）：
  a-popconfirm（轻量，不跳页）
  title：操作描述
  okText："确认" okButtonProps:danger:true
  cancelText："取消"

  如涉及不可逆操作（删除），额外要求输入"确认"文字：
  a-modal + a-input verify

通知性对话框：
  a-modal footer:null（使用自定义底部按钮）
  width:480px（小） / 640px（中） / 800px（大）
```

### 18.5 表格通用规范

```
所有 a-table 统一配置：
  size:"default"
  stripe:false（使用 hover 高亮代替条纹）
  bordered:false（使用分割线代替边框）
  scroll:{x: '最小宽度，防止列错位'}
  pagination:{
    showTotal: total => `共 ${total} 条`,
    showSizeChanger: true,
    pageSizeOptions: ['10','20','50','100'],
    defaultPageSize: 20
  }

固定列规范：
  左固定：必须含操作目标（如姓名）
  右固定：操作列（编辑/删除/详情）
  固定列宽度必须显式设置
```

### 18.6 表单规范

```
布局：layout:vertical（详情页）/ inline（筛选栏）
labelCol：vertical 时不设，horizontal 时 span:6
标签后缀：不加冒号（Arco 默认，勿覆盖）

必填字段：使用 rules required:true，统一使用 a-form 的 validate
错误提示：表单项下方红色文字，不使用弹窗提示

提交按钮：
  主操作：a-button type:primary（蓝绿色）
  取消/返回：a-button type:default
  危险操作：a-button type:default danger
  间距：a-space size:8
```

---

## 十九、交互动效规范

### 19.1 页面切换

```
路由切换：淡入 fadeIn，duration:200ms
不使用滑动切换（PC端不自然）
```

### 19.2 数据加载

```
首次加载：骨架屏（a-skeleton）持续到数据返回
刷新/重新搜索：spin 覆盖表格，不清空数据（防止闪烁）
KPI 数字：数字滚动动效（countUp.js，duration:800ms）
进度条：transition width 600ms ease-out
```

### 19.3 预警触发动效（重要）

```
新预警进来时（WebSocket 推送）：

1. 侧边栏角标数字跳动（a-badge animate:true）
2. 顶部铃铛出现红点 + 短暂抖动动效（CSS keyframes shake）
3. 页面右上角 a-notification 弹出：
   type:error
   message:"新红色预警"
   description:"李梦瑶 · PHQ-9 · 22分 · 立即查看→"
   duration:0（不自动关闭，需手动关闭）
   placement:topRight

4. 工作台页面：如当前在工作台，预警卡片列表头部实时插入新条目（带高亮背景渐变消失动效）
```

---

## 二十、响应式适配规范

### PC 端断点

```css
/* Arco Design 断点 */
xs: < 576px   — 移动（不支持PC端，重定向到H5）
sm: ≥ 576px   — 小屏平板
md: ≥ 768px   — 平板
lg: ≥ 992px   — 小屏PC（sidebar 自动收缩至64px）
xl: ≥ 1200px  — 标准PC（sidebar 220px，完整展示）
xxl: ≥ 1600px — 大屏（看板适当放大图表）
```

### 关键断点行为

```
lg以下：
  - Sidebar 自动收缩至 64px icon-only 模式
  - KPI 卡片从4列变2列
  - 表格开启横向滚动

md以下：
  - 表格隐藏次要列（仅保留主要信息列）
  - 对话框最大宽度变为100vw

< 992px 访问提示：
  a-alert type:warning banner:true
  "建议使用1280px以上分辨率的电脑访问以获得最佳体验"
```

---

## 附录一：Arco Design 组件引用总清单

| 组件 | Arco 名称 | 主要使用场景 |
|---|---|---|
| 布局 | `a-layout / a-layout-sider / a-layout-header / a-layout-content` | 全局框架 |
| 导航 | `a-menu / a-breadcrumb / a-page-header / a-tabs` | 导航和标题 |
| 数据展示 | `a-table / a-list / a-descriptions / a-statistic` | 数据列表和详情 |
| 图表 | `a-progress / @antv/g2` | 进度和图表 |
| 表单 | `a-form / a-input / a-select / a-date-picker / a-checkbox / a-radio / a-switch / a-upload` | 所有表单场景 |
| 反馈 | `a-modal / a-drawer / a-popconfirm / a-notification / a-message / a-alert / a-spin` | 弹窗和提示 |
| 导航辅助 | `a-pagination / a-steps / a-timeline / a-collapse / a-tree` | 步骤和展开 |
| 数据录入 | `a-cascader / a-tree-select / a-transfer / a-range-picker` | 复杂选择 |
| 展示 | `a-avatar / a-badge / a-tag / a-tooltip / a-popover / a-card / a-empty / a-skeleton` | 展示元素 |
| 其他 | `a-space / a-divider / a-grid / a-row / a-col` | 布局辅助 |

---

## 附录二：页面优先级与开发顺序建议

### 第一批（P0，演示必须）

```
P-001 登录页
C-001 工作台首页
C-003 预警列表
C-004 预警详情
C-007 学生档案
C-016 量表列表
H-001~006 H5学生端（完整流程）
```

### 第二批（P1，一期上线）

```
C-002 待办事项
C-005 预警记录
C-006 学生列表
C-008~C-010 个案管理
C-011~C-013 测评计划
C-014~C-015 测评记录
C-022 班级看板
T-001~T-004 班主任端
A-001~A-007 管理员端
```

### 第三批（P2，二期功能）

```
C-017 量表详情
C-018 自建量表编辑器
C-019~C-020 干预方案库
C-021 家长沟通
C-023 学生档案看板
C-024 统计报告
R-001~R-004 地市端
```
