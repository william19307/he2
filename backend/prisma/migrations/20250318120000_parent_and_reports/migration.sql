-- 家长端 + 数据报告

CREATE TABLE `parent_student_bindings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `student_id` BIGINT NOT NULL,
  `relation` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'verified',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `parent_student_bindings_phone_student_id_key` (`phone`, `student_id`),
  INDEX `parent_student_bindings_tenant_student_idx` (`tenant_id`, `student_id`),
  CONSTRAINT `psb_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `psb_student_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `parent_notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `student_id` BIGINT NOT NULL,
  `counselor_id` BIGINT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `notify_type` VARCHAR(30) NOT NULL,
  `is_read` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `parent_notifications_tenant_student_read_idx` (`tenant_id`, `student_id`, `is_read`),
  CONSTRAINT `pn_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pn_student_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pn_counselor_fk` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `report_tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `creator_id` BIGINT NOT NULL,
  `report_type` VARCHAR(30) NOT NULL,
  `ref_id` BIGINT NULL,
  `plan_id` BIGINT NULL,
  `params` JSON NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `file_url` VARCHAR(500) NULL,
  `file_size` INT NULL,
  `error_msg` TEXT NULL,
  `generated_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `report_tasks_tenant_creator_idx` (`tenant_id`, `creator_id`),
  INDEX `report_tasks_status_idx` (`status`),
  CONSTRAINT `rt_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `rt_creator_fk` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
