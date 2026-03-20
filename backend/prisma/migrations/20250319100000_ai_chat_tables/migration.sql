-- AI 倾诉：会话与消息

CREATE TABLE `ai_chat_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `student_id` BIGINT NOT NULL,
  `started_at` DATETIME(3) NOT NULL,
  `ended_at` DATETIME(3) NULL,
  `message_count` INT NOT NULL DEFAULT 0,
  `risk_detected` TINYINT NOT NULL DEFAULT 0,
  `risk_level` ENUM('none','low','medium','high') NOT NULL DEFAULT 'none',
  `alert_triggered` TINYINT NOT NULL DEFAULT 0,
  `alert_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ai_chat_sessions_tenant_student_idx` (`tenant_id`, `student_id`),
  INDEX `ai_chat_sessions_alert_id_idx` (`alert_id`),
  CONSTRAINT `ai_chat_sessions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ai_chat_sessions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ai_chat_sessions_alert_id_fkey` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL,
  `role` ENUM('user','assistant') NOT NULL,
  `content` TEXT NOT NULL,
  `risk_score` DECIMAL(3,2) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ai_chat_messages_session_id_idx` (`session_id`),
  CONSTRAINT `ai_chat_messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
