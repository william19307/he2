# 已检测通过（✅）可直接导入的量表

来源：`../raedy/README.md`（37 套）。本目录按 **学生 / 成人** 分子目录，便于导入脚本自动写入 `category_id`（`学生量表` / `成人量表`）。

## 导入命令（在 `backend` 目录下）

```bash
node scripts/import-scales.js --dir ./scales-data/ready/ --apply
```

项目根目录若已建立指向本目录的符号链接，也可：

```bash
node backend/scripts/import-scales.js --dir ./scales-data/ready/ --apply
```

## 说明

- 若数据库中已存在相同 `short_name`，导入会 **跳过** 该量表，不重复创建。
- 题目为空的量表在导入后应通过运维 SQL 下架，避免进入测评计划。
