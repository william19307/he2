-- 人工上报预警：alerts 表扩展（与 gap-features 1.2 一致）
-- 执行前请备份。task_id/scale_id 允许 NULL 以支持 source=manual。

ALTER TABLE `alerts`
  MODIFY COLUMN `task_id` BIGINT NULL,
  MODIFY COLUMN `scale_id` BIGINT NULL;

ALTER TABLE `alerts`
  ADD COLUMN `source` ENUM('assessment','manual','ai_chat') NOT NULL DEFAULT 'assessment'
    COMMENT '预警来源：量表评估/人工上报/AI倾诉',
  ADD COLUMN `reporter_id` BIGINT NULL COMMENT '上报人ID（人工上报时填）',
  ADD COLUMN `report_reason` TEXT NULL COMMENT '上报原因',
  ADD COLUMN `report_urgency` ENUM('normal','urgent','critical') NOT NULL DEFAULT 'normal'
    COMMENT '紧迫程度',
  ADD COLUMN `report_evidence` TEXT NULL COMMENT '佐证描述';

ALTER TABLE `alerts` ADD INDEX `idx_source` (`source`);
ALTER TABLE `alerts` ADD INDEX `idx_reporter` (`reporter_id`);
