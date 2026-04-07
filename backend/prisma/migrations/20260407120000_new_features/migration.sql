-- new-features.md: 体测 / 培训 / 升学

ALTER TABLE `students`
  ADD COLUMN `graduation_status` VARCHAR(20) NOT NULL DEFAULT 'enrolled' COMMENT '在读状态',
  ADD COLUMN `transfer_school_id` BIGINT NULL COMMENT '迁入学校ID',
  ADD COLUMN `transfer_school_name` VARCHAR(200) NULL COMMENT '迁入学校名',
  ADD COLUMN `transfer_date` DATE NULL COMMENT '升学日期',
  ADD COLUMN `transfer_status` VARCHAR(20) NULL COMMENT '待认领状态';

CREATE TABLE `student_physicals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `student_id` BIGINT NOT NULL,
  `record_date` DATE NOT NULL,
  `height` DECIMAL(5,1) NULL,
  `weight` DECIMAL(5,2) NULL,
  `bmi` DECIMAL(4,2) NULL,
  `bmi_status` VARCHAR(20) NULL,
  `vision_left` DECIMAL(4,2) NULL,
  `vision_right` DECIMAL(4,2) NULL,
  `note` TEXT NULL,
  `recorder_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `student_physicals_tenant_id_student_id_idx` (`tenant_id`, `student_id`),
  INDEX `student_physicals_record_date_idx` (`record_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `training_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `organizer_id` BIGINT NOT NULL,
  `training_date` DATE NOT NULL,
  `location` VARCHAR(200) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `target_scope` VARCHAR(20) NOT NULL DEFAULT 'all',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `training_sessions_tenant_id_status_idx` (`tenant_id`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `training_participants` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT NOT NULL,
  `tenant_id` BIGINT NOT NULL,
  `counselor_id` BIGINT NOT NULL,
  `school_name` VARCHAR(200) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'invited',
  `attended_at` DATETIME(3) NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `training_participants_session_id_counselor_id_key` (`session_id`, `counselor_id`),
  INDEX `training_participants_counselor_id_idx` (`counselor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_transfers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT NOT NULL,
  `transfer_type` VARCHAR(30) NOT NULL,
  `from_tenant_id` BIGINT NOT NULL,
  `from_school_name` VARCHAR(200) NULL,
  `from_counselor_id` BIGINT NULL,
  `to_tenant_id` BIGINT NULL,
  `to_school_name` VARCHAR(200) NULL,
  `to_counselor_id` BIGINT NULL,
  `new_grade` VARCHAR(50) NULL,
  `new_class` VARCHAR(50) NULL,
  `transfer_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `note` TEXT NULL,
  `operator_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `student_transfers_student_id_idx` (`student_id`),
  INDEX `student_transfers_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
