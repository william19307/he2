-- 咨询预约排班 + case_records 扩展

CREATE TABLE `consult_schedules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `counselor_id` BIGINT NOT NULL,
  `weekday` TINYINT NOT NULL COMMENT '1=周一..7=周日',
  `slot_start` VARCHAR(10) NOT NULL,
  `slot_end` VARCHAR(10) NOT NULL,
  `max_slots` INT NOT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `consult_schedules_tenant_counselor_idx` (`tenant_id`, `counselor_id`),
  CONSTRAINT `consult_schedules_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consult_schedules_counselor_id_fkey` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `consult_appointments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NOT NULL,
  `schedule_id` BIGINT NOT NULL,
  `appointment_date` DATE NOT NULL,
  `student_id` BIGINT NOT NULL,
  `counselor_id` BIGINT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `student_note` TEXT NULL,
  `cancel_reason` VARCHAR(500) NULL,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `consult_appointments_schedule_date_idx` (`schedule_id`, `appointment_date`),
  INDEX `consult_appointments_student_id_idx` (`student_id`),
  INDEX `consult_appointments_tenant_status_idx` (`tenant_id`, `status`),
  CONSTRAINT `consult_appointments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consult_appointments_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `consult_schedules` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consult_appointments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consult_appointments_counselor_id_fkey` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `case_records`
  ADD COLUMN `appointment_id` BIGINT NULL,
  ADD COLUMN `consult_type` ENUM('walk_in','appointment','crisis') NOT NULL DEFAULT 'walk_in',
  ADD INDEX `idx_case_records_appointment` (`appointment_id`);

ALTER TABLE `case_records`
  ADD CONSTRAINT `case_records_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `consult_appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
