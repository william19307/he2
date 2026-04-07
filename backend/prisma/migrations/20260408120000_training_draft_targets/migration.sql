-- 培训草稿：定向通知预选老师 ID 列表（JSON 数组）
ALTER TABLE `training_sessions` ADD COLUMN `draft_target_counselor_ids` JSON NULL;
