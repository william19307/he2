-- AI 倾诉：会话持久化字段
ALTER TABLE `ai_chat_sessions`
  ADD COLUMN `is_active` TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN `title` VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN `last_message_at` DATETIME(3) NULL;

-- 已有 ended_at 的会话标记为已结束
UPDATE `ai_chat_sessions` SET `is_active` = 0 WHERE `ended_at` IS NOT NULL;

-- 回填最后一条消息时间（便于列表排序）
UPDATE `ai_chat_sessions` s
INNER JOIN (
  SELECT `session_id`, MAX(`created_at`) AS `m`
  FROM `ai_chat_messages`
  GROUP BY `session_id`
) x ON x.`session_id` = s.`id`
SET s.`last_message_at` = x.`m`;
