# 前端联调说明（PC + H5 + 家长端）

> 状态：**已跑通**（需对应角色 + 库内有数据）  
> 全量接口以根目录 `api-actual.md` 为准。  
> **更新日期：2026-03-21**

## 模块与接口

| 模块 | 说明 |
|------|------|
| **登录页 `/login`** | PC 登录；底部 **快速入口**（新标签打开生产站）：学生 `https://psylink.chat/h5/verify`、家长 `https://psylink.chat/parent/bind`；移动端单列布局见 `LoginPage.vue`（`max-width: 768px`） |
| **工作台 `/dashboard`** | KPI 四卡可点击：`/plans`、`/alerts?level=red&status=pending`、`/alerts?level=yellow`、`/cases`；可选 `?kpiHover=1` 预览 hover 样式（开发调试用） |
| **测评计划 `/plans`** | `GET /assessment-plans`：`completion_rate` 进度条、`is_urgent` 时截止标红；分页 + **`pagination`**（`total / page / pageSize / totalPages`） |
| **新建向导 `/plans/create`** | 5 步：Step2 `GET /scales`（`page_size=500` + 前端搜索）；Step3 `GET /grades?include_classes=1` 选班；选班+量表后 **500ms 防抖** 调 `POST /estimate`；Step5 **保存草稿** `POST`（可暂无量表）；**保存并发布** 先 `POST` 再 `POST .../publish` |
| **计划详情 `/plans/:id`** | `GET /assessment-plans/:id` + `GET .../progress`，各班完成率 **`class_progress`** 表格 |
| **量表 `/scales`** | 左侧 `GET /scale-categories`，右侧 `GET /scales`（支持 `keyword`、**`level`** 学段后端筛选：`?level=1\|2\|3`）；选学段时列表上方有提示文案 |
| **量表详情 `/scales/:id`** | `GET /scales/:id`（含题目 `is_alert_item`、`result_levels` 风险色）；**体验作答** 调 `POST /scales/:id/preview-submit` |
| **预警 `/alerts`** | 列表支持 URL 查询 **`level`、`status`**（与筛选同步）；桌面端表格 **无行复选框**（已去掉 `row-selection`） |
| **个案 `/cases`、`/cases/:id`** | `GET /api/v1/cases?status=active\|closed`、`GET /cases/:id`、`POST /cases/:id/records`、`POST /cases/:id/close`；侧栏 **学生管理** 下 **个案管理** |
| **学生管理 `/students`** | 默认进入即请求 `GET /students`（不带筛选参数）展示全量学生；年级/班级仅作筛选条件：选年级 `?grade_id=`，选班级 `?class_id=`；前端分页默认每页 20，底部显示总数 |
| **班级看板 `/dashboard/class`** | `GET /dashboard/class/:classId?plan_id=`：风险分布、**`scale_scores`**、**`auto_insight`**、学生表得分；默认计划无 completed 数据时 `scale_scores` 全 0 属正常 |
| **班级历史对比** | 看板底部「历史趋势对比」：`GET /dashboard/class/:classId/compare?plan_ids=1,17,16`；计划多选最多 3 个，折线图 X 轴取 `plans[].date`、Y 轴取 `class_avg`、图例取 `scale_short`；下方 `a-table` 性别对比（男/女/差值，差值<0 红色） |
| **学生看板 `/dashboard/student/:id`** | `GET /dashboard/student/:studentId`：**`longitudinal`** 折线 + **`events`**；**`radar`**：有 **`subscale_scores`** 用维度，否则 **总分%** |
| **咨询预约（PC）** | `/consult/schedule`、`/consult/appointments`；接口前缀 `/api/v1/consult/*` |
| **H5 底部导航** | 四 Tab：`/h5/tasks`、`/h5/wellness`、`/h5/ai-chat`、`/h5/consult`（**已移除 Vant**，布局为原生 + CSS） |
| **H5 AI 倾诉** | 路由：`/h5/ai-chat`、 `/h5/ai-chat/history`；接口：`GET /h5/ai-chat/sessions`、`GET /h5/ai-chat/sessions/:id/messages`、`POST /h5/ai-chat/sessions`、`POST /h5/ai-chat/sessions/:id/messages`、`POST /h5/ai-chat/crisis-notify` 等（见 `api-actual.md`） |
| **家长端** | 路由 `/parent/*`；绑定 `POST /parent/bind`，token：`xq_parent_token` |
| **管理员** | `/admin/users` → `GET /admin/users`；`/admin/students/import` → **CSV** 或 **.xlsx** multipart `file` |
| **通知** | Topbar 轮询 `GET /notifications/unread-count`；抽屉 `GET /notifications`；**`POST /notifications/mark-read` `{ ids }`**，按 `ref_type` 跳转 |

## 前端设计体系

> 详见 [FRONTEND_DESIGN_SYSTEM.md](./FRONTEND_DESIGN_SYSTEM.md)

- 所有后台页面统一使用 `.page-wrap` 容器（`padding: 28px`，灰底 `--color-bg-1`）
- 颜色通过 `variables.css` 中的 CSS 变量管理，禁止在页面中硬编码十六进制色值
- 通用组件样式（`.stat-card`、`.filter-bar`、`.page-header`、`.page-title` 等）定义在 `global.css`，页面可直接使用
- 预警色系有专用变量：`--alert-red-*`、`--alert-yellow-*`、`--alert-green-*`

## 侧栏

分组可 **展开/收起**：`AppSidebar.vue` 使用 `openKeys` + `v-show` + 样式控制子菜单；父级点击 `@click.stop` 切换。折叠整栏仍由 `appStore.sidebarCollapsed`（顶栏按钮）控制。

菜单项包含：**预警管理**、**学生管理**（全部学生、个案管理）、**测评管理**、**数据分析**、**咨询管理**（心理/管理角色）、**系统管理**（管理员）等。

## 注意点

1. **新建/发布计划**：需 **心理老师 counselor**（及同级及以上角色）；保存并发布须已选 **量表与班级**。
2. **导入学生**：**CSV 可直接用**；**.xlsx** 需后端 `xlsx`。班级名须与库里 **完全一致**。
3. **班级看板**：须选 **班级 + 计划**。
4. **量表列表学段**：已支持 **`GET /scales?level=`** 后端筛选（与 `applicable_levels` JSON 一致），分页 total 与列表一致。
5. **通知跳转**：按 `ref_type` 处理；未覆盖类型可再扩展。
6. **学生列表字段结构**：以实际接口为准（部分接口为扁平数组，见联调记录）。

## 截图目录（`screenshots/`，可选交接）

含 PC/H5/登录页/侧栏/个案/预警等示意或验收截图；文件名见目录列表，**非构建产物**。

## 联调环境

- 前端：`npm run build` 用于生产静态资源。
- 完整联调需：**起后端**、**登录**、库内有种子数据（`npm run db:seed`，见 `backend/README.md`）。
