# 一期 MVP 实现与文档差异说明

> 对照文档：`phase1-mvp.md`  
> 本文记录当前实现与文档不一致之处，便于后续对齐或评审。

---

## 1. 技术选型

| 项目 | 文档 | 当前实现 | 说明 |
|------|------|----------|------|
| UI 组件库 | Element Plus | **Arco Design** | 前端已采用 Arco，与文档不一致。 |
| 后端服务端口 | 未明确 | **3002** | 为避免 3000/3001 被占用，固定使用 3002；前端代理已指向 3002。 |
| 缓存/会话 | Redis 7（会话 + 热数据） | **未接入 Redis** | 会话仅依赖 JWT（accessToken + refreshToken），无服务端会话存储。 |

---

## 2. 数据库与 Prisma

| 项目 | 文档 | 当前实现 | 说明 |
|------|------|----------|------|
| 枚举字段 | 多处使用 MySQL `ENUM` | **VARCHAR(n)** | Prisma 对 MySQL ENUM 支持有限，统一用 `String` + `@db.VarChar(n)` 实现（如 role、status、alert_level、target_type 等）。 |
| `assessment_tasks.student_id` | 注释为「学生user_id」 | **FK 指向 `students.id`** | Schema 中外键为 `students.id`，但业务代码（发布计划、学生端任务、看板）均按 **用户 id（user_id）** 写入与查询，与 schema 语义不一致。**建议**：二选一统一——要么改为存 `user_id` 并去掉/调整该 FK，要么全部改为存 `students.id` 并在发布与查询中统一使用 `student.id`。 |
| `operation_logs` | `action`/`resource` VARCHAR(100) | **Varchar(50)** | 当前 Prisma 中为 `@db.VarChar(50)`，与文档长度不一致。 |

---

## 3. API 接口

| 项目 | 文档 | 当前实现 | 说明 |
|------|------|----------|------|
| 量表修改 | `PUT /scales/:id` 修改量表 | **未实现** | 仅有 `POST /scales` 创建，无 PUT 更新接口。 |
| 学生测评/预警单独接口 | `GET /students/:id/assessments`、`GET /students/:id/alerts` | **未单独提供** | 学生维度的测评与预警已合并到 `GET /dashboard/student/:id` 的返回体中（`assessments`、`alerts` 字段）。若需独立 REST 路径可再补。 |
| 批量导入学生 | `POST /classes`、`POST /students/import` | **仅有 POST /classes** | 未实现 `POST /students/import`（Excel 批量导入）。 |
| 提交答卷 | 请求体含 `duration_seconds` | **未使用** | 提交接口接收 `answers`，未处理或落库 `duration_seconds`。 |

---

## 4. 其他

- **健康检查**：文档未写，当前提供 `GET /api/health`，便于部署与监控。
- **BigInt 序列化**：文档未规定；当前 API 对 BigInt 统一转为字符串输出，避免 JSON 序列化问题。
- **评分引擎**：文档中的条件表达式未使用 `eval()`，当前使用安全的条件解析（预定义运算符映射），与安全评审结论一致。

---

## 5. 建议后续动作

1. **必选**：统一 `assessment_tasks.student_id` 的语义与实现（见上文第 2 节）。
2. **可选**：若需严格对齐文档——补 PUT /scales/:id、POST /students/import、提交答卷的 duration_seconds；按需补 GET /students/:id/assessments、GET /students/:id/alerts。
3. **可选**：若需会话或热数据缓存，再接入 Redis 并明确用途（如 refresh token 黑名单、限流等）。
