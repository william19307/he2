# 前端联调说明（PC + H5 + 家长端）

> 状态：**已跑通**（需对应角色 + 库内有数据）  
> 全量接口以根目录 `api-actual.md` 为准。

## 模块与接口

| 模块 | 说明 |
|------|------|
| **测评计划 `/plans`** | `GET /assessment-plans`：`completion_rate` 进度条、`is_urgent` 时截止标红；分页 + **`pagination`**（`total / page / pageSize / totalPages`） |
| **新建向导 `/plans/create`** | 5 步：Step2 `GET /scales`；Step3 `GET /grades?include_classes=1` 选班；选班+量表后 **500ms 防抖** 调 `POST /estimate`；Step5 **保存草稿** `POST`（可暂无量表）；**保存并发布** 先 `POST` 再 `POST .../publish` |
| **计划详情 `/plans/:id`** | `GET /assessment-plans/:id` + `GET .../progress`，各班完成率 **`class_progress`** 表格 |
| **量表 `/scales`** | 左侧 `GET /scale-categories`，右侧 `GET /scales`（分类 + 关键词）；**学段在前端**按 `applicableLevels` 过滤，分页总数可能不准 |
| **量表详情 `/scales/:id`** | `GET /scales/:id`（含题目 `is_alert_item`、`result_levels` 风险色） |
| **学生管理 `/students`** | 默认进入即请求 `GET /students`（不带筛选参数）展示全量学生；年级/班级仅作筛选条件：选年级 `?grade_id=`，选班级 `?class_id=`；前端分页默认每页 20，底部显示总数 |
| **班级看板 `/dashboard/class`** | `GET /dashboard/class/:classId?plan_id=`：风险分布、**`scale_scores`**、**`auto_insight`**、学生表得分；默认计划无 completed 数据时 `scale_scores` 全 0 属正常 |
| **班级历史对比** | 看板底部「历史趋势对比」：`GET /dashboard/class/:classId/compare?plan_ids=1,17,16`；计划多选最多 3 个，折线图 X 轴取 `plans[].date`、Y 轴取 `class_avg`、图例取 `scale_short`；下方 `a-table` 性别对比（男/女/差值，差值<0 红色） |
| **学生看板 `/dashboard/student/:id`** | `GET /dashboard/student/:studentId`：**`longitudinal`** 折线 + **`events`**；**`radar`**：有 **`subscale_scores`** 用维度，否则 **总分%** |
| **咨询预约（PC）** | `/consult/schedule`、`/consult/appointments`；接口前缀 `/api/v1/consult/*` |
| **H5 底部导航** | `H5BottomNav` 四 Tab：`/h5/tasks`、`/h5/wellness`、`/h5/ai-chat`、`/h5/consult` |
| **H5 AI 倾诉** | 路由：`/h5/ai-chat`（聊天）、`/h5/ai-chat/history`（历史列表，`van-nav-bar` + `van-list`）；**接口**：`GET /h5/ai-chat/sessions`（历史会话）；`GET /h5/ai-chat/sessions/:id/messages?limit=20&before_id=`（最近 N 条 / 向上翻更早）；`POST /h5/ai-chat/sessions`（新建；body 可选 `resume_session_id` 续聊，消息仍靠 GET 分页拉）；`POST /h5/ai-chat/sessions/:id/messages`、`POST /h5/ai-chat/crisis-notify`；进入续聊：`/h5/ai-chat?resume_session_id=`，无弹层；已结束会话可带 `readonly=1` 只读 |
| **家长端** | 路由 `/parent/*`；绑定接口 `POST /parent/bind`，token 存 `localStorage` 的 `xq_parent_token` |
| **管理员** | `/admin/users` → `GET /admin/users`；`/admin/students/import` → **CSV** 或 **.xlsx** multipart `file`（表头：学号、姓名、班级、可选性别） |
| **通知** | Topbar **30s** 轮询 `GET /notifications/unread-count`；抽屉 `GET /notifications`；点击 **`POST /notifications/mark-read` `{ ids }`**，按 `ref_type` 跳转（如 alert → `/alerts/:id`） |

## 前端设计体系

> 详见 [FRONTEND_DESIGN_SYSTEM.md](./FRONTEND_DESIGN_SYSTEM.md)

- 所有后台页面统一使用 `.page-wrap` 容器（`padding: 28px`，灰底 `--color-bg-1`）
- 颜色通过 `variables.css` 中的 CSS 变量管理，禁止在页面中硬编码十六进制色值
- 通用组件样式（`.stat-card`、`.filter-bar`、`.page-header`、`.page-title` 等）定义在 `global.css`，页面可直接使用
- 预警色系有专用变量：`--alert-red-*`、`--alert-yellow-*`、`--alert-green-*`

## 侧栏

已加：**测评计划** / **新建计划** / **班级看板** / **咨询预约**；**管理员** 下 **用户列表**、**导入学生**（仅 **admin / super_admin**）。

## 注意点

1. **新建/发布计划**：需 **心理老师 counselor**；保存并发布须已选 **量表与班级**，否则发布会报「请配置量表」等校验错误。
2. **导入学生**：**CSV 可直接用**；**.xlsx** 需后端 `npm install xlsx`。班级名须与库里 **完全一致**。
3. **班级看板**：须选 **班级 + 计划**；无进行中计划时后端会用最近计划或返回提示。
4. **量表列表学段**：服务端未对 JSON `applicable_levels` 做筛选，当前为拉全量后 **前端过滤**，**总数与分页不完全一致**。
5. **通知跳转**：仅对 `ref_type=alert`（及 plan 等）做了路由；其它类型可再扩展。
6. **学生列表字段结构**：后端返回 `response.data = []` 扁平数组（`student_id/name/student_no/class_name...`），不是 `{ list: [] }`。

## 最新截图（交接用）

- `screenshots/pc-students-default-all-paginated.png`：学生管理默认全量加载 + 20/页分页
- `screenshots/pc-students-fixed.png`：学生列表修复后基础状态
- `screenshots/pc-class-compare-fixed.png`：班级看板历史对比区块
- `screenshots/pc-class-compare-3plans-zoom.png`：历史趋势对比（已选择 3 个计划）特写
- `screenshots/h5-ai-chat-history-page.png`：H5 AI 倾诉「历史对话」列表页
- `screenshots/h5-ai-chat-load-more-loading.png`：H5 AI 倾诉聊天页顶部上拉加载更早消息（`van-loading`）

## 联调环境

- 前端：`npm run build` 已通过。
- 完整联调需：**起后端**、**登录**、库里有 **计划 / 任务 / 通知** 等数据（可用 `npm run db:seed`）。
